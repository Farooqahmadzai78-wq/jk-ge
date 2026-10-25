import { isNativeAndroidRuntime } from "./ad-config";

/**
 * Pont hérité neutralisé afin d'éviter tout mélange entre l'ancien plugin
 * `@capacitor-community/admob` (Play Services Ads classique) et le moteur unique
 * GMA Next-Gen (`com.google.android.libraries.ads.mobile.sdk:ads-mobile-sdk:1.6.0`)
 * piloté par `src/lib/ad-system.ts` et `IslamNoorAdsPlugin.kt`.
 */

export function isNativeAndroidAds(): boolean {
  return isNativeAndroidRuntime();
}

export async function initAds(): Promise<boolean> {
  return isNativeAndroidRuntime();
}

export async function preloadInterstitial(): Promise<boolean> {
  return false;
}

export async function showInterstitial(): Promise<boolean> {
  return false;
}

export async function showFullscreenAdIfAvailable(): Promise<boolean> {
  return false;
}
