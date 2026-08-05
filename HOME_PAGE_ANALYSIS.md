# Home Page (Dashboard) Analysis

## 1. Scope and route identity

This document describes only the current Home statistics page and the shared shell visibly surrounding it.

- Canonical page URL: `/home/dashboard`.
- `/` redirects to `/dashboard`, and `/dashboard` redirects to `/home/dashboard`.
- `/home` also redirects to `/home/dashboard`.
- The interface is Arabic and right-to-left.
- The page is available only to an authenticated, active user. The inner statistics module additionally requires the legacy `view_family_stats` permission.
- The shared shell and the statistics module resolve the current user separately. The shell uses the server-side active actor; the module loads a browser-side compatibility user. This distinction matters because the visible shell permissions and the data scope inside the page come from two related but separate authorization representations.

The page is not a general operational home with tasks, announcements, or shortcuts. It is primarily an attendance/follow-up analytics dashboard inside the global navigation shell.

## 2. Design language and overall visual character

The surrounding application uses a restrained church/service-administration design system:

- warm off-white page background;
- white cards and sidebar;
- burgundy primary color;
- muted brown/gray secondary text;
- gold accent and focus color;
- fine warm-gray borders;
- subtle shadows;
- rounded controls and cards, generally 14–20 px radii;
- Alexandria as the effective interface font;
- generous spacing and low visual noise.

The embedded statistics module originated with an orange chart palette and Cairo typography, but its active design-system overrides restyle most structural elements to match the burgundy/cream application shell. The six chart series still use their own warm orange, red, and yellow colors. KPI color dots are overridden to gold, and KPI values are rendered in the standard text color rather than their original series colors. This makes the shell feel cohesive, but weakens the visual mapping between KPI cards and chart series.

## 3. Complete page layout

### 3.1 Desktop layout

The desktop page consists of a fixed right-hand sidebar and a main workspace to its left.

- **Sidebar:** fixed, full viewport height, approximately 256 px wide.
- **Workspace:** occupies the remaining width and is offset from the sidebar.
- **Top bar:** sticky at the top of the workspace, approximately 72 px minimum height.
- **Content container:** centered, maximum width approximately 1320 px, with large horizontal and vertical padding.
- **Main dashboard content:** filter/export toolbar, six KPI cards, and four charts.

The page does not display a dedicated content-level title such as “لوحة الإحصائيات”. The only heading-like identity is the active “الرئيسية” sidebar item; the top bar displays a welcome message and user name rather than the page name.

### 3.2 Tablet layout

At widths below roughly 1024 px:

- the sidebar collapses to an icon-only rail approximately 72 px wide;
- brand text, account text, navigation labels, and section headings are hidden;
- the workspace expands into the freed width;
- the six KPIs become a three-column layout between approximately 1024 and 1279 px, then two columns below 1024 px;
- the two-column chart grid becomes one column.

### 3.3 Mobile layout

Below roughly 768 px:

- the sidebar becomes a hidden off-canvas drawer;
- a fixed hamburger button appears near the top start edge;
- opening the menu displays the full 256 px sidebar plus a dimmed page scrim;
- tapping the scrim or a navigation link closes the drawer;
- the workspace uses the full viewport width;
- the top bar receives extra room for the mobile menu button;
- KPI cards are displayed in a single column;
- all charts are stacked vertically;
- the notification panel becomes a near-full-width fixed panel below the top bar.

## 4. Shared shell: every visible section and component

### 4.1 Sidebar brand

**Visible content**

- circular burgundy mark containing the Arabic letter “خ”;
- title: “خدمة مارمينا”;
- subtitle: “إدارة الخدمة”.

**Purpose**

Establishes application identity and visually anchors the persistent navigation.

**Data source**

All text and the letter mark are static interface content.

**Actions**

None. The brand is not a link.

### 4.2 Primary sidebar navigation

The navigation is divided into four labeled groups.

