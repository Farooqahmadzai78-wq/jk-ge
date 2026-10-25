import { z } from "zod";

/**
 * Input contract for the reminder TTS server function.
 * Kept in a standalone, framework-free module so it can be unit-tested in
 * isolation (no TanStack Start, no network, no API key).
 *
 * - `text`: required, non-empty after trimming, at most 5000 characters
 *   (larger payloads are rejected up front).
 * - `voice`: optional and tolerant. Any value other than "onyx" falls back to
 *   "alloy" when building the provider payload.
 */
export const ttsSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  voice: z.string().optional(),
});

export type TtsInput = z.infer<typeof ttsSchema>;

/** Characters actually sent to the audio provider (preserves existing cap). */
export const TTS_PROVIDER_MAX_CHARS = 400;

export interface TtsProviderPayload {
  text: string;
  voice: string;
}

/**
 * Pure preparation of the audio provider payload from validated input.
 * - truncates text to 400 characters (unchanged behaviour);
 * - keeps "onyx", maps every other/absent voice to "alloy".
 */
export function buildTtsProviderPayload(data: {
  text: string;
  voice?: string;
}): TtsProviderPayload {
  const text = data.text.slice(0, TTS_PROVIDER_MAX_CHARS);
  const voice = data.voice === "onyx" ? "onyx" : "alloy";
  return { text, voice };
}
