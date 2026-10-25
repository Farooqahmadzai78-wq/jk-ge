package com.islamnoor.app

import java.net.URLEncoder

/**
 * Logique pure de preparation des notifications de rappel (rappel avant l'adhan).
 *
 * Cette classe ne depend d'aucune API Android : elle peut donc etre verifiee
 * par des tests unitaires JVM (android/app/src/test).
 *
 * Trois modes sont supportes par l'application :
 *  - "notification" : message uniquement (notification), aucun vocal
 *  - "audio"        : vocal uniquement (message non affiche)
 *  - "both"         : message puis vocal
 */
object ReminderPlan {

    const val MODE_NOTIFICATION = "notification"
    const val MODE_AUDIO = "audio"
    const val MODE_BOTH = "both"

    /** Origine de repli utilisee quand l'application web n'est pas joignable. */
    const val FALLBACK_ORIGIN = "https://fortuite-424120936603.europe-west2.run.app"

    private val ARABIC_REGEX = Regex("[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF]")

    /** Le mode demande-t-il l'affichage du message ? */
    fun wantsMessage(mode: String): Boolean =
        mode == MODE_NOTIFICATION || mode == MODE_BOTH

    /** Le mode demande-t-il la lecture du vocal ? */
    fun wantsVoice(mode: String): Boolean =
        mode == MODE_AUDIO || mode == MODE_BOTH

    /**
     * L'utilisateur a-t-il choisi un texte / vocal personnalise ?
     * L'identifiant "custom" est celui utilise par l'interface
     * (src/routes/reminder/notification.tsx et src/routes/reminder/audio.tsx).
     */
    fun isCustomSelection(id: String): Boolean {
        val s = id.lowercase()
        return s.contains("custom") || s.contains("perso") || s.contains("own")
    }

    fun isArabic(text: String): Boolean = ARABIC_REGEX.containsMatchIn(text)

    /**
     * Rend un texte de notification : l'application web utilise {prayer} et {min},
     * les anciennes versions natives {P} et {M} sont conservees.
     */
    fun renderMessage(text: String, prayer: String, minutes: Int): String {
        if (text.isEmpty()) return text
        return text
            .replace("{prayer}", prayer)
            .replace("{P}", prayer)
            .replace("{minutes}", minutes.toString())
            .replace("{min}", minutes.toString())
            .replace("{M}", minutes.toString())
    }

    /**
     * Message final du rappel.
     *
     * @param customSelected l'interface a-t-elle choisi un message personnalise ?
     * @param customText     le texte personnalise saisi par l'utilisateur
     * @param capturedText   le texte deja resolu capture par l'application web
     */
    fun resolveMessage(
        customSelected: Boolean,
        customText: String,
        capturedText: String,
        prayer: String,
        minutes: Int,
    ): String {
        val custom = customText.trim()
        if (customSelected && custom.isNotEmpty()) {
            return renderMessage(custom, prayer, minutes)
        }
        val captured = capturedText.trim()
        if (captured.isNotEmpty()) {
            return renderMessage(captured, prayer, minutes)
        }
        return renderMessage("L'adhan de {prayer} commence dans {min} minutes.", prayer, minutes)
    }

    /**
     * URL du vocal a lire (TTS). Une URL vide signifie "aucun vocal".
     *
     * @param customSelected l'interface a-t-elle choisi un vocal personnalise ?
     * @param customText     le texte personnalise saisi par l'utilisateur
     * @param capturedUrl    l'URL TTS deja resolue capture par l'application web
     * @param ttsBase        la base TTS capturee (".../api/tts?voice=...&text=")
     * @param origin         l'origine de l'application web
     */
    fun resolveVoiceUrl(
        customSelected: Boolean,
        customText: String,
        capturedUrl: String,
        ttsBase: String,
        origin: String,
    ): String {
        val custom = customText.trim()
        if (customSelected && custom.isNotEmpty()) {
            val base = ttsBase.ifEmpty { defaultTtsBase(origin, isArabic(custom)) }
            return base + urlEncode(custom)
        }
        return capturedUrl
    }

    /** Base TTS par defaut : voix onyx pour l'arabe, alloy pour le reste. */
    fun defaultTtsBase(origin: String, arabic: Boolean): String {
        val o = if (origin.startsWith("http")) origin else FALLBACK_ORIGIN
        val voice = if (arabic) "onyx" else "alloy"
        return "$o/api/tts?voice=$voice&text="
    }

    fun urlEncode(value: String): String =
        URLEncoder.encode(value, "UTF-8").replace("+", "%20")

    /**
     * L'adhan doit-il etre joue ?
     *  - pour une alarme d'adhan (isAdhan) : oui, le comportement actuel est conserve
     *  - pour un rappel : uniquement si le mode demande un audio
     */
    fun wantsAdhan(isAdhan: Boolean, mode: String, hasUrl: Boolean): Boolean =
        hasUrl && (isAdhan || wantsVoice(mode))

    /**
     * Le message personnalise doit-il etre publie par le recepteur ?
     *
     * - l'adhan conserve son comportement actuel (notification de service) ;
     * - en mode "message", la notification est publiee (aucun vocal) ;
     * - en mode "vocal" seul, aucune notification de message n'est publiee
     *   (seule la notification de service, obligatoire, subsiste) ;
     * - en mode "notification + audio", la notification est publiee ET le
     *   vocal est joue : les deux cohabitent, la notification n'est jamais
     *   remplacee par la notification de service (identifiants distincts).
     */
    fun shouldPublishReminderNotification(
        isAdhan: Boolean,
        mode: String,
        hasVoice: Boolean,
    ): Boolean {
        if (isAdhan) return false
        return wantsMessage(mode) || !hasVoice
    }

    /** Message de notification affiche quand aucun vocal n'est joue. */
    fun notificationBody(mode: String, message: String, voiceText: String): String {
        if (wantsMessage(mode) && message.isNotBlank()) return message
        val voice = voiceText.trim()
        return if (voice.isNotEmpty()) voice else "Rappel de priere"
    }
}
