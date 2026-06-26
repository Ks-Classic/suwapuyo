# 09 出展社レポート / プラットフォーム価値設計

> 最終更新: 2026-06-25  
> 位置づけ: `00_strategy/01_stakeholder-value-and-business-model.md` の「Phase 1の送客ダッシュボードが課金の心臓」を、技術・運用・将来拡張へ落とす仕様。  
> 方針: 8/2デモではAPI連携を急がない。まず「このプラットフォームに参加したからこその価値」を、定量と定性の両方で見える化する。

---

## 1. 結論

出展社レポートは、最初からInstagram/YouTube/LINE公式アカウントのAPI連携を作り込まない。

初期は以下を組み合わせる。

1. **ふわふわランド内のfirst-party event**  
   `tap_events` を正本にする。タップ、ポップアップ表示、メディア閲覧、音声再生、CTAクリック。

2. **送客リンクのUTM/QR**  
   CTA URLに `utm_source=fuwafuwa_land`, `utm_campaign=yourtime_2026`, `utm_content={exhibitor_id}` を付ける。

3. **SNS/YouTube/LINEの手入力スナップショット**  
   API連携前は、投稿URL、投稿日時、表示回数、いいね、保存、コメント、再生数、友だち数などをスタッフが手入力またはスクショ確認で入れる。

4. **定性メモ**  
   来場者の反応、子どもの発話、保護者の質問、ブース誘導の手応え、出展者コメントを短文で残す。

5. **AIサマリー**  
   数値とメモをまとめて、出展社ごとに「今回の成果」「次に改善するなら」を自動下書きする。医療内容の断定・効果効能の表現は避ける。

このMVPなら、API審査やOAuth実装なしで、出展社へ「出てよかった」を返せる。

---

## 2. レポートで証明する価値

出展社に返すべき価値は、単なるPVではない。

| レイヤ | 見たいこと | 初期取得方法 |
|---|---|---|
| 認知 | どれだけ見られたか | キャラ表示、ポップアップ表示、動画再生 |
| 興味 | どれだけ深く触れたか | 複数枠閲覧、音声再生、滞在に近いイベント数 |
| 送客 | ブース/SNS/LINE/YouTubeへ進んだか | CTAクリック、UTM、QR |
| 関係 | 会期後につながったか | LINE友だち数、SNSフォロー/保存/コメントの手入力 |
| 信頼 | 医療/健康テーマが伝わったか | 来場者反応メモ、出展者コメント、スタッフ観察 |
| 改善 | 次回なにを直せばよいか | AIサマリー + 人のレビュー |

重要なのは「広告枠の成果」ではなく、**出展者を主役にする紹介コンテンツが、来場者との接点をどれだけ作ったか**を示すこと。

---

## 3. Phase 0: 8/2デモで出すレポート

### 3.1 出展社サマリー

1出展社につき、A4 1枚またはWeb 1画面で返す。

必須:
- 出展社名 / キャラ名 / コンテンツ名。
- キャラタップ数。
- ポップアップ表示数。
- メディア閲覧数。
- CTAクリック数。
- 一番見られた枠。
- 来場者/スタッフ/出展者の反応メモ。
- AIによる「成果サマリー」。
- AIによる「次回改善案」。

任意:
- Instagram投稿URL。
- YouTube動画URL。
- LINE公式アカウントURL。
- SNSの手入力指標。
- ブース誘導QRの読み取り数。

### 3.2 表示例

```txt
すーすー / YourTIME紹介

接点:
- キャラタップ: 128
- ポップアップ表示: 94
- 動画再生: 61
- CTAクリック: 18

反応:
- 子どもが動画を見て「これどこ？」と保護者に聞く場面が複数回あった。
- スタッフからは「タップで自然に紹介できるので押し売り感がない」と評価。

AIサマリー:
今回のコンテンツは、会場体験の中で自然にYourTIME紹介へ接続できていた。
特に動画枠は興味喚起に効いている。次回はCTA文言を「ブースへ行く」など行動に近い表現へ寄せると、送客率をさらに測りやすい。
```

---

## 4. 初期DB設計

既存:
- `display_characters`
- `tap_contents`
- `tap_content_items`
- `tap_events`

追加候補。8/2前に全部実装しなくてよい。将来設計の土台として定義する。

### 4.1 exhibitors

出展社/先生/クライアントの正本。

| column | type | note |
|---|---|---|
| id | uuid | primary key |
| name | text | 表示名 |
| organization_name | text | 医院/会社/団体名 |
| contact_name | text | 担当者名。初期は任意 |
| category | text | 歯科/助産/PT/ST/物販/運営など |
| profile_text | text | 紹介文 |
| booth_label | text | ブース番号/場所 |
| website_url | text | `https://` |
| instagram_url | text | `https://` |
| youtube_url | text | `https://` |
| line_url | text | `https://` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 4.2 campaigns

