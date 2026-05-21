-- Istoric etape pentru leaduri.
-- Ruleaza tot scriptul in Supabase SQL Editor daca istoricul etapelor nu se salveaza/citeste.

create table if not exists lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  from_stage_id uuid references stages(id) on delete set null,
  to_stage_id uuid references stages(id) on delete set null,
  manager_id uuid references managers(id) on delete set null,
  changed_at timestamptz not null default now()
);

alter table lead_stage_history enable row level security;

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

drop policy if exists "authenticated can delete lead_stage_history" on lead_stage_history;
create policy "authenticated can delete lead_stage_history"
on lead_stage_history for delete
to authenticated
using (public.current_user_is_manager());
