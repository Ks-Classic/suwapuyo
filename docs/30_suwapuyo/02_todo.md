# すわぷよ 実装TODO — v3.5

> **最終更新**: 2026-07-13
> **現行SSoT**: `docs/70_すわぷよ・ユアタイム統合仕様/`。本ファイルの旧デモ記述と矛盾する場合は統合仕様を優先する。
> **現在**: 統合MVPフェーズ1。最新の初回登録、5枠リッチメニュー、ブースLIFF、チェックイン／スタンプデモ、作り手導線を現行最優先とする。旧SURVEY、6/30デモ、ふわふわランド、Shorts Auto Studioは履歴として後段に残す。
> **実装の正**: `docs/30_suwapuyo/04_demo-detailed-design.md`（v0.2.1）＋ `05_storyboard-and-narrator-script.md`。実装担当=**Codex**。

> **LINE公開の正**: `07_line-required-liff-spec.md`。LINE公式アカウントを通常入口・再訪ホームとし、Web体験は`VITE_SUWAPUYO_LIFF_ID`の単一LIFFへ統合する。ログイン、友だち追加、サービス同意は別の境界として扱う。

> **配信先(2026-07-12確認)**: 本番はCloudflare Pages(`suwapuyo`プロジェクト、`suwapuyo.pages.dev`)。git連携なし、`npx wrangler pages deploy dist --project-name=suwapuyo --branch=main`の手動デプロイ運用。現時点のproduction sourceはcommit `e4198b0`。Vercel上にも同名`suwapuyo`プロジェクトが存在しgit push契機で自動デプロイされるが、これはPhase 0時代の残置物であり**本番判断には使わない**(下記「旧デモTODO」のVercel連携項目を参照、および`07_サマリー/01_実装ルール・ロードマップ.md`の「旧Vercel記述を現行判断に使わない」)。デプロイ状況を確認する際は必ずwranglerでCloudflare Pages側を見ること。

---

## 🔴 現行最優先: 初回登録・LINE・ブース体験（2026-07-12）

正本:

- `docs/70_すわぷよ・ユアタイム統合仕様/02_体験設計/07_初回登録・チェックイン・ブーススタンプ設計.md`
- `docs/70_すわぷよ・ユアタイム統合仕様/07_サマリー/05_LINE・LIFF・出展者体験_論点整理.md`
- `docs/70_すわぷよ・ユアタイム統合仕様/06_運用/03_出展ブース暫定台帳.md`

### 開発エージェント運用 [DEVAGENT-1xx]

正本:

- `AGENTS.md`
- `docs/70_すわぷよ・ユアタイム統合仕様/07_サマリー/01_実装ルール・ロードマップ.md` §10

- [x] **DEVAGENT-101**: GPT/Codexの開発モデルを、A=設計・高リスク最終判断、B=通常実装、C=機械的調査の3クラスで使い分ける永続指示を追加
- [x] **DEVAGENT-102**: 軽量モデル単独の仕様決定・完了判定・本番反映を禁止し、B以上の再確認と高リスク時のA昇格条件を固定
- [x] **DEVAGENT-103**: モデル選択はアプリ機能ではなく開発運用限定とし、アプリへのGPT API導入要件を追加しない
- [ ] **DEVAGENT-104**: 各実装報告で、使用クラス、セルフレビュー、検証結果、commit / push / Cloudflare deploy / LINE反映を区別して記録する運用を継続
- [x] **DEVAGENT-105**: Skillを標準／Plugin管理／個人／workspace固有へ棚卸し。壊れた`waawaa-short`を削除し、別案件用Webhook SkillをLiberate AIXへ移管
- [x] **DEVAGENT-106**: workspace Skillの表示名を日本語で分かりやすくし、内部slugと分離。`すわぷよSNS画像制作`で4:5、文字完全一致、公式やす原画不変、公開Gateを自動検査

### 制作過程・ブランド資産化 [PROCESS-1xx]

正本:

- `docs/80_process-economy/00_index.md`
- `docs/80_process-economy/01_capture-and-publication-policy.md`
- `docs/80_process-economy/02_character-ip-and-account-strategy.md`
- `docs/80_process-economy/03_sns-launch-and-creative-spec.md`
- `docs/80_process-economy/04_cousin-vtuber-dance-pipeline-spec.md`
- `docs/80_process-economy/05_cousin-character-master-and-generative-governance.md`
- `docs/80_process-economy/06_character-consistency-technology-landscape-2026-07.md`
- `docs/80_process-economy/07_cousin-brand-and-social-series-bible.md`

- [x] **PROCESS-101**: Source / Structured / Publishableの3段階と、制作過程アーカイブのディレクトリ・テンプレートを作成
- [x] **PROCESS-102**: 修正前後スクリーンショット、再現、比較案、AIと人の分担、セルフレビューの記録規約を作成
- [x] **PROCESS-103**: 2026-07-12 YourTIME会話ログを、共同マイクによる発言者不確実性を保持して暫定構造化
- [ ] **PROCESS-104**: 現行主要画面と既知バグを台帳化し、個人情報・未許諾素材を除いたbefore証拠を採取
- [ ] **PROCESS-105**: 最初の公開記事を1本作り、X / Instagram / Threads / note / 自社サイトへの媒体別派生を作成
- [ ] **PROCESS-106**: commit・TODO・テスト結果から非公開process draftを生成し、人の承認後だけ公開候補にする補助フローを実装
- [x] **PROCESS-107**: プロセスエコノミーの目的、2キャラの物語、媒体別役割、初回投稿、評価指標、公開GateをSNS開設仕様として文書化。二人がすわぷよを開発する物語内の会話と、キャラブランド／AI／SNSの外側をときどきのぞくメタ層を分離し、事実説明は曖昧にしない原則を追加
- [x] **PROCESS-108**: いとこの権利承認、同一キャラ技術調査、ブランド設計自体をSNSのprocess economy素材へ変換できるよう、技術SSoT・シリーズバイブル・初期12投稿backlogを作成
- [x] **PROCESS-109**: 上記SSoTを担当者向けHTML運用マニュアルへ統合し、制作方式選択、投稿、承認Gate、日次・週次・事故対応、ファイル導線を1ページで説明

### やすキャラ・IP・アカウント [BRAND-1xx]

