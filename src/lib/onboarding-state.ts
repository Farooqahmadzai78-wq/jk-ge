const STORAGE_KEY = "islam_noor_onboarding_completed";
const ONBOARDING_EVENT = "islam_noor_open_onboarding";
const ONBOARDING_CHANGED_EVENT = "islam_noor_onboarding_changed";

let onboardingCompletedMemory: boolean | null = null;

export function isOnboardingCompleted(): boolean {
  if (typeof window === "undefined") return true;
  if (onboardingCompletedMemory === true) return true;
  try {
    const completed = localStorage.getItem(STORAGE_KEY) === "true";
    if (completed) onboardingCompletedMemory = true;
    return completed;
  } catch {
    return onboardingCompletedMemory ?? true;
  }
}

export function setOnboardingCompleted(completed = true) {
  onboardingCompletedMemory = completed;
  if (typeof window === "undefined") return;
  try {
    if (completed) {
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage errors; onboardingCompletedMemory preserves session state
  }
  window.dispatchEvent(new CustomEvent(ONBOARDING_CHANGED_EVENT));
}

/**
 * Remet le guide de bienvenue a l'etat "non termine" SANS toucher aux autres
 * preferences (langue, ville, personnalisation, theme...). Permet de rejouer
 * le parcours de premiere installation lors d'un test, sur un profil Android
 * de test separe ou sur le profil principal.
 */
export function resetOnboardingCompleted(): void {
  setOnboardingCompleted(false);
}

export function openOnboardingGuide() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_EVENT));
}

export function subscribeToOnboardingOpen(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(ONBOARDING_EVENT, handler);
  return () => {
    window.removeEventListener(ONBOARDING_EVENT, handler);
  };
}

export function subscribeToOnboardingChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(ONBOARDING_CHANGED_EVENT, handler);
  return () => {
    window.removeEventListener(ONBOARDING_CHANGED_EVENT, handler);
  };
}
