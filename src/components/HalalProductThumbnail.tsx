import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Package } from "lucide-react";
import { resolveProductImageCandidates } from "@/lib/halal-product-images";

export interface HalalProductThumbnailProps {
  product: {
    code?: string;
    name?: string;
    brand?: string;
    image?: string;
    imageCandidates?: string[];
    verdict?: string;
    verdictLabel?: string;
    subVerdict?: string;
  };
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  imgClassName?: string;
  alt?: string;
}

const SIZE_CONFIGS = {
  xs: {
    container: "size-8 rounded-lg",
    icon: "size-4",
    initialText: "text-[10px]",
    padding: "p-0.5",
  },
  sm: {
    container: "size-10 rounded-xl",
    icon: "size-4",
    initialText: "text-xs",
    padding: "p-0.5",
  },
  md: {
    container: "size-16 sm:size-18 rounded-2xl",
    icon: "size-7",
    initialText: "text-base font-bold",
    padding: "p-1",
  },
  lg: {
    container: "size-20 sm:size-24 rounded-2xl",
    icon: "size-8",
    initialText: "text-lg font-bold",
    padding: "p-1.5",
  },
};

export function HalalProductThumbnail({
  product,
  size = "sm",
  className = "",
  imgClassName = "",
  alt,
}: HalalProductThumbnailProps) {
  const candidatesKey = `${product.code ?? ""}|${product.image ?? ""}|${(product.imageCandidates ?? []).join(",")}`;
  const candidates = useMemo(
    () => resolveProductImageCandidates(product),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidatesKey],
  );

  const [failedUrls, setFailedUrls] = useState<Record<string, true>>({});
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setFailedUrls({});
  }, [candidatesKey]);

  const currentSrc = useMemo(
    () => candidates.find((url) => !failedUrls[url]),
    [candidates, failedUrls],
  );

  const isLoaded = Boolean(currentSrc && loadedSrc === currentSrc);

  // Vérification immédiate si l'image est déjà présente dans le cache mémoire du navigateur / WebView
  useEffect(() => {
    const imgEl = imgRef.current;
    if (currentSrc && imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      setLoadedSrc(currentSrc);
    }
  }, [currentSrc]);

  const setImgNode = useCallback(
    (node: HTMLImageElement | null) => {
      imgRef.current = node;
      if (node && currentSrc && node.complete && node.naturalWidth > 0) {
        setLoadedSrc(currentSrc);
      }
    },
    [currentSrc],
  );

  const cfg = SIZE_CONFIGS[size] || SIZE_CONFIGS.sm;
  const initial = (product.name || product.brand || "?").charAt(0).toUpperCase();

  const handleError = useCallback(() => {
    if (!currentSrc) return;
    setFailedUrls((prev) => (prev[currentSrc] ? prev : { ...prev, [currentSrc]: true }));
  }, [currentSrc]);

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 flex items-center justify-center shadow-2xs select-none ${cfg.container} ${className}`}
    >
      {currentSrc ? (
        <>
          {/* Skeleton discret uniquement tant que l'image courante n'est pas décodée */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-stone-100 dark:bg-slate-800 animate-pulse flex items-center justify-center">
              <Package className={`${cfg.icon} text-stone-300 dark:text-slate-600`} />
            </div>
          )}

          <img
            ref={setImgNode}
            src={currentSrc}
            alt={alt || product.name || "Produit"}
            className={`w-full h-full object-contain ${cfg.padding} transition-opacity duration-150 ${
              isLoaded ? "opacity-100" : "opacity-0"
            } ${imgClassName}`}
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setLoadedSrc(currentSrc)}
            onError={handleError}
          />
        </>
      ) : (
        /* Repli esthétique propre & haut de gamme sans icône cassée ni image d'un autre produit */
        <div
          data-testid="halal-thumbnail-placeholder"
          className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200/80 dark:from-slate-800 dark:to-slate-900/90 text-stone-500 dark:text-slate-400 p-1"
        >
          <Package className={`${cfg.icon} opacity-60 mb-0.5`} />
          {size !== "xs" && (
            <span className={`${cfg.initialText} font-bold opacity-75 truncate max-w-full text-center px-0.5`}>
              {initial}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
