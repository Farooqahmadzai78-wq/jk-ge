import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  Info,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { appToast } from "@/lib/app-toast";
import notifBg from "@/assets/images/reminder_notif_new_1786270350765.jpg";
import audioBg from "@/assets/images/reminder_audio_new_1786270363968.jpg";
import comboBg from "@/assets/images/reminder_combo_new_1786270378486.jpg";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useI18n, isRtl } from "@/lib/i18n";
import { useSettings } from "@/lib/app-settings";
import { getWidgetThemeById } from "@/lib/customization-themes";
import { resolveEffectiveReminder } from "@/lib/reminder-data";
import {
  speakReminderText,
  stopReminderSpeech,
  subscribeSpeakerState,
  type SpeakerState,
} from "@/lib/reminder-speaker";
import { sendSystemNotification } from "@/lib/sw-register";
import { PageTutorialModal, usePageTutorial } from "@/components/PageTutorialModal";
import { PageTutorialButton } from "@/components/PageTutorialButton";

type ReminderSearch = {
  from?: string;
};

export const Route = createFileRoute("/reminder/")({
  validateSearch: (search: Record<string, unknown>): ReminderSearch => {
    return {
      from: typeof search.from === "string" ? search.from : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Rappel avant l'Azan — Islam-Noor" },
      {
        name: "description",
        content:
          "Configurez votre rappel visuel et vocal avant l'appel à la prière : délai, messages personnalisés et invocations.",
      },
      { property: "og:title", content: "Rappel avant l'Azan — Islam-Noor" },
      {
        property: "og:description",
        content:
          "Ne manquez plus aucune prière grâce aux rappels intelligents avant chaque Azan.",
      },
    ],
  }),
  component: ReminderHubPage,
});

function ReminderHubPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { t, locale } = useI18n();
  const rtl = isRtl(locale);
  const { settings, update } = useSettings();
  const activeWidgetTheme = getWidgetThemeById(settings.widgetTheme);

  const {
    isOpen: isTutorialOpen,
    openTutorial: handleOpenTutorial,
    closeTutorial: handleCloseTutorial,
  } = usePageTutorial("reminder");

  const [speakerState, setSpeakerState] = useState<SpeakerState>({
    activeId: null,
    isPlaying: false,
    isLoading: false,
  });

  useEffect(() => {
    const unsub = subscribeSpeakerState(setSpeakerState);
    return () => {
      unsub();
      stopReminderSpeech();
    };
  }, []);

  const isEnabled = settings.reminder > 0;
  const resolved = resolveEffectiveReminder(settings, "Fajr", t);

  const handleBack = () => {
    stopReminderSpeech();
    if (search.from === "settings") {
      navigate({ to: "/settings" });
    } else {
      navigate({ to: "/prayers" });
    }
  };

  const handleToggleEnable = (enabled: boolean) => {
    if (enabled) {
      update({ reminder: 15 });
      appToast.success(t.r15 || "Rappel activé (15 min avant)", { category: "reminder" });
    } else {
      update({ reminder: 0 });
      stopReminderSpeech();
      appToast.info(t.reminderNone || "Rappel désactivé", { category: "reminder" });
    }
  };

  const handleSelectDelay = (delay: 0 | 5 | 15 | 30) => {
    update({ reminder: delay });
    if (delay === 0) {
      stopReminderSpeech();
      appToast.info(t.reminderNone || "Rappel désactivé", { category: "reminder" });
    } else {
      const label =
        delay === 5 ? t.r5 : delay === 15 ? t.r15 : t.r30;
      appToast.success(label || `${delay} min avant`, { category: "reminder" });
    }
  };

  const handleSelectMode = (mode: "notification" | "audio" | "both") => {
    update({ reminderMode: mode });
    stopReminderSpeech();
    const modeLabel =
      mode === "notification"
        ? t.reminderModeNotifTitle || "Notification"
        : mode === "audio"
          ? t.reminderModeAudioTitle || "Audio"
          : t.reminderModeBothTitle || "Notification + Audio";
    appToast.success(`${t.reminderModeTitle || "Mode"} : ${modeLabel}`, {
      category: "reminder",
    });
  };

  const handleLiveTest = async () => {
    if (speakerState.isPlaying) {
      stopReminderSpeech();
      appToast.info(t.reminderStopped || "Rappel arrêté", { category: "reminder" });
      return;
    }

    const notifTitle = `${t.appName || "Islam-Noor"} — ${t.prayerReminderNotificationTitle || "Rappel de prière"}`;

    if (settings.reminderMode === "notification") {
      try {
        void sendSystemNotification(notifTitle, {
          body: resolved.notifText,
          tag: `test-rem-notif-${Date.now()}`,
        });
      } catch {
        // ignore
      }
      appToast.info(resolved.notifText, {
        category: "reminder",
        duration: 5000,
        icon: <Bell className="size-4 text-emerald-500" />,
      });
      return;
    }

    if (settings.reminderMode === "audio") {
      appToast.success(t.playingAudioReminder || "Lecture du rappel vocal...", {
        category: "reminder",
      });
      speakReminderText("hub-audio-test", resolved.audioText, resolved.isArabicAudio);
      return;
    }

    // Both
    try {
      void sendSystemNotification(notifTitle, {
        body: resolved.notifText,
        tag: `test-rem-both-${Date.now()}`,
      });
    } catch {
      // ignore
    }
    appToast.info(resolved.notifText, {
      category: "reminder",
      duration: 5000,
      icon: <Bell className="size-4 text-emerald-500" />,
    });
    speakReminderText("hub-combo-test", resolved.audioText, resolved.isArabicAudio);
  };

  const isTestingCurrent =
    speakerState.isPlaying &&
    (speakerState.activeId === "hub-audio-test" ||
      speakerState.activeId === "hub-combo-test");

  return (
    <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-16 max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Bar */}
      <header className="flex items-center justify-between py-1">
        <button
          type="button"
          aria-label={t.back || "Retour"}
          onClick={handleBack}
          className="grid size-10 place-items-center rounded-2xl bg-secondary/80 text-foreground transition active:scale-95 cursor-pointer hover:bg-secondary"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="text-center min-w-0 px-2 flex-1">
          <h1 className="text-lg font-black tracking-tight text-foreground truncate">
            {t.reminderTitle || "Rappel avant l'Azan"}
          </h1>
          <p className="text-[11px] font-medium text-muted-foreground truncate">
            {isEnabled
              ? `${settings.reminder} min avant l'appel à la prière`
              : t.reminderNone || "Aucun rappel"}
          </p>
        </div>

        <PageTutorialButton onClick={handleOpenTutorial} variant="pill" />
      </header>

      {/* 2. Hero Status Widget Card */}
      <section
        data-widget-card
        className={`relative overflow-hidden rounded-[28px] p-5 text-white shadow-md border border-white/20 transition-all duration-300 ${
          activeWidgetTheme.animClass || ""
        }`}
        style={{
          background:
            activeWidgetTheme.gradient ||
            `linear-gradient(135deg, ${activeWidgetTheme.from}, ${activeWidgetTheme.to})`,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/90">
              <Clock className="size-3.5" />
              <span>{t.reminderBeforeAdhan || "Rappel avant l'adhan"}</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {isEnabled ? `${settings.reminder} minutes` : t.reminderNone || "Désactivé"}
            </h2>
            <p className="text-xs text-white/90 font-medium line-clamp-1">
              {isEnabled
                ? `Mode : ${
                    settings.reminderMode === "notification"
                      ? "Notification visuelle"
                      : settings.reminderMode === "audio"
                        ? "Rappel vocal"
                        : "Notification + Vocal"
                  }`
                : "Activez un rappel pour vous préparer avant l'azan"}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggleEnable}
              className="scale-110 data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
              aria-label="Activer le rappel"
            />
            <span className="text-[10px] font-bold text-white/80">
              {isEnabled ? "Actif" : "Inactif"}
            </span>
          </div>
        </div>

        {/* Dynamic preview excerpt */}
        {isEnabled && (
          <div className="mt-4 pt-3.5 border-t border-white/20 flex items-center justify-between gap-3 text-xs text-white/95">
            <div className="flex items-center gap-2 min-w-0">
              <span className="size-2 rounded-full bg-emerald-300 shrink-0" />
              <span className="truncate italic">
                {settings.reminderMode === "audio"
                  ? resolved.audioLabel
                  : resolved.notifText}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLiveTest}
              className="shrink-0 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-[11px] font-extrabold text-white transition active:scale-95"
            >
              {isTestingCurrent ? "Arrêter" : "Tester"}
            </button>
          </div>
        )}
      </section>

      {/* 3. Delay Picker (Minutes avant l'Azan) */}
      <section
        data-widget-card
        className="rounded-3xl p-5 bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-amber-500" />
            <h3 className="text-sm font-extrabold text-foreground">
              Délai d'anticipation
            </h3>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            Avant chaque prière
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-1">
          {([0, 5, 15, 30] as const).map((mins) => {
            const isSelected = settings.reminder === mins;
            const label =
              mins === 0 ? "Off" : `${mins} min`;

            return (
              <button
                key={mins}
                type="button"
                onClick={() => handleSelectDelay(mins)}
                className={`py-3 px-2 rounded-2xl font-extrabold text-xs transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-1 border ${
                  isSelected
                    ? "bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/30"
                    : "bg-secondary/60 hover:bg-secondary text-foreground border-border/70"
                }`}
              >
                <span className="text-sm">{mins === 0 ? "✕" : mins}</span>
                <span className="text-[10px] opacity-90">{label}</span>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
          {t.autoAzan || "L'Azan complet se déclenchera automatiquement à l'heure exacte de la prière."}
        </p>
      </section>

      {/* 4. Reminder Mode Selector (3 Master Interactive Cards) */}
      <section
        data-widget-card
        className="rounded-3xl p-5 bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-emerald-500" />
            <h3 className="text-sm font-extrabold text-foreground">
              {t.reminderModeTitle || "Mode de rappel"}
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            3 options au choix
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Notification */}
          <div
            onClick={() => handleSelectMode("notification")}
            className={`group relative rounded-2xl p-3 flex flex-col justify-between border-2 transition-all cursor-pointer overflow-hidden ${
              settings.reminderMode === "notification"
                ? "border-amber-500 bg-amber-500/5 shadow-md"
                : "border-border/70 hover:border-border bg-card/60"
            }`}
          >
            <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden mb-2.5">
              <img
                src={notifBg}
                alt="Notification"
                referrerPolicy="no-referrer"
                className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 size-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                <Bell className="size-3.5 fill-white/30" />
              </div>
              {settings.reminderMode === "notification" && (
                <div className="absolute top-2 right-2 size-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Check className="size-3.5 stroke-[3]" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-extrabold text-foreground">
                {t.reminderModeNotifTitle || "Notification"}
              </h4>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                Message silencieux avec nom de la prière et délai.
              </p>
            </div>

            <Link
              to="/reminder/notification"
              search={{ from: "reminder" }}
              onClick={(e) => e.stopPropagation()}
              className="mt-3 py-1.5 px-2.5 rounded-xl bg-secondary/80 hover:bg-secondary text-[11px] font-bold text-foreground flex items-center justify-between transition-colors"
            >
              <span>Personnaliser texte</span>
              <ChevronRight className="size-3 text-muted-foreground" />
            </Link>
          </div>

          {/* Card 2: Audio */}
          <div
            onClick={() => handleSelectMode("audio")}
            className={`group relative rounded-2xl p-3 flex flex-col justify-between border-2 transition-all cursor-pointer overflow-hidden ${
              settings.reminderMode === "audio"
                ? "border-amber-500 bg-amber-500/5 shadow-md"
                : "border-border/70 hover:border-border bg-card/60"
            }`}
          >
            <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden mb-2.5">
              <img
                src={audioBg}
                alt="Audio"
                referrerPolicy="no-referrer"
                className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 size-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                <Volume2 className="size-3.5" />
              </div>
              {settings.reminderMode === "audio" && (
                <div className="absolute top-2 right-2 size-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Check className="size-3.5 stroke-[3]" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-extrabold text-foreground">
                {t.reminderModeAudioTitle || "Audio"}
              </h4>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                Invocation chantée ou rappel vocal doux.
              </p>
            </div>

            <Link
              to="/reminder/audio"
              search={{ from: "reminder" }}
              onClick={(e) => e.stopPropagation()}
              className="mt-3 py-1.5 px-2.5 rounded-xl bg-secondary/80 hover:bg-secondary text-[11px] font-bold text-foreground flex items-center justify-between transition-colors"
            >
              <span>Choisir la voix</span>
              <ChevronRight className="size-3 text-muted-foreground" />
            </Link>
          </div>

          {/* Card 3: Both */}
          <div
            onClick={() => handleSelectMode("both")}
            className={`group relative rounded-2xl p-3 flex flex-col justify-between border-2 transition-all cursor-pointer overflow-hidden ${
              settings.reminderMode === "both"
                ? "border-amber-500 bg-amber-500/5 shadow-md"
                : "border-border/70 hover:border-border bg-card/60"
            }`}
          >
            <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden mb-2.5">
              <img
                src={comboBg}
                alt="Notification + Audio"
                referrerPolicy="no-referrer"
                className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 px-1.5 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center gap-1 text-white">
                <Bell className="size-3 fill-white/30" />
                <Volume2 className="size-3" />
              </div>
              {settings.reminderMode === "both" && (
                <div className="absolute top-2 right-2 size-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Check className="size-3.5 stroke-[3]" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-extrabold text-foreground">
                {t.reminderModeBothTitle || "Notification + Audio"}
              </h4>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                Le duo complet pour une sérénité maximale.
              </p>
            </div>

            <Link
              to="/reminder/combo"
              search={{ from: "reminder" }}
              onClick={(e) => e.stopPropagation()}
              className="mt-3 py-1.5 px-2.5 rounded-xl bg-secondary/80 hover:bg-secondary text-[11px] font-bold text-foreground flex items-center justify-between transition-colors"
            >
              <span>Gérer le combiné</span>
              <ChevronRight className="size-3 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Live Test & Demonstration Bar */}
      <section
        data-widget-card
        className="rounded-3xl p-5 bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
              <Sparkles className="size-4 text-amber-500" />
              <span>Tester le rappel maintenant</span>
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {settings.reminderMode === "notification"
                ? "Déclenche une notification d'essai"
                : settings.reminderMode === "audio"
                  ? `Joue la voix sélectionnée : ${resolved.audioLabel}`
                  : `Notification + voix : ${resolved.audioLabel}`}
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleLiveTest}
            className="shrink-0 h-10 px-4 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            {speakerState.isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isTestingCurrent ? (
              <>
                <Pause className="size-4 fill-current" />
                <span>Arrêter</span>
              </>
            ) : settings.reminderMode === "notification" ? (
              <>
                <Bell className="size-4 fill-current" />
                <span>Tester</span>
              </>
            ) : (
              <>
                <Play className="size-4 fill-current ml-0.5" />
                <span>Écouter</span>
              </>
            )}
          </Button>
        </div>
      </section>

      {/* 6. Spiritual Advice & Preparation Tips */}
      <section
        data-widget-card
        className="rounded-3xl p-5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-3 text-xs"
      >
        <div className="flex items-center gap-2 text-foreground font-bold">
          <ShieldCheck className="size-4 text-emerald-500" />
          <span>Conseils de préparation</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Le rappel avant l'Azan vous aide à interrompre sereinement vos activités,
          accomplir vos ablutions avec présence de cœur et réciter le dhikr avant
          d'entrer en prière.
        </p>
      </section>

      {/* Interactive Page Tutorial Modal */}
      <PageTutorialModal
        pageId="reminder"
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
      />
    </div>
  );
}
