package com.islamnoor.app

/**
 * Politique publicitaire intelligente Islam-Noor (Mission N21 — Zéro bannière permanente).
 *
 * Contient :
 * - Les 5 identifiants officiels de test Google AdMob (App ID, App Open, Interstitiel,
 *   Native image fixe sans vidéo, Vidéo récompensée volontaire).
 * - Le compteur partagé unique de 2 modifications validées (Arrière-plans, Bordures, Widgets)
 *   SANS délai chronométré de 5 minutes, avec remise à zéro propre du cycle.
 * - Le compteur séparé de 2 photos de profil enregistrées et le rejet strict des créatives vidéo.
 * - La protection anti-double récompense par session pour les vidéos volontaires.
 * - Le plafond de 4 heures propre uniquement à App Open (lancement réel ou absence >= 30 min).
 * - Les routes et contextes religieux/fonctionnels strictement protégés.
 */
object AdPolicy {
    const val LOG_TAG = "ISLAMNOOR_ADS"
    const val MAX_AD_CONTENT_RATING = "G"
    const val USE_TEST_IDS = true

    const val ADMOB_TEST_APP_ID = "ca-app-pub-3940256099942544~3347511713"
    const val APP_OPEN_TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/9257395921"
    const val INTERSTITIAL_TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712"
    const val NATIVE_STATIC_TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/2247696110"
    const val REWARDED_TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/5224354917"

    // Emplacements de production centralisés (remplacer uniquement lors du passage officiel en production)
    private const val ADMOB_PROD_APP_ID = ADMOB_TEST_APP_ID
    private const val APP_OPEN_PROD_AD_UNIT_ID = APP_OPEN_TEST_AD_UNIT_ID
    private const val INTERSTITIAL_PROD_AD_UNIT_ID = INTERSTITIAL_TEST_AD_UNIT_ID
    private const val NATIVE_STATIC_PROD_AD_UNIT_ID = NATIVE_STATIC_TEST_AD_UNIT_ID
    private const val REWARDED_PROD_AD_UNIT_ID = REWARDED_TEST_AD_UNIT_ID

    val ADMOB_APP_ID: String get() = if (USE_TEST_IDS) ADMOB_TEST_APP_ID else ADMOB_PROD_APP_ID
    val APP_OPEN_AD_UNIT_ID: String get() = if (USE_TEST_IDS) APP_OPEN_TEST_AD_UNIT_ID else APP_OPEN_PROD_AD_UNIT_ID
    val INTERSTITIAL_AD_UNIT_ID: String get() = if (USE_TEST_IDS) INTERSTITIAL_TEST_AD_UNIT_ID else INTERSTITIAL_PROD_AD_UNIT_ID
    val NATIVE_STATIC_AD_UNIT_ID: String get() = if (USE_TEST_IDS) NATIVE_STATIC_TEST_AD_UNIT_ID else NATIVE_STATIC_PROD_AD_UNIT_ID
    val REWARDED_AD_UNIT_ID: String get() = if (USE_TEST_IDS) REWARDED_TEST_AD_UNIT_ID else REWARDED_PROD_AD_UNIT_ID

    const val CUSTOMIZATION_CHANGES_REQUIRED = 2
    const val PROFILE_PHOTO_CHANGES_REQUIRED = 2
    const val APP_OPEN_COOLDOWN_MS = 4L * 60L * 60L * 1000L // 4 heures (App Open uniquement)
    const val LONG_ABSENCE_THRESHOLD_MS = 30L * 60L * 1000L // 30 minutes

    fun normalizeRoutePath(rawPath: String?): String {
        val trimmed = rawPath?.trim().orEmpty()
        if (trimmed.isEmpty() || trimmed == "/") return "/"
        return trimmed.trimEnd('/')
    }

