import { useEffect, useRef, useState } from "react";
import {
  X,
  Volume2,
  Gauge,
  User,
  Repeat,
  Check,
  RotateCcw,
  Timer,
  Play,
  Pause,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/app-settings";
import { audio } from "@/lib/audio-player";
import { useI18n, type TranslateFn } from "@/lib/i18n";
import { vibrate } from "@/lib/vibration";

export const QURAN_RECITERS = [
  {
    id: "ar.alafasy",
    name: "Sheikh Mishary Rashid Alafasy",
    subKey: "reciterAlafasySub",
    sub: "Récitation mélodieuse et émouvante",
  },
] as const;

export function getReciterSampleUrls(reciterId: string): string[] {
  switch (reciterId) {
    case "ar.alafasy":
    default:
      return [
        "https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/1.mp3",
        "https://server8.mp3quran.net/afs/001.mp3",
        "https://everyayah.com/data/Alafasy_128kbps/001001.mp3",
      ];
  }
}

export function getSurahAudioUrl(surahNum: number, reciterId?: string): string {
  const rId = reciterId || "ar.alafasy";
  return `https://cdn.islamic.network/quran/audio-surah/128/${rId}/${surahNum}.mp3`;
}

export const AUDIO_SPEEDS = [0.75, 1.0, 1.25, 1.5] as const;
export const SLEEP_TIMER_OPTIONS = [
  { label: "Désactivée", value: null },
  { label: "10 min", value: 10 },
  { label: "20 min", value: 20 },
  { label: "30 min", value: 30 },
  { label: "1 heure", value: 60 },
] as const;

function sleepTimerLabel(value: number | null, t: TranslateFn): string {
  if (value === null) return t.disabled || t.off || "Désactivée";
  if (value === 60) return t.oneHour || "1 heure";
  if (value === 10) return t.tenMin || "10 min";
  if (value === 20) return t.twentyMin || "20 min";
  if (value === 30) return t.thirtyMin || "30 min";
  return `${value} min`;
}

interface QuranAudioMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSurahNum?: number;
}

