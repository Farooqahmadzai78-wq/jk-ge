import { describe, it, expect, afterEach } from "vitest";
import {
  buildOffProductFolderPath,
  extractOffImageCandidatesFromRaw,
  normalizeProductImageUrl,
  resolveProductImage,
  resolveProductImageCandidates,
} from "./halal-product-images";
import { searchByNamePaginated } from "./halal";

const ORIGINAL_FETCH = globalThis.fetch;

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

describe("Mission N22 — Images de produits Halal/Haram (liste de recherche & fiche détail)", () => {
  it("normalise les URL valides, relatives au protocole (//) et http Open Food Facts en https", () => {
    expect(
      normalizeProductImageUrl("https://images.openfoodfacts.org/images/products/123/front.jpg"),
    ).toBe("https://images.openfoodfacts.org/images/products/123/front.jpg");

    expect(
      normalizeProductImageUrl("//images.openfoodfacts.org/images/products/123/front.jpg"),
    ).toBe("https://images.openfoodfacts.org/images/products/123/front.jpg");

    expect(
      normalizeProductImageUrl("http://images.openfoodfacts.org/images/products/123/front.jpg"),
    ).toBe("https://images.openfoodfacts.org/images/products/123/front.jpg");
  });

  it("rejette les valeurs absentes, nulles ou les URL invalides sans inventer d'image", () => {
    expect(normalizeProductImageUrl(undefined)).toBeUndefined();
    expect(normalizeProductImageUrl("")).toBeUndefined();
    expect(normalizeProductImageUrl("   ")).toBeUndefined();
    expect(normalizeProductImageUrl("null")).toBeUndefined();
    expect(normalizeProductImageUrl("undefined")).toBeUndefined();
    expect(normalizeProductImageUrl("not-a-valid-url")).toBeUndefined();
    expect(normalizeProductImageUrl("ftp://example.com/file.jpg")).toBeUndefined();

    // Produit inconnu sans image -> undefined (placeholder propre dans l'UI, jamais l'image d'un autre produit)
    expect(
      resolveProductImage({
        code: "9999999999999",
        name: "Produit Sans Photo",
        brand: "Marque Inconnue",
        image: undefined,
      }),
    ).toBeUndefined();

    expect(
      resolveProductImageCandidates({
        code: "9999999999999",
        name: "Coca-Cola", // même si le nom ressemble à un produit connu, le code-barres ne correspond pas !
        brand: "Coca-Cola",
        image: "://url-cassee",
      }),
    ).toEqual([]);
  });

  it("extrait les images issues de selected_images non-FR/EN et de la structure images.front_*.rev d'Open Food Facts", () => {
    expect(buildOffProductFolderPath("3017620422003")).toBe("301/762/042/2003");
    expect(buildOffProductFolderPath("12345678")).toBe("12345678");

    const fromDeLocale = extractOffImageCandidatesFromRaw({
      code: "4000177999999",
      selected_images: {
        front: {
          display: {
            de: "http://images.openfoodfacts.org/images/products/400/017/799/9999/front_de.12.400.jpg",
          },
        },
      },
    });
    expect(fromDeLocale).toEqual([
      "https://images.openfoodfacts.org/images/products/400/017/799/9999/front_de.12.400.jpg",
    ]);

    const fromRevOnly = extractOffImageCandidatesFromRaw({
      code: "3560070999999",
      images: {
        front_fr: { rev: "42" },
      },
    });
    expect(fromRevOnly).toEqual([
      "https://images.openfoodfacts.org/images/products/356/007/099/9999/front_fr.42.400.jpg",
    ]);
  });

  it("garantit exactement la même image résolue entre la liste des résultats de recherche et la fiche détail", async () => {
    installFetch({
      count: 2,
      hits: [
        {
          code: "4009998887776",
          product_name: "Biscuits Avoine Bio",
          brands: "NatureBio",
          images: {
            front_de: { rev: "17" },
          },
        },
        {
          code: "4009998880000",
          product_name: "Produit Sans Aucune Image",
          brands: "NatureBio",
        },
      ],
    });

    const searchRes = await searchByNamePaginated("avoine", 1, 24);
    expect(searchRes.sourceError).toBe(false);
    expect(searchRes.products).toHaveLength(2);

    const withPhoto = searchRes.products[0];
    const withoutPhoto = searchRes.products[1];

    const expectedUrl =
      "https://images.openfoodfacts.org/images/products/400/999/888/7776/front_de.17.400.jpg";

    // La carte dans la liste et la modale de détail consomment toutes deux HalalProductThumbnail -> resolveProductImageCandidates(product)
    expect(withPhoto.image).toBe(expectedUrl);
    expect(resolveProductImageCandidates(withPhoto)[0]).toBe(expectedUrl);

    // Produit sans photo : aucune image inventée ni en liste ni en détail
    expect(withoutPhoto.image).toBeUndefined();
    expect(resolveProductImageCandidates(withoutPhoto)).toEqual([]);
  });
});
