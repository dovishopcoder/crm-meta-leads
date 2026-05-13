-- Camp nou: Hook - motivul pentru care clientul a scris.
-- Ruleaza tot scriptul in Supabase SQL Editor.

alter table leads add column if not exists hook text;

create table if not exists hook_options (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into hook_options (code, name, position, active) values
  ('sanatate', 'Sanatate', 1, true),
  ('familie', 'Familie', 2, true),
  ('intrebari-teologice', 'Intrebari teologice', 3, true),
  ('critice', 'Critice', 4, true)
on conflict (code) do update set
  name = excluded.name,
  position = excluded.position,
  active = excluded.active,
  updated_at = now();

alter table hook_options enable row level security;

drop policy if exists "authenticated can read hook_options" on hook_options;
create policy "authenticated can read hook_options"
on hook_options for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "admin can insert hook_options" on hook_options;
create policy "admin can insert hook_options"
on hook_options for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists "admin can update hook_options" on hook_options;
create policy "admin can update hook_options"
on hook_options for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());
