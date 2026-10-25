import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  X,
  Loader2,
  PackageSearch,
  Camera,
  Barcode,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { type ProductResult, VERDICT_LABELS } from "@/lib/halal";
import { HalalProductCard } from "@/components/HalalProductCard";
import { HalalInstantSuggestions } from "@/components/HalalInstantSuggestions";
import { saveRecentSearch } from "@/lib/halal-search-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { playClick } from "@/lib/sfx";

interface HalalSearchResultsViewProps {
  initialQuery: string;
  results: ProductResult[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  isLoading: boolean;
  isLoadingMore?: boolean;
  isError?: boolean;
  sourceError?: boolean;
  onBack: () => void;
  onSearch: (searchTerm: string) => void;
  onLoadMore?: () => void;
  onOpenScanner?: () => void;
  onOpenIngredientCamera?: () => void;
  onOpenManualCode?: () => void;
  onSelectProduct?: (product: ProductResult) => void;
}

type FilterOption = "all" | "halal" | "doubtful" | "haram";

export function HalalSearchResultsView({
  initialQuery,
  results,
  total,
  page = 1,
  pageSize = 24,
  hasMore = false,
  isLoading,
  isLoadingMore = false,
  isError = false,
  sourceError = false,
  onBack,
  onSearch,
  onLoadMore,
  onOpenScanner,
  onOpenIngredientCamera,
  onOpenManualCode,
  onSelectProduct,
}: HalalSearchResultsViewProps) {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");

  const handleSubmit = (termToSearch?: string) => {
    const raw = termToSearch !== undefined ? termToSearch : searchTerm;
    const q = (raw || initialQuery || "").trim();
    if (!q) return;
    playClick();
    setIsSuggestionsOpen(false);
    saveRecentSearch(q);
    onSearch(q);
  };

  const handleClear = () => {
    setSearchTerm("");
  };

  // Filter products by verdict category if requested
  const filteredResults = useMemo(() => {
    if (activeFilter === "all") return results;

    return results.filter((p) => {
      const isHaram =
        p.verdictLabel === VERDICT_LABELS.HARAM || p.verdict === "haram";
      const isViande =
        p.verdictLabel === VERDICT_LABELS.VIANDE_A_VERIFIER ||
        p.subVerdict === "doubtful_meat";
      const isHalal =
        !isViande &&
        (p.verdictLabel === VERDICT_LABELS.HALAL || p.verdict === "halal");

      if (activeFilter === "halal") return isHalal;
      if (activeFilter === "haram") return isHaram;
      if (activeFilter === "doubtful") return isViande || (!isHalal && !isHaram);
      return true;
    });
  }, [results, activeFilter]);

  // Counts for filter pills
  const counts = useMemo(() => {
    let halal = 0;
    let haram = 0;
    let doubtful = 0;

    for (const p of results) {
      const isHaram =
        p.verdictLabel === VERDICT_LABELS.HARAM || p.verdict === "haram";
      const isViande =
        p.verdictLabel === VERDICT_LABELS.VIANDE_A_VERIFIER ||
        p.subVerdict === "doubtful_meat";
      const isHalal =
        !isViande &&
        (p.verdictLabel === VERDICT_LABELS.HALAL || p.verdict === "halal");

      if (isHalal) halal++;
      else if (isHaram) haram++;
      else doubtful++;
    }

    return { all: results.length, halal, haram, doubtful };
  }, [results]);

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* 1. Header fixe & Barre de recherche dédiée avec retour */}
      <div className="sticky top-0 z-40 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 bg-stone-50/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-stone-200/80 dark:border-slate-800/80 -mx-4 px-4 transition-all">
        <div className="flex items-center gap-2">
          {/* Bouton Retour élégant */}
          <button
            type="button"
            onClick={() => {
              playClick();
              onBack();
            }}
            aria-label="Retour au scanner"
            className="grid size-10 place-items-center rounded-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs hover:bg-stone-100 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer shrink-0"
          >
            <ArrowLeft className="size-5" />
          </button>

