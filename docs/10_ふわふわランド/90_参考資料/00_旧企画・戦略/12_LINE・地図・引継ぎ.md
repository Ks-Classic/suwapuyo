# 12 LINEマップ / すわぷよ導線 引継ぎメモ

> 最終更新: 2026-06-28  
> ステータス: 実装引継ぎ v0.2（MVP実装済み）  
> 目的: Claude Code / Codex へ、LINE当日マップ・出展者カード・すわぷよ導線・ふわふわランド連携を安全に引き継ぐ。

---

## 0. 結論

全体方針は固まっている。  
`/map` のMVPは実装済み。静的データ + 境界関数の形で、本番DB/CMSへ差し替えやすい土台にしている。

次に作るべきものは、正式出展者情報・ロゴ・アンケートURLの反映。

- ランド別タブ: `フードランド` / `キッズランド` / `アダルトランド` / `デンタルランド`
- タブ内: 会場図 + 出展者一覧
- 会場図または一覧の出展者を押す
- 下から紹介カードを表示
- 紹介カードから、ブース情報・カテゴリ・一言説明・CTAを見られる
- すわぷよへの導線を常時置く

---

## 1. 今の実装状況

### 1.1 すわぷよ

入口: `/`

実装済み:

- 通常はそのままゲーム開始。
- 「キャラを選ぶ」から任意選択。
- ぷよキャラ枠は固定数で、デフォルトはランダム。
- `/staff` で登録した絵を `すわぷよにも登場` フラグで相棒として使える。
- 相棒は盤面ロジックではなく応援レイヤー。
- 体操タイム、お口体操、村長ナビのデモ導線あり。

主なファイル:

- `src/components/screens/DemoScreen.tsx`
- `src/components/screens/CharacterSelectScreen.tsx`
- `src/components/screens/TaisouInterlude.tsx`
- `src/shared/buddyStore.ts`
- `src/shared/progressStore.ts`
- `src/config/characters.ts`
- `src/config/taisouHosts.ts`

### 1.2 ふわふわランド / 管理

入口:

- `/fuwafuwa`
- `/staff`
- `/display`

方針:

- `/staff` が登録・管理の正本。
- 絵を描く、登録する、ふわふわランドに出す、すわぷよにも出す、を同じ管理導線に寄せる。
- `/fuwafuwa/draw` はデモ用ショートカット扱い。

主なファイル:

- `src/fuwafuwa-land/index.tsx`
- `src/fuwafuwa-land/components/StaffPanel.tsx`
- `src/fuwafuwa-land/components/RegisterForm.tsx`
- `src/fuwafuwa-land/components/DisplayScreen.tsx`

### 1.3 LINEマップ

入口:

- `/line`
- `/map`
- `/fuwafuwa/map`

現状:

- `App.tsx` と `src/fuwafuwa-land/index.tsx` にルートあり。
- `BoothMapScreen` でランド別タブ、簡略マップ、出展者一覧、紹介カードを表示。
- Supabase未設定でも表示できる。

主なファイル:

- `src/components/screens/LineDemoMenu.tsx`
- `src/fuwafuwa-land/components/BoothMapScreen.tsx`
- `src/fuwafuwa-land/map/boothMapData.ts`
- `src/fuwafuwa-land/styles.css`

`/line` は1台デモ用のLINE風リッチメニュー入口。すわぷよ、会場マップ、ふわふわランド、お口体操直行、スタッフ、ディスプレイへ飛べる。

---

## 2. LINEマップ詳細仕様

### 2.1 画面名

`BoothMapScreen`

### 2.2 ルート

- `/map`
- `/fuwafuwa/map`
- `#/fuwafuwa/map`

LINEリッチメニューからは `/map` を開く想定。

### 2.3 画面構成

スマホ優先。

1. 上部固定ヘッダー
   - タイトル: `会場マップ`
   - 小CTA: `すわぷよで遊ぶ` → `/`
2. ランド別タブ
   - `フード`
   - `キッズ`
   - `アダルト`
   - `デンタル`
3. 選択中ランドのマップ
   - 横長紙面をそのまま縮小しない。
   - スマホでは「会場図」と「出展者一覧」を縦に分ける。
   - 会場図は簡略化した区画ボタンでよい。
4. 出展者一覧
   - ブース番号
   - 出展者名
   - カテゴリ
   - ロゴまたは簡易アイコン
5. 紹介カード
   - 出展者を押すと bottom sheet で表示。
   - 閉じる、CTA、現在地ヒントを持つ。

### 2.4 紹介カード

表示項目:

- ブース番号
- 出展者名
- ランド名
- カテゴリ
- 一言説明
- ロゴ画像
- 体験内容
- CTA
  - `ブースを見る`
  - `アンケートへ`
  - `公式サイト` など。ただし初期は外部リンクなしでもよい。

注意:

- 医療効果を断定しない。
- 「治る」「診断」「予防効果」などの表現は避ける。
- 出展者紹介は「健康ハンドブック」の文脈にする。

### 2.5 ランド別データ

初期は静的データでよい。DB migration はしない。

推奨ファイル:

- `src/fuwafuwa-land/map/boothMapData.ts`

型:

```ts
export type MapLandId = "food" | "kids" | "adult" | "dental";

export interface BoothMapLand {
  id: MapLandId;
  label: string;
  themeColor: string;
  boothIds: string[];
}

export interface BoothExhibitor {
  id: string;
  boothNo: string;
  landId: MapLandId;
  name: string;
  category: string;
  summary: string;
  activity: string;
  logoUrl?: string;
  mapX: number;
  mapY: number;
  ctaUrl?: string;
}
```

