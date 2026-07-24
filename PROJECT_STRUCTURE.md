# Project structure

`src/app` owns Next.js routes and route handlers. `src/presentation` owns React UI and hooks. `src/application` owns use cases, validation, and service orchestration. `src/domain` owns framework-independent types. `src/infrastructure` owns Supabase and environment adapters. `supabase` owns repeatable database migrations and seed data. The legacy JSX file is reference-only and is not imported by the application.
