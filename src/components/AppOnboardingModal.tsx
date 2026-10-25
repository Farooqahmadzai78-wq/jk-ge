import { useState, useEffect, useMemo, useRef } from "react";
import {
  Bell,
  BookOpen,
  Check,
  Compass,
  Globe,
  Heart,
  Image as ImageIcon,
  MapPin,
  Moon,
  Palette,
  Search,
  Sparkles,
  SquareStack,
  User,
  X,
} from "lucide-react";

import { useSettings } from "@/lib/app-settings";
import { useI18n, type LocaleCode } from "@/lib/i18n";
import { playClick, playConfirm } from "@/lib/sfx";
import { vibrate } from "@/lib/vibration";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import {
  isOnboardingCompleted,
  setOnboardingCompleted,
  subscribeToOnboardingOpen,
} from "@/lib/onboarding-state";
import appLogoImg from "@/assets/images/app_logo_crescent.png";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { PRAYER_KEYS, cleanTime } from "@/lib/prayer-times";

interface LanguageItem {
  code: LocaleCode;
  nativeName: string;
  subName: string;
  flag: string;
}

/** Les 50 langues deja traduites par le projet (aucune langue inventee). */
const ONBOARDING_LANGUAGES: LanguageItem[] = [
  { code: "ps", nativeName: "پښتو", subName: "Pashto", flag: "🇦🇫" },
  { code: "fr", nativeName: "Français", subName: "French", flag: "🇫🇷" },
  { code: "ar", nativeName: "العربية", subName: "Arabic (Standard)", flag: "🇸🇦" },
  { code: "en", nativeName: "English", subName: "English", flag: "🇬🇧" },
  { code: "ur", nativeName: "اردو", subName: "Urdu", flag: "🇵🇰" },
  { code: "tr", nativeName: "Türkçe", subName: "Turkish", flag: "🇹🇷" },
  { code: "fa", nativeName: "فارسی", subName: "Persian / Farsi", flag: "🇮🇷" },
  { code: "ar-DZ", nativeName: "الدارجة الجزائرية", subName: "Algerian Arabic", flag: "🇩🇿" },
  { code: "ar-MA", nativeName: "الدارجة المغربية", subName: "Moroccan Arabic", flag: "🇲🇦" },
  { code: "ar-EG", nativeName: "العامية المصرية", subName: "Egyptian Arabic", flag: "🇪🇬" },
  { code: "ar-TN", nativeName: "العامية التونسية", subName: "Tunisian Arabic", flag: "🇹🇳" },
  { code: "de", nativeName: "Deutsch", subName: "German", flag: "🇩🇪" },
  { code: "es", nativeName: "Español", subName: "Spanish", flag: "🇪🇸" },
  { code: "pt", nativeName: "Português", subName: "Portuguese", flag: "🇵🇹" },
  { code: "it", nativeName: "Italiano", subName: "Italian", flag: "🇮🇹" },
  { code: "nl", nativeName: "Nederlands", subName: "Dutch", flag: "🇳🇱" },
  { code: "ru", nativeName: "Русский", subName: "Russian", flag: "🇷🇺" },
  { code: "pl", nativeName: "Polski", subName: "Polish", flag: "🇵🇱" },
  { code: "ro", nativeName: "Română", subName: "Romanian", flag: "🇷🇴" },
  { code: "el", nativeName: "Ελληνικά", subName: "Greek", flag: "🇬🇷" },
  { code: "sq", nativeName: "Shqip", subName: "Albanian", flag: "🇦🇱" },
  { code: "bs", nativeName: "Bosanski", subName: "Bosnian", flag: "🇧🇦" },
  { code: "sv", nativeName: "Svenska", subName: "Swedish", flag: "🇸🇪" },
  { code: "no", nativeName: "Norsk", subName: "Norwegian", flag: "🇳🇴" },
  { code: "da", nativeName: "Dansk", subName: "Danish", flag: "🇩🇰" },
  { code: "fi", nativeName: "Suomi", subName: "Finnish", flag: "🇫🇮" },
  { code: "hi", nativeName: "हिन्दी", subName: "Hindi", flag: "🇮🇳" },
  { code: "bn", nativeName: "বাংলা", subName: "Bengali", flag: "🇧🇩" },
  { code: "pa", nativeName: "ਪੰਜਾਬੀ", subName: "Punjabi", flag: "🇮🇳" },
  { code: "gu", nativeName: "ગુજરાતી", subName: "Gujarati", flag: "🇮🇳" },
  { code: "mr", nativeName: "मराठी", subName: "Marathi", flag: "🇮🇳" },
  { code: "ta", nativeName: "தமிழ்", subName: "Tamil", flag: "🇮🇳" },
  { code: "te", nativeName: "తెలుగు", subName: "Telugu", flag: "🇮🇳" },
  { code: "ml", nativeName: "മലയാളം", subName: "Malayalam", flag: "🇮🇳" },
  { code: "kn", nativeName: "ಕನ್ನಡ", subName: "Kannada", flag: "🇮🇳" },
  { code: "id", nativeName: "Bahasa Indonesia", subName: "Indonesian", flag: "🇮🇩" },
  { code: "ms", nativeName: "Bahasa Melayu", subName: "Malay", flag: "🇲🇾" },
  { code: "ha", nativeName: "Hausa", subName: "Hausa", flag: "🇳🇬" },
  { code: "sw", nativeName: "Kiswahili", subName: "Swahili", flag: "🇹🇿" },
  { code: "zh", nativeName: "中文", subName: "Chinese (Simplified)", flag: "🇨🇳" },
  { code: "ja", nativeName: "日本語", subName: "Japanese", flag: "🇯🇵" },
  { code: "ko", nativeName: "한국어", subName: "Korean", flag: "🇰🇷" },
  { code: "vi", nativeName: "Tiếng Việt", subName: "Vietnamese", flag: "🇻🇳" },
  { code: "th", nativeName: "ไทย", subName: "Thai", flag: "🇹🇭" },
  { code: "uz", nativeName: "Oʻzbekcha", subName: "Uzbek", flag: "🇺🇿" },
  { code: "kk", nativeName: "Қазақша", subName: "Kazakh", flag: "🇰🇿" },
  { code: "ky", nativeName: "Кыргызча", subName: "Kyrgyz", flag: "🇰🇬" },
  { code: "tg", nativeName: "Тоҷикӣ", subName: "Tajik", flag: "🇹🇯" },
  { code: "tk", nativeName: "Türkmençe", subName: "Turkmen", flag: "🇹🇲" },
  { code: "az", nativeName: "Azərbaycan dili", subName: "Azerbaijani", flag: "🇦🇿" },
];

