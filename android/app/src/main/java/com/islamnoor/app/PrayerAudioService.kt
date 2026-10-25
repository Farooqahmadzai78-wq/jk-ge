package com.islamnoor.app

import android.app.Service
import android.content.Context
import android.content.Intent
import android.database.ContentObserver
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.VolumeProvider
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationManagerCompat

/**
 * Service de lecture : vocal de l'utilisateur puis adhan, dans cet ordre.
 *
 * Regles :
 *  - jamais deux lectures en meme temps : une demande recue pendant une lecture
 *    est mise en file et demarre uniquement quand la lecture en cours se termine ;
 *  - si le vocal est indisponible (moteur TTS non pret, URL absente), on passe
 *    directement a l'adhan ;
 *  - si l'adhan est indisponible (URL absente ou injoignable), la notification
 *    reste coherente et le service s'arrete proprement.
 */
class PrayerAudioService : Service() {

    companion object {
        const val ACTION_STOP = "com.islamnoor.app.STOP_ADHAN"
        @Volatile
        var isPlaybackActive: Boolean = false
        private const val FG_ID = 424242
        private const val TAG = "PrayerAudio"
        private const val POLL_MS = 250L
        private const val GRACE_MS = 1500L
        private const val MEDIA_TIMEOUT_MS = 600000L
        private const val TTS_TIMEOUT_MS = 25000L
    }

    private data class Playback(
        val eventId: String,
        val isAdhan: Boolean,
        val title: String,
        val message: String,
        val mode: String,
        val voiceUrl: String,
        val adhanUrl: String,
        val vibrate: Boolean,
    )

    private var player: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var audioManager: AudioManager? = null
    private var volumeObserver: ContentObserver? = null
    private var session: MediaSession? = null

    private var baseline = ""
    private var armAt = 0L
    private var stopped = false
    private var current: Playback? = null
    private var queued: Playback? = null
    private var generation = 0
    private var lastStartId = -1

    private var curTitle = "Islam-Noor"
    private var curText = ""
    private var curChannel = NotificationHelper.CHANNEL_ADHAN

    private val handler = Handler(Looper.getMainLooper())

    private val poll = object : Runnable {
        override fun run() {
            if (stopped) return
            if (armAt > 0L && System.currentTimeMillis() >= armAt) {
                val now = volumeSnapshot()
                if (now != baseline) {
                    Log.i(TAG, "volume change detecte (poll): " + baseline + " -> " + now)
                    stopAudioKeepNotification(discardQueue = true); return
                }
            }
            handler.postDelayed(this, POLL_MS)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        lastStartId = startId
        if (intent?.action == ACTION_STOP) {
            Log.i(TAG, "arret demande (bouton notification)")
            stopAudioKeepNotification(discardQueue = true)
            return START_NOT_STICKY
        }

        val req = readPlayback(intent)
        if (req == null) {
            Log.w(TAG, "demarrage sans requete -> arret")
            try { stopSelfResult(startId) } catch (_: Exception) { stopSelf() }
            return START_NOT_STICKY
        }

        if (current != null && !stopped) {
            // Une lecture est deja en cours : on met en file plutot que de
            // superposer les deux audios.
            queued = req
            Log.i(TAG, "requete mise en file (lecture en cours) : " + req.eventId)
            return START_STICKY
        }

        beginPlayback(req)
        return START_STICKY
    }

    // ---------- demarrage d'une lecture ----------

    private fun readPlayback(intent: Intent?): Playback? {
        if (intent == null) return null
        val isAdhan = intent.getBooleanExtra("isAdhan", true)
        val mode = intent.getStringExtra("mode")
            ?: if (isAdhan) ReminderPlan.MODE_BOTH else ReminderPlan.MODE_NOTIFICATION
        val message = intent.getStringExtra("notifText") ?: ""
        val voiceUrl = intent.getStringExtra("voiceUrl") ?: ""
        val adhanUrl = intent.getStringExtra("audioUrl") ?: ""
        if (voiceUrl.isEmpty() && adhanUrl.isEmpty()) return null
        return Playback(
            eventId = intent.getStringExtra("eventId") ?: "evt",
            isAdhan = isAdhan,
            title = intent.getStringExtra("title") ?: "Islam-Noor",
            message = message,
            mode = mode,
            voiceUrl = voiceUrl,
            adhanUrl = adhanUrl,
            vibrate = intent.getBooleanExtra("vibrate", true),
        )
    }

    private fun beginPlayback(p: Playback) {
        generation++
        val gen = generation
        current = p
        stopped = false
        isPlaybackActive = true

        curTitle = p.title
        curChannel = if (p.isAdhan) NotificationHelper.CHANNEL_ADHAN
                     else NotificationHelper.CHANNEL_REMINDER
        curText = notificationBody(p)

        Log.i(TAG, "lecture " + p.eventId + " mode=" + p.mode +
            " vocal=" + p.voiceUrl.isNotEmpty() + " adhan=" + p.adhanUrl.isNotEmpty())

        NotificationHelper.ensureChannels(this)

        val notif = NotificationHelper
            .build(this, curChannel, curTitle, curText, true, true)
            .build()

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(FG_ID, notif,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
            } else {
                startForeground(FG_ID, notif)
            }
            Log.i(TAG, "foreground OK")
        } catch (e: Exception) {
            Log.w(TAG, "startForeground: " + e)
            NotificationHelper.show(this, FG_ID, curChannel, curTitle, curText)
        }

        if (p.vibrate) buzz()

        acquireWake()
        startVolumeWatch()
        stopTriggered = false
        armAtMs = 0L
        startVolumeKeyCapture()

        if (p.voiceUrl.isNotEmpty()) {
            playVoice(p.voiceUrl, gen)
        } else {
            playAdhanOrFinish(gen)
        }
    }

