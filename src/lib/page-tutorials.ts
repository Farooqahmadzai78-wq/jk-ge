import {
  Clock,
  Compass,
  BookOpen,
  Sparkles,
  Camera,
  ScanLine,
  MapPin,
  Heart,
  Palette,
  Bell,
  Volume2,
  Layers,
  RotateCcw,
  CheckCircle2,
  Search,
  Bookmark,
  Languages,
  ShieldCheck,
  Eye,
  Sliders,
  Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PageTutorialId =
  | "home"
  | "prayers"
  | "quran"
  | "tasbih"
  | "halal"
  | "mosques"
  | "names"
  | "invocations"
  | "reminder"
  | "settings";

export interface TutorialStep {
  id: string;
  icon: LucideIcon;
  badge?: string;
  title: string;
  subtitle?: string;
  description: string;
  tip?: string;
  accentColor?: string;
}

export interface PageTutorialData {
  id: PageTutorialId;
  pageName: string;
  summary: string;
  icon: LucideIcon;
  steps: TutorialStep[];
}

const TUTORIAL_SEEN_PREFIX = "nur.tutorial_seen_v2_";
const seenTutorialsInMemory = new Set<PageTutorialId>();

export function isPageTutorialSeen(pageId: PageTutorialId): boolean {
  if (typeof window === "undefined") return true;
  if (seenTutorialsInMemory.has(pageId)) return true;
  try {
    const seen = localStorage.getItem(`${TUTORIAL_SEEN_PREFIX}${pageId}`) === "true";
    if (seen) {
      seenTutorialsInMemory.add(pageId);
    }
    return seen;
  } catch {
    return seenTutorialsInMemory.has(pageId);
  }
}

export function markPageTutorialAsSeen(pageId: PageTutorialId): void {
  seenTutorialsInMemory.add(pageId);
  if (typeof window === "undefined") return;
  const key = `${TUTORIAL_SEEN_PREFIX}${pageId}`;
  if (typeof queueMicrotask === "function") {
    queueMicrotask(() => {
      try {
        localStorage.setItem(key, "true");
      } catch {
        // ignore storage quota/security errors
      }
    });
  } else {
    try {
      localStorage.setItem(key, "true");
    } catch {
      // ignore
    }
  }
}

export function resetPageTutorial(pageId: PageTutorialId): void {
  seenTutorialsInMemory.delete(pageId);
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${TUTORIAL_SEEN_PREFIX}${pageId}`);
  } catch {
    // ignore
  }
}

export function clearPageTutorialMemoryForTests(): void {
  seenTutorialsInMemory.clear();
}

export function getPageTutorial(pageId: PageTutorialId, locale = "fr"): PageTutorialData {
  const isEn = locale.startsWith("en");
  const isAr = locale.startsWith("ar");
  const isPs = locale.startsWith("ps");
  const isTr = locale.startsWith("tr");

  switch (pageId) {
    case "home":
      if (isAr) {
        return {
          id: "home",
          pageName: "الرئيسية ولوحة التحكم اليومية",
          summary: "متابعة أوقات الصلاة، العد التنازلي، إنجاز الصلوات الخمس والاختصارات الإيمانية.",
          icon: Clock,
          steps: [
            {
              id: "h1",
              icon: Clock,
              badge: "أوقات الصلاة والعد التنازلي",
              title: "مواقيت الصلاة المباشرة",
              description: "شاهد الصلاة الحالية والوقت المتبقي بدقة والمسار الزمني التفاعلي لجميع الصلوات الخمس.",
              tip: "المس اسم مدينتك في أي وقت لتغيير الموقع أو البحث عن مدينة أخرى.",
              accentColor: "emerald",
            },
            {
              id: "h2",
              icon: CheckCircle2,
              badge: "المتابعة اليومية",
              title: "تسجيل الصلوات الخمس والمواظبة",
              description: "حدد كل صلاة تؤديها لتسجيل استمرارك وبناء عادات إيمانية مباركة.",
              tip: "اطلع على رسمك البياني الأسبوعي ونسبة المواظبة أسفل قائمة الصلوات.",
              accentColor: "emerald",
            },
            {
              id: "h3",
              icon: BookOpen,
              badge: "مشغل القرآن السريع",
              title: "تلاوة صوتية وقراءة مباشرة",
              description: "استمع إلى القرآن الكريم مباشرة من الشاشة الرئيسية مع القارئ المفضل دون مغادرة اللوحة.",
              tip: "اضغط على بطاقة السورة للانتقال مباشرة إلى قارئ القرآن الشامل.",
              accentColor: "teal",
            },
            {
              id: "h4",
              icon: Sparkles,
              badge: "أيقونات الوصول السريع",
              title: "اختصارات التنقل الفوري",
              description: "انتقل بلمسة واحدة إلى بوصلة القبلة، والمسبحة الإلكترونية، وماسح الحلال، وأسماء الله الحسنى.",
              tip: "استخدم شريط التنقل السفلي للتنقل بين الأقسام الرئيسية بسلاسة.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isPs) {
        return {
          id: "home",
          pageName: "اصلي پاڼه او ورځنی ډشبورډ",
          summary: "د لمانځه وختونه، پاتې وخت، پنځه وخته لمونځونه او ایماني لنډلارې.",
          icon: Clock,
          steps: [
            {
              id: "h1",
              icon: Clock,
              badge: "د لمانځه ژوندي وختونه",
              title: "د لمانځه مهالوېش او پاتې وخت",
              description: "د اوسني لمانځه پاتې وخت او د پنځه وخته لمانځه مهالوېش په دقیقه توګه وګورئ.",
              tip: "د ښار بدلولو لپاره په ښار کلیک وکړئ.",
              accentColor: "emerald",
            },
            {
              id: "h2",
              icon: CheckCircle2,
              badge: "ورځنی ثبت",
              title: "خپل لمونځونه په نښه کړئ",
              description: "هر لمونځ چې ادا کوئ هغه په نښه کړئ ترڅو خپل لمونځونه په منظمه توګه وساتئ.",
              tip: "خپل اوونیز راپور د لست لاندې وګورئ.",
              accentColor: "emerald",
            },
            {
              id: "h3",
              icon: BookOpen,
              badge: "د قرآن چټک لوستونکی",
              title: "د قرآن تلاوت او اورېدل",
              description: "په اسانۍ سره له اصلي پاڼې څخه د خپل خوښې قاري په غږ قرآن واورئ.",
              tip: "په سورت کلیک کولو سره بشپړ قرآن کریم ته لاړ شئ.",
              accentColor: "teal",
            },
            {
              id: "h4",
              icon: Sparkles,
              badge: "چټکې تڼۍ",
              title: "قبلې، تسبیح او حلال سکینر ته لنډلارې",
              description: "په یوه کلیک سره قبلې، برېښنايي تسبیح، حلال سکینر او د الله نومونو ته لاسرسی ومومئ.",
              tip: "د ښکتنۍ پټې په مرسته هرې برخې ته ولاړ شئ.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isEn) {
        return {
          id: "home",
          pageName: "Home & Daily Dashboard",
          summary: "Track prayer times, countdown, daily prayers, and daily spiritual quick actions.",
          icon: Clock,
          steps: [
            {
              id: "h1",
              icon: Clock,
              badge: "Live Clock & Timeline",
              title: "Prayer Times & Live Arc",
              description: "View the active prayer, remaining time countdown, and interactive arc timeline across all 5 daily prayers.",
              tip: "Tap your city name at any time to switch location or search another town.",
              accentColor: "emerald",
            },
            {
              id: "h2",
              icon: CheckCircle2,
              badge: "Daily Tracking",
              title: "5 Prayers Check & Streak",
              description: "Tap each prayer card once you've prayed to record your daily regularity and build positive spiritual habits.",
              tip: "View your weekly graph and success rate directly below the prayer list.",
              accentColor: "emerald",
            },
            {
              id: "h3",
              icon: BookOpen,
              badge: "Quick Quran Player",
              title: "Integrated Audio & Reading",
              description: "Listen to the Quran directly from the home screen with your chosen reciter without leaving the dashboard.",
              tip: "Tap the surah card to jump straight into the full Quran reader.",
              accentColor: "teal",
            },
            {
              id: "h4",
              icon: Sparkles,
              badge: "Quick Access Icons",
              title: "Instant Navigation Grid",
              description: "Quickly access the Qibla compass, Digital Tasbih counter, Halal scanner, and the 99 Names of Allah.",
              tip: "Use the bottom navigation bar to switch between main sections seamlessly.",
              accentColor: "amber",
            },
          ],
        };
      }
      return {
        id: "home",
        pageName: "Accueil & Tableau de bord",
        summary: "Suivi des horaires de prière, compte à rebours, accomplissement des 5 prières et raccourcis spirituels.",
        icon: Clock,
        steps: [
          {
            id: "h1",
            icon: Clock,
            badge: "Horaires & Arc solaire",
            title: "Horaires en direct & Compte à rebours",
            description: "Visualisez instantanément la prière en cours, le temps restant exact et l'arc temporel interactif de la journée.",
            tip: "Touchez le nom de votre ville en haut pour rechercher ou changer de localisation d'un clic.",
            accentColor: "emerald",
          },
          {
            id: "h2",
            icon: CheckCircle2,
            badge: "Suivi quotidien",
            title: "Cochez vos 5 prières accomplies",
            description: "Cochez chaque prière au fur et à mesure de votre journée pour enregistrer votre assiduité et vos statistiques.",
            tip: "Retrouvez vos graphiques hebdomadaires et votre taux de réussite juste sous la liste.",
            accentColor: "emerald",
          },
          {
            id: "h3",
            icon: BookOpen,
            badge: "Coran Express",
            title: "Lecteur audio & Récitation en continu",
            description: "Écoutez le Saint Coran avec votre récitateur favori directement depuis l'écran d'accueil sans changer de page.",
            tip: "Un clic sur la sourate ouvre directement le lecteur complet et la traduction.",
            accentColor: "teal",
          },
          {
            id: "h4",
            icon: Sparkles,
            badge: "Accès rapides",
            title: "Raccourcis Qibla, Tasbih & Halal",
            description: "Accédez en un clin d'œil à la boussole Qibla, au compteur de Dhikr, au scanner Halal et aux 99 Noms d'Allah.",
            tip: "La barre de navigation inférieure vous permet de naviguer partout sans friction.",
            accentColor: "amber",
          },
        ],
      };

    case "prayers":
      if (isAr) {
        return {
          id: "prayers",
          pageName: "الصلوات واتجاه القبلة",
          summary: "مواقيت دقيقة، تقويم شهري، طرق حساب معتمدة، وبوصلة قبلة ثنائية وثلاثية الأبعاد وبتقنية الواقع المعزز.",
          icon: Compass,
          steps: [
            {
              id: "p1",
              icon: Clock,
              badge: "المواقيت وطرق الحساب",
              title: "أوقات صلاة دقيقة والإقامة",
              description: "اطلع على أوقات الفجر والشروق والظهر والعصر والمغرب والعشاء بدقة وفق الهيئات الرسمية.",
              tip: "يمكنك ضبط طريقة الحساب وفوارق الدقائق من الإعدادات لمطابقة مسجدك المحلي.",
              accentColor: "emerald",
            },
            {
              id: "p2",
              icon: Compass,
              badge: "بوصلة القبلة 2D و 3D",
              title: "اتجاه الكعبة المشرفة والمسافة",
              description: "بوصلة دقيقة موجهة مباشرة نحو الكعبة المشرفة في مكة المكرمة مع حساب المسافة بالكيلومتر.",
              tip: "ضع الهاتف في وضع أفقي مستوٍ للحصول على أعلى دقة مغناطيسية.",
              accentColor: "emerald",
            },
            {
              id: "p3",
              icon: Eye,
              badge: "الواقع المعزز (AR)",
              title: "تحديد القبلة بكاميرا الواقع المعزز",
              description: "انتقل إلى وضع الواقع المعزز لمشاهدة مجسم الكعبة ثلاثي الأبعاد مباشرة في غرفتك عبر الكاميرا.",
              tip: "اضغط على زر الواقع المعزز (AR) فوق البوصلة لتشغيل الكاميرا.",
              accentColor: "teal",
            },
            {
              id: "p4",
              icon: Layers,
              badge: "التقويم الشهري",
              title: "جدول مواقيت الشهر بالكامل",
              description: "عرض مواقيت الصلاة للشهر الهجري والميلادي كاملاً بما في ذلك وقت الثلث الأخير من الليل لقيام الليل.",
              tip: "تعرف بسهولة على مواعيد السحر وقيام الليل.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isPs) {
        return {
          id: "prayers",
          pageName: "لمونځونه او د قبلې لوری",
          summary: "د لمانځه دقیق وختونه، میاشتنی تقویم، او د قبلې ۲D، ۳D او AR قطب نما.",
          icon: Compass,
          steps: [
            {
              id: "p1",
              icon: Clock,
              badge: "د لمانځه دقیق وختونه",
              title: "د لمانځه مهالوېش",
              description: "د سهار، لمر ختو، غرمې، مازدیګر، ماښام او ماسخوتن دقیق وختونه وګورئ.",
              tip: "د خپلو جوماتونو سره د سمون لپاره په ترتیباتو کې دقیقې عیار کړئ.",
              accentColor: "emerald",
            },
            {
              id: "p2",
              icon: Compass,
              badge: "د قبلې قطب نما",
              title: "د کعبې شریفي لوری او فاصله",
              description: "د کعبې شریفي لور ته د موبایل مقناطیسي قطب نما په مرسته لار ومومئ.",
              tip: "د غوره دقت لپاره موبایل هوار ونیسئ.",
              accentColor: "emerald",
            },
            {
              id: "p3",
              icon: Eye,
              badge: "د کمره AR قبله",
              title: "د کمرې له لارې د قبلې لید",
              description: "د کمرې په پرانیستلو سره کعبه شریفه په خپله شاوخوا کې په ۳D بڼه وګورئ.",
              tip: "د قبلې پاسه د AR تڼۍ کېکاږئ.",
              accentColor: "teal",
            },
            {
              id: "p4",
              icon: Layers,
              badge: "میاشتنی مهالوېش",
              title: "د ټولې میاشتې لمونځونه",
              description: "د ټولې روانې هجري او میلادي میاشتې د لمانځه وختونه وګورئ.",
              tip: "د تهجد او د شپې د وروستۍ دریمې برخې وختونه وڅارئ.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isEn) {
        return {
          id: "prayers",
          pageName: "Prayers & Qibla Direction",
          summary: "Accurate calculation methods, monthly prayer calendar, 2D/3D & AR Qibla compass.",
          icon: Compass,
          steps: [
            {
              id: "p1",
              icon: Clock,
              badge: "Calculation & Times",
              title: "Precise Timings & Iqama",
              description: "Consult accurate Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha times calibrated with official calculation angles.",
              tip: "Adjust calculation methods and minute offsets in Settings to match your local mosque.",
              accentColor: "emerald",
            },
            {
              id: "p2",
              icon: Compass,
              badge: "Qibla Compass 2D & 3D",
              title: "Kaaba Direction & Distance",
              description: "Calibrated with your GPS and magnetic sensor to point directly toward the Holy Kaaba in Mecca.",
              tip: "Keep your phone flat for the most accurate magnetic compass reading.",
              accentColor: "emerald",
            },
            {
              id: "p3",
              icon: Eye,
              badge: "Augmented Reality (AR)",
              title: "AR Camera Qibla Finder",
              description: "Switch to Augmented Reality mode to see the 3D Kaaba beacon overlaid live onto your real room environment.",
              tip: "Tap the AR button above the compass to activate your camera feed.",
              accentColor: "teal",
            },
            {
              id: "p4",
              icon: Layers,
              badge: "Monthly Calendar",
              title: "Full Month Timetable",
              description: "View the entire prayer timetable for the current Hijri and Gregorian month.",
              tip: "You can consult sunrise and last third of the night timings easily.",
              accentColor: "amber",
            },
          ],
        };
      }
      return {
        id: "prayers",
        pageName: "Prières & Direction Qibla",
        summary: "Horaires précis, calendrier mensuel, méthodes de calcul et boussole Qibla 2D/3D & Réalité Augmentée.",
        icon: Compass,
        steps: [
          {
            id: "p1",
            icon: Clock,
            badge: "Horaires & Méthodes",
            title: "Horaires officiels & Iqama",
            description: "Consultez les heures exactes de Fajr, Chourouk, Dhuhr, Asr, Maghrib et Isha calculées selon les angles officiels.",
            tip: "Vous pouvez ajuster l'organisme de calcul (UOIF, Ligue Mondiale...) dans les Paramètres.",
            accentColor: "emerald",
          },
          {
            id: "p2",
            icon: Compass,
            badge: "Boussole 2D & 3D",
            title: "Direction de la Kaaba & Distance",
            description: "Boussole gyroscopique de haute précision pointant directement vers la Mecque avec distance kilométrique.",
            tip: "Tenez votre smartphone bien à plat pour une précision magnétique optimale.",
            accentColor: "emerald",
          },
          {
            id: "p3",
            icon: Eye,
            badge: "Réalité Augmentée (AR)",
            title: "Visualisation AR avec votre Caméra",
            description: "Passez en mode Réalité Augmentée pour voir le repère 3D de la Kaaba flottant dans votre pièce en direct.",
            tip: "Cliquez sur le bouton AR au-dessus de la boussole pour activer la vue caméra.",
            accentColor: "teal",
          },
          {
            id: "p4",
            icon: Layers,
            badge: "Calendrier mensuel",
            title: "Planning complet du mois",
            description: "Consultez l'ensemble des horaires du mois hégirien et grégorien en cours.",
            tip: "Repérez facilement les heures du dernier tiers de la nuit pour le Tahajjoud.",
            accentColor: "amber",
          },
        ],
      };

    case "quran":
      if (isAr) {
        return {
          id: "quran",
          pageName: "القرآن الكريم",
          summary: "114 سورة، كبار القراء، التلاوة الصوتية، التفسير والترجمات، أحكام التجويد والعلامات المرجعية.",
          icon: BookOpen,
          steps: [
            {
              id: "q1",
              icon: BookOpen,
              badge: "114 سورة",
              title: "فهرس السور والبحث السريع",
              description: "تصفح الـ 114 سورة مع تصنيف مكية / مدنية، وعدد الآيات، والبحث السريع بالاسم والرقم.",
              tip: "ابحث برقم السورة، اسمها، أو المعنى.",
              accentColor: "emerald",
            },
            {
              id: "q2",
              icon: Volume2,
              badge: "التلاوة الصوتية والقراء",
              title: "الاستماع آية بآية والتلاوة المستمرة",
              description: "استمع إلى كبار القراء (العفاسي، الغامدي، السديس، عبد الباسط...) مع التحكم في سرعة التلاوة.",
              tip: "المس أيقونة التشغيل على أي آية للاستماع إليها وتكرارها.",
              accentColor: "teal",
            },
            {
              id: "q3",
              icon: Languages,
              badge: "الترجمات والتفسير",
              title: "النص القرآني بالرسم العثماني والترجمة",
              description: "اقرأ المصحف الشريف بالرسم العثماني مع الترجمة بلغاتك وتوضيح النطق للتعلم.",
              tip: "يمكنك تفعيل أو إخفاء الترجمة الصوتية حسب رغبتك.",
              accentColor: "emerald",
            },
            {
              id: "q4",
              icon: Bookmark,
              badge: "العلامات المرجعية والتجويد",
              title: "حجم الخط وألوان التجويد",
              description: "اضبط حجم الخط العربي، وفعل ألوان التجويد، واحفظ آياتك المفضلة للرجوع إليها بسهولة.",
              tip: "انتقل إلى وضع المصحف الكامل لتجربة قراءة ورقية مريحة.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isPs) {
        return {
          id: "quran",
          pageName: "قرآن کریم",
          summary: "۱۱۴ سورتونه، نامتو قاریان، ژباړه، تجوید او د لوستلو نښې.",
          icon: BookOpen,
          steps: [
            {
              id: "q1",
              icon: BookOpen,
              badge: "۱۱۴ سورتونه",
              title: "د سورتونو لست او پلټنه",
              description: "ټول ۱۱۴ سورتونه له مکي او مدني نښو او د آیتونو شمېر سره وګورئ او ولټوئ.",
              tip: "د سورت په نوم یا شمېره چټکه پلټنه وکړئ.",
              accentColor: "emerald",
            },
            {
              id: "q2",
              icon: Volume2,
              badge: "غږیز تلاوت",
              title: "د قاریانو غږونه او اورېدل",
              description: "د نړۍ د نامتو قاریانو په غږونو تلاوت واورئ.",
              tip: "د آیت په پلیر کلیک وکړئ ترڅو همغه آیت تکرار واورئ.",
              accentColor: "teal",
            },
            {
              id: "q3",
              icon: Languages,
              badge: "ژباړه او مانا",
              title: "عربي متن او ژباړه",
              description: "اصلي عثماني خط او د سورتونو روښانه ژباړه ولولئ.",
              tip: "د اړتیا له مخې فونټ او بڼه بدله کړئ.",
              accentColor: "emerald",
            },
            {
              id: "q4",
              icon: Bookmark,
              badge: "نښه کول او ترتیبات",
              title: "د فونټ کچه او د یادښت نښې",
              description: "د عربي متن کچه لویه یا وړه کړئ او مهم ځایونه په نښه کړئ.",
              tip: "د مصحف حالت کې په پرله پسې توګه ولولئ.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isEn) {
        return {
          id: "quran",
          pageName: "The Holy Quran",
          summary: "114 Surahs, famous reciters, phonetics, translations, Tajweed coloring, and bookmarks.",
          icon: BookOpen,
          steps: [
            {
              id: "q1",
              icon: BookOpen,
              badge: "114 Surahs",
              title: "Surah Catalog & Instant Search",
              description: "Browse all 114 surahs with Meccan/Medinan badges, verse count, and fast multi-keyword search.",
              tip: "Search by surah number, French/English name, or Arabic title.",
              accentColor: "emerald",
            },
            {
              id: "q2",
              icon: Volume2,
              badge: "Audio Reciters",
              title: "Verse-by-Verse & Continuous Audio",
              description: "Listen to world-renowned reciters (Mishary Alafasy, Al-Ghamdi, Sudais, AbdulBasit...) with playback speed controls.",
              tip: "Tap any verse play icon to listen specifically to that verse.",
              accentColor: "teal",
            },
            {
              id: "q3",
              icon: Languages,
              badge: "Translations & Phonetics",
              title: "Arabic, Phonetics & Translation",
              description: "Read the authentic Uthmani script along with clear phonetic transliteration and translations in your language.",
              tip: "Toggle phonetic transliteration on/off with the display options button.",
              accentColor: "emerald",
            },
            {
              id: "q4",
              icon: Bookmark,
              badge: "Customization & Bookmarks",
              title: "Font Sizing & Reading Progress",
              description: "Adjust Arabic font size, enable Tajweed rules, and bookmark your favorite verses to resume reading easily.",
              tip: "Switch to continuous Mushaf mode for a paper-like reading experience.",
              accentColor: "amber",
            },
          ],
        };
      }
      return {
        id: "quran",
        pageName: "Le Saint Coran",
        summary: "114 Sourates, grands récitants, translittération phonétique, traductions, Tajwid et marque-pages.",
        icon: BookOpen,
        steps: [
          {
            id: "q1",
            icon: BookOpen,
            badge: "114 Sourates",
            title: "Catalogue des sourates & Recherche",
            description: "Parcourez les 114 sourates avec classification Mecquoise / Médinoise, nombre de versets et recherche instantanée.",
            tip: "Recherchez par numéro, nom français, phonétique ou arabe.",
            accentColor: "emerald",
          },
          {
            id: "q2",
            icon: Volume2,
            badge: "Audio & Récitants",
            title: "Écoute verset par verset & Continue",
            description: "Écoutez les plus grands récitateurs (Mishary Alafasy, Al-Ghamdi, Sudais, AbdulBasit...) avec contrôle de vitesse.",
            tip: "Touchez l'icône de lecture sur un verset pour écouter ce verset précis en boucle.",
            accentColor: "teal",
          },
          {
            id: "q3",
            icon: Languages,
            badge: "Traductions & Phonétique",
            title: "Arabe, Phonétique & Traduction française",
            description: "Lisez le texte calligraphié avec translittération phonétique pour perfectionner votre prononciation et son sens.",
            tip: "Activez ou désactivez la phonétique selon votre niveau d'apprentissage.",
            accentColor: "emerald",
          },
          {
            id: "q4",
            icon: Bookmark,
            badge: "Confort & Marque-pages",
            title: "Taille de police & Mode Mushaf",
            description: "Ajustez la taille du texte arabe, activez les couleurs Tajwid et sauvegardez vos sourates favorites en un clic.",
            tip: "Basculez en mode Mushaf continu pour une lecture fluide comme un livre.",
            accentColor: "amber",
          },
        ],
      };

    case "tasbih":
      if (isAr) {
        return {
          id: "tasbih",
          pageName: "المسبحة الإلكترونية والأذكار",
          summary: "عداد تفاعلي مع اهتزاز لمسي، أذكار نبوية مأثورة، أهداف يومية، ورسوم بيانية للتقدم.",
          icon: RotateCcw,
          steps: [
            {
              id: "t1",
              icon: RotateCcw,
              badge: "اللمس والاهتزاز",
              title: "عداد لمسي تفاعلي",
              description: "المس الزر المركزي للتسبيح مع اهتزاز لمسي ناعم ونقر صوتي خفيف.",
              tip: "اهتزاز مميز ينبهك تلقائياً كل 33 تسبيحة لإتمام الدورة.",
              accentColor: "emerald",
            },
            {
              id: "t2",
              icon: Sparkles,
              badge: "الأذكار المأثورة",
              title: "سبحان الله، والحمد لله، والله أكبر",
              description: "تتبدل العبارة المعروضة تلقائياً كل 33 تسبيحة وفقاً للسنة النبوية الشريفة.",
              tip: "يمكنك تصفير العداد والبدء من جديد في أي وقت.",
              accentColor: "teal",
            },
            {
              id: "t3",
              icon: Award,
              badge: "السجل والرسوم البيانية",
              title: "متابعة التقدم اليومي والأسبوعي",
              description: "تُحفظ تسبيحاتك اليومية تلقائياً لمتابعة انتظامك ومجموع أذكارك طوال الأسبوع.",
              tip: "اطلع على الرسم البياني بالأعمدة أسفل الصفحة لمشاهدة أكثر الأيام نشاطاً.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isPs) {
        return {
          id: "tasbih",
          pageName: "برېښنايي تسبیح او ذکر",
          summary: "لمسي شمېرونکی، نبوي اذکار، ورځني اهداف او د پرمختګ راپور.",
          icon: RotateCcw,
          steps: [
            {
              id: "t1",
              icon: RotateCcw,
              badge: "لمس او رپېدل",
              title: "د ذکر لمسي شمېرونکی",
              description: "د تسبیح شمېرلو لپاره منځنۍ تڼۍ کېکاږئ.",
              tip: "په هر ۳۳ ذکرونو یو ځانګړی رپېدل (ویبرېشن) احساس کړئ.",
              accentColor: "emerald",
            },
            {
              id: "t2",
              icon: Sparkles,
              badge: "نبوي اذکار",
              title: "سبحان الله، الحمد لله، الله أكبر",
              description: "په هر ۳۳ وار ذکر بدلېږي.",
              tip: "په هر وخت کې شمېرونکی بېرته له صفر څخه پیل کړئ.",
              accentColor: "teal",
            },
            {
              id: "t3",
              icon: Award,
              badge: "تاریخچه او راپور",
              title: "ورځنی او اوونیز پرمختګ",
              description: "ستاسو ذکرونه هره ورځ خوندي کېږي.",
              tip: "لاندې ګراف وګورئ ترڅو خپل اذکار تعقیب کړئ.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isEn) {
        return {
          id: "tasbih",
          pageName: "Digital Tasbih & Dhikr",
          summary: "Haptic counter, prophetic phrases, daily target goals, and historical progress charts.",
          icon: RotateCcw,
          steps: [
            {
              id: "t1",
              icon: RotateCcw,
              badge: "Touch & Haptics",
              title: "Interactive Touch Counter",
              description: "Tap the central ring or anywhere on screen to count your dhikr with gentle haptic vibration and audio feedback.",
              tip: "Vibrations automatically shift slightly every 33 counts to signal a cycle.",
              accentColor: "emerald",
            },
            {
              id: "t2",
              icon: Sparkles,
              badge: "Prophetic Phrases",
              title: "SubhanAllah, Alhamdulillah, Allahu Akbar",
              description: "The displayed invocation automatically rotates every 33 counts across the traditional prophetic sequence.",
              tip: "You can reset the counter anytime with the reset button.",
              accentColor: "teal",
            },
            {
              id: "t3",
              icon: Award,
              badge: "History & Charts",
              title: "Daily & Weekly Progress Tracking",
              description: "Your daily taps are automatically saved so you can track your consistency and total count over the week.",
              tip: "Check the visual bar chart below to review your daily dhikr streaks.",
              accentColor: "amber",
            },
          ],
        };
      }
      return {
        id: "tasbih",
        pageName: "Tasbih numérique & Dhikr",
        summary: "Compteur tactile avec retour haptique, invocations prophétiques, objectifs et graphiques d'historique.",
        icon: RotateCcw,
        steps: [
          {
            id: "t1",
            icon: RotateCcw,
            badge: "Tactile & Haptique",
            title: "Compteur tactile avec vibrations",
            description: "Touchez le grand bouton central pour incrémenter votre chapelet avec une vibration haptique douce et un clic sonore.",
            tip: "Une pulsation haptique distincte vous avertit automatiquement tous les 33 comptes.",
            accentColor: "emerald",
          },
          {
            id: "t2",
            icon: Sparkles,
            badge: "Formules prophétiques",
            title: "SubhanAllah, Alhamdulillah, Allahu Akbar",
            description: "La formule affichée s'adapte automatiquement tous les 33 comptes selon la tradition prophétique.",
            tip: "Réinitialisez le compteur à zéro quand vous le souhaitez avec le bouton réinitialiser.",
            accentColor: "teal",
          },
          {
            id: "t3",
            icon: Award,
            badge: "Historique & Graphique",
            title: "Suivi quotidien et hebdomadaire",
            description: "Vos invocations sont enregistrées automatiquement chaque jour pour visualiser votre progression sur la semaine.",
            tip: "Consultez le graphique en barres en bas de page pour voir vos jours les plus réguliers.",
            accentColor: "amber",
          },
        ],
      };

    case "halal":
      if (isAr) {
        return {
          id: "halal",
          pageName: "ماسح ودليل المنتجات الحلال",
          summary: "ماسح الباركود بالكاميرا، تصوير قائمة المكونات بالذكاء الاصطناعي، موسوعة المضافات، والمنتجات المحفوظة.",
          icon: ScanLine,
          steps: [
            {
              id: "hl1",
              icon: ScanLine,
              badge: "ماسح الباركود",
              title: "مسح فائق السرعة بالكاميرا",
              description: "وجه الكاميرا نحو باركود أي منتج غذائي لمعرفة حكمه الفوري (حلال / مشبوه / حرام).",
              tip: "استخدم زر الفلاش المدمج في الأماكن المظلمة لتعرف أسرع على الباركود.",
              accentColor: "emerald",
            },
            {
              id: "hl2",
              icon: Camera,
              badge: "تحليل المكونات بالذكاء الاصطناعي",
              title: "تصوير قائمة المكونات عند الشك أو عدم توفر الباركود",
              description: "إذا لم يكن المنتج مسجلاً أو لديك شك، التقط صورة واضحة لقائمة المكونات لتحليلها فوراً.",
              tip: "المس الشاشة لضبط التركيز واستخدم الزوم (1x, 2x) لالتقاط نص فائق الوضوح.",
              accentColor: "teal",
            },
            {
              id: "hl3",
              icon: ShieldCheck,
              badge: "المضافات وأرقام E",
              title: "موسوعة المضافات الغذائية (E471، الجيلاتين...)",
              description: "ابحث عن أي رمز مضاف غذائي لمعرفة أصله (حلال، نباتي، مشبوه، أو حرام).",
              tip: "ابحث بالرمز (مثل E120) أو الاسم للتحقق من المصدر.",
              accentColor: "amber",
            },
            {
              id: "hl4",
              icon: Search,
              badge: "الإدخال اليدوي والسجل",
              title: "إدخال الباركود يدوياً وسجل المنتجات",
              description: "أدخل أرقام الباركود يدوياً في حال تلفه، واطلع على قائمة المنتجات المفضلة والمفحوصة.",
              tip: "سجل المنتجات المفحوصة يعمل حتى بدون اتصال بالإنترنت.",
              accentColor: "emerald",
            },
          ],
        };
      }
      if (isPs) {
        return {
          id: "halal",
          pageName: "د حلال او حرام خوړو سکینر",
          summary: "د بارکوډ سکینر، د اجزاوو انځور اخیستل، د خوړو د کودونو پوهنغونډ او خوندي شوي توکي.",
          icon: ScanLine,
          steps: [
            {
              id: "hl1",
              icon: ScanLine,
              badge: "د بارکوډ سکینر",
              title: "په کمره د بارکوډ چټک سکین",
              description: "د خوراکي توکو بارکوډ ته کمره ونیسئ ترڅو د حلال او حرام والي حالت سمدلاسه معلوم کړئ.",
              tip: "په تیاره کې د رڼا (ټارچ) تڼۍ وکاروئ.",
              accentColor: "emerald",
            },
            {
              id: "hl2",
              icon: Camera,
              badge: "د اجزاوو انځور",
              title: "د اجزاوو د انځور اخیستلو په مرسته شننه",
              description: "که بارکوډ ونه موندل شو، د اجزاوو له لست څخه روښانه انځور واخلئ ترڅو تحلیل شي.",
              tip: "د روښانه انځور لپاره په سکرین کلیک وکړئ.",
              accentColor: "teal",
            },
            {
              id: "hl3",
              icon: ShieldCheck,
              badge: "د خوړو کوډونه",
              title: "د E کوډونو لارښود (E471 او نور)",
              description: "د خوړو کوډونه وپلټئ ترڅو وپوهېږئ چې حلال، نباتي که حرام دي.",
              tip: "کوډ یا د موادو نوم ولټوئ.",
              accentColor: "amber",
            },
            {
              id: "hl4",
              icon: Search,
              badge: "لاسي لیکل او تاریخچه",
              title: "د بارکوډ لاسي لیکل او پخواني توکي",
              description: "که بارکوډ خراب وي شمیرې په لاس ولیکئ او خپل پخواني توکي وګورئ.",
              tip: "پخواني سکین شوي توکي له انټرنیټ پرته هم شتون لري.",
              accentColor: "emerald",
            },
          ],
        };
      }
      if (isEn) {
        return {
          id: "halal",
          pageName: "Halal Scanner & Ingredients Guide",
          summary: "Barcode camera scanner, AI ingredient label photography, additives database, and favorites.",
          icon: ScanLine,
          steps: [
            {
              id: "hl1",
              icon: ScanLine,
              badge: "Barcode Scanner",
              title: "High-Speed Camera Scanner",
              description: "Point your camera at any food packaging barcode for instantaneous Halal / Haram verdict from OpenFoodFacts.",
              tip: "Use the flashlight button in low-light environments for faster recognition.",
              accentColor: "emerald",
            },
            {
              id: "hl2",
              icon: Camera,
              badge: "AI Ingredient Photo",
              title: "Photo Analysis for Doubts & Missing Barcodes",
              description: "If a barcode is unlisted or doubtful, take a crisp photo of the ingredient list to analyze its Halal status instantly.",
              tip: "Tap to focus and select zoom (1x, 2x) for razor-sharp ingredient captures.",
              accentColor: "teal",
            },
            {
              id: "hl3",
              icon: ShieldCheck,
              badge: "Additives & E-Numbers",
              title: "E-Codes Encyclopedia (E471, Gelatin...)",
              description: "Look up any food additive code to know immediately if it is Halal, Plant-based, Doubtful (Mashbooh), or Haram.",
              tip: "Search additives by code (e.g., E120) or common name.",
              accentColor: "amber",
            },
            {
              id: "hl4",
              icon: Search,
              badge: "Manual Search & History",
              title: "Barcode Manual Entry & Scan History",
              description: "Type barcode numbers manually if damaged, and consult your past scans and favorite safe products.",
              tip: "Your recent scans are stored locally for fast offline reference.",
              accentColor: "emerald",
            },
          ],
        };
      }
      return {
        id: "halal",
        pageName: "Scanner & Guide Halal",
        summary: "Scanner de code-barres haute vitesse, photo des ingrédients par IA, dictionnaire des additifs E et historique.",
        icon: ScanLine,
        steps: [
          {
            id: "hl1",
            icon: ScanLine,
            badge: "Scanner code-barres",
            title: "Scan caméra ultra-rapide plein écran",
            description: "Pointez votre caméra vers le code-barres d'un produit alimentaire pour obtenir instantanément son statut Halal / Haram.",
            tip: "Activez la torche intégrée dans les environnements sombres pour une détection éclair.",
            accentColor: "emerald",
          },
          {
            id: "hl2",
            icon: Camera,
            badge: "Photo des ingrédients IA",
            title: "Analyse photo en cas de doute ou sans code-barres",
            description: "Si le code-barres est introuvable ou si vous avez un doute, prenez en photo la liste des ingrédients pour une analyse IA.",
            tip: "Touchez l'écran pour faire la mise au point sur le texte des ingrédients.",
            accentColor: "teal",
          },
          {
            id: "hl3",
            icon: ShieldCheck,
            badge: "Additifs & Numéros E",
            title: "Encyclopédie des additifs (E471, Gélatine...)",
            description: "Recherchez n'importe quel code d'additif pour savoir s'il est Halal, Végétal, Douteux (Mashbooh) ou Haram.",
            tip: "Tapez le code (ex: E120) ou le nom pour voir l'origine et les alternatives.",
            accentColor: "amber",
          },
          {
            id: "hl4",
            icon: Search,
            badge: "Saisie manuelle & Historique",
            title: "Historique des scans & Produits favoris",
            description: "Saisissez les chiffres manuellement si le code est abîmé et retrouvez la liste de tous vos scans récents.",
            tip: "Vos produits scannés restent accessibles même hors connexion.",
            accentColor: "emerald",
          },
        ],
      };

    case "mosques":
      if (isAr) {
        return {
          id: "mosques",
          pageName: "المساجد القريبة والاتجاهات",
          summary: "خريطة تفاعلية بنظام GPS، حساب المسارات، مطابقة أوقات الصلاة، والبحث حسب المدينة.",
          icon: MapPin,
          steps: [
            {
              id: "m1",
              icon: MapPin,
              badge: "الخريطة التفاعلية",
              title: "اكتشف المساجد والمصليات حولك",
              description: "شاهد في الوقت الفعلي جميع المساجد ومصليات الصلاة القريبة من موقعك الجغرافي.",
              tip: "اضغط على أي مسجد لعرض عنوانه الدقيق والمسافة وتفاصيله.",
              accentColor: "emerald",
            },
            {
              id: "m2",
              icon: Compass,
              badge: "الملاحة والتوجيه",
              title: "بدء المسار بنقرة واحدة",
              description: "ابدأ الملاحة المباشرة خطوة بخطوة في خرائط جوجل أو آبل أو ويز للوصول بسهولة.",
              tip: "خيار رائع للوصول السريع إلى صلاة الجمعة في الوقت المحدد.",
              accentColor: "teal",
            },
            {
              id: "m3",
              icon: Search,
              badge: "البحث بالمدينة",
              title: "البحث في أي مدينة أو حي",
              description: "ابحث عن المساجد في مدن أخرى أثناء سفرك وتنقلاتك.",
              tip: "يمكنك مزامنة أوقات الإقامة الرسمية مع المسجد المختار.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isPs) {
        return {
          id: "mosques",
          pageName: "نږدې جوماتونه او لارښود",
          summary: "د GPS نقشه، د لارې موندل او په ښارونو کې د جوماتونو پلټنه.",
          icon: MapPin,
          steps: [
            {
              id: "m1",
              icon: MapPin,
              badge: "ژوندۍ نقشه",
              title: "خپل نږدې جوماتونه ومومئ",
              description: "خپل شاوخوا جوماتونه په نقشه کې په مستقیمه توګه وګورئ.",
              tip: "د جومات په نښه کلیک وکړئ ترڅو پته او فاصله وګورئ.",
              accentColor: "emerald",
            },
            {
              id: "m2",
              icon: Compass,
              badge: "د لارې موندل",
              title: "په یوه کلیک د نقشې لارښود",
              description: "په ګوګل میپ یا نښان کې د جومات پر لور مستقیمه لار ومومئ.",
              tip: "د جمعې د لمانځه لپاره خورا ګټور دی.",
              accentColor: "teal",
            },
            {
              id: "m3",
              icon: Search,
              badge: "د ښار پلټنه",
              title: "په نورو ښارونو کې لټون",
              description: "د سفر پر مهال په نورو ښارونو کې جوماتونه ومومئ.",
              tip: "د خپل جومات سره د لمانځه وختونه همغږي کړئ.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isEn) {
        return {
          id: "mosques",
          pageName: "Nearby Mosques & Itineraries",
          summary: "GPS map, directions, prayer times synchronization, and custom search radius.",
          icon: MapPin,
          steps: [
            {
              id: "m1",
              icon: MapPin,
              badge: "Interactive Map",
              title: "Discover Nearby Mosques",
              description: "View all mosques and Islamic prayer halls around your current location on an interactive map.",
              tip: "Tap on any mosque pin to view its address, distance, and details.",
              accentColor: "emerald",
            },
            {
              id: "m2",
              icon: Compass,
              badge: "GPS Navigation",
              title: "1-Tap GPS Itinerary",
              description: "Launch direct turn-by-turn navigation in Google Maps, Apple Maps, or Waze with a single tap.",
              tip: "Choose the shortest route for Jumua Friday prayers.",
              accentColor: "teal",
            },
            {
              id: "m3",
              icon: Search,
              badge: "City Search",
              title: "Search Any City or Neighborhood",
              description: "Search for mosques in other cities when traveling or planning your trips.",
              tip: "You can synchronize prayer times with your selected official mosque.",
              accentColor: "amber",
            },
          ],
        };
      }
      return {
        id: "mosques",
        pageName: "Mosquées proches & Itinéraires",
        summary: "Carte interactive GPS, calcul d'itinéraires, synchronisation des horaires et recherche par ville.",
        icon: MapPin,
        steps: [
          {
            id: "m1",
            icon: MapPin,
            badge: "Carte interactive",
            title: "Localisez les mosquées autour de vous",
            description: "Visualisez en temps réel toutes les mosquées et salles de prière à proximité de votre position géographique.",
            tip: "Touchez un marqueur de mosquée pour voir son adresse exacte et sa distance.",
            accentColor: "emerald",
          },
          {
            id: "m2",
            icon: Compass,
            badge: "Itinéraire GPS",
            title: "Navigation GPS en 1 clic",
            description: "Lancez directement l'itinéraire vers la mosquée dans Google Maps, Apple Maps ou Waze pour vous y rendre facilement.",
            tip: "Idéal pour trouver rapidement une mosquée pour la prière du vendredi (Jumua).",
            accentColor: "teal",
          },
          {
            id: "m3",
            icon: Search,
            badge: "Recherche par ville",
            title: "Recherchez dans n'importe quelle ville",
            description: "Tapez le nom d'une autre ville ou d'un quartier pour explorer les mosquées lors de vos déplacements ou voyages.",
            tip: "Sélectionnez une mosquée pour synchroniser ses horaires officiels d'Iqama.",
            accentColor: "amber",
          },
        ],
      };

    case "names":
      if (isAr) {
        return {
          id: "names",
          pageName: "أسماء الله الحسنى (99 اسماً)",
          summary: "الخط العربي الأصيل، المعاني الإيمانية، والتعلم والمراجعة اليومية.",
          icon: Heart,
          steps: [
            {
              id: "n1",
              icon: Heart,
              badge: "99 اسماً حسنى",
              title: "الخط العربي والمعاني الإيمانية",
              description: "استكشف أسماء الله الحسنى التسعة والتسعين بالرسم والخط العربي الجميل مع شرح معانيها العظيمة.",
              tip: "تدبر أسماء الله الحسنى يملأ القلب سكينة وطمأنينة وإيماناً.",
              accentColor: "emerald",
            },
            {
              id: "n2",
              icon: Languages,
              badge: "النطق الصحيح والترجمة",
              title: "اللفظ الواضح والترجمة للغاتك",
              description: "كل اسم مصحوب ببيان واضح ومعناه الكامل لسهولة الحفظ والترديد.",
              tip: "احفظ 3 إلى 5 أسماء كل يوم لإتمام حفظ الأسماء الحسنى كاملة.",
              accentColor: "teal",
            },
            {
              id: "n3",
              icon: Search,
              badge: "البحث والحفظ",
              title: "فهرس مرتب من 1 إلى 99",
              description: "ابحث بسهولة عن أي اسم برقمه الترتيبي أو معناه للرجوع إليه ومراجعته.",
              tip: "راجع هذه الصفحة بانتظام لتثبيت حفظ الأسماء الحسنى في ذاكرتك.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isPs) {
        return {
          id: "names",
          pageName: "د الله ۹۹ مبارک نومونه (اسماء الحسنی)",
          summary: "ښکلې عربي خطاطي، ماناګانې، او د الله د ښکلو نومونو حفظ کول.",
          icon: Heart,
          steps: [
            {
              id: "n1",
              icon: Heart,
              badge: "۹۹ مبارک نومونه",
              title: "عربي خطاطي او ماناګانې",
              description: "د الله تعالی ۹۹ ښکلي نومونه له ژورو ایماني ماناګانو سره ولولئ.",
              tip: "د الله په نومونو کې فکر کول زړه ته ارامي او سکون ورکوي.",
              accentColor: "emerald",
            },
            {
              id: "n2",
              icon: Languages,
              badge: "روښانه تلفظ",
              title: "تلفظ او زده کړه",
              description: "هر نوم له سم تلفظ او مانا سره وړاندې شوی.",
              tip: "هره ورځ ۳ څخه تر ۵ نومونه زده کړئ ترڅو ټول یاد کړئ.",
              accentColor: "teal",
            },
            {
              id: "n3",
              icon: Search,
              badge: "پلټنه او ترتیب",
              title: "له ۱ تر ۹۹ پورې ترتیب",
              description: "هر نوم په اسانۍ سره د هغه په شمېره یا مانا وپلټئ.",
              tip: "د حفظ تازه ساتلو لپاره تل دا پاڼه وګورئ.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isEn) {
        return {
          id: "names",
          pageName: "99 Names of Allah (Asma ul Husna)",
          summary: "Arabic calligraphy, transliteration, spiritual meanings, and audio recitation.",
          icon: Heart,
          steps: [
            {
              id: "n1",
              icon: Heart,
              badge: "99 Divine Names",
              title: "Calligraphy & Meanings",
              description: "Explore the 99 Beautiful Names of Allah with traditional Arabic script and rich spiritual explanations.",
              tip: "Meditating upon the Divine Attributes brings immense spiritual tranquility.",
              accentColor: "emerald",
            },
            {
              id: "n2",
              icon: Languages,
              badge: "Transliteration",
              title: "Easy Phonetics & Pronunciation",
              description: "Each name includes clear phonetic spelling to help you memorize and pronounce correctly.",
              tip: "Review a few names every day to complete the full 99.",
              accentColor: "teal",
            },
            {
              id: "n3",
              icon: Search,
              badge: "Search & Memorization",
              title: "Quick Search & Review",
              description: "Easily find any name by its number (1 to 99) or translated meaning in your language.",
              tip: "Return to this page regularly to test your memorization.",
              accentColor: "amber",
            },
          ],
        };
      }
      return {
        id: "names",
        pageName: "Les 99 Noms d'Allah (Asma ul Husna)",
        summary: "Calligraphie arabe, translittération phonétique, significations spirituelles et mémorisation.",
        icon: Heart,
        steps: [
          {
            id: "n1",
            icon: Heart,
            badge: "99 Noms Divins",
            title: "Calligraphie arabe & Significations",
            description: "Découvrez les 99 Plus Beaux Noms d'Allah avec leur écriture arabe authentique et leur traduction spirituelle.",
            tip: "Méditer les attributs divins apporte une grande paix intérieure et renforce la foi.",
            accentColor: "emerald",
          },
          {
            id: "n2",
            icon: Languages,
            badge: "Phonétique claire",
            title: "Translittération & Prononciation",
            description: "Chaque Nom est accompagné d'une transcription phonétique précise pour faciliter son apprentissage.",
            tip: "Apprenez 3 à 5 Noms par jour pour mémoriser l'ensemble des 99 Noms.",
            accentColor: "teal",
          },
          {
            id: "n3",
            icon: Search,
            badge: "Mémorisation",
            title: "Index numéroté de 1 à 99",
            description: "Retrouvez facilement chaque Nom grâce à son numéro d'ordre et son sens en français.",
            tip: "Consultez cette page quotidiennement pour réviser votre mémorisation.",
            accentColor: "amber",
          },
        ],
      };

    case "invocations":
      if (isAr) {
        return {
          id: "invocations",
          pageName: "الأدعية والأذكار (حصن المسلم)",
          summary: "أدعية مأثورة، أذكار الصباح والمساء، النوم، السفر، الصلاة، مع الصوت وعداد التكرار.",
          icon: Sparkles,
          steps: [
            {
              id: "i1",
              icon: Sparkles,
              badge: "التصنيفات اليومية",
              title: "مصنفة حسب أوقات اليوم والمناسبات",
              description: "تصفح الأدعية الصحيحة المصنفة: أذكار الصباح والمساء، قبل النوم، الصلاة، الحفظ والرقية، السفر، والاستغفار.",
              tip: "اختر التصنيف من القائمة العلوية للوصول السريع للأدعية.",
              accentColor: "emerald",
            },
            {
              id: "i2",
              icon: Languages,
              badge: "النص والترجمة والمصدر",
              title: "نص عربي كامل ومضبوط مع الترجمة والمصدر",
              description: "كل دعاء يحتوي على النص العربي المشكول، الترجمة، والمصدر الصحيح من كتب الحديث.",
              tip: "اضغط على أيقونة النسخ لمشاركة الدعاء مع الأهل والأصدقاء.",
              accentColor: "teal",
            },
            {
              id: "i3",
              icon: RotateCcw,
              badge: "عداد التكرار والصوت",
              title: "تتبع التكرار (1x, 3x, 100x) والاستماع",
              description: "تابع عدد المرات المسنونة لكل دعاء باستخدام العداد التفاعلي واستمع إلى القراءة الصوتية.",
              tip: "يضيء العداد باللون الأخضر عند إتمام العدد المطلوب.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isPs) {
        return {
          id: "invocations",
          pageName: "دعاګانې او اذکار (د مسلمان کلا)",
          summary: "نبوي دعاګانې، د سهار او ماښام اذکار، د لمانځه او سفر دعاګانې له غږ او شمېرونکي سره.",
          icon: Sparkles,
          steps: [
            {
              id: "i1",
              icon: Sparkles,
              badge: "د دعاګانو کټګورۍ",
              title: "د ژوند د شېبو له مخې وېشل شوې",
              description: "د سهار، ماښام، ویده کېدو، لمانځه او سفر لپاره ثابتې دعاګانې ومومئ.",
              tip: "له پورتني مینو څخه اړونده برخه غوره کړئ.",
              accentColor: "emerald",
            },
            {
              id: "i2",
              icon: Languages,
              badge: "عربي او ژباړه",
              title: "عربي متن او پښتو ژباړه",
              description: "هره دعا له سم اعراب، ژباړې او حدیث سرچینې سره ولولئ.",
              tip: "دعا په یوه کلیک له خپلو دوستانو سره شریکه کړئ.",
              accentColor: "teal",
            },
            {
              id: "i3",
              icon: RotateCcw,
              badge: "د تکرار شمېرونکی",
              title: "د تکرار شمېر او غږ",
              description: "د دعاګانو تکرار (۱ ځل، ۳ ځله، ۱۰۰ ځله) په اسانۍ وڅارئ.",
              tip: "کله چې هدف ته ورسېږئ شمېرونکی شین رنګ اخلي.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isEn) {
        return {
          id: "invocations",
          pageName: "Invocations (Hisn al-Muslim)",
          summary: "Authentic Prophetic Duas, Morning & Evening, Prayer, Sleep, Travel with audio and repetitions.",
          icon: Sparkles,
          steps: [
            {
              id: "i1",
              icon: Sparkles,
              badge: "Categories",
              title: "Organized by Daily Moments",
              description: "Browse authentic duas organized by theme: Morning & Evening, Before Sleep, Prayer, Protection, Travel, and Forgiveness.",
              tip: "Swipe or select categories at the top to find specific invocations.",
              accentColor: "emerald",
            },
            {
              id: "i2",
              icon: Languages,
              badge: "Arabic & Translation",
              title: "Full Arabic, Phonetics & Meanings",
              description: "Each invocation comes with complete vocalized Arabic, clear phonetics, French/English translation, and authentic Hadith sources.",
              tip: "Tap the copy icon to share a beautiful dua with loved ones.",
              accentColor: "teal",
            },
            {
              id: "i3",
              icon: RotateCcw,
              badge: "Repetition Counter & Audio",
              title: "Repetition Tracker (1x, 3x, 100x)",
              description: "Keep track of required repetition counts with the built-in tap counter and listen to authentic audio recitations.",
              tip: "The counter flashes green when you reach the target repetition goal.",
              accentColor: "amber",
            },
          ],
        };
      }
      return {
        id: "invocations",
        pageName: "Invocations & Douas (Citadelle du Musulman)",
        summary: "Invocations prophétiques authentiques, Matin & Soir, Prière, Sommeil, Voyage avec audio et compteur.",
        icon: Sparkles,
        steps: [
          {
            id: "i1",
            icon: Sparkles,
            badge: "Catégories thématiques",
            title: "Classées par moments de la vie",
            description: "Retrouvez les douas authentiques classées par thème : Matin & Soir, Avant de dormir, Prière, Protection, Voyage, Épreuves...",
            tip: "Changez de catégorie facilement depuis le menu supérieur.",
            accentColor: "emerald",
          },
          {
            id: "i2",
            icon: Languages,
            badge: "Arabe & Traduction",
            title: "Arabe vocalisé, Phonétique & Sources",
            description: "Chaque doua dispose du texte arabe intégral, de la translittération phonétique, du sens en français et du hadith source.",
            tip: "Copiez ou partagez une doua avec vos proches en un clic.",
            accentColor: "teal",
          },
          {
            id: "i3",
            icon: RotateCcw,
            badge: "Compteur de répétitions",
            title: "Compteur interactif (1x, 3x, 100x) & Audio",
            description: "Suivez le nombre de répétitions recommandées par la Sunnah grâce au compteur tactile et écoutez l'audio de prononciation.",
            tip: "Le compteur s'illumine en vert lorsque vous atteignez le nombre prescrit.",
            accentColor: "amber",
          },
        ],
      };

    case "reminder":
      if (isAr) {
        return {
          id: "reminder",
          pageName: "تنبيهات الصلاة والأذان",
          summary: "أصوات الأذان، تنبيهات الاستعداد المسبق، الإشعارات، والتنبيهات الصوتية اللطيفة.",
          icon: Bell,
          steps: [
            {
              id: "r1",
              icon: Bell,
              badge: "أصوات الأذان",
              title: "اختيار صوت المؤذن والأذان",
              description: "اختر أذانك المفضل (المدينة المنورة، الأقصى، مكة المكرمة، مصر، عبد الباسط...) لكل صلاة.",
              tip: "يمكنك الاستماع لمعاينة صوت الأذان قبل تأكيد الاختيار.",
              accentColor: "emerald",
            },
            {
              id: "r2",
              icon: Clock,
              badge: "التنبيه المسبق",
              title: "تنبيه قبل الصلاة بـ 10 أو 15 دقيقة",
              description: "اضبط تنبيهاً مسبقاً قبل دخول وقت الصلاة للاستعداد والوضوء براحة وطمأنينة.",
              tip: "مفيد جداً للاستيقاظ المبكر لصلاة الفجر.",
              accentColor: "teal",
            },
            {
              id: "r3",
              icon: Volume2,
              badge: "الإشعارات والصوت",
              title: "صيغ التنبيه والتذكير الصوتي",
              description: "خصص نص الإشعارات وفعل التنبيه الصوتي الهادئ قبل النداء للصلاة.",
              tip: "اختبر التنبيه مباشرة من هذه الصفحة للتأكد من مستوى الصوت.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isPs) {
        return {
          id: "reminder",
          pageName: "د لمانځه یادوونکی او اذان",
          summary: "د اذان غږونه، له وخته مخکې خبرتیا، او غږیز یادوونکي.",
          icon: Bell,
          steps: [
            {
              id: "r1",
              icon: Bell,
              badge: "د اذان غږونه",
              title: "د خوښې اذان ټاکل",
              description: "د مدینې منورې، مکې مکرمې یا مصر ښکلي اذانونه وټاکئ.",
              tip: "د ټاکلو دمخه غږ واورئ.",
              accentColor: "emerald",
            },
            {
              id: "r2",
              icon: Clock,
              badge: "مخکې له وخته خبرتیا",
              title: "۱۰ یا ۱۵ دقیقې مخکې یادوونه",
              description: "د اوداسه او تیاری لپاره له لمانځه لږ مخکې خبرتیا ترلاسه کړئ.",
              tip: "د سهار لمانځه ته راویښېدو لپاره خورا ګټور دی.",
              accentColor: "teal",
            },
            {
              id: "r3",
              icon: Volume2,
              badge: "خبرتیاوې او غږ",
              title: "د نوټیفکېشن ترتیبات",
              description: "د پیغام متن او نرم غږیز یادوونکی فعال کړئ.",
              tip: "د ازموینې تڼۍ کېکاږئ ترڅو غږ وګورئ.",
              accentColor: "amber",
            },
          ],
        };
      }
      if (isEn) {
        return {
          id: "reminder",
          pageName: "Prayer Reminders & Adhan Alerts",
          summary: "Customizable Adhan audio, pre-prayer anticipation alarms, push notifications, and voice reminders.",
          icon: Bell,
          steps: [
            {
              id: "r1",
              icon: Bell,
              badge: "Adhan Sounds",
              title: "Adhan Audio Selection",
              description: "Choose your preferred Adhan voice (Medina, Al-Aqsa, Mecca, Egypt, AbdulBasit...) for all 5 prayers.",
              tip: "You can preview each Adhan sound directly before saving.",
              accentColor: "emerald",
            },
            {
              id: "r2",
              icon: Clock,
              badge: "Pre-Prayer Alarms",
              title: "Anticipation Reminders (10 / 15 min)",
              description: "Set early notification alarms before prayer time so you have time to perform wudu and get ready.",
              tip: "Specially helpful for waking up in advance for Fajr prayer.",
              accentColor: "teal",
            },
            {
              id: "r3",
              icon: Volume2,
              badge: "Voice & Notifications",
              title: "Notification Templates & Voice Combo",
              description: "Customize reminder phrases and enable gentle voice announcements right before the prayer.",
              tip: "Test your notifications on this page to ensure your device volume is set right.",
              accentColor: "amber",
            },
          ],
        };
      }
      return {
        id: "reminder",
        pageName: "Rappels de Prière & Alertes Adhan",
        summary: "Choix de l'Adhan, rappels d'anticipation avant l'heure, notifications push et rappels vocaux.",
        icon: Bell,
        steps: [
          {
            id: "r1",
            icon: Bell,
            badge: "Sons d'Adhan",
            title: "Choix du Muezzin & Récitateur",
            description: "Sélectionnez votre Adhan préféré (Médine, Al-Aqsa, La Mecque, Égypte, AbdulBasit...) pour chaque prière.",
            tip: "Écoutez un extrait audio de chaque Adhan avant de valider votre choix.",
            accentColor: "emerald",
          },
          {
            id: "r2",
            icon: Clock,
            badge: "Anticipation",
            title: "Rappels 10 ou 15 min avant la prière",
            description: "Programmez une alerte d'anticipation avant l'heure pour avoir le temps de faire vos ablutions et vous préparer sereinement.",
            tip: "Idéal pour le réveil du Fajr et pour ne jamais être pris de court.",
            accentColor: "teal",
          },
          {
            id: "r3",
            icon: Volume2,
            badge: "Messages & Voix",
            title: "Modèles de notification & Synthèse vocale",
            description: "Personnalisez le texte affiché sur vos notifications et activez le rappel vocal doux avant l'appel à la prière.",
            tip: "Testez l'alerte directement depuis cette page pour vérifier le bon fonctionnement.",
            accentColor: "amber",
          },
        ],
      };

    case "settings":
    default:
      if (isAr) {
        return {
          id: "settings",
          pageName: "الإعدادات والتخصيص",
          summary: "المظاهر المرئية، إضاءة LED المتوهجة، طرق الحساب، اللغات، والنسخ الاحتياطي.",
          icon: Sliders,
          steps: [
            {
              id: "s1",
              icon: Palette,
              badge: "المظاهر وإضاءة LED",
              title: "ألوان الواجهة والإطارات المضيئة",
              description: "خصص مظهر تطبيقك: اختر من بين أكثر من 10 لوحات ألوان، والوضع الليلي، وإطارات LED المضيئة المتحركة.",
              tip: "جرب مظهر الزمرد الملكي أو الياقوت الأزرق لإحساس فخم وهادئ.",
              accentColor: "emerald",
            },
            {
              id: "s2",
              icon: Clock,
              badge: "طرق حساب الصلاة",
              title: "هيئات الحساب وتعديل الدقائق",
              description: "اضبط هيئة الحساب المعتمدة (رابطة العالم الإسلامي، أم القرى، ديانت، وغيرها) وعدل الدقائق لكل صلاة.",
              tip: "اختر الطريقة الموصى بها في مساجد بلدك.",
              accentColor: "teal",
            },
            {
              id: "s3",
              icon: Languages,
              badge: "اللغات العالمية",
              title: "أكثر من 50 لغة ولهجة",
              description: "بدّل بسلاسة بين العربية، البشتو، الفرنسية، الإنجليزية، التركية، الأردية، والفارسية وغيرها.",
              tip: "تتحول واجهة التطبيق تلقائياً من اليمين إلى اليسار (RTL) عند اختيار العربية أو البشتو أو الأردية.",
              accentColor: "amber",
            },
            {
              id: "s4",
              icon: ShieldCheck,
              badge: "الخصوصية والبيانات",
              title: "الخصوصية والنسخ الاحتياطي",
              description: "بيانات صلواتك وأذكارك مشفرة ومحفوظة بأمان على جهازك مع إمكانية المزامنة عبر حسابك.",
              tip: "يمكنك إعادة تشغيل الدليل الترحيبي في أي وقت من هذه الصفحة.",
              accentColor: "emerald",
            },
          ],
        };
      }
      if (isPs) {
        return {
          id: "settings",
          pageName: "ترتیبات او شخصي کول",
          summary: "رنګونه، LED څراغونه، د لمانځه طریقې، ژبې او د معلوماتو ساتنه.",
          icon: Sliders,
          steps: [
            {
              id: "s1",
              icon: Palette,
              badge: "رنګونه او LED",
              title: "د اپلیکېشن بڼه او رنګونه",
              description: "خپل خوښ شوی رنګ، تور/روښانه حالت او ښکلي LED څراغونه فعال کړئ.",
              tip: "د زمرد یا یاقوت رنګ و ازموئ.",
              accentColor: "emerald",
            },
            {
              id: "s2",
              icon: Clock,
              badge: "د لمانځه طریقې",
              title: "د لمانځه د محاسبې ادارې",
              description: "د خپلې سیمې مطابق د لمانځه د محاسبې طریقه او دقیقې عیار کړئ.",
              tip: "د خپل هېواد رسمي طریقه وټاکئ.",
              accentColor: "teal",
            },
            {
              id: "s3",
              icon: Languages,
              badge: "نړیوالې ژبې",
              title: "پښتو، عربي، فرانسوي، انګلیسي او نورې",
              description: "په یوه کلیک سره خپله مورنۍ ژبه وټاکئ.",
              tip: "پښتو او عربي ژبو کې سکرین په اوتومات ډول له ښي اړخ (RTL) څخه ښودل کېږي.",
              accentColor: "amber",
            },
            {
              id: "s4",
              icon: ShieldCheck,
              badge: "محرمیت او بیک اپ",
              title: "شخصي محرمیت او ساتنه",
              description: "ستاسو ټول معلومات ستاسو په موبایل کې خوندي پاتې کېږي.",
              tip: "کولی شئ لارښود بېرته له سره وګورئ.",
              accentColor: "emerald",
            },
          ],
        };
      }
      if (isEn) {
        return {
          id: "settings",
          pageName: "Settings & Customization",
          summary: "Visual themes, LED glow borders, calculation methods, languages, and backup preferences.",
          icon: Sliders,
          steps: [
            {
              id: "s1",
              icon: Palette,
              badge: "Visual Themes & LED",
              title: "Themes, Widget Colors & Glowing LED Borders",
              description: "Customize your app ambiance: choose from 10+ widget color palettes, dark/light mode, and enable animated LED border lighting.",
              tip: "Try the Emerald Gold or Royal Sapphire themes for an ultra-premium look.",
              accentColor: "emerald",
            },
            {
              id: "s2",
              icon: Clock,
              badge: "Calculation Methods",
              title: "Calculation Standards & Minute Adjustments",
              description: "Configure Islamic calculation conventions (Muslim World League, ISNA, UOIF 12°, Umm al-Qura, Diyanet...) and apply minute offsets.",
              tip: "Select the method recommended by your national Islamic council or local mosque.",
              accentColor: "teal",
            },
            {
              id: "s3",
              icon: Languages,
              badge: "Languages",
              title: "50+ Global Languages & Dialects",
              description: "Switch seamlessly between French, English, Arabic, Pashto, Turkish, Urdu, Farsi, and dozens more.",
              tip: "RTL layout automatically adjusts when selecting Arabic, Urdu, or Pashto.",
              accentColor: "amber",
            },
            {
              id: "s4",
              icon: ShieldCheck,
              badge: "Privacy & Backup",
              title: "Local Privacy & Account Backup",
              description: "Your prayer logs and favorites are stored securely. You can also sign in to back up data across your devices.",
              tip: "Use the Replay Onboarding button to revisit the initial setup guide anytime.",
              accentColor: "emerald",
            },
          ],
        };
      }
      return {
        id: "settings",
        pageName: "Paramètres & Personnalisation",
        summary: "Thèmes visuels, bordures LED lumineuses, méthodes de calcul, langues et options de sauvegarde.",
        icon: Sliders,
        steps: [
          {
            id: "s1",
            icon: Palette,
            badge: "Thèmes & Bordures LED",
            title: "Couleurs des widgets & Bordures lumineuses",
            description: "Personnalisez l'ambiance visuelle : plus de 10 palettes de couleurs pour les widgets, mode sombre/clair et bordures LED animées.",
            tip: "Essayez le thème Émeraude Royale ou Saphir pour un rendu luxueux et apaisant.",
            accentColor: "emerald",
          },
          {
            id: "s2",
            icon: Clock,
            badge: "Calculs de prière",
            title: "Méthodes de calcul & Décalages en minutes",
            description: "Configurez l'organisme de calcul (UOIF 12°, Ligue Islamique Mondiale, Umm al-Qura, Diyanet...) et ajustez les minutes par prière.",
            tip: "Choisissez la méthode recommandée par les mosquées de votre pays.",
            accentColor: "teal",
          },
          {
            id: "s3",
            icon: Languages,
            badge: "Langues du monde",
            title: "Plus de 50 langues & Dialectes",
            description: "Basculez instantanément en Français, Anglais, Arabe, Pachto, Turc, Ourdou, Persan et bien d'autres.",
            tip: "La mise en page s'adapte automatiquement de droite à gauche pour l'Arabe et le Pachto.",
            accentColor: "amber",
          },
          {
            id: "s4",
            icon: ShieldCheck,
            badge: "Compte & Données",
            title: "Sauvegarde sécurisée & Confidentialité",
            description: "Vos données de prières et de tasbih restent strictement privées sur votre appareil ou synchronisées sur votre compte.",
            tip: "Vous pouvez rouvrir le guide d'accueil initial à tout moment depuis cette page.",
            accentColor: "emerald",
          },
        ],
      };
  }
}
