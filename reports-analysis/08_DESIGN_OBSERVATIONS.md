# Objective Design and UX Observations

This document records the current experience only. It does not prescribe redesign solutions.

## Strengths

- The page is consistently Arabic RTL from the root container through exports.
- Visual styling matches the surrounding application: burgundy, cream, white cards, Alexandria typography, rounded corners, and restrained shadows.
- The information hierarchy is clear: introduction, filters, report selection, then report output.
- Reports are grouped into understandable operational categories.
- Selected-card styling makes the current report visible in the catalog.
- Filters update immediately and persist when switching reports, supporting comparison without re-entry.
- The Family → Member dependency prevents selecting a member outside the chosen family.
- Every report presents four summary KPIs before detail.
- Missing attendance is explicitly separated from recorded absence, avoiding a significant interpretation error.
- The Overview is concise and provides direct drill-down paths rather than duplicating detailed tables.
- Tables have sticky headers, bounded height, and horizontal scrolling for wide administrative data.
- Export permission has an explicit read-only state rather than disabled unexplained controls.
- Empty and loading states use plain language and preserve the page’s design language.
- Excel and print output contain title, time, filters, and KPI context.
- Responsive breakpoints cover desktop, tablet, and mobile layouts.

## Weaknesses and friction

- Nine report cards remain visible above every report, producing substantial vertical travel between the catalog, filters, and results.
- Report selection updates content in place but does not change the URL, so a specific report/filter combination cannot be bookmarked, shared, or restored with browser navigation.
- There is no Apply button or loading feedback because calculations are local; on a larger dataset, any delay would have no explicit processing state.
- Global filters are shown for every report even when a report does not use them. Directory and Member Data rows ignore both date fields, while those dates still appear in exports.
- The membership-status control appears active on Consecutive Absence and Visitation Coverage, but both reports force active members internally.
- Search affects rows but is missing from export filter metadata.
- Search matches only full name, personal phone, family phone, address, and family name. It does not match school, activities, additional family phone, servant, or member ID.
- Native date controls depend on browser rendering and locale behavior.
- Detailed tables have no sorting, pagination, column control, or fixed first column. Wide tables require horizontal navigation.
- Rows use array index as the React key, which is stable enough for static recalculation but does not represent row identity.
- Empty-state guidance mentions changing family and membership status even when the active report also depends heavily on dates or forcibly ignores status.
- The initial-load data error path has no Reports-specific recovery or retry surface.
- The PDF label implies direct PDF export, while the actual interaction is a popup followed by the browser print dialog.
- Popup blocking is detected only after the user attempts PDF export.
- The export progress state can be very brief for PDF because it clears immediately after the popup document is written, before printing completes.
- The overview can export a summary workbook/PDF with no detail data, which is valid but behaviorally different from every other report.

## Duplicate or repeated information

- A selected report’s title and description appear both in its catalog card and again in the current report header. The repetitions serve different contexts—navigation and result identity—but are visually present on the same page.
- The accessible-family count in the hero can also appear as the Families KPI in directory/family reports, although the two counts can differ after filters.
- The Date Summary chart and table both expose per-date attendance rate. The chart supports visual comparison; the table supplies exact operational totals.
- Many attendance reports repeat attendance rate, present count, and recorded-absence concepts at different aggregation levels.
- Export metadata repeats filter values already visible in the page controls; this repetition exists in the exported artifact, not simultaneously in the live result panel.

## Unused or low-information space

- The hero has a minimum height of 190 px and contains only one text block plus one statistic.
- Categories containing one or two cards occupy a full catalog row even though the grid supports three columns.
- Overview has no table/chart and therefore leaves the report panel relatively short after its KPI and drill-down blocks.
- On large screens, very short tables still sit inside a container designed for up to 640 px height.

## Workflow ambiguity

- “تقرير الحضور الأسبوعي” can include multiple selected sessions and is effectively a detailed record report rather than a single-week screen.
- “من تاريخ” in Visitation Coverage controls visitation inclusion but not the beginning of the absence history, whereas “إلى تاريخ” affects both.
- Absence priorities are words in ordinary table cells rather than visually differentiated statuses.
- The responsible servant can mean a visitation recorder, direct member servant, or family servant depending on the row/report, without an on-screen source distinction.
- Historical family labels use the member’s current family, disclosed only in the accuracy note below the table.
- Missing attendance records disappear entirely from Weekly Attendance rows but appear as counts in aggregate reports.

## UX inconsistencies

- Excel produces a direct file download; PDF opens a print dialog.
- Date and status filters remain interactive-looking on reports that ignore some of their effects.
- Only Overview has drill-down actions; other reports rely exclusively on the catalog for lateral navigation.
- Only Date Summary has a visual chart; all other reports are KPI-plus-table.
- Priority and coverage values are plain text despite the application having general status-badge styles elsewhere.
- The route loading state is a static glyph rather than the skeleton-style structure of the eventual page.

## Simplification opportunities evident from the current state

The following are observations of where complexity is concentrated, not proposed remedies:

- Persistent report catalog height.
- Six universal controls with report-specific relevance differences.
- Repeated aggregation concepts across attendance reports.
- Wide member-directory/export schemas.
- Two different meanings under the PDF/print interaction.
- Multiple servant-source fallbacks represented as one displayed field.
- Accuracy caveats located after, rather than alongside, affected results.

