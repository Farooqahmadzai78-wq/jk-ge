package com.islamnoor.app

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray
import org.json.JSONObject
import java.util.TimeZone

@CapacitorPlugin(name = "PrayerScheduler")
class PrayerSchedulerPlugin : Plugin() {

    private val TAG = "PrayerSched"

    private fun meta() = Store.meta(context)

    /** Valeur de reglage : JSON de synchronisation en priorite, capture en repli. */
    private fun setting(st: JSONObject, key: String, prefKey: String): String {
        val v = st.optString(key, "")
        if (v.isNotEmpty()) return v
        return meta().getString(prefKey, "") ?: ""
    }

    // ---------------- statut ----------------

    @PluginMethod
    fun getNativePlatformStatus(call: PluginCall) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
            am.canScheduleExactAlarms() else true
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        call.resolve(JSObject().apply {
            put("isNativeAndroid", true)
            put("alarmManagerAvailable", true)
            put("sdkVersion", Build.VERSION.SDK_INT)
            put("canScheduleExactAlarms", canExact)
            put("isIgnoringBatteryOptimizations",
                pm.isIgnoringBatteryOptimizations(context.packageName))
        })
    }

    @PluginMethod
    fun requestNativePermissions(call: PluginCall) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        var ok = true
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!am.canScheduleExactAlarms()) {
                try { activity.startActivity(
                    Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)) } catch (_: Exception) {}
            }
            ok = am.canScheduleExactAlarms()
        }
        call.resolve(JSObject().put("canScheduleExactAlarms", ok))
    }

    @PluginMethod
    fun requestBatteryOptimizationExemption(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val i = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                i.data = Uri.parse("package:" + context.packageName)
                activity.startActivity(i)
            } catch (_: Exception) {}
        }
        call.resolve(JSObject().put("requested", true))
    }

    // ---------------- CAPTURE de ce que le site envoie ----------------

    @PluginMethod
    fun scheduleAdhan(call: PluginCall) {
        val imamId = call.getString("imamId") ?: ""
        val url = call.getString("audioUrl") ?: ""
        val prayer = call.getString("prayerName") ?: ""
        val msg = call.getString("message") ?: ""

        val e = meta().edit()
        if (url.startsWith("http")) {
            if (imamId.isNotEmpty()) e.putString("imam_" + imamId, url)
            e.putString("lastAdhanUrl", url)
        }
        if (imamId.isNotEmpty()) e.putString("lastImamId", imamId)
        if (msg.isNotEmpty()) e.putString("adhanTpl", Store.tpl(msg, prayer))
        e.putBoolean("vibA", call.getBoolean("vibrate", true) ?: true)
        e.apply()

        Log.i(TAG, "CAPTURE adhan imam=" + imamId + " url=" + url.takeLast(30))
        call.resolve(JSObject().put("success", true)
            .put("eventId", call.getString("eventId") ?: ""))
    }

    @PluginMethod
    fun scheduleReminder(call: PluginCall) {
        val prayer = call.getString("prayerName") ?: ""
        val notif = call.getString("notifText") ?: ""
        val aTxt = call.getString("audioText") ?: ""
        val aUrl = call.getString("audioUrl") ?: ""

        val e = meta().edit()
        if (notif.isNotEmpty()) e.putString("remTpl", Store.tpl(notif, prayer))
        if (aTxt.isNotEmpty()) e.putString("remAudioText", aTxt)
        if (aUrl.startsWith("http")) {
            e.putString("remAudioUrl", aUrl)
            if (aUrl.contains("text="))
                e.putString("ttsBase", aUrl.substringBefore("text=") + "text=")
        }
        e.putString("remMode", call.getString("mode") ?: "notification")
        e.putBoolean("vibN", call.getBoolean("vibrate", true) ?: true)
        // Choix de l'interface : conserves pour pouvoir resoudre le message et
        // le vocal meme si la synchronisation recoit des reglages partiels.
        e.putString("remNotifTplId", call.getString("notifTemplate") ?: "")
        e.putString("remCustomMsg", call.getString("customNotifText") ?: "")
        e.putString("remAudioId", call.getString("audioReminder") ?: "")
        e.putString("remCustomVoice", call.getString("customAudioText") ?: "")
        e.putInt("remMinutes", call.getInt("reminderMinutes") ?: 30)
        e.putString("capSig", meta().getString("curSig", "") ?: "")
        e.apply()

        Log.i(TAG, "CAPTURE rappel texte=\"" + notif + "\"")
        call.resolve(JSObject().put("success", true)
            .put("eventId", call.getString("eventId") ?: ""))
    }

    @PluginMethod
    fun cancelAll(call: PluginCall) {
        // Annulation reelle : sans cela, desactiver les notifications dans
        // l'interface laissait les alarmes armees (l'adhan continuait de
        // sonner). syncAll() annule lui aussi tout avant de reprogrammer.
        val n = AlarmStore.cancelAll(context)
        meta().edit().remove("armedSig").apply()
        Log.i(TAG, "cancelAll -> " + n + " alarmes annulees")
        call.resolve(JSObject().put("cancelled", true).put("count", n))
    }

    // ---------------- diagnostic ----------------

    @PluginMethod
    fun dumpSettings(call: PluginCall) {
        Log.i("NurSettings", call.getString("settings") ?: "{}")
        call.resolve(JSObject().put("ok", true))
    }

    // ---------------- coeur ----------------

    @PluginMethod
    fun syncAll(call: PluginCall) {
        val timesJson = call.getString("times") ?: return call.reject("times required")
        val notifications = call.getBoolean("notifications", true) ?: true
        val reminder = call.getInt("reminder") ?: 0
        val mode = call.getString("mode") ?: ReminderPlan.MODE_NOTIFICATION
        val imamId = call.getString("imamId") ?: ""
        val origin = call.getString("origin") ?: ""
        val source = call.getString("source") ?: "app"
        val st = try { JSONObject(call.getString("settings") ?: "{}") }
                 catch (_: Exception) { JSONObject() }

        // Repli de secours (script injecte dans la WebView) : on ne touche
        // jamais aux alarmes deja armees par l'application, sinon le scraping
        // du DOM ecraserait les horaires et reglages choisis par l'utilisateur.
        if (source == "fallback" && AlarmStore.count(context) > 0) {
            call.resolve(JSObject().put("changed", false).put("skipped", true)); return
        }

        val remSig = listOf(mode, reminder.toString(),
            st.optString("notifTemplate"), st.optString("customNotifText"),
            st.optString("audioReminder"), st.optString("customAudioText")
        ).joinToString("~")

        // Heures de priere recues de l'application (format 24 h).
        val t = JSONObject(timesJson)
        val timesMap = LinkedHashMap<String, String>()
        for (n in AlarmSchedule.PRAYERS) {
            val v = t.optString(n, "")
            if (v.isNotEmpty()) timesMap[n] = v
        }
        val now = System.currentTimeMillis()
        val zone = TimeZone.getDefault()

        // La signature inclut la date locale et le fuseau horaire : un changement
        // de jour ou de fuseau force une reprogrammation complete des alarmes
        // (sinon les alarmes resteraient a l'heure de la veille).
        val sig = AlarmSchedule.signatureKey(
            timesMap, reminder, mode, imamId, notifications, now, zone) +
            "|" + remSig
        meta().edit().putString("curSig", remSig)
            .putString("lastTimes", timesJson)
            .putInt("lastReminder", reminder)
            .putString("lastMode", mode)
            .putString("lastZone", zone.id)
            .apply()

        if (meta().getString("armedSig", "") == sig && AlarmStore.count(context) > 0) {
            call.resolve(JSObject().put("changed", false)); return
        }

        if (!notifications) {
            AlarmStore.cancelAll(context)
            meta().edit().putString("armedSig", sig).apply()
            Log.i(TAG, "notifications OFF -> tout annule")
            call.resolve(JSObject().put("changed", true).put("armed", 0)); return
        }

        val adhanUrl = Store.adhanUrl(context, imamId)

        // Reglages de l'interface : message et vocal personnalises.
        // Les valeurs capturees par l'application web servent de repli quand
        // la synchronisation ne fournit pas les reglages complets.
        val customMsgSelected = ReminderPlan.isCustomSelection(
            setting(st, "notifTemplate", "remNotifTplId"))
        val customVoiceSelected = ReminderPlan.isCustomSelection(
            setting(st, "audioReminder", "remAudioId"))
        val customMsg = setting(st, "customNotifText", "remCustomMsg")
        val customVoice = setting(st, "customAudioText", "remCustomVoice")
        val capturedMsg = meta().getString("remTpl", "") ?: ""
        val capturedVoice = meta().getString("remAudioUrl", "") ?: ""
        val ttsBase = meta().getString("ttsBase", "") ?: ""

        val vibA = meta().getBoolean("vibA", true)
        val vibN = meta().getBoolean("vibN", true)

        val list = ArrayList<JSONObject>()

        // Calcul des instants : adhan a l'heure exacte de la priere, rappel a
        // l'heure de la priere moins le delai choisi, aucun rappel si le
        // delai est 0 ou si l'instant du rappel est deja passe.
        val slots = AlarmSchedule.slots(timesMap, reminder, now, zone)

        for (slot in slots) {
            val n = slot.prayer
            val ts = slot.adhanAtMs

            // ---- ADHAN : comportement actuel conserve (notification + adhan) ----
            val a = JSONObject()
            a.put("eventId", "adhan_" + n)
            a.put("timestampMs", ts)
            a.put("type", "PRAYER_AZAN")
            a.put("prayerName", n)
            a.put("mode", ReminderPlan.MODE_BOTH)
            a.put("title", "Islam-Noor — Adhan " + n)
            a.put("notifText", Store.adhanText(context, n))
            a.put("audioUrl", adhanUrl)
            a.put("voiceUrl", "")
            a.put("vibrate", vibA)
            a.put("repeat", true)
            list.add(a)

            // ---- RAPPEL AVANT PRIERE : mode, message et vocal de l'utilisateur ----
            val rts = slot.reminderAtMs
            if (rts != null) {
                run {
                    val remText = ReminderPlan.resolveMessage(
                        customMsgSelected, customMsg, capturedMsg, n, reminder)
                    val voiceUrl = if (ReminderPlan.wantsVoice(mode))
                        ReminderPlan.resolveVoiceUrl(
                            customVoiceSelected, customVoice, capturedVoice, ttsBase, origin)
                    else ""

                    val r = JSONObject()
                    r.put("eventId", "rem_" + n)
                    r.put("timestampMs", rts)
                    r.put("type", "REMINDER_BEFORE_PRAYER")
                    r.put("prayerName", n)
                    r.put("mode", mode)
                    r.put("title", "Islam-Noor — Rappel de prière")
                    r.put("notifText", remText)
                    r.put("audioUrl", "")
                    r.put("voiceUrl", voiceUrl)
                    r.put("vibrate", vibN)
                    r.put("repeat", true)
                    list.add(r)
                }
            }
        }

        val armed = AlarmStore.armSet(context, list)
        meta().edit().putString("armedSig", sig).apply()
        val remSample = list.firstOrNull { it.optString("eventId").startsWith("rem_") }
        Log.i(TAG, "syncAll -> " + armed + " alarmes | imam=" + imamId +
            " mode=" + mode + " rappel=" + reminder + " src=" + source)
        Log.i(TAG, "  message rappel : " + (remSample?.optString("notifText") ?: ""))
        Log.i(TAG, "  vocal rappel   : " + (remSample?.optString("voiceUrl") ?: ""))
        Log.i(TAG, "  audio adhan    : " + adhanUrl.takeLast(40))
        call.resolve(JSObject().put("changed", true).put("armed", armed))
    }

    // ---------------- tests ----------------

    @PluginMethod
    fun scheduleTestAlarm(call: PluginCall) {
        val delay = call.getInt("delaySeconds") ?: 10
        val type = call.getString("type") ?: "adhan"
        val kind = if (type == "adhan" || type == "PRAYER_AZAN") "adhan" else "rappel"
        val ok = AlarmStore.schedule(context, TestBuilder.build(context, kind, delay))
        call.resolve(JSObject().put("success", ok).put("delaySeconds", delay))
    }

    @PluginMethod
    fun testNow(call: PluginCall) {
        val o = TestBuilder.build(context, "rappel", 0)
        val i = Intent(context, PrayerAlarmReceiver::class.java)
        i.putExtra("type", o.optString("type"))
        i.putExtra("eventId", "test_now")
        i.putExtra("mode", o.optString("mode"))
        i.putExtra("title", o.optString("title"))
        i.putExtra("notifText", o.optString("notifText"))
        i.putExtra("audioUrl", o.optString("audioUrl"))
        i.putExtra("voiceUrl", o.optString("voiceUrl"))
        i.putExtra("vibrate", true)
        context.sendBroadcast(i)
        call.resolve(JSObject().put("sent", true))
    }

    /**
     * Verification des alarmes reellement armees dans Android : pour chaque
     * alarme, l'instant enregistre, l'heure locale, l'heure de priere attendue
     * et le decalage reel (en minutes) par rapport a cette heure de priere.
     * Permet de controler la programmation sans modifier l'heure du telephone.
     */
    @PluginMethod
    fun verifyScheduling(call: PluginCall) {
        val arr = JSONArray()
        val zone = TimeZone.getDefault()
        val fmt = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss z", java.util.Locale.US)
        fmt.timeZone = zone
        val lastTimes = meta().getString("lastTimes", "") ?: ""
        val t = try { JSONObject(lastTimes) } catch (_: Exception) { JSONObject() }
        val expectedReminder = meta().getInt("lastReminder", 0)
        val expectedMode = meta().getString("lastMode", "") ?: ""

        AlarmStore.prefs(context).all.forEach { (eventId, v) ->
            if (v !is String) return@forEach
            val o = try { JSONObject(v) } catch (_: Exception) { return@forEach }
            val ts = o.optLong("timestampMs")
            val prayer = o.optString("prayerName")
            val expected = t.optString(prayer, "")
            val expectedMs = if (expected.isNotEmpty())
                AlarmSchedule.prayerTimeMs(expected, ts, zone) else null
            val offsetMin = expectedMs?.let { (ts - it) / 60000L }

            val item = JSONObject()
            item.put("eventId", eventId)
            item.put("type", o.optString("type"))
            item.put("prayerName", prayer)
            item.put("timestampMs", ts)
            item.put("localTime", fmt.format(java.util.Date(ts)))
            item.put("expectedPrayerTime", expected)
            item.put("offsetFromPrayerMin", offsetMin ?: JSONObject.NULL)
            item.put("mode", o.optString("mode"))
            item.put("notifText", o.optString("notifText"))
            item.put("hasVoice", o.optString("voiceUrl").isNotEmpty())
            item.put("hasAdhan", o.optString("audioUrl").isNotEmpty())
            item.put("repeat", o.optBoolean("repeat", true))
            arr.put(item)
        }

        val summary = JSONObject()
        summary.put("expectedReminderMinutes", expectedReminder)
        summary.put("expectedMode", expectedMode)
        summary.put("timezone", zone.id)
        summary.put("lastSyncTimes", lastTimes)
        summary.put("armedCount", arr.length())
        summary.put("nowMs", System.currentTimeMillis())

        Log.i(TAG, "verifyScheduling -> " + arr.length() + " alarmes | zone=" + zone.id +
            " | rappel=" + expectedReminder + " min")
        call.resolve(JSObject().put("alarmsJson", arr.toString())
            .put("summaryJson", summary.toString()))
    }

    @PluginMethod
    fun getPendingAlarms(call: PluginCall) {
        val arr = JSONArray()
        AlarmStore.prefs(context).all.forEach { (_, v) ->
            if (v is String) { try { arr.put(JSONObject(v)) } catch (_: Exception) {} }
        }
        call.resolve(JSObject().put("alarmsJson", arr.toString()))
    }
}

