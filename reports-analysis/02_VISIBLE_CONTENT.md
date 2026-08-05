# Visible Content Inventory

## Persistent dashboard shell

| Element | Position | Source | Purpose | Visibility | Actions |
|---|---|---|---|---|---|
| Brand “خدمة مارمينا” / “إدارة الخدمة” | Sidebar top | Static | Application identity | Desktop and expanded mobile sidebar | None |
| Navigation sections and links | Sidebar body | Static navigation plus permission flags | Move between modules | Visitation and servant-follow-up links are permission-dependent; Reports is always listed in this shell | Clicking a link navigates; Reports is marked active |
| User initial, name, “حساب نشط” | Sidebar bottom | Current actor | Account context | Sidebar; text hidden in collapsed tablet mode | None |
| Sidebar “خروج” | Sidebar bottom | Current auth session | Sign out | Always | POST sign-out, then `/login` |
| “مرحبًا بك” and user name | Top bar start | Current actor | Session context | Always | None |
| Notification bell | Top bar actions | Notification feature | Open notifications | Always | Managed by notification component |
| “تسجيل الخروج” | Top bar actions | Current auth session | Sign out | Always | POST sign-out; disabled and relabeled while working |
| User-initial avatar | Top bar end | Current actor | Profile shortcut | Always | Navigates to `/dashboard/me` |

## Reporting Center hero

| Element | Position | Source | Purpose | Visibility | Actions |
|---|---|---|---|---|---|
| Eyebrow “مركز التقارير” | Hero text block | Static | Section identity | Always | None |
| Heading “قرارات أوضح من بيانات الخدمة” | Hero text block | Static | Page headline | Always | None |
| Description “تقارير عملية للحضور والافتقاد وبيانات المخدومين، ضمن نطاق صلاحياتك.” | Under heading | Static | Defines page scope | Always | None |
| Accessible-family count | Hero statistic card | `initialData.groups.length` | Shows number of families available to the current actor | Always, including zero | None |
| Label “أسرة متاحة” | Hero statistic card | Static | Explains count | Always | None |

## Global filter panel

The panel title is “الفلاتر العامة”. Its description is “تُطبق مباشرة على التقرير المفتوح والتصدير.” The Reset button reads “إعادة الضبط”. All six controls are always visible; their detailed behavior is documented in `04_FILTERS_AND_ACTIONS.md`.

## Report catalog content

### Attendance — “الحضور” — count: 6 reports

| Card title | Description | Icon | Purpose |
|---|---|---|---|
| نظرة عامة على الحضور | مؤشرات تنفيذ التسجيل والحضور عبر الفترة. | ◫ | Executive attendance summary |
| تقرير الحضور الأسبوعي | سجل أسبوعي تفصيلي لكل مخدوم. | ▦ | Per-record weekly detail |
| ملخص الحضور حسب الفترة | مقارنة نتائج الاجتماعات خلال نطاق زمني. | ⌁ | Per-date aggregate and trend |
| حضور الأسر | مقارنة الحضور واكتمال التسجيل بين الأسر. | ⌂ | Family-level comparison |
| حضور المخدومين | ملخص تاريخ الحضور والغياب لكل مخدوم. | ◎ | Member-level aggregate |
| الغياب المتتالي | قائمة متابعة مرتبة حسب أولوية التدخل. | ! | Absence follow-up queue |

### Visitation — “الافتقاد” — count: 1 report

| Card title | Description | Icon | Purpose |
|---|---|---|---|
| تغطية الافتقاد | قياس تغطية افتقاد المتغيبين فعليًا. | ☎ | Compare at-risk members with recorded visitations |

### Member Data — “بيانات المخدومين” — count: 2 reports

| Card title | Description | Icon | Purpose |
|---|---|---|---|
| دليل الأسر والمخدومين | دليل اتصال منظم حسب الأسرة. | ☷ | Operational contact directory |
| تصدير بيانات المخدومين | بيانات إدارية شاملة قابلة للتصفية. | ⇩ | Comprehensive administrative dataset |

All cards are always present. Selecting one changes the current report in place. A selected card has `aria-pressed=true` and selected styling.

## Current report shared content

