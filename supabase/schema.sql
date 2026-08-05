-- Canonical Supabase schema entry point.
-- Run with the Supabase CLI/psql from this directory. The ordered migration
-- chain creates the complete baseline, compatibility patches, and Users/RBAC
-- architecture. Keeping one source of truth prevents schema snapshot drift.
\set ON_ERROR_STOP on
\ir migrations/202607240001_initial_schema.sql
\ir migrations/202607250002_schema_patch.sql
\ir migrations/202607250003_sync_canonical_schema.sql
\ir migrations/202607260001_users_rbac_followup.sql
\ir migrations/202607270001_servant_follow_up_records.sql
\ir migrations/202607270002_servant_follow_up_days.sql
\ir migrations/202607270003_simplify_account_types.sql
\ir migrations/202607310001_member_registration_fields.sql