// =================== resolution centralisee ===================

object Store {

    fun meta(ctx: Context) = ctx.getSharedPreferences("prayer_meta", Context.MODE_PRIVATE)

    fun tpl(text: String, prayer: String): String =
        if (prayer.isNotEmpty() && text.contains(prayer)) text.replace(prayer, "{P}") else text

    fun adhanUrl(ctx: Context, imamId: String): String {
        val m = meta(ctx)
        val exact = m.getString("imam_" + imamId, "") ?: ""
        if (exact.startsWith("http")) return exact
        val last = m.getString("lastAdhanUrl", "") ?: ""
        if (last.startsWith("http")) return last
        return "https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Ali_Ibn_Ahmad_Mala_HQ.mp3"
    }

    fun adhanText(ctx: Context, prayer: String): String {
        val t = meta(ctx).getString("adhanTpl", "") ?: ""
        return if (t.isNotEmpty()) t.replace("{P}", prayer)
               else "La pri\u00e8re de " + prayer + " commence."
    }

}

object TestBuilder {
    /**
     * Construit une alarme de test qui reproduit fidelement les reglages de
     * l'utilisateur : message personnalise, vocal personnalise, mode choisi.
     */
    fun build(ctx: Context, kind: String, delay: Int): JSONObject {
        val adhan = kind == "adhan"
        val m = Store.meta(ctx)
        val mode = if (adhan) ReminderPlan.MODE_BOTH
                   else (m.getString("remMode", ReminderPlan.MODE_NOTIFICATION)
                         ?: ReminderPlan.MODE_NOTIFICATION)
        val minutes = m.getInt("remMinutes", 30)

        val customMsgSelected = ReminderPlan.isCustomSelection(
            m.getString("remNotifTplId", "") ?: "")
        val customVoiceSelected = ReminderPlan.isCustomSelection(
            m.getString("remAudioId", "") ?: "")
        val customMsg = m.getString("remCustomMsg", "") ?: ""
        val customVoice = m.getString("remCustomVoice", "") ?: ""
        val capturedMsg = m.getString("remTpl", "") ?: ""
        val capturedVoice = m.getString("remAudioUrl", "") ?: ""
        val ttsBase = m.getString("ttsBase", "") ?: ""

        val o = JSONObject()
        o.put("eventId", "realtest_" + kind)
        o.put("timestampMs", System.currentTimeMillis() + delay * 1000L)
        o.put("type", if (adhan) "PRAYER_AZAN" else "REMINDER_BEFORE_PRAYER")
        o.put("prayerName", "Fajr")
        o.put("mode", mode)
        o.put("title", if (adhan) "Islam-Noor \u2014 Adhan Fajr"
                       else "Islam-Noor \u2014 Rappel de pri\u00e8re")
        o.put("notifText", if (adhan) Store.adhanText(ctx, "Fajr")
            else ReminderPlan.resolveMessage(
                customMsgSelected, customMsg, capturedMsg, "Fajr", minutes))
        // Le vocal est lu en premier, l'adhan ensuite : jamais simultanement.
        o.put("voiceUrl", if (!adhan && ReminderPlan.wantsVoice(mode))
            ReminderPlan.resolveVoiceUrl(
                customVoiceSelected, customVoice, capturedVoice, ttsBase, "")
            else "")
        o.put("audioUrl", if (adhan) Store.adhanUrl(ctx, m.getString("lastImamId", "") ?: "")
                          else "")
        o.put("vibrate", true)
        o.put("repeat", false)
        return o
    }
}
