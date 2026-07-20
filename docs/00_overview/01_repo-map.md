# 01 — リポジトリ地図（最初に読む1枚）

> 最終更新: 2026-07-20
> このリポジトリの全体像・正本の在り処・走らせ方を1枚で示す。迷ったらここに戻る。

## このリポジトリは何か

1つのVite + React + TypeScriptアプリの中に、YourTIME 2026-08-02へ向けた利用者体験と会場運営機能が同居している。現行ルートはpathで切り替える。

## 現行の2境界

| 境界 | 一言 | 実装 | 現行SSoT |
|---|---|---|---|
| **利用者向け** | LINE、ゲーム、体操、村、イベント | `src/app/`ほか | `docs/70_すわぷよ・ユアタイム統合仕様/` |
| **会場向け** | お絵描き、スタッフ運営、大画面表示 | `src/fuwafuwa-land/` | 同上。展示固有の根拠は`docs/10_fuwafuwa-land/` |

## ドキュメント体系（docs/）

番号で読む順序が固定されている。`_archive/` と `_snapshots/` は現役ではない。

| 番号 | 中身 |
|---|---|
| `00_overview/` | このリポジトリの地図（この1枚） |
| `10_fuwafuwa-land/` | ふわふわランドの要件→基本→詳細→テスト→サマリー→ビルドバイブル（`00_index.md` が入口、`05_summary/04` が決定の正、`06_build-bible.md` が実装の正） |
| `20_business/` | 事業戦略（`strategy-2026-06-23.md` が正）、GIVE資産(`give-assets/`)、医療広告ポリシー |
| `30_suwapuyo/` | すわぷよの仕様・TODO |
| `40_yourtime-platform/` | 旧プラットフォームデモの履歴。現行判断には使用しない |
| `50_design-strategy-os/` | 設計戦略OS（空気デザイン3動画をskill/agent化した再利用システムの設計図） |
| `60_shorts-studio/` | ショート動画ラインの検討 |
| `70_すわぷよ・ユアタイム統合仕様/` | **LINE必須LIFF、すわぷよ、体操、アンケート、出展者レポート、Harnessを横断する現行SSoT** |
| `_archive/` | 旧統合版md（番号体系に置換済み・履歴温存のため退避） |
| 各所 `_snapshots/` | 人に見せた時点のHTMLスナップショット（凍結・正ではない） |

## 「正本」はどこか（迷ったら）

| 知りたいこと | 正本 |
|---|---|
| ふわふわランドの確定設計判断(ADR)・Gate計画 | `docs/10_fuwafuwa-land/05_summary/04_decision-log-and-gate-plan.md` |
| ふわふわランドの実装仕様 | `docs/10_fuwafuwa-land/06_build-bible.md` |
| 事業戦略・マネタイズ・YourTIME事実 | `docs/20_business/strategy-2026-06-23.md`（10章=2026-06-25追補が最新） |
| 設計戦略OSの構成 | `docs/50_design-strategy-os/design-strategy-os.html` |
| すわぷよ・LINE・アンケート・体操・出展者価値の統合仕様 | `docs/70_すわぷよ・ユアタイム統合仕様/00_案内.md` |

> 統合範囲で旧資料と矛盾する場合は、`70_すわぷよ・ユアタイム統合仕様/`を優先する。ふわふわランド単体の撮影・展示運用は従来どおり`10_fuwafuwa-land/`を正とする。

> 原則: md が正、HTML は「見せる」スナップショット（`docs/20_business` のドキュメント運用ルール）。

## 走らせ方

```bash
npm install
npm run dev      # Vite 開発サーバ
npm run build    # tsc -b && vite build
npm run lint
```

ルーティングはReact Routerなしのpath分岐:

| URL | 画面 |
|---|---|
| `/` | すわぷよ / トップ |
| `/fuwafuwa/draw` | 子ども用お絵描き |
| `/display` | 会場モニター |
| `/staff` | Access保護された運営ホーム |
| `/staff/debug` | Access保護された診断画面 |

## ディレクトリ規約（世界一を保つため）

- **docsは番号付き**（読む順序＝管理のしやすさ）。**srcは番号を振らない**（機能フォルダで切る＝慣用・import安定）。
- 旧版は消さず `_archive/` へ。見せた成果物は `_snapshots/` へ凍結。
- 正本は md。HTMLは凍結スナップショット。
- 1プロダクト=1docs番号。混ざったら番号を切り直す。
