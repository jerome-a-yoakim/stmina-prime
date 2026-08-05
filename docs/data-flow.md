# Data flow

The repository contains two intentionally preserved delivery flows:

1. Login and HTTP APIs: browser component to Next.js route handler to feature
   schema/service to the Supabase server adapter.
2. Interactive dashboard: dashboard component to feature data service to the
   Supabase browser adapter.

Both terminate in Postgres with row-level security. Authentication cookies are
refreshed by middleware. UI permission checks improve navigation, while database
policies remain the authoritative access-control boundary.
