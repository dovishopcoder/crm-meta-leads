alter table leads add column if not exists meta_url_verified boolean not null default false;

update leads
set meta_url_verified = true
where meta_url_verified = false
  and meta_url is not null
  and meta_url like 'https://business.facebook.com/latest/inbox/all%selected_item_id%thread_type=FB_MESSAGE%';
