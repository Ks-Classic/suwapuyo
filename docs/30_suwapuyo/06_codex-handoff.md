# 06 — Codex 投入プロンプト（すわぷよ感動デモ）

> 使い方: 下の「── PROMPT ──」ブロックをそのまま Codex に貼る。Codex はリポ直下で作業する前提。
> 言語はJP（docsに合わせ）。EN版が要れば言って。

---

## ── PROMPT（ここからコピー）──
/
あなたは「すわぷよ感動デモ」を実装するエンジニアです。2026-06-30 のYourTIME運営会議で、諏訪さんに **描く→自分の絵を相棒に選ぶ→降臨→いっしょに遊ぶ(連鎖で喜ぶ)→お口体操** の通し体験を1台で見せ、GOを取るのが目的です。

### まず読む（この順番・実装前に必ず）
1. `docs/30_suwapuyo/04_demo-detailed-design.md` ← **実装の正（全章）**。特に §3(召喚)・§4(体操)・§3.9(キャラ選択)・§6(共通基盤)・**§14(前方互換シーム＝最重要)**。
2. `docs/30_suwapuyo/05_storyboard-and-narrator-script.md` ← 演出の尺・イージング・SE・**村長/もぐぴよの実セリフ**。
3. `docs/30_suwapuyo/02_todo.md` の「🔴 最優先: すわぷよ感動デモ」セクション ← タスク **DEMO-001〜502**。これを順に消化する。
4. 既存コードのアンカー（読んでから触る）:
   - `src/components/screens/DemoScreen.tsx`（`class PuyoDemo` / `popClearable()` / `onChainChange` / `destroy()`）＝すわぷよ本体。
   - `src/fuwafuwa-land/digital/DigitalCanvas.tsx`（`onComplete(blob,w,h)`＝描画確定。透過PNG）。
   - `src/fuwafuwa-land/renderer/FuwafuwaWorld.ts` / `components/SponsorPopup.tsx`（P2の流用元）。
   - `src/App.tsx`（ルーティング） / `src/config/puyoTypes.ts` / `src/fuwafuwa-land/renderer/sampleCharacters.ts`（村キャラの母体）。
   - `public/content/01_すわぷよ/05_設定/01_キャラクター台帳.json`（世界観の正＝わーわー村長/もぐぴよ等）。
5. 参考規約: `docs/10_fuwafuwa-land/06_build-bible.md`。

### 着手順（P0から・1コミット=1機能=CR-4）
基盤 → P0 の順。P1/P2 は P0 が緑になってから。
`DEMO-001 buddyStore` → `002 progressStore` → `003 characters.ts` → `004 taisouHosts.ts` → `005 境界関数(loadCharacters/isUnlocked/track)` → `006 App path routing+/map` → `101 ふわ描画完了→setBuddy+「すわぷよで遊ぶ」CTA` → `102 CharacterSelectScreen` → `103 降臨フル` → `104 連鎖ほど喜び+SE+デバウンス` → `105 お口体操(もぐぴよ)` → `106 村長ナビ` → `107 デモ種+オフライン確認`。

### 絶対に守る制約
- **前方互換シーム（04§14）**: 差し替えは5境界関数（`getBuddy/loadCharacters/loadSponsors/isUnlocked/track`）経由。`SuwapuyoProgress` は本番形のまま（`login_days/streak/unlocked_character_ids/selected_buddy` を持つ・デモは starter のみ書く）。`characters.id` は **`display_characters.id`(`sample-*`)と一致**。`track` は **enum+meta**（新イベント名を作らない＝§6.3）。
- **1オリジンpath配信前提**: `App.tsx` の `hostname.includes("fuwafuwa-land")` 経路に乗らない。path/hashで判定。これで buddyStore(IndexedDB) が共有され同一端末召喚が動く。
- **DB変更なし**（migrationを書かない）。Supabase接続なしで全工程が成立すること（オフライン耐性）。
- **既存を壊さない**: ふわふわランド／秘密モード(わーわー5タップ)／バトル演出／FPS／作品同期、すわぷよの盤面ロジック・連鎖・SFX。**相棒は応援用の別レイヤー**で足し、盤面ロジックには触らない（フックは `popClearable`/`onChainChange` のコールバック追加のみ）。
- **品質ゲート（各タスク後）**: `npm run build`（`tsc -b && vite build`）green ／ `any` 型禁止 ／ lint pass ／ PixiJS Texture・ObjectURL・listener を `destroy()` で解放しリークなし（再mountで二重生成しない）。
- **声/カメラなし**（体操）。健康表現は断定・診断・こわい表現を避け「気づき」フレーム。
- **不明点は推測で進めない**: 04/05 に無ければ止めて報告する＝`⚠️ 仕様: / 障壁: / 選択肢: A/B/C` 形式で質問。

### やらないこと（スコープ外＝“シームだけ”用意）
解放ロジック本体／LIFF・claim_code・takehomeゲート／CMS統一（display_charactersへの移行）／出展者“監修”紹介・送客ダッシュボード。これらは 04§14 の通り**境界とデータの形だけ**用意し、中身は実装しない。隠しキャラは**ロック表示のみ**（押しても開かない）。

### 完了の定義（P0 done）
**縦貫通**＝ `/fuwafuwa/draw` で描く → `/` のキャラ選択で**自分の絵を選ぶ** → **降臨**（予兆→降下→着地→「あそぼ！」）→ ぷよを消すと相棒が**連鎖ほど大喜び＋SE** → 「体操タイム」→ **もぐぴよのお口体操**（かな＋口ピクト＋タイマー）→ カウント+1。これが **1オリジン・オフライン**で動き、`build` green・**既存機能の回帰なし**。

### 報告フォーマット（タスクごと）
- 完了タスクID / 触ったファイル / `build`結果 / 既存回帰チェック / 次タスク。
- 詰まったら上記「⚠️仕様/障壁/選択肢」で即報告。

## ── PROMPT（ここまで）──

---

### 補足（人間用メモ）
- この通しが見えれば6/30の説得力は十分。P1（村22体＋隠しシルエット・体操3部位・仕上げ）→P2（大画面/マップ）は時間に応じて。
- Codexが詰まった時の判断材料は 04（仕様）／05（演出）に集約済み。新しい仕様判断が要る時だけ木幡に上げる運用。
