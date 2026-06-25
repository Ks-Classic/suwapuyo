# 03-01 バックエンド処理

> 最終更新: 2026-06-23

## MVP

正本は Supabase とする。ブラウザは画像処理・登録UI・表示描画を担当し、Storage/Postgres/Realtime 経由で別端末へ即時反映する。

処理責務:

- 作品ID採番（DB sequence）。
- 作品画像のStorage保存。
- 塗り絵台紙補正と連結背景透過（ブラウザ内）。
- 表示状態の保存（`display_state`）。
- 操作ログの保存。
- 表示PCのIndexedDBキャッシュとリロード復旧。

### Supabase

- Storage: 画像。
- Table: artwork/display_state/operation_log。
- Realtime: 表示画面反映。

### IndexedDBキャッシュ

- 表示PCの復旧用に画像Blob/メタデータをキャッシュする。
- Supabase切断時も既に表示済みの作品は描画継続する。
- ローカルフォールバックは最後に実装する。MVP本線ではネット接続前提。

## 採用判断

6/25 Gateからスマホ `#/staff` → Supabase → 表示PC `#/display` の本番同一構成で検証する。顔写真AI変換は採用しない。塗り絵台紙/デジタル描画を主導線とし、AI変換を検討する場合は本人写真ではなく作品画像の任意加工に限定する。
