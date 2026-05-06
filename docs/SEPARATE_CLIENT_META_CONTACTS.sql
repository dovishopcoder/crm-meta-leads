alter table leads add column if not exists meta_email text;
alter table leads add column if not exists customer_email text;

update leads
set meta_email = email
where meta_email is null
  and email is not null
  and email ~* '^[0-9]+@(facebook|instagram)\.com$';

update leads
set customer_email = email
where customer_email is null
  and email is not null
  and email !~* '^[0-9]+@(facebook|instagram)\.com$';
