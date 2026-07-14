# 08 — スタッフ表示キャラ管理・タップコンテンツCMS 仕様書

> 最終更新: 2026-06-25
> 位置づけ: `07_sponsor-tap-popup-spec.md` の次段。スポンサー特例ではなく、**表示キャラ全員にタップ時コンテンツを紐づけるCMS化**の実装正本。
> 採用方針: **Supabase保存 / 音声は手動再生 / サンプルキャラも永続化**。
> セルフレビュー結果: 2026-06-25時点で実装前の未決定事項は解消済み。DB変更・Storage bucket追加は実装着手前にユーザー承認を取る。

---

## 0. ゴール

スタッフページで、デフォルトキャラ・登録作品・出展者キャラを同じ「表示キャラ」として管理する。

スタッフは以下をブラウザだけで行える:

1. 表示キャラ一覧を `すべて / 表示中 / 非表示 / 削除済み` でフィルタ確認。
2. 各キャラの `表示 / 非表示 / 削除` 状態を即時変更。現在状態のボタンは塗り表示。
3. 各キャラの表示サイズを一律スライダーで調整・永続化。
4. キャラをタップした時に開くコンテンツを設定。
5. コンテンツはInstagram投稿のように複数枠を持ち、各枠で画像・動画・音声・本文・CTAを併用できる。
6. ディスプレイ側では、キャラタップ→設定済みコンテンツをポップアップ表示。音声はユーザー操作で再生。

## 1. 非ゴール

- 本仕様では実装・migration適用・本番デプロイはしない。
- 自動音声再生はしない。ブラウザ制限と会場運用事故を避けるため、音声は再生ボタン押下のみ。
- Storage物理削除はしない。削除は `archived` 状態への論理削除。
- 計測ダッシュボードは別PR。イベント行を保存できる設計だけ先に作る。

## 2. 重要な設計判断

| 判断 | 採用 | 理由 |
|---|---|---|
| 保存先 | Supabase Postgres + Storage | スタッフ端末と表示端末で即時同期し、イベント後にも資産が残る |
| サンプルキャラ | DBに永続化 | `sample-*` だけ特別扱いすると状態・サイズ・タップ設定が破綻する |
| 音声 | 手動再生 | 自動再生制限、会場での突然再生、複数端末事故を避ける |
| メディア | Storage保存 | 画像/動画/音声を同じアップロード経路にする |
| UI | 一覧 + 編集モーダル/ドロワー | 行内編集にすると一覧性が壊れる |
| タップ表示 | 汎用 `CharacterContentPopup` | `SponsorPopup` 特例を置き換え、全キャラ共通にする |
| CMS bucket公開範囲 | public | 会場表示・スタッフ端末の実装を単純化し、署名URL期限切れ事故を避ける |
| サンプルseed | migration SQL | 起動順や端末差に依存せず、DB正本を一度で確定する |
| 出展者キャラ | 初期は未投入 | 初期実装はサンプル + 登録作品。出展者は同じ器に後続投入 |
| 動画上限 | 50MB | スマホ回線とStorage使用量のバランス |
| 音声上限 | 20MB | 短い紹介音声・BGM用途には十分 |
| コンテンツ関係 | 1キャラ最大1公開コンテンツ | Phase 1では `display_characters.tap_content_id -> tap_contents.id` の1対1。履歴/複数下書きは後続 |
| DB制約 | 可能な範囲はDBで担保 | `cta_url`、枠の空データ禁止、scale範囲はDB checkを置く |
| Storage path保存 | object pathのみ | DBには `{character_id}/images/{uuid}.jpg` 形式を保存し、bucket名は保存しない |
| メディア上限分担 | bucketは50MB、細別上限はRepository/UI | Supabase bucket上限は単一値のため、画像5MB/音声20MBはクライアント検証 |
| tap_events権限 | anon insertのみ | デモ計測は書き込みだけ許可し、閲覧/更新は初期PRでは許可しない |
| tap_events meta | allowlist | `index`, `sourceType`, `contentItemKind` など限定キーのみ保存 |

## 3. データモデル

### 3.1 display_characters

