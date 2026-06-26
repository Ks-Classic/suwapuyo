# 07 — タップ→スライドポップアップ 実装仕様書（Codex向け・超詳細）

> 最終更新: 2026-06-25
> 位置づけ: 槍B「もぐぴよtap→popup→送客＋計測」の**第1スライス**。本書は実装の正。`06_build-bible.md` の規約に従う。
> MVPゴール: **ディスプレイ上の「すーすー」をタップすると、紹介動画ポップアップが出る。**
> 将来（本書で“汎用化済み”に作る）: 同じ仕組みで出展者キャラ（もぐぴよ→cOral up）を登場させ、スライド＝ブース/事業説明、＋外部送客＋タップ/送客の計測。

---

## 0. スコープ

### やること（このPR）
1. 設定駆動の**タップ可能スポンサー枠**（`sponsors[]`）を追加。MVPの1件＝`suusuu`（原本=`public/content/fuwafuwa-land/characters/originals/01_すーすー.png`、表示用=`/content/fuwafuwa-land/characters/display/suusuu.png`、動画=`/content/yourtime-platform/videos/booth-introduction.mp4`）。
2. `FuwafuwaWorld` がスポンサーキャラを world に spawn し、**タップで `onSponsorTap(id)` を発火**（`onFps` と同じリスナー方式）。
3. **React ポップアップ `SponsorPopup`**：動画または画像スライドを表示し、画像複数枚の場合は**スワイプ／矢印／ドット**で切替、閉じる。任意でCTAボタン。
4. `DisplayScreen` で `onSponsorTap` を購読し、ポップアップを開閉。
5. 計測フック `track()` を**呼ぶ場所だけ用意**（中身はTODO/no-op。Supabase配線は次PR）。

### やらないこと（次PR＝槍B本体）
- Supabase `sponsors`/`events` テーブル、`/r/*` リダイレクト送客、実数計測ダッシュボード。
- 各キャラをタップした際に表示する個別コンテンツの確定（後続指示で対応）。
- 既存の秘密モード（5タップ）やバトル演出の挙動変更。**壊さないこと。**

---

## 1. 既存コードの前提（必ず踏襲する／file:line）

| 何 | 場所 | 要点 |
|---|---|---|
| レンダラ本体 | `src/fuwafuwa-land/renderer/FuwafuwaWorld.ts:76` `class FuwafuwaWorld` | PixiJS v8 `Application`。`items: Map<string, WorldItem>` で管理 |
| ticker＋FPS橋渡し | 同 `:110`〜`:113` / `onFps(listener)` `:131` | **リスナー1個を保持しtickで呼ぶ方式**。スポンサータップも同方式で増設する |
| 既存のタップ実装（流用元） | 同 `applySampleTapBehavior()` `:521`〜`:529` | `container.eventMode="static"`; `container.cursor="pointer"`; `container.on("pointertap", ...)`。**この型をそのまま踏襲** |
| マウント／破棄 | `mount()` `:98` / `destroy()` `:117` | stageに addChild。`destroy` で全 listener/Texture を解放（追加分も忘れず解放） |
| 表示画面 | `src/fuwafuwa-land/components/DisplayScreen.tsx:56`〜`65` | `new FuwafuwaWorld(SUUSUU_CONFIG)` → `mount` → `onFps(setFps)`。**ここに `onSponsorTap` 登録を足す** |
| オーバーレイ土台 | 同 `:161` `<main className="fuwafuwa-display">` / `:178` host div / `:179` `fuwafuwa-html-layer` | ポップアップはこの `main` 内に**Reactオーバーレイ**として描画（canvasの上） |
| 設定 | `src/fuwafuwa-land/config.ts` / `src/fuwafuwa-land/renderer/sampleCharacters.ts` | `sponsors` と、`public/content/fuwafuwa-land/characters/originals` 由来のデフォルトサンプルキャラを管理 |
| スタッフ表示管理 | `src/fuwafuwa-land/components/StaffPanel.tsx` / `ArtworkList.tsx` | 登録作品に加えて `sample-*` 仮想Artworkを一覧表示し、表示/非表示/削除（サンプルは表示リストから除外）を操作 |
| ルーティング | `src/fuwafuwa-land/index.tsx:104`〜`110` | `home/staff/display/debug`。表示は `DisplayScreen` |
| 型 | `src/fuwafuwa-land/types.ts` | `Artwork`/`DisplayState`/`FuwafuwaServices` 等。新型はconfigに置く |

