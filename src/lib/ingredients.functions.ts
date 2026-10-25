import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import {
  checkAiRateLimit,
  extractClientKey,
  rateLimitError,
} from "./ai-rate-limit";
import {
  accessTokenHashesMatch,
  canTransition,
  evaluateTokenBinding,
  hashAccessToken,
  isValidAccessToken,
} from "./ingredient-job-security";
import {
  accessTokenSchema,
  analysisIdSchema,
  analysisImageSchema,
  analysisLangSchema,
  analyzeIngredientsSchema,
  parseImagePayload,
} from "./ingredient-validation";
import { evaluateProduct } from "./halal-engine";

export type IngredientAnalysis = {
  name: string;
  brand?: string;
  verdict: "halal" | "haram" | "doubtful" | "unknown";
  reasons: string[];
  ingredientsText?: string;
  nutriscore?: string;
  novaGroup?: number;
  ecoscore?: string;
  allergens?: string[];
};

type AnalysisJob = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: IngredientAnalysis;
  error?: string;
  createdAt: number;
  updatedAt: number;
  /** SHA-256 hash of the access token. The raw token is never stored. */
  tokenHash?: string;
};

// Global in-memory job store on the server
const serverAnalysisJobs = new Map<string, AnalysisJob>();

/**
 * Plafond d'analyses conservées en mémoire sur une instance. Au-delà, la plus
 * ancienne est evicted : sans ce plafond, un attaquant capable de créer des
 * `analysisId` ferait croître le store sans borne (épuisement mémoire).
 */
const MAX_SERVER_JOBS = 200;

/** Message renvoyé au client en cas d'échec : aucun détail fournisseur. */
const PUBLIC_ANALYSIS_ERROR = "L'analyse des ingrédients a échoué.";

function cleanupExpiredJobs() {
  const now = Date.now();
  for (const [id, job] of serverAnalysisJobs.entries()) {
    if (now - job.createdAt > 15 * 60 * 1000) {
      serverAnalysisJobs.delete(id);
    }
  }
}

/**
 * Retire l'entrée la plus ancienne lorsque le store atteint son plafond
 * (l'insertion order de la Map correspond à l'ordre de création).
 */
function evictOldestJobIfNeeded(): void {
  while (serverAnalysisJobs.size >= MAX_SERVER_JOBS) {
    const oldest = serverAnalysisJobs.keys().next().value;
    if (oldest === undefined) return;
    serverAnalysisJobs.delete(oldest);
  }
}

/**
 * Journalise une erreur d'analyse sans exposer de secret : le message est
 * expurgé de la clé API si elle y figurait.
 */
function logAnalysisFailure(err: unknown): void {
  const raw = err instanceof Error ? err.message : String(err);
  const apiKey = process.env.GEMINI_API_KEY;
  const safe = apiKey ? raw.split(apiKey).join("[redacted]") : raw;
  console.error(`[ingredients] analysis failed: ${safe.slice(0, 300)}`);
}

/**
 * Binds an incoming access token to a job. Returns the existing job when one is
 * already present, `undefined` when none exists yet, or `null` on a token
 * conflict (job bound to a different token) — in which case the job is left
 * untouched. The first caller establishes the association; later callers with
 * the same token keep it; a different token is rejected without side effects.
 */
async function bindJobToken(
  analysisId: string,
  accessToken: string,
): Promise<AnalysisJob | undefined | null> {
  const incomingHash = await hashAccessToken(accessToken);
  const existing = serverAnalysisJobs.get(analysisId);
  if (existing) {
    const decision = evaluateTokenBinding(existing.tokenHash, incomingHash);
    if (decision === "conflict") return null;
    if (decision === "establish") existing.tokenHash = incomingHash;
    return existing;
  }
  return undefined;
}

/** Creates a fresh job entry bound to the token hash. */
function createJob(analysisId: string, tokenHash: string): AnalysisJob {
  const now = Date.now();
  const job: AnalysisJob = {
    id: analysisId,
    status: "processing",
    tokenHash,
    createdAt: now,
    updatedAt: now,
  };
  evictOldestJobIfNeeded();
  serverAnalysisJobs.set(analysisId, job);
  return job;
}

/**
 * Applies a terminal transition (completed/failed) while preserving the token
 * binding and respecting terminal-state immutability (a late update never
 * replaces an already-finished result).
 */
function finalizeJob(
  analysisId: string,
  next: "completed" | "failed",
  patch: { result?: IngredientAnalysis; error?: string },
): void {
  const job = serverAnalysisJobs.get(analysisId);
  if (!job) return;
  if (!canTransition(job.status, next)) return;
  job.status = next;
  job.updatedAt = Date.now();
  if (next === "completed") job.result = patch.result;
  if (next === "failed") job.error = patch.error;
}

