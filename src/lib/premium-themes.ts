import { useSyncExternalStore } from "react";
import {
  ALL_BG_THEMES,
  ALL_WIDGET_THEMES,
  WIDGET_BORDER_THEMES,
  registerExternalThemeLookup,
  type BgTheme,
  type WidgetBorderTheme,
  type WidgetTheme,
} from "./customization-themes";

/**
 * Système de thèmes premium évolutifs & générateur procédural local — Islam-Noor.
 *
 * - 100 % local : aucun appel à un modèle d'IA externe, aucun coût serveur, aucun plafond artificiel.
 * - Chaque vidéo récompensée volontaire confirmée par le SDK débloque exactement 2 thèmes
 *   dans la catégorie choisie avant visionnage :
 *     • Pack Arrière-plans ("backgrounds") -> 2 nouveaux arrière-plans premium
 *     • Pack Widgets ("widgets")           -> 2 nouveaux styles de widgets premium
 *     • Pack Bordures ("borders")          -> 2 nouvelles bordures premium
 * - Inclut les collections signatures ("Emerald Night", "Royal Gold", "Ivory Serenity",
 *   "Midnight Geometry", etc.) puis bascule automatiquement sur une génération procédurale
 *   infinie (palettes harmonieuses, dégradés multicouches, motifs géométriques islamiques SVG,
 *   textures subtiles et bordures animées/ciselées).
 * - Garantie d'unicité stricte : identifiants stables sans collision + empreinte visuelle
 *   empêchant tout doublon avec les thèmes gratuits existants ou les thèmes déjà débloqués.
 * - Persistance atomique et durable dans localStorage avec protection d'idempotence par
 *   identifiant de session publicitaire (aucune double récompense possible).
 */

export type PremiumPackType = "backgrounds" | "widgets" | "borders";

export const ITEMS_PER_PREMIUM_PACK = 2 as const;
export const PREMIUM_THEMES_STORAGE_KEY = "islamnoor_unlocked_premium_themes_v1";

export interface PremiumStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface UnlockedBorderCssSpec {
  id: string;
  borderClass: string;
  mode: "solid" | "animated" | "touch";
  colors: [string, string, string];
  glowColor: string;
  strokeWidth: string;
  borderStyle: "solid" | "double" | "groove";
}

export interface PersistedPremiumThemesState {
  version: 1;
  backgrounds: BgTheme[];
  widgets: WidgetTheme[];
  borders: WidgetBorderTheme[];
  borderSpecs: Record<string, UnlockedBorderCssSpec>;
  grantedSessionIds: string[];
  proceduralCursor: {
    backgrounds: number;
    widgets: number;
    borders: number;
  };
}

export interface UnlockPackResult {
  unlocked: boolean;
  alreadyGranted: boolean;
  error?: string;
  packType: PremiumPackType;
  backgrounds: BgTheme[];
  widgets: WidgetTheme[];
  borders: WidgetBorderTheme[];
}

export interface PackPreview {
  packType: PremiumPackType;
  backgrounds: BgTheme[];
  widgets: WidgetTheme[];
  borders: WidgetBorderTheme[];
}

const defaultStorage: PremiumStorageLike = {
  getItem: (key) => {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    if (typeof localStorage === "undefined") {
      throw new Error("localStorage unavailable");
    }
    localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    try {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

let activeStorage: PremiumStorageLike = defaultStorage;
let cachedState: PersistedPremiumThemesState | null = null;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore subscriber error
    }
  });
}

/* ============================================================================
   MOTIFS GÉOMÉTRIQUES ISLAMIQUES SVG ENCODÉS (DATA URI LÉGERS, ZÉRO RÉSEAU)
   ============================================================================ */

type GeometricPatternKind = "rub-el-hizb" | "rosette-12" | "mashrabiya" | "arabesque-diamond" | "linen-filigree";

