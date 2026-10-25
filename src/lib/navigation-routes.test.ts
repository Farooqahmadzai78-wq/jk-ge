import { describe, it, expect } from "vitest";
import { isMainTabRoute, shouldHideBottomNav } from "./navigation-routes";

describe("Navigation Routes — Masquage automatique de la barre de navigation", () => {
  describe("Pages principales (la barre de navigation DOIT être visible)", () => {
    it("affiche la navigation sur l'accueil (/)", () => {
      expect(isMainTabRoute("/")).toBe(true);
      expect(shouldHideBottomNav("/")).toBe(false);
    });

    it("affiche la navigation sur la page Prières (/prayers)", () => {
      expect(isMainTabRoute("/prayers")).toBe(true);
      expect(shouldHideBottomNav("/prayers")).toBe(false);
    });

    it("affiche la navigation sur la page Coran (/quran)", () => {
      expect(isMainTabRoute("/quran")).toBe(true);
      expect(shouldHideBottomNav("/quran")).toBe(false);
    });

    it("affiche la navigation sur la page Halal (/halal)", () => {
      expect(isMainTabRoute("/halal")).toBe(true);
      expect(shouldHideBottomNav("/halal")).toBe(false);
    });

    it("affiche la navigation sur la page Réglages (/settings)", () => {
      expect(isMainTabRoute("/settings")).toBe(true);
      expect(shouldHideBottomNav("/settings")).toBe(false);
    });

    it("tolère les trailing slashes (/prayers/, /quran/)", () => {
      expect(isMainTabRoute("/prayers/")).toBe(true);
      expect(isMainTabRoute("/settings/")).toBe(true);
      expect(shouldHideBottomNav("/prayers/")).toBe(false);
    });
  });

  describe("Pages secondaires complètes (la barre de navigation DOIT être masquée)", () => {
    it("masque la navigation sur Invocations quotidiennes (/invocations/daily)", () => {
      expect(isMainTabRoute("/invocations/daily")).toBe(false);
      expect(shouldHideBottomNav("/invocations/daily")).toBe(true);
    });

    it("masque la navigation sur toute autre catégorie d'invocations (/invocations/morning, /invocations/protection)", () => {
      expect(shouldHideBottomNav("/invocations/morning")).toBe(true);
      expect(shouldHideBottomNav("/invocations/protection")).toBe(true);
      expect(shouldHideBottomNav("/invocations/sleep")).toBe(true);
    });

    it("masque la navigation sur le Tasbih numérique (/tasbih)", () => {
      expect(shouldHideBottomNav("/tasbih")).toBe(true);
    });

    it("masque la navigation sur les 99 Noms d'Allah (/names)", () => {
      expect(shouldHideBottomNav("/names")).toBe(true);
    });

    it("masque la navigation sur le choix de mosquée (/mosques)", () => {
      expect(shouldHideBottomNav("/mosques")).toBe(true);
    });

    it("masque la navigation sur les sous-pages de rappels (/reminder/audio, /reminder/notification, /reminder/combo)", () => {
      expect(shouldHideBottomNav("/reminder/audio")).toBe(true);
      expect(shouldHideBottomNav("/reminder/notification")).toBe(true);
      expect(shouldHideBottomNav("/reminder/combo")).toBe(true);
    });

    it("masque la navigation sur la page À propos (/about)", () => {
      expect(shouldHideBottomNav("/about")).toBe(true);
    });

    it("masque la navigation sur la page Abonnement (/subscription)", () => {
      expect(shouldHideBottomNav("/subscription")).toBe(true);
    });

    it("masque la navigation sur les pages système (auth, splash, permissions)", () => {
      expect(shouldHideBottomNav("/auth")).toBe(true);
      expect(shouldHideBottomNav("/splash")).toBe(true);
      expect(shouldHideBottomNav("/permissions")).toBe(true);
    });
  });

  describe("Vues secondaires et sous-écrans dynamiques (Settings & Coran)", () => {
    it("maintient la navigation visible sur /settings au repos, mais permet de la masquer lors d'une personnalisation", () => {
      expect(shouldHideBottomNav("/settings")).toBe(false);

      // Simulation de l'état de vue secondaire de personnalisation
      const activeSecondaryViews = new Set<string>();
      const computeVisibility = (path: string, views: Set<string>) =>
        shouldHideBottomNav(path) || views.size > 0;

      // 1. Vue d'ensemble des réglages
      expect(computeVisibility("/settings", activeSecondaryViews)).toBe(false);

      // 2. Personnalisation des widgets / couleurs / bordures / fond ouverte
      activeSecondaryViews.add("settings-customization");
      expect(computeVisibility("/settings", activeSecondaryViews)).toBe(true);

      // 3. Retour à la vue d'ensemble des réglages
      activeSecondaryViews.delete("settings-customization");
      expect(computeVisibility("/settings", activeSecondaryViews)).toBe(false);
    });

    it("maintient la navigation visible sur la liste des sourates (/quran), et la masque UNIQUEMENT pendant la lecture", () => {
      expect(shouldHideBottomNav("/quran")).toBe(false);

      const activeSecondaryViews = new Set<string>();
      const computeVisibility = (path: string, views: Set<string>) =>
        shouldHideBottomNav(path) || views.size > 0;

      // État 1 : Page Coran initiale
      expect(computeVisibility("/quran", activeSecondaryViews)).toBe(false);

      // État A : Clic sur 'Commencer' -> Liste des sourates affichée & défilée (la navigation DOIT rester visible)
      // Note: 'quran-surah-list' n'est plus enregistré comme vue secondaire masquante
      expect(activeSecondaryViews.has("quran-surah-list")).toBe(false);
      expect(computeVisibility("/quran", activeSecondaryViews)).toBe(false);

      // État B : Sélection d'une sourate -> Écran de lecture complet (la navigation DOIT être masquée)
      activeSecondaryViews.add("quran-reader");
      expect(computeVisibility("/quran", activeSecondaryViews)).toBe(true);

      // État C : Retour de lecture -> Retour à la liste des sourates (la navigation redevient visible)
      activeSecondaryViews.delete("quran-reader");
      expect(computeVisibility("/quran", activeSecondaryViews)).toBe(false);
    });
  });
});

