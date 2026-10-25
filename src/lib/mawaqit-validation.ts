import { z } from "zod";

/**
 * Schémas d'entrée des fonctions serveur qui interrogent mawaqit.net.
 *
 * Isolé dans un module sans framework (comme `ingredient-validation.ts` et
 * `tts-validation.ts`) afin d'être testable unitairement, sans TanStack Start
 * ni accès réseau.
 */

/** Longueur maximale d'un terme de recherche. */
export const MAWAQIT_SEARCH_MAX_LENGTH = 120;

/** Longueur maximale d'un slug de mosquée. */
export const MAWAQIT_SLUG_MAX_LENGTH = 100;

/**
 * Terme de recherche : chaîne bornée. Les espaces internes restent acceptés
 * (« Grande Mosquée de Paris »), la longueur est plafonnée pour éviter qu'un
 * appelant n'envoie une charge utile arbitrairement grande à l'API distante.
 */
export const mawaqitSearchSchema = z.object({
  query: z.string().trim().max(MAWAQIT_SEARCH_MAX_LENGTH),
});

/**
 * Slug de mosquée : la valeur est concaténée à une URL distante
 * (`https://mawaqit.net/fr/<slug>`). On interdit donc tout séparateur de
 * chemin, séparateur de requête ou espace, afin qu'un appelant ne puisse pas
 * transformer la requête proxy en navigation arbitraire sur le site distant.
 */
export const mawaqitSlugSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(MAWAQIT_SLUG_MAX_LENGTH)
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9._~-]*$/,
      "invalid mosque slug: only letters, digits, '-', '_', '.' and '~' are allowed",
    ),
});
