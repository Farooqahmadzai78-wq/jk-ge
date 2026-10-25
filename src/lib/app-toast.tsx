import React from "react";
import type { ToastCategory, ToastType } from "@/components/AppToast";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  id?: string;
  description?: string;
  category?: ToastCategory;
  icon?: React.ReactNode;
  duration?: number;
  dir?: "ltr" | "rtl";
  action?: ToastAction;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  category?: ToastCategory;
  icon?: React.ReactNode;
  duration: number;
  dir?: "ltr" | "rtl";
  action?: ToastAction;
  customRender?: (id: string) => React.ReactNode;
  createdAt: number;
  updatedAt: number;
  updateCount: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastStore {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private maxVisibleToasts = 2;

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): ToastItem[] {
    return this.toasts;
  }

  private notify() {
    const snapshot = [...this.toasts];
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  public addToast(
    type: ToastType,
    title: string,
    options: ToastOptions = {},
    customRender?: (id: string) => React.ReactNode,
  ): string {
    const cleanTitle = (title || "").trim();
    if (!cleanTitle && !customRender) {
      return "";
    }

    const now = Date.now();
    const duration = options.duration ?? (type === "error" ? 3600 : 2200);

    // 1. Remplacement propre sur place si un identifiant stable est fourni (ex: personnalisation)
    //    ou si un toast strictement identique vient d'être émis (< 300 ms).
    const existingIndex = this.toasts.findIndex(
      (t) =>
        (options.id && t.id === options.id) ||
        (!customRender &&
          !t.customRender &&
          t.type === type &&
          t.category === options.category &&
          t.title === cleanTitle &&
          now - t.updatedAt < 300),
    );

    if (existingIndex !== -1) {
      const prev = this.toasts[existingIndex];
      const updated: ToastItem = {
        ...prev,
        type,
        title: cleanTitle,
        description: options.description,
        category: options.category ?? prev.category,
        icon: options.icon,
        duration,
        dir: options.dir ?? prev.dir,
        action: options.action,
        customRender,
        updatedAt: now,
        updateCount: prev.updateCount + 1,
      };
      this.toasts = this.toasts.map((item, idx) => (idx === existingIndex ? updated : item));
      this.notify();
      return updated.id;
    }

    const id =
      options.id || `toast-${now}-${Math.random().toString(36).slice(2, 7)}`;

    const newToast: ToastItem = {
      id,
      type,
      title: cleanTitle,
      description: options.description,
      category: options.category,
      icon: options.icon,
      duration,
      dir: options.dir,
      action: options.action,
      customRender,
      createdAt: now,
      updatedAt: now,
      updateCount: 0,
    };

    // Garde au maximum `maxVisibleToasts` éléments sans accumulation visuelle
    if (this.toasts.length >= this.maxVisibleToasts) {
      this.toasts = this.toasts.slice(this.toasts.length - (this.maxVisibleToasts - 1));
    }

    this.toasts = [...this.toasts, newToast];
    this.notify();

    return id;
  }

  public dismiss(id?: string | number) {
    if (!id) {
      if (this.toasts.length === 0) return;
      this.toasts = [];
    } else {
      const strId = String(id);
      const next = this.toasts.filter((t) => t.id !== strId);
      if (next.length === this.toasts.length) return;
      this.toasts = next;
    }
    this.notify();
  }

  public dismissAll() {
    if (this.toasts.length === 0) return;
    this.toasts = [];
    this.notify();
  }
}

export const toastStore = new ToastStore();

export const appToast = {
  success: (title: string, options?: ToastOptions) =>
    toastStore.addToast("success", title, options),
  error: (title: string, options?: ToastOptions) => toastStore.addToast("error", title, options),
  info: (title: string, options?: ToastOptions) => toastStore.addToast("info", title, options),
  warning: (title: string, options?: ToastOptions) =>
    toastStore.addToast("warning", title, options),
  custom: (renderFn: (id: string) => React.ReactNode, options?: { id?: string; duration?: number }) =>
    toastStore.addToast("info", "", options, renderFn),
  dismiss: (id?: string | number) => toastStore.dismiss(id),
  dismissAll: () => toastStore.dismissAll(),
};

// Aliases for convenient drop-in usage across components
export const showToast = appToast;
export const toast = appToast;
