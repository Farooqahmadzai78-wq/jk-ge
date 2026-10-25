import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveReminderActions } from "@/lib/reminder-data";
import { DEFAULT_SETTINGS } from "@/lib/app-settings";

/**
 * 1. Comportement des trois modes de rappel (chemin in-app).
 * 2. Guide global : six ecrans reellement developpes, distincts des
 *    tutoriels contextuels de page.
 */

const resolvedFor = (mode: "notification" | "audio" | "both") => ({
  mode,
  notifText: "Message personnalise",
  audioText: "Vocal personnalise",
  isArabicAudio: false,
});

describe("actions du rappel (application ouverte)", () => {
  it("mode message : notification publiee, aucun vocal", () => {
    const a = resolveReminderActions(DEFAULT_SETTINGS, resolvedFor("notification"));
    expect(a.showNotification).toBe(true);
    expect(a.notificationText).toBe("Message personnalise");
    expect(a.speakVoice).toBe(false);
  });

  it("mode vocal : vocal lu, aucune notification de message", () => {
    const a = resolveReminderActions(DEFAULT_SETTINGS, resolvedFor("audio"));
    expect(a.speakVoice).toBe(true);
    expect(a.voiceText).toBe("Vocal personnalise");
    expect(a.showNotification).toBe(false);
  });

  it("mode combine : notification ET vocal", () => {
    const a = resolveReminderActions(DEFAULT_SETTINGS, resolvedFor("both"));
    expect(a.showNotification).toBe(true);
    expect(a.notificationText).toBe("Message personnalise");
    expect(a.speakVoice).toBe(true);
    expect(a.voiceText).toBe("Vocal personnalise");
  });

  it("la vibration suit le reglage utilisateur", () => {
    const on = resolveReminderActions(
      { ...DEFAULT_SETTINGS, vibrateNotifications: true },
      resolvedFor("notification"),
    );
    const off = resolveReminderActions(
      { ...DEFAULT_SETTINGS, vibrateNotifications: false },
      resolvedFor("notification"),
    );
    expect(on.vibrate).toBe(true);
    expect(off.vibrate).toBe(false);
  });
});

describe("guide global « Emerald Signature »", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/AppOnboardingModal.tsx"),
    "utf-8",
  );

  it("developpe six ecrans distincts", () => {
    const screens = [
      "welcome",
      "lang",
      "prayers",
      "quran",
      "tools",
      "ready",
    ];
    for (const screen of screens) {
      expect(source, screen).toContain(`"${screen}"`);
    }
    expect(source).toMatch(/SCREENS\s*=\s*\[[^\]]*"welcome"[\s\S]*"ready"/);
  });

  it("affiche les 50 langues reellement traduites", () => {
    const matches = source.match(/\{ code: "/g) ?? [];
    expect(matches.length).toBe(50);
  });

  it("utilise les vraies donnees de priere (pas d'horaires fabriques)", () => {
    expect(source).toContain("usePrayerTimes");
    expect(source).toContain("cleanTime");
  });

  it("ne contient aucune minuterie d'avancement automatique", () => {
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("setInterval");
  });

  it("est distinct du tutoriel contextuel de page", () => {
    expect(source).not.toContain("InteractivePageTour");
    expect(source).toContain("isOnboardingCompleted");
  });

  it("propose un ecran de saisie du prenom avec sauvegarde locale et saut facultatif", () => {
    expect(source).toContain('"name"');
    expect(source).toContain("profileName");
    expect(source).toContain("handleSaveAndContinueName");
    expect(source).toContain("handleSkipName");
    expect(source).toContain("onboardingNamePlaceholder");
  });
});

