# Codex修正依頼 01: 背景画像の復元 + キャラ4枠選択の配線修正

> 起票: 2026-07-11（Claude Codeレビュー）
> 対象: フェーズ1実装（`src/app/MvpApp.tsx`一式、Codex実装分）
> ステータス: 対応済み（2026-07-11）

## 不具合1: 村の背景イラストが表示されていない

**原因**: `src/app/mvp.module.css` の1行目
```css
:global(body) { background: #f4ead6; color: #24352f; ... }
```
が、`src/styles/index.css` の既存body定義（村の背景画像 `village-bg.png` を `background: url(...) center/cover no-repeat fixed` で敷いている）を単色ベタ塗りで上書きしている。各画面クラス（`.homeScreen`, `.welcomeScreen`, `.authScreen`, `.contentScreen` 等）も同様に単色・グラデーションで塗りつぶしており、村のイラストがどこにも見えない。

**仕様根拠**: `02_体験設計/01_体験コンセプト.md`「残すもの: 青空、緑、木、家、村の遠景」、`02_体験設計/03_UIUX設計原則.md` の画面構造「背景層: 空・村・季節・遠景（edge-to-edge）」。

**既存の正しい参考実装**: `src/concierge/concierge.module.css` が既に正しくやっている。
```css
background: url("/content/01_すわぷよ/03_背景/01_村_昼.png") center top / cover no-repeat fixed;
```
カード類は `rgba(255,255,255,0.78)` 等の半透明で村を透かして重ねている。

**使える背景アセット**（`public/content/fuwafuwa-land/backgrounds/`、既にgit管理下・push済み）:
`village-bg.png`（既定）, `village-day.png`, `village-morning.png`, `village-dusk.png`, `village-night.png`, `village-cloudy.png`, `village-rain.png`, `village-snow.png`

**修正方針**:
1. `mvp.module.css` の `:global(body)` から `background: #f4ead6` を削除し、`index.css` のbody背景（村イラスト）をそのまま効かせる。
2. `.homeScreen`, `.welcomeScreen`, `.authScreen`, `.contentScreen`, `.storyScreen`, `.arrivalScreen`, `.exerciseScreen`, `.completeScreen` 等の単色/グラデーション背景を、`concierge.module.css` と同じ半透明カード方式に置き換える（村が透けて見えるように）。
3. `.gameRoute`（`#132b31` の濃紺）はゲーム没入用の意図的な配色の可能性があるため、変更前に確認すること。

## 不具合2: キャラ選択（4枠）がゲームに反映されない

**原因**: ゲーム本体 `src/components/screens/DemoScreen.tsx`（1536〜1538行）は、ぷよの4種類の見た目を `progressStore.ts` の `selected_puyo_character_ids`（4枠: ghost/tooth/blob/tanuki、`localStorage`キー`suwapuyo_progress`）から読んでいる。これは初回に `randomPuyoCharacterIds()` でランダム割当されるだけで、以後変更する手段がない。

新しく作られた `/characters` 画面（`src/village/CharacterCatalog.tsx`）は、別の保存領域 `localMvpRepository.ts` の `selectedCharacterId`（単一の「相棒」1体、`localStorage`キー`suwapuyo_mvp_state_v1`）にしか書き込んでおらず、`selected_puyo_character_ids` とは繋がっていない。結果、プレイヤーが `/characters` で選んでも、ゲーム内のぷよの見た目は変わらない。

**既存の正しい実装**: `src/components/screens/CharacterSelectScreen.tsx` が、この4枠システムの完全な実装（枠ごとの選択・ロック演出・おまかせランダム・自分の絵を使う機能まで持つ）として既に存在する。

**確定した修正方針（案A）**: `/characters` ルートで新規`CharacterCatalog`の代わりに既存`CharacterSelectScreen`をそのまま呼ぶ。4枠UI（枠ごとの選択・ロック演出・おまかせランダム・自分の絵を使う機能）がそのまま復活する。

- `MvpApp.tsx` の `/characters` パス分岐で `CharacterCatalog` の代わりに `CharacterSelectScreen` を使う。`onSelect`/`onCancel` propsは既存シグネチャに合わせて配線する。
- 新規`CharacterCatalog.tsx`・`village/CharacterCatalog.tsx`は、他で参照されなくなれば削除してよい（未使用コードを残さない）。
- 決定-005（全キャラの姿・名前を常時表示、隠しキャラ廃止）と`CharacterSelectScreen`のロック演出（`lockedPopup`）が矛盾しないか確認すること。矛盾する場合はロック演出側を「まだ村に来ていません」という表示に寄せる（威嚇的な「ひみつ」演出を弱める）。

## 完了条件

- `/app`（またはデフォルトルート）の全画面で村の背景イラストが半透明カード越しに見える。
- `/characters` で選んだ内容が `/play` のぷよ見た目に反映される。
- `npm run build` と `npm test` が成功する。
- 変更前後のスクリーンショット（375×667）を `docs/70_すわぷよ・ユアタイム統合仕様/05_テスト/evidence/` に追加する。
