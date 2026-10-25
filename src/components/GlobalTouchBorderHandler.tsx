import { useEffect } from "react";
import { useSettings } from "@/lib/app-settings";
import { getWidgetBorderThemeById } from "@/lib/customization-themes";

export function GlobalTouchBorderHandler() {
  const { settings } = useSettings();

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    if (settings.batterySaver || settings.animationIntensity === "none") {
      document.body.removeAttribute("data-scrolling");
      return;
    }

    const activeTheme = getWidgetBorderThemeById(settings.widgetBorderTheme);
    const category = activeTheme?.category;
    const isTouchCategory =
      category === "touch" ||
      Boolean(activeTheme?.id.startsWith("wb-interact-")) ||
      Boolean(activeTheme?.borderClass?.startsWith("wb-interact-"));

    if (!isTouchCategory) {
      document.body.removeAttribute("data-scrolling");
      return;
    }

    const widgetSelector =
      "[data-widget-card], .widget, .widget-glass, .widget-card, .widget-bordered, .glass, .setting-card, [data-card], .card";

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let tapActivationTimer: ReturnType<typeof setTimeout> | null = null;
    let isBodyScrolling = false;
    const activeElements = new Set<HTMLElement>();

    // Couche globale dédiée hors de l'arbre React pour les impulsions de contact
    let rippleLayer = document.getElementById("global-touch-pulse-layer");
    if (!rippleLayer) {
      rippleLayer = document.createElement("div");
      rippleLayer.id = "global-touch-pulse-layer";
      rippleLayer.style.position = "fixed";
      rippleLayer.style.inset = "0";
      rippleLayer.style.pointerEvents = "none";
      rippleLayer.style.touchAction = "none";
      rippleLayer.style.userSelect = "none";
      rippleLayer.style.zIndex = "99999";
      rippleLayer.style.overflow = "hidden";
      document.body.appendChild(rippleLayer);
    }

    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let rippleSpawnedForGesture = false;
    let activeTarget: HTMLElement | null = null;

    const clearPendingTapTimer = () => {
      if (tapActivationTimer !== null) {
        clearTimeout(tapActivationTimer);
        tapActivationTimer = null;
      }
    };

    const clearAllTouchActive = () => {
      if (activeElements.size === 0) return;
      for (const el of activeElements) {
        el.removeAttribute("data-touch-active");
      }
      activeElements.clear();
    };

    const spawnContactRipple = (clientX: number, clientY: number) => {
      if (!rippleLayer || rippleSpawnedForGesture) return;
      // Limite le nombre d'ondes simultanées dans le DOM en cas de taps rapides
      if (rippleLayer.childElementCount >= 3) {
        rippleLayer.firstElementChild?.remove();
      }
      rippleSpawnedForGesture = true;
      const ripple = document.createElement("span");
      ripple.className = "touch-contact-pulse";
      ripple.style.position = "fixed";
      ripple.style.left = `${clientX}px`;
      ripple.style.top = `${clientY}px`;
      ripple.style.pointerEvents = "none";
      ripple.style.touchAction = "none";
      rippleLayer.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 650);
    };

    const activateTargetVisuals = (target: HTMLElement, clientX: number, clientY: number) => {
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--touch-x", `${clientX - rect.left}px`);
      target.style.setProperty("--touch-y", `${clientY - rect.top}px`);
      target.setAttribute("data-touch-active", "true");
      activeElements.add(target);
      spawnContactRipple(clientX, clientY);
    };

    let rafMoveId: number | null = null;

    const handlePointerDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement)?.closest?.(widgetSelector) as HTMLElement | null;
      if (!target) return;

      clearPendingTapTimer();
      startX = e.clientX;
      startY = e.clientY;
      isDragging = false;
      rippleSpawnedForGesture = false;
      activeTarget = target;

      // Délai court (65 ms) : si l'utilisateur initie un glissement (swipe/scroll),
      // le minuteur est annulé avant tout getBoundingClientRect() ou insertion DOM.
      tapActivationTimer = setTimeout(() => {
        tapActivationTimer = null;
        if (isDragging || !activeTarget) return;
        activateTargetVisuals(activeTarget, startX, startY);
      }, 65);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!activeTarget) return;

      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);

      if (deltaY > 6 || deltaX > 6) {
        isDragging = true;
        clearPendingTapTimer();
        if (rafMoveId === null) {
          rafMoveId = requestAnimationFrame(() => {
            rafMoveId = null;
            clearAllTouchActive();
          });
        }
        activeTarget = null;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (rafMoveId !== null) {
        cancelAnimationFrame(rafMoveId);
        rafMoveId = null;
      }
      const releasedTarget = activeTarget;
      const wasDragging = isDragging;
      const hadSpawnedRipple = rippleSpawnedForGesture;

      clearPendingTapTimer();
      activeTarget = null;
      isDragging = false;

      // Tap court (< 65 ms) sans glissement : déclenche immédiatement l'impulsion lumineuse
      if (releasedTarget && !wasDragging && !hadSpawnedRipple && e.type === "pointerup") {
        activateTargetVisuals(releasedTarget, startX, startY);
        setTimeout(() => {
          releasedTarget.removeAttribute("data-touch-active");
          activeElements.delete(releasedTarget);
        }, 180);
        return;
      }

      clearAllTouchActive();
    };

    // --- 3 : Onde fluide au défilement sans recalcul global à chaque événement scroll ---
    const handleScroll = (e: Event) => {
      isDragging = true;
      activeTarget = null;
      clearPendingTapTimer();

      // Ignore scroll events originating from horizontal carousels or inner scrollable elements
      const target = e.target as HTMLElement | null;
      if (target && target !== document && target !== document.documentElement && target !== document.body) {
        return;
      }

      clearAllTouchActive();

      if (!isBodyScrolling) {
        isBodyScrolling = true;
        document.body.setAttribute("data-scrolling", "true");
      }

      if (scrollTimeout !== null) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
        isBodyScrolling = false;
        document.body.removeAttribute("data-scrolling");
      }, 200);
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("scroll", handleScroll, { capture: true });
      if (rafMoveId !== null) cancelAnimationFrame(rafMoveId);
      clearPendingTapTimer();
      clearAllTouchActive();
      if (scrollTimeout !== null) clearTimeout(scrollTimeout);
      document.body.removeAttribute("data-scrolling");
    };
  }, [settings.widgetBorderTheme, settings.batterySaver, settings.animationIntensity]);

  return null;
}
