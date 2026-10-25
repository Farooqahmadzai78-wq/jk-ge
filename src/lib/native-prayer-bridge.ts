import { Capacitor, registerPlugin } from "@capacitor/core";
import { Settings } from "@/lib/app-settings";
import { IMAMS } from "@/lib/nur-data";
import { PRAYER_KEYS, Timings, toDateToday } from "@/lib/prayer-times";
import { resolveEffectiveReminder, ttsUrl } from "@/lib/reminder-data";
import type { Dict } from "@/lib/locales/en";

export interface NativePlatformStatus {
  isNativeAndroid: boolean;
  alarmManagerAvailable: boolean;
  sdkVersion: number;
  canScheduleExactAlarms: boolean;
  isIgnoringBatteryOptimizations: boolean;
}

export interface ScheduledAlarmInfo {
  eventId: string;
  type: "REMINDER_BEFORE_PRAYER" | "PRAYER_AZAN" | "reminder" | "adhan";
  prayerName: string;
  timestampMs: number;
  mode: string;
  title: string;
  notifText: string;
  message?: string;
  audioText: string;
  audioUrl: string;
  isArabic: boolean;
  vibrate: boolean;
}

export interface PrayerSchedulerPluginInterface {
  getNativePlatformStatus(): Promise<NativePlatformStatus>;
  requestNativePermissions(): Promise<{ canScheduleExactAlarms: boolean }>;
  requestBatteryOptimizationExemption(): Promise<{ requested: boolean }>;
  scheduleReminder(options: {
    eventId: string;
    prayerName: string;
    timestamp: number;
    mode: "notification" | "audio" | "both";
    title: string;
    notifText: string;
    message?: string;
    audioText: string;
    audioUrl?: string;
    isArabic?: boolean;
    vibrate?: boolean;
    notifTemplate?: string;
    customNotifText?: string;
    audioReminder?: string;
    customAudioText?: string;
    reminderMinutes?: number;
  }): Promise<{ success: boolean; eventId: string }>;
  scheduleAdhan(options: {
    eventId: string;
    prayerName: string;
    timestamp: number;
    imamId: string;
    title: string;
    message: string;
    audioUrl: string;
    vibrate?: boolean;
  }): Promise<{ success: boolean; eventId: string }>;
  scheduleTestAlarm(options: {
    delaySeconds: number;
    type: "reminder" | "adhan" | "REMINDER_BEFORE_PRAYER" | "PRAYER_AZAN";
    prayerName: string;
    mode: "notification" | "audio" | "both";
    title: string;
    notifText?: string;
    message?: string;
    audioText?: string;
    audioUrl?: string;
    isArabic?: boolean;
    vibrate?: boolean;
  }): Promise<{ success: boolean; eventId: string; timestampMs: number; delaySeconds: number }>;
  getPendingAlarms(): Promise<{ alarmsJson: string }>;
  cancelAll(): Promise<{ cancelled: boolean }>;
  /** Arme les alarmes natives a partir des horaires et reglages reellement choisis. */
  syncAll(options: {
    times: string;
    notifications: boolean;
    reminder: number;
    mode: string;
    imamId: string;
    origin: string;
    settings: string;
    source?: string;
  }): Promise<{ changed: boolean; armed?: number; skipped?: boolean }>;
  /**
   * Verification des alarmes reellement armees dans Android : instant
   * enregistre, heure locale, heure de priere attendue et decalage reel.
   */
  verifyScheduling(): Promise<{ alarmsJson: string; summaryJson: string }>;
}

export const NativePrayerScheduler =
  registerPlugin<PrayerSchedulerPluginInterface>("PrayerScheduler");

export interface NativeScheduleAlarm {
  eventId: string;
  type: string;
  prayerName: string;
  timestampMs: number;
  localTime: string;
  expectedPrayerTime: string;
  offsetFromPrayerMin: number | null;
  mode: string;
  notifText: string;
  hasVoice: boolean;
  hasAdhan: boolean;
  repeat: boolean;
}

export interface NativeScheduleSummary {
  expectedReminderMinutes?: number;
  expectedMode?: string;
  timezone?: string;
  lastSyncTimes?: string;
  armedCount?: number;
  nowMs?: number;
}

export interface NativeScheduleVerification {
  alarms: NativeScheduleAlarm[];
  summary: NativeScheduleSummary;
}

/**
 * Declenche la verification des alarmes natives : controle ce qui est
 * reellement enregistre dans Android (et non une simulation declenchee a la
 * main). A appeler depuis la WebView (console de debug) :
 *   await Capacitor.Plugins.PrayerScheduler.verifyScheduling()
 */