const SCREENS = ["welcome", "lang", "name", "prayers", "quran", "tools", "ready"] as const;
type Screen = (typeof SCREENS)[number];


/* ------------------------------------------------------------------ */
/*  Motifs visuels « Emerald Signature » (SVG inline, haute précision)   */
/* ------------------------------------------------------------------ */

function IslamicRosettePattern({ className = "" }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id="emerald-girih-pattern" width="56" height="56" patternUnits="userSpaceOnUse">
          {/* Étoile à 8 branches (Khatam) entrelacée */}
          <path
            d="M28 4 L33 18 L47 13 L42 27 L56 28 L42 29 L47 43 L33 38 L28 52 L23 38 L9 43 L14 29 L0 28 L14 27 L9 13 L23 18 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.75"
            strokeOpacity="0.85"
          />
          {/* Rosette interne */}
          <circle cx="28" cy="28" r="8" fill="none" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.6" />
          <polygon
            points="28,22 32,25 34,29 32,33 28,34 24,33 22,29 24,25"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeOpacity="0.7"
          />
          <circle cx="28" cy="28" r="2" fill="currentColor" fillOpacity="0.4" />
          {/* Coins reliés */}
          <path d="M0 0 L10 10 M56 0 L46 10 M0 56 L10 46 M56 56 L46 46" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#emerald-girih-pattern)" />
    </svg>
  );
}

function CelestialNightSky({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 240" className={className} fill="none" aria-hidden="true" preserveAspectRatio="xMidYMin slice">
      {/* Étoiles scintillantes dorées dans le ciel nocturne */}
      <circle cx="45" cy="38" r="1.2" fill="#fef08a" opacity="0.8" />
      <circle cx="85" cy="72" r="0.9" fill="#fef08a" opacity="0.6" />
      <circle cx="130" cy="30" r="1.4" fill="#d4af37" opacity="0.9" />
      <circle cx="175" cy="55" r="0.8" fill="#ffffff" opacity="0.5" />
      <circle cx="220" cy="28" r="1.3" fill="#fef08a" opacity="0.85" />
      <circle cx="280" cy="65" r="1" fill="#fef08a" opacity="0.7" />
      <circle cx="325" cy="35" r="1.5" fill="#d4af37" opacity="0.95" />
      <circle cx="340" cy="95" r="0.8" fill="#ffffff" opacity="0.5" />
      <circle cx="25" cy="110" r="1.1" fill="#fef08a" opacity="0.65" />
      <circle cx="95" cy="130" r="0.7" fill="#ffffff" opacity="0.4" />
      <circle cx="295" cy="120" r="1.2" fill="#d4af37" opacity="0.75" />

      {/* Étoile polaire à 4 pointes (Morning Star) */}
      <path
        d="M310 45 Q310 50 315 50 Q310 50 310 55 Q310 50 305 50 Q310 50 310 45 Z"
        fill="#fef08a"
        opacity="0.95"
      />
      <circle cx="310" cy="50" r="4" fill="#fef08a" opacity="0.25" />

      <path
        d="M60 60 Q60 64 64 64 Q60 64 60 68 Q60 64 56 64 Q60 64 60 60 Z"
        fill="#fef08a"
        opacity="0.8"
      />
    </svg>
  );
}

function GrandMihrabArch({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 480" className={className} aria-hidden="true" fill="none" preserveAspectRatio="none">
      <defs>
        <linearGradient id="gold-arch-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5e39b" stopOpacity="0.8" />
          <stop offset="35%" stopColor="#d4af37" stopOpacity="0.5" />
          <stop offset="70%" stopColor="#8a6c1e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#041c16" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="inner-arch-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4af37" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#d4af37" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#041c16" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Arche extérieure polylobée royale */}
      <path
        d="M16 480 V190 C16 110, 80 45, 160 16 C240 45, 304 110, 304 190 V480"
        stroke="url(#gold-arch-grad)"
        strokeWidth="1.5"
      />

      {/* Liseré festonné / polylobé intérieur */}
      <path
        d="M28 480 V195 C28 124, 88 64, 160 36 C232 64, 292 124, 292 195 V480"
        stroke="url(#inner-arch-grad)"
        strokeWidth="0.8"
        strokeDasharray="4 2"
      />

      {/* Troisième filet fin d'encadrement */}
      <path
        d="M40 480 V200 C40 136, 96 82, 160 56 C224 82, 280 136, 280 200 V480"
        stroke="url(#inner-arch-grad)"
        strokeWidth="0.6"
      />

      {/* Finial / fleuron zénithal avec croissant */}
      <circle cx="160" cy="16" r="3.5" fill="#f5e39b" opacity="0.9" />
      <line x1="160" y1="6" x2="160" y2="26" stroke="#f5e39b" strokeWidth="1" opacity="0.8" />
      <path
        d="M160 3 C158 3, 156.5 4.5, 156.5 7 C156.5 9.5, 158.5 11, 161 10 C159.5 10, 158.5 8.8, 158.5 7 C158.5 5.2, 159.5 4, 161 3.5 C160.7 3.2, 160.3 3, 160 3 Z"
        fill="#f5e39b"
        opacity="0.95"
      />

      {/* Lanterne suspendue (Fanous) au sommet de l'arche */}
      <line x1="160" y1="16" x2="160" y2="58" stroke="#d4af37" strokeWidth="0.75" strokeDasharray="2 1.5" opacity="0.6" />
      <path d="M154 58 L160 53 L166 58 Z" fill="#d4af37" opacity="0.8" />
      <polygon points="154,58 166,58 163,70 157,70" fill="#f5e39b" fillOpacity="0.35" stroke="#d4af37" strokeWidth="0.75" />
      <circle cx="160" cy="64" r="2.5" fill="#fef08a" opacity="0.9" />
      <circle cx="160" cy="64" r="10" fill="#fef08a" fillOpacity="0.15" />
      <path d="M157 70 L163 70 L160 74 Z" fill="#d4af37" opacity="0.8" />
    </svg>
  );
}

