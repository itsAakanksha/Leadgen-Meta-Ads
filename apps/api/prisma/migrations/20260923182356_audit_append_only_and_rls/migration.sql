-- Hand-written: things Prisma schema cannot express.

-- 1. The audit log is append-only. History cannot be rewritten, even by an application bug.
CREATE FUNCTION reject_lead_activity_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'lead_activities is append-only (% is not allowed)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_activities_append_only
  BEFORE UPDATE OR DELETE ON "lead_activities"
  FOR EACH ROW EXECUTE FUNCTION reject_lead_activity_mutation();

-- 2. Row Level Security with no policies.
-- Supabase exposes the public schema through its REST API (PostgREST) using the anon key.
-- With RLS on and no policies, that API can read nothing. The app connects as the table
-- owner, which bypasses RLS, so it is unaffected.
ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_activities" ENABLE ROW LEVEL SECURITY;
