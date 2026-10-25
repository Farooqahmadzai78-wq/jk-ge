import { appToast } from "./app-toast";

export const BUG_TRACKER_URLS = {
  report: "https://islam-noor-bug-tracker.ai.studio/report",
  myReports: "https://islam-noor-bug-tracker.ai.studio/my-reports",
  home: "https://islam-noor-bug-tracker.ai.studio",
} as const;

/**
 * Safely opens an external URL in the system browser across Mobile, Desktop, and native containers (Capacitor/Cordova).
 */
export function openExternalUrl(url: string): void {
  try {
    // Check if running inside Capacitor or Cordova native app shell
    const cap = typeof window !== "undefined" ? (window as any).Capacitor : undefined;
    if (
      cap?.isNativePlatform?.() ||
      cap?.getPlatform?.() === "android" ||
      cap?.getPlatform?.() === "ios"
    ) {
      // In native environment, _system opens the external system browser
      const win = window.open(url, "_system");
      if (!win) {
        window.location.href = url;
      }
      return;
    }

    // Standard web browser - open in new tab
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win || win.closed || typeof win.closed === "undefined") {
      // Fallback via synthetic anchor click if window.open is blocked by popup blockers
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (err) {
    console.error("[openExternalUrl] Error opening link:", err);
    try {
      window.location.href = url;
    } catch {
      appToast.error(
        "Impossible d'ouvrir le service de signalement. Vérifiez votre connexion Internet et réessayez."
      );
    }
  }
}

/**
 * Clean up obsolete localStorage keys previously used by the local bug tracking system.
 */
export function cleanupLegacyBugStorage(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  const legacyKeys = [
    "islam_noor_bug_reports",
    "islam_noor_my_bug_reports",
    "islam_noor_admin_token",
    "islam_noor_bug_status_history",
    "islam_noor_user_notifications",
    "islam_noor_unread_notif_count",
    "islam_noor_dev_mode",
    "islam_noor_client_user_id",
  ];
  for (const key of legacyKeys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage access errors
    }
  }
}
