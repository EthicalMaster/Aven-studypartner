-- Anonymous lifetime aggregates; never retain deleted-account identifiers here.
CREATE TABLE public_usage_totals (
 singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(singleton),
 registered_accounts BIGINT NOT NULL DEFAULT 0,
 ai_accounts BIGINT NOT NULL DEFAULT 0,
 tracking_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public_usage_totals(singleton,registered_accounts) SELECT TRUE,COUNT(*) FROM student_profiles;
CREATE FUNCTION aven_count_registration() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN UPDATE public_usage_totals SET registered_accounts=registered_accounts+1 WHERE singleton; RETURN NEW; END $$;
CREATE TRIGGER aven_count_registration AFTER INSERT ON student_profiles FOR EACH ROW EXECUTE FUNCTION aven_count_registration();
CREATE TABLE account_ai_usage (
 student_id UUID PRIMARY KEY REFERENCES student_profiles(id) ON DELETE CASCADE,
 first_response_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE FUNCTION aven_count_ai_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN UPDATE public_usage_totals SET ai_accounts=ai_accounts+1 WHERE singleton; RETURN NEW; END $$;
CREATE TRIGGER aven_count_ai_account AFTER INSERT ON account_ai_usage FOR EACH ROW EXECUTE FUNCTION aven_count_ai_account();
-- No email, user ID or filename; opaque keys exist only until physical cleanup succeeds.
CREATE TABLE storage_deletion_queue (
 storage_key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE FUNCTION aven_queue_material_cleanup() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF COALESCE(OLD.storage_key,OLD.storage_location) IS NOT NULL THEN
 INSERT INTO storage_deletion_queue(storage_key) VALUES(COALESCE(OLD.storage_key,OLD.storage_location)) ON CONFLICT DO NOTHING;
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER aven_queue_material_cleanup BEFORE DELETE ON study_materials FOR EACH ROW EXECUTE FUNCTION aven_queue_material_cleanup();
