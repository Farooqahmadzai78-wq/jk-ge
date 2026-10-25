import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  checkAiRateLimit,
  extractClientKey,
  rateLimitError,
} from "./ai-rate-limit";
import { buildTtsProviderPayload, ttsSchema } from "./tts-validation";

export const getTtsAudio = createServerFn({ method: "GET" })
  .validator((data: unknown) => ttsSchema.parse(data))
  .handler(async ({ data }) => {
    const request = getRequest();
    const decision = await checkAiRateLimit("tts", {
      request,
      key: extractClientKey(request?.headers),
    });
    if (!decision.allowed) throw rateLimitError("tts", decision.retryAfterSec);

    // TTS distant désactivé : aucun fournisseur externe n'est configuré.
    // Les rappels utilisent la synthèse vocale locale (Web Speech) côté client.
    // On valide toujours l'entrée pour conserver le contrat et le rate limiting.
    buildTtsProviderPayload(data);
    throw new Error("TTS indisponible : aucun fournisseur distant configuré");
  });
