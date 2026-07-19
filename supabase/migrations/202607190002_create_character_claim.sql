-- キャラQRクレーム: 運営発行QR → すわぷよLIFF → LINEユーザーとキャラを連結
-- 正本: docs/70_すわぷよ・ユアタイム統合仕様/02_体験設計/08_ふわふわランドLive・QR連動・お口体操ミッション設計.md §5
--
-- 設計メモ:
-- - claim消費は security definer RPC で update...returning による原子的消費(二重claim防止)。
-- - 同一ユーザーが同一トークンを再スキャンした場合は冪等に成功扱い(CR-W)。
-- - line_character_links は anon 直接アクセス不可。RPC経由のみ。
-- - LINE userId の自己申告検証(LIFF IDトークンのサーバ検証)は SUW-03 認証方式決定後の
--   Cloudflare Functions フェーズで強化する(設計書 §5.2 既知の制約)。

create table if not exists character_claim_tokens (
  token uuid primary key default gen_random_uuid(),
  display_character_id text not null references display_characters(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'claimed', 'revoked')),
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create index if not exists character_claim_tokens_character_idx
  on character_claim_tokens (display_character_id, created_at desc);

create table if not exists line_character_links (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null,
  display_character_id text not null references display_characters(id) on delete cascade,
  claim_token uuid references character_claim_tokens(token) on delete set null,
  created_at timestamptz not null default now(),
  unique (line_user_id, display_character_id)
);

create index if not exists line_character_links_user_idx
  on line_character_links (line_user_id);

alter table character_claim_tokens enable row level security;
alter table line_character_links enable row level security;

-- 運営画面(イベント会場キオスクモデル、既存方針に合わせ anon)がトークンを発行・一覧・失効する
drop policy if exists "event anon can read claim tokens" on character_claim_tokens;
create policy "event anon can read claim tokens"
on character_claim_tokens for select
to anon
using (true);

drop policy if exists "event anon can insert claim tokens" on character_claim_tokens;
create policy "event anon can insert claim tokens"
on character_claim_tokens for insert
to anon
with check (true);

drop policy if exists "event anon can update claim tokens" on character_claim_tokens;
create policy "event anon can update claim tokens"
on character_claim_tokens for update
to anon
using (true)
with check (true);

-- line_character_links には anon ポリシーを付与しない(RPC経由のみ)

create or replace function claim_character(p_token uuid, p_line_user_id text)
returns table (
  display_character_id text,
  label text,
  image_path text,
  source_type character_source_type,
  source_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_char_id text;
begin
  if p_line_user_id is null or length(trim(p_line_user_id)) = 0 then
    raise exception 'line_user_id_required';
  end if;

  update character_claim_tokens t
  set status = 'claimed', claimed_at = now()
  where t.token = p_token
    and t.status = 'active'
    and t.expires_at > now()
  returning t.display_character_id into v_char_id;

  if v_char_id is null then
    -- claim済みトークンを同一ユーザーが再スキャンした場合は冪等に成功扱い
    select t.display_character_id into v_char_id
    from character_claim_tokens t
    join line_character_links l on l.claim_token = t.token
    where t.token = p_token
      and l.line_user_id = p_line_user_id;

    if v_char_id is null then
      raise exception 'invalid_or_used_token';
    end if;
  else
    insert into line_character_links (line_user_id, display_character_id, claim_token)
    values (p_line_user_id, v_char_id, p_token)
    on conflict (line_user_id, display_character_id) do nothing;
  end if;

  return query
  select c.id, c.label, c.image_path, c.source_type, c.source_id
  from display_characters c
  where c.id = v_char_id;
end;
$$;

grant execute on function claim_character(uuid, text) to anon;

create or replace function list_my_characters(p_line_user_id text)
returns table (
  display_character_id text,
  label text,
  image_path text,
  source_type character_source_type,
  source_id text,
  linked_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select c.id, c.label, c.image_path, c.source_type, c.source_id, l.created_at
  from line_character_links l
  join display_characters c on c.id = l.display_character_id
  where l.line_user_id = p_line_user_id
  order by l.created_at desc;
$$;

grant execute on function list_my_characters(text) to anon;
