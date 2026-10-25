import { appToast } from "./app-toast";
import { vibrate } from "./vibration";
import { openExternalUrl, BUG_TRACKER_URLS } from "./external-links";

export const BUG_TRACKER_BASE_URL = "https://islam-noor-bug-tracker.ai.studio";

// Persistent Storage Keys
export const STORAGE_KEYS = {
  USER_TOKEN: "islam_noor_user_token_v1",
  REGISTERED_ON_SERVER: "islam_noor_user_registered_v1",
  PUSH_TOKEN: "islam_noor_fcm_push_token_v1",
  LAST_PUSH_TOKEN_SYNCED: "islam_noor_fcm_push_token_synced_v1",
  NOTIFICATIONS_CACHE: "islam_noor_bug_notifications_cache_v1",
  SEEN_NOTIFICATIONS: "islam_noor_bug_seen_notifs_v1",
  SEEN_REPORTS_STATE: "islam_noor_bug_seen_reports_state_v1",
} as const;

export interface BugTrackerNotification {
  id: string;
  user_id: string;
  report_id?: string;
  public_id?: string;
  title: string;
  message: string;
  type: "developer_reply" | "status_change" | "system";
  new_status?: "Nouveau" | "En cours" | "Résolu" | "Non résolu";
  read: boolean;
  created_at: string;
}

export interface BugTrackerTechnicalInfo {
  app_version?: string;
  device?: string;
  os?: string;
  language?: string;
  [key: string]: unknown;
}

export interface CreateReportPayload {
  title: string;
  description: string;
  category: string;
  technicalInfo?: BugTrackerTechnicalInfo;
  images?: string[];
}

export interface BugTrackerReport {
  id: string;
  public_id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: "Nouveau" | "En cours" | "Résolu" | "Non résolu";
  created_at: string;
  updated_at?: string;
  replies?: Array<{
    id: string;
    author: string;
    message: string;
    created_at: string;
  }>;
}

/**
 * Generates or retrieves the persistent unique user token: usr_<id>
 * Guaranteed to stay identical across app launches without regeneration.
 */
export function getOrCreateUserToken(): string {
  if (typeof window === "undefined" || !window.localStorage) {
    return "usr_anonymous";
  }

  try {
    const existing = localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
    if (existing && existing.startsWith("usr_") && existing.length > 5) {
      return existing;
    }

    // Generate unique random token: usr_<uuid>
    let randomPart = "";
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      randomPart = crypto.randomUUID().replace(/-/g, "");
    } else {
      randomPart = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 12)}`;
    }

    const newToken = `usr_${randomPart}`;
    localStorage.setItem(STORAGE_KEYS.USER_TOKEN, newToken);
    return newToken;
  } catch (err) {
    console.warn("[BugTracker] Failed accessing localStorage for user token:", err);
    return "usr_fallback_client";
  }
}

/**
 * Registers or gets the user from the Bug Tracker backend.
 * POST https://islam-noor-bug-tracker.ai.studio/api/users/register-or-get
 */
export async function registerOrGetUser(): Promise<{ success: boolean; data?: unknown }> {
  const userToken = getOrCreateUserToken();
  try {
    const response = await fetch(`${BUG_TRACKER_BASE_URL}/api/users/register-or-get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-token": userToken,
      },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(STORAGE_KEYS.REGISTERED_ON_SERVER, "true");
      }
      return { success: true, data };
    } else {
      console.warn("[BugTracker] register-or-get HTTP status:", response.status);
      return { success: false };
    }
  } catch (error) {
    console.warn("[BugTracker] register-or-get network error (offline or unreachable):", error);
    return { success: false };
  }
}

/**
 * Registers the device FCM push token with the Bug Tracker backend.
 * POST https://islam-noor-bug-tracker.ai.studio/api/push/register
 */