- Eyebrow: “التقرير الحالي”.
- Selected report title and description.
- Export Excel and Export PDF buttons when `canExport=true`.
- “لديك صلاحية العرض فقط.” when `canExport=false`.
- Four KPI cards, defined per report below.
- Export error banner only after a failed export.
- Detail table heading “البيانات التفصيلية” and localized row count on every detailed report.
- Two data-accuracy notes when the normal dataset is returned:
  1. Historical reports use the member’s current family because no temporal family-transfer history exists.
  2. A missing attendance record is not counted as absence and appears separately as “غير مسجل”.

## Report-specific visible content

### 1. Attendance Overview

- Description: “صورة تنفيذية تجمع الحضور واكتمال تسجيل الاجتماعات.”
- KPIs: Meetings, Members in scope, Attendance rate, Registration completion.
- Drill-down heading: “انتقل إلى التفاصيل”.
- Drill-down explanation: “اختر مستوى التحليل المناسب دون تكرار الملخص هنا.”
- Buttons: View summary by date, Compare families, Member details, Absence follow-up.
- No visual summary and no detailed table.

### 2. Weekly Attendance Report

- Description: “تفاصيل السجلات التي تم إدخالها لكل اجتماع.”
- KPIs: Meetings, Records, Registration completion, Attendance rate.
- Table columns: Date, Member, Family, Service, Mass, Mass service, Confession.
- Each attendance boolean is shown as “حاضر/غائب” or “نعم/لا”.

### 3. Attendance Summary by Date Range

- Description: “مقارنة قابلة للتصدير بين تواريخ الاجتماعات.”
- KPIs: Attendance rate, Present, Recorded absence, Not recorded.
- Visual summary: up to ten date/rate horizontal bars.
- Table columns: Date, Expected, Recorded, Present, Absent, Not recorded, Rate.

### 4. Family Attendance Report

- Description: “مقارنة عادلة تعتمد على السجلات المكتملة وتعرض غير المسجل منفصلًا.”
- KPIs: Families, Attendance rate, Present, Recorded absence.
- Table columns: Family, Grade, Members, Records, Present, Absent, Not recorded, Rate.

### 5. Member Attendance Report

- Description: “ملخص فردي يوضح الحضور والغياب ونقص التسجيل.”
- KPIs: Members, Attendance rate, Present, Recorded absence.
- Table columns: Member, Family, Expected, Recorded, Present, Absent, Not recorded, Rate, Last attendance.

### 6. Consecutive Absence Report

- Description explicitly says priority uses completed attendance records and missing records are not absence.
- KPIs: Need follow-up, Urgent (3+), Critical (2), Important (1).
- Table columns: Member, Family, Consecutive absences, Priority, Last attendance, Phone, Responsible servant.
- Priority values are plain table text: “عاجل”, “حرج”, or “مهم”. There is no colored badge.

### 7. Visitation Coverage Report

- Description: “يقيس الافتقاد المسجل رسميًا للمتغيبين في الفترة المحددة.”
- KPIs: Absentees, Visited, Coverage rate, Without visitation.
- Table columns: Member, Family, Absences, Priority, Phone visit, Home visit, Latest visit, Servant, Coverage.
- Phone/home fields show “نعم/لا”; coverage shows “تم/لم يتم”.

### 8. Family Roster / Directory

- Description: “دليل الاتصال الحالي للأسر مع الأنشطة والخادم المسؤول.”
- KPIs: Members, Families, Without phone, Without address.
- Table columns: Member, Family, Phone, Family phone, Additional phone, Address, School, Birth date, Activities, Responsible servant.

### 9. Member Data Export

- Description: “مجموعة البيانات الإدارية الحالية ضمن نطاق صلاحياتك.”
- KPIs: Total, Active, Archived, Phone completeness.
- Table columns: Full name, Given name, Father name, Family, Status, Joining date, Archive date, Birth date, Phone, Family phone, Additional phone, Address, School, Brother of the Lord, Activities, Responsible servant.
- The underlying row also contains member ID, but there is no visible ID column and therefore it is not displayed or exported in the data worksheet.

## Conditional visible states

- No export permission: export buttons are replaced by the read-only message.
- Export in progress: both export buttons become disabled; only the selected action’s label changes to “جارٍ التجهيز…”.
- Export failure: a red-tinted error message appears beneath the report header.
- No report rows: the table region shows the empty state.
- No class assignments for a non-manager: the dataset is empty and the limitations list is also empty.
- Missing values inside rows: displayed as an em dash.

