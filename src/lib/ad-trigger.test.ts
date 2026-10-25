import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  setClockForTests,
  setStorageForTests,
  resetAdBudgetForTests,
  addUsage,
} from "./ad-budget";
import {
  setLastTrigger,
  tryTriggerAd,
  resetLastTrigger,
  getLastTrigger,
  type AdTrigger,
} from "./ad-trigger";

const memoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

beforeEach(() => {
  setClockForTests({ now: () => new Date("2026-06-15T12:00:00Z").getTime() });
  setStorageForTests(memoryStorage());
  resetAdBudgetForTests();
  resetLastTrigger();
});

afterEach(() => {
  resetAdBudgetForTests();
  resetLastTrigger();
});

describe("ad-trigger", () => {
  it("ne déclenche pas si aucun trigger n'a été mémorisé", () => {
    addUsage(900);
    expect(tryTriggerAd(false)).toBe(false);
  });

  it("déclenche si allowed et réinitialise le trigger", () => {
    addUsage(900);
    setLastTrigger("theme-background");
    expect(tryTriggerAd(false)).toBe(true);
    resetLastTrigger();
    expect(getLastTrigger()).toBeNull();
  });

  it("ne déclenche pas si premium", () => {
    addUsage(900);
    setLastTrigger("theme-background");
    expect(tryTriggerAd(true)).toBe(false);
  });

  it("ne déclenche pas après reset du trigger", () => {
    addUsage(900);
    setLastTrigger("theme-background");
    expect(tryTriggerAd(false)).toBe(true);
    resetLastTrigger();
    expect(tryTriggerAd(false)).toBe(false);
  });

  it("accepte les trois types de déclencheur", () => {
    const triggers: AdTrigger[] = [
      "theme-background",
      "theme-border",
      "theme-widget-color",
    ];
    for (const t of triggers) {
      addUsage(900);
      setLastTrigger(t);
      expect(tryTriggerAd(false)).toBe(true);
      resetLastTrigger();
    }
  });
});
