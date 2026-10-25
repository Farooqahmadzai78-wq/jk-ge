package com.islamnoor.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.TimeZone

/**
 * Tests unitaires JVM du calcul des instants de declenchement des alarmes.
 *
 * Ils verifient les horaires reellement calcules et enregistres dans
 * Android (et pas seulement l'appel des fonctions de programmation) :
 *  - l'adhan est programme a l'heure exacte de la priere ;
 *  - le rappel est programme a l'heure de la priere moins le delai choisi
 *    (5, 15, 30 minutes) ;
 *  - "aucun rappel" ne programme aucune alarme de rappel ;
 *  - un changement de delai decale le rappel sans toucher a l'adhan ;
 *  - l'heure de priere deja passee est reportee au lendemain, rappel compris.
 */
class AlarmScheduleTest {

    private val utc = TimeZone.getTimeZone("UTC")

    /** 2024-03-14 02:00:00 UTC (heure d'ete europeenne, mais on reste en UTC ici). */
    private val now = 1_710_376_800_000L

    private val times = mapOf(
        "Fajr" to "05:12",
        "Dhuhr" to "12:45",
        "Asr" to "15:58",
        "Maghrib" to "19:03",
        "Isha" to "20:17",
    )

    private fun slot(prayer: String, reminderMinutes: Int, ref: Long = now) =
        AlarmSchedule.slots(times, reminderMinutes, ref, utc).first { it.prayer == prayer }

    @Test
    fun lAdhanEstProgrammeALHeureExacteDeLaPriere() {
        val s = slot("Dhuhr", 0)
        val expected = AlarmSchedule.prayerTimeMs("12:45", now, utc)
        assertEquals(expected, s.adhanAtMs)
        assertEquals(0L, s.adhanAtMs - expected!!)
    }

    @Test
    fun leRappelADelaiDeCinqMinutes() {
        val s = slot("Dhuhr", 5)
        assertNotNull(s.reminderAtMs)
        assertEquals(s.adhanAtMs - 5 * 60_000L, s.reminderAtMs!!)
        assertEquals(-5L, (s.reminderAtMs!! - s.adhanAtMs) / 60_000L)
    }

    @Test
    fun leRappelADelaiDeQuinzeMinutes() {
        val s = slot("Dhuhr", 15)
        assertEquals(-15L, (s.reminderAtMs!! - s.adhanAtMs) / 60_000L)
    }

    @Test
    fun leRappelADelaiDeTrenteMinutes() {
        val s = slot("Isha", 30)
        assertEquals(-30L, (s.reminderAtMs!! - s.adhanAtMs) / 60_000L)
    }

    @Test
    fun aucunRappelNeProgrammeDAlarmeDeRappel() {
        for (prayer in AlarmSchedule.PRAYERS) {
            val s = slot(prayer, 0)
            assertNull("$prayer ne doit avoir aucun rappel", s.reminderAtMs)
            assertNotNull("$prayer doit toujours avoir son adhan", s.adhanAtMs)
        }
    }

    @Test
    fun changerLeDelaiDecaleLeRappelSansToucherALAdhan() {
        val adhan5 = slot("Asr", 5)
        val adhan15 = slot("Asr", 15)
        val adhan30 = slot("Asr", 30)
        assertEquals(adhan5.adhanAtMs, adhan15.adhanAtMs)
        assertEquals(adhan5.adhanAtMs, adhan30.adhanAtMs)
        assertEquals(adhan5.adhanAtMs - 5 * 60_000L, adhan5.reminderAtMs!!)
        assertEquals(adhan5.adhanAtMs - 15 * 60_000L, adhan15.reminderAtMs!!)
        assertEquals(adhan5.adhanAtMs - 30 * 60_000L, adhan30.reminderAtMs!!)
    }

    @Test
    fun lesCinqPrieresSontToutesProgrammees() {
        val slots = AlarmSchedule.slots(times, 15, now, utc)
        assertEquals(5, slots.size)
        assertEquals(AlarmSchedule.PRAYERS, slots.map { it.prayer })
    }

    @Test
    fun lHeureDePriereDejaPasseeEstReporteeAuLendemain() {
        // 23:00 UTC : Isha (20:17) et Maghrib (19:03) sont deja passees.
        val ref = now + 21 * 3_600_000L
        val isha = AlarmSchedule.slots(times, 15, ref, utc).first { it.prayer == "Isha" }
        val expected = AlarmSchedule.prayerTimeMs("20:17", ref, utc)!! + AlarmSchedule.DAY_MS
        assertEquals(expected, isha.adhanAtMs)
        // Le rappel suit la meme occurrence que l'adhan.
        assertEquals(isha.adhanAtMs - 15 * 60_000L, isha.reminderAtMs!!)
    }

