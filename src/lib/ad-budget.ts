export type AdTrigger = 'theme-background' | 'theme-border' | 'theme-widget-color';

export const MAX_FULLSCREEN_PER_DAY = 6;
export const USAGE_TIERS = [
  { minMinutes: 0, max: 1 },
  { minMinutes: 5, max: 3 },
  { minMinutes: 15, max: 6 },
] as const;
export const MIN_GAP_MS = 5 * 60 * 1000;

const STORAGE_PREFIX = 'islamnoor_ad_budget';

interface DayState {
  date: string;
  fullscreenCount: number;
  usageSeconds: number;
  lastShownMs: number | null;
}

interface Clock {
  now(): number;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const defaultClock: Clock = { now: () => Date.now() };

const defaultStorage: StorageLike = {
  getItem: (key) => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

let clock: Clock = defaultClock;
let storage: StorageLike = defaultStorage;

export function setClockForTests(c: Clock): void {
  clock = c;
}

export function setStorageForTests(s: StorageLike): void {
  storage = s;
}

export function resetAdBudgetForTests(): void {
  clock = defaultClock;
  storage = defaultStorage;
}

function todayKey(nowMs: number): string {
  return new Date(nowMs).toLocaleDateString('sv-SE');
}

function storageKey(date: string): string {
  return `${STORAGE_PREFIX}:${date}`;
}

function loadState(date: string): DayState {
  try {
    const raw = storage.getItem(storageKey(date));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'date' in parsed) {
        return parsed as DayState;
      }
    }
  } catch {
    // stockage indisponible ou corrompu : état par défaut
  }
  return { date, fullscreenCount: 0, usageSeconds: 0, lastShownMs: null };
}

function saveState(date: string, state: DayState): void {
  try {
    storage.setItem(storageKey(date), JSON.stringify(state));
  } catch {
    // stockage indisponible : on ignore la persistance
  }
}

function maxForUsage(usageSeconds: number): number {
  const minutes = usageSeconds / 60;
  let max: number = USAGE_TIERS[0].max;
  for (const tier of USAGE_TIERS) {
    if (minutes >= tier.minMinutes) {
      max = tier.max;
    }
  }
  return max;
}

export function addUsage(seconds: number): void {
  const now = clock.now();
  const date = todayKey(now);
  const state = loadState(date);
  state.usageSeconds += seconds;
  saveState(date, state);
}

export function canShowFullscreen(
  trigger: AdTrigger,
  isPremium: boolean,
): { allowed: boolean; reason: string } {
  if (isPremium) {
    return { allowed: false, reason: 'premium' };
  }
  const now = clock.now();
  const date = todayKey(now);
  const state = loadState(date);
  const max = maxForUsage(state.usageSeconds);
  if (state.fullscreenCount >= max) {
    return { allowed: false, reason: 'daily-limit' };
  }
  if (state.lastShownMs !== null && now - state.lastShownMs < MIN_GAP_MS) {
    return { allowed: false, reason: 'min-gap' };
  }
  return { allowed: true, reason: 'ok' };
}

export function recordFullscreenShown(): void {
  const now = clock.now();
  const date = todayKey(now);
  const state = loadState(date);
  state.fullscreenCount += 1;
  state.lastShownMs = now;
  saveState(date, state);
}