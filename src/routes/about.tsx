import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Compass,
  Volume2,
  ShieldCheck,
  Sparkles,
  QrCode,
  Globe2,
  Heart,
  Lock,
  Moon,
  CheckCircle2,
  WifiOff,
  Flame,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import appLogo from "@/assets/images/app_logo_main.png";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos — Islam-Noor, Prières, Qibla & Coran" },
      {
        name: "description",
        content:
          "Découvrez le fonctionnement de Islam-Noor : calcul de la direction de la Qibla, horaires de prière, Coran en 50 langues et scanner halal.",
      },
      { property: "og:title", content: "À propos — Islam-Noor" },
      {
        property: "og:description",
        content:
          "Présentation de l'application Islam-Noor, algorithmes astronomiques, Qibla et scanner halal.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AboutPage,
});

const VERSION = "3.0.0";
const BUILD_YEAR = "2026";

function AboutPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground py-6 px-4 space-y-6">
      <main className="max-w-2xl mx-auto space-y-6">
        {/* Simple top back affordance (without navigation bar) */}
        <div className="flex items-center justify-between">
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors bg-muted/40 hover:bg-muted/70 border border-border/50"
            aria-label={t.nav_settings || "Retour aux réglages"}
          >
            <ArrowLeft className="size-4 text-amber-500 shrink-0" />
            <span>{t.nav_settings || "Retour aux réglages"}</span>
          </Link>
          <span className="text-xs font-bold text-muted-foreground">
            {t.aboutApp || "À propos de l'application"}
          </span>
        </div>

        {/* HERO LOGO & IDENTITY BANNER */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-amber-500/10 via-card to-card border border-amber-500/25 p-6 sm:p-8 shadow-sm text-center">
          {/* Subtle Ambient Backlights */}
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 size-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col items-center">
            {/* Official Circular Application Logo */}
            <div className="relative mb-4 group">
              <div className="size-28 sm:size-32 rounded-full p-1 bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 shadow-xl shadow-amber-900/15 ring-4 ring-amber-500/20">
                <img
                  src={appLogo}
                  alt="Logo officiel Islam-Noor"
                  className="size-full object-cover rounded-full bg-amber-900/10"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md border-2 border-background">
                <CheckCircle2 className="size-4" />
              </div>
            </div>

            {/* Title & Tagline */}
            <div className="space-y-1.5 max-w-lg">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight text-foreground">
                Islam-Noor
              </h2>
              <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 font-semibold">
                {t.appNameDesc || "Votre compagnon spirituel et quotidien pour la Oumma"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                {t.aboutIntro ||
                  "Islam-Noor est conçu pour accompagner chaque instant de votre journée avec exactitude : horaires de prière certifiés, Qibla par calcul astronomique, Saint Coran avec Tajwid audio, invocations authentiques et vérification des aliments halal."}
              </p>
            </div>

            {/* Unboxed Metadata & Badges */}
            <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Version {VERSION}</span>
              <span aria-hidden="true">·</span>
              <span>Édition {BUILD_YEAR}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <WifiOff className="size-3.5" /> 100% Hors-ligne
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                <Globe2 className="size-3.5" /> 50 Langues
              </span>
            </div>
          </div>
        </section>

        {/* CORE PILLARS & FEATURES BREAKDOWN */}
        <section className="space-y-3">
          <div className="px-1 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>{t.aboutCoreFeatures || "Fonctionnalités Principales & Algorithmes"}</span>
            </h3>
            <span className="text-[11px] text-muted-foreground font-medium">
              Conception rigoureuse
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Pillar 1: Prayer Times */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 hover:border-amber-500/40 transition-colors space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <Volume2 className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {t.aboutPrayerTimesTitle || "Calculs des Prières"}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {t.aboutWorldOrgsSubtitle || "Organisations Mondiales & Mawaqit"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.aboutTimesDesc ||
                  "Horaires calculés scientifiquement selon les méthodes officielles (UOIF, Ligue Islamique Mondiale, Umm al-Qura, ISNA, Egypte) avec rappels personnalisables avant l'Azan."}
              </p>
            </div>

            {/* Pillar 2: Qibla Direction */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 hover:border-emerald-500/40 transition-colors space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Compass className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {t.aboutQiblaTitle || "Direction de la Qibla"}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {t.aboutQiblaGreatCircle || "Calcul géodésique du Grand Cercle"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.aboutQiblaDesc ||
                  "La position GPS de l'appareil est croisée avec les coordonnées exactes de la Kaaba (21.4225° N, 39.8262° E). La boussole magnétique compense la déclinaison locale et s'illumine en vert à ±3° d'alignement."}
              </p>
            </div>

            {/* Pillar 3: Quran & Tajweed */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 hover:border-emerald-500/40 transition-colors space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {t.aboutQuranTitle || "Saint Coran & Tajwid"}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {t.aboutQuranTajweedSubtitle || "Arabe, Phonétique & Audio"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.aboutQuranDesc ||
                  "Propose l'intégralité du Coran en texte usmani avec règles du Tajwid en couleur, traductions en 50 langues et récitations audio verset par verset par des récitateurs renommés."}
              </p>
            </div>

            {/* Pillar 4: Halal Scanner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 hover:border-sky-500/40 transition-colors space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
                  <QrCode className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {t.aboutHalalScannerTitle || "Scanner & Additifs Halal"}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {t.aboutOpenFoodFactsSubtitle || "Base Open Food Facts & OCR"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.aboutHalalDesc ||
                  "Scanner de code-barres en temps réel analysant les additifs E-numbers (gélatines, émulsifiants, colorants) pour indiquer si le produit est Halal, Douteux ou Haram."}
              </p>
            </div>

            {/* Pillar 5: Invocations & Citadelle */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 hover:border-purple-500/40 transition-colors space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                  <Moon className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Invocations (Hisn al-Muslim)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Douas authentiques & Audio
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Invocations pour le matin, le soir, le sommeil, la protection, les épreuves et la vie quotidienne avec phonétique claire, traduction et récitation vocale.
              </p>
            </div>

            {/* Pillar 6: Tasbih & Asma ul-Husna */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 hover:border-amber-500/40 transition-colors space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <Flame className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Tasbih & 99 Noms d'Allah
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Retour haptique & Méditation
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Compteur de Dhikr tactile avec vibration personnalisée, historique quotidien et contemplation détaillée des plus beaux Noms d'Allah (Asma ul-Husna).
              </p>
            </div>
          </div>
        </section>

        {/* PRIVACY & ETHICS COMMITMENT */}
        <section className="p-5 rounded-3xl bg-muted/30 border border-border/70 space-y-3">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>Engagements Éthiques & Protection de la Vie Privée</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground pt-1">
            <div className="flex items-start gap-2.5">
              <Lock className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <strong>Confidentialité totale :</strong> Votre position GPS est traitée localement sur votre appareil pour calculer les prières et la Qibla. Aucune donnée personnelle n'est vendue ni tracée.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <WifiOff className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <strong>Utilisation hors-ligne :</strong> Les horaires de prière, le texte du Coran, la boussole et les invocations fonctionnent même en l'absence de réseau Internet.
              </span>
            </div>
          </div>
        </section>

        {/* STATS & RECOGNITION */}
        <section className="p-6 rounded-3xl bg-gradient-to-r from-card via-muted/30 to-card border border-border/80 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
            <Heart className="size-3.5 fill-amber-500" />
            <span>{t.aboutDesignedForUmmah || "Conçu pour la Oumma avec Respect & Précision"}</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-2xl bg-card border border-border/60">
              <div className="text-xl font-extrabold text-amber-500 font-mono tabular-nums">100%</div>
              <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                {t.about100Free || "Accessible"}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-card border border-border/60">
              <div className="text-xl font-extrabold text-emerald-500 font-mono tabular-nums">50</div>
              <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                {t.aboutIntegratedLanguages || "Langues"}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-card border border-border/60">
              <div className="text-xl font-extrabold text-sky-500 font-mono tabular-nums">{VERSION}</div>
              <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                {t.aboutMajorVersion || "Version"}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground font-medium pt-1 max-w-md mx-auto">
            {t.developerTitle ||
              "Qu'Allah accepte nos prières, nos invocations et fasse de cette application une source de bienfaits au quotidien."}
          </p>

          <div className="pt-2 flex items-center justify-center">
            <Link
              to="/settings"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="size-4" />
              <span>{t.nav_settings || "Retour aux réglages"}</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

