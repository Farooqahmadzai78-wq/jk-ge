import React from "react";
import { appToast, type ToastOptions } from "./app-toast";
import type { ToastCategory } from "@/components/AppToast";

export type CustomizationToastCategory = "widget" | "background" | "border" | "gallery" | "general";

export const CUSTOMIZATION_TOAST_ID = "islamnoor-customization-feedback";
export const CUSTOMIZATION_TOAST_DURATION_MS = 1750;

export interface CustomizationToastOptions {
  category?: CustomizationToastCategory;
  accentColor?: "amber" | "sky" | "emerald" | "purple" | "rose";
  icon?: React.ReactNode;
  duration?: number;
}

export function showCustomizationToast(
  message: string,
  options: CustomizationToastOptions = {},
): string {
  const cleanMessage = (message || "").trim();
  if (!cleanMessage) {
    return "";
  }

  const categoryMap: Record<CustomizationToastCategory, ToastCategory> = {
    widget: "widget",
    background: "background",
    border: "border",
    gallery: "gallery",
    general: "general",
  };

  const toastOptions: ToastOptions = {
    id: CUSTOMIZATION_TOAST_ID,
    category: categoryMap[options.category || "general"],
    icon: options.icon,
    duration: options.duration ?? CUSTOMIZATION_TOAST_DURATION_MS,
  };

  return appToast.success(cleanMessage, toastOptions);
}
