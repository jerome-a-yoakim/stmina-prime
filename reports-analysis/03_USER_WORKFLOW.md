# Current User Workflow

## Entry and initial state

1. The user navigates to `/dashboard/reports` from the “التقارير” sidebar link.
2. The dashboard layout requires an active authenticated actor.
3. The Reports route additionally requires `reports.read`.
4. While the route is loading, the centered “جارٍ إعداد مركز التقارير…” state is shown.
5. The server loads only data within the actor’s family scope. System owners/managers receive all families; other users receive their assigned families.
6. The page opens with Attendance Overview selected.
7. Default filters are:
   - From: the twelfth-most-recent attendance session, or the earliest session when fewer than twelve exist.
   - To: the most recent session.
   - Family: all.
   - Member: all.
   - Status: active.
   - Search: blank.
8. The overview KPIs are calculated immediately from that scope.

## Changing filters

1. The user changes any filter.
2. Client state updates immediately; there is no Apply button and no server request.
3. The selected report is rebuilt from the already-loaded dataset.
4. KPIs, chart, table rows, row count, empty state, and future export contents update together.
5. Changing Family also resets Member to “all” and limits the member dropdown choices to that family.
6. Clicking Reset restores the initial last-12-session/active-member defaults.

## Selecting reports

1. The user clicks any report card.
2. The selected card changes visual state.
3. The current report panel updates in place; the URL and scroll position are not deliberately changed.
4. Current global filters remain unchanged.
5. There is no additional loading indicator because report calculation is synchronous and local.

## Overview drill-down flow

The overview contains four direct drill-down buttons. Each changes the selected report exactly like clicking the corresponding catalog card:

- View summary by date → Date Range Summary.
- Compare families → Family Attendance.
- Member details → Member Attendance.
- Absence follow-up → Consecutive Absence.

There is no back button. The user returns to Overview by selecting its catalog card.

## Excel export flow

1. Export buttons are available only with `reports.export`.
2. User clicks “تصدير Excel”.
3. Existing export error is cleared; export state becomes `excel`.
4. Both export buttons are disabled; the Excel button reads “جارٍ التجهيز…”.
5. The `xlsx` library is loaded dynamically.
6. A workbook is built from the selected report and current filters.
7. Browser download begins with an `.xlsx` filename based on report title and current ISO date.
8. Export state clears and buttons return to normal.
9. If generation/download throws, an error banner appears.

## PDF and print flow

1. User clicks “تصدير PDF”.
2. Existing export error is cleared; both buttons disable and the PDF button reads “جارٍ التجهيز…”.
3. A new browser window is opened.
4. A standalone Arabic RTL print document is written into the window.
5. On load, the browser print dialog opens automatically.
6. The user selects “Save as PDF” or a physical printer through the browser/OS dialog.
7. There is no automatic `.pdf` file creation or download from application code.
8. If popups are blocked, the page shows a message instructing the user to allow popups.

## Empty-data workflows

- If filters produce no detail rows, KPIs usually resolve to zero and the table is replaced by the empty-state message.
- If no attendance sessions exist, both date inputs default to blank and the Overview remains usable with zero KPIs.
- If the member/family dataset is empty, dropdowns retain only “all” choices and all report results are empty.
- If a report has rows but an individual value is missing, the cell shows an em dash.
- Overview intentionally has no table and therefore never presents the table empty state.

## Error scenarios

### Authentication/authorization

- Inactive or unauthenticated actors are stopped by the dashboard authorization layer before the Reports UI renders.
- Missing `reports.read` prevents the route dataset from loading.
- Missing `reports.export` does not block viewing; it replaces export actions with a read-only notice.

### Data loading

- A database query error is thrown from the server data service. The Reports component has no local retry/error panel for initial-load failures; handling falls to the application/Next.js error boundary.

### Export

- Blocked popup: explicit Arabic error banner.
- Other Excel/PDF exception: exception message when available, otherwise “تعذر تصدير التقرير.”
- Export errors persist until another export attempt clears them.

## Navigation flow

- Report switching is local state, not route navigation.
- Sidebar navigation leaves Reports and opens another module.
- Profile avatar opens `/dashboard/me`.
- Sign-out posts to `/api/auth/sign-out`, then replaces the route with `/login` and refreshes.
- Mobile hamburger opens the sidebar; tapping the scrim closes it; selecting a sidebar link also closes it.

## Delete flow

There is no delete action anywhere in the current Reports page. Reports are computed views, not persisted report records. No row, session, export, or report can be deleted from this interface, and no delete confirmation is present.

