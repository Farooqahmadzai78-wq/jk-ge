import { z } from "zod";

/**
 * Strict access-token shape: exactly 64 lowercase hex characters (256 bits).
 * Matches `generateAccessToken()` output and `isValidAccessToken()` guard.
 */
export const accessTokenSchema = z
  .string()
  .length(64)
  .regex(/^[0-9a-f]+$/, "access token must be a 64-character lowercase hex string");

/**
 * Langue de l'analyse. La valeur est interpolée dans le prompt IA : elle est
 * donc restreinte à un code de locale (`fr`, `ar`, `ar-DZ`…) pour empêcher
 * d'y injecter des instructions.
 */
export const analysisLangSchema = z
  .string()
  .trim()
  .max(8)
  .regex(/^[A-Za-z]{2,3}(-[A-Za-z]{2})?$/, "lang must be a locale code such as fr or ar-DZ")
  .default("fr");

/** Taille maximale acceptée pour la photo d'ingrédients (data URL base64). */
export const IMAGE_MAX_LENGTH = 8_000_000;

/** Types MIME acceptés pour la photo d'ingrédients. */
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

const DATA_URL_RE = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/;
const BASE64_RE = /^[A-Za-z0-9+/=\s]+$/;

function isBase64Payload(payload: string): boolean {
  if (!payload || payload.length < 16) return false;
  return BASE64_RE.test(payload);
}

/**
 * Vérifie qu'une charge utile image est soit une data URL base64 d'un type
 * MIME raster autorisé, soit du base64 brut (interprété alors comme un JPEG).
 *
 * Sans ce contrôle, un appelant pouvait faire porter au fournisseur IA une
 * charge utile arbitraire (texte, script, archive) en la présentant comme une
 * image.
 */
export function isSupportedImagePayload(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith("data:")) {
    const match = DATA_URL_RE.exec(trimmed);
    if (!match) return false;
    const mime = match[1].toLowerCase();
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime)) return false;
    return isBase64Payload(match[2]);
  }
  return isBase64Payload(trimmed);
}

/** Charge utile image normalisée transmise au fournisseur IA. */
export type ImagePayload = { mimeType: string; base64Data: string };

/**
 * Sépare le type MIME et les données base64 d'une charge utile image validée.
 * Une charge utile base64 brute est interpretée comme un JPEG.
 */
export function parseImagePayload(value: string): ImagePayload {
  const trimmed = value.trim();
  const match = DATA_URL_RE.exec(trimmed);
  if (match) {
    return { mimeType: match[1].toLowerCase(), base64Data: match[2] };
  }
  return { mimeType: "image/jpeg", base64Data: trimmed };
}

/** Photo d'ingrédients : data URL base64 (ou base64 brut) de taille bornée. */
export const analysisImageSchema = z
  .string()
  .min(32)
  .max(IMAGE_MAX_LENGTH)
  .refine(isSupportedImagePayload, { message: "unsupported image payload" });

/** Identifiant d'analyse : opaque, borné, généré par le client. */
export const analysisIdSchema = z.string().min(1).max(128);

/**
 * Input contract for `analyzeIngredientsPhoto` (P1).
 *
 * `analysisId` and `accessToken` are REQUIRED. Previously they were optional,
 * which let a request that simply omitted `analysisId` reach the AI provider
 * (Gemini/Lovable) with no capability token. Making both mandatory closes that
 * quota-abuse bypass: an invalid or missing token is rejected before any AI
 * call is made.
 *
 * The token's exact 64-hex shape is enforced by `accessTokenSchema` in the
 * Zod input validator (runs before the handler), and re-checked by
 * `isValidAccessToken` in the handler as defense-in-depth.
 */
export const analyzeIngredientsSchema = z.object({
  /** data URL of the ingredient-list photo */
  image: analysisImageSchema,
  lang: analysisLangSchema,
  analysisId: analysisIdSchema,
  accessToken: accessTokenSchema,
});

/**
 * Decision for the client status-poll loop (P2).
 *
 * - `unauthorized` -> `stop`: the server refuses the token for this job, so
 *   keep polling would be pointless; stop and fall back to the direct request.
 * - `completed` with a result -> `result`.
 * - `failed` -> `failed`.
 * - anything else (processing/pending/timeout) -> `continue`.
 */
export type PollAction = "result" | "failed" | "stop" | "continue";

export function decidePollAction(
  status: string | undefined,
  hasResult: boolean,
): PollAction {
  if (status === "unauthorized") return "stop";
  if (status === "failed") return "failed";
  if (status === "completed" && hasResult) return "result";
  return "continue";
}
