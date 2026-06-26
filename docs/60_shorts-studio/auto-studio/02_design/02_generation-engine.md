# Generation Engine Design

## 結論

ユーザーが毎回ネタや角度を細かく考える方式は避ける。品質を上げるには、裏側に大量の変数と制約を持ち、ユーザーは最小入力だけで候補を出し、微修正と承認に集中する方がよい。

MVPの生成ゴールはSNS投稿ではなく、MP4出力まで。投稿API連携は後段に分ける。

画像生成機能は初期スコープ外。API課金を避けるため、既存キャラ画像・既存背景・ローカルレンダー演出を使う。

## 入力

ユーザー入力は最小限にする。

- 投稿目的
  - 認知
  - 来場促進
  - 家庭での行動
  - 専門家への相談きっかけ
- 主ターゲット
  - `general_discomfort`
  - `health_literacy`
  - `family_health`
  - `medical_worker`
- テーマ
  - 口腔育成
  - 未病美容
  - なんとなく不調
  - 親子健康
  - 健康情報の伝え方
  - 雑談
- 形式
  - 1人
  - 2人会話
- 希望キャラ
  - 任意。未指定なら自動選択。
  - 表示用画像が存在する全キャラを選択可能にする。
  - ペルソナ未整備キャラは `詳細未設定` として扱い、生成時は安全な汎用口調を使う。

## 裏側の変数

生成エンジンは、以下の変数を組み合わせる。

### コンテンツ変数

- topic
- audience
- viewer state
- health behavior
- misconception
- everyday scene
- YourTIME philosophy
- CTA

### 心理変数

- curiosity gap
- pattern interrupt
- tiny commitment
- emotion shift
- social proof
- reward prediction
- memory hook

### キャラ変数

- character role
- relationship dynamic
- speech rhythm
- mistake pattern
- favorite metaphor
- emotional reaction
- compatible partner

### 表現変数

- title style
- caption rhythm
- layout preset
- background variant
- motion type
- punchline type
- silence/beat timing

## 最適ランダム

完全ランダムではなく、以下のスコアで候補を選ぶ。

```text
score =
  audience_match
  + character_topic_fit
  + novelty
  + past_approval_signal
  + safety_score
  + calendar_diversity
  - repetition_penalty
  - risk_penalty
```

## 生成ステップ

1. 主ターゲットとテーマを決める
2. キャラ候補を選ぶ
3. ストーリーテンプレートを選ぶ
4. 心理フックを2-3個選ぶ
5. 30-60秒構成へ展開
6. キャラ口調へ変換
7. 健康表現チェック
8. layout presetを選ぶ
9. preview対象秒を決める
10. video JSONを出力

## 品質チェック

- 1動画1テーマか
- 視聴者が自分ごと化できるか
- 子どもが真似できる動きがあるか
- 説明口調が続いていないか
- キャラが実在しているように話しているか
- YourTIMEの価値が自然に入っているか
- 医療断定がないか
- CTAがスマホ滞在ではなく行動へ向いているか

## フィードバック学習

初期はモデル学習ではなくルール学習にする。

### 入力

- 却下理由
- 承認理由
- セリフ修正差分
- layout修正差分
- キャラ変更
- 投稿結果

### 反映

- よく下げられるタイトル位置 -> layout default更新
- 説明調が直される -> speech rule追加
- 特定テーマで採用率が高いキャラ -> character_topic_fit上昇
- 危ない表現が消される -> guardrail追加
- 飽きられた型 -> repetition_penalty上昇

## 生成結果の保存

全候補は保存する。

- prompt/request
- selected variables
- generated JSON
- edited JSON
- render output
- feedback
- final status

これにより「なぜこの動画が生成されたか」「なぜ直されたか」を後から追える。

## 出力

MVP出力:

- preview PNG
- final MP4
- 投稿文下書き
- ハッシュタグ候補
- 手動投稿チェックリスト

