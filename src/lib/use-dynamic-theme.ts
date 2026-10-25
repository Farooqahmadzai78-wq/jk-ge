import { useMemo } from "react";
import { useSettings } from "@/lib/app-settings";
import {
  getWidgetThemeById,
  getBgThemeById,
  getWidgetBorderThemeById,
  DEFAULT_WIDGET_THEME,
  DEFAULT_BG_THEME,
  DEFAULT_BORDER_THEME,
} from "@/lib/customization-themes";

/**
 * Calculates perceived brightness / luminance from a hex color string (#RRGGBB).
 * Returns true if the color is visually dark (luminance < 0.48).
 */
function isColorDark(hexColor: string): boolean {
  if (!hexColor || !hexColor.startsWith("#")) return false;
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6 && hex.length !== 3) return false;
  const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
  const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
  const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
  // ITU-R BT.709 relative luminance
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.52;
}

export function useDynamicTheme() {
  const { settings } = useSettings();

  return useMemo(() => {
    const widget = getWidgetThemeById(settings.widgetTheme) || DEFAULT_WIDGET_THEME;
    const bg = getBgThemeById(settings.bgTheme) || DEFAULT_BG_THEME;
    const border = getWidgetBorderThemeById(settings.widgetBorderTheme) || DEFAULT_BORDER_THEME;

    // Detect if current visual surface is dark or light
    let isDark = settings.dark;
    if (!settings.dark) {
      if (bg.textColor === "#FFFFFF" || bg.textColor?.toLowerCase() === "#ffffff" || bg.textColor === "#f8fafc") {
        isDark = true;
      } else if (bg.bgColor && isColorDark(bg.bgColor)) {
        isDark = true;
      } else if (settings.bgTheme.includes("sombre") || settings.bgTheme.includes("nuit") || settings.bgTheme.includes("noir")) {
        isDark = true;
      }
    }

    // Dynamic accent styles
    const accentFrom = widget.from;
    const accentTo = widget.to;
    const accentFg = widget.fg;
    const accentGradient =
      widget.gradient || `linear-gradient(135deg, ${accentFrom} 0%, ${accentTo} 100%)`;

    // Adaptive card styles with high contrast
    const cardBg = isDark
      ? "bg-slate-950/70 text-white backdrop-blur-xl"
      : "bg-white/90 text-slate-900 backdrop-blur-xl";

    const modalBg = isDark
      ? "bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/98 text-white"
      : "bg-gradient-to-b from-slate-50/95 via-white/95 to-slate-100/98 text-slate-900";

    const headerBg = isDark
      ? "bg-slate-950/90 border-white/10 text-white"
      : "bg-white/90 border-slate-200/80 text-slate-900";

    const subtleBorder = isDark
      ? "border-white/10 hover:border-white/20"
      : "border-slate-200/80 hover:border-slate-300";

    const textPrimary = isDark ? "text-white" : "text-slate-900";
    const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
    const textMuted = isDark ? "text-slate-400" : "text-slate-500";

    const activeBorderClass = border.borderClass || "wb-none";

    return {
      isDark,
      widget,
      bg,
      border,
      accentFrom,
      accentTo,
      accentFg,
      accentGradient,
      cardBg,
      modalBg,
      headerBg,
      subtleBorder,
      textPrimary,
      textSecondary,
      textMuted,
      activeBorderClass,
      borderGlow: border.glowColor,
    };
  }, [settings.widgetTheme, settings.bgTheme, settings.widgetBorderTheme, settings.dark]);
}
