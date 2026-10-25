import {
  analyzeIngredientsPhoto,
  startIngredientAnalysisJob,
  getIngredientAnalysisJobStatus,
  type IngredientAnalysis,
} from "./ingredients.functions";
import { analyse, type ProductResult } from "./halal";
import { generateAccessToken } from "./ingredient-job-security";
import { decidePollAction } from "./ingredient-validation";

const STORAGE_KEY = "islam_noor_ingredient_analysis_active_v1";
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export interface PersistedAnalysisState {
  analysisId: string;
  /**
   * Capability token required to read/update this job on the server. Absent in
   * records created before the access-token mechanism existed; such records
   * cannot be recovered from the server (see recoverActiveAnalysis).
   */
  accessToken?: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: number;
  product?: ProductResult;
  error?: string;
  progressMessage?: string;
}

/** Reads the currently active analysis from local storage */
export function getActiveIngredientAnalysis(): PersistedAnalysisState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAnalysisState;
    if (!parsed || !parsed.analysisId) return null;
    if (Date.now() - parsed.createdAt > MAX_AGE_MS) {
      clearActiveIngredientAnalysis();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Saves or updates the active analysis state in local storage */
export function saveActiveIngredientAnalysis(state: PersistedAnalysisState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota or serialization errors
  }
}

/** Clears any active analysis from storage */
export function clearActiveIngredientAnalysis() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Helper to convert AI analysis into a full ProductResult with 5 compliance checks */
export function formatAnalysisToProduct(
  analysis: IngredientAnalysis,
  fallbackTitle: string = "Ingrédients analysés",
): ProductResult {
  const rawProduct: Record<string, unknown> = {
    code: `photo-ai-${Date.now()}`,
    product_name: analysis.name?.trim() || fallbackTitle,
    brands: analysis.brand?.trim() || "Analyse IA & Vision",
    ingredients_text:
      analysis.ingredientsText?.trim() ||
      (analysis.reasons && analysis.reasons.length > 0 ? analysis.reasons.join(", ") : ""),
    nutriscore_grade: analysis.nutriscore,
    allergens_tags: analysis.allergens,
  };

  const analyzed = analyse(rawProduct, "Analyse IA Vision & Multi-Tests");

  // Keep the AI verdict if more specific or if direct AI detection found something
  const mergedVerdict =
    analysis.verdict === "haram"
      ? "haram"
      : analyzed.verdict === "haram"
        ? "haram"
        : analysis.verdict === "doubtful" || analyzed.verdict === "doubtful"
          ? "doubtful"
          : analysis.verdict === "halal"
            ? "halal"
            : analyzed.verdict;

  const combinedReasons = Array.from(
    new Set([...(analysis.reasons || []), ...analyzed.reasons]),
  );

  return {
    ...analyzed,
    verdict: mergedVerdict,
    reasons: combinedReasons,
  };
}

/**
 * Generates a cryptographically-secure, hard-to-guess analysis identifier.
 *
 * Uses the Web Crypto API, available in secure contexts (the Capacitor app runs
 * on an `https://` scheme and the web build is served over HTTPS):
 * - prefers `crypto.randomUUID()` (122 bits of entropy);
 * - falls back to `crypto.getRandomValues()` when `randomUUID` is unavailable;
 * - never falls back to `Math.random()`: if no CSPRNG is available it throws,
 *   because a predictable identifier would defeat the purpose of this change.
 *
 * The `ing_analysis_` prefix and the string type are preserved so every server
 * function, the tracker, status polling and the in-memory store keep working.
 */
function generateAnalysisId(): string {
  const webCrypto = typeof crypto !== "undefined" ? crypto : undefined;
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return `ing_analysis_${webCrypto.randomUUID()}`;
  }
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `ing_analysis_${hex}`;
  }
  throw new Error("No cryptographically secure random generator available");
}

/**
 * Runs a resilient, background-safe ingredient analysis.
 * - Stores state in localStorage before network call.
 * - Starts server job tracking.
 * - Allows polling and recovery if page reloads.
 */
