# Shorts Production Rules

## 冒頭固定

全ショートは、最初の3行を固定する。

1. `おはようございます！`
2. `今日のふわふわランドの天気は、、、`
3. `{天気}です！`

天気はわかりやすさを優先し、無理にボケない。小ボケを入れる場合も、直後に意味が通る一言で戻す。

## 構成

1. 挨拶
2. 今日の天気ふり
3. 今日の天気
4. 今日のテーマ
5. キャラ会話または1人トーク
6. 今日できる小さな行動
7. CTA

尺は30-60秒。短く作る場合でも30秒を下回らない。

## ターゲット

各JSONに `targetAudience` と `viewerState` を必ず入れる。

- `general_discomfort`: なんとなく体に不調を感じている人
- `health_literacy`: 健康について正しく知りたい人
- `family_health`: 親子で楽しく健康になりたい人
- `medical_worker`: 医療従事者、支援者、出展者

1本の動画で全員に話しかけない。主ターゲットを1つ、必要なら副ターゲットを1つまでにする。

## 画面配置

- タイトル: 上部中央。横幅は画面幅の82%以内。縦動画の上部1:1範囲内に収め、キャラ・常設イラスト・字幕と重ねない。
- タイトル雰囲気: 複数パターンから動画ごとに選ぶ。色・傾き・外枠は変えてよいが、可読性を最優先する。
- 常設イラスト: タイトルより下、左上の小さなアクセント。タイトル領域へ入れない。
- キャラ足元: 下部字幕領域へ入れない。
- 通常字幕: 画面中央下、安全領域内に固定。
- CTA字幕: 通常字幕より少し上。下端へ落とさない。
- 長い字幕: 2行以内に折り返す。収まらない場合はフォントサイズを下げる。

## タイトル雰囲気パターン

`titleStyle` は以下から選ぶ。UIでは日本語名を表示し、JSON/rendererでは日本語名またはIDを受け付ける。毎回同じ見た目にしないが、読みづらさは絶対に避ける。

| 表示名 | ID | 相性がいい内容 |
|---|---|---|
| ぷくっと黄色 | `puku-yellow` | 親子向け、朝の元気、口たいそう、標準回 |
| 先生みどり | `teacher-green` | 健康知識、医療従事者、正しく知りたい人 |
| ふわ水色 | `fuwa-blue` | つながり、雑談、自愛、わのの/マミュー向け |
| きらっと桃 | `kiratto-peach` | ラピ子、未病美容、笑顔、華やか回 |
| 手書き白 | `hand-white` | ゆるい会話、説明感を減らしたい回 |
| 探検オレンジ | `adventure-orange` | わーわーの冒険、小ぼけ、親子チャレンジ |
| 夜のしずく | `night-drop` | 睡眠、鼻呼吸、夜の習慣、落ち着いた回 |
| 火消し赤 | `fire-red` | 炎症/糖化/酸化の注意喚起。ただし怖くしない |

同じ `titleStyle` は3本連続で使わない。

## Layout preset

JSONでは `layout` を必ず持つ。MVPの標準は次の3つ。

- `center-square-two-shot`: 2人会話の標準。タイトル、キャラ、字幕を上部1:1内の中央へ集める。
- `center-square-solo`: 1人トーク。キャラを中央に置き、字幕を下げすぎない。
- `event-intro`: YourTIME案内。タイトルを少し下げ、キャラは左右に広げる。

チェック:

- `titleY`: `0.28` から `0.40`
- `subtitleY`: `0.82` から `0.92`
- 2人会話の `leftCharacterX`: `0.45` 未満
- 2人会話の `rightCharacterX`: `0.55` 超
- 2人会話のキャラは互いに向き合う。
- タイトル、キャラ、セリフは上部1:1範囲に収める。

## JSON必須フィールド

- `title`
- `topTitle`
- `titleStyle`
- `layout`
- `targetAudience`
- `viewerState`
- `theme`
- `behaviorGoal`
- `weather`
- `characters`
- `lines`
- `eventAnimation`
- `emotion`

MP4出力MVPでは、以下も持つ。

- `schemaVersion`
- `episodeId`
- `version`
- `background`
- `captions`
- `manualPostDraft`
- `qualityChecks`

`captions` は動画内字幕ではなくSNS手動投稿用の補助文。`manualPostDraft` はAPI投稿ではなく、ユーザーが手動投稿するための下書き。

## Render jobルール

投稿API連携は扱わない。MVPはMP4出力まで。

状態:

1. `generated`: 候補生成済み。
2. `editing`: ユーザー調整中。
3. `preview_ready`: PNGプレビュー確認可能。
4. `approved_for_render`: MP4生成承認済み。
5. `rendering`: MP4生成中。
6. `rendered`: MP4出力済み。
7. `post_draft_ready`: 手動投稿下書き表示済み。
8. `manual_posted`: ユーザーが手動投稿済みとして記録。

出力ファイル:

```text
public/content/shorts-studio/scripts/{episodeId}.v{version}.json
shorts/out/{episodeId}.v{version}.preview.{second}s.png
shorts/out/{episodeId}.v{version}.mp4
shorts/out/{episodeId}.v{version}.thumbnail.png
shorts/out/{episodeId}.v{version}.manifest.json
```

失敗分類:

- `schema_invalid`
- `asset_missing`
- `layout_out_of_bounds`
- `duration_out_of_range`
- `renderer_crashed`
- `audio_synthesis_failed`
- `output_write_failed`
- `timeout`
- `unknown`

失敗時は、ユーザーが次に何を直せばよいかをUIに出す。例: `layout_out_of_bounds` なら位置調整へ戻す。

## 声

声の基本周波数は `public/content/01_すわぷよ/05_設定/01_キャラクター台帳.json` を正とする。台本JSON側の `pitch` はキャラ台帳と一致させる。

## 生成前プレビュー

動画を生成する前に、必ず1枚プレビューで配置を確認する。

```bash
python3 shorts/render.py --preview public/content/shorts-studio/scripts/yt-001-hare-mouth-gym.json 6.5
```

赤い1:1ガイドを見たい場合は、一時JSONで `debugSafezone=true` にする。正本JSONには通常残さない。

`layout` で調整できる主な値:

- `titleY`: タイトル縦位置
- `leftCharacterX` / `rightCharacterX`: キャラの左右位置
- `characterHeight`: キャラサイズ
- `characterBaselineY`: キャラ足元位置
- `subtitleY`: 通常セリフ位置
- `ctaY`: CTAセリフ位置
- `subtitleFontSize` / `ctaFontSize`: セリフ文字サイズ

動画生成前に、タイトル・キャラ・セリフが上部1:1の赤枠内に収まることを確認する。

## 中身の品質

- 毎回、テーマを1つに絞る。
- 重要な健康行動を1つだけ持ち帰らせる。
- 医療断定や診断をしない。
- 難しい用語は使わない。使う場合はすぐ日常語に言い換える。
- つい見てしまうために、最初の5秒で「今日の見どころ」を示す。
- スマホ依存を促さず、視聴後に親子で体を動かす・話す・口を動かす行動へつなげる。
- YourTIMEの価値は「売り込み」ではなく「出会い・学び・体験・次のケアへのきっかけ」として入れる。