export async function getNativeScheduleVerification(): Promise<NativeScheduleVerification | null> {
  if (!isNativeAndroidPlatform()) return null;
  try {
    const res = await NativePrayerScheduler.verifyScheduling();
    const alarms = JSON.parse(res.alarmsJson || "[]") as NativeScheduleAlarm[];
    const summary = JSON.parse(res.summaryJson || "{}") as NativeScheduleSummary;
    return { alarms, summary };
  } catch (err) {
    console.warn("[NativePrayerBridge] Verification impossible:", err);
    return null;
  }
}

export type ScheduleIssueKind =
  | "adhan-misplaced"
  | "reminder-offset"
  | "missing-reminder"
  | "unexpected-reminder";

export interface ScheduleIssue {
  eventId: string;
  prayerName: string;
  kind: ScheduleIssueKind;
  detail: string;
}

/**
 * Controle de coherence de la programmation : l'adhan doit etre a l'heure
 * exacte de la priere, le rappel exactement N minutes avant, et il ne doit
 * exister aucun rappel quand l'utilisateur a choisi "aucun rappel".
 * Fonction pure (testable).
 */
export function auditNativeSchedule(
  verification: NativeScheduleVerification | null,
  expectedReminderMinutes: number,
): ScheduleIssue[] {
  const issues: ScheduleIssue[] = [];
  if (!verification) return issues;
  const { alarms, summary } = verification;
  const nowMs = summary.nowMs ?? 0;

  const adhanByPrayer = new Map<string, NativeScheduleAlarm>();
  const remindersByPrayer = new Map<string, NativeScheduleAlarm>();
  for (const alarm of alarms) {
    if (alarm.type === "PRAYER_AZAN") adhanByPrayer.set(alarm.prayerName, alarm);
    else if (alarm.type === "REMINDER_BEFORE_PRAYER") remindersByPrayer.set(alarm.prayerName, alarm);
  }

  for (const [prayer, adhan] of adhanByPrayer) {
    if (adhan.offsetFromPrayerMin !== 0) {
      issues.push({
        eventId: adhan.eventId,
        prayerName: prayer,
        kind: "adhan-misplaced",
        detail: `adhan decale de ${adhan.offsetFromPrayerMin} min par rapport a l'heure de priere`,
      });
    }
  }

  for (const [prayer, reminder] of remindersByPrayer) {
    if (expectedReminderMinutes <= 0) {
      issues.push({
        eventId: reminder.eventId,
        prayerName: prayer,
        kind: "unexpected-reminder",
        detail: "un rappel est programme alors que le delai choisi est 0 (aucun rappel)",
      });
      continue;
    }
    if (reminder.offsetFromPrayerMin !== -expectedReminderMinutes) {
      issues.push({
        eventId: reminder.eventId,
        prayerName: prayer,
        kind: "reminder-offset",
        detail: `rappel decale de ${reminder.offsetFromPrayerMin} min au lieu de -${expectedReminderMinutes} min`,
      });
    }
  }

  if (expectedReminderMinutes > 0) {
    for (const [prayer, adhan] of adhanByPrayer) {
      const expectedReminderAt = adhan.timestampMs - expectedReminderMinutes * 60_000;
      if (expectedReminderAt <= nowMs) continue; // l'instant du rappel est deja passe
      if (!remindersByPrayer.has(prayer)) {
        issues.push({
          eventId: adhan.eventId,
          prayerName: prayer,
          kind: "missing-reminder",
          detail: `aucun rappel programme ${expectedReminderMinutes} min avant ${prayer}`,
        });
      }
    }
  }

  return issues;
}

/** Horaires natifs : toujours en 24 h "HH:MM", quelle que soit la locale. */
export function toNativeTimes(timings: Timings): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of PRAYER_KEYS) {
    const raw = (timings?.[key] ?? "").toString().trim().split(" ")[0];
    const match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) continue;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (Number.isNaN(h) || Number.isNaN(m)) continue;
    out[key] = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return out;
}

export interface NativeSyncPayload {
  times: string;
  notifications: boolean;
  reminder: number;
  mode: "notification" | "audio" | "both";
  imamId: string;
  origin: string;
  settings: string;
  source: "app";
}

/**
 * Construit la charge utile envoyee au plugin natif : horaires en 24 h, mode
 * choisi, message et vocal personnalises, preferences de notification.
 * Fonction pure (testable) : aucune dependance au plugin Capacitor.
 */
