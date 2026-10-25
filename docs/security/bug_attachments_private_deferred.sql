-- ==========================================================
-- DIFFERE — PAS ENCORE APPLIQUABLE
-- Bucket Storage `bug_attachments` : passage en PRIVE
-- ==========================================================
--
-- STATUT : opérations DIFFÉRÉES. NE PAS EXÉCUTER avant d'avoir vérifié
-- le mode d'accès du backend externe (islam-noor-bug-tracker.ai.studio)
-- aux pièces jointes. Ces opérations ont été retirées de la migration
--   supabase/migrations/20261010_bug_reports_security_p0.sql
-- et ne sont conservées ici qu'à titre documentaire.
--
-- PRÉALABLES À VÉRIFIER (hors de ce dépôt) :
--   1. Le backend externe utilise-t-il CE projet Supabase ?
--      (Indice de divergence : le vocabulaire `status` du client du
--      bug tracker — "Nouveau" | "En cours" | "Résolu" | "Non résolu" —
--      est incompatible avec le CHECK de la table bug_reports locale
--      ('nouveau','en_cours','resolu','non_resolu').)
--   2. Lit-il les pièces jointes via URL publique Supabase ?
--      Si oui, prévoir la migration vers des URLs signées avant
--      d'exécuter ci-dessous.
--
-- !! RISQUE ASSUMÉ — ANCIENNES URLS PUBLIQUES CASSEES !!
-- Passer le bucket en privé invalide immédiatement toutes les URLs
-- publiques déjà stockées (format
--   .../storage/v1/object/public/bug_attachments/...).
-- Toute référence externe déjà encodée renverra une erreur
-- (accès refusé / 400). Le stockage des fichiers n'est PAS supprimé,
-- mais il ne sera plus accessible publiquement : il faudra des URLs
-- signées ou un accès via service_role.
--
-- Portée : LECTURE uniquement.
--   - La politique d'INSERT "Anyone can upload bug attachments"
--     n'est PAS touchée ici (voir correctif Tier B séparé).
--   - Les opérations ci-dessous sont conservées intégralement depuis
--     la version initiale de la migration P0.

-- 1) Storage : rend le bucket des pièces jointes privé.
UPDATE storage.buckets
SET public = false
WHERE id = 'bug_attachments';
-- Le fichier reste en place ; seules les URLs publiques cessent de fonctionner.

-- 2) Storage : supprime la politique de lecture publique des pièces jointes.
--    Nom exact vérifié dans 20260809_bug_reports.sql.
DROP POLICY IF EXISTS "Anyone can view bug attachments" ON storage.objects;
-- Aucune politique SELECT de remplacement : `anon` / `authenticated` ne
-- peuvent plus lire les objets du bucket. `service_role` reste accessible.