export async function runResilientIngredientAnalysis(
  imageDataUrl: string,
  options: {
    lang?: string;
    fallbackTitle?: string;
    onProgress?: (msg: string) => void;
  } = {},
): Promise<ProductResult> {
  const analysisId = generateAnalysisId();
  const accessToken = generateAccessToken();
  const lang = options.lang || "fr";

  // 1. Persist initial state
  const initialJob: PersistedAnalysisState = {
    analysisId,
    accessToken,
    status: "processing",
    createdAt: Date.now(),
    progressMessage: "Analyse des ingrédients par l'IA en cours...",
  };
  saveActiveIngredientAnalysis(initialJob);
  options.onProgress?.("Envoi et analyse de l'image...");

  try {
    // 2. Start server-side asynchronous job
    try {
      await startIngredientAnalysisJob({
        data: {
          analysisId,
          image: imageDataUrl,
          lang,
          accessToken,
        },
      });
    } catch (startErr) {
      console.warn("Could not start background job, falling back to direct server function:", startErr);
    }

    // 3. Simultaneously trigger direct analysis promise or poll
    const directPromise = analyzeIngredientsPhoto({
      data: {
        image: imageDataUrl,
        lang,
        analysisId,
        accessToken,
      },
    });

    // 4. Race / poll for completion
    let attempts = 0;
    const maxAttempts = 35; // ~40 seconds timeout

    while (attempts < maxAttempts) {
      // Check server job status
      try {
        const check = await Promise.race([
          getIngredientAnalysisJobStatus({ data: { analysisId, accessToken } }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1400)),
        ]);

        const action = decidePollAction(check?.status, Boolean(check?.result));

        if (check && action === "result") {
          const product = formatAnalysisToProduct(check.result!, options.fallbackTitle);
          saveActiveIngredientAnalysis({
            analysisId,
            accessToken,
            status: "completed",
            createdAt: initialJob.createdAt,
            product,
          });
          return product;
        }

        if (action === "failed") {
          throw new Error(check?.error || "L'analyse des ingrédients a échoué.");
        }

        // P2: "unauthorized" means the server refuses this token for the job.
        // Stop polling now and fall back to the legitimate direct request below
        // instead of wasting ~40s of status polling that can never succeed.
        if (action === "stop") {
          break;
        }
      } catch (pollErr) {
        console.debug("Status poll check:", pollErr);
      }

      // Check if directPromise has already finished
      const directResolved = await Promise.race([
        directPromise.then((res) => ({ ok: true as const, res })),
        new Promise<{ ok: false }>((resolve) => setTimeout(() => resolve({ ok: false }), 200)),
      ]);

      if (directResolved.ok && directResolved.res) {
        const product = formatAnalysisToProduct(directResolved.res, options.fallbackTitle);
        saveActiveIngredientAnalysis({
          analysisId,
          accessToken,
          status: "completed",
          createdAt: initialJob.createdAt,
          product,
        });
        return product;
      }

      attempts++;
      await new Promise((r) => setTimeout(r, 1000));
    }

    // If polling timed out, try awaiting directPromise one last time
    const directResult = await directPromise;
    const product = formatAnalysisToProduct(directResult, options.fallbackTitle);
    saveActiveIngredientAnalysis({
      analysisId,
      accessToken,
      status: "completed",
      createdAt: initialJob.createdAt,
      product,
    });
    return product;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Erreur pendant l'analyse des ingrédients";
    saveActiveIngredientAnalysis({
      analysisId,
      accessToken,
      status: "failed",
      createdAt: initialJob.createdAt,
      error: errorMsg,
    });
    throw err;
  }
}

/**
 * Recovers an ongoing or completed analysis from local storage if the app was reloaded.
 */
export async function recoverActiveAnalysis(
  fallbackTitle: string = "Ingrédients analysés",
): Promise<{
  active: boolean;
  status?: "processing" | "completed" | "failed";
  product?: ProductResult;
  error?: string;
}> {
  const current = getActiveIngredientAnalysis();
  if (!current) return { active: false };

  // If already completed in local storage
  if (current.status === "completed" && current.product) {
    clearActiveIngredientAnalysis();
    return { active: true, status: "completed", product: current.product };
  }

  // If failed
  if (current.status === "failed") {
    clearActiveIngredientAnalysis();
    return { active: true, status: "failed", error: current.error };
  }

  // Legacy local records (created before the access-token mechanism) have no
  // token and therefore cannot be authorized against the server. Never bypass
  // the check: drop them so the user can start a fresh analysis.
  if (!current.accessToken) {
    clearActiveIngredientAnalysis();
    return { active: false };
  }

  // If currently processing, query server status
  try {
    const check = await getIngredientAnalysisJobStatus({
      data: { analysisId: current.analysisId, accessToken: current.accessToken },
    });
    if (check.status === "completed" && check.result) {
      const product = formatAnalysisToProduct(check.result, fallbackTitle);
      clearActiveIngredientAnalysis();
      return { active: true, status: "completed", product };
    }
    if (check.status === "failed") {
      clearActiveIngredientAnalysis();
      return { active: true, status: "failed", error: check.error || "Analyse interrompue" };
    }
    return { active: true, status: "processing" };
  } catch {
    return { active: true, status: "processing" };
  }
}