export function buildNativeSyncPayload(args: {
  timings: Timings;
  settings: Settings;
  origin?: string;
}): NativeSyncPayload {
  const { settings } = args;
  const times = toNativeTimes(args.timings);
  return {
    times: JSON.stringify(times),
    notifications: settings.notifications !== false,
    reminder: typeof settings.reminder === "number" ? settings.reminder : 0,
    mode: settings.reminderMode || "notification",
    imamId: settings.imamId || "",
    origin: args.origin ?? (typeof window !== "undefined" ? window.location.origin : ""),
    settings: JSON.stringify({
      notifTemplate: settings.notifTemplate ?? "",
      customNotifText: settings.customNotifText ?? "",
      audioReminder: settings.audioReminder ?? "",
      customAudioText: settings.customAudioText ?? "",
      reminderMode: settings.reminderMode ?? "notification",
      reminder: settings.reminder ?? 0,
      notifications: settings.notifications !== false,
      imamId: settings.imamId ?? "",
      vibrateNotifications: settings.vibrateNotifications !== false,
      vibrateAdhan: settings.vibrateAdhan !== false,
    }),
    source: "app",
  };
}

export function isNativeAndroidPlatform(): boolean {
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android"
  );
}

declare global {
  interface Window {
    /** Horodatage de la derniere synchronisation native reussie. */
    __nurNativeSyncedAt?: number;
  }
}

/**
 * Marque la synchronisation native comme faite : le script de secours injecte
 * dans la WebView (WebGuard) ne doit alors plus re-armer les alarmes avec des
 * horaires releves dans le DOM.
 */
export function markNativeSyncDone(): void {
  if (typeof window === "undefined") return;
  window.__nurNativeSyncedAt = Date.now();
}

/**
 * Checks platform status (Exact alarms, battery optimization, Android SDK).
 */
export async function getNativeStatus(): Promise<NativePlatformStatus> {
  if (!isNativeAndroidPlatform()) {
    return {
      isNativeAndroid: false,
      alarmManagerAvailable: false,
      sdkVersion: 0,
      canScheduleExactAlarms: true,
      isIgnoringBatteryOptimizations: true,
    };
  }
  try {
    return await NativePrayerScheduler.getNativePlatformStatus();
  } catch {
    return {
      isNativeAndroid: true,
      alarmManagerAvailable: true,
      sdkVersion: 33,
      canScheduleExactAlarms: true,
      isIgnoringBatteryOptimizations: true,
    };
  }
}

/**
 * Requests exact alarm permissions on Android 12+ (SDK 31+)
 */
export async function requestNativeExactAlarmPermissions(): Promise<boolean> {
  if (!isNativeAndroidPlatform()) return true;
  try {
    const res = await NativePrayerScheduler.requestNativePermissions();
    return res.canScheduleExactAlarms;
  } catch {
    return true;
  }
}

/**
 * Prompts the user to exempt Islam-Noor from battery optimization for 100% reliable background execution.
 */
export async function requestNativeBatteryExemption(): Promise<boolean> {
  if (!isNativeAndroidPlatform()) return true;
  try {
    const res = await NativePrayerScheduler.requestBatteryOptimizationExemption();
    return res.requested;
  } catch {
    return false;
  }
}

/**
 * Synchronizes prayer timings and pre-adhan settings with native Android AlarmManager.
 * When on Web/PWA, returns status indicating fallback to Service Worker / in-app scheduler.
 */