export function QuranAudioMenuModal({
  isOpen,
  onClose,
  currentSurahNum,
}: QuranAudioMenuModalProps) {
  const { t } = useI18n();
  const { settings, update } = useSettings();

  const [previewingReciterId, setPreviewingReciterId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleTogglePreview = (e: React.MouseEvent, reciterId: string) => {
    e.stopPropagation();
    vibrate("button", settings);

    if (previewingReciterId === reciterId) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewingReciterId(null);
      setPreviewLoading(false);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    audio.pause();

    setPreviewingReciterId(reciterId);
    setPreviewLoading(true);

    const urls = getReciterSampleUrls(reciterId);
    let index = 0;

    const playNext = () => {
      if (index >= urls.length) {
        setPreviewLoading(false);
        setPreviewingReciterId(null);
        previewAudioRef.current = null;
        return;
      }

      const currentUrl = urls[index];
      index++;

      const audioEl = new Audio(currentUrl);
      previewAudioRef.current = audioEl;

      audioEl.onended = () => {
        setPreviewingReciterId(null);
        setPreviewLoading(false);
        previewAudioRef.current = null;
      };

      audioEl.onerror = () => {
        if (previewAudioRef.current === audioEl) {
          playNext();
        }
      };

      audioEl
        .play()
        .then(() => {
          setPreviewLoading(false);
        })
        .catch(() => {
          if (previewAudioRef.current === audioEl) {
            playNext();
          }
        });
    };

    playNext();
  };

  const currentReciter = settings.quranReciter || "ar.alafasy";
  const currentSpeed = settings.quranAudioSpeed || 1.0;
  const autoPlayNext = settings.quranAutoPlayNext ?? true;
  const loopSurah = audio.state.loopSurah;
  const sleepTimerMinutes = audio.state.sleepTimerMinutes;
  const sleepTimerRemaining = audio.state.sleepTimerRemaining;

  const handleSelectReciter = (reciterId: string) => {
    vibrate("button", settings);
    update({ quranReciter: reciterId });
    audio.setReciter(reciterId);

    const activeState = audio.state;
    if (activeState.id && activeState.id.startsWith("surah-")) {
      const num = parseInt(activeState.id.replace("surah-", ""), 10);
      if (!isNaN(num)) {
        void audio.playSurah(num, { reciterId }).catch(() => {});
      }
    }
  };

  const handleSelectSpeed = (speed: number) => {
    vibrate("button", settings);
    update({ quranAudioSpeed: speed });
    audio.setPlaybackRate(speed);
  };

  const handleToggleAutoPlay = () => {
    vibrate("button", settings);
    const next = !autoPlayNext;
    update({ quranAutoPlayNext: next });
    audio.setAutoPlayNext(next);
  };

  const handleToggleLoopSurah = () => {
    vibrate("button", settings);
    audio.setLoopSurah(!loopSurah);
  };

  const handleSelectSleepTimer = (val: number | null) => {
    vibrate("button", settings);
    audio.setSleepTimer(val);
  };

  const formatTimerRemaining = (seconds: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass bg-card/95 border border-emerald-500/30 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-5 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/60 bg-emerald-500/5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-2xl bg-emerald-600 text-white shadow-xs">
              <Volume2 className="size-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-foreground text-base">{t.quranAudioTitle}</h2>
              <p className="text-[11px] text-muted-foreground">{t.quranAudioSub}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition active:scale-90"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* 1. Playback Speed */}
          <div className="space-y-2.5">
            <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <Gauge className="size-3.5 text-emerald-600" />
              <span>{t.playbackSpeed}</span>
            </label>

            <div className="grid grid-cols-4 gap-2">
              {AUDIO_SPEEDS.map((sp) => {
                const isActive = currentSpeed === sp;
                return (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => handleSelectSpeed(sp)}
                    className={`py-2.5 rounded-2xl font-extrabold text-xs transition-all cursor-pointer ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-xs scale-[1.02]"
                        : "bg-secondary/60 hover:bg-secondary text-foreground border border-border/50"
                    }`}
                  >
                    {sp}x
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Reciter Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <User className="size-3.5 text-emerald-600" />
              <span>{t.chooseReciter}</span>
            </label>

            <div className="space-y-2">
              {QURAN_RECITERS.map((r) => {
                const isActive = currentReciter === r.id;
                return (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectReciter(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectReciter(r.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer select-none ${
                      isActive
                        ? "border-emerald-600 bg-emerald-500/10 dark:bg-emerald-500/20 shadow-xs ring-1 ring-emerald-500/30"
                        : "border-border/60 bg-secondary/40 hover:bg-secondary/80"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-extrabold text-xs text-foreground truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {t[r.subKey] || r.sub}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleTogglePreview(e, r.id)}
                        title={t.listenSample}
                        aria-label={`${t.listenSample} - ${r.name}`}
                        className={`grid size-8 place-items-center rounded-xl transition cursor-pointer ${
                          previewingReciterId === r.id
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-secondary/80 hover:bg-emerald-500/20 text-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                        }`}
                      >
                        {previewingReciterId === r.id ? (
                          previewLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Pause className="size-3.5 fill-current" />
                          )
                        ) : (
                          <Play className="size-3.5 fill-current ml-0.5" />
                        )}
                      </button>

                      {isActive && (
                        <span className="grid size-5 place-items-center rounded-full bg-emerald-600 text-white text-xs shrink-0">
                          <Check className="size-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Autoplay Next Surah Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/30 border border-border/50">
            <div className="space-y-0.5 pr-3">
              <span className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                <Repeat className="size-3.5 text-emerald-600" />
                <span>{t.autoPlayNext}</span>
              </span>
              <p className="text-[10px] text-muted-foreground">{t.autoPlayNextSub}</p>
            </div>

            <button
              type="button"
              onClick={handleToggleAutoPlay}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                autoPlayNext ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  autoPlayNext ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* 4. Loop Current Surah Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/30 border border-border/50">
            <div className="space-y-0.5 pr-3">
              <span className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                <RotateCcw className="size-3.5 text-emerald-600" />
                <span>{t.loopSurah}</span>
              </span>
              <p className="text-[10px] text-muted-foreground">{t.loopSurahSub}</p>
            </div>

            <button
              type="button"
              onClick={handleToggleLoopSurah}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                loopSurah ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  loopSurah ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* 5. Sleep Timer / Minuterie d'arrêt */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <Timer className="size-3.5 text-emerald-600" />
                <span>{t.sleepTimer}</span>
              </label>
              {sleepTimerRemaining && (
                <span className="font-mono text-[10px] text-emerald-600 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {formatTimerRemaining(sleepTimerRemaining)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {SLEEP_TIMER_OPTIONS.map((opt) => {
                const isActive = sleepTimerMinutes === opt.value;
                const label = sleepTimerLabel(opt.value, t);
                return (
                  <button
                    key={opt.value ?? "off"}
                    type="button"
                    onClick={() => handleSelectSleepTimer(opt.value)}
                    className={`py-2 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-xs scale-[1.02]"
                        : "bg-secondary/60 hover:bg-secondary text-foreground border border-border/50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/60 bg-secondary/20">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold cursor-pointer py-3"
            onClick={onClose}
          >
            {t.applySettings}
          </Button>
        </div>
      </div>
    </div>
  );
}
