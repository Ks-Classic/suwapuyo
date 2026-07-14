do $$
begin
  create type character_source_type as enum ('sample', 'artwork', 'sponsor');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type display_character_status as enum ('visible', 'hidden', 'archived');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type tap_event_type as enum ('tap', 'popup_open', 'item_view', 'audio_play', 'cta_click');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists tap_contents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  body text,
  cta_label text,
  cta_url text check (cta_url is null or cta_url = '' or cta_url like 'https://%'),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists display_characters (
  id text primary key,
  source_type character_source_type not null,
  source_id text not null,
  label text not null check (length(trim(label)) > 0),
  image_path text not null check (length(trim(image_path)) > 0),
  source_image_path text,
  status display_character_status not null default 'hidden',
  display_scale numeric not null default 0.6 check (display_scale >= 0.1 and display_scale <= 2.0),
  tap_enabled boolean not null default false,
  tap_content_id uuid references tap_contents(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create table if not exists tap_content_items (
  id uuid primary key default gen_random_uuid(),
  tap_content_id uuid not null references tap_contents(id) on delete cascade,
  sort_order int not null default 0,
  title text,
  caption text,
  image_path text,
  video_path text,
  audio_path text,
  alt text,
  thumbnail_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    nullif(trim(coalesce(caption, '')), '') is not null
    or nullif(trim(coalesce(image_path, '')), '') is not null
    or nullif(trim(coalesce(video_path, '')), '') is not null
    or nullif(trim(coalesce(audio_path, '')), '') is not null
  )
);

create table if not exists tap_events (
  id uuid primary key default gen_random_uuid(),
  event_type tap_event_type not null,
  character_id text references display_characters(id) on delete set null,
  tap_content_id uuid references tap_contents(id) on delete set null,
  item_id uuid references tap_content_items(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists display_characters_status_sort_idx on display_characters (status, sort_order);
create index if not exists display_characters_source_idx on display_characters (source_type, source_id);
create index if not exists tap_content_items_content_sort_idx on tap_content_items (tap_content_id, sort_order);
create index if not exists tap_events_character_created_idx on tap_events (character_id, created_at desc);

alter table display_state drop constraint if exists display_state_max_visible_count_check;
alter table display_state add constraint display_state_max_visible_count_check check (max_visible_count >= 1 and max_visible_count <= 30);

drop trigger if exists tap_contents_set_updated_at on tap_contents;
create trigger tap_contents_set_updated_at
before update on tap_contents
for each row execute function set_updated_at();

drop trigger if exists display_characters_set_updated_at on display_characters;
create trigger display_characters_set_updated_at
before update on display_characters
for each row execute function set_updated_at();

drop trigger if exists tap_content_items_set_updated_at on tap_content_items;
create trigger tap_content_items_set_updated_at
before update on tap_content_items
for each row execute function set_updated_at();

alter table tap_contents enable row level security;
alter table display_characters enable row level security;
alter table tap_content_items enable row level security;
alter table tap_events enable row level security;

drop policy if exists "event anon can read tap contents" on tap_contents;
create policy "event anon can read tap contents"
on tap_contents for select
to anon
using (true);

drop policy if exists "event anon can insert tap contents" on tap_contents;
create policy "event anon can insert tap contents"
on tap_contents for insert
to anon
with check (true);

drop policy if exists "event anon can update tap contents" on tap_contents;
create policy "event anon can update tap contents"
on tap_contents for update
to anon
using (true)
with check (true);

drop policy if exists "event anon can read display characters" on display_characters;
create policy "event anon can read display characters"
on display_characters for select
to anon
using (true);

drop policy if exists "event anon can insert display characters" on display_characters;
create policy "event anon can insert display characters"
on display_characters for insert
to anon
with check (true);

drop policy if exists "event anon can update display characters" on display_characters;
create policy "event anon can update display characters"
on display_characters for update
to anon
using (true)
with check (true);

drop policy if exists "event anon can read tap content items" on tap_content_items;
create policy "event anon can read tap content items"
on tap_content_items for select
to anon
using (true);

drop policy if exists "event anon can insert tap content items" on tap_content_items;
create policy "event anon can insert tap content items"
on tap_content_items for insert
to anon
with check (true);

drop policy if exists "event anon can update tap content items" on tap_content_items;
create policy "event anon can update tap content items"
on tap_content_items for update
to anon
using (true)
with check (true);

drop policy if exists "event anon can delete tap content items" on tap_content_items;
create policy "event anon can delete tap content items"
on tap_content_items for delete
to anon
using (true);

drop policy if exists "event anon can insert tap events" on tap_events;
create policy "event anon can insert tap events"
on tap_events for insert
to anon
with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-content',
  'character-content',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "event anon can read character content media" on storage.objects;
create policy "event anon can read character content media"
on storage.objects for select
to anon
using (bucket_id = 'character-content');

drop policy if exists "event anon can upload character content media" on storage.objects;
create policy "event anon can upload character content media"
on storage.objects for insert
to anon
with check (bucket_id = 'character-content');

drop policy if exists "event anon can update character content media" on storage.objects;
create policy "event anon can update character content media"
on storage.objects for update
to anon
using (bucket_id = 'character-content')
with check (bucket_id = 'character-content');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table display_characters;
  end if;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table tap_contents;
  end if;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table tap_content_items;
  end if;
exception
  when duplicate_object then null;
end;
$$;

insert into display_characters (id, source_type, source_id, label, image_path, source_image_path, status, display_scale, tap_enabled, sort_order)
values
  ('sample-suusuu', 'sample', 'sample-suusuu', 'すーすー', '/content/01_すわぷよ/01_キャラクター/02_表示用/01_すーすー.png', '/content/01_すわぷよ/01_キャラクター/01_原本/01_すーすー.png', 'visible', 0.6, false, 10),
  ('sample-waawaa', 'sample', 'sample-waawaa', 'わーわー', '/content/01_すわぷよ/01_キャラクター/02_表示用/02_わーわー.png', '/content/01_すわぷよ/01_キャラクター/01_原本/02_わーわー.png', 'visible', 0.6, false, 20),
  ('sample-tanupei', 'sample', 'sample-tanupei', 'たぬぺい', '/content/01_すわぷよ/01_キャラクター/02_表示用/03_たぬぺい.png', '/content/01_すわぷよ/01_キャラクター/01_原本/03_たぬぺい.png', 'visible', 0.6, false, 30),
  ('sample-wanono', 'sample', 'sample-wanono', 'わのの', '/content/01_すわぷよ/01_キャラクター/02_表示用/04_わのの.png', '/content/01_すわぷよ/01_キャラクター/01_原本/04_わのの.png', 'visible', 0.6, false, 40),
  ('sample-shinbo', 'sample', 'sample-shinbo', 'シンボー', '/content/01_すわぷよ/01_キャラクター/02_表示用/05_シンボー.png', '/content/01_すわぷよ/01_キャラクター/01_原本/05_シンボー.png', 'visible', 0.6, false, 50),
  ('sample-ketonyan', 'sample', 'sample-ketonyan', 'けとにゃん', '/content/01_すわぷよ/01_キャラクター/02_表示用/06_けとにゃん.png', '/content/01_すわぷよ/01_キャラクター/01_原本/06_けとにゃん.png', 'visible', 0.6, false, 60),
  ('sample-mogupiyo', 'sample', 'sample-mogupiyo', 'もぐぴよ', '/content/01_すわぷよ/01_キャラクター/02_表示用/07_もぐぴよ.png', '/content/01_すわぷよ/01_キャラクター/01_原本/07_もぐぴよ.png', 'visible', 0.6, false, 70),
  ('sample-chippippi', 'sample', 'sample-chippippi', 'チッピッピ', '/content/01_すわぷよ/01_キャラクター/02_表示用/08_チッピッピ.png', '/content/01_すわぷよ/01_キャラクター/01_原本/08_チッピッピ.png', 'visible', 0.6, false, 80),
  ('sample-sanka', 'sample', 'sample-sanka', '酸化', '/content/01_すわぷよ/01_キャラクター/02_表示用/09_酸化.png', '/content/01_すわぷよ/01_キャラクター/01_原本/09_酸化.png', 'visible', 0.6, false, 90),
  ('sample-touka', 'sample', 'sample-touka', '糖化', '/content/01_すわぷよ/01_キャラクター/02_表示用/10_糖化.png', '/content/01_すわぷよ/01_キャラクター/01_原本/10_糖化.png', 'visible', 0.6, false, 100),
  ('sample-enshou', 'sample', 'sample-enshou', '炎症', '/content/01_すわぷよ/01_キャラクター/02_表示用/11_炎症.png', '/content/01_すわぷよ/01_キャラクター/01_原本/11_炎症.png', 'visible', 0.6, false, 110),
  ('sample-rapiko', 'sample', 'sample-rapiko', 'ラピ子', '/content/01_すわぷよ/01_キャラクター/02_表示用/12_ラピ子.png', '/content/01_すわぷよ/01_キャラクター/01_原本/12_ラピ子.png', 'visible', 0.6, false, 120),
  ('sample-emahime', 'sample', 'sample-emahime', 'えまひめ', '/content/01_すわぷよ/01_キャラクター/02_表示用/13_えまひめ.png', '/content/01_すわぷよ/01_キャラクター/01_原本/13_えまひめ.png', 'visible', 0.6, false, 130),
  ('sample-hagurin', 'sample', 'sample-hagurin', 'はぐりん', '/content/01_すわぷよ/01_キャラクター/02_表示用/14_はぐりん.png', '/content/01_すわぷよ/01_キャラクター/01_原本/14_はぐりん.png', 'visible', 0.6, false, 140),
  ('sample-mieru', 'sample', 'sample-mieru', 'ミエル', '/content/01_すわぷよ/01_キャラクター/02_表示用/15_ミエル.png', '/content/01_すわぷよ/01_キャラクター/01_原本/15_ミエル.png', 'visible', 0.6, false, 150),
  ('sample-tenpiyo', 'sample', 'sample-tenpiyo', 'てんぴよ', '/content/01_すわぷよ/01_キャラクター/02_表示用/16_てんぴよ.png', '/content/01_すわぷよ/01_キャラクター/01_原本/16_てんぴよ.png', 'visible', 0.6, false, 160),
  ('sample-kamumu', 'sample', 'sample-kamumu', 'かむむ', '/content/01_すわぷよ/01_キャラクター/02_表示用/17_かむむ.png', '/content/01_すわぷよ/01_キャラクター/01_原本/17_かむむ.png', 'visible', 0.6, false, 170),
  ('sample-sukusuke', 'sample', 'sample-sukusuke', 'すくすけ', '/content/01_すわぷよ/01_キャラクター/02_表示用/18_すくすけ.png', '/content/01_すわぷよ/01_キャラクター/01_原本/18_すくすけ.png', 'visible', 0.6, false, 180),
  ('sample-sukumaru', 'sample', 'sample-sukumaru', 'すくまる', '/content/01_すわぷよ/01_キャラクター/02_表示用/19_すくまる.png', '/content/01_すわぷよ/01_キャラクター/01_原本/19_すくまる.png', 'visible', 0.6, false, 190),
  ('sample-seiucchi', 'sample', 'sample-seiucchi', 'セイウッチー', '/content/01_すわぷよ/01_キャラクター/02_表示用/20_セイウッチー.png', '/content/01_すわぷよ/01_キャラクター/01_原本/20_セイウッチー.png', 'visible', 0.6, false, 200),
  ('sample-mamyu', 'sample', 'sample-mamyu', 'マミュー', '/content/01_すわぷよ/01_キャラクター/02_表示用/21_マミュー.png', '/content/01_すわぷよ/01_キャラクター/01_原本/21_マミュー.png', 'visible', 0.6, false, 210),
  ('sample-haisha-gorisan', 'sample', 'sample-haisha-gorisan', '歯医者のごりさん', '/content/01_すわぷよ/01_キャラクター/02_表示用/22_歯医者のごりさん.png', '/content/01_すわぷよ/01_キャラクター/01_原本/22_歯医者のごりさん.png', 'visible', 0.6, false, 220)
on conflict (id) do update
set
  label = excluded.label,
  image_path = excluded.image_path,
  source_image_path = excluded.source_image_path,
  sort_order = excluded.sort_order;

insert into tap_contents (id, title, body, cta_label, cta_url, is_published)
values
  ('00000000-0000-4000-8000-000000000001', 'すーすー', null, null, null, true)
on conflict (id) do update
set
  title = excluded.title,
  body = excluded.body,
  cta_label = excluded.cta_label,
  cta_url = excluded.cta_url,
  is_published = excluded.is_published;

insert into tap_content_items (id, tap_content_id, sort_order, title, caption, image_path, video_path, audio_path, alt, thumbnail_path)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 0, null, null, null, '/content/02_ユアタイム/04_映像・開始終了カード/01_出展ブース紹介.mp4', null, 'ブースで流す紹介動画', null)
on conflict (id) do update
set
  tap_content_id = excluded.tap_content_id,
  sort_order = excluded.sort_order,
  title = excluded.title,
  caption = excluded.caption,
  image_path = excluded.image_path,
  video_path = excluded.video_path,
  audio_path = excluded.audio_path,
  alt = excluded.alt,
  thumbnail_path = excluded.thumbnail_path;

update display_characters
set tap_content_id = '00000000-0000-4000-8000-000000000001', tap_enabled = true
where id = 'sample-suusuu';
