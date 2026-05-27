alter table leads add column if not exists need_category text;

create table if not exists need_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into need_categories (code, name, position, active) values
  ('familie', 'Familie', 1, true),
  ('sanatate', 'Sanatate', 2, true),
  ('copii', 'Copii', 3, true),
  ('casatorie', 'Casatorie', 4, true),
  ('dependente', 'Dependente', 5, true),
  ('anxietate', 'Anxietate', 6, true),
  ('depresie', 'Depresie', 7, true),
  ('singuratate', 'Singuratate', 8, true),
  ('financiar', 'Financiar', 9, true),
  ('spiritual', 'Spiritual', 10, true),
  ('pierdere', 'Pierdere', 11, true),
  ('boala', 'Boala', 12, true)
on conflict (code) do update set
  name = excluded.name,
  position = excluded.position,
  active = excluded.active;

alter table need_categories enable row level security;

drop policy if exists "authenticated can read need_categories" on need_categories;
create policy "authenticated can read need_categories"
on need_categories for select
to authenticated
using (true);

drop policy if exists "admin can insert need_categories" on need_categories;
create policy "admin can insert need_categories"
on need_categories for insert
to authenticated
with check (exists (
  select 1 from managers
  where managers.email = auth.jwt() ->> 'email'
    and managers.role = 'admin'
    and managers.active = true
));

drop policy if exists "admin can update need_categories" on need_categories;
create policy "admin can update need_categories"
on need_categories for update
to authenticated
using (exists (
  select 1 from managers
  where managers.email = auth.jwt() ->> 'email'
    and managers.role = 'admin'
    and managers.active = true
))
with check (exists (
  select 1 from managers
  where managers.email = auth.jwt() ->> 'email'
    and managers.role = 'admin'
    and managers.active = true
));

drop policy if exists "admin can delete need_categories" on need_categories;
create policy "admin can delete need_categories"
on need_categories for delete
to authenticated
using (exists (
  select 1 from managers
  where managers.email = auth.jwt() ->> 'email'
    and managers.role = 'admin'
    and managers.active = true
));