    @Test
    fun siLInstantDuRappelEstPasseAucunRappelNEstProgramme() {
        // 12:44 UTC : Dhuhr a 12:45, rappel 15 min avant -> instant deja passe.
        val ref = AlarmSchedule.prayerTimeMs("12:44", now, utc)!!
        val dhuhr = AlarmSchedule.slots(times, 15, ref, utc).first { it.prayer == "Dhuhr" }
        assertNull(dhuhr.reminderAtMs)
        // L'adhan, lui, reste programme a l'heure de la priere.
        assertEquals(
            AlarmSchedule.prayerTimeMs("12:45", ref, utc),
            dhuhr.adhanAtMs,
        )
    }

    @Test
    fun unDelaiDeCinqMinutesRestePossibleJusteAvantLaPriere() {
        // 12:39 -> rappel a 12:40 : l'instant est encore dans le futur.
        val ref = AlarmSchedule.prayerTimeMs("12:39", now, utc)!!
        val dhuhr = AlarmSchedule.slots(times, 5, ref, utc).first { it.prayer == "Dhuhr" }
        assertNotNull(dhuhr.reminderAtMs)
        assertEquals(dhuhr.adhanAtMs - 5 * 60_000L, dhuhr.reminderAtMs!!)
    }

    @Test
    fun lesHorairesInvalidesSontIgnores() {
        val bad = mapOf(
            "Fajr" to "--:--",
            "Dhuhr" to "25:00",
            "Asr" to "",
            "Maghrib" to "19:03",
            "Isha" to "20:17",
        )
        val slots = AlarmSchedule.slots(bad, 15, now, utc)
        assertEquals(2, slots.size)
        assertEquals(listOf("Maghrib", "Isha"), slots.map { it.prayer })
    }

    @Test
    fun laSignatureChangeQuandLeDelaiChange() {
        val a = AlarmSchedule.signatureKey(times, 5, "both", "makkah", true, now, utc)
        val b = AlarmSchedule.signatureKey(times, 15, "both", "makkah", true, now, utc)
        assertTrue("le delai doit changer la signature", a != b)
    }

    @Test
    fun laSignatureChangeQuandLeModeChange() {
        val a = AlarmSchedule.signatureKey(times, 15, "both", "makkah", true, now, utc)
        val b = AlarmSchedule.signatureKey(times, 15, "audio", "makkah", true, now, utc)
        assertTrue("le mode doit changer la signature", a != b)
    }

    @Test
    fun laSignatureChangeQuandLaDateChange() {
        val a = AlarmSchedule.signatureKey(times, 15, "both", "makkah", true, now, utc)
        val b = AlarmSchedule.signatureKey(
            times, 15, "both", "makkah", true, now + AlarmSchedule.DAY_MS, utc)
        assertTrue("le changement de date doit changer la signature", a != b)
    }

    @Test
    fun laSignatureChangeQuandLeFuseauHoraireChange() {
        val a = AlarmSchedule.signatureKey(times, 15, "both", "makkah", true, now, utc)
        val b = AlarmSchedule.signatureKey(
            times, 15, "both", "makkah", true, now, TimeZone.getTimeZone("Europe/Paris"))
        assertTrue("le changement de fuseau horaire doit changer la signature", a != b)
    }

    @Test
    fun laSignatureChangeQuandLaVilleOuLImamChange() {
        val a = AlarmSchedule.signatureKey(times, 15, "both", "makkah", true, now, utc)
        val b = AlarmSchedule.signatureKey(times, 15, "both", "abdul_basit", true, now, utc)
        assertTrue("l'imam doit changer la signature", a != b)
        val c = AlarmSchedule.signatureKey(
            mapOf("Fajr" to "05:13"), 15, "both", "makkah", true, now, utc)
        assertTrue("un changement d'horaire doit changer la signature", a != c)
    }

    @Test
    fun laSignatureEstStablePourLesMemesParametres() {
        val a = AlarmSchedule.signatureKey(times, 15, "both", "makkah", true, now, utc)
        val b = AlarmSchedule.signatureKey(times, 15, "both", "makkah", true, now + 60_000L, utc)
        assertEquals(a, b)
    }

    @Test
    fun parseTimeAccepteLesHeures24h() {
        assertEquals(5 to 12, AlarmSchedule.parseTime("05:12"))
        assertEquals(20 to 17, AlarmSchedule.parseTime("20:17"))
        assertEquals(5 to 12, AlarmSchedule.parseTime("05:12 (EEST)"))
        assertNull(AlarmSchedule.parseTime("--:--"))
        assertNull(AlarmSchedule.parseTime("24:00"))
        assertNull(AlarmSchedule.parseTime(""))
    }
}
