# バックエンド・API・シーケンス

## 1. API共通仕様

| 項目 | 仕様 |
|---|---|
| Base | 同一オリジン`/api` |
| 形式 | JSON、UTF-8 |
| 認証 | 利用者はHttpOnly session、管理者は別認証 |
| request ID | `X-Request-ID`を受理または生成し応答へ返す |
| 冪等性 | 書込APIは`Idempotency-Key`またはbody内UUID必須 |
| 時刻 | APIはUTC、日次判定は`Asia/Tokyo` |
| エラー | `code`, `message`, `request_id`。内部設定を返さない |
| 入力 | strict schema、未知キー拒否または明示除外 |
| body上限 | 通常64KB、batch event 256KB。画像は別経路 |
| CSRF | 書込はOrigin検証と`Content-Type: application/json`必須 |
| レート制限 | 利用者・IP単位。超過は`429`と`Retry-After` |
| 冪等キーのスコープ | 利用者単位。他利用者の既存キーとの衝突は`409` |
| セッション | 24時間スライディング。`401`時はLIFF再認証で自動復帰（`03_基本設計/01`） |

### エラー形式

```json
{
  "error": {
    "code": "invalid_input",
    "message": "入力内容を確認してください",
    "request_id": "req_..."
  }
}
```

## 2. 利用者API

### `POST /api/auth/line`

LIFFトークンを検証し、内部セッションを発行する。

Request:

```json
{
  "id_token": "<LIFF ID token>",
  "access_token": "<LIFF access token>",
  "source": "instagram_yasu_01",
  "campaign": "yourtime_2026"
}
```

Response `200`:

```json
{
  "user": {
    "id": "internal-uuid",
    "is_first_visit": true,
    "survey_completed": false
  }
}
```

- LINEの`sub`は応答へ返さない。
- WorkerはID tokenの真正性、`aud`、`exp`を検証し、access tokenを検証してサーバー側でも友だち状態を確認する。
- `source`は許可リストへ正規化する。
- 同じLINE利用者で内部利用者を重複作成しない。

### `GET /api/me`

現在の内部利用者、初回状態、登場済みキャラ数、未同期状態を返す。個人属性の詳細は返さない。

### `PUT /api/surveys/family`

初回登録または家族設定をupsertする。全児分の回答と同意版を同一トランザクションで保存する。

```json
{
  "survey_version": "family-2026-03",
  "terms_version": "terms-2026-01",
  "privacy_version": "privacy-2026-01",
  "purpose_version": "family-purpose-2026-01",
  "primary_player": "child_and_adult",
  "children": [
    { "client_id": "uuid", "ordinal": 1, "birth_year": 2020, "birth_month": 5, "gender": "female" },
    { "client_id": "uuid", "ordinal": 2, "birth_year": 2017, "birth_month": 9, "gender": "prefer_not_to_say" }
  ]
}
```

- 子どもを含む`primary_player`では1人以上のchildrenを必須とし、全件validの場合だけ一括保存する。
- `birth_year`、`birth_month`からサーバーで`age_band`と`age_as_of`を算出し、クライアント申告のage bandを信用しない。
- `primary_player`と`gender`は許可enum以外を拒否する。`prefer_not_to_say`は有効回答として扱う。
- 正確な日付、氏名、ニックネーム、`preferred_activity`を受け付けず、unknown keyとして400で拒否する。
- 同意記録成功前にfamily profileとchildrenを保存しない。
- 回答完了とキャラ登場（全キャラ一括。決定-019）はトランザクションまたは一意制約で一度だけ成立させる。

### イベント・ブースQR API（デモ境界）

