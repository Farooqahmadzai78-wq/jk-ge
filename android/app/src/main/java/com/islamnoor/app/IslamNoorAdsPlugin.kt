package com.islamnoor.app

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Pont Capacitor Android permettant à l'interface d'Islam-Noor de piloter de manière
 * non bloquante le SDK officiel GMA Next-Gen :
 * - App Open (avec télémétrie d'impressions réelles confirmées)
 * - Interstitiel (après chaque paire de personnalisations validées, sans délai 5 min)
 * - Native image fixe sans vidéo (après chaque paire de photos de profil enregistrées)
 * - Vidéo récompensée volontaire ("Soutenir Islam-Noor")
 */
@CapacitorPlugin(name = "IslamNoorAds")
class IslamNoorAdsPlugin : Plugin() {

    @PluginMethod
    fun showAppOpenAd(call: PluginCall) {
        val source = call.getString("source") ?: "launch"
        val host = activity as? MainActivity
        if (host == null) {
            call.resolve(JSObject().put("shown", false))
            return
        }
        host.runOnUiThread {
            val outcome = host.showAppOpenFromBridge(source == "resume")
            val ret = JSObject()
                .put("shown", outcome.shown)
                .put("loadRequested", outcome.loadRequested)
                .put("loadFailed", outcome.loadFailed)
                .put("impressionConfirmed", outcome.impressionConfirmed)
            call.resolve(ret)
        }
    }

    @PluginMethod
    fun showInterstitialAd(call: PluginCall) {
        val host = activity as? MainActivity
        if (host == null) {
            call.resolve(JSObject().put("shown", false))
            return
        }
        host.runOnUiThread {
            val shown = host.showCustomizationInterstitialFromBridge()
            call.resolve(JSObject().put("shown", shown))
        }
    }

    @PluginMethod
    fun showProfileNativeAd(call: PluginCall) {
        val host = activity as? MainActivity
        if (host == null) {
            call.resolve(JSObject().put("shown", false).put("reason", "no-activity"))
            return
        }
        host.runOnUiThread {
            host.showProfileStaticNativeAdFromBridge { outcome ->
                val ret = JSObject()
                    .put("shown", outcome.shown)
                    .put("videoRejected", outcome.videoRejected)
                    .put("reason", outcome.reason)
                call.resolve(ret)
            }
        }
    }

    @PluginMethod
    fun showRewardedAd(call: PluginCall) {
        val sessionId = call.getString("sessionId") ?: ""
        val host = activity as? MainActivity
        if (host == null) {
            call.resolve(
                JSObject()
                    .put("shown", false)
                    .put("rewardEarned", false)
                    .put("reason", "no-activity")
            )
            return
        }
        host.runOnUiThread {
            host.showVoluntaryRewardedAdFromBridge(sessionId) { outcome ->
                val ret = JSObject()
                    .put("shown", outcome.shown)
                    .put("rewardEarned", outcome.rewardEarned)
                    .put("reason", outcome.reason)
                call.resolve(ret)
            }
        }
    }

    @PluginMethod
    fun getAppOpenDiagnostics(call: PluginCall) {
        val host = activity as? MainActivity
        if (host == null) {
            call.resolve(JSObject())
            return
        }
        host.runOnUiThread {
            call.resolve(host.readAppOpenDiagnosticsJson())
        }
    }
}
