package com.islamnoor.app

import java.util.Calendar
import java.util.TimeZone

/**
 * Calcul pur des horaires de declenchement des alarmes.
 *
 * Regles :
 *  - l'alarme de l'adhan est toujours programmee a l'heure exacte de la priere ;
 *  - l'alarme de rappel est programmee a l'heure de la priere moins le delai
 *    choisi (5, 15 ou 30 minutes) ;
 *  - aucun delai ("aucun rappel") -> aucune alarme de rappel ;
 *  - si l'heure de priere du jour est deja passee, l'alarme est programmee
 *    pour le lendemain (et le rappel suit la meme occurrence) ;
 *  - si l'instant du rappel est deja passe, aucun rappel n'est programme pour
 *    cette occurrence (l'adhan, lui, reste programme).
 *
 * Cette classe ne depend d'aucune API Android : elle est verifiee par des
 * tests unitaires JVM (android/app/src/test/java/com/islamnoor/app).
 */
object AlarmSchedule {

    /** Marge de securite : une alarme programmee dans moins de 30 s est consideree comme passee. */
    const val MARGIN_MS = 30_000L
    const val DAY_MS = 86_400_000L

    /** Les 5 prieres, dans l'ordre du cycle quotidien. */
    val PRAYERS = listOf("Fajr", "Dhuhr", "Asr", "Maghrib", "Isha")

    data class Slot(
        val prayer: String,
        /** Instant de l'alarme de l'adhan ( heure exacte de la priere). */
        val adhanAtMs: Long,
        /** Instant de l'alarme de rappel, ou null si aucun rappel n'est programme. */
        val reminderAtMs: Long?,
        /** Delai de rappel en minutes (0 = aucun rappel). */
        val reminderMinutes: Int,
    )

    /** Decoupe "HH:MM" en heure/minute ; renvoie null si le format est invalide. */
    fun parseTime(value: String): Pair<Int, Int>? {
        val raw = value.trim().split(" ")[0]
        val parts = raw.split(":")
        if (parts.size != 2) return null
        val h = parts[0].toIntOrNull() ?: return null
        val m = parts[1].toIntOrNull() ?: return null
        if (h !in 0..23 || m !in 0..59) return null
        return h to m
    }

    /**
     * Calcule les instants de declenchement pour chaque priere.
     *
     * @param times            heures de priere "HH:MM" (24 h) par nom de priere
     * @param reminderMinutes  delai de rappel (0 = aucun rappel)
     * @param nowMs            instant de reference
     * @param zone             fuseau horaire de programmation
     */
    fun slots(
        times: Map<String, String>,
        reminderMinutes: Int,
        nowMs: Long,
        zone: TimeZone = TimeZone.getDefault(),
    ): List<Slot> {
        val out = ArrayList<Slot>()
        for (prayer in PRAYERS) {
            val hhmm = times[prayer] ?: continue
            val (h, m) = parseTime(hhmm) ?: continue

            val cal = Calendar.getInstance(zone)
            cal.timeInMillis = nowMs
            cal.set(Calendar.HOUR_OF_DAY, h)
            cal.set(Calendar.MINUTE, m)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)
            var adhanAt = cal.timeInMillis
            if (adhanAt <= nowMs + MARGIN_MS) adhanAt += DAY_MS

            val reminderAt = if (reminderMinutes > 0) {
                val r = adhanAt - reminderMinutes * 60_000L
                if (r > nowMs + MARGIN_MS) r else null
            } else null

            out.add(Slot(prayer, adhanAt, reminderAt, reminderMinutes))
        }
        return out
    }

    /**
     * Instant de l'heure de priere "HH:MM" sur la meme journee que la
     * reference (sans la logique de report au lendemain). Sert a verifier le
     * decalage reel d'une alarme par rapport a l'heure de priere.
     */
    fun prayerTimeMs(hhmm: String, referenceMs: Long, zone: TimeZone = TimeZone.getDefault()): Long? {
        val (h, m) = parseTime(hhmm) ?: return null
        val cal = Calendar.getInstance(zone)
        cal.timeInMillis = referenceMs
        cal.set(Calendar.HOUR_OF_DAY, h)
        cal.set(Calendar.MINUTE, m)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return cal.timeInMillis
    }

    /**
     * Identifiant de signature des alarmes armees : il doit changer quand
     * l'utilisateur modifie un reglage, quand la date change ou quand le
     * fuseau horaire change, afin de forcer une reprogrammation complete
     * (et d'eviter des alarmes restees a l'ancienne heure).
     */
    fun signatureKey(
        times: Map<String, String>,
        reminderMinutes: Int,
        mode: String,
        imamId: String,
        notifications: Boolean,
        nowMs: Long,
        zone: TimeZone = TimeZone.getDefault(),
    ): String {
        val cal = Calendar.getInstance(zone)
        cal.timeInMillis = nowMs
        val localDate = String.format(
            "%04d-%02d-%02d",
            cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH),
        )
        val timePart = PRAYERS.joinToString(",") { times[it] ?: "" }
        return "$timePart|$reminderMinutes|$mode|$imamId|$notifications|$localDate|${zone.id}"
    }
}