- [ ] **BRAND-101**: キャラコピー許可は取得済み。ツナマヨさんと公式やすの著作権帰属、媒体、商用、改変、動画、AI入力、監修、クレジット、終了条件の具体的範囲を文書化
- [ ] **BRAND-102**: 公式やすと「爬虫類のいとこ」と分かりつつ単独で誤認されない、手足付き・動画展開可能なサンゴ色ヤモリ系デザイン候補をツナマヨさん監修で確定
- [ ] **BRAND-103**: 公式やすとやっ太郎の性格、口調、ぶれてよい範囲、禁止表現、危機対応をキャラクターバイブル化。物語内／メタ層／現実説明の境界と権利確認を確定
- [x] **BRAND-103A**: いとこを`実験隊長`、公式やすを`編集長・開発者`として、キャラクターIPを内面・意思決定・関係性・物語生成・ブランド・統制の6系統、CB-001〜306の原子項目、MVC必須25項目、圧力テスト、専門15視点へ分解したv0.9バイブルを作成
- [ ] **BRAND-103B**: v0.9をツナマヨさん・木幡さんがreview。正式名称は`やっ太郎`に決定済み。species、口調、造形hard invariant、master変更承認者を確定してv1.0へ昇格
- [ ] **BRAND-103C**: MVC 25項目をapproved/reviewedへ更新し、10状況の圧力テスト、台詞だけの識別、公式やすとの関係性test、最低10episode生成testを実施。現行L0.7からL1 Recognizableへ昇格
- [x] **BRAND-103D**: CB-001〜306全項目へ、日本語名・英語名・具体的なキャラ案・Invariant/Range/Arc/Variantを記入したCanon draft v0.1を作成。没案フォルダから孵る、思いつきを試作品化する、急ぐほど重要条件が一つ抜ける等の非人間的な固有性と、消されたくない／役に立ちたいという共感核を分離
- [x] **BRAND-103E**: 正式名を`やっ太郎`（やす太郎＋「やったろう！／何でもやってやろう！」）に決定。公式やすを保護者・上司にせず対等な相棒とし、やっ太郎は行動・成功・失敗から必ず成長する方針、`ぶっ飛び × たまに真面目な公式やす`の基本トーンをCanon draft v0.2へ反映
- [ ] **BRAND-103F**: 投稿形式を事前固定せず、静止画・連続画像・動画・文章・参加型を最低18本探索。同目的・同対象で各patternを最低3回比較後、winner / challenger / wild cardを決める
- [ ] **BRAND-104**: すわぷよLINE / ツナやすX・Instagram・Threads / ツナやすWeb / いとこシリーズの役割、表示名、共通handleを確定
- [ ] **BRAND-105**: YourTIME、ツナやす、出展者間でデータ取得主体、利用目的、レポート、事例利用、削除責任を文書化
- [ ] **BRAND-106**: 公式やす＋いとこのSNS共通アイコンのドラフト(v3/v5)を制作済み。公式やすのポーズ・シャツ・ベスト・しっぽ・顔を原画のまま保持し、円形クロップ、32px視認性、両者識別、既存22体との非衝突を確認して採用版を確定
- [ ] **BRAND-107**: Xヘッダー、Instagram固定紹介キービジュアル、Threads初回紹介キービジュアルのドラフトを制作済み。各実機クロップを確認して採用版を確定
- [ ] **BRAND-108**: 業務用メール、運営主体、回復担当、パスワード管理、2要素認証、回復コード、誤投稿防止を確定
- [ ] **BRAND-109**: Instagram → Threads → Xの順でアカウントを作成し、同一表示名・handle・アイコン・リンクを設定。公開操作は木幡さん確認後に実施
- [ ] **BRAND-110**: はじめまして／すわぷよの始まり／公開する理由の初回3投稿を媒体別に作成し、権利・事実・個人情報レビュー後に公開。初回投稿ではYourTIME.が未病×エンタメイベントであることを先に説明し、すわぷよの狙い、`やす太郎`といとこ`やっ太郎`、制作過程の公開方針へつなぐ
- [ ] **BRAND-111**: `やっ太郎、最初のやったろう`を初回コンテンツ候補として制作。v0.1の「目的を教える」案は木幡さんreviewで却下記録化し、v0.2を「ゲームが一秒もないのに最終回だけ先につくる」物語へ再設計。目的・媒体別派生・ASCII storyboard・Character Master準拠の生成・人の公開review Gateまで作成。木幡さんの笑い／reference選択／台詞review後にだけ画像生成と公開候補化へ進む
- [x] **BRAND-112**: 公式やすは`やすさん.jpg`を生成AIへ入力せず、SHA確認済み原画を1:1・無変形でのみ合成する絶対ルールを固定。AI再描画したYT-001 Slide 2をrejectedへ隔離
- [ ] **BRAND-113**: YT-001 Slide 2を、公式やす原画をAIへ渡さず、4:5背景・文字生成後に保護原画を無変形合成して再制作。文字転記・完全一致・pixel一致・人レビューを通す

### いとこVTuber・トレンドダンス [VTUBE-1xx]

正本:

- `docs/80_process-economy/04_cousin-vtuber-dance-pipeline-spec.md`

- [x] **VTUBE-101**: Instagram / YouTube / TikTokのトレンド発見、権利Gate、motion capture、VRM、OBS、媒体別音源、計測までの実装設計を作成
- [x] **VTUBE-101A**: 2D / Live2D / 3D / GPT Image 2を横断するCharacter Master、Identity Lock、Golden Set、drift risk、生成manifest、3-role review、version、rollback、incident対応を実装SSoT・JSON Schema・observed draftへ落とす
- [x] **VTUBE-101B**: 2026-07時点の海外を含むOSS・commercial事例を比較し、固定2D / rigged 2D / VRM 3D / reference image / generated videoのsource selector、6層license、Training / Golden / Holdout分離、temporal QA、provenanceを技術SSoT化
- [ ] **VTUBE-102**: いとこの造形・権利・自由展開はツナマヨさん承認済み（`RIGHTS-COUSIN-2026-07-13-ORAL-001`）。正式名称・Character Master造形値・master変更承認者・クレジットを確定し、一般配布・学習weight・無制限再許諾だけ別Gateで補完
- [ ] **VTUBE-102A**: 現行いとこ案の種、neutral頭形、頭身、手指・足趾、眉、牙、額記号、腹側、尾、ベスト、badge、palette、line、陰影をツナマヨさんと確定し、Character Master 1.0.0へ昇格
- [ ] **VTUBE-102B**: 正面・3/4・側面・背面turnaround、face、hands/feet/tail、outfit、palette/line、24表情、32pose、foreshortening/occlusionの各sheetを制作・承認
- [ ] **VTUBE-102C**: Golden Set 12条件を作者承認し、GPT Image 2のreference slot、固定prompt、hard gate、95点rubric、生成manifestをproduction版へ固定
- [ ] **VTUBE-102D**: 生成10scene以上でhard failure 0・平均95点以上、3秒同一認識90%以上・公式やす誤認5%未満をpilot検証し、結果と修正をprocess record化
- [ ] **VTUBE-102E**: 作者承認assetをTraining Pack / Golden Set / Holdout Stress Setへ重複なしで分割し、caption・hash・外部送信・weight配布条件を登録
- [ ] **VTUBE-103**: 3D制作担当、費用、Blender source、VRM 1.0、stream/render版、表情・しっぽ・修正回数・納品条件を確定
- [ ] **VTUBE-104**: 仮VRMでSysMocap / XR Animator / Warudoを同一5動作・10秒動画・Zoom小窓で比較し、fps、遅延、足滑り、表情、ライセンス、外部通信、運用難度を記録
- [ ] **VTUBE-104A**: 同一原画・5表情・5動作でInochi2D / Live2Dを比較し、制作工数、tracking、破綻、商用、source納品、運用担当から2D rigを選定
- [ ] **VTUBE-104B**: 同一briefでBlender/VRM retarget、GPT Image 2、ComfyUI + IP-Adapter/ControlNet、Wan2.2-Animate、LTX-2、closed benchmark 1種を比較し、品質・temporal drift・時間・費用・license説明を記録
- [ ] **VTUBE-105**: 演者同意、raw動画保持期限、motion再利用・販売、子ども除外、ローカル処理の運用を確定
- [ ] **VTUBE-106**: TrendObservation / MotionClip / PublicationJob台帳を実装し、元動画・音源の無断保存を禁止するvalidatorを追加
- [ ] **VTUBE-107**: いとこVRM 1.0の正式stream版・render版を制作し、Tポーズ、歩行、回転、しゃがみ、ジャンプ、手振り、指さし、表情、しっぽを受入確認
- [ ] **VTUBE-108**: 権利確認済みの演者motionを取得し、foot lock、関節制限、欠損補間、しっぽ、表情を含むリターゲットpresetを確定
- [ ] **VTUBE-109**: 無音・無watermarkの1080×1920 masterを3本制作し、Instagram / YouTube / TikTokへ媒体別音源を手動付与する運用を実機確認
- [ ] **VTUBE-110**: OBS Virtual CameraをZoomとGoogle Meetで確認し、左右反転、音声同期、30分負荷、camera disconnect、60秒復帰、通常カメラfallbackを検証
- [ ] **VTUBE-111**: character / rights / safety / quality / factualの5レビューと、24時間・72時間・7日指標を台帳化
- [ ] **VTUBE-112**: Wan2.2-Animate / LTX-2等は許諾済み自作motionだけでpilotし、code / checkpoint / dependency / custom node / input / outputのlicenseを固定。license不在・academic/non-commercial条件のものを営業・広告・有償制作へ使わないvalidatorを維持

### 初回登録 [ONBOARD-3xx]

- [x] **ONBOARD-301**: 最新フローを`利用目的 → 遊ぶ人 → 人数 → 全児の年月・性別 → 確認`へ決定。遊び方を初回から外す
- [x] **ONBOARD-302**: 初回利用目的の短文、規約・プライバシー導線、基本分析と追加同意の境界を設計
- [ ] **ONBOARD-303**: 子ども単独利用時の`actor_type`、保護者確認が必要な年齢境界を確定
- [x] **ONBOARD-304**: `family_profiles` / `family_children` / requestの論理schemaを年月・性別保存へ同期
- [ ] **ONBOARD-305**: 旧local schema v2→v3と将来DB migration・rollbackを実装
- [x] **ONBOARD-306**: 子ども単位の確認・変更・削除、同意撤回、全削除UIを実装
- [x] **ONBOARD-307**: 人数先行選択、全児一括保存、戻る、中断再開、保存失敗を実装
- [x] **ONBOARD-308**: 性別`female / male / other / prefer_not_to_say`と表示ラベルを実装し、未入力と回答拒否を分離
- [ ] **ONBOARD-309**: 375×667 / 390×844実機で中央値60秒以内、横overflowなし、読み上げ順を検証
- [ ] **ONBOARD-310**: 同意前保存禁止、年月・性別のURL／ログ／analytics非出力、RLS、削除をテスト

