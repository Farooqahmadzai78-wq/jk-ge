import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MAX_FULLSCREEN_PER_DAY,
  USAGE_TIERS,
  MIN_GAP_MS,
  addUsage,
  canShowFullscreen,
  recordFullscreenShown,
  setClockForTests,
  setStorageForTests,
  resetAdBudgetForTests,
} from './ad-budget';

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
  setClockForTests({ now: () => new Date('2026-06-15T12:00:00Z').getTime() });
  setStorageForTests(memoryStorage());
});

afterEach(() => {
  resetAdBudgetForTests();
});

describe('ad-budget', () => {
  it('export les constantes attendues (délai minimal de 5 minutes)', () => {
    expect(MAX_FULLSCREEN_PER_DAY).toBe(6);
    expect(MIN_GAP_MS).toBe(5 * 60 * 1000);
    expect(USAGE_TIERS).toEqual([
      { minMinutes: 0, max: 1 },
      { minMinutes: 5, max: 3 },
      { minMinutes: 15, max: 6 },
    ]);
  });

  it('jamais si premium', () => {
    expect(canShowFullscreen('theme-background', true)).toEqual({
      allowed: false,
      reason: 'premium',
    });
  });

  it('palier du jour : 1 avant 5 min, 3 entre 5 et 15, 6 après 15', () => {
    const t0 = new Date('2026-06-15T12:00:00Z').getTime();
    let now = t0;
    const advance = (ms: number) => {
      now += ms;
      setClockForTests({ now: () => now });
    };

    // 0 min : max 1
    addUsage(0);
    expect(canShowFullscreen('theme-background', false).allowed).toBe(true);
    recordFullscreenShown();
    advance(310_000); // dépasse MIN_GAP_MS (5 min)
    expect(canShowFullscreen('theme-background', false)).toEqual({
      allowed: false,
      reason: 'daily-limit',
    });

    // 5 min : max 3
    addUsage(300);
    advance(310_000);
    expect(canShowFullscreen('theme-background', false).allowed).toBe(true);
    recordFullscreenShown();
    advance(310_000);
    expect(canShowFullscreen('theme-background', false).allowed).toBe(true);
    recordFullscreenShown();
    advance(310_000);
    expect(canShowFullscreen('theme-background', false)).toEqual({
      allowed: false,
      reason: 'daily-limit',
    });

    // 15 min : max 6
    addUsage(900); // usage total 1200 s
    for (let i = 0; i < 3; i += 1) {
      advance(310_000);
      expect(canShowFullscreen('theme-background', false).allowed).toBe(true);
      recordFullscreenShown();
    }
    advance(310_000);
    expect(canShowFullscreen('theme-background', false)).toEqual({
      allowed: false,
      reason: 'daily-limit',
    });
  });

  it('respecte le délai minimal de 5 minutes entre deux pubs plein écran', () => {
    const t0 = new Date('2026-06-15T12:00:00Z').getTime();
    addUsage(900); // 15 min -> max 6
    recordFullscreenShown();
    setClockForTests({ now: () => t0 + 299_000 }); // < 300_000 ms (5 min)
    expect(canShowFullscreen('theme-background', false)).toEqual({
      allowed: false,
      reason: 'min-gap',
    });
    setClockForTests({ now: () => t0 + 301_000 }); // > 300_000 ms (5 min)
    expect(canShowFullscreen('theme-background', false).allowed).toBe(true);
  });

  it('remet a zero au changement de jour', () => {
    const day1 = new Date('2026-06-15T10:00:00Z').getTime();
    const day2 = new Date('2026-06-16T10:00:00Z').getTime();
    setClockForTests({ now: () => day1 });
    recordFullscreenShown();
    setClockForTests({ now: () => day2 });
    expect(canShowFullscreen('theme-background', false).allowed).toBe(true);
  });

  it('plafond de 6 par jour', () => {
    const t0 = new Date('2026-06-15T12:00:00Z').getTime();
    let now = t0;
    const advance = (ms: number) => {
      now += ms;
      setClockForTests({ now: () => now });
    };

    addUsage(900); // 15 min -> max 6
    for (let i = 0; i < 6; i += 1) {
      advance(310_000); // dépasse MIN_GAP_MS (5 min)
      expect(canShowFullscreen('theme-background', false).allowed).toBe(true);
      recordFullscreenShown();
    }
    advance(310_000);
    expect(canShowFullscreen('theme-background', false)).toEqual({
      allowed: false,
      reason: 'daily-limit',
    });
  });

  it('stockage indisponible ne crash pas', () => {
    const broken = {
      getItem: () => {
        throw new Error('nope');
      },
      setItem: () => {
        throw new Error('nope');
      },
      removeItem: () => {
        throw new Error('nope');
      },
    };
    setStorageForTests(broken);
    expect(() => addUsage(60)).not.toThrow();
    expect(() => recordFullscreenShown()).not.toThrow();
    const res = canShowFullscreen('theme-background', false);
    expect(typeof res.allowed).toBe('boolean');
    expect(typeof res.reason).toBe('string');
  });
});
