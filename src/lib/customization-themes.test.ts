import { describe, it, expect } from "vitest";
import {
  SOLID_WIDGET_THEMES,
  GRADIENT_WIDGET_THEMES,
  ANIMATED_WIDGET_THEMES,
  ALL_WIDGET_THEMES,
  SOLID_BG_THEMES,
  GRADIENT_BG_THEMES,
  RGB_BG_THEMES,
  PREMIUM_BG_THEMES,
  ALL_BG_THEMES,
  SOLID_BORDER_THEMES,
  ANIMATED_BORDER_THEMES,
  TOUCH_BORDER_THEMES,
  WIDGET_BORDER_THEMES,
  getWidgetThemeById,
  getBgThemeById,
  getWidgetBorderThemeById,
} from "./customization-themes";

describe("Customization Themes Enhancement & Zero Duplication", () => {
  describe("Widget Themes", () => {
    it("has unique IDs across all widget themes", () => {
      const ids = ALL_WIDGET_THEMES.map((w) => w.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("has 5 new solid widget themes", () => {
      const newSolidIds = [
        "w-solid-ambre-imperiale",
        "w-solid-turquoise-persane",
        "w-solid-indigo-nuit",
        "w-solid-menthe-glacee",
        "w-solid-bordeaux-grenat",
      ];
      for (const id of newSolidIds) {
        const theme = SOLID_WIDGET_THEMES.find((w) => w.id === id);
        expect(theme, `Expected ${id} to exist in SOLID_WIDGET_THEMES`).toBeDefined();
        expect(theme?.category).toBe("solid");
        expect(theme?.from).toBeTruthy();
      }
    });

    it("has 5 new gradient widget themes", () => {
      const newGradIds = [
        "w-grad-palais-andalou",
        "w-grad-aurore-boreale-cyan",
        "w-grad-amethyst-rose",
        "w-grad-or-safir",
        "w-grad-cuivre-flamboyant",
      ];
      for (const id of newGradIds) {
        const theme = GRADIENT_WIDGET_THEMES.find((w) => w.id === id);
        expect(theme, `Expected ${id} to exist in GRADIENT_WIDGET_THEMES`).toBeDefined();
        expect(theme?.category).toBe("gradient");
        expect(theme?.gradient).toBeTruthy();
      }
    });

    it("has 5 new animated widget themes with valid animClasses", () => {
      const newAnimIds = [
        "w-anim-soleil-levant-dore",
        "w-anim-abysse-saphir",
        "w-anim-rubis-passion",
        "w-anim-foret-celeste",
        "w-anim-prisme-lumina",
      ];
      for (const id of newAnimIds) {
        const theme = ANIMATED_WIDGET_THEMES.find((w) => w.id === id);
        expect(theme, `Expected ${id} to exist in ANIMATED_WIDGET_THEMES`).toBeDefined();
        expect(theme?.animated).toBe(true);
        expect(theme?.animClass).toBeTruthy();
      }
    });
  });

  describe("Background Themes", () => {
    it("has unique IDs across all background themes", () => {
      const ids = ALL_BG_THEMES.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("has 5 new solid background themes", () => {
      const newSolidIds = [
        "bg-solid-creme-oriental",
        "bg-solid-sarcelle-islamique",
        "bg-solid-anthracite-luxe",
        "bg-solid-lavande-brume",
        "bg-solid-moka-imperial",
      ];
      for (const id of newSolidIds) {
        const theme = SOLID_BG_THEMES.find((b) => b.id === id);
        expect(theme, `Expected ${id} to exist in SOLID_BG_THEMES`).toBeDefined();
        expect(theme?.category).toBe("solid");
        expect(theme?.bgColor).toBeTruthy();
      }
    });

    it("has 5 new gradient background themes", () => {
      const newGradIds = [
        "bg-grad-aurore-doree",
        "bg-grad-nuit-diamant",
        "bg-grad-jardin-al-andalus",
        "bg-grad-brume-perle",
        "bg-grad-rubis-crepuscule",
      ];
      for (const id of newGradIds) {
        const theme = GRADIENT_BG_THEMES.find((b) => b.id === id);
        expect(theme, `Expected ${id} to exist in GRADIENT_BG_THEMES`).toBeDefined();
        expect(theme?.category).toBe("gradient");
        expect(theme?.bgImage).toBeTruthy();
      }
    });

    it("has 5 new RGB animated background themes", () => {
      const newRgbIds = [
        "bg-rgb-plasma-aurora",
        "bg-rgb-supernova-rubis",
        "bg-rgb-nebuleuse-saphir",
        "bg-rgb-ambre-volcanique",
        "bg-rgb-spectre-cristallin",
      ];
      for (const id of newRgbIds) {
        const theme = RGB_BG_THEMES.find((b) => b.id === id);
        expect(theme, `Expected ${id} to exist in RGB_BG_THEMES`).toBeDefined();
        expect(theme?.animated).toBe(true);
        expect(theme?.animClass).toBeTruthy();
      }
    });

    it("has 5 new premium background themes", () => {
      const newPremIds = [
        "bg-prem-ivoire-filigrane",
        "bg-prem-onyx-platine",
        "bg-prem-bois-oud",
        "bg-prem-nacre-persee",
        "bg-prem-velours-grenat",
      ];
      for (const id of newPremIds) {
        const theme = PREMIUM_BG_THEMES.find((b) => b.id === id);
        expect(theme, `Expected ${id} to exist in PREMIUM_BG_THEMES`).toBeDefined();
        expect(theme?.category).toBe("premium");
        expect(theme?.animClass).toBeTruthy();
      }
    });
  });

  describe("Border Themes", () => {
    it("has unique IDs across all border themes", () => {
      const ids = WIDGET_BORDER_THEMES.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("has 5 new solid border themes", () => {
      const newSolidIds = [
        "wb-solid-amethyst",
        "wb-solid-copper",
        "wb-solid-platine",
        "wb-solid-rubis",
        "wb-solid-groove-imperial",
      ];
      for (const id of newSolidIds) {
        const theme = SOLID_BORDER_THEMES.find((b) => b.id === id);
        expect(theme, `Expected ${id} to exist in SOLID_BORDER_THEMES`).toBeDefined();
        expect(theme?.category).toBe("solid");
        expect(theme?.borderClass).toBeTruthy();
      }
    });

    it("has 5 new animated border themes", () => {
      const newAnimIds = [
        "wb-anim-emeraude-celeste",
        "wb-anim-aurore-polaire",
        "wb-anim-rubis-dore",
        "wb-anim-spectre-neon",
        "wb-anim-diamant-argent",
      ];
      for (const id of newAnimIds) {
        const theme = ANIMATED_BORDER_THEMES.find((b) => b.id === id);
        expect(theme, `Expected ${id} to exist in ANIMATED_BORDER_THEMES`).toBeDefined();
        expect(theme?.category).toBe("animated");
        expect(theme?.borderClass).toBeTruthy();
      }
    });

    it("has 5 new touch/interactive border themes", () => {
      const newTouchIds = [
        "wb-interact-opal",
        "wb-interact-flame",
        "wb-interact-topaz",
        "wb-interact-jade",
        "wb-interact-amethyst",
      ];
      for (const id of newTouchIds) {
        const theme = TOUCH_BORDER_THEMES.find((b) => b.id === id);
        expect(theme, `Expected ${id} to exist in TOUCH_BORDER_THEMES`).toBeDefined();
        expect(theme?.category).toBe("touch");
        expect(theme?.borderClass).toBeTruthy();
      }
    });
  });

  describe("Lookup helpers", () => {
    it("resolves defaults gracefully on invalid IDs", () => {
      expect(getWidgetThemeById("invalid-id").id).toBe("w-grad-vert-chartreuse");
      expect(getBgThemeById("invalid-id").id).toBe("bg-default");
      expect(getWidgetBorderThemeById("invalid-id").id).toBe("wb-anim-rubis-dore");
    });
  });
});
