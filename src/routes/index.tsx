import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  MapPin,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from "lucide-react";
import { appToast } from "@/lib/app-toast";
import mosque from "@/assets/mosque.jpg";
import { CompassIcon, HalalHaramIcon, NamesIcon, TasbihIcon } from "@/components/NurIcons";
import { PrayerRow } from "@/components/PrayerRow";
import { ArcPrayerTimeline } from "@/components/ArcPrayerTimeline";
import { MainQuranInlinePlayer } from "@/components/MainQuranInlinePlayer";
import { FirstTimeCityHint, markCityHintAsSeen } from "@/components/FirstTimeCityHint";
import { PageTutorialModal, usePageTutorial } from "@/components/PageTutorialModal";
import { PageTutorialButton } from "@/components/PageTutorialButton";
import { PrayerStatisticsModal } from "@/components/PrayerStatisticsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSettings, type Place } from "@/lib/app-settings";
import { useDynamicTheme } from "@/lib/use-dynamic-theme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import {
  PRAYER_KEYS,
  cleanTime,
  formatPrayerTime,
  countdown,
  formatLocalizedPlace,
  searchCity,
  getLocalizedGregorianDate,
} from "@/lib/prayer-times";
import {
  getStoredPrayerHistory,
  recordPrayerToggle,
  calculatePrayerStats,
  type DailyPrayerLog,
} from "@/lib/prayer-history";
import { playConfirm } from "@/lib/sfx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Islam-Noor — Application Islamique" },
      {
        name: "description",
        content:
          "Horaires de prière en temps réel, Qibla, Coran, invocations et scanner halal réunis dans une seule application.",
      },
      { property: "og:title", content: "Islam-Noor — Application Islamique" },
      {
        property: "og:description",
        content: "Horaires de prière, Qibla, Coran et scanner halal.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t: rawT, dir, locale } = useI18n();
  const t = rawT as any;
  const theme = useDynamicTheme();
  const { settings, update, ready } = useSettings();
  const { user, guest, loading } = useAuth();
  const navigate = useNavigate();
  const { place, data, next, now } = usePrayerTimes();

  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);
  const {
    isOpen: isTutorialOpen,
    openTutorial: handleOpenTutorial,
    closeTutorial: handleCloseTutorial,
  } = usePageTutorial("home");

  useEffect(() => {
    if (loading) return;
    if (!user && !guest) return void navigate({ to: "/auth" });
    // Permission onboarding screen, shown once between sign-in and home.
    if (ready && !settings.permissionsSeen) navigate({ to: "/permissions" });
  }, [loading, user, guest, navigate, ready, settings.permissionsSeen]);

  const today = new Date().toISOString().slice(0, 10);
  const done = settings.tracking.date === today ? settings.tracking.done : [];
  const allDone = done.length === 5;

  const [mounted, setMounted] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [historyLog, setHistoryLog] = useState<DailyPrayerLog>({});
  useEffect(() => {
    setMounted(true);
    setHistoryLog(getStoredPrayerHistory());
  }, []);

  const stats = useMemo(() => calculatePrayerStats(historyLog, locale), [historyLog, locale]);

  const toggle = (key: string) => {
    if (!done.includes(key)) playConfirm();
    const { history, todayDone } = recordPrayerToggle(key, today);
    setHistoryLog({ ...history });
    update({ tracking: { date: today, done: todayDone } });
  };

  const handleEnableNotifications = async () => {
    try {
      if ("Notification" in window) {
        if (Notification.permission === "default") {
          const res = await Notification.requestPermission();
          if (res !== "granted") {
            update({ notifications: false });
            appToast.error(
              t.notificationsDenied || "Notifications bloquées dans votre navigateur",
              { category: "settings" },
            );
            setNotifPopoverOpen(false);
            return;
          }
        } else if (Notification.permission === "denied") {
          update({ notifications: false });
          appToast.error(
            t.notificationsDenied || "Notifications bloquées dans les paramètres du navigateur",
            { category: "settings" },
          );
          setNotifPopoverOpen(false);
          return;
        }
      }
      update({ notifications: true });
      appToast.success(t.notifOn || "Notifications activées", { category: "settings" });
    } catch {
      update({ notifications: true });
      appToast.success(t.notifOn || "Notifications activées", { category: "settings" });
    } finally {
      setNotifPopoverOpen(false);
    }
  };

  const handleDisableNotifications = () => {
    update({ notifications: false });
    appToast.info(t.notifOff || "Notifications désactivées", { category: "settings" });
    setNotifPopoverOpen(false);
  };

  const cd = next ? countdown(next.at, now) : null;
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;

  return (
    <div className="px-4 pt-[max(0.25rem,env(safe-area-inset-top))] max-w-2xl mx-auto pb-12">
      <header data-widget-card className="glass relative flex items-center gap-1.5 p-2 rounded-2xl">
        <CityPicker open={cityPickerOpen} onOpenChange={setCityPickerOpen} />
        <p className="anim-greet flex-1 shrink-0 text-center font-[var(--font-arabic)] text-base leading-tight font-bold whitespace-nowrap text-brand-gradient">
          السلام عليكم
        </p>

        {/* Notifications Popover with Animated Bell Icon */}
        <Popover open={notifPopoverOpen} onOpenChange={setNotifPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              id="header-notification-btn"
              variant="glass"
              size="icon-lg"
              aria-label={t.notifications}
              className="relative overflow-hidden group"
            >
              <AnimatePresence mode="wait" initial={false}>
                {settings.notifications ? (
                  <motion.div
                    key="bell-active"
                    initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.6, rotate: 20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative flex items-center justify-center"
                  >
                    <Bell className="size-5 text-emerald-400 group-hover:animate-wiggle" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="bell-inactive"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative flex items-center justify-center"
                  >
                    <BellOff className="size-5 text-muted-foreground/70" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-3.5 space-y-3 rounded-2xl shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">{t.notifications}</p>
                <p className="text-[11px] text-muted-foreground">
                  {settings.notifications ? t.notifOn || "Activées" : t.notifOff || "Désactivées"}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Button
                id="enable-notifications-btn"
                variant={settings.notifications ? "widget" : "outline"}
                className="w-full justify-start gap-2 h-9 text-xs font-semibold rounded-xl"
                onClick={handleEnableNotifications}
              >
                <Check
                  className={`w-3.5 h-3.5 ${settings.notifications ? "opacity-100" : "opacity-0"}`}
                />
                <span>{t.notifOn}</span>
              </Button>
              <Button
                id="disable-notifications-btn"
                variant={!settings.notifications ? "widget" : "outline"}
                className="w-full justify-start gap-2 h-9 text-xs font-semibold rounded-xl"
                onClick={handleDisableNotifications}
              >
                <X
                  className={`w-3.5 h-3.5 ${!settings.notifications ? "opacity-100" : "opacity-0"}`}
                />
                <span>{t.notifOff}</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Dedicated Tutorial & Guide Button */}
        <PageTutorialButton onClick={handleOpenTutorial} variant="icon" />

        <Link to="/settings" aria-label={t.settingsTitle}>
          <Avatar className="size-11 border border-border shadow-sm">
            <AvatarImage src={settings.profileAvatarUrl} alt="" className="object-cover" />
            <AvatarFallback className="widget text-sm font-bold" suppressHydrationWarning>
              {(settings.profileName || "U")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </header>

      {/* First-time interactive city change guide */}
      <FirstTimeCityHint onOpenCityPicker={() => setCityPickerOpen(true)} />

      <h1 className="sr-only">{t.appName}</h1>

      {/* Next prayer hero */}
      <section
        data-widget-card
        className="relative mt-3 overflow-hidden rounded-[1.6rem] shadow-lg"
        dir={dir}
      >
        <img src={mosque} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/55 to-black/80" />

        <div className="relative p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className="text-[11px] font-semibold tracking-wide uppercase opacity-85 leading-normal"
                suppressHydrationWarning
              >
                {t.nextPrayer}
              </p>
              <p
                className="text-2xl sm:text-3xl font-extrabold leading-tight mt-0.5"
                suppressHydrationWarning
              >
                {next ? t[next.key.toLowerCase() as "fajr"] : "—"}
              </p>
            </div>

            <span
              className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold backdrop-blur whitespace-nowrap"
              suppressHydrationWarning
            >
              {isNight ? t.night : t.day}
            </span>
          </div>

          {data && (
            <p className="mt-2 text-[11px] leading-snug opacity-85" suppressHydrationWarning>
              {data.hijri}
              <br />
              {getLocalizedGregorianDate(data, locale)}
            </p>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-white/15 p-3 text-center backdrop-blur">
            <div>
              <p className="text-[10px] opacity-85 leading-tight" suppressHydrationWarning>
                {t.prayerTime}
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums" suppressHydrationWarning>
                {data && next
                  ? formatPrayerTime(data.timings[next.key], {
                      lang: locale,
                      format: settings.timeFormat,
                      country: settings.place?.country,
                    })
                  : "--:--"}
              </p>
            </div>
            <div className="border-x border-white/25 px-1">
              <p className="text-[10px] opacity-85 leading-tight" suppressHydrationWarning>
                {t.reminderBeforeAdhan}
              </p>
              <p className="mt-0.5 text-sm font-bold" suppressHydrationWarning>
                {settings.reminder ? `${settings.reminder} ${t.unitMin || "min"}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] opacity-85 leading-tight" suppressHydrationWarning>
                {t.timeRemaining}
              </p>
              <p
                className="mt-0.5 font-mono text-sm font-bold tabular-nums"
                suppressHydrationWarning
              >
                {cd?.label ?? "--:--:--"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Arc Prayer Timeline Widget */}
      <div className="mt-3.5" data-tour="prayer-timeline">
        <ArcPrayerTimeline data={data} now={now} next={next} placeName={place?.name} />
      </div>

      <div data-tour="quran-player">
        <MainQuranInlinePlayer />
      </div>

      {/* Bannière / Bouton style feuille organique : Choisir une mosquée (Fond blanc uni opaque + bordure dynamique assortie) */}
      <div className="mt-4 sm:mt-5" data-tour="mosque-map">
        <Link
          to="/mosques"
          data-widget-card
          className="group relative flex w-full items-center justify-between overflow-hidden rounded-tl-[36px] rounded-br-[36px] rounded-tr-[16px] rounded-bl-[16px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-300 active:scale-[0.985]"
        >
          {/* Côté gauche : Icône mosquée avec badge organique asymétrique et typographie contrastée */}
          <div className="relative flex items-center gap-3.5 min-w-0">
            <div className="grid size-11 sm:size-12 shrink-0 place-items-center rounded-tl-[18px] rounded-br-[18px] rounded-tr-[8px] rounded-bl-[8px] bg-emerald-600 text-white shadow-md border border-emerald-400/40 group-hover:scale-105 transition-transform duration-200">
              <span className="text-xl sm:text-2xl leading-none">🕌</span>
            </div>

            <div className="min-w-0 text-left">
              <span className="block font-[var(--font-cursive)] text-2xl sm:text-3xl font-extrabold tracking-wide text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                {t.chooseMosque || "Choisir une mosquée"}
              </span>
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                {place ? `${place.name} • ${t.mapView || "Carte satellite & horaires"}` : "Trouver les mosquées autour de vous"}
              </p>
            </div>
          </div>

          {/* Côté droit : Bouton feuille avec flèche */}
          <div className="relative flex items-center gap-2 shrink-0 pl-2">
            <span className="hidden sm:inline-block text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {t.mapView || "Voir la carte"}
            </span>
            <div className="grid size-9 place-items-center rounded-tl-[14px] rounded-br-[14px] rounded-tr-[6px] rounded-bl-[6px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all duration-200">
              <ChevronRight className="size-4.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Container 1: Quick icons & Coran / Scan cards (Pure opaque white background) */}
      <div
        data-widget-card
        className="mt-4 sm:mt-5 rounded-[32px] p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5"
      >
        {/* Quick widgets (4 tiles: Halal/Haram, Tasbih, Noms d'Allah, Qibla) */}
        <section className="grid grid-cols-4 gap-3">
          <QuickTile to="/halal" hash="guide-section" label={t.halalWidget}>
            <HalalHaramIcon className="size-9" />
          </QuickTile>
          <QuickTile to="/tasbih" label={t.tasbih}>
            <TasbihIcon className="size-9" />
          </QuickTile>
          <QuickTile to="/names" label={t.names}>
            <NamesIcon className="size-9" />
          </QuickTile>
          <QuickTile to="/prayers" hash="qibla" label={t.qibla}>
            <CompassIcon className="size-9" />
          </QuickTile>
        </section>
      </div>

      {/* Container 2: Daily Tracking / Suivi des prières (Distinct separated widget) */}
      <div
        data-widget-card
        className={`mt-4 sm:mt-5 rounded-[32px] p-4 sm:p-6 shadow-sm border transition-all duration-300 ${
          theme.isDark
            ? "bg-slate-900/80 border-white/10 text-white"
            : "bg-white/95 border-slate-200/80 text-slate-900"
        }`}
      >
        <section className="relative space-y-4">
          {/* Header : Titre, sous-titre et bouton statistiques */}
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4" style={{ color: theme.accentFrom }} />
                <h2 className="text-sm font-bold tracking-tight" suppressHydrationWarning>
                  {t.prayerTracking}
                </h2>
              </div>
              <p className={`mt-0.5 text-[11px] font-medium ${theme.textMuted}`} suppressHydrationWarning>
                {t.trackingSub}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowStatsModal(true)}
              style={{
                background: `${theme.accentFrom}18`,
                borderColor: `${theme.accentFrom}44`,
                color: theme.accentFrom,
              }}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs border shrink-0 ml-2 hover:brightness-105"
            >
              <BarChart3 className="size-3.5" />
              <span>{t.statsBtn}</span>
            </button>
          </div>

          {/* 4 Sleek KPI Metric Cards — Quick summary on Home */}
          <div className="grid grid-cols-4 gap-2">
            {/* Streak */}
            <button
              type="button"
              onClick={() => setShowStatsModal(true)}
              className={`rounded-2xl p-2.5 text-center border transition active:scale-95 cursor-pointer ${
                theme.isDark ? "bg-slate-950/60" : "bg-slate-50"
              }`}
              style={{ borderColor: `${theme.accentFrom}2a` }}
            >
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider font-mono">
                <Flame className="size-3 text-amber-500 fill-amber-500" />
                <span className={theme.textMuted}>Série</span>
              </div>
              <p className={`mt-0.5 text-sm sm:text-base font-black tabular-nums ${theme.textPrimary}`}>
                {stats.currentStreak}
                <span className="text-[10px] font-semibold text-amber-500 ml-0.5">j</span>
              </p>
            </button>

            {/* 7 Days % */}
            <button
              type="button"
              onClick={() => setShowStatsModal(true)}
              className={`rounded-2xl p-2.5 text-center border transition active:scale-95 cursor-pointer ${
                theme.isDark ? "bg-slate-950/60" : "bg-slate-50"
              }`}
              style={{ borderColor: `${theme.accentFrom}2a` }}
            >
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider font-mono">
                <TrendingUp className="size-3 text-emerald-500" />
                <span className={theme.textMuted}>7j %</span>
              </div>
              <p className={`mt-0.5 text-sm sm:text-base font-black tabular-nums ${theme.textPrimary}`}>
                {stats.weeklyPercentage}%
              </p>
            </button>

            {/* 5/5 Days */}
            <button
              type="button"
              onClick={() => setShowStatsModal(true)}
              className={`rounded-2xl p-2.5 text-center border transition active:scale-95 cursor-pointer ${
                theme.isDark ? "bg-slate-950/60" : "bg-slate-50"
              }`}
              style={{ borderColor: `${theme.accentFrom}2a` }}
            >
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider font-mono">
                <Star className="size-3 text-amber-400 fill-amber-400" />
                <span className={theme.textMuted}>5/5 j</span>
              </div>
              <p className={`mt-0.5 text-sm sm:text-base font-black tabular-nums ${theme.textPrimary}`}>
                {stats.perfectDaysTotal}
              </p>
            </button>

            {/* Total Prayers */}
            <button
              type="button"
              onClick={() => setShowStatsModal(true)}
              className={`rounded-2xl p-2.5 text-center border transition active:scale-95 cursor-pointer ${
                theme.isDark ? "bg-slate-950/60" : "bg-slate-50"
              }`}
              style={{ borderColor: `${theme.accentFrom}2a` }}
            >
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider font-mono">
                <CheckCircle2 className="size-3 text-teal-500" />
                <span className={theme.textMuted}>Total</span>
              </div>
              <p className={`mt-0.5 text-sm sm:text-base font-black tabular-nums ${theme.textPrimary}`}>
                {stats.totalValidated}
              </p>
            </button>
          </div>

          {/* 5 Boutons de suivi des prières — Minimalistes, fluides et contrastés */}
          <div
            className={`rounded-2xl p-2.5 sm:p-3 border transition-colors ${
              theme.isDark ? "bg-slate-950/50 border-white/10" : "bg-slate-100/70 border-slate-200/80"
            }`}
          >
            <div className="flex justify-between gap-1.5 sm:gap-2">
              {PRAYER_KEYS.map((k) => {
                const on = done.includes(k);
                return (
                  <button
                    key={k}
                    onClick={() => toggle(k)}
                    style={
                      on
                        ? {
                            background: theme.accentGradient,
                            color: theme.accentFg,
                            borderColor: theme.accentFrom,
                          }
                        : undefined
                    }
                    className={`relative flex flex-1 flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-[10px] sm:text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
                      on
                        ? "shadow-xs font-black"
                        : theme.isDark
                          ? "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08]"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`grid size-7 sm:size-8 place-items-center rounded-full border transition-transform ${
                        on
                          ? "bg-white/20 border-white/60 scale-105"
                          : theme.isDark
                            ? "bg-white/5 border-white/15 text-white/50"
                            : "bg-slate-100 border-slate-300 text-slate-400"
                      }`}
                    >
                      {on ? (
                        <Check className="size-4 stroke-[3]" />
                      ) : (
                        <span className="text-[10px] font-mono">{t[k.toLowerCase() as "fajr"]?.[0] || k[0]}</span>
                      )}
                    </span>
                    <span className="truncate max-w-full font-semibold">{t[k.toLowerCase() as "fajr"]}</span>
                  </button>
                );
              })}
            </div>
            {allDone && ready && (
              <div
                className="anim-pop mt-2.5 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold shadow-2xs border"
                style={{
                  background: `${theme.accentFrom}20`,
                  borderColor: `${theme.accentFrom}55`,
                  color: theme.accentFrom,
                }}
              >
                <span className="relative grid size-5 place-items-center">
                  <Check className="size-4 stroke-[3]" />
                </span>
                <span>{t.allDone}</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Prayer Statistics Modal */}
      {showStatsModal && mounted && (
        <PrayerStatisticsModal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          stats={stats}
          todayDone={done}
          onHistoryUpdated={(newHistory) => {
            setHistoryLog({ ...newHistory });
            const todayDone = newHistory[today] || [];
            update({ tracking: { date: today, done: todayDone } });
          }}
        />
      )}

      {place && (
        <div className="mt-3.5 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs text-slate-700 dark:text-slate-300 font-medium text-xs">
            <MapPin className="size-3.5 text-amber-500 shrink-0" />
            <span suppressHydrationWarning>{formatLocalizedPlace(place, t)}</span>
          </div>
        </div>
      )}

      {/* Interactive Page Tutorial Modal */}
      <PageTutorialModal
        pageId="home"
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
      />
    </div>
  );
}

function QuickTile({
  to,
  hash,
  label,
  children,
}: {
  to: string;
  hash?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      hash={hash}
      data-widget-card
      className="widget flex flex-col items-center gap-1.5 px-1 py-3 text-center"
    >
      {children}
      <span className="text-[10px] leading-tight font-semibold" suppressHydrationWarning>
        {label}
      </span>
    </Link>
  );
}

function CityPicker({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { settings, update } = useSettings();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [q, setQ] = useState("");
  const [results, setResults] = useState<
    {
      name: string;
      country?: string;
      admin1?: string;
      lat: number;
      lon: number;
      timezone?: string;
    }[]
  >([]);
  const [busy, setBusy] = useState(false);

  const label = useMemo(() => settings.place?.name ?? t.changeCity, [settings.place, t.changeCity]);

  const run = async () => {
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      setResults(await searchCity(q.trim()));
    } catch {
      appToast.error(t.searchUnavailable || "Search unavailable", { category: "settings" });
    } finally {
      setBusy(false);
    }
  };

  const handleSelectCity = (r: {
    name: string;
    country?: string;
    admin1?: string;
    lat: number;
    lon: number;
    timezone?: string;
  }) => {
    markCityHintAsSeen();
    update({ place: r, manualPlace: true });
    setOpen(false);
    appToast.success(`${r.name}${r.country ? `, ${r.country}` : ""}`, { category: "settings" });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (val) {
          markCityHintAsSeen();
        }
        setOpen(val);
      }}
    >
      <Button
        id="header-city-picker-trigger"
        variant="glass"
        className="h-11 gap-1.5 rounded-2xl px-3"
        onClick={() => {
          markCityHintAsSeen();
          setOpen(true);
        }}
      >
        <MapPin className="size-4 text-emerald-400" />
        <span className="max-w-24 truncate text-xs font-semibold" suppressHydrationWarning>
          {label}
        </span>
      </Button>

      <DialogContent className="max-w-md rounded-3xl p-5 shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>{t.searchCity}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mt-2">
          <Input
            id="city-search-input"
            value={q}
            maxLength={60}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder={t.searchCity || "Ex: Paris, Limoges, Lyon, Alger..."}
            className="rounded-xl"
            autoFocus
          />
          <Button
            id="city-search-submit-btn"
            variant="widget"
            size="icon-lg"
            onClick={run}
            disabled={busy}
            className="rounded-xl"
          >
            <Search className="size-4" />
          </Button>
        </div>

        <div className="max-h-64 mt-2 space-y-1 overflow-auto pr-1">
          {results.length > 0 ? (
            results.map((r, idx) => (
              <button
                key={`${r.name}-${r.lat}-${r.lon}-${idx}`}
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors flex items-center justify-between group border border-transparent hover:border-emerald-500/20"
                onClick={() => handleSelectCity(r)}
              >
                <div>
                  <span className="font-semibold">{r.name}</span>
                  {r.admin1 && <span className="text-xs text-muted-foreground"> ({r.admin1})</span>}
                  {r.country && (
                    <span className="text-xs text-muted-foreground"> · {r.country}</span>
                  )}
                </div>
                <MapPin className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity" />
              </button>
            ))
          ) : (
            <p className="text-center py-6 text-xs text-muted-foreground">
              {busy ? (t.searching || "Recherche en cours...") : (t.enterCityToSearch || "Entrez le nom d'une ville pour rechercher")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
