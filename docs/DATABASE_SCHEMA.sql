-- CRM Meta Leads - schema initiala pentru Supabase/Postgres

create table managers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text not null,
  email text unique,
  role text not null default 'manager' check (role in ('admin', 'manager')),
  color text not null default '#1e8f72',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table stages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  meta_contact_id text unique,
  platform text not null check (platform in ('facebook', 'instagram')),
  name text not null,
  avatar_url text,
  meta_url text,
  email text,
  phone text,
  notes text,
  status text not null default 'new' check (status in ('new', 'scheduled', 'contacted', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  unread boolean not null default true,
  manager_id uuid references managers(id) on delete set null,
  stage_id uuid references stages(id) on delete set null,
  follow_up_at date,
  first_message_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_processed_at timestamptz,
  processed_count integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table lead_tags (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (lead_id, tag)
);

create table lead_products (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  manager_id uuid references managers(id) on delete set null,
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'rejected', 'waiting')),
  proposed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, product_id)
);

create table lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  from_stage_id uuid references stages(id) on delete set null,
  to_stage_id uuid references stages(id) on delete set null,
  manager_id uuid references managers(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  manager_id uuid references managers(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table meta_webhook_events (
  id uuid primary key default gen_random_uuid(),
  meta_event_id text unique,
  platform text,
  payload jsonb not null,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

create index leads_unread_idx on leads (unread) where archived_at is null;
create index leads_follow_up_idx on leads (follow_up_at) where archived_at is null;
create index leads_manager_idx on leads (manager_id);
create index leads_stage_idx on leads (stage_id);
create index lead_activity_lead_idx on lead_activity (lead_id, created_at desc);

insert into stages (code, name, position) values
  ('new', 'Nou', 1),
  ('interested', 'Interesat', 2),
  ('proposal', 'Propunere facuta', 3),
  ('followup', 'Follow-up', 4),
  ('accepted', 'Acceptat', 5),
  ('no-response', 'Nu raspunde', 6),
  ('closed', 'Inchis', 7);

insert into products (code, name) values
  ('biblical-courses', 'Cursuri biblice'),
  ('health-prayer', 'Rugaciune sanatate'),
  ('meeting', 'Intalnire'),
  ('consultation', 'Consultatie');
