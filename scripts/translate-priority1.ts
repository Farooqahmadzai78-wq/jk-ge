import { en } from "../src/lib/locales/en";
import { it } from "../src/lib/locales/it";
import { ru } from "../src/lib/locales/ru";
import { fa } from "../src/lib/locales/fa";
import { ur } from "../src/lib/locales/ur";
import { translateKeysInChunks } from "./translate-worker";
import * as fs from "fs";

async function run() {
  const allKeys = Object.keys(en);

  // 1. Italian (it)
  const missingIt = allKeys.filter((k) => !(k in it));
  if (missingIt.length > 0) {
    console.log(`Starting IT (${missingIt.length} missing)...`);
    const transIt = await translateKeysInChunks(missingIt, "Italian", "it", 70);
    appendToFile("src/lib/locales/it.ts", transIt);
  }

  // 2. Russian (ru)
  const missingRu = allKeys.filter((k) => !(k in ru));
  if (missingRu.length > 0) {
    console.log(`Starting RU (${missingRu.length} missing)...`);
    const transRu = await translateKeysInChunks(missingRu, "Russian", "ru", 70);
    appendToFile("src/lib/locales/ru.ts", transRu);
  }

  // 3. Persian (fa)
  const missingFa = allKeys.filter((k) => !(k in fa));
  if (missingFa.length > 0) {
    console.log(`Starting FA (${missingFa.length} missing)...`);
    const transFa = await translateKeysInChunks(missingFa, "Persian (Farsi)", "fa", 70);
    appendToFile("src/lib/locales/fa.ts", transFa);
  }

  // 4. Urdu (ur)
  const missingUr = allKeys.filter((k) => !(k in ur));
  if (missingUr.length > 0) {
    console.log(`Starting UR (${missingUr.length} missing)...`);
    const transUr = await translateKeysInChunks(missingUr, "Urdu", "ur", 70);
    appendToFile("src/lib/locales/ur.ts", transUr);
  }

  console.log("Priority 1 finished successfully!");
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