    /** Corps de la notification : le message si le mode l'autorise, sinon le vocal. */
    private fun notificationBody(p: Playback): String {
        if (ReminderPlan.wantsMessage(p.mode) && p.message.isNotBlank()) return p.message
        val voice = texteTts(p.voiceUrl)
        if (voice.isNotEmpty()) return voice
        if (p.message.isNotBlank()) return p.message
        return "Islam-Noor"
    }

    // ---------- sequence : vocal puis adhan ----------

    private fun playVoice(url: String, gen: Int) {
        if (estTts(url)) {
            val t = texteTts(url)
            if (t.isEmpty() || !Speaker.isReady()) {
                Log.w(TAG, "vocal indisponible -> passage direct a l'adhan")
                playAdhanOrFinish(gen)
                return
            }
            val ar = url.contains("onyx")
            Log.i(TAG, "voix native (alarme) : " + t.take(70))
            handler.postDelayed({ onTimeout(gen, "vocal") }, TTS_TIMEOUT_MS)
            Speaker.speak(this, t, ar, true) {
                if (gen != generation) return@speak
                Log.i(TAG, "vocal termine")
                playAdhanOrFinish(gen)
            }
            return
        }
        playMedia(url, gen) {
            if (gen != generation) return@playMedia
            playAdhanOrFinish(gen)
        }
    }

    private fun playAdhanOrFinish(gen: Int) {
        if (gen != generation) return
        val p = current
        if (p == null || p.adhanUrl.isEmpty()) {
            finishPlayback()
            return
        }
        playMedia(p.adhanUrl, gen) {
            if (gen != generation) return@playMedia
            finishPlayback()
        }
    }

    private fun finishPlayback() {
        stopAudioKeepNotification(discardQueue = false)
    }

    // ---------- lecture media ----------

    private fun estTts(u: String): Boolean = u.contains("api/tts")

    private fun texteTts(u: String): String {
        if (u.isEmpty()) return ""
        return try {
            val m = Regex("[?&]text=([^&]*)").find(u) ?: return ""
            java.net.URLDecoder.decode(m.groupValues[1], "UTF-8")
        } catch (e: Exception) { "" }
    }