> ⚠️ Unicode注意（既知の事故）: ファイル名 `01_すーすー.png` は NFC/NFD 差で壊れやすい。**configには使わず**、MVPのスポンサー画像は **ASCII安全な配置**にする（§4参照）。

---

## 2. データモデル（config.ts に追加）

```ts
// config.ts に追記
export interface SponsorSlide {
  src: string;          // 例 "/content/yourtime-platform/videos/booth-introduction.mp4" or "/content/shorts-studio/drafts/yourtime-popup-step-1.png"。読み込み失敗時はスキップ
  kind?: "image" | "video";
  alt?: string;
}

export interface TappableSponsor {
  id: string;                 // 例 "suusuu" / "coralup"
  name: string;               // ポップアップ見出し 例 "すーすー" / "cOral up"
  characterImg: string;       // world に出すキャラ画像（ASCIIパス推奨）
  slides: SponsorSlide[];     // 画像/動画メディア（1件以上）
  body?: string;              // 任意の説明文
  cta?: { label: string; url: string } | null;  // 任意。MVPすーすーは null
  scale?: number;             // 任意。world上の表示倍率（既定1）
}
```

`FuwafuwaConfig`（`:1`）に追加:
```ts
  sponsors: TappableSponsor[];
```

`SUUSUU_CONFIG`（`:42`）に追加（MVP・1件）:
```ts
  sponsors: [
    {
      id: "suusuu",
      name: "すーすー",
      characterImg: "/content/fuwafuwa-land/characters/display/suusuu.png",
      slides: [{ src: "/content/yourtime-platform/videos/booth-introduction.mp4", kind: "video" }],
      cta: null,
    },
  ],
```

---

## 3. レンダラ変更（FuwafuwaWorld.ts）

### 3.1 リスナー（onFps と同型）
クラス先頭フィールド（`:83` 付近）に追加:
```ts
private sponsorTapListener: ((sponsorId: string) => void) | null = null;
```
公開メソッド（`onFps` `:131` の直後）:
```ts
onSponsorTap(listener: (sponsorId: string) => void): void {
  this.sponsorTapListener = listener;
}
```

### 3.2 スポンサーキャラの spawn
- `mount()`（`:98`）末尾、背景設定後に `this.spawnSponsors()` を呼ぶ。
- 新規 private メソッド:
```ts
private async spawnSponsors(): Promise<void> {
  if (this.app === null) return;
  for (const sponsor of this.config.sponsors) {
    const texture = await this.loadTexture(sponsor.characterImg);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    const container = new Container();
    container.addChild(sprite);
    // 配置: 既存サンプルと衝突しない初期座標（例: 画面下部に横並び）
    // サイズ: char高さ ≈ screen.height * 0.18 * (sponsor.scale ?? 1) を目安にスケール
    container.eventMode = "static";
    container.cursor = "pointer";
    container.on("pointertap", () => this.sponsorTapListener?.(sponsor.id));
    this.app.stage.addChild(container);
    // items とは別の Map(sponsorItems) で保持し、tick でふわふわ＆destroyで解放
  }
}
```
- **当たり判定**: 既定の矩形(bounds)で可。**将来の本番品質**として、見た目と判定のズレを避けるなら透過PNGのalphaに沿わせる（`sprite.hitArea` をalphaから生成）＝本PRでは矩形でよいが TODO コメントを残す。
- **既存サンプルのタップ（秘密モード）と独立**させる。`applySampleTapBehavior`（`:521`）は触らない。スポンサーは別 spawn・別 listener。
- `destroy()`（`:117`）に sponsor container/texture の解放を追加。

### 3.3 ふわふわ動き
- 既存 `tick()` のサンプル揺れと同じ要領で、sponsorItems も bob（sin揺れ）させる。featured級に目立たせる必要はない（タップ誘導は §6 のCSSヒントで補う）。

---

## 4. アセット配置（原本と表示用派生）

- 正本: `public/content/fuwafuwa-land/characters/originals/`。ここにあるキャラ画像をデフォルトサンプルキャラの正とする。
- 表示用派生: `public/content/fuwafuwa-land/characters/display/`。原本を最大1024pxに縮小し、ASCIIファイル名で配置する。PixiJS/WebGLのテクスチャメモリを抑えるため、アプリ表示は原則こちらを参照する。
- 現在の派生対象: 番号付き16体 + `かむむ` / `すくすけ` / `すくまる` / `セイウッチー` / `マミュー` / `歯医者のごりさん`。重複の `suusuu.png` / `てんぴよ.png` は一覧重複を避ける。
- すーすー動画: `public/content/yourtime-platform/videos/booth-introduction.mp4`。`SponsorPopup` は動画スライドを `autoPlay muted controls playsInline` で表示する。

