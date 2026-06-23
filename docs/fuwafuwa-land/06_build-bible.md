# 06 実装バイブル（Codex向け・3日Gate）

> 最終更新: 2026-06-23 / **これは実装の正**。`05_summary/04_decision-log-and-gate-plan.md`(決定)と本ファイル(実装粒度)を読めば、迷わず着手できる状態を目指す。
> スコープ厳守: 触ってよいのは **新規 `src/fuwafuwa-land/` 配下と `App.tsx` の最小分岐のみ**。既存ゲーム(`DemoScreen`等)・`.env*`・本番デプロイ・DBスキーマには触れない。`any`禁止・イミュータブル更新・1ファイル200〜400行目安。

> 🔄 **同期アーキの更新（2026-06-23・D-4上書き）**: ネット接続前提に変更。**同期は Supabase Realtime（マネージドWebSocket）を第一**とする。**正本は Supabase**（Storage=画像 / Postgres=メタ・`display_state`）、**IndexedDB はキャッシュ/復帰用**。スマホ`#/staff` → Supabase → 表示`#/display` を最初から作る（本番と同一構成＝テストになる）。単一PC/BroadcastChannel/LAN-WS自前サーバは**ローカルフォールバック**の位置づけ。依存に `@supabase/supabase-js` を追加。**本書の型/ファイル木/画像処理アルゴリズムはそのまま有効、同期・データ保存に関する記述は本注記が優先**。スキーマ・環境変数は「Codex引継ぎプロンプト(Supabase版)」に従い、`.env*`はコミットしない。
> 🎨 **素材適用（2026-06-23追記）**: ふわふわランド表示画面は既存ゲームの `public/assets/ui/village_bg.png` と `public/assets/sprites/{ghost,tooth,blob,tanuki}/idle.png` をそのまま使う。作品0件時は4キャラが待機表示として漂い、作品登録後は登録作品を優先表示する。
> 📱 **スタッフ入力（2026-06-23追記）**: staff UI は「カメラ」「画像」「描く」の3導線を独立表示する。スマホのカメラ主導線は `input type="file" accept="image/*" capture="environment"` でOS標準カメラを開く方式とし、撮影後のファイルを全体画像としてプレビュー→登録→`display_state`反映まで通す。ライブ `getUserMedia` は補助導線。
> 🗑️ **削除（2026-06-23追記）**: イベント中のスタッフ削除は `artworks.status='archived'` へのアーカイブ削除とする。`display_state.visible_artwork_ids` と `featured_artwork_id` から即除外し、Storage物理削除は運用後の管理作業に分離する。
> 🖍️ **塗り絵主導線（2026-06-23追記）**: 本番MVPは顔写真/人物写真を扱わない。主入力は **黒輪郭の下絵入りA4塗り絵台紙＋四隅マーカー**、自由描画版も同じ台紙仕様で併用する。撮影はスタッフ手持ち前提。低コスト導線は **デジタル描画の透明PNG**。背景透過はAIではなく、端からつながる近白背景だけを消すflood fillを第一にする。AI変換は本人写真ではなく作品画像加工としてGate後に別ADRで検討する。

---

## 0. 確定スタック & セットアップ

既存: Vite 8 / React 19.2 / TypeScript 5.9 / **PixiJS 8.17**(導入済) / framer-motion / howler。

**追加する依存（これだけ）**:
```bash
npm i @supabase/supabase-js idb jsqr perspective-transform
```
- `@supabase/supabase-js`(MIT): Storage(画像)＋Postgres(メタ)＋Realtime(即時反映)。**同期の第一手段＝正本**。
- `idb`(MIT): IndexedDBの薄いPromiseラッパ。**キャッシュ/オフライン復帰用**。
- `jsqr`(Apache-2.0): 台紙QRから作品ID/テンプレIDを読む。
- `perspective-transform`(MIT): 4点ホモグラフィ行列の算出（ワープに使用）。
- マーカー検出・二値化・ワープのピクセル処理は**自前実装**（本書6章にアルゴリズム明記。OpenCV.js等の重依存は入れない＝軽量）。
- デジタル塗りキャンバスは**依存なしの素のCanvas**で実装。
- 環境変数: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を `.env.local`（gitignore・**コミット禁止**）。`import.meta.env` から読む。

