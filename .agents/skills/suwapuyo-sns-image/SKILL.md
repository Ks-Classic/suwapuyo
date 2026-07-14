---
name: suwapuyo-sns-image
description: すわぷよのInstagram・X・Threads向け静止画やカルーセルを制作・検品する。4:5投稿画像、GPT Image 2生成、公式やす原画を含む投稿、画像内日本語、投稿素材の承認・保存を扱うときに使用する。公式やすの無改変、1080×1350、文字の完全一致、目視確認、公開Gateを強制する。
---

# すわぷよSNS画像制作

投稿画像を作るだけで終わらせず、原画・寸法・文字・保存状態が合格した画像だけを公開候補へ進める。

## 最初に読む

公式やすを扱う場合、またはキャラクター原画の扱いに迷う場合は、作業前に [references/brand-asset-rules.md](references/brand-asset-rules.md) を全文読む。

## 固定ルール

1. Instagram静止画を基準とし、最終画像を必ず `1080×1350` PNGにする。
2. 画像内コピーの正本を、生成前にUTF-8テキストとして固定する。プロンプト中にも逐語で指定する。
3. 画像内文字は原則GPT Image 2で一体生成する。誤字が出た生成物は公開候補にせず、再生成する。
4. 「生成時に誤字が絶対発生しない」と表現しない。保証するのは、未検証・不一致の画像を承認工程へ通さないことである。
5. 公式やすの原画を生成AIへ入力しない。再描画、背景除去、切り抜き、補完、色変更、ポーズ変更、衣装変更を禁止する。
6. 公式やすを使う場合は、SHA-256確認済みの原画を1:1・無変形・整数座標で最終キャンバスへ貼る。余白や白背景を消さない。
7. 公式やすを透明背景で使いたい場合は、ツナマヨさんから承認済み透過原画を受領するまで止める。
8. review・approved・publishedを混同しない。人の承認前は必ず `assets/01_review/` に置く。

## 制作フロー

### 1. 投稿契約を固定する

以下を投稿の `post.md` に記録する。

- 投稿ID、媒体、目的、対象、スライド順
- 画像内コピーの正本
- 使用キャラと原画ルール
- 期待寸法 `1080×1350`
- 禁止事項と承認者

未確定コピーのまま画像生成しない。

### 2. 生成する

- 4:5の短い縦長キャンバス、Instagram feed、全要素をcrop-safe area内、と明示する。
- 文字は正本を引用し、行区切り、句読点、空白まで指定する。
- 公式やすを使うスライドは、公式やすを除いた背景・文字・装飾だけを生成し、原画配置領域を空ける。
- 生成画像が4:5でなくても、そのまま採用しない。

### 3. 4:5へ正規化する

保護原画を合成する前に実行する。

```bash
python3 .agents/skills/suwapuyo-sns-image/scripts/normalize_feed_image.py \
  --input <generated.png> \
  --output <normalized.png> \
  --mode contain \
  --fill '#08152f'
```

`contain`は内容を切らずに収める。余白がデザインとして不適切なら、無理に公開せず4:5で再生成する。公式やすを含む完成画像には実行しない。

### 4. 公式やすを無変形合成する

必要な場合だけ実行する。

```bash
python3 .agents/skills/suwapuyo-sns-image/scripts/compose_protected_asset.py \
  --background <1080x1350-background.png> \
  --protected やすさん.jpg \
  --expected-sha256 8dd3b3f13e7b292c6a2bf0972ff4737bd0cae7b5a486a205f628f2421b37a4dd \
  --x 119 --y 508 \
  --output <final.png>
```

原画を縮小・拡大して収めない。入らない構図を作り直す。

### 5. セルフチェックする

1. 完成画像を `view_image` のoriginal detailで開く。
2. 画像内文字を見たまま別ファイルへ転記する。期待コピーを見ながら転記しない。
3. 次のvalidatorで、寸法、文字、原画hash、原画領域の完全一致を検査する。

```bash
python3 .agents/skills/suwapuyo-sns-image/scripts/validate_social_image.py \
  --image <final.png> \
  --expected-copy <expected.txt> \
  --observed-copy <observed.txt> \
  --protected-source やすさん.jpg \
  --protected-sha256 8dd3b3f13e7b292c6a2bf0972ff4737bd0cae7b5a486a205f628f2421b37a4dd \
  --protected-x 119 --protected-y 508
```

公式やすがない画像では `--protected-*` を省略する。

### 6. 公開Gateを判定する

次をすべて満たすまで `02_approved` へ移さない。

- validatorが終了コード0
- original表示で文字をもう一度目視確認
- キャラ、表情、衣装、権利、CTAの人レビュー完了
- 投稿本文と画像の主張が一致
- asset-registerへサイズ、SHA-256、状態を記録

不合格時は修正対象を一つに絞って再生成し、同じ検査を最初から行う。

## OCRについて

この環境には日本語OCRエンジンが入っていない。現時点では独立転記と完全一致比較を必須とする。OCRを追加する場合も目視を廃止せず、OCR一致・独立目視・人の公開承認の三重Gateにする。

## 完了報告

生成結果、検証結果、未確認事項、保存先、公開状態を分離して報告する。commit、投稿、公開を実行していない場合は明記する。
