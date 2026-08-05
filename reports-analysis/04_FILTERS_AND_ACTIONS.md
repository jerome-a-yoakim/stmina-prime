# Filters and Actions

## Global filters

All filters update on change and affect the open report plus its Excel/PDF output. There is no Apply button.

| Control | Type | Default | Purpose | Dependencies | Output |
|---|---|---|---|---|---|
| من تاريخ | Date input | Date of twelfth-most-recent session; otherwise earliest; blank if none | Inclusive lower attendance/visitation date boundary | `max` equals current To value | Filters attendance sessions and visitation records |
| إلى تاريخ | Date input | Most recent session; blank if none | Inclusive upper date boundary | `min` equals current From value | Filters attendance sessions; limits absence history; filters visitations |
| الأسرة | Select | “كل الأسر” | Restricts members and family report rows | Options come from permission-scoped groups | Rebuilds report; resets Member filter to all; restricts member options |
| المخدوم | Select | “كل المخدومين” | Restricts results to one member | Options are filtered by selected family | Rebuilds report around selected member |
| حالة العضوية | Select | “النشطون” | Active, archived, or all member scope | Absence and visitation builders force active regardless of this selection | Rebuilds report membership scope |
| بحث | Search input | Blank | Text filtering | Searches normalized Arabic-lowercase values | Matches member full name, personal phone, family phone, address, or family name |

### Date behavior by report

- Overview, Weekly, Date Summary, Family Attendance, Member Attendance, and Consecutive Absence use sessions inclusively between From and To.
- Visitation Coverage calculates consecutive absence from all sessions up to To, ignoring From for attendance history, while visitation records themselves use both From and To.
- Directory and Member Data Export do not use date filters for row inclusion, though the filter values are still included in export metadata.

### Membership status behavior

- Most reports respect Active/Archived/All.
- Consecutive Absence always evaluates active members.
- Visitation Coverage always evaluates active members.

## Actions

### Reset

- Label: “إعادة الضبط”.
- Trigger: click.
- Purpose: restore the initial filter object.
- Dependencies: current dataset’s ordered session list.
- Output: last-twelve-session date range, all families, all members, active status, blank search.
- Does not change selected report.

### Report-card selection

- Trigger: click any of nine report cards.
- Purpose: choose report definition.
- Dependencies: none beyond loaded dataset.
- Output: updates selected card and current report panel locally.
- Does not reset filters or navigate to another URL.

### Overview drill-down buttons

| Button | Output report |
|---|---|
| عرض الملخص حسب التاريخ | Attendance Summary by Date Range |
| مقارنة الأسر | Family Attendance |
| تفاصيل المخدومين | Member Attendance |
| متابعة الغياب | Consecutive Absence |

They are visible only on Overview and preserve filters.

### Excel export

- Trigger: “تصدير Excel”.
- Dependency: `canExport` / `reports.export`.
- Output: downloaded `.xlsx` workbook for current report and filters.
- During action: both export buttons disabled; Excel label changes to progress text.

### PDF/print export

- Trigger: “تصدير PDF”.
- Dependency: export permission and browser popup permission.
- Output: new print window and browser print dialog; user may save as PDF or print.
- During action: both export buttons disabled; PDF label changes to progress text.

### Read-only notice

- Replaces both export actions when `canExport=false`.
- It is informational and not clickable.

### Dashboard navigation actions

- Sidebar Reports link enters the page and is highlighted.
- Other sidebar links navigate away.
- Notification bell behavior belongs to the shared notification component.
- Avatar navigates to the personal profile.
- Both sign-out buttons invoke the same sign-out workflow.
- Mobile menu and scrim open/close the sidebar.

## Actions and controls not present

There is no Apply, Refresh, Clear-search-only, Save filter, Save report, Sort, Pagination, Next/Previous page, Column visibility, Row selection, Edit, Delete, Bulk action, Copy, Share, Email, CSV export, direct Print button, or Download PDF button. Printing is reached through “تصدير PDF”.

