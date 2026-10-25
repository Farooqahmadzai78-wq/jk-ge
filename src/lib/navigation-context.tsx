import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { shouldHideBottomNav } from "./navigation-routes";

interface NavigationContextValue {
  /**
   * Vrai si la barre de navigation inférieure doit être masquée :
   * - soit parce que la route active est une page secondaire (ex: /about, /invocations/$cat, /tasbih, etc.)
   * - soit parce qu'une vue secondaire complète est active sur un onglet principal (ex: lecteur de sourate, liste des sourates, résultats de recherche halal, fiche produit détaillée)
   */
  isNavHidden: boolean;
  /**
   * Enregistre ou désenregistre une vue secondaire active par un identifiant unique.
   */
  registerSecondaryView: (id: string, active: boolean) => void;
  /**
   * Ensemble des identifiants de vues secondaires actuellement actives.
   */
  activeSecondaryViews: ReadonlySet<string>;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [activeViews, setActiveViews] = useState<Set<string>>(() => new Set());
  const prevPathnameRef = useRef(pathname);

  // Lorsqu'on change de route, on purge les vues secondaires éphémères de la page précédente
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      setActiveViews(new Set());
    }
  }, [pathname]);

  const registerSecondaryView = useCallback((id: string, active: boolean) => {
    setActiveViews((prev) => {
      const next = new Set(prev);
      if (active) {
        if (next.has(id)) return prev;
        next.add(id);
      } else {
        if (!next.has(id)) return prev;
        next.delete(id);
      }
      return next;
    });
  }, []);

  const routeHidesNav = shouldHideBottomNav(pathname);
  const isNavHidden = routeHidesNav || activeViews.size > 0;

  const value = useMemo<NavigationContextValue>(
    () => ({
      isNavHidden,
      registerSecondaryView,
      activeSecondaryViews: activeViews,
    }),
    [isNavHidden, registerSecondaryView, activeViews],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

/**
 * Hook d'accès à l'état de visibilité de la navigation.
 */
export function useNavigationVisibility(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    // Fallback gracieux si utilisé hors provider (ex: tests unitaires isolés)
    return {
      isNavHidden: false,
      registerSecondaryView: () => {},
      activeSecondaryViews: new Set(),
    };
  }
  return ctx;
}

/**
 * Déclare qu'une vue secondaire complète est active.
 * Masque automatiquement la barre de navigation et libère l'espace d'affichage.
 * Restaure la navigation dès que la vue se ferme ou que le composant est démonté.
 *
 * @param id Identifiant unique de la vue (ex: "quran-reader", "quran-surah-list", "halal-search-results")
 * @param isActive Vrai si la vue secondaire est actuellement affichée
 */
export function useSecondaryView(id: string, isActive: boolean): void {
  const { registerSecondaryView } = useNavigationVisibility();

  useEffect(() => {
    registerSecondaryView(id, isActive);
    return () => {
      registerSecondaryView(id, false);
    };
  }, [id, isActive, registerSecondaryView]);
}

/**
 * Coordonne la fermeture d'une vue secondaire avec le bouton Retour d'Android
 * et l'historique du navigateur (via popstate).
 *
 * Lorsque `isActive` devient vrai, pousse un état dans l'historique.
 * Si l'utilisateur utilise le bouton retour matériel d'Android, intercepte
 * l'événement pour fermer la vue secondaire sans quitter l'onglet principal.
 */
export function useSecondaryViewBack(
  isActive: boolean,
  onBack: () => void,
  historyKey: string,
): { closeWithBack: () => void } {
  const hasPushedStateRef = useRef(false);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isActive) {
      // Pousse un état spécifique dans l'historique si ce n'est pas déjà fait
      const stateObj = { [historyKey]: true, timestamp: Date.now() };
      window.history.pushState(stateObj, "");
      hasPushedStateRef.current = true;

      const handlePopState = () => {
        hasPushedStateRef.current = false;
        onBackRef.current();
      };

      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    } else {
      hasPushedStateRef.current = false;
    }
  }, [isActive, historyKey]);

  const closeWithBack = useCallback(() => {
    if (hasPushedStateRef.current && typeof window !== "undefined") {
      hasPushedStateRef.current = false;
      window.history.back();
    } else {
      onBackRef.current();
    }
  }, []);

  return { closeWithBack };
}
