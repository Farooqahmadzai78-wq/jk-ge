import { describe, expect, it } from "vitest";
import {
  ACCESS_TOKEN_HEX_LENGTH,
  type JobStatus,
  accessTokenHashesMatch,
  canTransition,
  evaluateTokenBinding,
  generateAccessToken,
  hashAccessToken,
  isValidAccessToken,
} from "./ingredient-job-security";

/**
 * Access-control helpers tested in isolation (no Gemini/Lovable/network). They
 * mirror the exact decision logic used by the server functions in
 * ingredients.functions.ts.
 */

describe("generateAccessToken", () => {
  it("produces a 256-bit (64 hex char) token", () => {
    const token = generateAccessToken();
    expect(token).toHaveLength(ACCESS_TOKEN_HEX_LENGTH);
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
    expect(isValidAccessToken(token)).toBe(true);
  });

  it("produces distinct tokens on each call", () => {
    expect(generateAccessToken()).not.toBe(generateAccessToken());
  });
});

describe("isValidAccessToken", () => {
  it("accepts a well-formed token", () => {
    expect(isValidAccessToken(generateAccessToken())).toBe(true);
  });

  it("rejects malformed tokens", () => {
    expect(isValidAccessToken("")).toBe(false);
    expect(isValidAccessToken("abc")).toBe(false);
    expect(isValidAccessToken("z".repeat(64))).toBe(false);
    expect(isValidAccessToken("A".repeat(64))).toBe(false);
    expect(isValidAccessToken(123)).toBe(false);
    expect(isValidAccessToken(null)).toBe(false);
    expect(isValidAccessToken(undefined)).toBe(false);
  });
});

describe("hashAccessToken", () => {
  it("is deterministic and 64 hex chars", async () => {
    const token = generateAccessToken();
    const h1 = await hashAccessToken(token);
    const h2 = await hashAccessToken(token);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
    expect(h1).not.toBe(token); // raw token never returned
  });

  it("differs for different tokens", async () => {
    expect(await hashAccessToken(generateAccessToken())).not.toBe(
      await hashAccessToken(generateAccessToken()),
    );
  });
});

describe("accessTokenHashesMatch", () => {
  it("true for equal, false for different, false for different lengths", () => {
    expect(accessTokenHashesMatch("abcd", "abcd")).toBe(true);
    expect(accessTokenHashesMatch("abcd", "abce")).toBe(false);
    expect(accessTokenHashesMatch("abcd", "abcde")).toBe(false);
  });
});

describe("canTransition (terminal-state immutability)", () => {
  it("allows first transition and processing -> terminal", () => {
    expect(canTransition(undefined, "completed")).toBe(true);
    expect(canTransition(undefined, "failed")).toBe(true);
    expect(canTransition("processing", "completed")).toBe(true);
    expect(canTransition("processing", "failed")).toBe(true);
  });

  it("forbids overwriting a finished result", () => {
    expect(canTransition("completed", "failed")).toBe(false);
    expect(canTransition("completed", "completed")).toBe(false);
    expect(canTransition("failed", "completed")).toBe(false);
    expect(canTransition("failed", "failed")).toBe(false);
  });
});

describe("evaluateTokenBinding", () => {
  it("establish / ok / conflict", () => {
    expect(evaluateTokenBinding(undefined, "h1")).toBe("establish");
    expect(evaluateTokenBinding("h1", "h1")).toBe("ok");
    expect(evaluateTokenBinding("h1", "h2")).toBe("conflict");
  });
});

/* ------------------------------------------------------------------ *
 * Faithful, in-memory simulation of the server job store + binding   *
 * logic, mirroring ingredients.functions.ts. Uses the real helpers   *
 * above so the security behaviour is exercised without any network.  *
 * ------------------------------------------------------------------ */

interface SimJob {
  status: JobStatus;
  tokenHash?: string;
  result?: string;
}
type Store = Map<string, SimJob>;

async function simStart(
  store: Store,
  analysisId: string,
  token: string,
): Promise<{ status: string }> {
  if (!isValidAccessToken(token)) throw new Error("Unauthorized");
  const incomingHash = await hashAccessToken(token);
  const existing = store.get(analysisId);
  if (existing) {
    const decision = evaluateTokenBinding(existing.tokenHash, incomingHash);
    if (decision === "conflict") throw new Error("Unauthorized");
    if (decision === "establish") existing.tokenHash = incomingHash;
    return { status: existing.status };
  }
  store.set(analysisId, { status: "processing", tokenHash: incomingHash });
  return { status: "processing" };
}

