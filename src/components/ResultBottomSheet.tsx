import { HalalProductDetailModal } from "./HalalProductDetailModal";
import type { ProductResult } from "@/lib/halal";

interface ResultBottomSheetProps {
  product: ProductResult | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullDetail?: () => void;
}

/**
 * Fiche détaillée complète (10 protocoles, 3 onglets, traçabilité et garde-fou).
 * S'ouvre lors d'un scan ou lors du clic sur « Consulter le rapport complet ».
 */
export function ResultBottomSheet({
  product,
  isOpen,
  onClose,
}: ResultBottomSheetProps) {
  if (!isOpen || !product) return null;

  return (
    <HalalProductDetailModal
      product={product}
      isOpen={isOpen}
      onClose={onClose}
      initialTab="audit"
    />
  );
}