## 4.1 デフォルトサンプルキャラ

- `src/fuwafuwa-land/renderer/sampleCharacters.ts` の `SAMPLE_CHARACTERS` を正とする。
- 初期表示/全リセット時は `sample-*` ID を `display_state.visible_artwork_ids` に入れ、DB登録作品と同じ表示パイプラインで描画する。
- サンプルはDBの `artworks` 行ではないため、スタッフ一覧では `createSampleArtwork()` で仮想Artwork化する。
- スタッフページの表示キャラ管理には登録作品 + サンプル仮想Artworkを同じ一覧に出す。
- サンプルの「表示」は `display_state.visible_artwork_ids` に追加、「非表示」「削除」は同リストから除外する。原本画像・派生画像は削除しない。

---

## 5. React ポップアップ（新規 `components/SponsorPopup.tsx`）

### Props
```ts
interface SponsorPopupProps {
  sponsor: TappableSponsor | null;  // null で閉じる
  onClose: () => void;
}
```

### 仕様
- `sponsor === null` のとき何も描画しない。
- 背景に半透明オーバーレイ（タップで閉じる）。中央にカード。
- カード内: 見出し `sponsor.name`／メディア（`sponsor.slides`）／（任意）`body`／（`cta` があれば）CTAボタン／閉じる「×」。
- **カルーセル**:
  - 状態 `index`（0始まり）。
  - **左右スワイプ**で前後（touch: `pointerdown`→`pointermove`→`pointerup` の x差分が閾値(例48px)超で index 変更。`touch-action: pan-y` 等でスクロール干渉回避）。
  - **左右矢印ボタン**（デスクトップ／端で無効化 or ループ。MVPは端で無効）。
  - **ドットインジケータ**（スライド数ぶん。現在位置を強調）。
  - 画像/動画は `object-fit: contain`、最大高さ制限。`onError` のスライドは表示対象から除外。
  - 動画スライド表示時は video controls を優先し、スワイプハンドラを付けない。
- アクセシビリティ: `role="dialog"` `aria-modal="true"` `aria-label={sponsor.name}`。Escで閉じる。フォーカストラップは任意。
- **計測フック**（中身TODO、呼ぶ場所だけ）:
  - 開いた時 `track("popup_open", sponsor.id)`
  - スライド変更 `track("slide", sponsor.id, { index })`
  - CTA押下 `track("cta_click", sponsor.id)` → その後 `window.open(cta.url)` 等
  - `track` は新規 `src/fuwafuwa-land/lib/track.ts` に `export function track(type: string, sponsorId?: string, meta?: Record<string, unknown>): void {/* TODO: Supabase events。今はno-op or console.debug */}`

---

## 6. DisplayScreen 配線（DisplayScreen.tsx）

- state 追加: `const [activeSponsor, setActiveSponsor] = useState<TappableSponsor | null>(null);`
- mount effect（`:57`〜`:65`）で `onFps` 登録の隣に:
```ts
nextWorld.onSponsorTap((sponsorId) => {
  const sponsor = SUUSUU_CONFIG.sponsors.find((s) => s.id === sponsorId) ?? null;
  if (sponsor) { track("tap", sponsor.id); setActiveSponsor(sponsor); }
});
```
- `return (...)` の `<main className="fuwafuwa-display">` 内・MetricsOverlay の手前あたりに:
```tsx
<SponsorPopup sponsor={activeSponsor} onClose={() => setActiveSponsor(null)} />
```
- ポップアップは `fuwafuwa-html-layer`（pointer-events:none）とは**別**に、自前で `pointer-events:auto` を持つ要素として描画する。

---

## 7. CSS（styles.css に追加クラス）

`fuwafuwa-` 接頭辞で追加。既存トークン（teal `#0f766e`、ink `#17324d`、card border `rgba(125,211,252)`、radius 8px、影 `0 12px 30px rgba(15,23,42,.16)`）に揃える。

