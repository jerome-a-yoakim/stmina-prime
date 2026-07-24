# Data flow

Browser component → typed HTTP route → Zod validation → application service → Supabase server client → Postgres with RLS → typed response → component state. Authentication cookies are refreshed by middleware. Authorization is enforced in Postgres policies, not merely by UI visibility.
