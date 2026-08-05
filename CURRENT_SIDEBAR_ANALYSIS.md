# Current Sidebar Navigation Analysis

## 1. Scope and evidence

This document describes the sidebar code present in the repository as inspected on 2026-08-05. It distinguishes:

- the **active shared sidebar**, rendered by the Next.js layouts in `src/app/home/layout.tsx` and `src/app/dashboard/layout.tsx`; and
- the **compatibility/legacy sidebar** still defined in `src/features/dashboard/components/dashboard-application.jsx`, whose default application component is not imported by an app route, although the same file remains a runtime dependency because `src/features/dashboard/components/service-module-route.jsx` imports named page components and `buildCSS` from it.

Generated output (`.next`), installed dependencies (`node_modules`), and TypeScript build metadata were not treated as application source. No runtime code was changed for this analysis.

## 2. Purpose of the active sidebar

The active sidebar is the persistent primary navigation and account area for authenticated service-management pages. It provides:

- application identity: “خدمة مارمينا” / “إدارة الخدمة”;
- links to the home dashboard, personal workspace, service modules, servant-management modules, and settings;
- route-aware active-link highlighting;
- limited role/permission-based link visibility;
- the signed-in user's name and first-character avatar;
- a sign-out action;
- responsive navigation: full desktop sidebar, icon rail on tablet, and an off-canvas drawer on mobile.

It is also part of the page layout contract: the sidebar's width determines the workspace width and logical inline offset in `src/styles/globals.css`.

## 3. Related files

### 3.1 Active shell and layout files

| Path | Relationship |
|---|---|
| `src/features/dashboard/components/dashboard-shell.tsx` | Defines the active navigation data, renders the sidebar, account footer, mobile opener/scrim, shared top bar, active-route logic, and sign-out client flow. |
| `src/app/dashboard/layout.tsx` | Authenticates the actor, derives sidebar visibility flags and notification scope, and wraps all `/dashboard/*` pages in `DashboardShell`. |
| `src/app/home/layout.tsx` | Performs the same shell composition for `/home/*`. |
| `src/app/layout.tsx` | Imports the global stylesheet and establishes `<html lang="ar" dir="rtl">`. |
| `src/styles/globals.css` | Contains all active sidebar, workspace, top-bar, mobile drawer, print, focus, transition, token, and reduced-motion styles. There is no Tailwind configuration or Tailwind dependency in `package.json`. |
| `package.json` | Confirms the runtime/framework dependencies and the absence of Tailwind or an icon-library dependency. |

### 3.2 Authentication, actor, permission, and sign-out dependencies

| Path | Relationship |
|---|---|
| `src/features/access-control/data/authorization-service.ts` | Implements `getCurrentActor()` and `requireActiveActor()`; reads canonical roles, permissions, assignments, account state, Supabase auth, and the administrator session. |
| `src/features/access-control/types/access-control.ts` | Defines canonical role codes, permission codes, `CurrentActor`, and authorization errors. |
| `src/infrastructure/supabase/middleware.ts` | Refreshes Supabase sessions and redirects unauthenticated `/dashboard*` and `/home*` requests to `/login`; redirects authenticated login visits to `/dashboard`. |
| `middleware.ts` | Root middleware entry that calls `updateSession()`. |
| `src/middleware.ts` | A second middleware entry exists under `src`; it also calls `updateSession()` but uses a matcher that excludes API routes. The repository root also contains `middleware.ts`, which is the root entry described above. |
| `src/app/api/auth/sign-out/route.ts` | Handles the sidebar/top-bar `POST /api/auth/sign-out`, signs out the Supabase session when appropriate, and clears administrator and remember-session cookies. |
| `src/features/auth/data/auth-service.ts` | Supplies the server-side Supabase `signOut()` called by the sign-out route. |
| `src/features/auth/data/administrator-session.ts` | Supplies the administrator-session cookie helpers used by actor lookup, middleware, and sign-out. |

### 3.3 Shared top-bar dependencies inside `DashboardShell`

| Path | Relationship |
|---|---|
| `src/features/notifications/components/notification-bell.tsx` | Rendered in the shell top bar; owns the unread-count badge, notification panel, real-time subscription, and notification target navigation. The badge is not attached to a sidebar navigation item. |
| `src/features/notifications/components/notification-bell.module.css` | Styles the bell, unread badge, and panel. |
| `src/features/notifications/data/notification-service.ts` | Produces notification target URLs that navigate into dashboard routes, including attendance, announcements, and member profiles. |

### 3.4 Routes represented by, or structurally coupled to, the active menu

