import type { Dict } from "./locales/en";

export type WidgetThemeCategory = "solid" | "gradient" | "animated";

export type WidgetTheme = {
  id: string;
  name: string;
  category: WidgetThemeCategory;
  from: string;
  to: string;
  fg: string;
  gradient?: string;
  animated?: boolean;
  animClass?: string;
  description?: string;
  /** Indique explicitement que l'élément a été obtenu via une publicité récompensée (exempt d'interstitiel). */
  unlockedByReward?: boolean;
};

export type BgThemeCategory = "solid" | "gradient" | "rgb" | "premium" | "gallery";

export type BgTheme = {
  id: string;
  name: string;
  category: BgThemeCategory;
  bgColor: string;
  bgImage?: string;
  animated?: boolean;
  animClass?: string;
  description?: string;
  textColor?: string;
  /** Indique explicitement que l'élément a été obtenu via une publicité récompensée (exempt d'interstitiel). */
  unlockedByReward?: boolean;
};

export function isRewardUnlockedTheme(
  theme: { unlockedByReward?: boolean } | null | undefined,
): boolean {
  return theme?.unlockedByReward === true;
}

export function getThemeName(t: Partial<Dict> | Dict, theme: { id: string; name: string }): string {
  const key = `theme_${theme.id}_name` as keyof Dict;
  return (t as Record<string, string>)[key] || theme.name;
}

export function getThemeDesc(
  t: Partial<Dict> | Dict,
  theme: { id: string; description?: string },
): string | undefined {
  if (!theme.description) return undefined;
  const key = `theme_${theme.id}_desc` as keyof Dict;
  return (t as Record<string, string>)[key] || theme.description;
}

/* ==========================================
   1. WIDGET THEMES (100% Faithful to Reference Images)
   ========================================== */

export const DEFAULT_WIDGET_THEME: WidgetTheme = {
  id: "w-grad-vert-chartreuse",
  name: "Vert Chartreuse",
  category: "gradient",
  from: "#11998e",
  to: "#38ef7d",
  fg: "#111827",
  gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  description: "Vert menthe et chartreuse lumineux",
};

// Image 1 = Couleurs Unies (Orange par défaut, Bleu, Rouge, Jaune, Vert, Rose, Orange, Violet, Blanc, Noir)
export const SOLID_WIDGET_THEMES: WidgetTheme[] = [
  {
    id: "w-solid-bleu",
    name: "Bleu Impérial",
    category: "solid",
    from: "#0396FF",
    to: "#0396FF",
    fg: "#FFFFFF",
    description: "Bleu pur haute netteté",
  },
  {
    id: "w-solid-rouge",
    name: "Rouge Rubis",
    category: "solid",
    from: "#EA5455",
    to: "#EA5455",
    fg: "#FFFFFF",
    description: "Rouge vibrant et profond",
  },
  {
    id: "w-solid-jaune",
    name: "Jaune Solaire",
    category: "solid",
    from: "#F8D800",
    to: "#F8D800",
    fg: "#1E1E24",
    description: "Jaune or lumineux",
  },
  {
    id: "w-solid-vert",
    name: "Vert Émeraude",
    category: "solid",
    from: "#28C76F",
    to: "#28C76F",
    fg: "#FFFFFF",
    description: "Vert islamique pur",
  },
  {
    id: "w-solid-rose",
    name: "Rose Douceur",
    category: "solid",
    from: "#E2B0FF",
    to: "#E2B0FF",
    fg: "#2A0845",
    description: "Rose pastel raffiné",
  },
  {
    id: "w-solid-orange",
    name: "Orange Vitalité",
    category: "solid",
    from: "#F55555",
    to: "#F55555",
    fg: "#FFFFFF",
    description: "Orange ambré chaleureux",
  },
  {
    id: "w-solid-violet",
    name: "Violet Mystique",
    category: "solid",
    from: "#9F44D3",
    to: "#9F44D3",
    fg: "#FFFFFF",
    description: "Violet profond élégant",
  },
  {
    id: "w-solid-blanc",
    name: "Blanc Pur",
    category: "solid",
    from: "#FFFFFF",
    to: "#FFFFFF",
    fg: "#18181B",
    description: "Blanc minéral nacré",
  },
  {
    id: "w-solid-noir",
    name: "Noir Onyx",
    category: "solid",
    from: "#18181B",
    to: "#18181B",
    fg: "#F4F4F5",
    description: "Noir mat haute couture",
  },
  {
    id: "w-solid-ambre-imperiale",
    name: "Ambre Impérial",
    category: "solid",
    from: "#D97706",
    to: "#D97706",
    fg: "#FFFFFF",
    description: "Ambre riche et chaud aux reflets de miel doré",
  },
  {
    id: "w-solid-turquoise-persane",
    name: "Turquoise Persane",
    category: "solid",
    from: "#0D9488",
    to: "#0D9488",
    fg: "#FFFFFF",
    description: "Turquoise des mosaïques d'Ispahan",
  },
  {
    id: "w-solid-indigo-nuit",
    name: "Indigo Nocturne",
    category: "solid",
    from: "#312E81",
    to: "#312E81",
    fg: "#EEF2FF",
    description: "Indigo profond velouté haute intensité",
  },
  {
    id: "w-solid-menthe-glacee",
    name: "Menthe Givrée",
    category: "solid",
    from: "#5EEAD4",
    to: "#5EEAD4",
    fg: "#0F172A",
    description: "Vert menthe givré d'une fraîcheur éclatante",
  },
  {
    id: "w-solid-bordeaux-grenat",
    name: "Grenat Sacré",
    category: "solid",
    from: "#881337",
    to: "#881337",
    fg: "#FFE4E6",
    description: "Rouge grenat noble et majestueux",
  },
];


