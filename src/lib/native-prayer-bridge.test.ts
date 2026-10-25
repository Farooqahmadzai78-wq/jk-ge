import { describe, expect, it } from "vitest";
import {
  auditNativeSchedule,
  buildNativeSyncPayload,
  toNativeTimes,
  type NativeScheduleAlarm,
  type NativeScheduleVerification,
} from "@/lib/native-prayer-bridge";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/app-settings";
import type { Timings } from "@/lib/prayer-times";

/**
 * Tests de la charge utile envoyee au plugin natif Android.
 *
 * C'est cette charge utile quidetermine :
 *  - les horaires reellement armes (toujours en 24 h) ;
 *  - le mode choisi par l'utilisateur (message / vocal / combine) ;
 *  - le message et le vocal personnalises ;
 *  - l'etat de la preference "notifications".
 */

const TIMES: Timings = {
  Fajr: "05:12",
  Sunrise: "06:30",
  Dhuhr: "12:45",
  Asr: "15:58",
  Maghrib: "19:03",
  Isha: "20:17",
} as Timings;

function settingsWith(patch: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...patch } as Settings;
}

describe("toNativeTimes", () => {
  it("normalise les horaires en 24 h HH:MM", () => {
    const out = toNativeTimes(TIMES);
    expect(out.Fajr).toBe("05:12");
    expect(out.Dhuhr).toBe("12:45");
    expect(out.Isha).toBe("20:17");
  });

  it("complete les heures sur un chiffre", () => {
    const out = toNativeTimes({ ...TIMES, Asr: "5:08" } as Timings);
    expect(out.Asr).toBe("05:08");
  });

  it("ignore les horaires illisibles", () => {
    const out = toNativeTimes({ ...TIMES, Fajr: "--:--", Asr: "" } as Timings);
    expect(out.Fajr).toBeUndefined();
    expect(out.Asr).toBeUndefined();
    expect(out.Dhuhr).toBe("12:45");
  });
});

describe("buildNativeSyncPayload", () => {
  it("transmet le mode choisi par l'utilisateur", () => {
    for (const mode of ["notification", "audio", "both"] as const) {
      const payload = buildNativeSyncPayload({
        timings: TIMES,
        settings: settingsWith({ reminderMode: mode }),
        origin: "https://localhost",
      });
      expect(payload.mode).toBe(mode);
    }
  });

  it("transmet le message et le vocal personnalises", () => {
    const payload = buildNativeSyncPayload({
      timings: TIMES,
      settings: settingsWith({
        notifTemplate: "custom",
        customNotifText: "Mon message",
        audioReminder: "custom",
        customAudioText: "Mon vocal",
        reminderMode: "both",
      }),
      origin: "https://localhost",
    });
    const settings = JSON.parse(payload.settings);
    expect(settings.notifTemplate).toBe("custom");
    expect(settings.customNotifText).toBe("Mon message");
    expect(settings.audioReminder).toBe("custom");
    expect(settings.customAudioText).toBe("Mon vocal");
    expect(settings.reminderMode).toBe("both");
  });

  it("transmet les horaires en 24 h dans le JSON attendu par le natif", () => {
    const payload = buildNativeSyncPayload({
      timings: TIMES,
      settings: settingsWith({}),
      origin: "https://localhost",
    });
    const times = JSON.parse(payload.times);
    expect(times).toEqual({
      Fajr: "05:12",
      Dhuhr: "12:45",
      Asr: "15:58",
      Maghrib: "19:03",
      Isha: "20:17",
    });
  });

  it("reflete l'activation des notifications et le delai de rappel", () => {
    const off = buildNativeSyncPayload({
      timings: TIMES,
      settings: settingsWith({ notifications: false, reminder: 0 }),
      origin: "https://localhost",
    });
    expect(off.notifications).toBe(false);
    expect(off.reminder).toBe(0);

    const on = buildNativeSyncPayload({
      timings: TIMES,
      settings: settingsWith({ notifications: true, reminder: 15 }),
      origin: "https://localhost",
    });
    expect(on.notifications).toBe(true);
    expect(on.reminder).toBe(15);
  });

  it("transmet l'imam et marque la source comme l'application", () => {
    const payload = buildNativeSyncPayload({
      timings: TIMES,
      settings: settingsWith({ imamId: "abdul_basit" }),
      origin: "https://localhost",
    });
    expect(payload.imamId).toBe("abdul_basit");
    expect(payload.source).toBe("app");
    expect(payload.origin).toBe("https://localhost");
  });

  it("utilise le mode par defaut quand l'utilisateur n'a rien choisi", () => {
    const payload = buildNativeSyncPayload({
      timings: TIMES,
      settings: settingsWith({ reminderMode: "" as Settings["reminderMode"] }),
      origin: "https://localhost",
    });
    expect(payload.mode).toBe("notification");
  });
});