export async function registerPushToken(
  pushToken: string,
  platform: "android" | "web" | "ios" = "android"
): Promise<boolean> {
  if (!pushToken) return false;
  const userToken = getOrCreateUserToken();

  try {
    console.log("[BugTracker] Registering push token with backend...", {
      userToken,
      platform,
      tokenSnippet: pushToken.substring(0, 15) + "...",
    });

    const response = await fetch(`${BUG_TRACKER_BASE_URL}/api/push/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-token": userToken,
      },
      body: JSON.stringify({
        pushToken,
        platform,
      }),
    });

    console.log("[BUG TRACKER FCM] ENREGISTREMENT DU TOKEN - REPONSE SERVEUR:", {
      user_id: userToken,
      status: response.status,
      ok: response.ok,
    });

    if (response.ok) {
      console.log("[BUG TRACKER FCM] Token enregistré avec succès auprès du backend (HTTP " + response.status + ")");
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, pushToken);
        localStorage.setItem(STORAGE_KEYS.LAST_PUSH_TOKEN_SYNCED, pushToken);
      }
      return true;
    } else {
      console.error("[BUG TRACKER FCM] Échec enregistrement token (HTTP " + response.status + ")");
      return false;
    }
  } catch (error) {
    console.warn("[BugTracker] push/register network error:", error);
    return false;
  }
}

/**
 * Unregisters a push token when no longer valid or on reset.
 * DELETE https://islam-noor-bug-tracker.ai.studio/api/push/unregister
 */
export async function unregisterPushToken(pushToken: string): Promise<boolean> {
  if (!pushToken) return false;
  const userToken = getOrCreateUserToken();

  try {
    const response = await fetch(`${BUG_TRACKER_BASE_URL}/api/push/unregister`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-user-token": userToken,
      },
      body: JSON.stringify({
        pushToken,
      }),
    });

    if (response.ok) {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.LAST_PUSH_TOKEN_SYNCED);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.warn("[BugTracker] push/unregister network error:", error);
    return false;
  }
}

/**
 * Fetches user-specific notifications from the Bug Tracker.
 * GET https://islam-noor-bug-tracker.ai.studio/api/notifications
 */
export async function fetchBugTrackerNotifications(): Promise<{
  notifications: BugTrackerNotification[];
  unreadCount: number;
}> {
  const userToken = getOrCreateUserToken();
  try {
    const response = await fetch(`${BUG_TRACKER_BASE_URL}/api/notifications`, {
      method: "GET",
      headers: {
        "x-user-token": userToken,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        notifications: Array.isArray(data?.notifications) ? data.notifications : [],
        unreadCount: typeof data?.unreadCount === "number" ? data.unreadCount : 0,
      };
    }
  } catch (err) {
    console.warn("[BugTracker] fetchBugTrackerNotifications failed:", err);
  }
  return { notifications: [], unreadCount: 0 };
}

/**
 * Marks a specific notification as read.
 * PATCH https://islam-noor-bug-tracker.ai.studio/api/notifications/:id/read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  if (!notificationId) return false;
  const userToken = getOrCreateUserToken();

  try {
    const response = await fetch(`${BUG_TRACKER_BASE_URL}/api/notifications/${notificationId}/read`, {
      method: "PATCH",
      headers: {
        "x-user-token": userToken,
      },
    });
    return response.ok;
  } catch (err) {
    console.warn("[BugTracker] markNotificationAsRead failed:", err);
    return false;
  }
}

/**
 * Fetches user's own reports.
 * GET https://islam-noor-bug-tracker.ai.studio/api/my-reports
 */
export async function fetchMyReports(): Promise<BugTrackerReport[]> {
  const userToken = getOrCreateUserToken();
  try {
    const response = await fetch(`${BUG_TRACKER_BASE_URL}/api/my-reports`, {
      method: "GET",
      headers: {
        "x-user-token": userToken,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : Array.isArray(data?.reports) ? data.reports : [];
    }
  } catch (err) {
    console.warn("[BugTracker] fetchMyReports error:", err);
  }
  return [];
}

/**
 * Opens a specific bug report or the "My Reports" page in the external system browser.
 */
export function openBugReportInExternalBrowser(reportId?: string): void {
  const userToken = getOrCreateUserToken();
  const url = reportId
    ? `${BUG_TRACKER_URLS.myReports}?report_id=${encodeURIComponent(reportId)}&token=${encodeURIComponent(userToken)}`
    : `${BUG_TRACKER_URLS.myReports}?token=${encodeURIComponent(userToken)}`;
  openExternalUrl(url);
}

/**
 * Opens the new report submission page in the external system browser.
 */
export function openSubmitReportInExternalBrowser(): void {
  const userToken = getOrCreateUserToken();
  const url = `${BUG_TRACKER_URLS.report}?token=${encodeURIComponent(userToken)}`;
  openExternalUrl(url);
}

/**
 * Handles incoming push notification payload (foreground, background or lockscreen action).
 */
export function handleBugTrackerPushPayload(
  notificationData: Record<string, unknown>,
  notificationContent?: { title?: string; body?: string }
): void {
  const reportId =
    (notificationData?.report_id as string) ||
    (notificationData?.public_id as string) ||
    (notificationData?.reportId as string);
  const publicId = (notificationData?.public_id as string) || (notificationData?.publicId as string);
  const notifType = (notificationData?.type as string) || "developer_reply";
  const newStatus = (notificationData?.new_status as string) || (notificationData?.newStatus as string);

  let defaultTitle = "🔔 Réponse du développeur";
  let defaultBody = "Le développeur a répondu à votre signalement.";

  if (notifType === "status_change") {
    defaultTitle = "📌 Mise à jour de votre signalement";
    if (newStatus === "En cours") {
      defaultTitle = "🔵 Signalement en cours";
      defaultBody = "Votre signalement est maintenant en cours de traitement.";
    } else if (newStatus === "Résolu") {
      defaultTitle = "🟢 Signalement résolu";
      defaultBody = "Votre signalement a été résolu.";
    } else if (newStatus === "Non résolu") {
      defaultTitle = "🔴 Signalement non résolu";
      defaultBody = "Votre signalement n'a pas pu être résolu.";
    } else {
      defaultBody = newStatus
        ? `Le statut est passé à : ${newStatus}`
        : "Le statut de votre signalement a été mis à jour.";
    }
  }

  const title = notificationContent?.title || defaultTitle;
  const body = notificationContent?.body || defaultBody;

  // Log for debugging
  console.log("[BUG TRACKER NOTIF] AFFICHAGE SUR L'APPLICATION", {
    title,
    body,
    reportId,
    publicId,
    notifType,
    newStatus,
  });

  try {
    vibrate("notification");
  } catch (vibErr) {
    console.debug("[BugTracker] vibration not supported:", vibErr);
  }

  appToast.info(title, {
    description: body,
    category: "dev",
    duration: 9000,
    action: {
      label: "Consulter",
      onClick: () => {
        openBugReportInExternalBrowser(reportId || publicId);
      },
    },
  });
}

/**
 * Helper to fetch and verify unread notifications and new developer replies.
 * Exported so other components can trigger an immediate check on interaction.
 */
export async function triggerBugNotificationCheck(): Promise<void> {
  if (typeof window === "undefined") return;

  const getSeenMap = (key: string): Record<string, any> => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveSeenMap = (key: string, data: Record<string, any>) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.warn("[BugTracker] Failed saving seen state:", err);
    }
  };

  try {
    // Method A: Check server notifications endpoint
    const { notifications } = await fetchBugTrackerNotifications();
    if (Array.isArray(notifications) && notifications.length > 0) {
      const seenNotifs = getSeenMap(STORAGE_KEYS.SEEN_NOTIFICATIONS);
      const unread = notifications.filter(
        (n: any) =>
          (n.read === false || n.is_read === false || n.read === 0 || n.is_read === 0) &&
          !seenNotifs[n.id]
      );

      for (const notif of unread) {
        seenNotifs[notif.id] = Date.now();
        saveSeenMap(STORAGE_KEYS.SEEN_NOTIFICATIONS, seenNotifs);

        handleBugTrackerPushPayload(
          {
            report_id: notif.report_id,
            public_id: notif.public_id,
            type: notif.type,
            new_status: notif.new_status,
          },
          {
            title: notif.title || "🔔 Notification Bug Tracker",
            body: notif.message,
          }
        );

        // Mark as read on server
        void markNotificationAsRead(notif.id);
      }
    }

    // Method B: Dual-check on user's reports to catch developer replies or status changes immediately
    const reports = await fetchMyReports();
    if (Array.isArray(reports) && reports.length > 0) {
      const seenReportsState = getSeenMap(STORAGE_KEYS.SEEN_REPORTS_STATE);
      const seenReplies = getSeenMap(STORAGE_KEYS.SEEN_NOTIFICATIONS);

      for (const report of reports) {
        const rId = report.id || report.public_id;
        if (!rId) continue;

        const prev = seenReportsState[rId] as
          | { status?: string; repliesCount?: number; lastReplyId?: string }
          | undefined;

        // Normalize replies array & count
        const repliesList: Array<{ id?: string; author?: string; message?: string; created_at?: string }> =
          Array.isArray(report.replies)
            ? report.replies
            : Array.isArray((report as any).comments)
              ? (report as any).comments
              : Array.isArray((report as any).messages)
                ? (report as any).messages
                : [];

        const currentRepliesCount =
          repliesList.length > 0
            ? repliesList.length
            : typeof (report as any).replies_count === "number"
              ? (report as any).replies_count
              : typeof (report as any).repliesCount === "number"
                ? (report as any).repliesCount
                : 0;

        const currentStatus = report.status;
        const latestReply = repliesList.length > 0 ? repliesList[repliesList.length - 1] : null;
        const latestReplyId = latestReply?.id || (latestReply ? `${rId}_reply_${repliesList.length}` : undefined);

        if (prev) {
          // 1. Check if status changed
          if (prev.status && prev.status !== currentStatus) {
            handleBugTrackerPushPayload(
              {
                report_id: report.id,
                public_id: report.public_id,
                type: "status_change",
                new_status: currentStatus,
              },
              {
                title:
                  currentStatus === "En cours"
                    ? "🔵 Signalement en cours"
                    : currentStatus === "Résolu"
                      ? "🟢 Signalement résolu"
                      : currentStatus === "Non résolu"
                        ? "🔴 Signalement non résolu"
                        : `📌 Statut : ${currentStatus}`,
                body: `Votre signalement "${report.title || "Bug"}" est passé à : ${currentStatus}`,
              }
            );
          }

          // 2. Check if new reply arrived
          if (
            (typeof prev.repliesCount === "number" && currentRepliesCount > prev.repliesCount) ||
            (latestReplyId && prev.lastReplyId && latestReplyId !== prev.lastReplyId)
          ) {
            if (latestReplyId && !seenReplies[latestReplyId]) {
              seenReplies[latestReplyId] = Date.now();
              saveSeenMap(STORAGE_KEYS.SEEN_NOTIFICATIONS, seenReplies);
            }

            handleBugTrackerPushPayload(
              {
                report_id: report.id,
                public_id: report.public_id,
                type: "developer_reply",
              },
              {
                title: "🔔 Réponse du développeur",
                body: latestReply?.message
                  ? latestReply.message.slice(0, 120)
                  : `Le développeur a répondu à : ${report.title || "votre signalement"}`,
              }
            );
          }
        } else {
          // First time tracking this report in session: if there is a recent reply not seen yet, notify
          if (latestReply && latestReplyId && !seenReplies[latestReplyId]) {
            const replyTime = latestReply.created_at ? new Date(latestReply.created_at).getTime() : 0;
            const isRecent = replyTime === 0 || Date.now() - replyTime < 24 * 3600 * 1000;

            if (isRecent) {
              seenReplies[latestReplyId] = Date.now();
              saveSeenMap(STORAGE_KEYS.SEEN_NOTIFICATIONS, seenReplies);

              handleBugTrackerPushPayload(
                {
                  report_id: report.id,
                  public_id: report.public_id,
                  type: "developer_reply",
                },
                {
                  title: "🔔 Réponse du développeur",
                  body: latestReply.message
                    ? latestReply.message.slice(0, 120)
                    : `Le développeur a répondu à : ${report.title || "votre signalement"}`,
                }
              );
            }
          }
        }

        seenReportsState[rId] = {
          status: currentStatus,
          repliesCount: currentRepliesCount,
          lastReplyId: latestReplyId,
          updatedAt: Date.now(),
        };
      }

      saveSeenMap(STORAGE_KEYS.SEEN_REPORTS_STATE, seenReportsState);
    }
  } catch (err) {
    // Silent error handling for background polling
  }
}

let isServiceInitialized = false;

/**
 * Initializes Bug Tracker Push Notifications Service on Android / Web.
 * Safe to call at startup. Handles permissions, channels, FCM registration, foreground alerts, and deep click actions.
 */
export async function initBugTrackerPushService(): Promise<void> {
  if (typeof window === "undefined" || isServiceInitialized) return;
  isServiceInitialized = true;

  const userToken = getOrCreateUserToken();
  console.log("[BugTracker] Current user_token:", userToken);

  // 1. Ensure user ID exists & register with backend asynchronously
  void registerOrGetUser();

  // 2. Check if running inside Capacitor native container (Android / iOS)
  const cap = (window as any).Capacitor;
  const isNative = cap?.isNativePlatform?.() || cap?.getPlatform?.() === "android" || cap?.getPlatform?.() === "ios";

  if (isNative) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      // Create Android Notification Channel for Bug Tracker
      try {
        await PushNotifications.createChannel({
          id: "bug_tracker_notifications",
          name: "Bug Tracker Islam-Noor",
          description: "Notifications des réponses des développeurs et mises à jour des signalements",
          importance: 5, // High importance (heads-up notification)
          visibility: 1, // Public visibility on lockscreen
          sound: "default",
          vibration: true,
          lights: true,
          lightColor: "#10b981",
        });
        console.log("[BugTracker Push] Notification channel 'bug_tracker_notifications' registered.");
      } catch (chanErr) {
        console.warn("[BugTracker Push] createChannel skipped or error:", chanErr);
      }

      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === "prompt") {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive === "granted") {
        // L'enregistrement du jeton est automatique : le plugin FCM ne
        // produit de jeton que si android/app/google-services.json est
        // present (sinon il emet une erreur 'registrationError', sans effet
        // de bord sur l'application).
        console.log("[push] enregistrement FCM actif (necessite google-services.json)");
      } else {
        console.warn("[BugTracker Push] Notification permission not granted:", permStatus.receive);
      }

      // On successful FCM device token generation
      await PushNotifications.addListener("registration", (token) => {
        if (token?.value) {
          console.log("[BUG TRACKER FCM] TOKEN OBTENU", {
            tokenSnippet: token.value.substring(0, 15) + "...",
            fullLength: token.value.length,
          });
          const lastSynced = localStorage.getItem(STORAGE_KEYS.LAST_PUSH_TOKEN_SYNCED);
          if (lastSynced !== token.value) {
            console.log("[BUG TRACKER FCM] ENREGISTREMENT DU TOKEN EN COURS...", {
              user_id: userToken,
            });
            void registerPushToken(token.value, "android");
          } else {
            console.log("[BUG TRACKER FCM] Token déjà synchronisé avec le serveur.");
          }
        } else {
          console.warn("[BUG TRACKER FCM] Token vide reçu dans 'registration'");
        }
      });

      // On registration error (e.g. offline, Google Play Services unavailable)
      await PushNotifications.addListener("registrationError", (error) => {
        console.error("[BUG TRACKER FCM] ERREUR ENREGISTREMENT FCM (Google Play / Réseau):", error);
      });

      // Push notification received while app is in foreground (open)
      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("[BUG TRACKER] PUSH REÇU EN AVANT-PLAN", {
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
        const data = (notification.data || {}) as Record<string, unknown>;
        handleBugTrackerPushPayload(data, {
          title: notification.title,
          body: notification.body,
        });
      });

      // Push notification action performed (user clicked notification from lockscreen / background tray)
      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = (action.notification?.data || {}) as Record<string, unknown>;
        const reportId =
          (data.report_id as string) ||
          (data.public_id as string) ||
          (data.reportId as string);
        console.log("[BUG TRACKER FCM] NOTIFICATION CLIQUÉE", {
          reportId,
          actionId: action.actionId,
        });
        openBugReportInExternalBrowser(reportId);
      });
    } catch (nativeErr) {
      console.warn("[BugTracker Push] Native Capacitor Push initialization skipped or failed:", nativeErr);
    }
  }

  // 3. Setup real-time in-app notification checks (fast 5s interval + focus + visibility + pageshow)
  if (typeof window !== "undefined") {
    // Initial check shortly after boot
    setTimeout(() => {
      void triggerBugNotificationCheck();
    }, 1200);

    // Fast polling while the app is running
    setInterval(() => {
      if (!document.hidden) {
        void triggerBugNotificationCheck();
      }
    }, 5000);

    // Immediate checks on user return
    window.addEventListener("focus", () => {
      void triggerBugNotificationCheck();
    });

    window.addEventListener("pageshow", () => {
      void triggerBugNotificationCheck();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        void triggerBugNotificationCheck();
      }
    });

    // Sync push token and verify notifications when coming back online
    window.addEventListener("online", () => {
      const isRegistered = localStorage.getItem(STORAGE_KEYS.REGISTERED_ON_SERVER);
      if (!isRegistered) {
        void registerOrGetUser();
      }
      const savedToken = localStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
      const lastSynced = localStorage.getItem(STORAGE_KEYS.LAST_PUSH_TOKEN_SYNCED);
      if (savedToken && savedToken !== lastSynced) {
        void registerPushToken(savedToken, isNative ? "android" : "web");
      }
      void triggerBugNotificationCheck();
    });
  }
}
