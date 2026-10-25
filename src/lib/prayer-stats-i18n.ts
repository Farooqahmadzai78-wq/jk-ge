/**
 * Dedicated comprehensive internationalization dictionary for Prayer Statistics & History.
 * Supports complete localized texts, badges, tips, formatting, and share messages.
 */

export interface PrayerStatsLocaleStrings {
  prayerTracking: string;
  prayerStatsTitle: string;
  close: string;
  share: string;
  copiedShare: string;
  shareNotSupported: string;
  shareModalTitle: string;

  // KPI
  streak: string;
  days: string;
  dayShort: string;
  bestRecord: string;
  sevenDays: string;
  perfectDays: string;
  perfectLabel: string;
  totalValidated: string;
  prayersLabel: string;

  // Regularity
  regExemplary: string;
  regVeryRegular: string;
  regRegular: string;
  regInProgress: string;
  regPromisingStart: string;

  // Tabs
  tabOverview: string;
  tabBreakdown: string;
  tabCalendar: string;
  tabBadges: string;

  // Overview
  trendTitle: string;
  trendSub: string;
  rangeValidated: string;
  todayLabel: string;
  todayMarkAll: string;
  todayClear: string;
  todayStatusComplete: string;
  todayStatusPending: string;
  surahBaqarahRef: string;
  ayahText: string;

  // Breakdown
  breakdownIntro: string;
  strongPoint: string;
  toImprove: string;
  completedOutOf: string; // e.g. "{count} accomplies sur {total} jours"

  // Calendar
  prevMonth: string;
  nextMonth: string;
  currentMonthBtn: string;
  legendFull: string;
  legendMany: string;
  legendFew: string;
  legendZero: string;
  tapPrayerHint: string;
  perfectDaysCountLabel: string;

  // Badges
  filterAll: string;
  filterUnlocked: string;
  filterLocked: string;
  badgesAccomplished: string;
  badgeProgress: string;
  badgeDistinction: string;

  // Rarities
  rarityCommon: string;
  rarityRare: string;
  rarityNoble: string;
  rarityLegendary: string;

  // Footer
  footerValidated: string;
  footerBest: string;

  // Tooltips
  tooltipValidated: string;
  tooltipPending: string;

  // Prayers
  prayers: Record<
    "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha",
    {
      name: string;
      arabic: string;
      subtitle: string;
      tip: string;
    }
  >;

  // Badges dictionary
  badges: Record<
    string,
    {
      title: string;
      description: string;
    }
  >;
}