- `POST /api/campaigns/:campaign/check-ins`: 入口opaque token、client event ID、利用者確定操作を検証し、同一利用者・campaignを冪等記録して限定報酬を一度だけ付与する。
- `POST /api/campaigns/:campaign/booths/:booth/visits`: ブースopaque tokenとclient event IDを検証し、訪問スタンプを冪等付与する。
- `PUT /api/booth-visits/:visit/engagement`: heard_explanation / participated / purchased / browsingの自己申告を保存する。
- `PUT /api/booth-visits/:visit/feedback`: 任意ratingと短文を保存する。スキップ時は空回答を作らない。
- `GET /api/campaigns/:campaign/stamps`: 本人の訪問済みブースと回遊節目報酬だけを返す。

デモでは境界関数と仮データまでとし、本番DB/API配線は`02_体験設計/07` §10のGate通過後に行う。QRにLINE user IDや連番利用者IDを入れず、campaign・booth・署名またはサーバー解決用opaque tokenだけを含める。

### `POST /api/game-sessions`

ゲーム開始を作る。応答の`game_session_id`を体操・終了へ渡す。

### `PATCH /api/game-sessions/:id`

終了時のscore、moves、ended_atを保存する。本人のセッションだけ更新可能。

### `POST /api/exercise-completions`

```json
{
  "id": "client-generated-uuid",
  "exercise_type": "mouth",
  "game_session_id": "uuid",
  "completed_at": "2026-07-11T01:23:45.000Z",
  "source": "game"
}
```

Response:

```json
{
  "created": true,
  "progress": {
    "today_total": 2,
    "totals": { "mouth": 18, "breath": 9, "neck": 7 },
    "streak_days": 5
  },
  "mission_changes": [
    { "mission_key": "daily_exercise_3", "current": 2, "target": 3 }
  ],
  "new_arrivals": []
}
```

同じ`id`の再送は`created:false`で同じ集計結果を返す。既存行の`user_id`が一致しない場合は`409`で拒否する。

`completed_at`の信頼境界:

- 受信時刻より5分以上未来は拒否する。
- 受信時刻より48時間以上過去は保存するが、streak・ミッション判定は受信時刻を基準にする（オフライン再送を許容しつつ、過去日付の申告によるstreak改竄を防ぐ）。

### `GET /api/progress`

今日、累計、種類別、連続日数、直近7日を返す。健康評価は返さない。

### `GET /api/missions`

対象期間のミッション、進捗、報酬、受取状態を返す。

### `POST /api/missions/:id/claim`

完了済みかつ未受取の場合だけ報酬を付与する。DBの一意制約とatomic updateで二重付与を防ぐ。

### `POST /api/events/batch`

最大50件の行動イベントを受ける。イベントごとにUUID必須。PIIをpropertiesへ入れない。

### `POST /api/consents`

`purpose`（product / survey / marketing）、`version`、`status`を記録する。初回は同意ステップ（画面-018）から呼び、同意記録前に利用者データを保存しない。撤回も同APIで受ける。

### `GET /api/characters`

全キャラクターのcatalog（姿・名前・登場条件）と本人の登場状態（`character_arrivals`）を返す。隠し情報を持たない（決定-005）。

### `GET /api/booths`

公開中ブースの一覧。検索語・カテゴリで絞り込む。検索対象は名称・番号・許可カテゴリ・運営登録キーワードに限定する（`02_体験設計/06` §6）。位置未校正のブースは`position: null`で返し、推測座標を返さない。

### `GET /api/venue-map`

会場エリア、固定施設（入口・受付・トイレ・休憩）、ブースマーカー（番号・カテゴリグリフ・座標）を返す。要確認-006の対応表が未確定の間は`positions_status: uncalibrated`を返し、クライアントは一覧のみ提供する。

### `POST /api/booth-intros/next`

体操完了後のブース紹介候補を1件返す。入力は`exercise_type`とセッション内表示済みcontent ID。サーバーは`02_体験設計/06` §8のローテーション規則で選定し、`booth_rotation_counters`を更新、選定入力と理由を管理ログへ残す。候補なしは`204`。

## 3. 出展者・運営API

