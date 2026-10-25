import { GoogleGenAI } from "@google/genai";
import { en } from "../src/lib/locales/en";
import { fr } from "../src/lib/locales/fr";

const ai = new GoogleGenAI({});

export async function translateBatch(
  keys: string[],
  targetLangName: string,
  targetLangCode: string
): Promise<Record<string, string>> {
  const inputItems: Record<string, { en: string; fr: string }> = {};
  for (const k of keys) {
    const enVal = (en as Record<string, any>)[k];
    const frVal = (fr as Record<string, any>)[k];
    inputItems[k] = {
      en: typeof enVal === "string" ? enVal : JSON.stringify(enVal),
      fr: typeof frVal === "string" ? frVal : JSON.stringify(frVal),
    };
  }

  const prompt = `You are an expert Islamic application localization system.
Translate the following items into ${targetLangName} (${targetLangCode}) for the mobile app "Islam-Noor".

STRICT RULES:
1. Return ONLY a single valid JSON object mapping each key to its ${targetLangName} translation.
2. PRESERVE ORIGINAL ARABIC TEXT: If a value contains Arabic script (like Ayat Al-Kursi, Quranic verses, Bismillah, SubhanAllah, Alhamdulillah, Allahu Akbar, Surah names), keep the Arabic text intact.
3. Use culturally authentic Islamic terminology in ${targetLangName} (e.g. prayer times, Adhan, Qibla, Halal/Haram, Invocations/Duas, Tajwid, Tasbih).
4. For UI placeholders like {delay}, {prayer}, {name}, {step}, keep them exactly as variables without translating the brackets.
5. Do NOT include markdown \`\`\` or explanation. Just the raw JSON object.

Input:
${JSON.stringify(inputItems, null, 2)}`;

  let attempts = 0;
  while (attempts < 3) {
    try {
      const resp = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
      });

      let text = resp.text || "{}";
      text = text.trim();
      if (text.startsWith("```json")) {
        text = text.slice(7);
      } else if (text.startsWith("```")) {
        text = text.slice(3);
      }
      if (text.endsWith("```")) {
        text = text.slice(0, -3);
      }
      text = text.trim();

      const parsed = JSON.parse(text);
      return parsed;
    } catch (err) {
      attempts++;
      console.warn(`Attempt ${attempts} failed for ${targetLangCode}:`, err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error(`Failed to translate batch for ${targetLangCode} after 3 attempts`);
}

export async function translateKeysInChunks(
  keys: string[],
  targetLangName: string,
  targetLangCode: string,
  chunkSize = 60
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    console.log(`Translating ${targetLangCode} [${i + 1}-${Math.min(i + chunkSize, keys.length)}/${keys.length}]...`);
    const translated = await translateBatch(chunk, targetLangName, targetLangCode);
    Object.assign(result, translated);
  }
  return result;
}
