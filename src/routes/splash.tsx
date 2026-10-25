import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { runFullAppPreload, type PreloadProgress } from "@/lib/app-preloader";
import appLogoImg from "@/assets/images/app_logo_main.png";

export const Route = createFileRoute("/splash")({
  head: () => ({
    meta: [
      { title: "Islam-Noor — Application Islamique" },
      {
        name: "description",
        content:
          "Islam-Noor, votre application islamique : horaires de prière, Qibla, Coran et scanner halal.",
      },
      { property: "og:title", content: "Islam-Noor — Application Islamique" },
      { property: "og:description", content: "Horaires de prière, Qibla, Coran et scanner halal." },
    ],
  }),
  component: SplashPage,
});

/** 36 Particules Célestes réparties harmonieusement sur tout l'arrière-plan */
const STARDUST_PARTICLES = [
  // Haut gauche & centre-haut
  { left: "8%", top: "8%", size: 2.2, delay: "0.2s", duration: "5.8s" },
  { left: "18%", top: "16%", size: 1.8, delay: "1.1s", duration: "6.4s" },
  { left: "28%", top: "10%", size: 2.5, delay: "2.4s", duration: "5.2s" },
  { left: "38%", top: "6%", size: 1.5, delay: "0.6s", duration: "7.0s" },
  { left: "50%", top: "12%", size: 3.0, delay: "1.8s", duration: "6.2s" },
  // Haut droit
  { left: "64%", top: "8%", size: 2.0, delay: "2.9s", duration: "5.5s" },
  { left: "76%", top: "14%", size: 2.4, delay: "0.4s", duration: "6.8s" },
  { left: "88%", top: "10%", size: 1.8, delay: "1.6s", duration: "6.0s" },
  { left: "94%", top: "22%", size: 2.2, delay: "3.1s", duration: "5.7s" },
  // Milieu gauche
  { left: "6%", top: "34%", size: 2.0, delay: "0.9s", duration: "6.6s" },
  { left: "14%", top: "42%", size: 1.6, delay: "2.2s", duration: "5.4s" },
  { left: "22%", top: "30%", size: 2.8, delay: "1.3s", duration: "7.2s" },
  { left: "10%", top: "54%", size: 2.2, delay: "3.4s", duration: "5.9s" },
  { left: "20%", top: "62%", size: 1.8, delay: "0.7s", duration: "6.3s" },
  // Milieu droit
  { left: "78%", top: "32%", size: 2.2, delay: "1.5s", duration: "6.1s" },
  { left: "86%", top: "44%", size: 2.6, delay: "2.7s", duration: "7.4s" },
  { left: "92%", top: "56%", size: 1.8, delay: "0.3s", duration: "5.6s" },
  { left: "82%", top: "64%", size: 2.4, delay: "1.9s", duration: "6.7s" },
  // Autour du centre (auréoles célestes)
  { left: "32%", top: "26%", size: 2.0, delay: "2.1s", duration: "5.8s" },
  { left: "68%", top: "28%", size: 2.2, delay: "0.8s", duration: "6.5s" },
  { left: "30%", top: "48%", size: 1.6, delay: "3.0s", duration: "6.0s" },
  { left: "70%", top: "50%", size: 2.0, delay: "1.2s", duration: "5.7s" },
  // Bas gauche & centre-bas
  { left: "8%", top: "76%", size: 2.2, delay: "2.6s", duration: "6.4s" },
  { left: "16%", top: "86%", size: 1.8, delay: "0.5s", duration: "5.9s" },
  { left: "26%", top: "74%", size: 2.5, delay: "1.7s", duration: "7.1s" },
  { left: "34%", top: "88%", size: 2.0, delay: "3.3s", duration: "6.2s" },
  { left: "44%", top: "78%", size: 1.6, delay: "1.0s", duration: "5.5s" },
  { left: "54%", top: "86%", size: 2.4, delay: "2.3s", duration: "6.8s" },
  // Bas droit
  { left: "66%", top: "76%", size: 2.0, delay: "0.7s", duration: "6.0s" },
  { left: "74%", top: "88%", size: 2.6, delay: "2.0s", duration: "7.3s" },
  { left: "84%", top: "80%", size: 1.8, delay: "3.5s", duration: "5.8s" },
  { left: "92%", top: "88%", size: 2.2, delay: "1.4s", duration: "6.6s" },
  { left: "48%", top: "94%", size: 2.0, delay: "0.2s", duration: "6.1s" },
  { left: "28%", top: "94%", size: 1.7, delay: "2.8s", duration: "5.3s" },
  { left: "72%", top: "95%", size: 2.1, delay: "1.1s", duration: "6.9s" },
];