#### نظرة عامة

- **الرئيسية** (`/home/dashboard`) — the current page; shown as active.
- **لوحتي الشخصية** (`/dashboard/me`) — opens the signed-in user's personal workspace/profile.

#### الخدمة

- **المخدومين والأسر** (`/dashboard/members`) — member and family hierarchy/management.
- **الحضور** (`/dashboard/attendance`) — weekly attendance entry.
- **حالة الافتقاد** (`/dashboard/visitation`) — visitation/follow-up status; hidden unless the server-side actor has `member_follow_up.read`.
- **الأنشطة** (`/dashboard/activities`) — activity management.
- **التقارير** (`/dashboard/reports`) — historical reports and exports.

#### الخدام

- **المستخدمون** (`/dashboard/users`) — account management.
- **الإعلانات** (`/dashboard/announcements`) — announcement management/viewing.
- **متابعة الخدام** (`/dashboard/servant-followup`) — hidden unless the actor has the `system_owner` or `system_manager` role.

#### النظام

- **الإعدادات** (`/dashboard/settings`) — system settings and backups.

Each item has a small symbolic icon. The active item uses a pale burgundy background, burgundy text, and a slim gold marker.

**Purpose**

Provides persistent movement to all major service areas. Section labels communicate information architecture but do not navigate.

**Data source**

- labels, icons, and URLs are static;
- visibility of “حالة الافتقاد” comes from server-side permissions;
- visibility of “متابعة الخدام” comes from server-side roles;
- other links are displayed without equivalent per-link shell filtering, even though their destination pages may perform their own access checks.

**Actions and flow**

Selecting a link performs normal client-side navigation. On mobile it also closes the drawer. The Home item stays active for `/home/dashboard` and any nested URL below it.

### 4.3 Sidebar account footer

**Visible content**

- burgundy circular avatar with the first character of the user's full name;
- full name;
- status text “حساب نشط”;
- compact “خروج” button.

**Purpose**

Confirms the current account and provides persistent sign-out access.

**Data source**

The name and user ID come from the server-side active actor loaded by the Home layout. The “active” label is justified because inactive accounts are rejected before the shell is rendered.

**Actions**

“خروج” posts to `/api/auth/sign-out`, then replaces the current route with `/login` and refreshes the router. While processing, the button is disabled and shows an ellipsis.

### 4.4 Sticky top bar

The top bar stays visible while the content scrolls.

#### Welcome block

- small muted text: “مرحبًا بك”;
- signed-in user's full name below it.

Its purpose is account context, not page identification. The data comes from the server-side active actor.

#### Notification bell

- bell icon;
- unread badge when unread notifications exist, capped visually at `+99`;
- clicking opens the notification center.

The notification panel displays:

- heading “مركز الإشعارات”;
- unread count;
- for owners/managers, a toggle between “إشعاراتي” and “كل النظام”;
- “تحديد الكل كمقروء” when viewing personal notifications and unread items exist;
- loading, empty, error/retry, or notification-list state;
- for every notification: type icon, title, message, relative time, and unread dot.

Notification types are information, success, warning, and important. Data is loaded from `/api/notifications` and refreshed in real time for changes addressed to the current user through a Supabase channel.

Actions:

- toggle panel open/closed;
- close by clicking outside;
- switch personal/system scope when authorized;
- mark every personal notification as read;
- retry a failed load;
- select a notification, mark it read when applicable, close the panel, and navigate to its `targetUrl`.

#### Top-bar sign-out

A full “تسجيل الخروج” button performs the same flow as the sidebar “خروج” button. It changes to “جارٍ الخروج…” and becomes disabled during the request.

#### Profile avatar link

A circular avatar containing the first character of the user's name links to `/dashboard/me`.

### 4.5 Main content loading, failure, and denial states

Before the normal dashboard appears, the inner module performs its own client-side load.

