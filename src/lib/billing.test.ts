import { describe, it, expect } from "vitest";
import {
  isBillingKeyConfigured,
  canInitializeBilling,
  hasPremiumEntitlement,
} from "./billing";
import { REVENUECAT_ANDROID_PUBLIC_KEY, PREMIUM_ENTITLEMENT_ID } from "./billing-config";
import { PREMIUM_ENABLED } from "./premium";

describe("billing-config", () => {
  it("garde la clé Android en placeholder", () => {
    expect(REVENUECAT_ANDROID_PUBLIC_KEY).toBe("REPLACE_ME");
  });

  it("expose l'entitlement 'premium'", () => {
    expect(PREMIUM_ENTITLEMENT_ID).toBe("premium");
  });
});

describe("isBillingKeyConfigured", () => {
  it("retourne false pour le placeholder REPLACE_ME", () => {
    expect(isBillingKeyConfigured("REPLACE_ME")).toBe(false);
  });

  it("retourne false pour une chaîne vide ou blanche", () => {
    expect(isBillingKeyConfigured("")).toBe(false);
    expect(isBillingKeyConfigured("   ")).toBe(false);
  });

  it("retourne true pour une clé réelle", () => {
    expect(isBillingKeyConfigured("appl_xxx")).toBe(true);
  });

  it("utilise la clé du config par défaut (placeholder actuel → false)", () => {
    expect(isBillingKeyConfigured()).toBe(false);
  });
});

describe("canInitializeBilling (abonnement désactivé pour le lancement)", () => {
  it("false hors Android natif même avec une clé réelle", () => {
    expect(canInitializeBilling(false, "appl_xxx")).toBe(false);
  });

  it("false sur Android mais clé placeholder", () => {
    expect(canInitializeBilling(true, "REPLACE_ME")).toBe(false);
  });

  it("false même sur Android natif avec une clé réelle : le abonnement est désactivé", () => {
    // Décision de lancement : aucun abonnement proposé, donc aucune SDK de
    // facturation n'est initialisée, quelle que soit la clé.
    expect(PREMIUM_ENABLED).toBe(false);
    expect(canInitializeBilling(true, "appl_xxx")).toBe(false);
  });

  it("état réel du projet : non initialisable", () => {
    expect(canInitializeBilling()).toBe(false);
  });
});

describe("hasPremiumEntitlement", () => {
  it("true si l'entitlement 'premium' est actif", () => {
    expect(hasPremiumEntitlement({ [PREMIUM_ENTITLEMENT_ID]: {} })).toBe(true);
  });

  it("false si absent ou structures nulles", () => {
    expect(hasPremiumEntitlement({})).toBe(false);
    expect(hasPremiumEntitlement({ other: {} })).toBe(false);
    expect(hasPremiumEntitlement(null)).toBe(false);
    expect(hasPremiumEntitlement(undefined)).toBe(false);
  });
});