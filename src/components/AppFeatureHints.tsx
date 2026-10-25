import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowDown, X, Camera, Palette, Compass, Check, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { playClick, playConfirm } from "@/lib/sfx";
import { vibrate } from "@/lib/vibration";

// ==========================================
// 1. HALAL INGREDIENTS PHOTO HINT
// ==========================================
const HALAL_HINT_KEY = "nur.has_seen_halal_photo_hint_v1";

export function isHalalHintSeen(): boolean {
  try {
    return localStorage.getItem(HALAL_HINT_KEY) === "true";
  } catch {
    return true;
  }
}

export function markHalalHintAsSeen() {
  try {
    localStorage.setItem(HALAL_HINT_KEY, "true");
  } catch {
    // ignore
  }
}

interface HalalIngredientsHintProps {
  onTakePhoto?: () => void;
}

export function HalalIngredientsHint({ onTakePhoto }: HalalIngredientsHintProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isHalalHintSeen()) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    playConfirm();
    vibrate("button");
    markHalalHintAsSeen();
    setVisible(false);
  };

  const handleAction = () => {
    playClick();
    vibrate("button");
    markHalalHintAsSeen();
    setVisible(false);
    if (onTakePhoto) onTakePhoto();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="halal-ingredients-hint-container"
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-30 w-full mx-auto my-2 px-1 select-none max-w-md"
        >
          {/* Card */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #d4af37",
              boxShadow:
                "0 20px 50px -12px rgba(15, 23, 42, 0.25), 0 0 24px rgba(212, 175, 55, 0.25), inset 0 0 12px rgba(212, 175, 55, 0.08)",
            }}
            className="relative overflow-hidden rounded-[24px] text-stone-900 dark:bg-stone-900 dark:text-stone-100 p-4 sm:p-4.5"
          >
            <div className="absolute -top-12 -right-12 size-36 bg-[#d4af37]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 size-32 bg-amber-200/25 dark:bg-amber-900/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex items-start gap-3.5 z-10">
              <div className="shrink-0 size-10 rounded-2xl bg-gradient-to-br from-amber-100 via-amber-50 to-stone-100 dark:from-amber-950/50 dark:to-stone-800 border border-[#d4af37]/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-[0_2px_10px_rgba(212,175,55,0.25)] mt-0.5">
                <Camera className="size-5 text-amber-700 dark:text-amber-300 drop-shadow-xs" />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      <Sparkles className="size-2.5 text-[#d4af37]" />
                      Astuce
                    </span>
                    <h4 className="font-display text-[13.5px] font-bold text-stone-900 dark:text-white tracking-wide">
                      {t.halalHintTitle || "Photo des ingrédients (Halal / Haram)"}
                    </h4>
                  </div>
                  <button
                    id="dismiss-halal-hint-btn"
                    onClick={handleDismiss}
                    aria-label="Fermer"
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-stone-200 dark:border-stone-700 bg-stone-100/90 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:border-[#d4af37] transition active:scale-90 cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {/* Ligne séparatrice horizontale dorée scintillante et fine sous le titre */}
                <div className="relative my-2 h-[1.5px] w-full overflow-hidden rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent shadow-[0_0_6px_rgba(212,175,55,0.4)]">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-gold-shimmer" />
                </div>

                <p className="mt-1 text-xs text-stone-700 dark:text-stone-200 leading-relaxed font-sans font-medium">
                  {t.halalHintText ||
                    "Si le code-barres ne marche pas, si le produit n'est pas détecté ou s'il comporte un doute, vous pouvez ajouter une photo des ingrédients pour détecter directement s'il est Halal ou Haram."}
                </p>

                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    id="halal-hint-action-btn"
                    onClick={handleAction}
                    className="flex-1 py-2 px-3.5 rounded-full text-[#063326] font-display font-black text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_16px_rgba(212,175,55,0.55),0_0_8px_rgba(245,227,155,0.3)]"
                    style={{
                      background: "linear-gradient(135deg, #ffe58f 0%, #facc15 30%, #eab308 65%, #ca8a04 100%)",
                    }}
                  >
                    <Camera className="size-3.5 stroke-[2.5]" />
                    <span>{t.takeIngredientsPhoto || "Prendre une photo"}</span>
                  </button>
                  <button
                    id="confirm-halal-hint-btn"
                    onClick={handleDismiss}
                    className="py-2 px-3.5 rounded-full border border-stone-300 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-sans font-semibold text-xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="size-3.5 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
                    <span>{t.understood || "Compris"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Animated pointer arrow */}
          <div className="flex justify-center -mt-2 relative z-10">
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="flex items-center justify-center size-6.5 rounded-full bg-gradient-to-b from-[#c99e28] to-[#996e14] text-[#031510] border border-[#f5e39b]/70 shadow-[0_3px_12px_rgba(212,175,55,0.5)]"
            >
              <ArrowDown className="size-3.5 stroke-[3]" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==========================================
// 2. SETTINGS CUSTOMIZATION HINT
// ==========================================
const SETTINGS_HINT_KEY = "nur.has_seen_settings_customization_hint_v1";

export function isSettingsHintSeen(): boolean {
  try {
    return localStorage.getItem(SETTINGS_HINT_KEY) === "true";
  } catch {
    return true;
  }
}

export function markSettingsHintAsSeen() {
  try {
    localStorage.setItem(SETTINGS_HINT_KEY, "true");
  } catch {
    // ignore
  }
}

interface SettingsCustomizationHintProps {
  onExplore?: () => void;
}

export function SettingsCustomizationHint({ onExplore }: SettingsCustomizationHintProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isSettingsHintSeen()) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    playConfirm();
    vibrate("button");
    markSettingsHintAsSeen();
    setVisible(false);
  };

  const handleAction = () => {
    playClick();
    vibrate("button");
    markSettingsHintAsSeen();
    setVisible(false);
    if (onExplore) onExplore();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="settings-customization-hint-container"
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-30 w-full mx-auto my-2 px-1 select-none max-w-md"
        >
          {/* Card */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #d4af37",
              boxShadow:
                "0 20px 50px -12px rgba(15, 23, 42, 0.25), 0 0 24px rgba(212, 175, 55, 0.25), inset 0 0 12px rgba(212, 175, 55, 0.08)",
            }}
            className="relative overflow-hidden rounded-[24px] text-stone-900 dark:bg-stone-900 dark:text-stone-100 p-4 sm:p-4.5"
          >
            <div className="absolute -top-12 -right-12 size-36 bg-[#d4af37]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 size-32 bg-amber-200/25 dark:bg-amber-900/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex items-start gap-3.5 z-10">
              <div className="shrink-0 size-10 rounded-2xl bg-gradient-to-br from-amber-100 via-amber-50 to-stone-100 dark:from-amber-950/50 dark:to-stone-800 border border-[#d4af37]/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-[0_2px_10px_rgba(212,175,55,0.25)] mt-0.5">
                <Palette className="size-5 text-amber-700 dark:text-amber-300 drop-shadow-xs" />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      <Sparkles className="size-2.5 text-[#d4af37]" />
                      Thème
                    </span>
                    <h4 className="font-display text-[13.5px] font-bold text-stone-900 dark:text-white tracking-wide">
                      {t.settingsHintTitle || "Personnalisation Complète"}
                    </h4>
                  </div>
                  <button
                    id="dismiss-settings-hint-btn"
                    onClick={handleDismiss}
                    aria-label="Fermer"
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-stone-200 dark:border-stone-700 bg-stone-100/90 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:border-[#d4af37] transition active:scale-90 cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {/* Ligne séparatrice horizontale dorée scintillante et fine sous le titre */}
                <div className="relative my-2 h-[1.5px] w-full overflow-hidden rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent shadow-[0_0_6px_rgba(212,175,55,0.4)]">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-gold-shimmer" />
                </div>

                <p className="mt-1 text-xs text-stone-700 dark:text-stone-200 leading-relaxed font-sans font-medium">
                  {t.settingsHintText ||
                    "Vous pouvez changer la couleur des widgets, de l'arrière-plan, ou encore activer les bordures allumées (LED) et d'autres paramètres personnalisés."}
                </p>

                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    id="settings-hint-action-btn"
                    onClick={handleAction}
                    className="flex-1 py-2 px-3.5 rounded-full text-[#063326] font-display font-black text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_16px_rgba(212,175,55,0.55),0_0_8px_rgba(245,227,155,0.3)]"
                    style={{
                      background: "linear-gradient(135deg, #ffe58f 0%, #facc15 30%, #eab308 65%, #ca8a04 100%)",
                    }}
                  >
                    <Sparkles className="size-3.5 stroke-[2.5]" />
                    <span>{t.customizeNow || "Personnaliser"}</span>
                  </button>
                  <button
                    id="confirm-settings-hint-btn"
                    onClick={handleDismiss}
                    className="py-2 px-3.5 rounded-full border border-stone-300 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-sans font-semibold text-xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="size-3.5 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
                    <span>{t.understood || "Compris"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Animated pointer arrow */}
          <div className="flex justify-center -mt-2 relative z-10">
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="flex items-center justify-center size-6.5 rounded-full bg-gradient-to-b from-[#c99e28] to-[#996e14] text-[#031510] border border-[#f5e39b]/70 shadow-[0_3px_12px_rgba(212,175,55,0.5)]"
            >
              <ArrowDown className="size-3.5 stroke-[3]" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==========================================
// 3. PRAYERS QIBLA & AR HINT
// ==========================================
const PRAYERS_QIBLA_HINT_KEY = "nur.has_seen_prayers_qibla_hint_v1";

export function isPrayersQiblaHintSeen(): boolean {
  try {
    return localStorage.getItem(PRAYERS_QIBLA_HINT_KEY) === "true";
  } catch {
    return true;
  }
}

export function markPrayersQiblaHintAsSeen() {
  try {
    localStorage.setItem(PRAYERS_QIBLA_HINT_KEY, "true");
  } catch {
    // ignore
  }
}

interface PrayersQiblaARHintProps {
  onScrollToCompass?: () => void;
}

export function PrayersQiblaARHint({ onScrollToCompass }: PrayersQiblaARHintProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isPrayersQiblaHintSeen()) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    playConfirm();
    vibrate("button");
    markPrayersQiblaHintAsSeen();
    setVisible(false);
  };

  const handleAction = () => {
    playClick();
    vibrate("button");
    markPrayersQiblaHintAsSeen();
    setVisible(false);
    if (onScrollToCompass) onScrollToCompass();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="prayers-qibla-ar-hint-container"
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-30 w-full mx-auto my-2 px-1 select-none max-w-md"
        >
          {/* Card */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #d4af37",
              boxShadow:
                "0 20px 50px -12px rgba(15, 23, 42, 0.25), 0 0 24px rgba(212, 175, 55, 0.25), inset 0 0 12px rgba(212, 175, 55, 0.08)",
            }}
            className="relative overflow-hidden rounded-[24px] text-stone-900 dark:bg-stone-900 dark:text-stone-100 p-4 sm:p-4.5"
          >
            <div className="absolute -top-12 -right-12 size-36 bg-[#d4af37]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 size-32 bg-amber-200/25 dark:bg-amber-900/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex items-start gap-3.5 z-10">
              <div className="shrink-0 size-10 rounded-2xl bg-gradient-to-br from-amber-100 via-amber-50 to-stone-100 dark:from-amber-950/50 dark:to-stone-800 border border-[#d4af37]/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-[0_2px_10px_rgba(212,175,55,0.25)] mt-0.5">
                <Compass className="size-5 text-amber-700 dark:text-amber-300 drop-shadow-xs" />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      <Sparkles className="size-2.5 text-[#d4af37]" />
                      Boussole
                    </span>
                    <h4 className="font-display text-[13.5px] font-bold text-stone-900 dark:text-white tracking-wide">
                      {t.qiblaHintTitle || "Boussole & Réalité Augmentée"}
                    </h4>
                  </div>
                  <button
                    id="dismiss-prayers-qibla-hint-btn"
                    onClick={handleDismiss}
                    aria-label="Fermer"
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-stone-200 dark:border-stone-700 bg-stone-100/90 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:border-[#d4af37] transition active:scale-90 cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {/* Ligne séparatrice horizontale dorée scintillante et fine sous le titre */}
                <div className="relative my-2 h-[1.5px] w-full overflow-hidden rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent shadow-[0_0_6px_rgba(212,175,55,0.4)]">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-gold-shimmer" />
                </div>

                <p className="mt-1 text-xs text-stone-700 dark:text-stone-200 leading-relaxed font-sans font-medium">
                  {t.qiblaHintText ||
                    "Vous pouvez changer le style de la boussole et passer en mode Réalité Augmentée (AR) avec votre caméra pour repérer la direction de la Mecque."}
                </p>

                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    id="prayers-qibla-hint-action-btn"
                    onClick={handleAction}
                    className="flex-1 py-2 px-3.5 rounded-full text-[#063326] font-display font-black text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_16px_rgba(212,175,55,0.55),0_0_8px_rgba(245,227,155,0.3)]"
                    style={{
                      background: "linear-gradient(135deg, #ffe58f 0%, #facc15 30%, #eab308 65%, #ca8a04 100%)",
                    }}
                  >
                    <Compass className="size-3.5 stroke-[2.5]" />
                    <span>{t.openQiblaCompass || "Boussole & AR"}</span>
                  </button>
                  <button
                    id="confirm-prayers-qibla-hint-btn"
                    onClick={handleDismiss}
                    className="py-2 px-3.5 rounded-full border border-stone-300 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-sans font-semibold text-xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="size-3.5 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
                    <span>{t.understood || "Compris"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Animated pointer arrow */}
          <div className="flex justify-center -mt-2 relative z-10">
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="flex items-center justify-center size-6.5 rounded-full bg-gradient-to-b from-[#c99e28] to-[#996e14] text-[#031510] border border-[#f5e39b]/70 shadow-[0_3px_12px_rgba(212,175,55,0.5)]"
            >
              <ArrowDown className="size-3.5 stroke-[3]" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
