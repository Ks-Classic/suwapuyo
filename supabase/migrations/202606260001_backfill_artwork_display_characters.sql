insert into public.display_characters (
  id,
  source_type,
  source_id,
  label,
  image_path,
  status,
  display_scale,
  tap_enabled,
  sort_order,
  created_at,
  updated_at
)
select
  artworks.id,
  'artwork'::public.character_source_type,
  artworks.id,
  coalesce(nullif(artworks.given_name, ''), artworks.display_label),
  artworks.image_path,
  case
    when artworks.status = 'archived' then 'archived'::public.display_character_status
    when artworks.status = 'hidden' then 'hidden'::public.display_character_status
    else 'visible'::public.display_character_status
  end,
  least(2.0, greatest(0.1, round(coalesce(artworks.display_scale, 0.6)::numeric, 1))),
  false,
  (100000 + row_number() over (order by artworks.created_at, artworks.id))::int,
  artworks.created_at,
  artworks.updated_at
from public.artworks
on conflict (source_type, source_id) do update set
  label = excluded.label,
  image_path = excluded.image_path,
  status = excluded.status,
  display_scale = excluded.display_scale,
  updated_at = now();