function MosqueSkyline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 160" className={className} aria-hidden="true" fill="none" preserveAspectRatio="none">
      <defs>
        <linearGradient id="mosque-skyline-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a3a2d" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#05241b" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#020e0b" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="dune-back-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f4d3c" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#031610" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Dunes douces à l'arrière-plan */}
      <path
        d="M0 160 V105 Q90 80 180 100 T360 90 V160 Z"
        fill="url(#dune-back-grad)"
      />
      <path
        d="M0 160 V115 Q120 95 240 120 T360 110 V160 Z"
        fill="url(#dune-back-grad)"
        opacity="0.6"
      />

      {/* Minaret extrême gauche */}
      <path
        d="M26 160 V65 c0-5 3-8 8-9 l-3-8 3-7 3 7 -3 8 c5 1 8 4 8 9 v95 H26 Z"
        fill="url(#mosque-skyline-grad)"
      />
      <circle cx="34" cy="41" r="2" fill="#d4af37" opacity="0.85" />
      <rect x="28" y="85" width="12" height="3" rx="1.5" fill="#d4af37" fillOpacity="0.4" />

      {/* Minaret intermédiaire gauche */}
      <path
        d="M74 160 V85 c0-4 2.5-6 6-7 l-2-6 2-5 2 5 -2 6 c3.5 1 6 3 6 7 v75 H74 Z"
        fill="url(#mosque-skyline-grad)"
      />

      {/* Dôme secondaire gauche */}
      <path
        d="M60 160 V122 C60 102 75 92 95 86 C115 92 130 102 130 122 V160 H60 Z"
        fill="url(#mosque-skyline-grad)"
      />
      <circle cx="95" cy="84" r="1.5" fill="#d4af37" opacity="0.8" />

      {/* Grand Dôme Central */}
      <path
        d="M110 160 V108 C110 65 142 46 180 28 C218 46 250 65 250 108 V160 H110 Z"
        fill="url(#mosque-skyline-grad)"
      />
      <line x1="180" y1="28" x2="180" y2="20" stroke="#d4af37" strokeWidth="1.2" />
      <path
        d="M180 14 C178 14 176 16 176 18.5 C176 21 178.5 22.5 181 22 C179.5 22 178.2 20.8 178.2 18.5 C178.2 16.2 179.5 14.8 181 14.5 C180.7 14.2 180.3 14 180 14 Z"
        fill="#f5e39b"
        opacity="0.95"
      />

      {/* Dôme secondaire droit */}
      <path
        d="M230 160 V122 C230 102 245 92 265 86 C285 92 300 102 300 122 V160 H230 Z"
        fill="url(#mosque-skyline-grad)"
      />
      <circle cx="265" cy="84" r="1.5" fill="#d4af37" opacity="0.8" />

      {/* Minaret intermédiaire droit */}
      <path
        d="M272 160 V85 c0-4 2.5-6 6-7 l-2-6 2-5 2 5 -2 6 c3.5 1 6 3 6 7 v75 H272 Z"
        fill="url(#mosque-skyline-grad)"
      />

      {/* Minaret extrême droit */}
      <path
        d="M318 160 V65 c0-5 3-8 8-9 l-3-8 3-7 3 7 -3 8 c5 1 8 4 8 9 v95 H318 Z"
        fill="url(#mosque-skyline-grad)"
      />
      <circle cx="326" cy="41" r="2" fill="#d4af37" opacity="0.85" />
      <rect x="320" y="85" width="12" height="3" rx="1.5" fill="#d4af37" fillOpacity="0.4" />

      {/* Arches éclairées à la base */}
      <path
        d="M135 160 V134 C135 125 141 118 150 118 C159 118 165 125 165 134 V160"
        stroke="#d4af37"
        strokeWidth="0.8"
        strokeOpacity="0.3"
      />
      <path
        d="M165 160 V128 C165 118 172 110 180 110 C188 110 195 118 195 128 V160"
        stroke="#d4af37"
        strokeWidth="1"
        strokeOpacity="0.4"
      />
      <path
        d="M195 160 V134 C195 125 201 118 210 118 C219 118 225 125 225 134 V160"
        stroke="#d4af37"
        strokeWidth="0.8"
        strokeOpacity="0.3"
      />
    </svg>
  );
}

