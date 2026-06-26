# リポジトリ構造マップ（どこに何があるか）

このリポは **4つの関心事** が同居している。混乱を避けるため、ここを一次の地図とする。

| 関心事 | これは何か | 場所 |
|---|---|---|
| **① 世界観IP** | ふわふわランドのキャラ・背景・声・正本 | `public/content/fuwafuwa-land/` |
| **② すわぷよ（ゲーム）** | パズルゲーム本体 | `src/`（engine / input / renderer / components …） |
| **③ ふわふわランド体験** | capture / digital / soak などの体験UI | `src/fuwafuwa-land/` |
| **④ 動画スタジオ** | ショート動画の生成エンジン（Python） | `shorts/` |

アプリ（②③④のUIモック）は**単一のViteアプリ**（`src/main.tsx`）。`public/` はそのまま配信される静的領域。

## ① 世界観IP — `public/content/fuwafuwa-land/`
すべての土台。アプリも動画スタジオもここを読む。**動かさない**。
```
characters/
  originals/        # 生の立ち絵（番号＋和名）
  display/          # 配信用の整え済み（英名）← bible/アプリ/動画が参照
backgrounds/        # シーン背景10種（village-day/night/rain/room/seaside…）※動画の背景はここが正本
audio/              # 効果音・声
sprites/            # アプリ表示用スプライト
character-bible.json # ★キャラ正本（声pitch/性格/画像）。render.py が読む。アプリは直接fetchしない
```
> 注: アプリは `/content/fuwafuwa-land/...` というURLでブラウザから直接読む（`src/**` 参照あり）。**この階層のパスを変えるとアプリが壊れる。**

## ④ 動画スタジオ — `shorts/`
```
render.py           # レンダラ本体（JSON台本 → mp4）。ROOT=リポルートとして素材を解決
script.json         # 既定台本
legacy/make_30s.py  # 旧・一発もの（ゴールデン位置の元。現render.pyに反映済）。*.mp4はgit除外
out/                # 書き出し（mp4/preview/post-ledger.csv/meta）※.gitignore
```
台本の置き場は **`public/content/shorts-studio/scripts/`**（アプリがブラウザから読む設計のため public 配下）。drafts も同階層。
- 使い方・台本仕様: `docs/60_shorts-studio/04_script-authoring.md`
- 背景プロンプト: `docs/60_shorts-studio/03_background-prompts.md`
- 実証パターン: `docs/60_shorts-studio/05_research-virality.md`

## ②③ アプリ — `src/`
`src/fuwafuwa-land/`（体験）, `src/shorts-studio/`（動画スタジオの**UIモック**。実エンジンは `shorts/`）, ほかゲーム本体。

## docs — ドキュメント"だけ"（コード・動画は置かない）
```
00_overview / 10_fuwafuwa-land / 20_business / 30_suwapuyo /
40_yourtime-platform / 50_design-strategy-os /
60_shorts-studio/         # 動画スタジオの正本ドキュメント
  auto-studio/            # （旧 70_shorts-auto-studio を統合：Web自動スタジオの製品/設計）
```

## 命名の注意（既知）
- 動画エンジンは歴史的に `shorts/`、アプリUI・台本・docsは `shorts-studio`。**実体は同じ動画スタジオ**。改名は参照連鎖が大きいため0→1では見送り、本マップで明示する方針。

## やらないこと（意図的・過剰整理の回避）
monorepo化・パッケージ分割・素材を public 外へ移動、はしない（0→1では `管理コスト > 価値`）。
