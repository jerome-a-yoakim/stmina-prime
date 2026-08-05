# Project structure

```text
src/
  app/                 Next.js pages, layouts, and API route handlers
  features/
    activities/        Activity data operations
    attendance/        Attendance data operations
    auth/              Authorization, auth UI, auth service, schemas, and types
    backups/           Snapshot export and restore
    dashboard/         Active dashboard application and route-facing entry point
    groups/            Group data operations and types
    login/             Login component and route-facing entry point
    members/           Member data operations, notes, schemas, and types
  infrastructure/
    config/            Environment access
    supabase/          Browser, server, admin, middleware, and auth adapters
  styles/              Global CSS
scripts/               Operational import tooling
supabase/              Protected migrations and seed data
```

Next.js route paths remain stable under `src/app`. Each feature exposes its
route-facing component through its root `index.tsx` where needed; internal data
and component modules remain explicitly named for discoverability.
