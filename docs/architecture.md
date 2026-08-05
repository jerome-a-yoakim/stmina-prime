# Architecture

The repository uses a feature-first architecture. Next.js route files are delivery
adapters only; active product code is owned by the feature that implements it.

## Boundaries

- `src/app` owns routing, layouts, and HTTP route handlers.
- `src/features` owns UI, data services, schemas, authorization, and types grouped
  by business capability.
- `src/infrastructure` owns shared environment and Supabase adapters.
- `src/styles` owns application-wide styles.
- `supabase` owns the protected database migrations and seed.
- `scripts` owns operational data tooling.

Feature modules may depend on shared infrastructure. Route handlers may depend on
feature modules. Shared infrastructure must not depend on dashboard components.

Supabase Auth manages credentials. Postgres stores service data. Row-level
security remains the final authorization boundary. No service-role credential is
exposed to browser code.
