import { en } from "../src/lib/locales/en";
import { LOCALES } from "../src/lib/i18n";

const allKeys = Object.keys(en);
const stats: Record<string, number> = {};
for (const [code, dict] of Object.entries(LOCALES)) {
  const missing = allKeys.filter(k => !(k in dict));
  stats[code] = missing.length;
}
console.log(JSON.stringify(stats, null, 2));
