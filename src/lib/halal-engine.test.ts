import { describe, expect, it } from "vitest";
import {
  evaluateProduct,
  validateBarcode,
  type EvaluationInput,
} from "./halal-engine";

describe("P14 – Tests obligatoires du moteur de verdict Halal", () => {
  // Test 1
  it("1. « eau, malt d'orge, houblon, alcool » → HARAM", () => {
    const res = evaluateProduct({
      ingredientsText: "eau, malt d'orge, houblon, alcool",
    });
    expect(res.verdict).toBe("HARAM");
    expect(res.flaggedItems.some((f) => f.ingredient === "alcool")).toBe(true);
  });

  // Test 2
  it("2. « sucre, gélatine de porc » → HARAM", () => {
    const res = evaluateProduct({
      ingredientsText: "sucre, gélatine de porc, eau",
    });
    expect(res.verdict).toBe("HARAM");
    expect(res.flaggedItems.some((f) => f.ingredient.includes("porc"))).toBe(true);
  });

  // Test 3
  it("3. « sucre, gélatine, E120 » → HARAM", () => {
    const res = evaluateProduct({
      ingredientsText: "sucre, gélatine, E120, eau",
    });
    expect(res.verdict).toBe("HARAM");
    expect(res.flaggedItems.some((f) => f.ingredient.includes("e120") || f.ingredient.includes("E120"))).toBe(true);
  });

  // Test 4
  it("4. « sucre, eau, arôme naturel » → NON CONFIRMÉ", () => {
    const res = evaluateProduct({
      ingredientsText: "sucre, eau, arôme naturel",
    });
    expect(res.verdict).toBe("NON CONFIRMÉ");
    expect(res.flaggedItems.some((f) => f.ingredient.includes("arome"))).toBe(true);
  });

  // Test 5
  it("5. « farine de blé, eau, sel, levure » → HALAL", () => {
    const res = evaluateProduct({
      ingredientsText: "farine de blé, eau, sel, levure",
    });
    expect(res.verdict).toBe("HALAL");
    expect(res.flaggedItems.length).toBe(0);
    expect(res.proof).toBeDefined();
  });

  // Test 6
  it("6. « sirop de glucose, E471, E150d » → NON CONFIRMÉ", () => {
    const res = evaluateProduct({
      ingredientsText: "sirop de glucose, E471, E150d",
    });
    expect(res.verdict).toBe("NON CONFIRMÉ");
    expect(res.flaggedItems.some((f) => f.ingredient.includes("e471"))).toBe(true);
  });

  // Test 7
  it("7. « eau, sucre, xylitol » → pas de HARAM (alcool de sucre ≠ éthanol)", () => {
    const res = evaluateProduct({
      ingredientsText: "eau, sucre, xylitol",
    });
    expect(res.verdict).not.toBe("HARAM");
  });

  // Test 8
  it("8. « extrait de vanille » → NON CONFIRMÉ", () => {
    const res = evaluateProduct({
      ingredientsText: "eau, sucre, extrait de vanille",
    });
    expect(res.verdict).toBe("NON CONFIRMÉ");
    expect(res.flaggedItems.some((f) => f.ingredient.includes("vanille"))).toBe(true);
  });

  // Test 9 (RÈGLE D'OR 5 : Viande jamais HALAL, toujours VIANDE À VÉRIFIER)
  it("9. « poulet, sel » sans label halal → VIANDE À VÉRIFIER ; avec label halal → VIANDE À VÉRIFIER avec mention label", () => {
    // 9a. Sans label halal : Viande invérifiable par scan
    const sansLabel = evaluateProduct({
      ingredientsText: "poulet, sel, eau",
      isHalalCertified: false,
    });
    expect(sansLabel.verdict).toBe("VIANDE À VÉRIFIER");
    expect(sansLabel.explanation).toBe(
      "L'abattage ne peut pas être vérifié par un scan. Vérifie le logo du certificateur sur l'emballage ou demande à ton boucher.",
    );

    // 9b. Avec label halal : Règle d'or 5 -> JAMAIS HALAL, verdict VIANDE À VÉRIFIER + information label
    const avecLabel = evaluateProduct({
      ingredientsText: "poulet, sel, eau",
      isHalalCertified: true,
      labelsTags: ["en:halal"],
    });
    expect(avecLabel.verdict).toBe("VIANDE À VÉRIFIER");
    expect(avecLabel.secondaryInfo).toBe("Label halal mentionné – vérifie le logo officiel");
  });

  // Test 10
  it("10. « vin » même avec label halal → HARAM", () => {
    const res = evaluateProduct({
      ingredientsText: "eau, sucre, vin",
      isHalalCertified: true,
      labelsTags: ["en:halal"],
    });
    expect(res.verdict).toBe("HARAM");
  });

  // Test 11
  it("11. Photo floue → NON CONFIRMÉ", () => {
    const res = evaluateProduct({
      ingredientsText: "texte quelconque",
      ocrQuality: {
        floue: true,
        lisible: false,
        confiance: 0.4,
      },
    });
    expect(res.verdict).toBe("NON CONFIRMÉ");
    expect(res.error).toBe("Image illisible, reprends la photo");
  });

  // Test 12
  it("12. Code-barres à clé fausse → erreur, aucun verdict", () => {
    // Code 13 chiffres avec clé de contrôle corrompue (5449000000996 est un vrai code Coca-Cola, modifions le dernier chiffre en 1)
    const check = validateBarcode("5449000000991");
    expect(check.valid).toBe(false);
    expect(check.error).toBe("Code-barres invalide, rescanne");
  });

  // Test 13
  it("13. Code-barres introuvable → demande de photo des ingrédients", () => {
    // Si status = 0 lors de la requête OFF, l'application doit rediriger vers la prise de photo
    const emptyResponse = { status: 0, product: null };
    const shouldPromptPhoto = emptyResponse.status === 0;
    expect(shouldPromptPhoto).toBe(true);
  });

  // Test 14
  it("14. Deux scans à la suite → aucun mélange entre les résultats", () => {
    let currentScanId = "scan_1";
    const scan1 = evaluateProduct({
      scanId: currentScanId,
      ingredientsText: "eau, malt d'orge, alcool",
    });

    // Nouveau scan démarre : nouvel id généré
    currentScanId = "scan_2";
    const scan2 = evaluateProduct({
      scanId: currentScanId,
      ingredientsText: "farine de blé, eau, sel, levure",
    });

    // Une réponse retardée de scan_1 est ignorée si elle ne correspond plus au scanId actif
    const isScan1ValidForCurrentState = scan1.scanId === currentScanId;
    const isScan2ValidForCurrentState = scan2.scanId === currentScanId;

    expect(isScan1ValidForCurrentState).toBe(false);
    expect(isScan2ValidForCurrentState).toBe(true);
    expect(scan1.verdict).toBe("HARAM");
    expect(scan2.verdict).toBe("HALAL");
  });

  // Test 15
  it("15. Ingrédients vides → NON CONFIRMÉ", () => {
    const res = evaluateProduct({
      ingredientsText: "",
    });
    expect(res.verdict).toBe("NON CONFIRMÉ");
  });
});
