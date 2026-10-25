import { describe, expect, it } from "vitest";
import { getInteractiveTour } from "@/lib/interactive-tours";
import { en } from "@/lib/locales/en";
import type { PageTutorialId } from "@/lib/page-tutorials";

/**
 * Tutoriels interactifs : une cible reelle par etape, un texte court.
 * On verifie la structure (cibles et titres) sans DOM.
 */

const PAGES: PageTutorialId[] = ["home", "prayers", "quran", "halal", "settings"];

describe("tutoriels interactifs", () => {
  it("chaque page demandee possede des etapes", () => {
    for (const page of PAGES) {
      const steps = getInteractiveTour(page, en);
      expect(steps.length, page).toBeGreaterThan(0);
    }
  });

  it("chaque etape a une cible, un titre et une description", () => {
    for (const page of PAGES) {
      for (const step of getInteractiveTour(page, en)) {
        expect(step.target.length, page).toBeGreaterThan(0);
        expect(step.title.length, page).toBeGreaterThan(0);
        expect(step.description.length, page).toBeGreaterThan(0);
      }
    }
  });

  it("les cibles sont des selecteurs CSS exploitables", () => {
    for (const page of PAGES) {
      for (const step of getInteractiveTour(page, en)) {
        expect(step.target, page).toMatch(/^(\[data-tour=".+"\]|#.+)$/);
      }
    }
  });

  it("les cibles sont uniques dans une meme page", () => {
    for (const page of PAGES) {
      const targets = getInteractiveTour(page, en).map((s) => s.target);
      expect(new Set(targets).size, page).toBe(targets.length);
    }
  });

  it("les textes restent courts (max 90 caracteres)", () => {
    for (const page of PAGES) {
      for (const step of getInteractiveTour(page, en)) {
        expect(step.title.length, page).toBeLessThanOrEqual(90);
        expect(step.description.length, page).toBeLessThanOrEqual(120);
      }
    }
  });

  it("une page inconnue ne renvoie aucune etape", () => {
    expect(getInteractiveTour("tasbih", en)).toEqual([]);
  });
});