| Path | Relationship |
|---|---|
| `src/app/page.tsx` | Redirects `/` to `/dashboard`. |
| `src/app/dashboard/page.tsx` | Redirects `/dashboard` to `/home/dashboard`. |
| `src/app/home/page.tsx` | Redirects `/home` to `/home/dashboard`. |
| `src/app/home/dashboard/page.tsx` | Implements the sidebar's home destination and redirects actors without `reports.read` to `/dashboard/me`. |
| `src/app/dashboard/me/page.tsx` | Personal workspace/profile destination. |
| `src/app/dashboard/members/page.tsx` | Member/family destination via `ServiceModuleRoute`. |
| `src/app/dashboard/member/[id]/page.tsx` | Nested member profile; inherits the active state of `/dashboard/members` only indirectly through a different route and therefore does **not** mark that sidebar link active. |
| `src/app/dashboard/groups/page.tsx` | Redirects the older `/dashboard/groups` route to `/dashboard/members`. |
| `src/app/dashboard/attendance/page.tsx` | Attendance destination via `ServiceModuleRoute`. |
| `src/app/dashboard/visitation/page.tsx` | Visitation/follow-up destination. |
| `src/app/dashboard/activities/page.tsx` | Activities destination via `ServiceModuleRoute`. |
| `src/app/dashboard/reports/page.tsx` | Reports destination; server-loads a canonical permission-scoped dataset. |
| `src/app/dashboard/users/page.tsx` | User-management destination via `ServiceModuleRoute`. |
| `src/app/dashboard/users/[userId]/page.tsx` | Nested user profile route. It does not match the sidebar `/dashboard/users` active rule only if the path remains under that prefix; as written, it does match and keeps “المستخدمون” active. |
| `src/app/dashboard/announcements/page.tsx` | Announcement viewing/management destination. |
| `src/app/dashboard/servant-followup/page.tsx` | Destination used by the active sidebar; re-exports the hyphenated route page. |
| `src/app/dashboard/servant-follow-up/page.tsx` | Canonical implementation of the servant follow-up page. |
| `src/app/dashboard/settings/page.tsx` | Settings/backups destination via `ServiceModuleRoute`. |
| `src/app/dashboard/error.tsx` | Error boundary for failures under the dashboard layout, including authorization/data failures from linked pages. |

### 3.5 Compatibility/legacy dependencies

| Path | Relationship |
|---|---|
| `src/features/dashboard/components/service-module-route.jsx` | Client-side compatibility router used by members, attendance, activities, users, settings, and member profiles. It performs a second permission check using legacy permission names and imports `buildCSS` and content components from `dashboard-application.jsx`. |
| `src/features/dashboard/components/dashboard-application.jsx` | Contains a second complete sidebar (`NAV`, `.sb*` CSS, local page state, permission filtering, mobile overlay, account/footer, and logout). Its default `App` is not mounted by an app route in the inspected source, but named exports and `buildCSS` are live dependencies. |
| `src/features/dashboard/index.tsx` | Dynamically imports the default legacy `DashboardApplication`; no source file imports this index in the inspected repository. |
| `src/infrastructure/supabase/auth-bridge.ts` | Maps canonical database roles to the older role model and supplies default legacy permissions to `ServiceModuleRoute`. |
| `src/features/auth/authorization/permission-checker.ts` | Implements legacy `hasPermission()` plus group/member/submission scoping used by compatibility modules and the legacy sidebar. |
| `src/features/auth/authorization/role-definitions.ts` | Defines legacy role defaults and legacy permission labels. |
| `src/features/auth/types/auth-types.ts` | Defines the legacy `Role`, `Permission`, and `UserAccount` types. |
| `src/features/auth/components/access-denied-page.jsx` | Rendered when a compatibility module's legacy permission check fails. |
| `src/features/auth/components/topbar-auth.jsx` | Used by the unmounted default legacy application shell, not by the active shell. |
| `src/features/auth/components/user-management-page.jsx` | Reused by compatibility user management and the legacy application. |

### 3.6 Content-level navigation dependencies

| Path | Relationship |
|---|---|
| `src/features/dashboard/components/home-dashboard.tsx` | Contains permission-gated quick links and report links duplicating several sidebar destinations. |
| `src/features/dashboard/components/home-dashboard.module.css` | Styles home-dashboard quick navigation, not the sidebar itself. |
| `src/features/users/components/management-shell.tsx` | Provides the common page heading under the global shell. |
| `src/features/visitation/components/visitation-management.tsx` | Links from visitation rows to `/dashboard/member/[id]`. |
| `src/features/reports/data/reporting-service.ts` | Enforces `reports.read`, scopes report data, and exposes `reports.export` capability. |
| `src/features/announcements/data/announcement-service.ts` | Requires an active actor for viewing and `announcements.manage` for management actions. |
| `src/features/servant-follow-up/data/follow-up-service.ts` | Restricts all-servant follow-up views and writes to `system_owner`/`system_manager`. |
| `src/features/users/data/user-service.ts` | Enforces canonical permissions and role rules for user data/actions reached from dashboard routes. |
| `src/features/visitation/data/visitation-service.ts` | Enforces canonical visitation and attendance permissions. |
| `src/features/visitation/data/service-settings-service.ts` | Enforces canonical settings/visitation/attendance read permissions for service settings. |

### 3.7 Existing repository documentation that references the sidebar

