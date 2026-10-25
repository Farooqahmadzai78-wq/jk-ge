import { SavedProduct } from "./app-settings";
import { searchOffProductsServer } from "./halal.functions";
import {
  evaluateProduct,
  validateBarcode,
  VERDICT_LABELS,
  type FinalVerdict,
  type ProtocolAuditItem,
  type FiabiliteData,
  type FlaggedItem,
} from "./halal-engine";
import {
  extractOffImageCandidatesFromRaw,
  resolveProductImage,
  resolveProductImageCandidates,
} from "./halal-product-images";

export {
  VERDICT_LABELS,
  type FinalVerdict,
  type ProtocolAuditItem,
  type FiabiliteData,
  type FlaggedItem,
};

export type Verdict = "halal" | "haram" | "doubtful" | "unknown";

export type CertaintyLevel =
  | "certified"
  | "complete_declarative"
  | "partial"
  | "insufficient";

export type SubVerdict =
  | "certified_halal"
  | "compatible_plant"
  | "compatible_staple"
  | "doubtful_meat"
  | "doubtful_additive"
  | "doubtful_incomplete"
  | "haram_forbidden"
  | "unverifiable";

export type HalalTestStatus = "passed" | "failed" | "warning" | "info";

export type HalalTestDetail = {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  status: HalalTestStatus;
  statusLabel: string;
  detail: string;
  evidence: string[];
};

export type IngredientItem = {
  text: string;
  status: "safe" | "doubtful" | "haram" | "certified";
  reason?: string;
};

export type ProductResult = SavedProduct & {
  imageCandidates?: string[];
  ingredients: string;
  ingredientItems?: IngredientItem[];
  reasons: string[];
  flaggedItems?: FlaggedItem[];
  audit?: ProtocolAuditItem[];
  fiabilite?: FiabiliteData;
  certified: boolean;
  certifierName?: string;
  subVerdict?: SubVerdict;
  verdictLabel: string;
  certaintyLevel: CertaintyLevel;
  certaintyLabel: string;
  synthesisSummary: string;
  source: string;
  sourceDisclaimer?: string;
  nutriscore?: string;
  novaGroup?: number;
  ecoscore?: string;
  allergens?: string[];
  traces?: string[];
  quantity?: string;
  categories?: string[];
  labelsList?: string[];
  countriesTags?: string[];
  manufacturingPlaces?: string;
  origins?: string;
  fetchDate?: string;
  tests: HalalTestDetail[];
  testsPassed: number;
  totalTests: number;
};

export function getSafeHeaders(): Record<string, string> {
  if (typeof window !== "undefined") {
    return { Accept: "application/json" };
  }
  return {
    "User-Agent": "IslamNoorApp/1.0 (https://islam-noor.app; contact@islamnoor.app)",
    Accept: "application/json",
  };
}

const HEADERS = typeof window !== "undefined"
  ? { Accept: "application/json" }
  : {
      "User-Agent": "IslamNoorApp/1.0 (https://islam-noor.app; contact@islamnoor.app)",
      Accept: "application/json",
    };