表示画面に出せるキャラの正本。サンプル、登録作品、出展者キャラを統合する。

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| id | text | Yes | `sample-suusuu` / `ART-0001` / `sponsor-coralup` 等 |
| source_type | enum | Yes | `sample` / `artwork` / `sponsor` |
| source_id | text | Yes | 元データID。sampleなら同一ID、artworkなら `artworks.id` |
| label | text | Yes | 一覧・ポップアップ見出し |
| image_path | text | Yes | 表示用画像。public path または Storage path |
| source_image_path | text | No | 原本画像。サンプルは `public/content/fuwafuwa-land/characters/originals/...` |
| status | enum | Yes | `visible` / `hidden` / `archived` |
| display_scale | numeric | Yes | 0.1〜2.0。DB既定 0.6。サンプル22体の初期表示値は 0.2 |
| tap_enabled | boolean | Yes | タップ時コンテンツを有効にするか |
| tap_content_id | uuid | No | 紐づく `tap_contents.id` |
| sort_order | integer | Yes | スタッフ一覧・初期表示順 |
| created_at | timestamptz | Yes | 作成日時 |
| updated_at | timestamptz | Yes | 更新日時 |

制約:
- `(source_type, source_id)` は unique。
- `display_scale` は `0.1 <= display_scale <= 2.0`。
- `tap_content_id` は `tap_contents.id` を参照し、参照先削除時は `set null`。
- Phase 1では1キャラ最大1コンテンツ。複数履歴・予約公開・A/Bテストは作らない。
- `source_type='artwork'` の場合、`source_id` は `artworks.id` を参照する。ただしDB制約は初期PRでは緩くしてよい。登録作品削除時の循環を避けるため。

### 3.2 tap_contents

キャラタップ時に表示するポップアップ全体。

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| id | uuid | Yes | 主キー |
| title | text | Yes | ポップアップ見出し。既定はキャラ名 |
| body | text | No | 全体説明 |
| cta_label | text | No | CTAボタン文言 |
| cta_url | text | No | CTA遷移先 |
| is_published | boolean | Yes | falseなら表示側では未設定扱い |
| created_at | timestamptz | Yes | 作成日時 |
| updated_at | timestamptz | Yes | 更新日時 |

制約:
- `cta_url` は `https://` または空。`javascript:` 等は禁止。DB checkでも担保する。
- 医療/健康表現は `docs/20_business/medical-ad-content-policy.md` に従う。

### 3.3 tap_content_items

Instagram風の複数枠。1枠に画像/動画/音声/本文を持てる。

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| id | uuid | Yes | 主キー |
| tap_content_id | uuid | Yes | `tap_contents.id` |
| sort_order | integer | Yes | 枠順 |
| title | text | No | 枠見出し |
| caption | text | No | 枠説明 |
| image_path | text | No | 画像Storage path |
| video_path | text | No | 動画Storage path |
| audio_path | text | No | 音声Storage path |
| alt | text | No | 画像/動画の代替テキスト |
| thumbnail_path | text | No | 動画サムネイル。任意 |
| created_at | timestamptz | Yes | 作成日時 |
| updated_at | timestamptz | Yes | 更新日時 |

制約:
- `image_path`, `video_path`, `audio_path` の少なくとも1つ、または `caption` が必須。DB checkでも担保する。
- 1つの枠で画像と動画が両方ある場合、UIでは動画を主表示、画像をサムネイル/代替として使う。
- 音声は枠ごとの再生ボタンで再生。自動再生しない。

### 3.4 tap_events

計測の保存先。ダッシュボードは後続。

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| id | uuid | Yes | 主キー |
| event_type | enum | Yes | `tap` / `popup_open` / `item_view` / `audio_play` / `cta_click` |
| character_id | text | No | `display_characters.id` |
| tap_content_id | uuid | No | 表示コンテンツ |
| item_id | uuid | No | 表示枠 |
| meta | jsonb | Yes | `{ index, sourceType, ... }` |
| created_at | timestamptz | Yes | 発生日時 |

PII禁止:
- 名前・端末固有ID・IP由来の値は保存しない。
- 必要になった場合はSHA256 prefix12等で匿名化して別仕様にする。

