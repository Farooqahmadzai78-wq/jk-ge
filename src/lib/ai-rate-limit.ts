/**
 * Host-agnostic, in-memory sliding-window rate limiter for the server
 * functions (AI providers + server-side HTTP proxies).
 *
 * ⚠️ LIMITATION ASSUMÉE : ce compteur vit EN MÉMOIRE, dans l'instance qui
 * l'exécute. Il n'est pas partagé entre les instances / replicas Cloudflare et
 * repart à zéro à chaque redémarrage ou redéploiement. La couche distribuée
 * évoquée historiquement (SDK @vercel/firewall) n'est PAS câblée dans ce
 * projet : `firewallCheck` reste `null` en production (seul
 * `setFirewallRateLimitCheckForTests` l'active, depuis les tests unitaires).
 * En production, la protection repose donc uniquement sur ce compteur local,
 * qu'un attaquant distribué peut contourner en reaching plusieurs instances.
 * Un vrai plafond distribué exige un service externe (Cloudflare Rate
 * Limiting / WAF / Durable Objects) non disponible ici.
 */

export type RateLimitDecision = { allowed: boolean; retryAfterSec: number; reason?: string };

/**
 * `globalLimit` (optionnel) : plafond global de la catégorie, compté sur une
 * fenêtre glissante partagée par TOUTES les clés clients (en plus du plafond
 * par client `limit`).
 *
 * ⚠️ Compteur EN MÉMOIRE, par instance de serveur : il borne donc l'impact
 * d'un abus sur UNE instance, pas le trafic total du service.
 */
export type RateLimitCategory = {
  scope: string;
  limit: number;
  windowMs: number;
  globalLimit?: number;
};

/**
 * Plafonds par catégorie. `limit` = par client (fenêtre glissante),
 * `globalLimit` = toutes clients confondus sur la même instance.
 */
export const RATE_LIMITS: Record<string, RateLimitCategory> = {
  ingredientAnalyze: {
    scope: "ai-ingredient-analyze",
    limit: 10,
    windowMs: 60_000,
    globalLimit: 60,
  },
  ingredientStart: {
    scope: "ai-ingredient-start",
    limit: 10,
    windowMs: 60_000,
    globalLimit: 60,
  },
  tts: { scope: "ai-tts", limit: 10, windowMs: 60_000, globalLimit: 60 },
  translate: { scope: "ai-translate", limit: 10, windowMs: 60_000, globalLimit: 100 },
  ingredientStatus: {
    scope: "ai-ingredient-status",
    limit: 30,
    windowMs: 60_000,
    globalLimit: 300,
  },
  mawaqitSearch: {
    scope: "proxy-mawaqit-search",
    limit: 20,
    windowMs: 60_000,
    globalLimit: 120,
  },
  mawaqitDetails: {
    scope: "proxy-mawaqit-details",
    limit: 20,
    windowMs: 60_000,
    globalLimit: 120,
  },
};

/**
 * Identifiants de règles Vercel Firewall, par catégorie IA.
 *
 * ⚠️ Cette table n'est utilisée que si la vérification Firewall est ACTIVE
 * (elle ne l'est pas en production : `firewallCheck` reste `null`). Les
 * catégories de proxy serveur (`mawaqitSearch` / `mawaqitDetails`) n'en ont pas
 * et retombent sur l'identifiant généré `ai-<category>`.
 */
export const FIREWALL_RATE_LIMIT_IDS = {
  ingredientAnalyze: "islamnoor-ai-shared",
  ingredientStart: "islamnoor-ai-shared",
  tts: "islamnoor-ai-shared",
  translate: "islamnoor-ai-shared",
  ingredientStatus: "islamnoor-ingredient-status",
};

type HeaderSource = Headers | Record<string, string>;

function isHeadersInstance(source: HeaderSource): source is Headers {
  return typeof (source as Headers).get === "function";
}

/**
 * Extrait une clé de client stable pour le rate limiting.
 *
 * Ordre de confiance : on retient le premier en-tête présent ET posé par la
 * plateforme (donc non falsifiable par le client) :
 * - Cloudflare Workers : `cf-connecting-ip` (posé par le edge Cloudflare) ;
 * - Vercel : `x-vercel-forwarded-for` puis `x-real-ip` (posés par Vercel) ;
 * - sinon la dernière entrée de `x-forwarded-for` : l'edge y ajoute l'IP réelle
 *   du client, donc les préfixes envoyés par le client sont ignorés ;
 * - `x-real-ip` en tout dernier recours.
 *
 * ⚠️ Sur Cloudflare, `x-real-ip` n'est PAS posé par la plateforme : un client
 * peut l'envoyer lui-même. Le placer en tête de liste permettrait de contourner
 * le quota en le faisant tourner d'une requête à l'autre ; il n'est donc lu
 * qu'en dernier recours, après les en-têtes de plateforme.
 */
