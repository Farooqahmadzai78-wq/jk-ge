import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LocaleCode } from "./i18n";
import { isRtl } from "./i18n";
import { getWidgetThemeById } from "./customization-themes";
import { syncDynamicBorderStylesToDom } from "./premium-themes";

export const WIDGET_COLORS = [
  "orange",
  "blue",
  "red",
  "green",
  "brown",
  "yellow",
  "black",
  "purple",
  "teal",
  "pink",
  "indigo",
  "emerald",
  "sunset",
  "ocean",
  "aurora",
  "peach",
  "berry",
  "lagoon",
  "gold",
  "midnight",
  "candy",
  "forest",
] as const;

export const BG_COLORS = [
  "white",
  "black",
  "lightorange",
  "lightblue",
  "red",
  "green",
  "cream",
  "sand",
  "mint",
  "lavender",
  "rose",
  "sky",
  "graphite",
  "dawn",
  "dusk",
  "meadow",
  "sorbet",
  "nightsky",
] as const;

/** Presets that use more than two blended colours. */
export const GRADIENT_WIDGETS: readonly string[] = [
  "sunset",
  "ocean",
  "aurora",
  "peach",
  "berry",
  "lagoon",
  "gold",
  "midnight",
  "candy",
  "forest",
];

export const GRADIENT_BGS: readonly string[] = ["dawn", "dusk", "meadow", "sorbet", "nightsky"];

export type WidgetColor = (typeof WIDGET_COLORS)[number];
export type BgColor = (typeof BG_COLORS)[number];

export type Mosque = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

export type SavedProduct = {
  code: string;
  name: string;
  brand: string;
  verdict: "halal" | "haram" | "doubtful" | "unknown";
  image?: string;
  ingredients?: string;
  reasons?: string[];
  certified?: boolean;
  source?: string;
  nutriscore?: string;
  novaGroup?: number;
  ecoscore?: string;
  allergens?: string[];
  traces?: string[];
  quantity?: string;
  testsPassed?: number;
  totalTests?: number;
};

export type Place = {
  name: string;
  country?: string;
  admin1?: string;
  lat: number;
  lon: number;
  timezone?: string;
};

export type CustomGalleryBg = {
  imageUrl: string;
  zoom: number; // 100 - 200
  blur: number; // 0 - 20
  brightness: number; // 50 - 150
  contrast: number; // 50 - 150
  overlayType: "dark" | "light" | "none";
  overlayOpacity: number; // 0 - 80
};

export type MosqueSetting = {
  id: string;
  slug?: string;
  name: string;
  city: string;
  country?: string;
  address?: string;
  lat: number;
  lon: number;
  timezone?: string;
  source?: "mawaqit" | "osm" | "custom";
  isOfficial?: boolean;
  jumua?: string;
  jumua2?: string;
  shuruq?: string;
};

export type Settings = {
  profileName: string;
  profileAvatarUrl: string;
  language: LocaleCode;
  widgetTheme: string;
  bgTheme: string;
  widgetBorderTheme: string;
  customGalleryBg: CustomGalleryBg | null;
  widgetColor: WidgetColor;
  bgColor: BgColor;
  dark: boolean;
  notifications: boolean;
  imamId: string;
  reminder: 0 | 5 | 15 | 30;
  method: number;
  school: 0 | 1;
  timeFormat: "auto" | "12h" | "24h";
  place: Place | null;
  manualPlace: boolean;
  /**
   * Localisation automatique : desactivee par defaut. Tant que l'utilisateur
   * ne l'active pas explicitement, la ville reste celle choisie (La Mecque au
   * premier lancement) et n'est jamais remplacee en silence.
   */
  autoGeolocation: boolean;
  tracking: { date: string; done: string[] };
  savedProducts: SavedProduct[];
  tasbihCount: number;
  compassStyle: 1 | 2 | 3 | 4;
  compassActive: boolean;
  permissionsSeen: boolean;
  mosque: MosqueSetting | null;
  reminderMode: "notification" | "audio" | "both";
  notifTemplate: string;
  customNotifText: string;
  audioReminder: string;
  customAudioText: string;
  quranMode: "normal" | "tajwid";
  quranFont: "uthmani" | "tajwid" | "indopak" | "scheherazade" | "amiri";
  quranFontSize: number;
  quranLineHeight: number;
  quranLetterSpacing: number;
  quranReciter: string;
  quranAudioSpeed: number;
  quranAutoPlayNext: boolean;
  fontSize: "normal" | "large" | "xlarge";
  iconSize: "small" | "normal" | "large";
  animationIntensity: "full" | "reduced" | "none";
  batterySaver: boolean;
  vibrateButtons: boolean;
  vibrateNotifications: boolean;
  vibrateAdhan: boolean;
};

