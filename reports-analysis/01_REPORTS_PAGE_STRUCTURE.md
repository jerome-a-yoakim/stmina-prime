# Current Reports Page Structure

## Scope

This specification describes the current `/dashboard/reports` page, including the persistent dashboard shell around it. The page is Arabic and explicitly rendered right-to-left (`dir="rtl"`). It is a server-rendered route that loads a permission-scoped reporting dataset and passes it to one interactive client component.

## Layout hierarchy

```text
Dashboard frame
├─ Mobile menu button (mobile only)
├─ Sidebar
│  ├─ Brand
│  ├─ Main navigation
│  │  └─ Reports link (active on this route)
│  └─ Signed-in account + sign-out button
└─ Workspace
   ├─ Sticky top bar
   │  ├─ Greeting + user name
   │  └─ Notification bell + sign-out + profile avatar
   └─ Dashboard content container
      └─ Reporting Center
         ├─ Hero
         ├─ Global filter panel
         ├─ Report catalog
         │  ├─ Attendance category: 6 report cards
         │  ├─ Visitation category: 1 report card
         │  └─ Member Data category: 2 report cards
         └─ Current report panel
            ├─ Report header + export actions/read-only message
            ├─ Export error (conditional)
            ├─ KPI grid
            ├─ Drill-down panel (overview only)
            ├─ Visual summary (date summary only)
            ├─ Detail heading + row count (all except overview)
            ├─ Scrollable table or empty state (all except overview)
            └─ Data-accuracy notes (when supplied)
```

## Page-level sections

### 1. Dashboard shell

The Reports page sits inside the standard application shell. On desktop, the fixed sidebar is 256 px wide and the content workspace is offset by the same amount. Between 768 and 1023 px, the sidebar collapses to 72 px and hides text labels. Below 768 px, the sidebar becomes an off-canvas panel opened by a hamburger button and closed by a full-screen scrim.

The sticky top bar remains above the report content. The central content area is capped at 1320 px and uses the application’s standard responsive padding.

### 2. Hero container

A large rounded card at the top of the Reporting Center. It uses a light cream-to-white gradient, subtle border and shadow, and a decorative burgundy ring. Text is on one side; a translucent statistic card containing the number of accessible families is on the other. On mobile these stack vertically.

### 3. Global filter panel

A white rounded panel containing:

- Header block: title, explanatory sentence, and Reset button.
- Six-control responsive filter grid:
  - From date.
  - To date.
  - Family dropdown.
  - Member dropdown.
  - Membership-status dropdown.
  - Search field.

At large widths all six controls share one row. Below 1180 px the grid becomes three columns. Below 760 px it becomes one column.

### 4. Report catalog

This is navigation implemented as report cards, not tabs. Categories are vertically stacked. Every category has a heading and a report count, followed by a card grid.

```text
Attendance (6 reports)
[Overview] [Weekly] [Date summary]
[Families] [Members] [Consecutive absence]

Visitation (1 report)
[Visitation coverage]

Member Data (2 reports)
[Family/member directory] [Member data export]
```

Cards use three columns on large screens, two below 1180 px, and one below 760 px. Each card contains a symbolic icon, title, short description, and left arrow. The selected card receives a burgundy border/tint and inverted icon treatment.

### 5. Current report panel

A large white rounded container that changes content without route navigation.

- Header: eyebrow, report title, report description.
- Actions: Excel and PDF buttons if `reports.export` is available; otherwise a read-only message.
- KPI area: always four cards.
- Optional report-specific content:
  - Overview: drill-down action panel; no chart or table.
  - Date summary: one horizontal bar visualization and one table.
  - Other detailed reports: table only.
- Accuracy-note aside: normally two bullet points.

### 6. Tables

Tables live inside a rounded, bordered container with horizontal and vertical scrolling and a maximum height of 640 px. Tables have a minimum width of 780 px, sticky column headers, nowrap cells, row separators, and hover highlighting. There is no sorting UI, pagination, row selection, expandable row, or row action menu.

### 7. Chart

Only the Date Range Summary has a chart. It is a custom list of horizontal percentage bars, not a chart-library component. It displays up to ten report rows, each with a date label, burgundy/gold gradient bar, and attendance percentage.

### 8. Toolbars and export area

There is no standalone table toolbar. The global filter panel acts as the report-control toolbar. Export actions are positioned in the current report header and apply to the currently selected report and current filters.

### 9. Empty and loading states

- Route loading: centered circular glyph and “جارٍ إعداد مركز التقارير…” inside the standard route-state container.
- Empty table: search glyph, “لا توجد بيانات مطابقة”, and guidance to widen the date range or change family/status.
- Empty scoped dataset: hero and catalog still render; family count is zero; filters contain only their all/default options; overview KPIs resolve to zero; detailed tables show the empty state.
- Overview never shows a table empty state because its table is intentionally hidden.

## Elements that do not exist

The current page has no tabs, modal dialogs, confirmation dialogs, dropdown menus, context menus, pagination, table sorting controls, row deletion, report deletion, saved filters, saved reports, data refresh button, tooltips, breadcrumbs, or direct navigation to a separate report route.

