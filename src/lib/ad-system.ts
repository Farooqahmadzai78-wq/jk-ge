import { registerPlugin } from "@capacitor/core";
import { audio } from "./audio-player";
import { getAzanStatus } from "./azan-audio-engine";
import { isInvocationPlaying } from "./invocation-speaker";
import { isSpeakerLoading, isSpeakerPlaying } from "./reminder-speaker";
import { getActiveIngredientAnalysis } from "./ingredient-analysis-tracker";
import {
  AD_DIAGNOSTIC_LOG_TAG,
  APP_OPEN_COOLDOWN_MS,
  CUSTOMIZATION_CHANGES_REQUIRED,
  LONG_ABSENCE_THRESHOLD_MS,
  NATIVE_CALL_TIMEOUT_MS,
  NATIVE_CARD_CALL_TIMEOUT_MS,
  PROFILE_PHOTO_CHANGES_REQUIRED,
  REWARDED_CALL_TIMEOUT_MS,
  isNativeAndroidRuntime,
  isWebAdPreviewRuntime,
  isWebTestSimulationAllowed,
} from "./ad-config";
import type { CustomGalleryBg } from "./app-settings";
import {
  unlockPremiumThemePack,
  type PremiumPackType,
  type UnlockPackResult,
} from "./premium-themes";

export {
  APP_OPEN_COOLDOWN_MS,
  CUSTOMIZATION_CHANGES_REQUIRED,
  LONG_ABSENCE_THRESHOLD_MS,
  PROFILE_PHOTO_CHANGES_REQUIRED,
};

/**
 * Système publicitaire intelligent Islam-Noor (Mission N22 — Zéro bannière permanente) :
 *
 * 1. Aucune bannière permanente (native ou Web).
 * 2. App Open automatique :
 *    - Uniquement au véritable lancement ("launch") ou au retour après >= 30 min ("resume").
 *    - Plafond strict d'1 annonce toutes les 4 heures (propre à App Open uniquement).
 *    - 9 compteurs persistants distinguant ouvertures réelles, retours admissibles,
 *      opportunités, requêtes de chargement, tentatives d'affichage, échecs et
 *      impressions réelles confirmées par callback SDK (`onAdImpression`).
 * 3. Interstitiel après chaque paire (2) de modifications ordinaires validées :
 *    - Compteur partagé unique entre Arrière-plans, Bordures et Widgets.
 *    - Exception impérative N22 : l'application d'un thème, widget ou bordure premium
 *      débloqué grâce à une publicité récompensée (`unlockedByReward === true`)
 *      n'incrémente JAMAIS ce compteur et ne déclenche JAMAIS d'interstitiel.
 *    - AUCUN délai chronométré de 5 minutes sur ce déclencheur.
 *    - Enregistrement systématique du changement AVANT la tentative d'affichage.
 *    - En cas d'indisponibilité/échec, la personnalisation se termine immédiatement,
 *      l'échec est journalisé et le compteur repart sur un nouveau cycle propre (0)
 *      sans annonce tardive ni inattendue.
 * 4. Annonce native avec image fixe (sans vidéo) après 2 photos de profil enregistrées :
 *    - Compteur dédié séparé (2 photos enregistrées, sans délai chronométré).
 *    - Rejet strict de toute créative contenant une vidéo (`hasVideoContent === true`)
 *      et libération explicite des ressources (`destroy()`) à la fermeture.
 * 5. Vidéo récompensée volontaire ("Soutenir Islam-Noor") :
 *    - Débloque 1 pack de 2 thèmes premium uniquement sur confirmation officielle
 *      `onUserEarnedReward`, avec garde d'idempotence empêchant toute double récompense.
 *    - La simulation Web « TEST » n'est jamais active en production et n'accorde jamais
 *      de vraies récompenses en production.
 * 6. Protections religieuses et fonctionnelles absolues :
 *    - Aucune publicité pendant le Coran, les prières, l'adhan, toute lecture audio/TTS
 *      ou le scanner alimentaire / halal, ni en superposition d'une autre annonce.
 */

export type CustomizationCategory = "background" | "border" | "widget";
export type FullscreenAdFormat = "app-open" | "interstitial";
export type AppOpenTriggerSource = "launch" | "resume";

export const AD_SYSTEM_STORAGE_KEY = "islamnoor_ad_system_v2";
const LEGACY_AD_SYSTEM_STORAGE_KEY = "islamnoor_ad_system_v1";

export interface AppOpenTelemetry {
  /** Nombre total de lancements réels de l'application */
  totalRealLaunches: number;
  /** Nombre de retours depuis l'arrière-plan après >= 30 minutes */
  eligibleBackgroundResumes: number;
  /** Nombre d'ouvertures admissibles pour une App Open (hors écrans protégés et hors plafond 4h) */
  eligibleAppOpenOpportunities: number;
  /** Nombre de requêtes de chargement App Open émises */
  loadRequests: number;
  /** Nombre de tentatives d'affichage App Open */
  showAttempts: number;
  /** Nombre d'impressions réelles confirmées par callback SDK (`onAdImpression`) */
  confirmedImpressions: number;
  /** Nombre d'échecs de chargement ou d'affichage App Open */
  loadFailures: number;
  /** Nombre d'ouvertures réelles/admissibles depuis la dernière impression réelle confirmée */
  opensSinceLastConfirmedImpression: number;
  /** Horodatage ISO-8601 de la dernière impression App Open confirmée (ou null) */
  lastConfirmedImpressionAt: string | null;
}

export interface AdSystemPersistedState {
  customizationCount: number;
  profilePhotoCount: number;
  interstitialFailureCount: number;
  nativeProfileFailureCount: number;
  nativeVideoRejectedCount: number;
  lastAppOpenShownAtMs: number | null;
  lastBackgroundedAtMs: number | null;
  appOpenTelemetry: AppOpenTelemetry;
}

export type AdAttemptReason =
  | "shown"
  | "count-below-threshold"
  | "no-change"
  | "reward-unlocked-exempt"
  | "app-open-cooldown"
  | "short-absence"
  | "load-failed"
  | "show-without-impression"
  | "video-rejected"
  | "dismissed-without-reward"
  | "duplicate-reward-blocked"
  | "web-simulation-disabled-in-prod"
  | "premium"
  | "in-flight"
  | "protected:quran"
  | "protected:prayers"
  | "protected:adhan"
  | "protected:audio"
  | "protected:food-scanner"
  | "protected:action-in-progress"
  | "protected:splash";

export interface AdAttemptResult {
  attempted: boolean;
  shown: boolean;
  reason: AdAttemptReason;
  count: number;
}