/**
 * Ville de reference utilisee a la premiere installation : La Mecque.
 * Elle est remplacee par la ville choisie par l'utilisateur (ou par la
 * geolocalisation) et n/ecrase jamais un enregistrement existant.
 */
export const DEFAULT_PLACE: Place = {
  name: "La Mecque",
  country: "Arabie saoudite",
  lat: 21.4225,
  lon: 39.8262,
  timezone: "Asia/Riyadh",
};

export const DEFAULT_SETTINGS: Settings = {
  profileName: "",
  profileAvatarUrl: "",
  language: "en",
  widgetTheme: "w-grad-vert-chartreuse",
  bgTheme: "bg-default",
  widgetBorderTheme: "wb-anim-rubis-dore",
  customGalleryBg: null,
  widgetColor: "sunset",
  bgColor: "white",
  dark: false,
  notifications: true,
  imamId: "makkah",
  reminder: 15,
  method: 12,
  school: 0,
  timeFormat: "auto",
  place: { ...DEFAULT_PLACE },
  manualPlace: false,
  autoGeolocation: false,
  tracking: { date: "", done: [] },
  savedProducts: [],
  tasbihCount: 0,
  compassStyle: 2,
  compassActive: false,
  permissionsSeen: false,
  mosque: null,
  reminderMode: "notification",
  notifTemplate: "generic",
  customNotifText: "",
  audioReminder: "prepare",
  customAudioText: "",
  quranMode: "normal",
  quranFont: "uthmani",
  quranFontSize: 28,
  quranLineHeight: 2.2,
  quranLetterSpacing: 0,
  quranReciter: "ar.alafasy",
  quranAudioSpeed: 1,
  quranAutoPlayNext: true,
  fontSize: "normal",
  iconSize: "normal",
  animationIntensity: "full",
  batterySaver: false,
  vibrateButtons: true,
  vibrateNotifications: true,
  vibrateAdhan: true,
};

const STORAGE_KEY = "nur.settings.v1";

/**
 * Fusionne les preferences enregistrees avec les valeurs par defaut.
 *
 * Regle importante : les preferences deja enregistrees l'emportent TOUJOURS.
 * Les valeurs par defaut (anglais, La Mecque, textes personnalises vides) ne
 * s'appliquent qu'a la premiere installation, lors de laquelle rien n'est
 * encore enregistre. Une mise a jour de l'application ne reinitialise donc
 * pas les choix de l'utilisateur existant.
 */
export function mergeSettings(stored?: Partial<Settings> | null): Settings {
  if (!stored) {
    return { ...DEFAULT_SETTINGS, place: { ...DEFAULT_PLACE } };
  }
  const merged: Settings = { ...DEFAULT_SETTINGS, ...stored };
  if (!merged.place) {
    merged.place = { ...DEFAULT_PLACE };
  }
  // Standard animated border by default: Rubis & Or Royal ("wb-anim-rubis-dore")
  if (!merged.widgetBorderTheme || merged.widgetBorderTheme === "wb-rainbow-luxe") {
    merged.widgetBorderTheme = "wb-anim-rubis-dore";
  }
  return merged;
}

type Ctx = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetCustomization: () => void;
  ready: boolean;
};