// Images 2 & 3 = Dégradés Multicolores
export const GRADIENT_WIDGET_THEMES: WidgetTheme[] = [
  {
    id: "w-grad-vert-chartreuse",
    name: "Vert Chartreuse",
    category: "gradient",
    from: "#11998e",
    to: "#38ef7d",
    fg: "#111827",
    gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    description: "Vert menthe et chartreuse lumineux",
  },
  {
    id: "w-grad-menthe",
    name: "Menthe & Lime",
    category: "gradient",
    from: "#81FBB8",
    to: "#28C76F",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #81FBB8 0%, #28C76F 100%)",
  },
  {
    id: "w-grad-lavande",
    name: "Ciel Lavande",
    category: "gradient",
    from: "#ABDCFF",
    to: "#0396FF",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #ABDCFF 0%, #0396FF 100%)",
  },
  {
    id: "w-grad-peche",
    name: "Tangerine Pêche",
    category: "gradient",
    from: "#FCCF31",
    to: "#F55555",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #FCCF31 0%, #F55555 100%)",
  },
  {
    id: "w-grad-corail",
    name: "Coucher Corail",
    category: "gradient",
    from: "#FEB692",
    to: "#EA5455",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #FEB692 0%, #EA5455 100%)",
  },
  {
    id: "w-grad-cyan",
    name: "Cyan Turquoise",
    category: "gradient",
    from: "#84FAB0",
    to: "#8FD3F4",
    fg: "#0F172A",
    gradient: "linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%)",
  },
  {
    id: "w-grad-ocean",
    name: "Azur Océan",
    category: "gradient",
    from: "#00C6FF",
    to: "#0072FF",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)",
  },
  {
    id: "w-grad-violet",
    name: "Violet Néon",
    category: "gradient",
    from: "#E2B0FF",
    to: "#9F44D3",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #E2B0FF 0%, #9F44D3 100%)",
  },
  {
    id: "w-grad-magenta",
    name: "Magenta Crépuscule",
    category: "gradient",
    from: "#F355DA",
    to: "#6E0DD0",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #F355DA 0%, #6E0DD0 100%)",
  },
  {
    id: "w-grad-teal",
    name: "Crépuscule Teal",
    category: "gradient",
    from: "#30CFD0",
    to: "#330867",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #30CFD0 0%, #330867 100%)",
  },
  {
    id: "w-grad-ardoise",
    name: "Ardoise Sombre",
    category: "gradient",
    from: "#434343",
    to: "#000000",
    fg: "#F8FAFC",
    gradient: "linear-gradient(135deg, #434343 0%, #000000 100%)",
  },
  {
    id: "w-grad-rose-crepuscule",
    name: "Rose Crépuscule",
    category: "gradient",
    from: "#200122",
    to: "#6f0000",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #200122 0%, #6f0000 100%)",
    description: "Pourpre royal et bordeaux velours",
  },
  {
    id: "w-grad-ambre-dore",
    name: "Ambre Doré",
    category: "gradient",
    from: "#3a1c71",
    to: "#ffaf7b",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)",
    description: "Trilogie pourpre, corail et or",
  },
  {
    id: "w-grad-crepuscule-violet",
    name: "Crépuscule Violet",
    category: "gradient",
    from: "#232526",
    to: "#3a1c71",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #232526 0%, #414345 40%, #3a1c71 100%)",
    description: "Nuit noire infusée de violet impérial",
  },
  {
    id: "w-grad-arc-en-ciel-luxe",
    name: "Arc-en-ciel Luxe",
    category: "gradient",
    from: "#ff0055",
    to: "#ffbb00",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #ff0055 0%, #7a00ff 33%, #00e5ff 66%, #ffbb00 100%)",
    description: "Spectre chromatique soyeux haut de gamme",
  },
  {
    id: "w-grad-galaxie-mystique",
    name: "Galaxie Mystique",
    category: "gradient",
    from: "#0d061f",
    to: "#6b21a8",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #0d061f 0%, #311042 50%, #6b21a8 100%)",
    description: "Ciel profond stellaire aux lueurs violettes",
  },
  {
    id: "w-grad-taches-rgb-sombres",
    name: "Tâches RGB Sombres",
    category: "gradient",
    from: "#090d16",
    to: "#311042",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #311042 100%)",
    description: "Nébuleuse sombre infusée de spots RGB",
  },
  {
    id: "w-grad-palais-andalou",
    name: "Palais Andalou",
    category: "gradient",
    from: "#B45309",
    to: "#047857",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #78350F 0%, #B45309 45%, #047857 100%)",
    description: "Alliance d'or ocre andalou et d'émeraude royale",
  },
  {
    id: "w-grad-aurore-boreale-cyan",
    name: "Aurore Boréale Cyan",
    category: "gradient",
    from: "#042F2E",
    to: "#2DD4BF",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #042F2E 0%, #0D9488 50%, #2DD4BF 100%)",
    description: "Profondeur sarcelle traversée d'une vague boréale lumineuse",
  },
  {
    id: "w-grad-amethyst-rose",
    name: "Améthyste & Quartz",
    category: "gradient",
    from: "#4A044E",
    to: "#F472B6",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #4A044E 0%, #86198F 50%, #F472B6 100%)",
    description: "Pourpre impérial fondant en rose quartz étincelant",
  },
  {
    id: "w-grad-or-safir",
    name: "L'Or & le Saphir",
    category: "gradient",
    from: "#1E3A8A",
    to: "#F59E0B",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #0F172A 0%, #1D4ED8 50%, #F59E0B 100%)",
    description: "Saphir nuit d'Orient sublimé d'une tranche d'or pur",
  },
  {
    id: "w-grad-cuivre-flamboyant",
    name: "Cuivre Flamboyant",
    category: "gradient",
    from: "#7C2D12",
    to: "#FB923C",
    fg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #431407 0%, #C2410C 55%, #FB923C 100%)",
    description: "Cuivre patiné et reflets de braise incandescente",
  },
];


