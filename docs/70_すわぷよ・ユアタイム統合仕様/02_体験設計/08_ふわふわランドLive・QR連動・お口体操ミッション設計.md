# ふわふわランドLive・QR連動・お口体操ミッション設計

> 作成: 2026-07-19（夜間フルオート実装の正本）
> 対象: 2026-08-02 YourTIME本番のふわふわランド大画面・運営管理・すわぷよLINE連動
> 発注意図: 木幡さん2026-07-19指示（BGM選択、生活感ある動き5種、劇的イベント6種、世界最高峰の管理UX、QR→LINE連携→キャラ選択、お口体操ミッション化）

## 0. スコープと非スコープ

**スコープ**

1. ふわふわランド表示画面のBGMシステム（サザエさん風の昭和歌謡マーチ調を含む複数曲、運営側から選択）
2. キャラクターが「そこで暮らしている」ように見える行動パターン5種
3. 子どもが大喜びする劇的表示イベント6種（既存「ふわふわバトル」に追加）
4. 運営管理画面v2（PC/SP両対応、元からいるキャラ＋作られたキャラの統合管理、名前編集、大きさ、表示非表示）
5. キャラごとのQRコード発行（管理画面から、PC/SPどちらでも）→ 読み込むとすわぷよLIFFへ → LINE IDとキャラが裏で連結 → すわぷよのキャラ選択で「じぶんのキャラ」として使用可能
6. すわぷよのお口体操v2: プレイ中60秒に1回、首なし・お口と顔系のみ10種、キャラ登場、タイプ別15〜60秒、一時停止・スキップ・任意完了、開始時の間とワクワク演出、体操ごとに異なる音楽

**非スコープ（既存Gate遵守）**

- CHECKIN-106/107の本番schema・署名・RLS
- ONBOARD-303（年齢境界未確定）
- LINE-204〜209の外部素材・実機運用値の推測
- LINEチャネル側の実設定変更（LIFF IDは既存`VITE_SUWAPUYO_LIFF_ID`を使用。実機検証は別タスク）

## 1. BGMシステム（ふわふわランド表示画面）

### 1.1 方針

- 音源ファイルは追加しない。既存`SoundFX`と同じ**Web Audio APIによる完全合成**でループBGMを生成する（`src/audio/BgmEngine.ts`）。理由: 著作権リスクゼロ、追加アセット管理ゼロ、既存の音解禁パターン（表示画面「音ON」）と整合。
- 「サザエさん風」は雰囲気の参照であり、旋律の複製はしない。**昭和歌謡×行進曲調（スウィング、ブラス風スクエア波リード、ウォーキングベース、4つ打ちパーカッション）**として独自に作曲する。

### 1.2 曲ラインナップ（4曲＋OFF）

| id | 曲名 | 雰囲気 | 音楽設計 |
|---|---|---|---|
| `fuwafuwa_march` | ふわふわマーチ | サザエさん風・陽気な昭和茶の間 | C長調、約132BPM、スウィング8分、I-VI-II-V進行、スクエア波リード＋三角波ベース＋ノイズパーカッション |
| `hidamari_sanpo` | ひだまりさんぽ | のんびり昼下がり | F長調、約96BPM、ゆったり3コード、サイン波リード |
| `omatsuri` | おまつりばやし | イベント盛り上げ | 民謡風ペンタトニック、約140BPM、太鼓風キック強め |
| `hoshizora_waltz` | ほしぞらワルツ | 夕方クールダウン | 3拍子、約84BPM、アルペジオ主体 |
| `off` | BGMなし | — | 停止 |

### 1.3 同期と操作

- 選択状態は`display_state.settings`（新設jsonb列）の`bgmTrackId`に保存。運営画面（PC/SP）のセレクタ→Supabase realtime→表示画面が切替。
- 表示画面はブラウザの自動再生制限のため既存「音ON」解禁後に再生開始。音量は`settings.bgmVolume`（0–1、既定0.5）。
- イベント発火中はBGMを自動でダッキング（音量40%）し、イベントジングルを重ねる。

## 2. 行動パターン5種（暮らしている感）

`src/fuwafuwa-land/renderer/behaviors.ts`（新設）。各キャラは**状態機械**を持ち、確率的に遷移する。既存の`MotionBody`ドリフトは`float`状態として温存。