const frStrings: PrayerStatsLocaleStrings = {
  prayerTracking: "Suivi des Prières",
  prayerStatsTitle: "Statistiques & Assiduité",
  close: "Fermer",
  share: "Partager",
  copiedShare: "Bilan copié dans le presse-papiers !",
  shareNotSupported: "Partage non supporté sur ce navigateur",
  shareModalTitle: "Mon Suivi de Prières — Islam-Noor",

  streak: "Série",
  days: "jours",
  dayShort: "j",
  bestRecord: "Record :",
  sevenDays: "7 Jours",
  perfectDays: "Jours 5/5",
  perfectLabel: "Parfaites",
  totalValidated: "Total",
  prayersLabel: "Prières",

  regExemplary: "Exemplaire",
  regVeryRegular: "Très régulier",
  regRegular: "Régulier",
  regInProgress: "En progression",
  regPromisingStart: "Départ prometteur",

  tabOverview: "Évolution",
  tabBreakdown: "Par Prière",
  tabCalendar: "Calendrier",
  tabBadges: "Succès",

  trendTitle: "Tendance d'Assiduité",
  trendSub: "Touchez une barre pour inspecter ou modifier ce jour",
  rangeValidated: "Prières validées :",
  todayLabel: "Aujourd'hui",
  todayMarkAll: "Tout valider (5/5)",
  todayClear: "Effacer",
  todayStatusComplete: "Masha'Allah, toutes vos prières du jour sont accomplies !",
  todayStatusPending: "Poursuivez vos prières avec assiduité et recueillement.",
  surahBaqarahRef: "Sourate Al-Baqarah (2:238)",
  ayahText:
    "« Soyez assidus aux prières et surtout à la prière médiane ; et tenez-vous debout devant Allah, avec humilité. »",

  breakdownIntro:
    "Analyse de votre constance sur les 30 derniers jours pour chacune des cinq prières prescrites.",
  strongPoint: "Point Fort",
  toImprove: "À Renforcer",
  completedOutOf: "{count} accomplies sur {total} jours",

  prevMonth: "Mois précédent",
  nextMonth: "Mois suivant",
  currentMonthBtn: "Ce mois",
  legendFull: "5/5 (Complet)",
  legendMany: "3-4 prières",
  legendFew: "1-2 prières",
  legendZero: "0",
  tapPrayerHint: "Touchez chaque prière pour l'ajouter ou la retirer",
  perfectDaysCountLabel: "Jours parfaits :",

  filterAll: "Tous",
  filterUnlocked: "Débloqués",
  filterLocked: "En cours",
  badgesAccomplished: "accomplis",
  badgeProgress: "Progression",
  badgeDistinction: "Distinction acquise",

  rarityCommon: "Commune",
  rarityRare: "Rare",
  rarityNoble: "Noble",
  rarityLegendary: "Légendaire",

  footerValidated: "{count} prières validées",
  footerBest: "Record : {count}j",

  tooltipValidated: "Validée (cliquez pour retirer)",
  tooltipPending: "À faire (cliquez pour valider)",

  prayers: {
    Fajr: {
      name: "Fajr",
      arabic: "الفجر",
      subtitle: "Prière de l'Aube",
      tip: "Privilégiez le coucher tôt après l'Isha et l'invocation du réveil pour faciliter le lever.",
    },
    Dhuhr: {
      name: "Dhuhr",
      arabic: "الظهر",
      subtitle: "Prière du Midi",
      tip: "Accordez-vous une pause sereine au milieu de votre journée de travail ou d'études.",
    },
    Asr: {
      name: "Asr",
      arabic: "العصر",
      subtitle: "Prière de l'Après-midi",
      tip: "La prière médiane ('as-Salât al-Wustâ') requiert une vigilance toute particulière.",
    },
    Maghrib: {
      name: "Maghrib",
      arabic: "المغرب",
      subtitle: "Prière du Coucher du Soleil",
      tip: "Accomplissez-la dès son entrée, moment béni de recueillement et de gratitude.",
    },
    Isha: {
      name: "Isha",
      arabic: "العشاء",
      subtitle: "Prière de la Nuit",
      tip: "Clôturez votre journée dans le recueillement avant le repos nocturne.",
    },
  },

  badges: {
    first_prayer: {
      title: "Premier Pas",
      description: "A accompli et validé sa toute première prière sur l'application.",
    },
    full_day: {
      title: "Journée Parfaite",
      description: "Les 5 prières quotidiennes accomplies au cours d'une même journée.",
    },
    streak_3: {
      title: "Flamme Triomphale",
      description: "3 jours consécutifs avec l'intégralité des 5 prières accomplies.",
    },
    streak_7: {
      title: "Semaine Bénie",
      description: "7 jours d'affilée sans manquer aucune des 5 prières prescrites.",
    },
    fajr_guardian: {
      title: "Gardien de l'Aube",
      description: "Au moins 7 prières du Fajr accomplies sur les 14 derniers jours.",
    },
    streak_14: {
      title: "Constance Rayonnante",
      description: "14 jours consécutifs d'assiduité absolue aux 5 prières quotidiennes.",
    },
    hundred_club: {
      title: "Centenaire de Lumière",
      description: "100 prières accomplies enregistrées dans votre parcours spirituel.",
    },
    streak_30: {
      title: "Mois d'Or Sacré",
      description: "30 jours consécutifs d'assiduité totale (un mois complet de prières).",
    },
    fajr_sentinel: {
      title: "Sentinelle du Fajr",
      description: "30 prières du Fajr validées au total dans votre historique.",
    },
    five_hundred_club: {
      title: "Mille Prosternations",
      description: "500 prières accomplies dans votre cheminement avec Islam-Noor.",
    },
  },
};

