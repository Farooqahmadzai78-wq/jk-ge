import {
  canShowFullscreen,
  recordFullscreenShown,
  type AdTrigger,
} from "./ad-budget";

export type { AdTrigger };

let lastTrigger: AdTrigger | null = null;

export function setLastTrigger(trigger: AdTrigger): void {
  lastTrigger = trigger;
}

export function getLastTrigger(): AdTrigger | null {
  return lastTrigger;
}

export function resetLastTrigger(): void {
  lastTrigger = null;
}

export function tryTriggerAd(isPremium: boolean): boolean {
  if (!lastTrigger) return false;
  const decision = canShowFullscreen(lastTrigger, isPremium);
  if (decision.allowed) {
    recordFullscreenShown();
    return true;
  }
  return false;
}
