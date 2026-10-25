package com.islamnoor.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Tests unitaires JVM de la logique de preparation des rappels.
 * Cible : android/app/src/test/java/com/islamnoor/app/ReminderPlanTest.kt
 */
class ReminderPlanTest {

    // ---------- modes ----------

    @Test
    fun modeMessageDemandeLeMessageMaisPasLeVocal() {
        assertTrue(ReminderPlan.wantsMessage(ReminderPlan.MODE_NOTIFICATION))
        assertFalse(ReminderPlan.wantsVoice(ReminderPlan.MODE_NOTIFICATION))
    }

    @Test
    fun modeVocalDemandeLeVocalMaisPasLeMessage() {
        assertFalse(ReminderPlan.wantsMessage(ReminderPlan.MODE_AUDIO))
        assertTrue(ReminderPlan.wantsVoice(ReminderPlan.MODE_AUDIO))
    }

    @Test
    fun modeCombineDemandeLesDeux() {
        assertTrue(ReminderPlan.wantsMessage(ReminderPlan.MODE_BOTH))
        assertTrue(ReminderPlan.wantsVoice(ReminderPlan.MODE_BOTH))
    }

    // ---------- detection du mode personnalise ----------

    @Test
    fun identifiantCustomEstDetecte() {
        assertTrue(ReminderPlan.isCustomSelection("custom"))
        assertTrue(ReminderPlan.isCustomSelection("CUSTOM"))
        assertTrue(ReminderPlan.isCustomSelection("perso"))
        assertTrue(ReminderPlan.isCustomSelection("own_text"))
    }

    @Test
    fun identifiantDeModeleNEstPasDetecteCommeCustom() {
        assertFalse(ReminderPlan.isCustomSelection("generic"))
        assertFalse(ReminderPlan.isCustomSelection("fajr"))
        assertFalse(ReminderPlan.isCustomSelection("prepare"))
        assertFalse(ReminderPlan.isCustomSelection(""))
    }

    // ---------- rendu du message ----------

    @Test
    fun leMessageRendLesPlaceholdersDeLInterface() {
        assertEquals(
            "L'adhan de Fajr commence dans 15 minutes.",
            ReminderPlan.renderMessage(
                "L'adhan de {prayer} commence dans {min} minutes.", "Fajr", 15),
        )
    }

    @Test
    fun leMessageRendLesAnciensPlaceholdersNatifs() {
        assertEquals(
            "Adhan de Isha dans 30 minutes.",
            ReminderPlan.renderMessage("Adhan de {P} dans {M} minutes.", "Isha", 30),
        )
    }

    @Test
    fun leMessagePersonnaliseEstUtiliseEtRendu() {
        val out = ReminderPlan.resolveMessage(
            customSelected = true,
            customText = "C'est l'heure de {prayer} !",
            capturedText = "Message capture ignore",
            prayer = "Maghrib",
            minutes = 5,
        )
        assertEquals("C'est l'heure de Maghrib !", out)
    }

    @Test
    fun leMessageCaptureEstUtiliseQuandAucunMessagePersonnalise() {
        val out = ReminderPlan.resolveMessage(
            customSelected = false,
            customText = "texte ignore",
            capturedText = "L'adhan de {prayer} commence dans {min} minutes.",
            prayer = "Asr",
            minutes = 15,
        )
        assertEquals("L'adhan de Asr commence dans 15 minutes.", out)
    }

    @Test
    fun leMessageCaptureEstUtiliseMemeSiLeModeleEstCustomSansTexte() {
        val out = ReminderPlan.resolveMessage(
            customSelected = true,
            customText = "   ",
            capturedText = "Message capture",
            prayer = "Fajr",
            minutes = 30,
        )
        assertEquals("Message capture", out)
    }

    @Test
    fun unMessageParDefautEstUtiliseSansReglageNiCapture() {
        val out = ReminderPlan.resolveMessage(
            customSelected = false,
            customText = "",
            capturedText = "",
            prayer = "Dhuhr",
            minutes = 15,
        )
        assertEquals("L'adhan de Dhuhr commence dans 15 minutes.", out)
    }

    // ---------- vocal ----------

    @Test
    fun leVocalPersonnaliseEstEncodeDansLUrlTts() {
        val url = ReminderPlan.resolveVoiceUrl(
            customSelected = true,
            customText = "Preparez vous a la priere",
            capturedUrl = "https://localhost/api/tts?voice=alloy&text=Autre",
            ttsBase = "https://localhost/api/tts?voice=alloy&text=",
            origin = "https://localhost",
        )
        assertEquals(
            "https://localhost/api/tts?voice=alloy&text=Preparez%20vous%20a%20la%20priere",
            url,
        )
    }