- **Loading:** centered circular ellipsis and “جارٍ تحميل بيانات الخدمة…”.
- **Load error:** centered exclamation mark and the returned error message. No retry action is provided on this state.
- **Access denied:** the shared access-denied component is shown if the compatibility user lacks `view_family_stats`; its Home action routes back to `/home/dashboard`, which is the same URL and therefore does not give the user a useful escape path.
- **No submissions:** a centered chart icon and “أدخل بيانات أسبوعية لتظهر الإحصائيات”. The filter, export control, KPI cards, and all charts are absent.

## 5. Dashboard content: every visible section and component

The normal content is rendered only when at least one weekly attendance submission exists.

### 5.1 Family filter and export toolbar

**Visible content**

- family selector, defaulting to “جميع الأسر”;
- one option for every active, in-scope family/group;
- ghost-style button: “🖨️ تصدير PDF”.

**Purpose**

The selector changes the statistical population for the main time series, KPI cards, radar chart, and doughnut chart. The button creates a printable snapshot of the latest week.

**Data source**

Family options come from the Supabase `groups` table, ordered by `sort_order`, converted to the compatibility shape, scoped to the current compatibility user's assigned groups, and then restricted to active groups.

**Actions and exact behavior**

- Choosing a family immediately recalculates the KPI cards, weekly line chart, radar chart, and doughnut chart using active members of that family.
- “جميع الأسر” uses all active, in-scope members.
- Export opens a new browser window, builds an Arabic print page, and triggers the browser print dialog after a short delay. The user can then print or save as PDF.
- The exported table contains all six metrics for the latest submission: metric name, positive-record count, and percentage.

**Important limitation**

The PDF export ignores the selected family and always reports the complete already-scoped member collection. It also uses the latest raw submission rather than the filtered dashboard dataset. The family-comparison bar chart also ignores this selector by design/implementation.

### 5.2 KPI card grid

Six cards appear, one per weekly boolean metric:

1. **حضور الخدمة** — service attendance.
2. **حضور القداس** — Mass attendance.
3. **خدمة القداس** — service during Mass.
4. **الأعتراف** — confession (spelling is reproduced exactly as the current UI/data key).
5. **الأفتقاد التيليفوني** — telephone follow-up.
6. **الأفتقاد المنزلي** — home follow-up.

Each card displays:

- a small colored/gold dot and metric label;
- the latest week's count;
- the latest week's percentage of active members in the selected population;
- when a prior week exists and the percentage changed, an up/down arrow plus the absolute percentage-point difference;
- a horizontal progress bar whose width equals the latest percentage.

No trend is displayed when there is only one week or when the current and prior percentages are equal.

**Purpose**

Provides the fastest current-week summary and a basic week-over-week direction signal.

**Data source and calculation**

- latest and prior weeks are the last two items returned from `attendance_sessions`, which are ordered ascending by `attendance_date`;
- records come from `attendance_records`;
- only records belonging to currently active members in the selected family scope are counted;
- percentage = positive records / number of active members in the selected population, rounded to the nearest whole percent;
- trend = latest rounded percentage minus previous rounded percentage.

**Actions**

No direct action. Cards lift slightly on hover.

### 5.3 Weekly indicator development line chart

**Title:** “📈 تطور المؤشرات الأسبوعية”.

**Layout**

This is the first chart and spans the full chart-grid width on desktop.

**Displays**

- one line for each of the six metrics;
- horizontal axis: localized display date for each attendance session;
- vertical axis: raw positive-member count, not percentage;
- grid, point markers, legend, and hover tooltip.

**Purpose**

Shows how each attendance/follow-up count changes over the complete recorded weekly history for the selected family scope.

**Data source**

All ordered attendance sessions and their records, filtered to active members in the selected population.

**Actions**

The user can hover chart points to inspect tooltip values. There are no date-range controls, drill-down links, or line visibility toggles.

### 5.4 Family comparison bar chart

