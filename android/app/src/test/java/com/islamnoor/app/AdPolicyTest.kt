package com.islamnoor.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AdPolicyTest {

    @Test
    fun `conserve les 5 identifiants officiels de test Google AdMob`() {
        assertEquals("ca-app-pub-3940256099942544~3347511713", AdPolicy.ADMOB_TEST_APP_ID)
        assertEquals("ca-app-pub-3940256099942544/9257395921", AdPolicy.APP_OPEN_TEST_AD_UNIT_ID)
        assertEquals("ca-app-pub-3940256099942544/1033173712", AdPolicy.INTERSTITIAL_TEST_AD_UNIT_ID)
        assertEquals("ca-app-pub-3940256099942544/2247696110", AdPolicy.NATIVE_STATIC_TEST_AD_UNIT_ID)
        assertEquals("ca-app-pub-3940256099942544/5224354917", AdPolicy.REWARDED_TEST_AD_UNIT_ID)
    }

    @Test
    fun `protege Coran prieres scanner alimentaire et splash`() {
        assertTrue(AdPolicy.isProtectedRoute("/splash"))
        assertTrue(AdPolicy.isProtectedRoute("/quran"))
        assertTrue(AdPolicy.isProtectedRoute("/quran/2"))
        assertTrue(AdPolicy.isProtectedRoute("/prayers"))
        assertTrue(AdPolicy.isProtectedRoute("/prayers/mosque"))
        assertTrue(AdPolicy.isProtectedRoute("/halal"))
        assertTrue(AdPolicy.isProtectedRoute("/halal/scan"))

        assertFalse(AdPolicy.isProtectedRoute("/"))
        assertFalse(AdPolicy.isProtectedRoute("/settings"))
    }

    @Test
    fun `gere le compteur partage de 2 personnalisations sans delai de 5 minutes et repart a zero`() {
        var count = 0
        count = AdPolicy.nextCustomizationCountAfterValidatedChange(count) // 1er changement
        assertEquals(1, count)
        count = AdPolicy.nextCustomizationCountAfterValidatedChange(count) // 2e changement -> paire atteinte
        assertEquals(2, count)

        // Autorisé immédiatement sans délai chronométré de 5 minutes hors contexte protégé
        assertTrue(AdPolicy.canShowInterstitial(isProtectedContext = false, isAnotherAdShowing = false))
        assertFalse(AdPolicy.canShowInterstitial(isProtectedContext = true, isAnotherAdShowing = false))
        assertFalse(AdPolicy.canShowInterstitial(isProtectedContext = false, isAnotherAdShowing = true))

        // Remise à zéro propre du cycle après tentative
        count = AdPolicy.customizationCountAfterPairAttempt()
        assertEquals(0, count)
    }

    @Test
    fun `rejette strictement toute annonce native de profil contenant une video`() {
        assertTrue(AdPolicy.shouldAcceptProfileNativeCreative(hasVideoContent = false))
        assertFalse(AdPolicy.shouldAcceptProfileNativeCreative(hasVideoContent = true))

        var profileCount = 0
        profileCount = AdPolicy.nextProfilePhotoCountAfterSave(profileCount)
        assertEquals(1, profileCount)
        profileCount = AdPolicy.nextProfilePhotoCountAfterSave(profileCount)
        assertEquals(2, profileCount)
    }

    @Test
    fun `empeche toute double recompense sur une meme session video volontaire`() {
        val claimed = mutableSetOf<String>()
        assertTrue(AdPolicy.tryClaimRewardSession(claimed, "session_abc"))
        assertFalse(AdPolicy.tryClaimRewardSession(claimed, "session_abc"))
        assertFalse(AdPolicy.tryClaimRewardSession(claimed, ""))
        assertTrue(AdPolicy.tryClaimRewardSession(claimed, "session_def"))
    }

    @Test
    fun `applique la limite de 4 heures et la longue absence uniquement a App Open`() {
        val t0 = 10_000_000L
        assertTrue(
            AdPolicy.canShowAppOpen(
                nowMs = t0,
                lastAppOpenImpressionAtMs = 0L,
                isResume = false,
                lastBackgroundedAtMs = 0L,
                isProtectedContext = false
            )
        )
        // Moins de 4 heures après une impression App Open confirmée -> refusé
        assertFalse(
            AdPolicy.canShowAppOpen(
                nowMs = t0 + 3 * 3600_000L,
                lastAppOpenImpressionAtMs = t0,
                isResume = false,
                lastBackgroundedAtMs = 0L,
                isProtectedContext = false
            )
        )
        // Après 4 heures et longue absence >= 30 min -> autorisé
        val tLater = t0 + 4 * 3600_000L + 1_000L
        assertTrue(
            AdPolicy.canShowAppOpen(
                nowMs = tLater,
                lastAppOpenImpressionAtMs = t0,
                isResume = true,
                lastBackgroundedAtMs = tLater - 31 * 60_000L,
                isProtectedContext = false
            )
        )
        // Retour après courte absence (5 min) -> refusé
        assertFalse(
            AdPolicy.canShowAppOpen(
                nowMs = tLater,
                lastAppOpenImpressionAtMs = 0L,
                isResume = true,
                lastBackgroundedAtMs = tLater - 5 * 60_000L,
                isProtectedContext = false
            )
        )
    }

    @Test
    fun `exempte les themes et bordures debloques par recompense publicitaire du compteur interstitiel`() {
        assertTrue(AdPolicy.shouldCountCustomizationChange(unlockedByReward = false))
        assertFalse(AdPolicy.shouldCountCustomizationChange(unlockedByReward = true))

        var count = 0
        // 2 bordures premium récompensées -> compteur reste à 0
        count = AdPolicy.nextCustomizationCountAfterValidatedChange(count, unlockedByReward = true)
        count = AdPolicy.nextCustomizationCountAfterValidatedChange(count, unlockedByReward = true)
        assertEquals(0, count)

        // 1 modification ordinaire -> 1, puis 1 bordure récompensée -> reste à 1
        count = AdPolicy.nextCustomizationCountAfterValidatedChange(count, unlockedByReward = false)
        assertEquals(1, count)
        count = AdPolicy.nextCustomizationCountAfterValidatedChange(count, unlockedByReward = true)
        assertEquals(1, count)
    }
}