    /**
     * Aucune publicité pendant le Coran, les prières, le scanner alimentaire/halal ou l'écran splash.
     */
    fun isProtectedRoute(rawPath: String?): Boolean {
        val path = normalizeRoutePath(rawPath)
        return path == "/splash" ||
            path == "/quran" || path.startsWith("/quran/") ||
            path == "/prayers" || path.startsWith("/prayers/") ||
            path == "/halal" || path.startsWith("/halal/")
    }

    /**
     * Exception impérative N22 : un thème ou une bordure explicitement débloqué grâce à une
     * publicité récompensée (`unlockedByReward == true`) ne doit jamais incrémenter le compteur
     * ni déclencher d'interstitiel.
     */
    fun shouldCountCustomizationChange(unlockedByReward: Boolean): Boolean {
        return !unlockedByReward
    }

    /**
     * Incrémente le compteur partagé unique (Arrière-plans, Bordures, Widgets) pour une
     * modification ordinaire uniquement.
     */
    fun nextCustomizationCountAfterValidatedChange(
        currentCount: Int,
        unlockedByReward: Boolean = false,
    ): Int {
        val safeCurrent = currentCount.coerceAtLeast(0)
        if (!shouldCountCustomizationChange(unlockedByReward)) {
            return safeCurrent.coerceAtMost(CUSTOMIZATION_CHANGES_REQUIRED)
        }
        return (safeCurrent + 1).coerceAtMost(CUSTOMIZATION_CHANGES_REQUIRED)
    }

    /**
     * Après tentative sur la 2e modification (qu'elle soit affichée ou indisponible),
     * le compteur repart toujours à 0 pour démarrer un nouveau cycle propre sans annonce tardive.
     */
    fun customizationCountAfterPairAttempt(): Int = 0

    /**
     * Incrémente le compteur séparé dédié aux photos de profil réellement enregistrées.
     */
    fun nextProfilePhotoCountAfterSave(currentCount: Int): Int {
        val safeCurrent = currentCount.coerceAtLeast(0)
        return (safeCurrent + 1).coerceAtMost(PROFILE_PHOTO_CHANGES_REQUIRED)
    }

    /**
     * Règle N21 : aucun délai chronométré de 5 minutes sur les interstitiels de personnalisation.
     * Bloqué uniquement si une protection religieuse/audio/scanner est active ou si une autre
     * annonce est déjà affichée à l'écran.
     */
    fun canShowInterstitial(
        isProtectedContext: Boolean,
        isAnotherAdShowing: Boolean = false,
    ): Boolean {
        if (isProtectedContext || isAnotherAdShowing) return false
        return true
    }

    /**
     * Rejette strictement toute annonce native de profil contenant un flux vidéo.
     */
    fun shouldAcceptProfileNativeCreative(hasVideoContent: Boolean): Boolean {
        return !hasVideoContent
    }

    /**
     * Garantit qu'une session de vidéo récompensée ne peut accorder qu'une seule récompense.
     */
    fun tryClaimRewardSession(claimedSessions: MutableSet<String>, sessionId: String?): Boolean {
        val clean = sessionId?.trim().orEmpty()
        if (clean.isEmpty()) return false
        return claimedSessions.add(clean)
    }

    /**
     * App Open : autorisé au véritable lancement ou après une absence >= 30 min,
     * avec un maximum d'1 impression confirmée toutes les 4 heures.
     */
    fun canShowAppOpen(
        nowMs: Long,
        lastAppOpenImpressionAtMs: Long,
        isResume: Boolean,
        lastBackgroundedAtMs: Long,
        isProtectedContext: Boolean,
        isAnotherAdShowing: Boolean = false,
    ): Boolean {
        if (isProtectedContext || isAnotherAdShowing) return false
        if (isResume) {
            if (lastBackgroundedAtMs <= 0L || (nowMs - lastBackgroundedAtMs) < LONG_ABSENCE_THRESHOLD_MS) {
                return false
            }
        }
        if (lastAppOpenImpressionAtMs > 0L && (nowMs - lastAppOpenImpressionAtMs) < APP_OPEN_COOLDOWN_MS) {
            return false
        }
        return true
    }
}