// Images 4 à 12 = Widgets Animés (Inspirés fidèlement des références)
export const ANIMATED_WIDGET_THEMES: WidgetTheme[] = [
  {
    id: "w-anim-aura-violet",
    name: "Aura Violet AI",
    category: "animated",
    from: "#1e0533",
    to: "#4c1d95",
    fg: "#f3e8ff",
    animated: true,
    animClass: "anim-widget-aura-violet",
    description: "Halo violet céleste en respiration lente et organique",
  },
  {
    id: "w-anim-neon-magenta",
    name: "Reflet Néon Magenta",
    category: "animated",
    from: "#9333ea",
    to: "#f43f5e",
    fg: "#ffffff",
    animated: true,
    animClass: "anim-widget-neon-magenta",
    description: "Ondulation soyeuse fuchsia, violette et or rose",
  },
  {
    id: "w-anim-flamme-ambree",
    name: "Flamme Ambrée",
    category: "animated",
    from: "#ea580c",
    to: "#dc2626",
    fg: "#ffffff",
    animated: true,
    animClass: "anim-widget-flamme-ambree",
    description: "Chaleur ambrée et dorée oscillant doucement",
  },
  {
    id: "w-anim-ocean-cyan",
    name: "Océan Cyan-Violet",
    category: "animated",
    from: "#06b6d4",
    to: "#8b5cf6",
    fg: "#ffffff",
    animated: true,
    animClass: "anim-widget-ocean-cyan",
    description: "Vague liquide cyan et bleu saphir en mouvement fluide",
  },
  {
    id: "w-anim-lueur-turquoise",
    name: "Lueur Turquoise",
    category: "animated",
    from: "#0284c7",
    to: "#14b8a6",
    fg: "#ffffff",
    animated: true,
    animClass: "anim-widget-lueur-turquoise",
    description: "Aurore boréale turquoise et menthe poivrée",
  },
  {
    id: "w-anim-eclat-fuchsia",
    name: "Éclat Fuchsia",
    category: "animated",
    from: "#c084fc",
    to: "#e879f9",
    fg: "#2e1065",
    animated: true,
    animClass: "anim-widget-eclat-fuchsia",
    description: "Nuage de soie violette et orchidée lumineuse",
  },
  {
    id: "w-anim-aurore-bipolaire",
    name: "Aurore Bipolaire",
    category: "animated",
    from: "#6b21a8",
    to: "#b91c1c",
    fg: "#ffffff",
    animated: true,
    animClass: "anim-widget-aurore-bipolaire",
    description: "Flux majestueux rouge rubis et pourpre royal",
  },
  {
    id: "w-anim-anneaux-lumiere",
    name: "Anneaux de Lumière",
    category: "animated",
    from: "#581c87",
    to: "#be185d",
    fg: "#ffffff",
    animated: true,
    animClass: "anim-widget-anneaux-lumiere",
    description: "Ondes orbes dorées et indigo en balancement lent",
  },
  {
    id: "w-anim-emeraude-vivante",
    name: "Émeraude Vivante",
    category: "animated",
    from: "#022c22",
    to: "#10b981",
    fg: "#ffffff",
    animated: true,
    animClass: "anim-widget-emeraude-vivante",
    description: "Émeraude islamique vivante infusée de dorures",
  },
  {
    id: "w-anim-cosmos-etoile",
    name: "Cosmos Nuit Étoilée",
    category: "animated",
    from: "#0f172a",
    to: "#581c87",
    fg: "#ffffff",
    animated: true,
    animClass: "anim-widget-cosmos-etoile",
    description: "Nébuleuse stellaire et poussières célestes en dérive ultra-lente",
  },
  {
    id: "w-anim-soleil-levant-dore",
    name: "Soleil Levant Doré",
    category: "animated",
    from: "#78350f",
    to: "#facc15",
    fg: "#18181b",
    animated: true,
    animClass: "anim-widget-soleil-levant-dore",
    description: "Ondulation solaire dorée et reflets d'or chaud",
  },
  {
    id: "w-anim-abysse-saphir",
    name: "Abysse Saphir",
    category: "animated",
    from: "#082f49",
    to: "#38bdf8",
    fg: "#ffffff",
    animated: true,
    animClass: "anim-widget-abysse-saphir",
    description: "Immersion marine bleu nuit et pulsations cyan bioluminescentes",
  },
  {
    id: "w-anim-rubis-passion",
    name: "Rubis Impérial Vivant",
    category: "animated",
    from: "#4c0519",
    to: "#f43f5e",
    fg: "#ffffff",
    animated: true,
    animClass: "anim-widget-rubis-passion",
    description: "Battement noble rubis ardent, écarlate et reflets pourpres",
  },
  {
    id: "w-anim-foret-celeste",
    name: "Forêt Céleste",
    category: "animated",
    from: "#022c22",
    to: "#4ade80",
    fg: "#ffffff",
    animated: true,
    animClass: "anim-widget-foret-celeste",
    description: "Émeraude profonde et vagues vert menthe lumineuses",
  },
  {
    id: "w-anim-prisme-lumina",
    name: "Prisme Lumina Spectral",
    category: "animated",
    from: "#18181b",
    to: "#a855f7",
    fg: "#ffffff",
    animated: true,
    animClass: "anim-widget-prisme-lumina",
    description: "Spectre lumineux iridescent sur fond d'onyx profond",
  },
];


export const ALL_WIDGET_THEMES: WidgetTheme[] = [
  ...SOLID_WIDGET_THEMES,
  ...GRADIENT_WIDGET_THEMES,
  ...ANIMATED_WIDGET_THEMES,
];

/* ==========================================
   2. BACKGROUND THEMES (100% Faithful to Reference Images)
   ========================================== */

export const DEFAULT_BG_THEME: BgTheme = {
  id: "bg-default",
  name: "Par défaut",
  category: "solid",
  bgColor: "#ffffff",
  textColor: "#0f172a",
  description: "Fond blanc original de l'application",
};

// Image 13 = Couleurs Unies Arrière-plan
export const SOLID_BG_THEMES: BgTheme[] = [
  DEFAULT_BG_THEME,
  {
    id: "bg-solid-bleu",
    name: "Bleu Azur",
    category: "solid",
    bgColor: "#0284C7",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-solid-rouge",
    name: "Rouge Rubis",
    category: "solid",
    bgColor: "#DC2626",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-solid-jaune",
    name: "Jaune Soleil",
    category: "solid",
    bgColor: "#EAB308",
    textColor: "#1E293B",
  },
  {
    id: "bg-solid-vert",
    name: "Vert Olive",
    category: "solid",
    bgColor: "#16A34A",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-solid-rose",
    name: "Rose Doux",
    category: "solid",
    bgColor: "#EC4899",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-solid-orange",
    name: "Orange Chaud",
    category: "solid",
    bgColor: "#EA580C",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-solid-violet",
    name: "Violet Royal",
    category: "solid",
    bgColor: "#9333EA",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-solid-blanc",
    name: "Blanc Épuré",
    category: "solid",
    bgColor: "#F8FAFC",
    textColor: "#0F172A",
  },
  {
    id: "bg-solid-noir",
    name: "Noir Profond",
    category: "solid",
    bgColor: "#09090B",
    textColor: "#F8FAFC",
  },
  {
    id: "bg-solid-creme-oriental",
    name: "Crème d'Orient",
    category: "solid",
    bgColor: "#FEF3C7",
    textColor: "#78350F",
    description: "Teinte parchemin chaud et doux pour une lecture apaisante",
  },
  {
    id: "bg-solid-sarcelle-islamique",
    name: "Sarcelle Médina",
    category: "solid",
    bgColor: "#0F766E",
    textColor: "#FFFFFF",
    description: "Sarcelle profond et spirituel inspiré de la calligraphie",
  },
  {
    id: "bg-solid-anthracite-luxe",
    name: "Anthracite Titane",
    category: "solid",
    bgColor: "#1E293B",
    textColor: "#F8FAFC",
    description: "Anthracite contemporain au contraste feutré",
  },
  {
    id: "bg-solid-lavande-brume",
    name: "Brume Lavande",
    category: "solid",
    bgColor: "#E0E7FF",
    textColor: "#1E1B4B",
    description: "Lavande pastel céleste d'une grande sérénité",
  },
  {
    id: "bg-solid-moka-imperial",
    name: "Moka Impérial",
    category: "solid",
    bgColor: "#3E2723",
    textColor: "#EFEBE9",
    description: "Brun moka noble et chaleureux aux reflets cacaotés",
  },
];


