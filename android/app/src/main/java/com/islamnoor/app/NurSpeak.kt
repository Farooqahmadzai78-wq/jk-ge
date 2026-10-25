package com.islamnoor.app

import android.content.Context
import android.media.AudioManager
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.Locale

object Speaker {
    private const val TAG = "NurSpeak"
    private var tts: TextToSpeech? = null
    private var ready = false
    @Volatile
    private var speaking = false
    private val pending = ArrayList<Triple<String, Boolean, Boolean>>()

    fun init(ctx: Context) {
        if (tts != null) return
        val app = ctx.applicationContext
        tts = TextToSpeech(app) { status ->
            ready = status == TextToSpeech.SUCCESS
            Log.i(TAG, "moteur pret=" + ready)
            if (ready) {
                val q = ArrayList(pending); pending.clear()
                for (p in q) speak(app, p.first, p.second, p.third, null)
            }
        }
    }

    /** Le moteur TTS est-il disponible (sinon le vocal ne peut pas etre lu) ? */
    fun isReady(): Boolean = ready && tts != null

    /** Indique si une synthese vocale native est en cours de lecture. */
    fun isSpeaking(): Boolean {
        if (speaking) return true
        return try {
            tts?.isSpeaking == true
        } catch (_: Exception) {
            false
        }
    }

    fun speak(ctx: Context, text: String, arabic: Boolean,
              alarm: Boolean, done: (() -> Unit)?) {
        if (text.isBlank()) { done?.invoke(); return }
        init(ctx)
        val t = tts
        if (t == null || !ready) {
            pending.add(Triple(text, arabic, alarm))
            Log.i(TAG, "en attente du moteur")
            return
        }
        try {
            val loc = if (arabic) Locale("ar") else Locale.FRENCH
            val r = t.setLanguage(loc)
            if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.w(TAG, "langue absente: " + loc + " -> repli francais")
                t.setLanguage(Locale.FRENCH)
            }
        } catch (_: Exception) {}
        val b = Bundle()
        b.putInt(TextToSpeech.Engine.KEY_PARAM_STREAM,
            if (alarm) AudioManager.STREAM_ALARM else AudioManager.STREAM_MUSIC)
        b.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f)
        t.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) {
                speaking = true
            }
            override fun onDone(id: String?) {
                speaking = false
                done?.invoke()
            }
            override fun onError(id: String?) {
                speaking = false
                done?.invoke()
            }
        })
        val id = "nur_" + System.currentTimeMillis()
        speaking = true
        val code = t.speak(text, TextToSpeech.QUEUE_FLUSH, b, id)
        if (code == TextToSpeech.ERROR) {
            speaking = false
        }
        Log.i(TAG, "parle code=" + code + " (" + (if (arabic) "ar" else "fr") +
            ", " + (if (alarm) "alarme" else "media") + ") : " + text.take(70))
    }

    fun stop() {
        speaking = false
        try { tts?.stop() } catch (_: Exception) {}
    }
}

@CapacitorPlugin(name = "NurSpeak")
class NurSpeakPlugin : Plugin() {

    @PluginMethod
    fun speak(call: PluginCall) {
        val text = call.getString("text") ?: ""
        val ar = call.getBoolean("arabic") ?: false
        Speaker.speak(context, text, ar, false, null)
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        Speaker.stop()
        call.resolve(JSObject().put("ok", true))
    }
}