後段:

- SNS API投稿
- 投稿予約
- 投稿結果の自動取得

## Video spec生成責務

Generation Engineは、Web UIがそのまま編集でき、rendererがそのまま読める `video spec JSON v1` を出力する。JSONの正は `01_system-design.md` の `Video spec JSON v1` とする。

生成エンジンは以下を必ず埋める。

```text
content:
  title
  topTitle
  targetAudience
  viewerState
  theme
  behaviorGoal
  weather
  lines

visual:
  titleStyle
  background
  characters
  layout
  eventAnimation

post support:
  captions
  manualPostDraft
  qualityChecks
```

UIでユーザーが編集した後は `edited_json` として保存し、rendererには必ず `edited_json` または `approved_json` を渡す。`generated_json` から直接MP4を出さない。

## titleStyle enum

タイトルの雰囲気は毎回同じにしない。ただし可読性と1:1安全域を優先する。MVPでは以下のプリセットから選ぶ。

### `puku-yellow`

- 用途: 親子向け、朝の元気、わーわー主役
- 見た目: 黄色ベース、太め、少し弾む
- 文字: 大きめ、丸い、影は浅く
- 避ける: 医療従事者向けの真面目回

### `teacher-green`

- 用途: 健康知識、医療従事者、正しく知りたい人
- 見た目: 緑アクセント、清潔感、水平で落ち着く
- 文字: 読みやすさ最優先
- 避ける: 子ども向けの大きな小ボケ回

### `fuwa-blue`

- 用途: わのの、マミュー、安心、自愛、つながり
- 見た目: 水色ベース、淡色、余白広め
- 文字: やわらかく、余白広め
- 避ける: 強い注意喚起

### `kiratto-peach`

- 用途: ラピ子、未病美容、笑顔、自己肯定感
- 見た目: ピンク/白/小さな光
- 文字: 明るいが甘すぎない
- 避ける: 糖化/炎症など注意喚起テーマ

### `hand-white`

- 用途: 雑談回、導入回、ミエルの見える化、チッピッピの合いの手
- 見た目: 白地、手書き感、説明感少なめ
- 文字: 余白多め、村の会話に見える
- 避ける: 初見向けの強いテーマ訴求

### `adventure-orange`

- 用途: 小ボケ、発見、冒険、わーわー主役、YourTIME告知
- 見た目: オレンジ、少し傾き、発見感
- 文字: 1-2語の短いタイトル向き
- 避ける: 医療従事者向けの落ち着いた知識回

### `night-drop`

- 用途: 睡眠、鼻呼吸、夜の習慣、落ち着いた回
- 見た目: 濃色、夜、しずく感
- 文字: 余韻が残る
- 避ける: 朝の元気な体操回

### `fire-red`

- 用途: 炎症わーわー、糖化わーわー、酸化わーわー
- 見た目: 赤系アクセントをやさしく使う
- 文字: 怖くしない、断定しない
- 避ける: 「危険」「治る」など医療断定に見える言葉

選定ロジック:

```text
if targetAudience == medical_worker:
  prefer teacher-green or hand-white
elif theme includes 未病美容:
  prefer kiratto-peach
elif event purpose is 来場促進:
  prefer adventure-orange or puku-yellow
elif characters includes 炎症/糖化/酸化:
  prefer fire-red or teacher-green
elif format is 雑談:
  prefer hand-white or fuwa-blue
elif targetAudience == family_health:
  prefer puku-yellow or fuwa-blue
else:
  prefer fuwa-blue
```

同じ `titleStyle` が3本連続しないように `repetition_penalty` をかける。

## layout preset

生成時は個別数値をゼロから作らず、presetを選んでから微調整する。

### `center-square-two-shot`

2人会話の標準。タイトル、キャラ、字幕を上部1:1内の中央へ集める。