export interface FilterRule {
  pattern: RegExp;
  label: string;
}

// 1. Dictionnaire Haram strict (Porc, gélatine non spécifiée, alcool, E120 / carmine, etc.)
export const HARAM_DICTIONARY: FilterRule[] = [
  { pattern: /\b(porc|pork|lard|saindoux|bacon|jambon)\b/i, label: "Porc ou dérivé porcin" },
  { pattern: /\b(gelatine de porc|pork gelatin)\b/i, label: "Gélatine de porc" },
  { pattern: /\b(gelatine)\b/i, label: "Gélatine d'origine non spécifiée" },
  { pattern: /\b(e120|carmin|cochenille|acide carminique|cochineal)\b/i, label: "Colorant rouge E120 (Carmin/Cochenille)" },
  { pattern: /\b(alcool|ethanol|rhum|biere|vin|liqueur|whisky|vodka)\b/i, label: "Alcool / Éthanol ajouté" },
  { pattern: /\b(e441|e542)\b/i, label: "Additif E441 / E542 (Origine animale)" },
  { pattern: /\b(graisse animale|animal fat|suif|graisse de boeuf|graisse de volaille)\b/i, label: "Graisse animale non certifiée" },
];

// 2. Dictionnaire Douteux / Mushbooh (E471, E472, E422 glycérol, présure, arômes, etc.)
export const DOUBTFUL_DICTIONARY: FilterRule[] = [
  { pattern: /\b(e471|mono-?\s*et\s*diglycerides?\s*d'acides?\s*gras)\b/i, label: "E471 (Origine animale ou végétale inconnue)" },
  { pattern: /\b(e472[a-f]?)\b/i, label: "E472 (Esters d'acides gras - origine douteuse)" },
  { pattern: /\b(e422|glycerol|glycerine)\b/i, label: "E422 Glycérol / Glycérine (peut être d'origine animale)" },
  { pattern: /\b(presure|presure animale|rennet)\b/i, label: "Présure animale (abattage non garanti)" },
  { pattern: /\b(e904|shellac|gomme laque)\b/i, label: "E904 Shellac (sécrétion d'insecte)" },
  { pattern: /\b(e920|l-cysteine)\b/i, label: "E920 L-Cystéine" },
  { pattern: /\b(aromes?|aromes? non precises?|arome naturel)\b/i, label: "Arômes sans mention de support certifié" },
  { pattern: /\b(pepsine)\b/i, label: "Pepsine" },
];

// 3. Exceptions licites et négations pour éviter tout faux positif
export const PERMISSIBLE_EXCEPTIONS: RegExp[] = [
  /\bsans (porc|alcool|graisse animale)\b/i,
  /\balcohol[- ]free\b/i,
  /\b0\.0\s*%\s*vol\b/i,
  /\bgelatine (vegetale|de poisson|halal)\b/i,
  /\be471 (vegetale|origine vegetale|d'origine vegetale)\b/i,
  /\be422 (vegetale|origine vegetale|d'origine vegetale)\b/i,
  /\bvinaigre (de vin|d'alcool|de cidre|blanc)\b/i,
];

/** Nettoyage du texte des ingrédients : minuscules, suppression ponctuation et accents */
export function cleanIngredientsText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[,;:.\-_()[\]{}"'’/\\*!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Vérifie si une mention suspecte se trouve dans une clause négative autorisée */
function isExempted(fullText: string, matchIndex: number, matchLength: number): boolean {
  const start = Math.max(0, matchIndex - 25);
  const end = Math.min(fullText.length, matchIndex + matchLength + 25);
  const contextSnippet = fullText.substring(start, end);
  return PERMISSIBLE_EXCEPTIONS.some((exp) => exp.test(contextSnippet));
}

/**
 * Algorithme de filtrage et classification strict :
 * - Si AU MOINS UN ingrédient est Haram -> Statut = HARAM
 * - Si AUCUN Haram mais AU MOINS UN Douteux -> Statut = DOUTEUX
 * - Si AUCUN Haram et AUCUN Douteux -> Statut = HALAL
 */
export function classifyIngredients(
  ingredientsText: string,
  options?: { name?: string; brand?: string; barcode?: string },
): IngredientAnalysis {
  const clean = cleanIngredientsText(ingredientsText);
  if (!clean || clean.length < 3) {
    return {
      name: options?.name || "Produit analysé",
      brand: options?.brand,
      verdict: "unknown",
      reasons: ["Liste d'ingrédients illisible ou insuffisante."],
      ingredientsText,
    };
  }

  const haramReasons: string[] = [];
  const doubtfulReasons: string[] = [];

  // Vérification de la liste Haram stricte
  for (const rule of HARAM_DICTIONARY) {
    const match = rule.pattern.exec(clean);
    if (match) {
      if (!isExempted(clean, match.index, match[0].length)) {
        haramReasons.push(`Détecté : ${rule.label}`);
      }
    }
  }

  // Vérification de la liste Douteuse (Mushbooh)
  for (const rule of DOUBTFUL_DICTIONARY) {
    const match = rule.pattern.exec(clean);
    if (match) {
      if (!isExempted(clean, match.index, match[0].length)) {
        doubtfulReasons.push(`Détecté : ${rule.label}`);
      }
    }
  }

  // Règle de décision critique
  let verdict: "halal" | "haram" | "doubtful" = "halal";
  let reasons: string[] = [];

  if (haramReasons.length > 0) {
    verdict = "haram";
    reasons = haramReasons;
  } else if (doubtfulReasons.length > 0) {
    verdict = "doubtful";
    reasons = doubtfulReasons;
  } else {
    verdict = "halal";
    reasons = [
      "Tous les ingrédients analysés sont conformes. Aucun ingrédient porcin, alcool ou additif douteux détecté.",
    ];
  }

  return {
    name: options?.name || "Produit analysé",
    brand: options?.brand,
    verdict,
    reasons,
    ingredientsText,
  };
}

async function performAiIngredientAnalysis(image: string, lang: string): Promise<IngredientAnalysis> {
  const geminiKey = process.env.GEMINI_API_KEY;

  // P5 : L'IA ne sert QU'À LIRE/TRANSCRIRE. Elle ne décide JAMAIS du verdict.
  const ocrSystemInstruction =
    "Tu es un lecteur optique de caractères (OCR) de haute précision. Ta SEULE mission est de transcrire mot à mot le texte de la liste des ingrédients visible sur l'image.\n" +
    "Ne donne AUCUN verdict, ne qualifie JAMAIS un ingrédient de halal ou haram.\n" +
    "Réponds STRICTEMENT par un objet JSON valide avec cette structure exacte :\n" +
    "{\n" +
    '  "texte_brut": "retranscription exacte de la liste des ingrédients",\n' +
    '  "nom_produit": "nom du produit si lisible",\n' +
    '  "marque": "marque du produit si lisible",\n' +
    '  "langue": "fr|en|ar|...",\n' +
    '  "lisible": true|false,\n' +
    '  "liste_complete": true|false,\n' +
    '  "confiance": 0.0 a 1.0\n' +
    "}\n" +
    "Si l'image est floue, sombre, coupée ou illisible, indique lisible=false, liste_complete=false et confiance < 0.8.";

  if (geminiKey) {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const { mimeType, base64Data } = parseImagePayload(image);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: ocrSystemInstruction + "\nLis et transcris fidèlement les ingrédients de cette photo." },
            { inlineData: { mimeType, data: base64Data } },
          ],
        },
      ],
    });

    const raw = response.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        name: "Photo des ingrédients",
        verdict: "doubtful",
        reasons: ["Image illisible ou texte non détecté. Reprends la photo."],
      };
    }

    type OcrPayload = {
      texte_brut?: string;
      nom_produit?: string;
      marque?: string;
      langue?: string;
      lisible?: boolean;
      liste_complete?: boolean;
      confiance?: number;
    };

    let ocr: OcrPayload = {};
    try {
      ocr = JSON.parse(match[0]) as OcrPayload;
    } catch {
      return {
        name: "Photo des ingrédients",
        verdict: "doubtful",
        reasons: ["Erreur de lecture optique. Reprends la photo."],
      };
    }

    const rawText = typeof ocr.texte_brut === "string" ? ocr.texte_brut : "";
    const lisible = ocr.lisible === true;
    const listeComplete = ocr.liste_complete === true;
    const confiance = typeof ocr.confiance === "number" ? ocr.confiance : 0.5;

    // Évaluation déterministe par evaluateProduct selon P1, P5, P8, P9, P10, P12
    const evaluation = evaluateProduct({
      productName: ocr.nom_produit || "Ingrédients analysés",
      brand: ocr.marque,
      ingredientsText: rawText,
      source: "OCR",
      ocrQuality: {
        lisible,
        listeComplete,
        confiance,
        floue: !lisible || confiance < 0.8 || !listeComplete,
      },
    });

    return {
      name: evaluation.productName,
      brand: evaluation.brand,
      verdict:
        evaluation.verdict === "HARAM"
          ? "haram"
          : evaluation.verdict === "HALAL"
            ? "halal"
            : "doubtful",
      reasons:
        evaluation.flaggedItems.length > 0
          ? evaluation.flaggedItems.map(
              (f) => `${f.ingredient} → ${f.statut} → ${f.raison} [${f.regle}]`,
            )
          : evaluation.proof
            ? [evaluation.proof]
            : ["Aucun ingrédient suspect détecté"],
      ingredientsText: evaluation.fullIngredientsText || rawText || undefined,
    };
  }

  // Fallback si pas de clé API Gemini
  return {
    name: "Photo des ingrédients",
    verdict: "doubtful",
    reasons: ["Analyse optique non disponible (GEMINI_API_KEY non configuré)"],
  };
}