const enStrings: PrayerStatsLocaleStrings = {
  prayerTracking: "Prayer Tracking",
  prayerStatsTitle: "Prayer Statistics & Regularity",
  close: "Close",
  share: "Share",
  copiedShare: "Summary copied to clipboard!",
  shareNotSupported: "Sharing is not supported on this browser",
  shareModalTitle: "My Prayer Tracking — Islam-Noor",

  streak: "Streak",
  days: "days",
  dayShort: "d",
  bestRecord: "Best:",
  sevenDays: "7 Days",
  perfectDays: "5/5 Days",
  perfectLabel: "Completed",
  totalValidated: "Total",
  prayersLabel: "Prayers",

  regExemplary: "Exemplary",
  regVeryRegular: "Very consistent",
  regRegular: "Consistent",
  regInProgress: "Improving",
  regPromisingStart: "Promising start",

  tabOverview: "Trends",
  tabBreakdown: "By Prayer",
  tabCalendar: "Calendar",
  tabBadges: "Achievements",

  trendTitle: "Consistency Trend",
  trendSub: "Tap a bar to inspect or edit this day",
  rangeValidated: "Validated prayers:",
  todayLabel: "Today",
  todayMarkAll: "Mark all (5/5)",
  todayClear: "Clear",
  todayStatusComplete: "Masha'Allah, all your prayers for today are completed!",
  todayStatusPending: "Continue your prayers with devotion and steadfastness.",
  surahBaqarahRef: "Surah Al-Baqarah (2:238)",
  ayahText:
    "“Maintain with care the prayers and [in particular] the middle prayer and stand before Allah, devoutly obedient.”",

  breakdownIntro:
    "Consistency analysis over the last 30 days for each of the five prescribed prayers.",
  strongPoint: "Strongest",
  toImprove: "To Improve",
  completedOutOf: "{count} completed out of {total} days",

  prevMonth: "Previous month",
  nextMonth: "Next month",
  currentMonthBtn: "This month",
  legendFull: "5/5 (Complete)",
  legendMany: "3-4 prayers",
  legendFew: "1-2 prayers",
  legendZero: "0",
  tapPrayerHint: "Tap each prayer to add or remove",
  perfectDaysCountLabel: "Perfect days:",

  filterAll: "All",
  filterUnlocked: "Unlocked",
  filterLocked: "In Progress",
  badgesAccomplished: "unlocked",
  badgeProgress: "Progress",
  badgeDistinction: "Achievement unlocked",

  rarityCommon: "Common",
  rarityRare: "Rare",
  rarityNoble: "Noble",
  rarityLegendary: "Legendary",

  footerValidated: "{count} prayers validated",
  footerBest: "Best: {count}d",

  tooltipValidated: "Validated (click to unmark)",
  tooltipPending: "Pending (click to mark completed)",

  prayers: {
    Fajr: {
      name: "Fajr",
      arabic: "الفجر",
      subtitle: "Dawn Prayer",
      tip: "Sleep early after Isha and recite the waking supplication to wake up easily.",
    },
    Dhuhr: {
      name: "Dhuhr",
      arabic: "الظهر",
      subtitle: "Noon Prayer",
      tip: "Take a peaceful spiritual break in the middle of your work or study day.",
    },
    Asr: {
      name: "Asr",
      arabic: "العصر",
      subtitle: "Afternoon Prayer",
      tip: "The middle prayer ('as-Salat al-Wusta') requires extra dedication and mindfulness.",
    },
    Maghrib: {
      name: "Maghrib",
      arabic: "المغرب",
      subtitle: "Sunset Prayer",
      tip: "Perform it promptly as its time enters, a blessed time of gratitude.",
    },
    Isha: {
      name: "Isha",
      arabic: "العشاء",
      subtitle: "Night Prayer",
      tip: "Conclude your day in peaceful devotion before night rest.",
    },
  },

  badges: {
    first_prayer: {
      title: "First Step",
      description: "Performed and logged their very first prayer on the app.",
    },
    full_day: {
      title: "Perfect Day",
      description: "All 5 daily prayers performed and recorded in a single day.",
    },
    streak_3: {
      title: "Steadfast Flame",
      description: "3 consecutive days with all 5 daily prayers completed.",
    },
    streak_7: {
      title: "Blessed Week",
      description: "7 consecutive days without missing any of the 5 prescribed prayers.",
    },
    fajr_guardian: {
      title: "Dawn Guardian",
      description: "At least 7 Fajr prayers completed over the past 14 days.",
    },
    streak_14: {
      title: "Radiant Constancy",
      description: "14 consecutive days of absolute consistency in all 5 daily prayers.",
    },
    hundred_club: {
      title: "Century of Light",
      description: "100 completed prayers recorded along your spiritual journey.",
    },
    streak_30: {
      title: "Sacred Golden Month",
      description: "30 consecutive days of total consistency (a full month of prayer).",
    },
    fajr_sentinel: {
      title: "Fajr Sentinel",
      description: "30 total Fajr prayers completed and logged in your journey.",
    },
    five_hundred_club: {
      title: "A Thousand Prostrations",
      description: "500 prayers completed in your spiritual path with Islam-Noor.",
    },
  },
};

