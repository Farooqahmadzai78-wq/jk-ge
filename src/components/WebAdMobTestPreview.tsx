import { useEffect, useRef, useState } from "react";
import { X, MonitorSmartphone, Image as ImageIcon, Film, ShieldCheck } from "lucide-react";
import {
  ADMOB_TEST_APP_ID,
  APP_OPEN_TEST_AD_UNIT_ID,
  INTERSTITIAL_TEST_AD_UNIT_ID,
  NATIVE_STATIC_TEST_AD_UNIT_ID,
  REWARDED_TEST_AD_UNIT_ID,
  isWebTestSimulationAllowed,
} from "@/lib/ad-config";
import {
  subscribeWebAdSimulation,
  type WebSimulatedEvent,
} from "@/lib/ad-system";

/**
 * Aperçu de simulation développeur Web clairement marqué « TEST » :
 * - Strictement désactivé en production (`import.meta.env.PROD === true`) et sur Android natif
 *   où seul le SDK officiel GMA Next-Gen s'exécute.
 * - Zéro bannière permanente : seuls App Open, Interstitiel, Carte Native image fixe (profil)
 *   et Vidéo Récompensée volontaire peuvent être prévisualisés en mode développement.
 */
export function WebAdMobTestPreview() {
  const simulationAllowed = isWebTestSimulationAllowed();
  const [activeEvent, setActiveEvent] = useState<WebSimulatedEvent | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [rewardTriggered, setRewardTriggered] = useState(false);
  const activeEventRef = useRef<WebSimulatedEvent | null>(null);
  const rewardTriggeredRef = useRef(false);

  useEffect(() => {
    activeEventRef.current = activeEvent;
  }, [activeEvent]);

  useEffect(() => {
    if (!simulationAllowed) return;

    return subscribeWebAdSimulation((event) => {
      if (activeEventRef.current !== null) {
        return false;
      }
      activeEventRef.current = event;
      rewardTriggeredRef.current = false;
      setRewardTriggered(false);

      if (event.kind === "fullscreen") {
        setCountdown(event.format === "app-open" ? 1 : 2);
        event.onImpression?.();
      } else if (event.kind === "profile-native") {
        setCountdown(0);
        event.onImpression?.();
      } else {
        setCountdown(3);
      }

      setActiveEvent(event);
      return true;
    });
  }, [simulationAllowed]);

  useEffect(() => {
    if (!activeEvent || countdown <= 0) return;
    const timer = window.setTimeout(() => {
      setCountdown((prev) => {
        const next = Math.max(0, prev - 1);
        if (
          next === 0 &&
          activeEventRef.current?.kind === "rewarded" &&
          !rewardTriggeredRef.current
        ) {
          rewardTriggeredRef.current = true;
          setRewardTriggered(true);
          activeEventRef.current.onRewardEarned();
        }
        return next;
      });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [activeEvent, countdown]);

  if (!simulationAllowed || !activeEvent) return null;

  /* ------------------------------------------------------------------------
     1. CARTE NATIVE COMPACTE IMAGE FIXE (PROFIL — SANS VIDÉO)
     ------------------------------------------------------------------------ */
  if (activeEvent.kind === "profile-native") {
    const handleCloseNative = () => {
      const current = activeEventRef.current;
      activeEventRef.current = null;
      setActiveEvent(null);
      if (current?.kind === "profile-native") {
        current.onDismiss();
      }
    };

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="TEST — Simulation Web Annonce Native Profil (Image fixe sans vidéo)"
        data-testid="web-admob-profile-native-test-simulation"
        className="fixed inset-0 z-[99990] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs select-none"
      >
        <div className="w-full max-w-sm space-y-2.5">
          {/* Barre supérieure EXTERNE à la zone NativeAdView : le bouton X ne déclenche jamais de clic publicitaire */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="rounded-md border border-amber-400 bg-amber-400/20 px-2 py-0.5 text-[10px] font-black tracking-widest uppercase text-amber-300">
                TEST
              </span>
              <span className="text-[11px] font-bold text-slate-200">
                Aperçu Web — Native sans vidéo
              </span>
            </div>

            <button
              type="button"
              onClick={handleCloseNative}
              aria-label="Fermer l'annonce native TEST"
              data-testid="profile-native-external-close"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg transition hover:bg-slate-100 active:scale-95 cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Zone NativeAdView simulée (séparée du bouton de fermeture externe ci-dessus) */}
          <div
            data-testid="simulated-native-ad-view"
            className="rounded-2xl border-2 border-dashed border-amber-400/60 bg-slate-900 p-4 text-slate-100 shadow-2xl space-y-3"
          >
            {/* Mentions obligatoires AdMob : Annonce + AdChoices */}
            <div className="flex items-center justify-between">
              <span className="rounded bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950">
                Annonce • TEST
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                <ShieldCheck className="size-3" />
                AdChoices
              </span>
            </div>

            <p className="text-[11px] font-semibold text-amber-300">{activeEvent.sourceLabel}</p>

            {/* Emplacement technique MediaView statique (zéro vidéo, zéro fausse image commerciale) */}
            <div className="flex h-32 w-full flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-3 text-center">
              <ImageIcon className="size-6 text-slate-400" />
              <span className="mt-1.5 text-xs font-bold text-slate-200">
                 Emplacement MediaView Image Fixe (TEST)
              </span>
              <span className="mt-0.5 text-[10px] text-emerald-400">
                hasVideoContent = false • Classification max = G
              </span>
            </div>

            <div className="space-y-1 font-mono text-[10px] text-slate-300 rounded-xl bg-slate-950 p-2.5 border border-slate-800">
              <div className="truncate">App ID : {ADMOB_TEST_APP_ID}</div>
              <div className="truncate">Native Unit : {NATIVE_STATIC_TEST_AD_UNIT_ID}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------
     2. VIDÉO RÉCOMPENSÉE VOLONTAIRE (« SOUTENIR ISLAM-NOOR »)
     ------------------------------------------------------------------------ */
  if (activeEvent.kind === "rewarded") {
    const handleEarlyCancel = () => {
      const current = activeEventRef.current;
      activeEventRef.current = null;
      setActiveEvent(null);
      if (current?.kind === "rewarded") {
        current.onFinish({ completed: false });
      }
    };

    const handleCompleteClose = () => {
      const current = activeEventRef.current;
      activeEventRef.current = null;
      setActiveEvent(null);
      if (current?.kind === "rewarded") {
        current.onFinish({ completed: rewardTriggeredRef.current });
      }
    };

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="TEST — Simulation Web Vidéo Récompensée Volontaire"
        data-testid="web-admob-rewarded-test-simulation"
        className="fixed inset-0 z-[99990] flex flex-col justify-between bg-slate-950/95 p-4 text-white backdrop-blur-sm select-none"
      >
        <div className="mx-auto flex w-full max-w-md items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md border-2 border-amber-400 bg-amber-400/20 px-2.5 py-1 text-xs font-black tracking-widest uppercase text-amber-300">
              TEST
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-emerald-400/50 bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-200">
              <Film className="size-3.5" />
              Vidéo Récompensée (Simulation Dev)
            </span>
          </div>

          <button
            type="button"
            onClick={rewardTriggered ? handleCompleteClose : handleEarlyCancel}
            aria-label={
              rewardTriggered
                ? "Fermer et récupérer le pack premium"
                : "Fermer avant la fin sans récompense"
            }
            className="flex min-h-11 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-slate-900 shadow-md transition hover:bg-slate-100 active:scale-95 cursor-pointer"
          >
            {rewardTriggered ? "Terminer" : "Quitter"} <X className="size-4" />
          </button>
        </div>

        <div className="mx-auto my-auto flex w-full max-w-sm flex-col items-center rounded-2xl border-2 border-dashed border-emerald-400/60 bg-slate-900 p-6 text-center text-slate-100 shadow-2xl">
          <span className="rounded-full bg-emerald-400 px-3 py-0.5 text-[11px] font-black tracking-wider uppercase text-slate-950">
            TEST — VIDÉO VOLONTAIRE SIMULÉE
          </span>

          <h2 className="mt-3 text-lg font-extrabold text-white">Soutenir Islam-Noor</h2>
          <p className="mt-1 text-xs font-semibold text-emerald-300">{activeEvent.sourceLabel}</p>

          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            {rewardTriggered
              ? "Callback OnUserEarnedRewardListener simulé reçu : votre pack de 2 thèmes est débloqué."
              : `Visionnage simulé en cours (${countdown}s restantes). Si vous quittez maintenant, aucune récompense ne sera accordée.`}
          </p>

          <div className="mt-4 w-full space-y-1.5 rounded-xl border border-slate-800 bg-slate-950 p-3 text-left font-mono text-[10px] text-slate-300">
            <div className="truncate">Mode : TEST Dev uniquement (inactif en production)</div>
            <div className="truncate">App ID : {ADMOB_TEST_APP_ID}</div>
            <div className="truncate">Rewarded Unit : {REWARDED_TEST_AD_UNIT_ID}</div>
          </div>

          {rewardTriggered ? (
            <button
              type="button"
              onClick={handleCompleteClose}
              className="mt-5 w-full rounded-xl bg-emerald-400 py-2.5 text-xs font-extrabold text-slate-950 shadow-sm transition hover:bg-emerald-300 cursor-pointer"
            >
              Découvrir mes 2 thèmes débloqués
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEarlyCancel}
              className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-slate-700 cursor-pointer"
            >
              Annuler avant la fin ({countdown}s) — sans récompense
            </button>
          )}
        </div>

        <div className="pb-2 text-center text-[11px] text-slate-400">
          Simulation développeur désactivée en production • Sur Android, GMA Next-Gen gère OnUserEarnedRewardListener.
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------
     3. PLEIN ÉCRAN (APP OPEN & INTERSTITIEL)
     ------------------------------------------------------------------------ */
  const isAppOpen = activeEvent.format === "app-open";
  const unitId = isAppOpen ? APP_OPEN_TEST_AD_UNIT_ID : INTERSTITIAL_TEST_AD_UNIT_ID;
  const formatTitle = isAppOpen ? "App Open (Ouverture)" : "Interstitiel Plein Écran";

  const handleCloseFullscreen = () => {
    const current = activeEventRef.current;
    activeEventRef.current = null;
    setActiveEvent(null);
    if (current?.kind === "fullscreen") {
      current.onDismiss();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`TEST — Simulation Web ${formatTitle}`}
      data-testid="web-admob-fullscreen-test-simulation"
      data-ad-format={activeEvent.format}
      className="fixed inset-0 z-[99990] flex flex-col justify-between bg-slate-950/95 p-4 text-white backdrop-blur-sm select-none"
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md border-2 border-amber-400 bg-amber-400/20 px-2.5 py-1 text-xs font-black tracking-widest uppercase text-amber-300">
            TEST
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-sky-400/50 bg-sky-500/15 px-2 py-1 text-[11px] font-bold text-sky-200">
            <MonitorSmartphone className="size-3.5" />
            Simulation Web (Aperçu Dev)
          </span>
        </div>

        {countdown > 0 ? (
          <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-white/15 px-3 text-xs font-semibold text-white">
            {countdown}s
          </span>
        ) : (
          <button
            type="button"
            onClick={handleCloseFullscreen}
            aria-label="Fermer la simulation publicitaire TEST"
            className="flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-slate-900 shadow-md transition hover:bg-slate-100 active:scale-95 cursor-pointer"
          >
            Continuer <X className="size-4" />
          </button>
        )}
      </div>

      <div className="mx-auto my-auto flex w-full max-w-sm flex-col items-center rounded-2xl border-2 border-dashed border-amber-400/60 bg-slate-900 p-6 text-center text-slate-100 shadow-2xl">
        <span className="rounded-full bg-amber-400 px-3 py-0.5 text-[11px] font-black tracking-wider uppercase text-slate-950">
          TEST — ANNONCE PLEIN ÉCRAN SIMULÉE
        </span>

        <h2 className="mt-3 text-lg font-extrabold text-white">{formatTitle}</h2>

        <p className="mt-1 text-xs font-semibold text-amber-300">{activeEvent.sourceLabel}</p>

        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          Aperçu développeur Web uniquement (inactif en production). Aucune bannière permanente
          n&apos;est présente dans Islam-Noor.
        </p>

        <div className="mt-4 w-full space-y-1.5 rounded-xl border border-slate-800 bg-slate-950 p-3 text-left font-mono text-[10px] text-slate-300">
          <div className="truncate">
            <span className="font-sans font-semibold text-slate-400">Mode : </span>
            TEST (Simulation navigateur Dev)
          </div>
          <div className="truncate">
            <span className="font-sans font-semibold text-slate-400">App ID : </span>
            {ADMOB_TEST_APP_ID}
          </div>
          <div className="truncate">
            <span className="font-sans font-semibold text-slate-400">Ad Unit : </span>
            {unitId}
          </div>
        </div>

        <button
          type="button"
          disabled={countdown > 0}
          onClick={handleCloseFullscreen}
          className={`mt-5 w-full rounded-xl py-2.5 text-xs font-bold transition ${
            countdown > 0
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer shadow-sm"
          }`}
        >
          {countdown > 0 ? `Fermeture disponible dans ${countdown}s…` : "Fermer l'annonce TEST"}
        </button>
      </div>

      <div className="pb-2 text-center text-[11px] text-slate-400">
        TEST Simulation Web • Sur téléphone Android, le SDK GMA Next-Gen affiche la vraie annonce de test AdMob.
      </div>
    </div>
  );
}
