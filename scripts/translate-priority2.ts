import { en } from "../src/lib/locales/en";
import { tr } from "../src/lib/locales/tr";
import { bn } from "../src/lib/locales/bn";
import { id } from "../src/lib/locales/id";
import { ha } from "../src/lib/locales/ha";
import { sw } from "../src/lib/locales/sw";
import { translateKeysInChunks } from "./translate-worker";
import * as fs from "fs";

async function run() {
  const allKeys = Object.keys(en);

  // 1. Turkish (tr)
  const missingTr = allKeys.filter((k) => !(k in tr));
  if (missingTr.length > 0) {
    console.log(`Starting TR (${missingTr.length} missing)...`);
    const transTr = await translateKeysInChunks(missingTr, "Turkish", "tr", 70);
    appendToFile("src/lib/locales/tr.ts", transTr);
  }

  // 2. Bengali (bn)
  const missingBn = allKeys.filter((k) => !(k in bn));
  if (missingBn.length > 0) {
    console.log(`Starting BN (${missingBn.length} missing)...`);
    const transBn = await translateKeysInChunks(missingBn, "Bengali", "bn", 70);
    appendToFile("src/lib/locales/bn.ts", transBn);
  }

  // 3. Indonesian (id)
  const missingId = allKeys.filter((k) => !(k in id));
  if (missingId.length > 0) {
    console.log(`Starting ID (${missingId.length} missing)...`);
    const transId = await translateKeysInChunks(missingId, "Indonesian", "id", 70);
    appendToFile("src/lib/locales/id.ts", transId);
  }

  // 4. Hausa (ha)
  const missingHa = allKeys.filter((k) => !(k in ha));
  if (missingHa.length > 0) {
    console.log(`Starting HA (${missingHa.length} missing)...`);
    const transHa = await translateKeysInChunks(missingHa, "Hausa", "ha", 70);
    appendToFile("src/lib/locales/ha.ts", transHa);
  }

  // 5. Swahili (sw)
  const missingSw = allKeys.filter((k) => !(k in sw));
  if (missingSw.length > 0) {
    console.log(`Starting SW (${missingSw.length} missing)...`);
    const transSw = await translateKeysInChunks(missingSw, "Swahili", "sw", 70);
    appendToFile("src/lib/locales/sw.ts", transSw);
  }

  console.log("Priority 2 finished successfully!");
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