### キャラクター編成 [CHAR-3xx]

- [x] **CHAR-301**: ゲーム4枠を初回自動編成し、全キャラの姿と名前を選択可能にする
- [x] **CHAR-302**: 手動選択枠を固定し、明示的な`新しいゲーム`操作時だけ未固定枠を再抽選する（2026-07-13木幡さん承認。キャラ選択画面の最上位CTA`この4人ですぐ遊ぶ`では表示中の4人を変更せず開始し、`おまかせで選び直す`だけ全枠を再抽選する。mount時の再抽選は行わない）
- [x] **CHAR-303**: `おまかせ編成`で全枠再抽選し、直近未登場キャラを少し優先する
- [x] **CHAR-304**: 自動編成、選択、固定、再抽選、登場偏りを計測・テストする

### LINEリッチメニュー [LINE-2xx]

- [x] **LINE-201**: LINE公式アカウントを通常入口・再訪ホーム、すわぷよ単一LIFFをゲーム／マップ／ブース／スタンプ／作品受取のWeb体験本体とする。公式アカウントQRを通常導線、作品QRを同一LIFFの`/claim/{opaque_token}`へ入る例外導線として役割分担を決定
- [ ] **LINE-202**: 開催前・当日・開催後×5枠のラベル、座標、遷移先、計測、fallback対応表を固定（開催前5枠のラベル・座標・message/URI actionはv5で固定。開催前の応答本文、当日・開催後は未確定）
- [x] **LINE-203**: 既存すーすー／わーわー透過画像、村背景、旧メニュー素材を棚卸し
- [ ] **LINE-204**: 2500×1686で3フェーズの完成画像を制作。開催前v5を作成済み（5枠の淡い区切り、下段ラベル入替、文字完全一致）。当日・開催後は未採用。各画像で1MB以下、文字可読性、safe areaを確認
- [ ] **LINE-205**: すわぷよ独立ロゴ、YourTIME.ロゴ、作り手・ブース・地図・感想等の不足素材を許諾付きで確定
- [ ] **LINE-206**: 単一LIFFのrouteとキーワード応答を確定し、未公開routeのfallbackを実装（開催前は`すわぷよで遊ぶ`のLIFF URI、`YourTIME.出展ブース紹介`、`YourTIME.日時・アクセス`、`すわぷよって？`、`すわぷよの作り手`のmessage actionまで固定。日時・会場・チケットURLはYourTIME公式サイトで確認済み。応答本文、確認済み出展カテゴリ、当日・開催後routeは未確定）
- [ ] **LINE-207**: 安全CLIで3 rich menuを作成、画像upload、IDをsecretでない設定として記録（`tools/line/richmenu.mjs`は開催前の検証・定義・作成・明示的default切替まで対応。LINE本番作成・画像uploadは未実施）
- [ ] **LINE-208**: 開催前→当日→開催後の手動切替、rollback、per-user link残存確認の運用手順を実装
- [ ] **LINE-209**: iOS/Android LINE実機で全15領域、ラベル、遷移、計測を確認

### ブースLIFF・台帳 [BOOTH-1xx]

- [x] **BOOTH-101**: Instagram紹介26投稿を暫定台帳化し、全件`unverified`・画像転載不可として整理
- [ ] **BOOTH-102**: YourTIME.運営と26候補の正式名称、handle、ブース／ステージ区分、重複を照合
- [ ] **BOOTH-103**: 各出展者の一行説明、カテゴリ、対象、料金、予約、CTA、画像・ロゴ許諾を確認
- [x] **BOOTH-104**: 確認済み台帳を型付きデータへ変換し、未確認値を本番へ出さないvalidatorを実装（`boothValidator.ts`実装・テスト済み。正式台帳(BOOTH-102/103)がまだ無いため実データへのゲート適用は未接続）
- [x] **BOOTH-105**: LIFF一覧、詳細、カテゴリ、検索、SNS導線、素材なしfallbackを実装
- [ ] **BOOTH-106**: 正式会場図とブース番号対応が届くまで一覧のみ提供し、位置を推測しない
- [ ] **BOOTH-107**: 公平ローテーション、PR表示、少数値保護、画像権利、医療健康表現をテスト

### チェックイン・スタンプデモ [CHECKIN-1xx]

- [x] **CHECKIN-101**: 入口チェックイン、ブース訪問、行動、感想、報酬の論理イベント境界を設計
- [x] **CHECKIN-102**: 入口QRのデモ導線と当日限定キャラクターの冪等付与演出を実装（`/event/:campaign/check-in`としてMvpApp.tsxに統合済み）
- [x] **CHECKIN-103**: 仮ブース2〜3件のQR／デモボタン、スタンプ付与、スタンプ帳を実装（`/booths/:id/check-in`・`/stamps`としてMvpApp.tsxに統合済み）
- [x] **CHECKIN-104**: 説明・体験・購入・見学の複数選択、任意評価・短文、スキップを実装
- [x] **CHECKIN-105**: 出展者向け仮レポートで訪問と自己申告を分け、指標定義を表示
- [ ] **CHECKIN-106**: 重複、改変、期限切れ、別campaign、オフライン再送の境界テストを追加
- [ ] **CHECKIN-107**: 本番schema、opaque token、署名、失効、RLS、少数値基準はGate通過まで未実装を維持

### すわぷよの作り手・案件化 [MAKER-1xx]

- [ ] **MAKER-101**: やす・ツナマヨのアイコン、プロフィール、実績、公開許諾を確定
- [x] **MAKER-102**: `すわぷよの作り手`ページを、実例→役割→課題別入口→相談確認の順で実装（`/maker`としてMvpApp.tsxに統合済み。MAKER-101未確定のためプロフィールはプレースホルダー文言）
- [x] **MAKER-103**: `もっと覚えてもらいたい / 発信や仕事をラクに / 新しい体験を`の課題別CTAを実装
- [x] **MAKER-104**: 相談文を利用者が確認・編集してから送信し、本人の意図なしに自動送信しない
- [x] **MAKER-105**: maker viewed→problem selected→consultation startedを匿名計測し、営業台帳と分離
- [ ] **MAKER-106**: 相談先、対応責任者、初回応答SLA、保持・削除運用を確定

### 統合検証 [INTEGRATION-3xx]

- [ ] **INTEGRATION-301**: `案内 → 要件 → UX → 画面 → DB → API → テスト → TODO`の旧方針残存を0件にする
- [ ] **INTEGRATION-302**: TypeScript、unit、E2E、build、`git diff --check`を成功させる
- [ ] **INTEGRATION-303**: LINE内WebView、Safari、Chrome、Android LINEで初回・ブース・チェックインを実機確認
- [ ] **INTEGRATION-304**: 保護者、子ども、出展者、運営、専門家のレビュー結果を記録し、重大指摘を解消

---

## 🗂 履歴: 旧初回質問・年齢段階別体操（2026-07-11、決定-031〜034で上書き）

以下は旧仕様の実装履歴であり、現行受け入れ条件には使わない。最新実装では年月・性別を保存し、全児登録、遊び方初回外へ変更する。

### 仕様確定 [SURVEY-0xx]

- [x] **SURVEY-001**: 初回質問を`誰が遊ぶか → 生まれた年・月 → 遊び方`に確定
- [x] **SURVEY-002**: 生まれた年・月は端末内で年齢帯へ変換し、年月自体をAPI・ログ・DBへ保存しない
- [x] **SURVEY-003**: `年齢のめやすに合わせた遊び`とし、診断・治療・個別最適・効果保証をしない
- [x] **SURVEY-004**: イベント質問を開催前 / 当日 / 開催後に分離し、通常時は表示しない
- [x] **SURVEY-005**: 性別、流入元、健康関係者、同行人数を初回質問から外す

