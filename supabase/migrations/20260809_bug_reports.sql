-- ==========================================================
-- SQL Migration pour Supabase: Table bug_reports & RLS
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.bug_reports (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id TEXT NOT NULL,
    user_email TEXT DEFAULT 'Invité',
    title TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'autre',
    description TEXT NOT NULL,
    app_version TEXT DEFAULT '1.0.0',
    technical_info JSONB,
    attachment_url TEXT,
    status TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'en_cours', 'resolu', 'non_resolu')),
    developer_response TEXT,
    developer_response_at TIMESTAMPTZ
);

-- Index pour recherche rapide par date, utilisateur et statut
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON public.bug_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON public.bug_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports (status);

-- Activation de la sécurité au niveau des lignes (RLS)
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité (RLS) :

-- a) INSERT: Permettre à tout utilisateur d'envoyer un signalement
DROP POLICY IF EXISTS "Anyone can submit bug reports" ON public.bug_reports;
CREATE POLICY "Anyone can submit bug reports" ON public.bug_reports
    FOR INSERT
    WITH CHECK (true);

-- b) SELECT: Un utilisateur normal ne peut lire que ses propres signalements ou service_role
DROP POLICY IF EXISTS "Users can view own bug reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Users can view own bug reports or admin views all" ON public.bug_reports;
CREATE POLICY "Users can view own bug reports" ON public.bug_reports
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR auth.role() = 'anon'
        OR auth.role() = 'authenticated'
    );

-- c) UPDATE & DELETE: Opérations via service_role ou admin
DROP POLICY IF EXISTS "Admin update bug reports" ON public.bug_reports;
CREATE POLICY "Admin update bug reports" ON public.bug_reports
    FOR UPDATE
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' IN ('aroxasef@gmail.com'));

DROP POLICY IF EXISTS "Admin delete bug reports" ON public.bug_reports;
CREATE POLICY "Admin delete bug reports" ON public.bug_reports
    FOR DELETE
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' IN ('aroxasef@gmail.com'));

-- Bucket de stockage Supabase Storage pour les captures d'écran
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bug_attachments', 'bug_attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can upload bug attachments" ON storage.objects;
CREATE POLICY "Anyone can upload bug attachments" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'bug_attachments');

DROP POLICY IF EXISTS "Anyone can view bug attachments" ON storage.objects;
CREATE POLICY "Anyone can view bug attachments" ON storage.objects
    FOR SELECT USING (bucket_id = 'bug_attachments');