**Title:** “📊 مقارنة الأسر (آخر أسبوع)”.

**Displays**

- one category per active, in-scope family;
- family labels have the word “أسرة” removed where present;
- three side-by-side bars per family:
  - حضور الخدمة;
  - حضور القداس;
  - خدمة القداس;
- vertical axis: raw positive-member count;
- the latest weekly submission only;
- grid and hover tooltip.

The implementation calculates all six metrics and each family's active-member total, but only the first three metrics are rendered. Family size is not displayed or used to normalize the values.

**Purpose**

Compares headline participation counts across families for the latest week.

**Data source**

Latest attendance submission, active groups, and active members grouped by `group_id`, all already limited to the current compatibility user's data scope.

**Actions**

Hover to inspect values. The family selector does not alter this chart.

### 5.5 Latest-week radar chart

**Title:** “🕸 صورة شاملة (آخر أسبوع)”.

**Displays**

- six axes, one per metric;
- a filled polygon connecting the latest whole-number percentages;
- a fixed 0–100 radial scale;
- hover tooltip formatted as a percentage.

**Purpose**

Provides a shape-based summary of relative strength and weakness across all six metrics for the selected family scope.

**Data source**

The same latest-week percentages already displayed in the six KPI cards.

**Actions**

Hover to inspect values. No drill-down.

### 5.6 Doughnut chart labeled activity distribution

**Title:** “🥧 توزيع الأنشطة (آخر أسبوع)”.

**Displays**

- six slices;
- each slice is the latest raw count for one of the same attendance/follow-up metrics;
- numeric labels on slices;
- legend and hover tooltip.

**Purpose as currently implied**

The title suggests distribution of member activities.

**Actual data source and meaning**

This chart does **not** use activities or member-activity assignments. It uses the same six attendance/follow-up counts as the KPI cards. Because the six boolean metrics are not mutually exclusive, the slices are not parts of a single whole. A member may contribute to several slices. Consequently, the doughnut/pie metaphor is semantically misleading.

**Actions**

Hover to inspect values. No drill-down.

## 6. End-to-end data lineage

### 6.1 Shell identity and permissions

Before rendering the shell, the server requires an active actor.

- Authentication identity comes from the Supabase session, or from the special administrator session path.
- Profile state comes from `users`.
- system roles come from `user_roles` joined to `roles`.
- permissions come from role/permission relationships.
- current class assignments come from `user_class_assignments` within their active date range.

This actor supplies the visible name, avatar initial, sidebar capability visibility, and system-wide notification capability.

### 6.2 Inner module load

On the client, the Home module loads the following in parallel:

- compatibility user via Supabase Auth plus `users`, `user_class_assignments`, and `user_roles`;
- every group from `groups`;
- every member from `members`, plus links from `member_activities`;
- all weekly sessions from `attendance_sessions`;
- all records belonging to those sessions from `attendance_records`;
- all activities;
- all responsible-servant assignments through `/api/family-servants`.

Only the compatibility user, groups, members, and submissions are needed to render this Home page. Activities, member-activity links, and responsible-servant assignments are loaded but not used by the Home dashboard.

### 6.3 User scoping

The compatibility bridge maps system roles into a legacy role:

- owner/manager -> admin;
- coordinator/main servant -> class leader;
- secretary -> secretary;
- otherwise -> servant.

The inner `view_family_stats` check uses default permissions for that mapped legacy role rather than the server actor's actual resolved permission list.

Data scope then works as follows:

- admin users see all loaded data;
- users with no assigned groups also see all loaded data;
- otherwise, groups are filtered by assigned **group name**;
- members are filtered by the IDs of those allowed groups;
- each submission remains present, but its records are filtered to allowed member IDs.

This means the selector and statistics never intentionally expose families outside the compatibility user's scope. However, “no assignments” currently behaves as unrestricted access rather than no access.

### 6.4 Metric field mapping