### 実装 [SURVEY-1xx]

- [x] **SURVEY-101**: `surveyCopy.ts`を新しい3問と説明文へ変更
- [x] **SURVEY-102**: `OnboardingFlow.tsx`からparty・大人/子ども人数・性別・流入元・健康関係者ステップを除去
- [x] **SURVEY-103**: 生まれた年・月picker、未来月・過大年齢・不正値の入力境界を実装
- [x] **SURVEY-104**: 年月を端末内で年齢帯へ変換し、年月が保存・計測・ログ出力されないテストを追加
- [x] **SURVEY-105**: 複数の子どもの追加・削除と`今は選ばない`分岐を実装
- [x] **SURVEY-106**: 遊び方を体操の初期表示順へ接続し、保護者画面から変更可能にする
- [x] **SURVEY-107**: 開催前 / 当日 / 開催後 / 通常時の質問切替境界を実装
- [x] **SURVEY-108**: 旧local保存データを破壊せず新schemaへ正規化するmigrationを実装
- [ ] **SURVEY-109**: `age_as_of`から12か月後に、任意の年齢帯再確認を保護者画面へ表示
- [x] **SURVEY-110**: 希望別の体操初期順を接続し、`おまかせ`抽選をJST当日中固定

### LIFF認証ゲート [LIFF-1xx]

- [x] **LIFF-101**: 既存LIFF SDKローダーを再利用し、すわぷよ専用の必須認証境界を分離
- [x] **LIFF-102**: LINE内 / 外部ブラウザ、未ログイン、未友だち、初期化失敗、ローカルdemoを状態分岐
- [x] **LIFF-103**: `getFriendship()`再確認と`requestFriendship()`導線を実装
- [x] **LIFF-104**: LINE user ID・token・SDKエラー本文を保存、URL、画面、ログへ出さない境界を実装
- [ ] **LIFF-105**: Product WorkerでLIFF ID/access tokenを検証し、内部sessionを発行
- [ ] **LIFF-106**: LINE Developers Console実設定で、未追加→追加→同一画面再確認をiPhone/Android実機確認

### 監修・検証 [SURVEY-2xx]

- [ ] **SURVEY-201**: 年齢帯ごとの体操・説明・難易度・注意文を専門家レビューで固定
- [x] **SURVEY-202**: 375×667 / 390×844で60秒以内・全問スキップ・戻る・複数児をE2E確認
- [ ] **SURVEY-203**: `その子に最適`、`改善する`、`健康になる`等の禁止表現が画面・計測・資料にないことを確認
- [ ] **SURVEY-204**: DB/API実装前に論理schemaと利用目的文を再レビューし、migration承認を得る

> 以下の6/30デモTODOは履歴として残す。`隠しキャラ`、旧アンケート、旧解放条件は現行仕様では廃止済み。

---

## 🔴 最優先: すわぷよ「感動デモ」(6/30運営会議向け)

**目的(CR-0)**: 2026-06-30 YourTIME運営会議で、諏訪さん＆運営に「描いた絵が“自分の相棒”として動き、いっしょに遊び、未病体操をする」通し体験を1台で見せ、**(1)前日開放 (2)LINE立ち上げ (3)キャラ二次利用** のGOを取る。
**実装の正**: `04_demo-detailed-design.md`（v0.2.1）＋`05_storyboard-and-narrator-script.md`（絵コンテ＋村長脚本）。実装=**Codex**。
**原則**: 1オリジンpath配信／全工程オフライン成立／**DB変更なし**／**前方互換シーム(04§14)で本番は“足すだけ”**。

確定UX: 同一端末で即召喚／手動「体操タイム」／お手本=もぐぴよ実演＋かな＋口ピクト＋タイマー／相棒選択(村22体＋自分の絵＋隠しロック枠1/3〜1/2)／降臨=空から＋名乗り「あそぼ！」／喜び=連鎖ほど＋SE・声なし／わーわー村長ナビ。**監修(出展者紹介)はデモ外＝本番**。

### 基盤(共通) [DEMO-0xx]
- [ ] **DEMO-001**: `src/shared/buddyStore.ts`（IndexedDB・Blob・get/set/markSummoned）
- [ ] **DEMO-002**: `src/shared/progressStore.ts`（taisou_counts/login_days/streak/unlocked_character_ids/selected_buddy ※形は本番想定=04§14 S-2）
- [ ] **DEMO-003**: `src/config/characters.ts`（村22体・starter/hidden・**id=display_characters.idと一致**）
- [ ] **DEMO-004**: `src/config/taisouHosts.ts`（部位↔ホスト↔かな↔口ピクト↔一言）
- [ ] **DEMO-005**: 境界関数 `loadCharacters()/isUnlocked()/track(enum+meta)` を“境界”として実装(04§14 S-1)
- [ ] **DEMO-006**: `App.tsx` を1オリジンpath routingに（hostname分割を踏まない・`/map`追加）

### P0(必須・物語が立つ最小) [DEMO-1xx]
- [ ] **DEMO-101**: ふわ描画完了→`setBuddy()`＋「すわぷよで遊ぶ」CTA(`/`)
- [ ] **DEMO-102**: キャラ選択(簡易)＝自分の絵＋starter数体＋ロック枠表示（`CharacterSelectScreen`）
- [ ] **DEMO-103**: 自分の絵を選ぶ→**降臨フル**（05 A-1: 予兆→降下→着地→名乗り）
- [ ] **DEMO-104**: 応援レイヤー＝**連鎖ほど大喜び＋SE・デバウンス**（`popClearable`フック）
- [ ] **DEMO-105**: 「体操タイム」→お口体操（もぐぴよ実演＋かな＋口ピクト＋タイマー）→カウント+1
- [ ] **DEMO-106**: わーわー村長ナビ（要所のふきだし・05 B-1）
- [ ] **DEMO-107**: デモ種（事前に相棒1枚仕込み）＋全工程オフライン確認

### P1(厚み) [DEMO-2xx]
- [ ] **DEMO-201**: キャラ選択の**村22体＋隠しシルエット**(1/3〜1/2)＋ヒント文言
- [ ] **DEMO-202**: 体操3部位（もぐぴよ/シンボー/酸化）＋村長ナビ全編
- [ ] **DEMO-203**: 降臨/喜び/お手本の仕上げ（イージング/SE/モーション微調整）
- [ ] **DEMO-204**: 村キャラ選択時の“軽い登場”

### LINE当日マップMVP [MAP-0xx]
- [x] **MAP-001**: `/map` スマホ当日マップ（`BoothMapScreen`）
  - [x] **DEMO-302a**: `docs/10_fuwafuwa-land/00_strategy/12_line-map-and-handoff.md` を正本に、実装境界・未決・QAを整理
  - [x] **DEMO-302b**: 静的データ + 境界関数 `loadMapLands()/loadBoothExhibitors()`（DB変更なし）
  - [x] **DEMO-302c**: ランド別タブ + 簡略マップ + 出展者一覧
  - [x] **DEMO-302d**: ブース/一覧タップ → 紹介カード(bottom sheet)
  - [x] **DEMO-302e**: `/` すわぷよ導線 + 既存 `/staff` `/display` 回帰確認
- [x] **MAP-002**: `/map` `/fuwafuwa/map` `#/fuwafuwa/map` の3経路確認（Supabase未設定でも表示）
- [x] **MAP-003**: `trackMapEvent()` 境界関数のみ設置（初期no-op、将来tap_eventsへ接続）
- [x] **MAP-004**: 紹介カード文言の医療広告チェック（断定・診断・予防効果表現を入れない）
- [x] **MAP-005**: `/line` LINE風リッチメニュー入口（すわぷよ/マップ/ふわふわ/体操/スタッフ/ディスプレイ）
- [x] **MAP-006**: `/?taisou=1` お口体操直行デモ導線（完了状態までDOM確認）

### P2(引き立て・最初に削る) [DEMO-3xx]
- [ ] **DEMO-301**: `/display` 複数ブース（`config.sponsors[]`）

