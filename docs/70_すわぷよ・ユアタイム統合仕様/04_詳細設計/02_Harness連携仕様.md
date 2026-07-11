# LINE Harness・IG Harness連携仕様

## 1. 採用目的

Harnessはすわぷよ本体のDBや認証基盤ではなく、LINE・Instagramを実際に運用するためのチャネル基盤として採用する。

| Harness | 担当 |
|---|---|
| LINE Harness | 友だち管理、タグ、あいさつ、リッチメニュー、配信、クリック計測 |
| IG Harness | コメント・DMトリガー、特典案内、Instagram上の会話、LINE導線 |
| すわぷよ | ゲーム、体操、家族アンケート、進捗、出展者接点 |

## 2. 一次情報で確認した現行構成

監査固定点:

- LINE Harness: `c5cda13c320b3973adb10420288d32bcffdfe5d8`（2026-07-09時点のmain）。
- IG Harness: `55b1f85ea05b2a6f51df179ba1ac8f46b8e1d37a`（2026-07-07時点のmain）。

### LINE Harness

- TypeScript、Cloudflare Worker、D1、Cloudflare Pages。
- Webhook、LIFFフォーム、タグ、シナリオ、トラッキングリンク、SDK/MCPを持つ。
- 必要物はCloudflareアカウント、LINE公式アカウントとMessaging API channel、Node.js 22+、pnpm。
- README、package、tag、GitHub Releaseのバージョン表示に差がある。`latest`を使わず、検証済みtagまたはcommitを固定する。
- READMEはMITと記載する一方、監査時点のリポジトリにLICENSE本文がないため、商用本番利用は権利確認をGateとする。

### IG Harness

- TypeScript、Cloudflare Worker、D1、R2、Cloudflare Pages。
- コメント→DM、キーワードDM、フォローゲート、トラッキング、LINE Harnessクロスリンクを持つ。
- 必要物はCloudflareアカウント、Instagramプロアカウント、Meta App、Node.js 22+、pnpm。
- 自社所有アカウントでのStandard Access範囲と、他社アカウントを扱うAdvanced Access範囲を分ける。
- 監査時点では管理API keyをブラウザ`localStorage`へ置き、CORSが広く、データ削除処理も未完成である。そのまま本番相当へ導入しない。

参照:

