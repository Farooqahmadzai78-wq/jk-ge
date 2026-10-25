import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLACE,
  DEFAULT_SETTINGS,
  mergeSettings,
  type Settings,
} from "@/lib/app-settings";

/**
 * Valeurs par defaut et fusion des preferences.
 *
 * Deux situations doivent etre distinguees :
 *  - premiere installation : rien n'est enregistre -> les valeurs par defaut
 *    s'appliquent (anglais, La Mecque, textes personnalises vides) ;
 *  - utilisateur existant : ses preferences enregistrees l'emportent, une
 *    mise a jour ne doit pas les reinitialiser.
 */

describe("valeurs par defaut (premiere installation)", () => {
  it("la langue par defaut est l'anglais", () => {
    expect(DEFAULT_SETTINGS.language).toBe("en");
  });

  it("la ville par defaut est La Mecque", () => {
    expect(DEFAULT_PLACE.name).toBe("La Mecque");
    expect(DEFAULT_PLACE.timezone).toBe("Asia/Riyadh");
    expect(DEFAULT_SETTINGS.place?.name).toBe("La Mecque");
  });

  it("les champs personnalises sont vides", () => {
    expect(DEFAULT_SETTINGS.profileName).toBe("");
    expect(DEFAULT_SETTINGS.profileAvatarUrl).toBe("");
    expect(DEFAULT_SETTINGS.customNotifText).toBe("");
    expect(DEFAULT_SETTINGS.customAudioText).toBe("");
  });

  it("les settings neutres deja prevus sont conserves", () => {
    expect(DEFAULT_SETTINGS.bgTheme).toBe("bg-default");
    expect(DEFAULT_SETTINGS.widgetBorderTheme).toBe("wb-anim-rubis-dore");
    expect(DEFAULT_SETTINGS.widgetTheme).toBe("w-grad-vert-chartreuse");
    expect(DEFAULT_SETTINGS.widgetColor).toBe("sunset");
    expect(DEFAULT_SETTINGS.bgColor).toBe("white");
  });

  it("le style de boussole par defaut est le Luxe Islamique (id 2)", () => {
    expect(DEFAULT_SETTINGS.compassStyle).toBe(2);
  });

  it("aucune donnee personnelle n'est pre-remplie", () => {
    const serialized = JSON.stringify(DEFAULT_SETTINGS).toLowerCase();
    expect(serialized).not.toContain("farooq");
    expect(serialized).not.toContain("bosse");
  });
});

describe("localisation automatique (opt-in explicite)", () => {
  it("une premiere installation garde La Mecque et n demande aucune position", async () => {
    const { shouldUseAutomaticLocation } = await import("@/hooks/usePrayerTimes");
    const merged = mergeSettings(null);
    expect(merged.place?.name).toBe("La Mecque");
    expect(merged.manualPlace).toBe(false);
    expect(merged.autoGeolocation).toBe(false);
    expect(shouldUseAutomaticLocation(merged)).toBe(false);
  });

  it("une ville choisie manuellement n'est jamais remplacee", async () => {
    const { shouldUseAutomaticLocation } = await import("@/hooks/usePrayerTimes");
    const merged = mergeSettings({
      manualPlace: true,
      autoGeolocation: true,
      place: { name: "Paris", lat: 48.85, lon: 2.35, timezone: "Europe/Paris" },
    });
    expect(shouldUseAutomaticLocation(merged)).toBe(false);
    expect(merged.place?.name).toBe("Paris");
  });

  it("la localisation automatique n'agit que si elle est activee explicitement", async () => {
    const { shouldUseAutomaticLocation } = await import("@/hooks/usePrayerTimes");
    expect(shouldUseAutomaticLocation({ manualPlace: false, autoGeolocation: true })).toBe(true);
    expect(shouldUseAutomaticLocation({ manualPlace: false, autoGeolocation: false })).toBe(false);
    expect(shouldUseAutomaticLocation({ manualPlace: false })).toBe(false);
  });

  it("un utilisateur existant garde sa ville et son choix de localisation", async () => {
    const { shouldUseAutomaticLocation } = await import("@/hooks/usePrayerTimes");
    const merged = mergeSettings({
      place: { name: "Casablanca", lat: 33.57, lon: -7.59, timezone: "Africa/Casablanca" },
      manualPlace: true,
      autoGeolocation: false,
    });
    expect(merged.place?.name).toBe("Casablanca");
    expect(shouldUseAutomaticLocation(merged)).toBe(false);
  });
});

describe("mergeSettings", () => {
  it("sans preference enregistree, applique les valeurs par defaut", () => {
    const merged = mergeSettings(null);
    expect(merged.language).toBe("en");
    expect(merged.place?.name).toBe("La Mecque");
    expect(merged.customNotifText).toBe("");
  });

  it("conserve la langue choisie par un utilisateur existant", () => {
    const merged = mergeSettings({ language: "ar" });
    expect(merged.language).toBe("ar");
  });

  it("conserve la ville choisie par un utilisateur existant", () => {
    const merged = mergeSettings({
      place: { name: "Paris", country: "France", lat: 48.85, lon: 2.35, timezone: "Europe/Paris" },
    });
    expect(merged.place?.name).toBe("Paris");
    expect(merged.place?.timezone).toBe("Europe/Paris");
  });

  it("ne reinitialise pas les autres preferences enregistrees", () => {
    const stored: Partial<Settings> = {
      language: "fr",
      reminder: 30,
      reminderMode: "both",
      notifTemplate: "custom",
      customNotifText: "Mon message",
      customAudioText: "Mon vocal",
      profileName: "Utilisateur",
      dark: true,
    };
    const merged = mergeSettings(stored);
    expect(merged.language).toBe("fr");
    expect(merged.reminder).toBe(30);
    expect(merged.reminderMode).toBe("both");
    expect(merged.notifTemplate).toBe("custom");
    expect(merged.customNotifText).toBe("Mon message");
    expect(merged.customAudioText).toBe("Mon vocal");
    expect(merged.profileName).toBe("Utilisateur");
    expect(merged.dark).toBe(true);
  });

  it("restaure la ville par defaut si l'enregistrement n'en contient aucune", () => {
    const merged = mergeSettings({ place: null });
    expect(merged.place?.name).toBe("La Mecque");
  });

  it("ne modifie pas l'objet de valeurs par defaut", () => {
    const before = JSON.stringify(DEFAULT_SETTINGS);
    mergeSettings({ language: "fr" });
    mergeSettings(null);
    expect(JSON.stringify(DEFAULT_SETTINGS)).toBe(before);
  });
});
