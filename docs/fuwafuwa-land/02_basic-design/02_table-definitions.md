# 02-02 テーブル定義

> 最終更新: 2026-06-23

Supabase Postgresを正本として使う。画像本体はStorage、作品メタと表示状態はPostgres、表示PCのIndexedDBはキャッシュ/復帰用。

## artwork

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| id | string | Yes | 作品ID |
| sourceImageUrl | string | Yes | 元画像URL/Data URL |
| processedImageUrl | string | No | 背景除去後画像 |
| displayLabel | string | Yes | 表示番号 |
| status | enum | Yes | `queued` / `visible` / `hidden` / `archived` |
| consentScope | enum | Yes | `event_only` / `sns_allowed` / `unknown` |
| createdAt | string | Yes | ISO日時 |
| updatedAt | string | Yes | ISO日時 |
| lastShownAt | string | No | 最終表示日時 |
| showCount | number | Yes | 表示回数 |
| notes | string | No | スタッフメモ |

## display_state

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| id | string | Yes | `current` 固定 |
| visibleArtworkIds | string[] | Yes | 表示中ID |
| featuredArtworkId | string | No | 主役表示ID |
| mode | enum | Yes | `idle` / `random` / `featured` / `paused` |
| maxVisibleCount | number | Yes | 同時表示上限 |
| displayEvent | object | No | 表示イベント。例: `{ id, type: "battle", startedAt }` |
| updatedAt | string | Yes | ISO日時 |

### displayEvent

| フィールド | 型 | 必須 | 説明 |
|---|---|---:|---|
| id | string | Yes | イベント発火ごとのUUID。ディスプレイ側の二重発火防止に使う |
| type | enum | Yes | 現在は `battle` |
| startedAt | string | Yes | ISO日時 |

スタッフ画面のイベントメニューが `display_state.display_event` を更新し、ディスプレイ画面がRealtimeで購読してPixiJS演出を開始する。イベント停止は `display_event = null`。

## operation_log

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| id | string | Yes | ログID |
| type | enum | Yes | `register` / `show` / `hide` / `reset` / `error` |
| artworkId | string | No | 対象作品 |
| message | string | Yes | 内容 |
| createdAt | string | Yes | ISO日時 |