## 4. Storage

### 4.1 バケット

既存 `artworks` は子どもの登録作品用。CMSメディアは分離する。

| バケット | 用途 | public | 上限 |
|---|---|---:|---|
| `artworks` | 登録作品画像 | true | 既存 |
| `character-content` | タップコンテンツ画像/動画/音声 | true | 初期は画像5MB、動画50MB、音声20MB目安 |

bucket設定:
- `file_size_limit = 52428800`（50MB）。
- `allowed_mime_types` は画像/動画/音声の許可MIMEをすべて含める。
- 画像5MB、音声20MBの細別上限はRepository/UIで検証する。

### 4.2 パス規約

```txt
{character_id}/
  images/{uuid}.jpg|png|webp
  videos/{uuid}.mp4|webm
  audio/{uuid}.mp3|m4a|wav
  thumbnails/{uuid}.jpg|webp
```

DBに保存する `image_path` / `video_path` / `audio_path` / `thumbnail_path` は bucket名を含まない object path とする。public URLはRepositoryで `storage.from("character-content").getPublicUrl(path)` から生成する。

アップロード時:
- ファイル名は必ずUUID化。ユーザー入力ファイル名を保存パスに使わない。
- MIME typeを検証する。
- 画像は長辺1600px以内にクライアント側で圧縮してから保存。
- 動画は初期PRでは圧縮しない。サイズ超過時は明確なエラーを出す。
- 音声は初期PRでは圧縮しない。サイズ超過時は明確なエラーを出す。

許可MIME:
- 画像: `image/png`, `image/jpeg`, `image/webp`
- 動画: `video/mp4`, `video/webm`
- 音声: `audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/webm`

## 5. スタッフUI

### 5.1 一覧

上部:
- 検索: ID/名前/種別
- フィルタ: `すべて` / `表示中` / `非表示` / `削除済み`
- 種別フィルタ: `すべて` / `サンプル` / `作品` / `出展者`

行:
- サムネイル
- 名前
- 種別バッジ
- 状態バッジ
- サイズスライダー
- `表示` / `非表示` / `削除` 小ボタン
- `タップ設定` 状態: `未設定` / `下書き` / `公開中`
- `編集` ボタン

状態ボタン:
- `status='visible'`: 表示ボタンを塗り、非表示/削除は淡色。
- `status='hidden'`: 非表示ボタンを塗り、表示/削除は淡色。
- `status='archived'`: 削除ボタンを塗り、表示/非表示は disabled または復元ボタンに差し替え。

サイズスライダー:
- 全キャラ共通で表示。
- 範囲: 0.1〜2.0、step 0.1。
- サンプルもDB永続化するため、操作後に再読み込みしても維持。
- スライダー操作は debounce 300ms。ドラッグ中に連続DB updateを乱発しない。

### 5.2 編集モーダル/ドロワー

タブ:
- `基本`
- `タップ時コンテンツ`
- `プレビュー`

基本:
- 名前
- 状態
- 表示サイズ
- タップ有効ON/OFF

タップ時コンテンツ:
- タイトル
- 全体説明
- CTAラベル
- CTA URL
- 公開ON/OFF
- 枠一覧

枠編集:
- 画像アップロード
- 動画アップロード
- 音声アップロード
- 枠タイトル
- キャプション
- alt
- 並び替え
- 削除

メディア登録UI:
- キャラを選択し、枠ごとに画像/動画/音声をブラウザのファイル選択から登録する。
- 各スロットは `未登録` / `登録済み` が分かる表示にする。
- 登録済みスロットは `差し替え` と `外す` を提供する。
- ローカルファイルパスを直接保存しない。選択ファイルを `character-content` Storageへアップロードし、DBにはobject pathだけを保存する。
- 画像はPNG/JPG/WebP 5MBまで、動画はMP4/WebM 50MBまで、音声はMP3/M4A/WAV/WebM 20MBまでをRepositoryで検証する。

