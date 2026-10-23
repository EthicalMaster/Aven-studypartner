-- Audit copy of policies already applied to taher-portfolio on 2026-10-23.
-- Do not run against Neon or re-run against Supabase; these policies already exist.

DO $check$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id='7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid AND email_confirmed_at IS NOT NULL)
 OR EXISTS (SELECT 1 FROM public.portfolio_owners WHERE user_id='7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid)
 OR NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='aven-materials' AND public=false)
 THEN RAISE EXCEPTION 'Aven storage prerequisites failed'; END IF;
END $check$;
CREATE POLICY aven_bucket_boundary ON storage.buckets AS RESTRICTIVE FOR ALL TO public
 USING ((id <> 'aven-materials' OR (SELECT auth.uid()) = '7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid)
 AND ((SELECT auth.uid()) IS DISTINCT FROM '7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid OR id = 'aven-materials'))
 WITH CHECK ((id <> 'aven-materials' OR (SELECT auth.uid()) = '7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid)
 AND ((SELECT auth.uid()) IS DISTINCT FROM '7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid OR id = 'aven-materials'));
CREATE POLICY aven_bucket_read ON storage.buckets FOR SELECT TO authenticated
 USING (id='aven-materials' AND (SELECT auth.uid())='7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid);
CREATE POLICY aven_object_boundary ON storage.objects AS RESTRICTIVE FOR ALL TO public
 USING ((bucket_id <> 'aven-materials' OR (SELECT auth.uid()) = '7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid)
 AND ((SELECT auth.uid()) IS DISTINCT FROM '7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid OR bucket_id = 'aven-materials'))
 WITH CHECK ((bucket_id <> 'aven-materials' OR (SELECT auth.uid()) = '7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid)
 AND ((SELECT auth.uid()) IS DISTINCT FROM '7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid OR bucket_id = 'aven-materials'));
CREATE POLICY aven_object_read ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id='aven-materials' AND (SELECT auth.uid())='7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid);
CREATE POLICY aven_object_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='aven-materials' AND (SELECT auth.uid())='7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid);
CREATE POLICY aven_object_delete ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id='aven-materials' AND (SELECT auth.uid())='7b6b27ad-64a0-42d9-86b1-902fcc31939a'::uuid);