| id | 名前 | 見た目 | 遷移 |
|---|---|---|---|
| `float` | ぷかぷか | 既存ドリフト＋ボブ | 既定。8〜20秒で他へ抽選 |
| `stroll` | さんぽ | 画面下1/3を左右にてくてく（上下バウンス、進行方向へ軽く傾く）、ときどき立ち止まってきょろきょろ（左右反転） | 6〜14秒→float/nap/greet |
| `nap` | おひるね | その場でゆっくり沈み、傾いて静止、Zzz…の泡（Textパーティクル）を吐く | 5〜10秒→float |
| `play` | おいかけっこ | 近くのキャラをターゲットに追いかけ、追いつくとお互いぴょんと跳ねて解散 | 4〜8秒→float |
| `greet` | ごあいさつ | 最寄りのキャラに近づき、向き合って同時におじぎ（軽いスケール縦つぶし）＋ハート/音符パーティクル | 3〜5秒→float |

- 全体同時遷移を避けるため遷移抽選はキャラごとに独立タイマー。画面内の`nap`は最大3体、`play`/`greet`はペア成立時のみ。
- featured（主役）とバトル/イベント中のキャラは行動抽選から除外。
- 実装は`FuwafuwaWorld`の肥大回避のため`behaviors.ts`へ分離し、`tick`から`updateBehavior(item, world, deltaMs)`を呼ぶ。

## 3. 劇的イベント6種

`DisplayEvent.type`を`"battle"`単独からunion拡張。運営画面のイベントボタン（ワンタップ、連打防止）から発火。各イベントは固有ジングル（WebAudio）＋パーティクル演出＋自動終了→通常状態復帰。

| type | 名前 | 演出（約15〜20秒） |
|---|---|---|
| `rainbow` | にじのアーチ | 空に虹が伸びる→全キャラが虹の下へ集合→一斉ジャンプ×3→キラキラ |
| `fireworks` | はなびたいかい | 背景が夕焼け→夜へ暗転、花火を6〜10発打ち上げ、キャラ全員が上を見上げて「わ〜」バウンス |
| `candy_rain` | キャンディのあめ | 画面上からカラフルなキャンディが降り、キャラが左右に走ってキャッチ、キャッチ数がポップ表示 |
| `train` | ぷよぷよれっしゃ | 先頭に汽車エフェクト、キャラが一列に連結して画面を蛇行横断「しゅっしゅっぽっぽ」 |
| `bubbles` | シャボンだまタイム | 大きなシャボン玉が湧き、キャラが乗ってふわ〜っと上昇→頂上でぱちん！と弾けて落下 |
| `hero` | ヒーローとうじょう | 主役キャラ（featured）がスポットライト＋ファンファーレで巨大化、名前が大きく表示、紙吹雪、他キャラが囲んで拍手ジャンプ |

- `hero`はfeatured未設定時、最新の作品キャラを自動選出。
- displayState側は`startDisplayEvent(type)`へ一般化（`startBattleEvent`は残置ラッパー）。`isDisplayEvent`ガードのtype判定をunionへ拡張。
- 表示画面のイベント分岐（`type !== "battle"`）を`world.startDisplayEvent(event)`へ一般化。

## 4. 運営管理画面v2（世界最高峰のやりやすさ）

### 4.1 原則

- **1画面1目的・親指で完結**: SPは下部固定タブ＋大型タップ領域（最小44px）、PCは2カラム。
- **統合キャラ管理**: サンプル（元からいる22体）と作品キャラ（display_characters経由）を1つのリストで、区別バッジ付きで管理。
- **即時反映・楽観更新**: 操作は即UI反映→Supabase→realtimeで全端末同期。失敗時はトースト＋自動リトライ。

### 4.2 機能

| 機能 | 仕様 |
|---|---|
| 名前編集 | 行内インライン編集（タップ→テキスト入力→自動保存、debounce 600ms）。`display_characters.label`を更新（新設`setCharacterLabel`）。作品由来はartworks.given_nameへも同期 |
| 大きさ | スライダー0.1〜2.0＋プリセットボタン（ちいさめ/ふつう/おおきめ/とくだい）。debounce保存（現行の全件Promise.all連打を解消） |
| 表示/非表示 | 大型トグル。一覧に表示中数/全体数のサマリ常display |
| 検索・絞り込み | 名前検索、種別（もともと/おえかき）、状態。SPでもチップUI |
| イベント発火 | 7イベント（バトル＋新6種）をカード型ボタンで。実行中は残り時間表示＋停止ボタン |
| BGM選択 | 4曲＋OFFのセグメント選択＋音量スライダー |
| QR発行 | 各キャラ行の「QR」ボタン→モーダルでQR表示（後述） |

