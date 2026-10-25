package com.islamnoor.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import java.util.TimeZone

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val a = intent.action ?: return
        when (a) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                NotificationHelper.ensureChannels(context)
                val n = AlarmStore.restoreAll(context)
                Log.i("BootReceiver", "restore apres " + a + " : " + n)
            }

            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED -> {
                // Les instants stockes sont absolus : apres un changement de
                // fuseau horaire ou d'heure systeme, on les recalcule a partir
                // des heures de priere et du delai de rappel, sinon les alarmes
                // se declencheraient a l'ancienne heure locale.
                NotificationHelper.ensureChannels(context)
                val meta = Store.meta(context)
                val lastTimes = meta.getString("lastTimes", "") ?: ""
                val reminder = meta.getInt("lastReminder", 0)
                val times = LinkedHashMap<String, String>()
                try {
                    val t = org.json.JSONObject(lastTimes)
                    for (prayer in AlarmSchedule.PRAYERS) {
                        val v = t.optString(prayer, "")
                        if (v.isNotEmpty()) times[prayer] = v
                    }
                } catch (_: Exception) {}

                if (times.isEmpty()) {
                    // Aucune heure memorisee : on restaure les alarmes telles quelles.
                    val n = AlarmStore.restoreAll(context)
                    Log.i("BootReceiver", "restore (pas d'horaires memorises) : " + n)
                } else {
                    val n = AlarmStore.recomputeAll(
                        context, times, reminder, System.currentTimeMillis(),
                        TimeZone.getDefault())
                    Log.i("BootReceiver", "reprogrammation apres " + a + " : " + n)
                }
            }
        }
    }
}