### 前方互換シーム(本番手戻り防止・04§14) [DEMO-4xx]
- [ ] **DEMO-401**: 解放 `unlockRule(progress)` は仕様明記＋stub(starter返す)。素データ(counts/streak/login_days)は記録
- [ ] **DEMO-402**: `TaisouInterlude` に `sponsor?` prop(デモ未使用)・`CharacterSelect`は`isUnlocked()`経由
- [ ] **DEMO-403**: track計測点をenum+metaで“呼び場所だけ”設置（DB配線は本番）
- [ ] **DEMO-404**: ID整合(characters.id=display_characters.id)・`BuddyRecord.artworkId`保持

### 受け入れ/検証 [DEMO-5xx]
- [ ] **DEMO-501**: 縦貫通QA（描く→選ぶ→降臨→喜び→体操）・`tsc -b && vite build` green・**既存回帰なし**
- [ ] **DEMO-502**: 6/28壁打ちで**P0予行**

> 確定デフォルト(04§13): a 当日マップ=出展者のみ / b 体操3部位(お口/首肩/呼吸) / c ナビ各遷移1ふきだし / e ルート`/map` / f 名乗り「あそぼ！」 / g starter約13・hidden約9 / h ヒント「たくさんあそぶと…ひらくかも？」

---

## 🔴 最優先: Shorts Auto Studio MP4出力MVP

目的: すーすーわーわーキャラを使い、YourTIME向けショート動画を「画面を開く -> 候補生成 -> レビュー -> MP4出力」まで迷わず進められるフロント/生成基盤にする。

最新方針:

- 画像生成機能は初期スコープ外。API課金を避けるため、既存キャラ画像・既存背景・ローカル生成素材を使う。
- SNS自動投稿は初期スコープ外。Instagram / YouTube / TikTok API連携は難易度・審査・認証・誤投稿リスクが高いため、まずMP4出力までに集中する。
- MVPのゴールは、毎日2-3本の候補を短時間でレビューし、MP4と投稿文下書きを出せること。
- 投稿は当面、人間がSNSへ手動投稿する。
- キャラは表示用画像がある全キャラを選択可能にする。特徴説明が未整備のキャラは `詳細未設定` として選択可能にし、後でキャラ台帳を拡張する。
- JSONは内部形式。ユーザーはWeb UIでタイトル・セリフ・キャラ左右・位置・演出を微調整する。
- 2026-06-26時点のMVP到達点は「Web UIで編集 -> render.py互換JSONをダウンロード -> CLIコマンドをコピー -> `shorts/render.py --check` で検証 -> CLIでMP4生成 -> caption/hashtagsをコピー」。Web UIから直接Pythonレンダーを起動する実行ブリッジは未承認のため未実装。

### Phase SAS-0: 仕様/ドキュメント

- [x] **SAS-000**: `docs/60_shorts-studio/auto-studio/` にプロダクト要件・システム設計・生成エンジン・UI/UX設計を作成
- [x] **SAS-001**: MVPスコープを「投稿API連携」ではなく「MP4出力 + 手動投稿補助」に変更
- [x] **SAS-002**: 画面を開いてからMP4出力までのワークフローを明文化
- [x] **SAS-003**: 画像生成機能を初期スコープ外にする方針を明記
- [x] **SAS-004**: 画面状態、ボタン、成功/失敗、次に進む条件をUI/UX仕様へ分解する
- [x] **SAS-005**: タイトル雰囲気パターンを複数定義し、`titleStyle` として扱う方針を明記する
- [ ] **SAS-006**: video JSON schemaを正式固定する
- [ ] **SAS-007**: eventAnimation schemaを正式固定する
- [ ] **SAS-008**: render job schema（待機/生成中/成功/失敗/出力ファイル）を正式固定する
- [ ] **SAS-009**: 全キャラの詳細ペルソナをキャラ台帳へ追記する

### Phase SAS-1: フロントUXモック

- [x] **SAS-100**: `/shorts-studio` フロント画面を追加
- [x] **SAS-101**: 今日の候補、縦動画プレビュー、タイトル/セリフ編集、位置調整を実装
- [x] **SAS-102**: キャラ左右入れ替えUIを実装
- [x] **SAS-103**: 演出プリセット選択UIを実装
- [x] **SAS-104**: キャラ選択・ルール・学習画面のフロントモックを実装
- [x] **SAS-105**: 表示用画像がある全キャラを選択可能にする
- [x] **SAS-106**: 今日画面を「候補一覧」から「運用ダッシュボード」に強化する
- [x] **SAS-107**: 投稿枠（朝/昼/夜）とステータス（未生成/レビュー待ち/MP4出力済み）をUI化する
- [x] **SAS-108**: MP4生成ステップとダウンロード完了状態をUI化する（半自動MVP: JSONダウンロード + CLI生成）
- [x] **SAS-109**: 投稿文・ハッシュタグ・手動投稿チェックリスト画面を追加する
- [ ] **SAS-110**: `投稿枠 -> 候補 -> レビュー -> プレビュー -> MP4生成 -> 投稿準備 -> 学習` のステップバーを実装する
- [ ] **SAS-111**: 未来ステップを押した時に、進めない理由を表示する
- [ ] **SAS-112**: 投稿枠設定画面を実装する（主ターゲット/テーマ/投稿目的/1人or2人/キャラ指定）
- [ ] **SAS-113**: 候補生成中画面を実装する（キャラ相性/天気/タイトル雰囲気/尺/YourTIME確認の進行ラベル）
- [ ] **SAS-114**: 候補選択画面を実装する（3案、品質バッジ、伸びる理由、注意点、採用/保留/却下）
- [ ] **SAS-115**: 却下理由UIを実装する（キャラらしくない/まじめすぎる/ふざけすぎ/医療表現が強い等）
- [ ] **SAS-116**: レビュー右パネルを `内容/キャラ/見た目/演出/チェック` タブへ分割する
- [x] **SAS-117**: タイトル雰囲気 `puku-yellow/teacher-green/fuwa-blue/kiratto-peach/hand-white/adventure-orange/night-drop/fire-red` を選択可能にする
- [ ] **SAS-118**: 立ち位置プリセット（向き合う/並んで前を見る/左が話す/右が話す/ひとり中央）を実装する
- [x] **SAS-119**: 高速プレビュー確認画面を実装する（1:1安全域、冒頭ルール、尺、YourTIME接続）
- [x] **SAS-120**: 警告確認チェックを実装する（エラーは停止、警告は承認後にMP4生成へ進める）
- [x] **SAS-121**: 投稿準備画面を実装する（MP4、投稿タイトル、キャプション、ハッシュタグ、手動投稿チェックリスト。ローカル開発ではWeb UIからMP4生成/ダウンロードまで可能）
- [ ] **SAS-122**: 学習画面を「次回ルール候補」中心に作り直す
- [x] **SAS-123**: モバイル幅で `ステップバー -> プレビュー -> 主操作 -> 一覧 -> 品質チェック` の順に縦積みする（編集パネルを非表示にせず、縦積みで操作可能）

### Phase SAS-2: 生成/レンダー接続

- [x] **SAS-200**: Web UIの編集状態からvideo JSONを生成する
- [x] **SAS-201**: 既存 `shorts/render.py --preview` とWeb UIを接続するAPI/CLI境界を設計する
- [x] **SAS-202**: Web UIからMP4レンダーを実行し、出力ファイルを取得できるようにする（ローカル開発用Vite middlewareで `--check -> render.py -> ffprobe -> downloadUrl` を実行。本番/クラウドworker化は別タスク）
- [x] **SAS-203**: render jobの状態（待機/生成中/成功/失敗）を表示する
- [x] **SAS-204**: 失敗時にユーザー向けエラーと再生成ボタンを出す
- [x] **SAS-205**: `eventAnimation` をrender.pyで実描画する（キャンディ雨、ほっぺ風船、つながり輪っか、ケアの光、既存候補サンプルの補助演出）
- [ ] **SAS-206**: MP4生成中の進行ラベルを表示する（レイアウト固定/フレーム書き出し/音声合わせ/MP4結合/最終確認）
- [ ] **SAS-207**: MP4生成成功時にファイル名、尺、解像度、ファイルサイズ、プレビューを表示する（ファイル名/尺/サイズ/ダウンロードは実装済み。解像度/動画内プレビューは未実装）
- [x] **SAS-208**: MP4生成失敗を分類する（`shorts/render.py --check` で `schema_invalid` / `asset_missing` / `layout_out_of_bounds` / `duration_out_of_range` / `unsupported_animation` 等を検証・分類）
- [ ] **SAS-209**: MP4ダウンロード済みチェックを状態に保存する
- [x] **SAS-210**: Web UIからrender.py互換JSONをダウンロードし、CLI生成コマンドをコピーできるようにする
- [x] **SAS-211**: `shorts/render.py` でrender.py互換JSONからMP4を生成できるようにする

