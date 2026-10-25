import { Capacitor } from "@capacitor/core";

/**
 * Configuration centralisée AdMob — Islam-Noor (Mission N22).
 *
 * Source unique de vérité côté Web / TypeScript :
 * - Conserve exclusivement les 5 IDENTIFIANTS DE TEST publics officiels Google AdMob
 *   tant que `ADMOB_USE_TEST_IDS === true`.
 * - Pour passer en production ultérieurement : renseigner `ADMOB_PRODUCTION_IDS`
 *   et basculer `ADMOB_USE_TEST_IDS` à `false` (ainsi que dans `AdPolicy.kt` et `AndroidManifest.xml`).
 * - Toutes les bannières permanentes sont définitivement désactivées (`BANNER_ADS_ENABLED = false`).
 * - Formats autorisés et isolés :
 *     1. App Open (ouverture réelle ou absence >= 30 min, max 1 impression confirmée / 4h)
 *     2. Interstitiel (après chaque paire de personnalisations ordinaires validées ;
 *        les thèmes/bordures débloqués par récompense en sont explicitement exemptés)
 *     3. Native image fixe SANS vidéo (après 2 photos de profil enregistrées)
 *     4. Vidéo récompensée volontaire (« Soutenir Islam-Noor » -> 1 pack de 2 thèmes)
 */

export const ADMOB_USE_TEST_IDS = true;

/** Aucune bannière publicitaire permanente n'est autorisée (native ou Web). */
export const BANNER_ADS_ENABLED = false as const;

/** Classification de contenu maximale la plus stricte du SDK : Audience Générale (G). */
export const MAX_AD_CONTENT_RATING = "G" as const;

/** Tag unique de diagnostic console / Logcat (sans aucune donnée personnelle). */
export const AD_DIAGNOSTIC_LOG_TAG = "ISLAMNOOR_ADS" as const;

/** Les 5 identifiants officiels de test Google AdMob. */
export const ADMOB_TEST_APP_ID = "ca-app-pub-3940256099942544~3347511713";
export const APP_OPEN_TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/9257395921";
export const INTERSTITIAL_TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712";
export const NATIVE_STATIC_TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/2247696110";
export const REWARDED_TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/5224354917";

/**
 * Emplacements centralisés prêts pour le futur remplacement par les IDs de production
 * (non utilisés tant que `ADMOB_USE_TEST_IDS === true`).
 */
export const ADMOB_PRODUCTION_IDS = {
  appId: ADMOB_TEST_APP_ID,
  appOpen: APP_OPEN_TEST_AD_UNIT_ID,
  interstitial: INTERSTITIAL_TEST_AD_UNIT_ID,
  nativeStatic: NATIVE_STATIC_TEST_AD_UNIT_ID,
  rewarded: REWARDED_TEST_AD_UNIT_ID,
} as const;

export const ADMOB_APP_ID = ADMOB_USE_TEST_IDS ? ADMOB_TEST_APP_ID : ADMOB_PRODUCTION_IDS.appId;
export const APP_OPEN_AD_UNIT_ID = ADMOB_USE_TEST_IDS
  ? APP_OPEN_TEST_AD_UNIT_ID
  : ADMOB_PRODUCTION_IDS.appOpen;
export const INTERSTITIAL_AD_UNIT_ID = ADMOB_USE_TEST_IDS
  ? INTERSTITIAL_TEST_AD_UNIT_ID
  : ADMOB_PRODUCTION_IDS.interstitial;
export const NATIVE_STATIC_AD_UNIT_ID = ADMOB_USE_TEST_IDS
  ? NATIVE_STATIC_TEST_AD_UNIT_ID
  : ADMOB_PRODUCTION_IDS.nativeStatic;
export const REWARDED_AD_UNIT_ID = ADMOB_USE_TEST_IDS
  ? REWARDED_TEST_AD_UNIT_ID
  : ADMOB_PRODUCTION_IDS.rewarded;

/** Paramètres centralisés de fréquence, de seuils et de délais d'attente réseau. */
export const CUSTOMIZATION_CHANGES_REQUIRED = 2 as const;
export const PROFILE_PHOTO_CHANGES_REQUIRED = 2 as const;
export const APP_OPEN_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 heures (App Open uniquement)
export const LONG_ABSENCE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export const NATIVE_CALL_TIMEOUT_MS = 3_500;
export const NATIVE_CARD_CALL_TIMEOUT_MS = 12_000;
export const REWARDED_CALL_TIMEOUT_MS = 90_000;

let runtimeEnvOverrideForTests: { isProd?: boolean; isNativeAndroid?: boolean; isWeb?: boolean } | null =
  null;

export function setAdRuntimeOverrideForTests(
  override: { isProd?: boolean; isNativeAndroid?: boolean; isWeb?: boolean } | null,
): void {
  runtimeEnvOverrideForTests = override;
}

export function isProductionBuild(): boolean {
  if (runtimeEnvOverrideForTests?.isProd !== undefined) {
    return runtimeEnvOverrideForTests.isProd;
  }
  return Boolean(import.meta.env?.PROD);
}

/** Retourne `true` sur conteneur Capacitor Android natif (SDK GMA Next-Gen). */
export function isNativeAndroidRuntime(): boolean {
  if (runtimeEnvOverrideForTests?.isNativeAndroid !== undefined) {
    return runtimeEnvOverrideForTests.isNativeAndroid;
  }
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android"
  );
}

/**
 * Retourne `true` uniquement dans un navigateur Web hors conteneur natif Capacitor.
 */
export function isWebAdPreviewRuntime(): boolean {
  if (runtimeEnvOverrideForTests?.isWeb !== undefined) {
    return runtimeEnvOverrideForTests.isWeb;
  }
  return typeof window !== "undefined" && !Capacitor.isNativePlatform();
}

/**
 * La simulation Web clairement marquée « TEST » est strictement réservée au mode
 * développement / aperçu et est désactivée en production afin de ne jamais afficher
 * de fausses publicités ni accorder de vraies récompenses hors SDK natif en production.
 */
export function isWebTestSimulationAllowed(env?: {
  isProd?: boolean;
  isNativeAndroid?: boolean;
  isWeb?: boolean;
}): boolean {
  const isProd = env?.isProd ?? isProductionBuild();
  const isNative = env?.isNativeAndroid ?? isNativeAndroidRuntime();
  if (isProd || isNative) {
    return false;
  }
  const isWeb = env?.isWeb ?? isWebAdPreviewRuntime();
  return isWeb;
}
