import { memo } from "react";
import { CloudSun, Moon, Sun, Sunrise, Sunset, Check } from "lucide-react";
import type { PrayerKey } from "@/lib/prayer-times";
import { ARABIC_NAMES, formatPrayerTime } from "@/lib/prayer-times";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/app-settings";
import { playClick } from "@/lib/sfx";
import { vibrate } from "@/lib/vibration";

const ICONS: Record<PrayerKey, React.ReactNode> = {
  Fajr: <Sunrise className="size-5" />,
  Dhuhr: <Sun className="size-5" />,
  Asr: <CloudSun className="size-5" />,
  Maghrib: <Sunset className="size-5" />,
  Isha: <Moon className="size-5" />,
};

export const PrayerRow = memo(function PrayerRow({
  prayerKey,
  time,
  active,
  iqama,
  iqamaDisplay,
  checked,
  onToggle,
}: {
  prayerKey: PrayerKey;
  time: string;
  active?: boolean;
  iqama?: string;
  iqamaDisplay?: string;
  checked?: boolean;
  onToggle?: () => void;
}) {
  const { t, locale } = useI18n();
  const { settings } = useSettings();
  const formattedTime = formatPrayerTime(time, {
    lang: locale,
    format: settings.timeFormat,
    country: settings.place?.country,
  });

  const handleToggle = () => {
    playClick();
    vibrate("button");
    if (onToggle) onToggle();
  };

  return (
    <div
      className={`flex items-center gap-2.5 sm:gap-3 rounded-2xl px-3 sm:px-3.5 py-2.5 transition-all ${
        active ? "widget" : "hover:bg-black/5 dark:hover:bg-white/[0.03]"
      }`}
    >
      {/* Optional Prayer Done Checkbox */}
      {onToggle && (
        <button
          type="button"
          onClick={handleToggle}
          title={
            checked
              ? `${t[prayerKey.toLowerCase() as "fajr"]} validée (cliquer pour annuler)`
              : `Marquer ${t[prayerKey.toLowerCase() as "fajr"]} comme accomplie`
          }
          aria-label={
            checked
              ? `${t[prayerKey.toLowerCase() as "fajr"]} validée`
              : `Marquer ${t[prayerKey.toLowerCase() as "fajr"]} comme accomplie`
          }
          className={`min-h-[44px] min-w-[44px] -ml-1 flex items-center justify-center shrink-0 cursor-pointer active:scale-95`}
        >
          <span
            className={`size-6 rounded-full flex items-center justify-center border transition-all ${
              checked
                ? "bg-emerald-500 border-emerald-400 text-emerald-950 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                : "border-white/30 dark:border-white/20 bg-white/10 dark:bg-white/5 hover:border-[#d4af37]/60"
            }`}
          >
            {checked && <Check className="size-3.5 stroke-[3]" />}
          </span>
        </button>
      )}

      <span className={`shrink-0 ${active ? "text-inherit" : "text-muted-foreground"}`}>
        {ICONS[prayerKey]}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-semibold text-sm text-left truncate" suppressHydrationWarning>
            {t[prayerKey.toLowerCase() as "fajr"]}
          </p>
          {(iqama || iqamaDisplay) && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-700 dark:text-amber-300">
              Iqama {iqamaDisplay || iqama}
            </span>
          )}
        </div>
      </div>

      <span
        className={`font-[var(--font-arabic)] text-base shrink-0 ${
          active ? "opacity-90" : "text-muted-foreground"
        }`}
      >
        {ARABIC_NAMES[prayerKey]}
      </span>

      <div className="ml-auto text-right shrink-0">
        <span
          className="font-mono text-sm font-bold tabular-nums"
          suppressHydrationWarning
        >
          {formattedTime}
        </span>
        <p className="text-[9px] text-muted-foreground font-sans font-medium uppercase tracking-wider">
          Adhan
        </p>
      </div>
    </div>
  );
});