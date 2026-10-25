-- ==========================================================
-- SÉCURITÉ SUPABASE — À APPLIQUER MANUELLEMENT
-- docs/security/supabase_apply_manually.sql
-- ==========================================================
--
-- Contexte : l'application fonctionne en MODE INVITÉ (aucune session
-- utilisateur, session toujours nulle). Aucune requête de l'app ne dépend
-- donc d'une identité utilisateur : les règles ci-dessous durcissent l'accès
-- anonyme (la clé publishable est embarquée dans le client) sans rien casser
-- côté client.
--
-- Ce fichier est IDEMPOTENT : il peut être relancé sans erreur
-- (DROP ... IF EXISTS avant chaque CREATE, ALTER ... ENABLE RLS sans effet
-- si déjà actif).
--
-- EXÉCUTION : à COLLER dans l'éditeur SQL du Dashboard Supabase
-- (SQL Editor → New query → Run). Ne pas l'exécuter depuis ce dépôt
-- (aucune CLI, aucune connexion dans ce projet).
--
-- Fichier associé (contrôle, lecture seule) :
--   docs/security/supabase_verify_readonly.sql
--
-- État constaté dans les migrations existantes (lecture) :
--   * public.profiles    : RLS activée (20260726121944), politiques
--                          uniquement TO authenticated (ligne propre).
--   * public.bug_reports : RLS activée (20260809) ; INSERT "Anyone can
--                          submit bug reports" = WITH CHECK (true) trop
--                          permissif ; SELECT global déjà supprimé par
--                          20261010 (P0).
--   * storage.buckets    : bug_attachments créé PUBLIC (20260809).
-- ==========================================================


-- ==========================================================
-- 1) TABLE public.profiles — RLS activée, AUCUN accès pour anon
-- ==========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprime (si une quelconque existe déjà) toute politique créée
-- explicitement pour le rôle anon. Les 4 politiques "own-row" TO
-- authenticated héritées des migrations ne sont PAS touchées.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND 'anon' = ANY (roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    RAISE NOTICE 'profiles : politique anon supprimée (%)', pol.policyname;
  END LOOP;
END $$;

-- État attendu (contrôlé par supabase_verify_readonly.sql) :
--   SELECT/INSERT/UPDATE/DELETE → uniquement TO authenticated (ligne propre).
--   anon → deny par défaut (RLS activée, aucune politique pour anon).

-- ==========================================================
-- 2) TABLE public.bug_reports — RLS activée,
--    INSERT anon autorisé mais SERRÉ, aucun SELECT/UPDATE/DELETE pour anon
-- ==========================================================
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- 2.1 Politique INSERT historique trop permissive (WITH CHECK (true)) :
--     remplacée par la version "serrée" de la section 2.4.
DROP POLICY IF EXISTS "Anyone can submit bug reports" ON public.bug_reports;

-- 2.2 Noms historiques de SELECT (déjà supprimés par 20261010_bug_reports_
--     security_p0.sql) : relance défensive idempotente.
DROP POLICY IF EXISTS "Users can view own bug reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Users can view own bug reports or admin views all" ON public.bug_reports;