// Image 12 = Dégradés Multicolores Arrière-plan (10 options exactes)
export const GRADIENT_BG_THEMES: BgTheme[] = [
  {
    id: "bg-grad-ocean-sombre",
    name: "Océan Sombre",
    category: "gradient",
    bgColor: "#0f2027",
    bgImage: "linear-gradient(180deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-grad-crepuscule-violet",
    name: "Crépuscule Violet",
    category: "gradient",
    bgColor: "#232526",
    bgImage: "linear-gradient(180deg, #232526 0%, #414345 40%, #3a1c71 100%)",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-grad-ambre-dore",
    name: "Ambre Doré",
    category: "gradient",
    bgColor: "#3a1c71",
    bgImage: "linear-gradient(180deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-grad-vert-chartreuse",
    name: "Vert Chartreuse",
    category: "gradient",
    bgColor: "#11998e",
    bgImage: "linear-gradient(180deg, #11998e 0%, #38ef7d 100%)",
    textColor: "#111827",
  },
  {
    id: "bg-grad-sable-cyan",
    name: "Sable & Cyan",
    category: "gradient",
    bgColor: "#e0eafc",
    bgImage: "linear-gradient(180deg, #e0eafc 0%, #cfdef3 100%)",
    textColor: "#0f172a",
  },
  {
    id: "bg-grad-ardoise-profonde",
    name: "Ardoise Profonde",
    category: "gradient",
    bgColor: "#141e30",
    bgImage: "linear-gradient(180deg, #141e30 0%, #243b55 100%)",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-grad-foret-emeraude",
    name: "Forêt Émeraude",
    category: "gradient",
    bgColor: "#052e16",
    bgImage: "linear-gradient(180deg, #052e16 0%, #14532d 100%)",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-grad-azur-electrique",
    name: "Azur Électrique",
    category: "gradient",
    bgColor: "#0052d4",
    bgImage: "linear-gradient(180deg, #0052d4 0%, #4364f7 50%, #6fb1fc 100%)",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-grad-coucher-soleil",
    name: "Coucher de Soleil",
    category: "gradient",
    bgColor: "#ff512f",
    bgImage: "linear-gradient(180deg, #ff512f 0%, #dd2476 100%)",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-grad-rose-crepuscule",
    name: "Rose Crépuscule",
    category: "gradient",
    bgColor: "#200122",
    bgImage: "linear-gradient(180deg, #200122 0%, #6f0000 100%)",
    textColor: "#FFFFFF",
  },
  {
    id: "bg-grad-aurore-doree",
    name: "Aurore Dorée & Ambre",
    category: "gradient",
    bgColor: "#451a03",
    bgImage: "linear-gradient(180deg, #1c0a00 0%, #78350f 45%, #d97706 80%, #fbbf24 100%)",
    textColor: "#FFFFFF",
    description: "Lueur d'or zénithale au lever du soleil",
  },
  {
    id: "bg-grad-nuit-diamant",
    name: "Nuit Diamant & Cyan",
    category: "gradient",
    bgColor: "#020617",
    bgImage: "linear-gradient(180deg, #020617 0%, #0f172a 40%, #0e7490 85%, #22d3ee 100%)",
    textColor: "#FFFFFF",
    description: "Nuit d'encre se dissipant en horizon cyan étincelant",
  },
  {
    id: "bg-grad-jardin-al-andalus",
    name: "Jardin d'Al-Andalus",
    category: "gradient",
    bgColor: "#064e3b",
    bgImage: "linear-gradient(180deg, #022c22 0%, #064e3b 50%, #10b981 100%)",
    textColor: "#FFFFFF",
    description: "Vert palatial andalou orné de reflets d'émeraude",
  },
  {
    id: "bg-grad-brume-perle",
    name: "Brume Perle & Roseau",
    category: "gradient",
    bgColor: "#f1f5f9",
    bgImage: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 50%, #e2e8f0 100%)",
    textColor: "#0f172a",
    description: "Blanc soyeux perlé et gris minéral lumineux",
  },
  {
    id: "bg-grad-rubis-crepuscule",
    name: "Crépuscule Rubis & Nacre",
    category: "gradient",
    bgColor: "#3b0764",
    bgImage: "linear-gradient(180deg, #3b0764 0%, #701a75 45%, #be123c 80%, #fb7185 100%)",
    textColor: "#FFFFFF",
    description: "Dégradé majestueux rubis, améthyste et rose crépusculaire",
  },
];


// RGB / Couleurs Dynamiques par IA (10 modèles animés d'exception)
export const RGB_BG_THEMES: BgTheme[] = [
  {
    id: "bg-rgb-spots",
    name: "Tâches RGB Sombres",
    category: "rgb",
    bgColor: "#090d16",
    animated: true,
    animClass: "anim-bg-rgb-spots",
    textColor: "#ffffff",
    description: "Fond sombre avec tâches rouges, bleues et violettes en mouvement lent",
  },
  {
    id: "bg-rgb-cyan-violet",
    name: "Bleu Électrique & Cyan",
    category: "rgb",
    bgColor: "#030712",
    animated: true,
    animClass: "anim-bg-rgb-cyan-violet",
    textColor: "#ffffff",
    description: "Formes fluides cyan, violette et bleu électrique",
  },
  {
    id: "bg-rgb-liquid",
    name: "Peinture Liquide",
    category: "rgb",
    bgColor: "#1a0510",
    animated: true,
    animClass: "anim-bg-rgb-liquid",
    textColor: "#ffffff",
    description: "Orange, rose et rouge ondulant comme une peinture liquide",
  },
  {
    id: "bg-rgb-emerald-ocean",
    name: "Vert Émeraude Océan",
    category: "rgb",
    bgColor: "#021a12",
    animated: true,
    animClass: "anim-bg-rgb-emerald-ocean",
    textColor: "#ffffff",
    description: "Vert émeraude, turquoise et bleu océan lumineux",
  },
  {
    id: "bg-rgb-galaxy",
    name: "Galaxie Mystique",
    category: "rgb",
    bgColor: "#0d061f",
    animated: true,
    animClass: "anim-bg-rgb-galaxy",
    textColor: "#ffffff",
    description: "Violet profond, rose et bleu style galaxie stellaire",
  },
  {
    id: "bg-rgb-sunset-gold",
    name: "Coucher de Soleil Doré",
    category: "rgb",
    bgColor: "#1c0a00",
    animated: true,
    animClass: "anim-bg-rgb-sunset-gold",
    textColor: "#ffffff",
    description: "Orange doré, jaune et rouge chaleureux",
  },
  {
    id: "bg-rgb-ocean-wave",
    name: "Vague d'Océan",
    category: "rgb",
    bgColor: "#031329",
    animated: true,
    animClass: "anim-bg-rgb-ocean-wave",
    textColor: "#ffffff",
    description: "Bleu nuit, cyan et blanc effet vagues marines",
  },
  {
    id: "bg-rgb-black-particles",
    name: "Noir Profond Particules",
    category: "rgb",
    bgColor: "#050505",
    animated: true,
    animClass: "anim-bg-rgb-black-particles",
    textColor: "#ffffff",
    description: "Canvas noir avec nébuleuse et particules étincelantes",
  },
  {
    id: "bg-rgb-pastel-cloud",
    name: "Nuage Pastel",
    category: "rgb",
    bgColor: "#fbf7ff",
    animated: true,
    animClass: "anim-bg-rgb-pastel-cloud",
    textColor: "#1e1b4b",
    description: "Rose pastel, violet clair et bleu ciel doux",
  },
  {
    id: "bg-rgb-silk-rainbow",
    name: "Arc-en-Ciel Luxueux",
    category: "rgb",
    bgColor: "#0b0b12",
    animated: true,
    animClass: "anim-bg-rgb-silk-rainbow",
    textColor: "#ffffff",
    description: "Dégradé arc-en-ciel ultra lent et soyeux",
  },
  {
    id: "bg-rgb-plasma-aurora",
    name: "Plasma Boréal Émeraude",
    category: "rgb",
    bgColor: "#021a12",
    animated: true,
    animClass: "anim-bg-rgb-plasma-aurora",
    textColor: "#ffffff",
    description: "Ondulations boréales vert jade, turquoise et reflets d'or d'Orient",
  },
  {
    id: "bg-rgb-supernova-rubis",
    name: "Supernova Rubis & Ambre",
    category: "rgb",
    bgColor: "#1a050d",
    animated: true,
    animClass: "anim-bg-rgb-supernova-rubis",
    textColor: "#ffffff",
    description: "Éruption stellaire pourpre, magenta ardent et traînées dorées",
  },
  {
    id: "bg-rgb-nebuleuse-saphir",
    name: "Nébuleuse Saphir",
    category: "rgb",
    bgColor: "#030b1e",
    animated: true,
    animClass: "anim-bg-rgb-nebuleuse-saphir",
    textColor: "#ffffff",
    description: "Ciel céleste aux ondes saphir, outremer et touches argentées",
  },
  {
    id: "bg-rgb-ambre-volcanique",
    name: "Ambre Fusion & Cuivre",
    category: "rgb",
    bgColor: "#150800",
    animated: true,
    animClass: "anim-bg-rgb-ambre-volcanique",
    textColor: "#ffffff",
    description: "Manteau sombre avec ondes de braise ambrée et cuivre liquide",
  },
  {
    id: "bg-rgb-spectre-cristallin",
    name: "Spectre Cristallin Iridescent",
    category: "rgb",
    bgColor: "#08071a",
    animated: true,
    animClass: "anim-bg-rgb-spectre-cristallin",
    textColor: "#ffffff",
    description: "Réflexions prismatiques douces violet, cyan et or nacré",
  },
];


