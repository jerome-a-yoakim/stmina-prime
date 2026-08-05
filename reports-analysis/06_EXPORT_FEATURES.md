# Export Features

## Permission model

Viewing requires `reports.read`. Export actions are rendered only when the loaded dataset says the actor has `reports.export`. Without it, both actions are replaced by “لديك صلاحية العرض فقط.” There is no separate permission check after the client has received the dataset because export generation occurs in the browser.

## Shared export metadata

Both export methods include:

- Current report title.
- Current report description.
- Generation date and time formatted in Arabic-Egypt locale using the Africa/Cairo time zone.
- Applied From/To range.
- Selected family name or “كل الأسر”.
- Selected member name or “كل المخدومين”.
- Membership status label.
- All four current KPI labels, values, and KPI hints when present.

Search text is not included in the exported filter metadata even though it affects exported rows.

## Excel

### Trigger

“تصدير Excel” in the current report header.

### Implementation

- Loads the `xlsx` package dynamically when clicked.
- Creates a new workbook entirely in the browser.
- Writes a filename of `<sanitized report title>-<YYYY-MM-DD>.xlsx`.
- Filename sanitization replaces Windows-invalid characters `\ / : * ? " < > |` with hyphens.

### Worksheet structure

#### Worksheet 1: “ملخص التقرير”

Always present. Row sequence:

1. Report title.
2. Report description.
3. Generation date/time.
4. Blank row.
5. “الفلاتر المطبقة”.
6. One row for each of the four exported filter descriptions.
7. Blank row.
8. “ملخص المؤشرات”.
9. Header row: Indicator, Value, Note.
10. One row per KPI.

Column widths are fixed at 32, 22, and 36 characters.

#### Worksheet 2: “البيانات”

Present only when the report defines columns. The first row contains visible column labels. Remaining rows contain visible table values in the same column order. Column width is `max(14, label length + 5)`.

Attendance Overview has no second worksheet because it intentionally has no detail columns. Every other report has the data worksheet.

### Formatting and limitations

- No workbook theme, logo, frozen rows, autofilter, formulas, number formats, conditional formatting, cell merges, protection, or print settings are applied.
- Dates and percentages are already formatted display strings rather than native spreadsheet date/percentage values.
- Only visible defined columns export; internal member ID is omitted.
- Current table order is preserved.
- There is no CSV export.

## PDF

### Trigger

“تصدير PDF” in the current report header.

### Actual behavior

This is a print workflow, not programmatic PDF-file generation. The application opens a blank popup, writes a standalone HTML document, and invokes `window.print()` when it loads. The user must select Save as PDF in the browser print dialog to produce a PDF.

### Included data

- Report title and description.
- Generation timestamp.
- Four exported filter descriptions.
- Four KPI blocks.
- Detail table when the report defines columns.
- If a defined table has no rows, one “لا توجد بيانات” row spanning all columns.
- Attendance Overview contains metadata and KPI blocks only.

### Print document formatting

- `<html lang="ar" dir="rtl">`.
- UTF-8.
- A4 landscape, 12 mm page margins.
- Tahoma/Arial fallback font.
- Burgundy heading and rule.
- Four-column KPI grid.
- Bordered table with cream headers and alternating row background.
- 11 px base text; 22 px report title; 18 px KPI values.
- All inserted text is HTML-escaped.

### Limitations

- Popup blocking prevents the workflow and produces an Arabic error message.
- Browser/OS print settings control the final filename, page breaks, headers/footers, scaling, and physical printing.
- No logo, page numbers, repeated metadata, custom PDF metadata, direct download, or server-generated PDF exists.
- Large tables rely on browser pagination.

## Print behavior of the live page

The Reports CSS also defines `@media print` for printing the live page directly through the browser. It hides the hero, filters, catalog, export actions, drill-downs, and accuracy notes; removes report-panel border/shadow; expands table overflow; and keeps KPIs in four columns. There is no visible direct Print button that invokes this path.

The normal “تصدير PDF” action uses its own popup HTML and does not print the live page DOM.

## Export progress and errors

- One `exporting` state tracks either Excel or PDF.
- While either is active, both buttons are disabled.
- Only the active button shows “جارٍ التجهيز…”.
- Every export attempt first clears the previous error.
- Errors are shown in a red-tinted inline banner beneath the report header.
- Popup failure has a specific message; other failures use the thrown message or the generic export error.

