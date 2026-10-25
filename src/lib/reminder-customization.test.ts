import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_SETTINGS, mergeSettings } from "@/lib/app-settings";
import { NOTIF_TEMPLATES, AUDIO_REMINDERS, resolveEffectiveReminder } from "@/lib/reminder-data";
import { en } from "@/lib/locales/en";

/**
 * Personnalisation des rappels : aucune valeur personnelle ne doit etre
 * pre-remplie, et les personnalisations deja enregistrees sont conservees.
 */

describe("valeurs initiales de la personnalisation", () => {
  it("les textes personnalises démarrent vides", () => {
    expect(DEFAULT_SETTINGS.customNotifText).toBe("");
    expect(DEFAULT_SETTINGS.customAudioText).toBe("");
  });

  it("aucun modele de notification ou de vocal ne contient de prenom", () => {
    const all = [
      ...NOTIF_TEMPLATES.map((t) => t.text),
      ...AUDIO_REMINDERS.map((a) => a.text),
    ].join(" ");
    expect(all.toLowerCase()).not.toContain("farooq");
    expect(all.toLowerCase()).not.toContain("farouk");
  });

  it("le prenom enregistre n'est jamais injecte dans le message ni le vocal", () => {
    const settings = { ...DEFAULT_SETTINGS, profileName: "Farooq" };
    const resolved = resolveEffectiveReminder(settings, "Fajr", en);
    expect(resolved.notifText.toLowerCase()).not.toContain("farooq");
    expect(resolved.audioText.toLowerCase()).not.toContain("farooq");
  });

  it("une personnalisation reellement enregistree est conservee", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      notifTemplate: "custom",
      customNotifText: "Mon message de rappel",
      audioReminder: "custom",
      customAudioText: "Mon vocal",
    };
    const merged = mergeSettings(settings);
    expect(merged.customNotifText).toBe("Mon message de rappel");
    expect(merged.customAudioText).toBe("Mon vocal");
  });

  it("un champ de personnalisation vide ne remplace pas la valeur enregistree", () => {
    // La page de personnalisation n'ecrit plus de phrase d'exemple : une
    // saisie vide reste vide, une saisie existante est conservee.
    const stored = { customAudioText: "Mon vocal" };
    const merged = mergeSettings(stored);
    expect(merged.customAudioText).toBe("Mon vocal");
  });
});

describe("tutoriel interactif : progression manuelle uniquement", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/InteractivePageTour.tsx"),
    "utf-8",
  );

  it("ne contient aucune minuterie d'avancement automatique", () => {
    // Aucun setTimeout : rien ne peut faire defiler les etapes tout seul.
    expect(source).not.toContain("setTimeout");
    // Le seul setInterval sert a recalculer la position de la cible
    // (defilement / rotation), pas a changer d'etape.
    const intervals = source.match(/setInterval\(/g) ?? [];
    expect(intervals.length).toBeLessThanOrEqual(1);
    expect(source).toContain("setInterval(onScroll");
  });

  it("avance uniquement sur action de l'utilisateur", () => {
    expect(source).toContain("setIndex");
    expect(source).toContain("onFinish");
  });

  it("n'affiche la fleche que si une cible est visible", () => {
    // La fleche est dessinee dans le bloc conditionne par la cible mesuree.
    expect(source).toMatch(/visible && rect \?/);
  });
});
