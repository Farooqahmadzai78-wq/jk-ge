import { useCallback, useState } from "react";
import type { AdTrigger } from "./ad-trigger";

/**
 * Hook hérité conservé uniquement pour compatibilité d'import éventuel.
 * Toute la logique publicitaire passe désormais par `src/lib/ad-system.ts`
 * (aucune fausse publicité ni double déclenchement).
 */
export function useAdManager() {
  const [showAd, setShowAd] = useState(false);

  const trigger = useCallback((_t: AdTrigger) => {
    // Géré exclusivement par applyValidatedCustomizationChange dans src/lib/ad-system.ts
  }, []);

  return { showAd, setShowAd, trigger };
}
