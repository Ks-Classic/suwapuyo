# すわぷよ / ふわふわランド — YourTIME 2026-08-02

1つの Vite + React + TypeScript アプリに、YourTIME 向けの **3プロダクト**が同居しています。

| プロダクト | 実装 | ドキュメント |
|---|---|---|
| ふわふわランド（本命・参加型展示） | `src/fuwafuwa-land/` | `docs/10_fuwafuwa-land/` |
| すわぷよ（パズルデモ） | `src/App.tsx` ほか | `docs/30_suwapuyo/` |
| YOUR TIME Platform Demo | `src/components/YourTimeReflectionDemo.tsx` | `docs/40_yourtime-platform/` |

## はじめに読む

👉 **[`docs/00_overview/01_repo-map.md`](docs/00_overview/01_repo-map.md)** — 全体地図・正本の在り処・ディレクトリ規約。

## 開発

```bash
npm install
npm run dev      # 開発サーバ
npm run build    # tsc -b && vite build
npm run lint
```

ルーティングはURLハッシュ分岐: `/`（すわぷよ）, `#/fuwafuwa/staff`, `#/fuwafuwa/display`, `#/fuwafuwa/debug`。

## ドキュメント

`docs/` は番号で読む順序が固定されています（`00_overview` → `10_fuwafuwa-land` → `20_business` …）。`_archive/` は旧版退避、`_snapshots/` は凍結HTML。詳細は地図を参照。
