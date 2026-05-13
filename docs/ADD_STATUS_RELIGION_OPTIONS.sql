-- Optiuni editabile pentru Status si Religie.
-- Ruleaza tot scriptul in Supabase SQL Editor.

alter table leads drop constraint if exists leads_status_check;

create table if not exists lead_statuses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists religions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into lead_statuses (code, name, position, active) values
  ('new', 'Nou', 1, true),
  ('scheduled', 'Programat', 2, true),
  ('contacted', 'Contactat', 3, true),
  ('closed', 'Inchis', 4, true)
on conflict (code) do update set
  name = excluded.name,
  position = excluded.position,
  active = excluded.active,
  updated_at = now();

insert into religions (code, name, position, active) values
  ('adventist', 'Adventist', 1, true),
  ('ortodox', 'Ortodox', 2, true),
  ('catolic', 'Catolic', 3, true),
  ('alta', 'Alta', 4, true)
on conflict (code) do update set
  name = excluded.name,
  position = excluded.position,
  active = excluded.active,
  updated_at = now();

alter table lead_statuses enable row level security;
alter table religions enable row level security;

drop policy if exists "authenticated can read lead_statuses" on lead_statuses;
create policy "authenticated can read lead_statuses"
on lead_statuses for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "admin can insert lead_statuses" on lead_statuses;
create policy "admin can insert lead_statuses"
on lead_statuses for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists "admin can update lead_statuses" on lead_statuses;
create policy "admin can update lead_statuses"
on lead_statuses for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "authenticated can read religions" on religions;
create policy "authenticated can read religions"
on religions for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "admin can insert religions" on religions;
create policy "admin can insert religions"
on religions for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists "admin can update religions" on religions;
create policy "admin can update religions"
on religions for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());
