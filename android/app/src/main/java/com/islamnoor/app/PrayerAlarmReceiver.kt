package com.islamnoor.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

class PrayerAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val type = intent.getStringExtra("type") ?: "PRAYER_AZAN"
        val eventId = intent.getStringExtra("eventId") ?: "evt"
        val mode = intent.getStringExtra("mode") ?: ReminderPlan.MODE_BOTH
        val audioUrl = intent.getStringExtra("audioUrl") ?: ""
        val voiceUrl = intent.getStringExtra("voiceUrl") ?: ""
        val vibrate = intent.getBooleanExtra("vibrate", true)

        val isAdhan = type == "PRAYER_AZAN" || type == "adhan"

        val title = intent.getStringExtra("title")?.takeIf { it.isNotBlank() }
            ?: if (isAdhan) "Islam-Noor - Adhan" else "Islam-Noor - Rappel"

        val text = intent.getStringExtra("notifText")?.takeIf { it.isNotBlank() }
            ?: intent.getStringExtra("message")?.takeIf { it.isNotBlank() }
            ?: if (isAdhan) "La priere commence" else "L'heure de la priere approche"

        Log.i("PrayerAlarm", "fire type=" + type + " mode=" + mode + " id=" + eventId +
            " voice=" + voiceUrl.isNotEmpty() + " adhan=" + audioUrl.isNotEmpty())

        NotificationHelper.ensureChannels(context)

        // Le vocal de l'utilisateur est lu en premier, l'adhan ensuite.
        // L'un des deux seulement : jamais de lecture simultanee.
        val wantVoice = voiceUrl.isNotEmpty() && !isAdhan &&
            ReminderPlan.wantsVoice(mode)
        val wantAdhan = ReminderPlan.wantsAdhan(isAdhan, mode, audioUrl.isNotEmpty())

        // Le message personnalise est publie PAR LE RECEPTEUR, avec son propre
        // identifiant : il reste donc visible dans la barre de notifications
        // meme en mode "notification + audio", et il n'est jamais remplace par
        // la notification du service audio (identifiant distinct FG_ID).
        // En mode "message" seul, c'est cette meme notification qui est affichee.
        // En mode "notification + audio", on marque la notification comme
        // persistante (ongoing) pour qu'elle reste visible pendant la lecture
        // du vocal et ne soit pas eclipsée par la notification de premier plan.
        val channel = if (isAdhan) NotificationHelper.CHANNEL_ADHAN
                      else NotificationHelper.CHANNEL_REMINDER
        val body = if (isAdhan) text
                   else ReminderPlan.notificationBody(mode, text, voiceTextOf(voiceUrl))

        if (ReminderPlan.shouldPublishReminderNotification(isAdhan, mode, wantVoice)) {
            val persistent = (!isAdhan && wantVoice && mode == ReminderPlan.MODE_BOTH)
            NotificationHelper.show(context, eventId.hashCode(), channel, title, body, persistent)
        }

        if (wantVoice || wantAdhan) {
            val svc = Intent(context, PrayerAudioService::class.java)
            svc.putExtra("eventId", eventId)
            svc.putExtra("isAdhan", isAdhan)
            svc.putExtra("title", title)
            svc.putExtra("notifText", text)
            svc.putExtra("mode", mode)
            svc.putExtra("voiceUrl", if (wantVoice) voiceUrl else "")
            svc.putExtra("audioUrl", if (wantAdhan) audioUrl else "")
            svc.putExtra("vibrate", vibrate)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(svc)
                } else {
                    context.startService(svc)
                }
                AlarmStore.rescheduleNextDay(context, eventId)
                return
            } catch (e: Exception) {
                Log.w("PrayerAlarm", "service refuse: " + e)
            }
        }

        // Mode "message" : notification seule, aucun audio (deja publiee ci-dessus).
        if (vibrate) buzz(context)

        AlarmStore.rescheduleNextDay(context, eventId)
    }

    /** Texte porte par une URL TTS ("...&text=..."), pour l'afficher si besoin. */
    private fun voiceTextOf(url: String): String {
        if (url.isEmpty()) return ""
        return try {
            val m = Regex("[?&]text=([^&]*)").find(url) ?: return ""
            java.net.URLDecoder.decode(m.groupValues[1], "UTF-8")
        } catch (e: Exception) { "" }
    }

    private fun buzz(ctx: Context) {
        try {
            val v: Vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                (ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE)
                    as VibratorManager).defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                ctx.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 400, 200, 400), -1))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(longArrayOf(0, 400, 200, 400), -1)
            }
        } catch (_: Exception) {}
    }
}
