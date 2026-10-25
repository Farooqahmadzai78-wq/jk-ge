import { Sparkles, HelpCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { vibrate } from "@/lib/vibration";
import { playClick } from "@/lib/sfx";

interface PageTutorialButtonProps {
  onClick: () => void;
  variant?: "icon" | "pill" | "subtle" | "floating";
  className?: string;
  label?: string;
}

export function PageTutorialButton({
  onClick,
  variant = "icon",
  className = "",
  label,
}: PageTutorialButtonProps) {
  const { t } = useI18n();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate("button");
    playClick();
    onClick();
  };

  const buttonLabel = label || t.pageTutorial || "Guide";

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={buttonLabel}
        aria-label={buttonLabel}
        className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full overflow-hidden
          bg-gradient-to-r from-emerald-500/15 via-[#d4af37]/15 to-emerald-500/15
          hover:from-emerald-500/25 hover:via-[#d4af37]/25 hover:to-emerald-500/25
          text-emerald-700 dark:text-emerald-300
          border border-[#d4af37]/35 dark:border-[#d4af37]/45
          shadow-[0_2px_10px_-2px_rgba(212,175,55,0.25)]
          hover:shadow-[0_4px_16px_-2px_rgba(212,175,55,0.4)]
          text-xs font-bold tracking-wide backdrop-blur-md transition-all duration-300
          active:scale-95 cursor-pointer ${className}`}
      >
        {/* Subtle shimmer sweep on hover */}
        <span
          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
          aria-hidden="true"
        />
        <span className="relative flex items-center justify-center">
          <Sparkles className="size-3.5 text-[#d4af37] drop-shadow-[0_0_6px_rgba(212,175,55,0.6)] animate-pulse" />
        </span>
        <span className="relative font-display">{buttonLabel}</span>
        <span className="relative size-1.5 rounded-full bg-[#d4af37] shadow-[0_0_6px_#d4af37]" />
      </button>
    );
  }

  if (variant === "subtle") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={buttonLabel}
        aria-label={buttonLabel}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold
          text-muted-foreground hover:text-foreground
          bg-muted/40 hover:bg-muted/80 border border-border/40
          transition-all active:scale-95 cursor-pointer ${className}`}
      >
        <HelpCircle className="size-3.5 text-[#d4af37]" />
        <span>{buttonLabel}</span>
      </button>
    );
  }

  if (variant === "floating") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={buttonLabel}
        aria-label={buttonLabel}
        className={`fixed bottom-20 right-4 z-40 size-12 rounded-full
          bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 hover:from-emerald-500 hover:to-teal-700
          text-white shadow-[0_8px_24px_-4px_rgba(5,150,105,0.5),0_0_16px_rgba(212,175,55,0.4)]
          border-2 border-[#d4af37]/70 flex items-center justify-center
          transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md ${className}`}
      >
        <Sparkles className="size-5 text-[#f5e39b] drop-shadow-[0_0_8px_rgba(212,175,55,0.8)] animate-pulse" />
      </button>
    );
  }

  // Default "icon" button
  return (
    <button
      type="button"
      onClick={handleClick}
      title={buttonLabel}
      aria-label={buttonLabel}
      className={`group relative size-9 rounded-xl flex items-center justify-center
        bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-card/70 dark:hover:bg-card
        text-foreground/80 hover:text-foreground
        border border-[#d4af37]/35 hover:border-[#d4af37]/60
        shadow-[0_2px_8px_-2px_rgba(212,175,55,0.2)]
        hover:shadow-[0_4px_12px_-2px_rgba(212,175,55,0.35)]
        backdrop-blur-md transition-all duration-200 active:scale-90 cursor-pointer ${className}`}
    >
      <Sparkles className="size-4 text-[#d4af37] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 drop-shadow-[0_0_6px_rgba(212,175,55,0.5)]" />
    </button>
  );
}