イベント/期間/企画単位。

| column | type | note |
|---|---|---|
| id | uuid | primary key |
| name | text | `YourTIME 2026` など |
| starts_at | timestamptz | |
| ends_at | timestamptz | |
| status | text | draft/live/closed |

### 4.3 sponsor_slots

出展社とキャラ/コンテンツの対応。

| column | type | note |
|---|---|---|
| id | uuid | primary key |
| campaign_id | uuid | campaigns |
| exhibitor_id | uuid | exhibitors |
| display_character_id | text | display_characters |
| tap_content_id | uuid | tap_contents |
| plan_name | text | free/demo/paid/sponsor |
| starts_at | timestamptz | |
| ends_at | timestamptz | |

### 4.4 external_channel_snapshots

SNS/YouTube/LINEの手入力またはAPI同期スナップショット。

| column | type | note |
|---|---|---|
| id | uuid | primary key |
| exhibitor_id | uuid | exhibitors |
| campaign_id | uuid | campaigns |
| channel | text | instagram/youtube/line/website/other |
| source_url | text | 投稿/動画/アカウントURL |
| captured_at | timestamptz | 記録日時 |
| metrics | jsonb | views, likes, saves, comments, followers, friends など |
| memo | text | スクショ確認・手入力メモ |

### 4.5 qualitative_notes

定性価値の記録。

| column | type | note |
|---|---|---|
| id | uuid | primary key |
| exhibitor_id | uuid | exhibitors |
| campaign_id | uuid | campaigns |
| note_type | text | visitor/staff/exhibitor/ops |
| body | text | 個人情報を入れない短文 |
| sentiment | text | positive/neutral/negative/unknown |
| created_at | timestamptz | |

### 4.6 report_snapshots

出展社へ渡すレポートの生成結果。

| column | type | note |
|---|---|---|
| id | uuid | primary key |
| exhibitor_id | uuid | exhibitors |
| campaign_id | uuid | campaigns |
| period_start | timestamptz | |
| period_end | timestamptz | |
| metrics | jsonb | 集計値 |
| qualitative_summary | text | 人/AIの要約 |
| recommendation | text | 次回改善案 |
| status | text | draft/reviewed/shared |
| created_at | timestamptz | |

---

## 5. API連携の現実性

### 5.1 YouTube

YouTube Analytics/Reporting APIは、動画やチャンネルの視聴統計・人気指標を取得できる。公式ドキュメント上、bulk reports と targeted query reports が用意されている。

初期方針:
- 8/2前はAPI連携しない。
- YouTube動画URLと手入力の再生数/高評価/コメント数で十分。
- 継続案件化した出展社だけOAuth連携を検討する。

### 5.2 LINE公式アカウント

LINE Messaging APIには、メッセージ配信数、友だち数、イベント集計などのInsights系エンドポイントがある。

初期方針:
- LINE友だち追加URL/QRをCTAに置く。
- 友だち数は手入力スナップショットでよい。
- API連携はCloud Run API化後に検討する。

### 5.3 Instagram

Instagramはアカウント種別、権限、Meta側の審査、取得可能指標の制約があり、初期MVPでAPI連携を前提にしない。

初期方針:
- 投稿URL、リールURL、プロフィールURLを保存する。
- 表示回数、いいね、保存、コメント、フォロー増分は手入力スナップショットで扱う。
- API連携は、有料運用・継続支援の範囲で個別検討する。

### 5.4 Web/LP

Web導線は、UTMつきURLとGA4/Data APIが将来候補。

初期方針:
- CTA URLにUTMを必ず付ける。
- LPを作る場合はGA4でイベントを受けられる設計にする。
- ただし、8/2デモでは `tap_events` とCTAクリックを第一正本にする。

---

## 6. AI時代のレポート設計原則

2026年時点のAI活用では、単なる数値表ではなく「次の行動に変わるレポート」が価値になる。

### 6.1 数値は少なく、意味は深く

出展社に大量の指標を渡さない。

最初に見る指標:
- 接点数: tap / popup_open
- 深さ: item_view / video view / audio play
- 行動: CTA click
- 関係化: LINE/SNS/YouTubeへの遷移または手入力増分
- 記憶: 定性メモ

### 6.2 AIは分析者ではなく編集者

AIに任せる:
- レポート文章の下書き。
- 数値の言い換え。
- 改善案の候補出し。
- 出展社向けのやわらかい表現。
- SNS投稿案の生成。

人が見る:
- 医療内容の正確性。
- 効果効能の断定がないか。
- PR/紹介表記が適切か。
- 出展社に失礼な表現がないか。

