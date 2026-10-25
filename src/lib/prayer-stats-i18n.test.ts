import { describe, it, expect } from "vitest";
import {
  getPrayerStatsStrings,
  generateLocalizedPrayerSummary,
} from "./prayer-stats-i18n";
import { calculatePrayerStats, generatePrayerSummaryShareText } from "./prayer-history";

describe("Prayer Statistics Internationalization (i18n)", () => {
  it("returns French strings by default or when 'fr' is specified", () => {
    const s = getPrayerStatsStrings("fr");
    expect(s.prayerTracking).toBe("Suivi des Prières");
    expect(s.close).toBe("Fermer");
    expect(s.share).toBe("Partager");
    expect(s.tabOverview).toBe("Évolution");
    expect(s.tabBreakdown).toBe("Par Prière");
    expect(s.tabCalendar).toBe("Calendrier");
    expect(s.tabBadges).toBe("Succès");
    expect(s.prayers.Fajr.subtitle).toBe("Prière de l'Aube");
    expect(s.badges.first_prayer.title).toBe("Premier Pas");
  });

  it("returns English strings when 'en' is specified", () => {
    const s = getPrayerStatsStrings("en");
    expect(s.prayerTracking).toBe("Prayer Tracking");
    expect(s.close).toBe("Close");
    expect(s.share).toBe("Share");
    expect(s.tabOverview).toBe("Trends");
    expect(s.tabBreakdown).toBe("By Prayer");
    expect(s.tabCalendar).toBe("Calendar");
    expect(s.tabBadges).toBe("Achievements");
    expect(s.prayers.Fajr.subtitle).toBe("Dawn Prayer");
    expect(s.badges.first_prayer.title).toBe("First Step");
  });

  it("returns Arabic strings when 'ar' is specified", () => {
    const s = getPrayerStatsStrings("ar");
    expect(s.prayerTracking).toBe("متابعة الصلوات");
    expect(s.close).toBe("إغلاق");
    expect(s.share).toBe("مشاركة");
    expect(s.tabOverview).toBe("التطور");
    expect(s.tabBreakdown).toBe("لكل صلاة");
    expect(s.tabCalendar).toBe("التقويم");
    expect(s.tabBadges).toBe("الإنجازات");
    expect(s.prayers.Fajr.name).toBe("الفجر");
    expect(s.badges.first_prayer.title).toBe("الخطوة الأولى");
  });

  it("returns Turkish strings when 'tr' is specified", () => {
    const s = getPrayerStatsStrings("tr");
    expect(s.prayerTracking).toBe("Namaz Takibi");
    expect(s.close).toBe("Kapat");
    expect(s.share).toBe("Paylaş");
    expect(s.tabOverview).toBe("Gelişim");
    expect(s.tabBreakdown).toBe("Namaza Göre");
    expect(s.tabCalendar).toBe("Takvim");
    expect(s.tabBadges).toBe("Başarılar");
    expect(s.badges.first_prayer.title).toBe("İlk Adım");
  });

  it("returns Spanish strings when 'es' is specified", () => {
    const s = getPrayerStatsStrings("es");
    expect(s.prayerTracking).toBe("Seguimiento de Oraciones");
    expect(s.close).toBe("Cerrar");
    expect(s.tabCalendar).toBe("Calendario");
    expect(s.badges.first_prayer.title).toBe("Primer Paso");
  });

  it("returns German strings when 'de' is specified", () => {
    const s = getPrayerStatsStrings("de");
    expect(s.prayerTracking).toBe("Gebetsverfolgung");
    expect(s.close).toBe("Schließen");
    expect(s.tabCalendar).toBe("Kalender");
    expect(s.badges.first_prayer.title).toBe("Erster Schritt");
  });

  it("generates localized prayer summary share text", () => {
    const mockStats = {
      totalValidated: 42,
      currentStreak: 5,
      bestStreak: 12,
      weeklyPercentage: 80,
      weeklyValidated: 28,
      perfectDaysTotal: 4,
      strongestPrayer: { name: "Fajr", percentage: 90 },
      badges: [{ unlocked: true }, { unlocked: false }],
    };

    const frText = generateLocalizedPrayerSummary(mockStats, "fr");
    expect(frText).toContain("Mon Suivi de Prières");
    expect(frText).toContain("42");
    expect(frText).toContain("Série : 5 jours");

    const enText = generateLocalizedPrayerSummary(mockStats, "en");
    expect(enText).toContain("My Prayer Tracking");
    expect(enText).toContain("Streak : 5 days");

    const arText = generateLocalizedPrayerSummary(mockStats, "ar");
    expect(arText).toContain("متابعة صلواتي");
    expect(arText).toContain("تقبل الله منا ومنكم");
  });

  it("calculatePrayerStats produces localized breakdown and badges", () => {
    const history = {
      "2026-10-20": ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"],
      "2026-10-19": ["Fajr", "Dhuhr", "Asr"],
    };

    const statsFr = calculatePrayerStats(history, "fr");
    expect(statsFr.totalValidated).toBe(8);
    expect(statsFr.badges[0].title).toBe("Premier Pas");
    expect(statsFr.badges[0].unlocked).toBe(true);

    const statsEn = calculatePrayerStats(history, "en");
    expect(statsEn.badges[0].title).toBe("First Step");
    expect(statsEn.badges[0].unlocked).toBe(true);

    const statsAr = calculatePrayerStats(history, "ar");
    expect(statsAr.badges[0].title).toBe("الخطوة الأولى");
    expect(statsAr.badges[0].unlocked).toBe(true);

    // Verify share text integration
    const shareFr = generatePrayerSummaryShareText(statsFr, "fr");
    expect(shareFr).toContain("Mon Suivi de Prières");
  });
});
