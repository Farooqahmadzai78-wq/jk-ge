import { translateTextServerFn, type TranslateResult } from "./translation.functions";

const localClientCache = new Map<string, string>();

/**
 * Translates any text into target language asynchronously using the server-side Gemini service.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<string> {
  if (!text || !text.trim()) return text;
  if (sourceLang && sourceLang.toLowerCase() === targetLang.toLowerCase()) return text;

  const cacheKey = `${sourceLang || "auto"}:${targetLang}:${text.trim()}`;
  if (localClientCache.has(cacheKey)) {
    return localClientCache.get(cacheKey)!;
  }

  try {
    const res: TranslateResult = await translateTextServerFn({
      data: {
        text: text.trim(),
        targetLang,
        sourceLang,
      },
    });

    if (res && res.translatedText) {
      localClientCache.set(cacheKey, res.translatedText);
      return res.translatedText;
    }
    return text;
  } catch (err) {
    console.warn("[Translation] Client request failed, using original text:", err);
    return text;
  }
}
