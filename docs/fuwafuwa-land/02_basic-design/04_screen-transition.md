# 02-04 画面遷移

> 最終更新: 2026-06-23

## 画面遷移図

```txt
/fuwafuwa
  ├─ /fuwafuwa/staff
  │    ├─ 作品登録
  │    ├─ 作品一覧
  │    ├─ 表示操作
  │    └─ 復旧操作
  │
  └─ /fuwafuwa/display
       ├─ idle
       ├─ random
       ├─ featured
       └─ paused
```

## 状態遷移

```txt
idle
  ↓ 作品登録
featured
  ↓ 一定時間後
random
  ↓ 全リセット
idle

random
  ↓ 指定表示
featured

random / featured
  ↓ 一時停止
paused
  ↓ 再開
random
```