プレビュー:
- 実際のディスプレイポップアップに近い見た目。
- 動画は controls 表示。
- 音声は再生ボタン。
- CTAはクリック可能だが、プレビューでは別タブ遷移前に確認表示してもよい。

## 6. ディスプレイUI

### 6.1 タップ動線

1. PixiJS上の表示キャラを pointer tap。
2. `track("tap", characterId)`。
3. `display_characters.tap_enabled` と `tap_contents.is_published` を確認。
4. 未設定なら何も開かない。将来は軽い反応音だけ検討。
5. 設定済みなら `CharacterContentPopup` を開く。
6. `track("popup_open", characterId, { tapContentId })`。

### 6.2 CharacterContentPopup

`SponsorPopup` を置き換える汎用ポップアップ。

表示:
- タイトル
- 全体説明
- 複数枠カルーセル
- ドット
- 左右矢印
- CTA
- 閉じる

枠:
- 画像があれば `img`
- 動画があれば `video controls playsInline preload="metadata"`
- 音声があれば `audio controls preload="metadata"`
- 音声は自動再生しない
- captionを表示

イベント:
- 枠変更: `track("item_view", characterId, { index, itemId })`
- 音声再生: `track("audio_play", characterId, { itemId })`
- CTAクリック: `track("cta_click", characterId, { tapContentId })`

## 7. 実装ステップ

### Phase 1: 仕様・DB

1. migration追加: enum, `display_characters`, `tap_contents`, `tap_content_items`, `tap_events`, `character-content` bucket。
2. `public/content/fuwafuwa-land/characters/originals` のサンプル22体を `display_characters` にseed/upsertするSQLを追加。
3. Supabase型生成。
4. Repository層追加。

実装メモ:
- migration名は `20260625xxxx_create_character_content_cms.sql`。
- enumは `character_source_type`, `display_character_status`, `tap_event_type`。
- `character-content` bucketは `supabase/config.toml` ではなく既存方針に合わせてmigration SQLで作られている場合、既存 `202606230002_create_artworks_storage_bucket.sql` と同じ方式に揃える。
- RLSは `display_characters` / `tap_contents` / `tap_content_items` は anon read/insert/update を許可する。`tap_events` は anon insert のみ許可する。
- Realtime publicationには `display_characters`, `tap_contents`, `tap_content_items` を追加する。`tap_events` はRealtime対象外。
- サンプルseedは `image_path=/content/fuwafuwa-land/characters/display/*.png`、`source_image_path=/content/fuwafuwa-land/characters/originals/*.png` で固定する。
- サンプル22体の `display_scale` 初期値は 0.2。22体同時表示で画面密度を保つため、DB default 0.6とは分ける。
- 新仕様の `display_scale` は `display_characters` だけ 0.1〜2.0。既存 `artworks.display_scale` は当面0.1〜1.0のまま触らない。

### Phase 2: スタッフ一覧

1. `ArtworkList` を `CharacterList` に分離。
2. フィルタ・状態ボタン塗り・サイズスライダーを実装。
3. サンプル/登録作品/出展者を `display_characters` から読む。
4. 登録作品が増えた時、対応する `display_characters` を作る。

実装メモ:
- 既存 `ArtworkList` は登録作品一覧責務から外し、表示キャラ管理は `CharacterList` に寄せる。
- `display_state.visible_artwork_ids` は段階移行中だけ残す。CMS完了後は `display_characters.status='visible'` + `sort_order` + `display_scale` を表示正本にする。
- 初期PRで移行リスクが高い場合、`DisplayStateService` が `display_characters` から `visibleArtworkIds` 相当を組み立てる互換層を置く。

### Phase 3: コンテンツ編集

1. 編集モーダル/ドロワー。
2. 画像/動画/音声アップロード。
3. 複数枠追加・削除・並び替え。
4. プレビュー。

実装メモ:
- 新規依存は追加しない。並び替えは上下ボタンで実装する。
- ファイル選択は枠ごとに `input type="file"` を分ける。
- アップロード前にサイズ/MIMEを検証し、失敗理由をスタッフに短文で出す。
- 下書き保存と公開切替を分ける。公開中コンテンツが壊れた状態にならないよう、必須チェックを通った時だけ `is_published=true` にできる。

