# Weekly Visitation production hardening

## Scope

Migration `202607310004_weekly_visitation_production_hardening.sql` hardens the
existing Weekly Visitation workflow without changing attendance fields,
permissions, page layout, visitation types, or Service Week ownership.

Apply migrations in numeric order. Existing installations that already ran
`002` and `003` need to run only `004`.

## Audit guarantees

`member_visitation_records` now has immutable `created_by`/`created_at`, mutable
`updated_by`/`updated_at`, and a monotonically increasing `version`. Existing
rows are backfilled from `recorded_by`; that compatibility column remains and
continues to identify the original recorder.

Every successful update inserts an immutable row in
`member_visitation_audit_log` with the complete previous and new JSON values,
actor, and timestamp. Database triggers reject physical visitation deletion and
audit-log update/deletion. The visitation-to-member foreign key uses
`ON DELETE RESTRICT`.

## Optimistic concurrency

The browser sends the record ID and version it loaded. The server calls
`save_member_visitation`, which updates only when the current database version
matches. New-record races are protected by the existing unique key. A stale
insert or update raises `VISITATION_CONFLICT`; the API returns HTTP 409 and the
dialog displays a friendly Arabic message. No stale write is committed.

## Member archival

Archiving records `archived_at` and `archived_by`. Permanent deletion is refused
when visitation history exists, before member notes or activity links are
removed. This preserves the existing permanent-delete behavior only for members
who have no permanent visitation history.

## Versioned service settings

`service_settings` contains timezone, meeting weekday/time, attendance deadline,
post-meeting visitation behavior, automatic rollover, effective date, and
updater metadata. Rows are immutable versions. New settings must have a future
`effective_from`; therefore they cannot rewrite an OPEN or CLOSED week.

Authorized settings administrators may list and create future versions through
`GET/POST /api/visitation/settings`. Database validation verifies weekday,
time ordering, timezone, future effectiveness, and active updater identity.

## Scheduled rollover

Supabase Cron runs `ensure_current_service_week()` every minute. The function
evaluates the applicable setting's timezone and cutoff, takes the existing
transaction-scoped advisory lock, closes the OPEN week, and creates exactly one
successor. It remains idempotent and retry-safe. Existing application calls to
the same function remain as fallback.

Supabase projects must have the Cron Postgres Module available. The migration
enables `pg_cron`; if extension installation is restricted, enable Cron under
**Integrations → Cron** before rerunning the migration.

Operational check:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'weekly-visitation-service-week-rollover';
```

Audit verification:

```sql
select visitation_id, changed_by, changed_at, previous_values, new_values
from public.member_visitation_audit_log
order by changed_at desc;
```

Integrity verification:

```sql
select count(*) from public.service_weeks where status = 'OPEN';
select service_week_id, member_id, visitation_type_id, count(*)
from public.member_visitation_records
group by service_week_id, member_id, visitation_type_id
having count(*) > 1;
```

The first query must return `1`; the second must return no rows.

## Compatibility

- The visitation API path and POST method are unchanged. Older create requests
  remain valid; stale edits now safely receive HTTP 409.
- Attendance continues reading CLOSED-week visitation through the same endpoint.
- Existing RLS policies and role permissions remain in place.
- Application-triggered rollover remains available.
- Existing visitation history and identifiers are preserved.
