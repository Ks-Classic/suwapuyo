# すわぷよ（SuwaPuyo）— 詳細仕様書 v2.0

> **目的**: オリジナルキャラクターを使ったぷよぷよ風パズルゲーム  
> **到達品質**: 世界一のエンジニア/UIUX デザイナー/PDM 100人が触って感動するレベル  
> **第一目標**: Vercel でデプロイし、URL1つでスマホでもPCでもプレイできるデモを共有  
> **最終目標**: iOS / Android ネイティブアプリ化（要相談）

---

## 1. プロジェクト概要

| 項目 | 値 |
|---|---|
| プロジェクト名 | すわぷよ（SuwaPuyo） |
| GitHub リポジトリ | [Ks-Classic/suwapuyo](https://github.com/Ks-Classic/suwapuyo) |
| 本番URL | https://suwapuyo.vercel.app（Vercel自動デプロイ） |
| ローカルパス | `/home/ykoha/projects/suwapuyo` |
| 言語 | TypeScript（strict mode） |
| フレームワーク | React 18 + Vite 6 |
| ゲーム描画 | PixiJS 8（WebGL2 / WebGPU フォールバック） |
| 音声 | **Web Audio API**（プログラム生成、外部ファイル不要） |
| スタイリング | Vanilla CSS（CSS Modules） |
| フォント | M PLUS Rounded 1c / Zen Maru Gothic（Google Fonts） |
| デプロイ | Vercel（`git push` → 自動デプロイ） |
| 対応端末 | PC + スマホ（全サイズ自動スケーリング） |
| ライセンス | パブリック |

---

## 2. キャラクター（ぷよタイプ）定義

ゲーム内のぷよは従来の「色」ではなく、4体のオリジナルキャラクターで表現する。

### 2.1 キャラクター一覧

| ID | 表示名 | 見た目 | テーマカラー | スプライトパス |
|---|---|---|---|---|
| `ghost` | **わのの** | 原子マーク付きゴースト | `#C8E6F0`（アイスブルー） | `/assets/sprites/ghost/idle.png` |
| `tooth` | **わーわー** | 笑っている歯のキャラ | `#FFF5E0`（クリーム） | `/assets/sprites/tooth/idle.png` |
| `blob` | **すーすー** | おしゃぶりしたゴースト | `#E8E8F0`（ラベンダーグレー） | `/assets/sprites/blob/idle.png` |
| `tanuki` | **たぬぺい** | ネクタイ着用のタヌキ | `#B08860`（タン） | `/assets/sprites/tanuki/idle.png` |

### 2.2 キャラクター別ゲーム設定

| パラメータ | `ghost`（わのの） | `tooth`（わーわー） | `blob`（すーすー） | `tanuki`（たぬぺい） |
|---|---|---|---|---|
| 消滅に必要な連結数（`minPop`） | 4 | 4 | 3 | 5 |
| 消滅時 SE | 通常ポップ音 | 通常ポップ音 | 通常ポップ音 | **チャリーン！💰**（レジ音） |
| 消滅パーティクル | テーマカラー粒子 | テーマカラー粒子 | テーマカラー粒子 | **💰💵🪙 絵文字 + "+$$$" テキスト** |
| 待機アニメーション | ゆらゆら浮遊 | ゆらゆら浮遊 | ゆらゆら浮遊 | ゆらゆら浮遊 |

> [!IMPORTANT]
> `minPop` の値は仮設定。ゲームバランスを見ながら調整可能にする（設定画面から変更可能）。
> **たぬぺい専用**: 消滅時にレジ音（CHA-CHING!）と💰💵🪙の絵文字パーティクルが発生。

---

## 3. ゲームメカニクス詳細

### 3.1 現在のゲームモード: スワップ式

> [!NOTE]
> MVP では **落下式ではなくスワップ式** を採用。盤面に初期配置されたぷよを **タップ→矢印で隣と入れ替え** して消す。

```
操作フロー:
1. ぷよをタップして選択（オレンジ色の枠で強調）
2. 四方の矢印ボタンが表示される
3. 矢印をタップすると、隣のぷよと入れ替え
4. つながったら消える → 重力 → 連鎖チェック → 補充
5. つながらなければ元に戻る（swap back）
```

### 3.2 ボード仕様

| パラメータ | 値 | 備考 |
|---|---|---|
| 列数 | 6 | |
| 行数 | 10 | 全て表示 |
| セルサイズ | 56 px | 内部解像度 |
| セル間隔 | 2 px | |
| ボードパディング | 12 px | |
| ボード描画サイズ | 370 × 602 px | BOARD_PAD含む |

### 3.3 操作方式

#### スマホ（タッチ） ← メイン

| 操作 | アクション |
|---|---|
| ぷよをタップ | 選択（オレンジ枠 + スケール1.1x） |
| 選択済みぷよを再タップ | 選択解除 |
| 矢印ボタンをタップ | 隣のぷよと入れ替え |
| 隣のぷよを直接タップ | 隣のぷよと入れ替え |
| 離れたぷよをタップ | 選択切り替え |

#### PC（マウス）

マウスクリックで同じ操作が可能。

### 3.4 消滅判定アルゴリズム

```typescript
// BFS で同タイプの隣接ぷよを探索
function findGroup(board, startRow, startCol, type, visited): Cell[] {
  const queue = [{row: startRow, col: startCol}];
  const group = [];
  while (queue.length > 0) {
    const {row, col} = queue.shift();
    // 上下左右の隣接セルが同じタイプなら追加
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nr = row + dr, nc = col + dc;
      if (inBounds(nr, nc) && !visited(nr, nc) && board[nr][nc] === type) {
        queue.push({row: nr, col: nc});
        group.push({row: nr, col: nc});
      }
    }
  }
  return group;
}

// タイプごとに minPop が異なる
function findAllClearable(board): ClearableGroup[] {
  const groups = findAllGroups(board); // BFS
  return groups.filter(g => g.cells.length >= MIN_POP[g.type]);
}
```

> [!IMPORTANT]
> **タイプごとに `minPop` が異なる**のがこのゲーム最大の特徴。  
> 例: `blob`（すーすー）は3個で消えるが、`tanuki`（たぬぺい）は5個必要。

### 3.5 スワップ後の処理フロー

```
1. ぷよ選択 → 矢印タップ → スワップアニメーション
   ↓
2. 盤面データを入れ替え
   ↓
3. 連結グループ探索（BFS）
   ├─ マッチあり → 4へ
   └─ マッチなし → swap back（元に戻す）+ noMatch SE
   ↓
4. 消滅アニメーション（フラッシュ → ポップ → パーティクル）
   - たぬぺい: チャリーン！💰音 + 金貨パーティクル
   - その他: 通常ポップ音 + テーマカラーパーティクル
   ↓
5. 「X れんさ！」テキスト表示
   ↓
6. 重力適用（浮いているぷよを落とす）+ 着地バウンス
   ↓
7. 再度連結チェック → マッチあれば 4 に戻る（連鎖+1）
   ↓
8. 空きマスに新しいぷよを補充（上から落下アニメーション）
   ↓
9. 補充後にも連鎖チェック（自動連鎖）
```

### 3.6 スコア計算

```
スコア = 消滅ぷよ数 × 10 × (連鎖数 > 1 ? 連鎖数 × 4 : 1)
```

---

## 4. ビジュアルテーマ

### 4.1 世界観: Oral Village（村）テーマ

ゲーム全体のビジュアルは「**カワイイ村**」風。明るく温かみのあるデザイン。

| 要素 | 詳細 |
|---|---|
| 背景 | 村の風景画像（木、芝生、家、青空、雲） |
| ボード背景 | クリーム色（`#FFF8E7`）、半透明、角丸20px |
| セル | ライトグリーン（`#E8F5E0`）、角丸10px |
| 選択枠 | オレンジ（`#F5A623`）、パルスアニメーション |
| 矢印ボタン | オレンジ円（`#F5A623`）＋白三角 |
| テキスト | 茶色系（`#4A3728`）、丸ゴシック体 |
| カード/UI | 白半透明（`rgba(255,255,255,0.8)`）+ backdrop-blur |

### 4.2 カラーパレット

```css
/* 空・自然 */
--color-sky-top: #87CEEB;
--color-sky-bottom: #C5E8F7;
--color-grass-dark: #5DAE3E;
--color-grass-light: #8BD46E;

/* UI */
--color-bg-card: rgba(255, 255, 255, 0.85);
--color-board-bg: #FFF8E7 (92%);
--color-board-cell: #E8F5E0 (70%);
--color-accent: #F5A623; /* オレンジ */

/* テキスト */
--color-text-primary: #4A3728; /* 焦げ茶 */
--color-text-secondary: #7A634E;
```

### 4.3 フォント

- **M PLUS Rounded 1c**: メインUI・ゲームテキスト（丸ゴシック）
- **Zen Maru Gothic**: フォールバック
- ウェイト: 400, 700, 800, 900

---

## 5. アニメーション仕様

### 5.1 ぷよアニメーション

| アニメーション | トリガー | 時間 | 詳細 |
|---|---|---|---|
| **アイドル** | 常時 | ∞ ループ | Y軸 ±2px 浮遊 + 微回転（±3°） |
| **選択** | タップ時 | 150ms | scale: 1→1.1、オレンジ枠パルス |
| **スワップ** | 矢印タップ | 200ms | 2つのぷよが位置を交換 |
| **消滅フラッシュ** | 消滅判定 | 120ms×3 | 白→テーマカラー→白 のフラッシュ |
| **消滅ポップ** | フラッシュ後 | 250ms | scale: 1.3→0 + alpha: 1→0 |
| **着地バウンス** | 重力落下後 | 300ms | scaleY: 0.8→1.1→1.0 のバウンス |
| **補充** | 空きマスに | 350ms | 上からドロップ + バウンス |

### 5.2 たぬぺい専用エフェクト

| エフェクト | 詳細 |
|---|---|
| **💰 絵文字パーティクル** | 12個の 💰🪙💵💲 絵文字が放射状に飛散 |
| **"+$$$" テキスト** | 金色テキストが消滅位置から上方向にフロート |
| **チャリーン！SE** | 4層構成: ①金属ヒット、②ベルリング、③コインカスケード、④レジドロワー音 |

### 5.3 連鎖エフェクト

| エフェクト | トリガー | 詳細 |
|---|---|---|
| **「X れんさ！」テキスト** | 連鎖発生 | 盤面中央に大きく表示。白文字＋オレンジ縁取り＋ドロップシャドウ |
| **連鎖SE** | 2連鎖以上 | アルペジオ音（連鎖数に応じてノート数増加） |

---

## 6. 音声仕様（Web Audio API プログラム生成）

> [!NOTE]
> 外部音声ファイルは不要。全SEは `SoundFX` クラスで Web Audio API を使ってリアルタイム生成。

### 6.1 SE一覧

| SE メソッド | タイミング | 説明 |
|---|---|---|
| `select()` | ぷよ選択 | 高音の短いブリップ（660→990Hz） |
| `deselect()` | 選択解除 | 下降ブリップ（660→440Hz） |
| `swap()` | スワップ実行 | シュー音（300→800→500Hz） |
| `pop(chain)` | 通常ぷよ消滅 | バブリーポップ音（連鎖数でピッチ上昇） |
| `coin()` | **たぬぺい消滅** | **チャリーン！** 4層構成のレジ音 |
| `chain(n)` | 2連鎖以上 | アルペジオ（C Major、連鎖数分のノート） |
| `noMatch()` | スワップ失敗 | 2音の下降ビープ |
| `land()` | 重力着地 | 低音の三角波（160→50Hz） |
| `refill()` | ぷよ補充 | キラキラ音（高音4連続） |

### 6.2 coin() の音声構造

```
Layer 1: CHA - square波 1800→800Hz (0.08s)
Layer 2: CHING! - sine波 C7,E7,G7,C8 和音 (0.8s 余韻)
Layer 3: コインカスケード - 5連続高音 (各0.12s)
Layer 4: レジドロワー - triangle波 200→80Hz (0.2s)
```

---

## 7. レスポンシブ対応

### 7.1 スマホ全画面フィット

全て**スクロールなし**で1画面に収まるように設計。

| 仕組み | 詳細 |
|---|---|
| ビューポート | `height: 100dvh`（Dynamic Viewport Height） |
| レイアウト | Flexbox column、ボードが `flex: 1` で残りスペースを使用 |
| キャンバススケーリング | `ResizeObserver` + CSS `transform: scale()` で自動縮小 |
| Safe Area | `env(safe-area-inset-*)` でiPhoneノッチ/ホームバー対応 |
| overflow | `hidden`（スクロール完全防止） |

### 7.2 端末別スケール目安

| 端末 | 解像度 | ボードスケール |
|---|---|---|
| iPhone SE | 375×667 | ~72% |
| iPhone 14 | 390×844 | ~85% |
| iPhone 14 Pro Max | 430×932 | ~95% |
| Android (360×800) | 360×800 | ~80% |
| PC | 1920×1080 | 100%（最大） |

### 7.3 レスポンシブUI段階

| 条件 | 調整 |
|---|---|
| `min-height: 750px` | フォント・アイコン少し大きく |
| `min-height: 900px` | ヘッダー・カードのパディング増加、フォント更に大きく |

---

## 8. 技術アーキテクチャ

### 8.1 実際のディレクトリ構造

```
suwapuyo/
├── public/
│   ├── assets/
│   │   ├── sprites/          # キャラクタースプライト（PNG）
│   │   │   ├── ghost/idle.png
│   │   │   ├── tooth/idle.png
│   │   │   ├── blob/idle.png
│   │   │   └── tanuki/idle.png
│   │   └── ui/
│   │       └── village_bg.png  # 村背景画像
│   └── favicon.png
├── src/
│   ├── main.tsx              # エントリーポイント
│   ├── App.tsx               # ルートコンポーネント
│   ├── config/
│   │   ├── constants.ts      # ゲーム定数
│   │   ├── puyoTypes.ts      # キャラクター設定（名前、色、minPop、スプライト）
│   │   └── controls.ts       # キーバインド設定
│   ├── types/
│   │   ├── game.ts           # ゲーム状態の型定義
│   │   ├── puyo.ts           # ぷよ関連の型
│   │   └── audio.ts          # 音声関連の型
│   ├── audio/
│   │   └── SoundFX.ts        # ★ Web Audio API 音声生成（select/swap/pop/coin等）
│   ├── components/
│   │   └── screens/
│   │       └── DemoScreen.tsx # ★ メインゲーム画面（PixiJS描画+ゲームロジック統合）
│   └── styles/
│       ├── index.css         # グローバルスタイル + CSS変数 + 村テーマ
│       └── demo.module.css   # DemoScreen用CSS Modules
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── vercel.json               # Vercel設定（SPA リライト）
├── SPEC.md                   # ← この仕様書
├── TODO.md                   # 実装TODO
└── .gitignore
```

### 8.2 現在のアーキテクチャ（MVP）

```
┌────────────────────────────────────────────────┐
│            DemoScreen.tsx（統合）                │
│  - React コンポーネント（UI: ヘッダー/スコア等）│
│  - PuyoDemo クラス（PixiJS描画 + ゲームロジック）│
│  - 自動キャンバススケーリング（ResizeObserver）  │
├────────────────────────────────────────────────┤
│                SoundFX.ts                       │
│  - Web Audio API によるプログラム音声生成        │
│  - select/deselect/swap/pop/coin/chain等        │
├────────────────────────────────────────────────┤
│              puyoTypes.ts                       │
│  - キャラクター定義（名前、色、minPop、パス）   │
│  - THEME_COLORS / CHAR_NAMES / MIN_POP 等      │
└────────────────────────────────────────────────┘
```

> [!NOTE]
> MVP ではゲームロジックと描画が `DemoScreen.tsx` に統合されている。  
> 将来的には `engine/` と `renderer/` に分離予定（TODO参照）。

---

## 9. デプロイ

| 項目 | 値 |
|---|---|
| ホスティング | Vercel |
| GitHubリポ | [Ks-Classic/suwapuyo](https://github.com/Ks-Classic/suwapuyo) |
| ブランチ | `main` |
| デプロイ方式 | `git push` → Vercel自動ビルド＆デプロイ |
| ビルドコマンド | `tsc -b && vite build` |
| 出力ディレクトリ | `dist/` |

---

## 10. 実装状況

### 10.1 ✅ 実装済み（MVP v2.0）

- [x] 4キャラのスプライトがPixiJS Canvasで描画される
- [x] スワップ操作（タップ選択 → 矢印 or 隣接タップで入れ替え）
- [x] タイプ別消滅数（minPop: ghost=4, tooth=4, blob=3, tanuki=5）
- [x] BFS連結探索 + 消滅判定
- [x] 連鎖処理（消滅 → 重力 → 再判定ループ）
- [x] 自動連鎖（補充後の連鎖チェック）
- [x] 消滅アニメーション（3段フラッシュ + スケールポップ + パーティクル）
- [x] 着地バウンスアニメーション
- [x] 補充アニメーション（上からドロップ + バウンス）
- [x] アイドルアニメーション（浮遊 + 微回転）
- [x] スコア / 連鎖数リアルタイム表示
- [x] Web Audio API 音声（select/deselect/swap/pop/chain/noMatch/land/refill）
- [x] **たぬぺい専用チャリーン！音 + 💰絵文字パーティクル**
- [x] カワイイ村テーマ（村背景画像 + クリームボード + 丸ゴシック）
- [x] 全スマホ対応（100dvh + CSS transform auto-scale）
- [x] Safe Area対応（iPhone ノッチ/ホームバー）
- [x] Vercel自動デプロイ（git push → 本番反映）
- [x] キャラクター情報パネル（名前 + 消滅数）
- [x] クリック位置ズレ修正（メタデータベースの座標取得）

### 10.2 📋 未実装（将来対応）

- [ ] 落下式ゲームモード（ぷよペア操作）
- [ ] タイトル画面 / リザルト画面
- [ ] 設定画面（音量、消滅数調整）
- [ ] キャラ別消滅SE（連鎖数に応じた段階SE）
- [ ] BGM
- [ ] ゲームオーバー判定
- [ ] レベルアップ
- [ ] キーボード操作
- [ ] ゴーストピース
- [ ] engine/ renderer/ への分離リファクタ

### 10.3 🔮 将来拡張（スコープ外）

- [ ] CPU対戦 AI
- [ ] オンライン対戦（WebSocket）
- [ ] おじゃまぷよ
- [ ] 特殊ぷよ（全消し等）
- [ ] リプレイ機能
- [ ] オンラインランキング
- [ ] iOS / Android アプリ化（Capacitor or React Native）

---

## 付録A: キャラクター原画パス

| キャラ | 表示名 | 原画絶対パス |
|---|---|---|
| ghost | わのの | `/home/ykoha/.gemini/antigravity/brain/c7b01e74-6332-47eb-8be2-1f6d74674a80/media__1774074129315.png` |
| tooth | わーわー | `/home/ykoha/.gemini/antigravity/brain/c7b01e74-6332-47eb-8be2-1f6d74674a80/media__1774074129581.png` |
| blob | すーすー | `/home/ykoha/.gemini/antigravity/brain/c7b01e74-6332-47eb-8be2-1f6d74674a80/media__1774074129813.png` |
| tanuki | たぬぺい | `/home/ykoha/.gemini/antigravity/brain/c7b01e74-6332-47eb-8be2-1f6d74674a80/media__1774074129844.png` |

## 付録B: SoundFX メソッド一覧

| メソッド | 波形 | 周波数帯 | 持続時間 |
|---|---|---|---|
| `select()` | sine | 660→990Hz | 0.12s |
| `deselect()` | sine | 660→440Hz | 0.1s |
| `swap()` | sine | 300→800→500Hz | 0.2s |
| `pop(chain)` | sine+triangle ×3 | 440Hz×1.12^chain | 0.25s |
| `coin()` | square+sine ×10 | 1800→80Hz (多層) | 0.8s |
| `chain(n)` | sine ×n | C major scale | 0.2s×n |
| `noMatch()` | square ×2 | 280→170Hz | 0.15s |
| `land()` | triangle | 160→50Hz | 0.15s |
| `refill()` | sine ×4 | 1200-2000Hz | 0.12s |
