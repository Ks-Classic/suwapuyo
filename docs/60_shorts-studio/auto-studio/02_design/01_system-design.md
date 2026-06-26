# Shorts Auto Studio System Design

## 全体方針

既存の `shorts/render.py` は、JSONから確実に動画を生成するレンダリングコアとして残す。Webアプリや生成AIはこのレンダラに直接密結合せず、JSON/CLI境界で接続する。

```text
Web UI
  -> Backend API
    -> Template / Character / Feedback DB
    -> Generation Engine
    -> Render Queue
      -> Python Render Worker
        -> preview PNG / mp4
        -> storage
        -> download URL
```

## 主要コンポーネント

### Web UI

- 今日の候補一覧
- レビュー/編集画面
- キャラ一覧
- テンプレート管理
- フィードバック/学習画面
- MP4出力画面
- 投稿補助画面

### Generation Engine

- テーマ/ターゲットから企画案を作る
- キャラ台帳を参照する
- ストーリーテンプレートを選ぶ
- 変数を最適ランダムで選ぶ
- タイトル/セリフ/layoutを生成する
- 医療・健康表現をチェックする
- レンダラ用JSONへ変換する

### Renderer

- 入力: video JSON
- 出力: preview PNG / mp4
- 責務: 描画・音声合成・動画生成
- やらない: 企画判断、医療表現判断、SNS投稿

### Manual Posting Assistant

MVPではSNS API投稿を行わない。

- MP4ダウンロード
- 投稿文下書き
- ハッシュタグ
- 投稿チェックリスト
- 手動投稿済みフラグ

SNS API連携は、MP4出力運用が安定してから別フェーズで検討する。

### Feedback Learner

初期は機械学習ではなく、構造化された編集履歴を次回生成ルールに反映する。

- 承認/却下
- 却下理由
- セリフ修正差分
- layout修正差分
- キャラ変更
- 良かった点タグ

## データモデル

```text
characters
- id
- name
- visual_profile
- personality_profile
- speech_profile
- voice_profile
- compatible_topics
- incompatible_topics
- asset_refs
- status

story_templates
- id
- name
- category
- target_audience
- structure
- variable_schema
- health_guardrails
- status

generation_rules
- id
- scope
- rule_type
- content
- priority
- source_feedback_id

episodes
- id
- title
- target_audience
- theme
- status
- source_request
- generated_json
- edited_json
- approved_json
- output_video_path
- preview_path
- manual_post_status

feedbacks
- id
- episode_id
- rating
- tags
- comment
- diff_summary
- selected_for_learning

post_drafts
- id
- episode_id
- platform
- caption
- hashtags
- recommended_time
- status
```

## API案

```text
GET  /characters
GET  /templates
POST /episodes/generate
GET  /episodes
GET  /episodes/:id
PATCH /episodes/:id
POST /episodes/:id/preview
POST /episodes/:id/render
GET  /episodes/:id/download
POST /episodes/:id/approve
POST /episodes/:id/feedback
POST /episodes/:id/post-draft
POST /episodes/:id/mark-posted
```

## CLI境界

```bash
python3 shorts/render.py --check input.json
python3 shorts/render.py --preview input.json 6.5
python3 shorts/render.py input.json
```

将来は以下へ拡張する。

```bash
python3 shorts/render.py --input input.json --output output.mp4 --work-dir tmp/job-id
```

### 2026-06-26時点の実装境界

ブラウザ単体ではローカルPython/ffmpegプロセスを安全に起動できないため、ローカル開発ではVite middlewareを実行ブリッジにする。Web UIは `/api/shorts-studio/render` にrender.py互換JSONをPOSTする。

- 編集状態からrender.py互換JSONを生成する
- `/api/shorts-studio/render` へPOSTする
- 生成中/成功/失敗を表示する
- `downloadUrl` からMP4を取得する
- JSONダウンロードとCLIコマンドコピーを保険導線として残す
- caption / hashtags / 手動投稿チェックリストを表示・コピーする

middlewareは次を実行する。

```bash
python3 shorts/render.py --check /tmp/suwapuyo-shorts-studio/{title}.json
python3 shorts/render.py /tmp/suwapuyo-shorts-studio/{title}.json
ffprobe shorts/out/{title}.mp4
```

