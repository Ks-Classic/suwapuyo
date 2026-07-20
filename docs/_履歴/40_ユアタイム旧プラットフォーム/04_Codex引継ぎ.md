# 04 — Codex 投入プロンプト（村の案内所：明日の感動デモ）

> 使い方: 下の「── PROMPT ──」ブロックをそのまま Codex に貼る。Codex はリポ直下（`~/projects/suwapuyo`）で作業する前提。言語はJP。
> 対象は **2026-07-02 打合せ用の感動デモ**（`03_村コンシェルジュ設計.md` §12）。8/2本番フル機能は別フェーズ。

---

## ── PROMPT（ここからコピー）──
/
あなたは「村の案内所 感動デモ」を実装するエンジニアです。明日の打合せで諏訪さんに **テスト用LINE公式アカウント追加 → 家族構成アンケート → マップ → QRスタンプ → 会場アナウンス** の通し体験を1台で見せ、GOを取るのが目的です。

### 前提（環境・確定値）
- **LIFF_ID** = `2010561128-QPFfdoJF`（`.env.local` の `VITE_LIFF_ID` 済）。LIFF URL = `https://liff.line.me/2010561128-QPFfdoJF`。LIFF初期化は `import.meta.env.VITE_LIFF_ID` を使う（ハードコード禁止）。ブースQR = `https://liff.line.me/2010561128-QPFfdoJF?booth=demo-01`。
- **Supabase = 既存ふわふわランドのプロジェクトを流用**（`.env.local` の `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`・project ref `lyumtxqddwrysnvnxhtm`）。クライアントは **`src/fuwafuwa-land/lib/supabase.ts` の `getSupabaseClient()` を再利用**（Realtime設定済み）。新クライアントを作らない。
- **DBはmigration追加方式**: `supabase/migrations/` に新規 `2026070x_create_concierge.sql` を追加（命名は既存 `YYYYMMDDNNNN_*.sql` に合わせる）。`announcements`（＋任意 `visitors`/`stamps`）を作成・RLS有効・既存テーブルは変更しない。型は `src/fuwafuwa-land/types/database.types.ts` に新テーブル分を追記。
- **Endpoint URL**（LIFF）= **`https://ふわふわランド旧統合版.vercel.app/concierge`**（既存Vercelプロジェクトに相乗り）。`App.tsx` で `/concierge` と `/concierge/staff` を path routing で分岐。ローカルは未設定でもローカルfallbackで通ること。
  - 2026-07-01 セルフレビューで確認済み：`/concierge`をLIFFエンドポイントにする設計自体は「LINE村の案内所＝1つの器」という企画の方針と合っている。ただし当時は`/concierge`内から`すわぷよ`(`/`)や旧`/map`へ`<a href>`で普通に遷移するとLIFFコンテキストが切れる問題があった。今回`/map`は退役・`/concierge`へ一本化したが、`すわぷよ`への遷移がLIFFコンテキストを保持しない点は未解消（本番までの検討課題）。
- **マップ画像** = `public/content/02_ユアタイム/02_会場案内/01_会場マップ_サンプル.jpg`（配置済）。**体験版QR** = `public/content/02_ユアタイム/02_会場案内/02_体験用QR_デモ.png`（`https://liff.line.me/2010561128-QPFfdoJF?booth=demo-01` を `qrcode` でPNG化）。

### まず読む（この順番・実装前に必ず）
1. `docs/_履歴/40_ユアタイム旧プラットフォーム/03_村コンシェルジュ設計.md` ← **実装の正（全章）**。特に **§12（明日デモ詳細＝最優先）**・§4(描画/操作)・§5(画面)・§7(型/DB)・§8(LIFF)・§9(計測)。
2. 既存コードのアンカー（読んでから触る）:
   - `src/fuwafuwa-land/map/boothMapData.ts`（`BoothExhibitor` / `mapX,mapY`%座標 / `loadMapLands` / `loadBoothExhibitors` / `trackMapEvent`）＝マップデータ境界。
   - `src/fuwafuwa-land/components/BoothMapScreen.tsx`＝現行マップ画面（刷新対象）。
   - `src/components/screens/LineDemoMenu.tsx`（`/line` リッチメニュー風モック）＝案内所入口の母体。
   - `src/shared/progressStore.ts`（`unlocked_character_ids`）＝スタンプ全集めで隠しキャラ解放を接続するシーム。
   - `src/shared/analytics.ts`（`track(enum+meta)`）＝計測境界。
   - `src/App.tsx`（path routing）／`src/fuwafuwa-land/store`（Supabase/IndexedDB の既存実装＝Realtime・キャッシュの流用元）。
   - `public/content/ふわふわランド旧統合版/backgrounds/`（`map_sample.jpg` をここ等に配置して使う）。

