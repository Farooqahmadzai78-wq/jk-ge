import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ALL_BG_THEMES,
  ALL_WIDGET_THEMES,
  WIDGET_BORDER_THEMES,
  getBgThemeById,
  getWidgetBorderThemeById,
  getWidgetThemeById,
} from "./customization-themes";
import {
  ITEMS_PER_PREMIUM_PACK,
  computeBgVisualSignature,
  computeBorderVisualSignature,
  computeWidgetVisualSignature,
  configurePremiumThemesForTests,
  getUnlockedPremiumThemesState,
  previewNextPremiumPack,
  resetPremiumThemesForTests,
  syncDynamicBorderStylesToDom,
  unlockPremiumThemePack,
} from "./premium-themes";

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("Mission N21 — Générateur procédural local & persistance des thèmes premium", () => {
  let memStorage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    memStorage = createMemoryStorage();
    configurePremiumThemesForTests({ storage: memStorage });
  });

  afterEach(() => {
    resetPremiumThemesForTests();
  });

  it("débloque exactement 2 thèmes par pack dans la catégorie choisie (incluant les collections signatures)", () => {
    expect(ITEMS_PER_PREMIUM_PACK).toBe(2);

    const bgPreview = previewNextPremiumPack("backgrounds");
    expect(bgPreview.backgrounds.map((b) => b.name)).toEqual(["Emerald Night", "Royal Gold"]);

    const bgUnlock = unlockPremiumThemePack("backgrounds", "sess_bg_1");
    expect(bgUnlock.unlocked).toBe(true);
    expect(bgUnlock.backgrounds).toHaveLength(2);
    expect(bgUnlock.backgrounds[0].name).toBe("Emerald Night");
    expect(bgUnlock.backgrounds[1].name).toBe("Royal Gold");

    const widgetUnlock = unlockPremiumThemePack("widgets", "sess_w_1");
    expect(widgetUnlock.unlocked).toBe(true);
    expect(widgetUnlock.widgets).toHaveLength(2);
    expect(widgetUnlock.widgets[0].name).toBe("Emerald Night");
    expect(widgetUnlock.widgets[1].name).toBe("Royal Gold");

    const borderUnlock = unlockPremiumThemePack("borders", "sess_wb_1");
    expect(borderUnlock.unlocked).toBe(true);
    expect(borderUnlock.borders).toHaveLength(2);
    expect(borderUnlock.borders[0].name).toBe("Emerald Night");
    expect(borderUnlock.borders[1].name).toBe("Royal Gold");

    // Les thèmes débloqués sont immédiatement résolus par customization-themes.ts
    expect(getBgThemeById(bgUnlock.backgrounds[0].id).name).toBe("Emerald Night");
    expect(getWidgetThemeById(widgetUnlock.widgets[0].id).name).toBe("Emerald Night");
    expect(getWidgetBorderThemeById(borderUnlock.borders[0].id).name).toBe("Emerald Night");
  });

  it("génère procéduralement à la demande 35 packs consécutifs par catégorie (210 thèmes) sans aucun doublon d'ID ni de signature visuelle et sans appel externe", () => {
    const seenBgIds = new Set(ALL_BG_THEMES.map((t) => t.id));
    const seenBgSigs = new Set(ALL_BG_THEMES.map(computeBgVisualSignature));

    const seenWidgetIds = new Set(ALL_WIDGET_THEMES.map((t) => t.id));
    const seenWidgetSigs = new Set(ALL_WIDGET_THEMES.map(computeWidgetVisualSignature));

    const seenBorderIds = new Set(WIDGET_BORDER_THEMES.map((t) => t.id));
    const seenBorderSigs = new Set(WIDGET_BORDER_THEMES.map(computeBorderVisualSignature));

    for (let i = 0; i < 35; i += 1) {
      const bgRes = unlockPremiumThemePack("backgrounds", `proc_bg_${i}`);
      expect(bgRes.unlocked).toBe(true);
      expect(bgRes.backgrounds).toHaveLength(2);
      for (const item of bgRes.backgrounds) {
        const sig = computeBgVisualSignature(item);
        expect(seenBgIds.has(item.id)).toBe(false);
        expect(seenBgSigs.has(sig)).toBe(false);
        expect(item.bgImage).toContain("data:image/svg+xml");
        seenBgIds.add(item.id);
        seenBgSigs.add(sig);
      }

      const wRes = unlockPremiumThemePack("widgets", `proc_w_${i}`);
      expect(wRes.unlocked).toBe(true);
      expect(wRes.widgets).toHaveLength(2);
      for (const item of wRes.widgets) {
        const sig = computeWidgetVisualSignature(item);
        expect(seenWidgetIds.has(item.id)).toBe(false);
        expect(seenWidgetSigs.has(sig)).toBe(false);
        expect(item.gradient).toContain("data:image/svg+xml");
        seenWidgetIds.add(item.id);
        seenWidgetSigs.add(sig);
      }

      const wbRes = unlockPremiumThemePack("borders", `proc_wb_${i}`);
      expect(wbRes.unlocked).toBe(true);
      expect(wbRes.borders).toHaveLength(2);
      for (const item of wbRes.borders) {
        const sig = computeBorderVisualSignature(item);
        expect(seenBorderIds.has(item.id)).toBe(false);
        expect(seenBorderSigs.has(sig)).toBe(false);
        seenBorderIds.add(item.id);
        seenBorderSigs.add(sig);
      }
    }

    const state = getUnlockedPremiumThemesState();
    expect(state.backgrounds).toHaveLength(70);
    expect(state.widgets).toHaveLength(70);
    expect(state.borders).toHaveLength(70);
  });

  it("persiste durablement les thèmes débloqués après redémarrage de l'application et injecte le CSS des bordures", () => {
    const first = unlockPremiumThemePack("backgrounds", "persist_1");
    const second = unlockPremiumThemePack("borders", "persist_2");
    expect(first.unlocked).toBe(true);
    expect(second.unlocked).toBe(true);

    // Simule un redémarrage froid en vidant le cache mémoire tout en conservant le stockage disque
    configurePremiumThemesForTests({ storage: memStorage });

    const reloaded = getUnlockedPremiumThemesState();
    expect(reloaded.backgrounds.map((b) => b.id)).toEqual(first.backgrounds.map((b) => b.id));
    expect(reloaded.borders.map((b) => b.id)).toEqual(second.borders.map((b) => b.id));

    if (typeof document !== "undefined") {
      syncDynamicBorderStylesToDom(reloaded);
      const styleEl = document.getElementById("islamnoor-dynamic-premium-borders");
      expect(styleEl).not.toBeNull();
      expect(styleEl?.textContent).toContain(second.borders[0].id);
    }
  });

  it("protège les thèmes déjà débloqués en cas d'erreur d'écriture disque/quota et bloque les doublons de session", () => {
    const initial = unlockPremiumThemePack("widgets", "safe_session_1");
    expect(initial.unlocked).toBe(true);

    // Même sessionId -> idempotent, aucun doublon
    const duplicate = unlockPremiumThemePack("widgets", "safe_session_1");
    expect(duplicate.unlocked).toBe(false);
    expect(duplicate.alreadyGranted).toBe(true);
    expect(getUnlockedPremiumThemesState().widgets).toHaveLength(2);

    // Simule une erreur de quota disque sur l'écriture suivante
    const failingStorage = {
      getItem: (key: string) => memStorage.getItem(key),
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: (key: string) => memStorage.removeItem(key),
    };
    configurePremiumThemesForTests({ storage: failingStorage });

    const failedWrite = unlockPremiumThemePack("widgets", "safe_session_2");
    expect(failedWrite.unlocked).toBe(false);
    expect(failedWrite.error).toContain("QuotaExceededError");

    // Les 2 thèmes initiaux restent intacts sans corruption
    expect(getUnlockedPremiumThemesState().widgets.map((w) => w.id)).toEqual(
      initial.widgets.map((w) => w.id),
    );
  });
});
