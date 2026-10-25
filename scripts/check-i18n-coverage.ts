import { en } from "../src/lib/locales/en";
import { fr } from "../src/lib/locales/fr";
import { LOCALES } from "../src/lib/i18n";

const allKeys = Object.keys(en);
console.log(`Total keys in en: ${allKeys.length}`);

const frKeys = Object.keys(fr);
console.log(`Total keys in fr: ${frKeys.length}`);

const report: Record<string, { total: number; missing: number; pct: string }> = {};

for (const [code, dict] of Object.entries(LOCALES)) {
  const dKeys = Object.keys(dict);
  const missing = allKeys.filter((k) => !(k in dict));
  report[code] = {
    total: dKeys.length,
    missing: missing.length,
    pct: ((dKeys.length / allKeys.length) * 100).toFixed(1) + "%",
  };
}

console.table(report);