// Thèmes Premium (10 finitions de luxe)
export const PREMIUM_BG_THEMES: BgTheme[] = [
  {
    id: "bg-prem-noir-or",
    name: "Noir Mat & Doré",
    category: "premium",
    bgColor: "#09090b",
    animClass: "theme-prem-noir-or",
    textColor: "#fef08a",
    description: "Noir profond rehaussé de reflets métalliques dorés",
  },
  {
    id: "bg-prem-blanc-beige",
    name: "Blanc Nacré & Beige",
    category: "premium",
    bgColor: "#fafaf9",
    animClass: "theme-prem-blanc-beige",
    textColor: "#292524",
    description: "Pétales blanc nacré et touches sable royal",
  },
  {
    id: "bg-prem-bleu-argent",
    name: "Bleu Nuit & Argent",
    category: "premium",
    bgColor: "#030712",
    animClass: "theme-prem-bleu-argent",
    textColor: "#e0f2fe",
    description: "Nuit étoilée avec bordures et lueurs argentées",
  },
  {
    id: "bg-prem-vert-or",
    name: "Vert Profond & Or",
    category: "premium",
    bgColor: "#022c22",
    animClass: "theme-prem-vert-or",
    textColor: "#fef08a",
    description: "Vert islamique d'Orient orné d'or fin",
  },
  {
    id: "bg-prem-violet-noir",
    name: "Violet Royal & Noir",
    category: "premium",
    bgColor: "#140524",
    animClass: "theme-prem-violet-noir",
    textColor: "#f3e8ff",
    description: "Velours violet impérial sur fond sombre",
  },
  {
    id: "bg-prem-sable-desert",
    name: "Sable du Désert",
    category: "premium",
    bgColor: "#451a03",
    animClass: "theme-prem-sable-desert",
    textColor: "#ffedd5",
    description: "Dunes chaleureuses du Sahara au crépuscule",
  },
  {
    id: "bg-prem-glassmorphism",
    name: "Glassmorphism Suprême",
    category: "premium",
    bgColor: "#0f172a",
    animClass: "theme-prem-glassmorphism",
    textColor: "#f8fafc",
    description: "Verre dépoli multi-couches avec reflets crystallins",
  },
  {
    id: "bg-prem-marbre",
    name: "Marbre Luxueux",
    category: "premium",
    bgColor: "#f8fafc",
    animClass: "theme-prem-marbre",
    textColor: "#0f172a",
    description: "Marbre de Carrare blanc aux veinures grises subtiles",
  },
  {
    id: "bg-prem-soie",
    name: "Effet Soie",
    category: "premium",
    bgColor: "#1e1b4b",
    animClass: "theme-prem-soie",
    textColor: "#e0e7ff",
    description: "Draperie de soie fluide et ondulante",
  },
  {
    id: "bg-prem-hologram",
    name: "Futuriste IA Holographique",
    category: "premium",
    bgColor: "#030712",
    animClass: "theme-prem-hologram",
    textColor: "#e0f2fe",
    description: "Maillage géométrique holographique et iridescent",
  },
  {
    id: "bg-prem-ivoire-filigrane",
    name: "Ivoire & Filigrane d'Or",
    category: "premium",
    bgColor: "#fefce8",
    animClass: "theme-prem-ivoire-filigrane",
    textColor: "#713f12",
    description: "Fond ivoire royal délicatement parsemé d'accents dorés",
  },
  {
    id: "bg-prem-onyx-platine",
    name: "Onyx Brossé & Platine",
    category: "premium",
    bgColor: "#09090b",
    animClass: "theme-prem-onyx-platine",
    textColor: "#e2e8f0",
    description: "Noir onyx mat rehaussé de lignes platine étincelantes",
  },
  {
    id: "bg-prem-bois-oud",
    name: "Bois de Oud Précieux",
    category: "premium",
    bgColor: "#1c110a",
    animClass: "theme-prem-bois-oud",
    textColor: "#fef3c7",
    description: "Essence de bois précieux sombre aux reflets chauds ambrés",
  },
  {
    id: "bg-prem-nacre-persee",
    name: "Nacre Céleste d'Orient",
    category: "premium",
    bgColor: "#041e1b",
    animClass: "theme-prem-nacre-persee",
    textColor: "#ccfbf1",
    description: "Émeraude profonde aux reflets nacrés et iridescents",
  },
  {
    id: "bg-prem-velours-grenat",
    name: "Velours Grenat Impérial",
    category: "premium",
    bgColor: "#1a040b",
    animClass: "theme-prem-velours-grenat",
    textColor: "#ffe4e6",
    description: "Draperie noble grenat profond et accents d'or rose",
  },
];


