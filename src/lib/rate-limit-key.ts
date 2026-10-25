import { extractClientKey } from "./ai-rate-limit";

/**
 * Stable, environment-safe `rateLimitKey` for the shared Vercel Firewall
 * rule. `isRunningOnVercel()` never changes a caller-supplied identifier:
 * the key is always built from the request including the Vercel edge IP,
 * so one pooled rule keeps one budget per identified client-plus-category.
 *
 * The status endpoint uses the same derivation (derived from the request)
 * instead of trusting a client-supplied identifier.
 */
export function buildSharedRuleKey(name: string, request: Request): string {
  const headers = request.headers;
  const category = name.toLowerCase();
  const ip = extractClientKey(headers);
  return `${category}|${ip}`;
}