const arStrings: PrayerStatsLocaleStrings = {
  prayerTracking: "متابعة الصلوات",
  prayerStatsTitle: "إحصائيات الصلاة والمواظبة",
  close: "إغلاق",
  share: "مشاركة",
  copiedShare: "تم نسخ التقرير إلى الحافظة بنجاح!",
  shareNotSupported: "المشاركة غير مدعومة على هذا المتصفح",
  shareModalTitle: "متابعة صلواتي — إسلام نور",

  streak: "المتتالية",
  days: "أيام",
  dayShort: "ي",
  bestRecord: "الأفضل:",
  sevenDays: "٧ أيام",
  perfectDays: "أيام ٥/٥",
  perfectLabel: "مكتملة",
  totalValidated: "المجموع",
  prayersLabel: "صلوات",

  regExemplary: "نموذجي",
  regVeryRegular: "ملتزم جداً",
  regRegular: "ملتزم",
  regInProgress: "في تحسن",
  regPromisingStart: "بداية واعدة",

  tabOverview: "التطور",
  tabBreakdown: "لكل صلاة",
  tabCalendar: "التقويم",
  tabBadges: "الإنجازات",

  trendTitle: "مؤشر المواظبة",
  trendSub: "المس عموداً لعرض أو تعديل صلوات هذا اليوم",
  rangeValidated: "الصلوات المؤداة:",
  todayLabel: "اليوم",
  todayMarkAll: "تأكيد الكل (٥/٥)",
  todayClear: "مسح",
  todayStatusComplete: "ما شاء الله، اكتملت جميع صلوات اليوم!",
  todayStatusPending: "واصل صلواتك بخشوع ومواظبة واستقامة.",
  surahBaqarahRef: "سورة البقرة (٢:٢٣٨)",
  ayahText: "«حَافِظُوا عَلَى الصَّلَوَاتِ وَالصَّلَاةِ الْوُسْطَىٰ وَقُومُوا لِلَّهِ قَانِتِينَ»",

  breakdownIntro:
    "تحليل لمدى مواظبتك على كل صلاة من الصلوات الخمس المفروضة خلال آخر ٣٠ يوماً.",
  strongPoint: "نقطة قوة",
  toImprove: "بحاجة للمواظبة",
  completedOutOf: "{count} مؤداة من أصل {total} يوماً",

  prevMonth: "الشهر السابق",
  nextMonth: "الشهر التالي",
  currentMonthBtn: "هذا الشهر",
  legendFull: "٥/٥ (مكتمل)",
  legendMany: "٣-٤ صلوات",
  legendFew: "١-٢ صلوات",
  legendZero: "٠",
  tapPrayerHint: "المس كل صلاة لإضافتها أو إزالتها",
  perfectDaysCountLabel: "الأيام المكتملة:",

  filterAll: "الكل",
  filterUnlocked: "المكتملة",
  filterLocked: "قيد الإنجاز",
  badgesAccomplished: "مكتمل",
  badgeProgress: "التقدم",
  badgeDistinction: "وسام مكتسب",

  rarityCommon: "شائعة",
  rarityRare: "نادرة",
  rarityNoble: "كريمة",
  rarityLegendary: "أسطورية",

  footerValidated: "{count} صلاة مؤداة",
  footerBest: "الأفضل: {count}ي",

  tooltipValidated: "مؤداة (انقر للإلغاء)",
  tooltipPending: "في الانتظار (انقر للتأكيد)",

  prayers: {
    Fajr: {
      name: "الفجر",
      arabic: "الفجر",
      subtitle: "صلاة الفجر",
      tip: "احرص على النوم مبكراً بعد العشاء ودعاء الاستيقاظ لتيْسير القيام.",
    },
    Dhuhr: {
      name: "الظهر",
      arabic: "الظهر",
      subtitle: "صلاة الظهر",
      tip: "خذ استراحة روحانية هادئة في منتصف يوم عملك أو دراستك.",
    },
    Asr: {
      name: "العصر",
      arabic: "العصر",
      subtitle: "صلاة العصر",
      tip: "الصلاة الوسطى تتطلب عناية ويقظة خاصة لعظيم فضلها.",
    },
    Maghrib: {
      name: "المغرب",
      arabic: "المغرب",
      subtitle: "صلاة المغرب",
      tip: "أدِّها في أول وقتها عند غروب الشمس، وهو وقت مبارك للشكر والدعاء.",
    },
    Isha: {
      name: "العشاء",
      arabic: "العشاء",
      subtitle: "صلاة العشاء",
      tip: "اختم يومك بالخشوع والسكينة قبل الخلود إلى النوم.",
    },
  },

  badges: {
    first_prayer: {
      title: "الخطوة الأولى",
      description: "أدى وسجّل أول صلاة له في التطبيق.",
    },
    full_day: {
      title: "يوم متكامل",
      description: "إتمام جميع الصلوات الخمس في يوم واحد.",
    },
    streak_3: {
      title: "شعلة المواظبة",
      description: "٣ أيام متتالية مع أداء كامل الصلوات الخمس دون انقطاع.",
    },
    streak_7: {
      title: "أسبوع مبارك",
      description: "٧ أيام متتالية من المواظبة التامة على الصلوات المفروضة.",
    },
    fajr_guardian: {
      title: "حارس الفجر",
      description: "أداء ٧ صلوات فجر على الأقل خلال آخر ١٤ يوماً.",
    },
    streak_14: {
      title: "استقامة وضاءة",
      description: "١٤ يوماً متواصلاً من المحافظة الدقيقة على الصلوات الخمس.",
    },
    hundred_club: {
      title: "مئوية النور",
      description: "١٠٠ صلاة مؤداة ومسجلة في مسيرتك الإيمانية المباركة.",
    },
    streak_30: {
      title: "شهر الذهب المبارك",
      description: "٣٠ يوماً متتالياً من المواظبة الكاملة (شهر كامل من الصلاة).",
    },
    fajr_sentinel: {
      title: "مرابط الفجر",
      description: "٣٠ صلاة فجر مؤداة ومسجلة في رصيدك الإيماني.",
    },
    five_hundred_club: {
      title: "ألف سجدة مباركة",
      description: "٥٠٠ صلاة مؤداة في مسيرتك المباركة مع إسلام نور.",
    },
  },
};