- `HOME_PAGE_ANALYSIS.md`
- `reports-analysis/01_REPORTS_PAGE_STRUCTURE.md`
- `reports-analysis/02_VISIBLE_CONTENT.md`
- `reports-analysis/03_USER_WORKFLOW.md`
- `reports-analysis/04_FILTERS_AND_ACTIONS.md`
- `reports-analysis/07_UI_COMPONENT_INVENTORY.md`
- `reports-analysis/08_DESIGN_OBSERVATIONS.md`
- `docs/data-flow.md`
- `src/features/dashboard/README.md`

These files are documentation rather than runtime dependencies.

## 4. Component hierarchy and render flow

### 4.1 Server-to-client hierarchy

```text
RootLayout (src/app/layout.tsx)
└─ <html lang="ar" dir="rtl">
   └─ DashboardLayout or HomeLayout (server component)
      ├─ requireActiveActor()
      ├─ derive canManageServantFollowUp
      ├─ derive canViewVisitation
      ├─ derive canViewAllNotifications
      └─ DashboardShell (client component)
         ├─ mobile menu button
         ├─ conditional dashboard scrim
         ├─ <aside class="dashboard-sidebar">
         │  ├─ brand
         │  ├─ <nav aria-label="التنقل الرئيسي">
         │  │  ├─ section labels
         │  │  └─ Next.js <Link> items
         │  └─ account footer + sign-out button
         └─ <div class="dashboard-workspace">
            ├─ sticky top bar
            │  ├─ greeting/current user
            │  ├─ NotificationBell
            │  ├─ duplicate sign-out button
            │  └─ profile avatar link
            └─ <main class="dashboard-content">
               └─ route page children
```

### 4.2 Request and render sequence

1. `middleware.ts` calls `updateSession()` from `src/infrastructure/supabase/middleware.ts`.
2. Unauthenticated requests under `/home` or `/dashboard` are redirected to `/login`.
3. The matching server layout calls `requireActiveActor()`; inactive actors fail authorization rather than rendering the shell.
4. The layout derives three booleans from canonical actor roles/permissions and passes actor ID/name plus those booleans to the client shell.
5. `DashboardShell` reads the pathname with `usePathname()`, initializes drawer and sign-out state with `useState()`, filters two links at render time, and renders the page route as `children`.
6. Next.js `Link` performs client-side navigation. Each sidebar link also calls `setOpen(false)` so a mobile drawer closes after selection.
7. `DashboardShell` remains the shared wrapper while route children change within the same layout segment.

## 5. Active navigation inventory

### 5.1 Section: نظرة عامة

| Label | Icon | Route | Sidebar visibility | Destination authorization/business rule | Active state | Badge | Submenu |
|---|---:|---|---|---|---|---|---|
| الرئيسية | `⌂` | `/home/dashboard` | Always rendered for an active actor. | Page requires canonical `reports.read`; otherwise it redirects to `/dashboard/me`. | Exact route or any pathname beginning `/home/dashboard/`. | None | None |
| لوحتي الشخصية | `○` | `/dashboard/me` | Always rendered for an active actor. | Requires an active actor. Own profile and own servant-follow-up history are loaded. | Exact route or any pathname beginning `/dashboard/me/`. | None | None |

### 5.2 Section: الخدمة

| Label | Icon | Route | Sidebar visibility | Destination authorization/business rule | Active state | Badge | Submenu |
|---|---:|---|---|---|---|---|---|
| المخدومين والأسر | `♙` | `/dashboard/members` | Always rendered. | `ServiceModuleRoute` checks legacy `view_family_members`; data is scoped through the compatibility user/group mapping. | Exact route or `/dashboard/members/*`. The separate `/dashboard/member/[id]` profile route does not match this prefix, so no sidebar item is active there. | None | None |
| الحضور | `□` | `/dashboard/attendance` | Always rendered. | `ServiceModuleRoute` checks legacy `attendance_access`; underlying attendance services/APIs perform their own checks and scoping. | Exact route or `/dashboard/attendance/*`. | None | None |
| حالة الافتقاد | `◎` | `/dashboard/visitation` | Rendered only when canonical `member_follow_up.read` produces `canViewVisitation=true`. | Visitation data additionally enforces canonical `member_follow_up.read`; recording requires `member_follow_up.write`, and current-week state affects whether recording is allowed. | Exact route or `/dashboard/visitation/*`; query strings do not affect `usePathname()`. | None | None |
| الأنشطة | `◇` | `/dashboard/activities` | Always rendered. | `ServiceModuleRoute` checks legacy `view_family_members`. | Exact route or `/dashboard/activities/*`. | None | None |
| التقارير | `⌁` | `/dashboard/reports` | Always rendered. | `getReportingDataset()` requires canonical `reports.read`; export capability is separately based on `reports.export`. | Exact route or `/dashboard/reports/*`; report/group query parameters do not change active state. | None | None |

### 5.3 Section: الخدام

