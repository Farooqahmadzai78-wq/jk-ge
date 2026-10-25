import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  X,
  Flame,
  Award,
  Calendar as CalendarIcon,
  BarChart3,
  CheckCircle2,
  Check,
  Sparkles,
  TrendingUp,
  Star,
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Sunrise,
  Share2,
  RotateCcw,
  BookOpen,
  Info,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { playClick, playConfirm } from "@/lib/sfx";
import { vibrate } from "@/lib/vibration";
import { appToast } from "@/lib/app-toast";
import { useDynamicTheme } from "@/lib/use-dynamic-theme";
import {
  calculatePrayerStats,
  getStoredPrayerHistory,
  recordPrayerToggle,
  markDayAllDone,
  clearDayLog,
  toDateKey,
  PRAYER_KEYS,
  type DailyPrayerLog,
  type PrayerStats,
  type DailyPrayerRecord,
} from "@/lib/prayer-history";
import {
  getPrayerStatsStrings,
  generateLocalizedPrayerSummary,
} from "@/lib/prayer-stats-i18n";

interface PrayerStatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats?: PrayerStats;
  todayDone?: string[];
  onHistoryUpdated?: (history: DailyPrayerLog) => void;
}

type TabType = "overview" | "breakdown" | "calendar" | "badges";
type TrendRange = 7 | 14 | 30;
type BadgeFilter = "all" | "unlocked" | "locked";

const PRAYER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Fajr: Sunrise,
  Dhuhr: Sun,
  Asr: Sun,
  Maghrib: Sunset,
  Isha: Moon,
};

