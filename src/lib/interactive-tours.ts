import type { TourStep } from "@/components/InteractivePageTour";
import type { PageTutorialId } from "@/lib/page-tutorials";
import type { Dict } from "@/lib/locales/en";

/**
 * Tutoriels interactifs : une courte etape par element cle de la page.
 *
 * Les textes proviennent du dictionnaire de traduction (cles `tour*`), donc
 * ils sont traduits comme le reste de l'interface. Si une traduction manque
 * dans une locale, la valeur de reference (anglais) est utilisee.
 */
export function getInteractiveTour(pageId: PageTutorialId, t: Dict): TourStep[] {
  switch (pageId) {
    case "home":
      return [
        {
          target: '[data-tour="prayer-timeline"]',
          title: t.tourHomeTimelineTitle || "Vos prières",
          description: t.tourHomeTimelineDesc || "Le widget montre les cinq prières et la prochaine.",
          placement: "bottom",
        },
        {
          target: '[data-tour="quran-player"]',
          title: t.tourHomeQuranTitle || "Écouter le Coran",
          description: t.tourHomeQuranDesc || "Lancez la récitation d'une sourate sans quitter l'accueil.",
          placement: "top",
        },
        {
          target: '[data-tour="mosque-map"]',
          title: t.tourHomeMosqueTitle || "Les mosquées proches",
          description: t.tourHomeMosqueDesc || "Repérez les mosquées autour de vous sur la carte.",
          placement: "top",
        },
      ];

    case "prayers":
      return [
        {
          target: "#qibla",
          title: t.tourPrayersQiblaTitle || "La Qibla",
          description: t.tourPrayersQiblaDesc || "La flèche indique la direction de la prière.",
          placement: "bottom",
        },
        {
          target: '[data-tour="prayer-times"]',
          title: t.tourPrayersTimesTitle || "Les horaires",
          description: t.tourPrayersTimesDesc || "L'heure de chaque prière et l'iqama Associated.",
          placement: "left",
        },
        {
          target: '[data-tour="prayer-reminder"]',
          title: t.tourPrayersReminderTitle || "Les rappels",
          description: t.tourPrayersReminderDesc || "Choisissez quand être prévenu avant l'adhan.",
          placement: "top",
        },
      ];

    case "quran":
      return [
        {
          target: '[data-tour="quran-reader"]',
          title: t.tourQuranReaderTitle || "Le lecteur",
          description: t.tourQuranReaderDesc || "Versets, traduction et audio au même endroit.",
          placement: "bottom",
        },
        {
          target: '[data-tour="quran-list"]',
          title: t.tourQuranListTitle || "Les sourates",
          description: t.tourQuranListDesc || "Parcourez la liste et lancez la récitation.",
          placement: "left",
        },
      ];

    case "halal":
      return [
        {
          target: '[data-tour="halal-scanner"]',
          title: t.tourHalalScannerTitle || "Scanner un produit",
          description: t.tourHalalScannerDesc || "Visez le code-barres pour obtenir le verdict.",
          placement: "top",
        },
        {
          target: '[data-tour="halal-search"]',
          title: t.tourHalalSearchTitle || "Rechercher",
          description: t.tourHalalSearchDesc || "Retrouvez un produit par son nom.",
          placement: "bottom",
        },
      ];

    case "settings":
      return [
        {
          target: '[data-tour="settings-customization"]',
          title: t.tourSettingsCustomTitle || "Personnalisation",
          description: t.tourSettingsCustomDesc || "Widgets, fonds, couleurs et bordures.",
          placement: "bottom",
        },
        {
          target: '[data-tour="settings-appearance"]',
          title: t.tourSettingsAppearanceTitle || "Apparence",
          description: t.tourSettingsAppearanceDesc || "Polices, taille du texte, animations et mode sombre.",
          placement: "top",
        },
        {
          target: '[data-tour="settings-notifications"]',
          title: t.tourSettingsNotificationsTitle || "Notifications",
          description: t.tourSettingsNotificationsDesc || "Rappels, adhan et langue de l'application.",
          placement: "top",
        },
      ];

    default:
      return [];
  }
}