The UI's Arabic keys map to boolean columns in `attendance_records`:

| UI metric | Database column |
|---|---|
| حضور الخدمة | `service_attended` |
| حضور القداس | `mass_attended` |
| خدمة القداس | `mass_service` |
| الأعتراف | `confession` |
| الأفتقاد التيليفوني | `phone_follow_up` |
| الأفتقاد المنزلي | `home_follow_up` |

## 7. User actions and navigation flow

### Entry flow

1. User visits `/`, `/dashboard`, `/home`, or `/home/dashboard`.
2. Redirects converge on `/home/dashboard`.
3. Session middleware refreshes/checks the Supabase session.
4. The Home layout requires an active account and renders the shell.
5. The inner module performs a second user/data load.
6. The user sees loading, error, access denied, no-data, or the dashboard.

### On-page analytical flow

1. Review the six latest-week KPI cards.
2. Optionally select a family.
3. Review weekly trends in the line chart.
4. Compare families in the bar chart.
5. Review the latest metric profile in the radar chart.
6. Optionally open the print dialog from “تصدير PDF”.

### Navigation exits

- sidebar links open their respective service modules;
- top-bar or sidebar profile controls lead to `/dashboard/me`;
- a notification leads to its stored target URL;
- either sign-out control leads to `/login` after sign-out;
- mobile menu opens/closes without changing route.

There are no content-level shortcuts from a KPI or chart to attendance entry, reports, a family, or a member list.

## 8. ASCII wireframe

The wireframe is shown in logical RTL reading order. On the actual desktop page the sidebar is fixed on the right.

```text
┌──────────────────────────────────────────────────────────────────────────────┬──────────────────────────┐
│ STICKY TOP BAR                                                               │ FIXED SIDEBAR            │
│ [avatar → profile] [تسجيل الخروج] [🔔 notifications]      مرحبًا بك / NAME  │ [خ] خدمة مارمينا         │
├──────────────────────────────────────────────────────────────────────────────┤     إدارة الخدمة         │
│                                                                              ├──────────────────────────┤
│ MAIN CONTENT                                                                 │ نظرة عامة                │
│                                                                              │  ⌂ الرئيسية (active)     │
│ [جميع الأسر ▼]  [🖨 تصدير PDF]                                              │  ○ لوحتي الشخصية         │
│                                                                              │                          │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                                 │ الخدمة                   │
│ │ KPI metric │ │ KPI metric │ │ KPI metric │                                 │  ♙ المخدومين والأسر      │
│ │ count / %  │ │ count / %  │ │ count / %  │                                 │  □ الحضور                 │
│ │ trend/bar  │ │ trend/bar  │ │ trend/bar  │                                 │  ◎ حالة الافتقاد*         │
│ └────────────┘ └────────────┘ └────────────┘                                 │  ◇ الأنشطة                │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                                 │  ⌁ التقارير               │
│ │ KPI metric │ │ KPI metric │ │ KPI metric │                                 │                          │
│ │ count / %  │ │ count / %  │ │ count / %  │                                 │ الخدام                    │
│ │ trend/bar  │ │ trend/bar  │ │ trend/bar  │                                 │  ♧ المستخدمون            │
│ └────────────┘ └────────────┘ └────────────┘                                 │  📣 الإعلانات             │
│                                                                              │  ↗ متابعة الخدام*         │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │                          │
│ │ 📈 Weekly indicator development — six-line time series                  │ │ النظام                   │
│ └──────────────────────────────────────────────────────────────────────────┘ │  ⚙ الإعدادات              │
│                                                                              │                          │
│ ┌──────────────────────────────────┐ ┌─────────────────────────────────────┐ │                          │
│ │ 📊 Family comparison             │ │ 🕸 Latest-week radar               │ │                          │
│ │ three count series               │ │ six percentage axes                │ │                          │
│ └──────────────────────────────────┘ └─────────────────────────────────────┘ │                          │
│                                                                              ├──────────────────────────┤
│ ┌──────────────────────────────────┐                                         │ [N] NAME                 │
│ │ 🥧 “Activity distribution”       │                                         │ حساب نشط       [خروج]    │
│ │ actually six metric counts       │                                         │                          │
│ └──────────────────────────────────┘                                         │                          │
└──────────────────────────────────────────────────────────────────────────────┴──────────────────────────┘

* Permission/role dependent.
```