/** Reads a photo of an ingredient list and returns a halal verdict directly. */
export const analyzeIngredientsPhoto = createServerFn({ method: "POST" })
  .validator((d: unknown) => analyzeIngredientsSchema.parse(d))
  .handler(async ({ data }): Promise<IngredientAnalysis> => {
    const request = getRequest();
    const decision = await checkAiRateLimit("ingredientAnalyze", {
      request,
      key: extractClientKey(request?.headers),
    });
    if (!decision.allowed) throw rateLimitError("ingredientAnalyze", decision.retryAfterSec);

    cleanupExpiredJobs();

    // P1: analysisId + accessToken are mandatory and validated BEFORE any AI
    // call, so the quota cannot be consumed by an unauthenticated request.
    if (!isValidAccessToken(data.accessToken)) {
      throw new Error("Unauthorized");
    }

    const bind = await bindJobToken(data.analysisId, data.accessToken);
    if (bind === null) throw new Error("Unauthorized");
    if (!bind) createJob(data.analysisId, await hashAccessToken(data.accessToken));

    try {
      const result = await performAiIngredientAnalysis(data.image, data.lang);

      finalizeJob(data.analysisId, "completed", { result });

      return result;
    } catch (err) {
      logAnalysisFailure(err);
      finalizeJob(data.analysisId, "failed", { error: PUBLIC_ANALYSIS_ERROR });
      throw new Error(PUBLIC_ANALYSIS_ERROR);
    }
  });

