package com.islamnoor.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONObject
import java.util.TimeZone

object AlarmStore {

    private const val PREFS = "prayer_alarms"
    private const val DAY_MS = 86400000L
    private const val TAG = "AlarmStore"

    fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun am(ctx: Context) =
        ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    fun buildIntent(ctx: Context, o: JSONObject): Intent {
        val i = Intent(ctx, PrayerAlarmReceiver::class.java)
        i.action = "com.islamnoor.app.ALARM." + o.optString("eventId")
        i.addFlags(Intent.FLAG_INCLUDE_STOPPED_PACKAGES or Intent.FLAG_RECEIVER_FOREGROUND)
        i.putExtra("eventId", o.optString("eventId"))
        i.putExtra("type", o.optString("type"))
        i.putExtra("prayerName", o.optString("prayerName"))
        i.putExtra("mode", o.optString("mode"))
        i.putExtra("title", o.optString("title"))
        i.putExtra("notifText", o.optString("notifText"))
        i.putExtra("message", o.optString("notifText"))
        i.putExtra("audioUrl", o.optString("audioUrl"))
        i.putExtra("voiceUrl", o.optString("voiceUrl"))
        i.putExtra("vibrate", o.optBoolean("vibrate", true))
        return i
    }

    private fun cancelOne(ctx: Context, o: JSONObject) {
        try {
            val pi = PendingIntent.getBroadcast(
                ctx, o.optString("eventId").hashCode(), buildIntent(ctx, o),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            am(ctx).cancel(pi)
            pi.cancel()
        } catch (_: Exception) {}
    }

    fun schedule(ctx: Context, o: JSONObject): Boolean {
        val eventId = o.optString("eventId")
        if (eventId.isEmpty()) return false
        var ts = o.optLong("timestampMs")
        if (ts <= 0L) return false

        val repeat = o.optBoolean("repeat", true)
        val now = System.currentTimeMillis()
        if (ts <= now + 1000L) {
            if (!repeat) { prefs(ctx).edit().remove(eventId).apply(); return false }
            while (ts <= now + 1000L) ts += DAY_MS
        }
        o.put("timestampMs", ts)

        val pi = PendingIntent.getBroadcast(
            ctx, eventId.hashCode(), buildIntent(ctx, o),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        try {
            val alarm = am(ctx)
            val exact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
                alarm.canScheduleExactAlarms() else true
            if (exact) {
                val show = PendingIntent.getActivity(
                    ctx, 9000,
                    Intent(ctx, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                alarm.setAlarmClock(AlarmManager.AlarmClockInfo(ts, show), pi)
            } else {
                alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, ts, pi)
            }
        } catch (e: Exception) {
            Log.w(TAG, "schedule err: " + e); return false
        }
        prefs(ctx).edit().putString(eventId, o.toString()).apply()
        Log.i(TAG, "arme " + eventId + " @ " + ts)
        return true
    }

    fun armSet(ctx: Context, items: List<JSONObject>): Int {
        cancelAll(ctx)
        var n = 0
        for (o in items) if (schedule(ctx, o)) n++
        Log.i(TAG, "armSet -> " + n + " alarmes")
        return n
    }

    fun rescheduleNextDay(ctx: Context, eventId: String) {
        val raw = prefs(ctx).getString(eventId, null) ?: return
        try {
            val o = JSONObject(raw)
            if (!o.optBoolean("repeat", true)) {
                prefs(ctx).edit().remove(eventId).apply(); return
            }
            o.put("timestampMs", o.optLong("timestampMs") + DAY_MS)
            schedule(ctx, o)
        } catch (e: Exception) { Log.w(TAG, "reschedule err: " + e) }
    }

    fun restoreAll(ctx: Context): Int {
        var n = 0
        HashMap(prefs(ctx).all).forEach { (_, v) ->
            if (v is String) { try { if (schedule(ctx, JSONObject(v))) n++ } catch (_: Exception) {} }
        }
        Log.i(TAG, "restore " + n + " alarmes")
        return n
    }

    /**
     * Recalcule les instants de toutes les alarmes armees a partir des heures
     * de priere et du delai de rappel, dans le fuseau horaire courant.
     * Utilise lors d'un changement de fuseau horaire ou de l'heure systeme :
     * les instants stockes sont absolus et ne correspondraient plus a la
     * nouvelle heure locale.
     *
     * @return nombre d'alarmes reprogrammees
     */
    fun recomputeAll(
        ctx: Context,
        times: Map<String, String>,
        reminderMinutes: Int,
        nowMs: Long,
        zone: TimeZone,
    ): Int {
        val slots = AlarmSchedule.slots(times, reminderMinutes, nowMs, zone)
        val byPrayer = slots.associateBy { it.prayer }
        var n = 0
        HashMap(prefs(ctx).all).forEach { (_, v) ->
            if (v !is String) return@forEach
            try {
                val o = JSONObject(v)
                val slot = byPrayer[o.optString("prayerName")] ?: return@forEach
                val isAdhan = o.optString("type") == "PRAYER_AZAN"
                val newTs = if (isAdhan) slot.adhanAtMs else (slot.reminderAtMs ?: return@forEach)
                o.put("timestampMs", newTs)
                if (schedule(ctx, o)) n++
            } catch (_: Exception) {}
        }
        Log.i(TAG, "recompute " + n + " alarmes (rappel=" + reminderMinutes + " min, zone=" + zone.id + ")")
        return n
    }

    fun cancelAll(ctx: Context) {
        HashMap(prefs(ctx).all).forEach { (k, v) ->
            try {
                val o = if (v is String) JSONObject(v) else JSONObject().put("eventId", k)
                cancelOne(ctx, o)
            } catch (_: Exception) {}
        }
        prefs(ctx).edit().clear().apply()
    }

    fun count(ctx: Context): Int = prefs(ctx).all.size
}
