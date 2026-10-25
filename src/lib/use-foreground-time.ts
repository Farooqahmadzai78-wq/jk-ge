import { useEffect } from "react";
import { addUsage } from "./ad-budget";
import { ADS_ENABLED } from "./premium";

export function useForegroundTime(): void {
  useEffect(() => {
    // Sans publicites, le comptage du temps d'usage n'a aucune utilite :
    // on evite ce travail repete en arriere-plan.
    if (!ADS_ENABLED) return;
    let lastVisibleTime: number | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      lastVisibleTime = Date.now();
      intervalId = setInterval(() => addUsage(10), 10_000);
    };

    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (lastVisibleTime !== null) {
        addUsage(Math.floor((Date.now() - lastVisibleTime) / 1000));
        lastVisibleTime = null;
      }
    };

    if (document.visibilityState === "visible") {
      start();
    }

    const handler = () => {
      if (document.visibilityState === "visible") {
        start();
      } else {
        stop();
      }
    };

    document.addEventListener("visibilitychange", handler);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handler);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);
}