```json
{
  "safeArea": "square-top",
  "titleX": 0.5,
  "titleY": 0.34,
  "titleFontSize": 88,
  "leftCharacterX": 0.32,
  "rightCharacterX": 0.68,
  "characterHeight": 0.32,
  "characterBaselineY": 0.8,
  "subtitleY": 0.88,
  "ctaY": 0.82,
  "subtitleFontSize": 48,
  "ctaFontSize": 54
}
```

### `center-square-solo`

1人トーク。キャラを中央に置き、字幕をやや下げる。

```json
{
  "safeArea": "square-top",
  "titleX": 0.5,
  "titleY": 0.33,
  "titleFontSize": 92,
  "leftCharacterX": 0.5,
  "rightCharacterX": null,
  "characterHeight": 0.34,
  "characterBaselineY": 0.79,
  "subtitleY": 0.88,
  "ctaY": 0.82,
  "subtitleFontSize": 48,
  "ctaFontSize": 54
}
```

### `event-intro`

YourTIMEイベント案内。タイトルを少し下げ、キャラは左右に広げる。

```json
{
  "safeArea": "square-top",
  "titleX": 0.5,
  "titleY": 0.36,
  "titleFontSize": 82,
  "leftCharacterX": 0.28,
  "rightCharacterX": 0.72,
  "characterHeight": 0.3,
  "characterBaselineY": 0.8,
  "subtitleY": 0.89,
  "ctaY": 0.82,
  "subtitleFontSize": 46,
  "ctaFontSize": 52
}
```

MVPの自動チェック:

- `titleY` は `0.28` から `0.4` の範囲。
- `subtitleY` は `0.82` から `0.92` の範囲。
- 2人会話では `leftCharacterX < 0.45`、`rightCharacterX > 0.55`。
- 2人会話では `characters[0].facing = right`、`characters[1].facing = left`。
- タイトル、キャラ、字幕が上部1:1安全域内に収まる。

## eventAnimation enum

MVPでは複雑な動画生成ではなく、rendererが描けるローカル演出だけを使う。

```text
cheek-balloon
  - ほっぺ風船。口たいそう、わーわー、もぐぴよ向け。

tongue-flag
  - 舌ぺろ練習。口腔育成、親子の口たいそう向け。

smile-stamp
  - にこーの達成印。真似できた瞬間の軽いごほうび向け。

candy-rain
  - キャンディが降る。糖化/甘いもの回向け。降らせすぎず、小皿や水の話へ着地する。

small-plate
  - 小皿に分ける。だらだら食べ対策を具体行動に落とす。

water-sparkle
  - 水分、口の乾燥、リセット表現。

halo-link
  - わのの、YourTIMEの出会い、地域/親子のつながり。

soft-popup
  - 押しつけない問いかけ、会話の入り口。

care-glow
  - 未病美容、安心、見守り、やさしい気づき。

breath-wind
  - 鼻呼吸、口呼吸、酸化わーわー向け。

shadow-fade
  - だるさや不調が少し軽くなる表現。

posture-line
  - 姿勢と呼吸の軸を見せる表現。

mirror-sparkle
  - 美容・セルフケアの鏡きらめき。

bubble-fire-out
  - 炎症わーわー向け。怖い炎ではなく、火消しのコミカル表現。

self-care-heart
  - 自分を責めないケア、未病美容、親切の表現。

none
  - 演出なし。医療従事者向けや情報密度が高い回。
```

eventAnimationは配列で持つ。ただし30-60秒の動画では最大3個まで。主役演出は1個だけにする。

```json
[
  {
    "id": "candy-rain",
    "trigger": "line:l005",
    "intensity": "small",
    "durationSec": 2.8
  },
  {
    "id": "water-sparkle",
    "trigger": "line:l009",
    "intensity": "medium",
    "durationSec": 1.8
  }
]
```

## captions / manualPostDraft生成

`captions` は動画内表示ではなく、投稿補助。`manualPostDraft` はSNS APIへ送らず、人間がコピーして使う下書き。