実行: `npm run dev` → ふわふわランド専用本番ではホーム `/`、スタッフ `/staff`、表示 `/display`、チェック `/debug` を使う。既存すわぷよ側との互換として `#/fuwafuwa/staff` / `#/fuwafuwa/display` も残す。スマホ登録 → Supabase Realtime → 表示に1〜2秒で反映。

**Supabase構築は全部CLI（ダッシュボード作業なし・Drizzleは使わない）**:
- スキーマは `supabase/migrations/*.sql`（生SQLをバージョン管理）で、`supabase migration new` → `supabase db push`。宣言的スキーマ(alpha)は使わない。
- Storageバケットは **`supabase/config.toml` の `[storage.buckets.artworks]`** で定義（SQLでバケットを作らない＝squashで消えるため）。
- DB行の型は **`supabase gen types typescript --linked --schema public > src/fuwafuwa-land/types/database.types.ts`** で生成し `createClient<Database>()` に渡す。
- 具体的なCLIコマンド列・migration SQL・config.toml・RLS/Realtime/Storageポリシーは「Codex引継ぎプロンプト(Supabase版)」§3 を正とする。`supabase/`(migrations,config.toml) はコミット、`.env*` は非コミット。
- Drizzleはブラウザで動かず（TCP接続要）このSPAでは利得ゼロ。将来 Node/エッジ層で型安全クエリを書く時にその層だけで検討。

---

## 1. ファイル構成（この通りに作る）

```txt
src/fuwafuwa-land/
  index.tsx              # FuwafuwaApp: hashで staff/display/debug を切替
  config.ts              # エンジン設定(テーマ/キャラ/表示数) ※将来B2B再利用の要
  types.ts               # 全ドメイン型
  store/
    db.ts                # idbスキーマ初期化 + persist()
    artworkStore.ts      # ArtworkRepository 実装(CRUD/採番/復旧)
    displayState.ts      # 表示状態(単一レコード)管理
    operationLog.ts      # 操作/エラーログ
  capture/
    camera.ts            # getUserMedia 起動/停止・1フレーム取得
    markerDetect.ts      # 二値化→4隅マーカー検出→順序付け
    warp.ts              # ホモグラフィ + バイリニアで矩形に展開
    qr.ts                # jsqr ラッパ
    processArtwork.ts    # 撮影→切り出し→リサイズ→Blob 一連
  digital/
    DigitalCanvas.tsx    # 依存なし塗りキャンバス(ブラシ/パレット/Undo/透過PNG出力)
  renderer/
    FuwafuwaWorld.ts     # PixiJS Application + スプライト管理
    artworkMotion.ts     # ふわふわ移動の更新関数
    sampleCharacters.ts  # 作品0件時のサンプルキャラ
  components/
    StaffPanel.tsx       # スタッフ画面(登録/一覧/表示操作)
    RegisterForm.tsx     # 撮影 or デジタル → プレビュー → 登録
    ArtworkList.tsx      # 一覧 + ID/名前ジャンプ検索
    DisplayScreen.tsx    # 表示画面(PixiJSマウント先)
    MetricsOverlay.tsx   # FPS/メモリ/件数/容量
  soak/
    soakHarness.ts       # 6時間相当ソークの自動投入
  utils/
    image.ts             # リサイズ/エンコード/ObjectURL管理
    id.ts                # 採番 ART-0001
```

`App.tsx` への最小分岐（既存ゲームを壊さない）:
```tsx
// 既存 import に追加
import { FuwafuwaApp } from "./fuwafuwa-land";

function App() {
  const isFuwafuwa = typeof window !== "undefined" && (
    window.location.hostname.includes("fuwafuwa-land") ||
    window.location.pathname === "/staff" ||
    window.location.pathname === "/display" ||
    window.location.pathname === "/debug" ||
    window.location.hash.startsWith("#/fuwafuwa")
  );
  return isFuwafuwa ? <FuwafuwaApp /> : <DemoScreen />;
}
```
`FuwafuwaApp` は `window.location.pathname` と `window.location.hash` を読み、`/ | /staff | /display | /debug` を出し分ける。旧 `#/fuwafuwa/staff | /display | /debug` は互換で残す。ルータ依存は足さない。

