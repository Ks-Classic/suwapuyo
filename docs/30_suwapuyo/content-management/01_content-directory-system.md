# Content Directory System

このリポジトリのコンテンツ資産は、アプリ実装・ショート動画制作・営業/提案資料で同じ素材を使い回すため、`public/content/` を正本の棚とする。

## 基本方針

- URL公開される素材は `public/content/{domain}/{asset-type}/...` に置く。
- ドメインは「どの体験/事業の資産か」で分ける。ファイル形式や作業者では分けない。
- `originals/` は原本、`display/` はアプリ表示用の派生、`drafts/` は未確定の検討素材とする。
- アプリコードからは `/content/...` の絶対パスを参照する。
- `public/assets/` と `public/videos/` には新規素材を追加しない。

## 現行構造

```text
public/content/
  fuwafuwa-land/
    audio/
      suwa-good-morning.mp3
    backgrounds/
      village-bg.png
    characters/
      originals/
        01_すーすー.png
        ...
      display/
        suusuu.png
        ...
    sprites/
      blob/
      ghost/
      tanuki/
      tooth/
  shorts-studio/
    drafts/
      yourtime-popup-step-1.png
      yourtime-popup-step-2.png
  yourtime-platform/
    videos/
      booth-introduction.mp4
```

## 追加ルール

1. キャラクターを追加する場合は、原本を `characters/originals/`、アプリ表示用の軽量版を `characters/display/` に置く。
2. 表示用ファイル名は ASCII kebab-case を優先する。日本語名は原本側に残してよい。
3. ショート動画の台本やレンダラが使う素材も、アプリ素材と同じ `public/content/` を参照する。
4. 検討中の画像・スクリーンショットは `docs/30_suwapuyo/content-management/inbox/` に置き、採用時に `public/content/` へ昇格する。
5. DB seed・仕様書・アプリコードのパスは同時に更新する。片方だけ更新しない。
