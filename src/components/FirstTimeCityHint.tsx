import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, X, MapPin, Check, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/app-settings";
import { playClick, playConfirm } from "@/lib/sfx";
import { vibrate } from "@/lib/vibration";

const STORAGE_KEY = "nur.has_seen_city_hint_v2";

export function markCityHintAsSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
    // Also trigger custom event in case multiple components are mounted
    window.dispatchEvent(new Event("nur:city_hint_dismissed"));
  } catch {
    // Ignore localStorage errors
  }
}

export function isCityHintSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

interface FirstTimeCityHintProps {
  onOpenCityPicker?: () => void;
}

export function FirstTimeCityHint({ onOpenCityPicker }: FirstTimeCityHintProps) {
  const { t } = useI18n();
  const { settings, ready } = useSettings();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready) return;

    // Check if user has already seen the hint
    const alreadySeen = isCityHintSeen();
    if (!alreadySeen) {
      // Small timeout for smooth entrance animation after page mount
      const timer = setTimeout(() => {
        setVisible(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [ready]);

  // Listen to external dismissal events (e.g. user opened city picker)
  useEffect(() => {
    const handleDismiss = () => setVisible(false);
    window.addEventListener("nur:city_hint_dismissed", handleDismiss);
    return () => window.removeEventListener("nur:city_hint_dismissed", handleDismiss);
  }, []);

  // If user changed city from default Makkah, automatically dismiss hint
  useEffect(() => {
    if (settings.place && settings.place.name !== "La Mecque" && settings.place.name !== "Makkah") {
      markCityHintAsSeen();
      setVisible(false);
    }
  }, [settings.place]);

  const handleDismiss = () => {
    playConfirm();
    vibrate("button");
    markCityHintAsSeen();
    setVisible(false);
  };

  const handleCardClick = () => {
    playClick();
    vibrate("button");
    markCityHintAsSeen();
    setVisible(false);
    if (onOpenCityPicker) {
      onOpenCityPicker();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="first-time-city-hint-container"
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-40 w-full max-w-md mx-auto my-2 px-3 select-none"
        >
          {/* Animated pointer arrow pointing up towards city pill */}
          <div className="flex justify-center -mb-2 relative z-10">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              className="flex items-center justify-center size-7 rounded-full bg-gradient-to-b from-[#c99e28] to-[#996e14] text-[#031510] border border-[#f5e39b]/60 shadow-[0_4px_12px_rgba(212,175,55,0.45)]"
            >
              <ArrowUp className="size-4 stroke-[2.75]" />
            </motion.div>
          </div>

          {/* Guide Card - Fond blanc élégant & cohérent */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #d4af37",
              boxShadow:
                "0 20px 50px -12px rgba(15, 23, 42, 0.25), 0 0 24px rgba(212, 175, 55, 0.25), inset 0 0 12px rgba(212, 175, 55, 0.08)",
            }}
            className="relative overflow-hidden rounded-[24px] text-stone-900 dark:bg-stone-900 dark:text-stone-100 p-4 sm:p-4.5"
          >
            {/* Ambient subtle luxury gold glow */}
            <div className="absolute -top-12 -right-12 size-36 bg-[#d4af37]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 size-32 bg-amber-200/25 dark:bg-amber-900/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex items-start gap-3.5 z-10">
              <div className="shrink-0 size-10 rounded-2xl bg-gradient-to-br from-amber-100 via-amber-50 to-stone-100 dark:from-amber-950/50 dark:to-stone-800 border border-[#d4af37]/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-[0_2px_10px_rgba(212,175,55,0.25)] mt-0.5">
                <MapPin className="size-5 text-amber-700 dark:text-amber-300 drop-shadow-xs" />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      <Sparkles className="size-2.5 text-[#d4af37]" />
                      Guide
                    </span>
                    <h4 className="font-display text-[14px] font-bold text-stone-900 dark:text-white tracking-wide">
                      {t.cityHintTitle || "Horaires de votre ville"}
                    </h4>
                  </div>
                  <button
                    id="dismiss-city-hint-btn"
                    onClick={handleDismiss}
                    aria-label="Fermer l'aide"
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-stone-200 dark:border-stone-700 bg-stone-100/90 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:border-[#d4af37] hover:text-stone-900 dark:hover:text-white transition active:scale-90 cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {/* Ligne séparatrice horizontale dorée scintillante et fine sous le titre */}
                <div className="relative my-2.5 h-[1.5px] w-full overflow-hidden rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent shadow-[0_0_6px_rgba(212,175,55,0.4)]">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-gold-shimmer" />
                </div>

                <p className="mt-1 font-sans text-xs text-stone-700 dark:text-stone-200 leading-relaxed font-medium">
                  {t.cityHintText ||
                    "Vous pouvez changer de ville pour obtenir les horaires de prière de votre emplacement."}
                </p>

                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    id="open-city-picker-from-hint-btn"
                    onClick={handleCardClick}
                    className="flex-1 py-2 px-3.5 rounded-full text-[#063326] font-display font-black text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_16px_rgba(212,175,55,0.55),0_0_8px_rgba(245,227,155,0.3)]"
                    style={{
                      background: "linear-gradient(135deg, #ffe58f 0%, #facc15 30%, #eab308 65%, #ca8a04 100%)",
                    }}
                  >
                    <MapPin className="size-3.5 stroke-[2.5]" />
                    <span>{t.changeCity || "Changer de ville"}</span>
                  </button>
                  <button
                    id="confirm-city-hint-btn"
                    onClick={handleDismiss}
                    className="py-2 px-3.5 rounded-full border border-stone-300 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 font-sans font-semibold text-xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="size-3.5 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
                    <span>{t.cityHintCta || "Compris"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
