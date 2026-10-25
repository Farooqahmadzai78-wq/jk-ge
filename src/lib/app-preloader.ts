import mosque from "@/assets/mosque.jpg";
import quranClosed from "@/assets/quran-closed.png";
import quranOpen from "@/assets/quran-open.png";
import scanProduct from "@/assets/scan-product.png";
import permissionsIllu from "@/assets/permissions-illu.png";
import splashLogo from "@/assets/images/splash_logo_crescent_1786275718969.jpg";
import categoryQuotidien from "@/assets/images/category_quotidien_1785582473894.jpg";
import categoryAdorations from "@/assets/images/category_adorations_1785582491908.jpg";
import categoryProtection from "@/assets/images/category_protection_new_1785585611011.jpg";
import categoryEvents from "@/assets/images/category_events_1785582524191.jpg";
import soothingBanner from "@/assets/images/cat_soothing_banner_1785678227815.jpg";
import powerfulBanner from "@/assets/images/cat_powerful_banner_1785678243172.jpg";
import calmBanner from "@/assets/images/cat_calm_banner_1785678259540.jpg";
import notifBg from "@/assets/images/reminder_notif_new_1786270350765.jpg";
import audioBg from "@/assets/images/reminder_audio_new_1786270363968.jpg";
import comboBg from "@/assets/images/reminder_combo_new_1786270378486.jpg";
import { fetchDayTimes } from "@/lib/prayer-times";
import { isOnboardingCompleted } from "@/lib/onboarding-state";
import { getWidgetThemeById } from "@/lib/customization-themes";
import type { Dict } from "@/lib/locales/en";

export interface PreloadProgress {
  step: number;
  totalSteps: number;
  percentage: number;
  status: string;
  statusKey?: keyof Dict;
}

const CRITICAL_IMAGES = [
  splashLogo,
  mosque,
  quranClosed,
  quranOpen,
  scanProduct,
  permissionsIllu,
  categoryQuotidien,
  categoryAdorations,
  categoryProtection,
  categoryEvents,
  soothingBanner,
  powerfulBanner,
  calmBanner,
  notifBg,
  audioBg,
  comboBg,
];