- [LINE Harness OSS](https://github.com/Shudesu/line-harness-oss)
- [IG Harness OSS](https://github.com/Shudesu/ig-harness-oss)

## 3. DB二重化への回答

D1とSupabaseにDBが存在すること自体は問題ではない。同じ事実を両方の正本にすることが問題である。

```text
LINEの配信・会話             → LINE Harness D1が正
InstagramのDM・ゲート       → IG Harness D1/R2が正
家族・ゲーム・体操・進捗    → Supabaseが正
出展者・ブース・レポート    → Supabaseが正
```

同期するのは次だけに限定する。

- 初回流入元。
- キャンペーンID。
- クリック・LIFF起動などの接点イベント。
- 利用者が明示的に連携した場合の外部subject key。

会話全文、配信履歴、家族回答、体操履歴を相互複製しない。

## 4. 追加デモのInstagramシナリオ

### InstagramからLINE

```text
Instagram投稿
「コメントで『すわぷよ』と送ってね」
        ↓
IG HarnessがテストDM
        ↓
「LINEでゲームを開く」
source=ig_yasu_post_001付きURL
        ↓
LINE友だち追加
        ↓
LINE Harnessでsourceタグ
        ↓
あいさつからLIFF
        ↓
Product Workerがfirst_source保存
```

### LINE内の継続

```text
友だち追加
  ↓
あいさつ「すわぷよで遊ぶ」
  ↓
初回プレイ
  ↓
翌日以降、運営承認済みの短いお便り
  ↓
新ミッション / 新キャラ / イベント案内
```

## 5. デモのDone

### LINE Harness

- 管理画面へログインできる。
- LINE Webhookの署名検証が通る。
- テストアカウントの友だち追加が1件登録される。
- `source=demo_instagram`等のタグまたはmetadataが付く。
- テストメッセージを1件、承認後に送れる。
- リッチメニューまたはメッセージから本番候補LIFF URLを開ける。
- `/api/health`等で稼働状態を確認できる。

### IG Harness（P1・安全性Gate通過時だけ）

- 管理画面へログインできる。
- Meta Webhookのverifyと署名検証が通る。
- 自社テスト投稿またはDMキーワードから自動DMが1件届く。
- DM内URLが流入元を保持してLINEへ進む。
- トークン期限と最終Webhook時刻を確認できる。
- 実アカウントへの自動投稿はMVP Doneに含めない。
- API keyを`localStorage`へ保存しない認証方式、限定CORS、データ削除、作者環境フォールバック値の除去を確認する。

## 6. クロスリンク

IG HarnessとLINE Harnessが持つUUIDクロスリンクはP1とする。MVPでは流入元計測だけで価値を示せるため、個人単位のIG=LINE対応付けを必須にしない。

実装する場合:

1. IG DMで利用者ごとの短寿命リンクを発行する。
2. 利用者がLINE側でリンクを開く。
3. 双方で一度限りtokenを検証する。
4. 連携内容と目的を表示する。
5. 明示操作後に双方の外部IDを共通UUIDへ紐付ける。
6. 解除手段を用意する。

推測によるプロフィール画像照合を、プロダクトの本人同一性には使用しない。

## 7. 外部設定Gate

以下はローカル実装だけでは完了しない。

| Gate | 必要なもの | 完了証跡 |
|---|---|---|
| H-01 | Cloudflare対象アカウント・zone | deployment URL |
| H-02 | LINE公式アカウント・Messaging API | channel IDs、Webhook成功 |
| H-03 | LINE Login channelとOAリンク | LIFF起動・friendFlag |
| H-04 | Instagramプロアカウント | アカウント種別確認 |
| H-05 | Meta App・必要権限 | Webhook verify、テストDM |
| H-06 | Privacy Policy / Terms / Data deletion URL | 公開URL |
| H-07 | Harnessの固定version | tag/commitとsmoke test記録 |
| H-08 | LINE Harnessの商用利用条件 | LICENSE本文または権利者確認 |
| H-09 | IG Harness安全性補正 | 認証、CORS、削除、fallbackのレビュー証跡 |
| H-10 | LINE公式アカウントの料金プラン | 想定友だち数×配信頻度の通数見積りとプラン選定記録（無料プランは月200通） |

実値やsecretを仕様書へ書かない。

## 8. Webhook・運用安全

- Harness本体のWebhook耐性を導入前にコードまたは試験で確認する。
- provider event IDで永続dedupeする。
- 署名検証前に業務処理を行わない。
- retryでDM、タグ、外部連携を二重実行しない。
- 自動配信・一斉配信・本番投稿は人の承認を必要とする。
- SDK/API呼出しにはtimeoutとrequest IDを設定する。
- 障害時はHarness連携だけを止め、すわぷよ本体を巻き込まない。

## 9. 採用判断

LINE Harnessは条件付きで初回デモへ採用する。IG Harnessは方向性として採用するが、初回コアデモを止めないP1・追加デモとする。CRM機能を全部使うことは目的にしない。

コアMVPで使う:

- LINE友だち登録。
- あいさつ・リッチメニュー。
- 流入タグ。
- ヘルス監視。

安全性Gate通過後の追加デモ:

- IGコメントまたはDMからの特典導線。
- source付きLINE登録導線。

後回し:

- 高度なスコアリング。
- 複雑なステップ配信。
- 複数アカウント移行。
- 全データのクロスプラットフォーム統合。
- 無承認AI自動投稿。

## 10. 現時点のGo判定

| 対象 | 判定 | 条件 |
|---|---|---|
| すわぷよ + LINE Harness | 条件付きGo | LINE Console手動設定、secret追加、version固定、ライセンス確認 |
| IG Harness単独テスト | 条件付きGo | 自社プロアカウント、Meta設定、安全性補正 |
| 初回コアデモへIGを必須化 | No-Go | 外部Gateと現行安全性がクリティカルパスを不安定にする |
| Harness D1をSupabaseへ置換 | No-Go | D1 APIとSQLite依存が広く全面改修になる |

## 11. セグメント配信とIDの境界（決定-011・決定-014）

生LINE user IDはLINE Harness D1のみが保持する。Supabaseは`subject_key`（HMAC）とproduct refだけを持ち、生IDを保存しない。この前提でセグメント配信を次の分業で実現する。

```text
認証成功時（Workerが検証済みの生subを一時保持する唯一の時点）
  → LINE Harness名簿APIへ {line_user_id, product_ref} をupsert（P1・機能-407）
  → 未同期の既存利用者は次回LIFF起動時に自動でbackfillされる

Supabase（セグメント判定）
  → 条件例: 最終利用からN日 / 体操完了M回以上 / source・campaign別
  → product_refのリストとタグ名をHarnessへ指示

LINE Harness
  → product_ref → LINE user IDを解決してタグ付与
  → 承認済みメッセージをタグ宛に配信（機能-408）
```

ルール:

- 配信軸はMVPでは行動（体操完了・最終利用日）と流入元（source / campaign）に限定する。
- 家族属性・医療関係者・興味分野を配信条件にしない。将来検討する場合も帯レベルの粒度・属性の掛け合わせ禁止・本人が予期できる範囲に限る。
- 配信は必ず人の承認を挟み、頻度は週1回以下の初期原則（`06_運用/01`）に従う。
- 判定根拠（誰がなぜ対象か）はSupabase側ログに残し、Harnessへは結果のタグ名だけを渡す。
- Harness名簿APIの呼出しは署名付きサーバー間通信とし、ブラウザから直接呼ばない。