At normal desktop width, the line chart spans both chart columns, followed by the bar and radar charts side by side. The doughnut chart occupies the first cell of the following row, leaving the second cell empty. At tablet/mobile widths all charts stack into one column.

## 9. Duplicated, misleading, or unnecessary elements

### 9.1 Clearly duplicated controls

- **Sign-out appears twice:** a “خروج” control in the sidebar footer and a full “تسجيل الخروج” control in the top bar. Both execute exactly the same operation.
- **User identity appears three times:** sidebar account, top-bar welcome block, and top-bar avatar. Some repetition is useful for global context, but all three together consume space without adding different information.
- **Profile navigation appears twice:** “لوحتي الشخصية” in the sidebar and the top-bar avatar link.

### 9.2 Repeated analytical content

- KPI cards, the radar chart, and the doughnut chart all visualize the same latest six metrics.
- The KPI cards already provide count, percentage, trend, and progress. The radar adds only shape comparison; the doughnut adds no valid part-to-whole meaning.
- The latest point in the weekly line chart repeats each KPI count, though the historical context makes this repetition useful.

### 9.3 Misleading or incomplete sections

- **“توزيع الأنشطة” is mislabeled.** It does not display activities and its values are overlapping boolean outcomes, so a pie/doughnut is not an appropriate encoding.
- **Family comparison uses raw counts.** Larger families are likely to appear better solely because they have more active members. The implementation computes family totals but does not show or use them.
- **Family comparison renders only three of six prepared metrics.** The title does not state that it is a partial comparison.
- **No page heading or reporting-period label** appears above the dashboard. Users must infer that “latest” means the newest attendance session.
- **The filter's scope is inconsistent.** It changes KPIs, line, radar, and doughnut, but not the bar chart or PDF.
- **PDF export wording is imprecise.** It opens printing; it does not directly generate/download a PDF file.
- **The access-denied Home action is circular.** It routes to the same page.
- **The inner load-error state lacks retry.** A transient failure requires a manual page refresh.

### 9.4 Unnecessary data work for this page

- all activities are fetched but not used;
- member-activity relationship rows are fetched as part of member loading but not used;
- responsible-servant assignments are fetched but not used;
- identity/role/group-assignment data is resolved once for the shell and again through the compatibility bridge;
- all attendance history and records are loaded client-side even though the first visible decision may only need summarized data.

### 9.5 Layout inefficiency

- With four chart cards in a two-column grid and the line chart spanning both columns, the final doughnut chart sits alone with an empty desktop grid cell.
- The filter/export row has no label, date context, or grouping container, making it visually detached from what it controls.

## 10. Improvement suggestions that preserve the current design language

### Highest priority: clarify meaning and scope

1. Add a compact page header above the toolbar:
   - title “لوحة الإحصائيات”;
   - subtitle identifying the selected family and latest recorded week;
   - keep Alexandria, burgundy text, muted subtitle, and generous whitespace.
2. Make the family selector's scope explicit and consistent:
   - either apply it to every dashboard visualization and export;
   - or label the family-comparison chart “مقارنة كل الأسر” and visually separate it as a global section;
   - export exactly the currently selected scope, or offer a clear “النطاق الحالي / كل الأسر” export choice.
3. Rename “تصدير PDF” to “طباعة / حفظ PDF” if it continues to open the print dialog.
4. Display the actual latest session date beside “آخر أسبوع”; do not rely on array position alone in the visible copy.