-- 2.3 Garantie forte : TOUTE politique SELECT restante sur bug_reports est
--     retirée, ainsi que toute politique explicitement TO anon (toute
--     opération). Le backend externe lit via service_role (bypass RLS) :
--     aucune politique SELECT n'est nécessaire pour qui que ce soit.
--     Les politiques admin UPDATE/DELETE (email durci, sans clause TO)
--     ne sont PAS touchées : leurs USING sont faux pour anon (pas de
--     claim email dans un JWT anon).
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bug_reports'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bug_reports', pol.policyname);
    RAISE NOTICE 'bug_reports : politique SELECT supprimée (%)', pol.policyname;
  END LOOP;
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bug_reports'
      AND 'anon' = ANY (roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bug_reports', pol.policyname);
    RAISE NOTICE 'bug_reports : politique anon supprimée (%)', pol.policyname;
  END LOOP;
END $$;

-- 2.4 INSERT autorisé pour anon/authenticated, avec contraintes de forme
--     raisonnables portant sur les colonnes de la ligne insérée
--     (WITH CHECK) : le schéma le permet — tous les champs texte sont
--     bornés, status figé à 'nouveau' (anti-usurpation d'historique),
--     developer_response* interdits aux clients (réponses officielles
--     réservées au backend service_role), technical_info borné en taille.
DROP POLICY IF EXISTS "Guests can submit limited bug reports" ON public.bug_reports;
CREATE POLICY "Guests can submit limited bug reports" ON public.bug_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(COALESCE(id, '')) BETWEEN 1 AND 128
    AND char_length(COALESCE(user_id, '')) BETWEEN 1 AND 128
    AND char_length(COALESCE(user_email, '')) <= 255
    AND char_length(COALESCE(title, '')) <= 200
    AND char_length(COALESCE(category, '')) <= 64
    AND char_length(COALESCE(description, '')) BETWEEN 1 AND 5000
    AND char_length(COALESCE(app_version, '')) <= 64
    AND (attachment_url IS NULL OR char_length(attachment_url) <= 2048)
    AND (technical_info IS NULL OR pg_column_size(technical_info) <= 65536)
    AND status = 'nouveau'
    AND developer_response IS NULL
    AND developer_response_at IS NULL
  );

-- 2.5 UPDATE / DELETE : aucune politique n'est créée ici. Les politiques
--     admin existantes (service_role ou email durci) restent actives mais
--     ne concernent PAS anon (USING faux sans claim email). service_role
--     contourne RLS : le backend externe conserve ses droits complets.

-- ==========================================================
-- 3) BUCKET storage bug_attachments — INSERT limité au bucket,
--    RESTE PUBLIC (décision assumée)
-- ==========================================================
--
-- DÉCISION : on NE PASSE PAS le bucket en privé.
--   * L'application référence les pièces jointes par URL publique
--     (.../storage/v1/object/public/bug_attachments/...). Un passage en
--     privé invaliderait immédiatement toute URL déjà stockée ou encodée
--     (lecture cassée : 400 / accès refusé), cf. le rapport de risque de
--     docs/security/bug_attachments_private_deferred.sql.
--   * Le mode d'accès exact du backend externe (islam-noor-bug-tracker.
--     ai.studio) n'est pas vérifiable depuis ce dépôt → report, dans la
--     continuité du choix de la migration P0 (20261010), qui avait déjà
--     différé ces opérations.
--   * RISQUE RÉSIDUEL ASSUMÉ : tant que le bucket est public, n'importe
--     qui peut lire ses fichiers par URL (captures potentiellement PII) ;
--     le bucket reste aussi le point d'entrée d'uploads anonymes bornés
--     ci-dessous. Le passage en privé reste l'OBJECTIF, à déclencher après
--     vérification du backend — il appartient au fichier DIFFÉRÉ, pas à
--     celui-ci.
--
-- On fixe explicitement l'état "public" (opération idempotente) : ce script
-- ne doit changer aucune visibilité existante.
UPDATE storage.buckets
SET public = true
WHERE id = 'bug_attachments';

-- Politique d'envoi : limitée à CE bucket (jamais au Storage entier),
-- recréée avec des rôles explicites et une borne de longueur de chemin.
DROP POLICY IF EXISTS "Anyone can upload bug attachments" ON storage.objects;
DROP POLICY IF EXISTS "bug_attachments upload limited" ON storage.objects;
CREATE POLICY "bug_attachments upload limited" ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'bug_attachments'
    AND char_length(name) <= 512
  );

-- Politique de lecture du bucket : RECRÉÉE À L'IDENTIQUE (étape
-- idempotente), cohérente avec le maintien du mode public. Sa suppression
-- est réservée au script DIFFÉRÉ docs/security/bug_attachments_
-- private_deferred.sql (après vérification du backend).
DROP POLICY IF EXISTS "Anyone can view bug attachments" ON storage.objects;
CREATE POLICY "Anyone can view bug attachments" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'bug_attachments');

-- ==========================================================
-- FIN — Contrôler le résultat avec :
--   docs/security/supabase_verify_readonly.sql
-- ==========================================================