## 5. QR→LINE連携→すわぷよキャラ選択

### 5.1 体験フロー

1. 運営が管理画面（PC/SP）でキャラ行の「QRをつくる」→claimトークン発行→QRモーダル表示（保存/印刷可）。
2. 子ども・保護者がスマホでQRを読む→URL `"{APP_ORIGIN}/claim?token={uuid}"`（LIFF経由: `https://liff.line.me/{LIFF_ID}?claim={uuid}`にも対応）。
3. すわぷよアプリがLIFFセッションからLINE userIdを取得（demoモード時はローカル擬似ID）。
4. `claim_character` RPCがトークンを検証・原子的にclaim→`line_character_links`へ登録。
5. 成功画面「きみのキャラがすわぷよにやってきた！」→キャラ画像をbuddyStoreへ取り込み→キャラ選択画面の「じぶんのキャラ」枠で選択可能に。

### 5.2 DB設計（migration `202607190001_create_character_claim.sql`）

```sql
-- claimトークン（QR1枚=1トークン。再発行可、単回使用）
create table character_claim_tokens (
  token uuid primary key default gen_random_uuid(),
  display_character_id text not null references display_characters(id) on delete cascade,
  status text not null default 'active' check (status in ('active','claimed','revoked')),
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

-- LINEユーザーとキャラの連結（1ユーザー複数キャラ可、同一組は一意）
create table line_character_links (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null,
  display_character_id text not null references display_characters(id) on delete cascade,
  claim_token uuid references character_claim_tokens(token) on delete set null,
  created_at timestamptz not null default now(),
  unique (line_user_id, display_character_id)
);
create index line_character_links_user_idx on line_character_links (line_user_id);
```

- claimは`security definer`のRPC `claim_character(p_token uuid, p_line_user_id text)`で実行し、`status='active' and expires_at > now()`を`update ... returning`で原子的に消費（二重読み取り防止）。戻り値はキャラid/label/image_path。
- anon RLS: tokensはinsert/select（管理画面が発行・一覧するため。イベント会場キオスクモデルの現行方針に合わせる）、linksは直接insert不可（RPC経由のみ）＋自分のline_user_id行のselectは`where`引数照合のRPC `list_my_characters(p_line_user_id)`で提供。
- **既知の制約（記録）**: 現行システム全体がanon開放RLSのため、LINE userIdの自己申告を厳密検証しない（LIFF IDトークンのサーバ検証はCloudflare Functions導入後のフェーズで実施）。イベント運用ではリスク許容。SUW-03（認証方式決定）の後続対応に紐付け。

### 5.3 QR生成

- `qrcode` npmパッケージ（クライアント側canvas生成、依存1個・軽量）を追加。
- モーダルには QR画像、キャラ名、「すわぷよLINEで読み込んでね」、PNG保存ボタン、（PC）印刷ボタン。

## 6. お口体操v2「お口ミッション」（すわぷよゲーム内）

### 6.1 ルール（2026-07-21更新）

- プレイ中**60秒に1回**自動で提案（ゲームは一時停止）。スキップ後も60秒間スヌーズする。
- **首の体操は廃止**。お口・顔系のみ。
- 体操タイプごとに**15〜60秒の目安時間**を持つ。時間切れで自動完了・自動記録しない。
- **いつでも完了・一時停止・スキップ可能**。「できた！」を押した時だけ完了を記録し、スキップでは記録を増やさない。
- 開始時は約6.6秒で、キャラ登場→体操名→キャラ別応援→音付き`3・2・1`→開始掛け声→体操本編。開始演出中もスキップ可能。
- 応援は5系統×3バリエーションをキャラごとに安定して割り当て、直近4バリエーションを避ける。完全ランダムな人格変更は行わない。
- 体操ごとに**すべて異なる音楽**（WebAudio合成、イントロジングル＋本編ループ）。
- ホストキャラは22体からローテーション登場（直近出た子は避ける重み付き抽選）。

### 6.2 体操10種（お口・顔のみ）

