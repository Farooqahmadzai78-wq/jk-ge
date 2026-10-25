import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Edit3, MessageSquare, Sparkles, X } from "lucide-react";
import { appToast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/app-settings";
import { useI18n } from "@/lib/i18n";
import {
  getNotifTemplates,
  isArabicText,
  renderTemplate,
  resolveEffectiveReminder,
} from "@/lib/reminder-data";
import { sendSystemNotification } from "@/lib/sw-register";
import { PageTutorialModal, usePageTutorial } from "@/components/PageTutorialModal";
import { PageTutorialButton } from "@/components/PageTutorialButton";

type NotificationSearch = {
  from?: string;
};

export const Route = createFileRoute("/reminder/notification")({
  validateSearch: (search: Record<string, unknown>): NotificationSearch => {
    return {
      from: typeof search.from === "string" ? search.from : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Modèles de notification — Islam-Noor" },
      {
        name: "description",
        content: "Choisissez ou écrivez le message de rappel affiché avant l'adhan.",
      },
      { property: "og:title", content: "Modèles de notification — Islam-Noor" },
      { property: "og:description", content: "Personnalisez le rappel avant l'adhan." },
    ],
  }),
  component: NotificationTemplatesPage,
});

function NotificationTemplatesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const fromCombo = search.from === "combo";
  const { t } = useI18n();
  const { settings, update } = useSettings();
  const {
    isOpen: isTutorialOpen,
    openTutorial: handleOpenTutorial,
    closeTutorial: handleCloseTutorial,
  } = usePageTutorial("reminder");

  const [customText, setCustomText] = useState(settings.customNotifText || "");
  const isCustomActive = settings.notifTemplate === "custom";
  const [previewPrayer, setPreviewPrayer] = useState("Fajr");

  const handleBack = () => {
    if (fromCombo) {
      navigate({ to: "/reminder/combo" });
    } else if (search.from === "reminder") {
      navigate({ to: "/reminder" });
    } else if (search.from === "settings") {
      navigate({ to: "/settings" });
    } else {
      navigate({ to: "/prayers" });
    }
  };

  const handleSelectTemplate = (tplId: string) => {
    update({ notifTemplate: tplId });
  };

  const handleSelectCustom = () => {
    const textToUse = customText.trim();
    update({ notifTemplate: "custom", customNotifText: textToUse });
    if (!customText.trim()) {
      setCustomText(textToUse);
    }
  };

  const handleCustomChange = (val: string) => {
    setCustomText(val);
    update({ notifTemplate: "custom", customNotifText: val });
  };

  const insertVariable = (variable: string) => {
    handleSelectCustom();
    const updated = customText ? `${customText} ${variable}` : variable;
    handleCustomChange(updated);
  };

  const handleTestNotification = async () => {
    const resolved = resolveEffectiveReminder(settings, previewPrayer, t);
    await sendSystemNotification("Islam-Noor — Test Notification", {
      body: resolved.notifText,
      tag: "test-reminder-notif",
    });
    appToast.info(resolved.notifText, {
      category: "reminder",
      duration: 4000,
      icon: <MessageSquare className="size-4 text-emerald-500" />,
    });
  };

  const handleValidate = () => {
    if (isCustomActive && customText.trim()) {
      update({ customNotifText: customText.trim(), notifTemplate: "custom" });
    }
    if (fromCombo) {
      appToast.success(t.notifSaved || "Notification saved", {
        category: "reminder",
      });
      navigate({ to: "/reminder/combo" });
    } else if (search.from === "reminder") {
      appToast.success(t.notifSaved || "Notification enregistrée", {
        category: "reminder",
      });
      navigate({ to: "/reminder" });
    } else if (search.from === "settings") {
      appToast.success(t.notifSaved || "Notification saved", {
        category: "reminder",
      });
      navigate({ to: "/settings" });
    } else {
      update({ reminderMode: "notification" });
      appToast.success(t.notifSaved || "Notification saved", {
        category: "reminder",
      });
      navigate({ to: "/prayers" });
    }
  };

  const currentPreview = resolveEffectiveReminder(settings, previewPrayer, t).notifText;


  return (
    <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-8 max-w-lg mx-auto">
      <header className="relative flex items-center justify-between py-2">
        <button
          aria-label={t.back}
          onClick={handleBack}
          className="grid size-9 place-items-center rounded-full hover:bg-card/40 transition-colors"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-extrabold">{t.notifTemplatesTitle}</h1>
        <PageTutorialButton onClick={handleOpenTutorial} variant="pill" />
      </header>

      <p className="mt-2 text-xs text-center text-muted-foreground">{t.notifTemplatesSub}</p>

      {/* Live Preview Box */}
      <div className="mt-4 p-4 rounded-3xl bg-card/70 border border-border shadow-sm flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500" /> {t.dynamicPreview || "Aperçu dynamique"}
          </span>
          <button
            type="button"
            onClick={handleTestNotification}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
          >
            {t.testAlert || "Tester l'alerte"}
          </button>
        </div>

        {/* Prayer preview tabs */}
        <div className="grid grid-cols-5 gap-1 p-1 bg-secondary/50 rounded-xl">
          {["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].map((p) => {
            const isSel = previewPrayer === p;
            const pKey = p.toLowerCase() as "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
            const prayerLabel = t[pKey] || p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPreviewPrayer(p)}
                className={`py-1 text-[11px] font-extrabold rounded-lg transition-colors cursor-pointer ${
                  isSel
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {prayerLabel}
              </button>
            );
          })}
        </div>

        <div className="p-3.5 rounded-2xl bg-background border border-border/80 text-xs sm:text-sm font-semibold leading-relaxed shadow-2xs">
          {currentPreview}
        </div>
      </div>

      {/* Section: Custom Text Option */}
      <div className="mt-5 space-y-2">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
          {t.customOption || "Option personnalisée"}
        </h2>

        <div
          onClick={handleSelectCustom}
          className={`cursor-pointer rounded-3xl border transition-all p-4 ${
            isCustomActive
              ? "border-amber-500 bg-amber-500/5 shadow-sm ring-1 ring-amber-500/30"
              : "border-border bg-card/40 hover:bg-card/70"
          }`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Edit3 className="size-4 text-amber-500" />
              <span className="text-sm font-extrabold">{t.writeOwnMessage || "Rédiger votre propre message"}</span>
            </div>
            <span
              className={`grid size-5 place-items-center rounded-full border ${
                isCustomActive
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-card border-border"
              }`}
            >
              {isCustomActive && <Check className="size-3.5 stroke-[3]" />}
            </span>
          </div>

          <textarea
            value={customText}
            onChange={(e) => handleCustomChange(e.target.value)}
            onFocus={() => handleSelectCustom()}
            placeholder={t.customNotifPlaceholder || "Ex: 🕌 C'est bientôt l'heure de prier ({prayer}). Préparez-vous !"}
            rows={2}
            className="w-full text-xs sm:text-sm p-3 rounded-2xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-medium leading-relaxed"
            dir={isArabicText(customText) ? "rtl" : "ltr"}
          />

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{t.insertVariable || "Insérer :"}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  insertVariable("{prayer}");
                }}
                className="px-2 py-0.5 rounded-lg bg-secondary hover:bg-secondary/80 text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 border border-border/60 transition-colors"
              >
                +{"{prayer}"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  insertVariable("{min}");
                }}
                className="px-2 py-0.5 rounded-lg bg-secondary hover:bg-secondary/80 text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 border border-border/60 transition-colors"
              >
                +{"{min}"}
              </button>
            </div>

            {customText.trim() && (
              <button
                type="button"
                onClick={() => {
                  setCustomText("");
                  update({ customNotifText: "" });
                }}
                className="text-[11px] font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="size-3" />
                {t.clearField || "Effacer"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section: Preset Templates */}
      <div className="mt-6 space-y-2.5">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
          {t.presetTemplates || "Modèles prédéfinis"}
        </h2>

        <ul className="space-y-2.5">
          {getNotifTemplates(t).map((tpl) => {
            const active = settings.notifTemplate === tpl.id;
            const rendered = renderTemplate(tpl.text, "Fajr", settings.reminder || 15);

            return (
              <li key={tpl.id}>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate(tpl.id)}
                  className={`glass flex w-full items-center gap-3 p-3 text-left transition-all ${
                    active ? "ring-2 ring-[var(--halal)] bg-[var(--halal)]/10" : ""
                  }`}
                >
                  <span className="text-lg shrink-0">{tpl.icon}</span>
                  <span
                    className={`flex-1 text-[13px] leading-snug font-medium ${
                      tpl.arabic ? "font-[var(--font-arabic)] text-base font-bold text-right" : ""
                    }`}
                    dir={tpl.arabic ? "rtl" : "ltr"}
                  >
                    {rendered}
                  </span>
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full border border-border ${
                      active ? "bg-[var(--halal)] text-white" : "bg-card text-foreground"
                    }`}
                  >
                    {active && <Check className="size-4" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <Button
        type="button"
        variant="default"
        onClick={handleValidate}
        className="mt-6 w-full py-6 text-center text-base font-semibold rounded-2xl shadow-md"
      >
        {t.validateNotif || "Enregistrer ce rappel"}
      </Button>

      {/* Interactive Page Tutorial Modal */}
      <PageTutorialModal
        pageId="reminder"
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
      />
    </div>
  );
}