### 着手順（1コミット=1機能=CR-4・各コミットで build green）
基盤 → デモ通し の順。
1. **VC-001 型拡張**: `BoothExhibitor` に `childFriendly?/ageBands?/stampAssetUrl?/mediaUrl?`。`ChildInfo`/`ChildAgeBand`/`VisitDepth`/`VisitorType` を型定義（§7）。
2. **デモ用 store（ローカル優先）**: `visitorStore`（アンケ結果）/`stampStore`（取得スタンプ・1ブース1回・深さ上書き）を **IndexedDB で実装**（Supabase未設定でも通る）。
3. **デモseed**: ブース3-4件（§12.2）＋ 体験版QR画像を生成。**`https://liff.line.me/2010561128-QPFfdoJF?booth=demo-01` を `qrcode` でPNG化**（`npx qrcode "https://liff.line.me/2010561128-QPFfdoJF?booth=demo-01" -o public/content/02_ユアタイム/02_会場案内/02_体験用QR_デモ.png`）。受付QR（友だち追加）は LINE Official Account Manager が自動発行するものを使う＝作らない。
   - ※ このQRは**標準カメラで撮ってもLINEが開きLIFF（ブース画面）が立ち上がる**（`liff.line.me` がユニバーサルリンク）。LINEカメラ/標準カメラどちらでも同じブース画面に着くこと。LIFF初期化は `import.meta.env.VITE_LIFF_ID` を使う（ハードコード禁止）。
4. **オンボ B 家族構成アンケート**（§12.3-B）＝**デモの主役**。No ストレス5条件を満たす（キーボードなし/1タップ自動前進/アコーディオン/家族プレビュー/spring）。
5. **オンボ A ようこそ / C チュートリアル1-2枚**。
6. **マップ刷新（VC-101/102/103/105）**: `map_sample.jpg` を SVG `<image>`＋`<g booth>`オーバーレイ、`react-zoom-pan-pinch` で Googleマップ型 pan/zoom、初期=横幅フィット、ランドchip→fly-to。bottom sheet ブースカード（医療広告セーフ）。
7. **QR体験＋スタンプ（VC-201/202）**: `?booth=` か「QRを読んだことにする（デモ）」ボタン→3ボタン→**スタンプ演出（§12.3-E・~600ms・時計→ロゴぽん/リング光/confetti5-8/SE/カウンタbounce）**。
8. **スタンプ帳（VC-203/204）**: グリッド＋進捗＋「全部で隠しキャラ✨」＋全集めで `unlocked_character_ids` へ。
9. **会場アナウンス（§12.3-G）**: `/concierge/staff` 入力→ Supabase `announcements` Realtime → 全LIFFの上部バナー（slide down・5-8s自動クローズ・SE）。Realtime不可時はログ/モックfallback。
10. **計測（VC-005）**: `track` enum 追加（`onboard_done`/`map_open`/`booth_card_open`/`stamp_get`(depth)/`unlock_hidden`/`announce_recv`）。新イベント名を作らず enum 拡張。