const esStrings: PrayerStatsLocaleStrings = {
  prayerTracking: "Seguimiento de Oraciones",
  prayerStatsTitle: "Estadísticas y Constancia",
  close: "Cerrar",
  share: "Compartir",
  copiedShare: "¡Resumen copiado al portapapeles!",
  shareNotSupported: "Compartir no es compatible en este navegador",
  shareModalTitle: "Mi Seguimiento de Oraciones — Islam-Noor",

  streak: "Racha",
  days: "días",
  dayShort: "d",
  bestRecord: "Récord:",
  sevenDays: "7 Días",
  perfectDays: "Días 5/5",
  perfectLabel: "Completas",
  totalValidated: "Total",
  prayersLabel: "Oraciones",

  regExemplary: "Ejemplar",
  regVeryRegular: "Muy constante",
  regRegular: "Constante",
  regInProgress: "En progreso",
  regPromisingStart: "Inicio prometedor",

  tabOverview: "Evolución",
  tabBreakdown: "Por Oración",
  tabCalendar: "Calendario",
  tabBadges: "Logros",

  trendTitle: "Tendencia de Asiduidad",
  trendSub: "Toca una barra para inspeccionar o editar este día",
  rangeValidated: "Oraciones validadas:",
  todayLabel: "Hoy",
  todayMarkAll: "Validar todas (5/5)",
  todayClear: "Borrar",
  todayStatusComplete: "¡Masha'Allah, todas tus oraciones de hoy están cumplidas!",
  todayStatusPending: "Continúa tus oraciones con devoción y recogimiento.",
  surahBaqarahRef: "Sura Al-Baqarah (2:238)",
  ayahText:
    "«Sean constantes en las oraciones y especialmente en la oración intermedia; y pónganse de pie ante Allah con humildad.»",

  breakdownIntro:
    "Análisis de tu constancia en los últimos 30 días para cada una de las cinco oraciones prescritas.",
  strongPoint: "Punto Fuerte",
  toImprove: "A Reforzar",
  completedOutOf: "{count} cumplidas de {total} días",

  prevMonth: "Mes anterior",
  nextMonth: "Mes siguiente",
  currentMonthBtn: "Este mes",
  legendFull: "5/5 (Completo)",
  legendMany: "3-4 oraciones",
  legendFew: "1-2 oraciones",
  legendZero: "0",
  tapPrayerHint: "Toca cada oración para agregarla o quitarla",
  perfectDaysCountLabel: "Días perfectos:",

  filterAll: "Todos",
  filterUnlocked: "Desbloqueados",
  filterLocked: "En curso",
  badgesAccomplished: "conseguidos",
  badgeProgress: "Progreso",
  badgeDistinction: "Distinción obtenida",

  rarityCommon: "Común",
  rarityRare: "Rara",
  rarityNoble: "Noble",
  rarityLegendary: "Legendaria",

  footerValidated: "{count} oraciones validadas",
  footerBest: "Récord: {count}d",

  tooltipValidated: "Validada (clic para quitar)",
  tooltipPending: "Pendiente (clic para validar)",

  prayers: {
    Fajr: {
      name: "Fajr",
      arabic: "الفجر",
      subtitle: "Oración del Alba",
      tip: "Duerme temprano después de Isha y recita la súplica del despertar para levantarte fácilmente.",
    },
    Dhuhr: {
      name: "Dhuhr",
      arabic: "الظهر",
      subtitle: "Oración del Mediodía",
      tip: "Tómate una pausa serena en medio de tu jornada de trabajo o estudio.",
    },
    Asr: {
      name: "Asr",
      arabic: "العصر",
      subtitle: "Oración de la Tarde",
      tip: "La oración intermedia ('as-Salat al-Wusta') requiere una atención muy especial.",
    },
    Maghrib: {
      name: "Maghrib",
      arabic: "المغرب",
      subtitle: "Oración del Ocaso",
      tip: "Realízala tan pronto entre su tiempo, momento bendito de gratitud.",
    },
    Isha: {
      name: "Isha",
      arabic: "العشاء",
      subtitle: "Oración de la Noche",
      tip: "Concluye tu día con devoción antes del descanso nocturno.",
    },
  },

  badges: {
    first_prayer: {
      title: "Primer Paso",
      description: "Realizó y registró su primera oración en la aplicación.",
    },
    full_day: {
      title: "Día Perfecto",
      description: "Las 5 oraciones diarias realizadas en un mismo día.",
    },
    streak_3: {
      title: "Llama Triunfal",
      description: "3 días consecutivos con las 5 oraciones cumplidas.",
    },
    streak_7: {
      title: "Semana Bendita",
      description: "7 días seguidos sin perder ninguna de las 5 oraciones prescritas.",
    },
    fajr_guardian: {
      title: "Guardián del Alba",
      description: "Al menos 7 oraciones de Fajr en los últimos 14 días.",
    },
    streak_14: {
      title: "Constancia Radiante",
      description: "14 días consecutivos de asiduidad absoluta a las 5 oraciones diarias.",
    },
    hundred_club: {
      title: "Centuria de Luz",
      description: "100 oraciones completadas registradas en tu camino espiritual.",
    },
    streak_30: {
      title: "Mes Dorado Sagrado",
      description: "30 días consecutivos de constancia total (un mes completo de oraciones).",
    },
    fajr_sentinel: {
      title: "Centinela del Fajr",
      description: "30 oraciones de Fajr registradas en tu historial espiritual.",
    },
    five_hundred_club: {
      title: "Mil Postraciones",
      description: "500 oraciones cumplidas en tu camino con Islam-Noor.",
    },
  },
};

