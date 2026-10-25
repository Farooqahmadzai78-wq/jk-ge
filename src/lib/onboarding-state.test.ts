import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Etat du guide de bienvenue.
 *
 * Le guide doit s'afficher au premier lancement d'un nouvel utilisateur, puis
 * ne plus se repeter. Le module est teste avec un faux localStorage (lCroquis
 * de test hors navigateur).
 */

const store = new Map<string, string>();

const fakeWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

const fakeLocalStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal("window", fakeWindow);
  vi.stubGlobal("localStorage", fakeLocalStorage);
  vi.resetModules();
});

async function loadModule() {
  const mod = await import("@/lib/onboarding-state");
  return mod;
}

describe("etat du guide de bienvenue", () => {
  it("n'est pas termine sur une premiere installation", async () => {
    const { isOnboardingCompleted } = await loadModule();
    expect(isOnboardingCompleted()).toBe(false);
  });

  it("reste termine apres avoir termine le guide", async () => {
    const { isOnboardingCompleted, setOnboardingCompleted } = await loadModule();
    setOnboardingCompleted(true);
    expect(isOnboardingCompleted()).toBe(true);
  });

  it("permet de reinitialiser l'etat (re-ouverture du guide)", async () => {
    const { isOnboardingCompleted, setOnboardingCompleted } = await loadModule();
    setOnboardingCompleted(true);
    setOnboardingCompleted(false);
    expect(isOnboardingCompleted()).toBe(false);
  });

  it("n'est pas termine si la valeur enregistree n'est pas 'true'", async () => {
    const { isOnboardingCompleted } = await loadModule();
    store.set("islam_noor_onboarding_completed", "false");
    expect(isOnboardingCompleted()).toBe(false);
  });

  it("declenche l'evenement d'ouverture du guide", async () => {
    const { openOnboardingGuide } = await loadModule();
    openOnboardingGuide();
    expect(fakeWindow.dispatchEvent).toHaveBeenCalled();
  });

  it("permet de reinitialiser l'etat du guide sans toucher aux autres preferences", async () => {
    const { isOnboardingCompleted, setOnboardingCompleted, resetOnboardingCompleted } =
      await loadModule();
    setOnboardingCompleted(true);
    expect(isOnboardingCompleted()).toBe(true);
    // Seule la mention "guide termine" est effacee : les autres cles de
    // preferences (langue, ville, personnalisation) ne sont pas concernees.
    store.set("nur.settings.v1", JSON.stringify({ language: "ar", place: { name: "Paris" } }));
    resetOnboardingCompleted();
    expect(isOnboardingCompleted()).toBe(false);
    expect(store.get("nur.settings.v1")).toContain("Paris");
  });

  it("permet de rejouer le parcours de premiere installation", async () => {
    const { isOnboardingCompleted, setOnboardingCompleted, resetOnboardingCompleted } =
      await loadModule();
    // Premiere installation : le guide doit s'ouvrir.
    expect(isOnboardingCompleted()).toBe(false);
    // Apres avoir termine : il ne doit plus s'ouvrir.
    setOnboardingCompleted(true);
    expect(isOnboardingCompleted()).toBe(true);
    // Reinitialisation cible (bouton "revoir le guide de bienvenue") :
    // le parcours redevient possible.
    resetOnboardingCompleted();
    expect(isOnboardingCompleted()).toBe(false);
  });

  it("permet de s'abonner a l'ouverture du guide", async () => {
    const { subscribeToOnboardingOpen } = await loadModule();
    const cb = vi.fn();
    const unsubscribe = subscribeToOnboardingOpen(cb);
    expect(fakeWindow.addEventListener).toHaveBeenCalled();
    unsubscribe();
    expect(fakeWindow.removeEventListener).toHaveBeenCalled();
  });
});
