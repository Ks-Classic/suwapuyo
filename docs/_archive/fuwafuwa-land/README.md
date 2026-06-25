# すーすーわーわー ふわふわランド — ドキュメント索引 v0.1

> 最終更新: 2026-06-23
> 目的: 2026-06-25 までに、2026-08-02 YourTIME イベント当日の実現可否を判断する。
> 方針: 初期MVPではAIコメント生成・AI動画生成を入れず、子どもの作品がデジタル世界に登場してふわふわ動く体験の成立性を検証する。

## 判断結論

`/home/ykoha/projects/suwapuyo` を継続利用する。ふわふわランドは既存 SuwaPuyo の派生体験として同一リポジトリ内に置く。

ただし、既存パズルゲームと混ぜない。実装時は以下のように責務を分ける。

```txt
suwapuyo/
  src/
    components/
    config/
    fuwafuwa-land/        # ふわふわランド本体
  public/
    assets/
      sprites/            # 既存キャラ素材
      fuwafuwa-land/      # 背景、台紙、イベント用素材
  docs/
    fuwafuwa-land/        # 本ドキュメント群
```

将来的にショート動画生成も同じリポジトリで扱う場合は、アプリ分離に移行する。

```txt
suwapuyo/
  apps/
    fuwafuwa-land/
    shorts-studio/
  packages/
    assets/
    character-bible/
    brand-rules/
```

2026-06-25 までの技術検証では、移行コストを避けるため `src/fuwafuwa-land/` 相当の小さな実装でよい。

## ドキュメント構成

正式なレビュー対象は `00_index.md` 配下の番号付きドキュメント体系とする。以下は対応表。

| 区分 | 提示項目 | 本リポジトリ内の対応ファイル |
|---|---|---|
| 要件定義 | プロジェクト概要 | `01_requirements/01_project-overview.md` |
| 要件定義 | 業務要件一覧 | `01_requirements/02_business-requirements.md` |
| 要件定義 | 業務フロー | `01_requirements/03_business-flow.md` |
| 要件定義 | 機能要件一覧 | `01_requirements/04_functional-requirements.md` |
| 要件定義 | 非機能要件一覧 | `01_requirements/05_non-functional-requirements.md` |
| 基本設計 | システム概要 | `02_basic-design/01_system-overview.md` |
| 基本設計 | テーブル定義 | `02_basic-design/02_table-definitions.md` |
| 基本設計 | ER図 | `02_basic-design/03_er-diagram.md` |
| 基本設計 | 画面遷移 | `02_basic-design/04_screen-transition.md` |
| 基本設計 | 画面一覧 | `02_basic-design/05_screen-list.md` |
| 基本設計 | 画面UI定義書 | `02_basic-design/06_screen-ui-definition.md` |
| 詳細設計 | バックエンド処理 | `03_detailed-design/01_backend-processing.md` |
| 詳細設計 | API仕様書 | `03_detailed-design/02_api-spec.md` |
| 詳細設計 | シーケンス図 | `03_detailed-design/03_sequence-diagrams.md` |
| 詳細設計 | アーキテクチャ構成図 | `03_detailed-design/04_architecture-diagram.md` |
| テスト | テスト計画（マップ） | `04_test/01_test-plan-map.md` |
| テスト | 結合テスト観点 | `04_test/02_integration-test-viewpoints.md` |
| テスト | システムテスト観点 | `04_test/03_system-test-viewpoints.md` |
| テスト | 結合テスト | `04_test/04_integration-tests.md` |
| テスト | システムテスト | `04_test/05_system-tests.md` |
| サマリー | 実装ルール | `05_summary/01_implementation-rules.md` |
| サマリー | 企画書スライド | `05_summary/02_planning-slide.md` |
| サマリー | GitHub Issue一覧 | `05_summary/03_github-issues.md` |

追加で必要な観点:

- 当日6時間運営シナリオ
- スタッフ人数別オペレーション
- ネットワーク障害時の代替運用
- 子どもの個人情報・顔写真を撮らない運用
- 2026-06-25 の可否判定ゲート

これらも上記ファイル内に含める。

## MVPの中心仮説

100〜200体を同時表示することは、一般的なDELLモニター1台または2台連結のイベント体験としては過剰で、ユーザー体験上も自分の作品が見つけづらい。

MVPでは以下を採用する。

- 画面上の同時表示は 8〜20体を標準、最大30体程度。
- 作品プールは50〜100件程度まで保持できるようにする。
- 表示中キャラは一定時間で入れ替わる。
- スタッフが「全リセット」「ランダム再登場」「指定作品を表示」「非表示」を操作できる。
- 子どもが見ている間に、自分の作品がはっきり分かるサイズで登場する。

## 2026-06-25 可否判定の最重要項目

| 項目 | 合格基準 | 不合格なら |
|---|---|---|
| 撮影から表示まで | 1作品60秒以内、理想30秒以内 | 手動アップロードまたは事前登録方式に切替 |
| 画像切り抜き | 白背景台紙で80%以上が実用品質 | 台紙に太枠/QR/撮影ガイドを追加 |
| 表示安定性 | 6時間相当の連続稼働でクラッシュなし | 表示数制限、定期リロード、ローカル保存に切替 |
| スタッフ操作 | 1人で受付・撮影・表示操作が可能 | 受付と撮影を分離 |
| 画面視認性 | DELLモニターで作品が自分のものと分かる | 同時表示数を減らし、主役表示枠を追加 |
| 復旧性 | ブラウザ再読み込みで作品プール復旧 | ローカルJSON/IndexedDB保存を追加 |
| 個人情報 | 顔を撮らず作品のみ撮影できる | 撮影台・手元ガイドを必須化 |