### 6.3 店舗/地域ビジネスの考え方

このプラットフォームは、広告というより「会場体験から関係を作るCRM」に近い。

見るべき流れ:

```txt
来場者が見る
  -> キャラをタップする
  -> 紹介コンテンツを見る
  -> ブース/SNS/LINE/YouTubeへ進む
  -> 後日もう一度思い出す
  -> 出展社との関係が続く
```

出展社に返すレポートは、この流れのどこまで作れたかを示す。

---

## 7. Repository / API移行方針

現フェーズ:

```txt
Browser
  -> Supabase JS
    -> Postgres / Storage / Realtime
```

将来:

```txt
Browser
  -> Cloud Run API
    -> Drizzle
      -> Postgres

Browser
  -> Supabase Storage / Realtime
```

移行しやすくするため、以下を守る。

- UIはRepository interfaceだけを呼ぶ。
- レポート生成は `ExhibitorReportRepository` として分ける。
- `tap_events` は壊さず、後から `sponsor_slots` / `exhibitors` とJOINできるようにする。
- APIキー/OAuth token/DATABASE_URLはCloud Run側だけが持つ。
- ブラウザにはSNS API tokenやDB接続文字列を出さない。

---

## 8. MVP受け入れ基準

8/2前に必須ではないが、実装するなら以下を満たす。

- 出展社ごとの `tap_events` 集計が出せる。
- 手入力SNSスナップショットを保存できる。
- 定性メモを保存できる。
- AIサマリー用の元データを1つのJSONにまとめられる。
- 出展社へ見せる1ページレポートの草案が出せる。
- API未連携でも「参加した価値」を説明できる。

---

## 9. 最小レポートに入れるプロ視点

最小MVPでも、単なる数字の一覧にしない。世界観体験、出展社ROI、次回営業、プラットフォーム化の4つが同時に進む形にする。

### 9.1 PdM観点

PdMの問い:
- 出展社にとって「参加してよかった」と言えるか。
- 運営にとって「来年も売れる商品」に近づいたか。
- 来場者体験を壊さずに送客できたか。
- 次に何を作れば事業価値が一番伸びるか。

最小レポートに入れる:
- 成果サマリー: 今回どんな接点が作れたか。
- ボトルネック: タップは多いがCTAが弱い、動画は見られたがブース誘導が弱い、など。
- 次の一手: CTA改善、動画差し替え、LINE導線追加、ブースQR改善など。

### 9.2 PMM観点

PMMの問い:
- 出展社が他の出展者に紹介したくなる言葉になっているか。
- 「広告枠」ではなく「出展者を主役にするコンテンツ」として伝わるか。
- 有料化する時の価値仮説が見えるか。

最小レポートに入れる:
- 出展社向け見出し: `あなたの専門性が、子どもの体験の中で自然に見つけられました` のように、価値が伝わる文。
- 営業に使える一文: `来場者との接点を当日で終わらせず、SNS/LINE/YouTubeへつなぐ土台ができました`。
- 来年提案の種: `事前告知 + 当日タップ + 後日SNS` のパッケージ案。

### 9.3 マーケター観点

マーケターの問い:
- 認知、興味、行動、関係化のどこまで進んだか。
- 数字と定性反応が同じ方向を向いているか。
- 次回改善で一番伸びるレバーは何か。

最小レポートに入れる指標:
- 認知: popup_open
- 興味: item_view / video view / audio_play
- 行動: cta_click
- 関係化: LINE/SNS/YouTube遷移または手入力増分
- 記憶: 定性メモ

注意:
- 少数イベントでも過剰に成功断定しない。
- 医療/健康領域なので、効果効能の断定はしない。
- 比較ランキングで出展社を傷つけない。初期は自社内改善に寄せる。

### 9.4 プラットフォーマー観点

プラットフォーマーの問い:
- 出展社、運営、来場者、制作側の全員に価値が返るか。
- データが次回の体験改善と商品化につながるか。
- 個別案件で終わらず、出展社が増えるほど価値が増える構造か。

最小レポートに入れる:
- 出展社個別の成果。
- YourTIME全体で見た総接点数。
- 来場者体験を壊さなかったこと。
- 次回プラットフォーム商品候補。

将来の複利:
- 出展社ごとの過去比較。
- 事前投稿、当日タップ、後日SNSの一気通貫。
- 人気テーマ/キャラ/導線の学習。
- 出展者同士のコラボ導線。

---

## 10. 最小1ページレポート構成

初期レポートは以下だけでよい。

