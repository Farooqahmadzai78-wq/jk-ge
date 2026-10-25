import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronRight,
  Package,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { appToast } from "@/lib/app-toast";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/app-settings";
import { playClick } from "@/lib/sfx";
import { vibrate } from "@/lib/vibration";
import {
  VERDICT_LABELS,
  type ProductResult,
  type ProtocolAuditItem,
} from "@/lib/halal";
import {
  HalalProductDetailModal,
  getVerdictBadgeMeta,
  type HalalDetailTab,
} from "@/components/HalalProductDetailModal";
import { HalalProductThumbnail } from "@/components/HalalProductThumbnail";
import { evaluateProduct } from "@/lib/halal-engine";

interface HalalProductCardProps {
  product: ProductResult;
  onOpenDetails?: () => void;
}

/**
 * Carte compacte et moderne pour l'affichage haute densité des résultats de recherche.
 * Affiche l'essentiel en 80-95px de haut (image, verdict réel, qualification, alerte concise),
 * et ouvre le rapport complet d'un simple tap.
 */
export function HalalProductCard({
  product,
  onOpenDetails,
}: HalalProductCardProps) {
  const { t } = useI18n();
  const { settings, update } = useSettings();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<HalalDetailTab>("result");

  const isSaved = settings.savedProducts.some((s) => s.code === product.code);

  const toggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleCardClick = () => {
    playClick();
    vibrate("button");
    if (onOpenDetails) {
      onOpenDetails();
    } else {
      setModalTab("result");
      setModalOpen(true);
    }
  };

  // 10 protocoles du moteur canonique garantis
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

  const countPassed = auditProtocols.filter((p) => p.statut === "PASSE").length;

  const verdictMeta = getVerdictBadgeMeta(product);
  const VerdictIcon = verdictMeta.icon;

  const isHaram =
    product.verdictLabel === VERDICT_LABELS.HARAM || product.verdict === "haram";
  const isViande =
    product.verdictLabel === VERDICT_LABELS.VIANDE_A_VERIFIER ||
    product.subVerdict === "doubtful_meat";
  const isHalal =
    !isViande &&
    (product.verdictLabel === VERDICT_LABELS.HALAL || product.verdict === "halal");

  const hasOfficialCertification = Boolean(
    product.certified ||
      (product.certifierName && product.certifierName.trim().length > 0),
  );
  const hasHalalLabelMention = Boolean(
    hasOfficialCertification ||
      (product.reasons &&
        product.reasons.some((r) => r.toLowerCase().includes("label halal"))),
  );

  // Qualification concise et rigoureuse du statut
  const qualification = isHaram
    ? {
        label: "Prohibé",
        colorClass: "text-rose-700 dark:text-rose-300",
      }
    : isViande
      ? {
          label: hasHalalLabelMention ? "Viande (label mentionné)" : "Viande à vérifier",
          colorClass: "text-amber-800 dark:text-amber-200",
        }
      : hasOfficialCertification
        ? {
            label: product.certifierName
              ? `Certifié (${product.certifierName.split("(")[0].trim()})`
              : "Certifié halal",
            colorClass: "text-emerald-700 dark:text-emerald-300",
          }
        : hasHalalLabelMention
          ? {
              label: "Mention packaging",
              colorClass: "text-emerald-700 dark:text-emerald-300",
            }
          : isHalal
            ? {
                label: "Ingrédients conformes",
                colorClass: "text-emerald-700 dark:text-emerald-300",
              }
            : {
                label: "Non confirmé",
                colorClass: "text-amber-800 dark:text-amber-200",
              };

  // Alerte concise ou point d'attention clé
  const primaryAlert = useMemo(() => {
    if (isHaram) {
      const firstHaram = product.flaggedItems?.find(
        (f) => f.statut === "HARAM",
      );
      if (firstHaram) {
        return {
          text: `${firstHaram.ingredient} (${firstHaram.raison})`,
          isHaram: true,
        };
      }
      return {
        text: product.reasons?.[0] || "Ingrédient prohibé identifié",
        isHaram: true,
      };
    }

    if (isViande) {
      return {
        text: "Abattage rituel à vérifier sur le paquet",
        isWarning: true,
      };
    }

    if (product.flaggedItems && product.flaggedItems.length > 0) {
      const f = product.flaggedItems[0];
      return {
        text: `${f.ingredient} : ${f.raison}`,
        isWarning: true,
      };
    }

    if (!isHalal && product.reasons && product.reasons.length > 0) {
      return {
        text: product.reasons[0],
        isWarning: true,
      };
    }

    return null;
  }, [product, isHaram, isViande, isHalal]);

  return (
    <>
      <article
        onClick={handleCardClick}
        className="group relative flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#FDFCF7] dark:bg-[#111C2E] border border-[#EAE7DC] dark:border-[#1E293B] shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-[0.99] touch-manipulation select-none overflow-hidden"
      >
        {/* Miniature produit nette & vérifiée */}
        <HalalProductThumbnail product={product} size="md" />


        {/* Corps d'informations compact et ordonné */}
        <div className="min-w-0 flex-1 space-y-1">
          {/* Ligne 1 : Verdict réel + Qualification concise */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-black uppercase tracking-wide shrink-0 ${verdictMeta.badgeClass}`}
            >
              <VerdictIcon className="size-3 shrink-0" />
              <span>{verdictMeta.label}</span>
            </span>

            <span
              className={`text-[11px] font-bold truncate ${qualification.colorClass}`}
            >
              · {qualification.label}
            </span>
          </div>

          {/* Ligne 2 : Nom du produit (2 lignes max) */}
          <h3 className="text-xs sm:text-[13px] font-bold text-foreground leading-snug line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {product.name}
          </h3>

          {/* Ligne 3 : Marque · Quantité · Code-barres */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium truncate">
            <span className="truncate">
              {product.brand || (t.unknownBrand || "Marque non précisée")}
            </span>
            {product.quantity && (
              <>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="shrink-0">{product.quantity}</span>
              </>
            )}
            {product.code && (
              <>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="font-mono text-[10px] opacity-75 shrink-0">
                  {product.code}
                </span>
              </>
            )}
          </div>

          {/* Ligne 4 : Point à vérifier ou confirmation d'audit */}
          <div className="pt-0.5 flex items-center gap-1.5 text-[11px] font-medium truncate">
            {primaryAlert ? (
              <div
                className={`flex items-center gap-1 truncate ${
                  primaryAlert.isHaram
                    ? "text-rose-700 dark:text-rose-300 font-semibold"
                    : "text-amber-700 dark:text-amber-300"
                }`}
              >
                {primaryAlert.isHaram ? (
                  <XCircle className="size-3 shrink-0" />
                ) : (
                  <AlertTriangle className="size-3 shrink-0" />
                )}
                <span className="truncate">{primaryAlert.text}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium truncate">
                <CheckCircle2 className="size-3 shrink-0" />
                <span className="truncate">
                  {countPassed}/10 protocoles validés
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Boutons d'action rapides à droite (Favoris + Chevron) */}
        <div className="flex flex-col items-center justify-between self-stretch shrink-0 py-0.5">
          <button
            type="button"
            onClick={toggleSave}
            className="size-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer min-h-[36px] min-w-[36px] touch-manipulation active:scale-90"
            title={isSaved ? "Retirer des favoris" : "Ajouter aux favoris"}
            aria-label={isSaved ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {isSaved ? (
              <BookmarkCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Bookmark className="size-4 opacity-60 hover:opacity-100" />
            )}
          </button>

          <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </div>
      </article>

      {/* Rapport d'analyse complet déclenché au clic */}
      <HalalProductDetailModal
        product={product}
        initialTab={modalTab}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
