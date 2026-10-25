import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { checkAiRateLimit, extractClientKey, rateLimitError } from "./ai-rate-limit";
import { mawaqitSearchSchema, mawaqitSlugSchema } from "./mawaqit-validation";

export interface MawaqitMosqueSearchItem {
  uuid?: string;
  slug?: string;
  name: string;
  type?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  countryCode?: string;
  country?: string;
}

export interface MawaqitMosqueDetails {
  uuid?: string;
  slug: string;
  name: string;
  label?: string;
  address?: string;
  phone?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  jumua?: string;
  jumua2?: string;
  jumua3?: string;
  times: string[]; // [Fajr, Dhuhr, Asr, Maghrib, Isha]
  shuruq?: string;
  calendar?: Record<string, string[]>[]; // 12 months array
  iqamaCalendar?: Record<string, string[]>[]; // 12 months array
  hijriAdjustment?: number;
}

// In-memory server cache to ensure lightning speed
const mosqueDetailsCache = new Map<string, { timestamp: number; data: MawaqitMosqueDetails }>();

/**
 * Plafond d'entrées conservées en cache sur une instance. Au-delà, l'entrée
 * la plus ancienne est retirée : sans ce plafond, un appelant pouvait faire
 * croître le cache sans borne en variant le slug.
 */
const MAX_CACHED_MOSQUES = 200;

/** Taille maximale de la page HTML distante lue en mémoire. */
const MAX_HTML_LENGTH = 1_500_000;

/** Délai maximal d'attente de la réponse de mawaqit.net. */
const UPSTREAM_TIMEOUT_MS = 8_000;

function cacheMosqueDetails(slug: string, data: MawaqitMosqueDetails): void {
  while (mosqueDetailsCache.size >= MAX_CACHED_MOSQUES) {
    const oldest = mosqueDetailsCache.keys().next().value;
    if (oldest === undefined) return;
    mosqueDetailsCache.delete(oldest);
  }
  mosqueDetailsCache.set(slug, { timestamp: Date.now(), data });
}

/**
 * Lit le corps de la réponse distante en bornant la taille mise en mémoire :
 * une réponse anormalement volumineuse est ignorée au lieu d'être bufferisée.
 */
async function readBoundedHtml(res: Response): Promise<string | null> {
  const lengthHeader = res.headers.get("content-length");
  if (lengthHeader) {
    const declared = Number(lengthHeader);
    if (Number.isFinite(declared) && declared > MAX_HTML_LENGTH) return null;
  }
  const html = await res.text();
  return html.length > MAX_HTML_LENGTH ? null : html;
}

function upstreamSignal(): AbortSignal {
  return AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
}

/**
 * Server function: Search for mosques on Mawaqit by keyword or city name.
 */
export const searchMawaqitMosquesServer = createServerFn({ method: "GET" })
  .validator((d: unknown) => mawaqitSearchSchema.parse(d))
  .handler(async ({ data }): Promise<MawaqitMosqueSearchItem[]> => {
    const request = getRequest();
    const decision = await checkAiRateLimit("mawaqitSearch", {
      request,
      key: extractClientKey(request?.headers),
    });
    if (!decision.allowed) throw rateLimitError("mawaqitSearch", decision.retryAfterSec);

    const q = (data.query || "").trim();
    if (!q || q.length < 2) return [];

    try {
      const url = `https://mawaqit.net/api/2.0/mosque/search?word=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "IslamNoorApp/1.0 (https://islam-noor.app)",
          Accept: "application/json",
        },
        signal: upstreamSignal(),
      });

      if (!res.ok) return [];
      const list = (await res.json()) as MawaqitMosqueSearchItem[];
      if (!Array.isArray(list)) return [];

      return list.map((item) => ({
        uuid: item.uuid,
        slug: item.slug,
        name: item.name,
        type: item.type,
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        address: item.address,
        city: item.city,
        countryCode: item.countryCode,
      }));
    } catch (e) {
      console.warn("Failed to search Mawaqit mosques on server:", e);
      return [];
    }
  });

/**
 * Server function: Fetch official prayer times & calendar for a specific Mawaqit mosque slug.
 */
export const getMawaqitMosqueDetailsServer = createServerFn({ method: "GET" })
  .validator((d: unknown) => mawaqitSlugSchema.parse(d))
  .handler(async ({ data }): Promise<MawaqitMosqueDetails | null> => {
    const request = getRequest();
    const decision = await checkAiRateLimit("mawaqitDetails", {
      request,
      key: extractClientKey(request?.headers),
    });
    if (!decision.allowed) throw rateLimitError("mawaqitDetails", decision.retryAfterSec);

    const slug = (data.slug || "").trim();
    if (!slug) return null;

    // Check memory cache (valid for 1 hour)
    const cached = mosqueDetailsCache.get(slug);
    if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) {
      return cached.data;
    }

    try {
      const url = `https://mawaqit.net/fr/${encodeURIComponent(slug)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: upstreamSignal(),
      });

      if (!res.ok) {
        // Try fallback to english path if french 404
        const resEn = await fetch(`https://mawaqit.net/en/${encodeURIComponent(slug)}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/html",
          },
          signal: upstreamSignal(),
        });
        if (!resEn.ok) return null;
        const htmlEn = await readBoundedHtml(resEn);
        if (!htmlEn) return null;
        const parsed = parseMawaqitHtml(htmlEn, slug);
        if (parsed) {
          cacheMosqueDetails(slug, parsed);
          return parsed;
        }
        return null;
      }

      const html = await readBoundedHtml(res);
      if (!html) return null;
      const parsed = parseMawaqitHtml(html, slug);
      if (parsed) {
        cacheMosqueDetails(slug, parsed);
        return parsed;
      }
      return null;
    } catch (e) {
      console.warn(`Failed to fetch Mawaqit details for slug ${slug}:`, e);
      return null;
    }
  });

function parseMawaqitHtml(html: string, slug: string): MawaqitMosqueDetails | null {
  const match =
    html.match(/var\s+confData\s*=\s*(\{.*?\});/s) || html.match(/confData\s*=\s*(\{.*?\});/s);
  if (!match) return null;

  try {
    const raw = JSON.parse(match[1]);
    const name = raw.name || raw.label || "Mosquée";
    const times = Array.isArray(raw.times) ? raw.times.map(String) : [];
    const latitude = Number(raw.latitude) || 0;
    const longitude = Number(raw.longitude) || 0;
    const timezone = raw.timezone || "Europe/Paris";

    return {
      uuid: raw.uuid,
      slug: raw.slug || slug,
      name,
      label: raw.label,
      address: raw.address,
      phone: raw.phone,
      latitude,
      longitude,
      timezone,
      jumua: raw.jumua,
      jumua2: raw.jumua2,
      jumua3: raw.jumua3,
      times,
      shuruq: raw.shuruq,
      calendar: Array.isArray(raw.calendar) ? raw.calendar : undefined,
      iqamaCalendar: Array.isArray(raw.iqamaCalendar) ? raw.iqamaCalendar : undefined,
      hijriAdjustment: typeof raw.hijriAdjustment === "number" ? raw.hijriAdjustment : 0,
    };
  } catch (err) {
    console.error("Error parsing confData JSON from Mawaqit:", err);
    return null;
  }
}
