alter table artworks
  drop constraint if exists artworks_display_scale_check;

update artworks
set display_scale = least(1.0, greatest(0.1, display_scale));

alter table artworks
  alter column display_scale set default 0.6;

alter table artworks
  add constraint artworks_display_scale_check
  check (display_scale >= 0.1 and display_scale <= 1.0);
