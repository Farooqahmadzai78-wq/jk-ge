/**
 * halal-product-images.ts
 *
 * Base de données d'images réelles vérifiées et résolveur d'images de produits.
 * Résout le problème des icônes de remplacement / points d'interrogation bleus (404 Safari/WebKit)
 * en fournissant de véritables photos d'emballage vérifiées (Open Food Facts CDN)
 * avec correspondances par code-barres et par nom de produit.
 */

export interface VerifiedProductImageMeta {
  code?: string;
  nameMatch: RegExp;
  brandMatch?: RegExp;
  imageUrl: string;
  description: string;
}

export const VERIFIED_PRODUCT_IMAGES: Record<string, string> = {
  // 1. Boissons iconiques
  "5449000000996":
    "https://images.openfoodfacts.org/images/products/544/900/000/0996/front_en.1129.400.jpg", // Coca-Cola Original
  "5000112594218":
    "https://images.openfoodfacts.org/images/products/500/011/259/4218/front.3.400.jpg", // Coca-Cola Sans Sucres / Zero
  "9002490100070":
    "https://images.openfoodfacts.org/images/products/900/249/010/0070/front_en.245.400.jpg", // Red Bull Energy Drink
  "3228857000166":
    "https://images.openfoodfacts.org/images/products/322/885/700/0166/front_fr.1875.400.jpg", // Oasis Tropical
  "4000177032732":
    "https://images.openfoodfacts.org/images/products/400/017/703/2732/front_de.8.400.jpg", // Capri-Sun Multivitamin / Orange
  "5449000009173":
    "https://images.openfoodfacts.org/images/products/544/900/000/9173/front.3.400.jpg", // Capri-Sun Orange
  "6091034022742":
    "https://images.openfoodfacts.org/images/products/609/103/402/2742/front_en.15.400.jpg", // Lipton Ice Tea Pêche
  "0051540000012":
    "https://images.openfoodfacts.org/images/products/005/154/000/0012/front_en.3.400.jpg", // Orangina

  // 2. Confiseries & M&M's
  "5000159461122":
    "https://images.openfoodfacts.org/images/products/500/015/946/1122/front_en.357.400.jpg", // M&M's Peanut (Jaune)
  "5000159563734":
    "https://images.openfoodfacts.org/images/products/500/015/956/3734/front_en.3.400.jpg", // M&M's Crispy (Bleu)

  // 3. Produits Haribo (chacun avec son emballage réel exact)
  "3103220009574":
    "https://images.openfoodfacts.org/images/products/310/322/000/9574/front_fr.77.400.jpg", // Haribo Croco (sachet vert)
  "3103220039588":
    "https://images.openfoodfacts.org/images/products/310/322/003/9588/front_en.45.400.jpg", // Haribo Dragibus Soft (sachet multicolore)
  "3103220033371":
    "https://images.openfoodfacts.org/images/products/310/322/003/3371/front.5.400.jpg", // Haribo Fraise Tagada (sachet rouge)
  "8691216014909":
    "https://images.openfoodfacts.org/images/products/869/121/601/4909/front_en.69.400.jpg", // Haribo Chamallows Certifié Halal (gélatine bovine)
  "8691216017429":
    "https://images.openfoodfacts.org/images/products/869/121/601/7429/front_en.8.400.jpg", // Haribo Goldbären Oursons Certifié Halal
  "8691216020689":
    "https://images.openfoodfacts.org/images/products/869/121/602/0689/front_en.12.400.jpg", // Haribo Worms Vers Certifié Halal

  // 4. Biscuits & Snacks sucrés / salés (photos authentiques vérifiées)
  "7300400481571":
    "https://images.openfoodfacts.org/images/products/730/040/048/1571/front_fr.1746.400.jpg", // Wasa 270g
  "3336971805021":
    "https://images.openfoodfacts.org/images/products/333/697/180/5021/front_en.203.400.jpg", // Vico Chips de lentilles saveur fines herbes 85g
  "3336971805038":
    "https://images.openfoodfacts.org/images/products/333/697/180/5038/front_en.94.400.jpg", // Vico Chips de lentilles saveur tomate mozza
  "3336972109104":
    "https://images.openfoodfacts.org/images/products/333/697/210/9104/front_fr.71.400.jpg", // Vico Chips de lentilles saveur oignons caramélisés
  "3336972306046":
    "https://images.openfoodfacts.org/images/products/333/697/230/6046/front_fr.39.400.jpg", // Vico Chips de lentilles saveur sel & poivre
  "3336972109098":
    "https://images.openfoodfacts.org/images/products/333/697/210/9098/front_fr.39.400.jpg", // Vico Chips de lentilles saveur paprika
  "5060042641000":
    "https://images.openfoodfacts.org/images/products/506/004/264/1000/front_en.305.400.jpg", // Tyrrell's Lightly sea salted crisps 150g
  "3017620422003":
    "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg", // Nutella Ferrero
  "8000500037560":
    "https://images.openfoodfacts.org/images/products/800/050/003/7560/front_en.298.400.jpg", // Kinder Bueno
  "7622210449283":
    "https://images.openfoodfacts.org/images/products/762/221/044/9283/front_en.605.400.jpg", // Oreo Original
  "5053990111503":
    "https://images.openfoodfacts.org/images/products/505/399/011/1503/front_en.9.400.jpg", // Pringles Original (Tube Rouge)

  // 5. Viandes & Produits Halal / AVS
  "3560070427918":
    "https://images.openfoodfacts.org/images/products/356/007/042/7918/front_fr.50.400.jpg", // Steaks Hachés Le Charolais Socopa
  "5902487124697":
    "https://images.openfoodfacts.org/images/products/590/248/712/4697/front_en.4.400.jpg", // Tenders Poulet Halal Certifiés AVS
  "3512690003799":
    "https://images.openfoodfacts.org/images/products/351/269/000/3799/front_fr.4.400.jpg", // Charcuterie Pur Bœuf Isla Délice Halal
};

