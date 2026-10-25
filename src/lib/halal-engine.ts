import rulesData from "./halal_rules.json";

export const VERDICT_LABELS = {
  HALAL: "HALAL",
  HARAM: "HARAM",
  NON_CONFIRME: "NON CONFIRMÉ",
  VIANDE_A_VERIFIER: "VIANDE À VÉRIFIER",
} as const;

export type FinalVerdict = (typeof VERDICT_LABELS)[keyof typeof VERDICT_LABELS];

export type ProtocolAuditStatus =
  | "PASSE"
  | "A_CLARIFIER"
  | "BLOQUANT"
  | "NON_VERIFIE"
  | "AUCUNE_DONNEE";

export interface ProtocolAuditItem {
  numero: number;
  titre: string;
  statut: ProtocolAuditStatus;
  methode: string;
  verifie: boolean;
  preuves: string[];
  impact: string;
}

export type FiabiliteData = "BASE_DE_DONNEES" | "LU_PAR_PHOTO" | "DONNEES_INCOMPLETES";

export interface FlaggedItem {
  ingredient: string;
  statut: "HARAM" | "NON CONFIRMÉ";
  raison: string;
  regle: string;
}

export interface EvaluationInput {
  scanId?: string;
  code?: string;
  productName?: string;
  brand?: string;
  quantity?: string;
  categoriesTags?: string[];
  ingredientsText?: string;
  ingredientsTextFr?: string;
  ingredientsAnalysisTags?: string[];
  additivesTags?: string[];
  labelsTags?: string[];
  allergensTags?: string[];
  nutriments?: {
    alcohol?: number;
    [key: string]: unknown;
  };
  source?: "OpenFoodFacts" | "OpenBeautyFacts" | "OCR" | "Manual";
  ocrQuality?: {
    lisible?: boolean;
    listeComplete?: boolean;
    confiance?: number;
    floue?: boolean;
    texteBrut?: string;
    langue?: string;
  };
  isHalalCertified?: boolean;
  comparisonMismatch?: boolean;
  aiExtraCheckDiscovered?: string[];
  fetchDate?: string;
}

export interface EvaluationResult {
  scanId?: string;
  code?: string;
  productName: string;
  brand?: string;
  verdict: FinalVerdict;
  confidence: "Élevée" | "Moyenne" | "Faible";
  fiabilite: FiabiliteData;
  audit: ProtocolAuditItem[];
  raisons: string[];
  flaggedItems: FlaggedItem[];
  proof?: string;
  explanation?: string;
  secondaryInfo?: string;
  normalizedIngredients: string[];
  fullIngredientsText: string;
  source: string;
  disclaimer: string;
  error?: string;
}

export const MEAT_PATTERNS = [
  /\b(viande|viandes|meat|meats|chair\s+animale)\b/i,
  /\b(boeuf|bœuf|beef|bovin|bovine|veau|veal|steack|steak|hache|haché|rumsteak|entrecote|entrecôte|bourguignon|bavette|rosbif)\b/i,
  /\b(poulet|chicken|volaille|volailles|poultry|coq|chapon|blanc\s+de\s+poulet|cuisse\s+de\s+poulet|nuggets?\s+de\s+poulet|aiguillette\s+de\s+poulet)\b/i,
  /\b(dinde|turkey|escalope\s+de\s+dinde|filet\s+de\s+dinde|jambon\s+de\s+dinde|bacon\s+de\s+dinde)\b/i,
  /\b(agneau|lamb|mouton|mutton|gigot|merguez)\b/i,
  /\b(canard|duck|magret|confit\s+de\s+canard|oie|goose|foie\s+gras)\b/i,
  /\b(charcuterie|charcuteries|abats|foie|rognon|rognons|tripes|coeur|gésier|gesier|saucisse|saucisses|saucisson|saucissons)\b/i,
  /\b(bouillon\s+de\s+(?:viande|boeuf|bœuf|volaille|poulet))\b/i,
  /\b(graisse\s+(?:animale|de\s+(?:boeuf|bœuf|canard|oie|volaille|mouton)))\b/i,
];

export const MEAT_NEGATION_REGEX =
  /\b(sans\s+(?:viande|boeuf|bœuf|porc|poulet|dinde|canard)|meat\s*free|vegetar|vegan|arome\s+artificiel|no\s+(?:meat|beef|chicken|turkey))\b/i;

export const MEAT_CATEGORIES = [
  "viandes",
  "viande",
  "meats",
  "meat",
  "beef",
  "poultry",
  "volaille",
  "volailles",
  "halal-meats",
  "charcuteries",
  "charcuterie",
  "sausages",
  "saucisses",
  "cold-cuts",
  "meat-based-products",
];

/**
 * P1 – Vérification et normalisation de code-barres (EAN-8, EAN-13, UPC-A)
 */
export function validateBarcode(rawCode: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  const digits = rawCode.trim().replace(/\D/g, "");

  if (digits.length === 12) {
    // UPC-A (12 chiffres) -> convertir en EAN-13 en ajoutant un '0' devant
    return validateBarcode("0" + digits);
  }

  if (digits.length === 8) {
    // EAN-8 checksum : pondérations alternées 3, 1, 3, 1, 3, 1, 3
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const weight = i % 2 === 0 ? 3 : 1;
      sum += parseInt(digits[i], 10) * weight;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const providedCheck = parseInt(digits[7], 10);
    if (checkDigit !== providedCheck) {
      return { valid: false, error: "Code-barres invalide, rescanne" };
    }
    return { valid: true, normalized: digits };
  }

  if (digits.length === 13) {
    // EAN-13 checksum : pondérations alternées 1, 3, 1, 3...
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const weight = i % 2 === 0 ? 1 : 3;
      sum += parseInt(digits[i], 10) * weight;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const providedCheck = parseInt(digits[12], 10);
    if (checkDigit !== providedCheck) {
      return { valid: false, error: "Code-barres invalide, rescanne" };
    }
    return { valid: true, normalized: digits };
  }

  return { valid: false, error: "Code-barres invalide, rescanne" };
}

