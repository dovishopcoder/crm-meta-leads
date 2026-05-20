-- Comentarii tip chat pentru leaduri.
-- Ruleaza tot scriptul in Supabase SQL Editor.

create table if not exists lead_comments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  manager_id uuid references managers(id) on delete set null,
  comment text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_comments_lead_idx
on lead_comments (lead_id, created_at desc);

alter table lead_comments enable row level security;

drop policy if exists "authenticated can read lead_comments" on lead_comments;
create policy "authenticated can read lead_comments"
on lead_comments for select
to authenticated
using (public.current_user_is_manager());

drop policy if exists "authenticated can insert lead_comments" on lead_comments;
create policy "authenticated can insert lead_comments"
on lead_comments for insert
to authenticated
with check (public.current_user_is_manager());

drop policy if exists "authenticated can delete lead_comments" on lead_comments;
create policy "authenticated can delete lead_comments"
on lead_comments for delete
to authenticated
using (public.current_user_is_manager());