/**
 * Controle de coherence de la programmation reelle (alarmes enregistrees dans
 * Android) : l'adhan doit etre a l'heure de la priere, le rappel exactement N
 * minutes avant, et aucun rappel ne doit subsister quand le delai est 0.
 */
function alarm(partial: Partial<NativeScheduleAlarm>): NativeScheduleAlarm {
  return {
    eventId: partial.eventId ?? "evt",
    type: partial.type ?? "PRAYER_AZAN",
    prayerName: partial.prayerName ?? "Fajr",
    timestampMs: partial.timestampMs ?? 0,
    localTime: partial.localTime ?? "",
    expectedPrayerTime: partial.expectedPrayerTime ?? "",
    offsetFromPrayerMin: partial.offsetFromPrayerMin ?? 0,
    mode: partial.mode ?? "both",
    notifText: partial.notifText ?? "",
    hasVoice: partial.hasVoice ?? false,
    hasAdhan: partial.hasAdhan ?? true,
    repeat: partial.repeat ?? true,
  };
}

function verification(alarms: NativeScheduleAlarm[], nowMs: number): NativeScheduleVerification {
  return { alarms, summary: { nowMs, armedCount: alarms.length } };
}

describe("auditNativeSchedule", () => {
  const now = 1_710_376_800_000;

  it("valide une programmation correcte avec rappel a 15 minutes", () => {
    const adhanAt = now + 6 * 3_600_000; // priere dans 6 h
    const v = verification(
      [
        alarm({ eventId: "adhan_Fajr", type: "PRAYER_AZAN", prayerName: "Fajr", timestampMs: adhanAt, offsetFromPrayerMin: 0 }),
        alarm({
          eventId: "rem_Fajr",
          type: "REMINDER_BEFORE_PRAYER",
          prayerName: "Fajr",
          timestampMs: adhanAt - 15 * 60_000,
          offsetFromPrayerMin: -15,
        }),
      ],
      now,
    );
    expect(auditNativeSchedule(v, 15)).toEqual([]);
  });

  it("signale un adhan programme au mauvais moment", () => {
    const v = verification(
      [alarm({ eventId: "adhan_Fajr", timestampMs: now + 3_600_000, offsetFromPrayerMin: 7 })],
      now,
    );
    const issues = auditNativeSchedule(v, 15);
    expect(issues.some((i) => i.kind === "adhan-misplaced")).toBe(true);
  });

  it("signale un rappel programme au mauvais decalage", () => {
    const adhanAt = now + 6 * 3_600_000;
    const v = verification(
      [
        alarm({ eventId: "adhan_Fajr", timestampMs: adhanAt, offsetFromPrayerMin: 0 }),
        alarm({
          eventId: "rem_Fajr",
          type: "REMINDER_BEFORE_PRAYER",
          timestampMs: adhanAt - 5 * 60_000,
          offsetFromPrayerMin: -5,
        }),
      ],
      now,
    );
    const issues = auditNativeSchedule(v, 15);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe("reminder-offset");
  });

  it("signale un rappel manquant alors que le delai est de 15 minutes", () => {
    const adhanAt = now + 6 * 3_600_000;
    const v = verification(
      [alarm({ eventId: "adhan_Fajr", timestampMs: adhanAt, offsetFromPrayerMin: 0 })],
      now,
    );
    const issues = auditNativeSchedule(v, 15);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe("missing-reminder");
  });

  it("ne reclame pas de rappel dont l'instant est deja passe", () => {
    // L'adhan est dans 2 minutes : le rappel 15 min avant est deja passe.
    const adhanAt = now + 2 * 60_000;
    const v = verification(
      [alarm({ eventId: "adhan_Fajr", timestampMs: adhanAt, offsetFromPrayerMin: 0 })],
      now,
    );
    expect(auditNativeSchedule(v, 15)).toEqual([]);
  });

  it("signale un rappel residuel quand le delai choisi est 0", () => {
    const adhanAt = now + 6 * 3_600_000;
    const v = verification(
      [
        alarm({ eventId: "adhan_Fajr", timestampMs: adhanAt, offsetFromPrayerMin: 0 }),
        alarm({
          eventId: "rem_Fajr",
          type: "REMINDER_BEFORE_PRAYER",
          timestampMs: adhanAt - 15 * 60_000,
          offsetFromPrayerMin: -15,
        }),
      ],
      now,
    );
    const issues = auditNativeSchedule(v, 0);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe("unexpected-reminder");
  });

  it("ne renvoie rien si aucune verification n'est disponible", () => {
    expect(auditNativeSchedule(null, 15)).toEqual([]);
  });
});
