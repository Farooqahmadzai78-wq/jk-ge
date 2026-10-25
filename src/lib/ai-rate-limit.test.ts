import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RATE_LIMITS,
  checkAiRateLimit,
  checkRateLimit,
  extractClientKey,
  FIREWALL_RATE_LIMIT_IDS,
  rateLimitError,
  resetFirewallStateForTests,
  resetRateLimitsForTests,
  setFirewallRateLimitCheckForTests,
} from "./ai-rate-limit";

function headersOf(entries: Record<string, string>): Headers {
  // Vrai objet Headers : get insensible à la casse, comme l'ancien mock manuel.
  const headers = new Headers();
  for (const [k, v] of Object.entries(entries)) headers.append(k, v);
  return headers;
}

describe("extractClientKey", () => {
  const originalVercel = process.env.VERCEL;

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  });

  it("uses the Cloudflare edge IP and ignores a client-spoofed x-real-ip", () => {
    // Sur Cloudflare Workers, `x-real-ip` n'est pas posé par la plateforme :
    // s'y fier permettrait de contourner le quota en le faisant tourner.
    delete process.env.VERCEL;
    const key = extractClientKey(
      headersOf({
        "x-real-ip": "203.0.113.9",
        "x-forwarded-for": "spoofed, 198.51.100.7",
        "cf-connecting-ip": "192.0.2.1",
      }),
    );
    expect(key).toBe("192.0.2.1");
  });

  it("keeps one budget when the client rotates a spoofed x-real-ip", () => {
    delete process.env.VERCEL;
    resetRateLimitsForTests();
    const { scope, limit, windowMs } = RATE_LIMITS.tts; // 10 / min
    for (let i = 0; i < limit; i++) {
      const k = extractClientKey(
        headersOf({ "x-real-ip": `spoof-${i}`, "cf-connecting-ip": "192.0.2.1" }),
      );
      expect(checkRateLimit(scope, k, limit, windowMs, 0, 1_000 + i).allowed).toBe(true);
    }
    const again = extractClientKey(
      headersOf({ "x-real-ip": "fresh-spoof", "cf-connecting-ip": "192.0.2.1" }),
    );
    expect(checkRateLimit(scope, again, limit, windowMs, 0, 1_001).allowed).toBe(false);
  });

  it("prefers the Vercel edge IP when running on Vercel", () => {
    process.env.VERCEL = "1";
    const key = extractClientKey(
      headersOf({
        "x-real-ip": "203.0.113.9",
        "x-forwarded-for": "spoofed, 198.51.100.7",
        "cf-connecting-ip": "192.0.2.1",
      }),
    );
    expect(key).toBe("203.0.113.9");
  });

  it("prefers the Vercel-specific forwarded header when present", () => {
    process.env.VERCEL = "1";
    const key = extractClientKey(
      headersOf({ "x-vercel-forwarded-for": "203.0.113.9", "x-real-ip": "198.51.100.7" }),
    );
    expect(key).toBe("203.0.113.9");
  });

  it("falls back to the rightmost XFF entry when no platform header exists", () => {
    delete process.env.VERCEL;
    const key = extractClientKey(
      headersOf({ "x-forwarded-for": "spoofed, 203.0.113.9" }),
    );
    expect(key).toBe("203.0.113.9");
  });

  it("uses the rightmost XFF entry so rotating the left prefix keeps one budget", () => {
    delete process.env.VERCEL;
    const a = extractClientKey(headersOf({ "x-forwarded-for": "spoof-a, 203.0.113.9" }));
    const b = extractClientKey(headersOf({ "x-forwarded-for": "spoof-b, 203.0.113.9" }));
    expect(a).toBe(b);
    expect(a).toBe("203.0.113.9");
  });

  it("rotating XFF prefixes does not mint fresh per-key budgets", () => {
    delete process.env.VERCEL;
    resetRateLimitsForTests();
    const { scope, limit, windowMs } = RATE_LIMITS.tts; // 10 / min
    for (let i = 0; i < limit; i++) {
      const k = extractClientKey(headersOf({ "x-forwarded-for": `spoof-${i}, 203.0.113.9` }));
      expect(checkRateLimit(scope, k, limit, windowMs, 0, 1_000 + i).allowed).toBe(true);
    }
    const again = extractClientKey(headersOf({ "x-forwarded-for": "fresh-prefix, 203.0.113.9" }));
    expect(checkRateLimit(scope, again, limit, windowMs, 0, 1_001).allowed).toBe(false);
  });

  it("falls back to a shared bucket when no headers exist", () => {
    expect(extractClientKey(undefined)).toBe("shared");
    expect(extractClientKey(headersOf({}))).toBe("shared");
  });

  it("truncates overly long header values", () => {
    delete process.env.VERCEL;
    const key = extractClientKey(headersOf({ "x-real-ip": "a".repeat(500) }));
    expect(key.length).toBeLessThanOrEqual(256);
  });
});

