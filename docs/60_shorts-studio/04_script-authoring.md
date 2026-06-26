# 04 — 台本オーサリング（正本駆動・最小スキーマ）

> `shorts/render.py` の台本JSON仕様。**テーマと台詞を書くだけ**で量産できるよう、声・色・画像・配置・背景は正本＋既定から自動解決される。
> 正本: `public/content/fuwafuwa-land/character-bible.json`（声ピッチ・性格・画像。世界観IPの一部）。
> 実証パターンの根拠: `05_research-virality.md`（あれば）／本ファイルの設計はそれに準拠。

## 最小台本（これだけで動く）

```json
{
  "title": "yt-010-kuchi-ashi",
  "series": "kuchimori-asobi",
  "size": [1080, 1920],
  "fps": 30,
  "topTitle": "お口とからだの話",
  "weather": "はれ",
  "theme": "口腔とからだのつながり",
  "hook": { "text": "え、お口から あしさき？", "durationSec": 1.6, "type": "mystery" },
  "cta": { "color": [214, 158, 44] },
  "audio": { "bgm": true, "animalese": true },
  "eventAnimation": ["halo-link"],
  "lines": [
    { "who": "mogupiyo", "text": "おはようございます！", "dur": 2.6 },
    { "who": "mogupiyo", "text": "今日のふわふわランドの天気は、、、", "dur": 3.4 },
    { "who": "suusuu",   "text": "はれ、です！", "dur": 2.6 },
    { "who": "mogupiyo", "text": "お口とあしさき、つながってると思う？", "dur": 4.0 },
    { "who": "suusuu",   "text": "え、まさか。べつべつでしょ？", "dur": 3.4 },
    { "who": "mogupiyo", "text": "ほんとはね、ぜんぶ ひとつづきなんだ", "dur": 4.0 },
    { "who": "suusuu",   "text": "だから姿勢も呼吸も だいじなんだね", "dur": 4.2 },
    { "who": "mogupiyo", "text": "つづきは ふわふわランドで！", "dur": 3.0 },
    { "who": "cta",      "text": "お口、ぽかんしてない？", "dur": 2.8 }
  ]
}
```

`who` は**正本のキャラID**（`waawaa / suusuu / mogupiyo / tanupei / wanono / ketonyan / rapiko / shinbo / enshouWaawaa / toukaWaawaa / sankaWaawaa`）。短縮別名（`mogu / wawa / suu / keto / touka`）も解決される。

## 自動で決まるもの（書かなくていい）
| 項目 | 解決元 |
|---|---|
| 声のピッチ・ゆらぎ | 正本 `voice.baseHz / pitchJitter` |
| キャラ画像 | 正本 `image`（display/*.png） |
| **セリフ枠の色** | **キャラ画像から自動抽出**（雰囲気の主要色） |
| タイトル配色 | `series`（無ければ`title`）シードで8スタイルから自動。**同シリーズ＝同色** |
| 1人/2人・中央/左右 | 台詞の登場話者数で自動（1人=中央・2人=左右） |
| **背景＋キャラ接地** | **`weather`/`theme`/`topTitle` から内容で自動選択**（雨→雨村, 睡眠/夜→夜, 歯みがき/おうち→室内, 口腔育成/海→海辺, 祭/ブース→お祭り…）。室内/海辺は接地(`characterBaselineY`)も自動で下げる |
| レイアウト（ゴールデン位置） | 既定値（`make_30s` 準拠） |

## 任意フィールド
- `hook`: 冒頭フック。`{ text, durationSec(0.5〜3.0), type }`。**最初の0.5〜2秒に強い一言＋驚き演出**を前出しし、健康は2秒目以降に密輸（実証パターン）。`type` は `mystery / aruaru / motion` 等（台帳の分析軸）。
- `series` / `seriesKey`: シリーズ識別。タイトル配色を揃え、台帳でシリーズ分析に使う。
- `scene`: 背景シーンを明示上書き（`day/morning/dusk/night/rain/cloudy/snow/room/seaside/festival`）。指定すれば天気/テーマ推定より優先。
- `background`: 単一背景を明示（最優先）。`backgrounds`: 配列を渡すとタイトルシードでローテ。**いずれも未指定なら weather/theme から自動選択**。
- `weather` / `theme` / `hookType` / `targetAudience` / `behaviorGoal` 等: 台帳メタ（任意・分析タグ）。
- `characters`: 明示上書き（`img/pitch/color/side` を個別指定したい時のみ）。**通常は不要**。
- `cast: "random"` or `{ "count": 2 }`: 台詞のスロット（A/B等）に正本11体から**シードでランダム配役**（generic回向け）。
- `titleStyle`: 明示固定したい時（`ぷくっと黄色`等）。未指定＝シードランダム。
- `layout`: 既定を上書きしたい時のみ（縦=×H, 横=×W）。
- `eventAnimation`: 演出（`candy-rain / halo-link / care-glow / cheek-balloon …` 計15種）。

## 必須の冒頭フォーマット（台詞）
`lines[0]="おはようございます！"` / `lines[1]="今日のふわふわランドの天気は、、、"` / `lines[2]=…で終わる「○○です！」`。
※ `hook` はこの前に**別レイヤー**で乗る（儀式は様式美として維持しつつ、コールド視聴用フックは hook が担う）。
台詞合計は **30〜60秒**（hook は別計上）。

## コマンド
```bash
python3 shorts/render.py --check  <script.json>      # 検証（JSONレポート）
python3 shorts/render.py --preview <script.json> 7.0 # 7.0秒地点の静止プレビューPNG
python3 shorts/render.py          <script.json>      # 本番書き出し → shorts/out/<title>.mp4
```

## 自動で残る分析データ（台帳）
本番書き出しのたびに自動生成：
- `shorts/out/post-ledger.csv` … 1本=1行。`series / hookType / weather / theme / charCount / characters / speakers / durationSec / titleStyle / background / events` ＋ 空の指標列（`views / avgViewSec / retentionPct / likes / saves / shares / follows`）。
  **投稿後にプラットフォームの数値をこの空列へ手入力**→ タグ別に相関を見る。
- `shorts/out/<title>.meta.json` … その動画の全メタ（台詞含む）。

**分析の進め方**: 最初の30〜50本は探索（外れ値の定性レビュー＋中央値）。多変数の本格分析は100本超＆1変数あたり10本以上たまってから（`05_research-virality.md` 準拠）。早すぎる多変数分析はやらない。