### Phase SAS-3: 品質/学習

- [x] **SAS-300**: 冒頭挨拶ルール、天気ルール、30-60秒、1:1安全域の自動チェックを実装
- [ ] **SAS-301**: 医療・健康表現のNG/注意チェックを実装
- [ ] **SAS-302**: 修正理由を `今回だけ` / `次回から反映` で保存する
- [ ] **SAS-303**: タイトル位置、語尾、説明口調、キャラらしさの学習ルールを生成へ反映する
- [ ] **SAS-304**: 採用/却下/修正履歴の一覧を作る
- [ ] **SAS-305**: タイトル雰囲気の連続使用を避けるルールを実装する
- [ ] **SAS-306**: ターゲット別タイトル雰囲気の優先ルールを実装する
- [ ] **SAS-307**: 2人会話では原則キャラが向き合うチェックを実装する
- [ ] **SAS-308**: `今回だけ` / `次回から反映` の選択に応じて学習ルール候補を保存する

### Phase SAS-4: 投稿補助

- [x] **SAS-400**: Instagram / YouTube Shorts / TikTok 用の投稿文下書きを生成する
- [x] **SAS-401**: ハッシュタグ候補を生成する
- [x] **SAS-402**: 手動投稿チェックリストを表示する
- [ ] **SAS-403**: `手動投稿済み` ステータスを記録する
- [ ] **SAS-404**: SNS API自動投稿の要否を、MP4出力運用が安定してから再判断する
- [ ] **SAS-405**: `MP4をダウンロードした` が未チェックなら `手動投稿済みにする` を押せないようにする
- [ ] **SAS-406**: 投稿先メモを保存できるようにする（Instagram / YouTube Shorts / TikTok / その他）

---

## 🔴 最優先: ふわふわランド 2026-06-25 実現可否判断

目的: 2026-08-02 YourTIME イベントで、子どもたちの塗り絵/イラストがデジタル世界に登場してふわふわ動く体験を6時間運営できるかを、2026-06-25までに判断する。

重要な方針:

- 初期MVPではAIコメント生成・AIキャラ変換・SNS自動投稿は入れない。
- 顔写真/人物写真は登録・表示しない。写真導線は「塗り絵台紙/作品用紙を撮る」ために使う。
- 本番主導線は「あーとぽん型」の黒輪郭下絵入り塗り絵形式。自由描画台紙も併用し、低コスト導線としてデジタル描画の透明PNGを残す。
- 100〜200体同時表示は採用しない。一般的なDELLモニター1台/2台では作品が小さくなり、ユーザー体験が落ちるため。
- 同時表示は標準8〜20体、技術検証上限30体。
- 作品プールは保持し、ランダム登場・指定再表示・全リセット・非表示を重視する。

確定した設計判断（2026-06-23 / 正は `05_summary/04_decision-log-and-gate-plan.md`）:

- **ストレージ/同期**: Supabaseを正本にする。Storage=画像、Postgres=`artworks`/`display_state`、Realtime=別端末即時反映。IndexedDBは表示PCのキャッシュ/復帰用。
- **入力方式**: スタッフ画面はスマホ片手操作を前提に「カメラ」「画像ファイル」「描く」の3導線。紙＋A4マーカー枠の切り出しは実装するが、マーカー未検出でも画像全体フォールバックで登録完了できることを優先する。
- **氏名**: モニターは下の名前のみ表示OK(任意)。SNS転用時は名前を出さない。作品内の苗字等はプレビュー目視除外。
- **複数端末(B案)・同期(2026-06-23更新)**: スマホ撮影→Supabase→表示PC即反映(ネット前提)。**Supabase Realtime第一・正本=Supabase(Storage+Postgres)・IndexedDBはキャッシュ**。Gateから本番同一構成で実装(単一PCはフォールバック)。LAN-WS自前は不採用。iPad撮影は標準Safariタブ。`.env*`非コミット・RLS厳守。
- **配信**: イベントはローカル/PWA。URL要時のみCloudflare Pages。Vercel Hobbyは商用NG。
- **動画(並行・Gate後)**: Remotion回避→完全$0 OSS(Live2D FREE/Synfig＋Revideo/FFmpeg＋VOICEVOX)。
- **表示素材**: `public/content/01_すわぷよ/03_背景/01_村_昼.png` と `public/content/fuwafuwa-land/sprites/{ghost,tooth,blob,tanuki}/idle.png` をふわふわランド表示画面にもそのまま適用する。
- **削除**: イベント中の削除は物理削除ではなく `status='archived'` にする。Storageファイル削除は事故防止のため運用後の管理作業に分ける。
- **背景透過**: 顔写真AI変換は採用しない。紙作品/画像アップはスタッフ画面で `台紙用` / `白背景` / `そのまま` を切替できる。`台紙用` は外周2.8%トリム＋端からつながる近白背景だけ透過、`白背景` は端からつながる近白背景だけ透過、`そのまま` はJPEGカード表示。デジタル描画は最初から透明PNG。
- **AI変換**: 将来検討する場合も本人写真ではなく作品画像の世界観加工に限定し、同意・費用・待ち時間・保存先を別ADRで確定してから着手する。
- **撮影運用**: 撮影台固定ではなくスタッフ手持ち撮影。自動認識で `正式判定OK` を出し、失敗時も登録を止めない。
- **自動プレビュー**: 撮影ボタンは残すが、ライブカメラで `正式判定OK` が安定したら自動でプレビューへ進む。自動登録はしない。
- **SNS/同意**: SNS撮影はOK。個別同意フォームは持たず、会場掲示で「作品のみ/顔なし/後日素材は名前なし」を周知する。
- **裏モード**: display画面でサンプルのわーわーをタップすると `suwa-good-morning.mp3` が鳴る。5回連続タップで「わーわーもーど!」がぐるぐる登場し、最後に約2秒どーんと表示される。同時に表示中の全キャラが名前/枠/背景なしで見た目だけわーわー化して大きくなり、わーわーが約20匹上から回転しながら降ってくる。裏モード中は全キャラがぐるぐる回りながら約1.5倍速で動く。裏モード中のわーわーを5回連続タップすると元に戻る。Supabase上の登録作品画像は変更しない。
- **イベントメニュー**: スタッフ画面から `display_state.display_event` を更新し、ディスプレイ画面がRealtimeで演出を開始する。MVPは `バトル` と `イベント停止`。バトル音は外部素材を使わずWebAudioでオリジナル生成し、衝突/脱落/勝利フェーズへ同期する。ブラウザ自動再生制限対策としてディスプレイに `音ON` を置く。
- **表示キャラCMS(2026-06-25追加 / 2026-06-26更新)**: 推奨方針で確定。Supabase保存、音声は手動再生、サンプルキャラも永続化。スタッフ画面で表示/非表示/削除フィルタ、状態ボタン塗り、全キャラサイズスライダー、キャラ別タップコンテンツ編集、画像/動画/音声の複数枠を扱う。管理正本は `display_characters` + `CharacterList` に一本化し、旧 `ArtworkList` はスタッフ画面から外す。削除は `archived` 論理削除で、ディスプレイから即除外する。正は `docs/10_fuwafuwa-land/08_staff-character-content-cms-spec.md`。
- **本番URL**: 2026-06-26時点のVercel production aliasは `https://fuwafuwa-land.vercel.app`。最新反映済みdeploymentは `https://fuwafuwa-land-6aanq8j27-ks-classic.vercel.app`。

関連ドキュメント（正式体系・番号付き）:

- `docs/10_fuwafuwa-land/00_index.md`
- `docs/10_fuwafuwa-land/05_summary/04_decision-log-and-gate-plan.md` ← **現在の正**
- `docs/10_fuwafuwa-land/01_requirements/` 〜 `04_test/`

### Phase FL-0: ドキュメント/判断基準

- [x] **FL-001**: 要件定義・基本設計・詳細設計・テスト計画・サマリーを番号付き正式ドキュメント体系で作成
- [x] **FL-002**: 100〜200体同時表示をMVPスコープ外に変更
- [x] **FL-003**: DELLモニター1台/2台想定の表示方針を定義
- [x] **FL-004**: 2026-06-25 Go/Conditional Go/No-Go 判定基準を定義

