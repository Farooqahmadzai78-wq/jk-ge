import { describe, expect, it } from "vitest";
import { ADS_ENABLED, PREMIUM_ENABLED } from "@/lib/premium";
import { ADMOB_USE_TEST_IDS, BANNER_ADS_ENABLED } from "@/lib/ad-config";
import { canShowFullscreen } from "@/lib/ad-budget";
import { adsMayBeTriggered } from "@/lib/ads-enabled";
import { AdSlot } from "@/components/AdSlot";

/**
 * Vérifie l'état global des drapeaux publicitaires et de l'abonnement :
 * - Bannières totalement désactivées (natives et Web).
 * - Publicités plein écran de test activées.
 * - Abonnement premium désactivé.
 */
describe("configuration publicitaire plein écran et premium", () => {
  it("désactive intégralement les bannières publicitaires", () => {
    expect(BANNER_ADS_ENABLED).toBe(false);
    expect(AdSlot({ placement: "home" })).toBeNull();
  });

  it("active uniquement les publicités plein écran avec identifiants de test", () => {
    expect(ADS_ENABLED).toBe(true);
    expect(ADMOB_USE_TEST_IDS).toBe(true);
    expect(adsMayBeTriggered()).toBe(true);
  });

  it("conserve la cohérence du budget plein écran", () => {
    const decision = canShowFullscreen("theme-background", false);
    expect(typeof decision.allowed).toBe("boolean");
  });
});

describe("abonnement premium desactive", () => {
  it("le drapeau PREMIUM_ENABLED est a false", () => {
    expect(PREMIUM_ENABLED).toBe(false);
  });
});
