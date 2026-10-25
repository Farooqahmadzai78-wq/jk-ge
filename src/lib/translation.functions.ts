import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import {
  checkAiRateLimit,
  extractClientKey,
  rateLimitError,
} from "./ai-rate-limit";

/**
 * Codes de langue acceptés. La valeur est interpolée dans le prompt IA :
 * elle est donc restreinte à un format de locale pour éviter d'y injecter des
 * instructions.
 */
const languageCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(10)
  .regex(/^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/, "invalid language code");

const translateSchema = z.object({
  text: z.string().min(1).max(5000),
  targetLang: languageCodeSchema, // e.g. 'fr', 'en', 'ps', 'ar', 'ur', 'tr', 'de', 'es'
  sourceLang: z.union([languageCodeSchema, z.literal("auto")]).optional(),
});

export type TranslateResult = {
  translatedText: string;
  sourceLang?: string;
  targetLang: string;
  success: boolean;
};

// In-memory server cache to avoid redundant API calls
const translationCache = new Map<string, string>();

async function translateTextInternal(
  text: string,
  targetLang: string,
  sourceLang?: string,
): Promise<string> {
  if (!text || !text.trim()) return text;
  const cacheKey = `${sourceLang || "auto"}:${targetLang}:${text.trim()}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return text;

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    const prompt = `You are a professional, accurate translator.
Translate the following text faithfully and naturally into target language "${targetLang}".
Maintain the tone, intent, technical terms, and formatting.
Respond ONLY with the translated text without adding quotes, notes, or extra commentary.

Text to translate:
${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const translated = response.text?.trim() || text;
    translationCache.set(cacheKey, translated);
    if (translationCache.size > 2000) {
      const firstKey = translationCache.keys().next().value;
      if (firstKey) translationCache.delete(firstKey);
    }
    return translated;
  } catch (err) {
    console.error("[Translation] Error in translateTextInternal:", err);
    return text;
  }
}

export const translateTextServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => translateSchema.parse(data))
  .handler(async ({ data }): Promise<TranslateResult> => {
    const request = getRequest();
    const decision = await checkAiRateLimit("translate", {
      request,
      key: extractClientKey(request?.headers),
    });
    if (!decision.allowed) throw rateLimitError("translate", decision.retryAfterSec);

    const { text, targetLang, sourceLang } = data;
    const translated = await translateTextInternal(text, targetLang, sourceLang);
    return {
      translatedText: translated,
      sourceLang,
      targetLang,
      success: translated !== text || !process.env.GEMINI_API_KEY,
    };
  });
