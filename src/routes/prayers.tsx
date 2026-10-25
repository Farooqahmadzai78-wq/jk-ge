import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Loader2, Pause, Play, Square, Volume2, BarChart3, Sparkles, ChevronRight, Check, BellOff, Clock } from "lucide-react";

import { appToast } from "@/lib/app-toast";
import notifBg from "@/assets/images/reminder_notif_new_1786270350765.jpg";
import audioBg from "@/assets/images/reminder_audio_new_1786270363968.jpg";
import comboBg from "@/assets/images/reminder_combo_new_1786270378486.jpg";
import { PrayerRow } from "@/components/PrayerRow";
import { QiblaCompass } from "@/components/QiblaCompass";
import { PrayersQiblaARHint } from "@/components/AppFeatureHints";
import { PageTutorialModal, usePageTutorial } from "@/components/PageTutorialModal";
import { PageTutorialButton } from "@/components/PageTutorialButton";
import { PrayerStatisticsModal } from "@/components/PrayerStatisticsModal";
import {
  calculatePrayerStats,
  getStoredPrayerHistory,
  recordPrayerToggle,
  toDateKey,
  type DailyPrayerLog,
} from "@/lib/prayer-history";
import { playConfirm } from "@/lib/sfx";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/app-settings";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { IMAMS, getImamCountry } from "@/lib/nur-data";
import {
  PRAYER_KEYS,
  cleanTime,
  countdown,
  formatLocalizedPlace,
  formatZonedTime,
  getLocalizedGregorianDate,
  toDateToday,
} from "@/lib/prayer-times";
import { AUDIO_REMINDERS, NOTIF_TEMPLATES, resolveEffectiveReminder } from "@/lib/reminder-data";
import {
  speakReminderText,
  stopReminderSpeech,
  subscribeSpeakerState,
  type SpeakerState,
} from "@/lib/reminder-speaker";
import {
  playAzan,
  stopAzan,
  pauseAzan,
  resumeAzan,
  subscribeAzanStatus,
  type AzanPlaybackStatus,
} from "@/lib/azan-audio-engine";
import { sendSystemNotification } from "@/lib/sw-register";

export const Route = createFileRoute("/prayers")({
  head: () => ({
    meta: [
      { title: "Horaires de prière & Qibla — Islam-Noor" },
      {
        name: "description",
        content:
          "Horaires de prière calculés pour votre position, boussole Qibla en temps réel, choix du muezzin et rappels avant l'azan.",
      },
      { property: "og:title", content: "Horaires de prière & Qibla — Islam-Noor" },
      {
        property: "og:description",
        content: "Horaires réels, Qibla et azan personnalisé.",
      },
    ],
  }),
  component: PrayersPage,
});