### 絶対に守る制約
- **1オリジン path 配信**: `App.tsx` の `hostname.includes("ふわふわランド旧統合版")` 経路に乗らない。path/hash で判定。新ルート `/concierge`（来場者）/`/concierge/staff`（アナウンス送信）/QRは `?booth=`。
- **オフライン耐性**: Supabase未設定でも、アンケ・マップ・スタンプ・スタンプ帳は **IndexedDBローカル** で全工程が成立。会場アナウンスのRealtimeだけ Supabase を使う（最小テーブル `announcements`・デモ専用）。
- **DB＝単一プロジェクト統合**: **既存ふわふわランドのSupabaseプロジェクトに相乗り**（新プロジェクトを作らない）。新規テーブル `announcements`（＋任意で `visitors`/`stamps`）を足すのみ、**既存テーブルには触らない**。デモ投入行は `demo-` prefix のIDで印（後から消せる形）。RLS必須・`.env*` 非コミット。
- **既存を壊さない**: すわぷよ盤面・ふわふわランド表示/CMS/裏モード/バトル・既存 `/map` 以外の挙動。`unlock_hidden` は `progressStore` の既存シーム経由のみ（盤面ロジックに触らない）。
- **マップ素材**: 当面 `map_sample.jpg`。**画像と座標を分離**（本番でSVG/PNGに差替えても座標調整だけで済む形）。
- **医療広告**: ブース文面は断定・診断・予防効果表現を入れない。
- **品質ゲート（各コミット後）**: `npm run build`（`tsc -b && vite build`）green ／ `any` 型禁止 ／ lint pass ／ PixiJS/ObjectURL/listener/Realtime購読を unmount で解放しリークなし。
- **No ストレスUIの厳守**: 家族アンケートはキーボード禁止・全タップ・自動前進（§12.3-B 受け入れ条件）。

### やらないこと（デモ・スコープ外）
企業レポート／セグメント配信(narrowcast)／PDF／実出展者全件／報酬の実物／LINE認証アカウント前提の機能。これらは作らない（必要なら境界だけ）。

### 完了の定義（デモ done）
**通し**＝ 友だち追加 → ようこそ → **家族構成アンケート（子3人を実際に入力）** → （チュートリアル）→ **マップ（pan/zoom/ランドfly-to）** → **QR（画像 or デモボタン）** → **スタンプ演出** → **スタンプ帳** → **会場アナウンス受信**。これが **1オリジン・1台（アナウンスのみ2タブ）** で動き、`build` green・**既存機能の回帰なし**。

### 報告フォーマット（タスクごと）
- 完了タスクID / 触ったファイル / `build`結果 / 既存回帰チェック / 次タスク。
- 詰まったら **`⚠️ 仕様: / 障壁: / 選択肢: A/B/C`** で即報告（推測で進めない）。

## ── PROMPT（ここまで）──

---

### 補足（人間用メモ）
- この通しが1台で見えれば明日の説得力は十分。8/2本番（フィルタ全部/実出展者/レポート/リッチメニュー画像）は §10 VC-xxx を順に。
- 人間側で並行: テスト用LINE公式アカウント＋LIFF登録 / `map_sample.jpg` 配置 / 体験版QRの設置（印刷 or 画面表示）。
- Codexが詰まった時の判断材料は §12（デモ仕様）に集約済み。新しい仕様判断が要る時だけ木幡に上げる。

---

## 進捗（2026-07-01 セルフレビュー反映後）

通しの骨格（友だち追加→家族アンケート→マップ→QR→スタンプ→スタンプ帳→会場アナウンス）は実装済み。2026-07-01 のセルフレビューで「★感動の目玉」が仕様（§12.3-B/E）より薄かった点を以下の通り埋めた。詳細は `03_村コンシェルジュ設計.md` §12.6 参照。

- [x] スタンプ演出に confetti / SE（`SoundFX.refill()`流用）/ リング光 / カウンタbounce を追加
- [x] 家族プレビューをテキストからアイコン表示に変更（タップ実感を強化）
- [x] LIFF外部ブラウザの無確認自動リダイレクトを廃止し、明示ボタンに変更
- [x] オンボーディングを全ステップから1タップで離脱でき、かつ離脱が再訪時に再質問されないよう修正
- [x] 来場者向けメニュー（`/line`, `/fuwafuwa`）からスタッフ/ディスプレイ/チェックを分離し「運営用」表記に
- [x] `/map`（`BoothMapScreen`）を退役。`/map`・`/fuwafuwa/map`は`/concierge`へリダイレクト、「会場マップ」導線もすべて`/concierge`に統一
- [x] §12.3-D の本格pan/zoom地図を実装（`MapViewport.tsx`・依存追加なしの自前Pointer Events実装。1本指パン・2本指ピンチ・ホイール・ダブルタップ対応）。UIも`MapScreen.tsx`／`mapScreen.module.css`で刷新
- [ ] **残課題**: 実出展者24件（`boothMapData.ts`の`BOOTH_EXHIBITORS`）はまだマップに未反映。会場図画像上のブース番号↔出展者の対応表が無いため（木幡から受領後に反映）。現状は`demoData.ts`のサンプル1〜数件で進行。
