import { Capacitor } from "@capacitor/core";
import {
  PREMIUM_ENTITLEMENT_ID,
  REVENUECAT_ANDROID_PUBLIC_KEY,
} from "./billing-config";
import { PREMIUM_ENABLED } from "./premium";

/**
 * Logique d'abonnement premium RevenueCat (Capacitor).
 *
 * Tout n'est actif QUE sur Android natif ET avec une clé publique réelle.
 * Tant que la clé est 'REPLACE_ME' (placeholder) ou hors Android natif :
 *   - aucun SDK n'est initialisé,
 *   - isPremium reste faux,
 *   - aucune erreur bloquante n'est levée (tout est silencieux/notify).
 * Aucune clé secrète n'est présente dans le code.
 */

type PurchasesModule = typeof import("@revenuecat/purchases-capacitor").Purchases;
type PremiumSetter = (value: boolean) => void;

let purchases: PurchasesModule | null = null;
let configured = false;
let onPremiumChange: PremiumSetter | null = null;

/** Vrai si la clé RevenueCat est bien renseignée (non-placeholder). */
export function isBillingKeyConfigured(
  key: string = REVENUECAT_ANDROID_PUBLIC_KEY,
): boolean {
  return typeof key === "string" && key.trim().length > 0 && key !== "REPLACE_ME";
}

/** Vrai uniquement sur un conteneur Capacitor Android natif. */
export function isNativeAndroid(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      Capacitor.isNativePlatform() &&
      Capacitor.getPlatform() === "android"
    );
  } catch {
    return false;
  }
}

/**
 * Indique si le billing peut être initialisé : Android natif ET clé configurée.
 * C'est la porte d'entrée unique utilisée avant tout appel natif.
 */
export function canInitializeBilling(
  isNative: boolean = isNativeAndroid(),
  key: string = REVENUECAT_ANDROID_PUBLIC_KEY,
): boolean {
  // Abonnement desactive pour la version de lancement : aucune SDK de
  // facturation n'est initialisee, meme si une cle etait renseignee.
  if (!PREMIUM_ENABLED) return false;
  return isNative && isBillingKeyConfigured(key);
}

/**
 * Détermine si l'utilisateur a l'entitlement 'premium' actif.
 * Fonction pure (testable hors natif).
 */
export function hasPremiumEntitlement(activeEntitlements: {
  [key: string]: unknown;
} | null | undefined): boolean {
  if (!activeEntitlements) return false;
  return (
    Object.prototype.hasOwnProperty.call(activeEntitlements, PREMIUM_ENTITLEMENT_ID)
  );
}

async function loadPurchases(): Promise<PurchasesModule | null> {
  if (purchases) return purchases;
  try {
    const mod = await import("@revenuecat/purchases-capacitor");
    purchases = mod.Purchases;
    return purchases;
  } catch (err) {
    console.warn("[billing] chargement RevenueCat indisponible:", err);
    return null;
  }
}

/**
 * Initialise le SDK RevenueCat, lit l'état d'abonné (entitlement 'premium')
 * et tient `setPremium()` à jour. Sans effet (retourne false) si la clé est
 * 'REPLACE_ME' ou hors Android natif.
 */
export async function initializeBilling(setPremium: PremiumSetter): Promise<boolean> {
  onPremiumChange = setPremium;

  if (!canInitializeBilling()) {
    // Placeholder ou non-natif : on n'initialise rien, isPremium reste faux.
    return false;
  }

  const P = await loadPurchases();
  if (!P) return false;

  try {
    if (!configured) {
      await P.configure({ apiKey: REVENUECAT_ANDROID_PUBLIC_KEY });
      configured = true;
    }

    const { customerInfo } = await P.getCustomerInfo();
    applyCustomerInfo(customerInfo);

    await P.addCustomerInfoUpdateListener((info) => applyCustomerInfo(info));
    return true;
  } catch (err) {
    // Non bloquant : on laisse isPremium à sa valeur courante (faux par défaut).
    console.warn("[billing] initialisation RevenueCat échouée:", err);
    return false;
  }
}

function applyCustomerInfo(info: {
  entitlements?: { active?: { [key: string]: unknown } } | null;
} | null): void {
  if (!onPremiumChange) return;
  const active = info?.entitlements?.active ?? null;
  onPremiumChange(hasPremiumEntitlement(active));
}

/** Récupère les offres du magasin. Retourne null si indisponible (non bloquant). */
export async function getOfferings(): Promise<
  import("@revenuecat/purchases-capacitor").PurchasesOfferings | null
> {
  if (!canInitializeBilling() || !configured) return null;
  const P = await loadPurchases();
  if (!P) return null;
  try {
    return await P.getOfferings();
  } catch (err) {
    console.warn("[billing] getOfferings échoué:", err);
    return null;
  }
}

/** Achète un package. Retourne false si indisponible/annulé (non bloquant). */
export async function purchasePackage(
  pkg: import("@revenuecat/purchases-capacitor").PurchasesPackage,
): Promise<boolean> {
  if (!canInitializeBilling() || !configured) return false;
  const P = await loadPurchases();
  if (!P) return false;
  try {
    const { customerInfo } = await P.purchasePackage({ aPackage: pkg });
    applyCustomerInfo(customerInfo);
    return true;
  } catch (err) {
    // Annulation de l'utilisateur ou erreur : non bloquant.
    console.warn("[billing] achat échoué/annulé:", err);
    return false;
  }
}

/** Restaure les achats antérieurs. Retourne false si indisponible (non bloquant). */
export async function restorePurchases(): Promise<boolean> {
  if (!canInitializeBilling() || !configured) return false;
  const P = await loadPurchases();
  if (!P) return false;
  try {
    const { customerInfo } = await P.restorePurchases();
    applyCustomerInfo(customerInfo);
    return true;
  } catch (err) {
    console.warn("[billing] restauration échouée:", err);
    return false;
  }
}