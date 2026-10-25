import { useState, useEffect, useRef } from "react";
import {
  Search,
  Clock,
  Trash2,
  Package,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { getFastSuggestions, type ProductResult } from "@/lib/halal";
import { getVerdictBadgeMeta } from "@/components/HalalProductDetailModal";
import { HalalProductThumbnail } from "@/components/HalalProductThumbnail";
import { playClick } from "@/lib/sfx";
import {
  getRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
} from "@/lib/halal-search-history";

interface HalalInstantSuggestionsProps {
  query: string;
  isOpen: boolean;
  onSelectQuery: (term: string) => void;
  onSelectProduct: (product: ProductResult) => void;
  onClose: () => void;
}

export function HalalInstantSuggestions({
  query,
  isOpen,
  onSelectQuery,
  onSelectProduct,
  onClose,
}: HalalInstantSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load recent searches
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
    }
  }, [isOpen]);

  // Handle outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (containerRef.current?.contains(target)) return;
      if (target.closest('[data-search-wrapper="true"]')) return;
      onClose();
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, onClose]);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (!isOpen) return;

    let isCurrent = true;
    const trimmed = query.trim();

    if (trimmed.length === 0) {
      setLoading(true);
      void getFastSuggestions("", 8).then((res) => {
        if (isCurrent) {
          setSuggestions(res);
          setLoading(false);
        }
      });
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      void getFastSuggestions(trimmed, 15).then((res) => {
        if (isCurrent) {
          setSuggestions(res);
          setLoading(false);
        }
      });
    }, 180);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  if (!isOpen) return null;

  const handleRecentClick = (term: string) => {
    playClick();
    saveRecentSearch(term);
    onSelectQuery(term);
    onClose();
  };

  const handleProductClick = (product: ProductResult) => {
    playClick();
    if (product.name) {
      saveRecentSearch(product.name);
    }
    onSelectProduct(product);
    onClose();
  };

  const handleSearchTermClick = () => {
    if (!query.trim()) return;
    playClick();
    saveRecentSearch(query);
    onSelectQuery(query.trim());
    onClose();
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  };

  const trimmed = query.trim();

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-[#FAF8F5]/98 dark:bg-[#0B1320]/98 backdrop-blur-xl border border-stone-200/90 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 text-slate-900 dark:text-slate-100 max-h-[72vh] overflow-y-auto"
      style={{
        boxShadow:
          "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* 1. Action directe de recherche sur le texte tapé */}
      {trimmed.length > 0 && (
        <button
          type="button"
          onClick={handleSearchTermClick}
          className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left border-b border-stone-200/70 dark:border-slate-800/80 transition group cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Search className="size-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block">
                Rechercher tous les produits
              </span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 truncate block">
                « {trimmed} »
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 shrink-0">
            Voir résultats
            <ArrowUpRight className="size-3" />
          </span>
        </button>
      )}

      {/* 2. Historique des recherches récentes (si saisie vide ou courte) */}
      {trimmed.length === 0 && recentSearches.length > 0 && (
        <div className="p-3 border-b border-stone-200/60 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <Clock className="size-3" />
              <span>Recherches récentes</span>
            </div>
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-[11px] text-muted-foreground hover:text-rose-500 flex items-center gap-1 transition"
            >
              <Trash2 className="size-3" />
              <span>Effacer</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => handleRecentClick(term)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-stone-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 border border-stone-200 dark:border-slate-700/80 transition cursor-pointer"
              >
                <span>{term}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Suggestions de produits instantanées */}
      <div className="p-2">
        <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {trimmed.length === 0 ? (
              <>
                <TrendingUp className="size-3 text-emerald-500" />
                <span>Exemples et produits populaires</span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="size-3 text-emerald-500" />
                <span>Suggestions en direct</span>
                {suggestions.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px]">
                    {suggestions.length} propositions
                  </span>
                )}
              </div>
            )}
          </div>
          {loading && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin text-emerald-500" />
              <span>Recherche...</span>
            </div>
          )}
        </div>

        {suggestions.length === 0 && !loading && (
          <div className="py-4 text-center text-xs text-muted-foreground italic">
            Aucune suggestion rapide pour « {trimmed} ». Appuyez sur Entrée pour rechercher.
          </div>
        )}

        <div className="space-y-1">
          {suggestions.map((product, idx) => {
            const verdictMeta = getVerdictBadgeMeta(product);
            const VerdictIcon = verdictMeta.icon;

            return (
              <button
                key={product.code ? `sugg:${product.code}` : `sugg:${product.name}|${product.brand ?? ""}|${idx}`}
                type="button"
                onClick={() => handleProductClick(product)}
                className="w-full flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-stone-100/90 dark:hover:bg-slate-800/80 text-left transition active:scale-[0.99] cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Miniature produit vérifiée */}
                  <HalalProductThumbnail product={product} size="sm" />

                  {/* Nom & Marque */}
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {product.brand || "Marque non précisée"}
                    </p>
                  </div>
                </div>

                {/* Badge verdict compact */}
                <div className="shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${verdictMeta.badgeClass}`}
                  >
                    <VerdictIcon className="size-2.5" />
                    <span>{verdictMeta.label}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bouton pour afficher la grille complète si plusieurs résultats */}
        {trimmed.length > 0 && suggestions.length > 0 && (
          <div className="pt-2 px-1 border-t border-stone-200/60 dark:border-slate-800/80 mt-1.5">
            <button
              type="button"
              onClick={handleSearchTermClick}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition active:scale-[0.99] cursor-pointer"
            >
              <Search className="size-3.5" />
              <span>Voir tous les résultats pour « {trimmed} »</span>
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