| Label | Icon | Route | Sidebar visibility | Destination authorization/business rule | Active state | Badge | Submenu |
|---|---:|---|---|---|---|---|---|
| المستخدمون | `♧` | `/dashboard/users` | Always rendered. | Compatibility route checks legacy `user_management`. Canonical user services separately require permissions such as `users.read`, `users.update`, `users.suspend`, and `users.assign_roles`; user creation specifically checks `system_manager`. | Exact route or any `/dashboard/users/*`, including user profiles. | None | None |
| الإعلانات | `📣` | `/dashboard/announcements` | Always rendered. | Any active actor can view the currently published/date-valid announcements. `announcements.manage` exposes management and protects create/update/delete/upload operations. | Exact route or `/dashboard/announcements/*`; URL hashes do not affect active state. | None | None |
| متابعة الخدام | `↗` | `/dashboard/servant-followup` | Only `system_owner` or `system_manager`. | The page's data service independently applies the same role restriction for all-servant reading and writing. `/dashboard/servant-followup` re-exports `/dashboard/servant-follow-up`. | Exact route or `/dashboard/servant-followup/*`. The alternate hyphenated URL `/dashboard/servant-follow-up` does not activate this link. | None | None |

### 5.4 Section: النظام

| Label | Icon | Route | Sidebar visibility | Destination authorization/business rule | Active state | Badge | Submenu |
|---|---:|---|---|---|---|---|---|
| الإعدادات | `⚙` | `/dashboard/settings` | Always rendered. | `ServiceModuleRoute` checks legacy `settings_access` and renders the compatibility backups/settings page. | Exact route or `/dashboard/settings/*`. | None | None |

### 5.5 Section and item behavior

- Section labels are plain `<p>` elements, not links or collapsible group controls.
- There are no submenus, disclosure states, breadcrumbs within the sidebar, nav-item badges, counters, or feature-flag fields in the active navigation array.
- Icons are text/Unicode glyphs inside `<i aria-hidden="true">`; there is no icon library dependency.
- All active menu links are static entries declared in `dashboard-shell.tsx`. Only visitation and servant follow-up are removed dynamically.
- The notification unread badge exists in the top bar's `NotificationBell`, not in the sidebar.

## 6. Active-state logic and routing integration

`DashboardShell` computes active state as:

```ts
pathname === href || pathname.startsWith(`${href}/`)
```

Consequences present in the code:

- nested URLs below the exact link prefix remain active;
- search parameters and hashes are ignored because `usePathname()` returns the pathname;
- `/dashboard/users/[userId]` keeps “المستخدمون” active;
- `/dashboard/member/[id]` does not keep “المخدومين والأسر” active because it is not nested under `/dashboard/members`;
- `/dashboard/servant-follow-up` does not activate the menu's `/dashboard/servant-followup` item despite rendering the same page;
- section labels never receive active state;
- active styling is visual only through the `active` class; links do not set `aria-current="page"`.

The active shell uses Next.js `Link` for navigation and `useRouter()` only for sign-out redirection. Compatibility modules also use `useRouter()` for member/profile transitions. The unmounted legacy shell uses local `page` state for internal modules and `window.location.assign()` for entries carrying an `href`.

## 7. State management

### 7.1 Active shell local state

`src/features/dashboard/components/dashboard-shell.tsx` owns two local booleans:

- `open`: whether the mobile sidebar has `is-open` and whether the scrim is rendered;
- `signingOut`: disables both shell sign-out buttons and changes their text while the request is running.

There is no context provider, Redux/Zustand store, URL parameter, cookie, local storage, or persisted collapse preference for the active sidebar. Tablet collapse is entirely CSS-driven by viewport width. Route changes close the mobile drawer only when a sidebar link's `onClick` runs; the code does not subscribe to pathname changes to close it.

### 7.2 Server-derived props

Both shared layouts derive:

- `canManageServantFollowUp`: `system_owner` or `system_manager`;
- `canViewVisitation`: canonical `member_follow_up.read`;
- `canViewAllNotifications`: `system_owner` or `system_manager` (in `HomeLayout`, the already-derived management boolean is reused).

These props are computed on the server from `CurrentActor`, then passed across the server/client boundary. The client does not fetch menu permissions independently.

### 7.3 Sign-out state and routing

Both the sidebar footer and top bar call the same `logout()` function:

1. set `signingOut=true`;
2. `POST /api/auth/sign-out`;
3. in `finally`, call `router.replace('/login')` and `router.refresh()`.

The redirect occurs even if the fetch rejects. There is no local error message and no code path that resets `signingOut` before navigation.

## 8. Layout, responsive behavior, RTL, and animation

### 8.1 Desktop: above 1023 px

- `.dashboard-sidebar` is fixed for the full block axis (`inset-block: 0`) with width `256px`, `z-index: 30`, a card background, and logical end border.
- Because the document is RTL, `inset-inline-start: 0` places it on the right.
- `.dashboard-workspace` uses `width: calc(100% - 256px)` and `margin-inline-start: 256px`, offsetting content from the right-side sidebar.
- The sidebar is a vertical flex container: brand, scrollable nav (`flex: 1; overflow-y: auto`), and account footer.
- The top bar is sticky at the top of the workspace with `z-index: 20`, below the sidebar.

