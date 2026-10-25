package com.islamnoor.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object NotificationHelper {

    const val CHANNEL_ADHAN = "adhan_v4"
    const val CHANNEL_REMINDER = "reminder_v4"
    private const val TAG = "NurNotif"

    private var ready = false

    fun ensureChannels(ctx: Context) {
        if (ready) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = ctx.getSystemService(NotificationManager::class.java)
            listOf("adhan_channel", "prayer_channel", "reminder_channel",
                   "adhan_v3", "reminder_v3").forEach {
                try { nm.deleteNotificationChannel(it) } catch (_: Exception) {}
            }
            val adhan = NotificationChannel(
                CHANNEL_ADHAN, "Adhan", NotificationManager.IMPORTANCE_HIGH)
            adhan.description = "Appel a la priere"
            adhan.setSound(null, null)
            adhan.enableVibration(true)
            adhan.lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            nm.createNotificationChannel(adhan)

            val rem = NotificationChannel(
                CHANNEL_REMINDER, "Rappel avant la priere", NotificationManager.IMPORTANCE_HIGH)
            rem.description = "Rappel quelques minutes avant l'adhan"
            rem.enableVibration(true)
            rem.lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            nm.createNotificationChannel(rem)

            Log.i(TAG, "canaux v4 crees")
        }
        ready = true
    }

    fun diag(ctx: Context) {
        try {
            val enabled = NotificationManagerCompat.from(ctx).areNotificationsEnabled()
            Log.i(TAG, "areNotificationsEnabled=" + enabled)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val nm = ctx.getSystemService(NotificationManager::class.java)
                listOf(CHANNEL_ADHAN, CHANNEL_REMINDER).forEach {
                    val c = nm.getNotificationChannel(it)
                    Log.i(TAG, "canal " + it + " importance=" +
                        (c?.importance ?: -1))
                }
            }
        } catch (e: Exception) { Log.w(TAG, "diag err: " + e) }
    }

    fun contentIntent(ctx: Context): PendingIntent {
        val i = Intent(ctx, MainActivity::class.java)
        i.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        return PendingIntent.getActivity(ctx, 0, i,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun stopIntent(ctx: Context): PendingIntent {
        val i = Intent(ctx, PrayerAudioService::class.java)
        i.action = PrayerAudioService.ACTION_STOP
        return PendingIntent.getService(ctx, 1, i,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun build(ctx: Context, channel: String, title: String, text: String,
              ongoing: Boolean, withStop: Boolean): NotificationCompat.Builder {
        val b = NotificationCompat.Builder(ctx, channel)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(contentIntent(ctx))
            .setAutoCancel(!ongoing)
            .setOngoing(ongoing)
        if (withStop) {
            b.addAction(0, "Arreter l'adhan", stopIntent(ctx))
            b.setDeleteIntent(stopIntent(ctx))
        }
        return b
    }

    /**
     * Affiche une notification dans la barre systeme.
     *
     * @param ongoing si vrai, la notification reste en place tant que l'appelant
     *                ne l'annule pas (utile pendant la lecture audio pour que le
     *                message du rappel reste visible aux cotes de la notification
     *                du service au premier plan).
     */
    fun show(
        ctx: Context,
        id: Int,
        channel: String,
        title: String,
        text: String,
        ongoing: Boolean = false,
    ) {
        ensureChannels(ctx)
        diag(ctx)
        try {
            NotificationManagerCompat.from(ctx)
                .notify(id, build(ctx, channel, title, text, ongoing, false).build())
            Log.i(TAG, "notify OK id=" + id + " canal=" + channel + " ongoing=" + ongoing)
        } catch (e: Exception) {
            Log.e(TAG, "notify ECHEC: " + e)
            try {
                val nm = ctx.getSystemService(NotificationManager::class.java)
                nm.notify(id, build(ctx, channel, title, text, ongoing, false).build())
                Log.i(TAG, "notify repli OK")
            } catch (e2: Exception) { Log.e(TAG, "notify repli ECHEC: " + e2) }
        }
    }
}
