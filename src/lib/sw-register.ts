/**
 * Service Worker registration and notification helper
 */

import { isNativeAndroidPlatform } from "@/lib/local-notifications";

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn("[SW] Registration failed:", err);
    return null;
  }
}

export async function sendSystemNotification(
  title: string,
  options?: {
    body?: string;
    tag?: string;
    icon?: string;
    data?: Record<string, unknown>;
  },
): Promise<boolean> {
  // Sur Android natif, l'API Notification du navigateur est inerte dans la
  // WebView : la notification doit etre publiee par le plugin natif pour
  // apparaitre reellement dans la barre de notifications systeme.
  if (isNativeAndroidPlatform()) {
    const { showLocalNotification } = await import("@/lib/local-notifications");
    return showLocalNotification(title, options?.body ?? "", {
      tag: options?.tag,
      data: options?.data,
    });
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return false;
    } catch {
      return false;
    }
  }

  const notifOptions = {
    body: options?.body || "",
    tag: options?.tag || "islam-noor-adhan",
    icon: options?.icon || "/favicon.ico",
    data: options?.data || {},
  };

  // 1. Try Service Worker showNotification (works better in background/locked screen)
  try {
    if ("serviceWorker" in navigator) {
      const reg = swRegistration || (await navigator.serviceWorker.ready);
      if (reg && reg.showNotification) {
        // `vibrate` fait partie de la spécification Notification mais n'est pas
        // encore déclaré dans les typings DOM de TypeScript.
        const swOptions: NotificationOptions & { vibrate?: number[] } = {
          ...notifOptions,
          badge: "/favicon.ico",
          vibrate: [200, 100, 200, 100, 200],
          requireInteraction: true,
        };
        await reg.showNotification(title, swOptions);
        return true;
      }
    }
  } catch (err) {
    console.warn("[SW] SW showNotification failed, using fallback:", err);
  }

  // 2. Fallback to standard Web Notification API
  try {
    new Notification(title, notifOptions);
    return true;
  } catch (err) {
    console.warn("[SW] Native Notification constructor failed:", err);
    return false;
  }
}