describe("checkRateLimit", () => {
  it("covers every AI and proxy category with a per-client and a global ceiling", () => {
    for (const [name, cfg] of Object.entries(RATE_LIMITS)) {
      expect(cfg.limit, name).toBeGreaterThan(0);
      expect(cfg.windowMs, name).toBeGreaterThan(0);
      expect(cfg.globalLimit, `${name} must declare a per-instance global ceiling`).toBeGreaterThan(0);
      expect(cfg.globalLimit!, name).toBeGreaterThanOrEqual(cfg.limit);
    }
    // The server-side mawaqit proxies are rate limited like the AI functions.
    expect(RATE_LIMITS.mawaqitSearch).toBeDefined();
    expect(RATE_LIMITS.mawaqitDetails).toBeDefined();
  });

  it("blocks a proxy category once its per-client limit is reached", async () => {
    resetRateLimitsForTests();
    const { scope, limit, windowMs } = RATE_LIMITS.mawaqitSearch;
    for (let i = 0; i < limit; i++) {
      const d = await checkAiRateLimit("mawaqitSearch", { key: "client-a", now: 5_000 + i });
      expect(d.allowed).toBe(true);
    }
    const denied = await checkAiRateLimit("mawaqitSearch", { key: "client-a", now: 5_000 + limit });
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSec).toBeGreaterThan(0);
  });

  it("allows up to the per-key limit then rejects with a retry delay", () => {
    resetRateLimitsForTests();
    const { scope, limit, windowMs } = RATE_LIMITS.tts; // 10 / min
    for (let i = 0; i < limit; i++) {
      const d = checkRateLimit(scope, "client-a", limit, windowMs, 0, 1_000 + i);
      expect(d.allowed).toBe(true);
      expect(d.retryAfterSec).toBe(0);
    }
    const rejected = checkRateLimit(scope, "client-a", limit, windowMs, 0, 1_001);
    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfterSec).toBeGreaterThan(0);
    // A different key keeps its own budget.
    expect(checkRateLimit(scope, "client-b", limit, windowMs, 0, 1_001).allowed).toBe(true);
  });

  it("re-opens the window once old hits expire", () => {
    resetRateLimitsForTests();
    const { scope, limit, windowMs } = RATE_LIMITS.ingredientAnalyze;
    for (let i = 0; i < limit; i++) {
      checkRateLimit(scope, "k", limit, windowMs, 0, 0);
    }
    expect(checkRateLimit(scope, "k", limit, windowMs, 0, 1).allowed).toBe(false);
    expect(checkRateLimit(scope, "k", limit, windowMs, 0, windowMs + 2).allowed).toBe(true);
  });

  it("enforces a global per-scope ceiling even across spoofed keys", () => {
    resetRateLimitsForTests();
    const { scope, windowMs } = RATE_LIMITS.translate;
    const perKey = 10_000;
    for (let i = 0; i < RATE_LIMITS.translate.globalLimit!; i++) {
      const d = checkRateLimit(scope, `key-${i}`, perKey, windowMs, RATE_LIMITS.translate.globalLimit!, 5_000);
      expect(d.allowed).toBe(true);
    }
    const over = checkRateLimit(scope, "one-more", perKey, windowMs, RATE_LIMITS.translate.globalLimit!, 5_000);
    expect(over.allowed).toBe(false);
  });

  it("produces a client-safe error message with the wait time", () => {
    const err = rateLimitError("tts", 42);
    expect(err.message).toContain("42s");
    expect(err.message).not.toContain("key");
  });
});

