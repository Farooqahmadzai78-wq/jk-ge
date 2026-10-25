import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lightbulb,
  Check,
  BookOpen,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { playClick, playConfirm } from "@/lib/sfx";
import { vibrate } from "@/lib/vibration";
import {
  isPageTutorialSeen,
  markPageTutorialAsSeen,
  getPageTutorial,
  type PageTutorialId,
  type PageTutorialData,
} from "@/lib/page-tutorials";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import { getInteractiveTour } from "@/lib/interactive-tours";
import { InteractivePageTour } from "@/components/InteractivePageTour";
import {
  isOnboardingCompleted,
  subscribeToOnboardingChange,
} from "@/lib/onboarding-state";

interface PageTutorialModalProps {
  pageId: PageTutorialId;
  isOpen: boolean;
  onClose: () => void;
  customTitle?: string;
}

export function PageTutorialModal({
  pageId,
  isOpen,
  onClose,
  customTitle,
}: PageTutorialModalProps) {
  const { t, locale } = useI18n();
  const closingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      closingRef.current = false;
    }
  }, [isOpen, pageId]);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    markPageTutorialAsSeen(pageId);
    playConfirm();
    vibrate("button");
    onClose();
  }, [pageId, onClose]);

  const handleTourClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    markPageTutorialAsSeen(pageId);
    onClose();
  }, [pageId, onClose]);

  // Étapes de présentation interactive de la page
  const interactiveSteps = useMemo(() => {
    return getInteractiveTour(pageId, t);
  }, [pageId, t]);

  const tutorialData: PageTutorialData = useMemo(() => {
    return getPageTutorial(pageId, locale);
  }, [pageId, locale]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  // Si des étapes de présentation sont définies pour la page, afficher la fenêtre modale
  if (interactiveSteps.length > 0) {
    return createPortal(
      <InteractivePageTour
        steps={interactiveSteps}
        onFinish={handleTourClose}
        onSkip={handleTourClose}
      />,
      document.body,
    );
  }

  // Sinon, afficher la modale de guide thématique enrichie
  return createPortal(
    <PageGuideDialogModal
      pageId={pageId}
      tutorialData={tutorialData}
      customTitle={customTitle}
      onClose={handleClose}
    />,
    document.body,
  );
}

interface PageGuideDialogModalProps {
  pageId: PageTutorialId;
  tutorialData: PageTutorialData;
  customTitle?: string;
  onClose: () => void;
}