function PrayersPage() {
  const { t, locale } = useI18n();
  const { settings, update } = useSettings();
  const [showStatsModal, setShowStatsModal] = useState(false);
  const {
    isOpen: isTutorialOpen,
    openTutorial: handleOpenTutorial,
    closeTutorial: handleCloseTutorial,
  } = usePageTutorial("prayers");
  const {
    place,
    data,
    next,
    now,
    timezone,
    clock,
    loading,
    mosque,
    isMosqueOfficial,
    source,
    iqama,
    iqamaDisplay,
    jumua,
    jumua2,
  } = usePrayerTimes();
  const cd = next ? countdown(next.at, now) : null;

  const today = data?.date || toDateKey();
  const todayDone = settings.tracking.date === today ? settings.tracking.done : [];
  const [historyLog, setHistoryLog] = useState<DailyPrayerLog>(getStoredPrayerHistory);

  useEffect(() => {
    setHistoryLog(getStoredPrayerHistory());
  }, [showStatsModal, settings.tracking]);

  const stats = useMemo(() => calculatePrayerStats(historyLog, locale), [historyLog, locale]);

  const togglePrayer = (k: string) => {
    if (!todayDone.includes(k)) playConfirm();
    const { history, todayDone: updatedToday } = recordPrayerToggle(k, today);
    setHistoryLog({ ...history });
    update({ tracking: { date: today, done: updatedToday } });
  };

  const formattedPlace = mosque
    ? `${mosque.name} (${formattedPlaceBase(place, t)})`
    : place
      ? formatLocalizedPlace(place, t)
      : "…";

  function formattedPlaceBase(p: typeof place, tr: typeof t) {
    return p ? formatLocalizedPlace(p, tr) : "";
  }

  // Position of "now" along the day, for the timeline.
  const progress = (() => {
    if (!data) return 0;
    const start = toDateToday(data.timings.Fajr, now).getTime();
    const end = toDateToday(data.timings.Isha, now).getTime();
    return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
  })();

  return (
    <div className="space-y-5 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header data-widget-card className="widget p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs opacity-85 truncate" suppressHydrationWarning>
            {formattedPlace}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {isMosqueOfficial && (
              <span className="shrink-0 text-[10px] font-extrabold bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur">
                {t.officialMosque || "Mosquée Officielle"}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowStatsModal(true)}
              title={t.statsBtn || "Statistiques"}
              aria-label={t.statsBtn || "Statistiques"}
              className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                bg-gradient-to-r from-white/15 to-white/25 hover:from-white/25 hover:to-white/35
                text-white border border-white/30 text-xs font-bold backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <BarChart3 className="size-3.5 text-[#f5e39b] drop-shadow-xs" />
              <span>{t.statsBtn || "Statistiques"}</span>
            </button>
            <PageTutorialButton onClick={handleOpenTutorial} variant="pill" />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold">{t.prayersTitle}</h1>
        {data && (
          <p className="mt-1 text-[11px] opacity-85" suppressHydrationWarning>
            {data.hijri} · {getLocalizedGregorianDate(data, locale)}
          </p>
        )}
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] opacity-80">{t.currentTime}</p>
            {/* Always rendered in the timezone of the selected city. */}
            <p className="font-mono text-xl font-bold tabular-nums" suppressHydrationWarning>
              {formatZonedTime(timezone, clock)}
            </p>
            {timezone && <p className="text-[10px] opacity-70">{timezone}</p>}
          </div>
          <div className="text-right">
            <p className="text-[11px] opacity-80">{t.nextPrayer}</p>
            <p className="text-lg font-bold">
              {next ? t[next.key.toLowerCase() as "fajr"] : "—"}{" "}
              <span className="font-mono tabular-nums" suppressHydrationWarning>
                {cd?.label}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 rounded-full bg-black/15">
          <div
            className="h-2 rounded-full bg-white/85 transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] opacity-80">
          {PRAYER_KEYS.map((k) => (
            <span key={k}>{t[k.toLowerCase() as "fajr"]}</span>
          ))}
        </div>
      </header>

      {/* Mosque Sync / Source Information Banner */}
      <div
        data-widget-card
        className="rounded-2xl px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 text-xs"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider ${
                mosque
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
              }`}
            >
              {mosque ? (t.officialMosqueSource || "Mosquée Officielle (Horaires & Iqama)") : (t.astronomicalCalculationSource || "Calcul astronomique précis (Adhan)")}
            </span>
            {data?.calculationMethod && !mosque && (
              <span className="text-[10px] text-muted-foreground font-medium">
                · {data.calculationMethod}
              </span>
            )}
          </div>
          <p className="font-bold truncate text-foreground mt-1 text-sm">
            {source || (mosque ? mosque.name : `${place?.name || t.currentLocation || "Localisation actuelle"}`)}
          </p>
          {jumua && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {t.fridayPrayerLabel || "Prière du vendredi (Jumua)"} : <span className="font-mono font-semibold text-foreground">{jumua}</span>
              {jumua2 && <span className="font-mono"> / {jumua2}</span>}
            </p>
          )}
        </div>
        <Link
          to="/mosques"
          className="shrink-0 text-xs font-bold text-[var(--w-from)] hover:underline px-2 py-1"
        >
          {mosque ? (t.change || "Changer") : (t.chooseMosqueBtn || "Choisir mosquée")}
        </Link>
      </div>

      {/* Localisation automatique : opt-in explicite, la ville choisie reste
          la reference tant que l'utilisateur ne l'active pas. */}
      <section
        data-widget-card
        data-tour="auto-geolocation"
        className="glass p-3.5 flex items-center gap-3"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-bold text-foreground">{t.autoGeolocation}</p>
          <p className="text-[10.5px] text-muted-foreground leading-snug">
            {t.autoGeolocationHint}
          </p>
        </div>
        <Switch
          checked={settings.autoGeolocation}
          onCheckedChange={(v) => update({ autoGeolocation: v })}
          aria-label={t.autoGeolocation}
        />
      </section>

      <section data-widget-card data-tour="prayer-times" className="glass divide-y divide-border p-2">
        <div className="flex items-center justify-between px-3 pt-1.5 pb-2 border-b border-border/40 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Sparkles className="size-3.5 text-[#d4af37]" />
            <span>{t.prayerTracking || "Suivi du jour"}</span>
            <span className="font-mono text-[11px] text-muted-foreground">({todayDone.length}/5)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowStatsModal(true)}
            className="text-[11px] font-bold text-[#d4af37] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <BarChart3 className="size-3" />
            <span>{t.statsBtn || "Statistiques"}</span>
          </button>
        </div>
        {loading && !data ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          PRAYER_KEYS.map((k) => (
            <PrayerRow
              key={k}
              prayerKey={k}
              time={data ? cleanTime(data.timings[k]) : "--:--"}
              iqama={iqama ? iqama[k] : undefined}
              iqamaDisplay={iqamaDisplay ? iqamaDisplay[k] : undefined}
              active={next?.key === k}
              checked={todayDone.includes(k)}
              onToggle={() => togglePrayer(k)}
            />
          ))
        )}
      </section>

      {/* Feature Guide Hint: Boussole & Réalité Augmentée */}
      <PrayersQiblaARHint
        onScrollToCompass={() => {
          const el = document.getElementById("qibla");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <QiblaCompass />

      {/* Imam selector */}
      <section data-widget-card className="glass p-4 rounded-3xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Volume2 className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground leading-none">{t.imamTitle}</h2>
              <p className="text-[11px] text-muted-foreground mt-1">{t.imamSub}</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground bg-secondary/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-full border border-border/40">
            {IMAMS.find((im) => im.id === settings.imamId)?.name || "Masjid al-Haram"}
          </span>
        </div>
        <ImamPicker />
      </section>

      {/* Reminder */}
      <section data-widget-card data-tour="prayer-reminder" className="glass p-4 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <Bell className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground leading-none">{t.reminderTitle}</h2>
              <p className="text-[11px] text-muted-foreground mt-1">
                {settings.reminder === 0
                  ? (t.reminderNone || "Désactivé")
                  : (t.reminderDelayText ? t.reminderDelayText.replace("{min}", String(settings.reminder)) : `${settings.reminder} min avant l'appel à la prière`)}
              </p>
            </div>
          </div>
        </div>

        {/* Timing segmented control */}
        <div className="p-1 rounded-2xl bg-secondary/70 dark:bg-slate-800/70 border border-border/50 grid grid-cols-4 gap-1">
          {([0, 5, 15, 30] as const).map((v) => {
            const isSelected = settings.reminder === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => update({ reminder: v })}
                className={`h-9 sm:h-10 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  isSelected
                    ? "bg-white dark:bg-slate-900 text-foreground shadow-xs font-bold border border-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-slate-700/40"
                }`}
                aria-pressed={isSelected}
              >
                {v === 0 ? (
                  <span className="flex items-center justify-center gap-1">
                    <BellOff className="size-3 shrink-0 opacity-70" />
                    <span>Off</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-0.5">
                    <span>{v}</span>
                    <span className="text-[10px] font-normal opacity-70">min</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground leading-snug">
          {settings.reminder === 0
            ? (t.autoAzan || "L'Azan complet retentit automatiquement à l'heure exacte de la prière.")
            : `Rappel envoyé ${settings.reminder} min avant chaque prière. ${t.autoAzan || ""}`}
        </p>

        {/* Reminder Mode Selector */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground">
              {t.reminderModeTitle || "Mode de rappel"}
            </h3>
            <span className="text-[10.5px] font-medium text-muted-foreground">
              {settings.reminderMode === "notification"
                ? (t.reminderModeNotifTitle || "Notification")
                : settings.reminderMode === "audio"
                  ? (t.reminderModeAudioTitle || "Audio")
                  : (t.reminderModeBothTitle || "Notif + Audio")}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* 1: Notification */}
            <div
              onClick={() => update({ reminderMode: "notification" })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  update({ reminderMode: "notification" });
                }
              }}
              className={`group relative rounded-2xl p-2 sm:p-2.5 flex flex-col items-center text-center transition-all duration-200 cursor-pointer border ${
                settings.reminderMode === "notification"
                  ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/80 shadow-xs ring-1 ring-amber-500/40"
                  : "bg-secondary/40 dark:bg-slate-800/40 border-border/60 hover:border-border hover:bg-secondary/60"
              }`}
            >
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-900/10">
                <img
                  src={notifBg}
                  alt="Notification"
                  referrerPolicy="no-referrer"
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />

                <div className="absolute top-1.5 left-1.5 size-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xs">
                  <Bell className="size-3" />
                </div>

                {settings.reminderMode === "notification" && (
                  <div className="absolute top-1.5 right-1.5 size-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="size-3 stroke-[3]" />
                  </div>
                )}
              </div>

              <span className="mt-2 text-xs font-semibold text-foreground tracking-tight line-clamp-1">
                {t.reminderModeNotifTitle || "Notification"}
              </span>

              <Link
                to="/reminder/notification"
                onClick={(e) => e.stopPropagation()}
                className="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 opacity-90 hover:opacity-100"
              >
                <span>{t.customize || "Modifier"}</span>
                <ChevronRight className="size-2.5" />
              </Link>
            </div>

            {/* 2: Audio */}
            <div
              onClick={() => update({ reminderMode: "audio" })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  update({ reminderMode: "audio" });
                }
              }}
              className={`group relative rounded-2xl p-2 sm:p-2.5 flex flex-col items-center text-center transition-all duration-200 cursor-pointer border ${
                settings.reminderMode === "audio"
                  ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/80 shadow-xs ring-1 ring-amber-500/40"
                  : "bg-secondary/40 dark:bg-slate-800/40 border-border/60 hover:border-border hover:bg-secondary/60"
              }`}
            >
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-900/10">
                <img
                  src={audioBg}
                  alt="Audio"
                  referrerPolicy="no-referrer"
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />

                <div className="absolute top-1.5 left-1.5 size-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xs">
                  <Volume2 className="size-3" />
                </div>

                {settings.reminderMode === "audio" && (
                  <div className="absolute top-1.5 right-1.5 size-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="size-3 stroke-[3]" />
                  </div>
                )}
              </div>

              <span className="mt-2 text-xs font-semibold text-foreground tracking-tight line-clamp-1">
                {t.reminderModeAudioTitle || "Audio"}
              </span>

              <Link
                to="/reminder/audio"
                onClick={(e) => e.stopPropagation()}
                className="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 opacity-90 hover:opacity-100"
              >
                <span>{t.customize || "Modifier"}</span>
                <ChevronRight className="size-2.5" />
              </Link>
            </div>

            {/* 3: Both */}
            <div
              onClick={() => update({ reminderMode: "both" })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  update({ reminderMode: "both" });
                }
              }}
              className={`group relative rounded-2xl p-2 sm:p-2.5 flex flex-col items-center text-center transition-all duration-200 cursor-pointer border ${
                settings.reminderMode === "both"
                  ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/80 shadow-xs ring-1 ring-amber-500/40"
                  : "bg-secondary/40 dark:bg-slate-800/40 border-border/60 hover:border-border hover:bg-secondary/60"
              }`}
            >
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-900/10">
                <img
                  src={comboBg}
                  alt="Notification + Audio"
                  referrerPolicy="no-referrer"
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />

                <div className="absolute top-1.5 left-1.5 h-6 px-1.5 rounded-full bg-black/40 backdrop-blur-md flex items-center gap-0.5 text-white border border-white/20 shadow-xs">
                  <Bell className="size-2.5" />
                  <Volume2 className="size-2.5" />
                </div>

                {settings.reminderMode === "both" && (
                  <div className="absolute top-1.5 right-1.5 size-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="size-3 stroke-[3]" />
                  </div>
                )}
              </div>

              <span className="mt-2 text-xs font-semibold text-foreground tracking-tight line-clamp-1">
                {t.reminderModeBothTitle || "Notif + Audio"}
              </span>

              <Link
                to="/reminder/combo"
                onClick={(e) => e.stopPropagation()}
                className="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 opacity-90 hover:opacity-100"
              >
                <span>{t.customize || "Modifier"}</span>
                <ChevronRight className="size-2.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Vocal / Notif Preview & Test */}
        <ReminderTestWidget />
      </section>

      {/* Interactive Page Tutorial Modal */}
      <PageTutorialModal
        pageId="prayers"
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
      />

      {/* Prayer Statistics Modal */}
      {showStatsModal && (
        <PrayerStatisticsModal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          stats={stats}
          todayDone={todayDone}
          onHistoryUpdated={(newHistory) => {
            const updated = newHistory[today] || [];
            update({ tracking: { date: today, done: updated } });
          }}
        />
      )}
    </div>
  );
}

