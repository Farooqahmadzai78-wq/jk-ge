import { describe, expect, it, afterEach } from "vitest";
import { searchByName, searchByNamePaginated, getFastSuggestions, CURATED_PRODUCTS } from "./halal";

const ORIGINAL_FETCH = globalThis.fetch;

/**
 * Remplace fetch par une réponse JSON contrôlée pour tous les appels (Search-a-licious, OFF cgi).
 * Rend les tests hermétiques et déterministes.
 */
function installFetch(json: unknown, ok = true, status = 200): void {
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(JSON.stringify(json), {
        status,
        ok,
        headers: { "content-type": "application/json" },
      } as ResponseInit),
    )) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("searchByName & searchByNamePaginated — recherche externe Open Food Facts", () => {
  it("« chips » : retourne la liste complète des produits retournés par l'API externe (plusieurs produits)", async () => {
    installFetch({
      count: 4,
      hits: [
        {
          code: "7311310032067",
          product_name: "Tortilla Chips Organic",
          brands: ["Santa Maria"],
          image_front_small_url: "https://images.openfoodfacts.org/chips1.jpg",
        },
        {
          code: "0728229123811",
          product_name: "Mediterranean Vegetable Chips",
          brands: "Terra Chips",
          image_front_small_url: "https://images.openfoodfacts.org/chips2.jpg",
        },
        {
          code: "7610095085009",
          product_name: "JouJoux Chips Paprika",
          brands: ["Zweifel"],
          image_front_small_url: "https://images.openfoodfacts.org/chips3.jpg",
        },
        {
          code: "5053990111503",
          product_name: "Pringles Original",
          brands: "Pringles",
          image_front_small_url: "https://images.openfoodfacts.org/pringles.jpg",
        },
      ],
    });

    const res = await searchByNamePaginated("chips", 1, 24);
    expect(res.products.length).toBe(4);
    expect(res.total).toBe(4);
    expect(res.sourceError).toBe(false);
    expect(res.products[0].name).toBe("Tortilla Chips Organic");
    expect(res.products[0].brand).toBe("Santa Maria");
    expect(res.products[0].code).toBe("7311310032067");
    expect(res.products[0].image).toBe("https://images.openfoodfacts.org/chips1.jpg");
    expect(res.products[3].code).toBe("5053990111503");
  });

  it("« Coca-Cola » : conserve tous les produits retournés par l'API externe sans en garder un seul", async () => {
    installFetch({
      count: 3,
      hits: [
        {
          code: "5449000000996",
          product_name: "Coca-Cola Original",
          brands: "Coca-Cola",
          image_front_small_url: "https://images.openfoodfacts.org/coca1.jpg",
        },
        {
          code: "5000112594218",
          product_name: "Coca-Cola Sans Sucres",
          brands: "Coca-Cola",
          image_front_small_url: "https://images.openfoodfacts.org/coca2.jpg",
        },
        {
          code: "5449000131805",
          product_name: "Coca-Cola Cherry",
          brands: "Coca-Cola",
          image_front_small_url: "https://images.openfoodfacts.org/coca3.jpg",
        },
      ],
    });

    const results = await searchByName("Coca-Cola");
    expect(results.length).toBe(3);
    expect(results[0].code).toBe("5449000000996");
    expect(results[1].code).toBe("5000112594218");
    expect(results[2].code).toBe("5449000131805");
  });

  it("requête inconnue : l'API renvoie 0 hits, aucun produit local n'est substitué arbitrairement", async () => {
    installFetch({ count: 0, hits: [] });

    const res = await searchByNamePaginated("qsdfghwxyz-produit-inexistant");
    expect(res.products).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.hasMore).toBe(false);
    expect(res.sourceError).toBe(false);

    const direct = await searchByName("qsdfghwxyz-produit-inexistant");
    expect(direct).toEqual([]);
  });

  it("erreur réseau de l'API : signale sourceError: true et ne substitue pas de catalogue local", async () => {
    globalThis.fetch = (() => Promise.reject(new Error("network down"))) as typeof fetch;

    const res = await searchByNamePaginated("chips");
    expect(res.products).toEqual([]);
    expect(res.sourceError).toBe(true);
    expect(res.hasMore).toBe(false);
  });

  it("pagination : support de page 1 et page suivante avec hasMore cohérent", async () => {
    // 30 résultats au total, page 1 renvoie 24 produits
    installFetch({
      count: 30,
      hits: Array.from({ length: 24 }, (_, i) => ({
        code: String(2000 + i),
        product_name: `Produit Test ${i}`,
        brands: "Marque Test",
        image_front_small_url: `https://example.com/${i}.jpg`,
      })),
    });

    const p1 = await searchByNamePaginated("test", 1, 24);
    expect(p1.products.length).toBe(24);
    expect(p1.total).toBe(30);
    expect(p1.hasMore).toBe(true);
    expect(p1.page).toBe(1);

    // Page 2 renvoie les 6 produits suivants
    installFetch({
      count: 30,
      hits: Array.from({ length: 6 }, (_, i) => ({
        code: String(2024 + i),
        product_name: `Produit Test ${24 + i}`,
        brands: "Marque Test",
        image_front_small_url: `https://example.com/${24 + i}.jpg`,
      })),
    });

    const p2 = await searchByNamePaginated("test", 2, 24);
    expect(p2.products.length).toBe(6);
    expect(p2.total).toBe(30);
    expect(p2.hasMore).toBe(false);
    expect(p2.page).toBe(2);
  });

  it("dédoublonnage strict par code-barres dans les résultats de recherche", async () => {
    installFetch({
      count: 3,
      hits: [
        { code: "12345", product_name: "Produit A", brands: "Marque" },
        { code: "12345", product_name: "Produit A Doublon", brands: "Marque" },
        { code: "67890", product_name: "Produit B", brands: "Marque" },
      ],
    });

    const results = await searchByName("doublons");
    expect(results.length).toBe(2);
    expect(results.map((p) => p.code)).toEqual(["12345", "67890"]);
  });

  it("préservation de la véritable URL d'image renvoyée par l'API sans substitution", async () => {
    installFetch({
      count: 1,
      hits: [
        {
          code: "999888777",
          product_name: "Jus d'Orange Bio",
          brands: "Bio Pure",
          image_front_small_url: "https://images.openfoodfacts.org/pure_orange.jpg",
        },
      ],
    });

    const results = await searchByName("jus d'orange");
    expect(results.length).toBe(1);
    expect(results[0].image).toBe("https://images.openfoodfacts.org/pure_orange.jpg");
  });
});

describe("getFastSuggestions — suggestions instantanées", () => {
  it("saisie vide : produits populaires du catalogue vérifié", async () => {
    const suggestions = await getFastSuggestions("", 4);
    expect(suggestions.length).toBeLessThanOrEqual(4);
    expect(suggestions.every((p) => CURATED_PRODUCTS.includes(p))).toBe(true);
  });

  it("saisie « chips » : renvoie au minimum 15 propositions issues de l'API externe", async () => {
    installFetch({
      count: 20,
      hits: Array.from({ length: 20 }, (_, i) => ({
        code: `30000000000${i}`,
        product_name: `Chips Variété ${i}`,
        brands: `Marque Chips ${i}`,
        image_front_small_url: `https://images.openfoodfacts.org/chips_${i}.jpg`,
      })),
    });

    const suggestions = await getFastSuggestions("chips", 15);
    expect(suggestions.length).toBeGreaterThanOrEqual(15);
    expect(suggestions[0].name).toContain("Chips Variété");
    expect(suggestions[0].image).toContain("chips_");
  });
});

