-- Politici RLS mai sigure pentru CRM.
-- Ruleaza acest script in Supabase SQL Editor dupa ce login-ul admin/manager functioneaza.
--
-- Ideea:
-- - userii nelogati nu pot citi/scrie tabelele CRM;
-- - userii logati pot lucra cu lead-uri;
-- - doar adminii pot modifica manageri, etape si produse;
-- - adminul este detectat dupa tabela managers.email = auth.jwt()->>'email'.

create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.managers
    where lower(email) = public.current_user_email()
      and role = 'admin'
      and active = true
  );
$$;

create or replace function public.current_user_is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.managers
    where lower(email) = public.current_user_email()
      and active = true
  );
$$;

alter table managers enable row level security;
alter table stages enable row level security;
alter table products enable row level security;
alter table leads enable row level security;
alter table lead_tags enable row level security;
alter table lead_products enable row level security;
alter table lead_stage_history enable row level security;
alter table lead_activity enable row level security;
alter table meta_webhook_events enable row level security;

drop policy if exists "mvp public all managers" on managers;
drop policy if exists "mvp public all stages" on stages;
drop policy if exists "mvp public all products" on products;
drop policy if exists "mvp public all leads" on leads;
drop policy if exists "mvp public all lead_tags" on lead_tags;
drop policy if exists "mvp public all lead_products" on lead_products;
drop policy if exists "mvp public all lead_stage_history" on lead_stage_history;
drop policy if exists "mvp public all lead_activity" on lead_activity;
drop policy if exists "mvp public all meta_webhook_events" on meta_webhook_events;

drop policy if exists "authenticated can read managers" on managers;
create policy "authenticated can read managers"
on managers for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "admin can insert managers" on managers;
create policy "admin can insert managers"
on managers for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists "admin can update managers" on managers;
create policy "admin can update managers"
on managers for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "authenticated can read stages" on stages;
create policy "authenticated can read stages"
on stages for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "admin can insert stages" on stages;
create policy "admin can insert stages"
on stages for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists "admin can update stages" on stages;
create policy "admin can update stages"
on stages for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "authenticated can read products" on products;
create policy "authenticated can read products"
on products for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "admin can insert products" on products;
create policy "admin can insert products"
on products for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists "admin can update products" on products;
create policy "admin can update products"
on products for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "authenticated can read leads" on leads;
create policy "authenticated can read leads"
on leads for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "authenticated can insert leads" on leads;
create policy "authenticated can insert leads"
on leads for insert
to authenticated
with check (public.current_user_is_manager());

drop policy if exists "authenticated can update leads" on leads;
create policy "authenticated can update leads"
on leads for update
to authenticated
using (public.current_user_is_manager())
with check (public.current_user_is_manager());

drop policy if exists "authenticated can read lead_tags" on lead_tags;
create policy "authenticated can read lead_tags"
on lead_tags for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "authenticated can insert lead_tags" on lead_tags;
create policy "authenticated can insert lead_tags"
on lead_tags for insert
to authenticated
with check (public.current_user_is_manager());

drop policy if exists "authenticated can delete lead_tags" on lead_tags;
create policy "authenticated can delete lead_tags"
on lead_tags for delete
to authenticated
using (public.current_user_is_manager());

drop policy if exists "authenticated can read lead_products" on lead_products;
create policy "authenticated can read lead_products"
on lead_products for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "authenticated can insert lead_products" on lead_products;
create policy "authenticated can insert lead_products"
on lead_products for insert
to authenticated
with check (public.current_user_is_manager());

drop policy if exists "authenticated can delete lead_products" on lead_products;
create policy "authenticated can delete lead_products"
on lead_products for delete
to authenticated
using (public.current_user_is_manager());

drop policy if exists "authenticated can read lead_stage_history" on lead_stage_history;
create policy "authenticated can read lead_stage_history"
on lead_stage_history for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "authenticated can insert lead_stage_history" on lead_stage_history;
create policy "authenticated can insert lead_stage_history"
on lead_stage_history for insert
to authenticated
with check (public.current_user_is_manager());

drop policy if exists "authenticated can read lead_activity" on lead_activity;
create policy "authenticated can read lead_activity"
on lead_activity for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "authenticated can insert lead_activity" on lead_activity;
create policy "authenticated can insert lead_activity"
on lead_activity for insert
to authenticated
with check (public.current_user_is_manager());

drop policy if exists "admin can read meta_webhook_events" on meta_webhook_events;
create policy "admin can read meta_webhook_events"
on meta_webhook_events for select
to authenticated
using (public.current_user_is_admin());
