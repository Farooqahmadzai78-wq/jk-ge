import { useMemo, useState } from "react";
import { TrendingUp, Award, Calendar, BarChart2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type DailyHistory = Record<string, number>;

const HISTORY_KEY = "nur.tasbih_daily_history.v1";

export function getStoredHistory(): DailyHistory {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw) as DailyHistory;
    }
  } catch {
    /* ignore */
  }
  // Initial seed data for the last week so chart looks vibrant right away
  const seed: DailyHistory = {};
  const now = new Date();
  const sampleCounts = [66, 99, 132, 100, 165, 33, 0];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    seed[key] = sampleCounts[6 - i] ?? 0;
  }
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(seed));
  } catch {
    /* ignore */
  }
  return seed;
}

export function saveStoredHistory(history: DailyHistory) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* ignore */
  }
}

export function recordTasbihTap(increment = 1): DailyHistory {
  const history = getStoredHistory();
  const todayKey = new Date().toISOString().slice(0, 10);
  history[todayKey] = (history[todayKey] || 0) + increment;
  saveStoredHistory(history);
  return history;
}

export function setTodayTasbihCount(count: number): DailyHistory {
  const history = getStoredHistory();
  const todayKey = new Date().toISOString().slice(0, 10);
  history[todayKey] = count;
  saveStoredHistory(history);
  return history;
}

type Props = {
  currentCount: number;
  history: DailyHistory;
};

export function TasbihHistoryChart({ currentCount, history }: Props) {
  const { t, locale: userLocale } = useI18n();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    const days: { dateKey: string; dayLabel: string; fullDate: string; count: number; isToday: boolean }[] = [];
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);

    const localeTag = userLocale.startsWith("ar")
      ? "ar-SA"
      : userLocale === "ps"
        ? "ps-AF"
        : userLocale === "fa"
          ? "fa-IR"
          : userLocale === "ru"
            ? "ru-RU"
            : userLocale === "it"
              ? "it-IT"
              : userLocale === "en"
                ? "en-US"
                : "fr-FR";

    const todayText = t.today || "Aujourd'hui";

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const isToday = key === todayKey;

      const rawDayLabel = isToday
        ? todayText
        : d.toLocaleDateString(localeTag, { weekday: "short" });

      const dayLabel = rawDayLabel.charAt(0).toUpperCase() + rawDayLabel.slice(1);
      const fullDate = d.toLocaleDateString(localeTag, { day: "numeric", month: "short" });
      const count = isToday ? Math.max(currentCount, history[key] || 0) : history[key] || 0;

      days.push({
        dateKey: key,
        dayLabel,
        fullDate,
        count,
        isToday,
      });
    }
    return days;
  }, [currentCount, history, userLocale, t.today]);

  const totalWeek = useMemo(() => chartData.reduce((acc, d) => acc + d.count, 0), [chartData]);
  const avgDaily = useMemo(() => Math.round(totalWeek / 7), [totalWeek]);
  const maxDay = useMemo(() => Math.max(...chartData.map((d) => d.count), 1), [chartData]);

  // Active day details for preview tooltip
  const activeDay = selectedDayIndex !== null ? chartData[selectedDayIndex] : null;

  return (
    <div className="glass mt-6 p-5">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl bg-[var(--w-from)]/15 text-[var(--w-from)]">
            <BarChart2 className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold">
              {t.tasbih7DaysTrend || "Tendance des 7 derniers jours"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {t.tasbihDailyProgress || "Progression quotidienne des dhikrs"}
            </p>
          </div>
        </div>
      </div>

      {/* Metric badges */}
      <div className="my-3 grid grid-cols-3 gap-2 text-center">
        <div className="widget-soft rounded-xl p-2.5">
          <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="size-3" /> {t.tasbihTotal7d || "Total 7j"}
          </p>
          <p className="mt-0.5 text-base font-extrabold tabular-nums text-foreground">
            {totalWeek}
          </p>
        </div>
        <div className="widget-soft rounded-xl p-2.5">
          <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <TrendingUp className="size-3" /> {t.tasbihAvgPerDay || "Moy./jour"}
          </p>
          <p className="mt-0.5 text-base font-extrabold tabular-nums text-[var(--w-from)]">
            {avgDaily}
          </p>
        </div>
        <div className="widget-soft rounded-xl p-2.5">
          <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Award className="size-3" /> {t.tasbihRecord || "Record"}
          </p>
          <p className="mt-0.5 text-base font-extrabold tabular-nums text-foreground">{maxDay}</p>
        </div>
      </div>

      {/* Interactive Tooltip Banner */}
      {activeDay && (
        <div className="mb-2 p-2 rounded-xl bg-secondary/80 border border-border/60 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <span className="font-semibold text-foreground">
            {activeDay.dayLabel} ({activeDay.fullDate})
          </span>
          <span className="font-bold text-[var(--w-from)]">
            {activeDay.count} {t.tasbihRecitations || "récitations"}
          </span>
        </div>
      )}

      {/* Robust Native Bar Chart Visualization */}
      <div className="relative pt-4 pb-1">
        {/* Horizontal background reference lines */}
        <div className="absolute inset-x-0 top-4 bottom-7 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-border border-dashed w-full" />
          <div className="border-b border-border border-dashed w-full" />
          <div className="border-b border-border w-full" />
        </div>

        <div className="relative grid grid-cols-7 gap-1.5 sm:gap-2 h-36 items-end">
          {chartData.map((d, index) => {
            const heightPercent = maxDay > 0 ? Math.max(Math.round((d.count / maxDay) * 100), 4) : 4;
            const isSelected = selectedDayIndex === index;

            return (
              <button
                key={d.dateKey}
                type="button"
                onClick={() => setSelectedDayIndex(isSelected ? null : index)}
                onMouseEnter={() => setSelectedDayIndex(index)}
                className="group flex flex-col items-center justify-end h-full w-full py-1 relative focus:outline-hidden"
              >
                {/* Count value label above bar */}
                <span
                  className={`text-[9px] font-bold tabular-nums mb-1 transition-opacity ${
                    d.isToday || isSelected
                      ? "text-foreground opacity-100 font-extrabold"
                      : "text-muted-foreground opacity-70 group-hover:opacity-100"
                  }`}
                >
                  {d.count > 0 ? d.count : 0}
                </span>

                {/* Vertical Bar Container */}
                <div className="w-full flex-1 flex items-end justify-center px-1">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                      d.isToday
                        ? "bg-[var(--w-from)] shadow-xs scale-y-100"
                        : isSelected
                          ? "bg-[var(--w-from)]/80"
                          : "bg-[var(--w-from)]/30 group-hover:bg-[var(--w-from)]/55"
                    }`}
                  />
                </div>

                {/* Day label underneath */}
                <span
                  className={`text-[10px] mt-2 truncate w-full text-center block transition-colors ${
                    d.isToday
                      ? "font-extrabold text-[var(--w-from)]"
                      : isSelected
                        ? "font-bold text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {d.dayLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