### Phase FL-G: 3日Gate（2026-06-25判定 / Supabase本線で実施）

実装の正は **`docs/10_fuwafuwa-land/06_build-bible.md`**（スタック/ファイル木/型/関数/アルゴリズム/受け入れ基準）。合格基準は `05_summary/04`。
追加依存: `npm i idb jsqr perspective-transform`（マーカー検出/二値化/ワープ/塗りは自前・OpenCV等の重依存なし）。
触ってよいのは新規 `src/fuwafuwa-land/` と `App.tsx` の最小hash分岐、Supabase関連ファイルのみ。既存ゲーム・`.env*`・本番デプロイには触らない。

Day 1 — データ＆入力
- [x] **FL-G01**: Supabase(Storage/Postgres/Realtime)＋IndexedDB Blobキャッシュ、`persist()`、DB sequence採番、`storage.estimate()`確認
- [x] **FL-G02**: 紙撮影パス（`getUserMedia` → マーカー検出＋ホモグラフィ → 切り出し → Storage登録、未検出時は全体画像フォールバック）
- [x] **FL-G03**: 最小デジタルキャンバス（ブラシ＋パレット＋Undo＋透過PNG出力）＝Gate実証＆当日フォールバック
- [x] **FL-G03b**: 画像ファイルアップロード導線（スマホ内画像/スクリーンショット→プレビュー→登録→display_state反映）
- [x] **FL-G03c**: 撮影/画像/描画の登録後プレビュークリア、新規採番、新規表示反映の確認
- [x] **FL-G03d**: スマホ標準カメラ入力（`input capture=environment`）を主導線化し、撮影後に確実にプレビューへ渡す
- [x] **FL-G03e**: 背景モード（台紙用/白背景/そのまま）をスタッフ画面に追加
- [x] **FL-G03f**: 端からつながる近白背景だけを透明化するflood fill処理を実装し、内部の白を消さない
- [x] **FL-G03f-2**: 透過PNG/デジタル描画は表示画面でカード枠なし、非透過JPEGは角丸カード表示に分岐
- [ ] **FL-G03f-3**: 紙端のギザつきが目立つ場合、1〜2pxフェザーまたは軽い収縮/膨張処理を追加
- [ ] **FL-G03g**: 台紙認識の正式判定（official/fallback/rejected）を実装し、スタッフ画面にバッジ表示
- [ ] **FL-G03h**: ライブカメラ解析で正式判定OKが安定したら自動プレビュー生成。手動撮影ボタンも残し、自動登録はしない

Day 2 — 表示ワールド＆操作
- [x] **FL-G04**: PixiJSふわふわワールド（8〜30体・ふわふわ移動・ランダム/主役/非表示/全リセット、既存村背景・既存4キャラ待機表示）
- [x] **FL-G05**: 下の名前ラベル(任意)＋スタッフのID/名前ジャンプ検索
- [x] **FL-G06**: 計測オーバーレイ（FPS/メモリ/作品数/容量/接続状態）
- [x] **FL-G06b**: スタッフ一覧から削除（アーカイブ）し、表示リストから即除外
- [x] **FL-G06c**: わーわータップ音＋5回タップ裏モード（2秒どーん演出、名前/枠/背景なし全キャラわーわー化、20匹落下、ぐるぐる1.5倍速、5回タップ復帰）
- [x] **FL-G06d**: スタッフ画面イベントメニュー（バトル/停止）＋`display_event` Realtime同期
- [x] **FL-G06e**: バトルイベントMVP（中央でわちゃわちゃ、少しずつ退場、最後の1体にチャンピオン表示、音ON対応）
- [x] **FL-G06f**: バトル専用のWebAudio生成SE（イントロ/衝突/脱落/勝利）を追加
- [x] **FL-G06g**: バトル演出を簡易物理へ強化（円形ボディ衝突、跳ね返り、ぽよんエフェクト、紙吹雪、図形王冠/優勝旗）
- [ ] **FL-G06h**: 音量/ミュート/演出尺をスタッフ画面で調整できるようにする
- [x] **FL-G06i**: デフォルトサンプルキャラの正を `public/content/fuwafuwa-land/characters/originals` にし、表示用1024px派生を `public/content/fuwafuwa-land/characters/display/` に生成
- [x] **FL-G06j**: サンプルキャラ全員をスタッフ表示管理一覧へ出し、表示/非表示/削除ボタンを小型化

Day 2.5 — 表示キャラCMS / タップコンテンツ
- [x] **FL-CMS00**: スタッフ表示キャラ管理・タップコンテンツCMS仕様を確定（`08_staff-character-content-cms-spec.md`）
- [x] **FL-CMS01**: DB/Storage変更の実装承認を取る（`display_characters` / `tap_contents` / `tap_content_items` / `tap_events` / `character-content` bucket）
- [x] **FL-CMS02**: Supabase migrationを追加し、サンプル22体を `display_characters` にseed/upsertする
- [x] **FL-CMS03**: Supabase型を更新し、CharacterContentRepositoryを追加する
- [x] **FL-CMS04**: 登録作品作成時に対応する `display_characters` 行を作る
- [x] **FL-CMS04a**: 既存登録作品を `display_characters` へbackfillし、旧 `ArtworkList` をスタッフ画面から外して `CharacterList` に一本化する
- [x] **FL-CMS05**: スタッフ一覧を `CharacterList` に分離し、`すべて / 表示中 / 非表示 / 削除済み` と種別フィルタを実装する
- [x] **FL-CMS06**: 現在状態に応じて `表示 / 非表示 / 削除` ボタンを塗る
- [x] **FL-CMS07**: 全キャラ共通の表示サイズスライダーをDB永続化する
- [x] **FL-CMS08**: タップコンテンツ編集UIを実装する（基本/タップ時コンテンツ）
- [x] **FL-CMS09**: `character-content` Storageへ画像/動画/音声をアップロードし、MIME/サイズ/パスUUID化を検証する
- [x] **FL-CMS09a**: スタッフ画面から枠ごとの画像/動画/音声を登録・差し替え・外すUIを実装する
- [x] **FL-CMS10**: 複数枠の上下並び替えとプレビューを実装する
- [x] **FL-CMS11**: `CharacterContentPopup` を実装し、画像/動画/音声/CTAをディスプレイで表示する
- [x] **FL-CMS12**: `FuwafuwaWorld` のタップ対象を `display_characters` と接続し、未設定キャラは開かず、設定済みキャラだけポップアップを開く
- [x] **FL-CMS13**: `track()` を `tap_events` insertに接続し、`tap` / `popup_open` / `item_view` / `audio_play` / `cta_click` を保存する
- [x] **FL-CMS14**: すーすー動画を `sample-suusuu` のseedコンテンツへ移行し、`SponsorPopup` / `sponsors[]` 特例を削除または互換レイヤに閉じる
- [ ] **FL-CMS15**: スタッフ一覧・コンテンツ編集・ディスプレイタップの結合QAを実施する（CLI/画面表示/タイトル入力クラッシュ修正/管理一覧一本化/削除時の表示除外コード/本番200は確認済み。実ファイルアップロード、任意キャラ保存、audio/CTA、複数端末Realtime、削除操作の実機秒数は未確認）
- [x] **FL-CMS16**: `display_characters.status` をディスプレイ表示正本にし、既存 `display_state.visible_artwork_ids` 互換を段階終了する
- [x] **FL-CMS17**: `display_characters` / `tap_contents` / `tap_content_items` のRealtime購読でスタッフ画面を自動更新する
- [x] **FL-CMS17a**: `archived` 論理削除時にディスプレイの既存sprite/ロード中sprite/開いているポップアップから除外し、自作キャラは `artworks.status` にも同期する
- [x] **FL-CMS18**: 出展社/YourTIME管理・レポート向けの将来DB設計（`exhibitors` / `campaigns` / `sponsor_slots` / `report_snapshots`）を仕様化する
- [x] **FL-CMS19**: Cloud Run API + Drizzle へ移行できるRepository境界の設計メモを追加する
- [ ] **FL-CMS20**: 出展社レポートMVPを実装するか判断する（手入力SNSスナップショット、定性メモ、tap_events集計、PdM/PMM/マーケ/プラットフォーム観点入り1ページ草案）
- [ ] **FL-CMS21**: 当日前レポートの裏ログ設計を必要なら実装する（日別アクセス/表示状態/公開時間/CTA設定/AIコメント下書き、個人追跡なし）