---

## 2. config.ts（将来B2B再利用の心臓）

エンジンを「すーすーわーわー専用」にハードコードしない。テーマ駆動にして、後で別ブランドへ横展開できる形にする。
```ts
export interface FuwafuwaConfig {
  brandId: string;                 // "suusuu-waawaa"
  background: { imageUrl?: string; color: number };
  sampleCharacters: { id: string; imageUrl: string }[]; // 作品0件時に漂わせる
  display: {
    standardCount: 12;             // 標準
    maxCount: 30;                  // 検証上限
    selectableCounts: [8, 12, 20, 30];
  };
  motion: { driftSpeed: number; bobAmplitude: number; bobPeriodMs: number; rotationJitter: number };
  capture: {
    outputLongEdge: 1280;
    jpegQuality: 0.85;
    transparencyMode: "coloring-sheet" | "edge-white" | "none";
    edgeWhite: { lumaThreshold: 235; saturationThreshold: 28; featherPx: 2 };
  };
  card: { cornerRadius: number; shadow: boolean }; // 切り出し作品の見た目(角丸カード+影)
}
export const SUUSUU_CONFIG: FuwafuwaConfig = { /* 既定値 */ };
```
> 受託時はこの object を差し替えるだけで別ブランドのふわふわランドになる、を設計意図として守る。

---

## 3. types.ts（02_table-definitions を実体化）

```ts
export type ArtworkStatus = "queued" | "visible" | "hidden" | "archived";
export type ConsentScope = "event_only" | "sns_allowed" | "unknown";
export type DisplayMode = "idle" | "random" | "featured" | "paused";
export type ArtworkSource = "photo" | "digital";

export interface Artwork {
  id: string;                 // "ART-0001"
  displayLabel: string;       // 表示番号(=id末尾 or 連番)
  givenName?: string;         // 下の名前(任意・D-3)。モニター表示可、SNS書き出し時は除外
  source: ArtworkSource;
  imageBlobKey: string;       // IndexedDB images ストアのキー
  width: number; height: number;
  status: ArtworkStatus;
  consentScope: ConsentScope; // 既定 "unknown" = 会場表示可・SNS不可
  createdAt: string; updatedAt: string;
  lastShownAt?: string;
  showCount: number;
  notes?: string;
  // 将来拡張(今は未使用・予約): votes?, score?, ownerToken?
}

export interface DisplayState {
  id: "current";
  visibleArtworkIds: string[];
  featuredArtworkId?: string;
  mode: DisplayMode;
  maxVisibleCount: number;
  updatedAt: string;
}

export type OperationType = "register" | "show" | "feature" | "hide" | "archive" | "reset" | "random" | "error";
export interface OperationLog {
  id: string; type: OperationType; artworkId?: string; message: string; createdAt: string;
}
```
**DB行の正は生成型 `types/database.types.ts`**（`supabase gen types`）。上の `types.ts` は UI用ドメイン型に限定し、DB行とは二重管理しない（UI型 ←→ DB行のマッピングは store 層で1箇所に）。画像本体は **Supabase Storage(`artworks` バケット)に保存し `image_path` を行に持つ**。表示は `getPublicUrl(image_path)`。IndexedDB には表示高速化/復帰用に Blob をキャッシュ（base64禁止）。

---

## 4. store/（リポジトリパターン・Supabase第一 / IndexedDBキャッシュ）

> 同期更新により**正本は `SupabaseArtworkRepository`**（Storage=画像 / Postgres=`artworks`・`display_state` / Realtime購読）。`idb` は**キャッシュ＆オフライン復帰**として併用（表示PCで `getImageURL` を高速化、Realtime切断時の描画継続）。下記のローカルストア記述は「キャッシュ層＋単一PCフォールバック」として読む。型 `Artwork.imageBlobKey` は、Supabase運用では Storage の `image_path` に対応（キャッシュBlobは id で保持）。