export function PrayerStatisticsModal({
  isOpen,
  onClose,
  stats: initialStats,
  todayDone: initialTodayDone,
  onHistoryUpdated,
}: PrayerStatisticsModalProps) {
  const { locale } = useI18n();
  const theme = useDynamicTheme();
  const strings = useMemo(() => getPrayerStatsStrings(locale), [locale]);
  const isRtl = useMemo(
    () => locale.startsWith("ar") || locale === "fa" || locale === "ps" || locale === "ur",
    [locale],
  );

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [trendRange, setTrendRange] = useState<TrendRange>(14);
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>("all");

  // Month navigation state
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());

  // Local state for interactive editing and reactive live stats
  const [historyLog, setHistoryLog] = useState<DailyPrayerLog>({});
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(todayKey);
  const [copiedShare, setCopiedShare] = useState(false);

  // Sync state with local storage on open
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredPrayerHistory();
      setHistoryLog(stored);
      setSelectedDayKey(todayKey);
    }
  }, [isOpen, todayKey]);

  // Handle closing with clean body class removal and audio/haptic feedback
  const handleClose = useCallback(() => {
    playClick();
    vibrate("button");
    if (typeof document !== "undefined") {
      document.body.classList.remove("stats-window-active");
      document.body.style.overflow = "";
    }
    onClose();
  }, [onClose]);

  // Hide global navigation bars and lock background scroll while statistics window is active
  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== "undefined") {
      document.body.classList.add("stats-window-active");
      document.body.style.overflow = "hidden";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("stats-window-active");
        document.body.style.overflow = "";
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Compute live reactive statistics whenever historyLog, selected month, or range changes
  const liveStats = useMemo(() => {
    return calculatePrayerStats(historyLog, locale, selectedYear, selectedMonth, trendRange);
  }, [historyLog, locale, selectedYear, selectedMonth, trendRange]);

  // Active prayers done today
  const activeTodayPrayers = useMemo(() => {
    return historyLog[todayKey] || initialTodayDone || [];
  }, [historyLog, todayKey, initialTodayDone]);

  // Selected day record for the interactive inspector
  const selectedDayRecord = useMemo<DailyPrayerRecord | null>(() => {
    if (!selectedDayKey) return null;
    const fromTrend = liveStats.trendDays.find((d) => d.dateKey === selectedDayKey);
    if (fromTrend) return fromTrend;

    const [y, m, d] = selectedDayKey.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const prayers = historyLog[selectedDayKey] || [];
    let fullDate = "";
    try {
      fullDate = dateObj.toLocaleDateString(locale, { day: "numeric", month: "long" });
    } catch {
      fullDate = dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    }

    return {
      dateKey: selectedDayKey,
      dayLabel: selectedDayKey === todayKey ? strings.todayLabel : String(d),
      dayNumber: d,
      monthLabel: "",
      fullDate,
      prayers,
      count: prayers.length,
      isToday: selectedDayKey === todayKey,
      isFull: prayers.length >= 5,
    };
  }, [selectedDayKey, liveStats.trendDays, historyLog, todayKey, strings.todayLabel, locale]);

  // Localized weekday names (Mon -> Sun)
  const weekdayNames = useMemo(() => {
    const baseMonday = new Date(2026, 0, 5);
    const names: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseMonday);
      d.setDate(baseMonday.getDate() + i);
      try {
        names.push(d.toLocaleDateString(locale, { weekday: "short" }).toUpperCase());
      } catch {
        names.push(["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"][i]);
      }
    }
    return names;
  }, [locale]);

  // Interactive toggle handler
  const handleTogglePrayerForDay = (dateStr: string, prayerKey: string) => {
    playClick();
    vibrate("selection");
    const { history } = recordPrayerToggle(prayerKey, dateStr);
    setHistoryLog({ ...history });
    onHistoryUpdated?.(history);
  };

  const handleMarkAllDay = (dateStr: string) => {
    playConfirm();
    vibrate("success");
    const { history } = markDayAllDone(dateStr);
    setHistoryLog({ ...history });
    onHistoryUpdated?.(history);
  };

  const handleClearDay = (dateStr: string) => {
    playClick();
    vibrate("button");
    const { history } = clearDayLog(dateStr);
    setHistoryLog({ ...history });
    onHistoryUpdated?.(history);
  };

  const handleTabChange = (tab: TabType) => {
    playClick();
    vibrate("selection");
    setActiveTab(tab);
  };

  const handlePrevMonth = () => {
    playClick();
    vibrate("button");
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    playClick();
    vibrate("button");
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    playClick();
    vibrate("button");
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
    setSelectedDayKey(todayKey);
  };

  const handleShare = async () => {
    playClick();
    vibrate("button");
    const text = generateLocalizedPrayerSummary(liveStats, locale);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: strings.shareModalTitle,
          text,
        });
        return;
      } catch {
        /* fallback to clipboard */
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      appToast.success(strings.copiedShare, { category: "prayers" });
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      appToast.info(strings.shareNotSupported, { category: "prayers" });
    }
  };

  const filteredBadges = useMemo(() => {
    if (badgeFilter === "unlocked") return liveStats.badges.filter((b) => b.unlocked);
    if (badgeFilter === "locked") return liveStats.badges.filter((b) => !b.unlocked);
    return liveStats.badges;
  }, [liveStats.badges, badgeFilter]);

  const unlockedCount = useMemo(() => {
    return liveStats.badges.filter((b) => b.unlocked).length;
  }, [liveStats.badges]);

  const getRarityBadgeText = (rarity: string) => {
    switch (rarity) {
      case "rare":
        return strings.rarityRare;
      case "noble":
        return strings.rarityNoble;
      case "legendaire":
        return strings.rarityLegendary;
      default:
        return strings.rarityCommon;
    }
  };

  if (!isOpen) return null;

  // Custom accent border inline style
  const themeCardBorderStyle = {
    borderColor: `${theme.accentFrom}33`, // 20% opacity border
  };

  const themeHighlightBorderStyle = {
    borderColor: `${theme.accentFrom}66`, // 40% opacity border
  };

  return (
    <div
      className={`fixed inset-0 z-[120] w-full h-full h-dvh min-h-screen flex flex-col overflow-hidden select-none transition-colors duration-300 ${theme.modalBg}`}
      role="dialog"
      aria-modal="true"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Ambient glowing orbs tuned to user's active widget accent */}
      <div
        className="absolute -top-24 -right-24 size-80 rounded-full blur-3xl pointer-events-none opacity-25"
        style={{ backgroundColor: theme.accentFrom }}
      />
      <div
        className="absolute -bottom-24 -left-24 size-80 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: theme.accentTo }}
      />

      {/* Top Header — Clean, modern, adaptable bar */}
      <header
        className={`relative flex items-center justify-between border-b px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shrink-0 backdrop-blur-xl z-20 transition-colors ${theme.headerBg}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-11 rounded-2xl flex items-center justify-center shadow-sm shrink-0 border transition-all"
            style={{
              background: `linear-gradient(135deg, ${theme.accentFrom}25 0%, ${theme.accentTo}15 100%)`,
              borderColor: `${theme.accentFrom}55`,
              color: theme.accentFrom,
            }}
          >
            <BarChart3 className="size-5.5" />
          </div>
          <div className="min-w-0">
            <div className={`flex items-center gap-2 text-xs font-medium ${theme.textMuted}`}>
              <span>{strings.prayerTracking}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize truncate font-semibold" style={{ color: theme.accentFrom }}>
                {liveStats.currentMonthName}
              </span>
            </div>
            <h1 className={`font-display text-base sm:text-lg font-bold tracking-tight truncate ${theme.textPrimary}`}>
              {strings.prayerStatsTitle}
            </h1>
          </div>
        </div>

        {/* Action Buttons: Share & Close Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleShare}
            title={strings.share}
            aria-label={strings.share}
            className={`min-h-[44px] min-w-[44px] size-11 flex items-center justify-center rounded-full border transition active:scale-95 cursor-pointer shadow-xs ${
              theme.isDark
                ? "border-white/15 bg-white/10 hover:bg-white/20 text-white"
                : "border-slate-200 bg-slate-100/80 hover:bg-slate-200/80 text-slate-700"
            }`}
          >
            {copiedShare ? (
              <Check className="size-5 text-emerald-500 stroke-[2.5]" />
            ) : (
              <Share2 className="size-5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleClose}
            title={strings.close}
            aria-label={strings.close}
            className={`min-h-[44px] min-w-[44px] size-11 flex items-center justify-center rounded-full border-2 active:scale-90 shadow-sm backdrop-blur-md transition-all cursor-pointer focus:outline-none ${
              theme.isDark
                ? "border-white/25 bg-white/15 hover:bg-white/25 text-white focus:ring-2 focus:ring-white/40"
                : "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-2 focus:ring-slate-400"
            }`}
          >
            <X className="size-5.5 stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 py-4 space-y-4 max-w-4xl w-full mx-auto">
        {/* 4 Sleek KPI Metric Cards with dynamic theme borders */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* 1. Streak */}
          <div
            className={`rounded-2xl border p-3.5 text-center shadow-xs transition-all relative overflow-hidden ${
              theme.isDark ? "bg-slate-900/60" : "bg-white/90"
            }`}
            style={themeCardBorderStyle}
          >
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider font-mono">
              <Flame className="size-3.5 text-amber-500 fill-amber-500 animate-pulse" />
              <span className={theme.textMuted}>{strings.streak}</span>
            </div>
            <p className={`mt-1 font-display text-2xl sm:text-3xl font-black tabular-nums ${theme.textPrimary}`}>
              {liveStats.currentStreak}{" "}
              <span className="text-xs font-semibold text-amber-500">{strings.days}</span>
            </p>
            <p className={`text-[11px] mt-0.5 font-mono ${theme.textMuted}`}>
              {strings.bestRecord} {liveStats.bestStreak} {strings.dayShort}
            </p>
          </div>

          {/* 2. 7 Days % */}
          <div
            className={`rounded-2xl border p-3.5 text-center shadow-xs transition-all relative overflow-hidden ${
              theme.isDark ? "bg-slate-900/60" : "bg-white/90"
            }`}
            style={themeCardBorderStyle}
          >
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider font-mono">
              <TrendingUp className="size-3.5 text-emerald-500" />
              <span className={theme.textMuted}>{strings.sevenDays}</span>
            </div>
            <p className={`mt-1 font-display text-2xl sm:text-3xl font-black tabular-nums ${theme.textPrimary}`}>
              {liveStats.weeklyPercentage}%
            </p>
            <p className="text-[11px] mt-0.5 truncate font-medium text-emerald-500">
              {liveStats.regularityLabel}
            </p>
          </div>

          {/* 3. 5/5 Days Completed */}
          <div
            className={`rounded-2xl border p-3.5 text-center shadow-xs transition-all relative overflow-hidden ${
              theme.isDark ? "bg-slate-900/60" : "bg-white/90"
            }`}
            style={themeCardBorderStyle}
          >
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider font-mono">
              <Star className="size-3.5 text-amber-400 fill-amber-400" />
              <span className={theme.textMuted}>{strings.perfectDays}</span>
            </div>
            <p className={`mt-1 font-display text-2xl sm:text-3xl font-black tabular-nums ${theme.textPrimary}`}>
              {liveStats.perfectDaysTotal}
            </p>
            <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>{strings.perfectLabel}</p>
          </div>

          {/* 4. Total Prayers */}
          <div
            className={`rounded-2xl border p-3.5 text-center shadow-xs transition-all relative overflow-hidden ${
              theme.isDark ? "bg-slate-900/60" : "bg-white/90"
            }`}
            style={themeCardBorderStyle}
          >
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider font-mono">
              <CheckCircle2 className="size-3.5 text-teal-500" />
              <span className={theme.textMuted}>{strings.totalValidated}</span>
            </div>
            <p className={`mt-1 font-display text-2xl sm:text-3xl font-black tabular-nums ${theme.textPrimary}`}>
              {liveStats.totalValidated}
            </p>
            <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>{strings.prayersLabel}</p>
          </div>
        </div>

        {/* Tab Switcher — High-end segmented control */}
        <div className="pt-0.5">
          <div
            className={`flex rounded-2xl p-1 border gap-1 text-xs font-semibold shadow-inner ${
              theme.isDark
                ? "bg-slate-950/80 border-white/10"
                : "bg-slate-200/70 border-slate-300/80"
            }`}
          >
            <button
              type="button"
              onClick={() => handleTabChange("overview")}
              style={
                activeTab === "overview"
                  ? {
                      background: theme.accentGradient,
                      color: theme.accentFg,
                    }
                  : undefined
              }
              className={`min-h-[40px] flex-1 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === "overview"
                  ? "font-bold shadow-sm"
                  : `${theme.textSecondary} hover:${theme.textPrimary} hover:bg-black/5 dark:hover:bg-white/5`
              }`}
            >
              <BarChart3 className="size-3.5" />
              <span>{strings.tabOverview}</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("breakdown")}
              style={
                activeTab === "breakdown"
                  ? {
                      background: theme.accentGradient,
                      color: theme.accentFg,
                    }
                  : undefined
              }
              className={`min-h-[40px] flex-1 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === "breakdown"
                  ? "font-bold shadow-sm"
                  : `${theme.textSecondary} hover:${theme.textPrimary} hover:bg-black/5 dark:hover:bg-white/5`
              }`}
            >
              <Clock className="size-3.5" />
              <span>{strings.tabBreakdown}</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("calendar")}
              style={
                activeTab === "calendar"
                  ? {
                      background: theme.accentGradient,
                      color: theme.accentFg,
                    }
                  : undefined
              }
              className={`min-h-[40px] flex-1 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === "calendar"
                  ? "font-bold shadow-sm"
                  : `${theme.textSecondary} hover:${theme.textPrimary} hover:bg-black/5 dark:hover:bg-white/5`
              }`}
            >
              <CalendarIcon className="size-3.5" />
              <span>{strings.tabCalendar}</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("badges")}
              style={
                activeTab === "badges"
                  ? {
                      background: theme.accentGradient,
                      color: theme.accentFg,
                    }
                  : undefined
              }
              className={`min-h-[40px] flex-1 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === "badges"
                  ? "font-bold shadow-sm"
                  : `${theme.textSecondary} hover:${theme.textPrimary} hover:bg-black/5 dark:hover:bg-white/5`
              }`}
            >
              <Award className="size-3.5" />
              <span>
                {strings.tabBadges} ({unlockedCount})
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW & SIMPLIFIED CONSISTENCY TREND CHART */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Period Selector & Simplified Bar Chart Card */}
            <div
              className={`rounded-2xl border p-4 sm:p-5 space-y-4 shadow-xs transition-all ${
                theme.isDark ? "bg-slate-900/60" : "bg-white/95"
              }`}
              style={themeCardBorderStyle}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3
                    className="text-xs font-bold uppercase tracking-wider font-display flex items-center gap-1.5"
                    style={{ color: theme.accentFrom }}
                  >
                    <Sparkles className="size-3.5" />
                    {strings.trendTitle}
                  </h3>
                  <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>{strings.trendSub}</p>
                </div>

                {/* Range selector: 7j, 14j, 30j */}
                <div
                  className={`flex items-center gap-1 p-0.5 rounded-xl border text-[11px] ${
                    theme.isDark ? "bg-slate-950/80 border-white/10" : "bg-slate-100 border-slate-200"
                  }`}
                >
                  {([7, 14, 30] as TrendRange[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        playClick();
                        vibrate("button");
                        setTrendRange(r);
                      }}
                      style={
                        trendRange === r
                          ? {
                              background: theme.accentFrom,
                              color: theme.accentFg,
                            }
                          : undefined
                      }
                      className={`min-h-[32px] px-2.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                        trendRange === r
                          ? "shadow-xs"
                          : `${theme.textSecondary} hover:${theme.textPrimary}`
                      }`}
                    >
                      {r}
                      {strings.dayShort}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress bar indicator for the selected period */}
              <div className="space-y-1.5">
                <div className={`flex items-center justify-between text-xs ${theme.textSecondary}`}>
                  <span>
                    {strings.rangeValidated}{" "}
                    <strong className={`font-mono tabular-nums ${theme.textPrimary}`}>
                      {liveStats.rangeValidated}/{liveStats.rangeTotal}
                    </strong>
                  </span>
                  <span className="font-mono font-bold" style={{ color: theme.accentFrom }}>
                    {liveStats.rangePercentage}%
                  </span>
                </div>
                <div
                  className={`h-2 w-full rounded-full overflow-hidden ${
                    theme.isDark ? "bg-slate-950" : "bg-slate-200/80"
                  }`}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${liveStats.rangePercentage}%`,
                      background: theme.accentGradient,
                    }}
                  />
                </div>
              </div>

              {/* Simplified & Clean Bar Chart Container */}
              <div
                className={`pt-2 flex items-end justify-between gap-1 sm:gap-2 h-44 pb-2 border-b ${
                  theme.isDark ? "border-white/10" : "border-slate-200"
                }`}
              >
                {liveStats.trendDays.map((d) => {
                  const isSelected = selectedDayKey === d.dateKey;
                  const fillPercent = (d.count / 5) * 100;
                  return (
                    <button
                      key={d.dateKey}
                      type="button"
                      onClick={() => {
                        playClick();
                        vibrate("button");
                        setSelectedDayKey(d.dateKey);
                      }}
                      className={`group relative flex-1 flex flex-col items-center h-full justify-end cursor-pointer transition-all active:scale-95 ${
                        isSelected ? "scale-105" : ""
                      }`}
                      title={`${d.fullDate}: ${d.count}/5 ${strings.prayersLabel}`}
                    >
                      {/* Count of prayers */}
                      <span
                        className={`text-[9px] font-mono transition-colors font-bold ${
                          isSelected ? "scale-110" : ""
                        }`}
                        style={{
                          color: isSelected ? theme.accentFrom : undefined,
                        }}
                      >
                        <span className={isSelected ? "" : theme.textMuted}>{d.count}</span>
                      </span>

                      {/* Bar Track */}
                      <div
                        className={`relative w-full max-w-[18px] sm:max-w-[22px] rounded-t-lg rounded-b-md overflow-hidden transition-all my-1 ${
                          theme.isDark ? "bg-slate-800/60" : "bg-slate-200"
                        } ${
                          isSelected
                            ? "ring-2 shadow-md"
                            : "hover:opacity-90"
                        }`}
                        style={{
                          height: "75%",
                          boxShadow: isSelected ? `0 0 10px ${theme.accentFrom}88` : undefined,
                        }}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-500"
                          style={{
                            height: `${fillPercent}%`,
                            background:
                              d.count === 5
                                ? theme.accentGradient
                                : d.count >= 3
                                  ? `${theme.accentFrom}cc`
                                  : d.count > 0
                                    ? `${theme.accentFrom}88`
                                    : "transparent",
                          }}
                        />
                      </div>

                      {/* Day Number */}
                      <span
                        className={`text-[9px] font-mono transition-colors ${
                          d.isToday
                            ? "font-extrabold underline decoration-2 underline-offset-2"
                            : isSelected
                              ? "font-bold"
                              : theme.textMuted
                        }`}
                        style={{
                          color: d.isToday || isSelected ? theme.accentFrom : undefined,
                        }}
                      >
                        {d.dayNumber}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Day Inspector & Quick Toggle inside Overview */}
              {selectedDayRecord && (
                <div
                  className={`p-3.5 rounded-2xl border space-y-2.5 transition-all ${
                    theme.isDark ? "bg-slate-950/70" : "bg-slate-50/90"
                  }`}
                  style={themeHighlightBorderStyle}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`text-xs font-bold capitalize ${theme.textPrimary}`}>
                        {selectedDayRecord.fullDate}
                      </span>
                      {selectedDayRecord.isToday && (
                        <span className="ml-2 text-[10px] font-semibold" style={{ color: theme.accentFrom }}>
                          ({strings.todayLabel})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold" style={{ color: theme.accentFrom }}>
                        {selectedDayRecord.count}/5 {strings.prayersLabel}
                      </span>
                      {selectedDayRecord.count < 5 && (
                        <button
                          type="button"
                          onClick={() => handleMarkAllDay(selectedDayRecord.dateKey)}
                          className="min-h-[32px] px-2.5 py-1 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 border"
                          style={{
                            background: `${theme.accentFrom}20`,
                            borderColor: `${theme.accentFrom}55`,
                            color: theme.accentFrom,
                          }}
                        >
                          {strings.todayMarkAll}
                        </button>
                      )}
                      {selectedDayRecord.count > 0 && (
                        <button
                          type="button"
                          onClick={() => handleClearDay(selectedDayRecord.dateKey)}
                          className={`min-h-[32px] px-2 py-1 rounded-lg text-[10px] transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 border ${
                            theme.isDark
                              ? "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                              : "bg-slate-200/70 border-slate-300 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {strings.todayClear}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 5 Prayer Toggles */}
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
                    {PRAYER_KEYS.map((k) => {
                      const done = selectedDayRecord.prayers.includes(k);
                      const Icon = PRAYER_ICONS[k] || Clock;
                      const localizedPrayerName = strings.prayers[k]?.name || k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleTogglePrayerForDay(selectedDayRecord.dateKey, k)}
                          style={
                            done
                              ? {
                                  background: `linear-gradient(135deg, ${theme.accentFrom}35 0%, ${theme.accentTo}25 100%)`,
                                  borderColor: theme.accentFrom,
                                  color: theme.textPrimary,
                                }
                              : undefined
                          }
                          className={`min-h-[44px] flex flex-col items-center justify-center p-1.5 rounded-xl border text-[10px] font-bold transition cursor-pointer active:scale-95 ${
                            done
                              ? "shadow-xs"
                              : theme.isDark
                                ? "bg-white/[0.04] border-white/10 text-white/50 hover:bg-white/[0.08]"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          <Icon className="size-3.5 mb-0.5" />
                          <span className="truncate max-w-full">{localizedPrayerName}</span>
                          <span className="mt-0.5 font-bold">
                            {done ? <Check className="size-3 stroke-[3]" /> : "—"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Today's Live Status Banner */}
            <div
              className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs transition-all ${
                theme.isDark ? "bg-slate-900/60" : "bg-white/95"
              }`}
              style={themeCardBorderStyle}
            >
              <div className="min-w-0 flex-1">
                <h4 className={`text-xs font-bold font-display flex items-center gap-1.5 ${theme.textPrimary}`}>
                  <Sparkles className="size-3.5" style={{ color: theme.accentFrom }} />
                  {strings.todayLabel} ({activeTodayPrayers.length}/5)
                </h4>
                <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>
                  {activeTodayPrayers.length === 5
                    ? strings.todayStatusComplete
                    : strings.todayStatusPending}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {PRAYER_KEYS.map((k) => {
                  const isDone = activeTodayPrayers.includes(k);
                  const localizedPrayerName = strings.prayers[k]?.name || k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleTogglePrayerForDay(todayKey, k)}
                      title={`${localizedPrayerName}: ${isDone ? strings.tooltipValidated : strings.tooltipPending}`}
                      style={
                        isDone
                          ? {
                              background: theme.accentGradient,
                              color: theme.accentFg,
                              borderColor: theme.accentFrom,
                            }
                          : undefined
                      }
                      className={`min-h-[38px] min-w-[38px] rounded-xl flex flex-col items-center justify-center text-[10px] font-bold border transition cursor-pointer active:scale-95 ${
                        isDone
                          ? "shadow-sm font-black"
                          : theme.isDark
                            ? "bg-white/10 border-white/15 text-white/60 hover:bg-white/20"
                            : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {isDone ? <Check className="size-3.5 stroke-[3]" /> : localizedPrayerName[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quran Ayah Spiritual Wisdom Callout */}
            <div
              className={`rounded-2xl border p-4 flex items-start gap-3 transition-all ${
                theme.isDark ? "bg-slate-900/40" : "bg-white/70"
              }`}
              style={themeCardBorderStyle}
            >
              <div
                className="size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border"
                style={{
                  background: `${theme.accentFrom}20`,
                  borderColor: `${theme.accentFrom}44`,
                  color: theme.accentFrom,
                }}
              >
                <BookOpen className="size-4" />
              </div>
              <div className="space-y-1 text-xs">
                <p
                  className="font-[var(--font-arabic)] text-sm leading-relaxed font-bold"
                  style={{ color: theme.accentFrom }}
                >
                  حَافِظُوا عَلَى الصَّلَوَاتِ وَالصَّلَاةِ الْوُسْطَىٰ وَقُومُوا لِلَّهِ قَانِتِينَ
                </p>
                <p className={`italic leading-snug ${theme.textSecondary}`}>{strings.ayahText}</p>
                <div className={`text-[10px] pt-0.5 ${theme.textMuted}`}>{strings.surahBaqarahRef}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: BREAKDOWN BY PRAYER */}
        {activeTab === "breakdown" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div
              className={`rounded-2xl border p-3.5 text-xs leading-relaxed ${
                theme.isDark ? "bg-slate-900/50" : "bg-white/90"
              } ${theme.textSecondary}`}
              style={themeCardBorderStyle}
            >
              {strings.breakdownIntro}
            </div>

            {liveStats.prayerBreakdown.map((item) => {
              const Icon = PRAYER_ICONS[item.key] || Clock;
              const formattedCompletedText = strings.completedOutOf
                .replace("{count}", String(item.count))
                .replace("{total}", String(item.total));

              return (
                <div
                  key={item.key}
                  className={`rounded-2xl border p-4 transition-all ${
                    theme.isDark ? "bg-slate-900/60" : "bg-white/95"
                  }`}
                  style={item.isStrongest ? themeHighlightBorderStyle : themeCardBorderStyle}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="size-10 rounded-xl flex items-center justify-center border"
                        style={{
                          background: item.isStrongest ? `${theme.accentFrom}25` : `${theme.accentFrom}10`,
                          borderColor: item.isStrongest ? theme.accentFrom : `${theme.accentFrom}33`,
                          color: theme.accentFrom,
                        }}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`font-display font-bold text-sm ${theme.textPrimary}`}>
                            {item.name}
                          </h4>
                          <span
                            className="font-[var(--font-arabic)] text-sm font-semibold opacity-80"
                            style={{ color: theme.accentFrom }}
                          >
                            {item.arabicName}
                          </span>
                          {item.isStrongest && (
                            <span
                              className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                              style={{
                                background: theme.accentFrom,
                                color: theme.accentFg,
                              }}
                            >
                              {strings.strongPoint}
                            </span>
                          )}
                          {item.isWeakest && (
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-600 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              {strings.toImprove}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>
                          {item.frenchTitle} · {formattedCompletedText}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className="font-display text-lg font-extrabold tabular-nums"
                        style={{ color: theme.accentFrom }}
                      >
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Track */}
                  <div
                    className={`mt-3.5 h-2 w-full rounded-full overflow-hidden ${
                      theme.isDark ? "bg-slate-950" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        background: theme.accentGradient,
                      }}
                    />
                  </div>

                  {item.spiritualTip && (
                    <p
                      className={`mt-2.5 text-[11px] italic flex items-center gap-1.5 pt-1.5 border-t ${
                        theme.isDark ? "border-white/5" : "border-slate-100"
                      } ${theme.textSecondary}`}
                    >
                      <Info className="size-3 shrink-0" style={{ color: theme.accentFrom }} />
                      <span>{item.spiritualTip}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {/* TAB 3: MONTHLY CALENDAR */}
        {activeTab === "calendar" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div
              className={`rounded-2xl border p-4 sm:p-5 space-y-3.5 transition-all ${
                theme.isDark ? "bg-slate-900/60" : "bg-white/95"
              }`}
              style={themeCardBorderStyle}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    title={strings.prevMonth}
                    aria-label={strings.prevMonth}
                    className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border transition active:scale-90 cursor-pointer ${
                      theme.isDark
                        ? "border-white/10 bg-white/[0.06] text-white"
                        : "border-slate-200 bg-slate-100 text-slate-700"
                    }`}
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <h3 className={`font-display text-sm sm:text-base font-bold capitalize px-1 ${theme.textPrimary}`}>
                    {liveStats.calendarData.monthName}
                  </h3>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    title={strings.nextMonth}
                    aria-label={strings.nextMonth}
                    className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border transition active:scale-90 cursor-pointer ${
                      theme.isDark
                        ? "border-white/10 bg-white/[0.06] text-white"
                        : "border-slate-200 bg-slate-100 text-slate-700"
                    }`}
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetToCurrentMonth}
                  className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-[10px] font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    theme.isDark
                      ? "bg-white/5 border-white/10 text-white/80"
                      : "bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                >
                  <RotateCcw className="size-3" style={{ color: theme.accentFrom }} />
                  <span>{strings.currentMonthBtn}</span>
                </button>
              </div>

              {/* Month Summary Bar */}
              <div
                className={`flex items-center justify-between text-xs p-2.5 rounded-xl border ${
                  theme.isDark ? "bg-slate-950/70 border-white/5" : "bg-slate-50 border-slate-200"
                } ${theme.textSecondary}`}
              >
                <span>
                  {strings.rangeValidated}{" "}
                  <strong className={`font-mono tabular-nums ${theme.textPrimary}`}>
                    {liveStats.calendarData.validatedCount}
                  </strong>{" "}
                  / {liveStats.calendarData.totalPossible}
                </span>
                <span className="font-mono font-bold" style={{ color: theme.accentFrom }}>
                  {liveStats.calendarData.percentage}%
                </span>
                <span>
                  {strings.perfectDaysCountLabel}{" "}
                  <strong className={`font-mono tabular-nums ${theme.textPrimary}`}>
                    {liveStats.calendarData.perfectDaysCount}
                  </strong>
                </span>
              </div>

              {/* Weekday Header */}
              <div className={`grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-bold pb-0.5 ${theme.textMuted}`}>
                {weekdayNames.map((dayName, idx) => (
                  <span key={idx}>{dayName}</span>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {liveStats.calendarData.days.map((cd, idx) => {
                  const isSelected = selectedDayKey === cd.dateKey;
                  const isToday = cd.dateKey === todayKey;

                  let cellStyle: React.CSSProperties = {};
                  let cellClasses = theme.isDark ? "bg-white/[0.04] text-white/60" : "bg-slate-100 text-slate-600";

                  if (!cd.isCurrentMonth) {
                    cellClasses = "opacity-25 bg-transparent";
                  } else if (cd.isFuture) {
                    cellClasses = "opacity-40 cursor-not-allowed";
                  } else if (cd.count === 5) {
                    cellStyle = {
                      background: theme.accentGradient,
                      color: theme.accentFg,
                    };
                    cellClasses = "font-black shadow-xs";
                  } else if (cd.count >= 3) {
                    cellStyle = {
                      background: `${theme.accentFrom}35`,
                      color: theme.textPrimary,
                    };
                    cellClasses = "font-bold";
                  } else if (cd.count >= 1) {
                    cellStyle = {
                      background: `${theme.accentFrom}15`,
                      color: theme.textPrimary,
                    };
                  }

                  return (
                    <button
                      key={`${cd.dateKey}-${idx}`}
                      type="button"
                      disabled={cd.isFuture || !cd.isCurrentMonth}
                      style={cellStyle}
                      onClick={() => {
                        if (cd.isCurrentMonth && !cd.isFuture) {
                          playClick();
                          vibrate("button");
                          setSelectedDayKey(cd.dateKey);
                        }
                      }}
                      className={`min-h-[44px] aspect-square rounded-xl flex flex-col items-center justify-center p-1 text-xs transition active:scale-95 cursor-pointer ${cellClasses} ${
                        isToday ? "ring-2 ring-emerald-500" : ""
                      } ${isSelected ? "ring-2 scale-105" : ""}`}
                    >
                      <span className="text-[11px] leading-none font-mono">{cd.dayNumber}</span>
                      {cd.isCurrentMonth && !cd.isFuture && (
                        <span className="text-[8px] opacity-90 mt-0.5 leading-none font-mono">
                          {cd.count}/5
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Day Editor Sheet */}
              {selectedDayRecord && (
                <div
                  className={`p-3.5 rounded-2xl border space-y-3 mt-3 transition-all ${
                    theme.isDark ? "bg-slate-950/70" : "bg-slate-50/90"
                  }`}
                  style={themeHighlightBorderStyle}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className={`font-bold text-xs capitalize ${theme.textPrimary}`}>
                        {selectedDayRecord.fullDate}
                      </p>
                      <p className={`text-[10px] ${theme.textMuted}`}>{strings.calendarHint}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold" style={{ color: theme.accentFrom }}>
                        {selectedDayRecord.count}/5 {strings.prayersLabel}
                      </span>
                      {selectedDayRecord.count < 5 && (
                        <button
                          type="button"
                          onClick={() => handleMarkAllDay(selectedDayRecord.dateKey)}
                          className="min-h-[32px] px-2.5 py-1 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 border"
                          style={{
                            background: `${theme.accentFrom}20`,
                            borderColor: `${theme.accentFrom}55`,
                            color: theme.accentFrom,
                          }}
                        >
                          {strings.todayMarkAll}
                        </button>
                      )}
                      {selectedDayRecord.count > 0 && (
                        <button
                          type="button"
                          onClick={() => handleClearDay(selectedDayRecord.dateKey)}
                          className={`min-h-[32px] px-2 py-1 rounded-lg text-[10px] transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 border ${
                            theme.isDark
                              ? "bg-white/5 border-white/10 text-white/50"
                              : "bg-slate-200 border-slate-300 text-slate-600"
                          }`}
                        >
                          {strings.todayClear}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {PRAYER_KEYS.map((k) => {
                      const done = selectedDayRecord.prayers.includes(k);
                      const Icon = PRAYER_ICONS[k] || Clock;
                      const localizedPrayerName = strings.prayers[k]?.name || k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleTogglePrayerForDay(selectedDayRecord.dateKey, k)}
                          style={
                            done
                              ? {
                                  background: theme.accentGradient,
                                  borderColor: theme.accentFrom,
                                  color: theme.accentFg,
                                }
                              : undefined
                          }
                          className={`min-h-[44px] flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer active:scale-95 ${
                            done
                              ? "shadow-sm font-black"
                              : theme.isDark
                                ? "bg-white/[0.04] border-white/10 text-white/40 hover:bg-white/[0.08]"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          <Icon className="size-4 mb-0.5" />
                          <span className="truncate max-w-full">{localizedPrayerName}</span>
                          <span className="mt-0.5 font-bold">
                            {done ? <Check className="size-3.5 stroke-[3]" /> : "—"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 4: BADGES */}
        {activeTab === "badges" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Badge Filter Controls */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div
                className={`flex items-center gap-1 p-1 rounded-xl border text-xs font-semibold ${
                  theme.isDark ? "bg-slate-950/80 border-white/10" : "bg-slate-100 border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setBadgeFilter("all")}
                  style={
                    badgeFilter === "all"
                      ? {
                          background: theme.accentFrom,
                          color: theme.accentFg,
                        }
                      : undefined
                  }
                  className={`min-h-[32px] px-3 rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 ${
                    badgeFilter === "all"
                      ? "font-bold shadow-xs"
                      : `${theme.textSecondary} hover:${theme.textPrimary}`
                  }`}
                >
                  {strings.filterAll} ({liveStats.badges.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBadgeFilter("unlocked")}
                  style={
                    badgeFilter === "unlocked"
                      ? {
                          background: theme.accentFrom,
                          color: theme.accentFg,
                        }
                      : undefined
                  }
                  className={`min-h-[32px] px-3 rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 ${
                    badgeFilter === "unlocked"
                      ? "font-bold shadow-xs"
                      : `${theme.textSecondary} hover:${theme.textPrimary}`
                  }`}
                >
                  {strings.filterUnlocked} ({unlockedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBadgeFilter("locked")}
                  style={
                    badgeFilter === "locked"
                      ? {
                          background: theme.accentFrom,
                          color: theme.accentFg,
                        }
                      : undefined
                  }
                  className={`min-h-[32px] px-3 rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 ${
                    badgeFilter === "locked"
                      ? "font-bold shadow-xs"
                      : `${theme.textSecondary} hover:${theme.textPrimary}`
                  }`}
                >
                  {strings.filterLocked} ({liveStats.badges.length - unlockedCount})
                </button>
              </div>

              <span
                className="text-[11px] font-mono font-bold"
                style={{ color: theme.accentFrom }}
              >
                {unlockedCount} / {liveStats.badges.length} {strings.badgesAccomplished}
              </span>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredBadges.map((b) => {
                const rarityLabel = getRarityBadgeText(b.rarity);

                return (
                  <div
                    key={b.id}
                    className={`rounded-2xl border p-4 transition-all flex items-start gap-3.5 ${
                      theme.isDark ? "bg-slate-900/60" : "bg-white/95"
                    } ${!b.unlocked ? "opacity-60" : "shadow-xs"}`}
                    style={b.unlocked ? themeHighlightBorderStyle : themeCardBorderStyle}
                  >
                    <div
                      className="size-11 rounded-2xl flex items-center justify-center shrink-0 border"
                      style={
                        b.unlocked
                          ? {
                              background: theme.accentGradient,
                              color: theme.accentFg,
                              borderColor: theme.accentFrom,
                            }
                          : {
                              background: theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                              borderColor: theme.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                              color: theme.isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                            }
                      }
                    >
                      {b.iconType === "flame" ? (
                        <Flame className="size-5.5 fill-current" />
                      ) : b.iconType === "crown" ? (
                        <Award className="size-5.5" />
                      ) : b.iconType === "star" ? (
                        <Star className="size-5.5 fill-current" />
                      ) : b.iconType === "shield" ? (
                        <Shield className="size-5.5" />
                      ) : b.iconType === "check" ? (
                        <CheckCircle2 className="size-5.5" />
                      ) : (
                        <Sparkles className="size-5.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`font-display font-bold text-xs truncate ${theme.textPrimary}`}>
                          {b.title}
                        </h4>
                        <span
                          className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            theme.isDark
                              ? "bg-white/10 border-white/20 text-white/90"
                              : "bg-slate-100 border-slate-200 text-slate-700"
                          }`}
                        >
                          {rarityLabel}
                        </span>
                      </div>
                      <p className={`text-[11px] mt-1 leading-snug ${theme.textSecondary}`}>
                        {b.description}
                      </p>

                      {!b.unlocked && (
                        <div className="mt-2.5 space-y-1">
                          <div className={`flex justify-between text-[9px] font-mono ${theme.textMuted}`}>
                            <span>{strings.badgeProgress}</span>
                            <span>
                              {b.progress} / {b.maxProgress}
                            </span>
                          </div>
                          <div
                            className={`h-1.5 w-full rounded-full overflow-hidden ${
                              theme.isDark ? "bg-slate-950" : "bg-slate-200"
                            }`}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (b.progress / b.maxProgress) * 100)}%`,
                                background: theme.accentGradient,
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {b.unlocked && (
                        <div
                          className="mt-2 text-[10px] font-semibold flex items-center gap-1"
                          style={{ color: theme.accentFrom }}
                        >
                          <Check className="size-3 stroke-[2.5]" />
                          <span>{strings.badgeDistinction}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Modal Bottom Footer — Integrated dedicated controls, clean & themeable */}
      <footer
        className={`border-t px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl flex items-center justify-between shrink-0 z-20 transition-colors ${theme.headerBg}`}
      >
        <div className={`text-[11px] flex items-center gap-2 ${theme.textMuted}`}>
          <span>
            {strings.footerValidated.replace("{count}", String(liveStats.totalValidated))}
          </span>
          <span aria-hidden="true">·</span>
          <span>{strings.footerBest.replace("{count}", String(liveStats.bestStreak))}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-full border px-4 py-2 font-display text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 shadow-xs ${
              theme.isDark
                ? "border-white/20 bg-white/10 hover:bg-white/15 text-white"
                : "border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <Share2 className="size-3.5" style={{ color: theme.accentFrom }} />
            <span>{strings.share}</span>
          </button>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: theme.accentGradient,
              color: theme.accentFg,
            }}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-full px-5 py-2 font-display text-xs font-bold uppercase tracking-wider shadow-sm transition hover:brightness-105 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>{strings.close}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
