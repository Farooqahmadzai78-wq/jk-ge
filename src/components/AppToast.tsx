import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Check,
  AlertCircle,
  Info,
  AlertTriangle,
  Layers,
  Palette,
  Square,
  Image as ImageIcon,
  Volume2,
  Bell,
  Heart,
  Sparkles,
  BookOpen,
  Scan,
  ShieldCheck,
  X,
} from "lucide-react";
import { vibrate } from "@/lib/vibration";

export type ToastType = "success" | "info" | "error" | "warning";
export type ToastCategory =
  | "general"
  | "widget"
  | "background"
  | "border"
  | "gallery"
  | "audio"
  | "azan"
  | "quran"
  | "prayer"
  | "scanner"
  | "settings"
  | "dev"
  | "favorite"
  | "reminder"
  | "reciter";

export interface AppToastProps {
  id: string;
  type?: ToastType;
  category?: ToastCategory;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  duration?: number;
  updateCount?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dir?: "ltr" | "rtl";
  onDismiss: () => void;
}

function shouldReduceToastMotion(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const dataset = document.documentElement.dataset;
  if (
    dataset.animationIntensity === "none" ||
    dataset.animationIntensity === "reduced" ||
    dataset.batterySaver === "true"
  ) {
    return true;
  }
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

export const AppToast: React.FC<AppToastProps> = ({
  type = "info",
  category = "general",
  icon: customIcon,
  title,
  description,
  duration = 2200,
  updateCount = 0,
  action,
  dir = "ltr",
  onDismiss,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef(duration);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const reduceMotion = shouldReduceToastMotion();
  const isCustomizationCategory =
    category === "widget" ||
    category === "background" ||
    category === "border" ||
    category === "gallery";

  // Retour haptique discret à l'apparition ou au remplacement sur place
  useEffect(() => {
    vibrate("button");
  }, [updateCount]);

  // Réinitialise proprement le compte à rebours lorsqu'un toast est mis à jour sur place
  useEffect(() => {
    remainingTimeRef.current = duration;
    setIsPaused(false);
  }, [duration, title, description, updateCount]);

  // Minuteur d'auto-fermeture fiable (pause au survol/maintien, reprise propre au relâchement)
  useEffect(() => {
    if (isPaused) return;

    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismissRef.current();
    }, remainingTimeRef.current);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPaused, updateCount, title, description, duration]);

  const handlePause = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(450, remainingTimeRef.current - elapsed);
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  let borderClass = "border-border/85 dark:border-white/15";
  let iconBadgeClass =
    "bg-primary/15 text-primary border border-primary/25";
  let iconBadgeStyle: React.CSSProperties | undefined;
  let defaultIcon = <Info className="size-3.5 stroke-[2.5]" />;

  switch (type) {
    case "success":
      borderClass = isCustomizationCategory
        ? "border-border/90 dark:border-white/15"
        : "border-emerald-500/35 dark:border-emerald-400/35";
      iconBadgeClass = isCustomizationCategory
        ? "border border-black/10 dark:border-white/20 shadow-xs"
        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30";
      if (isCustomizationCategory) {
        iconBadgeStyle = {
          background: "var(--w-fill, linear-gradient(135deg, var(--w-from, #065f46), var(--w-to, #10b981)))",
          color: "var(--w-fg, #ffffff)",
        };
      }
      defaultIcon = <Check className="size-3.5 stroke-[2.75]" />;
      break;
    case "error":
      borderClass = "border-rose-500/40 dark:border-rose-400/40";
      iconBadgeClass =
        "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30";
      defaultIcon = <AlertCircle className="size-3.5 stroke-[2.5]" />;
      break;
    case "warning":
      borderClass = "border-amber-500/40 dark:border-amber-400/40";
      iconBadgeClass =
        "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30";
      defaultIcon = <AlertTriangle className="size-3.5 stroke-[2.5]" />;
      break;
    case "info":
    default:
      borderClass = "border-border/85 dark:border-white/15";
      iconBadgeClass =
        "bg-primary/15 text-primary border border-primary/25";
      defaultIcon = <Info className="size-3.5 stroke-[2.5]" />;
      break;
  }

  if (!customIcon) {
    if (category === "widget") {
      defaultIcon = <Palette className="size-3.5 stroke-[2.5]" />;
    } else if (category === "background") {
      defaultIcon = <Layers className="size-3.5 stroke-[2.5]" />;
    } else if (category === "border") {
      defaultIcon = <Square className="size-3.5 stroke-[2.5]" />;
    } else if (category === "gallery") {
      defaultIcon = <ImageIcon className="size-3.5 stroke-[2.5]" />;
    } else if (category === "audio" || category === "azan" || category === "reciter") {
      defaultIcon = <Volume2 className="size-3.5 stroke-[2.5]" />;
    } else if (category === "prayer" || category === "reminder") {
      defaultIcon = <Bell className="size-3.5 stroke-[2.5]" />;
    } else if (category === "quran") {
      defaultIcon = <BookOpen className="size-3.5 stroke-[2.5]" />;
    } else if (category === "scanner") {
      defaultIcon = <Scan className="size-3.5 stroke-[2.5]" />;
    } else if (category === "favorite") {
      defaultIcon = <Heart className="size-3.5 stroke-[2.5] fill-rose-500 text-rose-500" />;
      iconBadgeClass =
        "bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30";
      iconBadgeStyle = undefined;
    } else if (category === "settings") {
      defaultIcon = <ShieldCheck className="size-3.5 stroke-[2.5]" />;
    } else if (category === "dev") {
      defaultIcon = <Sparkles className="size-3.5 stroke-[2.5]" />;
    }
  }

  const activeIcon = customIcon || defaultIcon;
  const isMultiLine = Boolean(
    (description && description.trim().length > 0) || (title && title.length > 52),
  );

  return (
    <motion.div
      dir={dir}
      role={type === "error" ? "alert" : "status"}
      aria-atomic="true"
      data-testid="app-toast"
      data-toast-category={category}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.97 }}
      animate={
        reduceMotion
          ? { opacity: 1, transition: { duration: 0.1 } }
          : {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
            }
      }
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.1 } }
          : {
              opacity: 0,
              y: -10,
              scale: 0.97,
              transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
            }
      }
      drag={reduceMotion ? false : "y"}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.5, bottom: 0.08 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -24 || info.velocity.y < -260) {
          onDismiss();
        }
      }}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onTouchStart={handlePause}
      onTouchEnd={handleResume}
      onTouchCancel={handleResume}
      className={`group/toast pointer-events-auto relative inline-flex items-center gap-2.5 min-w-[180px] max-w-[min(92vw,420px)] w-fit ${
        isMultiLine
          ? "rounded-2xl py-2.5 px-3.5"
          : "rounded-2xl py-2 px-3"
      } border bg-card/96 dark:bg-card/96 text-card-foreground backdrop-blur-xl shadow-lg cursor-pointer select-none transform-gpu ${borderClass}`}
      onClick={onDismiss}
    >
      {/* Badge icône harmonisé avec le thème actif */}
      <div
        style={iconBadgeStyle}
        className={`flex items-center justify-center size-6 rounded-xl shrink-0 ${iconBadgeClass}`}
      >
        {activeIcon}
      </div>

      {/* Texte lisible en mode clair comme en mode sombre */}
      <div className="flex-1 min-w-0 flex flex-col justify-center pr-0.5 text-left">
        <p className="text-xs sm:text-[13px] font-bold text-card-foreground leading-snug tracking-tight break-words">
          {title}
        </p>
        {description && (
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-tight font-medium break-words">
            {description}
          </p>
        )}
      </div>

      {action && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
            onDismiss();
          }}
          className="shrink-0 px-2.5 py-1 rounded-xl bg-secondary hover:bg-secondary/80 active:scale-95 text-secondary-foreground font-bold text-[11px] transition"
        >
          {action.label}
        </button>
      )}

      <button
        type="button"
        aria-label="Fermer la notification"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="shrink-0 size-5 rounded-lg flex items-center justify-center text-muted-foreground hover:text-card-foreground hover:bg-secondary/70 transition opacity-70 group-hover/toast:opacity-100"
      >
        <X className="size-3 stroke-[2.5]" />
      </button>
    </motion.div>
  );
};
