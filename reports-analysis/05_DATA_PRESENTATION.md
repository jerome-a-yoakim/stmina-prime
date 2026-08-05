# Data Presentation and Calculations

## Source dataset

The server builds one normalized dataset before the interactive page renders.

| UI data | Database source |
|---|---|
| Families, names, grades, active status | `groups` |
| Member identity, contact, school, dates, status, “Brother of the Lord” flag | `members` |
| Attendance dates | `attendance_sessions` |
| Service attendance, Mass attendance, Mass service, confession | `attendance_records` |
| Activity names | `activities` + `member_activities` |
| Current class servants | `user_class_assignments` + `users` |
| Current directly assigned member servants | `user_member_assignments` + `users` |
| Visitation date, type, notes, recorder | `member_visitation_records` + `visitation_types` + `users` |

System owners and system managers receive all groups. Other actors receive only groups in their active class assignments. Members, records, assignments, and visitations are then limited to those groups/members. Direct member servant assignments take precedence over class-level servants; class servants are the fallback.

## Shared presentation rules

- Numbers use Arabic-Egypt locale formatting.
- Dates use Arabic-Egypt day/month/year display; missing dates use an em dash.
- Percentages are whole numbers rounded with `Math.round`.
- Division by zero produces 0%, not blank or an error.
- Missing strings display as an em dash in tables.
- Multiple activities and servant names are joined with an Arabic comma.
- Table row count uses Arabic-Egypt number formatting.
- The table header remains sticky while the table container scrolls.

## Canonical attendance calculations

### Eligibility

A member is eligible for a session when:

```text
member.joinedAt <= session.date
AND
(member.archivedAt is empty OR archive date > session.date)
```

### Aggregate totals

For the selected members and sessions:

```text
eligible = count of eligible member/session opportunities
recorded = count of attendance records belonging to eligible selected members
attended = count of recorded rows where serviceAttended = true
absent = recorded - attended
missing = max(0, eligible - recorded)
attendance rate = round(attended / recorded × 100)
registration completion = round(recorded / eligible × 100)
```

Mass attendance, Mass service, and confession do not affect the main attendance rate.

### Per-member statistics

For each member, only eligible sessions are considered. Existing records are ordered newest first.

```text
member recorded = existing records in eligible sessions
member attended = serviceAttended=true records
member absent = recorded - attended
member missing = eligible sessions - recorded
member rate = round(attended / recorded × 100)
last attendance = newest serviceAttended=true record
consecutive absence = count of newest recorded serviceAttended=false rows
                      until the first serviceAttended=true row
```

Missing records neither increment nor break the consecutive-absence streak because they are not included in the ordered record list.

## KPI inventory by report

### Attendance Overview

| KPI | Calculation |
|---|---|
| الاجتماعات | Number of selected attendance sessions |
| المخدومون في النطاق | Number of selected members after family/member/status/search filters |
| نسبة الحضور | `attended / recorded`; hint says it uses completed records |
| اكتمال التسجيل | `recorded / eligible`; hint shows the missing-record count |

This report intentionally contains no chart and no table.

### Weekly Attendance

| KPI | Calculation |
|---|---|
| الاجتماعات | Selected session count |
| السجلات | Aggregate recorded opportunities |
| اكتمال التسجيل | `recorded / eligible` |
| نسبة الحضور | `attended / recorded` |

Table rows represent existing attendance records only, ordered by session newest-first and then by the source record order. Columns:

1. Date.
2. Member.
3. Current family.
4. Service: `serviceAttended` as حاضر/غائب.
5. Mass: `massAttended` as حاضر/غائب.
6. Mass service: `massService` as نعم/لا.
7. Confession: `confession` as نعم/لا.

### Attendance Summary by Date Range

| KPI | Calculation |
|---|---|
| نسبة الحضور | Aggregate `attended / recorded` |
| حضور | Aggregate attended count |
| غياب مسجل | Aggregate absent count |
| غير مسجل | Aggregate missing count; hint states it is not absence |

