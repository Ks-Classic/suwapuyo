create table fuwafuwa_speech_lines (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 40),
  character_id text references display_characters(id) on delete cascade,
  -- character_id が null の場合は「誰でも言える」共通セリフ
  category text not null default 'idle' check (category in ('idle', 'booth_intro')),
  -- booth_intro は将来SUW-29のboothCatalog確定後に配線。今回は書き込み口だけ用意し、表示ロジックはidleのみ参照
  booth_ref text,
  weight integer not null default 1 check (weight > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index fuwafuwa_speech_lines_character_idx on fuwafuwa_speech_lines (character_id);

-- 既存パターン踏襲: 会場キオスクモデルのためanon開放（SUW-03認証方式決定後にSUW-30側でまとめて締める）
alter table fuwafuwa_speech_lines enable row level security;
create policy "speech_lines anon all" on fuwafuwa_speech_lines for all using (true) with check (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table fuwafuwa_speech_lines;
  end if;
exception
  when duplicate_object then null;
end;
$$;