const deStrings: PrayerStatsLocaleStrings = {
  prayerTracking: "Gebetsverfolgung",
  prayerStatsTitle: "Gebetsstatistiken & Regelmäßigkeit",
  close: "Schließen",
  share: "Teilen",
  copiedShare: "Zusammenfassung in die Zwischenablage kopiert!",
  shareNotSupported: "Teilen wird von diesem Browser nicht unterstützt",
  shareModalTitle: "Meine Gebetsverfolgung — Islam-Noor",

  streak: "Serie",
  days: "Tage",
  dayShort: "T",
  bestRecord: "Rekord:",
  sevenDays: "7 Tage",
  perfectDays: "5/5 Tage",
  perfectLabel: "Vollständig",
  totalValidated: "Gesamt",
  prayersLabel: "Gebete",

  regExemplary: "Vorbildlich",
  regVeryRegular: "Sehr regelmäßig",
  regRegular: "Regelmäßig",
  regInProgress: "Im Aufbau",
  regPromisingStart: "Vielversprechender Start",

  tabOverview: "Entwicklung",
  tabBreakdown: "Pro Gebet",
  tabCalendar: "Kalender",
  tabBadges: "Erfolge",

  trendTitle: "Gebetstrend & Beständigkeit",
  trendSub: "Tippen Sie auf einen Balken, um den Tag zu bearbeiten",
  rangeValidated: "Verrichtete Gebete:",
  todayLabel: "Heute",
  todayMarkAll: "Alle bestätigen (5/5)",
  todayClear: "Löschen",
  todayStatusComplete: "Masha'Allah, alle heutigen Gebete sind verrichtet!",
  todayStatusPending: "Verrichten Sie Ihre Gebete weiterhin mit Hingabe und Ruhe.",
  surahBaqarahRef: "Sure Al-Baqarah (2:238)",
  ayahText:
    "„Haltet die Gebete ein, und (besonders) das mittlere Gebet, und steht demütig vor Allah.“",

  breakdownIntro:
    "Analyse Ihrer Beständigkeit in den letzten 30 Tagen für jedes der fünf Pflichtgebete.",
  strongPoint: "Stärke",
  toImprove: "Zu Festigen",
  completedOutOf: "{count} von {total} Tagen verrichtet",

  prevMonth: "Vorheriger Monat",
  nextMonth: "Nächster Monat",
  currentMonthBtn: "Dieser Monat",
  legendFull: "5/5 (Vollständig)",
  legendMany: "3-4 Gebete",
  legendFew: "1-2 Gebete",
  legendZero: "0",
  tapPrayerHint: "Tippen Sie auf ein Gebet, um es hinzuzufügen oder zu entfernen",
  perfectDaysCountLabel: "Perfekte Tage:",

  filterAll: "Alle",
  filterUnlocked: "Erreicht",
  filterLocked: "In Arbeit",
  badgesAccomplished: "erreicht",
  badgeProgress: "Fortschritt",
  badgeDistinction: "Abzeichen erlangt",

  rarityCommon: "Gewöhnlich",
  rarityRare: "Selten",
  rarityNoble: "Edel",
  rarityLegendary: "Legendär",

  footerValidated: "{count} Gebete verrichtet",
  footerBest: "Rekord: {count}T",

  tooltipValidated: "Bestätigt (zum Abwählen klicken)",
  tooltipPending: "Ausstehend (zum Bestätigen klicken)",

  prayers: {
    Fajr: {
      name: "Fajr",
      arabic: "الفجر",
      subtitle: "Morgengebet",
      tip: "Gehen Sie nach dem Ischa-Gebet früh schlafen, um das Aufstehen zu erleichtern.",
    },
    Dhuhr: {
      name: "Dhuhr",
      arabic: "الظهر",
      subtitle: "Mittagsgebet",
      tip: "Gönnen Sie sich mitten im Arbeits- oder Studientag eine friedliche Pause.",
    },
    Asr: {
      name: "Asr",
      arabic: "العصر",
      subtitle: "Nachmittagsgebet",
      tip: "Das mittlere Gebet ('as-Salat al-Wusta') erfordert besondere Achtsamkeit.",
    },
    Maghrib: {
      name: "Maghrib",
      arabic: "المغرب",
      subtitle: "Abendgebet",
      tip: "Verrichten Sie es pünktlich bei Sonnenuntergang, einem gesegneten Moment der Dankbarkeit.",
    },
    Isha: {
      name: "Isha",
      arabic: "العشاء",
      subtitle: "Nachtgebet",
      tip: "Schließen Sie Ihren Tag vor der Nachtruhe in tiefer Andacht ab.",
    },
  },

  badges: {
    first_prayer: {
      title: "Erster Schritt",
      description: "Hat sein allererstes Gebet in der App verrichtet und eingetragen.",
    },
    full_day: {
      title: "Perfekter Tag",
      description: "Alle 5 täglichen Pflichtgebete an einem einzigen Tag verrichtet.",
    },
    streak_3: {
      title: "Flamme der Standhaftigkeit",
      description: "3 aufeinanderfolgende Tage mit allen 5 verrichteten Gebeten.",
    },
    streak_7: {
      title: "Gesegnete Woche",
      description: "7 Tage hintereinander ohne Versäumnis der 5 Pflichtgebete.",
    },
    fajr_guardian: {
      title: "Hüter der Morgendämmerung",
      description: "Mindestens 7 Fajr-Gebete in den letzten 14 Tagen verrichtet.",
    },
    streak_14: {
      title: "Strahlende Beständigkeit",
      description: "14 Tage in Folge vollkommene Hingabe an die 5 täglichen Gebete.",
    },
    hundred_club: {
      title: "Hundert Lichter",
      description: "100 verrichtete Gebete auf Ihrer spirituellen Reise verzeichnet.",
    },
    streak_30: {
      title: "Heiliger Goldener Monat",
      description: "30 Tage ununterbrochene Beständigkeit (ein ganzer Monat voller Gebet).",
    },
    fajr_sentinel: {
      title: "Wächter des Fajr",
      description: "30 Fajr-Gebete in Ihrer spirituellen Reise verzeichnet.",
    },
    five_hundred_club: {
      title: "Tausend Niederwerfungen",
      description: "500 verrichtete Gebete auf Ihrem Weg mit Islam-Noor.",
    },
  },
};