### Improve analytical correctness

5. Replace the doughnut chart. Best options while keeping the existing card style:
   - a compact latest-week horizontal bar chart for the six metrics; or
   - a true member-activity distribution sourced from activity assignments, if activities are genuinely important on Home.
6. Normalize family comparison to percentages and optionally expose raw counts in tooltips: `positive / active family members`. This makes differently sized families comparable.
7. Either render all six family-comparison metrics with a metric selector, or explicitly label the chart as attendance-only and keep the three attendance-related series.
8. Preserve consistent series colors across KPI dots, progress bars, legends, and charts. The warm six-color palette can coexist with the burgundy shell if used only for data encoding.
9. Consider removing the radar chart if simplicity is preferred. The KPI cards plus a corrected horizontal comparison already communicate the same information more accessibly.

### Improve task flow

10. Add restrained drill-down actions without turning the page into a control panel:
    - KPI/card click -> filtered reports;
    - family bar click -> that family's member/report view;
    - empty state primary action -> attendance entry;
    - secondary link -> reports/history.
11. Add a date-range control for the line chart, such as 4, 8, 12 weeks, and all history.
12. Add a retry button to the inner load-error state.
13. Send an unauthorized user to a page they can access rather than back to the same Home URL.

### Reduce duplication and improve hierarchy

14. Keep one prominent sign-out control. A good fit for the current language is to retain the compact sidebar account action on desktop and place sign-out inside an avatar/account menu on smaller screens.
15. Simplify top-bar identity: show either the welcome/name block or the avatar identity affordance, while retaining the sidebar account summary.
16. Group the family selector, reporting-period text, and export action into a low-emphasis toolbar card using the existing white surface, warm border, and 14–18 px radius.
17. If the radar is retained and the doughnut is removed, use the freed space for a small “needs attention” list based on low latest percentages or negative week-over-week changes. Use the existing muted cards and semantic warning color.

### Improve performance and authorization consistency

18. Provide a Home-specific data loader that fetches only user scope, groups, active-member counts, and attendance aggregates required by this page.
19. Do not load activities, member-activity links, or servant assignments until a page actually needs them.
20. Use one authorization model for both shell visibility and Home access. The Home permission should reflect the actor's actual resolved permissions, not only defaults inferred from a mapped legacy role.
21. Scope data by stable group IDs rather than group names, and define “no assigned groups” deliberately. For non-admin accounts it should not silently mean unrestricted access unless that is an explicit policy.
22. Prefer server-calculated aggregates or a dedicated reporting endpoint when history grows, while preserving the same cards and charts in the UI.

### Accessibility and responsive refinements

23. Add a visible label to the family selector and a concise summary for screen readers describing the selected population and week.
24. Provide a table or textual fallback for chart values, especially for the six-line chart and radar chart.
25. Ensure charts do not depend on color alone; use distinct line patterns/markers and clear tooltip/legend names.
26. On tablet icon-only navigation, add reliable tooltips or accessible labels so hidden link text remains discoverable.
27. Keep the current 44 px touch targets, focus ring, reduced-motion behavior, and single-column mobile stacking; these are strong parts of the existing design language.

## 11. Recommended redesigned information hierarchy

A redesign that remains recognizably the same product should use this order:

1. **Page identity:** “لوحة الإحصائيات”, latest session date, selected scope.
2. **Controls:** labeled family filter, period control, print/save action.
3. **Current snapshot:** six KPI cards.
4. **Historical context:** full-width weekly trend chart.
5. **Comparative context:** percentage-based family comparison.
6. **Optional diagnostic summary:** either the radar chart or an attention list, not both a radar and a misleading pie.
7. **Direct next step:** subtle links to attendance entry and reports.

This preserves the current white-card, burgundy-and-gold, rounded, spacious visual language while making the page easier to understand, more internally consistent, and more useful as a true Home dashboard.
