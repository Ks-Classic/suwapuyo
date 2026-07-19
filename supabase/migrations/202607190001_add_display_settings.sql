-- ふわふわランド表示設定(BGM等)を display_state に追加
-- 正本: docs/70_すわぷよ・ユアタイム統合仕様/02_体験設計/08_ふわふわランドLive・QR連動・お口体操ミッション設計.md §1.3
-- settings 例: {"bgmTrackId":"fuwafuwa_march","bgmVolume":0.5}
alter table display_state
add column if not exists settings jsonb not null default '{}'::jsonb;