export const ALL_BG_THEMES: BgTheme[] = [
  ...SOLID_BG_THEMES,
  ...GRADIENT_BG_THEMES,
  ...RGB_BG_THEMES,
  ...PREMIUM_BG_THEMES,
];

export type WidgetBorderCategory = "solid" | "animated" | "touch";

export type WidgetBorderTheme = {
  id: string;
  name: string;
  badge?: string;
  category: WidgetBorderCategory;
  categoryName: string;
  borderClass: string;
  description: string;
  glowColor: string;
  previewColors: [string, string, string];
  strokeWidth?: string;
  borderStyle?: string;
  /** Indique explicitement que l'élément a été obtenu via une publicité récompensée (exempt d'interstitiel). */
  unlockedByReward?: boolean;
};

/* ==========================================
   3. WIDGET BORDER THEMES (3 Categories - Max 7 per category)
   ========================================== */
export const RAINBOW_LUXE_BORDER_THEME: WidgetBorderTheme = {
  id: "wb-rainbow-luxe",
  name: "Rainbow Luxe",
  category: "animated",
  categoryName: "Bordures multicolores animées",
  borderClass: "wb-anim-rainbow-luxe",
  description: "Spectre multicolore soyeux aux transitions douces",
  glowColor: "rgba(244, 63, 94, 0.4)",
  previewColors: ["#f43f5e", "#4ade80", "#c084fc"],
};

export const OR_ROYAL_BORDER_THEME: WidgetBorderTheme = {
  id: "wb-anim-rubis-dore",
  name: "Rubis & Or Royal",
  category: "animated",
  categoryName: "Bordures multicolores animées",
  borderClass: "wb-anim-rubis-dore",
  description: "Rotation majestueuse de rubis ardent, cuivre et or fin impérial",
  glowColor: "rgba(225, 29, 72, 0.55)",
  previewColors: ["#e11d48", "#f59e0b", "#fde047"],
};

export const NONE_BORDER_THEME: WidgetBorderTheme = {
  id: "wb-none",
  name: "Aucune",
  category: "solid",
  categoryName: "Bordures unies",
  borderClass: "wb-none",
  description: "Bordure neutre standard épurée sans animation",
  glowColor: "transparent",
  previewColors: ["#cbd5e1", "#94a3b8", "#64748b"],
};

export const DEFAULT_BORDER_THEME: WidgetBorderTheme = OR_ROYAL_BORDER_THEME;

/* CATÉGORIE 1: Bordures unies */
export const SOLID_BORDER_THEMES: WidgetBorderTheme[] = [
  NONE_BORDER_THEME,
  {
    id: "wb-solid-subtle",
    name: "Fine Élégante",
    category: "solid",
    categoryName: "Bordures unies",
    borderClass: "wb-solid-subtle",
    description: "Contour fin platine et ardoise de haute précision",
    glowColor: "rgba(148, 163, 184, 0.4)",
    previewColors: ["#cbd5e1", "#94a3b8", "#64748b"],
    strokeWidth: "1.5px",
  },
  {
    id: "wb-solid-gold",
    name: "Contour Or Pur",
    category: "solid",
    categoryName: "Bordures unies",
    borderClass: "wb-solid-gold",
    description: "Bordure dorée raffinée au poli métallisé",
    glowColor: "rgba(234, 179, 8, 0.5)",
    previewColors: ["#fef08a", "#eab308", "#854d0e"],
    strokeWidth: "2px",
  },
  {
    id: "wb-solid-emerald",
    name: "Contour Émeraude",
    category: "solid",
    categoryName: "Bordures unies",
    borderClass: "wb-solid-emerald",
    description: "Vert émeraude précieux au reflet profond",
    glowColor: "rgba(5, 150, 105, 0.5)",
    previewColors: ["#6ee7b7", "#059669", "#064e3b"],
    strokeWidth: "2px",
  },
  {
    id: "wb-solid-sapphire",
    name: "Contour Saphir",
    category: "solid",
    categoryName: "Bordures unies",
    borderClass: "wb-solid-sapphire",
    description: "Bleu saphir céleste aux finitions de précision",
    glowColor: "rgba(37, 99, 235, 0.5)",
    previewColors: ["#93c5fd", "#2563eb", "#1e3a8a"],
    strokeWidth: "2px",
  },
  {
    id: "wb-solid-double",
    name: "Double Trait Impérial",
    category: "solid",
    categoryName: "Bordures unies",
    borderClass: "wb-solid-double",
    description: "Double contour géométrique ambré style oriental",
    glowColor: "rgba(217, 119, 6, 0.4)",
    previewColors: ["#fde68a", "#d97706", "#78350f"],
    strokeWidth: "3.5px",
    borderStyle: "double",
  },
  {
    id: "wb-solid-dashed",
    name: "Pointillée Zénith",
    category: "solid",
    categoryName: "Bordures unies",
    borderClass: "wb-solid-dashed",
    description: "Ligne pointillée contemporaine à grand contraste",
    glowColor: "rgba(16, 185, 129, 0.4)",
    previewColors: ["#a7f3d0", "#10b981", "#047857"],
    strokeWidth: "2px",
    borderStyle: "dashed",
  },
  {
    id: "wb-solid-amethyst",
    name: "Contour Améthyste",
    category: "solid",
    categoryName: "Bordures unies",
    borderClass: "wb-solid-amethyst",
    description: "Violet améthyste impérial au reflet pur et noble",
    glowColor: "rgba(168, 85, 247, 0.5)",
    previewColors: ["#e9d5ff", "#a855f7", "#581c87"],
    strokeWidth: "2px",
  },
  {
    id: "wb-solid-copper",
    name: "Contour Cuivre Rosé",
    category: "solid",
    categoryName: "Bordures unies",
    borderClass: "wb-solid-copper",
    description: "Cuivre noble brossé aux éclats d'ambre et d'or rose",
    glowColor: "rgba(249, 115, 22, 0.45)",
    previewColors: ["#fed7aa", "#f97316", "#9a3412"],
    strokeWidth: "2px",
  },
  {
    id: "wb-solid-platine",
    name: "Platine Zénith",
    category: "solid",
    categoryName: "Bordures unies",
    borderClass: "wb-solid-platine",
    description: "Platine étincelant aux nuances d'argent polaire",
    glowColor: "rgba(226, 232, 240, 0.6)",
    previewColors: ["#ffffff", "#cbd5e1", "#64748b"],
    strokeWidth: "2px",
  },
  {
    id: "wb-solid-rubis",
    name: "Contour Rubis Écarlate",
    category: "solid",
    categoryName: "Bordures unies",
    borderClass: "wb-solid-rubis",
    description: "Liseré rubis pur haute intensité et présence royale",
    glowColor: "rgba(225, 29, 72, 0.5)",
    previewColors: ["#fecdd3", "#e11d48", "#881337"],
    strokeWidth: "2px",
  },
  {
    id: "wb-solid-groove-imperial",
    name: "Cannelure Impériale",
    category: "solid",
    categoryName: "Bordures unies",
    borderClass: "wb-solid-groove-imperial",
    description: "Cannelure sculptée en relief doré style architecture islamique",
    glowColor: "rgba(217, 119, 6, 0.45)",
    previewColors: ["#fde68a", "#d97706", "#78350f"],
    strokeWidth: "3.5px",
    borderStyle: "groove",
  },
];


