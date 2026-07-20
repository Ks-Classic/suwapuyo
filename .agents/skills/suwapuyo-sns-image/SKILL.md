---
name: suwapuyo-sns-image
description: すわぷよのInstagram・X・Threads向け静止画やカルーセルを制作・検品する。4:5投稿画像、GPT Image 2生成、公式やす原画を含む投稿、画像内日本語、投稿素材の承認・保存を扱うときに使用する。公式やすの無改変、1080×1350、文字の完全一致、目視確認、公開Gateを強制する。
---

# すわぷよSNS画像制作

投稿画像を作るだけで終わらせず、原画・寸法・文字・保存状態が合格した画像だけを公開候補へ進める。

## 最初に読む

静止画と動画で企画・コピー・キャラ・公開判断を共有するため、作業前に [SNS静止画・動画 共通制作契約](../../../docs/80_制作過程/11_SNS静止画・動画共通制作契約.md) を全文読む。

公式やすを扱う場合、またはキャラクター原画の扱いに迷う場合は、作業前に [references/brand-asset-rules.md](references/brand-asset-rules.md) を全文読む。

動画も派生する企画では、同じ`content/social/posts/<content-id>/post.md`を正本にし、やっ太郎の動画だけを `.agents/skills/suwapuyo-sns-video/` へ渡す。静止画の承認を動画へ自動継承しない。

SNSブランドシリーズの使用キャラは基本`やっ太郎`と、保護原画を変えない`じく太郎`だけとする。ほかのすわぷよキャラを使う場合は、投稿ごとの明示決定と権利・ブランド確認を先に行う。

## 固定ルール

1. Instagram静止画を基準とし、最終画像を必ず `1080×1350` PNGにする。
2. 画像内コピーの正本を、生成前にUTF-8テキストとして固定する。プロンプト中にも逐語で指定する。
3. 画像内文字は必ずGPT Image 2で背景・装飾と一体生成する。Pillow、Canvas、SVG、HTML/CSS、ImageMagick等で文字を後載せしない。誤字が出た生成物は公開候補にせず、GPT Image 2で再生成または文字修正する。
4. 「生成時に誤字が絶対発生しない」と表現しない。保証するのは、未検証・不一致の画像を承認工程へ通さないことである。
5. 公式やすの保護原画を生成AIへ入力しない。再描画、切り抜き、補完、色変更、ポーズ変更、衣装変更を禁止する。背景透過だけは作者許諾済みのため、元JPGのRGB・寸法を保持し、外周につながる白背景だけを決定的処理で二値透過した登録済みPNGを使用できる。
6. 公式やすを使う場合は、SHA-256確認済みのJPGまたは登録済み透過PNGを1:1・無変形・整数座標で最終キャンバスへ貼る。透過PNGでは不透明領域の全pixel一致を検査する。
7. 新しい透過版を作る場合は、`create_protected_transparent_asset.py`で元JPGのhashを確認して作成し、出力hashをasset-registerへ固定する。AI背景除去、crop、リサイズ、半透明化はしない。
8. 保護原画を含む画像は、先にGPT Image 2で背景・全文字・吹き出し・装飾・AI入力可能なキャラまでを完成スライドとして一体生成し、保護原画の配置領域だけを空ける。その後、保護原画を1:1で合成する。完成スライドに含められる文字や吹き出しを、理由なく部品単体で別生成しない。
9. review・approved・publishedを混同しない。人の承認前は必ず `assets/01_review/` に置く。

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
- 文字なし背景を生成してローカル処理で文字を後載せする方式は禁止する。GPT Image 2が利用できなければ、別方式へ無断で切り替えず制作を止める。
- 公式やすを使うスライドは、公式やすを除いた背景・全文字・吹き出し・装飾・AI入力可能なキャラまでをGPT Image 2で完成させ、原画配置領域だけを空ける。
- 吹き出し単体や文字パーツだけを先に生成せず、原則としてスライド全体の文脈・余白・視線誘導を含む完成レイヤーを一発で生成する。誤字修正も完成レイヤーをGPT Image 2で修正する。
- 過去画像を再掲・注釈する場合、保護原画入り完成画像をGPT Image 2へ戻さない。保護原画合成前のレイヤーがあれば、それへ注釈・吹き出しを一体生成してから同じ保護原画を再合成する。
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
  --protected public/content/04_ツナやす_ブランド/01_キャラクター案/jikutaro-transparent-approved-v1.png \
  --expected-sha256 09ba43605e8411afc143e76f37021f5c774025b23a049640689928e82feb6237 \
  --x 119 --y 508 \
  --output <final.png>
```

保護原画を縮小・拡大して収めない。入らない構図を作り直す。

### 5. セルフチェックする

1. 完成画像を `view_image` のoriginal detailで開く。
2. 画像内文字を見たまま別ファイルへ転記する。期待コピーを見ながら転記しない。
3. 次のvalidatorで、寸法、文字、原画hash、原画領域の完全一致を検査する。

```bash
python3 .agents/skills/suwapuyo-sns-image/scripts/validate_social_image.py \
  --image <final.png> \
  --expected-copy <expected.txt> \
  --observed-copy <observed.txt> \
  --protected-source public/content/04_ツナやす_ブランド/01_キャラクター案/jikutaro-transparent-approved-v1.png \
  --protected-sha256 09ba43605e8411afc143e76f37021f5c774025b23a049640689928e82feb6237 \
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