| id | 名前 | かけ声ステップ | 目安 | 音楽の性格 |
|---|---|---|---|---|
| `aan` | おおきくあーん | あ・あ・あーん | 15秒 | 明るいマーチ |
| `niko_ii` | にっこりいー | い・い・いー | 15秒 | スキップ調 |
| `tako_uu` | たこさんうー | う・う・うー | 15秒 | コミカルなワルツ |
| `pukupuku` | ぷくぷくほっぺ | ぷく・ぷく・ぱっ | 20秒 | ぽこぽこ打楽器 |
| `beee` | べーっとした | べ・べ・べー | 15秒 | おどけたブルース |
| `pachipachi` | まばたきぱちぱち | ぱち・ぱち・ぎゅっ・ぱっ | 20秒 | 軽快なピチカート |
| `wink` | かためウィンク | みぎ・ひだり・みぎ・ひだり | 30秒 | ジャズ風 |
| `aiube` | あいうべたいそう | あ・い・う・べー | 45秒 | 王道体操曲 |
| `fuusen` | ほっぺふうせん | みぎぷく・ひだりぷく・こうたい | 30秒 | ラテン風 |
| `chu` | ちゅーのくち | ちゅ・ちゅ・にこっ | 15秒 | かわいいポップ |

秒数はUX上の暫定値であり、医療的な運動量を示さない。現行10種に60秒種はなく、今後のストーリー型・複合シーケンスを含め上限60秒とする。公開前に要確認-009の監修と子どもの実機テストで調整する。

### 6.3 演出シーケンス

1. **登場（1.2秒）**: 画面が少し暗転、「♪」とドラムロール、ホストキャラがぴょこんと登場。
2. **体操紹介（1.2秒）**: `きょうは「おおきくあーん」！`のように体操名を短く提示する。
3. **キャラ別応援（1.3秒）**: 元気、応援、のんびり、挑戦、お調子者の5系統からキャラに紐づく台詞を提示する。
4. **カウントダウン（2.1秒）**: `3・2・1`を0.7秒ずつ大表示し、数字の上昇に合わせてWebAudioの音程とキャラの跳ねを同期する。`prefers-reduced-motion`では動きを止め、数字と音は維持する。
5. **開始（0.8秒）**: `いっくよー！`等の掛け声、開始音、体操別イントロを同期して本編へ移る。
6. **本編**: かけ声ステップをビート同期（既存BEAT_MS=1500踏襲）で繰り返し、目安の残り秒数、`できた！`、`一時停止`、`スキップ`を常時表示する。
7. **完了待ち**: 目安時間終了後も自動完了せず「できたら おして！」を表示する。`できた！`で完了記録とスタンプ演出、`スキップ`では記録せずゲームへ戻り、どちらも60秒タイマーをリセットする。

### 6.4 実装配置

- `src/exercise/mouthMissions.ts`: 10種の定義（ステップ・ピクト・かけ声・音楽譜面）。
- `src/exercise/missionIntro.ts`: キャラ別の応援系統、掛け声バリエーション、直近履歴回避。
- `src/exercise/TaisouMission.tsx`: 新オーバーレイ（旧`TaisouInterlude`はexercise単独ルート用に残置、ゲーム内からは新コンポーネントへ差し替え）。
- `src/audio/TaisouMusic.ts`: 体操別ジングル＋ループのWebAudio合成。
- `DemoScreen`: 60秒インターバルタイマー（体操中・バトル演出中は停止）、`?taisou=1`初回起動は維持。

## 7. 追加提案（未指示だが価値が高いもの）

実装済みに含めたもの:

- **イベント実行中の残り時間表示と停止ボタン**（運営が焦らない）
- **BGMダッキング**（イベントジングルと混ざって音が濁るのを防止）
- **QRのPNG保存・印刷**（会場でその場で渡せる）
- **体操がんばりカウントのゲーム内表示**（できた！のたびにスタンプが貯まる感覚）

未実装・今後の提案（判断待ち）:

1. **おかえり演出**: QRクレーム済みキャラがランド画面で「◯◯ちゃんのキャラ」と小さな王冠を持つ→自分の作品が特別扱いされる喜び。
2. **体操の親向けレポート**: LINEのFlexメッセージで「今日は5回お口体操できました」通知（LINE Messaging API側Gate通過後）。
3. **ランドのじかん帯演出**: 実時刻連動で背景を朝/昼/夕/夜に切替、BGMも自動で追随。
4. **できた！の写真なし証拠**: 体操完了時に効果音を鳴らし周囲の大人が気づける「がんばったね」瞬間を作る（顔撮影なし方針と整合）。
5. **claimトークンのサーバ側検証強化**: Cloudflare FunctionsでLIFF IDトークン検証（SUW-03の認証方式決定後）。