/* CATÉGORIE 2: Bordures multicolores animées (Max 7) */
export const ANIMATED_BORDER_THEMES: WidgetBorderTheme[] = [
  {
    id: "wb-or-pur",
    name: "Or Pur Impérial",
    category: "animated",
    categoryName: "Bordures multicolores animées",
    borderClass: "wb-anim-or-pur",
    description: "Flux continu d'or liquide et d'ambre impérial en rotation",
    glowColor: "rgba(245, 158, 11, 0.45)",
    previewColors: ["#fef08a", "#f59e0b", "#d97706"],
  },
  {
    id: "wb-quantum-flux",
    name: "Quantum Flux",
    category: "animated",
    categoryName: "Bordures multicolores animées",
    borderClass: "wb-anim-quantum-flux",
    description: "Flux perpétuel et miroitant de magenta, cyan, or et violet",
    glowColor: "rgba(217, 70, 239, 0.5)",
    previewColors: ["#d946ef", "#06b6d4", "#eab308"],
  },
  {
    id: "wb-chroma-wave",
    name: "Chroma Wave",
    category: "animated",
    categoryName: "Bordures multicolores animées",
    borderClass: "wb-anim-chroma-wave",
    description: "Onde fluide et mouvante passant à travers tout le spectre chromatique",
    glowColor: "rgba(56, 189, 248, 0.5)",
    previewColors: ["#38bdf8", "#8b5cf6", "#ec4899"],
  },
  {
    id: "wb-sunset-prestige",
    name: "Sunset Prestige",
    category: "animated",
    categoryName: "Bordures multicolores animées",
    borderClass: "wb-anim-sunset-prestige",
    description: "Coucher de soleil ambré, cuivré et or ardent",
    glowColor: "rgba(249, 115, 22, 0.5)",
    previewColors: ["#ea580c", "#f97316", "#fbbf24"],
  },
  {
    id: "wb-cosmic-galaxy",
    name: "Cosmic Galaxy",
    category: "animated",
    categoryName: "Bordures multicolores animées",
    borderClass: "wb-anim-cosmic-galaxy",
    description: "Nébuleuse stellaire violette, bleu nuit et orchidée",
    glowColor: "rgba(139, 92, 246, 0.5)",
    previewColors: ["#6d28d9", "#3b82f6", "#d946ef"],
  },
  {
    id: "wb-cyber-neon",
    name: "Cyber Néon Fuchsia",
    category: "animated",
    categoryName: "Bordures multicolores animées",
    borderClass: "wb-anim-cyber-neon",
    description: "Vague dynamique fuchsia, magenta et néon violet",
    glowColor: "rgba(225, 29, 72, 0.5)",
    previewColors: ["#e11d48", "#c084fc", "#9333ea"],
  },
  {
    id: "wb-rainbow-luxe",
    name: "Rainbow Luxe",
    category: "animated",
    categoryName: "Bordures multicolores animées",
    borderClass: "wb-anim-rainbow-luxe",
    description: "Spectre multicolore soyeux aux transitions douces",
    glowColor: "rgba(244, 63, 94, 0.4)",
    previewColors: ["#f43f5e", "#4ade80", "#c084fc"],
  },
  {
    id: "wb-anim-emeraude-celeste",
    name: "Émeraude Céleste",
    category: "animated",
    categoryName: "Bordures multicolores animées",
    borderClass: "wb-anim-emeraude-celeste",
    description: "Ruban animé vert émeraude, turquoise et touches d'or d'Orient",
    glowColor: "rgba(16, 185, 129, 0.55)",
    previewColors: ["#10b981", "#06b6d4", "#facc15"],
  },
  {
    id: "wb-anim-aurore-polaire",
    name: "Aurore Polaire",
    category: "animated",
    categoryName: "Bordures multicolores animées",
    borderClass: "wb-anim-aurore-polaire",
    description: "Onde continue cyan boréal, vert menthe et bleu saphir glacé",
    glowColor: "rgba(6, 182, 212, 0.55)",
    previewColors: ["#22d3ee", "#34d399", "#3b82f6"],
  },
  {
    id: "wb-anim-rubis-dore",
    name: "Rubis & Or Royal",
    category: "animated",
    categoryName: "Bordures multicolores animées",
    borderClass: "wb-anim-rubis-dore",
    description: "Rotation majestueuse de rubis ardent, cuivre et or fin impérial",
    glowColor: "rgba(225, 29, 72, 0.55)",
    previewColors: ["#e11d48", "#f59e0b", "#fde047"],
  },
  {
    id: "wb-anim-spectre-neon",
    name: "Spectre Néon Vif",
    category: "animated",
    categoryName: "Bordures multicolores animées",
    borderClass: "wb-anim-spectre-neon",
    description: "Spectre néon vibrant violet, vert lime et magenta étincelant",
    glowColor: "rgba(168, 85, 247, 0.55)",
    previewColors: ["#a855f7", "#84cc16", "#ec4899"],
  },
  {
    id: "wb-anim-diamant-argent",
    name: "Diamant & Argent",
    category: "animated",
    categoryName: "Bordures multicolores animées",
    borderClass: "wb-anim-diamant-argent",
    description: "Lumière argentée fluide oscillant entre blanc pur et platine nacré",
    glowColor: "rgba(255, 255, 255, 0.65)",
    previewColors: ["#ffffff", "#94a3b8", "#e2e8f0"],
  },
];