function buildGeometricSvgDataUri(
  kind: GeometricPatternKind,
  strokeHex: string,
  opacity: number,
): string {
  const safeOpacity = Math.max(0.04, Math.min(0.32, Number(opacity.toFixed(3))));
  let svg = "";

  switch (kind) {
    case "rub-el-hizb":
      // Étoile octogonale islamique Rub el Hizb
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><g fill='none' stroke='${strokeHex}' stroke-opacity='${safeOpacity}' stroke-width='1.1'><rect x='14' y='14' width='36' height='36'/><rect x='14' y='14' width='36' height='36' transform='rotate(45 32 32)'/><circle cx='32' cy='32' r='6'/></g></svg>`;
      break;
    case "rosette-12":
      // Rosace géométrique andalouse
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'><g fill='none' stroke='${strokeHex}' stroke-opacity='${safeOpacity}' stroke-width='1'><polygon points='36,6 44,24 64,20 52,36 64,52 44,48 36,66 28,48 8,52 20,36 8,20 28,24'/><circle cx='36' cy='36' r='11'/></g></svg>`;
      break;
    case "mashrabiya":
      // Treillis moucharabieh ciselé
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><g fill='none' stroke='${strokeHex}' stroke-opacity='${safeOpacity}' stroke-width='1'><path d='M24 0L48 24L24 48L0 24Z'/><path d='M24 8L40 24L24 40L8 24Z'/><circle cx='24' cy='24' r='3'/></g></svg>`;
      break;
    case "arabesque-diamond":
      // Maillage losange palatial
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'><g fill='none' stroke='${strokeHex}' stroke-opacity='${safeOpacity}' stroke-width='1.05'><path d='M28 2L54 28L28 54L2 28Z'/><path d='M0 0L28 28L56 0M0 56L28 28L56 56'/></g></svg>`;
      break;
    case "linen-filigree":
      // Texture parchemin / filigrane subtil
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><g fill='none' stroke='${strokeHex}' stroke-opacity='${safeOpacity}' stroke-width='0.85'><path d='M0 20H40M20 0V40'/><circle cx='20' cy='20' r='7'/></g></svg>`;
      break;
  }

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/* ============================================================================
   COLLECTIONS SIGNATURES INITIALES (CURATED PREMIUM THEMES)
   ============================================================================ */

const RAW_CURATED_BG_PACK_THEMES: BgTheme[] = [
  {
    id: "bg-prem-emerald-night",
    name: "Emerald Night",
    category: "premium",
    bgColor: "#03221a",
    bgImage: `${buildGeometricSvgDataUri("rub-el-hizb", "#fbbf24", 0.14)}, radial-gradient(circle at 20% 15%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), linear-gradient(165deg, #021711 0%, #063729 52%, #04241c 100%)`,
    textColor: "#ecfdf5",
    description: "Nuit d'émeraude sacrée ornée d'étoiles Rub el Hizb dorées",
  },
  {
    id: "bg-prem-royal-gold",
    name: "Royal Gold",
    category: "premium",
    bgColor: "#1a1205",
    bgImage: `${buildGeometricSvgDataUri("rosette-12", "#fde047", 0.16)}, radial-gradient(circle at 80% 18%, rgba(245, 158, 11, 0.32) 0%, transparent 58%), linear-gradient(160deg, #140d02 0%, #3b2306 50%, #713f12 100%)`,
    textColor: "#fef9c3",
    description: "Or royal ciselé et rosaces palatiales aux reflets d'ambre",
  },
  {
    id: "bg-prem-ivory-serenity",
    name: "Ivory Serenity",
    category: "premium",
    bgColor: "#faf7f0",
    bgImage: `${buildGeometricSvgDataUri("linen-filigree", "#b45309", 0.11)}, radial-gradient(circle at 50% 0%, rgba(251, 191, 36, 0.16) 0%, transparent 60%), linear-gradient(180deg, #fffdf9 0%, #f7f1e3 55%, #efe5cf 100%)`,
    textColor: "#292524",
    description: "Sérénité d'ivoire parcheminé aux filigranes bronze apaisants",
  },
  {
    id: "bg-prem-midnight-geometry",
    name: "Midnight Geometry",
    category: "premium",
    bgColor: "#060d1f",
    bgImage: `${buildGeometricSvgDataUri("mashrabiya", "#93c5fd", 0.14)}, radial-gradient(circle at 75% 20%, rgba(56, 189, 248, 0.22) 0%, transparent 55%), linear-gradient(170deg, #030712 0%, #0b1938 52%, #172554 100%)`,
    textColor: "#e0f2fe",
    description: "Géométrie de minuit en moucharabieh saphir et argent céleste",
  },
  {
    id: "bg-prem-alhambra-mosaic",
    name: "Mosaïque d'Alhambra",
    category: "premium",
    bgColor: "#08292c",
    bgImage: `${buildGeometricSvgDataUri("arabesque-diamond", "#5eead4", 0.14)}, linear-gradient(160deg, #041d21 0%, #0d4a4e 52%, #115e59 100%)`,
    textColor: "#f0fdfa",
    description: "Zellige turquoise persan et entrelacs géométriques d'Andalousie",
  },
  {
    id: "bg-prem-medina-dawn",
    name: "Aube de Médine",
    category: "premium",
    bgColor: "#29151a",
    bgImage: `${buildGeometricSvgDataUri("rub-el-hizb", "#fda4af", 0.13)}, linear-gradient(165deg, #1d0c14 0%, #4c1d34 48%, #9a3412 100%)`,
    textColor: "#ffe4e6",
    description: "Lueur spirituelle de l'aube mêlant rose nacre et ambre doux",
  },
];

const CURATED_BG_PACK_THEMES: BgTheme[] = RAW_CURATED_BG_PACK_THEMES.map((item) => ({
  ...item,
  unlockedByReward: true,
}));

const RAW_CURATED_WIDGET_PACK_THEMES: WidgetTheme[] = [
  {
    id: "w-prem-emerald-night",
    name: "Emerald Night",
    category: "gradient",
    from: "#064e3b",
    to: "#0d9488",
    fg: "#ecfdf5",
    gradient: `${buildGeometricSvgDataUri("rub-el-hizb", "#fde68a", 0.16)}, linear-gradient(135deg, #022c22 0%, #065f46 52%, #0d9488 100%)`,
    description: "Émeraude nocturne rehaussée d'un maillage géométrique doré",
  },
  {
    id: "w-prem-royal-gold",
    name: "Royal Gold",
    category: "gradient",
    from: "#92400e",
    to: "#eab308",
    fg: "#ffffff",
    gradient: `${buildGeometricSvgDataUri("rosette-12", "#ffffff", 0.15)}, linear-gradient(135deg, #451a03 0%, #b45309 48%, #eab308 100%)`,
    description: "Or impérial ciselé aux reflets chauds de miel et bronze",
  },
  {
    id: "w-prem-ivory-serenity",
    name: "Ivory Serenity",
    category: "gradient",
    from: "#f5efe1",
    to: "#e6d5b8",
    fg: "#292524",
    gradient: `${buildGeometricSvgDataUri("linen-filigree", "#92400e", 0.12)}, linear-gradient(135deg, #fffdf8 0%, #f5ebd6 55%, #e6d5b8 100%)`,
    description: "Ivoire soyeux et calme minéral aux accents sable doré",
  },
  {
    id: "w-prem-midnight-geometry",
    name: "Midnight Geometry",
    category: "gradient",
    from: "#0f172a",
    to: "#1d4ed8",
    fg: "#f8fafc",
    gradient: `${buildGeometricSvgDataUri("mashrabiya", "#93c5fd", 0.16)}, linear-gradient(135deg, #020617 0%, #1e3a8a 55%, #2563eb 100%)`,
    description: "Saphir de minuit structuré d'un moucharabieh cristallin",
  },
  {
    id: "w-prem-samarkand-turquoise",
    name: "Turquoise de Samarcande",
    category: "gradient",
    from: "#115e59",
    to: "#2dd4bf",
    fg: "#ffffff",
    gradient: `${buildGeometricSvgDataUri("arabesque-diamond", "#ffffff", 0.14)}, linear-gradient(135deg, #042f2e 0%, #0f766e 50%, #14b8a6 100%)`,
    description: "Dôme turquoise étincelant inspiré de l'architecture timouride",
  },
  {
    id: "w-prem-cordoba-amber",
    name: "Ambre de Cordoue",
    category: "gradient",
    from: "#7c2d12",
    to: "#d97706",
    fg: "#fffbeb",
    gradient: `${buildGeometricSvgDataUri("rub-el-hizb", "#fde68a", 0.15)}, linear-gradient(135deg, #431407 0%, #9a3412 50%, #d97706 100%)`,
    description: "Cuivre andalou et bois de cèdre doré à la feuille",
  },
];

const CURATED_WIDGET_PACK_THEMES: WidgetTheme[] = RAW_CURATED_WIDGET_PACK_THEMES.map((item) => ({
  ...item,
  unlockedByReward: true,
}));

interface CuratedBorderDefinition {
  theme: WidgetBorderTheme;
  spec: UnlockedBorderCssSpec;
}

const RAW_CURATED_BORDER_PACK_DEFS: CuratedBorderDefinition[] = [
  {
    theme: {
      id: "wb-prem-emerald-night",
      name: "Emerald Night",
      badge: "Premium",
      category: "animated",
      categoryName: "Bordures premium débloquées",
      borderClass: "wb-prem-cls-emerald-night",
      description: "Liseré émeraude nocturne parcouru d'un fil d'or Rub el Hizb",
      glowColor: "rgba(16, 185, 129, 0.55)",
      previewColors: ["#065f46", "#10b981", "#fbbf24"],
    },
    spec: {
      id: "wb-prem-emerald-night",
      borderClass: "wb-prem-cls-emerald-night",
      mode: "animated",
      colors: ["#065f46", "#10b981", "#fbbf24"],
      glowColor: "rgba(16, 185, 129, 0.55)",
      strokeWidth: "2.4px",
      borderStyle: "solid",
    },
  },
  {
    theme: {
      id: "wb-prem-royal-gold",
      name: "Royal Gold",
      badge: "Premium",
      category: "animated",
      categoryName: "Bordures premium débloquées",
      borderClass: "wb-prem-cls-royal-gold",
      description: "Double éclat d'or royal, ambre pur et champagne nacré",
      glowColor: "rgba(234, 179, 8, 0.6)",
      previewColors: ["#fef08a", "#eab308", "#92400e"],
    },
    spec: {
      id: "wb-prem-royal-gold",
      borderClass: "wb-prem-cls-royal-gold",
      mode: "animated",
      colors: ["#fef08a", "#eab308", "#92400e"],
      glowColor: "rgba(234, 179, 8, 0.6)",
      strokeWidth: "2.5px",
      borderStyle: "solid",
    },
  },
  {
    theme: {
      id: "wb-prem-ivory-serenity",
      name: "Ivory Serenity",
      badge: "Premium",
      category: "solid",
      categoryName: "Bordures premium débloquées",
      borderClass: "wb-prem-cls-ivory-serenity",
      description: "Double filet ivoire nacré et bronze doux d'inspiration manuscrite",
      glowColor: "rgba(180, 83, 9, 0.32)",
      previewColors: ["#fffbeb", "#d6b98c", "#92400e"],
      strokeWidth: "3px",
      borderStyle: "double",
    },
    spec: {
      id: "wb-prem-ivory-serenity",
      borderClass: "wb-prem-cls-ivory-serenity",
      mode: "solid",
      colors: ["#d6b98c", "#b45309", "#fffbeb"],
      glowColor: "rgba(180, 83, 9, 0.28)",
      strokeWidth: "3px",
      borderStyle: "double",
    },
  },
  {
    theme: {
      id: "wb-prem-midnight-geometry",
      name: "Midnight Geometry",
      badge: "Premium",
      category: "touch",
      categoryName: "Bordures premium débloquées",
      borderClass: "wb-interact-prem-midnight-geometry",
      description: "Contour saphir nocturne réactif au toucher et éclats stellaires",
      glowColor: "rgba(56, 189, 248, 0.75)",
      previewColors: ["#1e3a8a", "#38bdf8", "#e0f2fe"],
    },
    spec: {
      id: "wb-prem-midnight-geometry",
      borderClass: "wb-interact-prem-midnight-geometry",
      mode: "touch",
      colors: ["#1e3a8a", "#38bdf8", "#e0f2fe"],
      glowColor: "rgba(56, 189, 248, 0.75)",
      strokeWidth: "2.8px",
      borderStyle: "solid",
    },
  },
  {
    theme: {
      id: "wb-prem-ottoman-star",
      name: "Étoile Ottomane",
      badge: "Premium",
      category: "animated",
      categoryName: "Bordures premium débloquées",
      borderClass: "wb-prem-cls-ottoman-star",
      description: "Ruban tournoyant turquoise d'Iznik, lapis et feuille d'or",
      glowColor: "rgba(20, 184, 166, 0.55)",
      previewColors: ["#0d9488", "#2563eb", "#facc15"],
    },
    spec: {
      id: "wb-prem-ottoman-star",
      borderClass: "wb-prem-cls-ottoman-star",
      mode: "animated",
      colors: ["#0d9488", "#2563eb", "#facc15"],
      glowColor: "rgba(20, 184, 166, 0.55)",
      strokeWidth: "2.4px",
      borderStyle: "solid",
    },
  },
  {
    theme: {
      id: "wb-prem-gilded-cedar",
      name: "Cèdre Doré",
      badge: "Premium",
      category: "solid",
      categoryName: "Bordures premium débloquées",
      borderClass: "wb-prem-cls-gilded-cedar",
      description: "Cannelure boisée ambre et cuivre ciselé de Fès",
      glowColor: "rgba(217, 119, 6, 0.45)",
      previewColors: ["#fde68a", "#d97706", "#78350f"],
      strokeWidth: "3px",
      borderStyle: "groove",
    },
    spec: {
      id: "wb-prem-gilded-cedar",
      borderClass: "wb-prem-cls-gilded-cedar",
      mode: "solid",
      colors: ["#d97706", "#78350f", "#fde68a"],
      glowColor: "rgba(217, 119, 6, 0.45)",
      strokeWidth: "3px",
      borderStyle: "groove",
    },
  },
];

const CURATED_BORDER_PACK_DEFS: CuratedBorderDefinition[] = RAW_CURATED_BORDER_PACK_DEFS.map(
  (def) => ({
    theme: { ...def.theme, unlockedByReward: true },
    spec: def.spec,
  }),
);

/* ============================================================================
   GÉNÉRATEUR PROCÉDURAL INFINI (PALETTES COHÉRENTES + CONTRASTE GARANTI)
   ============================================================================ */

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hue < 60) [r1, g1, b1] = [c, x, 0];
  else if (hue < 120) [r1, g1, b1] = [x, c, 0];
  else if (hue < 180) [r1, g1, b1] = [0, c, x];
  else if (hue < 240) [r1, g1, b1] = [0, x, c];
  else if (hue < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

function hslToRgba(h: number, s: number, l: number, alpha: number): string {
  const hex = hslToHex(h, s, l).replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

function readableForeground(hexA: string, hexB?: string): string {
  const lum = (hex: string) => {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.slice(0, 2), 16) || 0;
    const g = parseInt(clean.slice(2, 4), 16) || 0;
    const b = parseInt(clean.slice(4, 6), 16) || 0;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  const avg = hexB ? (lum(hexA) + lum(hexB)) / 2 : lum(hexA);
  return avg > 0.56 ? "#1c1917" : "#f8fafc";
}

const POETIC_PREFIXES = [
  "Nuit",
  "Aurore",
  "Jardin",
  "Palais",
  "Dôme",
  "Mosaïque",
  "Sérénité",
  "Éclat",
  "Filigrane",
  "Horizon",
  " Oasis",
  "Velours",
] as const;

const POETIC_MATERIALS = [
  "d'Émeraude",
  "d'Or Pur",
  "de Saphir",
  "d'Ivoire",
  "de Turquoise",
  "d'Ambre",
  "de Nacre",
  "de Lapis",
  "de Cèdre",
  "de Jaspe",
  "de Quartz",
  "d'Oud",
] as const;

const PATTERN_CYCLE: readonly GeometricPatternKind[] = [
  "rub-el-hizb",
  "rosette-12",
  "mashrabiya",
  "arabesque-diamond",
  "linen-filigree",
];

// Familles de teintes nobles (émeraude, or/ambre, saphir, turquoise, ivoire/sable, grenat/prune)
const NOBLE_HUE_ANCHORS = [158, 42, 218, 176, 34, 338, 196, 142, 258, 24] as const;

function buildPoeticName(index: number, categorySalt: number): string {
  const pIdx = (index + categorySalt * 3) % POETIC_PREFIXES.length;
  const mIdx = Math.floor((index * 5 + categorySalt * 7) / 2) % POETIC_MATERIALS.length;
  const edition = Math.floor(index / (POETIC_PREFIXES.length * 2)) + 1;
  const base = `${POETIC_PREFIXES[pIdx].trim()} ${POETIC_MATERIALS[mIdx]}`;
  return edition > 1 ? `${base} ${edition}` : base;
}

export function computeBgVisualSignature(theme: BgTheme): string {
  return `bg|${theme.bgColor.toLowerCase()}|${(theme.bgImage || "").toLowerCase()}|${theme.animClass || ""}`;
}

export function computeWidgetVisualSignature(theme: WidgetTheme): string {
  return `w|${theme.from.toLowerCase()}|${theme.to.toLowerCase()}|${(theme.gradient || "").toLowerCase()}|${theme.animClass || ""}`;
}

export function computeBorderVisualSignature(theme: WidgetBorderTheme): string {
  return `wb|${theme.category}|${theme.previewColors.map((c) => c.toLowerCase()).join(",")}|${theme.borderStyle || "solid"}`;
}

function generateProceduralBgAtStep(step: number): BgTheme {
  const anchor = NOBLE_HUE_ANCHORS[step % NOBLE_HUE_ANCHORS.length];
  // Angle d'or atténué autour de l'ancre pour préserver l'harmonie tout en garantissant l'infinité
  const drift = ((step * 29) % 36) - 18;
  const baseHue = (anchor + drift + 360) % 360;
  const accentHue = (baseHue + 38 + (step % 3) * 14) % 360;
  const isLightIvory = step % 5 === 2;

  const c1 = isLightIvory ? hslToHex(baseHue, 28, 96) : hslToHex(baseHue, 58, 8 + (step % 5) * 2);
  const c2 = isLightIvory ? hslToHex(baseHue, 34, 90) : hslToHex(baseHue, 54, 16 + (step % 6) * 2);
  const c3 = isLightIvory ? hslToHex(accentHue, 40, 83) : hslToHex(accentHue, 52, 24 + (step % 5) * 3);
  const patternStroke = isLightIvory ? hslToHex(accentHue, 62, 34) : hslToHex(accentHue, 82, 74);
  const glowRgba = hslToRgba(accentHue, 75, isLightIvory ? 65 : 52, isLightIvory ? 0.18 : 0.25);

  const pattern = PATTERN_CYCLE[step % PATTERN_CYCLE.length];
  const angle = 135 + ((step * 17) % 55);
  const radialX = 18 + ((step * 23) % 64);
  const radialY = 12 + ((step * 19) % 36);

  const bgImage = `${buildGeometricSvgDataUri(pattern, patternStroke, 0.13 + (step % 4) * 0.015)}, radial-gradient(circle at ${radialX}% ${radialY}%, ${glowRgba} 0%, transparent 58%), linear-gradient(${angle}deg, ${c1} 0%, ${c2} 52%, ${c3} 100%)`;
  const textColor = readableForeground(c1, c2);
  const id = `bg-prem-gen-${String(step + 1).padStart(4, "0")}-${c1.slice(1)}${c3.slice(1)}`;

  return {
    id,
    name: buildPoeticName(step, 1),
    category: "premium",
    bgColor: c1,
    bgImage,
    textColor,
    description: isLightIvory
      ? "Création procédurale ivoire & géométrie ciselée"
      : "Création procédurale profonde & entrelacs lumineux",
    unlockedByReward: true,
  };
}

function generateProceduralWidgetAtStep(step: number): WidgetTheme {
  const anchor = NOBLE_HUE_ANCHORS[(step + 2) % NOBLE_HUE_ANCHORS.length];
  const drift = ((step * 31) % 34) - 17;
  const fromHue = (anchor + drift + 360) % 360;
  const toHue = (fromHue + 28 + (step % 4) * 12) % 360;
  const isLight = step % 6 === 3;

  const from = isLight ? hslToHex(fromHue, 36, 92) : hslToHex(fromHue, 64, 20 + (step % 5) * 3);
  const mid = isLight ? hslToHex((fromHue + toHue) / 2, 42, 85) : hslToHex((fromHue + toHue) / 2, 66, 30 + (step % 4) * 3);
  const to = isLight ? hslToHex(toHue, 46, 76) : hslToHex(toHue, 70, 40 + (step % 5) * 3);
  const fg = readableForeground(from, to);
  const patternStroke = fg === "#1c1917" ? hslToHex(fromHue, 55, 28) : "#fde68a";
  const pattern = PATTERN_CYCLE[(step + 1) % PATTERN_CYCLE.length];
  const angle = 125 + ((step * 19) % 45);

  const id = `w-prem-gen-${String(step + 1).padStart(4, "0")}-${from.slice(1)}${to.slice(1)}`;
  return {
    id,
    name: buildPoeticName(step, 2),
    category: "gradient",
    from,
    to,
    fg,
    gradient: `${buildGeometricSvgDataUri(pattern, patternStroke, 0.14)}, linear-gradient(${angle}deg, ${from} 0%, ${mid} 50%, ${to} 100%)`,
    description: "Style premium généré avec motif géométrique harmonisé",
    unlockedByReward: true,
  };
}

function generateProceduralBorderAtStep(step: number): CuratedBorderDefinition {
  const anchor = NOBLE_HUE_ANCHORS[(step + 4) % NOBLE_HUE_ANCHORS.length];
  const drift = ((step * 23) % 32) - 16;
  const h1 = (anchor + drift + 360) % 360;
  const h2 = (h1 + 36 + (step % 3) * 18) % 360;
  const h3 = (h2 + 42) % 360;

  const c1 = hslToHex(h1, 78, 56);
  const c2 = hslToHex(h2, 82, 48);
  const c3 = hslToHex(h3, 86, 68);
  const glowColor = hslToRgba(h1, 80, 52, 0.55);

  const modes: readonly ("animated" | "solid" | "touch")[] = ["animated", "touch", "solid"];
  const mode = modes[step % modes.length];
  const slug = `${String(step + 1).padStart(4, "0")}-${c1.slice(1, 5)}${c2.slice(1, 5)}`;
  const id = `wb-prem-gen-${slug}`;
  const borderClass =
    mode === "touch" ? `wb-interact-prem-gen-${slug}` : `wb-prem-cls-gen-${slug}`;
  const solidStyles: readonly ("solid" | "double" | "groove")[] = ["double", "groove", "solid"];
  const borderStyle = mode === "solid" ? solidStyles[step % solidStyles.length] : "solid";
  const strokeWidth = borderStyle === "solid" ? "2.4px" : "3.2px";

  const theme: WidgetBorderTheme = {
    id,
    name: buildPoeticName(step, 3),
    badge: "Premium",
    category: mode,
    categoryName: "Bordures premium débloquées",
    borderClass,
    description:
      mode === "touch"
        ? "Bordure lumineuse interactive réactive au toucher et au défilement"
        : mode === "animated"
          ? "Ruban chromatique ciselé en rotation fluide continue"
          : "Encadrement architectural ciselé haute précision",
    glowColor,
    previewColors: [c1, c2, c3],
    strokeWidth,
    borderStyle,
    unlockedByReward: true,
  };

  const spec: UnlockedBorderCssSpec = {
    id,
    borderClass,
    mode,
    colors: [c1, c2, c3],
    glowColor,
    strokeWidth,
    borderStyle,
  };

  return { theme, spec };
}

/* ============================================================================
   ÉTAT PERSISTANT & VALIDATION SANS PERTE
   ============================================================================ */

function createEmptyState(): PersistedPremiumThemesState {
  return {
    version: 1,
    backgrounds: [],
    widgets: [],
    borders: [],
    borderSpecs: {},
    grantedSessionIds: [],
    proceduralCursor: {
      backgrounds: 0,
      widgets: 0,
      borders: 0,
    },
  };
}

function sanitizeLoadedState(raw: unknown): PersistedPremiumThemesState {
  const empty = createEmptyState();
  if (!raw || typeof raw !== "object") return empty;
  const obj = raw as Partial<PersistedPremiumThemesState>;

  const backgrounds = Array.isArray(obj.backgrounds)
    ? obj.backgrounds
        .filter(
          (b): b is BgTheme =>
            Boolean(b && typeof b.id === "string" && typeof b.name === "string" && typeof b.bgColor === "string"),
        )
        .map((b) => ({ ...b, unlockedByReward: true }))
    : [];

  const widgets = Array.isArray(obj.widgets)
    ? obj.widgets
        .filter(
          (w): w is WidgetTheme =>
            Boolean(
              w &&
                typeof w.id === "string" &&
                typeof w.name === "string" &&
                typeof w.from === "string" &&
                typeof w.to === "string",
            ),
        )
        .map((w) => ({ ...w, unlockedByReward: true }))
    : [];

  const borders = Array.isArray(obj.borders)
    ? obj.borders
        .filter(
          (b): b is WidgetBorderTheme =>
            Boolean(
              b &&
                typeof b.id === "string" &&
                typeof b.name === "string" &&
                typeof b.borderClass === "string" &&
                Array.isArray(b.previewColors),
            ),
        )
        .map((b) => ({ ...b, unlockedByReward: true }))
    : [];

  const borderSpecs: Record<string, UnlockedBorderCssSpec> =
    obj.borderSpecs && typeof obj.borderSpecs === "object" ? { ...obj.borderSpecs } : {};

  // Reconstitue les specs CSS manquantes pour les bordures curatées si besoin
  for (const b of borders) {
    if (!borderSpecs[b.id]) {
      const curated = CURATED_BORDER_PACK_DEFS.find((d) => d.theme.id === b.id);
      if (curated) {
        borderSpecs[b.id] = curated.spec;
      } else {
        borderSpecs[b.id] = {
          id: b.id,
          borderClass: b.borderClass,
          mode: b.category,
          colors: b.previewColors,
          glowColor: b.glowColor || "rgba(234, 179, 8, 0.45)",
          strokeWidth: b.strokeWidth || "2.4px",
          borderStyle: (b.borderStyle as "solid" | "double" | "groove") || "solid",
        };
      }
    }
  }

  const grantedSessionIds = Array.isArray(obj.grantedSessionIds)
    ? obj.grantedSessionIds.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];

  return {
    version: 1,
    backgrounds,
    widgets,
    borders,
    borderSpecs,
    grantedSessionIds,
    proceduralCursor: {
      backgrounds:
        typeof obj.proceduralCursor?.backgrounds === "number"
          ? Math.max(0, Math.floor(obj.proceduralCursor.backgrounds))
          : 0,
      widgets:
        typeof obj.proceduralCursor?.widgets === "number"
          ? Math.max(0, Math.floor(obj.proceduralCursor.widgets))
          : 0,
      borders:
        typeof obj.proceduralCursor?.borders === "number"
          ? Math.max(0, Math.floor(obj.proceduralCursor.borders))
          : 0,
    },
  };
}

export function getUnlockedPremiumThemesState(): PersistedPremiumThemesState {
  if (cachedState) return cachedState;
  try {
    const raw = activeStorage.getItem(PREMIUM_THEMES_STORAGE_KEY);
    if (raw) {
      cachedState = sanitizeLoadedState(JSON.parse(raw));
      syncDynamicBorderStylesToDom(cachedState);
      return cachedState;
    }
  } catch {
    // Stockage corrompu : ne jamais écraser ni planter, repartir sur un état sain en mémoire
  }
  cachedState = createEmptyState();
  return cachedState;
}

function persistStateAtomically(next: PersistedPremiumThemesState): void {
  const serialized = JSON.stringify(next);
  activeStorage.setItem(PREMIUM_THEMES_STORAGE_KEY, serialized);
  cachedState = next;
  syncDynamicBorderStylesToDom(next);
  notifyListeners();
}

/* ============================================================================
   INJECTION CSS DYNAMIQUE POUR LES BORDURES PREMIUM DÉBLOQUÉES
   ============================================================================ */

const DYNAMIC_BORDER_STYLE_ELEMENT_ID = "islamnoor-dynamic-premium-borders";

function buildBorderRuleCss(spec: UnlockedBorderCssSpec): string {
  const [c1, c2, c3] = spec.colors;
  const targets = [
    `[data-widget-border="${spec.id}"] .widget`,
    `[data-widget-border="${spec.id}"] .widget-glass`,
    `[data-widget-border="${spec.id}"] .widget-card`,
    `[data-widget-border="${spec.id}"] .widget-bordered`,
    `[data-widget-border="${spec.id}"] .glass`,
    `[data-widget-border="${spec.id}"] .setting-card`,
    `[data-widget-border="${spec.id}"] [data-widget-card]`,
    `[data-widget-border="${spec.id}"] [data-card]`,
    `.${spec.borderClass}`,
  ];

  if (spec.mode === "solid") {
    return `${targets.join(",\n")} {
  border: ${spec.strokeWidth} ${spec.borderStyle} ${c1} !important;
  box-shadow: inset 0 0 10px ${spec.glowColor}, 0 0 10px ${spec.glowColor} !important;
}`;
  }

  const afterTargets = targets.map((t) => `${t}::after`);
  if (spec.mode === "animated") {
    return `${targets.join(",\n")} {
  border-color: transparent !important;
  position: relative !important;
}
${afterTargets.join(",\n")} {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: ${spec.strokeWidth};
  background-origin: border-box;
  box-sizing: border-box;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none !important;
  z-index: 10;
  background-image: linear-gradient(135deg, ${c1}, ${c2}, ${c3}, ${c1}) !important;
  background-size: 300% 300% !important;
  animation: flow-border-gradient 6.5s ease infinite !important;
}`;
  }

  // mode === "touch"
  const activeAfterTargets = [
    `[data-widget-border="${spec.id}"] [data-touch-active="true"]::after`,
    `.${spec.borderClass}[data-touch-active="true"]::after`,
  ];
  return `${targets.join(",\n")} {
  border-color: transparent !important;
  position: relative !important;
  overflow: hidden !important;
}
${afterTargets.join(",\n")} {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: ${spec.strokeWidth};
  background-origin: border-box;
  box-sizing: border-box;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none !important;
  z-index: 15;
  opacity: 0.42;
  transition: opacity 0.2s ease;
  background-image: linear-gradient(135deg, ${c1}, ${c2}, ${c3}, ${c1}) !important;
  background-size: 250% 250%;
  animation: border-beam-travel 4.5s ease-in-out infinite;
}
${activeAfterTargets.join(",\n")} {
  opacity: 1 !important;
}
[data-widget-border="${spec.id}"] .touch-contact-pulse {
  background: radial-gradient(circle, ${c3}cc 0%, ${spec.glowColor} 50%, transparent 80%);
  border-color: ${c1};
}`;
}

export function syncDynamicBorderStylesToDom(
  state: PersistedPremiumThemesState = getUnlockedPremiumThemesState(),
): void {
  if (typeof document === "undefined") return;
  try {
    const specs = Object.values(state.borderSpecs);
    let styleEl = document.getElementById(DYNAMIC_BORDER_STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    if (specs.length === 0) {
      if (styleEl) styleEl.textContent = "";
      return;
    }
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = DYNAMIC_BORDER_STYLE_ELEMENT_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = specs.map(buildBorderRuleCss).join("\n\n");
  } catch {
    // ignore DOM injection error in SSR/headless environments
  }
}

/* ============================================================================
   SÉLECTION & GÉNÉRATION SANS DOUBLON (APERÇU + DÉBLOCAGE RÉEL)
   ============================================================================ */

function selectNextBgItems(
  state: PersistedPremiumThemesState,
  count: number,
): { items: BgTheme[]; nextCursor: number } {
  const usedIds = new Set<string>([
    ...ALL_BG_THEMES.map((t) => t.id),
    ...state.backgrounds.map((t) => t.id),
  ]);
  const usedSignatures = new Set<string>([
    ...ALL_BG_THEMES.map(computeBgVisualSignature),
    ...state.backgrounds.map(computeBgVisualSignature),
  ]);

  const selected: BgTheme[] = [];

  for (const curated of CURATED_BG_PACK_THEMES) {
    if (selected.length >= count) break;
    const sig = computeBgVisualSignature(curated);
    if (!usedIds.has(curated.id) && !usedSignatures.has(sig)) {
      selected.push(curated);
      usedIds.add(curated.id);
      usedSignatures.add(sig);
    }
  }

  let cursor = state.proceduralCursor.backgrounds;
  let safety = 0;
  while (selected.length < count && safety < 2_000) {
    const candidate = generateProceduralBgAtStep(cursor);
    cursor += 1;
    safety += 1;
    const sig = computeBgVisualSignature(candidate);
    if (!usedIds.has(candidate.id) && !usedSignatures.has(sig)) {
      selected.push(candidate);
      usedIds.add(candidate.id);
      usedSignatures.add(sig);
    }
  }

  return { items: selected, nextCursor: cursor };
}

function selectNextWidgetItems(
  state: PersistedPremiumThemesState,
  count: number,
): { items: WidgetTheme[]; nextCursor: number } {
  const usedIds = new Set<string>([
    ...ALL_WIDGET_THEMES.map((t) => t.id),
    ...state.widgets.map((t) => t.id),
  ]);
  const usedSignatures = new Set<string>([
    ...ALL_WIDGET_THEMES.map(computeWidgetVisualSignature),
    ...state.widgets.map(computeWidgetVisualSignature),
  ]);

  const selected: WidgetTheme[] = [];

  for (const curated of CURATED_WIDGET_PACK_THEMES) {
    if (selected.length >= count) break;
    const sig = computeWidgetVisualSignature(curated);
    if (!usedIds.has(curated.id) && !usedSignatures.has(sig)) {
      selected.push(curated);
      usedIds.add(curated.id);
      usedSignatures.add(sig);
    }
  }

  let cursor = state.proceduralCursor.widgets;
  let safety = 0;
  while (selected.length < count && safety < 2_000) {
    const candidate = generateProceduralWidgetAtStep(cursor);
    cursor += 1;
    safety += 1;
    const sig = computeWidgetVisualSignature(candidate);
    if (!usedIds.has(candidate.id) && !usedSignatures.has(sig)) {
      selected.push(candidate);
      usedIds.add(candidate.id);
      usedSignatures.add(sig);
    }
  }

  return { items: selected, nextCursor: cursor };
}

function selectNextBorderItems(
  state: PersistedPremiumThemesState,
  count: number,
): { defs: CuratedBorderDefinition[]; nextCursor: number } {
  const usedIds = new Set<string>([
    ...WIDGET_BORDER_THEMES.map((t) => t.id),
    ...state.borders.map((t) => t.id),
  ]);
  const usedSignatures = new Set<string>([
    ...WIDGET_BORDER_THEMES.map(computeBorderVisualSignature),
    ...state.borders.map(computeBorderVisualSignature),
  ]);

  const selected: CuratedBorderDefinition[] = [];

  for (const def of CURATED_BORDER_PACK_DEFS) {
    if (selected.length >= count) break;
    const sig = computeBorderVisualSignature(def.theme);
    if (!usedIds.has(def.theme.id) && !usedSignatures.has(sig)) {
      selected.push(def);
      usedIds.add(def.theme.id);
      usedSignatures.add(sig);
    }
  }

  let cursor = state.proceduralCursor.borders;
  let safety = 0;
  while (selected.length < count && safety < 2_000) {
    const candidate = generateProceduralBorderAtStep(cursor);
    cursor += 1;
    safety += 1;
    const sig = computeBorderVisualSignature(candidate.theme);
    if (!usedIds.has(candidate.theme.id) && !usedSignatures.has(sig)) {
      selected.push(candidate);
      usedIds.add(candidate.theme.id);
      usedSignatures.add(sig);
    }
  }

  return { defs: selected, nextCursor: cursor };
}

/**
 * Aperçu non mutatif des 2 prochains éléments qui seront débloqués pour le pack choisi.
 */
export function previewNextPremiumPack(packType: PremiumPackType): PackPreview {
  const state = getUnlockedPremiumThemesState();
  if (packType === "backgrounds") {
    return {
      packType,
      backgrounds: selectNextBgItems(state, ITEMS_PER_PREMIUM_PACK).items,
      widgets: [],
      borders: [],
    };
  }
  if (packType === "widgets") {
    return {
      packType,
      backgrounds: [],
      widgets: selectNextWidgetItems(state, ITEMS_PER_PREMIUM_PACK).items,
      borders: [],
    };
  }
  return {
    packType,
    backgrounds: [],
    widgets: [],
    borders: selectNextBorderItems(state, ITEMS_PER_PREMIUM_PACK).defs.map((d) => d.theme),
  };
}

/**
 * Débloque et persiste atomiquement un pack de 2 éléments premium suite à la
 * confirmation officielle `onUserEarnedReward` d'une vidéo récompensée.
 *
 * - Protégé par `rewardSessionId` : un même visionnage ne peut jamais accorder
 *   deux fois une récompense même en cas de double callback.
 * - En cas d'erreur d'écriture disque/quota, l'état existant reste intact et
 *   `unlocked: false` est retourné sans perte ni corruption.
 */
export function unlockPremiumThemePack(
  packType: PremiumPackType,
  rewardSessionId: string,
): UnlockPackResult {
  const cleanSessionId = rewardSessionId?.trim();
  if (!cleanSessionId) {
    return {
      unlocked: false,
      alreadyGranted: false,
      error: "missing-reward-session-id",
      packType,
      backgrounds: [],
      widgets: [],
      borders: [],
    };
  }

  const current = getUnlockedPremiumThemesState();
  if (current.grantedSessionIds.includes(cleanSessionId)) {
    return {
      unlocked: false,
      alreadyGranted: true,
      packType,
      backgrounds: [],
      widgets: [],
      borders: [],
    };
  }

  const nextState: PersistedPremiumThemesState = {
    version: 1,
    backgrounds: [...current.backgrounds],
    widgets: [...current.widgets],
    borders: [...current.borders],
    borderSpecs: { ...current.borderSpecs },
    grantedSessionIds: [...current.grantedSessionIds, cleanSessionId].slice(-500),
    proceduralCursor: { ...current.proceduralCursor },
  };

  let unlockedBgs: BgTheme[] = [];
  let unlockedWidgets: WidgetTheme[] = [];
  let unlockedBorders: WidgetBorderTheme[] = [];

  if (packType === "backgrounds") {
    const { items, nextCursor } = selectNextBgItems(current, ITEMS_PER_PREMIUM_PACK);
    unlockedBgs = items;
    nextState.backgrounds.push(...items);
    nextState.proceduralCursor.backgrounds = nextCursor;
  } else if (packType === "widgets") {
    const { items, nextCursor } = selectNextWidgetItems(current, ITEMS_PER_PREMIUM_PACK);
    unlockedWidgets = items;
    nextState.widgets.push(...items);
    nextState.proceduralCursor.widgets = nextCursor;
  } else {
    const { defs, nextCursor } = selectNextBorderItems(current, ITEMS_PER_PREMIUM_PACK);
    unlockedBorders = defs.map((d) => d.theme);
    nextState.borders.push(...unlockedBorders);
    for (const def of defs) {
      nextState.borderSpecs[def.theme.id] = def.spec;
    }
    nextState.proceduralCursor.borders = nextCursor;
  }

  try {
    persistStateAtomically(nextState);
    return {
      unlocked: true,
      alreadyGranted: false,
      packType,
      backgrounds: unlockedBgs,
      widgets: unlockedWidgets,
      borders: unlockedBorders,
    };
  } catch (err) {
    return {
      unlocked: false,
      alreadyGranted: false,
      error: err instanceof Error ? err.message : "storage-write-failed",
      packType,
      backgrounds: [],
      widgets: [],
      borders: [],
    };
  }
}

/* ============================================================================
   HOOK REACT & INTÉGRATION AVEC CUSTOMIZATION-THEMES
   ============================================================================ */

export function subscribeUnlockedPremiumThemes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const SERVER_EMPTY_STATE: PersistedPremiumThemesState = createEmptyState();

export function useUnlockedPremiumThemes(): PersistedPremiumThemesState {
  return useSyncExternalStore(
    subscribeUnlockedPremiumThemes,
    getUnlockedPremiumThemesState,
    () => SERVER_EMPTY_STATE,
  );
}

export function configurePremiumThemesForTests(options: {
  storage?: PremiumStorageLike;
}): void {
  if (options.storage) {
    activeStorage = options.storage;
  }
  cachedState = null;
}

export function resetPremiumThemesForTests(): void {
  activeStorage = defaultStorage;
  cachedState = null;
}

// Enregistre immédiatement la résolution des thèmes débloqués auprès de customization-themes.ts
registerExternalThemeLookup({
  getBgTheme: (id: string) =>
    getUnlockedPremiumThemesState().backgrounds.find((b) => b.id === id),
  getWidgetTheme: (id: string) =>
    getUnlockedPremiumThemesState().widgets.find((w) => w.id === id),
  getBorderTheme: (id: string) =>
    getUnlockedPremiumThemesState().borders.find((b) => b.id === id),
});
