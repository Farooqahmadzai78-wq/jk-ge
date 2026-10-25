import { describe, expect, it } from "vitest";
import {
  MAWAQIT_SEARCH_MAX_LENGTH,
  MAWAQIT_SLUG_MAX_LENGTH,
  mawaqitSearchSchema,
  mawaqitSlugSchema,
} from "./mawaqit-validation";

/**
 * Tests des schémas d'entrée des fonctions serveur mawaqit.
 *
 * Ces schémas sont exécutés par le validateur Zod AVANT le handler : ils
 * constituent la première barrière contre les entrées arbitraires envoyées à
 * la fois au serveur ET à l'API distante mawaqit.net.
 */

describe("mawaqitSearchSchema", () => {
  it("accepts a normal search term", () => {
    const r = mawaqitSearchSchema.safeParse({ query: "Grande Mosquee de Paris" });
    expect(r.success).toBe(true);
  });

  it("accepts an empty term (the handler returns an empty list)", () => {
    expect(mawaqitSearchSchema.safeParse({ query: "" }).success).toBe(true);
  });

  it("rejects an oversized term so nothing huge is forwarded upstream", () => {
    const r = mawaqitSearchSchema.safeParse({ query: "a".repeat(MAWAQIT_SEARCH_MAX_LENGTH + 1) });
    expect(r.success).toBe(false);
  });

  it("rejects a non-string term", () => {
    expect(mawaqitSearchSchema.safeParse({ query: 42 }).success).toBe(false);
    expect(mawaqitSearchSchema.safeParse({}).success).toBe(false);
  });
});

describe("mawaqitSlugSchema", () => {
  it("accepts a normal slug", () => {
    expect(mawaqitSlugSchema.safeParse({ slug: "grande-mosquee-de-paris" }).success).toBe(true);
  });

  it("rejects an empty slug", () => {
    expect(mawaqitSlugSchema.safeParse({ slug: "" }).success).toBe(false);
  });

  it("rejects an oversized slug", () => {
    expect(
      mawaqitSlugSchema.safeParse({ slug: "a".repeat(MAWAQIT_SLUG_MAX_LENGTH + 1) }).success,
    ).toBe(false);
  });

  it("rejects path separators so the proxy cannot be redirected", () => {
    expect(mawaqitSlugSchema.safeParse({ slug: "../../api/2.0/mosque/search" }).success).toBe(false);
    expect(mawaqitSlugSchema.safeParse({ slug: "mosque/evil" }).success).toBe(false);
    expect(mawaqitSlugSchema.safeParse({ slug: "mosque\\evil" }).success).toBe(false);
  });

  it("rejects query separators and whitespace", () => {
    expect(mawaqitSlugSchema.safeParse({ slug: "mosque?x=1" }).success).toBe(false);
    expect(mawaqitSlugSchema.safeParse({ slug: "mosque#frag" }).success).toBe(false);
    expect(mawaqitSlugSchema.safeParse({ slug: "mosque slug" }).success).toBe(false);
  });

  it("rejects path traversal segments", () => {
    expect(mawaqitSlugSchema.safeParse({ slug: ".." }).success).toBe(false);
    expect(mawaqitSlugSchema.safeParse({ slug: "." }).success).toBe(false);
    expect(mawaqitSlugSchema.safeParse({ slug: "..%2F..%2Fapi" }).success).toBe(false);
  });
});