export async function syncNativePrayerAlarms(
  timings: Timings,
  settings: Settings,
  t: Dict,
): Promise<{ nativeScheduledCount: number; isNative: boolean }> {
  const isNative = isNativeAndroidPlatform();

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (!settings.notifications) {
    if (isNative) {
      try {
        // notifications=false : le natif annule les alarmes armees (rappels
        // ET adhan) et memorise l'etat, sans en reprogrammer de nouvelles.
        const payload = buildNativeSyncPayload({ timings, settings, origin });
        await NativePrayerScheduler.syncAll({ ...payload, notifications: false });
      } catch {
        // ignore
      }
    }
    return { nativeScheduledCount: 0, isNative };
  }

  if (!isNative) {
    return { nativeScheduledCount: 0, isNative: false };
  }

  let scheduledCount = 0;

  try {
    // Les anciennes alarmes sont annulees et reprogrammees par syncAll()
    // (armSet -> cancelAll puis re-armement) : pas d'annulation isolee ici,
    // qui laisserait un vide si l'operation suivante echouait.
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const imam = IMAMS.find((i) => i.id === settings.imamId) ?? IMAMS[0];

    for (const key of PRAYER_KEYS) {
      const adhanTime = toDateToday(timings[key], now);
      if (isNaN(adhanTime.getTime())) continue;

      const adhanTimeMs = adhanTime.getTime();

      // A. Pre-Adhan Reminder Exact Alarm
      if (settings.reminder > 0) {
        const reminderTimeMs = adhanTimeMs - settings.reminder * 60_000;

        if (reminderTimeMs > now.getTime()) {
          const remEventId = `rem_${key}_${dateStr}_${settings.reminder}_${settings.reminderMode}`;
          const resolved = resolveEffectiveReminder(settings, key, t);

          const relTtsUrl = ttsUrl(resolved.audioText, resolved.isArabicAudio);
          const fullAudioUrl = relTtsUrl.startsWith("http") ? relTtsUrl : `${origin}${relTtsUrl}`;

          const prayerLabel = (t as Record<string, string>)[key] || key;
          const remTitle = `${t.appName || "Islam-Noor"} — ${t.prayerReminderNotificationTitle || "Rappel de prière"}`;

          await NativePrayerScheduler.scheduleReminder({
            eventId: remEventId,
            prayerName: key,
            timestamp: reminderTimeMs,
            mode: resolved.mode,
            title: remTitle,
            notifText: resolved.notifText,
            message: resolved.notifText,
            audioText: resolved.audioText,
            audioUrl: fullAudioUrl,
            isArabic: resolved.isArabicAudio,
            vibrate: settings.vibrateNotifications,
            notifTemplate: settings.notifTemplate,
            customNotifText: settings.customNotifText,
            audioReminder: settings.audioReminder,
            customAudioText: settings.customAudioText,
            reminderMinutes: settings.reminder,
          });
          scheduledCount++;
        }
      }

      // B. Exact Adhan Alarm
      if (adhanTimeMs > now.getTime()) {
        const adhanEventId = `adhan_${key}_${dateStr}_${settings.imamId}`;
        const prayerLabel = (t as Record<string, string>)[key] || key;
        const adhanTitle = `${t.appName || "Islam-Noor"} — ${t.adhanTitle || "Adhan"} ${prayerLabel}`;
        const adhanMsg = (t.azanPlayingToast || "Playing Azan: {name}").replace(
          "{name}",
          `${prayerLabel} (${imam.name})`,
        );

        await NativePrayerScheduler.scheduleAdhan({
          eventId: adhanEventId,
          prayerName: key,
          timestamp: adhanTimeMs,
          imamId: settings.imamId,
          title: adhanTitle,
          message: adhanMsg,
          audioUrl: imam.audio,
          vibrate: settings.vibrateAdhan,
        });
        scheduledCount++;
      }
    }

    // Armement des alarmes natives a partir des horaires et reglages
    // reellement choisis par l'utilisateur. C'est cette source de verite :
    // elle ne depend ni du scraping du DOM ni du format d'affichage local.
    const payload = buildNativeSyncPayload({ timings, settings, origin });
    await NativePrayerScheduler.syncAll(payload);
    markNativeSyncDone();
  } catch (err) {
    console.warn("[NativePrayerBridge] Failed to sync native alarms:", err);
  }

  return { nativeScheduledCount: scheduledCount, isNative: true };
}

/**
 * Schedules a native test alarm after a given delay (in seconds) to test closed-app and locked-screen triggers.
 */
export async function scheduleNativeTestDelay(options: {
  delaySeconds: number;
  type: "reminder" | "adhan" | "REMINDER_BEFORE_PRAYER" | "PRAYER_AZAN";
  prayerName: string;
  mode: "notification" | "audio" | "both";
  title: string;
  notifText?: string;
  message?: string;
  audioText?: string;
  audioUrl?: string;
  isArabic?: boolean;
  vibrate?: boolean;
}): Promise<{ success: boolean; eventId: string; timestampMs: number }> {
  if (isNativeAndroidPlatform()) {
    try {
      const res = await NativePrayerScheduler.scheduleTestAlarm(options);
      return { success: res.success, eventId: res.eventId, timestampMs: res.timestampMs };
    } catch (err) {
      console.warn("[NativePrayerBridge] Native test alarm error:", err);
    }
  }

  // Fallback for Web/PWA
  const targetMs = Date.now() + options.delaySeconds * 1000;
  return {
    success: true,
    eventId: `web_test_${Date.now()}`,
    timestampMs: targetMs,
  };
}

/**
 * Fetches and parses the list of pending Android AlarmManager alarms.
 */
export async function getParsedScheduledAlarms(): Promise<ScheduledAlarmInfo[]> {
  if (!isNativeAndroidPlatform()) return [];
  try {
    const res = await NativePrayerScheduler.getPendingAlarms();
    if (!res?.alarmsJson) return [];
    const list = JSON.parse(res.alarmsJson);
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => (a.timestampMs || 0) - (b.timestampMs || 0));
  } catch (err) {
    console.warn("[NativePrayerBridge] Error fetching pending alarms:", err);
    return [];
  }
}
