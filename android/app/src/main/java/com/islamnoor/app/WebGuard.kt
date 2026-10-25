package com.islamnoor.app

object WebGuard {

 const val SCRIPT = """
(function(){
 if (window.__nurV === 6) { if (window.__nurPush) window.__nurPush(); return "deja"; }
 window.__nurV = 6;

 if (!window.__nurHooked6) {
 window.__nurHooked6 = 1;

 var lastGesture = 0;
 ['pointerdown','touchstart','mousedown','keydown','click'].forEach(function(e){
 document.addEventListener(e, function(){ lastGesture = Date.now(); }, true);
 });
 function byUser(){ return (Date.now() - lastGesture) < 20000; }

 // Seul l'adhan des recitateurs est filtre.
 // TTS, invocations, Coran : toujours autorises.
 function isAdhanSrc(u){
 u = (u || '').toLowerCase();
 if (!u) return false;
 if (u.indexOf('/api/tts') >= 0) return false;
 if (u.indexOf('text=') >= 0) return false;
 if (u.indexOf('everyayah') >= 0) return false;
 if (u.indexOf('alafasy') >= 0) return false;
 if (u.indexOf('quran') >= 0) return false;
 return u.indexOf('adhan-mp3') >= 0 ||
 u.indexOf('/adhan') >= 0 ||
 u.indexOf('azan') >= 0 ||
 u.indexOf('adhan_') >= 0;
 }

 try {
 var op = HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play = function(){
 var src = '';
 try { src = this.currentSrc || this.src || ''; } catch(e){}
 if (isAdhanSrc(src) && !byUser()) {
 try { this.pause(); } catch(e){}
 console.log('NURGUARD bloque adhan auto: ' + src.slice(-40));
 return Promise.reject(new DOMException('NurGuard','NotAllowedError'));
 }
 console.log('NURGUARD autorise: ' + (src ? src.slice(-46) : '(sans src)'));
 return op.apply(this, arguments);
 };
 } catch(e){}

 // Voix de synthese : bloquee seulement si l'app est en arriere-plan
 try {
 var ss = window.speechSynthesis;
 if (ss && ss.speak) {
 var os = ss.speak.bind(ss);
 ss.speak = function(u){
 if (document.hidden) {
 console.log('NURGUARD speech bloque (app en arriere-plan)');
 return;
 }
 console.log('NURGUARD speech autorise');
 return os(u);
 };
 }
 } catch(e){}

 // Bandeaux internes adhan/rappel : retires (notifications systeme a la place)
 try {
 new MutationObserver(function(){
 var l = document.querySelectorAll('[data-sonner-toast],[data-radix-toast-root]');
 for (var i=0;i<l.length;i++){
 var t = (l[i].innerText||'').toLowerCase();
 if (t.indexOf('adhan')>=0 || t.indexOf('azan')>=0 ||
 t.indexOf('rappel de pri')>=0) l[i].remove();
 }
 }).observe(document.documentElement,{childList:true,subtree:true});
 } catch(e){}
 }

 function settings(){
 try {
 for (var i=0;i<localStorage.length;i++){
 var v = localStorage.getItem(localStorage.key(i));
 if (!v || v.charAt(0) !== '{') continue;
 var o = null; try { o = JSON.parse(v); } catch(e){ continue; }
 if (o && typeof o === 'object' && ('imamId' in o) && ('notifications' in o)) return o;
 }
 } catch(e){}
 return {};
 }

 function times(){
 var txt = ''; try { txt = document.body.innerText || ''; } catch(e){ return null; }
 var n = ['Fajr','Dhuhr','Asr','Maghrib','Isha'], out = {};
 for (var i=0;i<n.length;i++){
 var m = txt.match(new RegExp(n[i]+"[^0-9]{0,40}(\\d{1,2}):(\\d{2})"));
 if (!m) return null;
 var h = m[1]; if (h.length < 2) h = '0'+h;
 out[n[i]] = h + ':' + m[2];
 }
 return out;
 }

  function push(){
  try {
  // Si l'application a deja synchronise les alarmes natives recemment, on ne
  // touche plus aux alarmes : elles sont armees avec les horaires et reglages
  // reellement choisis (le scraping du DOM ecraserait ces choix).
  try {
  var last = window.__nurNativeSyncedAt || 0;
  if (last && (Date.now() - last) < 60000) return;
  } catch(e){}
  var t = times(); if (!t) return;
  var s = settings();
 var rem = (typeof s.reminder === 'number') ? s.reminder : -1;
 if (rem < 0) {
 var mr = (document.body.innerText||'').match(/Rappel avant[^0-9]{0,30}(\d{1,2})\s*min/);
 rem = mr ? parseInt(mr[1],10) : 0;
 }
 window.Capacitor.Plugins.PrayerScheduler.syncAll({
 times: JSON.stringify(t),
 notifications: (s.notifications !== false),
 reminder: rem,
 mode: s.reminderMode || 'notification',
 imamId: s.imamId || '',
  origin: location.origin,
  settings: JSON.stringify(s),
  source: 'fallback'
  });
 } catch(e){}
 }
 window.__nurPush = push;

 setTimeout(push, 2500);
 if (window.__nurTimer) clearInterval(window.__nurTimer);
 window.__nurTimer = setInterval(push, 8000);
 return "ok";
})();
"""
}