### 8.2 Tablet: 768–1023 px

- The sidebar becomes a fixed `72px` icon rail.
- Brand copy, account copy, link labels, and section headings use `display: none`.
- Links are centered and the workspace becomes `calc(100% - 72px)` with a `72px` logical inline-start margin.
- This is not stateful or user-controlled collapse; it is a media-query breakpoint.
- The icon is `aria-hidden` and the label is `display:none`; no `aria-label` or tooltip is added to nav links. Therefore the collapsed links have no explicit accessible name in this state.
- The account avatar and logout button both remain in the narrow footer; only the account text container is hidden.

### 8.3 Mobile: at or below 767 px

- The workspace returns to full width with no sidebar margin.
- The sidebar returns to `256px` width but is moved off-canvas using `transform: translateX(110%)`.
- Because the interface is RTL and the sidebar is logically right-aligned, the positive X translation hides it to the right.
- Adding `.is-open` removes the transform.
- The fixed menu button appears at logical inline-start (right in RTL), `14px` from the top, with `z-index: 25`.
- When `open=true`, a full-viewport scrim is rendered with `z-index: 29`; the sidebar is above it at `z-index: 30`.
- The top bar receives extra logical inline-start padding (`64px 24px`) to make room for the menu button.
- Clicking the opener opens the drawer; clicking the scrim or a sidebar link closes it.
- There is no Escape-key handler, focus trap, focus return, body-scroll lock, dialog semantics, or `aria-expanded`/`aria-controls` relationship in the active drawer implementation.

### 8.4 Animation and motion preferences

- The mobile drawer transitions `transform` over `220ms ease-out`.
- Global interactive elements transition color, background, border, shadow, and transform over `180ms ease-out`.
- Active button/link presses scale to `0.98`; this includes navigation links.
- The page content stack uses a separate `page-in` animation (`180ms`) but the sidebar itself does not animate on desktop/tablet.
- `@media (prefers-reduced-motion: reduce)` reduces all animation/transition durations to `0.01ms`, limits animation iteration, and disables smooth scrolling.

### 8.5 Print behavior

The print media query hides `.dashboard-sidebar`, `.dashboard-topbar`, `.mobile-menu-button`, and selected page elements. It resets the workspace to full width with no margin and removes dashboard-content padding. Removing or renaming the shell must preserve this print layout contract.

## 9. Styling sources and design tokens

### 9.1 Styling mechanism

The active sidebar uses globally named CSS classes in `src/styles/globals.css`. It does not use Tailwind, CSS Modules, styled components, or an icon component library. `package.json` has no Tailwind dependency and the repository has no Tailwind configuration in the inspected source.

### 9.2 Tokens consumed by the shell

Tokens are CSS custom properties declared on `:root` in `src/styles/globals.css`:

- color: `--primary`, `--primary-hover`, `--secondary`, `--accent`, `--background`, `--surface`, `--card`, `--border`, `--divider`, `--danger`, `--text-primary`, `--text-secondary`, `--text-muted`;
- shadow/focus: `--shadow-subtle`, `--shadow-medium`, `--shadow-floating`, `--focus-ring`;
- typography: Google-hosted Alexandria (`400`, `500`, `600`) imported at the top of the stylesheet and applied globally.

The active item uses `--primary`, a hard-coded translucent primary background (`rgba(139,21,56,.07)`), and an `--accent` indicator. The account/avatar circles use `--primary`. The mobile scrim uses hard-coded `rgba(42,36,32,.24)`.

### 9.3 Global element rules affecting the sidebar

Global rules provide:

- `box-sizing: border-box`;
- 44px default minimum height for buttons and links;
- shared radii, typography, focus outlines, transitions, active scaling, and disabled opacity;
- `html` RTL direction;
- horizontal overflow suppression on `html, body`.

These are hidden styling dependencies because moving navigation into a CSS Module or a separate root could change the inherited behavior.

### 9.4 Compatibility CSS collision risk

`ServiceModuleRoute` injects the result of `buildCSS(false)` from `dashboard-application.jsx` into pages under the active shell. That CSS defines generic selectors and its own variables/classes, including `.main`, `.topbar`, `.content`, `.card`, buttons, and legacy `.sb*` navigation selectors. The active sidebar class names are distinct (`dashboard-sidebar`, `sidebar-*`), but both global and injected styles affect generic elements/classes. A replacement should not assume all child-page CSS is isolated.

## 10. Business logic, permissions, feature flags, and dynamic menus

### 10.1 Active menu filtering

Only two active menu entries are dynamically filtered:

- `/dashboard/servant-followup`: visible to `system_owner` or `system_manager`;
- `/dashboard/visitation`: visible with canonical `member_follow_up.read`.

No other active item has a visibility condition. There are no feature flags, environment-variable checks, remote menu definitions, experiment assignments, tenant-specific menus, database-driven labels, dynamic badge fields, or user-configurable ordering in `dashboard-shell.tsx`.

### 10.2 Visibility is not authorization