const SettingsContext = createContext<Ctx>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
  updateSetting: () => {},
  resetCustomization: () => {},
  ready: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      let loaded: Partial<Settings> = {};
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        loaded = JSON.parse(raw) as Partial<Settings>;
      } else {
        const legacyApp = window.localStorage.getItem("nur_app_settings");
        if (legacyApp) {
          try {
            loaded = { ...loaded, ...JSON.parse(legacyApp) };
          } catch {
            /* ignore */
          }
        }
      }

      const savedPlace = window.localStorage.getItem("nur.place");
      if (savedPlace && !loaded.place) {
        try {
          loaded.place = JSON.parse(savedPlace);
        } catch {
          /* ignore */
        }
      }

      setSettings(() => mergeSettings(loaded));
    } catch {
      /* ignore corrupted storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      window.localStorage.setItem("nur_app_settings", JSON.stringify(settings));
      if (settings.place) {
        window.localStorage.setItem("nur.place", JSON.stringify(settings.place));
      }
    } catch {
      /* quota */
    }
    const root = document.documentElement;
    root.dataset.widgetTheme = settings.widgetTheme || "w-grad-vert-chartreuse";
    root.dataset.bgTheme = settings.bgTheme || "bg-default";
    root.dataset.widgetBorder = settings.widgetBorderTheme || "wb-anim-rubis-dore";
    root.dataset.widgetBorderTheme = settings.widgetBorderTheme || "wb-anim-rubis-dore";
    root.dataset.widget = settings.widgetColor;
    root.dataset.bg = settings.bgColor;
    root.classList.toggle("dark", settings.dark);
    root.lang = settings.language;
    root.dir = isRtl(settings.language) ? "rtl" : "ltr";
    root.dataset.fontSize = settings.fontSize || "normal";
    root.dataset.iconSize = settings.iconSize || "normal";
    root.dataset.animationIntensity = settings.animationIntensity || "full";
    root.dataset.batterySaver = settings.batterySaver ? "true" : "false";

    // Synchroniser les feuilles de style des bordures premium débloquées + variables du widget actif
    syncDynamicBorderStylesToDom();
    const activeWidget = getWidgetThemeById(settings.widgetTheme);
    if (activeWidget) {
      root.style.setProperty("--w-from", activeWidget.from);
      root.style.setProperty("--w-to", activeWidget.to);
      root.style.setProperty("--w-fg", activeWidget.fg);
      root.style.setProperty(
        "--w-fill",
        activeWidget.gradient || `linear-gradient(135deg, ${activeWidget.from} 0%, ${activeWidget.to} 100%)`
      );
      root.style.setProperty("--color-brand", activeWidget.from);
      root.style.setProperty("--color-brand-light", activeWidget.to);
      root.style.setProperty("--color-brand-foreground", activeWidget.fg);
      root.style.setProperty("--nav-active-text", activeWidget.from);
    }

    if (settings.customGalleryBg) {
      root.style.setProperty("--custom-bg-url", `url("${settings.customGalleryBg.imageUrl}")`);
      root.style.setProperty("--custom-bg-zoom", `${settings.customGalleryBg.zoom}%`);
      root.style.setProperty("--custom-bg-blur", `${settings.customGalleryBg.blur}px`);
      root.style.setProperty("--custom-bg-brightness", `${settings.customGalleryBg.brightness}%`);
      root.style.setProperty("--custom-bg-contrast", `${settings.customGalleryBg.contrast}%`);
      root.style.setProperty(
        "--custom-bg-overlay",
        settings.customGalleryBg.overlayType === "dark"
          ? `rgba(0,0,0,${settings.customGalleryBg.overlayOpacity / 100})`
          : settings.customGalleryBg.overlayType === "light"
            ? `rgba(255,255,255,${settings.customGalleryBg.overlayOpacity / 100})`
            : "transparent",
      );
    }
  }, [settings, ready]);

  const persistImmediately = useCallback((next: Settings) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.localStorage.setItem("nur_app_settings", JSON.stringify(next));
      if (next.place) {
        window.localStorage.setItem("nur.place", JSON.stringify(next.place));
      }
    } catch {
      /* quota */
    }
  }, []);

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        persistImmediately(next);
        return next;
      });
    },
    [persistImmediately],
  );

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        persistImmediately(next);
        return next;
      });
    },
    [persistImmediately],
  );

  const resetCustomization = useCallback(() => {
    setSettings((prev) => {
      const next: Settings = {
        ...prev,
        widgetTheme: DEFAULT_SETTINGS.widgetTheme,
        bgTheme: DEFAULT_SETTINGS.bgTheme,
        widgetBorderTheme: DEFAULT_SETTINGS.widgetBorderTheme,
        customGalleryBg: null,
        widgetColor: DEFAULT_SETTINGS.widgetColor,
        bgColor: DEFAULT_SETTINGS.bgColor,
        fontSize: DEFAULT_SETTINGS.fontSize,
        iconSize: DEFAULT_SETTINGS.iconSize,
        animationIntensity: DEFAULT_SETTINGS.animationIntensity,
        batterySaver: false,
      };
      persistImmediately(next);
      return next;
    });
  }, [persistImmediately]);

  const value = useMemo(
    () => ({ settings, update, updateSetting, resetCustomization, ready }),
    [settings, update, updateSetting, resetCustomization, ready],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