Each table row recalculates totals for one session date. Rows are newest-first. Columns are Date, Expected, Recorded, Present, Absent, Not recorded, Rate.

The visual summary uses the first ten displayed rows (therefore the ten most recent dates). Each horizontal bar width is the per-date attendance percentage, clamped visually to 0–100%, with the same percentage printed at the end.

### Family Attendance

| KPI | Calculation |
|---|---|
| الأسر | Families with at least one member after filters |
| نسبة الحضور | Aggregate rate across all allowed members |
| حضور | Aggregate attended count |
| غياب مسجل | Aggregate absent count |

One row per family. Family totals use members currently assigned to that family and selected sessions. Zero-member families are removed. Rows are sorted descending by attendance rate. Columns: Family, Grade, Members, Records, Present, Absent, Not recorded, Rate.

### Member Attendance

| KPI | Calculation |
|---|---|
| المخدومون | Selected member count |
| نسبة الحضور | Aggregate rate across selected members |
| حضور | Aggregate attended count |
| غياب مسجل | Aggregate absent count |

One row per selected member, sorted descending by member attendance rate. Columns: Member, Family, Expected, Recorded, Present, Absent, Not recorded, Rate, Last attendance.

### Consecutive Absence

The report forces active-member scope even if the membership-status filter says archived or all. It uses sessions inside the selected date range.

Priority mapping:

| Streak | Label |
|---|---|
| 3 or more | عاجل |
| 2 | حرج |
| 1 | مهم |
| 0 | منتظم, but these members are excluded from rows |

KPIs count all displayed rows and each of the three displayed priority bands. Rows are sorted descending by streak. Phone uses personal phone, then family phone, then em dash. Responsible servant uses direct assignment, then family assignment, then em dash.

### Visitation Coverage

The report forces active-member scope. At-risk members are those with consecutive absence greater than zero. Absence history uses all sessions up to the selected To date; it does not apply the From date. Visitation records use the inclusive From/To range.

For every at-risk member:

- Phone visitation is Yes when any in-range visitation type code is `phone`.
- Home visitation is Yes when any in-range visitation type code is `home`.
- Latest visitation is the newest in-range visitation date.
- Servant is the recorder of the latest visitation; if none, the responsible servant fallback is used.
- Coverage is “تم” when at least one in-range visitation exists, otherwise “لم يتم”.

KPIs:

```text
absentees = number of at-risk rows
visited = rows with coverage “تم”
coverage rate = round(visited / absentees × 100)
without visitation = absentees - visited
```

Rows are sorted descending by consecutive absence.

### Family Roster / Directory

KPIs:

- Members: selected member count.
- Families: distinct selected member `groupId` count.
- Without phone: neither personal nor family phone exists.
- Without address: address is blank.

One row per selected member. Columns: Member, Family, Phone, Family phone, Additional phone, Address, School, Birth date, Activities, Responsible servant.

### Member Data Export

KPIs:

- Total selected members.
- Active selected members.
- Archived selected members.
- Phone completeness: members with personal or family phone divided by total selected members.

One row per selected member. Columns: Full name, Given name, Father name, Family, Status, Joining date, Archive date, Birth date, Phone, Family phone, Additional phone, Address, School, Brother of the Lord, Activities, Responsible servant.

The builder also places member ID in each internal row, but the column definition omits it, so it is neither visible nor included in standard exports.

## Badges, counters, summaries, and lists

- No data cells use badge components; statuses and priorities are plain text.
- Counters appear in the hero family statistic, category report counts, KPI values, and detail row count.
- The accuracy note is a two-item bulleted list.
- The report catalog is a card list grouped under three category headings.
- The Overview drill-down panel is a list of four action buttons.
- No legends, pie charts, line charts, sparklines, tooltips, or sortable headers exist.

