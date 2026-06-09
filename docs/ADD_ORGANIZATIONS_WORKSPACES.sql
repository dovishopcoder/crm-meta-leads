-- Multi-workspace support for NextTouch CRM.
-- Ruleaza acest script in Supabase SQL Editor.

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  meta_page_id text,
  manychat_page_id text,
  manychat_api_key text,
  manychat_send_endpoint text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into organizations (name, slug, meta_page_id, manychat_page_id)
values ('DOVI CRM', 'dovi-crm', '228763047857569', '228763047857569')
on conflict (slug) do nothing;

alter table managers add column if not exists organization_id uuid references organizations(id) on delete set null;
alter table leads add column if not exists organization_id uuid references organizations(id) on delete set null;
alter table stages add column if not exists organization_id uuid references organizations(id) on delete set null;
alter table products add column if not exists organization_id uuid references organizations(id) on delete set null;
alter table lead_statuses add column if not exists organization_id uuid references organizations(id) on delete set null;
alter table religions add column if not exists organization_id uuid references organizations(id) on delete set null;
alter table hook_options add column if not exists organization_id uuid references organizations(id) on delete set null;
alter table current_interests add column if not exists organization_id uuid references organizations(id) on delete set null;
alter table need_categories add column if not exists organization_id uuid references organizations(id) on delete set null;
alter table meta_webhook_events add column if not exists organization_id uuid references organizations(id) on delete set null;

update managers
set organization_id = (select id from organizations where slug = 'dovi-crm')
where organization_id is null;

update leads
set organization_id = (select id from organizations where slug = 'dovi-crm')
where organization_id is null;

update stages
set organization_id = (select id from organizations where slug = 'dovi-crm')
where organization_id is null;

update products
set organization_id = (select id from organizations where slug = 'dovi-crm')
where organization_id is null;

update lead_statuses
set organization_id = (select id from organizations where slug = 'dovi-crm')
where organization_id is null;

update religions
set organization_id = (select id from organizations where slug = 'dovi-crm')
where organization_id is null;

update hook_options
set organization_id = (select id from organizations where slug = 'dovi-crm')
where organization_id is null;

update current_interests
set organization_id = (select id from organizations where slug = 'dovi-crm')
where organization_id is null;

update need_categories
set organization_id = (select id from organizations where slug = 'dovi-crm')
where organization_id is null;

create index if not exists managers_organization_idx on managers (organization_id);
create index if not exists leads_organization_idx on leads (organization_id);
create index if not exists organizations_meta_page_idx on organizations (meta_page_id);
create index if not exists organizations_manychat_page_idx on organizations (manychat_page_id);

alter table organizations enable row level security;

drop policy if exists "authenticated can read organizations" on organizations;
create policy "authenticated can read organizations"
on organizations for select
using (auth.role() = 'authenticated');

