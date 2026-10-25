import { describe, it, expect, beforeEach } from "vitest";
import { appToast, toastStore, type ToastItem } from "./app-toast";
import {
  CUSTOMIZATION_TOAST_DURATION_MS,
  CUSTOMIZATION_TOAST_ID,
  showCustomizationToast,
  type CustomizationToastCategory,
} from "./customization-toast";

describe("Mission N22 — Notifications de personnalisation unifiées et sans empilement", () => {
  beforeEach(() => {
    toastStore.dismissAll();
  });

  it("remplace la notification de personnalisation en cours au lieu d'empiler plusieurs bandeaux", () => {
    const snapshots: ToastItem[][] = [];
    const unsubscribe = toastStore.subscribe((items) => {
      snapshots.push(items);
    });

    const categories: CustomizationToastCategory[] = [
      "background",
      "border",
      "widget",
      "background",
      "gallery",
      "border",
    ];

    categories.forEach((cat, idx) => {
      showCustomizationToast(`Thème #${idx + 1} appliqué`, { category: cat });
    });

    const current = toastStore.getSnapshot();
    expect(current).toHaveLength(1);
    expect(current[0].id).toBe(CUSTOMIZATION_TOAST_ID);
    expect(current[0].title).toBe("Thème #6 appliqué");
    expect(current[0].category).toBe("border");
    expect(current[0].duration).toBe(CUSTOMIZATION_TOAST_DURATION_MS);
    expect(current[0].updateCount).toBe(5);
    expect(snapshots.every((snap) => snap.length <= 1)).toBe(true);

    appToast.dismiss(CUSTOMIZATION_TOAST_ID);
    expect(toastStore.getSnapshot()).toHaveLength(0);

    unsubscribe();
  });

  it("ignore proprement les messages vides ou composés uniquement d'espaces", () => {
    expect(showCustomizationToast("")).toBe("");
    expect(showCustomizationToast("    ")).toBe("");
    expect(toastStore.getSnapshot()).toHaveLength(0);
  });
});