The server layouts require an active actor before rendering any sidebar, and destination services/pages apply their own checks. Hiding a link is not the security boundary. Several always-visible items can lead to redirects, access-denied UI, or authorization errors when the destination's requirements are not met.

Notable mismatches that exist in the current source:

- Home is always visible, but `/home/dashboard` requires canonical `reports.read` and redirects otherwise.
- Reports is always visible, but its data service requires canonical `reports.read`.
- Users is always visible, while the compatibility module checks legacy `user_management` and canonical services apply additional fine-grained permissions.
- Settings is always visible, while the compatibility module checks legacy `settings_access`.
- Members, attendance, and activities are always visible, while `ServiceModuleRoute` checks legacy permissions.

### 10.3 Two permission vocabularies

The repository contains two simultaneously used permission models:

1. **Canonical access control** in `src/features/access-control/*`, with permission codes such as `members.read`, `member_attendance.write`, `reports.read`, and `users.read`.
2. **Compatibility access control** in `src/features/auth/*` and `src/infrastructure/supabase/auth-bridge.ts`, with names such as `view_family_members`, `attendance_access`, `reports_access`, and `user_management`.

`auth-bridge.ts` maps canonical database roles into a legacy role and assigns `ROLE_DEFAULT_PERMISSIONS`; it does not pass the canonical actor's exact permission set into `ServiceModuleRoute`. A navigation replacement must preserve current behavior deliberately or consolidate this mapping as a separate authorization project; silently substituting one vocabulary for the other would change access behavior.

### 10.4 Data scoping

Compatibility modules use `filterGroupsForUser`, `filterMembersForUser`, and `filterSubmissionsForUser`. Non-admin compatibility users with assigned groups see only matching groups/members/submissions. Canonical reporting uses actor class assignments and grants managers broad scope. These scoping rules are destination business logic, not sidebar logic, but the sidebar is the main entry point to those modules.

## 11. Compatibility/legacy sidebar still present in the repository

`src/features/dashboard/components/dashboard-application.jsx` defines a second navigation system:

- local `NAV` array with “مساحة المستخدم”, “الخدمة”, and “الإدارة” sections;
- a `visibleNav` filter using legacy `hasPermission()`;
- local `page` active state rather than pathname matching;
- `window.location.assign()` for entries with routes;
- a fixed `260px` `.sb` sidebar on desktop;
- an off-canvas `.sb` plus `.sb-overlay` at `max-width:1023px`;
- local `mobileNavOpen` and dark-mode state;
- user role display, submission-week count, dark-mode toggle, and logout footer.

Its menu entries are not the same as the active menu. They include:

| Label | Icon | Route/local page | Legacy permission |
|---|---:|---|---|
| لوحتي الشخصية | `👤` | `/dashboard/me` | None |
| الإعلانات | `📣` | `/dashboard/announcements` | None |
| إدارة المستخدمين الجديدة | `🔐` | `/dashboard/users` | `user_management` |
| متابعة الخدام | `📈` | `/dashboard/servant-follow-up` | `user_management` |
| لوحة الإحصائيات | `📊` | local `dashboard` | `view_family_stats` |
| إدخال البيانات | `✏️` | local `entry` | `attendance_access` |
| سجل الأسابيع والتصدير | `📋` | local `history` | `reports_access` |
| إدارة الأعضاء | `👥` | local `members` | `view_family_members` |
| الأنشطة | `🎯` | local `activities` | `view_family_members` |
| إدارة الحسابات | `🔐` | local `users` | `user_management` |
| النسخ الاحتياطية | `💾` | local `backups` | `settings_access` |

No inspected app route imports the default legacy `App`, and no inspected source imports `src/features/dashboard/index.tsx`. However, deleting `dashboard-application.jsx` would break active routed pages because `service-module-route.jsx` imports named exports from it. Removing only the legacy `.sb*` JSX/CSS would require careful separation from `buildCSS` and those named components.

## 12. Hidden repository dependencies on the sidebar system

The following dependencies are easy to miss during replacement:

1. **Workspace geometry:** `.dashboard-workspace` width and `margin-inline-start` are hard-coupled to sidebar widths of 256px and 72px.
2. **Top-bar mobile spacing:** `.dashboard-topbar` reserves inline-start space for the fixed mobile menu button.
3. **Stacking order:** top bar `z-index:20`, menu button `25`, scrim `29`, sidebar `30`, and notification panel styles form a shared overlay system.
4. **Print CSS:** print output assumes the sidebar/top bar can be hidden and workspace offsets reset.
5. **RTL root:** logical positioning and the mobile `translateX(110%)` depend on the root RTL direction.
6. **Shared authentication boundary:** both `/home/*` and `/dashboard/*` layouts call `requireActiveActor()` and pass the same actor identity into the shell.
7. **Shared sign-out implementation:** the account footer and top-bar sign-out are duplicate controls using one local state/function.
8. **Notification navigation:** the adjacent top-bar notification center routes to dashboard targets and relies on the shell remaining mounted.
9. **Active-route assumptions:** prefix matching depends on current route naming; member profiles and the alternate servant-follow-up spelling already expose gaps.
10. **Mobile close behavior:** link clicks close the drawer through per-link `onClick`; it is not a router-level effect.
11. **Global CSS inheritance:** global button/link size, transitions, focus styles, typography, and RTL alignment affect the navigation.
12. **Compatibility permission checks:** several menu destinations can be visible before `ServiceModuleRoute` applies its legacy check.
13. **Compatibility CSS injection:** routed content imports `buildCSS(false)` from the legacy dashboard file even though the active sidebar uses global CSS.
14. **Duplicate route aliases:** `/dashboard/servant-followup` and `/dashboard/servant-follow-up` render the same page but interact differently with active-state logic.
15. **Redirect chain:** `/`, `/dashboard`, and `/home` converge on `/home/dashboard`; the Home link is therefore the effective landing destination.
16. **Content-level duplicate navigation:** `home-dashboard.tsx` exposes permission-gated shortcuts to attendance, visitation, members, and reports.
17. **Documentation/tests by convention:** existing analysis files describe the current sidebar dimensions and behavior. No dedicated sidebar test files were found in the inspected source.

## 13. Risks of removing the active sidebar

### 13.1 Functional risks

- Users lose the only persistent route list for most service modules.
- The mobile menu button and scrim become orphaned if only the `<aside>` is removed.
- The account identity and one of two sign-out controls disappear.
- Visitation and servant-follow-up visibility rules can be lost or broadened.
- Active-route feedback disappears, including correct prefix behavior for nested user routes.
- Mobile navigation can become unavailable if no replacement menu is introduced at the same time.

### 13.2 Authorization and business-logic risks

- Treating current visibility rules as complete authorization would expose links that still fail at the destination.
- Rebuilding visibility from only canonical permissions would change compatibility-module behavior.
- Rebuilding visibility from only legacy permissions would omit canonical role/permission logic and notification scope.
- Removing the server layouts while replacing navigation could bypass `requireActiveActor()` or lose actor props.
- Deleting `dashboard-application.jsx` as “old sidebar code” would break named imports used by active routes.

### 13.3 Layout and visual risks

- Keeping the workspace's 256px/72px offset after removing the sidebar leaves empty space.
- Removing the offset without revisiting content maximum widths and padding can materially change every dashboard page.
- Overlay `z-index` interactions can regress the notification panel or a replacement mobile menu.
- Print pages can retain incorrect margins or lose their current clean output.
- Generic compatibility CSS can conflict with new top-navigation class names such as `.topbar`, `.nav-item`, or `.content`.

### 13.4 Routing and usability risks

- A top bar with all current items may overflow at Arabic labels and intermediate widths.
- Changing route strings can break notification targets, quick links, redirects, and bookmarks.
- The two servant-follow-up spellings and the member-profile active-state gap may be accidentally preserved or inconsistently “fixed.”
- The active shell currently remains mounted across route transitions; moving navigation into individual pages would duplicate state and produce inconsistent behavior.

### 13.5 Accessibility risks

- A replacement can lose the current `<nav aria-label="التنقل الرئيسي">`, keyboard focus outline, 44px targets, and reduced-motion handling.
- Moving all links into hover-only dropdowns would make keyboard/touch navigation worse.
- Retaining the current collapsed icon-only behavior would retain unnamed-link accessibility issues unless labels are restored through accessible names.
- A new mobile menu still needs focus management and Escape behavior, which the current implementation does not provide.

## 14. Technical recommendations for a Top Navigation Bar replacement

These are migration recommendations; they are not descriptions of code already implemented.

### 14.1 Preserve the shell and server boundary first

Keep `src/app/dashboard/layout.tsx` and `src/app/home/layout.tsx` as authenticated server boundaries. Continue calling `requireActiveActor()` and pass an explicit navigation capability object plus actor identity into one shared client shell. Replace the visual `<aside>` within `DashboardShell` rather than moving navigation into route pages.

This preserves:

- authentication/account-state enforcement;
- canonical actor identity, roles, permissions, and notification scope;
- one persistent navigation instance across route transitions;
- the current top-bar notification and sign-out integration.

### 14.2 Extract navigation metadata without changing behavior

Move the active array into a typed module, for example `src/features/dashboard/navigation/dashboard-navigation.ts`, with fields for:

- stable ID;
- Arabic label;
- icon;
- route and route aliases/prefixes;
- section;
- visibility predicate/capability;
- optional overflow priority.

Initially reproduce the exact current visibility rules: only canonical visitation permission and manager/owner servant-follow-up role filtering. Do not infer new hiding rules from destination permissions during a layout-only migration.

### 14.3 Keep authorization independent of presentation

Continue enforcing permissions inside server pages, services, and API routes. A top navigation bar should consume capability data only to decide presentation; it must not replace `requirePermission()`, role checks, compatibility `hasPermission()`, Supabase/RLS protections, or data scoping.

Document and test the two existing permission vocabularies before attempting consolidation. A safe sequence is:

1. visual replacement with current behavior unchanged;
2. route/active-state normalization;
3. separate compatibility-to-canonical permission migration, with explicit access regression tests.

### 14.4 Recommended desktop information architecture

Use a semantic header containing:

- brand/home link;
- primary `<nav aria-label="التنقل الرئيسي">`;
- a limited set of top-level destinations or section-triggered menus;
- notification bell;
- account menu containing profile and sign-out.

The four existing sections can map to keyboard-operable dropdowns or a “more” overflow menu. Do not use hover as the only opening mechanism. Use buttons with `aria-expanded`, `aria-controls`, and clear focus behavior for menus. Preserve every current route exactly during the initial migration.

### 14.5 Responsive and mobile strategy

- At wide widths, display the highest-priority links and place the remainder in labeled section menus.
- At intermediate widths, use an overflow menu based on layout priorities rather than an unnamed icon-only rail.
- On mobile, use a menu button that opens a sheet or full-screen navigation panel containing all visible items and section labels.
- Add `aria-expanded`, `aria-controls`, Escape-to-close, focus trapping while modal, focus return to the opener, outside-click close, and body-scroll locking.
- Close the mobile menu on pathname change as well as item activation so programmatic navigation cannot leave it open.
- Retain at least 44px interactive targets and the current reduced-motion media behavior.

### 14.6 Active state and route aliases

Centralize active matching and set `aria-current="page"` on the selected destination. The matcher should explicitly account for:

- `/dashboard/member/[id]` belonging to Members;
- both existing servant-follow-up paths: `/dashboard/servant-followup` and `/dashboard/servant-follow-up`;
- query-parameter report states remaining under Reports;
- announcement hashes remaining under Announcements.

Preserve existing route URLs for bookmarks and notification targets. If one servant-follow-up spelling becomes canonical, keep a redirect for the other and update the menu/notification/link sources together.

### 14.7 Layout and CSS migration

- Remove fixed sidebar width/margin coupling together: replace `.dashboard-workspace` calculations with a full-width block layout below a sticky header.
- Recalculate `.dashboard-content` top/inline padding at all breakpoints.
- Replace sidebar-specific print selectors with the new header/navigation selectors while preserving full-width print content.
- Keep logical CSS properties for RTL and verify LTR resilience if ever required.
- Use new, uniquely scoped class names or a CSS Module to avoid the injected legacy `.topbar`, `.nav-item`, `.main`, and `.content` selectors.
- Continue using the existing root design tokens and Alexandria typography unless a broader design-system change is intentionally authorized.
- Preserve the existing `prefers-reduced-motion` rule and focus-visible treatment.

### 14.8 Account, notification, and sign-out preservation

Consolidate the repeated profile/sign-out affordances into an accessible account menu in the top navigation while keeping the same actor name/initial and the existing `POST /api/auth/sign-out` flow. Keep `NotificationBell` and `canViewAllNotifications` unchanged during the migration. Ensure the notification panel's stacking context remains above page content and does not collide with navigation menus.

### 14.9 Compatibility code precautions

Do not delete `src/features/dashboard/components/dashboard-application.jsx` during the navigation replacement. First extract the named page components and `buildCSS` consumed by `service-module-route.jsx` into dedicated modules, verify all compatibility routes, and only then remove the unused default legacy shell and `.sb*` rules.

Likewise, do not rename generic replacement classes to `.topbar`, `.nav-item`, `.main`, or `.content` while compatibility CSS is injected globally.

### 14.10 Verification matrix for the replacement

Verify at minimum:

- anonymous, inactive, standard servant, assigned leader/coordinator, secretary, `system_manager`, `system_owner`, and administrator-session actors;
- presence/absence of Visitation and Servant Follow-up under their exact current rules;
- destination denial/redirect behavior for Home, Reports, Users, Settings, Members, Attendance, and Activities;
- exact and nested active states, including member profiles, user profiles, report queries, announcement hashes, and both servant-follow-up route spellings;
- desktop, intermediate/tablet, mobile portrait/landscape, long Arabic names, browser zoom, and narrow viewport overflow;
- keyboard-only navigation, screen-reader names, focus order, menu open/close/focus return, Escape behavior, and `aria-current`;
- sign-out success and request failure behavior;
- notification badge, panel, real-time updates, and target navigation;
- reduced-motion mode and print output;
- compatibility pages that inject `buildCSS(false)`.

## 15. Current limitations relevant to replacement

The following are verified limitations of the existing active sidebar and should be treated as migration decisions rather than silently copied:

- tablet links lose an explicit accessible name when their text is `display:none` and their icon is `aria-hidden`;
- active links do not expose `aria-current`;
- the mobile drawer has no focus trap, Escape handler, focus return, body-scroll lock, or expanded/control attributes;
- `/dashboard/member/[id]` produces no active Members item;
- the hyphenated servant-follow-up alias produces no active menu item;
- most links are visible even when their destination later denies access;
- no user-controlled or persisted collapse state exists;
- there are no sidebar badges or submenus;
- two sidebar implementations and two permission vocabularies remain in the source tree.