```json
{
  "captions": {
    "platformTitle": "親子で10秒、口たいそう",
    "description": "ふわふわランドの朝。口を動かす小さな習慣を、親子で楽しく。",
    "hashtags": ["#YourTIME", "#ふわふわランド", "#口腔育成"],
    "thumbnailText": "ぷーぺろにこー"
  },
  "manualPostDraft": {
    "instagram": {
      "caption": "今日のふわふわランドは晴れ。親子で10秒だけ口たいそうをやってみよう。",
      "hashtags": ["#YourTIME", "#親子健康", "#口腔育成"],
      "checklist": ["MP4を保存", "サムネ確認", "医療断定表現なし", "投稿後コメント確認"]
    },
    "youtubeShorts": {
      "title": "親子で10秒、口たいそう #Shorts",
      "description": "YourTIMEで健康を楽しく知るきっかけに。",
      "hashtags": ["#Shorts", "#YourTIME", "#口腔育成"]
    }
  }
}
```

投稿文の禁止:

- 「治る」「予防できる」と断定する。
- 不安を煽って来場させる。
- 医療従事者の監修がない内容を監修済みに見せる。
- SNS滞在を伸ばすためだけのCTAにする。

## render接続

将来のWeb UI直接生成版の実行順:

1. UIで `approved_json` を保存する。
2. `render_jobs` に `type=preview` を作る。
3. `python3 shorts/render.py --preview {approved_json_path} {previewSecond}` を実行する。
4. preview PNGをUIに表示する。
5. ユーザーが「MP4生成」を押す。
6. `render_jobs` に `type=video` を作る。
7. `python3 shorts/render.py {approved_json_path}` を実行する。
8. `shorts/out/{episodeId}.v{version}.mp4` をダウンロード可能にする。
9. `manualPostDraft` を表示する。
10. ユーザーが手動投稿したら `manual_posted` を記録する。

2026-06-26時点のローカル直接MP4出力MVPでは、DB/外部workerを置かずに次の順でMP4まで進める。

1. Web UIで候補を選び、タイトル、セリフ、キャラ左右、位置、演出、`titleStyle` を調整する。
2. Web UIがrender.py互換JSONを作る。
3. Web UIが `/api/shorts-studio/render` にrender specをPOSTする。
4. Vite middlewareが `spec.title` を安全なslugへ正規化する。
5. `/tmp/suwapuyo-shorts-studio/<title>.json` にrender specを書く。
6. `python3 shorts/render.py --check <json>` を実行し、`schema_invalid` / `asset_missing` / `layout_out_of_bounds` / `duration_out_of_range` / `unsupported_animation` を確認する。
7. エラーがなければ `python3 shorts/render.py <json>` を実行する。
8. `ffprobe` で尺とファイルサイズを取得する。
9. `/api/shorts-studio/download/<title>.mp4` を返す。
10. Web UIからcaption / hashtagsをコピーする。
11. 人間がSNSへ手動投稿する。

JSONダウンロードとCLIコマンドコピーは、実行ブリッジが使えない環境の保険導線として残す。本番/複数人利用では、同じAPI契約を別プロセスworkerまたはDB+Queueへ移す。

## 新しい依存/DB変更について

現時点では新しい依存やDB変更を必須にしない。

選択肢:

- A案: ファイルベースMVP
  - JSONを `public/content/shorts-studio/scripts/` に保存し、CLIでMP4を生成。
  - 最速。単一PC運用向き。

- B案: 軽量Backend API
  - 既存Node/Viteとは別に、小さなAPIでJSON保存とrender.py起動を担当。
  - UIから実際にMP4生成ボタンを動かすなら必要。

- C案: DB + Queue
  - render_jobs、episodes、feedbacksをDB管理し、workerで非同期実行。
  - 本運用向き。ただしアーキテクチャ判断とDBスキーマ変更が必要なので、実装前にユーザー確認が必須。
