-- Camp nou: Interes actual.
-- Ruleaza tot scriptul in Supabase SQL Editor.

alter table leads add column if not exists current_interest text;

create table if not exists current_interests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_interest_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  interest_code text not null,
  manager_id uuid references managers(id) on delete set null,
  changed_at timestamptz not null default now()
);

insert into current_interests (code, name, position, active) values
  ('rugaciune', 'Rugăciune', 1, true),
  ('bibletoday', 'BibleToday', 2, true)
on conflict (code) do update set
  name = excluded.name,
  position = excluded.position,
  active = excluded.active,
  updated_at = now();

alter table current_interests enable row level security;
alter table lead_interest_history enable row level security;

drop policy if exists "authenticated can read current_interests" on current_interests;
create policy "authenticated can read current_interests"
on current_interests for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "admin can insert current_interests" on current_interests;
create policy "admin can insert current_interests"
on current_interests for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists "admin can update current_interests" on current_interests;
create policy "admin can update current_interests"
on current_interests for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "admin can delete current_interests" on current_interests;
create policy "admin can delete current_interests"
on current_interests for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists "authenticated can read lead_interest_history" on lead_interest_history;
create policy "authenticated can read lead_interest_history"
on lead_interest_history for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "authenticated can insert lead_interest_history" on lead_interest_history;
create policy "authenticated can insert lead_interest_history"
on lead_interest_history for insert
to authenticated
with check (public.current_user_is_manager());

drop policy if exists "authenticated can delete lead_interest_history" on lead_interest_history;
create policy "authenticated can delete lead_interest_history"
on lead_interest_history for delete
to authenticated
using (public.current_user_is_manager());
