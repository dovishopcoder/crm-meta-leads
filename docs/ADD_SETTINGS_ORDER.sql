-- Ordine prin drag-and-drop pentru setari.
-- Ruleaza tot scriptul in Supabase SQL Editor.

alter table products add column if not exists position integer not null default 0;

with ordered as (
  select id, row_number() over (order by created_at asc, name asc) as row_position
  from products
)
update products
set position = ordered.row_position
from ordered
where products.id = ordered.id
  and coalesce(products.position, 0) = 0;