| Method / Path | 目的 | MVP権限（決定-020） | 実運用移行後 |
|---|---|---|---|
| `GET /api/exhibitor-reports/:id` | 出展者集計 | 認証なし。UUIDパス・集計値のみ | assigned exhibitor / admin |
| `POST /api/report-snapshots` | スナップショット生成 | 非公開（ローカル/preview限定） | admin |
| `GET /api/admin/integrations/health` | 外部連携状態 | 認証なし（読み取り専用・secret非表示） | admin |
| `GET /api/admin/events/failures` | 保存・Webhook失敗 | 非公開（ローカル/preview限定） | admin |
| `POST /api/admin/events/:id/retry` | 安全な再送 | 非公開（ローカル/preview限定） | admin |

集計APIは少数セルの秘匿閾値を持つ。閾値は運営決定待ちで、MVP既定値は5未満を非表示とする。

## 4. LINE認証シーケンス

```text
利用者        LIFF SDK        Product Worker       LINE API       Supabase
  │              │                  │                  │              │
  │ LIFF起動     │                  │                  │              │
  │─────────────→│ init/login       │                  │              │
  │              │ getFriendship    │                  │              │
  │              │────────────────────────────────────→│              │
  │              │←────────────────────────────────────│ friend=true  │
  │              │ ID token         │                  │              │
  │              │───────────────→  │ verify           │              │
  │              │                  │─────────────────→│              │
  │              │                  │←─────────────────│ claims       │
  │              │                  │ HMAC subject     │              │
  │              │                  │ upsert user ───────────────────→│
  │              │                  │←───────────────────────────────│
  │              │←───────────────  │ Set-Cookie       │              │
  │←─────────────│ ゲーム開始可能    │                  │              │
```

## 5. 体操完了シーケンス

```text
UI              端末キュー        Worker             Supabase
│ 「できた」       │                 │                    │
│ event UUID生成  │                 │                    │
│───────────────→│ 保存            │                    │
│                │───────────────→ │ strict validate    │
│                │                 │ insert on conflict │
│                │                 │───────────────────→│
│                │                 │ 集計・mission更新  │
│                │                 │←───────────────────│
│                │←─────────────── │ progress           │
│←───────────────│ UI反映・queue削除│                    │
```

通信失敗時は端末キューを残し、画面には端末保存であることを表示する。サーバー成功前にクラウド同期済みとは表示しない。

## 6. Webhook共通プロトコル

LINE、Meta、Harness連携callbackはすべて次を満たす。

1. body読込前後でサイズ上限を適用する。
2. provider署名をraw bodyで検証する。
3. event/delivery IDをstrictに取得する。
4. `webhook_receipts`へ一意insertし、業務処理より前にdedupeする。
5. 重複時は前回の成功応答を返し、再処理しない。
6. `request_id`と`delivery_id`を構造化ログへ残す。
7. 外部子呼出しtimeoutは親SLAより3秒以上短くする。
8. 4xxは恒久エラー、5xxは再試行可能エラーとして区別する。
9. エラー本文にsecret、内部routing、既知アカウント一覧を含めない。
10. PIIはログでhash化する。

```text
Webhook受信
  → body上限
  → 署名検証
  → strict schema
  → 永続dedupe
      ├ 重複 → 前回応答
      └ 新規 → receipt=pending
                  → 業務処理
                  → receipt=processed/failed
                  → 構造化ログ
```

## 7. イベント名

初期許可リスト:

```text
liff_opened
friendship_prompted
friendship_confirmed
survey_opened
survey_answered
survey_completed
character_arrived
game_started
game_completed
exercise_started
exercise_skipped
exercise_completed
mission_viewed
mission_completed
mission_claimed
exhibitor_intro_viewed
outbound_cta_clicked
biz_intro_opened
biz_contact_clicked
venue_map_opened
booth_search_used
booth_map_route_viewed
booth_filter_changed
booth_marker_selected
booth_intro_impression
booth_detail_opened
booth_intro_dismissed
sync_failed
sync_recovered
```

イベント名は過去形の事実で統一する。`properties`で個人属性や自由文を送らない。
