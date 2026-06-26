# Shorts Auto Studio

すーすーわーわーキャラのショート動画を半自動生成するプロダクト設計。

## ドキュメント

- `01_product/01_product-requirements.md`
  - プロダクト目的、ユーザーストーリー、MVP、やる/やらない、成功指標
- `02_design/01_system-design.md`
  - システム構成、データモデル、API、実装順、リスク
- `02_design/02_generation-engine.md`
  - 生成エンジン、裏側の大量変数、最適ランダム、フィードバック学習
- `02_design/03_ui-ux.md`
  - 画面構成、編集フロー、プレビュー、フィードバックUI

## 方針

現状の `JSON + render.py` は捨てない。MVPのレンダリングコアとして残す。

ただし、手編集前提にはしない。JSONは内部形式にし、ユーザーはWeb UIで以下だけ触る。

- ネタ/テーマ
- 1人/2人
- キャラ選択
- タイトル微修正
- セリフ微修正
- layout微調整
- 承認/却下/フィードバック

## 最新方針: まずMP4出力まで

SNSへの自動投稿は初期スコープにしない。

理由:

- Instagram / YouTube / TikTok はAPI仕様・審査・権限・トークン管理がそれぞれ異なる
- 健康/医療寄りコンテンツは誤投稿リスクを避け、人間の最終確認を必須にする
- 初期価値は「毎日2-3本の候補を短時間でMP4化できること」で十分に出る

MVPの到達点は以下。

```text
画面を開く
  -> 今日の投稿枠を確認
  -> 候補を自動生成
  -> キャラ/タイトル/セリフ/位置/演出を微調整
  -> 高速プレビュー
  -> MP4レンダー
  -> MP4と投稿文下書きを出力
  -> 人間がSNSへ投稿
  -> 修正理由を次回ルールへ反映
```

投稿API連携は、MP4出力運用が安定してから検討する。

## 2026-06-26時点のMVP到達点

現時点の動く導線は「ローカル直接MP4出力MVP」。

```text
/shorts-studio を開く
  -> 候補を選ぶ
  -> タイトル/セリフ/キャラ/位置/演出/タイトル雰囲気を調整
  -> 品質チェックを確認
  -> MP4を生成
  -> 開発サーバの /api/shorts-studio/render が --check と render.py を実行
  -> downloadUrl からMP4を取得
  -> caption / hashtags をコピー
  -> 人間がSNSへ手動投稿
```

Web UIから直接MP4を生成する機能は、ローカル開発用のVite middlewareとして実装済み。ブラウザから直接Python/ffmpegを起動するのではなく、開発サーバ側の `/api/shorts-studio/render` が `shorts/render.py --check`、`shorts/render.py`、`ffprobe` を順に実行し、`downloadUrl` を返す。

本番公開や複数人利用に進める場合は、同じ契約を別プロセスworkerまたはDB+Queueへ移す。

## 今の仕組み vs 目指す仕組み

| 観点 | 今の仕組み | 目指す仕組み |
|---|---|---|
| 生成 | 手作業でJSONを書く | AI + テンプレートで自動生成 |
| 編集 | JSON直接編集 | Web UIで微修正 |
| レイアウト | `layout`値を手調整 | layout preset + 詳細調整 |
| 品質 | 目視と手直し | 品質ゲート + フィードバック学習 |
| 出力 | Web UIからローカルNode/ViteブリッジでMP4出力。JSON/CLI導線も残す | Web UIからMP4出力・投稿文下書き生成 |
| 投稿 | caption/hashtagsをコピーして手動投稿 | API連携は後段。初期は人間が投稿 |
| 学習 | 人の記憶 | 修正履歴をルール化 |

## 推奨ロードマップ

### Phase 1: JSON基盤の安定化

- video JSON schema固定
- character-bible拡張
- story template JSON作成
- preview/render CLI安定化

### Phase 2: 生成CLI

- テーマ/ターゲット/キャラから動画JSONを生成
- 医療表現チェック
- 自動layout選択
- 1日2-3本の候補生成

### Phase 3: Web UI / MP4出力MVP

- 今日の候補一覧
- レビュー画面
- 高速プレビュー
- MP4レンダー
- MP4ダウンロード
- 承認/却下/保留

### Phase 4: フィードバック学習

- 修正差分保存
- 却下理由保存
- 次回生成ルールへ反映
- 採用率/テーマ相性の可視化

### Phase 5: 投稿補助

- キャプション生成
- ハッシュタグ生成
- 投稿カレンダー
- 手動投稿チェックリスト
- SNS API連携は後段
