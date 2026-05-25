alter table leads
add column if not exists manychat_id text;

create table if not exists lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  direction text not null check (direction in ('incoming', 'outgoing')),
  body text not null,
  manager_id uuid references managers(id) on delete set null,
  external_id text,
  status text not null default 'sent',
  error text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists lead_messages_lead_idx
on lead_messages (lead_id, sent_at desc);

create unique index if not exists lead_messages_external_id_idx
on lead_messages (external_id)
where external_id is not null;

alter table lead_messages enable row level security;

drop policy if exists "authenticated can read lead_messages" on lead_messages;
create policy "authenticated can read lead_messages"
on lead_messages for select to authenticated
using (public.current_user_is_manager());

drop policy if exists "authenticated can insert lead_messages" on lead_messages;
create policy "authenticated can insert lead_messages"
on lead_messages for insert to authenticated
with check (public.current_user_is_manager());
