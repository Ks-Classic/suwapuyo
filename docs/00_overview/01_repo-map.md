# 01 — リポジトリ地図（最初に読む1枚）

> 最終更新: 2026-06-25
> このリポジトリの全体像・正本の在り処・走らせ方を1枚で示す。迷ったらここに戻る。

## このリポジトリは何か

1つの Vite + React + TypeScript アプリの中に、**YourTIME 2026-08-02 に向けた3つのプロダクト**が同居している。ハッシュルーティングで切り替わる（後述）。事業・設計戦略のドキュメントも同梱。

## 3つのプロダクト

| # | プロダクト | 一言 | 実装 | ドキュメント(正) |
|---|---|---|---|---|
| ② | **ふわふわランド** | 子どもの塗り絵がモニターでふわふわ動く参加型展示（本命） | `src/fuwafuwa-land/` | `docs/10_fuwafuwa-land/` |
| ① | **すわぷよ** | 子ども向けパズルデモ | `src/App.tsx` ほか `src/components` `src/config/puyo*` | `docs/30_suwapuyo/` |
| ③ | **YOUR TIME Platform Demo** | プラットフォーム/振り返りデモ | `src/components/YourTimeReflectionDemo.tsx` `src/config/yourTimePlatform.ts` | `docs/40_yourtime-platform/` |

> 番号の由来: ②が本命だが、コード上の歴史的な土台は①すわぷよ。docs番号(10/30/40)は重要度順、表の#列(①②③)は登場順。

## ドキュメント体系（docs/）

番号で読む順序が固定されている。`_archive/` と `_snapshots/` は現役ではない。

| 番号 | 中身 |
|---|---|
| `00_overview/` | このリポジトリの地図（この1枚） |
| `10_fuwafuwa-land/` | ふわふわランドの要件→基本→詳細→テスト→サマリー→ビルドバイブル（`00_index.md` が入口、`05_summary/04` が決定の正、`06_build-bible.md` が実装の正） |
| `20_business/` | 事業戦略（`strategy-2026-06-23.md` が正）、GIVE資産(`give-assets/`)、医療広告ポリシー |
| `30_suwapuyo/` | すわぷよの仕様・TODO |
| `40_yourtime-platform/` | プラットフォームデモの仕様・TODO |
| `50_design-strategy-os/` | 設計戦略OS（空気デザイン3動画をskill/agent化した再利用システムの設計図） |
| `60_shorts-studio/` | ショート動画ラインの検討 |
| `_archive/` | 旧統合版md（番号体系に置換済み・履歴温存のため退避） |
| 各所 `_snapshots/` | 人に見せた時点のHTMLスナップショット（凍結・正ではない） |

## 「正本」はどこか（迷ったら）

| 知りたいこと | 正本 |
|---|---|
| ふわふわランドの確定設計判断(ADR)・Gate計画 | `docs/10_fuwafuwa-land/05_summary/04_decision-log-and-gate-plan.md` |
| ふわふわランドの実装仕様 | `docs/10_fuwafuwa-land/06_build-bible.md` |
| 事業戦略・マネタイズ・YourTIME事実 | `docs/20_business/strategy-2026-06-23.md`（10章=2026-06-25追補が最新） |
| 設計戦略OSの構成 | `docs/50_design-strategy-os/design-strategy-os.html` |

> 原則: md が正、HTML は「見せる」スナップショット（`docs/20_business` のドキュメント運用ルール）。

## 走らせ方

```bash
npm install
npm run dev      # Vite 開発サーバ
npm run build    # tsc -b && vite build
npm run lint
```

ルーティングは React Router 無し、**URLハッシュで分岐**:

| URL | 画面 |
|---|---|
| `/` | すわぷよ / トップ |
| `#/fuwafuwa/staff` | ふわふわランド スタッフ画面（登録・撮影） |
| `#/fuwafuwa/display` | ふわふわランド 表示画面（モニター） |
| `#/fuwafuwa/debug` | デバッグ |

## ディレクトリ規約（世界一を保つため）

- **docsは番号付き**（読む順序＝管理のしやすさ）。**srcは番号を振らない**（機能フォルダで切る＝慣用・import安定）。
- 旧版は消さず `_archive/` へ。見せた成果物は `_snapshots/` へ凍結。
- 正本は md。HTMLは凍結スナップショット。
- 1プロダクト=1docs番号。混ざったら番号を切り直す。