function BismillahOrnament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 select-none ${className}`} aria-hidden="true">
      <span className="h-[1px] w-8 bg-gradient-to-r from-transparent via-[#d4af37]/60 to-[#d4af37]" />
      <span className="size-1.5 rotate-45 border border-[#d4af37] bg-[#d4af37]/40 shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
      <span className="font-arabic text-sm text-[#e8d9a0] tracking-widest drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
      </span>
      <span className="size-1.5 rotate-45 border border-[#d4af37] bg-[#d4af37]/40 shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
      <span className="h-[1px] w-8 bg-gradient-to-l from-transparent via-[#d4af37]/60 to-[#d4af37]" />
    </div>
  );
}

const PRAYER_ARABIC_NAMES: Record<string, string> = {
  Fajr: "الفجر",
  Sunrise: "الشروق",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Sunset: "الغروب",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

const ARABIC_SCRIPT_CODES = new Set([
  "ar",
  "ps",
  "ur",
  "fa",
  "ar-DZ",
  "ar-MA",
  "ar-EG",
  "ar-TN",
]);

/* ------------------------------------------------------------------ */

export function AppOnboardingModal({ onComplete }: { onComplete: () => void }) {
  const { settings, update } = useSettings();
  const { t } = useI18n();
  const { data: prayerData, next: nextPrayer } = usePrayerTimes({ disableClock: true });

  const [screen, setScreen] = useState<Screen>("welcome");
  const [visible, setVisible] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [profileNameInput, setProfileNameInput] = useState(() => settings.profileName || "");
  const scrollLockedRef = useRef(false);
  const lastNavAtRef = useRef(0);
  const completingRef = useRef(false);

  useEffect(() => {
    if (settings.profileName) {
      setProfileNameInput(settings.profileName);
    }
  }, [settings.profileName]);

  useEffect(() => {
    const ensureLocked = () => {
      if (!scrollLockedRef.current) {
        lockBodyScroll();
        scrollLockedRef.current = true;
      }
    };
    const ensureUnlocked = () => {
      if (scrollLockedRef.current) {
        unlockBodyScroll();
        scrollLockedRef.current = false;
      }
    };

    if (!isOnboardingCompleted()) {
      completingRef.current = false;
      setVisible(true);
      ensureLocked();
    }
    const unsubscribe = subscribeToOnboardingOpen(() => {
      completingRef.current = false;
      lastNavAtRef.current = 0;
      setScreen("welcome");
      setVisible(true);
      ensureLocked();
    });
    return () => {
      unsubscribe();
      ensureUnlocked();
    };
  }, []);

  const filteredLanguages = useMemo(() => {
    const q = langSearch.trim().toLowerCase();
    if (!q) return ONBOARDING_LANGUAGES;
    return ONBOARDING_LANGUAGES.filter(
      (item) =>
        item.nativeName.toLowerCase().includes(q) ||
        item.subName.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q),
    );
  }, [langSearch]);

  if (!visible) return null;

  const index = SCREENS.indexOf(screen);

  const canNavigate = () => {
    if (completingRef.current) return false;
    const now = Date.now();
    if (now - lastNavAtRef.current < 240) {
      return false;
    }
    lastNavAtRef.current = now;
    return true;
  };

  const goTo = (next: Screen) => {
    if (next === screen || !canNavigate()) return;
    playClick();
    vibrate("button");
    setScreen(next);
  };

  const nextScreen = (): Screen => {
    const i = SCREENS.indexOf(screen);
    return SCREENS[Math.min(SCREENS.length - 1, i + 1)];
  };

  const handleSaveAndContinueName = () => {
    if (!canNavigate()) return;
    const trimmed = profileNameInput.trim();
    if (trimmed) {
      update({ profileName: trimmed });
    }
    playClick();
    vibrate("button");
    setScreen("prayers");
  };

  const handleSkipName = () => {
    if (!canNavigate()) return;
    playClick();
    vibrate("button");
    setScreen("prayers");
  };

  const handleComplete = () => {
    if (completingRef.current) return;
    const now = Date.now();
    if (now - lastNavAtRef.current < 220) {
      return;
    }
    completingRef.current = true;
    lastNavAtRef.current = now;

    const trimmed = profileNameInput.trim();
    if (trimmed && trimmed !== settings.profileName) {
      update({ profileName: trimmed });
    }
    playConfirm();
    vibrate("button");
    setOnboardingCompleted(true);
    if (scrollLockedRef.current) {
      unlockBodyScroll();
      scrollLockedRef.current = false;
    }
    setVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };


  const times = prayerData?.timings;
  const nextKey = nextPrayer?.key;
  const placeName = settings.place?.name;

  return (
    <div className="fixed inset-0 z-[100000] overflow-hidden bg-[#010907] text-white">
      {/* 1. Dégradé de fond céleste profond : émeraude royale, pétrole sombre et vert nuit */}
      <div className="absolute inset-0 bg-[radial-gradient(140%_100%_at_50%_-10%,#0e5845_0%,#083b2e_32%,#041e17_65%,#010c09_100%)]" />

      {/* 2. Ciel nocturne étoilé avec étoiles scintillantes et étoile du matin */}
      <CelestialNightSky className="pointer-events-none absolute inset-x-0 top-0 h-80 w-full opacity-90" />

      {/* 3. Motifs géométriques islamiques entrelacés (Girih à 8 branches) */}
      <IslamicRosettePattern className="pointer-events-none absolute inset-0 h-full w-full text-[#d4af37] opacity-[0.065]" />

      {/* 4. Halo doré zénithal chaleureux */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-88 w-88 -translate-x-1/2 rounded-full bg-gradient-to-b from-[#d4af37]/25 via-[#f5e39b]/12 to-transparent blur-3xl" />

      {/* 5. Grande Arche de Mihrab royale avec lanterne suspendue (Fanous) */}
      <GrandMihrabArch className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full text-[#d4af37]" />

      {/* 6. Skyline de la Mosquée Impériale avec minarets et coupoles sur l'horizon */}
      <MosqueSkyline className="pointer-events-none absolute bottom-0 inset-x-0 h-44 sm:h-52 w-full" />

      {/* 7. Croissant de lune céleste avec halo lumineux */}
      <div className="pointer-events-none absolute right-6 top-16 opacity-85">
        <div className="absolute -inset-2 rounded-full bg-[#d4af37]/20 blur-md" />
        <Moon className="relative size-6 text-[#f5e39b] drop-shadow-[0_0_14px_rgba(212,175,55,0.7)]" />
      </div>

      {/* 8. Voile inférieur en dégradé noir-émeraude pour garantir la lisibilité parfaite des boutons */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#010907] via-[#02110d]/90 to-transparent" />

      {/* Contenu */}
      <div className="relative flex h-full flex-col">
        {/* Progression & Fermer */}
        <div className="flex items-center gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex flex-1 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur-md">
            {SCREENS.map((s, i) => (
              <span
                key={s}
                className={`h-[3.5px] flex-1 rounded-full transition-all duration-500 ${
                  i === index
                    ? "bg-gradient-to-r from-[#d4af37] to-[#f5e39b] shadow-[0_0_10px_rgba(212,175,55,0.9)]"
                    : i < index
                      ? "bg-[#d4af37]/80"
                      : "bg-white/15"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleSkip}
            aria-label={t.onboardingSkip || t.close}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.06] text-white/70 backdrop-blur-md transition-all duration-150 hover:border-[#d4af37]/50 hover:text-white active:scale-90 cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3 pt-3">
          {screen === "welcome" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex h-full flex-col items-center justify-end text-center pb-6">
              {/* Logo officiel Islam-Noor dans le médaillon « Emerald Signature » */}
              <div className="mb-auto mt-2 relative">
                <div className="absolute -inset-3 rounded-[36px] bg-[#d4af37]/25 blur-xl" />
                <div className="relative grid size-24 place-items-center rounded-[32px] border-2 border-[#d4af37]/50 bg-gradient-to-b from-[#d4af37]/25 via-emerald-950/60 to-[#020e0b] p-2 text-[#f2e2a8] shadow-[0_16px_40px_-16px_rgba(212,175,55,0.75)]">
                  <div className="absolute inset-1 rounded-[26px] border border-[#d4af37]/25 pointer-events-none" />
                  <img
                    src={appLogoImg}
                    alt={t.appName}
                    className="relative size-16 object-contain rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.5)] border border-[#d4af37]/40"
                  />
                </div>
              </div>

              {/* Bismillah en calligraphie arabe traditionnelle */}
              <BismillahOrnament className="mb-2 opacity-95" />

              {/* Salutation calligraphiée en arabe traditionnel (Naskh & Thuluth) */}
              <div className="mb-2.5 font-arabic text-[16px] sm:text-[18px] text-[#fef08a] tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] select-none">
                مَرْحَباً بِكُمْ فِي رِحَابِ الإِيمَانِ
              </div>

              {/* Badge cérémonial en petites capitales espacées (Monospace architectural) */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/15 px-3 py-1 shadow-[0_2px_14px_rgba(212,175,55,0.3)]">
                <Sparkles className="size-3 text-[#d4af37]" />
                <span className="font-mono text-[9.5px] font-extrabold uppercase tracking-[0.26em] text-[#f5e39b]">
                  ÉCRIN SPIRITUEL &bull; NOUR
                </span>
              </div>

              {/* Grand Titre royal majestueux en dégradé bicolore d'or métallisé (Font Serif Cinzel) */}
              <h1 className="mt-2.5 font-serif text-[32px] sm:text-[36px] font-black tracking-wider leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
                <span className="bg-gradient-to-r from-[#ffffff] via-[#fffbeb] to-[#fde047] bg-clip-text text-transparent">
                  ISLAM
                </span>{" "}
                <span className="bg-gradient-to-r from-[#fde047] via-[#f59e0b] to-[#d97706] bg-clip-text text-transparent">
                  NOOR
                </span>
              </h1>

              {/* Slogan poétique en typographie éditoriale italique raffinée */}
              <p className="mt-2 max-w-[19rem] font-serif italic text-[14px] font-medium tracking-wide text-[#fef3c7] drop-shadow-sm">
                « {t.onboardingHeroTagline || "Votre spiritualité, au quotidien"} »
              </p>

              {/* Carte explicative avec hiérarchie typographique (Badge mono + corps équilibré) */}
              <div className="mt-3.5 max-w-[21rem] rounded-2xl border border-[#d4af37]/25 bg-emerald-950/45 px-4 py-3 backdrop-blur-md shadow-md text-left">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="size-1.5 rounded-full bg-[#d4af37] animate-pulse" />
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">
                    Guide d'introduction
                  </span>
                </div>
                <p className="font-sans text-[12.5px] font-normal leading-relaxed text-slate-100">
                  {t.onboardingStep1Sub}
                </p>
              </div>
            </div>
          )}

          {screen === "lang" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl border border-[#d4af37]/35 bg-[#d4af37]/15 text-[#f5e39b] shadow-[0_0_12px_rgba(212,175,55,0.2)]">
                  <Globe className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono text-[8.5px] font-extrabold uppercase tracking-[0.22em] text-[#f5e39b]">
                      LANGUE &bull; LOCALISATION
                    </span>
                  </div>
                  <h2 className="font-display text-[19px] font-black tracking-tight text-white leading-tight">
                    {t.selectLanguageTitle}
                  </h2>
                  <p className="font-serif italic text-[11.5px] text-[#f4e8c1]/85">{t.selectLanguageSub}</p>
                </div>
              </div>

              {/* Barre de recherche avec accent émeraude & doré */}
              <div className="relative mt-3.5">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#d4af37]/80" />
                <input
                  type="text"
                  value={langSearch}
                  onChange={(e) => setLangSearch(e.target.value)}
                  placeholder={t.search50Languages}
                  className="w-full rounded-2xl border border-[#d4af37]/30 bg-emerald-950/50 pl-10 pr-3 py-2.5 font-sans text-xs text-white outline-none backdrop-blur-md placeholder:text-white/40 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/25 shadow-inner"
                />
              </div>

              {/* Grille des langues avec typographies natives et codes monospaces distincts */}
              <div className="mt-3.5 grid grid-cols-2 gap-2 pb-2">
                {filteredLanguages.map((item) => {
                  const selected = settings.language === item.code;
                  const isArabicScript = ARABIC_SCRIPT_CODES.has(item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        playClick();
                        vibrate("button");
                        update({ language: item.code });
                      }}
                      className={`group flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                        selected
                          ? "border-[#d4af37] bg-gradient-to-r from-[#d4af37]/25 via-emerald-900/40 to-emerald-950/60 shadow-[0_6px_22px_-6px_rgba(212,175,55,0.7)]"
                          : "border-white/10 bg-white/[0.03] hover:border-[#d4af37]/45 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="text-xl leading-none drop-shadow-sm">{item.flag}</span>
                      <span className="min-w-0 flex-1">
                        {isArabicScript ? (
                          <span className="block truncate font-arabic text-[15.5px] font-bold text-[#fef3c7] leading-tight">
                            {item.nativeName}
                          </span>
                        ) : (
                          <span className="block truncate font-display text-[12.5px] font-bold text-white group-hover:text-[#f5e39b]">
                            {item.nativeName}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 mt-0.5">
                          <span className="truncate font-sans italic text-[9.5px] text-white/55">
                            {item.subName}
                          </span>
                          <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-[#d4af37] bg-[#d4af37]/15 px-1 py-0.2 rounded border border-[#d4af37]/25 shrink-0">
                            {item.code}
                          </span>
                        </span>
                      </span>
                      {selected && (
                        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[#d4af37] to-[#f5e39b] text-[#020e0b] shadow-[0_0_8px_rgba(212,175,55,0.9)]">
                          <Check className="size-2.5" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {screen === "name" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl border border-[#d4af37]/35 bg-[#d4af37]/15 text-[#f5e39b] shadow-[0_0_12px_rgba(212,175,55,0.2)]">
                  <User className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono text-[8.5px] font-extrabold uppercase tracking-[0.22em] text-[#f5e39b]">
                      PERSONNALISATION &bull; IDENTITÉ
                    </span>
                  </div>
                  <h2 className="font-display text-[19px] font-black tracking-tight text-white leading-tight">
                    {t.onboardingNameTitle || "Comment devons-nous vous appeler ?"}
                  </h2>
                  <p className="font-serif italic text-[11.5px] text-[#f4e8c1]/85">
                    {t.onboardingNameSub || "Entrez votre prénom pour personnaliser votre accueil et vos rappels (facultatif)."}
                  </p>
                </div>
              </div>

              {/* Médaillon central d'avatar avec initiale dynamique ou icône */}
              <div className="flex flex-col items-center justify-center pt-2 pb-1">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-full bg-[#d4af37]/25 blur-xl animate-pulse" />
                  <div className="relative grid size-20 place-items-center rounded-full border-2 border-[#d4af37]/60 bg-gradient-to-b from-[#d4af37]/25 via-emerald-950/80 to-[#020e0b] shadow-[0_10px_30px_-8px_rgba(212,175,55,0.7)]">
                    {profileNameInput.trim() ? (
                      <span className="font-serif text-2xl font-black text-[#fef08a] drop-shadow-md select-none">
                        {profileNameInput.trim()[0].toUpperCase()}
                      </span>
                    ) : (
                      <User className="size-8 text-[#f5e39b]/85 drop-shadow" />
                    )}
                  </div>
                </div>

                {profileNameInput.trim() ? (
                  <div className="mt-2.5 text-center">
                    <div className="font-arabic text-base text-[#fef08a] drop-shadow select-none">
                      مَرْحَباً {profileNameInput.trim()}
                    </div>
                    <p className="font-sans text-xs text-white/90 font-medium">
                      Bienvenue, <span className="font-bold text-[#f5e39b]">{profileNameInput.trim()}</span> !
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#d4af37]/90">
                      <Sparkles className="size-2.5 text-[#d4af37]" />
                      Profil invité discret
                    </span>
                  </div>
                )}
              </div>

              {/* Carte du champ de saisie (TextField) */}
              <div className="rounded-2xl border border-[#d4af37]/30 bg-emerald-950/50 p-4 backdrop-blur-md shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="onboarding-firstname" className="flex items-center gap-1.5 font-display text-[12px] font-bold text-white">
                    <Sparkles className="size-3 text-[#d4af37]" />
                    <span>Votre prénom</span>
                  </label>
                  <span className="font-mono text-[8.5px] font-bold uppercase tracking-wider text-[#d4af37] bg-[#d4af37]/15 px-1.5 py-0.5 rounded border border-[#d4af37]/25">
                    FACULTATIF
                  </span>
                </div>

                <div className="relative flex items-center">
                  <User className="pointer-events-none absolute left-3.5 size-4 text-[#d4af37]/80" />
                  <input
                    id="onboarding-firstname"
                    type="text"
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveAndContinueName();
                      }
                    }}
                    placeholder={t.onboardingNamePlaceholder || "Entrez votre prénom ici..."}
                    maxLength={32}
                    autoComplete="given-name"
                    autoFocus
                    className="w-full rounded-xl border border-[#d4af37]/35 bg-[#01140e]/80 pl-10 pr-9 py-3 font-sans text-xs text-white outline-none backdrop-blur-md placeholder:text-white/40 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/30 shadow-inner"
                  />
                  {profileNameInput.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setProfileNameInput("")}
                      className="absolute right-2.5 grid size-6 place-items-center rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition cursor-pointer"
                      aria-label="Effacer"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                <p className="font-sans text-[11px] leading-relaxed text-slate-200/75">
                  {t.onboardingNameOptionalHint || "Étape facultative • Vous pourrez le modifier à tout moment dans les Paramètres."}
                </p>
              </div>

              {/* Note de confidentialité locale */}
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <p className="font-sans text-[10.5px] text-white/60">
                  Stocké uniquement sur votre appareil • Aucune donnée transmise.
                </p>
              </div>
            </div>
          )}

          {screen === "prayers" && (

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-mono text-[8.5px] font-extrabold uppercase tracking-[0.22em] text-[#f5e39b]">
                    HORAIRES CERTIFIÉS &bull; ADHAN
                  </span>
                </div>
                <h2 className="font-display text-[19px] font-black tracking-tight text-white leading-tight">
                  {t.onboardingStep1Title}
                </h2>
                <p className="mt-0.5 font-sans text-[12px] text-[#f4e8c1]/85">{t.onboardingStep1Sub}</p>
              </div>

              {/* Carte premium « Prochaine Prière » avec contrastes typographiques royaux */}
              <div className="relative overflow-hidden rounded-[26px] border border-[#d4af37]/40 bg-gradient-to-br from-emerald-900/75 via-[#062c23]/80 to-[#02130f]/95 p-4 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(212,175,55,0.35)] backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/35 bg-[#d4af37]/15 px-2.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#f5e39b]">
                    <Sparkles className="size-2.5 text-[#d4af37]" />
                    {t.nextPrayer || "Prochaine prière"}
                  </span>
                  {placeName && (
                    <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 font-sans text-[10.5px] font-medium text-white/90">
                      <MapPin className="size-2.5 text-[#d4af37]" />
                      <span className="truncate max-w-[130px]">{placeName}</span>
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <p className="font-display text-[26px] font-black tracking-tight bg-gradient-to-r from-white via-amber-50 to-[#fde68a] bg-clip-text text-transparent drop-shadow-sm">
                      {nextKey && nextPrayer
                        ? (t[nextKey.toLowerCase() as "fajr"] ?? nextKey)
                        : "Prière"}
                    </p>
                    {nextKey && PRAYER_ARABIC_NAMES[nextKey] && (
                      <span className="font-arabic text-[22px] font-bold text-[#d4af37]/80 drop-shadow-xs select-none">
                        {PRAYER_ARABIC_NAMES[nextKey]}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[27px] font-black tracking-tight tabular-nums text-[#fde68a] drop-shadow-[0_0_12px_rgba(245,230,140,0.55)]">
                    {nextKey && prayerData?.timings?.[nextKey]
                      ? cleanTime(prayerData.timings[nextKey])
                      : "--:--"}
                  </p>
                </div>
              </div>

              {/* Bandeau des cinq prières avec calligraphie arabe et heure numérique */}
              <div className="rounded-[22px] border border-white/10 bg-black/40 p-2.5 backdrop-blur-md">
                <div className="grid grid-cols-5 gap-1">
                  {PRAYER_KEYS.map((key) => {
                    const isNext = key === nextKey;
                    return (
                      <div
                        key={key}
                        className={`rounded-xl p-1.5 text-center transition-all ${
                          isNext
                            ? "border border-[#d4af37]/50 bg-[#d4af37]/15 shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                            : "bg-white/[0.03]"
                        }`}
                      >
                        <p
                          className={`truncate font-display text-[9px] font-extrabold uppercase tracking-wider ${
                            isNext ? "text-[#f5e39b]" : "text-white/60"
                          }`}
                        >
                          {t[key.toLowerCase() as "fajr"] ?? key}
                        </p>
                        <p className="font-arabic text-[11px] font-semibold text-[#d4af37]/75 leading-none mt-0.5 select-none">
                          {PRAYER_ARABIC_NAMES[key] || ""}
                        </p>
                        <p
                          className={`mt-1 font-mono text-[12px] font-black tabular-nums ${
                            isNext ? "text-white" : "text-white/85"
                          }`}
                        >
                          {times ? cleanTime(times[key]) : "--:--"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Points clés avec médaillons dorés et mots rehaussés */}
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
                <ul className="space-y-2">
                  {[t.onboardingStep1Bullet1, t.onboardingStep1Bullet3, t.onboardingStep1Bullet4].map(
                    (b) => (
                      <li key={b} className="flex items-center gap-2.5 font-sans text-[12px] font-medium text-slate-100">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full border border-[#d4af37]/40 bg-[#d4af37]/15 text-[#f5e39b]">
                          <Bell className="size-2.5 text-[#d4af37]" />
                        </span>
                        <span className="leading-snug">{b}</span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          )}

          {screen === "quran" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-mono text-[8.5px] font-extrabold uppercase tracking-[0.22em] text-[#f5e39b]">
                  CORAN SACRÉ &bull; SOURATES &bull; DOUAS
                </span>
              </div>
              <h2 className="font-display text-[19px] font-black tracking-tight text-white leading-tight">
                {t.onboardingStep2Title}
              </h2>
              <p className="mt-0.5 font-sans text-[12px] text-[#f4e8c1]/85">{t.onboardingStep2Sub}</p>

              {/* Bannière calligraphique sacrée avec Verset coranique et traduction en italique */}
              <div className="mt-3 rounded-2xl border border-[#d4af37]/35 bg-gradient-to-r from-emerald-950/70 via-[#041c16]/85 to-emerald-950/70 p-3 text-center shadow-sm">
                <p className="font-arabic text-[17px] font-bold text-[#fef08a] leading-relaxed tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)] select-none">
                  ﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾
                </p>
                <p className="mt-1 font-serif italic text-[11px] text-[#f4e8c1]/85">
                  « N'est-ce point par l'évocation d'Allah que les cœurs s'apaisent ? » &bull; Sourate 13, v. 28
                </p>
              </div>

              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { icon: BookOpen, label: t.onboardingStep2Bullet1, tag: "LECTURE" },
                  { icon: Heart, label: t.onboardingStep2Bullet2, tag: "FAVORIS" },
                  { icon: SquareStack, label: t.onboardingStep2Bullet3, tag: "RÉCITATIONS" },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    className="group flex items-center gap-3 rounded-[22px] border border-[#d4af37]/25 bg-gradient-to-r from-emerald-950/50 to-[#041c16]/65 p-3.5 backdrop-blur-sm transition-all hover:border-[#d4af37]/50"
                    style={{ animationDelay: `${i * 90}ms` }}
                  >
                    <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[#d4af37]/35 bg-[#d4af37]/15 text-[#f5e39b] shadow-[0_0_12px_rgba(212,175,55,0.25)]">
                      <item.icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.18em] text-[#d4af37] block">
                        {item.tag}
                      </span>
                      <p className="font-display text-[13.5px] font-black leading-snug text-white/95">
                        {item.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {screen === "tools" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-mono text-[8.5px] font-extrabold uppercase tracking-[0.22em] text-[#f5e39b]">
                  BOUSSOLE &bull; GÉOLOCALISATION
                </span>
              </div>
              <h2 className="font-display text-[19px] font-black tracking-tight text-white leading-tight">
                {t.onboardingStep5Title}
              </h2>
              <p className="mt-0.5 font-sans text-[12px] text-[#f4e8c1]/85">{t.onboardingStep5Sub}</p>

              <div className="mt-3.5 space-y-2.5">
                {[
                  {
                    icon: Compass,
                    tag: "BOUSSOLE &bull; 360° KAABA",
                    status: "SATELLITE",
                    title: t.onboardingStep5Bullet1,
                    desc: t.onboardingStep5Bullet2,
                  },
                  {
                    icon: MapPin,
                    tag: "GÉOLOCALISATION &bull; RAYON",
                    status: "GEO-FINDER",
                    title: t.onboardingStep3Bullet1,
                    desc: t.onboardingStep3Bullet3,
                  },
                ].map((item, i) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3.5 rounded-[24px] border border-[#d4af37]/30 bg-gradient-to-r from-emerald-950/55 to-[#041d17]/65 p-3.5 backdrop-blur-sm shadow-xs"
                    style={{ animationDelay: `${i * 90}ms` }}
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/15 text-[#f5e39b] shadow-[0_0_14px_rgba(212,175,55,0.25)]">
                      <item.icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className="font-mono text-[8.5px] font-extrabold uppercase tracking-[0.2em] text-[#f5e39b]"
                          dangerouslySetInnerHTML={{ __html: item.tag }}
                        />
                        <span className="font-mono text-[9px] font-semibold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                          {item.status}
                        </span>
                      </div>
                      <p className="font-display text-[14px] font-black tracking-tight text-white mt-0.5">
                        {item.title}
                      </p>
                      <p className="mt-0.5 font-sans text-[11.5px] font-normal leading-relaxed text-slate-200/85">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {screen === "ready" && (
            <div className="animate-in fade-in zoom-in-95 duration-500 flex h-full flex-col items-center justify-center text-center">
              <div className="relative mb-2">
                <div className="absolute -inset-3 rounded-[36px] bg-[#d4af37]/25 blur-xl" />
                <div className="relative grid size-20 place-items-center rounded-[28px] border-2 border-[#d4af37]/50 bg-gradient-to-b from-[#d4af37]/20 via-emerald-950/60 to-[#020e0b] p-2 text-[#f2e2a8] shadow-[0_16px_40px_-16px_rgba(212,175,55,0.8)]">
                  <img
                    src={appLogoImg}
                    alt={t.appName}
                    className="relative size-14 object-contain rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.5)] border border-[#d4af37]/40"
                  />
                </div>
              </div>

              {/* Bénédiction islamique calligraphiée */}
              <div className="font-arabic text-[17px] font-bold text-[#fef08a] tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] select-none mb-1">
                بَارَكَ اللَّهُ فِيكُمْ وَتَقَبَّلَ مِنَّا وَمِنكُم
              </div>

              {/* Badge de finalisation */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/15 px-3 py-0.5 shadow-[0_2px_14px_rgba(212,175,55,0.3)] mb-2">
                <Sparkles className="size-3 text-[#d4af37]" />
                <span className="font-mono text-[9px] font-extrabold uppercase tracking-[0.24em] text-[#f5e39b]">
                  EXPÉRIENCE PERSONNALISÉE
                </span>
              </div>

              <h2 className="font-serif text-[24px] sm:text-[27px] font-black tracking-wider bg-gradient-to-r from-white via-[#fef3c7] to-[#d4af37] bg-clip-text text-transparent drop-shadow-sm">
                {t.onboardingStep4Title}
              </h2>
              <p className="mt-1.5 max-w-[19rem] font-serif italic text-[13px] font-medium leading-relaxed text-[#f4e8c1]/95">
                {t.onboardingStep4Sub}
              </p>

              <div className="mt-3.5 grid w-full max-w-sm grid-cols-2 gap-2">
                {[
                  { icon: Palette, label: t.onboardingStep4Bullet1, tag: "THÈMES" },
                  { icon: Sparkles, label: t.onboardingStep4Bullet2, tag: "RAPPELS" },
                  { icon: ImageIcon, label: t.onboardingStep4Bullet3, tag: "FONDS" },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-left backdrop-blur-sm"
                    style={{ animationDelay: `${i * 90}ms` }}
                  >
                    <item.icon className="size-4 shrink-0 text-[#d4af37]" />
                    <div className="min-w-0">
                      <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-[#d4af37] block">
                        {item.tag}
                      </span>
                      <p className="font-display text-[11.5px] font-bold leading-snug text-white/95 truncate">
                        {item.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-[#d4af37]/60" />
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.28em] text-[#f5e39b]/90">
                  ISLAM-NOOR &bull; ÉDITION OFFICIELLE
                </p>
                <span className="h-[1px] w-6 bg-gradient-to-l from-transparent to-[#d4af37]/60" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation / Boutons de commande */}
        <footer className="shrink-0 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          {screen === "welcome" ? (
            <button
              type="button"
              onClick={() => goTo("lang")}
              className="w-full rounded-full bg-gradient-to-r from-[#c99e28] via-[#f0d87a] to-[#b38a1c] px-6 py-3.5 font-display text-[13.5px] font-black uppercase tracking-wider text-[#02130e] shadow-[0_12px_30px_-6px_rgba(212,175,55,0.85)] transition-all duration-200 hover:brightness-105 active:scale-[0.98] cursor-pointer"
            >
              {t.onboardingStart}
            </button>
          ) : screen === "lang" ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-full px-4 py-3 font-sans text-[12px] font-semibold tracking-wide text-white/65 transition hover:text-[#f5e39b] cursor-pointer"
              >
                {t.onboardingSkip}
              </button>
              <button
                type="button"
                onClick={() => goTo("name")}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#c99e28] via-[#f0d87a] to-[#b38a1c] px-6 py-3.5 font-display text-[13px] font-black uppercase tracking-wider text-[#02130e] shadow-[0_12px_30px_-6px_rgba(212,175,55,0.85)] transition-all duration-200 hover:brightness-105 active:scale-[0.98] cursor-pointer"
              >
                {t.onboardingContinue}
              </button>
            </div>
          ) : screen === "name" ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkipName}
                className="rounded-full px-4 py-3 font-sans text-[12px] font-semibold tracking-wide text-white/65 transition hover:text-[#f5e39b] cursor-pointer"
              >
                {t.onboardingSkip}
              </button>
              <button
                type="button"
                onClick={handleSaveAndContinueName}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#c99e28] via-[#f0d87a] to-[#b38a1c] px-6 py-3.5 font-display text-[13px] font-black uppercase tracking-wider text-[#02130e] shadow-[0_12px_30px_-6px_rgba(212,175,55,0.85)] transition-all duration-200 hover:brightness-105 active:scale-[0.98] cursor-pointer"
              >
                {t.onboardingContinue}
              </button>
            </div>

          ) : screen === "ready" ? (
            <button
              type="button"
              onClick={handleComplete}
              className="w-full rounded-full bg-gradient-to-r from-[#c99e28] via-[#f0d87a] to-[#b38a1c] px-6 py-3.5 font-display text-[13.5px] font-black uppercase tracking-wider text-[#02130e] shadow-[0_12px_30px_-6px_rgba(212,175,55,0.85)] transition-all duration-200 hover:brightness-105 active:scale-[0.98] cursor-pointer"
            >
              {t.onboardingStart}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-full px-4 py-3 font-sans text-[12px] font-semibold tracking-wide text-white/65 transition hover:text-[#f5e39b] cursor-pointer"
              >
                {t.onboardingSkip}
              </button>
              <button
                type="button"
                onClick={() => goTo(nextScreen())}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#c99e28] via-[#f0d87a] to-[#b38a1c] px-6 py-3.5 font-display text-[13px] font-black uppercase tracking-wider text-[#02130e] shadow-[0_12px_30px_-6px_rgba(212,175,55,0.85)] transition-all duration-200 hover:brightness-105 active:scale-[0.98] cursor-pointer"
              >
                {t.onboardingContinue}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
