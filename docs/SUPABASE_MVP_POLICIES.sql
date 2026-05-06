-- Politici temporare pentru MVP.
-- Permit aplicatiei sa citeasca/scrie folosind anon public key.
-- Inainte de productie, aceste politici trebuie inlocuite cu reguli pe useri autentificati.

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
create policy "mvp public all managers" on managers for all using (true) with check (true);

drop policy if exists "mvp public all stages" on stages;
create policy "mvp public all stages" on stages for all using (true) with check (true);

drop policy if exists "mvp public all products" on products;
create policy "mvp public all products" on products for all using (true) with check (true);

drop policy if exists "mvp public all leads" on leads;
create policy "mvp public all leads" on leads for all using (true) with check (true);

drop policy if exists "mvp public all lead_tags" on lead_tags;
create policy "mvp public all lead_tags" on lead_tags for all using (true) with check (true);

drop policy if exists "mvp public all lead_products" on lead_products;
create policy "mvp public all lead_products" on lead_products for all using (true) with check (true);

drop policy if exists "mvp public all lead_stage_history" on lead_stage_history;
create policy "mvp public all lead_stage_history" on lead_stage_history for all using (true) with check (true);

drop policy if exists "mvp public all lead_activity" on lead_activity;
create policy "mvp public all lead_activity" on lead_activity for all using (true) with check (true);

drop policy if exists "mvp public all meta_webhook_events" on meta_webhook_events;
create policy "mvp public all meta_webhook_events" on meta_webhook_events for all using (true) with check (true);