/** Poussière d'étoiles dorées flottantes et scintillantes équitablement réparties */
export function SplashStardustField() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {STARDUST_PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute pointer-events-none animate-splash-particle"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        >
          <span
            className="block rounded-full bg-gradient-to-br from-white via-amber-200 to-amber-400 shadow-[0_0_8px_#fde047,0_0_12px_rgba(251,191,36,0.45)] animate-splash-twinkle"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${(i * 0.25) % 3.5}s`,
              animationDuration: `${Number((2.4 + (i % 4) * 0.7).toFixed(2))}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Géométrie sacrée moderne & minimaliste
 * Étoile islamique à 8 branches (Khatam), lignes d'or filigranées ultra-fines (0.8px)
 * et rotation contemplative très douce.
 */
export function SplashBackgroundGeometry() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
      <svg
        viewBox="0 0 600 600"
        className="size-[580px] max-w-[95vw] opacity-30 animate-[spin_240s_linear_infinite]"
        fill="none"
      >
        <defs>
          <linearGradient id="splashLatticeGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#d97706" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0.2" />
          </linearGradient>

          <filter id="splashLatticeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Motif géométrique islamique octogonal : 2 carrés imbriqués à 45° */}
        <g stroke="url(#splashLatticeGold)" strokeWidth="0.85" filter="url(#splashLatticeGlow)">
          <rect
            x="160"
            y="160"
            width="280"
            height="280"
            rx="12"
            fill="none"
            opacity="0.65"
          />
          <rect
            x="160"
            y="160"
            width="280"
            height="280"
            rx="12"
            transform="rotate(45 300 300)"
            fill="none"
            opacity="0.65"
          />

          <rect
            x="120"
            y="120"
            width="360"
            height="360"
            rx="18"
            fill="none"
            opacity="0.35"
            strokeDasharray="6 8"
          />
          <rect
            x="120"
            y="120"
            width="360"
            height="360"
            rx="18"
            transform="rotate(45 300 300)"
            fill="none"
            opacity="0.35"
            strokeDasharray="6 8"
          />

          {Array.from({ length: 8 }).map((_, i) => {
            const angle = i * 45;
            return (
              <g key={i} transform={`rotate(${angle} 300 300)`}>
                <line
                  x1="300"
                  y1="50"
                  x2="300"
                  y2="140"
                  strokeWidth="0.75"
                  opacity="0.5"
                  strokeDasharray="2 4"
                />
                <circle cx="300" cy="80" r="1.5" fill="#fef08a" opacity="0.8" />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/**
 * Symbole central : Le véritable logo officiel de l'application Islam-Noor (Image 1)
 * entouré d'anneaux orbitaux dorés, d'étoiles scintillantes et d'un halo lumineux naturel.
 * Le texte arabe « نُورٌ عَلَى نُورٍ » a été supprimé conformément aux consignes.
 */
export function SplashCrescentSymbol({ percentage = 0 }: { percentage?: number }) {
  const pct = Math.min(100, Math.max(0, percentage));
  const progressRatio = pct / 100;

  // Lueur dynamique qui s'épanouit avec la progression
  const glowScale = 0.95 + progressRatio * 0.25;
  const glowOpacity = 0.4 + progressRatio * 0.5;

  return (
    <div className="relative flex flex-col items-center justify-center animate-splash-moon-appear">
      {/* Halo d'ambiance doré respirant naturel */}
      <div
        className="absolute size-72 sm:size-80 rounded-full bg-gradient-to-r from-amber-500/30 via-yellow-400/35 to-amber-600/30 blur-3xl pointer-events-none transition-all duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
        style={{
          transform: `scale(${glowScale})`,
          opacity: glowOpacity,
        }}
      />

      {/* Conteneur orbital avec le véritable logo officiel */}
      <div className="relative size-40 sm:size-48 flex items-center justify-center animate-splash-float">
        {/* Anneau orbital externe avec rotation douce */}
        <svg
          viewBox="0 0 240 240"
          className="absolute inset-0 size-full pointer-events-none overflow-visible animate-[spin_50s_linear_infinite]"
          fill="none"
        >
          <defs>
            <linearGradient id="splashOrbitGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <circle
            cx="120"
            cy="120"
            r="104"
            stroke="url(#splashOrbitGold)"
            strokeWidth="1"
            strokeDasharray="5 7"
            opacity="0.6"
          />
          <circle
            cx="120"
            cy="120"
            r="115"
            stroke="url(#splashOrbitGold)"
            strokeWidth="0.6"
            strokeDasharray="2 10"
            opacity="0.35"
          />
        </svg>

        {/* Étoile scintillante 8 branches supérieure gauche */}
        <div className="absolute -top-1 left-4 sm:-top-2 sm:left-5 z-20 pointer-events-none animate-splash-twinkle">
          <svg viewBox="0 0 24 24" className="size-5 sm:size-6 drop-shadow-[0_0_8px_rgba(254,240,138,0.95)]" fill="none">
            <path
              d="M 12,2 L 14.2,8.8 L 21,11 L 14.2,13.2 L 12,20 L 9.8,13.2 L 3,11 L 9.8,8.8 Z"
              fill="url(#modernStarGold)"
            />
          </svg>
        </div>

        {/* Étoile scintillante 4 branches droite */}
        <div className="absolute top-10 -right-2 sm:top-12 sm:-right-3 z-20 pointer-events-none animate-[splash-twinkle_3s_ease-in-out_infinite_700ms]">
          <svg viewBox="0 0 20 20" className="size-4 sm:size-5 drop-shadow-[0_0_8px_rgba(254,240,138,0.95)]" fill="none">
            <path
              d="M 10,2 L 11.8,7.8 L 18,10 L 11.8,12.2 L 10,18 L 8.2,12.2 L 2,10 L 8.2,7.8 Z"
              fill="#fef08a"
            />
          </svg>
        </div>

        {/* Étoile scintillante délicate inférieure */}
        <div className="absolute -bottom-1 right-8 z-20 pointer-events-none animate-[splash-twinkle_3.4s_ease-in-out_infinite_1.2s]">
          <svg viewBox="0 0 16 16" className="size-3.5 drop-shadow-[0_0_6px_rgba(254,240,138,0.9)]" fill="none">
            <path
              d="M 8,1 L 9.5,6 L 15,8 L 9.5,10 L 8,15 L 6.5,10 L 1,8 L 6.5,6 Z"
              fill="#fde047"
            />
          </svg>
        </div>

        {/* Le véritable logo de l'application (Image 1) dans son format circulaire d'origine */}
        <div className="relative size-28 sm:size-34 rounded-full p-1 bg-gradient-to-b from-[#fde047]/60 via-[#f59e0b]/40 to-[#78350f]/60 shadow-[0_12px_36px_rgba(245,158,11,0.5),0_0_24px_rgba(254,240,138,0.35)] flex items-center justify-center">
          <img
            src={appLogoImg}
            alt="Islam-Noor Logo"
            className="size-full rounded-full object-contain select-none pointer-events-none"
            loading="eager"
            decoding="sync"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Indicateur de progression moderne perfectionné :
 * Arc doré fluide, pourcentage stable et synchronisé, cercle parfaitement fermé à 100 %, sans gros point blanc.
 */
export function SplashProgressIndicator({ percentage }: { percentage: number }) {
  const radius = 32;
  const circumference = Number((2 * Math.PI * radius).toFixed(2)); // 201.06
  const pct = Math.min(100, Math.max(0, percentage));
  // À 100%, l'offset est exactement 0 pour un cercle parfaitement fermé
  const offset = pct >= 100 ? 0 : Number((circumference - (circumference * pct) / 100).toFixed(2));

  return (
    <div className="relative size-20 sm:size-24 flex items-center justify-center">
      {/* Halo discret */}
      <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md pointer-events-none" />

      <svg className="size-full" viewBox="0 0 80 80">
        <defs>
          <linearGradient id="splashRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        {/* Piste d'arrière-plan fine */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="rgba(251, 191, 36, 0.2)"
          strokeWidth="2.5"
          fill="none"
        />

        {/* Anneau de progression doré fluide */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="url(#splashRingGradient)"
          strokeWidth="2.8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap={pct >= 100 ? "square" : "round"}
          fill="none"
          transform="rotate(-90 40 40)"
          className="transition-all duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
          style={{
            filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.85))",
          }}
        />
      </svg>

      {/* Pourcentage au centre en typographie moderne */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="font-mono tabular-nums text-xs sm:text-sm font-extrabold text-amber-100 tracking-tight"
          suppressHydrationWarning
        >
          {`${pct}%`}
        </span>
      </div>
    </div>
  );
}

/** Bloc textuel modernisé avec transitions fluides entre étapes */
export function SplashStatusBlock({
  status,
  statusKey,
  subtext,
}: {
  status: string;
  statusKey?: string;
  subtext?: string;
}) {
  const { t } = useI18n();
  const currentText = (statusKey && t[statusKey as keyof typeof t]) || status;

  return (
    <div className="space-y-1.5 max-w-xs mx-auto text-center px-4">
      {/* Libellé d'état animé */}
      <div key={statusKey || status} className="animate-splash-text min-h-[1.5rem] flex items-center justify-center">
        <p
          className="text-xs sm:text-sm font-medium text-amber-100/95 tracking-wide"
          suppressHydrationWarning
        >
          {currentText}
        </p>
      </div>

      {/* Sous-titre élégant et épuré */}
      <p
        className="text-[10px] sm:text-[11px] text-amber-300/70 tracking-[0.24em] uppercase font-semibold"
        suppressHydrationWarning
      >
        {subtext || t.splashPrep || "Préparation de l'application"}
      </p>
    </div>
  );
}

function SplashPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, guest } = useAuth();
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

    runFullAppPreload((p) => {
      if (active) {
        setProgress(p);
      }
    }).then(() => {
      if (!active) return;

      setTimeout(() => {
        if (!active) return;
        setFadingOut(true);
        setTimeout(() => {
          if (!active) return;
          navigate({ to: "/" });
        }, 600);
      }, 400);
    });

    return () => {
      active = false;
    };
  }, [navigate, user, guest]);

  return (
    <div
      className={`relative flex min-h-screen flex-col items-center justify-between overflow-hidden px-8 py-12 text-center select-none transition-all duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform] ${
        fadingOut ? "opacity-0 scale-[1.03] pointer-events-none" : "opacity-100 scale-100"
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

      {/* 4. Indicateur de progression circulaire moderne & Textes fluides */}
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