### db.ts
`idb` で DB `fuwafuwa-v1`、3ストア:
- `artworks` keyPath `id`、index `byStatus`(status)・`byName`(givenName)。
- `images` key=imageBlobKey(=id) value=Blob。
- `meta` key=string（`displayState` を `"current"` で1件、採番カウンタ等）。
起動時に **`navigator.storage.persist()`** を呼ぶ（戻り値をログ）。

### artworkStore.ts（公開API・シグネチャ固定）
```ts
export interface RegisterArtworkInput {
  source: ArtworkSource;
  imageBlob: Blob;            // 既にmarker切り出し/デジタル出力済み
  width: number; height: number;
  givenName?: string;
  consentScope: ConsentScope;
  notes?: string;
}
export interface ArtworkRepository {
  register(input: RegisterArtworkInput): Promise<Artwork>;     // 採番→images保存→artworks保存→log
  list(filter?: { status?: ArtworkStatus; query?: string }): Promise<Artwork[]>; // queryはid/givenName部分一致
  getById(id: string): Promise<Artwork | null>;
  getImageURL(id: string): Promise<string>;   // ObjectURL(キャッシュ&解放管理は utils/image)
  setStatus(id: string, status: ArtworkStatus): Promise<Artwork>; // イミュータブル更新
  markShown(ids: string[]): Promise<void>;    // lastShownAt/showCount 更新
}
```
- 採番: **DB側のsequenceで `ART-0001`**（`artworks.id default ('ART-'||lpad(nextval('artwork_seq')::text,4,'0'))`）。クライアントで連番を振らない（複数端末で衝突するため）。`register` は insert の返り値 `id` を使う。`display_label` は `generated always as (id) stored`。
- 全更新はイミュータブル（`{...artwork, ...changes, updatedAt:now}`）。
- エラーは握りつぶさず `operationLog` に `type:"error"` で残し、UIにトースト表示。
- **容量枯渇対策**: `register`内で `navigator.storage.estimate()` を見て使用率>90%なら警告ログ＋UI警告（登録は継続、古い `archived` を将来GC）。

### displayState.ts
`getDisplayState()/updateDisplayState(patch)`。表示画面は `display_state` を **Supabase Realtime で購読**（単一PC運用時のみ BroadcastChannel でも可）。スタッフ操作は `display_state` を update → 表示が購読して反映。
```ts
// 操作API(スタッフ→表示)
showArtwork(id, mode: "normal"|"featured")
hideArtwork(id)                 // visible/featured から除外、status=hidden
archiveArtwork(id)              // visible/featured から除外、status=archived（スタッフ削除）
resetDisplay()                  // visible/ featured クリア(プールは残す)
randomizeDisplay(count, includeAlreadyShown) // hidden除外, lastShownAt昇順で重み付け抽選
setMaxVisible(count)
pauseToggle()
```
ランダム重み付け（BR-007「偏り少なく」を実体化）: `hidden`を除外し、`showCount`昇順＋`lastShownAt`が古い順を優先する加重ランダムで `count` 件選ぶ。

---

## 5. capture/ — 撮影→切り出しパイプライン（C-2解消の本体）

### 台紙マーカー仕様（FL-E01の先取り・Gate検証用に印刷）
- A4縦。四隅に**黒ベタ正方形マーカー 各18mm**（周囲に白のクワイエットゾーン6mm）。
- 中央に塗り絵領域（枠は点線、内側は白 or 薄い単色）。
- 左上マーカー脇に**QR 20mm**（任意）: 文字列 `SUUWA1` 等のテンプレ識別＋連番。QRが無くても登録可。
- 照明は拡散光・俯瞰固定（グレア回避）。
- 顔写真や人物写真を台紙に貼らない。作品内の苗字・学校名・住所・電話番号はプレビューで登録前に止める。