describe("checkAiRateLimit — Vercel Firewall integration", () => {
  const originalVercel = process.env.VERCEL;

  afterEach(() => {
    resetFirewallStateForTests();
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  });

  it("maps the five AI categories to one shared Firewall rule ID", () => {
    const ruleIds = Object.values(FIREWALL_RATE_LIMIT_IDS);
    expect(ruleIds).toHaveLength(5);
    // One rule for analyze/start/translate/tts, one distinct rule for the
    // status endpoint (its quota stays local-only).
    expect(new Set(ruleIds).size).toBe(2);
    const shared = new Set(["ingredientAnalyze", "ingredientStart", "translate", "tts"]);
    for (const name of Object.keys(FIREWALL_RATE_LIMIT_IDS).sort()) {
      const id = FIREWALL_RATE_LIMIT_IDS[name as keyof typeof FIREWALL_RATE_LIMIT_IDS];
      expect(typeof id).toBe("string");
      expect(id).toMatch(/^[a-z0-9-]+$/);
      if (shared.has(name)) {
        expect(id).toBe(FIREWALL_RATE_LIMIT_IDS.ingredientAnalyze);
      } else {
        expect(id).toBe(FIREWALL_RATE_LIMIT_IDS.ingredientStatus);
      }
    }
  });

  it("stays on the local in-memory limiter when not running on Vercel", async () => {
    delete process.env.VERCEL;
    resetRateLimitsForTests();
    let firewallCalls = 0;
    setFirewallRateLimitCheckForTests(async () => {
      firewallCalls += 1;
      return { rateLimited: false };
    });

    const { limit } = RATE_LIMITS.tts;
    for (let i = 0; i < limit; i++) {
      const d = await checkAiRateLimit("tts", { key: "dev-client", now: 2_000 + i });
      expect(d.allowed).toBe(true);
    }
    const denied = await checkAiRateLimit("tts", {
      key: "dev-client",
      now: 2_000 + limit,
    });
    expect(denied.allowed).toBe(false);
    expect(firewallCalls).toBe(0); // local development never consults the SDK
  });

  it("consults the Firewall with the category rule ID and honours a deny", async () => {
    process.env.VERCEL = "1";
    resetRateLimitsForTests();
    const seen: {
      ruleId?: string;
      rateLimitKey?: string;
      request?: Request;
      timeout?: number;
    } = {};
    setFirewallRateLimitCheckForTests(async (ruleId, options) => {
      seen.ruleId = ruleId;
      seen.rateLimitKey = options.rateLimitKey;
      seen.request = options.request;
      seen.timeout = options.timeout;
      return { rateLimited: true };
    });

    const request = new Request("https://example.test/api");
    const d = await checkAiRateLimit("tts", { key: "203.0.113.9", request });
    expect(d.allowed).toBe(false);
    expect(d.retryAfterSec).toBeGreaterThan(0);
    expect(seen.ruleId).toBe(FIREWALL_RATE_LIMIT_IDS.tts);
    expect(seen.rateLimitKey).toBe("203.0.113.9");
    expect(seen.request).toBe(request);
    expect(seen.timeout).toBeGreaterThan(0);
  });

  it("keeps local enforcement and logs loudly when the rule is not configured", async () => {
    process.env.VERCEL = "1";
    resetRateLimitsForTests();
    const logs: string[] = [];
    const spy = vi
      .spyOn(console, "error")
      .mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
      });
    setFirewallRateLimitCheckForTests(async () => ({
      rateLimited: false,
      error: "not-found",
    }));
    try {
      const { limit } = RATE_LIMITS.tts;
      for (let i = 0; i < limit; i++) {
        const d = await checkAiRateLimit("tts", { key: "k", now: 10_000 + i });
        expect(d.allowed).toBe(true);
      }
      const denied = await checkAiRateLimit("tts", {
        key: "k",
        now: 10_000 + limit,
      });
      expect(denied.allowed).toBe(false); // local quota still enforced...
      expect(logs.length).toBeGreaterThan(0); // ...and loudly reported
      expect(logs[0]).toContain(FIREWALL_RATE_LIMIT_IDS.tts);
    } finally {
      spy.mockRestore();
    }
  });

  it("degrades loudly but does not block traffic when the Firewall check fails", async () => {
    process.env.VERCEL = "1";
    resetRateLimitsForTests();
    const logs: string[] = [];
    const spy = vi
      .spyOn(console, "error")
      .mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
      });
    setFirewallRateLimitCheckForTests(async () => {
      throw new Error("network down");
    });
    try {
      const allowed = await checkAiRateLimit("translate", { key: "k2" });
      expect(allowed.allowed).toBe(true); // local decision still returned
      expect(logs.length).toBeGreaterThan(0); // degradation is not silent
    } finally {
      spy.mockRestore();
    }
  });
});

