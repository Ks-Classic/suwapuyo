# やっ太郎2Dショートスタジオ MVP仕様

> 状態: review用MVP。公開承認前の制作・比較に限定する。
> 正本: `05_やっ太郎キャラクター正本・生成統制.md`、`07_やっ太郎ブランド・SNSシリーズバイブル.md`、`キャラクターシステム/やっ太郎キャラクター正本_v0.1_観察版.json`

## 目的と範囲

木幡さんが、やっ太郎の現行原画を再描画せず、縦動画の位置・大きさ・回転・移動を時刻指定して、Instagram Reels / YouTube Shorts向け9:16 masterとInstagram feed確認用4:5版を再現可能に書き出せるようにする。

MVPではキャラクターを1枚の不可分な2Dレイヤーとして扱う。腕、脚、顔、口、しっぽを個別変形しない。Live2D / 3D / 生成video / 投稿API / DBは対象外とする。

## 入出力

| 項目 | 仕様 |
|---|---|
| 入力 | `shorts/yattaro-studio/examples/*.json` |
| キャラ | `yasu-cousin-draft-v1.png`。外周につながる白背景だけを実行時に透明化 |
| master | 1080×1920、30fps、H.264、無音、9:16 |
| feed | master中央の1080×1350、30fps、H.264、4:5 |
| preview | 指定時刻の9:16 PNGと4:5 PNG |
| 状態 | 全成果物を`review`として扱い、自動公開しない |

重要な顔・字幕・CTAは、9:16 master中央の4:5領域 `y=285..1635` に収める。媒体別音源はmasterへ焼き込まない。

## 操作モデル

`motions`は時刻順のkeyframeで、`x`、`y`、`scale`、`rotation`を線形補間する。座標はキャンバス比率、回転は度数とする。同時に使える演出は、全体移動、拡縮、回転、ジャンプ、左右揺れである。

```json
{"at": 0.0, "x": 0.5, "y": 0.58, "scale": 0.62, "rotation": 0}
```

造形の個別変形が必要になったら、本MVPを拡張せず、承認済みpartsを使うrigged 2DまたはVRM 3D trackへ切り替える。

## 完了条件とテスト観点

- JSON schema相当の必須値・範囲検査が通る。
- 原画hashをmanifestへ記録する。
- 9:16と4:5を同じtimelineから生成できる。
- previewで顔と字幕が4:5安全域から欠けない。
- 出力が1080×1920 / 1080×1350、30fpsである。
- 原画内部の白い目・歯・服を透明化しない。
- Character Master未承認のため、公開状態へ自動昇格しない。

API、DB、ER図、バックエンドシーケンスは導入していないため作成しない。Web UIを追加する時点で画面遷移・UI定義を追記し、外部ジョブ化する時点でAPI仕様と永続化設計を追加する。

## 操作

```bash
python3 shorts/yattaro-studio/render.py --check shorts/yattaro-studio/examples/first-jump.json
python3 shorts/yattaro-studio/render.py --preview 2.0 shorts/yattaro-studio/examples/first-jump.json
python3 shorts/yattaro-studio/render.py shorts/yattaro-studio/examples/first-jump.json
```

出力は`shorts/out/yattaro-studio/`へ置く。manifestの状態は常に`review`であり、公開操作は行わない。