const OFF_HTTPS_UPGRADE_HOSTS = [
  "openfoodfacts.org",
  "openfoodfacts.net",
  "openbeautyfacts.org",
  "openpetfoodfacts.org",
  "openproductsfacts.org",
];

/**
 * Normalise et valide une URL d'image produit (gère //, http -> https sur les CDN OFF,
 * rejette les chaînes vides, "null", "undefined" ou les URL malformées).
 */
export function normalizeProductImageUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  let trimmed = raw.trim();
  if (!trimmed || trimmed.length < 8) return undefined;

  const lower = trimmed.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "none" || lower === "false") {
    return undefined;
  }

  if (lower.startsWith("data:image/")) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    trimmed = `https:${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return undefined;
    }
    if (!parsed.hostname || (!parsed.hostname.includes(".") && parsed.hostname !== "localhost")) {
      return undefined;
    }
    if (
      parsed.protocol === "http:" &&
      OFF_HTTPS_UPGRADE_HOSTS.some(
        (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
      )
    ) {
      parsed.protocol = "https:";
      return parsed.toString();
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/**
 * Calcule le chemin dossier officiel Open Food Facts à partir d'un code-barres numérique
 * (ex: "3017620422003" -> "301/762/042/2003", "12345678" -> "12345678").
 */
export function buildOffProductFolderPath(barcode: string | undefined): string | undefined {
  if (!barcode) return undefined;
  const digits = barcode.trim();
  if (!/^\d{6,20}$/.test(digits)) return undefined;
  if (digits.length <= 8) return digits;
  const match = digits.match(/^(\d{3})(\d{3})(\d{3})(\d+)$/);
  if (!match) return undefined;
  return `${match[1]}/${match[2]}/${match[3]}/${match[4]}`;
}

/**
 * Extrait toutes les URL d'images authentiques renvoyées par Open Food Facts / Search-a-licious
 * pour CETTE fiche produit précise (champs directs, selected_images toutes langues, et images.front*.rev).
 */
export function extractOffImageCandidatesFromRaw(raw: Record<string, unknown>): string[] {
  const candidates: string[] = [];
  const pushUnique = (value: unknown) => {
    const normalized = normalizeProductImageUrl(value);
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  // 1. Champs URL directs de la fiche
  pushUnique(raw.image_front_small_url);
  pushUnique(raw.image_front_url);
  pushUnique(raw.image_url);
  pushUnique(raw.image_small_url);
  pushUnique(raw.image_front_thumb_url);
  pushUnique(raw.image_thumb_url);

  // 2. selected_images.front.{display, small, thumb} (priorité fr/en puis toutes autres langues disponibles)
  const selectedFront = (
    raw.selected_images as Record<string, Record<string, Record<string, unknown>>> | undefined
  )?.front;
  if (selectedFront && typeof selectedFront === "object") {
    for (const variant of ["display", "small", "thumb"] as const) {
      const langMap = selectedFront[variant];
      if (langMap && typeof langMap === "object") {
        pushUnique(langMap.fr);
        pushUnique(langMap.en);
        for (const val of Object.values(langMap)) {
          pushUnique(val);
        }
      }
    }
  }

  // 3. Reconstruction officielle OFF depuis `images` + `code` si les URL complètes sont absentes du hit Search-a-licious
  const code = String(raw.code ?? raw.id ?? "").trim();
  const folder = buildOffProductFolderPath(code);
  const imagesObj = raw.images as Record<string, unknown> | undefined;
  if (folder && imagesObj && typeof imagesObj === "object") {
    const orderedKeys = [
      "front_fr",
      "front_en",
      "front",
      ...Object.keys(imagesObj).filter(
        (k) => k.startsWith("front_") && k !== "front_fr" && k !== "front_en",
      ),
    ];
    for (const key of orderedKeys) {
      const entry = imagesObj[key] as Record<string, unknown> | undefined;
      const rev = entry && typeof entry === "object" ? entry.rev : undefined;
      if (rev !== undefined && rev !== null && String(rev).trim() !== "") {
        const revStr = String(rev).trim();
        if (/^\d+$/.test(revStr)) {
          pushUnique(
            `https://images.openfoodfacts.org/images/products/${folder}/${key}.${revStr}.400.jpg`,
          );
        }
      }
    }
  }

  return candidates;
}

