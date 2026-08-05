-- Preserve follow-up dates while keeping individual servant records sparse.
-- A missing servant record continues to mean absent for all three items.

begin;

create table if not exists public.servant_follow_up_days (
  follow_up_date date primary key,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.servant_follow_up_days (follow_up_date, created_by)
select distinct follow_up_date, min(created_by::text)::uuid
from public.servant_follow_up_records
group by follow_up_date
on conflict (follow_up_date) do nothing;

alter table public.servant_follow_up_days enable row level security;

drop policy if exists "authenticated users read follow up days" on public.servant_follow_up_days;
create policy "authenticated users read follow up days"
on public.servant_follow_up_days for select to authenticated
using (true);

drop policy if exists "administrators create follow up days" on public.servant_follow_up_days;
create policy "administrators create follow up days"
on public.servant_follow_up_days for insert to authenticated
with check (public.has_permission('servant_follow_up.record'));

commit;
