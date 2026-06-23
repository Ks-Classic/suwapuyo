create sequence if not exists artwork_seq;

create table if not exists artworks (
  id text primary key default ('ART-' || lpad(nextval('artwork_seq')::text, 4, '0')),
  display_label text generated always as (id) stored,
  given_name text,
  source text not null check (source in ('photo', 'digital')),
  image_path text not null,
  width int not null check (width > 0),
  height int not null check (height > 0),
  status text not null default 'queued' check (status in ('queued', 'visible', 'hidden', 'archived')),
  consent_scope text not null default 'unknown' check (consent_scope in ('event_only', 'sns_allowed', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_shown_at timestamptz,
  show_count int not null default 0 check (show_count >= 0),
  notes text
);

create table if not exists display_state (
  id text primary key default 'current' check (id = 'current'),
  visible_artwork_ids text[] not null default '{}',
  featured_artwork_id text,
  mode text not null default 'idle' check (mode in ('idle', 'random', 'featured', 'paused')),
  max_visible_count int not null default 12 check (max_visible_count in (8, 12, 20, 30)),
  updated_at timestamptz not null default now()
);

insert into display_state (id) values ('current') on conflict do nothing;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists artworks_set_updated_at on artworks;
create trigger artworks_set_updated_at
before update on artworks
for each row execute function set_updated_at();

drop trigger if exists display_state_set_updated_at on display_state;
create trigger display_state_set_updated_at
before update on display_state
for each row execute function set_updated_at();

alter table artworks enable row level security;
alter table display_state enable row level security;

drop policy if exists "event anon can read artworks" on artworks;
create policy "event anon can read artworks"
on artworks for select
to anon
using (true);

drop policy if exists "event anon can insert artworks" on artworks;
create policy "event anon can insert artworks"
on artworks for insert
to anon
with check (true);

drop policy if exists "event anon can update artworks" on artworks;
create policy "event anon can update artworks"
on artworks for update
to anon
using (true)
with check (true);

drop policy if exists "event anon can read display state" on display_state;
create policy "event anon can read display state"
on display_state for select
to anon
using (id = 'current');

drop policy if exists "event anon can update display state" on display_state;
create policy "event anon can update display state"
on display_state for update
to anon
using (id = 'current')
with check (id = 'current');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table artworks;
  end if;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table display_state;
  end if;
exception
  when duplicate_object then null;
end;
$$;