export async function runFullAppPreload(
  onProgress?: (p: PreloadProgress) => void,
  checkSettingsReady?: () => boolean,
): Promise<{ userLoggedIn: boolean; isFirstLaunch: boolean }> {
  const totalSteps = 5;

  const update = (
    step: number,
    statusKey: keyof Dict,
    defaultStatus: string,
    pctOverride?: number,
  ) => {
    const percentage = pctOverride ?? Math.round((step / totalSteps) * 100);
    onProgress?.({ step, totalSteps, percentage, status: defaultStatus, statusKey });
  };

  // ÉTAPE 1 : Initialisation des variables locales & mise en place immédiate des thèmes (0% -> 20%)
  update(1, "splashStep1", "Chargement des thèmes & des préférences...", 12);
  try {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const root = document.documentElement;
      const rawSettings = localStorage.getItem("nur.settings.v1") || localStorage.getItem("nur_app_settings");
      if (rawSettings) {
        try {
          const parsed = JSON.parse(rawSettings);
          const wTheme = parsed.widgetTheme || "w-grad-vert-chartreuse";
          const bgTheme = parsed.bgTheme || "bg-default";
          const borderTheme = parsed.widgetBorderTheme || "wb-anim-rubis-dore";

          root.dataset.widgetTheme = wTheme;
          root.dataset.bgTheme = bgTheme;
          root.dataset.widgetBorder = borderTheme;
          root.dataset.widgetBorderTheme = borderTheme;
          if (parsed.widgetColor) root.dataset.widget = parsed.widgetColor;
          if (parsed.bgColor) root.dataset.bg = parsed.bgColor;
          if (typeof parsed.dark === "boolean") root.classList.toggle("dark", parsed.dark);

          const activeWidget = getWidgetThemeById(wTheme);
          if (activeWidget) {
            root.style.setProperty("--w-from", activeWidget.from);
            root.style.setProperty("--w-to", activeWidget.to);
            root.style.setProperty("--w-fg", activeWidget.fg);
            root.style.setProperty(
              "--w-fill",
              activeWidget.gradient || `linear-gradient(135deg, ${activeWidget.from} 0%, ${activeWidget.to} 100%)`,
            );
            root.style.setProperty("--color-brand", activeWidget.from);
            root.style.setProperty("--color-brand-light", activeWidget.to);
            root.style.setProperty("--color-brand-foreground", activeWidget.fg);
            root.style.setProperty("--nav-active-text", activeWidget.from);
          }
        } catch {
          /* ignore corrupted local storage */
        }
      }
    }
  } catch (err) {
    console.warn("Preloader theme setup:", err);
  }

  let attempts = 0;
  while (checkSettingsReady && !checkSettingsReady() && attempts < 30) {
    await new Promise((r) => setTimeout(r, 40));
    attempts++;
  }
  update(1, "splashStep1", "Chargement des thèmes & des préférences...", 22);
  await new Promise((r) => setTimeout(r, 120));

  // ÉTAPE 2 : Calcul des horaires de prière en temps réel & localisation (22% -> 44%)
  update(2, "splashStep4", "Calcul des horaires de prière en temps réel...", 32);
  try {
    const savedPlaceRaw = typeof localStorage !== "undefined" ? localStorage.getItem("nur.place") : null;
    const settingsRaw = typeof localStorage !== "undefined" ? localStorage.getItem("nur.settings.v1") : null;
    let lat = 21.4225; // La Mecque par défaut
    let lon = 39.8262;
    let method = 12; // UOIF 12°
    let school = 0;

    if (savedPlaceRaw) {
      try {
        const parsed = JSON.parse(savedPlaceRaw);
        if (parsed?.lat && parsed?.lon) {
          lat = parsed.lat;
          lon = parsed.lon;
        }
      } catch {
        /* ignore */
      }
    }
    if (settingsRaw) {
      try {
        const parsedS = JSON.parse(settingsRaw);
        if (parsedS?.place?.lat && parsedS?.place?.lon) {
          lat = parsedS.place.lat;
          lon = parsedS.place.lon;
        }
        if (typeof parsedS?.method === "number") method = parsedS.method;
        if (typeof parsedS?.school === "number") school = parsedS.school;
      } catch {
        /* ignore */
      }
    }

    await Promise.race([
      fetchDayTimes(lat, lon, method, school),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch (err) {
    console.warn("Preloader prayer times warning:", err);
  }
  update(2, "splashStep4", "Calcul des horaires de prière en temps réel...", 44);
  await new Promise((r) => setTimeout(r, 120));

  // ÉTAPE 3 : Typographie & visuels essentiels de l'interface (44% -> 66%)
  update(3, "splashStep2", "Chargement de la typographie & des polices...", 52);
  try {
    if (typeof document !== "undefined" && "fonts" in document) {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]);
    }
  } catch (err) {
    console.warn("Fonts load warning:", err);
  }

  update(3, "splashStep3", "Préparation des visuels & de l'interface...", 60);
  const imagePromises = CRITICAL_IMAGES.map(
    (src) =>
      new Promise((resolve) => {
        if (typeof Image === "undefined") {
          resolve(true);
          return;
        }
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = resolve;
      }),
  );
  await Promise.race([Promise.allSettled(imagePromises), new Promise((r) => setTimeout(r, 1500))]);
  update(3, "splashStep3", "Préparation des visuels & de l'interface...", 66);
  await new Promise((r) => setTimeout(r, 120));

  // ÉTAPE 4 : Chargement réel des modules en arrière-plan (Carte satellite, Boussole AR, Coran, Halal) (66% -> 88%)
  update(4, "splashStep4", "Chargement de la boussole AR, carte satellite & modules...", 75);
  try {
    await Promise.race([
      Promise.allSettled([
        // Module Boussole AR & capteurs
        import("@/components/QiblaCompass"),
        import("@/components/QiblaARView"),
        import("@/hooks/useQiblaSensors"),
        import("@/lib/qibla-geo"),
        // Module Carte Satellite & Mosquées
        import("@/components/MosqueMap"),
        import("@/lib/mosques"),
        // Module Scanner Halal & Ingrédients
        import("@/lib/halal-engine"),
        // Module Coran
        import("@/lib/quran-data"),
      ]),
      new Promise((r) => setTimeout(r, 1800)),
    ]);
  } catch (err) {
    console.warn("Module preload non-blocking warning:", err);
  }
  update(4, "splashStep4", "Chargement de la boussole AR, carte satellite & modules...", 88);
  await new Promise((r) => setTimeout(r, 120));

  // ÉTAPE 5 : Finalisation de l'environnement & validation à 100% (88% -> 100%)
  update(5, "splashStep5", "Initialisation de l'environnement local...", 96);
  await new Promise((r) => setTimeout(r, 150));

  const isFirstLaunch = !isOnboardingCompleted();
  update(5, "splashReady", "L'application est prête !", 100);
  await new Promise((r) => setTimeout(r, 200));

  return { userLoggedIn: true, isFirstLaunch };
}