          {/* Champ de recherche avec suggestions flottantes */}
          <div className="relative flex-1" data-search-wrapper="true">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500/50 transition">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <Input
                value={searchTerm}
                maxLength={60}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSuggestionsOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSubmit();
                  } else if (e.key === "Escape") {
                    setIsSuggestionsOpen(false);
                  }
                }}
                placeholder={t.searchPlaceholder || "Rechercher un produit ou aliment..."}
                className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground"
              />

              {searchTerm.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="grid size-6 place-items-center rounded-full text-muted-foreground hover:text-slate-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 transition shrink-0"
                >
                  <X className="size-3.5" />
                </button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSubmit()}
                disabled={isLoading}
                className="size-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
              </Button>
            </div>

            {/* Menu de suggestions instantanées */}
            <HalalInstantSuggestions
              query={searchTerm}
              isOpen={isSuggestionsOpen}
              onClose={() => setIsSuggestionsOpen(false)}
              onSelectQuery={(term) => {
                setSearchTerm(term);
                handleSubmit(term);
              }}
              onSelectProduct={(p) => {
                if (onSelectProduct) {
                  onSelectProduct(p);
                } else {
                  setSearchTerm(p.name);
                  handleSubmit(p.name);
                }
              }}
            />
          </div>
        </div>

        {/* 2. Barre d'état & Filtres rapides */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {isLoading
                ? "Recherche en cours..."
                : sourceError
                ? `Recherche partielle (${results.length} produit${results.length > 1 ? "s" : ""}) – source distante indisponible`
                : `${total != null ? total : results.length} produit${(total != null ? total : results.length) > 1 ? "s" : ""} trouvé${(total != null ? total : results.length) > 1 ? "s" : ""}`}
            </span>
            {initialQuery && (
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                pour « {initialQuery} »
              </span>
            )}
          </div>

          {/* Filtres par verdict si des résultats existent */}
          {results.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer shrink-0 ${
                  activeFilter === "all"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-stone-200 dark:border-slate-800 hover:bg-stone-100"
                }`}
              >
                Tous ({counts.all})
              </button>
              {counts.halal > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter("halal")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer shrink-0 ${
                    activeFilter === "halal"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  <CheckCircle2 className="size-3" />
                  Halal ({counts.halal})
                </button>
              )}
              {counts.doubtful > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter("doubtful")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer shrink-0 ${
                    activeFilter === "doubtful"
                      ? "bg-amber-600 text-white shadow-2xs"
                      : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800 hover:bg-amber-100"
                  }`}
                >
                  <AlertTriangle className="size-3" />
                  {t.toVerifyCount ? t.toVerifyCount.replace("{count}", String(counts.doubtful)) : `À vérifier (${counts.doubtful})`}
                </button>
              )}
              {counts.haram > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter("haram")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer shrink-0 ${
                    activeFilter === "haram"
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800 hover:bg-rose-100"
                  }`}
                >
                  <XCircle className="size-3" />
                  {t.verdictHaram || "Haram"} ({counts.haram})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. État : Chargement avec Skeletons haute densité */}
      {isLoading && (
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-center gap-2.5 py-6 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <Loader2 className="size-5 animate-spin" />
            <span>{t.searchingVerifiedAndOff || "Recherche dans la base vérifiée et Open Food Facts..."}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-white dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 p-3 flex items-center gap-3 animate-pulse"
              >
                <div className="size-16 rounded-xl bg-stone-200 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-stone-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-stone-200 dark:bg-slate-800 rounded w-1/2" />
                  <div className="h-4 bg-stone-200 dark:bg-slate-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. État : Erreur complète (source distante indisponible) */}
      {!isLoading && (isError || sourceError) && results.length === 0 && (
        <section className="glass rounded-3xl p-6 border-2 border-rose-500/40 bg-gradient-to-b from-rose-500/10 via-slate-900/40 to-rose-950/20 shadow-xl space-y-4 text-center">
          <div className="size-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-500 mx-auto flex items-center justify-center shadow-inner">
            <XCircle className="size-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Erreur lors de la recherche
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              La source de données distante est temporairement indisponible. Veuillez vérifier votre connexion réseau et réessayer.
            </p>
          </div>
          <Button
            onClick={() => handleSubmit()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
          >
            Réessayer
          </Button>
        </section>
      )}

      {/* 4b. Bandeau : source distante indisponible, résultats locaux partiels */}
      {!isLoading && sourceError && results.length > 0 && (
        <section className="glass rounded-3xl p-4 border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-slate-900/30 to-amber-950/20 shadow-xl space-y-3 text-center">
          <div className="size-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 mx-auto flex items-center justify-center shadow-inner">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium max-w-sm mx-auto">
              La base de données distante est temporairement indisponible. Les résultats affichés
              proviennent du catalogue local vérifié et ne sont pas exhaustifs.
            </p>
          </div>
        </section>
      )}

      {/* 5. État : Aucun résultat trouvé */}
      {!isLoading && !isError && !sourceError && results.length === 0 && (
        <section className="glass rounded-3xl p-6 sm:p-7 border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-slate-900/30 to-amber-950/20 shadow-xl space-y-5 text-center">
          <div className="size-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 text-amber-500 mx-auto flex items-center justify-center shadow-inner">
            <PackageSearch className="size-8" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              0 résultat
            </div>
            <h3 className="text-xl font-black text-foreground tracking-tight">
              Aucun produit trouvé
            </h3>
            <p className="text-xs sm:text-sm text-foreground/90 max-w-md mx-auto leading-relaxed">
              Aucun aliment ne correspond à « <strong className="text-amber-600 dark:text-amber-400">{initialQuery}</strong> ».
            </p>
          </div>

          {/* Conseils pour affiner la recherche */}
          <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-stone-200 dark:border-slate-800 p-3.5 text-left text-xs space-y-1.5 max-w-md mx-auto">
            <p className="font-bold text-slate-800 dark:text-slate-200">Conseils de recherche :</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 text-[11.5px]">
              <li>Vérifiez l'orthographe du produit</li>
              <li>Recherchez uniquement la marque (ex. « Haribo », « Oasis »)</li>
              <li>Utilisez le nom général de l'aliment (ex. « chocolat », « biscuit »)</li>
            </ul>
          </div>

          {/* Actions alternatives : Scanner caméra, Photo ingrédients, Manuel */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md mx-auto">
            {onOpenScanner && (
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onOpenScanner();
                }}
                className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-98 cursor-pointer"
              >
                <Camera className="size-4" />
                <span>Ouvrir le Scanner Caméra</span>
              </button>
            )}

            {onOpenIngredientCamera && (
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onOpenIngredientCamera();
                }}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition active:scale-98 cursor-pointer"
              >
                <Sparkles className="size-4" />
                <span>Photo des ingrédients</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* 6. Liste des résultats sous forme de cartes compactes */}
      {!isLoading && !isError && filteredResults.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {filteredResults.map((product, idx) => (
              <HalalProductCard
                key={product.code ? `code:${product.code}` : `item:${product.name}|${product.brand ?? ""}|${idx}`}
                product={product}
                onOpenDetails={
                  onSelectProduct ? () => onSelectProduct(product) : undefined
                }
              />
            ))}
          </div>

          {/* Bouton "Afficher plus" pour la pagination */}
          {hasMore && onLoadMore && !isLoadingMore && (
            <div className="flex justify-center py-2">
              <Button
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded-xl"
              >
                {isLoadingMore ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <></>
                )}
                Afficher plus
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 6b. Bouton "Afficher plus" en état de chargement de la page suivante */}
      {!isLoading && !isError && filteredResults.length > 0 && isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Chargement des résultats suivants…</span>
          </div>
        </div>
      )}
    </div>
  );
}
