/**
 * Verrouillage du scroll du document, avec compteur.
 *
 * Plusieurs composants peuvent vouloir bloquer le scroll en meme temps
 * (ecran de demarrage, guide de bienvenue, modales). Avant, chaque
 * composant ecrivait directement `document.body.style.overflow` : le
 * nettoyage de l'un (remise a "") annulait le verrou de l'autre et le fond
 * pouvait defiler sous une modale.
 */

let lockCount = 0;
let previousOverflow = "";

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount++;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) return;
  lockCount--;
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
  }
}

/** Nombre de verrous actifs (diagnostic / tests). */
export function bodyScrollLockCount(): number {
  return lockCount;
}
