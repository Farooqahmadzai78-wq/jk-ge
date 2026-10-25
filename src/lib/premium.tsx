import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Publicités plein écran activées (App Open à l'ouverture max 1/4h et
 * Interstitiel toutes les 2 modifications validées de personnalisation avec
 * délai minimal de 5 min). Toutes les bannières restent définitivement supprimées.
 */
export const ADS_ENABLED = true;

/**
 * Abonnement Premium : desactive pour la version de lancement.
 * Aucune offre, aucun achat, aucune facturation ne doit etre propose.
 * L'entree de navigation, l'ecran d'abonnement et l'initialisation du
 * SDK de facturation sont neutralises via ce drapeau.
 */
export const PREMIUM_ENABLED = false;

type PremiumCtx = {
  isPremium: boolean;
  loading: boolean;
  setPremium: (value: boolean) => void;
};

const STORAGE_KEY = "islamnoor_premium";

const Ctx = createContext<PremiumCtx>({
  isPremium: false,
  loading: false,
  setPremium: () => {},
});

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState<boolean>(false);

  useEffect(() => {
    try {
      setIsPremium(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // localStorage indisponible : on conserve false
    }
  }, []);

  const setPremium = useCallback(
    (value: boolean) => {
      setIsPremium(value);
      try {
        localStorage.setItem(STORAGE_KEY, String(value));
      } catch {
        // localStorage indisponible ou quota dépassé : on ignore la persistance
      }
    },
    [],
  );

  const value = useMemo(
    () => ({ isPremium, loading: false, setPremium }),
    [isPremium, setPremium],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
}

export function usePremium() {
  return useContext(Ctx);
}