const trStrings: PrayerStatsLocaleStrings = {
  prayerTracking: "Namaz Takibi",
  prayerStatsTitle: "Namaz İstatistikleri ve Devamlılık",
  close: "Kapat",
  share: "Paylaş",
  copiedShare: "Özet panoya kopyalandı!",
  shareNotSupported: "Bu tarayıcıda paylaşım desteklenmiyor",
  shareModalTitle: "Namaz Takibim — Islam-Noor",

  streak: "Seri",
  days: "gün",
  dayShort: "g",
  bestRecord: "Rekor:",
  sevenDays: "7 Gün",
  perfectDays: "5/5 Gün",
  perfectLabel: "Eksiksiz",
  totalValidated: "Toplam",
  prayersLabel: "Namaz",

  regExemplary: "Kusursuz",
  regVeryRegular: "Çok düzenli",
  regRegular: "Düzenli",
  regInProgress: "Gelişiyor",
  regPromisingStart: "Umut verici başlangıç",

  tabOverview: "Gelişim",
  tabBreakdown: "Namaza Göre",
  tabCalendar: "Takvim",
  tabBadges: "Başarılar",

  trendTitle: "Namaz Devamlılığı",
  trendSub: "Bir güne ait namazları incelemek veya düzenlemek için çubuğa dokunun",
  rangeValidated: "Kılınan namazlar:",
  todayLabel: "Bugün",
  todayMarkAll: "Hepsini tamamla (5/5)",
  todayClear: "Temizle",
  todayStatusComplete: "MaşaAllah, bugünkü tüm namazlarınız tamamlandı!",
  todayStatusPending: "Namazlarınızı huşu ve istikrarla kılmaya devam edin.",
  surahBaqarahRef: "Bakara Suresi (2:238)",
  ayahText:
    "«Namazlara ve orta namaza devam edin; gönülden boyun eğerek Allah'ın huzurunda durun.»",

  breakdownIntro:
    "Beş vakit namazın her biri için son 30 gündeki devamlılık analizi.",
  strongPoint: "En Düzenli",
  toImprove: "Geliştirilmeli",
  completedOutOf: "{total} günde {count} vakit kılındı",

  prevMonth: "Önceki ay",
  nextMonth: "Sonraki ay",
  currentMonthBtn: "Bu ay",
  legendFull: "5/5 (Tam)",
  legendMany: "3-4 vakit",
  legendFew: "1-2 vakit",
  legendZero: "0",
  tapPrayerHint: "Eklemek veya çıkarmak için her vakte dokunun",
  perfectDaysCountLabel: "Eksiksiz günler:",

  filterAll: "Tümü",
  filterUnlocked: "Kazanılan",
  filterLocked: "Devam eden",
  badgesAccomplished: "tamamlandı",
  badgeProgress: "İlerleme",
  badgeDistinction: "Rozet kazanıldı",

  rarityCommon: "Yaygın",
  rarityRare: "Nadir",
  rarityNoble: "Seçkin",
  rarityLegendary: "Efsanevi",

  footerValidated: "{count} namaz kılındı",
  footerBest: "Rekor: {count}g",

  tooltipValidated: "Kılındı (kaldırmak için tıklayın)",
  tooltipPending: "Kılınmadı (tamamlamak için tıklayın)",

  prayers: {
    Fajr: {
      name: "Sabah",
      arabic: "الفجر",
      subtitle: "Sabah Namazı",
      tip: "Yatsıdan sonra erken uyumak ve uyanma duasını okumak kalkmayı kolaylaştırır.",
    },
    Dhuhr: {
      name: "Öğle",
      arabic: "الظهر",
      subtitle: "Öğle Namazı",
      tip: "Yoğun gününüzün ortasında huzurlu bir manevi mola verin.",
    },
    Asr: {
      name: "İkindi",
      arabic: "العصر",
      subtitle: "İkindi Namazı",
      tip: "Orta namaz ('Salât-ı Vusta') büyük faziletinden ötürü özel bir dikkat gerektirir.",
    },
    Maghrib: {
      name: "Akşam",
      arabic: "المغرب",
      subtitle: "Akşam Namazı",
      tip: "Güneş batar batmaz vaktinde kılın, şükür ve dua için bereketli bir andır.",
    },
    Isha: {
      name: "Yatsı",
      arabic: "العشاء",
      subtitle: "Yatsı Namazı",
      tip: "Gününüzü gece istirahatinden önce huzurla ve huşuyla tamamlayın.",
    },
  },

  badges: {
    first_prayer: {
      title: "İlk Adım",
      description: "Uygulamada ilk namazını kıldı ve kaydetti.",
    },
    full_day: {
      title: "Eksiksiz Gün",
      description: "Bir gün içerisindeki 5 vakit namazın tamamı kılındı.",
    },
    streak_3: {
      title: "İstikrar Meşalesi",
      description: "Arka arkaya 3 gün boyunca tüm namazlar eksiksiz tamamlandı.",
    },
    streak_7: {
      title: "Bereketli Hafta",
      description: "7 gün boyunca hiçbir vakti kaçırmadan tam devamlılık sağlandı.",
    },
    fajr_guardian: {
      title: "Fecrin Muhafızı",
      description: "Son 14 günde en az 7 sabah namazı kılındı.",
    },
    streak_14: {
      title: "Nurlu Devamlılık",
      description: "14 gün boyunca 5 vakit namaza tam bağlılık.",
    },
    hundred_club: {
      title: "Yüz Namaz Kulübü",
      description: "Manevi yolculuğunuzda kaydedilen 100 vakit namaz.",
    },
    streak_30: {
      title: "Altın Ay",
      description: "30 gün aralıksız tam namaz devamlılığı (tam bir ay ibadet).",
    },
    fajr_sentinel: {
      title: "Sabah Muhafızı",
      description: "Manevi yolculuğunuzda toplam 30 sabah namazı kaydedildi.",
    },
    five_hundred_club: {
      title: "Bin Secde Kulübü",
      description: "Islam-Noor ile manevi yolunuzda 500 namaz tamamlandı.",
    },
  },
};