`mapX` / `mapY` は 0〜100 のパーセント座標。紙面画像に依存しない簡略マップに使う。

### 2.6 マップの見せ方

紙のサンプルは横長でスマホに不向き。スマホでは次の構成にする。

- 上: ランドタブ
- 中: 簡略マップ
  - 会場の大枠
  - ブース番号ボタン
  - 選択中ブースを強調
- 下: 出展者一覧
  - 50音や番号ではなく、ブース番号順
  - タップで紹介カード

紙面画像をそのまま全画面表示するのは避ける。必要なら「紙マップを見る」ボタンで別表示にする。

---

## 3. 本番移行しやすい境界

実装は静的データから始めるが、将来 Supabase / CMS に差し替える前提で境界関数を置く。

推奨:

- `loadMapLands(): Promise<BoothMapLand[]>`
- `loadBoothExhibitors(): Promise<BoothExhibitor[]>`
- `trackMapEvent(event, exhibitorId, meta)`

初期実装では、静的配列を返すだけでよい。

イベント名は既存の typed `track` に合わせ、新イベント名を増やしすぎない。

---

## 4. 導線設計

### 4.1 LINEリッチメニュー

6枠想定:

1. すわぷよで遊ぶ → `/`
2. 会場マップ → `/map`
3. 出展者一覧 / 健康ハンドブック → `/map`
4. アンケート → 後続
5. YourTIME情報 → 後続
6. はじめての方へ → 後続

### 4.2 `/map` からの導線

常時表示:

- `すわぷよで遊ぶ`
- `ふわふわランドを見る`
- `アンケート`

初期は最低限 `すわぷよで遊ぶ` だけでよい。

### 4.3 `/staff` からの導線

既にヘッダーに `すわぷよ` 導線あり。  
追加で必要なら、登録完了後に `すわぷよで遊ぶ` CTA を目立たせる。

---

## 5. Claude Code 投入プロンプト

以下をそのまま Claude Code に渡せる。

```md
あなたは `suwapuyo` リポで、LINE当日マップのスマホ画面を実装するエンジニアです。

目的:
LINEリッチメニューから `/map` を開くと、来場者がランド別に場所と出展者情報を簡単に確認でき、必要に応じて `/` のすわぷよへ移動できるようにする。

まず読む:
1. `docs/10_ふわふわランド/90_参考資料/00_旧企画・戦略/11_全体設計・導線.md`
2. `docs/10_ふわふわランド/90_参考資料/00_旧企画・戦略/12_LINE・地図・引継ぎ.md`
3. `docs/10_ふわふわランド/90_参考資料/00_旧企画・戦略/09_LINE村案内.md`
4. `docs/10_ふわふわランド/90_参考資料/07_スポンサータップ表示仕様.md`
5. `src/App.tsx`
6. `src/fuwafuwa-land/index.tsx`
7. `src/fuwafuwa-land/styles.css`

実装する:
1. `src/fuwafuwa-land/map/boothMapData.ts`
   - `food` / `kids` / `adult` / `dental` の4ランド
   - 静的データでよい
   - DB migration は書かない
2. `src/fuwafuwa-land/components/BoothMapScreen.tsx`
   - ランド別タブ
   - 簡略マップ
   - ブース番号ボタン
   - 出展者一覧
   - タップで bottom sheet 紹介カード
   - `/` への `すわぷよで遊ぶ` CTA
3. `src/fuwafuwa-land/index.tsx`
   - route `map` で `BoothMapScreen` を表示
4. `src/fuwafuwa-land/styles.css`
   - 既存 `fuwafuwa-` 接頭辞でCSS追加
   - スマホ優先

制約:
- `.env*` は触らない。
- DB migration は書かない。
- 新しい依存パッケージは入れない。
- `any` 型禁止。
- 既存の `/`, `/staff`, `/display`, `/fuwafuwa` を壊さない。
- 紙マップ画像をそのままスマホ全面に縮小表示しない。ランド別タブ + 簡略マップ + 一覧 + 紹介カードに分解する。
- 医療効果を断定しない。

完了条件:
- `/map` でランド別タブが動く。
- ブース番号または出展者一覧を押すと紹介カードが出る。
- 紹介カードを閉じられる。
- `/` のすわぷよへ移動できる。
- `npm run build` green。
- `npm run lint` green、または既存warningのみ。

報告:
- 触ったファイル
- build結果
- lint結果
- 既存導線の回帰チェック
```

---

## 6. 未決事項

以下は実装前に決めなくても、仮データで進められる。

- 出展者の正式ロゴ画像URL
- 紹介文の正式監修
- CTAの外部リンク
- アンケートURL
- LINEリッチメニューの本番URL

以下は推測実装禁止。

- 個人情報を扱うアンケートDB
- LINE userId と回答の名寄せ
- 本番Supabaseスキーマ追加
- 出展者別レポートの集計仕様

---

## 7. QA観点

- iPhone幅 390px でタブ、マップ、一覧、カードが読める。
- 紙マップ画像を見なくても、ブース番号と出展者名が追える。
- ランド切替後、選択中ブースが前ランドから残らない。
- bottom sheet が画面外にはみ出さない。
- スクロール中にカードが誤タップで暴れない。
- `/map` → `/` → `キャラを選ぶ` → `この4枠で遊ぶ` が白画面にならない。
- `/staff` と `/display` の既存導線が残っている。
