import { describe, expect, it } from "vitest";
import {
  TTS_PROVIDER_MAX_CHARS,
  buildTtsProviderPayload,
  ttsSchema,
} from "./tts-validation";

const parse = (data: unknown) => ttsSchema.safeParse(data);
const str = (n: number) => "a".repeat(n);

describe("ttsSchema - text validation", () => {
  it("accepts a valid non-empty text", () => {
    const r = parse({ text: "Il est temps de se préparer pour la prière." });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.text).toBe("Il est temps de se préparer pour la prière.");
  });

  it("rejects a missing text field", () => {
    expect(parse({}).success).toBe(false);
  });

  it("rejects a non-string text (number, object, null)", () => {
    expect(parse({ text: 123 }).success).toBe(false);
    expect(parse({ text: { a: 1 } }).success).toBe(false);
    expect(parse({ text: null }).success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(parse({ text: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only string (trimmed to empty)", () => {
    expect(parse({ text: "   " }).success).toBe(false);
    expect(parse({ text: "\t\n  " }).success).toBe(false);
  });

  it("trims surrounding whitespace on accepted text", () => {
    const r = parse({ text: "  bonjour  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.text).toBe("bonjour");
  });

  it("accepts text of exactly 400 characters", () => {
    expect(parse({ text: str(400) }).success).toBe(true);
  });

  it("accepts text of exactly 5000 characters", () => {
    expect(parse({ text: str(5000) }).success).toBe(true);
  });

  it("rejects text of 5001 characters", () => {
    const r = parse({ text: str(5001) });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.code === "too_big")).toBe(true);
    }
  });
});

describe("ttsSchema - voice tolerance", () => {
  it("accepts voice 'onyx'", () => {
    const r = parse({ text: "salam", voice: "onyx" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.voice).toBe("onyx");
  });

  it("accepts voice 'alloy'", () => {
    const r = parse({ text: "salam", voice: "alloy" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.voice).toBe("alloy");
  });

  it("accepts an absent voice", () => {
    const r = parse({ text: "salam" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.voice).toBeUndefined();
  });

  it("does not reject an unknown voice at validation time", () => {
    const r = parse({ text: "salam", voice: "nova-unknown" });
    expect(r.success).toBe(true);
  });
});

describe("buildTtsProviderPayload - truncation & voice mapping", () => {
  it("keeps short text unchanged", () => {
    expect(buildTtsProviderPayload({ text: "court" })).toEqual({
      text: "court",
      voice: "alloy",
    });
  });

  it("truncates text longer than 400 chars to exactly 400", () => {
    const payload = buildTtsProviderPayload({ text: str(600) });
    expect(payload.text.length).toBe(TTS_PROVIDER_MAX_CHARS);
    expect(payload.text.length).toBe(400);
  });

  it("does not truncate text of exactly 400 chars", () => {
    const payload = buildTtsProviderPayload({ text: str(400) });
    expect(payload.text.length).toBe(400);
  });

  it("truncates a 5000-char text (schema-valid) down to 400", () => {
    const payload = buildTtsProviderPayload({ text: str(5000) });
    expect(payload.text.length).toBe(400);
  });

  it("maps 'onyx' to 'onyx'", () => {
    expect(buildTtsProviderPayload({ text: "x", voice: "onyx" }).voice).toBe("onyx");
  });

  it("maps 'alloy' to 'alloy'", () => {
    expect(buildTtsProviderPayload({ text: "x", voice: "alloy" }).voice).toBe("alloy");
  });

  it("maps an absent voice to the default 'alloy'", () => {
    expect(buildTtsProviderPayload({ text: "x" }).voice).toBe("alloy");
  });

  it("maps an unknown voice to the default 'alloy'", () => {
    expect(buildTtsProviderPayload({ text: "x", voice: "whatever" }).voice).toBe("alloy");
  });
});