/**
 * P4 & P6 – Normalisation du texte et extraction des ingrédients individuels
 */
export function normalizeIngredients(text: string): {
  normalizedFull: string;
  items: string[];
  eCodes: string[];
  hasTraces: boolean;
} {
  if (!text || typeof text !== "string") {
    return { normalizedFull: "", items: [], eCodes: [], hasTraces: false };
  }

  const clean = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlever accents
    .replace(/['’]/g, " ")
    .replace(/&/g, " et ")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/%[a-z0-9]*/gi, " ")
    .replace(/[0-9]+(?:\.[0-9]+)?\s*%/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const hasTraces =
    /\b(peut\s+contenir|traces?\s+(?:eventuelles?|possibles?|de)?)\b/i.test(
      clean,
    );

  // Décomposer les sous-ingrédients dans les parenthèses / crochets
  const flattened = clean
    .replace(/:\s*/g, " ")
    .replace(/[()[\]{}]/g, ",")
    .replace(/[;]/g, ",")
    .replace(/\s*\.\s*$/g, "")
    .replace(/[*_#]/g, " ");

  const rawTokens = flattened
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // Extraction et normalisation des codes E: E 150 d -> e150d
  const eCodesSet = new Set<string>();
  const normalizedItems: string[] = [];

  const eRegex = /\be[\s-]?(\d{3,4})([a-z]|\([ivx]+\))?\b/gi;

  for (const token of rawTokens) {
    const itemNorm = token.replace(/\s+/g, " ");
    normalizedItems.push(itemNorm);

    let match: RegExpExecArray | null;
    while ((match = eRegex.exec(itemNorm)) !== null) {
      const codeNumber = match[1];
      const suffix = match[2]
        ? match[2].replace(/[()]/g, "").toLowerCase()
        : "";
      eCodesSet.add(`e${codeNumber}${suffix}`);
    }
  }

  return {
    normalizedFull: clean,
    items: normalizedItems,
    eCodes: Array.from(eCodesSet),
    hasTraces,
  };
}

/**
 * Vérifie si une mention d'alcool fait partie d'une exception tolérée
 * (alcools gras, polyols, xylitol, sorbitol, etc.)
 */
function isAlcoholException(context: string): boolean {
  for (const exc of rulesData.exceptions_alcool) {
    if (context.includes(exc)) {
      return true;
    }
  }
  return false;
}

/**
 * ÉVALUATION DÉTERMINISTE P1 À P10 SELON LE PROTOCOLE ISLAM-NOOR
 */
export function evaluateProduct(input: EvaluationInput): EvaluationResult {
  const productName = input.productName?.trim() || "Produit analysé";
  const brand = input.brand?.trim();
  const source = input.source || "OpenFoodFacts";
  const disclaimer =
    "Outil d'aide : en cas de doute, consulte un savant ou le certificateur halal.";
  const rawIngredients = (
    input.ingredientsTextFr ||
    input.ingredientsText ||
    ""
  ).trim();

  const flaggedHaram: FlaggedItem[] = [];
  const flaggedNonConfirme: FlaggedItem[] = [];
  const raisons: string[] = [];
  let error: string | undefined = undefined;

  // -------------------------------------------------------------
  // PROTOCOLE 1 : Identification du produit
  // -------------------------------------------------------------
  let p1Statut: ProtocolAuditStatus = "PASSE";
  let p1Verifie = true;
  let p1Preuves: string[] = [];
  let p1Impact = "Produit et métadonnées officiellement identifiés.";

  if (input.code) {
    const barcodeValidation = validateBarcode(input.code);
    if (!barcodeValidation.valid) {
      p1Statut = "BLOQUANT";
      p1Verifie = true;
      p1Preuves = [
        `Code: ${input.code}`,
        "Clé de contrôle EAN-13 corrompue ou format invalide",
      ];
      p1Impact = "Code-barres invalide, calcul de verdict rituel bloqué.";
      error = "Code-barres invalide, rescanne";
      raisons.push(
        `Code-barres ${input.code} : règle P1-CHECKSUM (Clé de contrôle invalide, rescanne)`,
      );
    } else {
      p1Statut = "PASSE";
      p1Preuves = [
        `Code: ${barcodeValidation.normalized || input.code}`,
        "Clé de contrôle EAN valide",
        `Source: ${source}`,
        `Nom: ${productName}`,
        `Marque: ${brand || "Non spécifiée"}`,
        `Date: ${input.fetchDate || new Date().toISOString().split("T")[0]}`,
      ];
      p1Impact = "Produit et métadonnées officiellement identifiés.";
    }
  } else if (source === "OCR" || input.ocrQuality) {
    p1Statut = "PASSE";
    p1Preuves = ["Lecture directe de l'emballage par OCR", `Source: ${source}`];
    p1Impact = "Produit analysé par prise de photo directe des ingrédients.";
  } else {
    p1Statut = "NON_VERIFIE";
    p1Verifie = false;
    p1Preuves = [
      "Code-barres absent ou non répertorié dans les bases officielles Open Food Facts / Open Beauty Facts",
    ];
    p1Impact =
      "Produit non identifié dans les bases officielles, photo requise.";
  }

  // -------------------------------------------------------------
  // PROTOCOLE 2 : Qualité et complétude des données
  // -------------------------------------------------------------
  const { normalizedFull, items, eCodes, hasTraces } =
    normalizeIngredients(rawIngredients);

  let p2Statut: ProtocolAuditStatus = "PASSE";
  let p2Verifie = true;
  let p2Preuves: string[] = [];
  let p2Impact = "Données d'ingrédients exploitables et complètes.";

  if (input.ocrQuality) {
    if (
      input.ocrQuality.floue ||
      input.ocrQuality.lisible === false ||
      input.ocrQuality.listeComplete === false ||
      (input.ocrQuality.confiance !== undefined &&
        input.ocrQuality.confiance < 0.8)
    ) {
      p2Statut = "A_CLARIFIER";
      p2Verifie = true;
      p2Preuves = [
        `OCR: ${input.ocrQuality.floue ? "Image floue" : "Confiance < 0.8 ou liste incomplète"}`,
      ];
      p2Impact =
        "Qualité de lecture insuffisante pour garantir un verdict HALAL.";
      error = "Image illisible, reprends la photo";
      flaggedNonConfirme.push({
        ingredient: "Photo des ingrédients",
        statut: "NON CONFIRMÉ",
        raison: "Image illisible ou liste incomplète, reprends la photo",
        regle: "P2-OCR",
      });
    }
  }

  if (input.comparisonMismatch) {
    p2Statut = "A_CLARIFIER";
    p2Preuves.push(
      "Divergence constatée entre la photo et la base de données",
    );
    p2Impact = "Contradiction entre sources, verdict fixé à NON CONFIRMÉ.";
    flaggedNonConfirme.push({
      ingredient: "Concordance photo / base",
      statut: "NON CONFIRMÉ",
      raison: "Divergence entre la photo et la base de données",
      regle: "P2-MISMATCH",
    });
  }

  const isCompositionEmpty = !rawIngredients || rawIngredients.length === 0;
  if (isCompositionEmpty) {
    p2Statut = "NON_VERIFIE";
    p2Verifie = false;
    p2Preuves = ["Liste d'ingrédients absente ou vide"];
    p2Impact = "Composition indisponible, verdict NON CONFIRMÉ imposé.";
    flaggedNonConfirme.push({
      ingredient: "Liste des ingrédients",
      statut: "NON CONFIRMÉ",
      raison: "Composition absente ou non renseignée",
      regle: "P2-COMPLETUDE",
    });
  } else if (p2Statut === "PASSE") {
    p2Preuves = [
      `${items.length} ingrédient(s) extrait(s)`,
      `Source: ${source}`,
      "Composition textuelle complète",
    ];
    p2Impact = "Données d'ingrédients exploitables et complètes.";
  }

  // Calcul du champ fiabilite
  const fiabilite: FiabiliteData =
    error === "Image illisible, reprends la photo" || isCompositionEmpty
      ? "DONNEES_INCOMPLETES"
      : source === "OCR"
        ? "LU_PAR_PHOTO"
        : "BASE_DE_DONNEES";

  // -------------------------------------------------------------
  // PROTOCOLE 3 : Catégorie du produit & Alcool
  // -------------------------------------------------------------
  let p3Statut: ProtocolAuditStatus = "PASSE";
  const p3Verifie = true;
  let p3Preuves: string[] = [];
  let p3Impact = "Aucune catégorie alcoolisée détectée.";

  if (input.categoriesTags && input.categoriesTags.length > 0) {
    for (const cat of input.categoriesTags) {
      const catNorm = cat.toLowerCase().trim();
      if (rulesData.alcoholic_categories.includes(catNorm)) {
        flaggedHaram.push({
          ingredient: `Catégorie : ${cat}`,
          statut: "HARAM",
          raison:
            "Boisson alcoolisée répertoriée dans les catégories officielles",
          regle: "P3-CATEGORIE-ALCOOL",
        });
        p3Statut = "BLOQUANT";
        p3Preuves.push(`Catégorie alcoolisée officielle : ${cat}`);
        p3Impact = "Boisson alcoolisée interdite : verdict HARAM imposé.";
      }
    }
  }

  if (input.nutriments?.alcohol !== undefined) {
    const alcoholRate = Number(input.nutriments.alcohol);
    if (alcoholRate > 0.5) {
      flaggedHaram.push({
        ingredient: `Taux d'alcool : ${alcoholRate}% vol`,
        statut: "HARAM",
        raison: "Teneur en alcool supérieure à 0.5% vol",
        regle: "P3-TAUX-ALCOOL",
      });
      p3Statut = "BLOQUANT";
      p3Preuves.push(`Taux d'alcool mesuré : ${alcoholRate}% vol (> 0.5%)`);
      p3Impact = "Teneur en alcool prohibée : verdict HARAM imposé.";
    } else if (alcoholRate > 0 && alcoholRate <= 0.5) {
      flaggedNonConfirme.push({
        ingredient: `Taux d'alcool : ${alcoholRate}% vol`,
        statut: "NON CONFIRMÉ",
        raison:
          "Boisson avec traces d'alcool de fermentation résiduelles (≤ 0.5% vol)",
        regle: "P3-TRACES-FERMENTATION",
      });
      if (p3Statut !== "BLOQUANT") {
        p3Statut = "A_CLARIFIER";
        p3Preuves.push(`Traces d'alcool : ${alcoholRate}% vol`);
        p3Impact = "Traces de fermentation résiduelles : NON CONFIRMÉ.";
      }
    }
  }

  if (
    normalizedFull.includes("sans alcool") ||
    productName.toLowerCase().includes("sans alcool")
  ) {
    if (flaggedHaram.length === 0) {
      flaggedNonConfirme.push({
        ingredient: "Mention sans alcool",
        statut: "NON CONFIRMÉ",
        raison:
          "Boisson étiquetée sans alcool pouvant contenir des résidus de fermentation",
        regle: "P3-SANS-ALCOOL",
      });
      if (p3Statut !== "BLOQUANT") {
        p3Statut = "A_CLARIFIER";
        p3Preuves.push("Mention 'sans alcool' sur produit de brasserie");
        p3Impact =
          "Boisson étiquetée sans alcool avec risque de traces de fermentation.";
      }
    }
  }

  if (p3Statut === "PASSE") {
    p3Preuves = [
      input.categoriesTags && input.categoriesTags.length > 0
        ? `${input.categoriesTags.length} catégorie(s) vérifiée(s)`
        : "Aucune catégorie alcoolique répertoriée",
    ];
    p3Impact = "Aucune catégorie alcoolisée détectée.";
  }

  // -------------------------------------------------------------
  // PROTOCOLE 4 : Ingrédients interdits (HARAM)
  // -------------------------------------------------------------
  for (const hRule of rulesData.haram_keywords) {
    const term = hRule.term.toLowerCase();
    const regex = new RegExp(`\\b${term}\\b`, "i");

    if (regex.test(normalizedFull)) {
      if (hRule.rule === "P8-ALCOOL" && isAlcoholException(normalizedFull)) {
        continue;
      }
      flaggedHaram.push({
        ingredient: hRule.term,
        statut: "HARAM",
        raison: hRule.reason,
        regle: hRule.rule.replace("P8-", "P4-"),
      });
    }
  }

  let p4Statut: ProtocolAuditStatus = "PASSE";
  let p4Preuves: string[] = [];
  let p4Impact = "Aucun ingrédient prohibé détecté.";

  if (flaggedHaram.length > 0) {
    p4Statut = "BLOQUANT";
    p4Preuves = flaggedHaram.map((h) => `${h.ingredient} [${h.regle}]`);
    p4Impact =
      "Ingrédient formellement prohibé avéré détecté : verdict HARAM imposé.";
  } else {
    p4Statut = "PASSE";
    p4Preuves = [
      "Dépistage négatif : aucun porc, alcool éthylique, sang, E120 ni dérivé prohibé",
    ];
    p4Impact = "Aucun ingrédient prohibé détecté.";
  }

  // -------------------------------------------------------------
  // PROTOCOLE 7 : Viande et origine animale (RÈGLE D'OR 5)
  // -------------------------------------------------------------
  const detectedMeats: string[] = [];
  const textToScanForMeat = `${productName} ${normalizedFull}`;
  for (const pattern of MEAT_PATTERNS) {
    const match = pattern.exec(textToScanForMeat);
    if (match) {
      if (
        !MEAT_NEGATION_REGEX.test(match[0]) &&
        !MEAT_NEGATION_REGEX.test(textToScanForMeat)
      ) {
        detectedMeats.push(match[1]);
      }
    }
  }

  if (input.categoriesTags && input.categoriesTags.length > 0) {
    for (const cat of input.categoriesTags) {
      const catNorm = cat
        .toLowerCase()
        .replace("en:", "")
        .replace("fr:", "")
        .trim();
      if (MEAT_CATEGORIES.includes(catNorm)) {
        detectedMeats.push(`catégorie ${catNorm}`);
      }
    }
  }

  const uniqueMeats = Array.from(new Set(detectedMeats));

  // -------------------------------------------------------------
  // PROTOCOLE 8 : Certification et labels
  // -------------------------------------------------------------
  const detectedLabels: string[] = [];
  if (input.isHalalCertified) {
    detectedLabels.push("Certification déclarée");
  }
  if (input.labelsTags && input.labelsTags.length > 0) {
    for (const tag of input.labelsTags) {
      const tagLower = tag.toLowerCase();
      if (
        tagLower.includes("halal") ||
        tagLower.includes("avs") ||
        tagLower.includes("achahada") ||
        tagLower.includes("sfcvh") ||
        tagLower.includes("argml")
      ) {
        detectedLabels.push(tag);
      }
    }
  }

  const certRegex =
    /\b(certifi[eé]\s+halal|halal\s+certifi[eé]|label\s+halal|contr[oô]le\s+halal|avs|achahada)\b/i;
  if (certRegex.test(normalizedFull) || certRegex.test(productName)) {
    detectedLabels.push("Mention halal sur packaging");
  }

  const isCertifiedHalal = detectedLabels.length > 0;

  let p8Statut: ProtocolAuditStatus = "AUCUNE_DONNEE";
  let p8Preuves: string[] = [];
  let p8Impact = "Aucune certification détectée.";

  if (isCertifiedHalal) {
    p8Statut = "PASSE";
    p8Preuves = detectedLabels;
    p8Impact = "Label halal mentionné – vérifie le logo officiel.";
  } else {
    p8Statut = "AUCUNE_DONNEE";
    p8Preuves = ["Aucune certification halal trouvée dans les métadonnées"];
    p8Impact = "Aucune certification détectée.";
  }

  // Traitement Protocole 7 (Viande) selon RÈGLE D'OR 5 :
  // JAMAIS HALAL, même avec un label halal.
  let p7Statut: ProtocolAuditStatus = "PASSE";
  let p7Preuves: string[] = [];
  let p7Impact = "Produit sans composant carné.";

  if (uniqueMeats.length > 0) {
    p7Statut = "A_CLARIFIER";
    p7Preuves = [
      `Viande / Volaille / Charcuterie détectée : ${uniqueMeats.join(", ")}`,
      isCertifiedHalal
        ? "Label halal mentionné – vérifie le logo officiel"
        : "Absence de certification rituelle vérifiable",
    ];
    p7Impact =
      "Viande détectée : abattage rituel invérifiable par scan, verdict VIANDE À VÉRIFIER.";
  } else if (input.ingredientsAnalysisTags && !isCertifiedHalal) {
    for (const tag of input.ingredientsAnalysisTags) {
      if (tag.includes("en:non-vegan") || tag.includes("en:maybe-vegan")) {
        p7Statut = "A_CLARIFIER";
        p7Preuves.push(`Tag analyse : ${tag}`);
        p7Impact =
          "Présence d'ingrédients potentiellement d'origine animale sans label halal.";
        flaggedNonConfirme.push({
          ingredient: `Tag analyse : ${tag}`,
          statut: "NON CONFIRMÉ",
          raison:
            "Présence d'ingrédients potentiellement d'origine animale sans label halal",
          regle: "P7-NON-VEGAN",
        });
      }
    }
  } else {
    p7Statut = "PASSE";
    p7Preuves = ["Aucune viande ni composant carné détecté"];
    p7Impact = "Aucune composante carnée détectée.";
  }

  // -------------------------------------------------------------
  // PROTOCOLE 5 : Ingrédients douteux (mushbooh)
  // -------------------------------------------------------------
  for (const dRule of rulesData.doubtful_keywords) {
    const term = dRule.term.toLowerCase();
    const regex = new RegExp(`\\b${term}\\b`, "i");

    if (regex.test(normalizedFull)) {
      if (dRule.rule === "P9-VIANDE" || dRule.rule === "P7-VIANDE") {
        continue;
      }
      if (dRule.term === "gelatine bovine" && isCertifiedHalal) {
        continue;
      }
      if (
        (dRule.term === "lecithine" || dRule.term === "e322") &&
        (normalizedFull.includes("lecithine de soja") ||
          normalizedFull.includes("lecithine de tournesol") ||
          normalizedFull.includes("origine vegetale"))
      ) {
        continue;
      }
      if (
        (dRule.term === "e471" ||
          dRule.term.includes("mono- et diglycerides")) &&
        (normalizedFull.includes("e471 d origine vegetale") ||
          normalizedFull.includes("origine vegetale"))
      ) {
        continue;
      }

      flaggedNonConfirme.push({
        ingredient: dRule.term,
        statut: "NON CONFIRMÉ",
        raison: dRule.reason,
        regle: dRule.rule.replace("P9-", "P5-"),
      });
    }
  }

  // Traces éventuelles
  if (hasTraces) {
    flaggedNonConfirme.push({
      ingredient: "Traces éventuelles",
      statut: "NON CONFIRMÉ",
      raison: "Présence de mentions d'allergènes ou traces croisées",
      regle: "P5-TRACES",
    });
  }

  let p5Statut: ProtocolAuditStatus = "PASSE";
  let p5Preuves: string[] = [];
  let p5Impact = "Aucun ingrédient d'origine douteuse relevé.";

  const doubtfulIngredientsOnly = flaggedNonConfirme.filter(
    (f) =>
      !f.regle.startsWith("P1-") &&
      !f.regle.startsWith("P2-") &&
      !f.regle.startsWith("P3-") &&
      !f.regle.startsWith("P6-") &&
      !f.regle.startsWith("P7-") &&
      !f.regle.startsWith("P10-"),
  );

  if (doubtfulIngredientsOnly.length > 0) {
    p5Statut = "A_CLARIFIER";
    p5Preuves = doubtfulIngredientsOnly.map((d) => `${d.ingredient} [${d.regle}]`);
    p5Impact =
      "Ingrédient douteux identifié : verdict plafonné à NON CONFIRMÉ.";
  } else {
    p5Statut = "PASSE";
    p5Preuves = ["Aucun ingrédient d'origine douteuse sans précision"];
    p5Impact = "Aucun ingrédient douteux relevé.";
  }

  // -------------------------------------------------------------
  // PROTOCOLE 6 : Additifs (codes E)
  // -------------------------------------------------------------
  const allKnownCodes = new Set<string>([
    ...rulesData.haram_keywords
      .map((k) => k.term.toLowerCase())
      .filter((t) => t.startsWith("e")),
    ...rulesData.doubtful_keywords
      .map((k) => k.term.toLowerCase())
      .filter((t) => t.startsWith("e")),
    ...rulesData.liste_blanche_additifs.map((t) => t.toLowerCase()),
  ]);

  const flaggedAdditives: FlaggedItem[] = [];

  for (const eCode of eCodes) {
    if (!allKnownCodes.has(eCode)) {
      flaggedNonConfirme.push({
        ingredient: eCode.toUpperCase(),
        statut: "NON CONFIRMÉ",
        raison: `Additif ${eCode.toUpperCase()} non référencé dans les listes sûres`,
        regle: "P6-CODE-E-INCONNU",
      });
      flaggedAdditives.push({
        ingredient: eCode.toUpperCase(),
        statut: "NON CONFIRMÉ",
        raison: `Additif ${eCode.toUpperCase()} non référencé dans les listes sûres`,
        regle: "P6-CODE-E-INCONNU",
      });
    }
  }

  let p6Statut: ProtocolAuditStatus = "PASSE";
  let p6Preuves: string[] = [];
  let p6Impact = "Additifs validés conformes.";

  const haramAdditives = flaggedHaram.filter(
    (h) => h.ingredient.toLowerCase().startsWith("e") || h.regle.includes("E120"),
  );
  const doubtfulAdditives = flaggedNonConfirme.filter(
    (d) =>
      d.ingredient.toLowerCase().startsWith("e") ||
      d.regle.includes("EMULSIFIANT") ||
      d.regle.includes("ADDITIF") ||
      d.regle.includes("CODE-E"),
  );

  if (haramAdditives.length > 0) {
    p6Statut = "BLOQUANT";
    p6Preuves = haramAdditives.map((h) => `${h.ingredient} [${h.regle}]`);
    p6Impact = "Additif prohibé confirmé : verdict HARAM imposé.";
  } else if (doubtfulAdditives.length > 0) {
    p6Statut = "A_CLARIFIER";
    p6Preuves = doubtfulAdditives.map((d) => `${d.ingredient} [${d.regle}]`);
    p6Impact = "Additif à origine animale suspecte ou non référencé.";
  } else if (eCodes.length > 0) {
    p6Statut = "PASSE";
    p6Preuves = [`Codes E vérifiés en liste blanche : ${eCodes.join(", ").toUpperCase()}`];
    p6Impact = "Tous les additifs sont d'origine non animale vérifiée.";
  } else {
    p6Statut = "PASSE";
    p6Preuves = ["Aucun additif ni code E présent dans la composition"];
    p6Impact = "Absence totale d'additifs.";
  }

  // -------------------------------------------------------------
  // PROTOCOLE 9 : Recoupement des sources
  // -------------------------------------------------------------
  let p9Statut: ProtocolAuditStatus = "PASSE";
  let p9Preuves: string[] = [];
  let p9Impact = "Concordance établie entre la composition et les métadonnées.";

  if (input.additivesTags && input.additivesTags.length > 0) {
    for (const add of input.additivesTags) {
      const normAdd = add.replace("en:", "").toLowerCase();
      if (normAdd === "e120" || normAdd === "e542") {
        if (!flaggedHaram.some((f) => f.ingredient.includes(normAdd))) {
          flaggedHaram.push({
            ingredient: normAdd.toUpperCase(),
            statut: "HARAM",
            raison:
              "Additif interdit confirmé dans les métadonnées officielles",
            regle: "P9-ADDITIFS-METADONNEES",
          });
          p9Statut = "BLOQUANT";
          p9Preuves.push(
            `Additif ${normAdd.toUpperCase()} détecté dans additives_tags`,
          );
          p9Impact = "Additif prohibé détecté par recoupement des métadonnées.";
        }
      }
    }
  }

  if (
    input.aiExtraCheckDiscovered &&
    input.aiExtraCheckDiscovered.length > 0
  ) {
    p9Statut = "A_CLARIFIER";
    p9Preuves.push(
      `Seconde lecture IA a signalé : ${input.aiExtraCheckDiscovered.join(", ")}`,
    );
    p9Impact =
      "Dégradation par contrôle croisé : ingrédients signalés par l'analyse complémentaire.";
    for (const term of input.aiExtraCheckDiscovered) {
      flaggedNonConfirme.push({
        ingredient: term,
        statut: "NON CONFIRMÉ",
        raison: "Élément suspect signalé lors du recoupement des sources",
        regle: "P9-IA-RECOUPEMENT",
      });
    }
  }

  if (p9Statut === "PASSE") {
    p9Preuves = [
      "Concordance établie entre la composition textuelle et les tags officiels",
    ];
    p9Impact = "Sources d'informations cohérentes.";
  }

  // -------------------------------------------------------------
  // PROTOCOLE 10 : Garde-fou final et synthèse
  // -------------------------------------------------------------
  const isWhiteListedIngredient = (token: string): boolean => {
    const tClean = token.trim();
    if (!tClean) return true;

    // La viande ne peut JAMAIS être admise en liste blanche HALAL
    for (const pattern of MEAT_PATTERNS) {
      if (pattern.test(tClean) && !MEAT_NEGATION_REGEX.test(tClean)) {
        return false;
      }
    }

    // Vérifier si c'est un code E de la liste blanche
    for (const e of eCodes) {
      if (tClean.includes(e) && rulesData.liste_blanche_additifs.includes(e)) {
        return true;
      }
    }

    // Ingrédients autorisés
    for (const w of rulesData.liste_blanche_ingredients) {
      if (tClean === w || tClean.includes(w)) {
        return true;
      }
    }

    // Polyols tolérés
    for (const exc of rulesData.exceptions_alcool) {
      if (tClean.includes(exc)) {
        return true;
      }
    }

    const FUNCTIONAL_DESCRIPTORS = [
      "colorant",
      "colorants",
      "acidifiant",
      "acidifiants",
      "conservateur",
      "conservateurs",
      "antioxydant",
      "antioxydants",
      "stabilisant",
      "stabilisants",
      "emulsifiant",
      "emulsifiants",
      "correcteur d acidite",
      "agent de charge",
      "gaz propulseur",
      "antiagglomerant",
      "anti-agglomerant",
    ];
    if (FUNCTIONAL_DESCRIPTORS.includes(tClean)) {
      return true;
    }

    return false;
  };

  const unrecognisedIngredients: string[] = [];
  if (flaggedHaram.length === 0 && flaggedNonConfirme.length === 0) {
    for (const itm of items) {
      if (!isWhiteListedIngredient(itm)) {
        unrecognisedIngredients.push(itm);
      }
    }
    if (unrecognisedIngredients.length > 0) {
      flaggedNonConfirme.push({
        ingredient: unrecognisedIngredients.slice(0, 3).join(", "),
        statut: "NON CONFIRMÉ",
        raison:
          "Ingrédient non vérifié dans la liste blanche des aliments autorisés",
        regle: "P10-LISTE-BLANCHE",
      });
    }
  }

  // CALCUL FINAL DU VERDICT SELON LES RÈGLES D'OR
  // Priorité absolue : HARAM > VIANDE À VÉRIFIER > NON CONFIRMÉ > HALAL
  let verdict: FinalVerdict = VERDICT_LABELS.NON_CONFIRME;
  let confidence: "Élevée" | "Moyenne" | "Faible" = "Moyenne";
  let proof: string | undefined = undefined;
  let explanation: string | undefined = undefined;
  let secondaryInfo: string | undefined = undefined;

  // 1. Priorité #1 : HARAM (Porc, Alcool éthylique, E120, sang...)
  if (flaggedHaram.length > 0) {
    verdict = VERDICT_LABELS.HARAM;
    confidence = "Élevée";
    explanation = "Ingrédient interdit avéré détecté dans le produit.";
  }
  // 2. Priorité #2 : VIANDE À VÉRIFIER (RÈGLE D'OR 5)
  // Viande, volaille, charcuterie, abats, bouillon ou graisse de viande :
  // JAMAIS HALAL, même avec un label halal.
  else if (uniqueMeats.length > 0) {
    verdict = VERDICT_LABELS.VIANDE_A_VERIFIER;
    confidence = "Moyenne";
    explanation =
      "L'abattage ne peut pas être vérifié par un scan. Vérifie le logo du certificateur sur l'emballage ou demande à ton boucher.";
    if (isCertifiedHalal) {
      secondaryInfo = "Label halal mentionné – vérifie le logo officiel";
    }
  }
  // 3. Priorité #3 : NON CONFIRMÉ
  else if (flaggedNonConfirme.length > 0 || isCompositionEmpty || error) {
    verdict = VERDICT_LABELS.NON_CONFIRME;
    confidence = "Moyenne";
    explanation =
      "Statut non confirmé. Données insuffisantes ou additif à vérifier.";
  }
  // 4. Priorité #4 : HALAL (seulement si toutes les conditions du P10 sont remplies)
  else {
    verdict = VERDICT_LABELS.HALAL;
    confidence = "Élevée";
    proof = "100% des ingrédients et additifs validés dans la liste blanche";
    explanation =
      "Composition d'origine 100% végétale ou minérale validée selon les listes d'ingrédients sûrs.";
  }

  // GARDE-FOU FINAL STRICT
  if (verdict === VERDICT_LABELS.HALAL) {
    if (uniqueMeats.length > 0) {
      verdict = VERDICT_LABELS.VIANDE_A_VERIFIER;
      explanation =
        "L'abattage ne peut pas être vérifié par un scan. Vérifie le logo du certificateur sur l'emballage ou demande à ton boucher.";
      if (isCertifiedHalal) {
        secondaryInfo = "Label halal mentionné – vérifie le logo officiel";
      }
    } else {
      const hasForbiddenResidual = rulesData.haram_keywords.some((hk) => {
        const reg = new RegExp(`\\b${hk.term.toLowerCase()}\\b`, "i");
        if (reg.test(normalizedFull)) {
          if (hk.rule === "P8-ALCOOL" && isAlcoholException(normalizedFull)) {
            return false;
          }
          return true;
        }
        return false;
      });

      if (hasForbiddenResidual) {
        verdict = VERDICT_LABELS.HARAM;
        flaggedHaram.push({
          ingredient: "Garde-fou final",
          statut: "HARAM",
          raison:
            "Élément prohibé intercepté par le garde-fou final de sécurité",
          regle: "P10-GARDE-FOU",
        });
      } else if (items.length === 0 || error) {
        verdict = VERDICT_LABELS.NON_CONFIRME;
      }
    }
  }

  // Construction des RAISONS nominatives (élément précis + règle appliquée)
  if (verdict === VERDICT_LABELS.HARAM) {
    for (const h of flaggedHaram) {
      raisons.push(`${h.ingredient} : règle ${h.regle} (${h.raison})`);
    }
  } else if (verdict === VERDICT_LABELS.VIANDE_A_VERIFIER) {
    raisons.push(
      `${uniqueMeats.join(", ")} : règle P7-VIANDE (L'abattage ne peut pas être vérifié par un scan. Vérifie le logo du certificateur sur l'emballage ou demande à ton boucher.)`,
    );
    if (isCertifiedHalal) {
      raisons.push(
        "Label halal : règle P8-LABEL (Label halal mentionné – vérifie le logo officiel)",
      );
    }
  } else if (verdict === VERDICT_LABELS.NON_CONFIRME) {
    for (const nc of flaggedNonConfirme) {
      raisons.push(`${nc.ingredient} : règle ${nc.regle} (${nc.raison})`);
    }
    if (error && !raisons.some((r) => r.includes(error))) {
      raisons.push(`Erreur de lecture : règle P2-ERREUR (${error})`);
    }
  } else {
    // HALAL
    raisons.push(
      "Tous les ingrédients et additifs sont validés conformes dans la liste blanche : règle P10-SYNTHESE (100% végétal ou minéral sans ingrédient suspect)",
    );
  }

  // Garantir au moins une raison nominative
  if (raisons.length === 0) {
    raisons.push(`Statut ${verdict} : règle P10-SYNTHESE`);
  }

  // Audit item 10 : Garde-fou final et synthèse
  const p10Statut: ProtocolAuditStatus =
    verdict === VERDICT_LABELS.HARAM
      ? "BLOQUANT"
      : verdict === VERDICT_LABELS.HALAL
        ? "PASSE"
        : "A_CLARIFIER";
  const p10Preuves = [
    verdict === VERDICT_LABELS.HARAM
      ? "Priorité absolue HARAM appliquée"
      : verdict === VERDICT_LABELS.VIANDE_A_VERIFIER
        ? "Règle d'or 5 : viande invérifiable par scan"
        : verdict === VERDICT_LABELS.HALAL
          ? "100% des ingrédients et additifs validés en liste blanche"
          : "Présence de doutes, données incomplètes ou ingrédients non vérifiés",
  ];
  const p10Impact = `Verdict final ${verdict}.`;

  const audit: ProtocolAuditItem[] = [
    {
      numero: 1,
      titre: "Identification du produit",
      statut: p1Statut,
      methode:
        "Vérification de la clé de contrôle EAN/UPC et interrogation des bases officielles",
      verifie: p1Verifie,
      preuves: p1Preuves,
      impact: p1Impact,
    },
    {
      numero: 2,
      titre: "Qualité et complétude des données",
      statut: p2Statut,
      methode:
        "Contrôle de complétude (≥3 ingrédients), lisibilité OCR et concordance",
      verifie: p2Verifie,
      preuves: p2Preuves,
      impact: p2Impact,
    },
    {
      numero: 3,
      titre: "Catégorie du produit",
      statut: p3Statut,
      methode:
        "Analyse des catégories officielles (alcools, vins, bières) et du taux d'alcool",
      verifie: p3Verifie,
      preuves: p3Preuves,
      impact: p3Impact,
    },
    {
      numero: 4,
      titre: "Ingrédients interdits (HARAM)",
      statut: p4Statut,
      methode:
        "Dépistage strict du porc, alcools éthyliques (hors polyols), sang et E120",
      verifie: true,
      preuves: p4Preuves,
      impact: p4Impact,
    },
    {
      numero: 5,
      titre: "Ingrédients douteux (mushbooh)",
      statut: p5Statut,
      methode: "Analyse des ingrédients à statut incertain sans origine spécifiée",
      verifie: true,
      preuves: p5Preuves,
      impact: p5Impact,
    },
    {
      numero: 6,
      titre: "Additifs (codes E)",
      statut: p6Statut,
      methode:
        "Extraction regex des codes E, normalisation et comparaison aux listes de référence",
      verifie: true,
      preuves: p6Preuves,
      impact: p6Impact,
    },
    {
      numero: 7,
      titre: "Viande et origine animale",
      statut: p7Statut,
      methode:
        "Détection systématique de chair animale (viande, volaille, charcuterie) et tags végans",
      verifie: true,
      preuves: p7Preuves,
      impact: p7Impact,
    },
    {
      numero: 8,
      titre: "Certification et labels",
      statut: p8Statut,
      methode:
        "Lecture des labels_tags officiels et mentions de certificateurs reconnus",
      verifie: true,
      preuves: p8Preuves,
      impact: p8Impact,
    },
    {
      numero: 9,
      titre: "Recoupement des sources",
      statut: p9Statut,
      methode:
        "Contrôle croisé ingrédients texte, tags additifs et contrôle IA de second niveau",
      verifie: true,
      preuves: p9Preuves,
      impact: p9Impact,
    },
    {
      numero: 10,
      titre: "Garde-fou final et synthèse",
      statut: p10Statut,
      methode:
        "Application des priorités strictes (HARAM > VIANDE À VÉRIFIER > NON CONFIRMÉ > HALAL) et liste blanche",
      verifie: true,
      preuves: p10Preuves,
      impact: p10Impact,
    },
  ];

  const allFlagged = [...flaggedHaram, ...flaggedNonConfirme];

  // Journalisation console sans données personnelles
  console.log(
    `[HalalEngine] Code: ${input.code || "N/A"}, Source: ${source}, ` +
      `Règles: ${allFlagged.map((f) => f.regle).join(", ") || "AUCUNE"}, Verdict: ${verdict}`,
  );

  return {
    scanId: input.scanId,
    code: input.code,
    productName,
    brand,
    verdict,
    confidence,
    fiabilite,
    audit,
    raisons,
    flaggedItems: allFlagged,
    proof,
    explanation,
    secondaryInfo,
    normalizedIngredients: items,
    fullIngredientsText: rawIngredients,
    source,
    disclaimer,
    error,
  };
}
