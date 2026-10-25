package com.islamnoor.app

import android.app.Dialog
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.media.AudioManager
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.getcapacitor.BridgeActivity
import com.getcapacitor.JSObject
import com.google.android.libraries.ads.mobile.sdk.MobileAds
import com.google.android.libraries.ads.mobile.sdk.appopen.AppOpenAd
import com.google.android.libraries.ads.mobile.sdk.appopen.AppOpenAdEventCallback
import com.google.android.libraries.ads.mobile.sdk.common.AdLoadCallback
import com.google.android.libraries.ads.mobile.sdk.common.AdRequest
import com.google.android.libraries.ads.mobile.sdk.common.FullScreenContentError
import com.google.android.libraries.ads.mobile.sdk.common.LoadAdError
import com.google.android.libraries.ads.mobile.sdk.common.RequestConfiguration
import com.google.android.libraries.ads.mobile.sdk.initialization.InitializationConfig
import com.google.android.libraries.ads.mobile.sdk.initialization.InitializationStatus
import com.google.android.libraries.ads.mobile.sdk.initialization.OnAdapterInitializationCompleteListener
import com.google.android.libraries.ads.mobile.sdk.interstitial.InterstitialAd
import com.google.android.libraries.ads.mobile.sdk.interstitial.InterstitialAdEventCallback
import com.google.android.libraries.ads.mobile.sdk.nativead.AdChoicesView
import com.google.android.libraries.ads.mobile.sdk.nativead.MediaView
import com.google.android.libraries.ads.mobile.sdk.nativead.NativeAd
import com.google.android.libraries.ads.mobile.sdk.nativead.NativeAdEventCallback
import com.google.android.libraries.ads.mobile.sdk.nativead.NativeAdLoader
import com.google.android.libraries.ads.mobile.sdk.nativead.NativeAdLoaderCallback
import com.google.android.libraries.ads.mobile.sdk.nativead.NativeAdRequest
import com.google.android.libraries.ads.mobile.sdk.nativead.NativeAdView
import com.google.android.libraries.ads.mobile.sdk.rewarded.OnUserEarnedRewardListener
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardItem
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardedAd
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardedAdEventCallback
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.atomic.AtomicBoolean

class MainActivity : BridgeActivity() {

    data class AppOpenBridgeOutcome(
        val shown: Boolean,
        val loadRequested: Boolean = false,
        val loadFailed: Boolean = false,
        val impressionConfirmed: Boolean = false,
    )

    data class ProfileNativeShowOutcome(
        val shown: Boolean,
        val videoRejected: Boolean = false,
        val reason: String = "",
    )

    data class RewardedShowOutcome(
        val shown: Boolean,
        val rewardEarned: Boolean,
        val reason: String = "",
    )

    companion object {
        private const val AD_PREFS_NAME = "islamnoor_ad_prefs"
        private const val KEY_LAST_APP_OPEN_IMPRESSION_MS = "last_app_open_shown_ms"
        private const val KEY_LAST_BACKGROUND_MS = "last_backgrounded_ms"

        // Compteurs persistants App Open (sans aucune donnée personnelle)
        private const val KEY_TEL_REAL_LAUNCHES = "tel_total_real_launches"
        private const val KEY_TEL_ELIGIBLE_RESUMES = "tel_eligible_bg_resumes"
        private const val KEY_TEL_OPPORTUNITIES = "tel_eligible_opportunities"
        private const val KEY_TEL_LOAD_REQUESTS = "tel_load_requests"
        private const val KEY_TEL_SHOW_ATTEMPTS = "tel_show_attempts"
        private const val KEY_TEL_CONFIRMED_IMPRESSIONS = "tel_confirmed_impressions"
        private const val KEY_TEL_LOAD_FAILURES = "tel_load_failures"
        private const val KEY_TEL_OPENS_SINCE_IMPRESSION = "tel_opens_since_last_impression"
        private const val KEY_TEL_LAST_IMPRESSION_ISO = "tel_last_confirmed_impression_iso"

        private val sdkInitStarted = AtomicBoolean(false)

        @Volatile
        private var sdkInitialized = false
    }

    private val handler = Handler(Looper.getMainLooper())

    private var appOpenAd: AppOpenAd? = null
    private var isAppOpenLoading = false

    private var interstitialAd: InterstitialAd? = null
    private var isInterstitialLoading = false

    private var rewardedAd: RewardedAd? = null
    private var isRewardedLoading = false

    private var activeProfileNativeAd: NativeAd? = null
    private var activeProfileNativeDialog: Dialog? = null

    private var isShowingAnyAd = false
    private val grantedRewardSessions = mutableSetOf<String>()

    private var systemBarsLeft = 0
    private var systemBarsTop = 0
    private var systemBarsRight = 0
    private var systemBarsBottom = 0