/** Starts an asynchronous persistent analysis job on the server */
export const startIngredientAnalysisJob = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        analysisId: analysisIdSchema,
        image: analysisImageSchema,
        lang: analysisLangSchema,
        accessToken: accessTokenSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const decision = await checkAiRateLimit("ingredientStart", {
      request,
      key: extractClientKey(request?.headers),
    });
    if (!decision.allowed) throw rateLimitError("ingredientStart", decision.retryAfterSec);

    cleanupExpiredJobs();

    if (!isValidAccessToken(data.accessToken)) {
      throw new Error("Unauthorized");
    }

    // Establish or verify the token<->job binding. A different token on an
    // existing job is rejected without touching that job's data.
    const bind = await bindJobToken(data.analysisId, data.accessToken);
    if (bind === null) throw new Error("Unauthorized");

    if (bind) {
      // Job already exists and is bound to this token: never overwrite it.
      return { analysisId: data.analysisId, status: bind.status };
    }

    createJob(data.analysisId, await hashAccessToken(data.accessToken));

    // Run in background on server
    void performAiIngredientAnalysis(data.image, data.lang)
      .then((result) => {
        finalizeJob(data.analysisId, "completed", { result });
      })
      .catch((err) => {
        logAnalysisFailure(err);
        finalizeJob(data.analysisId, "failed", { error: PUBLIC_ANALYSIS_ERROR });
      });

    return { analysisId: data.analysisId, status: "processing" as const };
  });

/** Returns the status and result of a persistent analysis job */
export const getIngredientAnalysisJobStatus = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        analysisId: analysisIdSchema,
        accessToken: accessTokenSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const decision = await checkAiRateLimit("ingredientStatus", {
      request,
      key: extractClientKey(request?.headers),
    });
    if (!decision.allowed) throw rateLimitError("ingredientStatus", decision.retryAfterSec);

    cleanupExpiredJobs();

    const job = serverAnalysisJobs.get(data.analysisId);
    // Generic response for "missing" and "wrong token" alike, so an attacker
    // cannot tell whether an analysisId exists or belongs to someone else.
    if (!job || !job.tokenHash || !isValidAccessToken(data.accessToken)) {
      return { analysisId: data.analysisId, status: "unauthorized" as const };
    }

    const incomingHash = await hashAccessToken(data.accessToken);
    if (!accessTokenHashesMatch(job.tokenHash, incomingHash)) {
      return { analysisId: data.analysisId, status: "unauthorized" as const };
    }

    return {
      analysisId: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
    };
  });