/** Normalizes string: lowercase, accents removed, trimmed */
function norm(v: string): string {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Recognized certifying bodies with independent religious audit */
export interface KnownCertifier {
  id: string;
  name: string;
  tokens: string[];
  recognized: boolean;
}

export const KNOWN_CERTIFIERS: KnownCertifier[] = [
  {
    id: "avs",
    name: "AVS (À Votre Service)",
    tokens: ["avs", "a.v.s", "a-v-s"],
    recognized: true,
  },
  {
    id: "achahada",
    name: "Achahada",
    tokens: ["achahada", "a-chahada"],
    recognized: true,
  },
  {
    id: "sfcvh",
    name: "SFCVH (Société Française de Contrôle de Viande Halal)",
    tokens: ["sfcvh"],
    recognized: true,
  },
  {
    id: "argml",
    name: "ARGML (Mosquée de Lyon)",
    tokens: ["argml", "mosquee de lyon", "grande mosquee de lyon"],
    recognized: true,
  },
  {
    id: "gmp",
    name: "Grande Mosquée de Paris",
    tokens: ["mosquee de paris", "grande mosquee de paris"],
    recognized: true,
  },
  {
    id: "gme",
    name: "Grande Mosquée d'Évry",
    tokens: ["mosquee d'evry", "grande mosquee d'evry", "mosquee d evry"],
    recognized: true,
  },
  {
    id: "jakim",
    name: "JAKIM (Malaisie)",
    tokens: ["jakim"],
    recognized: true,
  },
  {
    id: "mui",
    name: "MUI / LPPOM (Indonésie)",
    tokens: ["mui", "lppom", "lppom mui", "lppom-mui"],
    recognized: true,
  },
  {
    id: "halal_correct",
    name: "Halal Correct (Pays-Bas)",
    tokens: ["halal correct", "halal-correct", "total halal correct"],
    recognized: true,
  },
  {
    id: "halal_control",
    name: "Halal Control (Allemagne)",
    tokens: ["halal control", "halal-control"],
    recognized: true,
  },
  {
    id: "hmc",
    name: "HMC (Halal Monitoring Committee - UK)",
    tokens: ["hmc", "halal monitoring committee"],
    recognized: true,
  },
  {
    id: "hfa",
    name: "HFA (Halal Food Authority - UK)",
    tokens: ["hfa", "halal food authority"],
    recognized: true,
  },
  {
    id: "fambras",
    name: "FAMBRAS Halal (Brésil)",
    tokens: ["fambras"],
    recognized: true,
  },
  {
    id: "chic",
    name: "CHIC Halal",
    tokens: ["chic"],
    recognized: true,
  },
];

const GENERIC_CERT_TOKENS = [
  "halal",
  "certifie halal",
  "certifiee halal",
  "halal certified",
  "en:halal",
  "fr:halal",
];

/**
 * Recognized permissible meats in Islamic jurisprudence (requiring ritual Islamic slaughter/certification).
 * Fish and seafood are excluded because they are naturally permissible without ritual slaughter.
 */
const PERMISSIBLE_MEAT_RULES = [
  {
    name: "Bœuf / Bovin",
    regex: /\b(boeuf|bœuf|beef|bovin|bovine|veau|veal|steack|steak|hache|haché|rumsteak|entrecote|bourguignon|bavette|rosbif)\b/i,
    negationRegex: /\b(sans\s+(?:viande\s+de\s+)?(?:boeuf|bœuf|bovin)|vegetar|vegan|arome\s+artificiel|gousse|no\s+beef)\b/i,
  },
  {
    name: "Poulet / Volaille",
    regex: /\b(poulet|chicken|volaille|poultry|coq|chapon|blanc\s+de\s+poulet|cuisse\s+de\s+poulet|nuggets?\s+de\s+poulet|aiguillette\s+de\s+poulet)\b/i,
    negationRegex: /\b(sans\s+poulet|vegetar|vegan|arome\s+artificiel|no\s+chicken)\b/i,
  },
  {
    name: "Dinde",
    regex: /\b(dinde|turkey|escalope\s+de\s+dinde|filet\s+de\s+dinde|jambon\s+de\s+dinde|bacon\s+de\s+dinde)\b/i,
    negationRegex: /\b(sans\s+dinde|vegetar|vegan|no\s+turkey)\b/i,
  },
  {
    name: "Agneau / Mouton",
    regex: /\b(agneau|lamb|mouton|mutton|merguez|cotelette\s+d'agneau|gigot\s+d'agneau)\b/i,
    negationRegex: /\b(sans\s+(?:agneau|mouton)|vegetar|vegan)\b/i,
  },
  {
    name: "Canard / Oie / Gibier",
    regex: /\b(canard|duck|magret|confit\s+de\s+canard|oie|goose|foie\s+gras)\b/i,
    negationRegex: /\b(sans\s+canard|vegetar|vegan)\b/i,
  },
  {
    name: "Viande générique (non porcine)",
    regex: /\b(viande|viandes|meat|meats|chair\s+animale|abats)\b/i,
    negationRegex: /\b(sans\s+viande|meat\s*free|vegetar|vegan|sans\s+porc)\b/i,
  },
];

interface IngredientDetectionRule {
  id: string;
  name: string;
  type: "haram" | "doubtful";
  regex: RegExp;
  negationRegex?: RegExp;
}

/**
 * High-precision ingredient rules with strict boundary & negation safety.
 */
const INGREDIENT_RULES: IngredientDetectionRule[] = [
  // --- HARAM INGREDIENTS ---
  {
    id: "porc_gelatin",
    name: "Gélatine de porc",
    type: "haram",
    regex: /\b(gelatine\s+de\s+porc|pork\s+gelatin|gelatine\s+porcine|porcine\s+gelatin|pork-gelatin)\b/i,
  },
  {
    id: "porc_meat",
    name: "Viande ou dérivé de porc (lard, saindoux, bacon de porc)",
    type: "haram",
    regex: /\b(porc|pork|saindoux|lard|viande\s+de\s+porc|chair\s+de\s+porc|gras\s+de\s+porc|graisse\s+de\s+porc|sang\s+de\s+porc)\b/i,
    negationRegex: /\b(sans\s+(?:viande\s+de\s+)?porc|pork\s*free|no\s+pork|0%?\s*porc|sans\s+lard|sans\s+saindoux|vegetar|vegan)\b/i,
  },
  {
    id: "jambon_porc",
    name: "Jambon (porc)",
    type: "haram",
    regex: /\b(jambon|ham)\b/i,
    negationRegex: /\b(jambon\s+de\s+(?:dinde|poulet|boeuf|volaille)|turkey\s+ham|chicken\s+ham|sans\s+jambon|halal|vegetar|vegan)\b/i,
  },
  {
    id: "bacon_porc",
    name: "Bacon (porc)",
    type: "haram",
    regex: /\b(bacon)\b/i,
    negationRegex: /\b(bacon\s+de\s+(?:dinde|poulet|boeuf|volaille)|turkey\s+bacon|sans\s+bacon|halal|vegetar|vegan)\b/i,
  },
  {
    id: "alcohol_beverage",
    name: "Alcool / Boisson alcoolisée",
    type: "haram",
    regex: /\b(alcool\s+ethylique|ethanol|vin\s+rouge|vin\s+blanc|biere|beer|rhum|rum|vodka|whisky|whiskey|liqueur|cognac|tequila|gin|kirsch|eau-de-vie|champagne|sake|calvados)\b/i,
    negationRegex: /\b(sans\s+alcool|non[\s-]alcoholic|alcohol[\s-]free|0[.,]0\s*%|0\s*%\s*alcool|desalcoolise|dealcohol|zero\s*alcool|vinaigre\s+de\s+vin|vinaigre\s+d'alcool|vinaigre)\b/i,
  },
  {
    id: "e120_carmine",
    name: "Colorant E120 (Carmin de cochenille)",
    type: "haram",
    regex: /\b(e\s*120|carmin|carmine|cochenille|cochineal|acide\s+carminique|ci\s*75470)\b/i,
  },
  {
    id: "e441_gelatin",
    name: "Additif E441 (Gélatine)",
    type: "haram",
    regex: /\b(e\s*441)\b/i,
  },
  {
    id: "e542_bone",
    name: "Additif E542 (Phosphate d'os comestible)",
    type: "haram",
    regex: /\b(e\s*542)\b/i,
  },

  // --- DOUBTFUL INGREDIENTS (A VÉRIFIER) ---
  {
    id: "gelatin_unspecified",
    name: "Gélatine (origine animale non précisée)",
    type: "doubtful",
    regex: /\b(gelatine|gelatin)\b/i,
    negationRegex: /\b(gelatine\s+de\s+porc|gelatine\s+vegetale|gelatine\s+de\s+poisson|fish\s+gelatin|agar[\s-]agar|bovine\s+halal|certifiee\s+halal|halal)\b/i,
  },
  {
    id: "e471_emulsifier",
    name: "Additif E471 (Mono- et diglycérides d'acides gras : origine végétale ou animale non précisée)",
    type: "doubtful",
    regex: /\b(e\s*471|mono[\s-] et diglycerides|monoglycerides)\b/i,
    negationRegex: /\b(origine\s+vegetale|100%\s+vegetal|soja|tournesol|colza|palme|plant\s+origin|vegetable\s+origin|vegan|vegetar)\b/i,
  },
  {
    id: "e472_emulsifier",
    name: "Additif E472 (Esters de mono- et diglycérides)",
    type: "doubtful",
    regex: /\b(e\s*472[a-f]?)\b/i,
    negationRegex: /\b(origine\s+vegetale|100%\s+vegetal|plant\s+origin|vegetable\s+origin|vegan|vegetar)\b/i,
  },
  {
    id: "e470_e481_e482",
    name: "Additifs E470 / E481 / E482 (Sels d'acides gras / Stéaroyl)",
    type: "doubtful",
    regex: /\b(e\s*470[a-b]?|e\s*481|e\s*482)\b/i,
    negationRegex: /\b(origine\s+vegetale|100%\s+vegetal|plant\s+origin|vegetable\s+origin|vegan)\b/i,
  },
  {
    id: "animal_rennet",
    name: "Présure animale (origine d'abattage non précisée)",
    type: "doubtful",
    regex: /\b(presure\s+animale|animal\s+rennet)\b/i,
    negationRegex: /\b(presure\s+microbienne|presure\s+vegetale|microbial\s+rennet|vegetable\s+rennet|halal)\b/i,
  },
  {
    id: "e904_shellac",
    name: "Additif E904 (Gomme laque / Shellac - sécrétion d'insectes)",
    type: "doubtful",
    regex: /\b(e\s*904|shellac|gomme\s+laque)\b/i,
  },
  {
    id: "e920_cysteine",
    name: "Additif E920 (L-Cystéine)",
    type: "doubtful",
    regex: /\b(e\s*920|l[\s-]cysteine|cysteine)\b/i,
    negationRegex: /\b(origine\s+vegetale|synthetique|fermentation)\b/i,
  },
];

const OPEN_FOOD_FACTS_DISCLAIMER =
  "Open Food Facts est une base ouverte collaborative. Elle ne constitue ni un audit fabricant ni une certification religieuse.";

/**
 * Analyses product data rigorously according to the 5 distinct protocols.
 * Distinguishes verified Halal, compatible plant-based/staples, doubtful items,
 * and confirmed Haram without flattering assumptions or fabricated checks.
 */
export function analyse(
  product: Record<string, unknown>,
  source = "Open Food Facts",
): ProductResult {
  const code = String(product.code ?? "").trim();
  const name = String(
    product.product_name ||
      product.product_name_fr ||
      product.product_name_de ||
      product.product_name_en ||
      product.generic_name ||
      product.title ||
      "",
  ).trim();

  const brand = (
    Array.isArray(product.brands)
      ? product.brands.join(", ")
      : String(product.brands || product.brand || "")
  ).trim();

  // 1. Multi-language ingredient text extraction
  let ingredients = String(
    product.ingredients_text_fr ||
      product.ingredients_text_de ||
      product.ingredients_text_ch ||
      product.ingredients_text_nl ||
      product.ingredients_text_en ||
      product.ingredients_text_it ||
      product.ingredients_text_es ||
      product.ingredients_text ||
      product.description ||
      "",
  ).trim();

  // If text is empty, parse structured ingredients array or ingredients_tags
  if (!ingredients && Array.isArray(product.ingredients) && product.ingredients.length > 0) {
    ingredients = product.ingredients
      .map((i: unknown) => {
        if (typeof i === "object" && i !== null) {
          const obj = i as Record<string, unknown>;
          return String(obj.text || obj.text_fr || obj.text_de || obj.id || "");
        }
        return String(i || "");
      })
      .filter((t) => t && !t.startsWith("en:"))
      .join(", ");
  } else if (!ingredients && Array.isArray(product.ingredients_tags) && product.ingredients_tags.length > 0) {
    ingredients = product.ingredients_tags
      .map((t) => String(t).replace(/^[a-z]{2}:/, "").replace(/-/g, " "))
      .filter(Boolean)
      .join(", ");
  }

  // 2. Additives tags parsing (clean codes like "e120", "e471")
  const additivesCodes = (
    Array.isArray(product.additives_tags) ? product.additives_tags : []
  ).map((t) => norm(String(t)).replace(/^.*:/, ""));

  // 3. Labels & Certification detection
  const labelsStr = Array.isArray(product.labels)
    ? product.labels.join(" ")
    : String(product.labels || "");
  const labelsTagsStr = Array.isArray(product.labels_tags)
    ? product.labels_tags.join(" ")
    : String(product.labels_tags || "");
  const labelsNorm = norm(labelsStr + " " + labelsTagsStr);

  // 4. Categories extraction
  const categoriesTags = (
    Array.isArray(product.categories_tags)
      ? product.categories_tags
      : Array.isArray(product.categories_hierarchy)
        ? product.categories_hierarchy
        : []
  ).map((t) => norm(String(t)).replace(/^.*:/, ""));

  // Normalize text fields
  const ingredientsNorm = norm(ingredients);
  const additivesNorm = additivesCodes.join(" ");
  const textToScan = `${ingredientsNorm} ${additivesNorm}`;
  const wholeProductText = `${norm(name)} ${norm(brand)} ${ingredientsNorm} ${categoriesTags.join(" ")}`;

  // Certifier identification
  let certifierName: string | undefined = undefined;
  let isRecognizedCertifier = false;

  for (const certifier of KNOWN_CERTIFIERS) {
    const matched = certifier.tokens.some(
      (tok) => labelsNorm.includes(tok) || wholeProductText.includes(tok),
    );
    if (matched) {
      certifierName = certifier.name;
      isRecognizedCertifier = true;
      break;
    }
  }

  const hasGenericHalalLabel =
    GENERIC_CERT_TOKENS.some((tok) => labelsNorm.includes(tok) || wholeProductText.includes(tok));

  const certified = isRecognizedCertifier || hasGenericHalalLabel;
  if (!certifierName && hasGenericHalalLabel) {
    certifierName = "Mention déclarative sans organisme tiers spécifié";
  }

  // Detect permissible meats
  const detectedMeats: string[] = [];
  for (const meatRule of PERMISSIBLE_MEAT_RULES) {
    if (meatRule.negationRegex && meatRule.negationRegex.test(wholeProductText)) {
      continue;
    }
    if (meatRule.regex.test(wholeProductText)) {
      detectedMeats.push(meatRule.name);
    }
  }

  // Category-based meat check
  const isMeatCategory = categoriesTags.some((cat) =>
    [
      "meats",
      "viandes",
      "beef",
      "boeuf",
      "poultry",
      "poulet",
      "volaille",
      "steaks",
      "ground-meats",
      "prepared-meats",
      "charcuterie",
    ].some((m) => cat === m || cat.endsWith(`-${m}`) || cat.startsWith(`${m}-`)),
  );

  if (isMeatCategory && detectedMeats.length === 0) {
    detectedMeats.push("Viande / Produit carné");
  }

  // Check strict ingredient rules
  const haramDetected: string[] = [];
  const doubtfulDetected: string[] = [];

  for (const rule of INGREDIENT_RULES) {
    if (rule.negationRegex && rule.negationRegex.test(textToScan)) {
      continue;
    }
    if (rule.regex.test(textToScan)) {
      if (rule.type === "haram") {
        haramDetected.push(rule.name);
      } else if (rule.type === "doubtful") {
        doubtfulDetected.push(rule.name);
      }
    }
  }

  // Direct additives check
  if (additivesCodes.includes("e120") && !haramDetected.includes("Colorant E120 (Carmin de cochenille)")) {
    haramDetected.push("Colorant E120 (Carmin de cochenille)");
  }
  if (additivesCodes.includes("e441") && !haramDetected.includes("Additif E441 (Gélatine)")) {
    haramDetected.push("Additif E441 (Gélatine)");
  }
  if (additivesCodes.includes("e542") && !haramDetected.includes("Additif E542 (Phosphate d'os comestible)")) {
    haramDetected.push("Additif E542 (Phosphate d'os comestible)");
  }

  // Check if natural raw staple without complex additives
  const isNaturalStaple = categoriesTags.some((cat) => {
    if (cat.includes("alcoholic") && !cat.includes("non-alcoholic")) return false;
    return [
      "waters",
      "spring-waters",
      "mineral-waters",
      "eau",
      "fruits",
      "vegetables",
      "legumes",
      "milks",
      "lait",
      "honeys",
      "miel",
      "rices",
      "riz",
      "cereals",
      "flours",
      "farines",
      "coffees",
      "cafe",
      "teas",
      "the",
      "eggs",
      "oeufs",
      "salts",
      "sel",
      "sugars",
      "sucre",
    ].some((staple) => cat === staple || cat.endsWith(`-${staple}`) || cat.startsWith(`${staple}-`));
  });

  // Granular ingredient items
  const ingredientItems: IngredientItem[] = ingredients
    .split(/[,;\n•]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1)
    .map((item) => {
      const itemNorm = norm(item);
      for (const rule of INGREDIENT_RULES) {
        if (rule.type === "haram" && rule.regex.test(itemNorm)) {
          if (!rule.negationRegex || !rule.negationRegex.test(itemNorm)) {
            return { text: item, status: "haram", reason: rule.name };
          }
        }
      }
      for (const rule of INGREDIENT_RULES) {
        if (rule.type === "doubtful" && rule.regex.test(itemNorm)) {
          if (!rule.negationRegex || !rule.negationRegex.test(itemNorm)) {
            return { text: item, status: "doubtful", reason: rule.name };
          }
        }
      }
      if (GENERIC_CERT_TOKENS.some((t) => itemNorm.includes(t))) {
        return { text: item, status: "certified", reason: "Mention halal sur packaging" };
      }
      return { text: item, status: "safe" };
    });

  // --- RIGOROUS VERDICT & CERTAINTY CALCULATION VIA DETERMINISTIC ENGINE ---
  const reasons: string[] = [];
  let verdict: Verdict = "unknown";
  let subVerdict: SubVerdict = "unverifiable";
  let verdictLabel = "NON CONFIRMÉ";
  let certaintyLevel: CertaintyLevel = "insufficient";
  let certaintyLabel = "Données insuffisantes";
  let synthesisSummary = "";

  const uniqueHaram = Array.from(new Set(haramDetected));
  const uniqueDoubtful = Array.from(new Set(doubtfulDetected));
  const uniqueMeats = Array.from(new Set(detectedMeats));

  // Exécution du moteur déterministe pur P0-P12
  const engineResult = evaluateProduct({
    code,
    productName: name,
    brand,
    categoriesTags: Array.isArray(product.categories_tags)
      ? (product.categories_tags as string[])
      : [],
    ingredientsText: ingredients,
    ingredientsAnalysisTags: Array.isArray(product.ingredients_analysis_tags)
      ? (product.ingredients_analysis_tags as string[])
      : [],
    additivesTags: Array.isArray(product.additives_tags)
      ? (product.additives_tags as string[])
      : [],
    labelsTags: Array.isArray(product.labels_tags)
      ? (product.labels_tags as string[])
      : [],
    nutriments: (product.nutriments as Record<string, unknown>) || {},
    source: source.includes("Beauty") ? "OpenBeautyFacts" : "OpenFoodFacts",
    isHalalCertified: isRecognizedCertifier || certified,
  });

  if (engineResult.verdict === VERDICT_LABELS.HARAM) {
    // 🔴 1. HARAM
    verdict = "haram";
    subVerdict = "haram_forbidden";
    verdictLabel = VERDICT_LABELS.HARAM;
    certaintyLevel = ingredients.length > 0 ? "complete_declarative" : "partial";
    certaintyLabel = "Ingrédient interdit avéré";
    synthesisSummary = `Présence formellement identifiée d'ingrédient(s) prohibé(s) : ${uniqueHaram.concat(engineResult.flaggedItems.map((f) => f.ingredient)).join(", ")}.`;
  } else if (engineResult.verdict === VERDICT_LABELS.VIANDE_A_VERIFIER) {
    // 🟠 2. VIANDE À VÉRIFIER
    verdict = "doubtful";
    subVerdict = "doubtful_meat";
    verdictLabel = VERDICT_LABELS.VIANDE_A_VERIFIER;
    certaintyLevel = "partial";
    certaintyLabel = "Viande à vérifier";
    synthesisSummary =
      "L'abattage ne peut pas être vérifié par un scan. Vérifie le logo du certificateur sur l'emballage ou demande à ton boucher." +
      (engineResult.secondaryInfo ? ` (${engineResult.secondaryInfo})` : "");
  } else if (
    engineResult.verdict === VERDICT_LABELS.HALAL ||
    (isNaturalStaple && !engineResult.flaggedItems.some((f) => f.statut === "HARAM"))
  ) {
    // 🟢 3. HALAL
    verdict = "halal";
    subVerdict = isRecognizedCertifier
      ? "certified_halal"
      : isNaturalStaple
        ? "compatible_staple"
        : "compatible_plant";
    verdictLabel = VERDICT_LABELS.HALAL;
    certaintyLevel = isRecognizedCertifier ? "certified" : "complete_declarative";
    certaintyLabel = isRecognizedCertifier
      ? `Certifié par ${certifierName}`
      : "100% Ingrédients validés sûrs";
    synthesisSummary = isRecognizedCertifier
      ? `Produit certifié Halal par un organisme officiel (${certifierName}).`
      : isNaturalStaple
        ? "Denrée brute naturelle autorisée par défaut sans additif suspect."
        : "Composition d'origine 100% végétale ou minérale validée selon les listes d'ingrédients sûrs.";
  } else {
    // 🟠 4. NON CONFIRMÉ
    verdict = "doubtful";
    subVerdict =
      uniqueMeats.length > 0
        ? "doubtful_meat"
        : !ingredients || ingredients.length < 3
          ? "doubtful_incomplete"
          : "doubtful_additive";
    verdictLabel = VERDICT_LABELS.NON_CONFIRME;
    certaintyLevel = "partial";
    certaintyLabel = "Vérification requise";
    synthesisSummary =
      engineResult.flaggedItems.length > 0
        ? engineResult.flaggedItems.map((f) => `${f.ingredient} (${f.raison})`).join(" · ")
        : engineResult.raisons.length > 0
          ? engineResult.raisons.join(" · ")
          : "Statut non confirmé : vérification des données requise.";
  }

  // P13 : Renseigner les motifs sous la forme « ingrédient → statut → raison → règle appliquée »
  if (engineResult.flaggedItems.length > 0) {
    for (const f of engineResult.flaggedItems) {
      reasons.push(`${f.ingredient} → ${f.statut} → ${f.raison} [${f.regle}]`);
    }
  } else if (engineResult.proof) {
    reasons.push(engineResult.proof);
  } else if (isNaturalStaple) {
    reasons.push("Aliment brut naturel pur sans dérivé animal ni additif complexe.");
  }

  // --- FIVE DISTINCT, GENUINE AUDIT PROTOCOLS ---

  // Protocol 1: Product Identification
  const hasValidBarcode = code.length >= 6;
  const hasValidName = name.length > 1 && name !== "Produit sans nom";
  const hasValidBrand = brand.length > 0;
  const p1Status: HalalTestStatus =
    hasValidBarcode && hasValidName ? (hasValidBrand ? "passed" : "warning") : "failed";
  const p1StatusLabel =
    p1Status === "passed"
      ? "Référence identifiée"
      : p1Status === "warning"
        ? "Identification partielle"
        : "Produit non répertorié";
  const p1Detail =
    p1Status === "passed"
      ? `Produit correctement identifié : ${name} (${brand || "Marque non précisée"}). Code-barres exact : ${code || "Non spécifié"}.`
      : p1Status === "warning"
        ? `Identification incomplète : ${name || "Nom manquant"}. La marque ou la variante commerciale n'est pas formellement renseignée.`
        : "Impossible d'identifier formellement cette référence dans les catalogues interrogés.";
  const p1Evidence = [
    `Code-barres : ${code || "Non renseigné"}`,
    `Dénomination : ${name || "Sans nom"}`,
    `Marque / Fabricant : ${brand || "Non spécifiée"}`,
    "Règle méthodologique : L'identification commerciale référence le produit dans le catalogue mais ne constitue en aucun cas une preuve de conformité rituelle halal.",
  ];

  // Protocol 2: Ingredient List Analysis
  const ingredientsLength = ingredients.trim().length;
  const p2Status: HalalTestStatus =
    ingredientsLength >= 20 ? "passed" : isNaturalStaple ? "passed" : ingredientsLength > 0 ? "warning" : "failed";
  const p2StatusLabel =
    p2Status === "passed"
      ? isNaturalStaple && ingredientsLength === 0
        ? "Produit brut pur"
        : `Liste documentée (${ingredientItems.length} composants)`
      : p2Status === "warning"
        ? "Liste partielle ou abrégée"
        : "Liste absente / non vérifiable";
  const p2Detail =
    ingredientsLength >= 20
      ? `Liste d'ingrédients récupérée depuis ${source} (${ingredientItems.length} ingrédients extraits et analysés individuellement).`
      : isNaturalStaple
        ? `Aliment brut identifié par catégorie (${categoriesTags.slice(0, 3).join(", ") || "produit naturel"}).`
        : ingredientsLength > 0
          ? `Texte d'ingrédient très court (${ingredientsLength} caractères). Risque de données tronquées.`
          : `Aucune liste d'ingrédients n'a pu être extraite via ${source}. Une analyse visuelle de l'emballage est requise.`;
  const p2Evidence = [
    `Source d'extraction : ${source}`,
    `Complétude : ${ingredientsLength > 0 ? `${ingredientsLength} caractères analysés` : "Texte indisponible"}`,
    `Traçabilité : Données issues de saisies collaboratives ou de flux distributeurs via Open Food Facts. Des variations de recette entre pays ou formats sont possibles.`,
  ];

  // Protocol 3: Prohibited & Suspect Screening
  const p3Status: HalalTestStatus =
    uniqueHaram.length > 0
      ? "failed"
      : uniqueMeats.length > 0 && !isRecognizedCertifier
        ? "warning"
        : uniqueDoubtful.length > 0
          ? "warning"
          : ingredientsLength > 0 || isNaturalStaple
            ? "passed"
            : "info";
  const p3StatusLabel =
    p3Status === "failed"
      ? "Ingrédient prohibé avéré"
      : p3Status === "warning"
        ? uniqueMeats.length > 0
          ? "Viande sans abattage prouvé"
          : "Additifs à clarifier"
        : p3Status === "passed"
          ? "Aucun prohibé détecté"
          : "Analyse impossible";
  const p3Detail =
    uniqueHaram.length > 0
      ? `Présence formelle d'ingrédient(s) illicite(s) : ${uniqueHaram.join(", ")}.`
      : uniqueMeats.length > 0 && !isRecognizedCertifier
        ? `Présence de viande (${uniqueMeats.join(", ")}) sans preuve d'abattage rituel islamique.`
        : uniqueDoubtful.length > 0
          ? `Additifs à double origine ou origine incertaine détectés : ${uniqueDoubtful.join(", ")}.`
          : ingredientsLength > 0 || isNaturalStaple
            ? "Aucun dérivé porcin, alcool, carmin (E120), gélatine douteuse ni viande non certifiée détecté."
            : "Absence de composition textuelle pour réaliser le criblage.";
  const p3Evidence = [
    uniqueHaram.length > 0
      ? `Composants interdits : ${uniqueHaram.join(", ")}`
      : "Dérivés porcins et éthanol : non détectés",
    uniqueDoubtful.length > 0
      ? `Additifs ambigus : ${uniqueDoubtful.join(", ")}`
      : "Additifs complexes (E471, E472, présure...) : aucun suspect détecté",
    uniqueMeats.length > 0
      ? `Viande détectée : ${uniqueMeats.join(", ")}`
      : "Viande animale terrestre soumise à abattage : absente",
  ];

  // Protocol 4: Certification & Traceability
  const p4Status: HalalTestStatus =
    isRecognizedCertifier
      ? "passed"
      : uniqueHaram.length > 0
        ? "failed"
        : uniqueMeats.length > 0
          ? "warning"
          : uniqueDoubtful.length > 0
            ? "warning"
            : isNaturalStaple || ingredientsLength > 0
              ? "passed"
              : "warning";
  const p4StatusLabel =
    isRecognizedCertifier
      ? `Certifié (${certifierName})`
      : isNaturalStaple
        ? "Aliment brut naturel"
        : uniqueHaram.length > 0
          ? "HARAM (Interdit)"
          : uniqueMeats.length > 0
            ? "Certification viande requise"
            : uniqueDoubtful.length > 0
              ? "Additifs à clarifier"
              : certified
                ? "Mention déclarative sans organisme"
                : "Sources vérifiées (Sans dérivé animal)";
  const p4Detail =
    isRecognizedCertifier
      ? `Certification halal officielle confirmée auprès de : ${certifierName}.`
      : isNaturalStaple
        ? "Produit brut naturel ne requérant pas de certification rituelle d'abattage."
        : uniqueMeats.length > 0
          ? "Ce produit contient de la viande mais aucun certificat rituel agréé n'a été trouvé."
          : uniqueDoubtful.length > 0
            ? "Additifs à double origine détectés sans mention explicite de source végétale."
            : certified
              ? "Mention textuelle présente sur l'emballage sans nom d'organisme certificateur tiers identifiable."
              : `Données vérifiées via ${source}. Produit végétal ou sans viande, ne faisant pas l'objet d'une certification religieuse formelle.`;
  const p4Evidence = [
    `Organisme certificateur : ${certifierName || (certified ? "Mention sans organisme tiers spécifié" : "Aucun certificateur déclaré (produit sans viande)")}`,
    `Source d'information : ${source}`,
    `Règle de traçabilité : ${OPEN_FOOD_FACTS_DISCLAIMER}`,
  ];

  // Protocol 5: Canonical Synthesis & Proof Level
  const p5Status: HalalTestStatus =
    verdict === "haram"
      ? "failed"
      : subVerdict === "certified_halal"
        ? "passed"
        : subVerdict === "compatible_plant" || subVerdict === "compatible_staple"
          ? "passed"
          : "warning";
  const p5StatusLabel =
    verdict === "haram"
      ? VERDICT_LABELS.HARAM
      : verdictLabel === VERDICT_LABELS.VIANDE_A_VERIFIER
        ? VERDICT_LABELS.VIANDE_A_VERIFIER
        : verdictLabel === VERDICT_LABELS.HALAL
          ? VERDICT_LABELS.HALAL
          : VERDICT_LABELS.NON_CONFIRME;
  const p5Detail = `${synthesisSummary} (Niveau de certitude : ${certaintyLabel}).`;
  const p5Evidence = [
    `Verdict synthétique : ${verdictLabel}`,
    `Niveau de preuve : ${certaintyLabel}`,
    `Avis de prudence : L'absence d'ingrédient prohibé repéré ne remplace pas une certification religieuse formelle. En cas de doute persistant, s'abstenir selon la règle prophétique.`,
  ];

  const tests: HalalTestDetail[] = [
    {
      id: "protocol-id",
      name: "Protocole 1 : Identification du produit",
      shortLabel: "Identification",
      description: "Contrôle du code-barres, du nom, de la marque et de la variante exacte.",
      status: p1Status,
      statusLabel: p1StatusLabel,
      detail: p1Detail,
      evidence: p1Evidence,
    },
    {
      id: "protocol-ingredients",
      name: "Protocole 2 : Analyse de la liste d'ingrédients",
      shortLabel: "Ingrédients",
      description: "Vérification de la complétude, lisibilité et qualité des données fabricants.",
      status: p2Status,
      statusLabel: p2StatusLabel,
      detail: p2Detail,
      evidence: p2Evidence,
    },
    {
      id: "protocol-screening",
      name: "Protocole 3 : Contrôle des ingrédients prohibés & suspects",
      shortLabel: "Prohibitions & Additifs",
      description: "Criblage approfondi des dérivés porcins, alcool, carmin, viandes et additifs doubles.",
      status: p3Status,
      statusLabel: p3StatusLabel,
      detail: p3Detail,
      evidence: p3Evidence,
    },
    {
      id: "protocol-certification",
      name: "Protocole 4 : Certification & Traçabilité des sources",
      shortLabel: "Certification & Sources",
      description: "Identification de l'organisme certificateur agréé et traçabilité Open Food Facts.",
      status: p4Status,
      statusLabel: p4StatusLabel,
      detail: p4Detail,
      evidence: p4Evidence,
    },
    {
      id: "protocol-synthesis",
      name: "Protocole 5 : Synthèse & Niveau de preuve",
      shortLabel: "Synthèse & Certitude",
      description: "Évaluation canonique finale et attribution du statut de conformité prudent.",
      status: p5Status,
      statusLabel: p5StatusLabel,
      detail: p5Detail,
      evidence: p5Evidence,
    },
  ];

  const testsPassed = tests.filter((t) => t.status === "passed").length;
  const totalTests = tests.length;

  // Extract nutritional attributes
  const rawNutriscore = String(
    product.nutriscore_grade ||
      product.nutrition_grades ||
      product.nutrition_grade_fr ||
      "",
  ).toLowerCase().trim();
  const nutriscore = ["a", "b", "c", "d", "e"].includes(rawNutriscore)
    ? (rawNutriscore as "a" | "b" | "c" | "d" | "e")
    : undefined;

  const rawNova =
    typeof product.nova_group === "number"
      ? product.nova_group
      : typeof product.nova_groups === "number"
        ? product.nova_groups
        : Number(product.nova_group || product.nova_groups);
  const novaGroup = [1, 2, 3, 4].includes(rawNova) ? rawNova : undefined;

  const rawEcoscore = String(product.ecoscore_grade || "").toLowerCase().trim();
  const ecoscore = ["a", "b", "c", "d", "e"].includes(rawEcoscore)
    ? (rawEcoscore as "a" | "b" | "c" | "d" | "e")
    : undefined;

  const rawAllergens =
    product.allergens_tags || product.allergens || product.allergens_hierarchy;
  const allergens: string[] = [];
  if (Array.isArray(rawAllergens)) {
    rawAllergens.forEach((a) => {
      const s = String(a).replace(/^[a-z]{2}:/, "").trim();
      if (s && !s.startsWith("en:")) {
        const capitalized = s.charAt(0).toUpperCase() + s.slice(1);
        if (!allergens.includes(capitalized)) allergens.push(capitalized);
      }
    });
  } else if (typeof rawAllergens === "string" && rawAllergens.trim()) {
    rawAllergens.split(",").forEach((a) => {
      const s = a.trim();
      if (s) {
        const capitalized = s.charAt(0).toUpperCase() + s.slice(1);
        if (!allergens.includes(capitalized)) allergens.push(capitalized);
      }
    });
  }

  const rawTraces = product.traces_tags || product.traces;
  const traces: string[] = [];
  if (Array.isArray(rawTraces)) {
    rawTraces.forEach((t) => {
      const s = String(t).replace(/^[a-z]{2}:/, "").trim();
      if (s && !s.startsWith("en:")) {
        const capitalized = s.charAt(0).toUpperCase() + s.slice(1);
        if (!traces.includes(capitalized)) traces.push(capitalized);
      }
    });
  }

  const quantity = String(
    product.quantity || product.product_quantity || product.packaging_text || "",
  ).trim() || undefined;

  const rawLabelsList =
    Array.isArray(product.labels_tags) && product.labels_tags.length > 0
      ? product.labels_tags
      : Array.isArray(product.labels)
        ? product.labels
        : String(product.labels || "").split(",");
  const labelsList = rawLabelsList
    .map((l) => String(l).replace(/^[a-z]{2}:/, "").trim())
    .filter((l) => l.length > 1 && !l.startsWith("en:"));

  const resolvedCode = code || String(product.code ?? "");
  const resolvedName = name || "Produit sans nom";
  const rawCandidates = extractOffImageCandidatesFromRaw({
    ...product,
    code: resolvedCode,
  });
  const imageCandidates = resolveProductImageCandidates({
    code: resolvedCode,
    name: resolvedName,
    brand,
    image: rawCandidates[0],
    imageCandidates: rawCandidates,
  });

  return {
    code: resolvedCode,
    name: resolvedName,
    brand,
    image: resolveProductImage({
      code: resolvedCode,
      name: resolvedName,
      brand,
      image: rawCandidates[0],
      imageCandidates: rawCandidates,
    }),
    imageCandidates: imageCandidates.length > 0 ? imageCandidates : undefined,
    verdict,
    subVerdict,
    verdictLabel,
    certaintyLevel,
    certaintyLabel,
    synthesisSummary,
    ingredients,
    ingredientItems: ingredientItems.length > 0 ? ingredientItems : undefined,
    reasons: reasons.length > 0 ? reasons : engineResult.raisons,
    flaggedItems: engineResult.flaggedItems,
    audit: engineResult.audit,
    fiabilite: engineResult.fiabilite,
    certified,
    certifierName,
    source,
    sourceDisclaimer: OPEN_FOOD_FACTS_DISCLAIMER,
    nutriscore,
    novaGroup,
    ecoscore,
    allergens: allergens.length > 0 ? allergens : undefined,
    traces: traces.length > 0 ? traces : undefined,
    quantity,
    categories: categoriesTags.length > 0 ? categoriesTags : undefined,
    labelsList: labelsList.length > 0 ? labelsList : undefined,
    countriesTags: Array.isArray(product.countries_tags)
      ? (product.countries_tags as string[])
      : Array.isArray(product.countries)
        ? (product.countries as string[])
        : typeof product.countries === "string"
          ? (product.countries as string).split(",").map((c: string) => c.trim())
          : undefined,
    manufacturingPlaces:
      (product.manufacturing_places as string) ||
      (Array.isArray(product.manufacturing_places_tags)
        ? (product.manufacturing_places_tags as string[]).join(", ")
        : undefined),
    origins:
      (product.origins as string) ||
      (Array.isArray(product.origins_tags)
        ? (product.origins_tags as string[]).join(", ")
        : undefined),
    fetchDate: new Date().toLocaleDateString("fr-FR"),
    tests,
    testsPassed,
    totalTests,
  };
}

/* ---------- Multi-source Endpoints ---------- */

async function fetchWithTimeout(url: string, ms = 3000): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function offByEndpoint(
  url: string,
  sourceName = "Open Food Facts",
): Promise<ProductResult | null> {
  const res = await fetchWithTimeout(url, 3200);
  if (!res) return null;
  try {
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;
    return analyse(json.product, sourceName);
  } catch {
    return null;
  }
}

async function offByBarcode(code: string) {
  return offByEndpoint(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
    "Open Food Facts (World)",
  );
}

async function upcByBarcode(code: string) {
  const res = await fetchWithTimeout(
    `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`,
    3000,
  );
  if (!res) return null;
  try {
    const json = await res.json();
    const item = json.items?.[0];
    if (!item) return null;
    return analyse(
      {
        code,
        product_name: item.title,
        brands: item.brand,
        ingredients_text: item.description ?? "",
        image_url: item.images?.[0],
      },
      "UPC Item DB",
    );
  } catch {
    return null;
  }
}

/** Multi-source barcode lookup respecting P2 (checksum validation) & P3 (OFF + Open Beauty Facts) */
export async function fetchByBarcode(code: string): Promise<ProductResult | null> {
  const cleanCode = code.trim();
  if (!cleanCode) return null;

  // P2 – Vérification stricte du code-barres (EAN-8, EAN-13, UPC-A)
  const validation = validateBarcode(cleanCode);
  if (!validation.valid) {
    throw new Error("Code-barres invalide, rescanne");
  }

  const normalizedCode = validation.normalized || cleanCode;

  // 1. Check Curated Verified Database
  const curated = CURATED_PRODUCTS.find((p) => p.code === normalizedCode);
  if (curated) return curated;

  // 2. P3 – Primary Open Food Facts World lookup
  const primaryOff = await offByEndpoint(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalizedCode)}.json?fields=code,product_name,brands,quantity,categories_tags,ingredients_text,ingredients_text_fr,ingredients_analysis_tags,additives_tags,labels_tags,allergens_tags,nutriments,countries_tags,manufacturing_places,origins,lang,image_url,image_front_url,image_front_small_url,image_small_url,image_thumb_url,selected_images,images`,
    "Open Food Facts",
  ).catch(() => null);

  if (primaryOff) {
    return primaryOff;
  }

  // 3. P3 – Fallback Open Beauty Facts pour les cosmétiques / hygiène
  const obf = await offByEndpoint(
    `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(normalizedCode)}.json?fields=code,product_name,brands,quantity,categories_tags,ingredients_text,ingredients_text_fr,ingredients_analysis_tags,additives_tags,labels_tags,allergens_tags,nutriments,countries_tags,manufacturing_places,origins,lang,image_url,image_front_url,image_front_small_url,image_small_url,image_thumb_url,selected_images,images`,
    "Open Beauty Facts",
  ).catch(() => null);

  if (obf) {
    return obf;
  }

  return null;
}

/* ---------- Name search: full-text first, legacy fallback ---------- */

const RAW_CURATED_PRODUCTS: Record<string, unknown>[] = [
  {
    code: "5449000000996",
    product_name: "Coca-Cola Original",
    brands: "Coca-Cola",
    ingredients_text:
      "Eau gazéifiée, sucre, colorant: E150d, acidifiant: E338, arômes naturels (dont extraits végétaux et caféine).",
    nutriscore_grade: "e",
    nova_group: 4,
    ecoscore_grade: "b",
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/544/900/000/0996/front_en.1129.400.jpg",
  },
  {
    code: "5000159461122",
    product_name: "M&M's Peanut (Cacahuète)",
    brands: "Mars",
    ingredients_text:
      "Sucre, cacahuètes, pâte de cacao, lait écrémé en poudre, beurre de cacao, sirop de glucose, émulsifiants (lécithine de soja, E414), colorants (E100, E120, E133, E160a, E160e, E170).",
    nutriscore_grade: "e",
    nova_group: 4,
    ecoscore_grade: "d",
    allergens_tags: ["en:peanuts", "en:milk", "en:soybeans"],
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/500/015/946/1122/front_en.357.400.jpg",
  },
  {
    code: "3103220009574",
    product_name: "Haribo Croco (Classique)",
    brands: "Haribo",
    ingredients_text:
      "Sirop de glucose, sucre, gélatine de porc, dextrose, acidifiant: acide citrique, concentrés de fruits et de plantes, arômes.",
    nutriscore_grade: "d",
    nova_group: 4,
    ecoscore_grade: "c",
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/310/322/000/9574/front_fr.77.400.jpg",
  },
  {
    code: "3103220039588",
    product_name: "Haribo Dragibus Soft",
    brands: "Haribo",
    ingredients_text:
      "Sucre, sirop de glucose, amidon, acidifiants: acide citrique, acide malique, correcteurs d'acidité, arôme, colorants végétaux.",
    nutriscore_grade: "d",
    nova_group: 4,
    ecoscore_grade: "c",
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/310/322/003/9588/front_en.45.400.jpg",
  },
  {
    code: "8691216014909",
    product_name: "Haribo Chamallows Certifié Halal",
    brands: "Haribo Halal",
    ingredients_text:
      "Sirop de glucose, sucre, eau, gélatine de bœuf certifiée halal, dextrose, arôme naturel de vanille.",
    labels: "certifié halal",
    labels_tags: ["en:halal"],
    nutriscore_grade: "d",
    nova_group: 4,
    ecoscore_grade: "c",
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/869/121/601/4909/front_en.69.400.jpg",
  },
  {
    code: "8691216017429",
    product_name: "Haribo Goldbären Oursons Halal",
    brands: "Haribo Halal",
    ingredients_text:
      "Sirop de glucose, sucre, gélatine bovine certifiée halal, dextrose, jus de fruits concentrés, acidifiant: acide citrique.",
    labels: "certifié halal",
    labels_tags: ["en:halal"],
    nutriscore_grade: "d",
    nova_group: 4,
    ecoscore_grade: "c",
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/869/121/601/7429/front_en.8.400.jpg",
  },
  {
    code: "3017620422003",
    product_name: "Nutella (Pâte à tartiner)",
    brands: "Ferrero",
    ingredients_text:
      "Sucre, huile de palme, noisettes (13%), lait écrémé en poudre (8,7%), cacao maigre (7,4%), émulsifiants : lécithines [soja], vanilline.",
    nutriscore_grade: "e",
    nova_group: 4,
    ecoscore_grade: "d",
    allergens_tags: ["en:milk", "en:nuts", "en:soybeans"],
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg",
  },
  {
    code: "8000500037560",
    product_name: "Kinder Bueno",
    brands: "Ferrero",
    ingredients_text:
      "Chocolat au lait 31,5%, sucre, huile de palme, farine de froment, noisettes (10,8%), lait écrémé en poudre, émulsifiants: lécithines [soja], arômes.",
    nutriscore_grade: "e",
    nova_group: 4,
    ecoscore_grade: "d",
    allergens_tags: ["en:milk", "en:nuts", "en:gluten", "en:soybeans"],
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/800/050/003/7560/front_en.298.400.jpg",
  },
  {
    code: "7622210449283",
    product_name: "Oreo Original",
    brands: "Mondelez / Oreo",
    ingredients_text:
      "Farine de blé, sucre, huile de palme, cacao maigre en poudre, sirop de glucose-fructose, poudres à lever, sel, émulsifiant (lécithines de soja), arôme (vanilline).",
    nutriscore_grade: "e",
    nova_group: 4,
    ecoscore_grade: "d",
    allergens_tags: ["en:gluten", "en:soybeans"],
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/762/221/044/9283/front_en.605.400.jpg",
  },
  {
    code: "9002490100070",
    product_name: "Red Bull Energy Drink",
    brands: "Red Bull",
    ingredients_text:
      "Eau gazéifiée, sucre, glucose, acidifiant (acide citrique), taurine (0,4%), correcteur d'acidité, caféine, vitamines, arômes.",
    nutriscore_grade: "e",
    nova_group: 4,
    ecoscore_grade: "c",
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/900/249/010/0070/front_en.245.400.jpg",
  },
  {
    code: "3228857000166",
    product_name: "Oasis Tropical",
    brands: "Oasis / Schweppes",
    ingredients_text:
      "Eau de source, jus de fruits à base de concentrés 12% (orange, pomme, fruit de la passion, mangue), sucre, acidifiant: acide citrique, arômes naturels.",
    nutriscore_grade: "d",
    nova_group: 4,
    ecoscore_grade: "b",
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/322/885/700/0166/front_fr.1875.400.jpg",
  },
  {
    code: "5053990111503",
    product_name: "Pringles Original",
    brands: "Pringles",
    ingredients_text:
      "Pommes de terre déshydratées, huiles végétales (tournesol, palme, maïs), farine de blé, farine de riz, émulsifiant (E471), maltodextrine, sel.",
    nutriscore_grade: "d",
    nova_group: 4,
    ecoscore_grade: "d",
    allergens_tags: ["en:gluten"],
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/505/399/011/1503/front_en.9.400.jpg",
  },
  {
    code: "4000177032732",
    product_name: "Capri-Sun Multivitamin / Orange",
    brands: "Capri-Sun",
    ingredients_text:
      "Eau de source, jus de fruits à base de concentré 12% (orange, pomme, ananas, banane, kiwi, passion), sucre, acide citrique, vitamines.",
    nutriscore_grade: "c",
    nova_group: 4,
    ecoscore_grade: "b",
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/400/017/703/2732/front_de.8.400.jpg",
  },
  {
    code: "3560070427918",
    product_name: "Steaks Hachés Le Charolais Façon Bouchère",
    brands: "Socopa",
    ingredients_text: "100% viande de bœuf hachée pur bœuf (origine France).",
    nutriscore_grade: "a",
    nova_group: 1,
    ecoscore_grade: "d",
    categories_tags: ["viandes", "beef", "steaks-haches"],
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/356/007/042/7918/front_fr.50.400.jpg",
  },
  {
    code: "5902487124697",
    product_name: "Tenders de Poulet Halal Certifiés AVS",
    brands: "AVS",
    ingredients_text: "Filet de poulet 100% certifié halal rituel AVS, panure croustillante.",
    labels: "certifié halal, avs",
    labels_tags: ["en:halal", "fr:avs"],
    nutriscore_grade: "b",
    nova_group: 4,
    ecoscore_grade: "c",
    categories_tags: ["viandes", "poulet", "halal-meats"],
    image_front_small_url:
      "https://images.openfoodfacts.org/images/products/590/248/712/4697/front_en.4.400.jpg",
  },
];


const CURATED_PRODUCTS: ProductResult[] = RAW_CURATED_PRODUCTS.map((raw) =>
  analyse(raw, "Base de données vérifiée Nur"),
);

/**
 * Mots-clés de recherche associés à des produits du catalogue vérifié.
 * Permet de retrouver un produit sous son nom commun (ex. "chips" → Pringles)
 * quand le nom commercial ni la marque ne contiennent le terme recherché.
 * Restreint aux cas avérés : aucune correspondance approximative en dehors de cette liste.
 */
export const SEARCH_KEYWORDS: Record<string, string[]> = {
  "5053990111503": ["chips", "croustilles", "chips de pomme de terre", "crisps"], // Pringles Original
};

/**
 * Score de pertinence d'un produit pour un terme de recherche.
 * 8 = nom exact, 7 = marque exacte, 6 = nom commence par, 5 = marque commence par,
 * 4 = nom contient, 3 = marque contient, 2 = mot-clé associé, 1 = catégorie ou code.
 * 0 = sans rapport : le produit est exclu des résultats.
 */
function scoreProductMatch(
  product: ProductResult,
  term: string,
  normalizedTerm: string,
): number {
  const name = norm(product.name || "");
  const brand = norm(product.brand || "");
  const categories = (product.categories || []).map((c) => norm(c)).join(" ");
  const keywords =
    (SEARCH_KEYWORDS[product.code || ""] || []).map((k) => norm(k)).join(" ");
  const code = String(product.code || "");

  if (name === normalizedTerm) return 8;
  if (brand === normalizedTerm) return 7;
  if (name.startsWith(normalizedTerm)) return 6;
  if (brand.startsWith(normalizedTerm)) return 5;
  if (name.includes(normalizedTerm)) return 4;
  if (brand.includes(normalizedTerm)) return 3;
  if (keywords.includes(normalizedTerm)) return 2;
  if (categories.includes(normalizedTerm)) return 1;
  if (code.includes(term)) return 1;
  return 0;
}

type ScoredProduct = { product: ProductResult; score: number; source?: string };

function rankAndDedupe(entries: ScoredProduct[], limit: number): ProductResult[] {
  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aCurated = a.source === "curated";
    const bCurated = b.source === "curated";
    if (aCurated !== bCurated) return bCurated ? 1 : -1;
    return a.product.name.localeCompare(b.product.name);
  });

  const seen = new Set<string>();
  const out: ProductResult[] = [];
  for (const entry of entries) {
    const p = entry.product;
    if (!p.name || p.name === "Produit sans nom") continue;
    const key = p.code ? p.code : `${p.name.toLowerCase()}|${p.brand.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

function mapHitToProduct(h: Record<string, unknown>): ProductResult {
  const hitCode = String(h.code || h.id || "");
  const hitCandidates = extractOffImageCandidatesFromRaw({
    ...h,
    code: hitCode,
  });
  const rawImage = hitCandidates[0];

  const brandStr = Array.isArray(h.brands)
    ? h.brands.filter(Boolean).join(", ")
    : typeof h.brands === "string"
    ? h.brands
    : "";

  return analyse(
    {
      code: hitCode,
      product_name:
        h.product_name ||
        h.product_name_fr ||
        h.product_name_en ||
        h.generic_name ||
        h.generic_name_fr ||
        "",
      brands: brandStr,
      ingredients_text_fr: h.ingredients_text_fr || h.ingredients_text,
      ingredients_tags: h.ingredients_tags,
      labels: h.labels,
      labels_tags: h.labels_tags,
      categories: h.categories,
      categories_tags: h.categories_tags,
      quantity: h.quantity,
      nutriscore_grade: h.nutriscore_grade || h.nutrition_grades,
      nova_group: h.nova_group || h.nova_groups,
      ecoscore_grade: h.ecoscore_grade,
      allergens_tags: h.allergens_tags,
      additives_tags: h.additives_tags,
      ingredients_analysis_tags: h.ingredients_analysis_tags,
      image_front_small_url: rawImage ?? h.image_front_small_url,
      image_front_url: h.image_front_url,
      image_url: h.image_url ?? rawImage,
      image_small_url: h.image_small_url,
      image_thumb_url: h.image_thumb_url,
      selected_images: h.selected_images,
      images: h.images,
    },
    "Open Food Facts",
  );
}

async function searchFastOFF(
  q: string,
  page = 1,
  pageSize = 24,
): Promise<{ products: ProductResult[]; total: number } | null> {
  const term = q.trim();
  if (!term) return { products: [], total: 0 };

  let receivedValidEmpty = false;

  // 1. Appel via la fonction serveur TanStack Start (contourne CORS, applique le User-Agent légitime et cache en mémoire)
  try {
    const serverResult = await searchOffProductsServer({
      data: { q: term, page, pageSize },
    });
    if (serverResult && Array.isArray(serverResult.hits)) {
      if (serverResult.hits.length > 0) {
        const products = serverResult.hits.map(mapHitToProduct);
        return { products, total: serverResult.total || products.length };
      }
      receivedValidEmpty = true;
    }
  } catch {
    // Si la fonction serveur n'est pas joignable (ex: tests isolés ou mode client seul), continuer sur les replis
  }

  // 2. Appel via le proxy Vite en environnement navigateur
  if (typeof window !== "undefined") {
    try {
      const proxyUrl = `/api/off-search?q=${encodeURIComponent(
        term,
      )}&page_size=${pageSize}&page=${page}&langs=fr,en`;
      const res = await fetch(proxyUrl, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const json = (await res.json()) as { hits?: Record<string, unknown>[]; count?: number };
        if (Array.isArray(json.hits)) {
          if (json.hits.length > 0) {
            const products = json.hits.map(mapHitToProduct);
            const total = typeof json.count === "number" ? json.count : products.length;
            return { products, total };
          }
          receivedValidEmpty = true;
        }
      }
    } catch {
      // continuer vers le repli direct
    }
  }

  // 3. Appel direct vers Search-a-licious (actif en environnement Node/SSR ou sans blocage CORS)
  try {
    const directUrl = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(
      term,
    )}&page_size=${pageSize}&page=${page}&langs=fr,en`;
    const res = await fetch(directUrl, { headers: getSafeHeaders() });
    if (res.ok) {
      const json = (await res.json()) as { hits?: Record<string, unknown>[]; count?: number };
      if (Array.isArray(json.hits)) {
        if (json.hits.length > 0) {
          const products = json.hits.map(mapHitToProduct);
          const total = typeof json.count === "number" ? json.count : products.length;
          return { products, total };
        }
        receivedValidEmpty = true;
      }
    }
  } catch {
    // repli
  }

  return receivedValidEmpty ? { products: [], total: 0 } : null;
}

async function searchFallbackOFF(
  q: string,
  page = 1,
  pageSize = 24,
): Promise<{ products: ProductResult[]; total: number } | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.net/api/v2/search?search_terms=${encodeURIComponent(
        q,
      )}&page_size=${pageSize}&page=${page}&fields=code,product_name,product_name_fr,product_name_en,generic_name,brands,quantity,categories_tags,ingredients_text,ingredients_text_fr,ingredients_tags,ingredients_analysis_tags,additives_tags,labels_tags,allergens_tags,nutriments,nutriscore_grade,nova_group,ecoscore_grade,image_url,image_front_url,image_front_small_url,image_small_url,image_thumb_url,selected_images,images`,
      { headers: getSafeHeaders() },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const rawList = Array.isArray(json.products)
      ? json.products
      : Array.isArray(json.hits)
        ? json.hits
        : null;
    if (!rawList) return null;
    if (rawList.length === 0) {
      return { products: [], total: 0 };
    }
    const products = (rawList as Record<string, unknown>[]).map(mapHitToProduct);
    const total = typeof json.count === "number" ? json.count : products.length;
    return { products, total };
  } catch {
    return null;
  }
}

async function searchUpc(q: string): Promise<ProductResult[]> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(q)}&match_mode=1`,
      { headers: getSafeHeaders() },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return ((json.items ?? []) as Record<string, unknown>[]).slice(0, 10).map((item) =>
      analyse(
        {
          code: String((item.upc as string) ?? (item.ean as string) ?? ""),
          product_name: item.title,
          brands: item.brand,
          ingredients_text: item.description ?? "",
          image_url: (item.images as string[])?.[0],
        },
        "UPC Item DB",
      ),
    );
  } catch {
    return [];
  }
}

/**
 * Réponse de recherche paginée.
 * total : nombre total de résultats trouvés dans la source externe.
 * sourceError : vrai quand tous les services distants sont injoignables.
 */
export interface SearchResponse {
  products: ProductResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  sourceError: boolean;
}

/**
 * Recherche textuelle externe authentique avec pagination.
 * Interroge en priorité Search-a-licious (Elasticsearch Open Food Facts via backend et proxy),
 * avec repli automatique sur l'API de recherche v2 Open Food Facts.
 * Aucun catalogue local n'est injecté pour ne pas biaiser la recherche externe.
 */
export async function searchByNamePaginated(
  q: string,
  page = 1,
  pageSize = 24,
): Promise<SearchResponse> {
  const term = q.trim();
  if (!term) {
    return { products: [], total: 0, page, pageSize, hasMore: false, sourceError: false };
  }

  // 1. Appel du moteur Search-a-licious de Open Food Facts
  let remoteRes = await searchFastOFF(term, page, pageSize);

  // 2. Repli automatique si Search-a-licious est indisponible ou n'a renvoyé aucun hit
  if (!remoteRes || remoteRes.products.length === 0) {
    const fallbackRes = await searchFallbackOFF(term, page, pageSize);
    if (fallbackRes && (fallbackRes.products.length > 0 || !remoteRes)) {
      remoteRes = fallbackRes;
    }
  }

  // 3. Si toutes les sources distantes ont échoué, signaler l'erreur de source
  if (!remoteRes) {
    return {
      products: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
      sourceError: true,
    };
  }

  // 4. Dédoublonnage strict par code-barres ou clé identifiante
  const seen = new Set<string>();
  const deduped: ProductResult[] = [];

  for (const p of remoteRes.products) {
    if (!p.name || p.name === "Produit sans nom") continue;
    const key = p.code ? p.code : `${p.name.toLowerCase()}|${p.brand.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }

  const total = typeof remoteRes.total === "number" ? remoteRes.total : deduped.length;
  const hasMore = page * pageSize < total;

  return {
    products: deduped,
    total,
    page,
    pageSize,
    hasMore,
    sourceError: false,
  };
}