    private val tick = object : Runnable {
        override fun run() {
            try { bridge?.webView?.evaluateJavascript(NurTts.SCRIPT, null) } catch (_: Exception) {}
            try { bridge?.webView?.evaluateJavascript(WebGuard.SCRIPT, null) } catch (_: Exception) {}
            handler.postDelayed(this, 10000L)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(PrayerSchedulerPlugin::class.java)
        registerPlugin(NurSpeakPlugin::class.java)
        registerPlugin(IslamNoorAdsPlugin::class.java)
        super.onCreate(savedInstanceState)
        applyEdgeToEdgeInsets()
        initializeGmaNextGenSdk()
        NotificationHelper.ensureChannels(this)
        Speaker.init(this)
        maybeTest(intent)
    }

    /**
     * Affichage bord à bord (edge-to-edge) avec marges système appliquées à la
     * WebView : aucune bannière publicitaire permanente n'existe dans Islam-Noor.
     */
    private fun applyEdgeToEdgeInsets() {
        try {
            WindowCompat.setDecorFitsSystemWindows(window, false)

            window.statusBarColor = Color.TRANSPARENT
            window.navigationBarColor = Color.TRANSPARENT

            val controller = WindowInsetsControllerCompat(window, window.decorView)
            controller.isAppearanceLightStatusBars = !isNightMode()
            controller.isAppearanceLightNavigationBars = !isNightMode()

            val webView = bridge?.webView ?: return
            val targetView = (webView.parent as? View) ?: webView
            ViewCompat.setOnApplyWindowInsetsListener(targetView) { _, insets ->
                val bars = insets.getInsets(
                    WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
                )
                systemBarsLeft = bars.left
                systemBarsTop = bars.top
                systemBarsRight = bars.right
                systemBarsBottom = bars.bottom
                applyLayoutInsets()
                insets
            }
            ViewCompat.requestApplyInsets(targetView)
        } catch (e: Exception) {
            android.util.Log.w("MainActivity", "edge-to-edge indisponible: " + e)
        }
    }

    private fun applyLayoutInsets() {
        val webView = bridge?.webView ?: return
        val lp = webView.layoutParams as? ViewGroup.MarginLayoutParams
        if (lp != null && lp.bottomMargin != 0) {
            lp.bottomMargin = 0
            webView.layoutParams = lp
        }
        webView.setPadding(systemBarsLeft, systemBarsTop, systemBarsRight, systemBarsBottom)
    }

    private fun logAdsDiagnostic(event: String, details: String = "") {
        val msg = if (details.isEmpty()) event else "$event | $details"
        android.util.Log.i(AdPolicy.LOG_TAG, msg)
    }

    private fun notifyWebAdEvent(type: String, timestampMs: Long = System.currentTimeMillis()) {
        runOnUiThread {
            try {
                val js = """
                    window.dispatchEvent(new CustomEvent('islamnoor:native-ad-event', {
                        detail: { type: '$type', timestampMs: $timestampMs }
                    }));
                """.trimIndent()
                bridge?.webView?.evaluateJavascript(js, null)
            } catch (_: Throwable) {}
        }
    }

    /**
     * Initialisation officielle du SDK GMA Next-Gen sur thread d'arrière-plan avec
     * classification maximale de contenu `MAX_AD_CONTENT_RATING_G` (Tout public / Familial)
     * et sans aucun profilage des habitudes religieuses.
     */
    private fun initializeGmaNextGenSdk() {
        try {
            if (sdkInitialized || MobileAds.isInitialized()) {
                sdkInitialized = true
                onAdsSdkReady()
                return
            }
        } catch (_: Throwable) {
            // Poursuite sur thread d'arrière-plan
        }

        if (!sdkInitStarted.compareAndSet(false, true)) {
            return
        }

        val appCtx = applicationContext
        Thread(
            {
                try {
                    val requestConfig = RequestConfiguration.Builder()
                        .setMaxAdContentRating(
                            RequestConfiguration.MaxAdContentRating.MAX_AD_CONTENT_RATING_G
                        )
                        .build()

                    val initConfig = InitializationConfig.Builder(AdPolicy.ADMOB_APP_ID)
                        .setRequestConfiguration(requestConfig)
                        .build()

                    MobileAds.initialize(
                        appCtx,
                        initConfig,
                        object : OnAdapterInitializationCompleteListener {
                            override fun onAdapterInitializationComplete(status: InitializationStatus) {
                                sdkInitialized = true
                                logAdsDiagnostic(
                                    "sdk_initialized",
                                    "maxAdContentRating=${AdPolicy.MAX_AD_CONTENT_RATING} testIds=${AdPolicy.USE_TEST_IDS}"
                                )
                                runOnUiThread {
                                    if (!isFinishing && !isDestroyed) {
                                        onAdsSdkReady()
                                    }
                                }
                            }
                        }
                    )
                } catch (e: Throwable) {
                    sdkInitStarted.set(false)
                    logAdsDiagnostic("sdk_init_failed", e.message ?: "unknown")
                }
            },
            "GmaNextGenInit"
        ).start()
    }

    private fun onAdsSdkReady() {
        loadAppOpenAd()
        loadInterstitialAd()
        preloadRewardedAd()
    }

    private fun adPrefs() = getSharedPreferences(AD_PREFS_NAME, Context.MODE_PRIVATE)

    private fun formatIsoUtc(ms: Long): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date(ms))
    }

    private fun incrementPrefCounter(key: String): Int {
        val prefs = adPrefs()
        val next = (prefs.getInt(key, 0) + 1).coerceAtLeast(1)
        prefs.edit().putInt(key, next).apply()
        return next
    }

    fun readAppOpenDiagnosticsJson(): JSObject {
        val prefs = adPrefs()
        return JSObject()
            .put("totalRealLaunches", prefs.getInt(KEY_TEL_REAL_LAUNCHES, 0))
            .put("eligibleBackgroundResumes", prefs.getInt(KEY_TEL_ELIGIBLE_RESUMES, 0))
            .put("eligibleAppOpenOpportunities", prefs.getInt(KEY_TEL_OPPORTUNITIES, 0))
            .put("loadRequests", prefs.getInt(KEY_TEL_LOAD_REQUESTS, 0))
            .put("showAttempts", prefs.getInt(KEY_TEL_SHOW_ATTEMPTS, 0))
            .put("confirmedImpressions", prefs.getInt(KEY_TEL_CONFIRMED_IMPRESSIONS, 0))
            .put("loadFailures", prefs.getInt(KEY_TEL_LOAD_FAILURES, 0))
            .put("opensSinceLastConfirmedImpression", prefs.getInt(KEY_TEL_OPENS_SINCE_IMPRESSION, 0))
            .put("lastConfirmedImpressionAt", prefs.getString(KEY_TEL_LAST_IMPRESSION_ISO, null))
    }

    private fun currentWebRoutePath(): String {
        return try {
            val rawUrl = bridge?.webView?.url
            if (rawUrl.isNullOrEmpty()) "/" else (Uri.parse(rawUrl).path ?: "/")
        } catch (_: Throwable) {
            "/"
        }
    }

    /**
     * Vérifie côté natif qu'aucune protection obligatoire n'est active :
     * Coran, prières, adhan, lecture audio/TTS ou scanner alimentaire / halal.
     */
    private fun isNativeProtectedContext(): Boolean {
        if (AdPolicy.isProtectedRoute(currentWebRoutePath())) {
            return true
        }
        if (PrayerAudioService.isPlaybackActive || Speaker.isSpeaking()) {
            return true
        }
        val am = try {
            getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        } catch (_: Throwable) {
            null
        }
        if (am?.isMusicActive == true) {
            return true
        }
        return false
    }

    /* ========================================================================
       1. APP OPEN AD (PLAFOND 4H + IMPRESSION CONFIRMÉE UNIQUEMENT SUR CALLBACK)
       ======================================================================== */

    private fun loadAppOpenAd() {
        if (!sdkInitialized || appOpenAd != null || isAppOpenLoading || isFinishing || isDestroyed) {
            return
        }

        try {
            isAppOpenLoading = true
            val reqCount = incrementPrefCounter(KEY_TEL_LOAD_REQUESTS)
            logAdsDiagnostic("app_open_load_request", "loadRequests=$reqCount")
            notifyWebAdEvent("app-open-load-request")

            val adRequest = AdRequest.Builder(AdPolicy.APP_OPEN_AD_UNIT_ID).build()
            AppOpenAd.load(
                adRequest,
                object : AdLoadCallback<AppOpenAd> {
                    override fun onAdLoaded(ad: AppOpenAd) {
                        ad.adEventCallback = object : AppOpenAdEventCallback {
                            override fun onAdShowedFullScreenContent() {
                                runOnUiThread {
                                    isShowingAnyAd = true
                                    logAdsDiagnostic("app_open_showed_fullscreen")
                                }
                            }

                            override fun onAdImpression() {
                                runOnUiThread {
                                    val now = System.currentTimeMillis()
                                    val iso = formatIsoUtc(now)
                                    val prefs = adPrefs()
                                    val confirmed = prefs.getInt(KEY_TEL_CONFIRMED_IMPRESSIONS, 0) + 1
                                    prefs.edit()
                                        .putLong(KEY_LAST_APP_OPEN_IMPRESSION_MS, now)
                                        .putInt(KEY_TEL_CONFIRMED_IMPRESSIONS, confirmed)
                                        .putInt(KEY_TEL_OPENS_SINCE_IMPRESSION, 0)
                                        .putString(KEY_TEL_LAST_IMPRESSION_ISO, iso)
                                        .apply()

                                    logAdsDiagnostic(
                                        "app_open_impression_confirmed",
                                        "confirmedImpressions=$confirmed lastConfirmedImpressionAt=$iso"
                                    )
                                    notifyWebAdEvent("app-open-impression", now)
                                }
                            }

                            override fun onAdDismissedFullScreenContent() {
                                runOnUiThread {
                                    isShowingAnyAd = false
                                    appOpenAd = null
                                    if (!isFinishing && !isDestroyed) {
                                        loadAppOpenAd()
                                    }
                                }
                            }

                            override fun onAdFailedToShowFullScreenContent(
                                fullScreenContentError: FullScreenContentError
                            ) {
                                runOnUiThread {
                                    isShowingAnyAd = false
                                    appOpenAd = null
                                    val failures = incrementPrefCounter(KEY_TEL_LOAD_FAILURES)
                                    logAdsDiagnostic(
                                        "app_open_failed_to_show",
                                        "loadFailures=$failures msg=${fullScreenContentError.message}"
                                    )
                                    notifyWebAdEvent("app-open-load-failure")
                                    if (!isFinishing && !isDestroyed) {
                                        loadAppOpenAd()
                                    }
                                }
                            }
                        }

                        runOnUiThread {
                            isAppOpenLoading = false
                            if (!isFinishing && !isDestroyed) {
                                appOpenAd = ad
                                logAdsDiagnostic("app_open_loaded_ready")
                            }
                        }
                    }

                    override fun onAdFailedToLoad(adError: LoadAdError) {
                        runOnUiThread {
                            isAppOpenLoading = false
                            appOpenAd = null
                            val failures = incrementPrefCounter(KEY_TEL_LOAD_FAILURES)
                            logAdsDiagnostic(
                                "app_open_failed_to_load",
                                "loadFailures=$failures code=${adError.code} msg=${adError.message}"
                            )
                            notifyWebAdEvent("app-open-load-failure")
                        }
                    }
                }
            )
        } catch (e: Throwable) {
            isAppOpenLoading = false
            incrementPrefCounter(KEY_TEL_LOAD_FAILURES)
            logAdsDiagnostic("app_open_load_exception", e.message ?: "unknown")
        }
    }

    fun showAppOpenFromBridge(isResume: Boolean): AppOpenBridgeOutcome {
        val prefs = adPrefs()
        val now = System.currentTimeMillis()

        if (isResume) {
            incrementPrefCounter(KEY_TEL_ELIGIBLE_RESUMES)
        } else {
            incrementPrefCounter(KEY_TEL_REAL_LAUNCHES)
        }
        val opensSinceLast = incrementPrefCounter(KEY_TEL_OPENS_SINCE_IMPRESSION)
        logAdsDiagnostic(
            "app_open_entry",
            "isResume=$isResume opensSinceLastConfirmedImpression=$opensSinceLast"
        )

        if (isFinishing || isDestroyed || isShowingAnyAd) {
            return AppOpenBridgeOutcome(shown = false)
        }

        val lastAppOpenImpression = prefs.getLong(KEY_LAST_APP_OPEN_IMPRESSION_MS, 0L)
        val lastBackgrounded = prefs.getLong(KEY_LAST_BACKGROUND_MS, 0L)
        val effectiveBackgrounded = if (isResume && lastBackgrounded <= 0L) {
            now - AdPolicy.LONG_ABSENCE_THRESHOLD_MS
        } else {
            lastBackgrounded
        }

        if (!AdPolicy.canShowAppOpen(
                nowMs = now,
                lastAppOpenImpressionAtMs = lastAppOpenImpression,
                isResume = isResume,
                lastBackgroundedAtMs = effectiveBackgrounded,
                isProtectedContext = isNativeProtectedContext(),
                isAnotherAdShowing = isShowingAnyAd
            )
        ) {
            return AppOpenBridgeOutcome(shown = false)
        }

        incrementPrefCounter(KEY_TEL_OPPORTUNITIES)
        val attempts = incrementPrefCounter(KEY_TEL_SHOW_ATTEMPTS)

        val ad = appOpenAd
        if (ad == null) {
            logAdsDiagnostic("app_open_not_ready_at_opportunity", "showAttempts=$attempts")
            val triggeredLoad = sdkInitialized && !isAppOpenLoading
            if (triggeredLoad) {
                loadAppOpenAd()
            }
            return AppOpenBridgeOutcome(
                shown = false,
                loadRequested = triggeredLoad,
                loadFailed = true
            )
        }

        return try {
            appOpenAd = null
            isShowingAnyAd = true
            prefs.edit().remove(KEY_LAST_BACKGROUND_MS).apply()
            logAdsDiagnostic("app_open_show_invoked", "showAttempts=$attempts")
            ad.show(this)
            AppOpenBridgeOutcome(shown = true)
        } catch (e: Throwable) {
            isShowingAnyAd = false
            incrementPrefCounter(KEY_TEL_LOAD_FAILURES)
            logAdsDiagnostic("app_open_show_exception", e.message ?: "unknown")
            loadAppOpenAd()
            AppOpenBridgeOutcome(shown = false, loadFailed = true)
        }
    }

    /* ========================================================================
       2. INTERSTITIEL APRÈS 2 MODIFICATIONS DE PERSONNALISATION (SANS DÉLAI 5 MIN)
       ======================================================================== */

    private fun loadInterstitialAd() {
        if (!sdkInitialized || interstitialAd != null || isInterstitialLoading || isFinishing || isDestroyed) {
            return
        }

        try {
            isInterstitialLoading = true
            val adRequest = AdRequest.Builder(AdPolicy.INTERSTITIAL_AD_UNIT_ID).build()
            InterstitialAd.load(
                adRequest,
                object : AdLoadCallback<InterstitialAd> {
                    override fun onAdLoaded(ad: InterstitialAd) {
                        ad.adEventCallback = object : InterstitialAdEventCallback {
                            override fun onAdShowedFullScreenContent() {
                                runOnUiThread {
                                    isShowingAnyAd = true
                                    logAdsDiagnostic("interstitial_showed_fullscreen")
                                }
                            }

                            override fun onAdImpression() {
                                runOnUiThread {
                                    logAdsDiagnostic("interstitial_impression_confirmed")
                                }
                            }

                            override fun onAdDismissedFullScreenContent() {
                                runOnUiThread {
                                    isShowingAnyAd = false
                                    interstitialAd = null
                                    // Recharge en arrière-plan pour la prochaine paire (sans jamais enchaîner)
                                    if (!isFinishing && !isDestroyed) {
                                        loadInterstitialAd()
                                    }
                                }
                            }

                            override fun onAdFailedToShowFullScreenContent(
                                fullScreenContentError: FullScreenContentError
                            ) {
                                runOnUiThread {
                                    isShowingAnyAd = false
                                    interstitialAd = null
                                    logAdsDiagnostic(
                                        "interstitial_failed_to_show",
                                        fullScreenContentError.message
                                    )
                                    if (!isFinishing && !isDestroyed) {
                                        loadInterstitialAd()
                                    }
                                }
                            }
                        }

                        runOnUiThread {
                            isInterstitialLoading = false
                            if (!isFinishing && !isDestroyed) {
                                interstitialAd = ad
                                logAdsDiagnostic("interstitial_loaded_ready")
                            }
                        }
                    }

                    override fun onAdFailedToLoad(adError: LoadAdError) {
                        runOnUiThread {
                            isInterstitialLoading = false
                            interstitialAd = null
                            logAdsDiagnostic("interstitial_failed_to_load", adError.message)
                        }
                    }
                }
            )
        } catch (e: Throwable) {
            isInterstitialLoading = false
            logAdsDiagnostic("interstitial_load_exception", e.message ?: "unknown")
        }
    }

    fun showCustomizationInterstitialFromBridge(): Boolean {
        if (isFinishing || isDestroyed) {
            return false
        }

        if (!AdPolicy.canShowInterstitial(
                isProtectedContext = isNativeProtectedContext(),
                isAnotherAdShowing = isShowingAnyAd
            )
        ) {
            logAdsDiagnostic("interstitial_blocked_protection_or_overlap")
            return false
        }

        val ad = interstitialAd
        if (ad == null) {
            logAdsDiagnostic("interstitial_unavailable_reloading_for_next_cycle")
            if (sdkInitialized && !isInterstitialLoading) {
                loadInterstitialAd()
            }
            return false
        }

        return try {
            interstitialAd = null
            isShowingAnyAd = true
            ad.show(this)
            true
        } catch (e: Throwable) {
            isShowingAnyAd = false
            logAdsDiagnostic("interstitial_show_exception", e.message ?: "unknown")
            loadInterstitialAd()
            false
        }
    }

    /* ========================================================================
       3. ANNONCE NATIVE IMAGE FIXE (SANS VIDÉO) APRÈS 2 PHOTOS DE PROFIL
       ======================================================================== */

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    private fun cleanupProfileNativeDialog() {
        val dlg = activeProfileNativeDialog
        activeProfileNativeDialog = null
        if (dlg != null && dlg.isShowing) {
            try {
                dlg.dismiss()
            } catch (_: Throwable) {}
        }
        val ad = activeProfileNativeAd
        activeProfileNativeAd = null
        if (ad != null) {
            try {
                ad.destroy()
                logAdsDiagnostic("profile_native_destroyed")
            } catch (_: Throwable) {}
        }
    }

    fun showProfileStaticNativeAdFromBridge(onComplete: (ProfileNativeShowOutcome) -> Unit) {
        if (isFinishing || isDestroyed || !sdkInitialized) {
            onComplete(ProfileNativeShowOutcome(shown = false, reason = "sdk-not-ready"))
            return
        }

        if (isShowingAnyAd || isNativeProtectedContext()) {
            onComplete(ProfileNativeShowOutcome(shown = false, reason = "protected-or-busy"))
            return
        }

        isShowingAnyAd = true

        try {
            val request = NativeAdRequest.Builder(
                AdPolicy.NATIVE_STATIC_AD_UNIT_ID,
                listOf(NativeAd.NativeAdType.NATIVE)
            )
                .setMediaAspectRatio(NativeAd.NativeMediaAspectRatio.LANDSCAPE)
                .build()

            NativeAdLoader.load(
                request,
                object : NativeAdLoaderCallback {
                    override fun onNativeAdLoaded(nativeAd: NativeAd) {
                        runOnUiThread {
                            if (isFinishing || isDestroyed || isNativeProtectedContext()) {
                                try { nativeAd.destroy() } catch (_: Throwable) {}
                                isShowingAnyAd = false
                                onComplete(
                                    ProfileNativeShowOutcome(
                                        shown = false,
                                        reason = "context-changed"
                                    )
                                )
                                return@runOnUiThread
                            }

                            // Rejet strict de toute créative contenant un flux vidéo
                            val hasVideo = nativeAd.mediaContent?.hasVideoContent == true
                            if (!AdPolicy.shouldAcceptProfileNativeCreative(hasVideo)) {
                                try { nativeAd.destroy() } catch (_: Throwable) {}
                                isShowingAnyAd = false
                                logAdsDiagnostic(
                                    "profile_native_video_rejected",
                                    "hasVideoContent=true"
                                )
                                onComplete(
                                    ProfileNativeShowOutcome(
                                        shown = false,
                                        videoRejected = true,
                                        reason = "video-rejected"
                                    )
                                )
                                return@runOnUiThread
                            }

                            nativeAd.adEventCallback = object : NativeAdEventCallback {
                                override fun onAdImpression() {
                                    runOnUiThread {
                                        logAdsDiagnostic("profile_native_impression_confirmed")
                                    }
                                }
                            }

                            presentProfileNativeModal(nativeAd)
                            onComplete(ProfileNativeShowOutcome(shown = true, reason = "shown"))
                        }
                    }

                    override fun onAdFailedToLoad(adError: LoadAdError) {
                        runOnUiThread {
                            isShowingAnyAd = false
                            logAdsDiagnostic("profile_native_failed_to_load", adError.message)
                            onComplete(
                                ProfileNativeShowOutcome(
                                    shown = false,
                                    reason = "load-failed"
                                )
                            )
                        }
                    }
                }
            )
        } catch (e: Throwable) {
            isShowingAnyAd = false
            logAdsDiagnostic("profile_native_exception", e.message ?: "unknown")
            onComplete(ProfileNativeShowOutcome(shown = false, reason = "exception"))
        }
    }

    /**
     * Affiche une carte modale compacte GMA Next-Gen NativeAdView :
     * - Le bouton de fermeture X (>= 48dp) est placé STRICTEMENT HORS du `NativeAdView`
     *   afin d'exclure tout clic publicitaire accidentel lors de la fermeture.
     * - Inclut le badge « Annonce » et `AdChoicesView`.
     * - Appelle systématiquement `nativeAd.destroy()` à la fermeture.
     */
    private fun presentProfileNativeModal(nativeAd: NativeAd) {
        cleanupProfileNativeDialog()
        activeProfileNativeAd = nativeAd

        val dialog = Dialog(this)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        dialog.setCancelable(true)
        dialog.setCanceledOnTouchOutside(true)
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        val outerLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }

        // 1. Barre supérieure EXTERNE au NativeAdView (bouton X isolé de tout clic publicitaire)
        val externalHeader = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(4), 0, dp(4), dp(10))
        }

        val externalHint = TextView(this).apply {
            text = "Contenu sponsorisé"
            setTextColor(Color.parseColor("#E2E8F0"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            typeface = Typeface.DEFAULT_BOLD
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }

        val closeBg = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.WHITE)
        }

        val externalCloseBtn = TextView(this).apply {
            text = "✕"
            gravity = Gravity.CENTER
            setTextColor(Color.parseColor("#0F172A"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            typeface = Typeface.DEFAULT_BOLD
            background = closeBg
            contentDescription = "Fermer l'annonce"
            layoutParams = LinearLayout.LayoutParams(dp(48), dp(48))
            setOnClickListener {
                dialog.dismiss()
            }
        }

        externalHeader.addView(externalHint)
        externalHeader.addView(externalCloseBtn)
        outerLayout.addView(externalHeader)

        // 2. Composant officiel NativeAdView (séparé du bouton X externe)
        val nativeAdView = NativeAdView(this)
        val cardBg = GradientDrawable().apply {
            cornerRadius = dp(20).toFloat()
            setColor(Color.parseColor("#0F172A"))
            setStroke(dp(1), Color.parseColor("#334155"))
        }

        val adContentCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = cardBg
            setPadding(dp(16), dp(14), dp(16), dp(16))
        }

        // Ligne d'attribution obligatoire : badge "Annonce" + AdChoicesView
        val disclosureRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, dp(10))
        }

        val adBadgeBg = GradientDrawable().apply {
            cornerRadius = dp(6).toFloat()
            setColor(Color.parseColor("#F59E0B"))
        }

        val adBadge = TextView(this).apply {
            text = "Annonce"
            setTextColor(Color.parseColor("#0F172A"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
            typeface = Typeface.DEFAULT_BOLD
            background = adBadgeBg
            setPadding(dp(8), dp(3), dp(8), dp(3))
        }

        val spacer = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(0, 1, 1f)
        }

        val adChoicesView = AdChoicesView(this)
        nativeAdView.adChoicesView = adChoicesView

        disclosureRow.addView(adBadge)
        disclosureRow.addView(spacer)
        disclosureRow.addView(adChoicesView)
        adContentCol.addView(disclosureRow)

        // En-tête Icône + Titre + Annonceur
        val titleRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, dp(10))
        }

        val iconDrawable = nativeAd.icon?.drawable
        if (iconDrawable != null) {
            val iconView = ImageView(this).apply {
                setImageDrawable(iconDrawable)
                scaleType = ImageView.ScaleType.CENTER_CROP
                layoutParams = LinearLayout.LayoutParams(dp(42), dp(42)).apply {
                    marginEnd = dp(10)
                }
            }
            nativeAdView.iconView = iconView
            titleRow.addView(iconView)
        }

        val textMetaCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }

        val headlineView = TextView(this).apply {
            text = nativeAd.headline ?: "Annonce"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            typeface = Typeface.DEFAULT_BOLD
            maxLines = 2
            ellipsize = TextUtils.TruncateAt.END
        }
        nativeAdView.headlineView = headlineView
        textMetaCol.addView(headlineView)

        val advertiserText = nativeAd.advertiser
        if (!advertiserText.isNullOrBlank()) {
            val advertiserView = TextView(this).apply {
                text = advertiserText
                setTextColor(Color.parseColor("#94A3B8"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                maxLines = 1
                ellipsize = TextUtils.TruncateAt.END
            }
            nativeAdView.advertiserView = advertiserView
            textMetaCol.addView(advertiserView)
        }

        titleRow.addView(textMetaCol)
        adContentCol.addView(titleRow)

        // MediaView statique (hasVideoContent == false déjà vérifié)
        val mediaView = MediaView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(180)
            ).apply {
                bottomMargin = dp(10)
            }
        }
        adContentCol.addView(mediaView)

        val bodyText = nativeAd.body
        if (!bodyText.isNullOrBlank()) {
            val bodyView = TextView(this).apply {
                text = bodyText
                setTextColor(Color.parseColor("#CBD5E1"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                maxLines = 3
                ellipsize = TextUtils.TruncateAt.END
                setPadding(0, 0, 0, dp(12))
            }
            nativeAdView.bodyView = bodyView
            adContentCol.addView(bodyView)
        }

        val ctaText = nativeAd.callToAction
        if (!ctaText.isNullOrBlank()) {
            val ctaBg = GradientDrawable().apply {
                cornerRadius = dp(12).toFloat()
                setColor(Color.parseColor("#10B981"))
            }
            val ctaBtn = Button(this).apply {
                text = ctaText
                isAllCaps = false
                setTextColor(Color.parseColor("#022C22"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                typeface = Typeface.DEFAULT_BOLD
                background = ctaBg
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    dp(44)
                )
            }
            nativeAdView.callToActionView = ctaBtn
            adContentCol.addView(ctaBtn)
        }

        nativeAdView.addView(
            adContentCol,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        )
        nativeAdView.registerNativeAd(nativeAd, mediaView)
        outerLayout.addView(nativeAdView)

        dialog.setContentView(outerLayout)
        dialog.window?.setLayout(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )

        dialog.setOnDismissListener {
            isShowingAnyAd = false
            activeProfileNativeDialog = null
            val currentAd = activeProfileNativeAd
            activeProfileNativeAd = null
            if (currentAd != null) {
                try {
                    currentAd.destroy()
                    logAdsDiagnostic("profile_native_dismissed_and_destroyed")
                } catch (_: Throwable) {}
            }
        }

        activeProfileNativeDialog = dialog
        dialog.show()
    }

    /* ========================================================================
       4. VIDÉO RÉCOMPENSÉE VOLONTAIRE ("SOUTENIR ISLAM-NOOR")
       ======================================================================== */

    private fun preloadRewardedAd() {
        if (!sdkInitialized || rewardedAd != null || isRewardedLoading || isFinishing || isDestroyed) {
            return
        }

        try {
            isRewardedLoading = true
            val request = AdRequest.Builder(AdPolicy.REWARDED_AD_UNIT_ID).build()
            RewardedAd.load(
                request,
                object : AdLoadCallback<RewardedAd> {
                    override fun onAdLoaded(ad: RewardedAd) {
                        runOnUiThread {
                            isRewardedLoading = false
                            if (!isFinishing && !isDestroyed) {
                                rewardedAd = ad
                                logAdsDiagnostic("rewarded_preloaded_ready")
                            }
                        }
                    }

                    override fun onAdFailedToLoad(adError: LoadAdError) {
                        runOnUiThread {
                            isRewardedLoading = false
                            rewardedAd = null
                            logAdsDiagnostic("rewarded_preload_failed", adError.message)
                        }
                    }
                }
            )
        } catch (e: Throwable) {
            isRewardedLoading = false
            logAdsDiagnostic("rewarded_preload_exception", e.message ?: "unknown")
        }
    }

    fun showVoluntaryRewardedAdFromBridge(
        sessionId: String,
        onComplete: (RewardedShowOutcome) -> Unit,
    ) {
        if (isFinishing || isDestroyed || !sdkInitialized) {
            onComplete(RewardedShowOutcome(shown = false, rewardEarned = false, reason = "sdk-not-ready"))
            return
        }

        if (isShowingAnyAd || isNativeProtectedContext()) {
            onComplete(RewardedShowOutcome(shown = false, rewardEarned = false, reason = "protected-or-busy"))
            return
        }

        val readyAd = rewardedAd
        if (readyAd != null) {
            rewardedAd = null
            presentRewardedInstance(readyAd, sessionId, onComplete)
            return
        }

        // Si l'annonce n'était pas encore préchargée, effectue un chargement immédiat à la demande
        try {
            val request = AdRequest.Builder(AdPolicy.REWARDED_TEST_AD_UNIT_ID).build()
            RewardedAd.load(
                request,
                object : AdLoadCallback<RewardedAd> {
                    override fun onAdLoaded(ad: RewardedAd) {
                        runOnUiThread {
                            if (isFinishing || isDestroyed || isShowingAnyAd || isNativeProtectedContext()) {
                                rewardedAd = ad
                                onComplete(
                                    RewardedShowOutcome(
                                        shown = false,
                                        rewardEarned = false,
                                        reason = "context-changed"
                                    )
                                )
                                return@runOnUiThread
                            }
                            presentRewardedInstance(ad, sessionId, onComplete)
                        }
                    }

                    override fun onAdFailedToLoad(adError: LoadAdError) {
                        runOnUiThread {
                            logAdsDiagnostic("rewarded_on_demand_load_failed", adError.message)
                            onComplete(
                                RewardedShowOutcome(
                                    shown = false,
                                    rewardEarned = false,
                                    reason = "load-failed"
                                )
                            )
                        }
                    }
                }
            )
        } catch (e: Throwable) {
            logAdsDiagnostic("rewarded_on_demand_exception", e.message ?: "unknown")
            onComplete(RewardedShowOutcome(shown = false, rewardEarned = false, reason = "exception"))
        }
    }

    private fun presentRewardedInstance(
        ad: RewardedAd,
        sessionId: String,
        onComplete: (RewardedShowOutcome) -> Unit,
    ) {
        var settled = false
        var earnedForSession = false
        isShowingAnyAd = true

        ad.adEventCallback = object : RewardedAdEventCallback {
            override fun onAdShowedFullScreenContent() {
                runOnUiThread {
                    isShowingAnyAd = true
                    logAdsDiagnostic("rewarded_showed_fullscreen", "sessionId=$sessionId")
                }
            }

            override fun onAdImpression() {
                runOnUiThread {
                    logAdsDiagnostic("rewarded_impression_confirmed", "sessionId=$sessionId")
                }
            }

            override fun onAdDismissedFullScreenContent() {
                runOnUiThread {
                    isShowingAnyAd = false
                    if (!isFinishing && !isDestroyed) {
                        preloadRewardedAd()
                    }
                    if (!settled) {
                        settled = true
                        onComplete(
                            RewardedShowOutcome(
                                shown = true,
                                rewardEarned = earnedForSession,
                                reason = if (earnedForSession) "reward-earned" else "dismissed-early"
                            )
                        )
                    }
                }
            }

            override fun onAdFailedToShowFullScreenContent(
                fullScreenContentError: FullScreenContentError
            ) {
                runOnUiThread {
                    isShowingAnyAd = false
                    logAdsDiagnostic("rewarded_failed_to_show", fullScreenContentError.message)
                    if (!isFinishing && !isDestroyed) {
                        preloadRewardedAd()
                    }
                    if (!settled) {
                        settled = true
                        onComplete(
                            RewardedShowOutcome(
                                shown = false,
                                rewardEarned = false,
                                reason = "failed-to-show"
                            )
                        )
                    }
                }
            }
        }

        try {
            ad.show(
                this,
                OnUserEarnedRewardListener { rewardItem: RewardItem ->
                    runOnUiThread {
                        if (AdPolicy.tryClaimRewardSession(grantedRewardSessions, sessionId)) {
                            earnedForSession = true
                            logAdsDiagnostic(
                                "rewarded_earned_confirmed",
                                "sessionId=$sessionId type=${rewardItem.type} amount=${rewardItem.amount}"
                            )
                        } else {
                            logAdsDiagnostic("rewarded_duplicate_callback_ignored", "sessionId=$sessionId")
                        }
                    }
                }
            )
        } catch (e: Throwable) {
            isShowingAnyAd = false
            logAdsDiagnostic("rewarded_show_exception", e.message ?: "unknown")
            preloadRewardedAd()
            if (!settled) {
                settled = true
                onComplete(RewardedShowOutcome(shown = false, rewardEarned = false, reason = "exception"))
            }
        }
    }

    private fun isNightMode(): Boolean {
        return try {
            val mode = resources.configuration.uiMode and
                android.content.res.Configuration.UI_MODE_NIGHT_MASK
            mode == android.content.res.Configuration.UI_MODE_NIGHT_YES
        } catch (_: Exception) {
            false
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        maybeTest(intent)
    }

    private fun maybeTest(i: Intent?) {
        if (i == null || !i.getBooleanExtra("nurtest", false)) return
        i.removeExtra("nurtest")
        val d = i.getIntExtra("nurdelay", 30)
        val kind = i.getStringExtra("nurkind") ?: "rappel"
        handler.postDelayed({
            AlarmStore.schedule(this, TestBuilder.build(this, kind, d))
            android.util.Log.i("NurTest", "alarme reelle " + kind + " dans " + d + "s")
        }, 1500L)
    }

    override fun onResume() {
        super.onResume()
        handler.removeCallbacks(tick)
        handler.post(tick)
    }

    override fun onPause() {
        super.onPause()
        handler.removeCallbacks(tick)
    }

    override fun onStop() {
        super.onStop()
        if (!isShowingAnyAd) {
            try {
                adPrefs().edit()
                    .putLong(KEY_LAST_BACKGROUND_MS, System.currentTimeMillis())
                    .apply()
            } catch (_: Throwable) {}
        }
    }

    override fun onDestroy() {
        handler.removeCallbacks(tick)
        cleanupProfileNativeDialog()
        appOpenAd = null
        interstitialAd = null
        rewardedAd = null
        isShowingAnyAd = false
        super.onDestroy()
    }
}
