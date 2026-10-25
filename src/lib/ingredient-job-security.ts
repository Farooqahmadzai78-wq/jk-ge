/**
 * Framework-free, environment-agnostic helpers backing the ingredient-analysis
 * access-control mechanism.
 *
 * Design:
 * - `analysisId` only *identifies* a job; it grants no access on its own.
 * - A separate `accessToken` (a capability secret) proves possession.
 * - The server stores ONLY a SHA-256 hash of the token (`tokenHash`), never the
 *   token itself, and compares hashes in constant time.
 *
 * These helpers rely only on the Web Crypto API (`crypto.subtle`,
 * `crypto.getRandomValues`), which is a global in both Node (>=20) and browsers
 * running in a secure context (the Capacitor app uses an `https://` scheme and
 * the web build is served over HTTPS). The token is generated on the client
 * (via {@link generateAccessToken}); hashing/comparison happen on the server
 * (inside the server-function handlers).
 */

export type JobStatus = "pending" | "processing" | "completed" | "failed";

/** 32 bytes = 256 bits of entropy. */
const ACCESS_TOKEN_BYTES = 32;
/** Hex encoding doubles the byte count. */
export const ACCESS_TOKEN_HEX_LENGTH = ACCESS_TOKEN_BYTES * 2;

/**
 * Generates a cryptographically-secure, 256-bit access token (64 hex chars).
 * Never uses `Math.random()`. Throws if no CSPRNG is available, because a
 * predictable token would defeat the whole mechanism.
 */
export function generateAccessToken(): string {
  const webCrypto = typeof crypto !== "undefined" ? crypto : undefined;
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    const bytes = new Uint8Array(ACCESS_TOKEN_BYTES);
    webCrypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("No cryptographically secure random generator available");
}

/** Validates the token's expected shape: a 64-char lowercase hex string. */
export function isValidAccessToken(token: unknown): token is string {
  return (
    typeof token === "string" &&
    token.length === ACCESS_TOKEN_HEX_LENGTH &&
    /^[0-9a-f]+$/.test(token)
  );
}

/** SHA-256 of the token, hex-encoded (server-side only). */
export async function hashAccessToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Constant-time comparison of two equal-length hex hashes. Callers must hash
 * before comparing so raw tokens are never compared and lengths always match.
 */
export function accessTokenHashesMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Terminal-state immutability: once a job is `completed` or `failed`, a late
 * update must not replace the finished result with an older state.
 */
export function canTransition(current: JobStatus | undefined, next: JobStatus): boolean {
  if (current === "completed" || current === "failed") return false;
  return true;
}

/**
 * Decides how to bind an incoming token hash to a job that may already exist:
 * - `establish`: no association yet -> set it (first caller wins);
 * - `ok`: already bound to the same token -> keep as-is;
 * - `conflict`: bound to a different token -> reject without modifying the job.
 */
export function evaluateTokenBinding(
  existingHash: string | undefined,
  incomingHash: string,
): "establish" | "ok" | "conflict" {
  if (!existingHash) return "establish";
  return accessTokenHashesMatch(existingHash, incomingHash) ? "ok" : "conflict";
}
