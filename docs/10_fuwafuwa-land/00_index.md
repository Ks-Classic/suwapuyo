# ふわふわランド 正式ドキュメント体系 v1.0

> 最終更新: 2026-06-23
> 対象: 2026-08-02 YourTIME イベント向け「すーすーわーわー ふわふわランド」
> 最初の判定期限: 2026-06-25

## 位置づけ

このディレクトリは、ふわふわランドの正式ドキュメント体系を管理する。旧統合版(`requirements.md` / `basic-design.md` / `detailed-design.md` / `test-plan.md` / `summary.md`)は **`../_archive/fuwafuwa-land/` に退避済み**。レビュー・Issue化・実装判断では本ディレクトリ配下の番号付きドキュメントを正とする。リポジトリ全体の地図は `../00_overview/01_repo-map.md`。

## ドキュメント一覧

### 01 要件定義

| No | ドキュメント | 目的 |
|---|---|---|
| 01 | `01_requirements/01_project-overview.md` | プロジェクトの目的、背景、スコープ、成功条件を定義 |
| 02 | `01_requirements/02_business-requirements.md` | イベント運営・事業・啓蒙活動として満たすべき要件を定義 |
| 03 | `01_requirements/03_business-flow.md` | 当日の来場者・スタッフ・表示画面の業務フローを定義 |
| 04 | `01_requirements/04_functional-requirements.md` | MVPに必要な機能を優先度つきで定義 |
| 05 | `01_requirements/05_non-functional-requirements.md` | 6時間運営、性能、復旧、プライバシー、安全性を定義 |
| 06 | `01_requirements/06_privacy-consent.md` | 顔写真を扱わない運用、会場表示/SNS転用の境界、掲示文を定義 |

### 02 基本設計

| No | ドキュメント | 目的 |
|---|---|---|
| 01 | `02_basic-design/01_system-overview.md` | システム全体構成と本番候補構成を定義 |
| 02 | `02_basic-design/02_table-definitions.md` | 将来DB化を見据えたデータ構造を定義 |
| 03 | `02_basic-design/03_er-diagram.md` | 主要データの関係を定義 |
| 04 | `02_basic-design/04_screen-transition.md` | スタッフ画面・表示画面の遷移を定義 |
| 05 | `02_basic-design/05_screen-list.md` | 必要画面の一覧と責務を定義 |
| 06 | `02_basic-design/06_screen-ui-definition.md` | 各画面のUI構造と操作要件を定義 |
| 07 | `02_basic-design/07_coloring-sheet-capture.md` | 塗り絵台紙、四隅マーカー、透過処理、撮影台の仕様を定義 |

### 03 詳細設計

| No | ドキュメント | 目的 |
|---|---|---|
| 01 | `03_detailed-design/01_backend-processing.md` | バックエンド/ローカル処理の責務を定義 |
| 02 | `03_detailed-design/02_api-spec.md` | 内部API/将来HTTP APIの仕様を定義 |
| 03 | `03_detailed-design/03_sequence-diagrams.md` | 主要ユースケースの処理順序を定義 |
| 04 | `03_detailed-design/04_architecture-diagram.md` | MVP/本番候補のアーキテクチャを定義 |

### 04 テスト

| No | ドキュメント | 目的 |
|---|---|---|
| 01 | `04_test/01_test-plan-map.md` | テスト全体像と可否判定マップを定義 |
| 02 | `04_test/02_integration-test-viewpoints.md` | 機能間連携の確認観点を定義 |
| 03 | `04_test/03_system-test-viewpoints.md` | 6時間運営・モニター・スタッフ運用の確認観点を定義 |
| 04 | `04_test/04_integration-tests.md` | 結合テストケースを定義 |
| 05 | `04_test/05_system-tests.md` | システムテストケースとGo/No-Go基準を定義 |

### 05 サマリー

| No | ドキュメント | 目的 |
|---|---|---|
| 01 | `05_summary/01_implementation-rules.md` | 実装ルール、責務分離、安全ルールを定義 |
| 02 | `05_summary/02_planning-slide.md` | 企画説明スライド草案を定義 |
| 03 | `05_summary/03_github-issues.md` | GitHub Issue化する作業一覧を定義 |
| 04 | `05_summary/04_decision-log-and-gate-plan.md` | **確定した設計判断(ADR)＋3日Gate計画。矛盾時はこれが正** |

### 06 実装

| No | ドキュメント | 目的 |
|---|---|---|
| 06 | `06_build-bible.md` | **Codex向け実装バイブル。スタック/ファイル木/型/関数/アルゴリズム/受け入れ基準。実装の正** |

> ⚠️ **2026-06-23 以降の正は `05_summary/04_decision-log-and-gate-plan.md`(決定) と `06_build-bible.md`(実装)**。ストレージ(Supabase正本＋IndexedDBキャッシュ)、入力方式(塗り絵台紙＋マーカー/デジタル併用)、氏名表示、B案同期、配信、6hソーク、動画OSSの決定はそこに集約。各番号付き文書は順次これに追従させる。
>
> 事業戦略は `../20_business/strategy-2026-06-23.md`。IP方針: すーすーわーわーの**二次利用は基本OK・なにかあれば都度小夏さんに相談**(2026-06-23 合意)。

## 品質基準

この体系の品質基準は「短期MVPに必要な判断が漏れないこと」であり、単にドキュメント量を増やすことではない。

特に重視する判断:

- 2026-06-25 までに実現可否を判定できるか。
- 2026-08-02 に6時間運営して破綻しないか。
- 子どもが自分の作品を見つけられるか。
- スタッフ1人でも運用可能か。
- 顔写真・個人情報を撮らない運用にできるか。
- 壊れた時に30秒以内に復旧できるか。
