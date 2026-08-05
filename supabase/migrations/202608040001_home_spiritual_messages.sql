-- Administrator-owned content used by the Home page. The management UI is
-- intentionally left to Dashboard Settings; Home only reads configured rows.
create table if not exists public.home_spiritual_messages (
  id uuid primary key default gen_random_uuid(),
  message_text text not null check (char_length(trim(message_text)) between 1 and 600),
  reference text not null default '' check (char_length(reference) <= 160),
  active boolean not null default true,
  starts_on date not null default current_date,
  ends_on date,
  sort_order integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create index if not exists idx_home_spiritual_messages_active
  on public.home_spiritual_messages(active, starts_on, ends_on, sort_order);

alter table public.home_spiritual_messages enable row level security;

drop policy if exists "home spiritual messages readable" on public.home_spiritual_messages;
create policy "home spiritual messages readable"
  on public.home_spiritual_messages for select to authenticated
  using (active and starts_on <= current_date and (ends_on is null or ends_on >= current_date));

drop policy if exists "home spiritual messages managed" on public.home_spiritual_messages;
create policy "home spiritual messages managed"
  on public.home_spiritual_messages for all to authenticated
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));