### Phase 4: ディスプレイ反映

1. `FuwafuwaWorld` の表示対象を `display_characters` に寄せる。
2. `CharacterContentPopup` 実装。
3. `SponsorPopup`/`sponsors[]` は互換レイヤとして残すか、移行後に削除する。
4. `track()` を `tap_events` insertに接続。

実装メモ:
- `SponsorPopup` は移行完了後に削除する。互換期間中はすーすー動画を `sample-suusuu` のseedコンテンツに移し、二重表示を避ける。
- 既存の秘密モードは `sample-waawaa` の5回タップを優先する。わーわーは通常タップ1回でCMSを開かず、5回連続だけ秘密モードにするかは別仕様ではなく既存挙動維持を優先する。
- 他キャラは1回タップでCMSコンテンツを開く。

## 8. 受け入れ基準

スタッフ:
- 一覧で `すべて / 表示中 / 非表示 / 削除済み` の件数と内容が正しい。
- 現在状態のボタンだけが塗られている。
- 表示/非表示/削除を押すと、一覧とディスプレイに1〜2秒で反映される。
- 削除は物理削除ではなく `display_characters.status='archived'` とし、ディスプレイ上の既存表示・ロード中sprite・開いているポップアップからも除外される。
- サンプルキャラのサイズを変えてリロードしても維持される。
- 登録作品にも同じサイズスライダーが出る。
- キャラごとにタップコンテンツを作成・編集・公開できる。
- 画像/動画/音声の混在枠を複数設定できる。

ディスプレイ:
- タップ設定なしのキャラはタップしてもポップアップが出ない。
- タップ設定ありのキャラはポップアップが出る。
- 画像/動画/音声が同じ枠で破綻なく表示される。
- 音声は自動再生されず、再生ボタンで鳴る。
- CTAは別タブで開く。
- Esc/×/オーバーレイで閉じる。

品質:
- `npm run build` green。
- 変更対象に `any` を追加しない。
- `.env*` に触らない。
- 1PRの変更ファイルは20以下に分割する。DB/Repository/UI/Displayは必要ならPR分割。

## 9. 未実装時の暫定互換

2026-06-25時点の実装は、汎用 `CharacterContentPopup` と `tap_events` 保存まで接続済み。互換として、旧 `sponsors[]` + `SponsorPopup` は残っている。

今回実装済み:
- migration: `display_characters`, `tap_contents`, `tap_content_items`, `tap_events`, public `character-content` bucket。
- seed: `public/content/fuwafuwa-land/characters/display/*.png` のサンプル22体と、`sample-suusuu` の動画コンテンツ。
- Repository: `CharacterContentRepository` で一覧、状態変更、サイズ変更、保存、Storage upload、計測を扱う。
- Staff: `CharacterList` で表示状態/種別フィルタ、状態ボタン、全体サイズ、枠ごとの画像/動画/音声登録、差し替え、外す、上下並び替え、保存前プレビューを扱う。
- Staff: 旧 `ArtworkList` はスタッフ画面から外し、サンプル/登録作品/出展者の管理正本を `display_characters` + `CharacterList` に一本化する。
- Display: `onCharacterTap` でCMSコンテンツを取得し、公開済み・設定済みのみ `CharacterContentPopup` を開く。
- Display: `display_characters.status='visible'` だけを表示正本にし、`hidden` / `archived` は既存sprite、ロード中sprite、開いているポップアップからも除外する。

未完了:
- 結合QA: スタッフ一覧、コンテンツ編集、ディスプレイタップ、計測保存、メディア失敗時の復旧。
- 出展社/YourTIME管理・レポート向けの将来DB設計。
- Cloud Run API + Drizzle移行を見据えたRepository境界メモ。

### 9.1 結合QAチェックリスト

実DBへmigration適用後、以下を確認する。

スタッフ一覧:
- サンプル22体が初期表示される。
- `すべて / 表示中 / 非表示 / 削除済み` フィルタが正しく絞り込む。
- `全種別 / サンプル / 登録作品 / 出展者` フィルタが正しく絞り込む。
- 現在状態の `表示 / 非表示 / 削除` ボタンだけが塗られる。
- サイズバー変更がDBへ保存され、ディスプレイ上のサイズに反映される。

