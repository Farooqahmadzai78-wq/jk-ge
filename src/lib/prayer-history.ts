export type DailyPrayerLog = Record<string, string[]>;

import { getPrayerStatsStrings, generateLocalizedPrayerSummary } from "./prayer-stats-i18n";

const STORAGE_KEY = "nur.prayer_history_log.v2";

export const PRAYER_KEYS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type PrayerKeyName = (typeof PRAYER_KEYS)[number];

export const PRAYER_NAMES: Record<string, string> = {
  Fajr: "Fajr",
  Dhuhr: "Dhuhr",
  Asr: "Asr",
  Maghrib: "Maghrib",
  Isha: "Isha",
};

export const PRAYER_DESCRIPTIONS: Record<string, { arabic: string; french: string; tips: string }> = {
  Fajr: {
    arabic: "الفجر",
    french: "Prière de l'Aube",
    tips: "Privilégiez le coucher tôt après l'Isha et l'invocation du réveil pour faciliter le lever.",
  },
  Dhuhr: {
    arabic: "الظهر",
    french: "Prière du Midi",
    tips: "Accordez-vous une pause sereine au milieu de votre journée de travail ou d'études.",
  },
  Asr: {
    arabic: "العصر",
    french: "Prière de l'Après-midi",
    tips: "La prière médiane ('as-Salât al-Wustâ') requiert une vigilance toute particulière.",
  },
  Maghrib: {
    arabic: "المغرب",
    french: "Prière du Coucher du Soleil",
    tips: "Accomplissez-la dès son entrée, moment béni de rupture du jeûne et de gratitude.",
  },
  Isha: {
    arabic: "العشاء",
    french: "Prière de la Nuit",
    tips: "Clôturez votre journée dans le recueillement avant le repos nocturne.",
  },
};

/** Returns ISO date string YYYY-MM-DD for a given date. */
export function toDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getStoredPrayerHistory(): DailyPrayerLog {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePrayerHistory(history: DailyPrayerLog): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    /* ignore storage quota */
  }
}

export function recordPrayerToggle(
  prayerKey: string,
  dateStr = toDateKey(),
): { history: DailyPrayerLog; todayDone: string[] } {
  const history = getStoredPrayerHistory();
  const currentToday = history[dateStr] || [];
  let updatedToday: string[];

  if (currentToday.includes(prayerKey)) {
    updatedToday = currentToday.filter((k) => k !== prayerKey);
  } else {
    updatedToday = [...currentToday, prayerKey];
  }

  history[dateStr] = updatedToday;
  savePrayerHistory(history);

  return { history, todayDone: updatedToday };
}

export function setPrayerDayLog(
  dateStr: string,
  prayers: string[],
): { history: DailyPrayerLog; dayDone: string[] } {
  const history = getStoredPrayerHistory();
  const valid = prayers.filter((p) => PRAYER_KEYS.includes(p as PrayerKeyName));
  history[dateStr] = valid;
  savePrayerHistory(history);
  return { history, dayDone: valid };
}

export function markDayAllDone(dateStr: string): { history: DailyPrayerLog; dayDone: string[] } {
  return setPrayerDayLog(dateStr, [...PRAYER_KEYS]);
}

export function clearDayLog(dateStr: string): { history: DailyPrayerLog; dayDone: string[] } {
  return setPrayerDayLog(dateStr, []);
}

export function clearAllPrayerHistory(): DailyPrayerLog {
  const empty: DailyPrayerLog = {};
  savePrayerHistory(empty);
  return empty;
}

export type DailyPrayerRecord = {
  dateKey: string;
  dayLabel: string;
  dayNumber: number;
  monthLabel: string;
  fullDate: string;
  prayers: string[];
  count: number;
  isToday: boolean;
  isFull: boolean;
};

export type PerPrayerStat = {
  key: string;
  name: string;
  arabicName: string;
  frenchTitle: string;
  count: number;
  total: number;
  percentage: number;
  isStrongest: boolean;
  isWeakest: boolean;
  spiritualTip: string;
};

export type CalendarDay = {
  dateKey: string;
  dayNumber: number;
  count: number;
  isToday: boolean;
  isFuture: boolean;
  isCurrentMonth: boolean;
  prayers: string[];
};

export type MonthCalendarData = {
  year: number;
  month: number;
  monthName: string;
  days: CalendarDay[];
  validatedCount: number;
  totalPossible: number;
  percentage: number;
  perfectDaysCount: number;
};

export type SpiritualBadge = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  iconType: "flame" | "star" | "crown" | "shield" | "sparkles" | "check";
  rarity: "commune" | "rare" | "noble" | "legendaire";
};

