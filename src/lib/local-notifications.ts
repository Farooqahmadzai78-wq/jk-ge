import { Capacitor } from "@capacitor/core";

/**
 * Notifications locales.
 *
 * Sur Android (conteneur Capacitor), l'API Notification du navigateur est
 * inerte : la WebView n'implemente pas le constructeur Notification et le
 * service worker de la page n'affiche rien dans la barre systeme. Les
 * notifications doivent donc passer par le plugin natif
 * @capacitor/local-notifications, deja installe et enregistre.
 *
 * Sur le web, on conserve l'API Notification (avec le service worker) et les
 * reglages du navigateur.
 */

type LocalNotificationPermission = "granted" | "denied" | "default";

/** Vrai dans le conteneur Capacitor Android (WebView). */
export function isNativeAndroidPlatform(): boolean {
  return isNativeAndroid();
}

function isNativeAndroid(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      Capacitor.isNativePlatform() &&
      Capacitor.getPlatform() === "android"
    );
  } catch {
    return false;
  }
}

async function loadPlugin() {
  try {
    const mod = await import("@capacitor/local-notifications");
    return mod.LocalNotifications;
  } catch {
    return null;
  }
}

/** Demande l'autorisation de notification (natif sur Android, navigateur sur le web). */
export async function requestNotificationPermission(): Promise<LocalNotificationPermission> {
  if (isNativeAndroid()) {
    const plugin = await loadPlugin();
    if (!plugin) return "denied";
    try {
      let status = await plugin.checkPermissions();
      if (status.display === "prompt") {
        status = await plugin.requestPermissions();
      }
      return status.display === "granted"
        ? "granted"
        : status.display === "denied"
          ? "denied"
          : "default";
    } catch {
      return "denied";
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  try {
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    const res = await Notification.requestPermission();
    return res as LocalNotificationPermission;
  } catch {
    return "denied";
  }
}

/**
 * Affiche une notification locale immediate.
 * Sur Android, elle est publiee par le systeme (barre de notifications) et
 * reste visible meme si l'application passe en arriere-plan.
 */
export async function showLocalNotification(
  title: string,
  body: string,
  options?: { id?: number; tag?: string; data?: Record<string, unknown> },
): Promise<boolean> {
  if (isNativeAndroid()) {
    const plugin = await loadPlugin();
    if (!plugin) return false;
    try {
      const permission = await plugin.checkPermissions();
      if (permission.display !== "granted") {
        const asked = await plugin.requestPermissions();
        if (asked.display !== "granted") return false;
      }
      await plugin.schedule({
        notifications: [
          {
            id: options?.id ?? Math.floor(Date.now() % 2_000_000_000),
            title,
            body,
            schedule: { at: new Date(Date.now() + 250) },
            extra: options?.data,
            ongoing: false,
            autoCancel: true,
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try {
    if (Notification.permission !== "granted") return false;
    new Notification(title, { body, tag: options?.tag, data: options?.data });
    return true;
  } catch {
    return false;
  }
}
