create table if not exists public.announcements (
  id text primary key default ('demo-' || gen_random_uuid()::text),
  text text not null check (char_length(trim(text)) between 1 and 160),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "announcements_select_active" on public.announcements;
create policy "announcements_select_active"
  on public.announcements
  for select
  to anon, authenticated
  using (active = true);

drop policy if exists "announcements_insert_demo" on public.announcements;
create policy "announcements_insert_demo"
  on public.announcements
  for insert
  to anon, authenticated
  with check (id like 'demo-%' and active = true);

create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.announcements;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;
