import { en } from "../src/lib/locales/en";
import { de } from "../src/lib/locales/de";
import { es } from "../src/lib/locales/es";
import { pt } from "../src/lib/locales/pt";
import { nl } from "../src/lib/locales/nl";
import { ms } from "../src/lib/locales/ms";
import { translateKeysInChunks } from "./translate-worker";
import * as fs from "fs";

async function run() {
  const allKeys = Object.keys(en);

  // 1. German (de)
  const missingDe = allKeys.filter((k) => !(k in de));
  if (missingDe.length > 0) {
    console.log(`Starting DE (${missingDe.length} missing)...`);
    const transDe = await translateKeysInChunks(missingDe, "German", "de", 80);
    appendToFile("src/lib/locales/de.ts", transDe);
  }

  // 2. Spanish (es)
  const missingEs = allKeys.filter((k) => !(k in es));
  if (missingEs.length > 0) {
    console.log(`Starting ES (${missingEs.length} missing)...`);
    const transEs = await translateKeysInChunks(missingEs, "Spanish", "es", 80);
    appendToFile("src/lib/locales/es.ts", transEs);
  }

  // 3. Portuguese (pt)
  const missingPt = allKeys.filter((k) => !(k in pt));
  if (missingPt.length > 0) {
    console.log(`Starting PT (${missingPt.length} missing)...`);
    const transPt = await translateKeysInChunks(missingPt, "Portuguese", "pt", 80);
    appendToFile("src/lib/locales/pt.ts", transPt);
  }

  // 4. Dutch (nl)
  const missingNl = allKeys.filter((k) => !(k in nl));
  if (missingNl.length > 0) {
    console.log(`Starting NL (${missingNl.length} missing)...`);
    const transNl = await translateKeysInChunks(missingNl, "Dutch", "nl", 80);
    appendToFile("src/lib/locales/nl.ts", transNl);
  }

  // 5. Malay (ms)
  const missingMs = allKeys.filter((k) => !(k in ms));
  if (missingMs.length > 0) {
    console.log(`Starting MS (${missingMs.length} missing)...`);
    const transMs = await translateKeysInChunks(missingMs, "Malay", "ms", 80);
    appendToFile("src/lib/locales/ms.ts", transMs);
  }

  console.log("Priority 3 finished successfully!");
}

function appendToFile(filePath: string, newEntries: Record<string, string>) {
  let content = fs.readFileSync(filePath, "utf-8");
  const lastBraceIndex = content.lastIndexOf("};");
  if (lastBraceIndex === -1) {
    throw new Error(`Closing bracket not found in ${filePath}`);
  }
  const lines = Object.entries(newEntries)
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`)
    .join("\n");
  content = content.slice(0, lastBraceIndex) + lines + "\n" + content.slice(lastBraceIndex);
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`Appended ${Object.keys(newEntries).length} keys to ${filePath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