### processArtwork.ts（オーケストレーション）
入力: HTMLCanvas/ImageBitmap（カメラ1フレーム or ファイル）。出力: `{ blob, width, height, templateId?, ok, recognition, warnings }`。
手順:
1. 入力を長辺1000pxへ縮小して作業用Canvasへ。
2. `markerDetect`で4隅マーカー中心を取得。
3. 4点が揃えば `warp`で出力矩形(既定 1024×1448, A4比)へ展開。揃わなければ `ok:false, warnings:["markers_not_found"]` を返す（UIで「再撮影／四角で登録／デジタル入力」を提示）。
4. 透過モードを適用する。
   - `coloring-sheet`: マーカー補正後、台紙枠内を対象に**端からつながる近白背景だけ**透明化。
   - `edge-white`: マーカーなし画像でも、画像端からflood fillできる近白背景だけ透明化。
   - `none`: リサイズのみ。角丸カード前提でJPEG。
5. 透明化は画像全体の白を一括削除しない。白目・歯・雲・服など作品内部の白を守るため、四辺から到達できる背景画素だけ alpha=0 にする。境界は1〜2pxフェザー。
6. 長辺1280へ縮小し `image/jpeg`(q0.85) もしくは透過時 `image/png` でBlob化。
7. `templateId` はQR(`qr.ts`)から。任意。

`recognition` は `"official" | "fallback" | "rejected"`。`official` は四隅マーカー4点検出、凸四角形、台紙面積、A4比ワープ成功、出力欠けなしを満たす場合だけ返す。`fallback` は全体画像または補正なしで登録可能な状態、`rejected` は暗すぎる/小さすぎる/処理不能/人物写真疑いなど登録を止めたい状態。

### markerDetect.ts（自前・決定的アルゴリズム）
```txt
1. グレースケール化（0.299R+0.587G+0.114B）。
2. Otsu法で閾値t算出 → 二値化(暗=マーカー候補)。
3. 画像を4隅ROI(各 幅45%×高45%、四隅にアンカー)に分割。
4. 各ROIで連結成分(8近傍, スタックflood fill)を走査し、
   面積が画像比0.3%〜8%・縦横比0.7〜1.4の暗ブロブのうち、
   その隅(画像コーナー)に最も近い重心をマーカー中心とする。
5. 4中心を TL,TR,BR,BL に順序付けして返す。1つでも欠ければ null。
```
Otsu・連結成分・順序付けは本書の擬似コードに従って実装（外部CV不要）。閾値や面積比は `markerDetect` 内の定数として明示。

### warp.ts
`perspective-transform` で src4点→dst矩形(0,0..W,H)の行列を作り、その**逆変換**(dst→src)で出力Canvasの各ピクセルをバイリニアサンプリング。出力は `config` の `outputLongEdge` 比率に合わせる。

### camera.ts / qr.ts
- `camera.ts`: `getUserMedia({video:{facingMode:"environment"}})`、`<video>`→Canvasへ`drawImage`で1フレーム取得、停止でtrack停止。**iPadは標準Safariタブで開く前提**（standalone PWA不可・D-4注記）。
- オートキャプチャ: ライブカメラ中は解析用に低頻度（目安5〜8fps）でフレームを `processArtworkCanvas` に渡す。`recognition === "official"` が連続3フレームまたは600ms以上続いたら、現在フレームを自動でプレビューへ送る。手動の [撮影してプレビュー] ボタンは常に残す。
- 自動で進めるのはプレビュー生成まで。Storage登録、`artworks` insert、`display_state` update は必ずスタッフの登録ボタンで実行する。
- 自動プレビュー生成後は解析ループを止め、二重プレビュー/二重登録を防ぐ。`撮り直す` で解析ループを再開する。
- `qr.ts`: `jsqr(imageData.data, w, h)` ラップ、無ければ undefined。

---

## 6. digital/DigitalCanvas.tsx（依存なし・フォールバック＆Gate実証）

