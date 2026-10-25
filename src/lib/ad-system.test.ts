import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  APP_OPEN_COOLDOWN_MS,
  CUSTOMIZATION_CHANGES_REQUIRED,
  LONG_ABSENCE_THRESHOLD_MS,
  PROFILE_PHOTO_CHANGES_REQUIRED,
  applySavedProfilePhotoChange,
  applyValidatedCustomizationChange,
  configureAdSystemForTests,
  dismissActiveProfileNativeAd,
  evaluateAdProtection,
  getAdDiagnosticLogs,
  getAppOpenTelemetry,
  getProfilePhotoChangeCount,
  getSharedCustomizationCount,
  hasGalleryCustomizationChanged,
  hasThemeSelectionChanged,
  isProfileNativeModalOpen,
  loadAdSystemState,
  recordAppBackgrounded,
  resetAdSystemForTests,
  tryShowAppOpenAd,
  tryShowVoluntaryRewardedAd,
  type AppOpenShowCallbacks,
  type AppOpenTriggerSource,
  type CustomizationCategory,
  type ProfileNativeCreativeHandle,
  type ProtectionSnapshot,
} from "./ad-system";
import {
  AD_DIAGNOSTIC_LOG_TAG,
  ADMOB_TEST_APP_ID,
  APP_OPEN_TEST_AD_UNIT_ID,
  BANNER_ADS_ENABLED,
  INTERSTITIAL_TEST_AD_UNIT_ID,
  MAX_AD_CONTENT_RATING,
  NATIVE_STATIC_TEST_AD_UNIT_ID,
  REWARDED_TEST_AD_UNIT_ID,
  isWebTestSimulationAllowed,
} from "./ad-config";
import {
  configurePremiumThemesForTests,
  getUnlockedPremiumThemesState,
  resetPremiumThemesForTests,
  unlockPremiumThemePack,
} from "./premium-themes";
import { ALL_BG_THEMES, isRewardUnlockedTheme } from "./customization-themes";
import { AdSlot } from "@/components/AdSlot";
import { FullscreenAdPlaceholder } from "@/components/FullscreenAdPlaceholder";

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("Mission N21 — Système publicitaire intelligent Islam-Noor", () => {
  let nowMs: number;
  let protection: ProtectionSnapshot;
  let interstitialCalls: CustomizationCategory[];
  let appOpenCalls: AppOpenTriggerSource[];
  let interstitialResult: boolean | "throw";
  let appOpenHandler: (
    source: AppOpenTriggerSource,
    callbacks?: AppOpenShowCallbacks,
  ) => Promise<boolean | { shown: boolean; impressionConfirmed?: boolean }>;
  let profileNativeFactory: () => Promise<ProfileNativeCreativeHandle>;
  let rewardedHandler: (
    packType: "backgrounds" | "widgets" | "borders",
    sessionId: string,
    onRewardEarned: () => void,
  ) => Promise<{ shown: boolean; rewardEarned: boolean }>;

  beforeEach(() => {
    nowMs = new Date("2026-06-15T10:00:00Z").getTime();
    protection = {
      pathname: "/settings",
      isAdhanPlaying: false,
      isAudioPlaying: false,
      isScannerBusy: false,
      isActionInProgress: false,
    };
    interstitialCalls = [];
    appOpenCalls = [];
    interstitialResult = true;

    appOpenHandler = async (source, callbacks) => {
      appOpenCalls.push(source);
      callbacks?.onLoadRequest();
      callbacks?.onConfirmedImpression();
      return { shown: true, impressionConfirmed: true };
    };

    profileNativeFactory = async () => ({
      available: true,
      hasVideoContent: false,
      destroy: () => {},
    });

    rewardedHandler = async (_packType, _sessionId, onRewardEarned) => {
      onRewardEarned();
      return { shown: true, rewardEarned: true };
    };

    const adStorage = createMemoryStorage();
    const themeStorage = createMemoryStorage();

    configurePremiumThemesForTests({ storage: themeStorage });
    configureAdSystemForTests({
      clock: { now: () => nowMs },
      storage: adStorage,
      getProtection: () => protection,
      presenter: {
        showAppOpen: (source, callbacks) => appOpenHandler(source, callbacks),
        async showInterstitial(category) {
          interstitialCalls.push(category);
          if (interstitialResult === "throw") {
            throw new Error("AdMob Interstitial network error");
          }
          return interstitialResult;
        },
        requestProfileNativeAd: () => profileNativeFactory(),
        showRewardedAd: (packType, sessionId, onRewardEarned) =>
          rewardedHandler(packType, sessionId, onRewardEarned),
      },
    });
  });

  afterEach(() => {
    resetAdSystemForTests();
    resetPremiumThemesForTests();
  });

  describe("1. Suppression définitive des bannières & 5 IDs de test AdMob officiels", () => {
    it("neutralise toutes les bannières et fausses publicités et conserve exactement les 5 IDs de test", () => {
      expect(BANNER_ADS_ENABLED).toBe(false);
      expect(AdSlot({ placement: "home" })).toBeNull();
      expect(FullscreenAdPlaceholder({ open: true, onClose: () => {} })).toBeNull();

      expect(ADMOB_TEST_APP_ID).toBe("ca-app-pub-3940256099942544~3347511713");
      expect(APP_OPEN_TEST_AD_UNIT_ID).toBe("ca-app-pub-3940256099942544/9257395921");
      expect(INTERSTITIAL_TEST_AD_UNIT_ID).toBe("ca-app-pub-3940256099942544/1033173712");
      expect(NATIVE_STATIC_TEST_AD_UNIT_ID).toBe("ca-app-pub-3940256099942544/2247696110");
      expect(REWARDED_TEST_AD_UNIT_ID).toBe("ca-app-pub-3940256099942544/5224354917");

      expect(MAX_AD_CONTENT_RATING).toBe("G");
      expect(CUSTOMIZATION_CHANGES_REQUIRED).toBe(2);
      expect(PROFILE_PHOTO_CHANGES_REQUIRED).toBe(2);
      expect(APP_OPEN_COOLDOWN_MS).toBe(4 * 60 * 60 * 1000);
      expect(isWebTestSimulationAllowed({ isProd: true, isNativeAndroid: false })).toBe(false);
      expect(isWebTestSimulationAllowed({ isProd: false, isNativeAndroid: true })).toBe(false);
    });
  });

  describe("2. Compteur partagé unique de personnalisation — les 6 combinaisons obligatoires SANS délai de 5 minutes", () => {
    const ALL_SIX_PAIRS: [CustomizationCategory, CustomizationCategory, string][] = [
      ["background", "background", "arrière-plan + arrière-plan"],
      ["widget", "widget", "widget + widget"],
      ["border", "border", "bordure + bordure"],
      ["background", "widget", "arrière-plan + widget"],
      ["background", "border", "arrière-plan + bordure"],
      ["widget", "border", "widget + bordure"],
    ];

    it.each(ALL_SIX_PAIRS)(
      "Paire (%s + %s) [%s] -> 1 seule annonce interstitielle après la 2e validation",
      async (firstCat, secondCat) => {
        const persistedOrder: string[] = [];

        const first = await applyValidatedCustomizationChange(firstCat, () => {
          persistedOrder.push(`1:${firstCat}`);
        });
        expect(first).toEqual({
          attempted: false,
          shown: false,
          reason: "count-below-threshold",
          count: 1,
        });
        expect(interstitialCalls).toHaveLength(0);

        const second = await applyValidatedCustomizationChange(secondCat, () => {
          persistedOrder.push(`2:${secondCat}`);
        });
        expect(second).toEqual({
          attempted: true,
          shown: true,
          reason: "shown",
          count: 0,
        });
        expect(persistedOrder).toEqual([`1:${firstCat}`, `2:${secondCat}`]);
        expect(interstitialCalls).toEqual([secondCat]);
        expect(getSharedCustomizationCount()).toBe(0);
      },
    );

    it("n'applique AUCUN délai chronométré de 5 minutes entre deux paires consécutives (ex: +3 secondes)", async () => {
      // Paire 1 à t0
      await applyValidatedCustomizationChange("background", () => {});
      const ad1 = await applyValidatedCustomizationChange("border", () => {});
      expect(ad1.shown).toBe(true);
      expect(interstitialCalls).toHaveLength(1);

      // Paire 2 seulement 3 secondes plus tard (aurait été bloquée par un ancien cooldown de 5 min)
      nowMs += 3_000;
      const step3 = await applyValidatedCustomizationChange("widget", () => {});
      expect(step3.shown).toBe(false);
      expect(step3.count).toBe(1);

      nowMs += 2_000;
      const ad2 = await applyValidatedCustomizationChange("background", () => {});
      expect(ad2).toEqual({
        attempted: true,
        shown: true,
        reason: "shown",
        count: 0,
      });
      expect(interstitialCalls).toHaveLength(2);
    });

    it("enregistre toujours le changement AVANT de tenter l'annonce et ignore les clics sans changement", async () => {
      const timeline: string[] = [];
      configureAdSystemForTests({
        presenter: {
          async showInterstitial() {
            timeline.push("ad:interstitial");
            return true;
          },
        },
      });

      await applyValidatedCustomizationChange("widget", () => timeline.push("save:1"));
      // Clic sans modification au milieu : ignoré
      const noop = await applyValidatedCustomizationChange("widget", () => timeline.push("noop"), {
        hasChanged: false,
      });
      expect(noop.reason).toBe("no-change");
      expect(noop.count).toBe(1);

      await applyValidatedCustomizationChange("border", () => timeline.push("save:2"));
      expect(timeline).toEqual(["save:1", "save:2", "ad:interstitial"]);

      expect(hasThemeSelectionChanged("bg-a", "bg-a")).toBe(false);
      expect(hasThemeSelectionChanged("bg-a", "bg-b")).toBe(true);
      const gal = {
        imageUrl: "data:image/png;base64,123",
        zoom: 100,
        blur: 0,
        brightness: 100,
        contrast: 100,
        overlayType: "dark" as const,
        overlayOpacity: 30,
      };
      expect(hasGalleryCustomizationChanged("bg-gallery-custom", gal, { ...gal })).toBe(false);
    });

    it("en cas d'indisponibilité AdMob : ne bloque jamais la personnalisation, journalise l'échec et remet le cycle à 0 sans annonce tardive", async () => {
      const applied: string[] = [];
      interstitialResult = false; // AdMob indisponible sur la 1re paire

      await applyValidatedCustomizationChange("background", () => applied.push("c1"));
      const unavailable = await applyValidatedCustomizationChange("widget", () =>
        applied.push("c2"),
      );

      expect(applied).toEqual(["c1", "c2"]);
      expect(unavailable).toEqual({
        attempted: true,
        shown: false,
        reason: "load-failed",
        count: 0,
      });
      expect(getSharedCustomizationCount()).toBe(0);
      expect(loadAdSystemState().interstitialFailureCount).toBe(1);

      // Le réseau revient : le 3e changement NE DOIT PAS déclencher d'annonce tardive surprise (c'est 1/2 du nouveau cycle)
      interstitialResult = true;
      const thirdChange = await applyValidatedCustomizationChange("border", () =>
        applied.push("c3"),
      );
      expect(thirdChange).toEqual({
        attempted: false,
        shown: false,
        reason: "count-below-threshold",
        count: 1,
      });
      expect(interstitialCalls).toEqual(["widget"]); // uniquement la tentative échouée précédente

      // Le 4e changement complète la nouvelle paire (2/2) et affiche proprement l'interstitiel
      const fourthChange = await applyValidatedCustomizationChange("background", () =>
        applied.push("c4"),
      );
      expect(fourthChange).toEqual({
        attempted: true,
        shown: true,
        reason: "shown",
        count: 0,
      });
      expect(interstitialCalls).toEqual(["widget", "background"]);
    });
  });

  describe("3. Annonce native avec image fixe (SANS vidéo) après 2 photos de profil enregistrées", () => {
    it("utilise un compteur dédié séparé de la personnalisation et affiche la carte native à la 2e photo enregistrée", async () => {
      let destroyedCount = 0;
      profileNativeFactory = async () => ({
        available: true,
        hasVideoContent: false,
        destroy: () => {
          destroyedCount += 1;
        },
      });

      // 1 modification de thème + 1 photo de profil : aucun des deux compteurs n'est à 2
      await applyValidatedCustomizationChange("background", () => {});
      const firstPhoto = await applySavedProfilePhotoChange(() => {});
      expect(firstPhoto).toEqual({
        attempted: false,
        shown: false,
        reason: "count-below-threshold",
        count: 1,
      });
      expect(getSharedCustomizationCount()).toBe(1);
      expect(getProfilePhotoChangeCount()).toBe(1);

      // Annulation ou sauvegarde identique : n'incrémente pas le compteur photo
      const cancelled = await applySavedProfilePhotoChange(() => {}, { hasChanged: false });
      expect(cancelled.reason).toBe("no-change");
      expect(getProfilePhotoChangeCount()).toBe(1);

      // 2e photo de profil réellement enregistrée -> affiche la carte native image fixe
      let secondPhotoSavedBeforeAd = false;
      const secondPhoto = await applySavedProfilePhotoChange(() => {
        secondPhotoSavedBeforeAd = true;
      });
      expect(secondPhotoSavedBeforeAd).toBe(true);
      expect(secondPhoto).toEqual({
        attempted: true,
        shown: true,
        reason: "shown",
        count: 0,
      });
      expect(isProfileNativeModalOpen()).toBe(true);

      // Fermeture par le bouton X externe -> détruit proprement l'instance NativeAd
      dismissActiveProfileNativeAd();
      expect(isProfileNativeModalOpen()).toBe(false);
      expect(destroyedCount).toBe(1);
    });

    it("rejette strictement toute créative native contenant une vidéo (hasVideoContent = true) et appelle destroy()", async () => {
      let videoAdDestroyed = false;
      profileNativeFactory = async () => ({
        available: true,
        hasVideoContent: true,
        destroy: () => {
          videoAdDestroyed = true;
        },
      });

      await applySavedProfilePhotoChange(() => {});
      const rejected = await applySavedProfilePhotoChange(() => {});

      expect(rejected).toEqual({
        attempted: true,
        shown: false,
        reason: "video-rejected",
        count: 0,
      });
      expect(videoAdDestroyed).toBe(true);
      expect(isProfileNativeModalOpen()).toBe(false);
      expect(loadAdSystemState().nativeVideoRejectedCount).toBe(1);
    });
  });

  describe("4. Soutien volontaire & Vidéo récompensée (« Soutenir Islam-Noor »)", () => {
    it("débloque exactement 2 thèmes du pack choisi après confirmation officielle onUserEarnedReward", async () => {
      const res = await tryShowVoluntaryRewardedAd("backgrounds");
      expect(res.shown).toBe(true);
      expect(res.rewardGranted).toBe(true);
      expect(res.unlockedPack?.backgrounds).toHaveLength(2);
      expect(getUnlockedPremiumThemesState().backgrounds).toHaveLength(2);
    });

    it("n'accorde AUCUNE récompense si la vidéo est fermée avant la fin", async () => {
      rewardedHandler = async () => ({
        shown: true,
        rewardEarned: false,
      });

      const res = await tryShowVoluntaryRewardedAd("widgets");
      expect(res.shown).toBe(true);
      expect(res.rewardGranted).toBe(false);
      expect(res.reason).toBe("dismissed-without-reward");
      expect(res.unlockedPack).toBeNull();
      expect(getUnlockedPremiumThemesState().widgets).toHaveLength(0);
    });

    it("n'altère aucune donnée en cas d'échec réseau/chargement de la vidéo récompensée", async () => {
      rewardedHandler = async () => ({
        shown: false,
        rewardEarned: false,
      });

      const res = await tryShowVoluntaryRewardedAd("borders");
      expect(res.shown).toBe(false);
      expect(res.rewardGranted).toBe(false);
      expect(res.reason).toBe("load-failed");
      expect(getUnlockedPremiumThemesState().borders).toHaveLength(0);
    });

    it("empêche strictement toute double récompense si le callback SDK est émis plusieurs fois pour la même session", async () => {
      rewardedHandler = async (_packType, _sessionId, onRewardEarned) => {
        // Simule un SDK défaillant déclenchant 3 fois le callback sur un seul visionnage
        onRewardEarned();
        onRewardEarned();
        onRewardEarned();
        return { shown: true, rewardEarned: true };
      };

      const res = await tryShowVoluntaryRewardedAd("borders", {
        explicitSessionId: "reward_session_unique_1",
      });
      expect(res.rewardGranted).toBe(true);
      expect(getUnlockedPremiumThemesState().borders).toHaveLength(2);

      // Rejouer exactement le même sessionId est immédiatement bloqué
      const replay = await tryShowVoluntaryRewardedAd("borders", {
        explicitSessionId: "reward_session_unique_1",
      });
      expect(replay.rewardGranted).toBe(false);
      expect(replay.reason).toBe("duplicate-reward-blocked");
      expect(getUnlockedPremiumThemesState().borders).toHaveLength(2);
    });
  });

  describe("5. App Open & les 9 compteurs persistants d'ouvertures / impressions réelles confirmées", () => {
    it("distingue strictement tentatives d'affichage et impressions confirmées par callback SDK", async () => {
      protection.pathname = "/";

      // 1er lancement : chargement échoue -> totalRealLaunches=1, showAttempts=1, loadFailures=1, confirmedImpressions=0
      appOpenHandler = async (source, callbacks) => {
        appOpenCalls.push(source);
        callbacks?.onLoadRequest();
        callbacks?.onLoadFailure();
        return { shown: false, impressionConfirmed: false };
      };

      const launch1 = await tryShowAppOpenAd("launch");
      expect(launch1.shown).toBe(false);
      expect(launch1.reason).toBe("load-failed");

      let tel = getAppOpenTelemetry();
      expect(tel).toEqual({
        totalRealLaunches: 1,
        eligibleBackgroundResumes: 0,
        eligibleAppOpenOpportunities: 1,
        loadRequests: 1,
        showAttempts: 1,
        confirmedImpressions: 0,
        loadFailures: 1,
        opensSinceLastConfirmedImpression: 1,
        lastConfirmedImpressionAt: null,
      });

      // 2e lancement : show() appelé mais PAS d'impression SDK confirmée -> confirmedImpressions reste à 0 !
      nowMs += 60_000;
      appOpenHandler = async (source, callbacks) => {
        appOpenCalls.push(source);
        callbacks?.onLoadRequest();
        return { shown: true, impressionConfirmed: false };
      };

      const launch2 = await tryShowAppOpenAd("launch");
      expect(launch2.reason).toBe("show-without-impression");
      tel = getAppOpenTelemetry();
      expect(tel.totalRealLaunches).toBe(2);
      expect(tel.showAttempts).toBe(2);
      expect(tel.confirmedImpressions).toBe(0);
      expect(tel.opensSinceLastConfirmedImpression).toBe(2);
      expect(tel.lastConfirmedImpressionAt).toBeNull();

      // Retour après absence >= 30 min avec impression SDK confirmée -> confirmedImpressions=1, opensSinceLastConfirmedImpression=0
      recordAppBackgrounded();
      nowMs += LONG_ABSENCE_THRESHOLD_MS + 5 * 60_000;
      const expectedIso = new Date(nowMs).toISOString();
      appOpenHandler = async (source, callbacks) => {
        appOpenCalls.push(source);
        callbacks?.onLoadRequest();
        callbacks?.onConfirmedImpression();
        return { shown: true, impressionConfirmed: true };
      };

      const resumeOk = await tryShowAppOpenAd("resume");
      expect(resumeOk.shown).toBe(true);
      expect(resumeOk.reason).toBe("shown");

      tel = getAppOpenTelemetry();
      expect(tel).toEqual({
        totalRealLaunches: 2,
        eligibleBackgroundResumes: 1,
        eligibleAppOpenOpportunities: 3,
        loadRequests: 3,
        showAttempts: 3,
        confirmedImpressions: 1,
        loadFailures: 1,
        opensSinceLastConfirmedImpression: 0,
        lastConfirmedImpressionAt: expectedIso,
      });

      // Nouveau lancement 2h plus tard (< 4h) -> bloqué par le plafond App Open de 4h, mais compté dans les ouvertures depuis la dernière impression
      nowMs += 2 * 60 * 60 * 1000;
      const capped = await tryShowAppOpenAd("launch");
      expect(capped.shown).toBe(false);
      expect(capped.reason).toBe("app-open-cooldown");
      tel = getAppOpenTelemetry();
      expect(tel.totalRealLaunches).toBe(3);
      expect(tel.opensSinceLastConfirmedImpression).toBe(1);
      expect(tel.confirmedImpressions).toBe(1);

      // Vérifie le tag de diagnostic ISLAMNOOR_ADS
      const logs = getAdDiagnosticLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.every((l) => l.tag === AD_DIAGNOSTIC_LOG_TAG)).toBe(true);
    });
  });

  describe("6. Protections religieuses et fonctionnelles obligatoires", () => {
    it("interdit toute annonce pendant le Coran, les prières, l'adhan, l'audio ou le scanner halal", async () => {
      expect(evaluateAdProtection({ ...protection, pathname: "/quran" })).toBe("protected:quran");
      expect(evaluateAdProtection({ ...protection, pathname: "/prayers" })).toBe(
        "protected:prayers",
      );
      expect(evaluateAdProtection({ ...protection, isAdhanPlaying: true })).toBe(
        "protected:adhan",
      );
      expect(evaluateAdProtection({ ...protection, isAudioPlaying: true })).toBe(
        "protected:audio",
      );
      expect(evaluateAdProtection({ ...protection, pathname: "/halal" })).toBe(
        "protected:food-scanner",
      );

      protection.isAudioPlaying = true;
      await applyValidatedCustomizationChange("background", () => {});
      const blockedCustom = await applyValidatedCustomizationChange("border", () => {});
      expect(blockedCustom.shown).toBe(false);
      expect(blockedCustom.reason).toBe("protected:audio");

      const blockedRewarded = await tryShowVoluntaryRewardedAd("backgrounds");
      expect(blockedRewarded.shown).toBe(false);
      expect(blockedRewarded.reason).toBe("protected:audio");
    });
  });

  describe("7. Mission N22 — Exemption stricte des thèmes et bordures premium débloqués par récompense", () => {
    it("deux modifications de bordures premium récompensées ne déclenchent aucune publicité interstitielle", async () => {
      const pack = unlockPremiumThemePack("borders", "reward-session-n22-borders-1");
      expect(pack.unlocked).toBe(true);
      expect(pack.borders.length).toBeGreaterThanOrEqual(2);
      const [premBorder1, premBorder2] = pack.borders;

      expect(isRewardUnlockedTheme(premBorder1)).toBe(true);
      expect(isRewardUnlockedTheme(premBorder2)).toBe(true);

      const applied: string[] = [];
      const first = await applyValidatedCustomizationChange(
        "border",
        () => applied.push(premBorder1.id),
        { unlockedByReward: isRewardUnlockedTheme(premBorder1) },
      );
      const second = await applyValidatedCustomizationChange(
        "border",
        () => applied.push(premBorder2.id),
        { unlockedByReward: isRewardUnlockedTheme(premBorder2) },
      );

      expect(applied).toEqual([premBorder1.id, premBorder2.id]);
      expect(first).toEqual({
        attempted: false,
        shown: false,
        reason: "reward-unlocked-exempt",
        count: 0,
      });
      expect(second).toEqual({
        attempted: false,
        shown: false,
        reason: "reward-unlocked-exempt",
        count: 0,
      });
      expect(interstitialCalls).toHaveLength(0);
      expect(getSharedCustomizationCount()).toBe(0);
    });

    it("une modification ordinaire puis une bordure premium récompensée conserve le compteur à 1 sans déclencher d'interstitiel", async () => {
      const pack = unlockPremiumThemePack("borders", "reward-session-n22-borders-2");
      expect(pack.unlocked).toBe(true);
      const rewardedBorder = pack.borders[0];

      // 1. Modification ordinaire (ex: widget ordinaire) -> compteur = 1
      const step1 = await applyValidatedCustomizationChange("widget", () => {}, {
        unlockedByReward: false,
      });
      expect(step1.count).toBe(1);
      expect(step1.shown).toBe(false);

      // 2. Application d'une bordure premium récompensée -> compteur reste à 1, zéro pub
      const step2 = await applyValidatedCustomizationChange("border", () => {}, {
        unlockedByReward: isRewardUnlockedTheme(rewardedBorder),
      });
      expect(step2).toEqual({
        attempted: false,
        shown: false,
        reason: "reward-unlocked-exempt",
        count: 1,
      });
      expect(interstitialCalls).toHaveLength(0);
      expect(getSharedCustomizationCount()).toBe(1);

      // 3. Une seconde modification ordinaire complète ensuite la paire -> interstitiel proposé
      const step3 = await applyValidatedCustomizationChange("background", () => {}, {
        unlockedByReward: false,
      });
      expect(step3).toEqual({
        attempted: true,
        shown: true,
        reason: "shown",
        count: 0,
      });
      expect(interstitialCalls).toEqual(["background"]);
    });

    it("repose sur la métadonnée explicite unlockedByReward (y compris après rechargement stockage) et jamais sur le nom ou l'identifiant", async () => {
      // Un thème intégré dont l'ID contient 'prem' (ex: bg-prem-noir-or) N'EST PAS débloqué par récompense pub
      const builtInNamedPrem = ALL_BG_THEMES.find((t) => t.id.includes("prem"));
      expect(builtInNamedPrem).toBeDefined();
      expect(isRewardUnlockedTheme(builtInNamedPrem)).toBe(false);

      // Alors qu'un pack débloqué par récompense conserve unlockedByReward: true après relecture du stockage
      const sharedThemeStorage = createMemoryStorage();
      configurePremiumThemesForTests({ storage: sharedThemeStorage });
      const bgPack = unlockPremiumThemePack("backgrounds", "reward-session-n22-bg-1");
      expect(bgPack.unlocked).toBe(true);

      const reloaded = getUnlockedPremiumThemesState();
      expect(reloaded.backgrounds.length).toBeGreaterThan(0);
      expect(reloaded.backgrounds.every((bg) => bg.unlockedByReward === true)).toBe(true);
      expect(reloaded.backgrounds.every((bg) => isRewardUnlockedTheme(bg))).toBe(true);
    });
  });
});
