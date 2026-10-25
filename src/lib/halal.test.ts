import { describe, expect, it } from "vitest";
import { analyse } from "./halal";

describe("analyse — non-régression portée isNaturalStaple", () => {
  it("ingrédients vides + catégorie naturelle : pas d'exception, verdict halal", () => {
    const result = analyse({
      product_name: "Eau minérale",
      categories_tags: ["en:spring-waters"],
    });
    expect(result.verdict).toBe("halal");
    expect(result.subVerdict).toBe("compatible_staple");
    expect(result.tests[3]?.status).toBe("passed");
  });

  it("ingrédients vides + catégorie inconnue : pas d'exception, verdict doubtful", () => {
    const result = analyse({ product_name: "Produit sans données" });
    expect(result.verdict).toBe("doubtful");
    expect(result.subVerdict).toBe("doubtful_incomplete");
    expect(result.tests[3]?.status).toBe("warning");
  });

  it("produit avec liste d'ingrédients : verdict inchangé (cas qui fonctionnait)", () => {
    const result = analyse({
      product_name: "Sucre blanc",
      ingredients_text_fr: "sucre",
    });
    expect(result.verdict).toBe("halal");
    expect(result.subVerdict).toBe("compatible_plant");
    expect(result.tests[3]?.status).toBe("passed");
  });
});

describe("5 Protocoles d'Audit Halal & Traçabilité Réelle", () => {
  it("Viande non certifiée : verdict doubtful, protocole 4 alerte abattage rituel", () => {
    const result = analyse({
      code: "3181232145678",
      product_name: "Steak Haché Pur Bœuf",
      brands: "Socopa",
      ingredients_text_fr: "100% viande de bœuf hachée pur bœuf.",
      categories_tags: ["viandes", "beef"],
    });

    expect(result.verdict).toBe("doubtful");
    expect(result.subVerdict).toBe("doubtful_meat");
    expect(result.tests[0].status).toBe("passed"); // Protocole 1: Identifié
    expect(result.tests[1].status).toBe("passed"); // Protocole 2: Ingrédients documentés
    expect(result.tests[2].status).toBe("warning"); // Protocole 3: Viande à vérifier
    expect(result.tests[3].status).toBe("warning"); // Protocole 4: Certificateur manquant
    expect(result.certaintyLevel).toBe("partial");
  });

  it("Viande avec certification AVS reconnue : Règle 5 verdict VIANDE À VÉRIFIER avec label mentionné", () => {
    const result = analyse({
      code: "3560070498765",
      product_name: "Steak Haché Pur Bœuf Halal",
      brands: "Isla Délice",
      ingredients_text_fr: "100% viande bovine certifiée halal.",
      labels_tags: ["en:halal", "fr:avs"],
      categories_tags: ["viandes", "beef", "halal-meats"],
    });

    // Règle d'or 5 : Même avec un label halal (AVS), la viande n'est JAMAIS HALAL
    expect(result.verdictLabel).toBe("VIANDE À VÉRIFIER");
    expect(result.subVerdict).toBe("doubtful_meat");
    expect(result.certifierName).toContain("AVS");
    expect(result.synthesisSummary).toContain(
      "L'abattage ne peut pas être vérifié par un scan. Vérifie le logo du certificateur sur l'emballage ou demande à ton boucher.",
    );
  });

  it("Ingrédient prohibé avéré (gélatine de porc) : verdict haram", () => {
    const result = analyse({
      code: "3103220009574",
      product_name: "Bonbons gélifiés",
      brands: "Haribo",
      ingredients_text_fr: "Sirop de glucose, sucre, gélatine de porc, acide citrique.",
    });

    expect(result.verdict).toBe("haram");
    expect(result.subVerdict).toBe("haram_forbidden");
    expect(result.tests[2].status).toBe("failed"); // Protocole 3: Détection interdite
    expect(result.tests[4].status).toBe("failed"); // Protocole 5: Non conforme
  });

  it("Additif E471 sans précision d'origine : verdict doubtful", () => {
    const result = analyse({
      code: "8715700110487",
      product_name: "Chips Tuiles",
      brands: "Pringles",
      ingredients_text_fr: "Pommes de terre déshydratées, farine de riz, émulsifiant (E471), sel.",
    });

    expect(result.verdict).toBe("doubtful");
    expect(result.subVerdict).toBe("doubtful_additive");
    expect(result.tests[2].status).toBe("warning");
  });

  it("Aliment végétal propre : subVerdict compatible_plant avec disclaimer Open Food Facts", () => {
    const result = analyse({
      code: "5449000000996",
      product_name: "Soda Cola",
      brands: "Cola",
      ingredients_text_fr: "Eau gazéifiée, sucre, colorant: E150d, jus de citron, acide citrique.",
    });

    expect(result.verdict).toBe("halal");
    expect(result.subVerdict).toBe("compatible_plant");
    expect(result.sourceDisclaimer).toContain("Open Food Facts");
    expect(result.synthesisSummary).toContain("végétal");
  });
});