```txt
出展社名 / キャラ名

1. 今回の成果
   - タップ数
   - ポップアップ表示数
   - メディア閲覧数
   - CTAクリック数

2. 来場者との接点
   - よく見られたコンテンツ
   - スタッフ/来場者/出展者の反応メモ

3. AIサマリー
   - 何が良かったか
   - どんな接点が作れたか
   - 押し売りにならず自然に届いたか

4. 次回の改善案
   - CTA
   - 動画/画像
   - LINE/SNS/YouTube導線
   - 事前告知/後日フォロー

5. 次の提案
   - 事前投稿
   - 当日タップ枠
   - 後日SNS/ショート動画
```

この形式なら、実装は軽いまま、出展社に返す価値は強くなる。

---

## 11. 当日前レポート / 裏ログのメモ

当日前に出すなら、出展社ごとの「事前露出」と「当日表示状態」を軽く見える化できるとよい。

ただし、来場者UXを壊す計測はしない。提供側・出展者側に寄りすぎず、CXとDXの両方を守る。

### 11.1 当日前に持てるとよい値

最小でよい:
- 日ごとのアクセス数。
- 日ごとのCTAクリック数。
- 日ごとのキャラ表示回数。
- その日にキャラが `visible` だったか。
- 表示中だった累計時間。
- タップ可能コンテンツが公開中だった時間。
- 投稿/動画/LINE導線が設定されていたか。

あると強い:
- どのコンテンツ枠が見られたか。
- どのCTAが押されたか。
- QR/UTM経由の流入元。
- SNS手入力スナップショットとの差分。
- イベント前、当日、イベント後の期間別比較。

### 11.2 UU / セッションの扱い

UUやセッションは、厳密にやるほど難しく、プライバシー/同意/実装負荷が上がる。

初期方針:
- 個人を追跡しない。
- cookieやfingerprintで無理にUUを作らない。
- 端末内の一時セッションIDを使う場合も、短期間・匿名・集計用途に限定する。
- 出展社向けには「概算セッション」よりも、まず `tap_events` の事実値を出す。

将来候補:
- `session_id` を匿名・短期TTLで付与。
- `device_context` は `display/staff/qr/lp` 程度の粗い区分だけ。
- IP、氏名、LINE userIdなど個人に戻せる値はレポートDBへ入れない。

### 11.3 裏ログとして持つとAIコメントに効く値

AIサマリーは、数値だけより「状態変化」と「文脈」があると質が上がる。

候補:
- `display_character_status_logs`: いつ表示/非表示になったか。
- `tap_content_publish_logs`: いつ公開/非公開になったか。
- `daily_report_metrics`: 日別の集計スナップショット。
- `external_channel_snapshots`: SNS/LINE/YouTubeの手入力/APIスナップショット。
- `qualitative_notes`: スタッフ/来場者/出展者の定性メモ。

AIが言えるようになること:
- `表示中だった時間に対して、タップ率が高かった`
- `動画枠は見られているがCTAクリックに接続していない`
- `前日投稿後にタップ/CTAが増えた可能性がある`
- `当日より後日フォロー向きのコンテンツだった`

### 11.4 LINE経由の属性について

LINE公式アカウントは、Messaging APIのInsights系で友だち数やデモグラフィックなどの統計情報を取得できる可能性がある。

ただし初期はやりすぎない。

初期方針:
- LINE友だち追加URL/QRをCTAとして置く。
- 友だち数の増減は手入力スナップショットで十分。
- 属性は個人単位ではなく、LINE側が提供する集計情報だけを使う。
- LINEログインやアカウント連携は、来場者UXと同意設計が重くなるためMVP外。

判断基準:
- 来場者が「楽しむため」ではなく「計測されるため」に操作している感覚になったら失敗。
- 子ども体験の中にログイン要求を入れない。
- 出展社レポートは、個人追跡ではなく集計と定性で価値を出す。

### 11.5 デモで出せる最小案

実装するなら以下だけでよい。

1. 日別集計カード
   - tap
   - popup_open
   - item_view
   - audio_play
   - cta_click

2. 表示状態メモ
   - 今日表示中だったか
   - 公開コンテンツありだったか
   - CTA設定ありだったか

3. AIコメント下書き
   - `今日は表示中だった時間に対して、動画閲覧が多く、興味喚起に向いていました`
   - `CTAクリックは少なめなので、次回は文言を「ブースへ行く」「LINEで受け取る」など行動に近づけるとよいです`

4. UX注記
   - 個人追跡なし
   - ログイン要求なし
   - 子どもの体験優先
   - 出展社向けには集計のみ表示

---

## 12. 参照

- YouTube Analytics and Reporting APIs: https://developers.google.com/youtube/analytics
- LINE Messaging API Insights: https://developers.line.biz/en/reference/messaging-api/
- Google Analytics Data API: https://developers.google.com/analytics/devguides/reporting/data/v1