    private fun playMedia(url: String, gen: Int, onEnd: () -> Unit) {
        try {
            player = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                setDataSource(url)
                setOnPreparedListener {
                    if (gen != generation) return@setOnPreparedListener
                    baseline = volumeSnapshot()
                    armAt = System.currentTimeMillis() + GRACE_MS
                    Log.i(TAG, "lecture demarree baseline=" + baseline)
                    it.start()
                }
                setOnCompletionListener {
                    if (gen != generation) return@setOnCompletionListener
                    Log.i(TAG, "lecture terminee")
                    onEnd()
                }
                setOnErrorListener { _, w, e ->
                    if (gen != generation) return@setOnErrorListener true
                    Log.e(TAG, "MediaPlayer erreur " + w + "/" + e)
                    onEnd()
                    true
                }
                prepareAsync()
            }
            handler.postDelayed({ onTimeout(gen, "media") }, MEDIA_TIMEOUT_MS)
        } catch (e: Exception) {
            Log.e(TAG, "MediaPlayer: " + e)
            onEnd()
        }
    }

    private fun onTimeout(gen: Int, what: String) {
        if (gen != generation) return
        Log.w(TAG, "delai depasse (" + what + ") -> arret de la lecture")
        stopAudioKeepNotification(discardQueue = false)
    }

    // ---------- capture des touches volume (ecran eteint) ----------

    @Volatile private var stopTriggered = false
    private var armAtMs = 0L

    private fun triggerStop(why: String) {
        if (stopTriggered) return
        if (armAtMs != 0L && System.currentTimeMillis() < armAtMs) return
        stopTriggered = true
        Log.i(TAG, "arret demande: " + why)
        handler.post { stopAudioKeepNotification(discardQueue = true) }
    }

    private fun startVolumeKeyCapture() {
        try {
            val ms = android.media.session.MediaSession(this, "IslamNoorAdhan")
            session = ms
            ms.setFlags(
                android.media.session.MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS or
                android.media.session.MediaSession.FLAG_HANDLES_MEDIA_BUTTONS
            )
            ms.setCallback(object : android.media.session.MediaSession.Callback() {
                override fun onMediaButtonEvent(mediaButtonIntent: android.content.Intent): Boolean {
                    val ke = mediaButtonIntent.getParcelableExtra<android.view.KeyEvent>(
                        android.content.Intent.EXTRA_KEY_EVENT)
                    if (ke != null && ke.action == android.view.KeyEvent.ACTION_DOWN &&
                        (ke.keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP ||
                         ke.keyCode == android.view.KeyEvent.KEYCODE_VOLUME_DOWN)) {
                        triggerStop("touche media " + ke.keyCode)
                        return true
                    }
                    return super.onMediaButtonEvent(mediaButtonIntent)
                }
                override fun onPause() { triggerStop("pause") }
                override fun onStop() { triggerStop("stop") }
            })

            val vp = object : android.media.VolumeProvider(
                android.media.VolumeProvider.VOLUME_CONTROL_RELATIVE, 20, 10) {
                override fun onAdjustVolume(direction: Int) {
                    if (direction != 0) triggerStop("volume dir=" + direction)
                }
                override fun onSetVolumeTo(volume: Int) {
                    triggerStop("volume set=" + volume)
                }
            }
            ms.setPlaybackToRemote(vp)

            ms.setPlaybackState(
                android.media.session.PlaybackState.Builder()
                    .setActions(
                        android.media.session.PlaybackState.ACTION_PLAY_PAUSE or
                        android.media.session.PlaybackState.ACTION_STOP)
                    .setState(android.media.session.PlaybackState.STATE_PLAYING, 0L, 1.0f)
                    .build()
            )
            ms.isActive = true
            armAtMs = System.currentTimeMillis() + 1200L
            Log.i(TAG, "capture volume active (mode relatif, haut + bas)")
        } catch (e: Exception) {
            Log.w(TAG, "capture volume: " + e)
        }
    }

    // ---------- surveillance de secours ----------

    private fun volumeSnapshot(): String {
        val am = audioManager ?: return ""
        return try {
            am.getStreamVolume(AudioManager.STREAM_ALARM).toString() + "/" +
            am.getStreamVolume(AudioManager.STREAM_MUSIC).toString() + "/" +
            am.getStreamVolume(AudioManager.STREAM_RING).toString() + "/" +
            am.getStreamVolume(AudioManager.STREAM_NOTIFICATION).toString()
        } catch (_: Exception) { "" }
    }

    private fun startVolumeWatch() {
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        baseline = volumeSnapshot()

        volumeObserver = object : ContentObserver(handler) {
            override fun onChange(selfChange: Boolean) {
                if (stopped || armAt == 0L) return
                if (System.currentTimeMillis() < armAt) return
                if (volumeSnapshot() != baseline) {
                    Log.i(TAG, "volume change detecte (observer)")
                    stopAudioKeepNotification(discardQueue = true)
                }
            }
        }
        try {
            contentResolver.registerContentObserver(
                Settings.System.CONTENT_URI, true, volumeObserver!!)
        } catch (_: Exception) {}

        handler.postDelayed(poll, POLL_MS)
    }

    // ---------- arret : audio coupe, notification conservee ----------

    private fun stopAudioKeepNotification(discardQueue: Boolean = true) {
        if (stopped) return
        stopped = true
        generation++
        handler.removeCallbacksAndMessages(null)

        try { player?.let { if (it.isPlaying) it.stop(); it.release() } } catch (_: Exception) {}
        player = null

        try { Speaker.stop() } catch (_: Exception) {}

        try { session?.let { it.isActive = false; it.release() } } catch (_: Exception) {}
        session = null

        try { volumeObserver?.let { contentResolver.unregisterContentObserver(it) } } catch (_: Exception) {}
        volumeObserver = null

        try { wakeLock?.let { if (it.isHeld) it.release() } } catch (_: Exception) {}
        wakeLock = null

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(Service.STOP_FOREGROUND_DETACH)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(false)
            }
        } catch (_: Exception) {}

        val next = if (discardQueue) null else queued
        queued = null
        current = null

        if (next != null) {
            // Lecture suivante : elle ne demarre qu'apres l'arret complet de la
            // precedente, donc jamais de chevauchement.
            Log.i(TAG, "enchainement sur " + next.eventId)
            beginPlayback(next)
            return
        }

        isPlaybackActive = false

        try {
            val n = NotificationHelper
                .build(this, curChannel, curTitle, curText, false, false)
                .setOngoing(false)
                .setAutoCancel(false)
                .build()
            NotificationManagerCompat.from(this).notify(FG_ID, n)
            Log.i(TAG, "notification conservee apres arret audio")
        } catch (e: Exception) {
            Log.w(TAG, "repost notif: " + e)
        }

        // stopSelfResult : si une nouvelle demande est arrivee entre-temps,
        // le service n'est pas arrete (sinon la lecture en cours serait coupee).
        try { stopSelfResult(lastStartId) } catch (_: Exception) { stopSelf() }
    }

    // ---------- divers ----------

    private fun acquireWake() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "IslamNoor:adhan")
                .also { it.acquire(600000L) }
        } catch (_: Exception) {}
    }

    private fun buzz() {
        try {
            val v: Vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                (getSystemService(Context.VIBRATOR_MANAGER_SERVICE)
                    as VibratorManager).defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 400, 200, 400), -1))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(longArrayOf(0, 400, 200, 400), -1)
            }
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        isPlaybackActive = false
        handler.removeCallbacksAndMessages(null)
        try { player?.release() } catch (_: Exception) {}
        player = null
        try { Speaker.stop() } catch (_: Exception) {}
        try { session?.let { it.isActive = false; it.release() } } catch (_: Exception) {}
        session = null
        try { volumeObserver?.let { contentResolver.unregisterContentObserver(it) } } catch (_: Exception) {}
        volumeObserver = null
        try { wakeLock?.let { if (it.isHeld) it.release() } } catch (_: Exception) {}
        wakeLock = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
