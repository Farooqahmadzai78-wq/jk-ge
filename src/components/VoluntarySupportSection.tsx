import { useMemo, useState } from "react";
import { Gift, HeartHandshake, Layers, Palette, Play, Sparkles, Square, Check, X, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/app-settings";
import {
  getWidgetThemeById,
  isRewardUnlockedTheme,
  type BgTheme,
  type WidgetBorderTheme,
  type WidgetTheme,
} from "@/lib/customization-themes";
import {
  previewNextPremiumPack,
  useUnlockedPremiumThemes,
  type PremiumPackType,
  type UnlockPackResult,
} from "@/lib/premium-themes";
import {
  applyValidatedCustomizationChange,
  hasThemeSelectionChanged,
  tryShowVoluntaryRewardedAd,
} from "@/lib/ad-system";
import { isNativeAndroidRuntime, isWebTestSimulationAllowed } from "@/lib/ad-config";
import { usePremium } from "@/lib/premium";
import { showCustomizationToast } from "@/lib/customization-toast";
import { useI18n } from "@/lib/i18n";

const PACK_OPTIONS: {
  id: PremiumPackType;
  label: string;
  subtitle: string;
  icon: typeof Palette;
}[] = [
  {
    id: "backgrounds",
    label: "Pack Arrière-plans",
    subtitle: "2 arrière-plans géométriques",
    icon: Palette,
  },
  {
    id: "widgets",
    label: "Pack Widgets",
    subtitle: "2 styles de cartes & widgets",
    icon: Layers,
  },
  {
    id: "borders",
    label: "Pack Bordures",
    subtitle: "2 bordures ciselées / animées",
    icon: Square,
  },
];

export function VoluntarySupportSection() {
  const { t } = useI18n();
  const { settings, update } = useSettings();
  const { isPremium } = usePremium();
  const unlocked = useUnlockedPremiumThemes();
  const activeWidgetTheme = getWidgetThemeById(settings.widgetTheme);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<PremiumPackType>("backgrounds");
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  const [unlockedResult, setUnlockedResult] = useState<UnlockPackResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const totalUnlockedCount =
    unlocked.backgrounds.length + unlocked.widgets.length + unlocked.borders.length;

  const packPreview = useMemo(
    () => previewNextPremiumPack(selectedPack),
    // Recalculate when selectedPack or totalUnlockedCount changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPack, totalUnlockedCount],
  );

  const handleOpenConfirmModal = () => {
    setUnlockedResult(null);
    setStatusMessage(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isLoadingAd) return;
    setIsModalOpen(false);
    setStatusMessage(null);
  };

  const handleConfirmWatchAd = async () => {
    if (isLoadingAd) return;
    setIsLoadingAd(true);
    setStatusMessage(null);

    try {
      const res = await tryShowVoluntaryRewardedAd(selectedPack);

      if (res.rewardGranted && res.unlockedPack?.unlocked) {
        setUnlockedResult(res.unlockedPack);
        setStatusMessage(null);
        return;
      }

      if (res.reason === "web-simulation-disabled-in-prod") {
        setStatusMessage(
          t.rewardVideoAndroidOnly ||
            "Les vidéos récompensées sont disponibles uniquement dans l'application Android Islam-Noor. Aucune donnée n'a été modifiée.",
        );
      } else if (res.reason === "dismissed-without-reward") {
        setStatusMessage(
          t.rewardVideoClosedEarly ||
            "La vidéo a été fermée avant la fin : aucun pack n'a été débloqué et vos préférences restent intactes.",
        );
      } else if (res.reason.startsWith("protected:")) {
        setStatusMessage(
          t.audioPlayingAdBlocked ||
            "Une lecture audio ou une protection spirituelle est en cours. Vous pourrez réessayer une fois l'écoute terminée.",
        );
      } else {
        setStatusMessage(
          t.noVideoAvailable ||
            "Aucune vidéo n'est disponible pour le moment (réseau ou inventaire AdMob). Vos thèmes actuels sont intacts — vous pouvez réessayer plus tard.",
        );
      }
    } finally {
      setIsLoadingAd(false);
    }
  };

  const handleApplyUnlockedBg = (bg: BgTheme) => {
    if (!hasThemeSelectionChanged(settings.bgTheme, bg.id)) return;
    showCustomizationToast(`Arrière-plan « ${bg.name} » appliqué`, {
      category: "background",
      accentColor: "emerald",
    });
    void applyValidatedCustomizationChange(
      "background",
      () => {
        update({ bgTheme: bg.id });
      },
      { isPremium, unlockedByReward: isRewardUnlockedTheme(bg) },
    );
  };

  const handleApplyUnlockedWidget = (w: WidgetTheme) => {
    if (!hasThemeSelectionChanged(settings.widgetTheme, w.id)) return;
    showCustomizationToast(`Style de widget « ${w.name} » appliqué`, {
      category: "widget",
      accentColor: "amber",
    });
    void applyValidatedCustomizationChange(
      "widget",
      () => {
        update({ widgetTheme: w.id });
      },
      { isPremium, unlockedByReward: isRewardUnlockedTheme(w) },
    );
  };

  const handleApplyUnlockedBorder = (b: WidgetBorderTheme) => {
    if (!hasThemeSelectionChanged(settings.widgetBorderTheme, b.id)) return;
    showCustomizationToast(`Bordure « ${b.name} » appliquée`, {
      category: "border",
      accentColor: "purple",
    });
    void applyValidatedCustomizationChange(
      "border",
      () => {
        update({ widgetBorderTheme: b.id });
      },
      { isPremium, unlockedByReward: isRewardUnlockedTheme(b) },
    );
  };

  const isDevWebPreview = !isNativeAndroidRuntime() && isWebTestSimulationAllowed();

  return (
    <>
      <section
        data-widget-card
        data-testid="voluntary-support-section"
        className="relative rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 shadow-sm space-y-3.5 overflow-hidden"
      >
        {/* En-tête harmonisé avec les cartes de Réglages */}
        <div
          className={`widget relative p-3 rounded-2xl flex items-center justify-between gap-2.5 shadow-md border border-white/20 transition-all duration-500 ease-in-out ${
            activeWidgetTheme.animClass || ""
          }`}
          style={{
            background:
              activeWidgetTheme.gradient ||
              `linear-gradient(135deg, ${activeWidgetTheme.from}, ${activeWidgetTheme.to})`,
            color: activeWidgetTheme.fg,
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <HeartHandshake className="size-4 shrink-0" style={{ color: activeWidgetTheme.fg }} />
            <h2 className="font-extrabold text-sm truncate" style={{ color: activeWidgetTheme.fg }}>
              Soutenir Islam-Noor
            </h2>
          </div>

          {totalUnlockedCount > 0 && (
            <span
              className="shrink-0 rounded-full bg-black/20 px-2.5 py-0.5 text-[10px] font-extrabold backdrop-blur-xs"
              style={{ color: activeWidgetTheme.fg }}
            >
              {totalUnlockedCount} débloqué{totalUnlockedCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground px-0.5">
          Vous appréciez Islam-Noor ? Regardez volontairement une publicité pour nous soutenir et
          débloquer de nouveaux thèmes premium. Votre participation est facultative.
        </p>

        <Button
          type="button"
          onClick={handleOpenConfirmModal}
          data-testid="open-voluntary-rewarded-modal-btn"
          className="w-full min-h-11 rounded-2xl font-extrabold text-xs sm:text-sm gap-2 shadow-sm cursor-pointer transition-transform active:scale-[0.99]"
          style={{
            background:
              activeWidgetTheme.gradient ||
              `linear-gradient(135deg, ${activeWidgetTheme.from}, ${activeWidgetTheme.to})`,
            color: activeWidgetTheme.fg,
          }}
        >
          <Gift className="size-4 shrink-0" />
          <span className="truncate">Regarder une vidéo et débloquer un pack premium</span>
        </Button>
      </section>

      {/* Modale de confirmation explicite avant lancement de toute vidéo */}
      <Dialog open={isModalOpen} onOpenChange={(open) => (!open ? handleCloseModal() : undefined)}>
        <DialogContent className="max-w-md rounded-3xl p-5 sm:p-6 gap-4 [&>button:last-child]:hidden">
          {/* En-tête avec bouton de fermeture visible >= 44px */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 text-left">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1 text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                <Sparkles className="size-3.5" />
                <span>Soutien 100 % facultatif</span>
              </div>
              <DialogTitle className="text-base sm:text-lg font-extrabold text-foreground pt-1">
                {unlockedResult ? "Merci pour votre soutien !" : "Soutenir Islam-Noor"}
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
                {unlockedResult
                  ? "Vos 2 nouveaux thèmes premium sont enregistrés durablement sur cet appareil et prêts à être appliqués."
                  : "Choisissez le pack de 2 thèmes premium que vous souhaitez débloquer en regardant une courte vidéo publicitaire."}
              </DialogDescription>
            </div>

            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isLoadingAd}
              aria-label="Fermer la fenêtre Soutenir Islam-Noor"
              data-testid="voluntary-modal-close-btn"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground transition hover:bg-secondary/80 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <X className="size-5" />
            </button>
          </div>

          {!unlockedResult ? (
            <>
              {/* Sélecteur de catégorie de pack */}
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Catégorie du pack premium">
                {PACK_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = selectedPack === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setSelectedPack(opt.id);
                        setStatusMessage(null);
                      }}
                      data-testid={`select-pack-${opt.id}`}
                      className={`flex flex-col items-center justify-center rounded-2xl p-2.5 text-center border transition-all cursor-pointer ${
                        selected
                          ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40 shadow-xs"
                          : "border-border bg-card/60 hover:bg-secondary/60"
                      }`}
                    >
                      <Icon
                        className={`size-4 mb-1 ${
                          selected ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-[11px] font-extrabold text-foreground leading-tight">
                        {opt.label.replace("Pack ", "")}
                      </span>
                      <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                        2 créations
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Aperçu en direct des 2 prochains thèmes générés / sélectionnés */}
              <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span>Prochain pack à débloquer (2 thèmes uniques)</span>
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                    Sans doublon
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {selectedPack === "backgrounds" &&
                    packPreview.backgrounds.map((bg) => (
                      <div
                        key={bg.id}
                        className="rounded-xl border border-border/60 bg-background p-2 space-y-1.5"
                      >
                        <div
                          className="h-14 w-full rounded-lg border border-white/20 shadow-inner"
                          style={{
                            backgroundColor: bg.bgColor,
                            backgroundImage: bg.bgImage,
                          }}
                        />
                        <p className="text-[11px] font-extrabold truncate text-foreground">
                          {bg.name}
                        </p>
                      </div>
                    ))}

                  {selectedPack === "widgets" &&
                    packPreview.widgets.map((w) => (
                      <div
                        key={w.id}
                        className="rounded-xl border border-border/60 bg-background p-2 space-y-1.5"
                      >
                        <div
                          className="h-14 w-full rounded-lg border border-white/20 shadow-inner flex items-end p-1.5"
                          style={{
                            backgroundColor: w.from,
                            backgroundImage:
                              w.gradient || `linear-gradient(135deg, ${w.from}, ${w.to})`,
                            color: w.fg,
                          }}
                        >
                          <span className="text-[9px] font-black uppercase opacity-90 truncate">
                            18 Safar • 21:15
                          </span>
                        </div>
                        <p className="text-[11px] font-extrabold truncate text-foreground">
                          {w.name}
                        </p>
                      </div>
                    ))}

                  {selectedPack === "borders" &&
                    packPreview.borders.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-xl border border-border/60 bg-background p-2 space-y-1.5"
                      >
                        <div
                          className="h-14 w-full rounded-lg flex items-center justify-center bg-slate-950/90 px-2"
                          style={{
                            border: `2.5px ${b.borderStyle || "solid"} ${b.previewColors[0]}`,
                            boxShadow: `inset 0 0 10px ${b.glowColor || "transparent"}`,
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {b.previewColors.map((hex, i) => (
                              <span
                                key={`${b.id}-${i}`}
                                className="size-3 rounded-full border border-white/30"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-[11px] font-extrabold truncate text-foreground">
                          {b.name}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              {isDevWebPreview && (
                <p className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                  Mode aperçu Web développeur (« TEST ») : sur Android, le SDK officiel GMA Next-Gen
                  diffuse la vidéo de test AdMob.
                </p>
              )}

              {statusMessage && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-xl border border-border bg-muted/60 p-3 text-xs text-foreground"
                >
                  <AlertCircle className="size-4 shrink-0 text-amber-500 mt-0.5" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Actions explicites obligatoires : « Regarder une publicité » et « Pas maintenant » */}
              <div className="flex flex-col sm:flex-row-reverse gap-2 pt-1">
                <Button
                  type="button"
                  disabled={isLoadingAd}
                  onClick={() => void handleConfirmWatchAd()}
                  data-testid="confirm-watch-rewarded-ad-btn"
                  className="flex-1 min-h-11 rounded-2xl font-extrabold text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  <Play className="size-3.5 fill-current" />
                  <span>{isLoadingAd ? "Chargement…" : "Regarder une publicité"}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoadingAd}
                  onClick={handleCloseModal}
                  data-testid="cancel-voluntary-rewarded-btn"
                  className="sm:w-auto min-h-11 rounded-2xl font-bold text-xs cursor-pointer"
                >
                  Pas maintenant
                </Button>
              </div>
            </>
          ) : (
            /* État après récompense confirmée : présente les 2 thèmes débloqués avec bouton d'application directe */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {unlockedResult.backgrounds.map((bg) => {
                  const isActive = settings.bgTheme === bg.id;
                  return (
                    <div
                      key={bg.id}
                      className="rounded-2xl border border-border bg-card p-2.5 space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div
                          className="h-16 w-full rounded-xl border border-white/20 shadow-inner"
                          style={{ backgroundColor: bg.bgColor, backgroundImage: bg.bgImage }}
                        />
                        <p className="text-xs font-extrabold truncate text-foreground">{bg.name}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isActive ? "secondary" : "default"}
                        onClick={() => handleApplyUnlockedBg(bg)}
                        className="w-full rounded-xl text-[11px] font-extrabold gap-1 cursor-pointer"
                      >
                        {isActive ? <Check className="size-3.5" /> : null}
                        <span>{isActive ? "Appliqué" : "Appliquer"}</span>
                      </Button>
                    </div>
                  );
                })}

                {unlockedResult.widgets.map((w) => {
                  const isActive = settings.widgetTheme === w.id;
                  return (
                    <div
                      key={w.id}
                      className="rounded-2xl border border-border bg-card p-2.5 space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div
                          className="h-16 w-full rounded-xl border border-white/20 shadow-inner"
                          style={{
                            backgroundColor: w.from,
                            backgroundImage:
                              w.gradient || `linear-gradient(135deg, ${w.from}, ${w.to})`,
                          }}
                        />
                        <p className="text-xs font-extrabold truncate text-foreground">{w.name}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isActive ? "secondary" : "default"}
                        onClick={() => handleApplyUnlockedWidget(w)}
                        className="w-full rounded-xl text-[11px] font-extrabold gap-1 cursor-pointer"
                      >
                        {isActive ? <Check className="size-3.5" /> : null}
                        <span>{isActive ? "Appliqué" : "Appliquer"}</span>
                      </Button>
                    </div>
                  );
                })}

                {unlockedResult.borders.map((b) => {
                  const isActive = settings.widgetBorderTheme === b.id;
                  return (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-border bg-card p-2.5 space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div
                          className="h-16 w-full rounded-xl flex items-center justify-center bg-slate-950"
                          style={{
                            border: `2.5px ${b.borderStyle || "solid"} ${b.previewColors[0]}`,
                            boxShadow: `inset 0 0 10px ${b.glowColor || "transparent"}`,
                          }}
                        >
                          <Sparkles className="size-4 text-amber-400" />
                        </div>
                        <p className="text-xs font-extrabold truncate text-foreground">{b.name}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isActive ? "secondary" : "default"}
                        onClick={() => handleApplyUnlockedBorder(b)}
                        className="w-full rounded-xl text-[11px] font-extrabold gap-1 cursor-pointer"
                      >
                        {isActive ? <Check className="size-3.5" /> : null}
                        <span>{isActive ? "Appliqué" : "Appliquer"}</span>
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setUnlockedResult(null);
                    setStatusMessage(null);
                  }}
                  className="flex-1 min-h-11 rounded-2xl text-xs font-bold cursor-pointer"
                >
                  Débloquer un autre pack
                </Button>
                <Button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 min-h-11 rounded-2xl text-xs font-extrabold cursor-pointer"
                >
                  Terminer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