Props: `{ width:number; height:number; onComplete:(blob:Blob, w:number, h:number)=>void }`。
- 透過背景Canvas。Pointer Events（`touch-action:none`, 非ズームviewport, listenerは`{passive:false}`）。
- ツール: 太ブラシ(丸・サイズ3段)、カラーパレット8〜12色、Undo(スナップショットを最大10、**圧縮blobで保持**, DPR上限2 ※iOS Canvasメモリ対策)、全消し。
- 「これでOK」→ `canvas.toBlob(b=>onComplete(b,w,h),"image/png")`（透過のまま）。
- バケツ塗りは実装しない（アンチエイリアスで漏れる/3日に乗らない）。ブラシのみ。

---

## 7. renderer/FuwafuwaWorld.ts（PixiJS 8）

- `await app.init({ resizeTo: parentEl, background: config.background.color, antialias:true })`。
- 作品スプライト: `getImageURL(id)`→`createImageBitmap`→`Texture.from`。角丸＋ソフト影は、生成時に1度だけ角丸マスク済みテクスチャを作る（毎フレームfilter禁止＝性能）。
- 背景: `config.background.imageUrl` があれば `public/assets/ui/village_bg.png` をPixiステージ最背面にcover配置する。CSS側も同画像を背景に指定し、WebGL初期化前も白画面にしない。
- サンプル: `config.sampleCharacters` / `sampleCharacters.ts` は既存 `public/assets/sprites/*/idle.png` を参照する。作品登録後も削除せず、世界観の住人として背面寄りに漂わせる。
- 各スプライトの状態 `{ id, sprite, x,y, vx,vy, phase }`。`artworkMotion.update(dt)` で：ゆっくり等速ドリフト＋正弦の上下(bob)＋微回転、画面端で反射、重なり過多を避ける弱い反発。速度は `config.motion`。
- モード:
  - `idle`: 作品0件→`sampleCharacters`を漂わせる。
  - `random`: `visibleArtworkIds` を表示、入替時フェード。
  - `featured`: `featuredArtworkId` を1.6〜2.0倍で中央寄り、他は減速・薄く。一定時間(既定12s)後 `random`へ。
  - `paused`: ticker停止。
- 単一 `app.ticker` で全更新。スプライト上限は `maxVisibleCount`。表示外作品は破棄しテクスチャ`destroy`（メモリ漸増防止）。
- 復旧: 表示画面マウント時に Supabase から `display_state`＋`artworks` を取得して再構築（取得失敗時は IndexedDB キャッシュから）。以後は Realtime で反映。

**性能予算(受け入れ基準)**: 12〜20体で平均**≥50fps**、30体で**≥30fps**、6時間ソークでJSヒープが線形に張り付かない。

---

## 8. components/（スタッフ画面 = 1画面完結）

- `RegisterForm`: [カメラで撮る]/[画像を選ぶ]/[デジタルで描く] → ライブカメラ解析（正式判定OKが安定したら自動プレビュー、手動撮影ボタンも併存）→ プレビュー（塗り絵台紙補正＋連結背景透過 or 四角 or デジタル透明PNG）→ 台紙認識バッジ（正式判定OK/補正なし/撮り直し推奨）→ 透過モード選択（塗り絵用紙/白背景/そのまま）→ 任意「下の名前」入力 → consent(既定 event_only) → [登録して主役表示]/[登録のみ]。マーカー失敗時は再撮影/そのまま登録/デジタルを提示。
- `ArtworkList`: 一覧（直近20件を上）＋**ID/名前ジャンプ検索**（`list({query})`、M-3）。各行 [表示][主役][非表示]。
- 表示操作バー: [全リセット][ランダム表示][一時停止]、同時表示数 8/12/20/30 切替。
- `DisplayScreen`: `FuwafuwaWorld` のマウント先（`/display`）。
- `MetricsOverlay`(`/debug` or トグル): FPS(ticker)、JSヒープ(`performance.memory`があれば)、作品数、`navigator.storage.estimate()` 使用量。**Gate中Must・本番非表示**。

---

## 9. soak/soakHarness.ts（C-3・6時間相当）

