alter table artworks
  add column if not exists display_scale numeric not null default 1.0
  check (display_scale >= 0.5 and display_scale <= 2.4);
