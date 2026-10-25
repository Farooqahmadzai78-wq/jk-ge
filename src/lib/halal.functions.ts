import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const searchInputSchema = z.object({
  q: z.string().min(1).max(200),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(24),
});

export interface OffServerSearchResult {
  hits: Record<string, unknown>[];
  total: number;
}

// In-memory cache for search queries on the server (TTL: 3 minutes)
const searchCache = new Map<
  string,
  { timestamp: number; data: OffServerSearchResult }
>();

const MAX_CACHED_SEARCHES = 300;
const CACHE_TTL_MS = 3 * 60 * 1000;
const TIMEOUT_MS = 8000;

const USER_AGENT = "IslamNoorApp/1.0 (https://islam-noor.app; contact@islamnoor.app)";

function getCachedResult(key: string): OffServerSearchResult | null {
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCachedResult(key: string, data: OffServerSearchResult): void {
  while (searchCache.size >= MAX_CACHED_SEARCHES) {
    const oldest = searchCache.keys().next().value;
    if (oldest === undefined) break;
    searchCache.delete(oldest);
  }
  searchCache.set(key, { timestamp: Date.now(), data });
}

/**
 * Server function executing Open Food Facts search directly from the backend.
 * Bypasses browser CORS limitations, uses the official User-Agent, and caches results.
 */
export const searchOffProductsServer = createServerFn({ method: "GET" })
  .validator((d: unknown) => searchInputSchema.parse(d))
  .handler(async ({ data }): Promise<OffServerSearchResult | null> => {
    const q = data.q.trim();
    if (!q) return { hits: [], total: 0 };

    const cacheKey = `${q.toLowerCase()}|p:${data.page}|ps:${data.pageSize}`;
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    // 1. Primary: Open Food Facts Search-a-licious (Elasticsearch)
    try {
      const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(
        q,
      )}&page_size=${data.pageSize}&page=${data.page}&langs=fr,en`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      let hadValidEmptyResponse = false;

      if (res.ok) {
        const json = (await res.json()) as {
          hits?: Record<string, unknown>[];
          count?: number;
        };

        if (Array.isArray(json.hits)) {
          if (json.hits.length > 0) {
            const result: OffServerSearchResult = {
              hits: json.hits,
              total: typeof json.count === "number" ? json.count : json.hits.length,
            };
            setCachedResult(cacheKey, result);
            return result;
          }
          hadValidEmptyResponse = true;
        }
      }

      // 2. Fallback: Open Food Facts v2 search
      try {
        const fallbackUrl = `https://world.openfoodfacts.net/api/v2/search?search_terms=${encodeURIComponent(
          q,
        )}&page_size=${data.pageSize}&page=${data.page}&fields=code,product_name,product_name_fr,product_name_en,generic_name,brands,quantity,categories_tags,ingredients_text,ingredients_text_fr,ingredients_tags,ingredients_analysis_tags,additives_tags,labels_tags,allergens_tags,nutriments,nutriscore_grade,nova_group,ecoscore_grade,image_url,image_front_url,image_front_small_url,image_small_url,image_thumb_url,selected_images,images`;

        const fallbackController = new AbortController();
        const fallbackTimer = setTimeout(() => fallbackController.abort(), TIMEOUT_MS);

        const fallbackRes = await fetch(fallbackUrl, {
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "application/json",
          },
          signal: fallbackController.signal,
        }).finally(() => clearTimeout(fallbackTimer));

        if (fallbackRes.ok) {
          const json = (await fallbackRes.json()) as {
            products?: Record<string, unknown>[];
            hits?: Record<string, unknown>[];
            count?: number;
          };
          const list = Array.isArray(json.products)
            ? json.products
            : Array.isArray(json.hits)
              ? json.hits
              : null;

          if (list) {
            if (list.length > 0) {
              const result: OffServerSearchResult = {
                hits: list,
                total: typeof json.count === "number" ? json.count : list.length,
              };
              setCachedResult(cacheKey, result);
              return result;
            }
            hadValidEmptyResponse = true;
          }
        }
      } catch (err) {
        console.warn("OFF v2 search server fetch warning:", err);
      }

      if (hadValidEmptyResponse) {
        return { hits: [], total: 0 };
      }
    } catch (err) {
      console.warn("Search-a-licious server fetch warning:", err);

      // Fallback v2 when Search-a-licious threw a network/abort error
      try {
        const fallbackUrl = `https://world.openfoodfacts.net/api/v2/search?search_terms=${encodeURIComponent(
          q,
        )}&page_size=${data.pageSize}&page=${data.page}&fields=code,product_name,product_name_fr,product_name_en,generic_name,brands,quantity,categories_tags,ingredients_text,ingredients_text_fr,ingredients_tags,ingredients_analysis_tags,additives_tags,labels_tags,allergens_tags,nutriments,nutriscore_grade,nova_group,ecoscore_grade,image_url,image_front_url,image_front_small_url,image_small_url,image_thumb_url,selected_images,images`;

        const fallbackController = new AbortController();
        const fallbackTimer = setTimeout(() => fallbackController.abort(), TIMEOUT_MS);

        const fallbackRes = await fetch(fallbackUrl, {
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "application/json",
          },
          signal: fallbackController.signal,
        }).finally(() => clearTimeout(fallbackTimer));

        if (fallbackRes.ok) {
          const json = (await fallbackRes.json()) as {
            products?: Record<string, unknown>[];
            hits?: Record<string, unknown>[];
            count?: number;
          };
          const list = Array.isArray(json.products)
            ? json.products
            : Array.isArray(json.hits)
              ? json.hits
              : null;

          if (list) {
            const result: OffServerSearchResult = {
              hits: list,
              total: typeof json.count === "number" ? json.count : list.length,
            };
            if (list.length > 0) {
              setCachedResult(cacheKey, result);
            }
            return result;
          }
        }
      } catch (fallbackErr) {
        console.warn("OFF v2 search server fetch warning:", fallbackErr);
      }
    }

    return null;
  });
