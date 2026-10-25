import { describe, expect, it } from "vitest";
import {
  classifyIngredients,
  cleanIngredientsText,
  HARAM_DICTIONARY,
  DOUBTFUL_DICTIONARY,
} from "./ingredients.functions";

describe("Protocole de classification Halal / Haram / Douteux", () => {
  it("nettoie le texte en retirant les accents et la ponctuation", () => {
    const raw = "Sucre, Gélatine d'origine Porcine (12%), Émulsifiant: E471; Arômes.";
    const cleaned = cleanIngredientsText(raw);
    expect(cleaned).toContain("gelatine d origine porcine");
    expect(cleaned).toContain("emulsifiant e471");
    expect(cleaned).not.toContain("'");
    expect(cleaned).not.toContain(",");
  });

  it("détecte du porc ou gélatine de porc et classe immédiatement en HARAM", () => {
    const result = classifyIngredients(
      "Sirop de glucose, sucre, gélatine de porc, acidifiant E330, arômes.",
    );
    expect(result.verdict).toBe("haram");
    expect(result.reasons.some((r) => r.includes("Porc") || r.includes("porc"))).toBe(true);
  });

  it("détecte l'alcool ou éthanol et classe en HARAM", () => {
    const result = classifyIngredients(
      "Farine de blé, sucre, chocolat, rhum (alcool 1.5%), arôme vanille.",
    );
    expect(result.verdict).toBe("haram");
    expect(result.reasons.some((r) => r.includes("Alcool") || r.includes("Éthanol"))).toBe(true);
  });

  it("détecte le colorant E120 / carmin et classe en HARAM", () => {
    const result = classifyIngredients(
      "Sucre, sirop de glucose, colorant E120, arômes naturels.",
    );
    expect(result.verdict).toBe("haram");
    expect(result.reasons.some((r) => r.includes("E120") || r.includes("Carmin"))).toBe(true);
  });

  it("détecte E471 sans porc et classe en DOUTEUX", () => {
    const result = classifyIngredients(
      "Pommes de terre déshydratées, huiles végétales, émulsifiant (E471), sel.",
    );
    expect(result.verdict).toBe("doubtful");
    expect(result.reasons.some((r) => r.includes("E471"))).toBe(true);
  });

  it("détecte E422 (glycérol) sans porc et classe en DOUTEUX", () => {
    const result = classifyIngredients(
      "Farine, eau, humectant: E422 (glycérol), levure, sel.",
    );
    expect(result.verdict).toBe("doubtful");
    expect(result.reasons.some((r) => r.includes("E422") || r.includes("Glycérol"))).toBe(true);
  });

  it("respecte la règle de décision critique : Si au moins 1 Haram et 1 Douteux -> HARAM prioritaire", () => {
    const result = classifyIngredients(
      "Farine, graisse de porc, émulsifiant E471, arômes.",
    );
    expect(result.verdict).toBe("haram");
    expect(result.reasons.some((r) => r.includes("Porc"))).toBe(true);
  });

  it("gère les négations et exceptions licites sans faux positifs (ex: sans porc, sans alcool)", () => {
    const result = classifyIngredients(
      "Viande de dinde, sel, épices, garanti sans porc, sans alcool.",
    );
    expect(result.verdict).toBe("halal");
  });

  it("classe un produit 100% végétal sans additif à risque en HALAL", () => {
    const result = classifyIngredients(
      "Flocons d'avoine complète 100%, graines de lin, cannelle en poudre.",
    );
    expect(result.verdict).toBe("halal");
    expect(result.reasons[0]).toContain("conformes");
  });
});