function PageGuideDialogModal({
  tutorialData,
  customTitle,
  onClose,
}: PageGuideDialogModalProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const lastStepActionRef = useRef(0);
  const steps = tutorialData.steps || [];
  const totalSteps = Math.max(1, steps.length);
  const safeStepIdx = Math.min(stepIdx, totalSteps - 1);
  const currentStep = steps[safeStepIdx] || steps[0];
  const StepIcon = currentStep?.icon || BookOpen;
  const PageIcon = tutorialData.icon || Sparkles;

  const canAct = useCallback(() => {
    const now = Date.now();
    if (now - lastStepActionRef.current < 220) {
      return false;
    }
    lastStepActionRef.current = now;
    return true;
  }, []);

  // Keyboard & route navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (!canAct()) return;
        if (safeStepIdx < totalSteps - 1) {
          playClick();
          vibrate("button");
          setStepIdx((i) => Math.min(totalSteps - 1, i + 1));
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft" && safeStepIdx > 0) {
        e.preventDefault();
        if (!canAct()) return;
        playClick();
        vibrate("button");
        setStepIdx((i) => Math.max(0, i - 1));
      }
    };
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [safeStepIdx, totalSteps, onClose, canAct]);

  const handleNext = () => {
    if (!canAct()) return;
    if (safeStepIdx >= totalSteps - 1) {
      onClose();
    } else {
      playClick();
      vibrate("button");
      setStepIdx((i) => Math.min(totalSteps - 1, i + 1));
    }
  };

  const handlePrev = () => {
    if (!canAct()) return;
    playClick();
    vibrate("button");
    setStepIdx((i) => Math.max(0, i - 1));
  };

  // Verrouillage du scroll d'arrière-plan pour isoler totalement le guide
  useEffect(() => {
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      style={{ touchAction: "none" }}
    >
      {/* Dimmed backdrop with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#02130f]/95 dark:bg-[#010b09]/98 backdrop-blur-md"
      />

      {/* Main Guide Dialog Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          border: "1.5px solid #d4af37",
          boxShadow:
            "0 24px 70px -12px rgba(15, 23, 42, 0.35), 0 0 36px rgba(212, 175, 55, 0.25), inset 0 0 16px rgba(212, 175, 55, 0.08)",
        }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[28px] bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100"
      >
        {/* Ambient Top Glows */}
        <div className="absolute -top-16 -right-16 size-48 bg-[#d4af37]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 size-48 bg-amber-200/25 dark:bg-amber-900/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="relative flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-amber-100 via-amber-50 to-stone-100 dark:from-amber-950/50 dark:to-stone-800 border border-[#d4af37]/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-[0_2px_10px_rgba(212,175,55,0.25)]">
              <PageIcon className="size-5 text-amber-700 dark:text-amber-300 drop-shadow-xs" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  <Sparkles className="size-2.5 text-[#d4af37]" />
                  {t.stepNumber ? t.stepNumber.replace("{current}", String(safeStepIdx + 1)).replace("{total}", String(totalSteps)) : `Étape ${safeStepIdx + 1}/${totalSteps}`}
                </span>
                <span className="size-1 rounded-full bg-[#d4af37]" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  Guide
                </span>
              </div>
              <h2 className="font-display text-base font-bold text-stone-900 dark:text-white tracking-wide mt-0.5">
                {customTitle || tutorialData.pageName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le guide"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-stone-200 dark:border-stone-700 bg-stone-100/90 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:border-[#d4af37] hover:text-stone-900 dark:hover:text-white transition active:scale-90 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Ligne séparatrice horizontale dorée scintillante et fine sous le header */}
        <div className="relative h-[1.5px] w-full overflow-hidden bg-gradient-to-r from-transparent via-[#d4af37] to-transparent shadow-[0_0_6px_rgba(212,175,55,0.4)]">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-gold-shimmer" />
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="relative h-1 w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#d4af37] via-[#facc15] to-[#ca8a04] shadow-[0_0_8px_#fde047]"
            animate={{ width: `${((safeStepIdx + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          />
        </div>

        {/* Step Content Card */}
        <div className="p-5 sm:p-6 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep?.id || safeStepIdx}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-3.5"
            >
              {/* Step Badge & Title */}
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-gradient-to-br from-amber-100 via-amber-50 to-stone-100 dark:from-amber-950/50 dark:to-stone-800 border border-[#d4af37]/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-[0_2px_10px_rgba(212,175,55,0.25)] shrink-0">
                  <StepIcon className="size-5.5 text-amber-700 dark:text-amber-300 drop-shadow-xs" />
                </div>
                <div className="flex-1 min-w-0">
                  {currentStep?.badge && (
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      {currentStep.badge}
                    </span>
                  )}
                  <h3 className="font-display text-[17px] font-black text-stone-900 dark:text-white leading-snug">
                    {currentStep?.title}
                  </h3>
                </div>
              </div>

              {/* Ligne séparatrice horizontale dorée scintillante et fine sous le titre */}
              <div className="relative my-2 h-[1.5px] w-full overflow-hidden rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent shadow-[0_0_6px_rgba(212,175,55,0.4)]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-gold-shimmer" />
              </div>

              {/* Description */}
              <p className="font-sans text-[13px] leading-relaxed text-stone-700 dark:text-stone-200 font-medium bg-stone-50 dark:bg-stone-800/80 p-3.5 rounded-2xl border border-stone-200/90 dark:border-stone-700">
                {currentStep?.description}
              </p>

              {/* Pro Tip Callout if present */}
              {currentStep?.tip && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300/70 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-200">
                  <Lightbulb className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold text-amber-950 dark:text-amber-100 mr-1">Astuce :</span>
                    <span>{currentStep.tip}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between border-t border-stone-200 dark:border-stone-800 px-5 py-3.5 bg-stone-50/90 dark:bg-stone-900/90">
          {/* Step Pill Indicators */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (!canAct()) return;
                  playClick();
                  vibrate("button");
                  setStepIdx(i);
                }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  i === safeStepIdx
                    ? "w-5 h-2 bg-gradient-to-r from-[#ffe58f] via-[#facc15] to-[#ca8a04] shadow-[0_0_8px_#d4af37]"
                    : "size-2 bg-stone-300 dark:bg-stone-600 hover:bg-stone-400"
                }`}
                aria-label={t.stepNumber ? t.stepNumber.replace("{current}", String(i + 1)).replace("{total}", String(totalSteps)) : `Étape ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            {safeStepIdx > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="grid size-8 place-items-center rounded-full border border-stone-300 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition active:scale-90 cursor-pointer"
                aria-label={t.previous || "Précédent"}
              >
                <ChevronLeft className="size-4.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 font-display text-xs font-black uppercase tracking-wider text-[#063326] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-[0_4px_16px_rgba(212,175,55,0.55),0_0_8px_rgba(245,227,155,0.3)]"
              style={{
                background: "linear-gradient(135deg, #ffe58f 0%, #facc15 30%, #eab308 65%, #ca8a04 100%)",
              }}
            >
              <span>{safeStepIdx >= totalSteps - 1 ? "TERMINER" : "SUIVANT >"}</span>
              {safeStepIdx >= totalSteps - 1 ? (
                <Sparkles className="size-3.5 text-[#063326]" />
              ) : (
                <ChevronRight className="size-3.5 stroke-[3] text-[#063326]" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Hook to automatically check if tutorial was seen, with auto-opening for first visit
 * (only once main app onboarding is completed) and manual trigger helper.
 */
export function usePageTutorial(pageId: PageTutorialId, autoOpen = true) {
  const [isOpen, setIsOpen] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(() => isOnboardingCompleted());

  useEffect(() => {
    setOnboardingReady(isOnboardingCompleted());
    return subscribeToOnboardingChange(() => {
      setOnboardingReady(isOnboardingCompleted());
    });
  }, []);

  useEffect(() => {
    if (!autoOpen || !onboardingReady || isPageTutorialSeen(pageId)) {
      return;
    }
    const timer = setTimeout(() => {
      if (!isPageTutorialSeen(pageId) && isOnboardingCompleted()) {
        setIsOpen(true);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [pageId, autoOpen, onboardingReady]);

  const openTutorial = useCallback(() => {
    vibrate("button");
    playClick();
    setIsOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    markPageTutorialAsSeen(pageId);
    setIsOpen(false);
  }, [pageId]);

  return {
    isOpen,
    openTutorial,
    closeTutorial,
  };
}