export interface RewardedAdAttemptResult {
  attempted: boolean;
  shown: boolean;
  rewardGranted: boolean;
  isTestSimulation: boolean;
  reason: AdAttemptReason;
  sessionId: string | null;
  unlockedPack: UnlockPackResult | null;
}

export interface ClockLike {
  now(): number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ProtectionSnapshot {
  pathname: string;
  isAdhanPlaying: boolean;
  isAudioPlaying: boolean;
  isScannerBusy: boolean;
  isActionInProgress: boolean;
}

export interface AppOpenShowCallbacks {
  onLoadRequest: () => void;
  onLoadFailure: () => void;
  onConfirmedImpression: () => void;
}

export interface ProfileNativeCreativeHandle {
  available: boolean;
  hasVideoContent?: boolean;
  presentedNatively?: boolean;
  headline?: string;
  body?: string;
  advertiser?: string;
  callToAction?: string;
  isTestSimulation?: boolean;
  destroy?: () => void;
}

export interface RewardedPresentationOutcome {
  shown: boolean;
  rewardEarned: boolean;
  isTestSimulation?: boolean;
}

export interface AdSystemPresenter {
  showAppOpen(
    source: AppOpenTriggerSource,
    callbacks: AppOpenShowCallbacks,
  ): Promise<{ shown: boolean; impressionConfirmed?: boolean }>;
  showInterstitial(category: CustomizationCategory): Promise<boolean>;
  requestProfileNativeAd(): Promise<ProfileNativeCreativeHandle>;
  showRewardedAd(
    packType: PremiumPackType,
    sessionId: string,
    onRewardEarned: () => void,
  ): Promise<RewardedPresentationOutcome>;
}

/** Alias de compatibilité pour les tests existants */
export type FullscreenAdPresenter = Partial<AdSystemPresenter> & {
  showInterstitial: (category: CustomizationCategory) => Promise<boolean>;
};

export interface AdDiagnosticLogEntry {
  tag: typeof AD_DIAGNOSTIC_LOG_TAG;
  timestampIso: string;
  event: string;
  details: Record<string, string | number | boolean | null>;
}

interface IslamNoorAdsNativePlugin {
  showAppOpenAd(options: { source: AppOpenTriggerSource }): Promise<{
    shown: boolean;
    impressionConfirmed?: boolean;
    loadRequested?: boolean;
    loadFailed?: boolean;
  }>;
  showInterstitialAd(options: { category: CustomizationCategory }): Promise<{ shown: boolean }>;
  showProfileNativeAd(): Promise<{
    shown: boolean;
    videoRejected?: boolean;
    reason?: string;
  }>;
  showRewardedAd(options: {
    packType: PremiumPackType;
    sessionId: string;
  }): Promise<{
    shown: boolean;
    rewardEarned: boolean;
    reason?: string;
  }>;
  getAppOpenDiagnostics(): Promise<Partial<AppOpenTelemetry> | null>;
}

const NativeAdsBridge = registerPlugin<IslamNoorAdsNativePlugin>("IslamNoorAds");

/* ============================================================================
   BUS DE SIMULATION WEB « TEST » (STRICTEMENT DÉSACTIVÉ EN PRODUCTION)
   ============================================================================ */

export type WebSimulatedEvent =
  | {
      kind: "fullscreen";
      format: FullscreenAdFormat;
      sourceLabel: string;
      onImpression?: () => void;
      onDismiss: () => void;
    }
  | {
      kind: "profile-native";
      sourceLabel: string;
      onImpression?: () => void;
      onDismiss: () => void;
    }
  | {
      kind: "rewarded";
      packType: PremiumPackType;
      sessionId: string;
      sourceLabel: string;
      onRewardEarned: () => void;
      onFinish: (outcome: { completed: boolean }) => void;
    };

type WebSimulationSubscriber = (event: WebSimulatedEvent) => boolean;
const webSimulationSubscribers = new Set<WebSimulationSubscriber>();

export function subscribeWebAdSimulation(listener: WebSimulationSubscriber): () => void {
  webSimulationSubscribers.add(listener);
  return () => {
    webSimulationSubscribers.delete(listener);
  };
}

/** Compatibilité avec d'éventuels abonnés plein écran uniquement */
export interface WebSimulatedAdEvent {
  format: FullscreenAdFormat;
  sourceLabel: string;
}

export function subscribeWebFullscreenSimulation(
  listener: (event: WebSimulatedAdEvent) => boolean,
): () => void {
  return subscribeWebAdSimulation((ev) => {
    if (ev.kind !== "fullscreen") return false;
    const accepted = listener({ format: ev.format, sourceLabel: ev.sourceLabel });
    if (accepted) {
      ev.onImpression?.();
    }
    return accepted;
  });
}

/* ============================================================================
   JOURNAL DE DIAGNOSTIC SANS DONNÉES PERSONNELLES (TAG: ISLAMNOOR_ADS)
   ============================================================================ */

const MAX_DIAGNOSTIC_LOGS = 150;
let diagnosticLogs: AdDiagnosticLogEntry[] = [];

export function emitAdDiagnosticLog(
  event: string,
  details: Record<string, string | number | boolean | null> = {},
): void {
  const entry: AdDiagnosticLogEntry = {
    tag: AD_DIAGNOSTIC_LOG_TAG,
    timestampIso: new Date(clock.now()).toISOString(),
    event,
    details,
  };
  diagnosticLogs.push(entry);
  if (diagnosticLogs.length > MAX_DIAGNOSTIC_LOGS) {
    diagnosticLogs = diagnosticLogs.slice(-MAX_DIAGNOSTIC_LOGS);
  }
  try {
    console.info(`[${AD_DIAGNOSTIC_LOG_TAG}] ${event}`, details);
  } catch {
    // ignore console restriction
  }
}

export function getAdDiagnosticLogs(): readonly AdDiagnosticLogEntry[] {
  return diagnosticLogs;
}

/* ============================================================================
   HORLOGE, STOCKAGE & PROTECTIONS PAR DÉFAUT
   ============================================================================ */

const defaultClock: ClockLike = {
  now: () => Date.now(),
};

const defaultStorage: StorageLike = {
  getItem: (key) => {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    } catch {
      // quota ou stockage indisponible : ne jamais bloquer l'application
    }
  },
  removeItem: (key) => {
    try {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

function hasPlayingMediaElements(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const mediaList = document.querySelectorAll<HTMLMediaElement>("audio, video");
    for (let i = 0; i < mediaList.length; i += 1) {
      const m = mediaList[i];
      if (!m.paused && !m.ended && m.readyState > 0) {
        return true;
      }
    }
  } catch {
    // ignore DOM query error
  }
  return false;
}

function hasScannerDomOverlay(): boolean {
  if (typeof document === "undefined") return false;
  try {
    return document.querySelector("[data-scanner-active='true']") !== null;
  } catch {
    return false;
  }
}

function defaultProtectionSnapshot(): ProtectionSnapshot {
  const pathname =
    typeof window !== "undefined" && window.location ? window.location.pathname || "/" : "/";
  const azan = getAzanStatus();
  const isAdhanPlaying = Boolean(azan.isPlaying || azan.isLoading);
  const isAudioPlaying = Boolean(
    audio.state.playing ||
      isInvocationPlaying() ||
      isSpeakerPlaying() ||
      isSpeakerLoading() ||
      hasPlayingMediaElements(),
  );
  const activeAnalysis = getActiveIngredientAnalysis();
  const isScannerBusy = Boolean(
    (activeAnalysis &&
      (activeAnalysis.status === "pending" || activeAnalysis.status === "processing")) ||
      hasScannerDomOverlay(),
  );

  return {
    pathname,
    isAdhanPlaying,
    isAudioPlaying,
    isScannerBusy,
    isActionInProgress: false,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, timeoutMs);

    promise
      .then((res) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(res);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

/* ============================================================================
   PRÉSENTATEUR PAR DÉFAUT (ANDROID GMA NEXT-GEN NATIF + SIMULATION WEB « TEST »)
   ============================================================================ */

const defaultPresenter: AdSystemPresenter = {
  async showAppOpen(
    source: AppOpenTriggerSource,
    callbacks: AppOpenShowCallbacks,
  ): Promise<{ shown: boolean; impressionConfirmed?: boolean }> {
    if (isNativeAndroidRuntime()) {
      const res = await withTimeout(
        NativeAdsBridge.showAppOpenAd({ source }),
        NATIVE_CALL_TIMEOUT_MS,
        { shown: false },
      );
      if (res?.loadRequested) callbacks.onLoadRequest();
      if (res?.loadFailed) callbacks.onLoadFailure();
      if (res?.impressionConfirmed) callbacks.onConfirmedImpression();
      return {
        shown: Boolean(res?.shown),
        impressionConfirmed: Boolean(res?.impressionConfirmed),
      };
    }

    if (isWebTestSimulationAllowed() && webSimulationSubscribers.size > 0) {
      callbacks.onLoadRequest();
      let displayed = false;
      let impressionConfirmed = false;
      webSimulationSubscribers.forEach((sub) => {
        if (displayed) return;
        try {
          const accepted = sub({
            kind: "fullscreen",
            format: "app-open",
            sourceLabel:
              source === "launch"
                ? "TEST — Ouverture réelle de l'application (App Open)"
                : "TEST — Retour après absence >= 30 min (App Open)",
            onImpression: () => {
              impressionConfirmed = true;
              callbacks.onConfirmedImpression();
            },
            onDismiss: () => {},
          });
          if (accepted) displayed = true;
        } catch {
          // ignore
        }
      });
      if (!displayed) {
        callbacks.onLoadFailure();
      }
      return { shown: displayed, impressionConfirmed };
    }

    return { shown: false, impressionConfirmed: false };
  },

  async showInterstitial(category: CustomizationCategory): Promise<boolean> {
    if (isNativeAndroidRuntime()) {
      const res = await withTimeout(
        NativeAdsBridge.showInterstitialAd({ category }),
        NATIVE_CALL_TIMEOUT_MS,
        { shown: false },
      );
      return Boolean(res?.shown);
    }

    if (isWebTestSimulationAllowed() && webSimulationSubscribers.size > 0) {
      const labels: Record<CustomizationCategory, string> = {
        background: "TEST — 2e modification validée (Arrière-plan)",
        border: "TEST — 2e modification validée (Bordures)",
        widget: "TEST — 2e modification validée (Widgets)",
      };
      let displayed = false;
      webSimulationSubscribers.forEach((sub) => {
        if (displayed) return;
        try {
          if (
            sub({
              kind: "fullscreen",
              format: "interstitial",
              sourceLabel: labels[category],
              onDismiss: () => {},
            })
          ) {
            displayed = true;
          }
        } catch {
          // ignore
        }
      });
      return displayed;
    }

    return false;
  },

  async requestProfileNativeAd(): Promise<ProfileNativeCreativeHandle> {
    if (isNativeAndroidRuntime()) {
      const res = await withTimeout(
        NativeAdsBridge.showProfileNativeAd(),
        NATIVE_CARD_CALL_TIMEOUT_MS,
        { shown: false, reason: "timeout" },
      );
      if (res?.videoRejected) {
        return {
          available: true,
          hasVideoContent: true,
          presentedNatively: false,
          destroy: () => {},
        };
      }
      return {
        available: Boolean(res?.shown),
        hasVideoContent: false,
        presentedNatively: Boolean(res?.shown),
        destroy: () => {},
      };
    }

    if (isWebTestSimulationAllowed() && webSimulationSubscribers.size > 0) {
      let displayed = false;
      webSimulationSubscribers.forEach((sub) => {
        if (displayed) return;
        try {
          if (
            sub({
              kind: "profile-native",
              sourceLabel: "TEST — 2e photo de profil enregistrée (Native image fixe sans vidéo)",
              onDismiss: () => {
                dismissActiveProfileNativeAd();
              },
            })
          ) {
            displayed = true;
          }
        } catch {
          // ignore
        }
      });

      return {
        available: displayed,
        hasVideoContent: false,
        presentedNatively: displayed,
        isTestSimulation: true,
        destroy: () => {},
      };
    }

    return { available: false };
  },

  async showRewardedAd(
    packType: PremiumPackType,
    sessionId: string,
    onRewardEarned: () => void,
  ): Promise<RewardedPresentationOutcome> {
    if (isNativeAndroidRuntime()) {
      const res = await withTimeout(
        NativeAdsBridge.showRewardedAd({ packType, sessionId }),
        REWARDED_CALL_TIMEOUT_MS,
        { shown: false, rewardEarned: false, reason: "timeout" },
      );
      if (res?.rewardEarned) {
        onRewardEarned();
      }
      return {
        shown: Boolean(res?.shown),
        rewardEarned: Boolean(res?.rewardEarned),
        isTestSimulation: false,
      };
    }

    if (isWebTestSimulationAllowed() && webSimulationSubscribers.size > 0) {
      const packLabels: Record<PremiumPackType, string> = {
        backgrounds: "TEST — Soutien volontaire (Pack Arrière-plans)",
        widgets: "TEST — Soutien volontaire (Pack Widgets)",
        borders: "TEST — Soutien volontaire (Pack Bordures)",
      };

      return new Promise<RewardedPresentationOutcome>((resolve) => {
        let acceptedBySubscriber = false;
        let earned = false;

        webSimulationSubscribers.forEach((sub) => {
          if (acceptedBySubscriber) return;
          try {
            const accepted = sub({
              kind: "rewarded",
              packType,
              sessionId,
              sourceLabel: packLabels[packType],
              onRewardEarned: () => {
                earned = true;
                onRewardEarned();
              },
              onFinish: ({ completed }) => {
                resolve({
                  shown: true,
                  rewardEarned: Boolean(completed && earned),
                  isTestSimulation: true,
                });
              },
            });
            if (accepted) {
              acceptedBySubscriber = true;
            }
          } catch {
            // ignore
          }
        });

        if (!acceptedBySubscriber) {
          resolve({ shown: false, rewardEarned: false, isTestSimulation: true });
        }
      });
    }

    return { shown: false, rewardEarned: false };
  },
};

/* ============================================================================
   ÉTAT INTERNE & MUTEX D'EXCLUSION MUTUELLE (ZÉRO SUPERPOSITION D'ANNONCES)
   ============================================================================ */

let clock: ClockLike = defaultClock;
let storage: StorageLike = defaultStorage;
let getProtection: () => ProtectionSnapshot = defaultProtectionSnapshot;
let presenter: AdSystemPresenter = defaultPresenter;
let hasCustomPresenterForTests = false;
let inFlight = false;
let activeProfileNativeDestroy: (() => void) | null = null;
const processedRewardSessionsInMemory = new Set<string>();
let sessionNonce = 0;

export function configureAdSystemForTests(overrides: {
  clock?: ClockLike;
  storage?: StorageLike;
  getProtection?: () => ProtectionSnapshot;
  presenter?: Partial<AdSystemPresenter> & {
    showAppOpen?: (
      source: AppOpenTriggerSource,
      callbacks?: AppOpenShowCallbacks,
    ) => Promise<boolean | { shown: boolean; impressionConfirmed?: boolean }>;
  };
}): void {
  if (overrides.clock) clock = overrides.clock;
  if (overrides.storage) storage = overrides.storage;
  if (overrides.getProtection) getProtection = overrides.getProtection;
  if (overrides.presenter) {
    hasCustomPresenterForTests = true;
    const custom = overrides.presenter;
    presenter = {
      async showAppOpen(source, callbacks) {
        if (!custom.showAppOpen) {
          return { shown: false, impressionConfirmed: false };
        }
        const raw = await custom.showAppOpen(source, callbacks);
        if (typeof raw === "boolean") {
          // Compatibilité avec les mocks simples retournant un booléen :
          // si `raw === true`, simule requête + impression confirmée sauf si le test
          // utilise déjà explicitement l'objet détaillé `{ shown, impressionConfirmed }`.
          callbacks.onLoadRequest();
          if (raw) {
            callbacks.onConfirmedImpression();
          } else {
            callbacks.onLoadFailure();
          }
          return { shown: raw, impressionConfirmed: raw };
        }
        return raw;
      },
      async showInterstitial(category) {
        if (!custom.showInterstitial) return false;
        return custom.showInterstitial(category);
      },
      async requestProfileNativeAd() {
        if (!custom.requestProfileNativeAd) return { available: false };
        return custom.requestProfileNativeAd();
      },
      async showRewardedAd(packType, sessionId, onRewardEarned) {
        if (!custom.showRewardedAd) return { shown: false, rewardEarned: false };
        return custom.showRewardedAd(packType, sessionId, onRewardEarned);
      },
    };
  }
}

export function resetAdSystemForTests(): void {
  if (activeProfileNativeDestroy) {
    try {
      activeProfileNativeDestroy();
    } catch {
      // ignore
    }
    activeProfileNativeDestroy = null;
  }
  clock = defaultClock;
  storage = defaultStorage;
  getProtection = defaultProtectionSnapshot;
  presenter = defaultPresenter;
  hasCustomPresenterForTests = false;
  inFlight = false;
  processedRewardSessionsInMemory.clear();
  diagnosticLogs = [];
}

function normalizePathname(raw: string): string {
  if (!raw || raw === "/") return "/";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

/**
 * Évalue toutes les protections obligatoires :
 * - Aucune publicité pendant le Coran, les prières, l'adhan, la lecture audio/TTS
 *   ou le scanner alimentaire / halal, ni pendant une action en cours.
 */
export function evaluateAdProtection(
  snapshot: ProtectionSnapshot = getProtection(),
): AdAttemptReason | null {
  const path = normalizePathname(snapshot.pathname);

  if (path === "/splash") return "protected:splash";
  if (snapshot.isAdhanPlaying) return "protected:adhan";
  if (snapshot.isAudioPlaying) return "protected:audio";
  if (path === "/quran" || path.startsWith("/quran/")) return "protected:quran";
  if (path === "/prayers" || path.startsWith("/prayers/")) return "protected:prayers";
  if (path === "/halal" || path.startsWith("/halal/") || snapshot.isScannerBusy) {
    return "protected:food-scanner";
  }
  if (snapshot.isActionInProgress) return "protected:action-in-progress";

  return null;
}

/* ============================================================================
   PERSISTANCE DE L'ÉTAT PUBLICITAIRE & DES 9 COMPTEURS APP OPEN
   ============================================================================ */

export function createInitialAppOpenTelemetry(): AppOpenTelemetry {
  return {
    totalRealLaunches: 0,
    eligibleBackgroundResumes: 0,
    eligibleAppOpenOpportunities: 0,
    loadRequests: 0,
    showAttempts: 0,
    confirmedImpressions: 0,
    loadFailures: 0,
    opensSinceLastConfirmedImpression: 0,
    lastConfirmedImpressionAt: null,
  };
}

function safeNonNegInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

export function loadAdSystemState(): AdSystemPersistedState {
  const initialTelemetry = createInitialAppOpenTelemetry();
  try {
    const raw =
      storage.getItem(AD_SYSTEM_STORAGE_KEY) ?? storage.getItem(LEGACY_AD_SYSTEM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AdSystemPersistedState>;
      const rawCustomCount = safeNonNegInt(parsed.customizationCount);
      const rawProfileCount = safeNonNegInt(parsed.profilePhotoCount);
      const tel = (parsed.appOpenTelemetry || {}) as Partial<AppOpenTelemetry>;

      return {
        customizationCount: Math.min(CUSTOMIZATION_CHANGES_REQUIRED, rawCustomCount),
        profilePhotoCount: Math.min(PROFILE_PHOTO_CHANGES_REQUIRED, rawProfileCount),
        interstitialFailureCount: safeNonNegInt(parsed.interstitialFailureCount),
        nativeProfileFailureCount: safeNonNegInt(parsed.nativeProfileFailureCount),
        nativeVideoRejectedCount: safeNonNegInt(parsed.nativeVideoRejectedCount),
        lastAppOpenShownAtMs:
          typeof parsed.lastAppOpenShownAtMs === "number" ? parsed.lastAppOpenShownAtMs : null,
        lastBackgroundedAtMs:
          typeof parsed.lastBackgroundedAtMs === "number" ? parsed.lastBackgroundedAtMs : null,
        appOpenTelemetry: {
          totalRealLaunches: safeNonNegInt(tel.totalRealLaunches),
          eligibleBackgroundResumes: safeNonNegInt(tel.eligibleBackgroundResumes),
          eligibleAppOpenOpportunities: safeNonNegInt(tel.eligibleAppOpenOpportunities),
          loadRequests: safeNonNegInt(tel.loadRequests),
          showAttempts: safeNonNegInt(tel.showAttempts),
          confirmedImpressions: safeNonNegInt(tel.confirmedImpressions),
          loadFailures: safeNonNegInt(tel.loadFailures),
          opensSinceLastConfirmedImpression: safeNonNegInt(tel.opensSinceLastConfirmedImpression),
          lastConfirmedImpressionAt:
            typeof tel.lastConfirmedImpressionAt === "string"
              ? tel.lastConfirmedImpressionAt
              : null,
        },
      };
    }
  } catch {
    // État corrompu ou indisponible -> valeurs initiales sûres
  }

  return {
    customizationCount: 0,
    profilePhotoCount: 0,
    interstitialFailureCount: 0,
    nativeProfileFailureCount: 0,
    nativeVideoRejectedCount: 0,
    lastAppOpenShownAtMs: null,
    lastBackgroundedAtMs: null,
    appOpenTelemetry: initialTelemetry,
  };
}

function saveAdSystemState(state: AdSystemPersistedState): void {
  storage.setItem(AD_SYSTEM_STORAGE_KEY, JSON.stringify(state));
}

export function getSharedCustomizationCount(): number {
  return loadAdSystemState().customizationCount;
}

export function getProfilePhotoChangeCount(): number {
  return loadAdSystemState().profilePhotoCount;
}

export function getAppOpenTelemetry(): AppOpenTelemetry {
  return { ...loadAdSystemState().appOpenTelemetry };
}

/* ============================================================================
   DÉTECTION STRICTE DES CHANGEMENTS RÉELLEMENT APPLIQUÉS
   ============================================================================ */

export function hasThemeSelectionChanged(previousId: string, nextId: string): boolean {
  return Boolean(nextId) && previousId !== nextId;
}

export function hasGalleryCustomizationChanged(
  previousBgTheme: string,
  previousGallery: CustomGalleryBg | null,
  nextGallery: CustomGalleryBg,
): boolean {
  if (previousBgTheme !== "bg-gallery-custom" || !previousGallery) {
    return true;
  }
  return (
    previousGallery.imageUrl !== nextGallery.imageUrl ||
    previousGallery.zoom !== nextGallery.zoom ||
    previousGallery.blur !== nextGallery.blur ||
    previousGallery.brightness !== nextGallery.brightness ||
    previousGallery.contrast !== nextGallery.contrast ||
    previousGallery.overlayType !== nextGallery.overlayType ||
    previousGallery.overlayOpacity !== nextGallery.overlayOpacity
  );
}

/* ============================================================================
   1. INTERSTITIEL APRÈS CHAQUE PAIRE DE PERSONNALISATIONS VALIDÉES (SANS DÉLAI 5 MIN)
   ============================================================================ */

/**
 * Applique et enregistre d'abord une modification validée de personnalisation
 * (Arrière-plan, Bordure ou Widget), puis incrémente le compteur partagé unique.
 *
 * Règle N21 :
 * - Une annonce interstitielle après chaque paire (2) de modifications validées,
 *   quelle que soit leur combinaison, SANS délai chronométré de 5 minutes.
 * - Si aucune annonce n'est prête (ou si une protection est active), la personnalisation
 *   se termine immédiatement, l'échec est enregistré, et le compteur repart à 0 pour un
 *   nouveau cycle propre sans jamais afficher d'annonce tardive ni enchaîner deux annonces.
 */
export async function applyValidatedCustomizationChange(
  category: CustomizationCategory,
  applyAndPersistChange: () => void,
  options?: { isPremium?: boolean; hasChanged?: boolean; unlockedByReward?: boolean },
): Promise<AdAttemptResult> {
  if (options?.hasChanged === false) {
    return {
      attempted: false,
      shown: false,
      reason: "no-change",
      count: getSharedCustomizationCount(),
    };
  }

  // 1. Enregistrer impérativement le changement AVANT toute logique publicitaire
  applyAndPersistChange();

  // 2. Exception impérative N22 : un élément débloqué grâce à une récompense publicitaire
  //    (information explicite `unlockedByReward === true`) ne compte jamais comme une
  //    modification déclenchant un interstitiel et préserve le compteur ordinaire intact.
  const state = loadAdSystemState();
  if (options?.unlockedByReward === true) {
    emitAdDiagnosticLog("customization_reward_unlocked_exempt", {
      category,
      preservedCount: state.customizationCount,
    });
    return {
      attempted: false,
      shown: false,
      reason: "reward-unlocked-exempt",
      count: state.customizationCount,
    };
  }

  // 3. Incrémenter le compteur partagé unique aux 3 catégories (modifications ordinaires)
  const nextCount = Math.min(CUSTOMIZATION_CHANGES_REQUIRED, state.customizationCount + 1);
  state.customizationCount = nextCount;
  saveAdSystemState(state);

  emitAdDiagnosticLog("customization_validated", {
    category,
    sharedCount: nextCount,
  });

  if (nextCount < CUSTOMIZATION_CHANGES_REQUIRED) {
    return {
      attempted: false,
      shown: false,
      reason: "count-below-threshold",
      count: nextCount,
    };
  }

  // Dès la 2e modification atteinte, on prépare le redémarrage d'un nouveau cycle propre (0)
  // afin de ne jamais déclencher d'annonce tardive ou répétée sur le 3e changement.
  if (options?.isPremium) {
    state.customizationCount = 0;
    saveAdSystemState(state);
    return {
      attempted: false,
      shown: false,
      reason: "premium",
      count: 0,
    };
  }

  const protectionReason = evaluateAdProtection();
  if (protectionReason !== null) {
    state.customizationCount = 0;
    saveAdSystemState(state);
    emitAdDiagnosticLog("customization_interstitial_blocked_protected", {
      category,
      reason: protectionReason,
    });
    return {
      attempted: true,
      shown: false,
      reason: protectionReason,
      count: 0,
    };
  }

  if (inFlight || activeProfileNativeDestroy !== null) {
    state.customizationCount = 0;
    saveAdSystemState(state);
    emitAdDiagnosticLog("customization_interstitial_skipped_overlap", {
      category,
    });
    return {
      attempted: false,
      shown: false,
      reason: "in-flight",
      count: 0,
    };
  }

  // Réinitialise immédiatement le compteur à 0 pour garantir l'absence d'annonce tardive
  state.customizationCount = 0;
  saveAdSystemState(state);

  inFlight = true;
  try {
    const shown = await presenter.showInterstitial(category);
    if (shown) {
      emitAdDiagnosticLog("customization_interstitial_shown", {
        category,
        countAfter: 0,
      });
      return {
        attempted: true,
        shown: true,
        reason: "shown",
        count: 0,
      };
    }

    const failedState = loadAdSystemState();
    failedState.customizationCount = 0;
    failedState.interstitialFailureCount += 1;
    saveAdSystemState(failedState);
    emitAdDiagnosticLog("customization_interstitial_unavailable_cycle_reset", {
      category,
      interstitialFailureCount: failedState.interstitialFailureCount,
    });
    return {
      attempted: true,
      shown: false,
      reason: "load-failed",
      count: 0,
    };
  } catch {
    const failedState = loadAdSystemState();
    failedState.customizationCount = 0;
    failedState.interstitialFailureCount += 1;
    saveAdSystemState(failedState);
    emitAdDiagnosticLog("customization_interstitial_exception_cycle_reset", {
      category,
      interstitialFailureCount: failedState.interstitialFailureCount,
    });
    return {
      attempted: true,
      shown: false,
      reason: "load-failed",
      count: 0,
    };
  } finally {
    inFlight = false;
  }
}

/* ============================================================================
   2. ANNONCE NATIVE IMAGE FIXE (SANS VIDÉO) APRÈS 2 PHOTOS DE PROFIL ENREGISTRÉES
   ============================================================================ */

export function isProfileNativeModalOpen(): boolean {
  return activeProfileNativeDestroy !== null;
}

/**
 * Ferme proprement la carte native de profil et libère immédiatement les ressources
 * associées (`nativeAd.destroy()`).
 */
export function dismissActiveProfileNativeAd(): void {
  const destroyFn = activeProfileNativeDestroy;
  activeProfileNativeDestroy = null;
  if (destroyFn) {
    try {
      destroyFn();
    } catch {
      // ignore cleanup error
    }
    emitAdDiagnosticLog("profile_native_dismissed_and_destroyed", {});
  }
}

/**
 * Enregistre d'abord une modification réelle de photo de profil, incrémente son
 * compteur dédié séparé, et après la 2e sauvegarde tente d'afficher une carte
 * native avec image fixe (rejetant strictement toute créative vidéo).
 */
export async function applySavedProfilePhotoChange(
  persistProfilePhoto: () => void,
  options?: { isPremium?: boolean; hasChanged?: boolean },
): Promise<AdAttemptResult> {
  if (options?.hasChanged === false) {
    return {
      attempted: false,
      shown: false,
      reason: "no-change",
      count: getProfilePhotoChangeCount(),
    };
  }

  // 1. Toujours sauvegarder la photo de profil AVANT toute logique publicitaire
  persistProfilePhoto();

  const state = loadAdSystemState();
  const nextCount = Math.min(PROFILE_PHOTO_CHANGES_REQUIRED, state.profilePhotoCount + 1);
  state.profilePhotoCount = nextCount;
  saveAdSystemState(state);

  emitAdDiagnosticLog("profile_photo_saved", {
    profilePhotoCount: nextCount,
  });

  if (nextCount < PROFILE_PHOTO_CHANGES_REQUIRED) {
    return {
      attempted: false,
      shown: false,
      reason: "count-below-threshold",
      count: nextCount,
    };
  }

  // Remise à 0 immédiate du cycle de 2 photos de profil
  state.profilePhotoCount = 0;
  saveAdSystemState(state);

  if (options?.isPremium) {
    return {
      attempted: false,
      shown: false,
      reason: "premium",
      count: 0,
    };
  }

  const protectionReason = evaluateAdProtection();
  if (protectionReason !== null) {
    emitAdDiagnosticLog("profile_native_blocked_protected", {
      reason: protectionReason,
    });
    return {
      attempted: true,
      shown: false,
      reason: protectionReason,
      count: 0,
    };
  }

  if (inFlight || activeProfileNativeDestroy !== null) {
    emitAdDiagnosticLog("profile_native_skipped_overlap", {});
    return {
      attempted: false,
      shown: false,
      reason: "in-flight",
      count: 0,
    };
  }

  inFlight = true;
  try {
    const creative = await presenter.requestProfileNativeAd();

    // Règle stricte N21 : si AdMob renvoie une créative vidéo, la rejeter proprement,
    // détruire la ressource immédiatement, et ne JAMAIS afficher de vidéo ni d'image maison fabriquée.
    if (creative.available && creative.hasVideoContent === true) {
      try {
        creative.destroy?.();
      } catch {
        // ignore
      }
      const updated = loadAdSystemState();
      updated.nativeVideoRejectedCount += 1;
      saveAdSystemState(updated);
      emitAdDiagnosticLog("profile_native_video_rejected", {
        nativeVideoRejectedCount: updated.nativeVideoRejectedCount,
      });
      return {
        attempted: true,
        shown: false,
        reason: "video-rejected",
        count: 0,
      };
    }

    if (!creative.available) {
      const updated = loadAdSystemState();
      updated.nativeProfileFailureCount += 1;
      saveAdSystemState(updated);
      emitAdDiagnosticLog("profile_native_unavailable", {
        nativeProfileFailureCount: updated.nativeProfileFailureCount,
      });
      return {
        attempted: true,
        shown: false,
        reason: "load-failed",
        count: 0,
      };
    }

    // Si une poignée `destroy` est fournie et que la modale reste ouverte côté UI/test,
    // on la garde jusqu'à l'appel explicite `dismissActiveProfileNativeAd()`.
    if (creative.destroy && !isNativeAndroidRuntime()) {
      activeProfileNativeDestroy = creative.destroy;
    }

    emitAdDiagnosticLog("profile_native_static_shown", {
      isTestSimulation: Boolean(creative.isTestSimulation),
    });

    return {
      attempted: true,
      shown: true,
      reason: "shown",
      count: 0,
    };
  } catch {
    const updated = loadAdSystemState();
    updated.nativeProfileFailureCount += 1;
    saveAdSystemState(updated);
    emitAdDiagnosticLog("profile_native_exception", {
      nativeProfileFailureCount: updated.nativeProfileFailureCount,
    });
    return {
      attempted: true,
      shown: false,
      reason: "load-failed",
      count: 0,
    };
  } finally {
    inFlight = false;
  }
}

/* ============================================================================
   3. SOUTIEN VOLONTAIRE & VIDÉO RÉCOMPENSÉE (REWARDED AD)
   ============================================================================ */

function createRewardSessionId(): string {
  sessionNonce += 1;
  return `islamnoor_reward_${clock.now()}_${sessionNonce}`;
}

/**
 * Lance volontairement une vidéo récompensée après confirmation explicite de l'utilisateur
 * et débloque exactement 1 pack (2 thèmes) de la catégorie choisie UNIQUEMENT lorsque le
 * callback officiel `onUserEarnedReward` confirme le gain.
 */
export async function tryShowVoluntaryRewardedAd(
  packType: PremiumPackType,
  options?: { explicitSessionId?: string },
): Promise<RewardedAdAttemptResult> {
  const protectionReason = evaluateAdProtection();
  if (protectionReason !== null) {
    emitAdDiagnosticLog("rewarded_blocked_protected", {
      packType,
      reason: protectionReason,
    });
    return {
      attempted: false,
      shown: false,
      rewardGranted: false,
      isTestSimulation: false,
      reason: protectionReason,
      sessionId: null,
      unlockedPack: null,
    };
  }

  // Sécurité Production : la simulation Web ne doit JAMAIS accorder de vraies récompenses en production
  if (
    !hasCustomPresenterForTests &&
    !isNativeAndroidRuntime() &&
    isWebAdPreviewRuntime() &&
    !isWebTestSimulationAllowed()
  ) {
    emitAdDiagnosticLog("rewarded_web_blocked_in_production", { packType });
    return {
      attempted: false,
      shown: false,
      rewardGranted: false,
      isTestSimulation: false,
      reason: "web-simulation-disabled-in-prod",
      sessionId: null,
      unlockedPack: null,
    };
  }

  const sessionId = options?.explicitSessionId?.trim() || createRewardSessionId();
  if (processedRewardSessionsInMemory.has(sessionId)) {
    emitAdDiagnosticLog("rewarded_duplicate_session_blocked", { packType, sessionId });
    return {
      attempted: false,
      shown: false,
      rewardGranted: false,
      isTestSimulation: false,
      reason: "duplicate-reward-blocked",
      sessionId,
      unlockedPack: null,
    };
  }

  if (inFlight || activeProfileNativeDestroy !== null) {
    return {
      attempted: false,
      shown: false,
      rewardGranted: false,
      isTestSimulation: false,
      reason: "in-flight",
      sessionId,
      unlockedPack: null,
    };
  }

  inFlight = true;
  let callbackGrantCount = 0;
  let unlockedResult: UnlockPackResult | null = null;

  const handleSdkEarnedRewardCallback = () => {
    callbackGrantCount += 1;
    // Protection anti-double callback au sein d'un même visionnage
    if (callbackGrantCount > 1 || processedRewardSessionsInMemory.has(sessionId)) {
      emitAdDiagnosticLog("rewarded_duplicate_callback_ignored", {
        packType,
        sessionId,
        callbackGrantCount,
      });
      return;
    }
    processedRewardSessionsInMemory.add(sessionId);
    unlockedResult = unlockPremiumThemePack(packType, sessionId);
    emitAdDiagnosticLog("rewarded_pack_unlocked", {
      packType,
      sessionId,
      unlocked: unlockedResult.unlocked,
    });
  };

  try {
    const outcome = await presenter.showRewardedAd(
      packType,
      sessionId,
      handleSdkEarnedRewardCallback,
    );

    if (!outcome.shown) {
      emitAdDiagnosticLog("rewarded_load_or_show_failed", { packType, sessionId });
      return {
        attempted: true,
        shown: false,
        rewardGranted: false,
        isTestSimulation: Boolean(outcome.isTestSimulation),
        reason: "load-failed",
        sessionId,
        unlockedPack: null,
      };
    }

    // Si le présentateur signale `rewardEarned: true` sans avoir appelé le callback inline,
    // on traite exactement une fois via la même garde idempotente.
    if (outcome.rewardEarned && callbackGrantCount === 0) {
      handleSdkEarnedRewardCallback();
    }

    const finalUnlock = unlockedResult as UnlockPackResult | null;
    if (!outcome.rewardEarned || !finalUnlock?.unlocked) {
      emitAdDiagnosticLog("rewarded_dismissed_without_reward", {
        packType,
        sessionId,
      });
      return {
        attempted: true,
        shown: true,
        rewardGranted: false,
        isTestSimulation: Boolean(outcome.isTestSimulation),
        reason: finalUnlock?.alreadyGranted
          ? "duplicate-reward-blocked"
          : "dismissed-without-reward",
        sessionId,
        unlockedPack: null,
      };
    }

    return {
      attempted: true,
      shown: true,
      rewardGranted: true,
      isTestSimulation: Boolean(outcome.isTestSimulation),
      reason: "shown",
      sessionId,
      unlockedPack: finalUnlock,
    };
  } catch {
    emitAdDiagnosticLog("rewarded_exception", { packType, sessionId });
    return {
      attempted: true,
      shown: false,
      rewardGranted: false,
      isTestSimulation: false,
      reason: "load-failed",
      sessionId,
      unlockedPack: null,
    };
  } finally {
    inFlight = false;
  }
}

/* ============================================================================
   4. APP OPEN & 9 COMPTEURS PERSISTANTS D'OUVERTURES / IMPRESSIONS CONFIRMÉES
   ============================================================================ */

export function recordAppBackgrounded(): void {
  const state = loadAdSystemState();
  state.lastBackgroundedAtMs = clock.now();
  saveAdSystemState(state);
}

/**
 * Enregistre une impression App Open réellement confirmée par le callback `onAdImpression`
 * du SDK GMA Next-Gen (et met à jour le plafond de 4h ainsi que la remise à zéro du compteur
 * `opensSinceLastConfirmedImpression`).
 */
export function recordConfirmedAppOpenImpression(timestampMs: number = clock.now()): void {
  const state = loadAdSystemState();
  const iso = new Date(timestampMs).toISOString();
  state.lastAppOpenShownAtMs = timestampMs;
  state.appOpenTelemetry.confirmedImpressions += 1;
  state.appOpenTelemetry.opensSinceLastConfirmedImpression = 0;
  state.appOpenTelemetry.lastConfirmedImpressionAt = iso;
  saveAdSystemState(state);

  emitAdDiagnosticLog("app_open_impression_confirmed", {
    confirmedImpressions: state.appOpenTelemetry.confirmedImpressions,
    opensSinceLastConfirmedImpression: 0,
    lastConfirmedImpressionAt: iso,
  });
}

export function recordAppOpenLoadRequest(): void {
  const state = loadAdSystemState();
  state.appOpenTelemetry.loadRequests += 1;
  saveAdSystemState(state);
  emitAdDiagnosticLog("app_open_load_request", {
    loadRequests: state.appOpenTelemetry.loadRequests,
  });
}

export function recordAppOpenLoadFailure(): void {
  const state = loadAdSystemState();
  state.appOpenTelemetry.loadFailures += 1;
  saveAdSystemState(state);
  emitAdDiagnosticLog("app_open_load_failure", {
    loadFailures: state.appOpenTelemetry.loadFailures,
  });
}

/**
 * Tente d'afficher une annonce App Open :
 * - Au véritable lancement (`"launch"`) ou après une absence >= 30 min (`"resume"`).
 * - Maximum 1 impression toutes les 4 heures (`APP_OPEN_COOLDOWN_MS`, propre à App Open).
 * - Ne compte une impression réelle QUE lorsque `onConfirmedImpression` (SDK `onAdImpression`)
 *   est appelé — jamais sur un simple chargement ou une tentative d'affichage non confirmée.
 */
export async function tryShowAppOpenAd(
  source: AppOpenTriggerSource,
  options?: { isPremium?: boolean },
): Promise<AdAttemptResult> {
  const state = loadAdSystemState();
  const now = clock.now();

  if (source === "resume") {
    const backgroundedAt = state.lastBackgroundedAtMs;
    state.lastBackgroundedAtMs = null;

    if (backgroundedAt === null || now - backgroundedAt < LONG_ABSENCE_THRESHOLD_MS) {
      saveAdSystemState(state);
      return {
        attempted: false,
        shown: false,
        reason: "short-absence",
        count: state.customizationCount,
      };
    }

    // Retour admissible après >= 30 min en arrière-plan
    state.appOpenTelemetry.eligibleBackgroundResumes += 1;
    state.appOpenTelemetry.opensSinceLastConfirmedImpression += 1;
    saveAdSystemState(state);
  } else {
    // Véritable lancement de l'application
    state.appOpenTelemetry.totalRealLaunches += 1;
    state.appOpenTelemetry.opensSinceLastConfirmedImpression += 1;
    saveAdSystemState(state);
  }

  emitAdDiagnosticLog("app_open_entry_recorded", {
    source,
    totalRealLaunches: state.appOpenTelemetry.totalRealLaunches,
    eligibleBackgroundResumes: state.appOpenTelemetry.eligibleBackgroundResumes,
    opensSinceLastConfirmedImpression: state.appOpenTelemetry.opensSinceLastConfirmedImpression,
  });

  if (options?.isPremium) {
    return {
      attempted: false,
      shown: false,
      reason: "premium",
      count: state.customizationCount,
    };
  }

  const protectionReason = evaluateAdProtection();
  if (protectionReason !== null) {
    emitAdDiagnosticLog("app_open_blocked_protected", {
      source,
      reason: protectionReason,
    });
    return {
      attempted: false,
      shown: false,
      reason: protectionReason,
      count: state.customizationCount,
    };
  }

  if (
    state.lastAppOpenShownAtMs !== null &&
    now - state.lastAppOpenShownAtMs < APP_OPEN_COOLDOWN_MS
  ) {
    emitAdDiagnosticLog("app_open_blocked_4h_cap", {
      source,
      msRemaining: APP_OPEN_COOLDOWN_MS - (now - state.lastAppOpenShownAtMs),
    });
    return {
      attempted: false,
      shown: false,
      reason: "app-open-cooldown",
      count: state.customizationCount,
    };
  }

  if (inFlight || activeProfileNativeDestroy !== null) {
    return {
      attempted: false,
      shown: false,
      reason: "in-flight",
      count: state.customizationCount,
    };
  }

  // L'ouverture est pleinement admissible à une opportunité App Open et une tentative d'affichage
  const preAttempt = loadAdSystemState();
  preAttempt.appOpenTelemetry.eligibleAppOpenOpportunities += 1;
  preAttempt.appOpenTelemetry.showAttempts += 1;
  saveAdSystemState(preAttempt);

  inFlight = true;
  let impressionConfirmedDuringCall = false;

  const callbacks: AppOpenShowCallbacks = {
    onLoadRequest: () => {
      recordAppOpenLoadRequest();
    },
    onLoadFailure: () => {
      recordAppOpenLoadFailure();
    },
    onConfirmedImpression: () => {
      if (!impressionConfirmedDuringCall) {
        impressionConfirmedDuringCall = true;
        recordConfirmedAppOpenImpression(clock.now());
      }
    },
  };

  try {
    const res = await presenter.showAppOpen(source, callbacks);
    if (res.impressionConfirmed && !impressionConfirmedDuringCall) {
      impressionConfirmedDuringCall = true;
      recordConfirmedAppOpenImpression(clock.now());
    }

    if (res.shown) {
      // Sur Android natif, `onAdImpression()` peut arriver de manière asynchrone quelques ms
      // après `ad.show(this)` via l'événement DOM `islamnoor:native-ad-event`.
      return {
        attempted: true,
        shown: true,
        reason: impressionConfirmedDuringCall || isNativeAndroidRuntime()
          ? "shown"
          : "show-without-impression",
        count: loadAdSystemState().customizationCount,
      };
    }

    return {
      attempted: true,
      shown: false,
      reason: "load-failed",
      count: loadAdSystemState().customizationCount,
    };
  } catch {
    recordAppOpenLoadFailure();
    return {
      attempted: true,
      shown: false,
      reason: "load-failed",
      count: loadAdSystemState().customizationCount,
    };
  } finally {
    inFlight = false;
  }
}

/* ============================================================================
   ÉCOUTEUR D'ÉVÉNEMENTS SDK NATIFS ANDROID -> WEBVIEW (CALLBACKS TEMPS RÉEL)
   ============================================================================ */

if (typeof window !== "undefined") {
  window.addEventListener("islamnoor:native-ad-event", (rawEvent: Event) => {
    const custom = rawEvent as CustomEvent<{
      type?: string;
      timestampMs?: number;
    }>;
    const detail = custom.detail;
    if (!detail?.type) return;

    if (detail.type === "app-open-load-request") {
      recordAppOpenLoadRequest();
    } else if (detail.type === "app-open-load-failure") {
      recordAppOpenLoadFailure();
    } else if (detail.type === "app-open-impression") {
      recordConfirmedAppOpenImpression(
        typeof detail.timestampMs === "number" ? detail.timestampMs : clock.now(),
      );
    }
  });
}