コンテンツ編集:
- タイトル/本文/CTA/枠タイトル/キャプション入力中にスタッフ画面がクラッシュせず、選択キャラと入力値が維持される。
- 画像、動画、音声を枠ごとに登録できる。
- 上下ボタンで枠順を変えられ、保存後も順番が維持される。
- プレビューに画像、動画、音声、本文、CTAが表示される。
- `https://` 以外のCTA URLは保存できない。
- 空枠だけでは公開保存できない。

ディスプレイ:
- 表示中キャラだけが出る。
- 非表示/削除済みキャラは消える。
- タップ未設定キャラではポップアップが開かない。
- 公開済みコンテンツを持つキャラだけポップアップが開く。
- `sample-suusuu` タップでseed動画が出る。
- `sample-waawaa` の秘密モードが従来通り動く。
- バトル中に表示が破綻しない。

計測:
- `tap`, `popup_open`, `item_view`, `audio_play`, `cta_click` が `tap_events` に保存される。
- `tap_events.meta` にPIIが入っていない。

### 9.2 結合QA実施ログ（2026-06-25 / 2026-06-26）

CLI/自動確認:
- `npm run build` 成功。
- CMS関連ファイルの個別 `eslint` 成功。
- 全体 `npm run lint` は既存 `src/components/screens/DemoScreen.tsx` の `any` 多数で失敗。CMS追加分ではない。
- `npx supabase db push` で `202606250001_create_character_content_cms.sql` 適用済み。
- `npx supabase db push` で `202606250002_set_sample_character_display_scale.sql` 適用済み。
- `npx supabase db push --linked` で `202606260001_backfill_artwork_display_characters.sql` 適用済み。
- remote migration listで `202606250001` / `202606250002` / `202606260001` 反映済み。
- remote `display_characters` は22件。
- 2026-06-26 backfill後、remote `display_characters` は `sample=22` / `artwork=19`。既存登録作品も `CharacterList` に統合済み。
- remote `display_characters.display_scale` は全サンプル 0.2。
- remote `sample-suusuu` は `tap_enabled=true`、公開済み `tap_contents` と `/content/02_ユアタイム/04_映像・開始終了カード/01_出展ブース紹介.mp4` を持つ。
- remote `character-content` bucket はpublic、50MB、画像/動画/音声MIME許可。
- remote `tap_events` に `tap`, `popup_open`, `item_view` の保存を確認。
- remote `display_state.display_event` に残っていたbattle状態はQA後に `null` へ戻した。

画面確認:
- `/staff` は表示され、CMSフィルタ、サンプル一覧、状態ボタン、サイズスライダー、編集ペインが描画される。
- `/staff` で `sample-suusuu` を選択し、タイトル欄へCDP実キーボード入力した際にクラッシュせず、`/staff`、選択状態、入力値、プレビューが維持されることを確認。
- `/display` は通常状態で22体を表示し、FPS overlayが表示される。
- 22体同時表示の初期サイズは0.2。画面密度重視のデモ初期値として採用。
- `/staff` では旧 `ArtworkList` を表示せず、サンプル/登録作品が同じ `CharacterList` に出ることをDOM確認。
- `/display` は `display_characters.status` から表示対象を再計算する。削除済みは論理削除のまま画面から除外し、ロード中の再追加も防ぐ。
- Vercel productionへ反映済み。alias: `https://fuwafuwa-land.vercel.app`、latest deployment: `https://fuwafuwa-land-6aanq8j27-ks-classic.vercel.app`。

未確認:
- Staff画面からの実ファイルアップロード。
- Staff画面での保存操作後、Display画面で任意キャラのポップアップ表示。
- 実ブラウザ複数端末での削除操作からディスプレイ消去までの秒数計測。
- `audio_play` / `cta_click` の実操作保存。
- Realtimeの複数端末同時操作。

