import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  Database,
  Factory,
  FileText,
  Flag,
  Globe,
  HelpCircle,
  Info,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
  Utensils,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HalalProductThumbnail } from "@/components/HalalProductThumbnail";
import { appToast } from "@/lib/app-toast";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/app-settings";
import { openSubmitReportInExternalBrowser } from "@/lib/bug-tracker-client";
import { playClick } from "@/lib/sfx";
import { vibrate } from "@/lib/vibration";
import {
  VERDICT_LABELS,
  type ProductResult,
  type ProtocolAuditItem,
  type FiabiliteData,
} from "@/lib/halal";
import { evaluateProduct } from "@/lib/halal-engine";

export type HalalDetailTab =
  | "result"
  | "audit"
  | "ingredients"
  | "origin"
  | "nutrition";

interface HalalProductDetailModalProps {
  product: ProductResult;
  initialTab?: HalalDetailTab;
  isOpen: boolean;
  onClose: () => void;
}

export function getProtocolStatusMeta(status: string) {
  const norm = status?.toUpperCase() || "";
  if (norm === "PASSE" || norm === "PASSED") {
    return {
      status: "PASSE",
      label: "Vérifié",
      badgeClass:
        "text-emerald-800 dark:text-emerald-200 bg-emerald-500/15 border-emerald-500/35",
      barClass: "bg-emerald-500",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (norm === "A_CLARIFIER" || norm === "WARNING") {
    return {
      status: "A_CLARIFIER",
      label: "À clarifier",
      badgeClass:
        "text-amber-900 dark:text-amber-200 bg-amber-500/20 border-amber-500/40",
      barClass: "bg-amber-500",
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
    };
  }
  if (norm === "BLOQUANT" || norm === "FAILED") {
    return {
      status: "BLOQUANT",
      label: "Interdit / bloquant",
      badgeClass:
        "text-rose-900 dark:text-rose-200 bg-rose-500/20 border-rose-500/40",
      barClass: "bg-rose-500",
      icon: XCircle,
      color: "text-rose-600 dark:text-rose-400",
    };
  }
  if (norm === "NON_VERIFIE") {
    return {
      status: "NON_VERIFIE",
      label: "Non vérifié",
      badgeClass:
        "text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-700/80 border-slate-300 dark:border-slate-600",
      barClass: "bg-slate-400 dark:bg-slate-500",
      icon: HelpCircle,
      color: "text-slate-500 dark:text-slate-400",
    };
  }
  return {
    status: "AUCUNE_DONNEE",
    label: "Aucune donnée",
    badgeClass:
      "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
    barClass: "bg-slate-300 dark:bg-slate-700",
    icon: HelpCircle,
    color: "text-slate-400",
  };
}

export function getVerdictBadgeMeta(product: ProductResult) {
  const isHaram =
    product.verdictLabel === VERDICT_LABELS.HARAM || product.verdict === "haram";
  const isViande =
    product.verdictLabel === VERDICT_LABELS.VIANDE_A_VERIFIER ||
    product.subVerdict === "doubtful_meat";
  const isHalal =
    !isViande &&
    (product.verdictLabel === VERDICT_LABELS.HALAL || product.verdict === "halal");

  if (isHaram) {
    return {
      label: VERDICT_LABELS.HARAM,
      badgeClass: "bg-rose-600 text-white font-black shadow-xs",
      bgLightClass:
        "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60",
      icon: XCircle,
      iconColor: "text-rose-600 dark:text-rose-400",
    };
  }
  if (isViande) {
    return {
      label: VERDICT_LABELS.VIANDE_A_VERIFIER,
      badgeClass:
        "bg-amber-500/25 border-2 border-amber-500/60 text-amber-950 dark:text-amber-100 font-bold shadow-xs",
      bgLightClass:
        "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60",
      icon: AlertTriangle,
      iconColor: "text-amber-600 dark:text-amber-400",
    };
  }
  if (isHalal) {
    return {
      label: VERDICT_LABELS.HALAL,
      badgeClass: "bg-emerald-600 text-white font-bold shadow-xs",
      bgLightClass:
        "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60",
      icon: CheckCircle2,
      iconColor: "text-emerald-600 dark:text-emerald-400",
    };
  }
  return {
    label: VERDICT_LABELS.NON_CONFIRME,
    badgeClass:
      "bg-amber-600 text-white font-bold border border-amber-700/40 shadow-xs",
    bgLightClass:
      "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60",
    icon: AlertTriangle,
    iconColor: "text-amber-600 dark:text-amber-400",
  };
}

export function getFiabiliteMeta(fiabilite?: FiabiliteData, source?: string) {
  if (fiabilite === "LU_PAR_PHOTO" || source === "OCR") {
    return {
      label: "Lecture photo IA",
      icon: Camera,
      className:
        "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/35",
    };
  }
  if (fiabilite === "DONNEES_INCOMPLETES") {
    return {
      label: "Données incomplètes",
      icon: AlertCircle,
      className:
        "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40",
    };
  }
  return {
    label: source || "Open Food Facts",
    icon: Database,
    className:
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };
}

export function HalalProductDetailModal({
  product,
  initialTab = "result",
  isOpen,
  onClose,
}: HalalProductDetailModalProps) {
  const { t } = useI18n();
  const { settings, update } = useSettings();

  // Normalisation des 3 onglets
  const normalizedInitialTab = useMemo<"result" | "ingredients" | "origin">(() => {
    if (initialTab === "ingredients") return "ingredients";
    if (initialTab === "origin" || initialTab === "nutrition") return "origin";
    return "result";
  }, [initialTab]);

  const [activeTab, setActiveTab] = useState<"result" | "ingredients" | "origin">(
    normalizedInitialTab,
  );

  const [ingredientFilter, setIngredientFilter] = useState<
    "all" | "problematic" | "safe"
  >("all");

  // Accordéons repliables séparés
  const [rawIngredientsOpen, setRawIngredientsOpen] = useState(false);
  const [nutritionScoresOpen, setNutritionScoresOpen] = useState(false);

  // 10 protocoles garantis par le moteur canonique
  const auditProtocols: ProtocolAuditItem[] = useMemo(() => {
    if (product.audit && product.audit.length === 10) {
      return product.audit;
    }
    const evalRes = evaluateProduct({
      code: product.code,
      productName: product.name,
      brand: product.brand,
      ingredientsText: product.ingredients,
      categoriesTags: product.categories,
      labelsTags: product.labelsList,
    });
    return evalRes.audit;
  }, [product]);

  // Protocoles triés : BLOQUANT et A_CLARIFIER en tête
  const sortedProtocols = useMemo(() => {
    return [...auditProtocols].sort((a, b) => {
      const aPrio =
        a.statut === "BLOQUANT" ? 2 : a.statut === "A_CLARIFIER" ? 1 : 0;
      const bPrio =
        b.statut === "BLOQUANT" ? 2 : b.statut === "A_CLARIFIER" ? 1 : 0;
      if (aPrio !== bPrio) {
        return bPrio - aPrio;
      }
      return a.numero - b.numero;
    });
  }, [auditProtocols]);

  // Dépliés par défaut uniquement pour BLOQUANT et A_CLARIFIER
  const [expandedProtocols, setExpandedProtocols] = useState<
    Record<number, boolean>
  >(() => {
    const initial: Record<number, boolean> = {};
    for (const p of auditProtocols) {
      if (p.statut === "BLOQUANT" || p.statut === "A_CLARIFIER") {
        initial[p.numero] = true;
      }
    }
    return initial;
  });

  const toggleProtocol = (num: number) => {
    setExpandedProtocols((prev) => ({
      ...prev,
      [num]: !prev[num],
    }));
  };

  const allProtocolsExpanded = useMemo(() => {
    return auditProtocols.every((p) => expandedProtocols[p.numero]);
  }, [auditProtocols, expandedProtocols]);

  const toggleAllProtocols = () => {
    const nextState = !allProtocolsExpanded;
    const updated: Record<number, boolean> = {};
    for (const p of auditProtocols) {
      updated[p.numero] = nextState;
    }
    setExpandedProtocols(updated);
  };

  // Réinitialiser les sections repliables et protocoles prioritaires à chaque ouverture
  useEffect(() => {
    if (!isOpen) return;
    const initial: Record<number, boolean> = {};
    for (const p of auditProtocols) {
      if (p.statut === "BLOQUANT" || p.statut === "A_CLARIFIER") {
        initial[p.numero] = true;
      }
    }
    setExpandedProtocols(initial);
    setRawIngredientsOpen(false);
    setNutritionScoresOpen(false);
    setActiveTab(normalizedInitialTab);
  }, [isOpen, product.code, auditProtocols, normalizedInitialTab]);

  // Liste exhaustive des ingrédients analysés
  const analyzedIngredients = useMemo(() => {
    const raw = product.ingredients || "";
    const flagged = product.flaggedItems || [];
    const items = raw
      .split(/[,;\n•]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const result = items.map((item) => {
      const lower = item.toLowerCase();
      const matchFlagged = flagged.find((f) => {
        const fLow = f.ingredient.toLowerCase();
        return lower.includes(fLow) || fLow.includes(lower);
      });

      if (matchFlagged) {
        return {
          name: item,
          status:
            matchFlagged.statut === "HARAM"
              ? ("HARAM" as const)
              : ("douteux" as const),
          reason: matchFlagged.raison,
          rule: matchFlagged.regle,
          problematic: true,
        };
      }

      if (
        lower.startsWith("e") &&
        /\be[\s-]?\d{3,4}/i.test(lower) &&
        !lower.includes("e300") &&
        !lower.includes("e330")
      ) {
        return {
          name: item,
          status: "non référencé" as const,
          reason: "Code additif requérant vérification de source",
          rule: "P6-ADDITIF",
          problematic: false,
        };
      }

      return {
        name: item,
        status: "reconnu" as const,
        reason: "Ingrédient végétal / minéral conforme",
        rule: "P10-LISTE-BLANCHE",
        problematic: false,
      };
    });

    return result.sort((a, b) => {
      const aVal =
        a.status === "HARAM"
          ? 3
          : a.status === "douteux"
            ? 2
            : a.status === "non référencé"
              ? 1
              : 0;
      const bVal =
        b.status === "HARAM"
          ? 3
          : b.status === "douteux"
            ? 2
            : b.status === "non référencé"
              ? 1
              : 0;
      return bVal - aVal;
    });
  }, [product]);

  const isSaved = settings.savedProducts.some((s) => s.code === product.code);

  const toggleSave = () => {
    playClick();
    vibrate("button");
    if (isSaved) {
      update({
        savedProducts: settings.savedProducts.filter(
          (s) => s.code !== product.code,
        ),
      });
      appToast.success(t.removedFromFavorites || "Produit retiré des favoris", {
        category: "scanner",
      });
    } else {
      update({
        savedProducts: [
          ...settings.savedProducts,
          {
            code: product.code,
            name: product.name,
            brand: product.brand,
            verdict: product.verdict,
            image: product.image,
            ingredients: product.ingredients,
            reasons: product.reasons,
            certified: product.certified,
            nutriscore: product.nutriscore,
            novaGroup: product.novaGroup,
            ecoscore: product.ecoscore,
            allergens: product.allergens,
            traces: product.traces,
            quantity: product.quantity,
            testsPassed: product.testsPassed,
            totalTests: product.totalTests,
          },
        ],
      });
      appToast.success(t.addedToFavorites || "Produit ajouté aux favoris", {
        category: "scanner",
      });
    }
  };

  const handleClose = useCallback(() => {
    playClick();
    vibrate("button");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== "undefined") {
      document.body.classList.add("halal-report-fullscreen");
      document.body.style.overflow = "hidden";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("halal-report-fullscreen");
        document.body.style.overflow = "";
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleReport = () => {
    playClick();
    vibrate("button");
    openSubmitReportInExternalBrowser();
    appToast.info(
      t.errorReportingPortal || "Ouverture du portail de signalement...",
      { category: "scanner" },
    );
  };

  const verdictMeta = getVerdictBadgeMeta(product);
  const fiabiliteMeta = getFiabiliteMeta(product.fiabilite, product.source);
  const VerdictIcon = verdictMeta.icon;
  const FiabiliteIcon = fiabiliteMeta.icon;

  const isHaram =
    product.verdictLabel === VERDICT_LABELS.HARAM || product.verdict === "haram";
  const isViande =
    product.verdictLabel === VERDICT_LABELS.VIANDE_A_VERIFIER ||
    product.subVerdict === "doubtful_meat";
  const isHalal =
    !isViande &&
    (product.verdictLabel === VERDICT_LABELS.HALAL || product.verdict === "halal");

  // Distinguer formellement certification officielle vs mention déclarée packaging
  const hasOfficialCertification = Boolean(
    product.certified ||
      (product.certifierName && product.certifierName.trim().length > 0),
  );
  const hasHalalLabelMention = Boolean(
    hasOfficialCertification ||
      (product.reasons &&
        product.reasons.some((r) => r.toLowerCase().includes("label halal"))),
  );

  // Qualification précise du statut de conformité pour compréhension en 3s
  const certificationClarity = isHaram
    ? {
        label: "Prohibé / Non conforme",
        subtext: "Ingrédient ou additif formellement illicite détecté",
        colorClass: "text-rose-700 dark:text-rose-300",
      }
    : isViande
      ? {
          label: "Viande à vérifier",
          subtext: hasHalalLabelMention
            ? "Mention halal relevée · Contrôlez obligatoirement le logo officiel d'abattage rituel"
            : "Abattage rituel non vérifiable par scan · Contrôle impératif du logo officiel ou du boucher",
          colorClass: "text-amber-800 dark:text-amber-200",
        }
      : hasOfficialCertification
        ? {
            label: "Certification halal vérifiée",
            subtext: product.certifierName
              ? `Organisme certificateur reconnu : ${product.certifierName}`
              : "Certification halal officielle enregistrée",
            colorClass: "text-emerald-700 dark:text-emerald-300",
          }
        : hasHalalLabelMention
          ? {
              label: "Mention halal sur packaging",
              subtext:
                "Mention halal déclarée sur l'emballage (logo officiel à vérifier physiquement)",
              colorClass: "text-emerald-700 dark:text-emerald-300",
            }
          : isHalal
            ? {
                label: "Ingrédients apparemment conformes",
                subtext:
                  "Aucun ingrédient suspect détecté (sans certification rituelle d'abattage)",
                colorClass: "text-emerald-700 dark:text-emerald-300",
              }
            : {
                label: "Statut halal non confirmé",
                subtext:
                  "Informations incomplètes ou additifs nécessitant une vérification de source",
                colorClass: "text-amber-800 dark:text-amber-200",
              };

  const countries = product.countriesTags || [];
  const multipleCountries = countries.length > 1;
  const verifiedCount = auditProtocols.filter((p) => p.statut === "PASSE").length;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="halal-detail-title"
      className="fixed inset-0 z-[9999] w-screen h-screen m-0 p-0 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden flex flex-col select-none overscroll-contain"
      style={{ width: "100vw", height: "100dvh" }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full max-w-4xl mx-auto bg-[#FAF9F5] dark:bg-[#0B1320] flex flex-col overflow-hidden shadow-2xl select-text sm:border-x sm:border-[#EAE7DC] sm:dark:border-[#1E293B]"
      >
        {/* ========================================================= */}
        {/* EN-TÊTE ÉPURÉ AVEC VERDICT PRINCIPAL (Compréhension 3s)  */}
        {/* ========================================================= */}
        <header className="p-4 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] bg-[#FDFCF7] dark:bg-[#111C2E] border-b border-[#EAE7DC] dark:border-[#1E293B] shrink-0">
          {/* Barre supérieure : Retour intuitif + Titre + Fermer */}
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-bold transition cursor-pointer min-h-[44px] touch-manipulation active:scale-95 border border-slate-200/80 dark:border-slate-700"
              aria-label="Retour au scanner"
            >
              <ArrowLeft className="size-4" />
              <span>Retour</span>
            </button>

            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate px-1">
              Rapport d&apos;analyse halal
            </span>

            <button
              type="button"
              onClick={handleClose}
              className="size-11 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-muted-foreground hover:text-foreground flex items-center justify-center transition shrink-0 cursor-pointer touch-manipulation active:scale-95 border border-slate-200/80 dark:border-slate-700"
              aria-label={t.closeModal || "Fermer"}
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Carte héroïque : Image du produit + Verdict principal réel + Clarté de statut */}
          <div className="flex items-start gap-3.5 sm:gap-4">
            <HalalProductThumbnail
              product={product}
              size="lg"
              className="!size-18 sm:!size-20 rounded-2xl border-[#EAE7DC] dark:border-[#1E293B] shadow-xs"
            />

            <div className="min-w-0 flex-1 space-y-1">
              {/* Badge Verdict univoque issu du moteur réel */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide ${verdictMeta.badgeClass}`}
                >
                  <VerdictIcon className="size-4 shrink-0" />
                  <span>{verdictMeta.label}</span>
                </span>

                {/* Qualification claire de la conformité */}
                <span
                  className={`text-[11.5px] font-bold ${certificationClarity.colorClass}`}
                >
                  · {certificationClarity.label}
                </span>
              </div>

              {/* Nom du produit (lisible, non tronqué) */}
              <h3
                id="halal-detail-title"
                className="text-base sm:text-lg font-bold text-foreground leading-snug line-clamp-2 pt-0.5"
              >
                {product.name}
              </h3>

              {/* Métadonnées épurées sans pill clignotant (Zero-Pill rule) */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium flex-wrap">
                <span>
                  {product.brand || (t.unknownBrand || "Marque non précisée")}
                </span>
                {product.quantity && (
                  <>
                    <span aria-hidden="true" className="opacity-40">·</span>
                    <span>{product.quantity}</span>
                  </>
                )}
                {product.code && (
                  <>
                    <span aria-hidden="true" className="opacity-40">·</span>
                    <span className="font-mono text-[11px] opacity-75">
                      {product.code}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Navigation par 3 Onglets Segmentés : Résultat | Ingrédients | Origine et preuves */}
          <nav
            role="tablist"
            aria-label="Sections du rapport"
            className="flex items-center gap-1 mt-4 p-1 bg-slate-200/60 dark:bg-slate-900/90 rounded-2xl border border-slate-200/50 dark:border-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "result"}
              onClick={() => {
                playClick();
                setActiveTab("result");
              }}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] touch-manipulation active:scale-[0.98] ${
                activeTab === "result"
                  ? "bg-white dark:bg-[#1E293B] text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Résultat</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "ingredients"}
              onClick={() => {
                playClick();
                setActiveTab("ingredients");
              }}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] touch-manipulation active:scale-[0.98] ${
                activeTab === "ingredients"
                  ? "bg-white dark:bg-[#1E293B] text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Utensils className="size-4 text-sky-600 dark:text-sky-400" />
              <span>Ingrédients</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "origin"}
              onClick={() => {
                playClick();
                setActiveTab("origin");
              }}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] touch-manipulation active:scale-[0.98] ${
                activeTab === "origin"
                  ? "bg-white dark:bg-[#1E293B] text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="size-4 text-amber-600 dark:text-amber-400" />
              <span>Origine & preuves</span>
            </button>
          </nav>
        </header>

        {/* ========================================================= */}
        {/* CORPS SCROLLABLE : 3 ONG NIVEAUX DE DÉTAIL FLUIDES       */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 pb-8">
          {/* ========================================================= */}
          {/* ONGLET 1 : RÉSULTAT                                       */}
          {/* ========================================================= */}
          {activeTab === "result" && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* 1. Synthèse immédiate & Explication courte */}
              <section className="rounded-2xl p-4 sm:p-5 bg-[#FDFCF7] dark:bg-[#111C2E] border border-[#EAE7DC] dark:border-[#1E293B] shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Info className="size-4 text-sky-500" />
                    Synthèse de l&apos;analyse
                  </h4>

                  {/* Badge de source / fiabilité */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold ${fiabiliteMeta.className}`}
                  >
                    <FiabiliteIcon className="size-3" />
                    <span>{fiabiliteMeta.label}</span>
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-medium text-foreground/90 leading-relaxed">
                  {certificationClarity.subtext}
                </p>

                {/* Raisons nominatives détaillées du moteur */}
                {product.reasons && product.reasons.length > 0 ? (
                  <ul className="space-y-1.5 pt-1 border-t border-[#EAE7DC]/60 dark:border-[#1E293B]/60">
                    {product.reasons.map((reason, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs font-medium text-foreground/90 leading-relaxed"
                      >
                        <span className="text-amber-500 font-bold shrink-0 mt-0.5">
                          •
                        </span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  product.synthesisSummary && (
                    <p className="text-xs text-muted-foreground italic pt-1 border-t border-[#EAE7DC]/60 dark:border-[#1E293B]/60">
                      {product.synthesisSummary}
                    </p>
                  )
                )}
              </section>

              {/* 2. Encart « Points à vérifier » (Demandé expressément) */}
              <section
                className={`rounded-2xl p-4 sm:p-5 border transition-colors space-y-2.5 ${
                  isHaram
                    ? "bg-rose-50/70 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/50"
                    : isViande
                      ? "bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/50"
                      : isHalal
                        ? "bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900/50"
                        : "bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isHaram ? (
                    <XCircle className="size-4.5 text-rose-600 dark:text-rose-400 shrink-0" />
                  ) : isViande || !isHalal ? (
                    <AlertTriangle className="size-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <Sparkles className="size-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Points à vérifier
                  </h4>
                </div>

                <div className="text-xs sm:text-[13px] leading-relaxed font-medium text-foreground/90 space-y-1.5">
                  {isHaram ? (
                    <p>
                      Ce produit contient des ingrédients ou additifs prohibés
                      selon les règles canoniques islamiques. Sa consommation est
                      déconseillée.
                    </p>
                  ) : isViande ? (
                    <>
                      <p>
                        L&apos;abattage rituel de la viande ne peut pas être
                        garanti par un simple scan de code-barres.
                      </p>
                      <p className="font-semibold text-amber-950 dark:text-amber-100">
                        {hasHalalLabelMention
                          ? "→ Une mention halal est indiquée : vérifiez la présence du logo officiel du certificateur (ex. AVS, Halal Correct) sur l'emballage."
                          : "→ Contrôlez l'emballage physique ou renseignez-vous auprès du boucher/vendeur sur l'organisme certificateur."}
                      </p>
                    </>
                  ) : !isHalal ? (
                    <p>
                      La recette comporte des éléments nécessitant une
                      vigilance (arômes, additifs ou informations incomplètes).
                      Consultez la liste des ingrédients pour connaître les
                      doutes signalés.
                    </p>
                  ) : (
                    <p className="text-emerald-900 dark:text-emerald-100">
                      Aucun ingrédient suspect ni additif prohibé n&apos;a été
                      relevé dans la composition analysée. Vérifiez toujours
                      l&apos;emballage en magasin en cas de changement de recette
                      par le fabricant.
                    </p>
                  )}
                </div>
              </section>

              {/* 3. Section repliable : Les 10 protocoles d'audit canoniques */}
              <section className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground">
                      Audit canonique (10 protocoles)
                    </h4>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {verifiedCount}/10 protocoles validés
                    </p>
                  </div>

                  {/* Bouton pour tout déplier ou tout replier */}
                  <button
                    type="button"
                    onClick={toggleAllProtocols}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition touch-manipulation"
                  >
                    {allProtocolsExpanded ? "Tout replier" : "Tout déplier"}
                  </button>
                </div>

                {/* Liste des 10 protocoles sous forme de blocs ouvrables/refermables individuellement */}
                <div className="space-y-2.5">
                  {sortedProtocols.map((protocol) => {
                    const isExpanded = !!expandedProtocols[protocol.numero];
                    const statusMeta = getProtocolStatusMeta(protocol.statut);
                    const StatusIcon = statusMeta.icon;

                    return (
                      <div
                        key={protocol.numero}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          protocol.statut === "BLOQUANT"
                            ? "bg-rose-50/60 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/50"
                            : protocol.statut === "A_CLARIFIER"
                              ? "bg-amber-50/60 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/50"
                              : "bg-[#FDFCF7] dark:bg-[#111C2E] border-[#EAE7DC] dark:border-[#1E293B]"
                        }`}
                      >
                        {/* Ligne d'en-tête cliquable (min 44px) */}
                        <button
                          type="button"
                          onClick={() => toggleProtocol(protocol.numero)}
                          className="w-full text-left p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer min-h-[44px] touch-manipulation"
                          aria-expanded={isExpanded}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="font-mono text-[11px] font-black text-muted-foreground shrink-0 size-6 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 flex items-center justify-center">
                              {protocol.numero}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2">
                              {protocol.titre}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Puce statut */}
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${statusMeta.badgeClass}`}
                            >
                              <StatusIcon className="size-3 shrink-0" />
                              <span>{statusMeta.label}</span>
                            </span>

                            <ChevronDown
                              className={`size-4 text-muted-foreground transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </button>

                        {/* Bloc détaillé déplié : Méthode -> Ce qui a été vérifié -> Preuves -> Impact */}
                        {isExpanded && (
                          <div className="px-3.5 pb-4 pt-2.5 border-t border-[#EAE7DC]/60 dark:border-[#1E293B]/60 text-xs space-y-3 bg-white/60 dark:bg-slate-900/40">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                                Méthode appliquée
                              </span>
                              <p className="text-foreground/90 font-medium leading-relaxed">
                                {protocol.methode}
                              </p>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                                Ce qui a été vérifié
                              </span>
                              <p className="text-foreground/90 font-medium leading-relaxed">
                                {protocol.verifie
                                  ? "Vérification systématique effectuée selon les règles canoniques."
                                  : "Donnée absente ou impossible à vérifier formellement par un scan."}
                              </p>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                Preuves matérielles
                              </span>
                              {protocol.preuves && protocol.preuves.length > 0 ? (
                                <ul className="space-y-1">
                                  {protocol.preuves.map((preuve, pIdx) => (
                                    <li
                                      key={pIdx}
                                      className="flex items-start gap-1.5 text-muted-foreground font-mono text-[11px] leading-relaxed"
                                    >
                                      <span className="text-emerald-500 font-bold shrink-0 mt-0.5">
                                        •
                                      </span>
                                      <span>{preuve}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[11px] text-muted-foreground italic">
                                  Aucune preuve matérielle enregistrée pour ce
                                  protocole.
                                </p>
                              )}
                            </div>

                            <div className="pt-1.5 border-t border-[#EAE7DC]/50 dark:border-[#1E293B]/50">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                                Impact sur le verdict final
                              </span>
                              <p className="text-foreground font-semibold leading-relaxed">
                                {protocol.impact}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* ========================================================= */}
          {/* ONGLET 2 : INGRÉDIENTS                                    */}
          {/* ========================================================= */}
          {activeTab === "ingredients" && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Filtres interactifs rapides */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIngredientFilter("all");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px] touch-manipulation ${
                    ingredientFilter === "all"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                      : "bg-[#FDFCF7] dark:bg-[#111C2E] border border-[#EAE7DC] dark:border-[#1E293B] text-muted-foreground"
                  }`}
                >
                  Tous ({analyzedIngredients.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIngredientFilter("problematic");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px] touch-manipulation ${
                    ingredientFilter === "problematic"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40"
                  }`}
                >
                  À clarifier / Prohibés (
                  {analyzedIngredients.filter((i) => i.problematic).length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIngredientFilter("safe");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px] touch-manipulation ${
                    ingredientFilter === "safe"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40"
                  }`}
                >
                  Reconnus sûrs (
                  {analyzedIngredients.filter((i) => !i.problematic).length})
                </button>
              </div>

              {/* Tableau structuré d'ingrédients */}
              <div className="rounded-2xl border border-[#EAE7DC] dark:border-[#1E293B] overflow-hidden bg-[#FDFCF7] dark:bg-[#111C2E] shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-[#EAE7DC] dark:border-[#1E293B] text-muted-foreground font-bold">
                        <th className="p-3">Ingrédient / Code E</th>
                        <th className="p-3">Statut</th>
                        <th className="p-3">Raison & Règle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE7DC]/60 dark:divide-[#1E293B]/60">
                      {analyzedIngredients.filter((item) => {
                        if (ingredientFilter === "problematic")
                          return item.problematic;
                        if (ingredientFilter === "safe") return !item.problematic;
                        return true;
                      }).length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="p-5 text-center text-muted-foreground italic text-xs"
                          >
                            {ingredientFilter === "problematic"
                              ? "Aucun ingrédient problématique identifié dans la composition."
                              : ingredientFilter === "safe"
                                ? "Aucun ingrédient sûr dans cette sélection."
                                : "Aucun ingrédient détaillé extrait. Consultez le texte brut ci-dessous."}
                          </td>
                        </tr>
                      ) : (
                        analyzedIngredients
                          .filter((item) => {
                            if (ingredientFilter === "problematic")
                              return item.problematic;
                            if (ingredientFilter === "safe") return !item.problematic;
                            return true;
                          })
                          .map((item, idx) => (
                            <tr
                              key={idx}
                              className={`transition ${
                                item.status === "HARAM"
                                  ? "bg-rose-500/10 dark:bg-rose-950/20"
                                  : item.status === "douteux"
                                    ? "bg-amber-500/10 dark:bg-amber-950/20"
                                    : "hover:bg-black/2 dark:hover:bg-white/2"
                              }`}
                            >
                              <td className="p-3 font-semibold text-foreground">
                                {item.name}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                                    item.status === "HARAM"
                                      ? "bg-rose-600 text-white"
                                      : item.status === "douteux"
                                        ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30"
                                        : item.status === "non référencé"
                                          ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                          : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30"
                                  }`}
                                >
                                  {item.status === "HARAM" && (
                                    <XCircle className="size-3" />
                                  )}
                                  {item.status === "douteux" && (
                                    <AlertTriangle className="size-3" />
                                  )}
                                  {item.status === "reconnu" && (
                                    <CheckCircle2 className="size-3" />
                                  )}
                                  <span>{item.status}</span>
                                </span>
                              </td>
                              <td className="p-3 text-muted-foreground text-[11px] leading-relaxed">
                                {item.reason}
                                {item.rule && (
                                  <span className="ml-1 opacity-75 font-mono text-[10px]">
                                    [{item.rule}]
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section dédiée Allergènes & Traces déclarées (Strictement séparée du halal) */}
              {((product.allergens && product.allergens.length > 0) ||
                (product.traces && product.traces.length > 0)) && (
                <section className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/50 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="font-bold text-amber-950 dark:text-amber-100">
                      Allergènes et traces éventuelles
                    </h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    Information de santé et sécurité alimentaire pour personnes
                    sensibles (indépendante de la conformité religieuse).
                  </p>

                  <div className="space-y-1.5 pt-1 text-foreground/90">
                    {product.allergens && product.allergens.length > 0 && (
                      <p>
                        <strong className="text-foreground">
                          Allergènes déclarés :{" "}
                        </strong>
                        <span className="text-muted-foreground">
                          {product.allergens.join(", ")}
                        </span>
                      </p>
                    )}
                    {product.traces && product.traces.length > 0 && (
                      <p>
                        <strong className="text-foreground">
                          Traces signalées :{" "}
                        </strong>
                        <span className="text-muted-foreground">
                          {product.traces.join(", ")}
                        </span>
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Section repliable : Texte brut original de l'emballage */}
              <section className="rounded-2xl border border-[#EAE7DC] dark:border-[#1E293B] overflow-hidden bg-[#FDFCF7] dark:bg-[#111C2E]">
                <button
                  type="button"
                  onClick={() => setRawIngredientsOpen((prev) => !prev)}
                  className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer min-h-[44px] touch-manipulation"
                  aria-expanded={rawIngredientsOpen}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-sky-500" />
                    <span className="text-xs sm:text-sm font-bold text-foreground">
                      Texte brut original (emballage)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {rawIngredientsOpen ? "Masquer" : "Consulter"}
                    </span>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform duration-200 ${
                        rawIngredientsOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {rawIngredientsOpen && (
                  <div className="p-4 pt-1 border-t border-[#EAE7DC]/60 dark:border-[#1E293B]/60 text-xs">
                    <p className="font-mono text-[11.5px] leading-relaxed bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-foreground/90 select-all">
                      {product.ingredients ||
                        "Aucun texte d'ingrédients renseigné sur cette référence."}
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ========================================================= */}
          {/* ONGLET 3 : ORIGINE ET PREUVES                             */}
          {/* ========================================================= */}
          {activeTab === "origin" && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* 1. Origine géographique & Lieux de fabrication */}
              <section className="p-4 sm:p-5 rounded-2xl bg-[#FDFCF7] dark:bg-[#111C2E] border border-[#EAE7DC] dark:border-[#1E293B] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-emerald-500" />
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Origine et fabrication
                  </h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-foreground">
                        Pays déclarés :{" "}
                      </span>
                      <span className="text-muted-foreground">
                        {countries.length > 0
                          ? countries
                              .map((c) => c.replace(/^[a-z]{2}:/, ""))
                              .join(", ")
                          : "Non spécifié"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Factory className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-foreground">
                        Lieux de fabrication :{" "}
                      </span>
                      <span className="text-muted-foreground">
                        {product.manufacturingPlaces ||
                          "Non renseigné sur l'emballage"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-foreground">
                        Origine des ingrédients :{" "}
                      </span>
                      <span className="text-muted-foreground">
                        {product.origins || "Non renseignée sur l'emballage"}
                      </span>
                    </div>
                  </div>

                  {multipleCountries && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 font-semibold mt-2">
                      ⚠️ La recette de ce produit peut varier selon le pays de
                      distribution.
                    </div>
                  )}
                </div>
              </section>

              {/* 2. Source des données & Horodatage */}
              <section className="p-4 sm:p-5 rounded-2xl bg-[#FDFCF7] dark:bg-[#111C2E] border border-[#EAE7DC] dark:border-[#1E293B] shadow-xs space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-sky-500" />
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Données sources et horodatage
                  </h4>
                </div>
                <div className="space-y-1 text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground font-semibold">
                      Base interrogée :{" "}
                    </strong>
                    {product.source || "Open Food Facts"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span>
                      <strong className="text-foreground font-semibold">
                        Date de la requête :{" "}
                      </strong>
                      {product.fetchDate ||
                        new Date().toLocaleDateString("fr-FR")}
                    </span>
                  </p>
                </div>
              </section>

              {/* 3. Section repliable : Scores nutritionnels & environnementaux */}
              <section className="rounded-2xl border border-[#EAE7DC] dark:border-[#1E293B] overflow-hidden bg-[#FDFCF7] dark:bg-[#111C2E]">
                <button
                  type="button"
                  onClick={() => setNutritionScoresOpen((prev) => !prev)}
                  className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer min-h-[44px] touch-manipulation"
                  aria-expanded={nutritionScoresOpen}
                >
                  <div className="flex items-center gap-2">
                    <Leaf className="size-4 text-emerald-500" />
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-foreground block">
                        Scores nutritionnels & environnementaux
                      </span>
                      <span className="text-[10.5px] text-muted-foreground">
                        Indépendants de la conformité halal
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {nutritionScoresOpen ? "Masquer" : "Consulter"}
                    </span>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform duration-200 ${
                        nutritionScoresOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {nutritionScoresOpen && (
                  <div className="p-4 pt-1 border-t border-[#EAE7DC]/60 dark:border-[#1E293B]/60 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      {/* Nutri-score */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                          Nutri-Score
                        </span>
                        <span className="text-sm font-black text-foreground">
                          {product.nutriscore
                            ? `Grade ${product.nutriscore.toUpperCase()}`
                            : "Non renseigné"}
                        </span>
                      </div>

                      {/* NOVA */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                          Groupe NOVA
                        </span>
                        <span className="text-sm font-black text-foreground">
                          {product.novaGroup
                            ? `Groupe ${product.novaGroup}`
                            : "Non renseigné"}
                        </span>
                      </div>

                      {/* Eco-Score */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                          Eco-Score
                        </span>
                        <span className="text-sm font-black text-foreground">
                          {product.ecoscore
                            ? `Grade ${product.ecoscore.toUpperCase()}`
                            : "Non renseigné"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* PIED DE FICHE : AVERTISSEMENT + ACTIONS (Favoris/Signal)  */}
        {/* ========================================================= */}
        <footer className="p-4 bg-[#FDFCF7] dark:bg-[#111C2E] border-t border-[#EAE7DC] dark:border-[#1E293B] space-y-2.5 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-[11px] text-muted-foreground text-center font-medium leading-relaxed">
            Outil d&apos;aide à la décision. En cas de doute, consulte un savant
            ou le certificateur officiel.
          </p>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant={isSaved ? "outline" : "default"}
              size="sm"
              onClick={toggleSave}
              className={`gap-2 font-bold text-xs min-h-[44px] cursor-pointer touch-manipulation px-4 ${
                !isSaved
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                  : "border-[#EAE7DC] dark:border-[#1E293B]"
              }`}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t.saved || "Enregistré"}</span>
                </>
              ) : (
                <>
                  <Bookmark className="size-4" />
                  <span>{t.save || "Sauvegarder"}</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReport}
              className="gap-1.5 font-bold text-xs text-rose-700 dark:text-rose-300 border-rose-300/80 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer min-h-[44px] touch-manipulation px-3.5"
            >
              <Flag className="size-3.5 text-rose-500" />
              <span>Signaler une erreur</span>
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}
