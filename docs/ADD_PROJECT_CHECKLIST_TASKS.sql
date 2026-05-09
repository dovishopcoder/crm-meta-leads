create table if not exists project_checklist_tasks (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table project_checklist_tasks enable row level security;

drop policy if exists "mvp public all project_checklist_tasks" on project_checklist_tasks;
create policy "mvp public all project_checklist_tasks"
on project_checklist_tasks
for all
using (true)
with check (true);