const STRINGS_MAP: Record<string, PrayerStatsLocaleStrings> = {
  fr: frStrings,
  en: enStrings,
  ar: arStrings,
  "ar-DZ": arStrings,
  "ar-MA": arStrings,
  "ar-EG": arStrings,
  "ar-TN": arStrings,
  es: esStrings,
  de: deStrings,
  tr: trStrings,
};

/**
 * Returns localized strings for Prayer Statistics with graceful fallback.
 */
export function getPrayerStatsStrings(locale = "fr"): PrayerStatsLocaleStrings {
  const norm = (locale || "fr").toLowerCase();
  if (STRINGS_MAP[norm]) return STRINGS_MAP[norm];

  const prefix = norm.split("-")[0];
  if (STRINGS_MAP[prefix]) return STRINGS_MAP[prefix];

  // Default fallback: if French requested or default, return French; otherwise English
  return norm.startsWith("fr") ? frStrings : enStrings;
}

/**
 * Generates localized share text for prayer statistics.
 */
export function generateLocalizedPrayerSummary(
  stats: {
    totalValidated: number;
    currentStreak: number;
    bestStreak: number;
    weeklyPercentage: number;
    weeklyValidated: number;
    perfectDaysTotal: number;
    strongestPrayer?: { name: string; percentage: number } | null;
    badges: { unlocked: boolean }[];
  },
  locale = "fr",
): string {
  const s = getPrayerStatsStrings(locale);
  const unlocked = stats.badges.filter((b) => b.unlocked).length;

  const lines: string[] = [
    `🌙 ${s.shareModalTitle}`,
    `✨ ${s.rangeValidated} ${stats.totalValidated}`,
    `🔥 ${s.streak} : ${stats.currentStreak} ${s.days} (${s.bestRecord} ${stats.bestStreak}${s.dayShort})`,
    `📊 ${s.sevenDays} : ${stats.weeklyPercentage}% (${stats.weeklyValidated}/35)`,
    `🌟 ${s.perfectDays} : ${stats.perfectDaysTotal}`,
  ];

  if (stats.strongestPrayer) {
    lines.push(`🕋 ${s.strongPoint} : ${stats.strongestPrayer.name} (${stats.strongestPrayer.percentage}%)`);
  }

  lines.push(`🏆 ${s.tabBadges} : ${unlocked}/${stats.badges.length}`);

  if (locale.startsWith("ar")) {
    lines.push(`\nتقبل الله منا ومنكم صالح الأعمال وثبت قلوبنا على طاعته. 🤲`);
  } else if (locale.startsWith("en")) {
    lines.push(`\nMay Allah accept our prayers and keep our hearts steadfast in devotion. 🤲`);
  } else if (locale.startsWith("es")) {
    lines.push(`\nQue Allah acepte nuestras oraciones y fortalezca nuestros corazones. 🤲`);
  } else if (locale.startsWith("tr")) {
    lines.push(`\nAllah dualarımızı ve namazlarımızı kabul eylesin, kalplerimizi sabit kılsın. 🤲`);
  } else {
    lines.push(`\nQu'Allah agrée nos prières et raffermisse nos cœurs dans la constance. 🤲`);
  }

  return lines.join("\n");
}