function ReminderTestWidget() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const [speakerState, setSpeakerState] = useState<SpeakerState>({
    activeId: null,
    isPlaying: false,
    isLoading: false,
  });

  useEffect(() => {
    return subscribeSpeakerState(setSpeakerState);
  }, []);

  const resolved = resolveEffectiveReminder(settings, "Fajr", t);

  const isAudioMode = resolved.mode === "audio";
  const isBothMode = resolved.mode === "both";
  const isNotifMode = resolved.mode === "notification";

  const handleTest = () => {
    if (speakerState.isPlaying) {
      stopReminderSpeech();
      appToast.info(t.reminderStopped || "Rappel arrêté.", { category: "reminder" });
      return;
    }

    // MODE 1: Notification ONLY
    if (isNotifMode) {
      void sendSystemNotification(`${t.appName || "Islam-Noor"} — ${t.prayerReminderTitle || "Rappel de prière"}`, {
        body: resolved.notifText,
        tag: `test-rem-notif-${Date.now()}`,
      });
      appToast.info(resolved.notifText, {
        category: "reminder",
        duration: 5000,
        icon: <Bell className="size-4 text-emerald-500" />,
      });
      return;
    }

    // MODE 2: Audio ONLY
    if (isAudioMode) {
      appToast.success(t.playingAudioReminder || "Lecture du rappel vocal...", {
        category: "reminder",
      });
      speakReminderText("test-prayers-audio", resolved.audioText, resolved.isArabicAudio);
      return;
    }

    // MODE 3: Both (Notification + Audio)
    if (isBothMode) {
      void sendSystemNotification(`${t.appName || "Islam-Noor"} — ${t.prayerReminderTitle || "Rappel de prière"}`, {
        body: resolved.notifText,
        tag: `test-rem-both-${Date.now()}`,
      });
      appToast.info(resolved.notifText, {
        category: "reminder",
        duration: 5000,
        icon: <Bell className="size-4 text-emerald-500" />,
      });
      speakReminderText("test-prayers-combo", resolved.audioText, resolved.isArabicAudio);
    }
  };

  const testLabel = isAudioMode
    ? (t.reminderModeAudioTitle ? `${t.testWord || "Test"} ${t.reminderModeAudioTitle}` : "Test audio")
    : isBothMode
      ? (t.reminderModeBothTitle ? `${t.testWord || "Test"} ${t.reminderModeBothTitle}` : "Test notif & audio")
      : "Test notification";

  return (
    <div className="pt-1">
      <div
        onClick={handleTest}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleTest();
          }
        }}
        className="p-3 sm:p-3.5 rounded-2xl bg-secondary/50 dark:bg-slate-800/50 hover:bg-secondary/70 dark:hover:bg-slate-800/70 border border-border/60 flex items-center justify-between gap-3 shadow-xs cursor-pointer transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
            {isAudioMode ? (
              <Volume2 className="size-4" />
            ) : (
              <Bell className="size-4" />
            )}
          </div>
          <span className="text-xs sm:text-sm font-bold text-foreground truncate">
            {testLabel}
          </span>
        </div>

        <Button
          size="sm"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleTest();
          }}
          className={`shrink-0 h-8 px-3 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
            speakerState.isPlaying
              ? "bg-rose-500 hover:bg-rose-600 text-white"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {speakerState.isLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : speakerState.isPlaying ? (
            <>
              <Pause className="size-3.5 fill-current" />
              <span>{t.stopVocalBtn || "Arrêter"}</span>
            </>
          ) : isAudioMode ? (
            <>
              <Play className="size-3.5 fill-current ml-0.5" />
              <span>{t.testWord || "Tester"}</span>
            </>
          ) : (
            <>
              <Bell className="size-3.5" />
              <span>{t.testWord || "Tester"}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function formatAudioTime(secs: number): string {
  if (!secs || Number.isNaN(secs) || !Number.isFinite(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function ImamPicker() {
  const { t } = useI18n();
  const { settings, update } = useSettings();
  const [status, setStatus] = useState<AzanPlaybackStatus>({
    isPlaying: false,
    imamId: null,
    imamName: null,
    prayerName: null,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null,
  });

  // Subscribe to centralized Adhan audio engine
  useEffect(() => {
    const unsubscribe = subscribeAzanStatus((newStatus) => {
      setStatus(newStatus);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopAzan();
    };
  }, []);

  const handlePlayPause = async (imam: (typeof IMAMS)[number]) => {
    update({ imamId: imam.id });

    // 1. If this reciter is already the active playback target
    if (status.imamId === imam.id) {
      if (status.isPlaying) {
        pauseAzan();
      } else {
        await resumeAzan();
      }
      return;
    }

    // 2. Switching to a new reciter: playAzan immediately stops previous stream & starts new one
    try {
      await playAzan(imam, {
        prayerName: "Aperçu",
        onError: (err) => {
          appToast.error(err.message || t.audioStreamFailed || "Failed to load audio stream", {
            category: "reciter",
          });
        },
      });
    } catch {
      appToast.error(t.cannotPlayAzan || "Cannot play Azan for this reciter.", {
        category: "reciter",
      });
    }
  };

  const handleStop = () => {
    stopAzan();
  };

  const activeImam = IMAMS.find((im) => im.id === status.imamId);

  return (
    <div className="space-y-3">
      {/* Horizontal scrolling Imam cards */}
      <div className="no-scrollbar -mx-1 flex gap-2.5 sm:gap-3 overflow-x-auto px-1 pb-1 pt-0.5 scroll-smooth snap-x">
        {IMAMS.map((imam) => {
          const isSelectedSetting = settings.imamId === imam.id;
          const isActiveReciter = status.imamId === imam.id;
          const isThisLoading = isActiveReciter && status.isLoading;
          const isThisPlaying = isActiveReciter && status.isPlaying;

          return (
            <div
              key={imam.id}
              onClick={() => handlePlayPause(imam)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handlePlayPause(imam);
                }
              }}
              className={`group relative flex w-36 sm:w-40 shrink-0 flex-col items-center justify-between rounded-2xl p-3 text-center transition-all duration-200 cursor-pointer snap-start border select-none active:scale-[0.98] ${
                isSelectedSetting
                  ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/80 shadow-xs ring-1 ring-amber-500/30"
                  : "bg-secondary/40 dark:bg-slate-800/40 border-border/60 hover:border-border hover:bg-secondary/60"
              }`}
            >
              {/* Top row: Flag & Badges */}
              <div className="w-full flex items-center justify-between">
                <span className="text-2xl filter drop-shadow-xs">{imam.flag}</span>
                {isSelectedSetting && (
                  <span className="flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                    <Check className="size-2.5 stroke-[3]" />
                    <span>Actif</span>
                  </span>
                )}
                {!isSelectedSetting && isThisPlaying && (
                  <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs animate-pulse">
                    En cours
                  </span>
                )}
              </div>

              {/* Imam Names */}
              <div className="my-2.5 w-full">
                <p className="w-full truncate text-xs font-bold text-foreground tracking-tight">
                  {imam.name}
                </p>
                <p className="mt-0.5 w-full truncate text-[10px] text-muted-foreground">
                  {getImamCountry(t, imam)}
                </p>
              </div>

              {/* Action Button & Sound Wave */}
              <div className="w-full flex flex-col items-center gap-1.5">
                <div
                  className={`size-8 rounded-xl flex items-center justify-center transition-all duration-150 shadow-xs ${
                    isThisPlaying
                      ? "bg-emerald-500 text-white shadow-emerald-500/25"
                      : isSelectedSetting
                        ? "bg-amber-500 text-white shadow-amber-500/25"
                        : "bg-secondary dark:bg-slate-700/60 text-foreground group-hover:scale-105"
                  }`}
                >
                  {isThisLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : isThisPlaying ? (
                    <Pause className="size-3.5 fill-current" />
                  ) : (
                    <Play className="ml-0.5 size-3.5 fill-current" />
                  )}
                </div>

                {isThisPlaying && (
                  <div className="flex items-end justify-center gap-0.5 h-2.5">
                    <span className="w-0.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0ms] h-2.5" />
                    <span className="w-0.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:150ms] h-1.5" />
                    <span className="w-0.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:300ms] h-2" />
                    <span className="w-0.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:75ms] h-1" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini-player playback bar when playing or paused */}
      {status.imamId && (status.isPlaying || status.currentTime > 0) && (
        <div className="p-3 rounded-2xl bg-secondary/60 dark:bg-slate-800/60 border border-border/70 flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="size-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Volume2 className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-foreground truncate">
                  {status.imamName || activeImam?.name || "Azan"}
                </p>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {formatAudioTime(status.currentTime)} / {formatAudioTime(status.duration || 180)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200 rounded-full"
                  style={{
                    width: `${
                      status.duration > 0
                        ? Math.min(100, (status.currentTime / status.duration) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="size-8 rounded-xl bg-secondary dark:bg-slate-700 p-0 text-foreground hover:bg-secondary/80"
              onClick={() => {
                if (status.isPlaying) pauseAzan();
                else void resumeAzan();
              }}
              title={status.isPlaying ? "Pause" : "Lecture"}
            >
              {status.isPlaying ? (
                <Pause className="size-3.5 fill-current" />
              ) : (
                <Play className="size-3.5 fill-current ml-0.5" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="size-8 rounded-xl bg-secondary dark:bg-slate-700 p-0 text-foreground hover:bg-secondary/80"
              onClick={handleStop}
              title={t.stop || "Arrêter"}
            >
              <Square className="size-3 fill-current" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