    @Test
    fun leVocalCaptureEstUtiliseQuandAucunVocalPersonnalise() {
        val captured = "https://localhost/api/tts?voice=onyx&text=Bismillah"
        val url = ReminderPlan.resolveVoiceUrl(
            customSelected = false,
            customText = "ignore",
            capturedUrl = captured,
            ttsBase = "https://localhost/api/tts?voice=onyx&text=",
            origin = "https://localhost",
        )
        assertEquals(captured, url)
    }

    @Test
    fun laVoixArabeEstUtiliseePourUnVocalPersonnaliseEnArabe() {
        val base = ReminderPlan.defaultTtsBase("https://localhost", arabic = true)
        assertEquals("https://localhost/api/tts?voice=onyx&text=", base)
        val url = ReminderPlan.resolveVoiceUrl(
            customSelected = true,
            customText = "بسم الله",
            capturedUrl = "",
            ttsBase = "",
            origin = "https://localhost",
        )
        assertTrue(url.startsWith("https://localhost/api/tts?voice=onyx&text="))
    }

    @Test
    fun laBaseTtsDeRepliUtiliseLOriginePuisLOrigineDeSecours() {
        assertEquals(
            "https://example.test/api/tts?voice=alloy&text=",
            ReminderPlan.defaultTtsBase("https://example.test", arabic = false),
        )
        assertEquals(
            ReminderPlan.FALLBACK_ORIGIN + "/api/tts?voice=alloy&text=",
            ReminderPlan.defaultTtsBase("", arabic = false),
        )
    }

    // ---------- adhan ----------

    @Test
    fun lAdhanEstToujoursJouePourUneAlarmeDAdhan() {
        assertTrue(ReminderPlan.wantsAdhan(true, ReminderPlan.MODE_NOTIFICATION, true))
        assertTrue(ReminderPlan.wantsAdhan(true, ReminderPlan.MODE_AUDIO, true))
        assertTrue(ReminderPlan.wantsAdhan(true, ReminderPlan.MODE_BOTH, true))
    }

    @Test
    fun lAdhanNEstPasJouePourUnRappelEnModeMessage() {
        assertFalse(ReminderPlan.wantsAdhan(false, ReminderPlan.MODE_NOTIFICATION, true))
    }

    @Test
    fun lAdhanEstJouePourUnRappelEnModeVocalOuCombine() {
        assertTrue(ReminderPlan.wantsAdhan(false, ReminderPlan.MODE_AUDIO, true))
        assertTrue(ReminderPlan.wantsAdhan(false, ReminderPlan.MODE_BOTH, true))
    }

    @Test
    fun aucuneUrlNeSignaleAucuneLecture() {
        assertFalse(ReminderPlan.wantsAdhan(true, ReminderPlan.MODE_BOTH, false))
        assertFalse(ReminderPlan.wantsAdhan(false, ReminderPlan.MODE_BOTH, false))
    }

    // ---------- publication de la notification de rappel ----------

    @Test
    fun leModeMessagePublieLaNotification() {
        assertTrue(
            ReminderPlan.shouldPublishReminderNotification(
                isAdhan = false, mode = ReminderPlan.MODE_NOTIFICATION, hasVoice = false))
    }

    @Test
    fun leModeCombinePublieLaNotificationEnMemeTempsQueLeVocal() {
        // Voix + message : la notification est publiee ET le vocal est joue.
        assertTrue(
            ReminderPlan.shouldPublishReminderNotification(
                isAdhan = false, mode = ReminderPlan.MODE_BOTH, hasVoice = true))
    }

    @Test
    fun leModeVocalSeulNePubliePasDeNotificationDeMessage() {
        assertFalse(
            ReminderPlan.shouldPublishReminderNotification(
                isAdhan = false, mode = ReminderPlan.MODE_AUDIO, hasVoice = true))
    }

    @Test
    fun lAdhanConserveSaNotificationDeService() {
        assertFalse(
            ReminderPlan.shouldPublishReminderNotification(
                isAdhan = true, mode = ReminderPlan.MODE_BOTH, hasVoice = true))
        assertFalse(
            ReminderPlan.shouldPublishReminderNotification(
                isAdhan = true, mode = ReminderPlan.MODE_NOTIFICATION, hasVoice = false))
    }

    // ---------- corps de la notification ----------

    @Test
    fun leCorpsDeNotificationUtiliseLeMessageEnModeMessage() {
        assertEquals(
            "Message choisi",
            ReminderPlan.notificationBody(ReminderPlan.MODE_NOTIFICATION, "Message choisi", "vocal"),
        )
    }

    @Test
    fun leCorpsDeNotificationUtiliseLeVocalEnModeVocalSeul() {
        assertEquals(
            "vocal",
            ReminderPlan.notificationBody(ReminderPlan.MODE_AUDIO, "Message choisi", "vocal"),
        )
    }
}