本番/複数人利用で直接MP4を生成する場合は、次のいずれかのアーキテクチャへ移す。

- Node APIがJSON保存と `shorts/render.py` 起動を担当する
- 別プロセスworkerがrender jobを監視して実行する
- DB + Queueでrender jobを永続化し、workerが非同期実行する

## MP4出力MVPの状態遷移

MVPでは、Web UIからSNSへ直接投稿しない。ユーザー体験は「候補生成 -> 編集 -> プレビュー -> MP4出力 -> 手動投稿下書き」までで完結させる。

### Episode status

`episodes.status` は制作物そのものの状態を表す。

```text
draft_requested
  - ユーザーがターゲット/テーマ/形式を選んだ直後。まだ台本JSONはない。

generated
  - generation engine が video spec を生成済み。ユーザー確認前。

editing
  - ユーザーがタイトル、セリフ、キャラ、layout、演出を調整中。

preview_ready
  - preview PNG が生成済み。配置確認ができる。

approved_for_render
  - ユーザーが「この内容でMP4生成」を押した。

rendering
  - render job が実行中。

rendered
  - MP4出力が完了し、ダウンロード可能。

post_draft_ready
  - caption/hashtags/manual checklist が作成済み。

manual_posted
  - ユーザーがSNSへ手動投稿済みとして記録。

learning_recorded
  - 修正理由、採用理由、投稿結果を次回ルールへ反映済み。

failed
  - 生成、preview、render のいずれかで失敗。render job の error code を必ず持つ。
```

### Render job status

`render_jobs.status` は1回のpreview/MP4生成処理を表す。1つのepisodeに複数jobが紐づいてよい。

```text
queued
  - Web/APIがjobを作成した。worker未着手。

validating
  - JSON schema、asset存在、duration、layout値を検証中。

rendering_preview
  - PNG preview生成中。

rendering_video
  - MP4生成中。

postprocessing
  - 音声結合、サムネイル生成、メタ情報保存中。

succeeded
  - 期待する成果物が存在し、ファイルサイズが0より大きい。

failed
  - 復旧可能/不能を問わず失敗。error.type と error.message を保存。

cancelled
  - ユーザーまたはシステムが中断。
```

### Render job data model

DB未導入のMVPでは、まず `public/content/shorts-studio/jobs/*.json` またはアプリ内mock stateで同じ構造を使う。DB化する場合もこの形を崩さない。

```json
{
  "id": "rjob_20260626_083000_yt_001_v003",
  "episodeId": "yt-001",
  "type": "video",
  "status": "queued",
  "inputSpecPath": "public/content/shorts-studio/scripts/yt-001.v003.json",
  "previewSecond": 6.5,
  "output": {
    "workDir": "shorts/out/jobs/rjob_20260626_083000_yt_001_v003",
    "previewPath": "shorts/out/yt-001.v003.preview.6_5s.png",
    "videoPath": "shorts/out/yt-001.v003.mp4",
    "thumbnailPath": "shorts/out/yt-001.v003.thumbnail.png",
    "manifestPath": "shorts/out/yt-001.v003.manifest.json"
  },
  "error": null,
  "createdAt": "2026-06-26T08:30:00+09:00",
  "startedAt": null,
  "finishedAt": null
}
```

### Error classification

失敗時は `failed` だけで終わらせず、UIが次の行動を出せる粒度で分類する。

現MVPでは `shorts/render.py --check` がこの分類の一次実装。Web API/worker化する場合も、同じ分類を `render_jobs.error.type` に写す。

```text
schema_invalid
  - 必須フィールド不足、型不一致、enum外。UIは該当項目をハイライトする。

asset_missing
  - キャラ画像、背景、音声、フォントが見つからない。UIは代替キャラ/背景の選択を促す。

layout_out_of_bounds
  - title/characters/subtitle が1:1安全域から外れる、または重なる。UIは位置調整へ戻す。

duration_out_of_range
  - 30秒未満または60秒超。UIはセリフ短縮/追加を促す。

renderer_crashed
  - render.py/ffmpeg/PILなどが例外終了。ログ参照。

audio_synthesis_failed
  - 音声生成/結合に失敗。MVPでは無音または既存音声へのフォールバックを選択肢として表示。

output_write_failed
  - 出力先に書けない、容量不足、権限不足。

timeout
  - 想定時間内に完了しない。再実行ボタンを出す。

unknown
  - 分類不能。stderr/log pathを保存する。
```