CMS実装後:
- `sponsors[]` は `display_characters` + `tap_contents` に移行。
- `SponsorPopup` は `CharacterContentPopup` に置き換え。
- すーすー動画は `sample-suusuu` の `tap_contents` としてseedする。

## 10. 実装前承認事項

仕様上の未決定はない。実装前にユーザー承認が必要な操作だけを明示する。

1. DBスキーマ変更: `display_characters`, `tap_contents`, `tap_content_items`, `tap_events` の追加。
2. Storage bucket追加: public `character-content`。
3. Supabase型再生成。
4. 既存表示経路の移行: `display_state.visible_artwork_ids` 主体から `display_characters` 主体へ段階移行。

## 11. セルフレビュー

- 仕様未定義: なし。保存先、音声再生、サンプル永続化、bucket公開、seed方式、出展者投入範囲、サイズ上限を確定済み。
- セキュリティ: `.env*` 不要。アップロードパスはUUID化。CTAは `https://` のみ。PIIを `tap_events` に保存しない。
- UX: 一覧はフィルタと状態ボタン塗りで状況確認を優先。詳細編集はモーダル/ドロワーに分離。
- 運用: 削除は論理削除。音声は手動再生。動画/音声はサイズ超過時に明確なエラー。
- 移行: `SponsorPopup` は `CharacterContentPopup` に吸収し、すーすー動画はseedコンテンツへ移す。

## 12. 将来アーキテクチャ視野: APIサーバー / Drizzle / 出展社レポート

### 12.1 現フェーズの判断

2026-06-25時点のデモ/MVPでは、ブラウザSPA + Supabase JS + RLS + Storage + Realtime を正とする。ブラウザに `DATABASE_URL` を持たせない。

理由:
- `DATABASE_URL` はDB直結用の強い秘密情報で、ブラウザ配布物に含められない。
- 現機能はスタッフ画面、ディスプレイ画面、Storage upload、Realtime反映、tap計測が中心で、Supabase JSの責務に合っている。
- デモ段階でAPIサーバー/ORM層を増やすと、運用・認証・デプロイ・監視の面が増え、8/2 MVPの速度を落とす。

### 12.2 Drizzleを入れるべきタイミング

出展社（クライアント）ごとの管理、YourTIME側の管理、クリック/タップ/CTAのレポート、課金・契約・監査ログが本格化したら、APIサーバー + Drizzle を検討する。

特に以下が始まったら移行優先度を上げる:
- 出展社ごとのログインと権限分離。
- 出展社別レポート: タップ数、ポップアップ表示数、動画再生、CTAクリック、時間帯別、日別、キャラ別。
- YourTIME運営向けの横断ダッシュボード。
- 請求、契約プラン、スポンサー枠の公開予約。
- 医療広告/PR表記の承認ワークフローと監査証跡。
- RLSだけでは表現しにくい集計・権限・業務ルール。

### 12.3 推奨進化形

将来の標準形:

```txt
Browser
  -> Cloud Run API
    -> Drizzle
      -> Postgres

Browser
  -> Supabase Storage / Realtime
```

Cloud Run APIの責務:
- 出展社/YourTIME管理画面の認証済みAPI。
- レポート集計API。
- CSV/PDF出力。
- 請求・契約・公開予約。
- 監査ログ、承認フロー、医療広告レビュー状態。
- Service Role / `DATABASE_URL` の保持。ブラウザには渡さない。

Supabase JSを残す責務:
- イベント当日の低遅延表示。
- public Storage配信。
- Realtimeの画面同期。
- オフライン/会場運用に近い軽量な表示操作。

### 12.4 移行しやすくするための現時点ルール

- UIからSupabaseを直接呼ぶ処理はRepository interfaceの内側に閉じる。
- `tap_events` は将来集計しやすい粒度で保存する。PIIは入れない。
- `character_id`, `tap_content_id`, `item_id`, `event_type`, `created_at` を集計キーとして維持する。
- 出展社概念を追加する時は `exhibitors` / `sponsor_slots` / `campaigns` / `report_snapshots` を別テーブルで足し、既存tapログを壊さない。
- APIサーバー移行時も、画面側の呼び出し先をRepository実装差し替えで済ませる。
