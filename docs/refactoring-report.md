# Repository refactoring report

## Outcome

The repository now uses one feature-first architecture. Next.js routes remain
stable, business capabilities own their data services and types, shared Supabase
adapters remain isolated under infrastructure, and unreachable scaffold code has
been removed.

## Problems identified

- Generic `application`, `domain`, and `presentation` layers competed with the
  existing feature modules.
- Active dashboard code depended on services and types scattered across unrelated
  top-level layers.
- Authentication used inconsistent `components`, `guards`, `permissions`,
  `roles`, `services`, and `types` naming.
- A second, unreachable presentation dashboard duplicated the active dashboard
  concept.
- Two backup services existed; only the browser-backed dashboard service was
  reachable.
- Several domain types, a generic API hook, a prototype wrapper, and a sign-out
  component were unreachable.
- Architecture documents described modules that were not used by the running
  application.
- The main dashboard filename described migration history instead of its current
  responsibility.

## Architecture decisions

- Organize active code by business capability under `src/features`.
- Keep `src/app` as a thin, route-stable delivery layer.
- Keep shared Supabase and environment adapters under `src/infrastructure`.
- Co-locate schemas and types with the feature that owns them.
- Use lowercase kebab-case filenames consistently.
- Retain the dashboard component tree as a single module because splitting it
  would require behavior-sensitive state and logic changes.
- Avoid broad barrel exports for client/server-mixed modules; explicit imports
  make runtime boundaries visible.

## Moved and renamed files

| Previous path | New path |
| --- | --- |
| `src/application/services/activity-service.ts` | `src/features/activities/data/activity-service.ts` |
| `src/application/services/attendance-service.ts` | `src/features/attendance/data/attendance-service.ts` |
| `src/application/services/auth-service.ts` | `src/features/auth/data/auth-service.ts` |
| `src/application/services/backup-service.ts` | `src/features/backups/data/backup-service.ts` |
| `src/application/services/group-service.ts` | `src/features/groups/data/group-service.ts` |
| `src/application/services/member-service.ts` | `src/features/members/data/member-service.ts` |
| `src/application/services/member-note-service.ts` | `src/features/members/data/member-note-service.ts` |
| `src/application/validation/auth-schema.ts` | `src/features/auth/schemas/sign-in-schema.ts` |
| `src/application/validation/member-schema.ts` | `src/features/members/schemas/member-schema.ts` |
| `src/domain/types/group.ts` | `src/features/groups/types/group.ts` |
| `src/domain/types/member.ts` | `src/features/members/types/member.ts` |
| `src/features/dashboard/LegacyApplication.jsx` | `src/features/dashboard/components/dashboard-application.jsx` |
| `src/features/auth/components/AccessDeniedPage.jsx` | `src/features/auth/components/access-denied-page.jsx` |
| `src/features/auth/components/TopbarAuth.jsx` | `src/features/auth/components/topbar-auth.jsx` |
| `src/features/auth/components/UserManagementPage.jsx` | `src/features/auth/components/user-management-page.jsx` |
| `src/features/auth/permissions/permission-checker.ts` | `src/features/auth/authorization/permission-checker.ts` |
| `src/features/auth/roles/role-definitions.ts` | `src/features/auth/authorization/role-definitions.ts` |
| `src/features/auth/types/auth.ts` | `src/features/auth/types/auth-types.ts` |
| `src/presentation/components/login-form.tsx` | `src/features/login/components/login-form.tsx` |
| `src/presentation/styles/globals.css` | `src/styles/globals.css` |
| Root architecture documents | `docs/` with lowercase filenames |

## Deleted files

The following files were removed because repository-wide import analysis proved
them unreachable or duplicated:

- `src/presentation/components/dashboard-home.tsx`
- `src/presentation/components/prototype-app.tsx`
- `src/presentation/components/sign-out-button.tsx`
- `src/presentation/hooks/use-api.ts`
- `src/features/auth/guards/Guards.jsx`
- `src/features/auth/services/backup-service.ts`
- `src/domain/types/attendance-record.ts`
- `src/domain/types/attendance-session.ts`
- `src/domain/types/dashboard-metrics.ts`
- `src/domain/types/profile.ts`
- `src/domain/types/role.ts`

Other deletions already present in the working tree before this architecture
refactor were preserved and are not claimed by this report.

## Protected areas

No SQL migration, seed, Supabase query, mutation, policy, schema, environment
variable, API path, page route, authentication flow, or deployment configuration
was changed by the architecture reorganization. Import paths were repaired where
moved feature modules required them.

## Verification

- TypeScript: `npm run typecheck` passed.
- ESLint: `npm run lint` passed.
- Production build: `npm run build` passed.
- Routes: all existing pages and API handlers were generated.
- Circular dependencies: none across 38 source modules.
- Supabase migrations and seed: untouched.
- Behavioral code: moved rather than reimplemented.

The build reports one pre-existing configuration warning: the Next.js ESLint
plugin is not detected by the minimal ESLint configuration.