export type PrayerStats = {
  totalValidated: number;
  weeklyValidated: number;
  weeklyTotal: number;
  weeklyPercentage: number;
  monthlyValidated: number;
  monthlyTotal: number;
  monthlyPercentage: number;
  rangeValidated: number;
  rangeTotal: number;
  rangePercentage: number;
  rangeDaysCount: number;
  regularityLabel: string;
  regularityKey: "regToStart" | "regExcellent" | "regGood" | "regInProg";
  hasEnoughData: boolean;
  currentStreak: number;
  bestStreak: number;
  perfectDaysTotal: number;
  last14Days: DailyPrayerRecord[];
  trendDays: DailyPrayerRecord[];
  prayerBreakdown: PerPrayerStat[];
  calendarDays: CalendarDay[];
  currentMonthName: string;
  selectedYear: number;
  selectedMonth: number;
  calendarData: MonthCalendarData;
  badges: SpiritualBadge[];
  fajrGuardianCount: number;
  strongestPrayer: PerPrayerStat | null;
  weakestPrayer: PerPrayerStat | null;
};

/** Computes monthly calendar matrix for any year and month (0-indexed month: 0 = Jan). */
export function calculateMonthCalendar(
  history: DailyPrayerLog,
  year: number,
  month: number,
  locale = "fr",
): MonthCalendarData {
  const today = new Date();
  const todayKey = toDateKey(today);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 0 for Monday

  const days: CalendarDay[] = [];
  let validatedCount = 0;
  let perfectDaysCount = 0;

  // Previous month padding
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDate - i;
    const prevDate = new Date(year, month - 1, dayNum);
    const key = toDateKey(prevDate);
    const prs = history[key] || [];
    days.push({
      dateKey: key,
      dayNumber: dayNum,
      count: prs.length,
      isToday: false,
      isFuture: false,
      isCurrentMonth: false,
      prayers: prs,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const curDate = new Date(year, month, day);
    const key = toDateKey(curDate);
    const isFuture = curDate > today;
    const prs = history[key] || [];
    const count = prs.length;

    if (!isFuture) {
      validatedCount += count;
      if (count >= 5) perfectDaysCount++;
    }

    days.push({
      dateKey: key,
      dayNumber: day,
      count,
      isToday: key === todayKey,
      isFuture,
      isCurrentMonth: true,
      prayers: prs,
    });
  }

  // Next month padding to fill a complete 7-column grid row
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const nextDate = new Date(year, month + 1, i);
    const key = toDateKey(nextDate);
    const prs = history[key] || [];
    days.push({
      dateKey: key,
      dayNumber: i,
      count: prs.length,
      isToday: false,
      isFuture: true,
      isCurrentMonth: false,
      prayers: prs,
    });
  }

  // Elapsed days in month up to today
  let elapsedDays = daysInMonth;
  if (year === today.getFullYear() && month === today.getMonth()) {
    elapsedDays = today.getDate();
  } else if (new Date(year, month, 1) > today) {
    elapsedDays = 0;
  }
  const totalPossible = Math.max(5, elapsedDays * 5);
  const percentage = Math.min(100, Math.round((validatedCount / totalPossible) * 100));

  const monthDate = new Date(year, month, 1);
  let monthName = "";
  try {
    monthName = monthDate.toLocaleDateString(locale, { month: "long", year: "numeric" });
  } catch {
    monthName = monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  return {
    year,
    month,
    monthName,
    days,
    validatedCount,
    totalPossible,
    percentage,
    perfectDaysCount,
  };
}

export function calculatePrayerStats(
  history: DailyPrayerLog,
  locale = "fr",
  selectedYear?: number,
  selectedMonth?: number,
  rangeDays: 7 | 14 | 30 = 14,
): PrayerStats {
  const today = new Date();
  const todayKey = toDateKey(today);

  const curYear = selectedYear ?? today.getFullYear();
  const curMonth = selectedMonth ?? today.getMonth();

  // Total count across all history
  let totalValidated = 0;
  let perfectDaysTotal = 0;
  Object.values(history).forEach((prayers) => {
    totalValidated += prayers.length;
    if (prayers.length >= 5) perfectDaysTotal++;
  });

  // Calculate Last 7 Days (Weekly)
  let weeklyValidated = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toDateKey(d);
    const dayPrayers = history[key] || [];
    weeklyValidated += dayPrayers.length;
  }
  const weeklyTotal = 35; // 7 days * 5 prayers
  const weeklyPercentage = Math.min(100, Math.round((weeklyValidated / weeklyTotal) * 100));

  // Dynamic Trend Days (7, 14, or 30 days)
  const trendDays: DailyPrayerRecord[] = [];
  let rangeValidated = 0;
  const s = getPrayerStatsStrings(locale);

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toDateKey(d);
    const dayPrayers = history[key] || [];
    rangeValidated += dayPrayers.length;

    const isToday = key === todayKey;
    let dayLabel = "";
    let monthLabel = "";
    let fullDate = "";
    try {
      dayLabel = isToday ? s.todayLabel : d.toLocaleDateString(locale, { weekday: "short" });
      monthLabel = d.toLocaleDateString(locale, { month: "short" });
      fullDate = d.toLocaleDateString(locale, { day: "numeric", month: "long" });
    } catch {
      dayLabel = isToday ? "Auj." : d.toLocaleDateString("fr-FR", { weekday: "short" });
      monthLabel = d.toLocaleDateString("fr-FR", { month: "short" });
      fullDate = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    }

    trendDays.push({
      dateKey: key,
      dayLabel,
      dayNumber: d.getDate(),
      monthLabel,
      fullDate,
      prayers: dayPrayers,
      count: dayPrayers.length,
      isToday,
      isFull: dayPrayers.length >= 5,
    });
  }
  const rangeTotal = rangeDays * 5;
  const rangePercentage = Math.min(100, Math.round((rangeValidated / rangeTotal) * 100));

  // Keep last14Days for legacy compatibility
  const last14Days = trendDays.slice(-14);

  // Month Calendar Data
  const calendarData = calculateMonthCalendar(history, curYear, curMonth, locale);
  const monthlyValidated = calendarData.validatedCount;
  const monthlyTotal = calendarData.totalPossible;
  const monthlyPercentage = calendarData.percentage;
  const currentMonthName = calendarData.monthName;
  const calendarDays = calendarData.days;

  // Regularity Assessment
  let regularityKey: "regToStart" | "regExcellent" | "regGood" | "regInProg" = "regToStart";
  let regularityLabel = s.regPromisingStart;
  if (weeklyPercentage >= 85) {
    regularityKey = "regExcellent";
    regularityLabel = s.regExemplary;
  } else if (weeklyPercentage >= 50) {
    regularityKey = "regGood";
    regularityLabel = s.regVeryRegular;
  } else if (weeklyPercentage > 0) {
    regularityKey = "regInProg";
    regularityLabel = s.regInProgress;
  }

  // --- Calculate Current Streak & Best Streak ---
  const todayPrayers = history[todayKey] || [];
  const todayIsFull = todayPrayers.length >= 5;

  let currentStreak = 0;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);
  const yesterdayPrayers = history[yesterdayKey] || [];
  const yesterdayIsFull = yesterdayPrayers.length >= 5;

  let startDate: Date | null = null;
  if (todayIsFull) {
    currentStreak = 1;
    startDate = yesterday;
  } else if (yesterdayIsFull) {
    currentStreak = 1;
    const dayBeforeYesterday = new Date(yesterday);
    dayBeforeYesterday.setDate(yesterday.getDate() - 1);
    startDate = dayBeforeYesterday;
  }

  if (startDate) {
    const checkDate = new Date(startDate);
    while (true) {
      const k = toDateKey(checkDate);
      const pr = history[k] || [];
      if (pr.length >= 5) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Best streak calculation across all stored dates
  let bestStreak = currentStreak;
  const sortedDates = Object.keys(history).sort();
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const pr = history[dateStr] || [];
    if (pr.length >= 5) {
      const curDate = new Date(dateStr);
      if (prevDate) {
        const diffMs = curDate.getTime() - prevDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      prevDate = curDate;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
      prevDate = null;
    }
  }

  // --- Per-Prayer Breakdown over Last 30 Days ---
  const daysToCheck = 30;
  const prayerCounts: Record<string, number> = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };

  for (let i = 0; i < daysToCheck; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toDateKey(d);
    const prs = history[key] || [];
    for (const p of prs) {
      if (prayerCounts[p] !== undefined) {
        prayerCounts[p]++;
      }
    }
  }

  let maxPrayerCount = -1;
  let minPrayerCount = Infinity;
  for (const k of PRAYER_KEYS) {
    const c = prayerCounts[k] || 0;
    if (c > maxPrayerCount) maxPrayerCount = c;
    if (c < minPrayerCount) minPrayerCount = c;
  }

  const prayerBreakdown: PerPrayerStat[] = PRAYER_KEYS.map((key) => {
    const count = prayerCounts[key] || 0;
    const percentage = Math.round((count / daysToCheck) * 100);
    const pMeta = s.prayers[key] || {
      name: PRAYER_NAMES[key] || key,
      arabic: PRAYER_DESCRIPTIONS[key]?.arabic || "",
      subtitle: PRAYER_DESCRIPTIONS[key]?.french || key,
      tip: PRAYER_DESCRIPTIONS[key]?.tips || "",
    };
    return {
      key,
      name: pMeta.name || PRAYER_NAMES[key] || key,
      arabicName: pMeta.arabic,
      frenchTitle: pMeta.subtitle,
      count,
      total: daysToCheck,
      percentage,
      isStrongest: count > 0 && count === maxPrayerCount,
      isWeakest: count === minPrayerCount && maxPrayerCount > minPrayerCount,
      spiritualTip: pMeta.tip,
    };
  });

  const strongestPrayer = prayerBreakdown.find((p) => p.isStrongest) || null;
  const weakestPrayer = prayerBreakdown.find((p) => p.isWeakest) || null;

  // --- Spiritual Milestone Badges ---
  const hasFullDay = perfectDaysTotal > 0;
  const fajrLast14 = last14Days.filter((d) => d.prayers.includes("Fajr")).length;
  let totalFajrAllTime = 0;
  Object.values(history).forEach((prs) => {
    if (prs.includes("Fajr")) totalFajrAllTime++;
  });

  const badgeDefs: Array<{
    id: string;
    unlocked: boolean;
    progress: number;
    maxProgress: number;
    iconType: SpiritualBadge["iconType"];
    rarity: SpiritualBadge["rarity"];
  }> = [
    {
      id: "first_prayer",
      unlocked: totalValidated >= 1,
      progress: Math.min(1, totalValidated),
      maxProgress: 1,
      iconType: "sparkles",
      rarity: "commune",
    },
    {
      id: "full_day",
      unlocked: hasFullDay,
      progress: hasFullDay ? 5 : Math.min(todayPrayers.length, 5),
      maxProgress: 5,
      iconType: "check",
      rarity: "commune",
    },
    {
      id: "streak_3",
      unlocked: bestStreak >= 3,
      progress: Math.min(3, bestStreak),
      maxProgress: 3,
      iconType: "flame",
      rarity: "rare",
    },
    {
      id: "streak_7",
      unlocked: bestStreak >= 7,
      progress: Math.min(7, bestStreak),
      maxProgress: 7,
      iconType: "crown",
      rarity: "rare",
    },
    {
      id: "fajr_guardian",
      unlocked: fajrLast14 >= 7,
      progress: Math.min(7, fajrLast14),
      maxProgress: 7,
      iconType: "star",
      rarity: "noble",
    },
    {
      id: "streak_14",
      unlocked: bestStreak >= 14,
      progress: Math.min(14, bestStreak),
      maxProgress: 14,
      iconType: "shield",
      rarity: "noble",
    },
    {
      id: "hundred_club",
      unlocked: totalValidated >= 100,
      progress: Math.min(100, totalValidated),
      maxProgress: 100,
      iconType: "shield",
      rarity: "noble",
    },
    {
      id: "streak_30",
      unlocked: bestStreak >= 30,
      progress: Math.min(30, bestStreak),
      maxProgress: 30,
      iconType: "crown",
      rarity: "legendaire",
    },
    {
      id: "fajr_sentinel",
      unlocked: totalFajrAllTime >= 30,
      progress: Math.min(30, totalFajrAllTime),
      maxProgress: 30,
      iconType: "star",
      rarity: "legendaire",
    },
    {
      id: "five_hundred_club",
      unlocked: totalValidated >= 500,
      progress: Math.min(500, totalValidated),
      maxProgress: 500,
      iconType: "sparkles",
      rarity: "legendaire",
    },
  ];

  const badges: SpiritualBadge[] = badgeDefs.map((b) => {
    const loc = s.badges[b.id] || { title: b.id, description: "" };
    return {
      id: b.id,
      title: loc.title,
      description: loc.description,
      unlocked: b.unlocked,
      progress: b.progress,
      maxProgress: b.maxProgress,
      iconType: b.iconType,
      rarity: b.rarity,
    };
  });

  const hasEnoughData = totalValidated > 0;

  return {
    totalValidated,
    weeklyValidated,
    weeklyTotal,
    weeklyPercentage,
    monthlyValidated,
    monthlyTotal,
    monthlyPercentage,
    rangeValidated,
    rangeTotal,
    rangePercentage,
    rangeDaysCount: rangeDays,
    regularityLabel,
    regularityKey,
    hasEnoughData,
    currentStreak,
    bestStreak,
    perfectDaysTotal,
    last14Days,
    trendDays,
    prayerBreakdown,
    calendarDays,
    currentMonthName,
    selectedYear: curYear,
    selectedMonth: curMonth,
    calendarData,
    badges,
    fajrGuardianCount: fajrLast14,
    strongestPrayer,
    weakestPrayer,
  };
}

export function generatePrayerSummaryShareText(stats: PrayerStats, locale = "fr"): string {
  return generateLocalizedPrayerSummary(stats, locale);
}