/* CATÉGORIE 3: Bordures interactives (3 animations : Contour au toucher + Onde au contact + Vague au défilement) */
export const TOUCH_BORDER_THEMES: WidgetBorderTheme[] = [
  {
    id: "wb-interact-prisme",
    name: "Prisme Stellaire",
    category: "touch",
    categoryName: "Bordures interactives",
    borderClass: "wb-interact-prisme",
    description: "Laser or & opale au toucher, onde plasma au contact, vague céleste au défilement",
    glowColor: "rgba(245, 158, 11, 0.9)",
    previewColors: ["#fef08a", "#f59e0b", "#38bdf8"],
  },
  {
    id: "wb-interact-emerald",
    name: "Océan Émeraude",
    category: "touch",
    categoryName: "Bordures interactives",
    borderClass: "wb-interact-emerald",
    description: "Contour émeraude au toucher, onde aquatique au contact, marée cyan au défilement",
    glowColor: "rgba(16, 185, 129, 0.9)",
    previewColors: ["#a7f3d0", "#10b981", "#06b6d4"],
  },
  {
    id: "wb-interact-sapphire",
    name: "Ciel Saphir",
    category: "touch",
    categoryName: "Bordures interactives",
    borderClass: "wb-interact-sapphire",
    description:
      "Laser bleu saphir au toucher, halo électrique au contact, aurore stellaire au défilement",
    glowColor: "rgba(59, 130, 246, 0.9)",
    previewColors: ["#bfdbfe", "#3b82f6", "#6366f1"],
  },
  {
    id: "wb-interact-amber",
    name: "Soleil Ambré",
    category: "touch",
    categoryName: "Bordures interactives",
    borderClass: "wb-interact-amber",
    description:
      "Rayonnement or solaire au toucher, éclat ambré au contact, vague solaire au défilement",
    glowColor: "rgba(234, 179, 8, 0.95)",
    previewColors: ["#fef08a", "#eab308", "#f97316"],
  },
  {
    id: "wb-interact-neon",
    name: "Aurore Violette",
    category: "touch",
    categoryName: "Bordures interactives",
    borderClass: "wb-interact-neon",
    description:
      "Lumière fuchsia en rotation au toucher, onde violette au contact, vague néon au défilement",
    glowColor: "rgba(217, 70, 239, 0.9)",
    previewColors: ["#fbcfe8", "#d946ef", "#8b5cf6"],
  },
  {
    id: "wb-interact-diamond",
    name: "Cristal Diamant",
    category: "touch",
    categoryName: "Bordures interactives",
    borderClass: "wb-interact-diamond",
    description:
      "Contour platine étincelant au toucher, impulsion cristal au contact, miroir d'argent au défilement",
    glowColor: "rgba(255, 255, 255, 0.95)",
    previewColors: ["#ffffff", "#cbd5e1", "#e2e8f0"],
  },
  {
    id: "wb-interact-ruby",
    name: "Rubis Royal",
    category: "touch",
    categoryName: "Bordures interactives",
    borderClass: "wb-interact-ruby",
    description:
      "Bordure rubis ardent au toucher, anneau d'énergie rose au contact, flux pourpre au défilement",
    glowColor: "rgba(225, 29, 72, 0.9)",
    previewColors: ["#fecdd3", "#e11d48", "#f43f5e"],
  },
  {
    id: "wb-interact-opal",
    name: "Opale Holographique",
    category: "touch",
    categoryName: "Bordures interactives",
    borderClass: "wb-interact-opal",
    description: "Reflet opalin iridescent au toucher, éclat pastel au contact, vague nacrée au défilement",
    glowColor: "rgba(45, 212, 191, 0.9)",
    previewColors: ["#ccfbf1", "#2dd4bf", "#c084fc"],
  },
  {
    id: "wb-interact-flame",
    name: "Flamme Ardent",
    category: "touch",
    categoryName: "Bordures interactives",
    borderClass: "wb-interact-flame",
    description: "Flamme ambre et braise au toucher, étincelle solaire au contact, vague de feu au défilement",
    glowColor: "rgba(249, 115, 22, 0.95)",
    previewColors: ["#ffedd5", "#f97316", "#dc2626"],
  },
  {
    id: "wb-interact-topaz",
    name: "Topaze Céleste",
    category: "touch",
    categoryName: "Bordures interactives",
    borderClass: "wb-interact-topaz",
    description: "Laser cyan électrique au toucher, flash azur au contact, marée océanique au défilement",
    glowColor: "rgba(14, 165, 233, 0.95)",
    previewColors: ["#e0f2fe", "#0ea5e9", "#2563eb"],
  },
  {
    id: "wb-interact-jade",
    name: "Jade Sacré",
    category: "touch",
    categoryName: "Bordures interactives",
    borderClass: "wb-interact-jade",
    description: "Liseré jade impérial au toucher, anneau d'énergie menthe au contact, brume émeraude au défilement",
    glowColor: "rgba(5, 150, 105, 0.95)",
    previewColors: ["#d1fae5", "#059669", "#047857"],
  },
  {
    id: "wb-interact-amethyst",
    name: "Améthyste Céleste",
    category: "touch",
    categoryName: "Bordures interactives",
    borderClass: "wb-interact-amethyst",
    description: "Laser pourpre mystique au toucher, onde lilas au contact, aurore violette au défilement",
    glowColor: "rgba(147, 51, 234, 0.95)",
    previewColors: ["#f3e8ff", "#9333ea", "#6b21a8"],
  },
];


export const WIDGET_BORDER_THEMES: WidgetBorderTheme[] = [
  ...SOLID_BORDER_THEMES,
  ...ANIMATED_BORDER_THEMES,
  ...TOUCH_BORDER_THEMES,
];

export interface ExternalThemeLookup {
  getWidgetTheme?: (id: string) => WidgetTheme | undefined;
  getBgTheme?: (id: string) => BgTheme | undefined;
  getBorderTheme?: (id: string) => WidgetBorderTheme | undefined;
}

let externalThemeLookup: ExternalThemeLookup | null = null;

export function registerExternalThemeLookup(lookup: ExternalThemeLookup | null): void {
  externalThemeLookup = lookup;
}

/** Quick lookup helpers (built-in themes + unlocked premium themes) */
export function getWidgetThemeById(id?: string): WidgetTheme {
  if (!id) return DEFAULT_WIDGET_THEME;
  return (
    ALL_WIDGET_THEMES.find((w) => w.id === id) ||
    externalThemeLookup?.getWidgetTheme?.(id) ||
    DEFAULT_WIDGET_THEME
  );
}

export function getBgThemeById(id?: string): BgTheme {
  if (!id) return DEFAULT_BG_THEME;
  return (
    ALL_BG_THEMES.find((b) => b.id === id) ||
    externalThemeLookup?.getBgTheme?.(id) ||
    DEFAULT_BG_THEME
  );
}

export function getWidgetBorderThemeById(id?: string): WidgetBorderTheme {
  if (!id) return DEFAULT_BORDER_THEME;
  return (
    WIDGET_BORDER_THEMES.find((b) => b.id === id) ||
    externalThemeLookup?.getBorderTheme?.(id) ||
    DEFAULT_BORDER_THEME
  );
}

export function getWidgetBorderThemesByCategory(
  category: WidgetBorderCategory,
): WidgetBorderTheme[] {
  return WIDGET_BORDER_THEMES.filter((t) => t.category === category);
}