## 9. せりふ（ふきだし）システム（SUW-32・2026-07-19夜間追加指示）

> 発注意図: 木幡さん2026-07-19指示（各キャラが暮らし感のあるひとことをふきだしで喋る。管理画面から追加/削除・頻度設定・誰に喋らせるかを制御できる。将来的にはどのキャラがどのブースを紹介するかにも繋げたいので、DBで持ってふわふわランド旧統合版表示とすわぷよ側ブース紹介の両方から参照できる形にする）

### 9.1 スコープ

- ランド表示画面でキャラが定期的にふきだしでセリフを言う（例:「お腹すいたー」「はみがこーねー」「お口とからでつながってるらしいよー」「すわさんってお酒飲むと寝ちゃうんだって」）
- 管理画面（StaffPanel）からセリフの追加・削除・頻度（発話間隔）・対象キャラ（誰が喋るか。指定キャラ限定 or 誰でも）を設定
- 将来のブース紹介連動（SUW-29側の`boothCatalog`とキャラの紐付け）を見据え、`category`と`booth_ref`をスキーマに持たせておくが、**今回のSUW-32ではidle（暮らし雑談）カテゴリのみ実装・booth連動は実装しない**（SUW-29でboothCatalogが確定してから配線）。

### 9.2 DB設計（新規migration `202607190003_create_speech_lines.sql`）

```sql
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
```

- 発話頻度は新規テーブルを作らず既存の`display_state.settings`jsonbへ`speechIntervalMs`（既定30000、範囲15000〜120000）を追加（追加migration不要、既存`settings`カラムを再利用）。

### 9.3 管理画面（StaffPanel）

新セクション「せりふ」を追加:

| 機能 | 仕様 |
|---|---|
| 一覧 | テキスト・対象キャラ（バッジ、未指定は「だれでも」）・重み・有効/無効トグル |
| 追加 | テキスト入力（40字以内）＋対象キャラ選択（プルダウン、未選択=だれでも）＋重み（1〜5のスライダー） |
| 削除 | 行ごとに削除ボタン（確認なし、`active=false`の論理削除ではなく物理削除でよい。会場運用中の誤操作より「間違えたら足せばいい」を優先） |
| 頻度 | グローバル設定（セクション上部）: 発話間隔スライダー15〜120秒、`display_state.settings.speechIntervalMs`へdebounce保存 |

### 9.4 表示ロジック（`src/fuwafuwa-land/renderer/behaviors.ts`または新設`speechBubbles.ts`）

- 既存の`nap`状態のZzzパーティクル吹き出しと同じレンダリング機構（Textパーティクル）を再利用する。
- グローバルタイマー（`speechIntervalMs`±30%ジッター）で発火。対象候補: 現在表示中かつfeatured/イベント中でないキャラ全員。
- 候補セリフ = `category='idle' and active=true and (character_id is null or character_id = 抽選対象キャラid)`から重み付き抽選。
- 直前に喋ったキャラは次回抽選から除外（お口体操のホストローテーション同様、連続を避ける）。
- ふきだし表示は約4秒、その後自動フェードアウト。

### 9.5 非スコープ（今回やらないこと）

- booth_intro連動の実装（SUW-29のboothCatalog確定後に別タスクで配線）
- セリフの多言語化・個別キャラの口調差分ロジック（テキストで表現、システム側の口調変換はしない）

## 10. 検証計画

- L2: `tsc --noEmit`、eslint、vitest既存スイート。
- L3: 新規migrationのローカル適用確認（SQL構文）、Staff→Display間のrealtime連携は`/staff`+`/display`の2タブ手動確認手順を記載（実施は起床後でも可）。
- 60秒提案、タイプ別秒数、一時停止、スキップ、明示完了だけが記録されることをvitestで検証する。
- SUW-32: せりふ追加・削除・頻度変更が`/staff`→`/display`にrealtimeで反映されるか、指定キャラ限定セリフが他キャラに出ないか、直前キャラの連続除外をvitestで検証。