`error` オブジェクトは以下を最低限持つ。

```json
{
  "type": "layout_out_of_bounds",
  "message": "subtitleY is outside the square safe area",
  "field": "layout.subtitleY",
  "recoverable": true,
  "logPath": "shorts/out/jobs/rjob_20260626_083000_yt_001_v003/render.log"
}
```

## Video spec JSON v1

Web UIの編集状態、生成エンジン、rendererの境界は `video spec JSON` に統一する。UI独自stateから直接render.pyを呼ばない。

### File naming

```text
public/content/shorts-studio/scripts/{episodeId}.v{version}.json
shorts/out/{episodeId}.v{version}.preview.{second}s.png
shorts/out/{episodeId}.v{version}.mp4
shorts/out/{episodeId}.v{version}.thumbnail.png
shorts/out/{episodeId}.v{version}.manifest.json
```

例:

```text
public/content/shorts-studio/scripts/yt-001.v003.json
shorts/out/yt-001.v003.preview.6_5s.png
shorts/out/yt-001.v003.mp4
```

### Required top-level fields

```json
{
  "schemaVersion": "shorts-auto-studio.video-spec.v1",
  "episodeId": "yt-001",
  "version": 3,
  "status": "editing",
  "title": "口たいそう",
  "topTitle": "口たいそう",
  "titleStyle": "puku-yellow",
  "targetAudience": "family_health",
  "viewerState": "親子で楽しく健康になりたい",
  "theme": "口腔育成",
  "behaviorGoal": "親子で10秒ぷーぺろにこーをやる",
  "weather": {
    "setupLine": "今日のふわふわランドの天気は、、、",
    "value": "晴れ",
    "line": "晴れです！"
  },
  "characters": [
    {
      "slot": "left",
      "id": "waawaa",
      "name": "わーわー",
      "assetPath": "/content/fuwafuwa-land/characters/display/waawaa.png",
      "facing": "right",
      "voice": {
        "baseHz": 920,
        "speed": "fast",
        "emotion": "excited"
      }
    },
    {
      "slot": "right",
      "id": "mogupiyo",
      "name": "もぐぴよ",
      "assetPath": "/content/fuwafuwa-land/characters/display/mogupiyo.png",
      "facing": "left",
      "voice": {
        "baseHz": 700,
        "speed": "bubbly",
        "emotion": "encouraging"
      }
    }
  ],
  "background": {
    "id": "village-morning",
    "assetPath": "/content/fuwafuwa-land/backgrounds/village-bg.png",
    "variant": "morning"
  },
  "layout": {
    "safeArea": "square-top",
    "titleX": 0.5,
    "titleY": 0.34,
    "titleFontSize": 88,
    "topIllustX": 0.18,
    "topIllustY": 0.22,
    "topIllustHeight": 0.12,
    "leftCharacterX": 0.32,
    "rightCharacterX": 0.68,
    "characterHeight": 0.32,
    "characterBaselineY": 0.8,
    "subtitleY": 0.88,
    "ctaY": 0.82,
    "subtitleFontSize": 48,
    "ctaFontSize": 54
  },
  "lines": [
    {
      "id": "l001",
      "startSec": 0,
      "durationSec": 2.1,
      "speakerId": "waawaa",
      "text": "おはようございます！",
      "captionType": "normal",
      "emotion": "excited"
    }
  ],
  "eventAnimation": [
    {
      "id": "cheek-balloon",
      "trigger": "line:l006",
      "intensity": "medium",
      "durationSec": 2.4
    }
  ],
  "captions": {
    "platformTitle": "親子で10秒、口たいそう",
    "description": "今日のふわふわランドは晴れ。親子で口を動かして、YourTIMEで楽しく健康のきっかけを見つけよう。",
    "hashtags": ["#YourTIME", "#ふわふわランド", "#口腔育成", "#親子健康"],
    "thumbnailText": "ぷーぺろにこー"
  },
  "manualPostDraft": {
    "instagram": {
      "caption": "おはようございます。今日は親子で10秒だけ口たいそう。",
      "hashtags": ["#YourTIME", "#親子で健康", "#口腔育成"],
      "checklist": ["MP4を保存した", "サムネを確認した", "医療断定表現がない", "投稿後にコメントを見る"]
    },
    "youtubeShorts": {
      "title": "親子で10秒、口たいそう #Shorts",
      "description": "ふわふわランドの朝の口たいそう。YourTIMEで健康を楽しく知るきっかけに。",
      "hashtags": ["#Shorts", "#YourTIME", "#口腔育成"]
    }
  },
  "qualityChecks": {
    "openingRule": true,
    "durationSec": 46,
    "durationRange": "30-60",
    "squareSafeArea": true,
    "medicalClaimRisk": "low",
    "yourtimeFit": "high"
  }
}
```

