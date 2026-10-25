import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  clearPageTutorialMemoryForTests,
  getPageTutorial,
  isPageTutorialSeen,
  markPageTutorialAsSeen,
  resetPageTutorial,
  type PageTutorialId,
} from "./page-tutorials";
import {
  isOnboardingCompleted,
  resetOnboardingCompleted,
  setOnboardingCompleted,
  subscribeToOnboardingChange,
} from "./onboarding-state";

const ALL_TUTORIAL_PAGES: PageTutorialId[] = [
  "home",
  "prayers",
  "quran",
  "tasbih",
  "halal",
  "mosques",
  "names",
  "invocations",
  "reminder",
  "settings",
];

describe("Mission N22 — Tutoriels de page, persistance résiliente et non-chevauchement onboarding", () => {
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    clearPageTutorialMemoryForTests();
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;

    const listeners = new Map<string, Set<EventListener>>();
    const mockWin = {
      localStorage: mockStorage,
      addEventListener: (type: string, cb: EventListener) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(cb);
      },
      removeEventListener: (type: string, cb: EventListener) => {
        listeners.get(type)?.delete(cb);
      },
      dispatchEvent: (ev: Event) => {
        listeners.get(ev.type)?.forEach((cb) => cb(ev));
        return true;
      },
    } as unknown as Window & typeof globalThis;

    Object.defineProperty(globalThis, "window", {
      value: mockWin,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: mockStorage,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    clearPageTutorialMemoryForTests();
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
      writable: true,
    });
  });

  it("marque un tutoriel comme vu une seule fois et permet de le réinitialiser volontairement", () => {
    expect(isPageTutorialSeen("quran")).toBe(false);
    markPageTutorialAsSeen("quran");
    expect(isPageTutorialSeen("quran")).toBe(true);
    expect(isPageTutorialSeen("prayers")).toBe(false);

    resetPageTutorial("quran");
    expect(isPageTutorialSeen("quran")).toBe(false);
  });

  it("ne réaffiche pas en boucle un tutoriel fermé même si localStorage lève une erreur de quota", () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error("QuotaExceededError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("QuotaExceededError");
      },
    } as unknown as Storage;

    Object.defineProperty(globalThis, "localStorage", {
      value: throwingStorage,
      configurable: true,
      writable: true,
    });

    expect(isPageTutorialSeen("halal")).toBe(false);
    markPageTutorialAsSeen("halal");
    // Grâce au cache mémoire de session, le tutoriel reste marqué comme vu et ne se rouvre pas en boucle
    expect(isPageTutorialSeen("halal")).toBe(true);
  });

  it("notifie proprement la fin de l'onboarding pour éviter tout chevauchement avec un tutoriel de page", () => {
    resetOnboardingCompleted();
    expect(isOnboardingCompleted()).toBe(false);

    let eventsCount = 0;
    const unsubscribe = subscribeToOnboardingChange(() => {
      eventsCount += 1;
    });

    setOnboardingCompleted(true);
    expect(isOnboardingCompleted()).toBe(true);
    expect(eventsCount).toBe(1);

    unsubscribe();
  });

  it("fournit des étapes complètes et non vides pour les 10 pages en FR, EN et AR", () => {
    for (const pageId of ALL_TUTORIAL_PAGES) {
      for (const locale of ["fr", "en", "ar"]) {
        const data = getPageTutorial(pageId, locale);
        expect(data.id).toBe(pageId);
        expect(data.pageName.trim().length).toBeGreaterThan(0);
        expect(data.steps.length).toBeGreaterThan(0);
        for (const step of data.steps) {
          expect(step.title.trim().length).toBeGreaterThan(0);
          expect(step.description.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});
