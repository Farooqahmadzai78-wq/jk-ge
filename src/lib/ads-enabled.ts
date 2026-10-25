import { ADS_ENABLED } from "./premium";

/**
 * Porte d'entree unique des declencheurs de publicite.
 *
 * Pour la version de lancement, aucune publicite ne doit s'afficher : les
 * declencheurs (changement de fond, de widget ou de bordure) sont donc
 * neutralises ici, avant tout comptage de budget ou appel au SDK.
 * Le mecanisme de budget et le SDK AdMob restent en place et reutilisables.
 */
export function adsMayBeTriggered(): boolean {
  return ADS_ENABLED;
}