export function extractClientKey(headers: HeaderSource | undefined): string {
  if (!headers) return "shared";
  const get = (name: string): string | null => {
    if (isHeadersInstance(headers)) return headers.get(name);
    return headers[name] ?? null;
  };
  const normalize = (value: string | null): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 256) : null;
  };
  const lastHop = (value: string | null): string | null => {
    if (!value) return null;
    const parts = value
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : null;
  };

  const cfConnectingIp = normalize(get("cf-connecting-ip"));
  const vercelForwardedFor = normalize(lastHop(get("x-vercel-forwarded-for")));
  const realIp = normalize(get("x-real-ip"));
  const forwardedForLastHop = normalize(lastHop(get("x-forwarded-for")));

  const onVercel = process.env.VERCEL === "1";
  const key = onVercel
    ? (vercelForwardedFor ?? realIp ?? cfConnectingIp ?? forwardedForLastHop)
    : (cfConnectingIp ?? forwardedForLastHop ?? realIp);

  return key ?? "shared";
}

const buckets = new Map<string, { hits: number[] }>();

export function resetRateLimitsForTests(): void {
  buckets.clear();
}

/** Efface uniquement les compteurs globaux partagés (`${scope}|__global__`). */
export function resetGlobalRateLimitsForTests(): void {
  for (const bucketKey of Array.from(buckets.keys())) {
    if (bucketKey.endsWith("|__global__")) buckets.delete(bucketKey);
  }
}

export function checkRateLimit(
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
  nowOrGlobalLimit: number,
  maybeNow?: number,
): RateLimitDecision {
  const now = maybeNow !== undefined ? maybeNow : nowOrGlobalLimit;
  const globalLimit = maybeNow !== undefined ? nowOrGlobalLimit : undefined;
  const cutoff = now - windowMs;

  const bucketKey = `${scope}|${key}`;
  let bucket = buckets.get(bucketKey);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(bucketKey, bucket);
  }
  bucket.hits = bucket.hits.filter((h) => h > cutoff);
  if (bucket.hits.length >= limit) {
    const oldest = Math.min(...bucket.hits);
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, retryAfterSec, reason: "rate-limited" };
  }

  if (globalLimit !== undefined && globalLimit > 0) {
    const globalBucketKey = `${scope}|__global__`;
    let globalBucket = buckets.get(globalBucketKey);
    if (!globalBucket) {
      globalBucket = { hits: [] };
      buckets.set(globalBucketKey, globalBucket);
    }
    globalBucket.hits = globalBucket.hits.filter((h) => h > cutoff);
    if (globalBucket.hits.length >= globalLimit) {
      const oldest = Math.min(...globalBucket.hits);
      const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      return { allowed: false, retryAfterSec, reason: "global-rate-limited" };
    }
    globalBucket.hits.push(now);
  }

  bucket.hits.push(now);
  return { allowed: true, retryAfterSec: 0 };
}

type FirewallCheck = (
  ruleId: string,
  options: { rateLimitKey: string; request?: Request; timeout?: number },
) => Promise<{ rateLimited: boolean; error?: string }>;

let firewallCheck: FirewallCheck | null = null;

export function setFirewallRateLimitCheckForTests(fn: FirewallCheck): void {
  firewallCheck = fn;
}

export function resetFirewallStateForTests(): void {
  firewallCheck = null;
}

export function rateLimitError(category: string, retryAfterSec: number): Error {
  return new Error(`Rate limit exceeded for ${category}. Try again in ${retryAfterSec}s.`);
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function checkAiRateLimit(
  category: string,
  options: { key: string; request?: Request; now?: number },
): Promise<RateLimitDecision> {
  const { key, request, now = Date.now() } = options;
  const cfg = RATE_LIMITS[category];
  if (!cfg) return { allowed: true, retryAfterSec: 0 };

  // Plafond global (si configuré) : même fenêtre glissante, compteur partagé
  // par catégorie — voir la remarque EN MÉMOIRE / par instance sur RateLimitCategory.
  // Sans globalLimit, l'appel 5-paramètres garde le comportement par client inchangé.
  const local =
    cfg.globalLimit !== undefined && cfg.globalLimit > 0
      ? checkRateLimit(cfg.scope, key, cfg.limit, cfg.windowMs, cfg.globalLimit, now)
      : checkRateLimit(cfg.scope, key, cfg.limit, cfg.windowMs, now);
  if (!local.allowed) return local;

  if (process.env.VERCEL === "1" && firewallCheck) {
    const ruleId =
      FIREWALL_RATE_LIMIT_IDS[category as keyof typeof FIREWALL_RATE_LIMIT_IDS] ??
      `ai-${category}`;
    try {
      const result = await firewallCheck(ruleId, {
        rateLimitKey: key,
        request,
        timeout: 5000,
      });
      if (result.error) {
        console.error(`Firewall rule ${ruleId} not configured: ${result.error}`);
        return local;
      }
      if (result.rateLimited) {
        return { allowed: false, retryAfterSec: 60, reason: "firewall" };
      }
    } catch (err) {
      console.error(`Firewall check failed for ${ruleId}:`, err);
      return local;
    }
  }

  return { allowed: true, retryAfterSec: 0 };
}