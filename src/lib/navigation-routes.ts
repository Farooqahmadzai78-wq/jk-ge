/**
 * Navigation Routes Architecture
 *
 * Distingue les 5 écrans principaux (avec barre de navigation inférieure)
 * des écrans secondaires complets (lecture, détails, invocations, tasbih, etc.)
 * qui disposent de leur propre bouton de retour en haut et doivent exploiter
 * 100% de la hauteur de l'écran sans occlusion.
 */

export const MAIN_TAB_ROUTES = [
  "/",
  "/prayers",
  "/quran",
  "/halal",
  "/settings",
] as const;

export type MainTabRoute = (typeof MAIN_TAB_ROUTES)[number];

/**
 * Retourne vrai uniquement si le chemin actuel est une page principale de l'application
 * (Accueil, Prières, Coran, Halal, Réglages).
 *
 * Normalise le chemin (retire les slashs de fin redondants) pour éviter les incohérences.
 */
export function isMainTabRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  // Nettoyage des query params / hash si présents dans une URL brute
  const pathOnly = pathname.split("?")[0].split("#")[0];
  const clean = pathOnly.replace(/\/+$/, "") || "/";

  return MAIN_TAB_ROUTES.includes(clean as MainTabRoute);
}

/**
 * Détermine si les barres de navigation principales doivent être masquées.
 */
export function shouldHideBottomNav(pathname: string | null | undefined): boolean {
  return !isMainTabRoute(pathname);
}