object NurTts {
    const val SCRIPT = """
(function(){
  if (window.__nurTts2) return "deja";
  window.__nurTts2 = true;

  function log(m){ try { console.log('[NURTTS] ' + m); } catch(e){} }
  function plug(){ try { return window.Capacitor.Plugins.NurSpeak; } catch(e){ return null; } }

  function speak(text, ar){
    if (!text) return false;
    var p = plug();
    if (!p) { log('plugin absent'); return false; }
    try { p.speak({ text: String(text).slice(0,400), arabic: !!ar }); return true; }
    catch(e){ log('erreur speak ' + e); return false; }
  }
  window.__nurSpeak = speak;

  function textFrom(u){
    try {
      var m = /[?&]text=([^&]*)/.exec(u);
      if (m) return decodeURIComponent(m[1].replace(/\+/g,' '));
      m = /%22text%22%3A%22([^%]*)/.exec(u);
      if (m) return decodeURIComponent(m[1]);
      m = /"text"\s*:\s*"([^"]*)"/.exec(u);
      if (m) return m[1];
    } catch(e){}
    return '';
  }
  function isTts(u){
    if (!u) return false;
    u = String(u);
    return u.indexOf('api/tts') >= 0 ||
           (u.indexOf('_serverFn') >= 0 && u.toLowerCase().indexOf('tts') >= 0);
  }
  function dur(t){ return Math.max(1500, Math.min(20000, String(t).length * 90)); }

  try {
    var origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function(){
      var s = '';
      try { s = this.currentSrc || this.src || ''; } catch(e){}
      log('PLAY src=' + String(s).slice(0,90));
      try {
        if (isTts(s)) {
          var t = textFrom(s);
          var ar = s.indexOf('onyx') >= 0;
          log('intercepte -> voix native');
          speak(t, ar);
          var self = this;
          try { self.dispatchEvent(new Event('play')); } catch(e){}
          try { self.dispatchEvent(new Event('playing')); } catch(e){}
          setTimeout(function(){ try { self.dispatchEvent(new Event('ended')); } catch(e){} }, dur(t));
          return Promise.resolve();
        }
      } catch(e){ log('play err ' + e); }
      return origPlay.apply(this, arguments);
    };
  } catch(e){ log('patch play impossible ' + e); }

  try {
    var of = window.fetch;
    window.fetch = function(input, init){
      var u = '';
      try { u = (typeof input === 'string') ? input : (input && input.url) || ''; } catch(e){}
      if (u) log('FETCH ' + String(u).slice(0,90));
      if (isTts(u)) {
        var t = textFrom(u);
        if (!t && init && init.body) t = textFrom(String(init.body));
        log('fetch tts intercepte -> voix native');
        speak(t, u.indexOf('onyx') >= 0);
        return Promise.resolve(new Response(
          JSON.stringify({ result: '' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));
      }
      return of.apply(this, arguments);
    };
    log('fetch detourne');
  } catch(e){ log('patch fetch impossible ' + e); }

  try {
    var ox = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(m, u){
      try { if (u) { log('XHR ' + String(u).slice(0,90)); this.__nurUrl = u; } } catch(e){}
      return ox.apply(this, arguments);
    };
    var os = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(b){
      try {
        if (isTts(this.__nurUrl)) {
          var t = textFrom(this.__nurUrl) || textFrom(String(b || ''));
          log('xhr tts intercepte -> voix native');
          speak(t, String(this.__nurUrl).indexOf('onyx') >= 0);
          return;
        }
      } catch(e){}
      return os.apply(this, arguments);
    };
  } catch(e){ log('patch xhr impossible ' + e); }

  try {
    var ss = window.speechSynthesis;
    if (ss && typeof ss.speak === 'function') {
      var orig = ss.speak.bind(ss);
      ss.speak = function(u){
        try { if (speak(u && u.text, /^ar/i.test((u && u.lang) || ''))) return; } catch(e){}
        try { return orig(u); } catch(e){}
      };
      log('speechSynthesis detourne');
    } else {
      var fake = {
        speak: function(u){ speak(u && u.text, /^ar/i.test((u && u.lang) || '')); },
        cancel: function(){ try { plug() && plug().stop(); } catch(e){} },
        pause: function(){}, resume: function(){},
        getVoices: function(){ return []; },
        speaking: false, pending: false, paused: false,
        addEventListener: function(){}, removeEventListener: function(){}
      };
      try { window.speechSynthesis = fake; }
      catch(e){ try { Object.defineProperty(window,'speechSynthesis',{value:fake,configurable:true}); } catch(e2){} }
      if (typeof window.SpeechSynthesisUtterance !== 'function') {
        window.SpeechSynthesisUtterance = function(t){ this.text = t; this.lang = 'fr-FR'; };
      }
      log('speechSynthesis remplace');
    }
  } catch(e){ log('ss err ' + e); }

  log('shim v2 installe');
  return "ok";
})();
"""
}