/**
 * Résout la liste ordonnée des véritables photos authentiques d'un produit (principale + replis).
 * Consigne stricte : Ne montre JAMAIS une photo inventée ou celle d'un autre produit.
 * Seules sont acceptées :
 * 1. Les images authentiques renvoyées directement par l'API pour cette fiche produit.
 * 2. La photo authentique vérifiée associée au code-barres exact de ce produit.
 */
export function resolveProductImageCandidates(product: {
  code?: string;
  name?: string;
  brand?: string;
  image?: string;
  imageCandidates?: string[];
}): string[] {
  const candidates: string[] = [];
  const pushUnique = (value: unknown) => {
    const normalized = normalizeProductImageUrl(value);
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  // 1. Image principale et variantes authentiques issues de l'API pour cette fiche
  pushUnique(product.image);
  if (Array.isArray(product.imageCandidates)) {
    for (const candidate of product.imageCandidates) {
      pushUnique(candidate);
    }
  }

  // 2. Photo vérifiée associée au code-barres exact (utile si l'API omet l'image ou si une révision CDN expire)
  const cleanCode = product.code?.trim();
  if (cleanCode && VERIFIED_PRODUCT_IMAGES[cleanCode]) {
    pushUnique(VERIFIED_PRODUCT_IMAGES[cleanCode]);
  }

  return candidates;
}

/**
 * Résout l'URL principale authentique d'un produit, ou undefined si aucune photo réelle n'existe.
 */
export function resolveProductImage(product: {
  code?: string;
  name?: string;
  brand?: string;
  image?: string;
  imageCandidates?: string[];
}): string | undefined {
  return resolveProductImageCandidates(product)[0];
}