### Field rules

- `schemaVersion`: 固定文字列。破壊的変更時だけv2にする。
- `episodeId`: 英数字、ハイフン、アンダースコアのみ。出力ファイル名に使う。
- `version`: 編集保存ごとに増やす。MP4はversion単位で再現可能にする。
- `titleStyle`: `02_generation-engine.md` の title style enum から選ぶ。
- `characters`: 1人動画なら1件、会話なら2件。MVPでは最大2件。
- `characters[].slot`: `solo` / `left` / `right`。
- `characters[].facing`: `center` / `left` / `right`。2人会話では互いに向き合う。
- `layout`: 0-1の相対値を基本にし、font sizeだけpx指定を許可する。
- `eventAnimation`: 空配列可。renderer未対応のidは `schema_invalid` ではなく `unsupported_animation` として警告扱いにする選択肢もある。
- `captions`: 動画内字幕ではなく、投稿用テキスト。
- `manualPostDraft`: SNS API投稿ではなく、人間が手動投稿するための下書き。

### UI edit state -> video spec mapping

```text
UI title input                  -> title / topTitle
UI title mood selector          -> titleStyle
UI character picker             -> characters[].id / name / assetPath / voice
UI swap button                  -> characters[].slot / facing
UI effect preset selector       -> eventAnimation[]
UI title position slider        -> layout.titleY
UI character spacing slider     -> layout.leftCharacterX / rightCharacterX
UI vertical balance slider      -> layout.titleY / characterBaselineY / subtitleY
UI subtitle editor              -> lines[].text
UI caption editor               -> captions / manualPostDraft
UI approve render button        -> episode.status = approved_for_render, render_job.type = video
```

## テンプレート変数

裏側では大量の変数を持つが、UIには出しすぎない。

例:

- target audience
- viewer state
- cognitive hook
- emotion shift
- character pair
- relationship dynamic
- topic angle
- humor type
- action goal
- title style
- caption rhythm
- layout preset
- background variant
- CTA type
- health risk level
- YourTIME philosophy line

生成時は、制約内でランダム性を持たせる。ただし完全ランダムではなく、以下を加味する。

- キャラ相性
- テーマ相性
- 過去の承認率
- 最近使いすぎた型
- NGフィードバック
- 投稿カレンダー上の多様性

## MVP実装順

1. video JSON schemaを固定
2. character-bibleを拡張
3. story template JSONを作る
4. 生成CLIを作る
5. preview/render CLIを安定化
6. Web UIの今日の候補一覧を作る
7. 編集画面を作る
8. MP4レンダー/ダウンロードをWeb UIから実行できるようにする
9. 投稿文・ハッシュタグ下書きを作る
10. feedback保存を作る

## リスク

- 変数が増えすぎる
  - schema、カテゴリ、デフォルト値、制約を必須にする
- UIが動画編集ソフト化する
  - 通常UIは選択と微修正のみ
- キャラがぶれる
  - 生成時にcharacter-bibleを必ず参照する
- 医療表現が危ない
  - NG表現/断定表現チェックを通す
- 自動投稿事故
  - MVPでは自動投稿しない。MP4出力と手動投稿補助まで
