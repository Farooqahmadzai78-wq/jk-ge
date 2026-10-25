import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function testBatch() {
  const sample = {
    invocationsLabel: "invocations",
    timezoneLabel: "Timezone",
    cropPhotoTitle: "Adjust your photo",
    permissionNeeded: "Permission required",
    allow: "Allow",
    locationDenied: "Location access denied. Enable it in your phone settings.",
    ayatKursiArabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ",
  };

  const prompt = `You are a professional localization expert for an Islamic mobile application (Islam-Noor).
Translate the following JSON key-value pairs from English to German (de).
CRITICAL RULES:
1. Return ONLY a valid JSON object mapping the exact same keys to the translated German strings.
2. If the value is Arabic script (Quran, Hadith, Ayat Al-Kursi, Dua in Arabic), DO NOT translate or alter it; keep the exact Arabic characters intact.
3. Use respectful, accurate Islamic and app UI terms in German.
4. Do not output markdown codeblocks (no \`\`\`json). Just the raw JSON object.

Input JSON:
${JSON.stringify(sample, null, 2)}`;

  const resp = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
  });

  console.log("Raw output:\n", resp.text);
  const parsed = JSON.parse(resp.text!.trim().replace(/^```json/, "").replace(/```$/, ""));
  console.log("Parsed:", parsed);
}

testBatch();
