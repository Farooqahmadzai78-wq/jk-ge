import { useEffect, useState } from "react";
import { useSettings } from "@/lib/app-settings";
import { useI18n } from "@/lib/i18n";
import { runFullAppPreload, type PreloadProgress } from "@/lib/app-preloader";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import {
  SplashBackgroundGeometry,
  SplashStardustField,
  SplashCrescentSymbol,
  SplashProgressIndicator,
  SplashStatusBlock,
} from "@/routes/splash";

export function AppSplashGuard({
  onPreloadComplete,
}: {
  onPreloadComplete?: (isFirstLaunch: boolean) => void;
}) {
  const { t } = useI18n();
  const { ready: settingsReady } = useSettings();
  const [isDone, setIsDone] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [progress, setProgress] = useState<PreloadProgress>({
    step: 0,
    totalSteps: 5,
    percentage: 0,
    status: t.splashInit || "Initialisation de l'application...",
    statusKey: "splashInit",
  });

  useEffect(() => {
    let active = true;

    // Prevent background scroll while splash screen is active
    lockBodyScroll();

    runFullAppPreload(
      (p) => {
        if (active) {
          setProgress(p);
        }
      },
      () => settingsReady,
    ).then(({ isFirstLaunch }) => {
      if (!active) return;

      // Pause douce à 100% pour que l'utilisateur admire le cercle complet et le rayonnement de la lune
      setTimeout(() => {
        if (!active) return;
        setFadingOut(true);
        setTimeout(() => {
          if (!active) return;
          setIsDone(true);
          unlockBodyScroll();
          onPreloadComplete?.(isFirstLaunch);
        }, 500); // 500ms transition douce en fondu sortant
      }, 400);
    });

    return () => {
      active = false;
      unlockBodyScroll();
    };
  }, [settingsReady, onPreloadComplete]);

  if (isDone) return null;

  return (
    <div
      suppressHydrationWarning
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between overflow-hidden px-8 py-12 text-center select-none transition-all duration-500 ease-in-out will-change-[opacity,transform] ${
        fadingOut ? "opacity-0 scale-[1.02] pointer-events-none" : "opacity-100 scale-100"
      }`}
      style={{
        background:
          "radial-gradient(ellipse at 50% 34%, #2e160a 0%, #1c0c05 45%, #0f0602 85%, #080301 100%)",
      }}
    >
      {/* 1. Géométrie sacrée moderne & minimaliste */}
      <SplashBackgroundGeometry />

      {/* 2. Micro-particules d'étoiles dorées flottantes */}
      <SplashStardustField />

      {/* Espaceur haut */}
      <div className="h-4" />

      {/* 3. Symbole central : Croissant vectoriel épuré & Typographie de prestige */}
      <div className="relative z-10 flex flex-col items-center my-auto">
        <SplashCrescentSymbol percentage={progress.percentage} />

        {/* Typographie Haute Qualité : Cinzel / Serif majuscule pour ISLAM-NOOR */}
        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-[0.28em] uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100 to-amber-300 font-[var(--font-serif)] drop-shadow-[0_4px_16px_rgba(245,158,11,0.35)]">
          {t.appName || "Islam-Noor"}
        </h1>

        {/* Typographie d'accompagnement : Plus Jakarta Sans épuré pour APPLICATION ISLAMIQUE */}
        <p className="mt-1.5 text-[11px] sm:text-xs font-semibold text-amber-200/80 tracking-[0.32em] uppercase font-sans">
          {t.tagline || "Application Islamique"}
        </p>
      </div>

      {/* 4. Indicateur circulaire moderne (Tracé 0-100%) & Textes fluides */}
      <div className="relative z-10 flex flex-col items-center space-y-4 mb-4">
        <SplashProgressIndicator percentage={progress.percentage} />
        <SplashStatusBlock
          status={progress.status}
          statusKey={progress.statusKey}
          subtext={t.splashPrep}
        />
      </div>
    </div>
  );
}