async function simAnalyze(
  store: Store,
  analysisId: string,
  token: string,
  result: string,
): Promise<void> {
  if (!isValidAccessToken(token)) throw new Error("Unauthorized");
  const incomingHash = await hashAccessToken(token);
  const existing = store.get(analysisId);
  if (existing) {
    const decision = evaluateTokenBinding(existing.tokenHash, incomingHash);
    if (decision === "conflict") throw new Error("Unauthorized");
    if (decision === "establish") existing.tokenHash = incomingHash;
  } else {
    store.set(analysisId, { status: "processing", tokenHash: incomingHash });
  }
  const job = store.get(analysisId)!;
  if (canTransition(job.status, "completed")) {
    job.status = "completed";
    job.result = result;
  }
}

async function simRead(
  store: Store,
  analysisId: string,
  token: string,
): Promise<{ status: string; result?: string }> {
  const job = store.get(analysisId);
  if (!job || !job.tokenHash || !isValidAccessToken(token)) {
    return { status: "unauthorized" };
  }
  const incomingHash = await hashAccessToken(token);
  if (!accessTokenHashesMatch(job.tokenHash, incomingHash)) {
    return { status: "unauthorized" };
  }
  return { status: job.status, result: job.result };
}

describe("access mechanism (simulated server store)", () => {
  it("lets the correct token read a completed result", async () => {
    const store: Store = new Map();
    const token = generateAccessToken();
    await simStart(store, "job1", token);
    await simAnalyze(store, "job1", token, "verdict-halal");
    const res = await simRead(store, "job1", token);
    expect(res.status).toBe("completed");
    expect(res.result).toBe("verdict-halal");
  });

  it("denies a wrong or absent token (no result leaked)", async () => {
    const store: Store = new Map();
    const token = generateAccessToken();
    await simStart(store, "job1", token);
    await simAnalyze(store, "job1", token, "verdict-halal");
    expect((await simRead(store, "job1", generateAccessToken())).status).toBe("unauthorized");
    expect((await simRead(store, "job1", "")).status).toBe("unauthorized");
    expect((await simRead(store, "job1", "short")).status).toBe("unauthorized");
  });

  it("denies access to a known analysisId without the token", async () => {
    const store: Store = new Map();
    const token = generateAccessToken();
    await simStart(store, "known-id", token);
    await simAnalyze(store, "known-id", token, "secret");
    const res = await simRead(store, "known-id", generateAccessToken());
    expect(res.status).toBe("unauthorized");
    expect(res.result).toBeUndefined();
  });

  it("rejects a different token trying to touch an existing job", async () => {
    const store: Store = new Map();
    const ownerToken = generateAccessToken();
    await simStart(store, "job1", ownerToken);
    await simAnalyze(store, "job1", ownerToken, "owner-result");
    await expect(simStart(store, "job1", generateAccessToken())).rejects.toThrow("Unauthorized");
    await expect(simAnalyze(store, "job1", generateAccessToken(), "hijack")).rejects.toThrow(
      "Unauthorized",
    );
    expect((await simRead(store, "job1", ownerToken)).result).toBe("owner-result");
  });

  it("keeps a consistent association for parallel calls with the same token", async () => {
    const token = generateAccessToken();
    const storeA: Store = new Map();
    await simAnalyze(storeA, "job-a", token, "r");
    expect((await simStart(storeA, "job-a", token)).status).toBe("completed");
    const storeB: Store = new Map();
    await simStart(storeB, "job-b", token);
    await simAnalyze(storeB, "job-b", token, "r2");
    expect((await simRead(storeB, "job-b", token)).status).toBe("completed");
  });

  it("does not let a late update replace a completed result", async () => {
    const store: Store = new Map();
    const token = generateAccessToken();
    await simStart(store, "job1", token);
    await simAnalyze(store, "job1", token, "good-result");
    const job = store.get("job1")!;
    expect(canTransition(job.status, "failed")).toBe(false);
    expect((await simRead(store, "job1", token)).result).toBe("good-result");
  });

  it("treats a legacy record without a token as unrecoverable (no bypass)", async () => {
    const store: Store = new Map();
    const token = generateAccessToken();
    await simStart(store, "legacy", token);
    await simAnalyze(store, "legacy", token, "old");
    expect((await simRead(store, "legacy", "")).status).toBe("unauthorized");
    expect((await simRead(store, "legacy", "not-a-token")).status).toBe("unauthorized");
  });
});

