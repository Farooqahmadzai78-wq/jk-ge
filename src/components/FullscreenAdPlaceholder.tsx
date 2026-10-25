/**
 * Composant hérité neutralisé : aucune fausse publicité plein écran n'est autorisée
 * en production. Les simulations de développement Web sont gérées exclusivement par
 * `WebAdMobTestPreview` avec marquage explicite « TEST » hors production.
 */
export function FullscreenAdPlaceholder(_props: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return null;
}