- `.fuwafuwa-sponsor-overlay`（fixed inset0・`background:rgba(16,24,40,.45)`・grid place-items center・z-index高・`pointer-events:auto`）
- `.fuwafuwa-sponsor-card`（max-width min(440px,92vw)・白・radius16・padding・影）
- `.fuwafuwa-sponsor-carousel`（position relative・画像 `width:100%;max-height:60vh;object-fit:contain`・`touch-action:pan-y`）
- `.fuwafuwa-sponsor-arrow`（左右・丸ボタン・min 44px）
- `.fuwafuwa-sponsor-dots` / `.is-active`
- `.fuwafuwa-sponsor-close`（右上×・min44px）
- `.fuwafuwa-sponsor-cta`（teal塗り・任意）
- スワイプ中の `transform: translateX()` でスライド移動（compositorフレンドリ）。`will-change:transform`。

---

## 8. 受け入れ基準（Acceptance / 手動QA）

1. `/display`（or `#/fuwafuwa/display`）で、すーすーキャラが world に浮いて表示される。カーソルが pointer。
2. すーすーをタップ/クリック→ポップアップが開き、`/content/yourtime-platform/videos/booth-introduction.mp4` が表示される。
3. 動画は `controls` で再生/停止でき、動画操作中にカルーセルのスワイプ処理が干渉しない。
4. オーバーレイ/×/Escで閉じる。再タップで再度開く。
5. スタッフページの表示キャラ管理に `public/content/fuwafuwa-land/characters/originals` 由来のサンプル全員が出る。表示/非表示/削除ボタンは小さく、一覧性を優先する。
6. **既存機能を壊さない**: 秘密モード（sample-waawaa 5タップ→わーわーモード）／バトル演出／FPS表示／作品同期 が従来通り。
7. `destroy()` 後（画面遷移）に PixiJS リスナー・Texture リークが無い（再マウントで二重生成されない）。
8. `npm run build`（`tsc -b && vite build`）green、`any` 型なし、lint pass。

---

## 9. テスト観点（04_test 体系に追記）

- 結合: tap→`onSponsorTap`発火→React state→popup描画 の縦貫通。
- 異常系: スライド画像404（onErrorスキップ）／sponsors空配列（spawnしない）／高速連打タップ（多重openしない）。
- 性能: sponsor追加で 12〜30体時のFPS基準（`05_summary/04` D-8）を維持。
- 多端末: タッチ（スワイプ）とマウス（矢印）両方。

---

## 10. 変更ファイル一覧

| 種別 | パス | 内容 |
|---|---|---|
| 編集 | `config.ts` | `SponsorSlide`/`TappableSponsor` 型・`FuwafuwaConfig.sponsors`・`SUUSUU_CONFIG.sponsors`(suusuu) |
| 編集 | `renderer/sampleCharacters.ts` | `public/content/fuwafuwa-land/characters/originals` 由来のデフォルトサンプル全員・仮想Artwork生成 |
| 編集 | `renderer/FuwafuwaWorld.ts` | `sponsorTapListener`/`onSponsorTap`/`spawnSponsors`/tick揺れ/destroy解放 |
| 新規 | `components/SponsorPopup.tsx` | カルーセルポップアップ |
| 新規 | `lib/track.ts` | `track()` no-opスタブ（TODO: Supabase events） |
| 編集 | `components/DisplayScreen.tsx` | onSponsorTap購読・state・`<SponsorPopup/>`描画 |
| 編集 | `components/StaffPanel.tsx` / `ArtworkList.tsx` | サンプル仮想Artworkを表示管理一覧へ合成、操作ボタン小型化 |
| 編集 | `store/displayState.ts` | サンプルIDの表示/非表示/削除をDB作品更新なしで扱う |
| 編集 | `styles.css` | `.fuwafuwa-sponsor-*`、一覧行・操作ボタンのコンパクト化 |
| 追加アセット | `public/content/fuwafuwa-land/characters/display/*.png`（原本から最大1024pxへ縮小した表示用派生）／`public/content/yourtime-platform/videos/booth-introduction.mp4` |

---

## 11. 設計判断メモ（なぜこう作るか＝将来の槍B本体への布石）

- **sponsors[] という汎用器**にした理由: もぐぴよ→cOral up、その後全出展者を**同じ器＋データ差し替え**で載せるため（PdM/Engレビューの収束＝coralup特例にしない）。
- **track() を最初から呼ぶ**理由: north-star＝「タップ→送客数」。計測点を後付けすると埋め込み漏れる。今はno-opでも**呼び場所を確定**しておく。
- **モニター非接触問題**（UXレビュー）: 本タップUIの主戦場は「事前展開＝スマホで触れる版」やタッチキオスク／スタッフ端末。投影モニタ単体では触れない前提で、本実装は**任意のpointer/touch面で動く**ように作る（特定デバイス非依存）。