Day 3 — 検証＆判定
- [ ] **FL-G07**: 6時間ソーク（300枚・60分以上・10秒毎入替・途中操作・ログ取得）
- [ ] **FL-G08**: スタッフ1人10作品連続登録（平均60秒以内）＋DELL視認性（1台横長を正）
- [ ] **FL-G09**: 判定レポート記入 → Go / Conditional Go / No-Go

### Phase FL-E: 2026-08-02 Event MVP

- [ ] **FL-E01**: マーカー台紙デザイン確定（→ `02_basic-design/07_coloring-sheet-capture.md`）
- [x] **FL-E01a**: 台紙は黒輪郭の白黒下絵入りを基本にする
- [x] **FL-E01b**: 下絵入りに加え、自由描画台紙も併用する
- [ ] **FL-E02**: 撮影台/スタッフ導線確定（iPad=Safariタブ撮影端末）
- [x] **FL-E02a**: 撮影はスタッフ手持ちで運用する
- [ ] **FL-E03**: ローカルフォールバック要否判断（Supabase本線の後。LAN-WS自前は不採用）
- [ ] **FL-E04**: 本番用背景・すーすーわーわー素材反映
- [ ] **FL-E05**: 同意/掲示文＋顔写真なし/氏名3行ルール（→ `01_requirements/06_privacy-consent.md`）
- [x] **FL-E05a**: SNS撮影はOK。掲示で顔写真なし/名前なし運用を周知する
- [x] **FL-E05b**: 個別同意フォームは持たない。後日素材も作品のみ・名前なしで扱う
- [ ] **FL-E06**: 会場リハーサル＋オフライン起動(ローカル/PWA)確認
- [ ] **FL-E07**: イベント後SNS転用フローをショート動画企画(OSS無料パイプライン)と接続（名前非表示・顔写真なし前提）
- [ ] **FL-E08**: 作品画像のAI世界観加工をやるか判断（本人写真AI変換は禁止、作品加工のみ別ADR）

---

## ✅ 完了済み

### Phase 0: 基盤
- [x] Vite + React + TypeScript プロジェクト作成
- [x] PixiJS 8 インストール
- [x] ディレクトリ構造作成
- [x] 型定義ファイル（game.ts, puyo.ts, audio.ts）
- [x] キャラクター設定（puyoTypes.ts）
- [x] キャラクタースプライト配置（idle.png × 4）
- [x] vercel.json 設定
- [x] グローバルCSS + CSS変数
- [x] GitHub リポ作成（Ks-Classic/suwapuyo）
- [x] Vercel連携（git push → 自動デプロイ）

### Phase 1: MVP ゲームロジック
- [x] ボード初期化（6×10 ランダム配置）
- [x] BFS 連結探索（findGroup / findAllClearable）
- [x] タイプ別消滅数（minPop: ghost=4, tooth=4, blob=3, tanuki=5）
- [x] 重力処理（applyGravity）
- [x] 空きマス補充（refillBoard）
- [x] スワップ操作（選択 → 方向 → 入れ替え）
- [x] スワップ失敗時の戻し処理
- [x] 連鎖ループ（消滅→重力→再判定）
- [x] 補充後の自動連鎖
- [x] スコア計算

### Phase 2: 描画・アニメーション
- [x] PixiJS Application 初期化
- [x] スプライトテクスチャ読み込み
- [x] ボード背景描画（クリームボード + グリーンセル）
- [x] アイドルアニメーション（浮遊 + 微回転）
- [x] 選択ハイライト（オレンジ枠 + パルス）
- [x] 方向矢印描画（オレンジ円 + 白三角）
- [x] スワップアニメーション
- [x] 消滅アニメーション（3段フラッシュ + スケールポップ）
- [x] 通常パーティクルエフェクト（テーマカラー粒子）
- [x] **たぬぺい金貨パーティクル（💰💵🪙絵文字 + "+$$$"）**
- [x] 重力落下アニメーション + 着地バウンス
- [x] 補充アニメーション（上からドロップ）
- [x] 連鎖テキスト表示（「X れんさ！」）
- [x] フェードイン初期表示

### Phase 3: 音声
- [x] SoundFX クラス（Web Audio API）
- [x] select / deselect 音
- [x] swap 音
- [x] pop 音（連鎖数でピッチ上昇）
- [x] **coin() たぬぺい専用チャリーン！（4層レジ音）**
- [x] chain アルペジオ音（2連鎖以上）
- [x] noMatch 失敗音
- [x] land 着地音
- [x] refill キラキラ音
- [x] dispose() クリーンアップ

### Phase 4: UI・テーマ
- [x] カワイイ村テーマ（背景画像 + クリームボード）
- [x] M PLUS Rounded 1c フォント
- [x] ヘッダー（すわぷよ）
- [x] スコア / チェイン表示バー
- [x] キャラクター情報パネル（名前 + 消滅数）
- [x] 操作説明テキスト
- [x] レスポンシブCSS（100dvh + flex）
- [x] キャンバス自動スケーリング（ResizeObserver + CSS transform）
- [x] Safe Area対応（env(safe-area-inset-*)）

### Phase 5: バグ修正
- [x] クリック位置ズレ修正（メタデータベースの座標取得）
- [x] ビルドエラー修正（enum → const object、未使用import削除）

---

## 📋 次のステップ

### Phase 6: ゲーム体験向上（優先度: 高）

- [ ] **TASK-600**: キャラ別消滅SE
  - わのの: ひゅ〜どろん（お化け風）
  - わーわー: ガリガリ（歯磨き風）
  - すーすー: ちゅぱちゅぱ（おしゃぶり風）
  - たぬぺい: チャリーン！（実装済み）
  - 連鎖数に応じてピッチ/テンション変化

- [ ] **TASK-601**: BGM追加
  - 村テーマに合うほのぼのBGM（Web Audio API生成 or フリー素材）
  - ループ再生
  - 音量コントロール

- [ ] **TASK-602**: 設定画面
  - SE音量スライダー
  - BGM音量スライダー
  - 各キャラの消滅数調整（2〜8）
  - localStorage に保存

- [ ] **TASK-603**: タイトル画面
  - すわぷよロゴ（アニメーション付き）
  - 4キャラが並んで揺れている
  - ゲーム開始 / 設定 / キャラ紹介 ボタン

- [ ] **TASK-604**: リザルト画面
  - スコア / 最大連鎖表示
  - リトライ / タイトルに戻る ボタン

### Phase 7: ゲーム性拡張（優先度: 中）

- [ ] **TASK-700**: ゲームオーバー条件
  - ボードが埋まったら or 制限時間
  - ゲームオーバー演出

- [ ] **TASK-701**: レベル/難易度
  - プレイ時間に応じて新ぷよのタイプが増える
  - or 消滅数が増える

- [ ] **TASK-702**: コンボボーナス
  - 短時間での連続マッチにボーナス
  - コンボ表示エフェクト

- [ ] **TASK-703**: スペシャルぷよ
  - 全消し（ボード上の同タイプを全て消す）
  - ボム（周囲N×Nを消す）

### Phase 8: コードリファクタ（優先度: 低）

- [ ] **TASK-800**: engine/ 分離
  - DemoScreen.tsx からゲームロジックを engine/ に分離
  - Board.ts, Matcher.ts, Gravity.ts, Scorer.ts

- [ ] **TASK-801**: renderer/ 分離
  - PixiJS 描画コードを renderer/ に分離
  - BoardRenderer.ts, EffectRenderer.ts, AnimationManager.ts

- [ ] **TASK-802**: 落下式ゲームモード
  - ぷよペア操作（左右移動、回転、ドロップ）
  - NEXTキュー表示
  - ゴーストピース

- [ ] **TASK-803**: キーボード操作対応
  - 矢印キー / WASD でぷよ選択・方向指定

### Phase 9: 将来機能（スコープ外）

- [ ] CPU対戦 AI
- [ ] オンライン対戦（WebSocket）
- [ ] おじゃまぷよ
- [ ] リプレイ機能
- [ ] オンラインランキング
- [ ] iOS / Android アプリ化（Capacitor or React Native）
