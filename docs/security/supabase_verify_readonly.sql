-- ==========================================================
-- VÉRIFICATION SUPABASE — LECTURE SEULE UNIQUEMENT
-- docs/security/supabase_verify_readonly.sql
-- ==========================================================
--
-- À exécuter dans l'éditeur SQL du Dashboard Supabase (SQL Editor).
-- 4 requêtes purement lisibles :
--   * aucune donnée utilisateur n'est affichée (jamais de lignes de
--     profiles ou bug_reports, jamais de contenu de pièces jointes),
--   * aucune clé ni secret n'est affiché.
--
-- USAGE : exécuter après supabase_apply_manually.sql (ou avant, pour
-- comparer) et me coller le résultat complet des 4 jeux de colonnes.
-- ==========================================================


-- (1) État RLS des tables du schéma public.
--     rowsecurity = true  → RLS activée (requis sur profiles et
--     bug_reports) ; false → table exposée, à corriger.
SELECT schemaname,
       tablename,
       rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;


-- (2) Politiques RLS de profiles et bug_reports.
--     Lecture attendue :
--       profiles    → 4 politiques, roles = {authenticated} uniquement ;
--       bug_reports → UNE politique INSERT (roles anon, authenticated)
--                     + éventuelles politiques admin UPDATE/DELETE,
--                     AUCUNE ligne cmd = 'SELECT'.
SELECT schemaname,
       tablename,
       policyname,
       roles,
       cmd,
       qual,
       with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'bug_reports')
ORDER BY tablename, policyname;


-- (3) Politiques RLS du Storage (storage.objects).
--     Lecture attendue : avatars (authenticated), bug_attachments
--     (upload limité au bucket + lecture publique du bucket).
SELECT schemaname,
       tablename,
       policyname,
       roles,
       cmd,
       qual,
       with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;


-- (4) Bucket bug_attachments : nom et visibilité.
--     public = true  → URLs publiques actives (état attendu aujourd'hui,
--                       cf. décision documentée dans
--                       supabase_apply_manually.sql section 3) ;
--     public = false → bucket privé (URLs signées requises).
SELECT id,
       name,
       public
FROM storage.buckets
WHERE id = 'bug_attachments';