- dev専用。`generateSyntheticArtwork(i)` でランダム図形を描いたCanvas→Blob→`register`を**300件**投入。
- 10秒ごとに `randomizeDisplay(maxVisible,...)`、途中で reset/feature/hide を周期実行。
- **60分以上**連続。毎分メトリクスを配列に記録し、終了時 `downloadJSON()`。
- 合格: 停止/状態破綻なし、FPSが基準維持、ヒープが単調増加で張り付かない、`storage.estimate`が想定内。

---

## 10. 受け入れ基準（FL-G タスク別・数値で判定）

| Task | 完了条件(Done) | 数値/合格基準 |
|---|---|---|
| FL-G01 ストア | register/list/getById/getImageURL/setStatus/markShown が動作、persist()許可ログ | 300件登録後 `storage.estimate` 使用<想定、リロードで全件復元 |
| FL-G02 撮影切り出し | カメラ/ファイル→マーカー切り出し→登録 | サンプル30枚で「切り出し良好≥18／全30枚は四角 orデジタルで登録可」 |
| FL-G03 デジタル | ブラシ/パレット/Undo/透過PNG出力→登録 | iPad Safariタブで破綻なく描け、透過PNGが世界に出る |
| FL-G04 ワールド | 8〜30体・ふわふわ・random/featured/hide/reset | 12〜20体で**≥50fps**、30体で**≥30fps** |
| FL-G05 検索 | ID/名前ジャンプ＋下の名前ラベル | 100件プールで目的作品に3秒以内到達 |
| FL-G06 計測 | FPS/メモリ/件数/容量オーバーレイ | 数値がリアルタイム更新 |
| FL-G07 ソーク | 300件/60分以上/途中操作 | 停止なし・ヒープ非張り付き・FPS維持 |
| FL-G08 1人運用/視認 | 10作品連続登録＋DELL横長 | 平均**≤60秒/作品**、子どもが自作品を判別可 |
| FL-G09 判定 | レポート記入 | Go/Conditional/No-Go を `04/06`様式で記録 |

No-Go: 12体で停止／登録平均2分超／復旧不能／ソークでメモリ破綻。

---

## 11. 今後の発展を見据えた拡張点（実装時に塞がない）

- **エンジン再利用(B2B受託)**: テーマ/キャラ/背景/表示数は `config.ts` のみで差し替え可能に保つ。ブランド固有値をコンポーネントに直書きしない。
- **ランキング/発表アニメ**: `Artwork` に `votes?/score?` を予約済み。featured表示は将来の「表彰演出」に転用できるよう、登場演出を `renderer` の関数として分離。
- **イベント後スマホ育成 / すわぷよ連携**: 正本が Supabase（Storage＋Postgres）なので、作品データは最初からクラウドに残り、イベント後アプリ/ランキング/B2B横展開にそのまま使える。`ArtworkRepository` インターフェースにより単一PC(ローカル)実装も差し替え可能。
- **氏名/同意**: `givenName`はモニター可・SNS書き出し時に除外する分岐を、エクスポート関数側に1箇所で実装（散らさない）。

---

## 12. セルフレビュー結果（本書で解消・追従させる差分）

- `03_detailed-design/02_api-spec.md` の `processArtworkImage(removeWhiteBackground)` は、本書の**マーカー切り出し＋連結背景透過前提**に更新（白背景除去単独ではなく「マーカー展開＋edge flood fill」）。api-spec はインターフェース名のみ整合させ、実体は本書を正とする。
- `02_basic-design/02_table-definitions.md` に対し、本書 `types.ts` は `givenName/source/imageBlobKey/width/height` を追加（IndexedDB Blob前提）。table-definitions は注記で追従。
- 旧統合版メモ(`requirements.md`等)は参照しない（番号付き＋本書が正）。
- ID体系: タスクは `FL-G##`(Gate)/`FL-E##`(Event) に統一済（TODO.md）。
- 2台連結は不採用、**1台横長を正**（renderer は単一widescreen canvas前提）。

> 着手順は `05_summary/04` の Day1→Day3。Day1は FL-G01(ストア)→FL-G02/03(入力)。型(`types.ts`)と `config.ts` を最初に確定してから各層へ。
