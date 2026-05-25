alter table leads
add column if not exists follow_up_time text;

alter table leads
drop constraint if exists leads_follow_up_time_check;

alter table leads
add constraint leads_follow_up_time_check
check (
  follow_up_time is null
  or follow_up_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
);
