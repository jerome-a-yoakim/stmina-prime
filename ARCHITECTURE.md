# Architecture

The project follows a dependency-inward design: presentation and Next.js delivery depend on application services; services depend on domain types and infrastructure abstractions; domain types do not depend on Next.js or Supabase. Supabase Auth manages credentials. Postgres stores service data. RLS uses `is_admin` and `can_access_group` database functions to make admin and servant permissions enforceable for every query.

No service-role credential is exposed to the browser. Use only the publishable/anon key in Vercel environment variables.
