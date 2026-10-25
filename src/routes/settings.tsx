import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { appToast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarCropper } from "@/components/AvatarCropper";
import { BatteryCharging, Bell, Bug, Camera, Check, ChevronRight, Code2, Crown, Heart, Info, Layers, Pencil, QrCode, RotateCcw, Share2, ShieldCheck, Smartphone, Sparkles, Trash2, User, Vibrate, Volume2, X } from "lucide-react";
import { useSettings } from "@/lib/app-settings";
import { getWidgetThemeById } from "@/lib/customization-themes";
import { CustomizationOverview } from "@/components/customization/CustomizationOverview";
import { SettingsCustomizationHint } from "@/components/AppFeatureHints";
import { LOCALE_LABELS, LOCALES, useI18n, type LocaleCode } from "@/lib/i18n";
import { IMAMS } from "@/lib/nur-data";
import { PageTutorialModal, usePageTutorial } from "@/components/PageTutorialModal";
import { PageTutorialButton } from "@/components/PageTutorialButton";
import { CALC_METHODS, SCHOOLS } from "@/lib/prayer-times";
import { resolveEffectiveReminder } from "@/lib/reminder-data";
import {
  openSubmitReportInExternalBrowser,
  openBugReportInExternalBrowser,
  triggerBugNotificationCheck,
} from "@/lib/bug-tracker-client";
import { ShareAppModal } from "@/components/ShareAppModal";
import { openOnboardingGuide, resetOnboardingCompleted } from "@/lib/onboarding-state";
import { PREMIUM_ENABLED, usePremium } from "@/lib/premium";
import { requestNotificationPermission } from "@/lib/local-notifications";
import { useSecondaryView } from "@/lib/navigation-context";
import { applySavedProfilePhotoChange } from "@/lib/ad-system";
import { VoluntarySupportSection } from "@/components/VoluntarySupportSection";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Réglages — Islam-Noor" },
      {
        name: "description",
        content:
          "Langue, thème, couleurs des widgets et du fond, muezzin, rappels et méthode de calcul des horaires.",
      },
      { property: "og:title", content: "Réglages — Islam-Noor" },
      {
        property: "og:description",
        content: "Personnalisez entièrement votre application Islam-Noor.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  const { settings, update } = useSettings();
  const { isPremium } = usePremium();
  const {
    isOpen: isTutorialOpen,
    openTutorial: handleOpenTutorial,
    closeTutorial: handleCloseTutorial,
  } = usePageTutorial("settings");

  // Modals
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);

  const profileFirstName = settings.profileName?.trim();
  const hasFirstName = Boolean(
    profileFirstName && profileFirstName !== "Utilisateur" && profileFirstName !== "User",
  );
  const displayProfileName = hasFirstName ? profileFirstName : "";
  const [nameInput, setNameInput] = useState(hasFirstName ? profileFirstName : "");
  const [isSubPageOpen, setIsSubPageOpen] = useState(false);
  useSecondaryView("settings-customization", isSubPageOpen);

  const activeWidgetTheme = getWidgetThemeById(settings.widgetTheme);

  const handleCroppedAvatar = (blob: Blob) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const hasChanged = Boolean(dataUrl) && dataUrl !== settings.profileAvatarUrl;
      appToast.success(t.photoUpdatedToast || "Profile photo updated locally!", {
        category: "settings",
      });
      void applySavedProfilePhotoChange(
        () => {
          update({ profileAvatarUrl: dataUrl });
        },
        { isPremium, hasChanged },
      );
    };
    reader.readAsDataURL(blob);
    setPendingFile(null);
  };

  const handleDeleteAvatar = () => {
    update({ profileAvatarUrl: "" });
    appToast.info(t.photoDeletedToast || "Profile photo deleted.", {
      category: "settings",
    });
  };

  const handleSaveName = () => {
    const clean = nameInput.trim();
    update({ profileName: clean });
    setIsEditingName(false);
    appToast.success(t.nameUpdatedToast || "Name updated!", {
      category: "settings",
    });
  };

  return (
    <div className="space-y-6 px-4 pt-[max(1rem,env(safe-area-inset-top))] max-w-2xl mx-auto pb-12">
      {!isSubPageOpen && (
        <div
          data-widget-card
          className="relative rounded-[32px] p-5 sm:p-6 bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-200/60 dark:divide-slate-800 space-y-4 overflow-hidden"
        >
          {/* User Local Profile */}
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div className="flex items-center gap-3.5">
              <label className="relative cursor-pointer shrink-0 group">
                <Avatar className="size-16 border-2 border-amber-500/30 shadow-md">
                  <AvatarImage src={settings.profileAvatarUrl} alt="" className="object-cover" />
                  <AvatarFallback
                    className="bg-amber-500/10 text-amber-500 text-lg font-black"
                    suppressHydrationWarning
                  >
                    {hasFirstName ? profileFirstName[0].toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full bg-amber-500 text-slate-950 shadow-md border-2 border-background">
                  <Camera className="size-3.5" />
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) setPendingFile(file);
                  }}
                />
              </label>

              <div className="min-w-0 flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder={t.firstNamePlaceholder || "Votre prénom"}
                      maxLength={30}
                      className="h-9 text-xs font-bold w-44 rounded-xl border-amber-500/40 focus-visible:ring-amber-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") setIsEditingName(false);
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-9 px-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl"
                      onClick={handleSaveName}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 px-2 text-xs rounded-xl"
                      onClick={() => setIsEditingName(false)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : hasFirstName ? (
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base sm:text-lg font-black text-foreground">
                      {profileFirstName}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setNameInput(profileFirstName);
                        setIsEditingName(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                      title="Modifier le prénom"
                    >
                      <Pencil className="size-3" />
                      <span>{t.edit || "Modifier"}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput("");
                      setIsEditingName(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-xs transition-colors cursor-pointer border border-amber-500/20"
                  >
                    <Pencil className="size-3.5" />
                    <span>{t.addFirstName || "Ajouter votre prénom"}</span>
                  </button>
                )}
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <User className="size-3 text-emerald-500" />
                  {t.profileLocalSaved || "Profil enregistré localement"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <PageTutorialButton onClick={handleOpenTutorial} variant="pill" />
              {settings.profileAvatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteAvatar}
                  className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5 rounded-xl h-8"
                >
                  <Trash2 className="size-3.5" />
                  {t.deletePhoto || "Supprimer"}
                </Button>
              )}
            </div>
          </section>

          {/* Settings Options (Mode sombre, Notifications, Langue) */}
          <div className="pt-4 space-y-2" data-tour="settings-notifications">
            <Row label={t.darkMode}>
              <Switch
                checked={settings.dark}
                onCheckedChange={(v) => update({ dark: v })}
                style={settings.dark ? { backgroundColor: activeWidgetTheme.from } : undefined}
              />
            </Row>
            <div className="pt-2">
              <Row label={t.notifications}>
                <Switch
                  id="settings-notifications-switch"
                  checked={settings.notifications}
                  onCheckedChange={async (v) => {
                    if (v) {
                      // Sur Android, la demande d'autorisation passe par le
                      // plugin natif (l'API Notification du navigateur est
                      // inerte dans la WebView).
                      const permission = await requestNotificationPermission();
                      if (permission === "denied") {
                        update({ notifications: false });
                        appToast.error(
                          t.notificationsDenied ||
                            "Notifications bloquées dans les paramètres du navigateur",
                          { category: "settings" },
                        );
                        return;
                      }
                      update({ notifications: true });
                      appToast.success(t.notifOn || "Notifications activées", {
                        category: "settings",
                      });
                    } else {
                      update({ notifications: false });
                      appToast.info(t.notifOff || "Notifications désactivées", {
                        category: "settings",
                      });
                    }
                  }}
                  style={
                    settings.notifications ? { backgroundColor: activeWidgetTheme.from } : undefined
                  }
                />
              </Row>
            </div>
            <div className="pt-2">
              <Row label={t.languageLabel}>
                <Select
                  value={settings.language}
                  onValueChange={(v) => update({ language: v as LocaleCode })}
                >
                  <SelectTrigger
                    className="w-44 font-bold border rounded-xl transition-all"
                    style={{
                      borderColor: `${activeWidgetTheme.from}80`,
                      boxShadow: `0 0 0 1px ${activeWidgetTheme.from}20`,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LOCALES) as LocaleCode[]).map((code) => {
                      const isSel = settings.language === code;
                      return (
                        <SelectItem
                          key={code}
                          value={code}
                          style={
                            isSel
                              ? {
                                  background: activeWidgetTheme.gradient || activeWidgetTheme.from,
                                  color: activeWidgetTheme.fg,
                                  fontWeight: "bold",
                                }
                              : undefined
                          }
                        >
                          {LOCALE_LABELS[code]}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Row>
            </div>
            <div className="pt-2">
              <Row label={t.timeFormatLabel || "Format de l'heure"}>
                <Select
                  value={settings.timeFormat || "auto"}
                  onValueChange={(v) => update({ timeFormat: v as "auto" | "12h" | "24h" })}
                >
                  <SelectTrigger
                    className="w-44 font-bold border rounded-xl transition-all"
                    style={{
                      borderColor: `${activeWidgetTheme.from}80`,
                      boxShadow: `0 0 0 1px ${activeWidgetTheme.from}20`,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { value: "auto", label: t.timeFormatAuto || "Automatique (selon langue)" },
                      { value: "24h", label: t.timeFormat24h || "24 heures (14:30)" },
                      { value: "12h", label: t.timeFormat12h || "12 heures (02:30 PM)" },
                    ].map((opt) => {
                      const isSel = (settings.timeFormat || "auto") === opt.value;
                      return (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          style={
                            isSel
                              ? {
                                  background: activeWidgetTheme.gradient || activeWidgetTheme.from,
                                  color: activeWidgetTheme.fg,
                                  fontWeight: "bold",
                                }
                              : undefined
                          }
                        >
                          {opt.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Row>
            </div>
          </div>

          <AvatarCropper
            file={pendingFile}
            open={pendingFile !== null}
            onCancel={() => setPendingFile(null)}
            onCropped={handleCroppedAvatar}
          />
        </div>
      )}

      {/* Feature Guide Hint: Customization widgets, background & glowing borders */}
      {!isSubPageOpen && (
        <SettingsCustomizationHint
          onExplore={() => {
            const el = document.getElementById("customization-overview-container");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}

      {/* Personnalisation System */}
      <div id="customization-overview-container" data-tour="settings-customization">
        <CustomizationOverview onSubPageOpen={setIsSubPageOpen} />
      </div>

      {!isSubPageOpen && (
        <>
          {/* Soutien volontaire & Thèmes premium évolutifs */}
          <VoluntarySupportSection />
          {/* 1. Apparence & Ergonomie */}
          <Card data-tour="settings-appearance">
            <div
              className={`widget relative p-3 rounded-2xl flex items-center gap-2.5 shadow-md border border-white/20 mb-2 transition-all duration-500 ease-in-out ${
                activeWidgetTheme.animClass || ""
              }`}
              style={{
                background:
                  activeWidgetTheme.gradient ||
                  `linear-gradient(135deg, ${activeWidgetTheme.from}, ${activeWidgetTheme.to})`,
                color: activeWidgetTheme.fg,
              }}
            >
              <Layers className="size-4 shrink-0" style={{ color: activeWidgetTheme.fg }} />
              <h2 className="font-extrabold text-sm" style={{ color: activeWidgetTheme.fg }}>
                {t.appearanceTitle}
              </h2>
            </div>

            {/* Font Size Segmented Control */}
            <div className="space-y-1.5 py-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                <span>{t.fontSizeLabel}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">
                  {settings.fontSize === "normal"
                    ? t.sizeSmall
                    : settings.fontSize === "large"
                      ? t.sizeMedium
                      : t.sizeLarge}
                </span>
              </div>
              <div
                className="grid grid-cols-3 gap-1 bg-secondary/50 p-1 rounded-2xl border transition-all"
                style={{ borderColor: `${activeWidgetTheme.from}40` }}
              >
                {[
                  { label: t.sizeSmall, value: "normal" },
                  { label: t.sizeMedium, value: "large" },
                  { label: t.sizeLarge, value: "xlarge" },
                ].map((opt) => {
                  const isSelected = (settings.fontSize || "normal") === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        update({ fontSize: opt.value as "normal" | "large" | "xlarge" })
                      }
                      style={
                        isSelected
                          ? {
                              background: activeWidgetTheme.gradient || activeWidgetTheme.from,
                              color: activeWidgetTheme.fg,
                            }
                          : undefined
                      }
                      className={`py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                        isSelected
                          ? `shadow-xs ${activeWidgetTheme.animClass || ""}`
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Icon Size Segmented Control */}
            <div className="space-y-1.5 py-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                <span>{t.iconSizeLabel}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">
                  {settings.iconSize === "small"
                    ? t.sizeSmall
                    : settings.iconSize === "large"
                      ? t.sizeLarge
                      : t.sizeMedium}
                </span>
              </div>
              <div
                className="grid grid-cols-3 gap-1 bg-secondary/50 p-1 rounded-2xl border transition-all"
                style={{ borderColor: `${activeWidgetTheme.from}40` }}
              >
                {[
                  { label: t.sizeSmall, value: "small" },
                  { label: t.sizeMedium, value: "normal" },
                  { label: t.sizeLarge, value: "large" },
                ].map((opt) => {
                  const isSelected = (settings.iconSize || "normal") === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        update({ iconSize: opt.value as "small" | "normal" | "large" })
                      }
                      style={
                        isSelected
                          ? {
                              background: activeWidgetTheme.gradient || activeWidgetTheme.from,
                              color: activeWidgetTheme.fg,
                            }
                          : undefined
                      }
                      className={`py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                        isSelected
                          ? `shadow-xs ${activeWidgetTheme.animClass || ""}`
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Animation Quality Segmented Control */}
            <div className="space-y-1.5 py-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                <span>{t.animIntensityLabel}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">
                  {settings.animationIntensity === "reduced"
                    ? t.sizeReduced
                    : settings.animationIntensity === "none"
                      ? t.sizeOff
                      : t.sizeFull}
                </span>
              </div>
              <div
                className="grid grid-cols-3 gap-1 bg-secondary/50 p-1 rounded-2xl border transition-all"
                style={{ borderColor: `${activeWidgetTheme.from}40` }}
              >
                {[
                  { label: t.sizeFull, value: "full" },
                  { label: t.sizeReduced, value: "reduced" },
                  { label: t.sizeOff, value: "none" },
                ].map((opt) => {
                  const isSelected = (settings.animationIntensity || "full") === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        update({ animationIntensity: opt.value as "full" | "reduced" | "none" })
                      }
                      style={
                        isSelected
                          ? {
                              background: activeWidgetTheme.gradient || activeWidgetTheme.from,
                              color: activeWidgetTheme.fg,
                            }
                          : undefined
                      }
                      className={`py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                        isSelected
                          ? `shadow-xs ${activeWidgetTheme.animClass || ""}`
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* 2. Batterie & Performance */}
          <Card>
            <div
              className={`widget relative p-3 rounded-2xl flex items-center gap-2.5 shadow-md border border-white/20 mb-2 transition-all duration-500 ease-in-out ${
                activeWidgetTheme.animClass || ""
              }`}
              style={{
                background:
                  activeWidgetTheme.gradient ||
                  `linear-gradient(135deg, ${activeWidgetTheme.from}, ${activeWidgetTheme.to})`,
                color: activeWidgetTheme.fg,
              }}
            >
              <BatteryCharging
                className="size-4 shrink-0"
                style={{ color: activeWidgetTheme.fg }}
              />
              <h2 className="font-extrabold text-sm" style={{ color: activeWidgetTheme.fg }}>
                {t.batterySaverTitle}
              </h2>
            </div>

            <Row label={t.batterySaverLabel}>
              <Switch
                checked={settings.batterySaver || false}
                onCheckedChange={(v) => update({ batterySaver: v })}
                style={
                  settings.batterySaver ? { backgroundColor: activeWidgetTheme.from } : undefined
                }
              />
            </Row>
            <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
              {t.batterySaverDesc}
            </p>
          </Card>

          {/* 3. Vibrations & Retours haptiques */}
          <Card>
            <div
              className={`widget relative p-3 rounded-2xl flex items-center gap-2.5 shadow-md border border-white/20 mb-2 transition-all duration-500 ease-in-out ${
                activeWidgetTheme.animClass || ""
              }`}
              style={{
                background:
                  activeWidgetTheme.gradient ||
                  `linear-gradient(135deg, ${activeWidgetTheme.from}, ${activeWidgetTheme.to})`,
                color: activeWidgetTheme.fg,
              }}
            >
              <Vibrate className="size-4 shrink-0" style={{ color: activeWidgetTheme.fg }} />
              <h2 className="font-extrabold text-sm" style={{ color: activeWidgetTheme.fg }}>
                {t.hapticsTitle}
              </h2>
            </div>

            <Row label={t.hapticButtons}>
              <Switch
                checked={settings.vibrateButtons ?? true}
                onCheckedChange={(v) => update({ vibrateButtons: v })}
                style={
                  (settings.vibrateButtons ?? true)
                    ? { backgroundColor: activeWidgetTheme.from }
                    : undefined
                }
              />
            </Row>
            <Row label={t.hapticNotifs}>
              <Switch
                checked={settings.vibrateNotifications ?? true}
                onCheckedChange={(v) => update({ vibrateNotifications: v })}
                style={
                  (settings.vibrateNotifications ?? true)
                    ? { backgroundColor: activeWidgetTheme.from }
                    : undefined
                }
              />
            </Row>
            <Row label={t.hapticAdhan}>
              <Switch
                checked={settings.vibrateAdhan ?? true}
                onCheckedChange={(v) => update({ vibrateAdhan: v })}
                style={
                  (settings.vibrateAdhan ?? true)
                    ? { backgroundColor: activeWidgetTheme.from }
                    : undefined
                }
              />
            </Row>
          </Card>

          <Card>
            <Row label={t.imamTitle}>
              <Select value={settings.imamId} onValueChange={(v) => update({ imamId: v })}>
                <SelectTrigger
                  className="w-44 font-bold border rounded-xl transition-all"
                  style={{
                    borderColor: `${activeWidgetTheme.from}80`,
                    boxShadow: `0 0 0 1px ${activeWidgetTheme.from}20`,
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAMS.map((i) => {
                    const isSel = settings.imamId === i.id;
                    return (
                      <SelectItem
                        key={i.id}
                        value={i.id}
                        style={
                          isSel
                            ? {
                                background: activeWidgetTheme.gradient || activeWidgetTheme.from,
                                color: activeWidgetTheme.fg,
                                fontWeight: "bold",
                              }
                            : undefined
                        }
                      >
                        {i.flag} {i.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Row>
            <Row label={t.reminderTitle}>
              <Select
                value={String(settings.reminder)}
                onValueChange={(v) => update({ reminder: Number(v) as 0 | 5 | 15 | 30 })}
              >
                <SelectTrigger
                  className="w-44 font-bold border rounded-xl transition-all"
                  style={{
                    borderColor: `${activeWidgetTheme.from}80`,
                    boxShadow: `0 0 0 1px ${activeWidgetTheme.from}20`,
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: "0", label: t.reminderNone },
                    { value: "5", label: t.r5 },
                    { value: "15", label: t.r15 },
                    { value: "30", label: t.r30 },
                  ].map((item) => {
                    const isSel = String(settings.reminder) === item.value;
                    return (
                      <SelectItem
                        key={item.value}
                        value={item.value}
                        style={
                          isSel
                            ? {
                                background: activeWidgetTheme.gradient || activeWidgetTheme.from,
                                color: activeWidgetTheme.fg,
                                fontWeight: "bold",
                              }
                            : undefined
                        }
                      >
                        {item.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Row>
            {settings.reminder > 0 && (
              <>
                <Row label={t.reminderModeTitle || "Type de rappel"}>
                  <Select
                    value={settings.reminderMode || "both"}
                    onValueChange={(v) =>
                      update({ reminderMode: v as "notification" | "audio" | "both" })
                    }
                  >
                    <SelectTrigger
                      className="w-44 font-bold border rounded-xl transition-all"
                      style={{
                        borderColor: `${activeWidgetTheme.from}80`,
                        boxShadow: `0 0 0 1px ${activeWidgetTheme.from}20`,
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { value: "notification", label: t.reminderNotification || "🔔 Notification" },
                        { value: "audio", label: t.reminderAudio || "🔊 Audio seul" },
                        { value: "both", label: t.reminderBoth || "🔔+🔊 Notif + Audio" },
                      ].map((item) => {
                        const isSel = (settings.reminderMode || "both") === item.value;
                        return (
                          <SelectItem
                            key={item.value}
                            value={item.value}
                            style={
                              isSel
                                ? {
                                    background:
                                      activeWidgetTheme.gradient || activeWidgetTheme.from,
                                    color: activeWidgetTheme.fg,
                                    fontWeight: "bold",
                                  }
                                : undefined
                            }
                          >
                            {item.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </Row>
                <div className="pt-1 pb-2 flex flex-wrap gap-2 justify-end">
                  <Link
                    to="/reminder"
                    search={{ from: "settings" }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-card/60 hover:bg-card border border-border transition-colors text-amber-600 dark:text-amber-400 hover:text-amber-700"
                  >
                    <span>{t.fullReminderPage || "Page complète du rappel"}</span>
                    <ChevronRight className="size-3" />
                  </Link>
                  <Link
                    to="/reminder/notification"
                    search={{ from: "settings" }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-card/60 hover:bg-card border border-border transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Bell className="size-3" />
                    <span>{t.customizeNotification || "Personnaliser notification"}</span>
                  </Link>
                  <Link
                    to="/reminder/audio"
                    search={{ from: "settings" }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-card/60 hover:bg-card border border-border transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Volume2 className="size-3" />
                    <span>{t.customizeVoice || "Personnaliser vocal"}</span>
                  </Link>
                </div>

              </>
            )}
            <Row label={t.calcMethod}>
              <Select
                value={String(settings.method)}
                onValueChange={(v) => update({ method: Number(v) })}
              >
                <SelectTrigger
                  className="w-44 font-bold border rounded-xl transition-all"
                  style={{
                    borderColor: `${activeWidgetTheme.from}80`,
                    boxShadow: `0 0 0 1px ${activeWidgetTheme.from}20`,
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALC_METHODS.map((m) => {
                    const isSel = String(settings.method) === String(m.id);
                    return (
                      <SelectItem
                        key={m.id}
                        value={String(m.id)}
                        style={
                          isSel
                            ? {
                                background: activeWidgetTheme.gradient || activeWidgetTheme.from,
                                color: activeWidgetTheme.fg,
                                fontWeight: "bold",
                              }
                            : undefined
                        }
                      >
                        {m.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Row>
            <Row label={t.schoolLabel || "École juridique"}>
              <Select
                value={String(settings.school)}
                onValueChange={(v) => update({ school: Number(v) as 0 | 1 })}
              >
                <SelectTrigger
                  className="w-44 font-bold border rounded-xl transition-all"
                  style={{
                    borderColor: `${activeWidgetTheme.from}80`,
                    boxShadow: `0 0 0 1px ${activeWidgetTheme.from}20`,
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHOOLS.map((s) => {
                    const isSel = String(settings.school) === String(s.id);
                    return (
                      <SelectItem
                        key={s.id}
                        value={String(s.id)}
                        style={
                          isSel
                            ? {
                                background: activeWidgetTheme.gradient || activeWidgetTheme.from,
                                color: activeWidgetTheme.fg,
                                fontWeight: "bold",
                              }
                            : undefined
                        }
                      >
                        {s.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Row>
          </Card>

          <Card>
            <Accordion type="single" collapsible>
              <AccordionItem value="help">
                <AccordionTrigger className="text-sm font-bold">{t.help}</AccordionTrigger>
                <AccordionContent className="space-y-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">{t.faq}</p>
                  <p>
                    •{" "}
                    {t.helpHoraires ||
                      "Les horaires proviennent d'une méthode de calcul astronomique / API selon votre position et la méthode choisie."}
                  </p>
                  <p>
                    •{" "}
                    {t.helpQibla ||
                      "La boussole Qibla nécessite l'autorisation des capteurs de mouvement."}
                  </p>
                  <p>
                    •{" "}
                    {t.helpHalal ||
                      "Le verdict halal est une aide à la décision, jamais une fatwa."}
                  </p>

                  <div className="pt-2 flex flex-col gap-2">
                    <Button
                      variant="soft"
                      className="w-full gap-2 text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30"
                      onClick={() => openOnboardingGuide()}
                    >
                      <Sparkles className="size-4 text-amber-500" />
                      {t.relaunchGuide || "Revoir le guide interactif"}
                    </Button>

                    {/* Rejouer le parcours de premiere installation : seule la
                        mention "guide termine" est reinitialisee, aucune autre
                        preference n'est touchee. */}
                    <Button
                      variant="soft"
                      className="w-full gap-2 text-xs font-bold"
                      onClick={() => {
                        resetOnboardingCompleted();
                        openOnboardingGuide();
                      }}
                    >
                      <RotateCcw className="size-4 text-emerald-600 dark:text-emerald-400" />
                      {t.replayWelcomeGuide || "Revoir le guide de bienvenue"}
                    </Button>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="soft"
                        className="flex-1 gap-2 text-xs font-bold"
                        onClick={() => {
                          openSubmitReportInExternalBrowser();
                          setTimeout(() => void triggerBugNotificationCheck(), 2000);
                          setTimeout(() => void triggerBugNotificationCheck(), 5000);
                        }}
                      >
                        <Bug className="size-4 text-amber-500" />
                        {t.reportBug || "Signaler un bug"}
                      </Button>

                      <Button
                        variant="outline"
                        className="flex-1 gap-2 text-xs font-semibold"
                        onClick={() => {
                          openBugReportInExternalBrowser();
                          setTimeout(() => void triggerBugNotificationCheck(), 2000);
                          setTimeout(() => void triggerBugNotificationCheck(), 5000);
                        }}
                      >
                        <ShieldCheck className="size-4 text-emerald-500" />
                        {t.myBugReports || "Mes signalements"}
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          {/* Non-customizable white widget for Developer Signature */}
          <Card>
            <div className="relative overflow-hidden py-3.5 px-3 text-center flex flex-col items-center justify-center space-y-2">
              {/* Background ambient glowing gradient effect */}
              <div className="pointer-events-none absolute -inset-4 bg-gradient-to-r from-amber-500/10 via-emerald-500/15 to-amber-500/10 blur-xl opacity-60 animate-dev-glow" />

              {/* Developer Badge */}
              <div className="relative z-10 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/20 shadow-xs">
                <Sparkles
                  className="size-3 text-amber-500 animate-spin"
                  style={{ animationDuration: "6s" }}
                />
                <span>{t.developerBadge || "Développeur & Créateur"}</span>
              </div>

              {/* Animated Text */}
              <div className="relative z-10 pt-0.5">
                <h3 className="text-sm sm:text-base font-black tracking-wide bg-gradient-to-r from-amber-600 via-emerald-600 to-amber-500 dark:from-amber-400 dark:via-emerald-400 dark:to-amber-300 bg-clip-text text-transparent animate-dev-shimmer drop-shadow-xs select-none">
                  {t.developerTitle || t.developer || "AHMADZAI FAROOQ — développeur"}
                </h3>
              </div>

              <p className="relative z-10 text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <span>{t.developerSubtitle || "Conçu avec passion & dévouement"}</span>
                <Heart
                  className="size-3 text-rose-500 fill-rose-500 inline animate-bounce"
                  style={{ animationDuration: "2s" }}
                />
              </p>
            </div>
          </Card>

          {/* Abonnement premium desactive pour la version de lancement :
              aucune offre n'est proposee, l'entree reste donc invisible. */}
          {PREMIUM_ENABLED && (
            <Link
              to="/subscription"
              className="glass flex items-center gap-3 p-4 text-sm font-bold transition active:scale-[0.99] rounded-2xl border border-border"
            >
              <Crown className="size-5 text-amber-500" />
              <span className="flex-1">Abonnement premium</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          )}

          <Link
            to="/about"
            className="glass flex items-center gap-3 p-4 text-sm font-bold transition active:scale-[0.99] rounded-2xl border border-border"
          >
            <Info className="size-5 text-[var(--halal)]" />
            <span className="flex-1">{t.aboutApp}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 text-center space-y-1 text-xs text-muted-foreground">
            <p className="font-bold text-foreground">Islam-Noor v1.0.0</p>
            <p>{t.appLocalDescription || "Application 100% autonome, locale et sans compte"}</p>
          </div>

          <ShareAppModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
          />

          {/* Interactive Page Tutorial Modal */}
          <PageTutorialModal
            pageId="settings"
            isOpen={isTutorialOpen}
            onClose={handleCloseTutorial}
          />
        </>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      data-widget-card
      className="relative rounded-3xl p-4 bg-white dark:bg-slate-900 shadow-sm space-y-1 overflow-hidden"
    >
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 px-1 rounded-xl">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}
