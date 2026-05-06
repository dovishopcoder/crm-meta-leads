-- Fix pentru eroarea:
-- "new row violates row-level security policy for table leads"
--
-- Pastreaza accesul blocat pentru useri nelogati, dar permite userilor autentificati
-- sa lucreze cu lead-uri si tabelele dependente.

drop policy if exists "authenticated can read leads" on leads;
create policy "authenticated can read leads"
on leads for select
to authenticated
using (true);

drop policy if exists "authenticated can insert leads" on leads;
create policy "authenticated can insert leads"
on leads for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update leads" on leads;
create policy "authenticated can update leads"
on leads for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can read lead_tags" on lead_tags;
create policy "authenticated can read lead_tags"
on lead_tags for select
to authenticated
using (true);

drop policy if exists "authenticated can insert lead_tags" on lead_tags;
create policy "authenticated can insert lead_tags"
on lead_tags for insert
to authenticated
with check (true);

drop policy if exists "authenticated can delete lead_tags" on lead_tags;
create policy "authenticated can delete lead_tags"
on lead_tags for delete
to authenticated
using (true);

drop policy if exists "authenticated can read lead_products" on lead_products;
create policy "authenticated can read lead_products"
on lead_products for select
to authenticated
using (true);

drop policy if exists "authenticated can insert lead_products" on lead_products;
create policy "authenticated can insert lead_products"
on lead_products for insert
to authenticated
with check (true);

drop policy if exists "authenticated can delete lead_products" on lead_products;
create policy "authenticated can delete lead_products"
on lead_products for delete
to authenticated
using (true);

drop policy if exists "authenticated can read lead_activity" on lead_activity;
create policy "authenticated can read lead_activity"
on lead_activity for select
to authenticated
using (true);

drop policy if exists "authenticated can insert lead_activity" on lead_activity;
create policy "authenticated can insert lead_activity"
on lead_activity for insert
to authenticated
with check (true);

drop policy if exists "authenticated can read lead_stage_history" on lead_stage_history;
create policy "authenticated can read lead_stage_history"
on lead_stage_history for select
to authenticated
using (true);

drop policy if exists "authenticated can insert lead_stage_history" on lead_stage_history;
create policy "authenticated can insert lead_stage_history"
on lead_stage_history for insert
to authenticated
with check (true);