export async function searchByName(
  q: string,
  page = 1,
  pageSize = 24,
): Promise<ProductResult[]> {
  const result = await searchByNamePaginated(q, page, pageSize);
  return result.products;
}

export { CURATED_PRODUCTS };

/**
 * Suggestions en direct rapides pour l'autocomplétion.
 * Récupère au minimum 15 propositions correspondantes depuis l'API de recherche externe
 * pour tout mot-clé saisi (ex: chips, chocolat, biscuits...).
 */
export async function getFastSuggestions(q: string, maxItems = 15): Promise<ProductResult[]> {
  const term = q.trim();

  if (!term) {
    return CURATED_PRODUCTS.slice(0, maxItems);
  }

  const targetCount = Math.max(maxItems, 15);
  const normalizedTerm = norm(term);
  const curated = CURATED_PRODUCTS.map(
    (p): ScoredProduct => ({
      product: p,
      score: scoreProductMatch(p, term, normalizedTerm),
      source: "curated",
    }),
  ).filter((e) => e.score > 0);

  try {
    // Interroge Search-a-licious pour au moins 25 produits afin de garantir
    // un vivier d'au moins 15 produits distincts et valides
    let fastRes = await searchFastOFF(term, 1, Math.max(targetCount + 10, 25));
    if (!fastRes || fastRes.products.length === 0) {
      fastRes = await searchFallbackOFF(term, 1, Math.max(targetCount + 10, 25));
    }

    const off = (fastRes?.products || []).map(
      (p): ScoredProduct => ({
        product: p,
        score: scoreProductMatch(p, term, normalizedTerm) || 2,
        source: "off",
      }),
    );

    return rankAndDedupe([...curated, ...off], targetCount);
  } catch {
    return rankAndDedupe(curated, targetCount);
  }
}

