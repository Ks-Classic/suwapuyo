# 03 — 背景画像プロンプト集（ふわふわランド画風固定）

> 目的: `village-bg.png` の絵本風カワイイ画風を**固定**したまま、シーン（天気・時間・場所）だけ変える背景セットを量産する。
> 方針: **スタイルは一貫・シーンは変える**（スヌーピー型）。`render.py` の `backgrounds:[...]` でローテ、または「天気」オープニングと連動。
> 大原則: 背景は**AI生成OK**（生成NGはブランドキャラのみ）。生成→Canva微調整。`gpt-image-2` 推奨（日本語可・自然言語に強い）。

## 使い方
最終プロンプト = **STYLE（共通アンカー）** ＋ **SCENE（各シーン）** ＋ **COMPOSITION（共通構図）** ＋ **NEGATIVE（共通除外）**。
- 比率: **縦 9:16（1080×1920）**で生成。生成器が正方形しか出せない場合は正方形でOK（`render.py` が cover で中央クロップする）。
- Midjourney なら末尾に `--ar 9:16 --style raw`、gpt-image-2 / DALL·E は自然文のまま貼る。

---

## STYLE（共通アンカー・毎回先頭に貼る）

```
Soft storybook children's-picture-book illustration, kawaii Japanese style.
Gentle pastel palette, light cel-shading with soft smooth gradients, clean rounded
soft-colored outlines (no harsh black lines), flat friendly shapes, hand-drawn warmth.
Cheerful, cozy, wholesome fairy-tale village called "Fuwafuwa Land": soft rolling green
hills, rounded fluffy trees with light dappled highlights, tiny multicolored wildflowers,
pastel-roofed cottages, fluffy white clouds. Smooth flat colors, subtle gentle texture,
even soft lighting.
```

## COMPOSITION（共通構図・毎回貼る／キャラと字幕の安全域を空ける）

```
Vertical 9:16 composition. Horizon in the upper third. Keep the LOWER-CENTER area open,
calm and uncluttered (smooth grassy ground or soft floor) so a character can stand there
and a rounded speech bubble can overlay clearly. Place detailed scenery (village, trees)
to the sides and far background, never in the center. Low contrast and gentle detail in
the lower half. Leave the very top calm (a title logo will sit there).
```

## NEGATIVE（共通除外・対応生成器では negative 欄へ／非対応なら本文末に併記）

```
no text, no letters, no words, no logos, no watermark, no signature;
no characters, no people, no animals, no mascots, no faces;
not photorealistic, no 3D render, no CGI, no harsh black outlines, no heavy dark shadows,
no busy clutter, no high-contrast detail in the center or lower third, no lens flare,
no realistic harsh lighting, no frame, no border.
```

---

## SCENE 群（回転セット）

### A. 晴れ・昼（村）★基準
```
Sunny midday over the rolling-hills village. Bright clear light-blue sky, fluffy white
clouds, a soft warm round sun. Fresh vivid-green meadow dotted with tiny pink, blue,
yellow and white flowers, a gentle dirt path winding into the distance, pastel-roofed
cottages nestled among rounded trees in the mid-distance. Bright, happy, welcoming.
```

### B. 朝（あさ・やわらかい光）
```
Early morning over the village. Pale gold-and-mint dawn sky with soft low light, a thin
glow on the horizon, dew on the fresh-green meadow, gentle long soft shadows, a calm quiet
"good morning" mood, pastel cottages just waking up. Tender and fresh.
```

### C. 夕方（ゆうがた・ゴールデンアワー）
```
Golden-hour dusk over the village. Warm peach-and-lavender gradient sky, soft long warm
light, a few early twinkling stars appearing, cottage windows beginning to glow softly
warm yellow, the meadow bathed in gentle warm tones. Calm, nostalgic, cozy.
```

### D. 夜（よる・星空）※睡眠・呼吸・夜じかん回
```
Gentle sleepy night over the village. Deep soft-blue starry sky with a calm round moon and
scattered tiny stars, a few glowing firefly dots drifting, cottage windows glowing warm
yellow, the meadow in cool moonlit blues. Very calm, soothing, ready-for-bed mood.
```

### E. 雨（あめ）※「天気は…雨です！」回・血糖/だらだら回
```
Soft rainy day over the village. Gentle grey-blue overcast sky, delicate light rain falling
(soft, not stormy), small puddles reflecting the pastel cottages, dewy fresh-green meadow,
cozy calm mood, cottage windows glowing softly. Quiet and gentle, never gloomy.
```

### F. くもり（くもり・中立デフォルト）
```
Soft overcast day over the village. Pale milky-white sky, diffused even soft light, calm
muted-pastel green meadow and pastel cottages, gentle and quiet atmosphere. Peaceful,
low-key, soothing.
```

### G. おうち・室内（あたたかい）※歯みがき・就寝・おうち習慣回
```
Cozy warm storybook indoor room. Soft wooden floor, a round pastel rug, a big round window
showing the green meadow and pastel village outside, warm lamp light, a few plush soft
furnishings to the sides. Keep the lower-center floor open and uncluttered. Snug, safe,
homey, gentle.
```

### H. 海辺・水辺（うみべ）※もぐぴよ・海っぽい回（任意）
```
Gentle pastel seaside of Fuwafuwa Land. Soft turquoise shallow water with rounded little
waves, a light sandy shore, fluffy white clouds, a soft warm sun, tiny shells and pastel
beach flowers to the sides. Bright, airy, calm.
```

### I. お祭り・YourTIMEブース（イベント・任意）
```
Soft storybook festival corner of the village. Gentle pastel bunting flags strung overhead,
warm round paper lanterns, a cozy welcoming wooden booth to the side, soft evening glow,
inviting and heartwarming. Keep the center open and calm.
```

### J. 雪（ゆき・任意）
```
Soft snowy day over the village. Pale powder-blue sky, gentle large snowflakes falling,
snow-dusted rounded trees and pastel-roofed cottages, a calm white meadow, warm cozy
cottage-window glow. Calm, hushed, cozy-despite-the-cold.
```

---

## 天気オープニング → 背景の対応（演出として意味を持たせる）

| オープニングの天気 | 背景シーン |
|---|---|
| はれ | A 晴れ・昼（or B 朝） |
| あめ | E 雨 |
| くもり | F くもり |
| ゆき | J 雪 |
| （夜・睡眠テーマ） | D 夜 |
| （歯みがき・就寝・おうちテーマ） | G 室内 |
| （海・口腔育成・もぐぴよ） | H 海辺 |

**自動切替（実装済）**: 背景を何も指定しなければ、`render.py` が `weather`/`theme`/`topTitle` から
シーンを**内容で自動選択**する（上表の対応）。室内/海辺は接地も自動調整。
明示したい時だけ `"scene":"night"` か `"background":"...png"`、ローテは `"backgrounds":[...]`。

## 生成済み背景ファイル（実体・2026-06-26）
`public/content/fuwafuwa-land/backgrounds/` に10枚（941×1672≈9:16）。

| シーン | ファイル | 天気/用途 | 接地の微調整（layout.characterBaselineY） |
|---|---|---|---|
| A 晴れ昼 ★既定 | `village-day.png` | はれ | 既定 0.66 でOK |
| B 朝 | `village-morning.png` | 朝・あさ回 | 既定でOK |
| C 夕方 | `village-dusk.png` | 夕方 | 既定でOK |
| D 夜 | `village-night.png` | 夜・睡眠・呼吸 | 既定でOK |
| E 雨 | `village-rain.png` | あめ・血糖回 | 既定でOK |
| F くもり | `village-cloudy.png` | くもり・中立 | 既定でOK |
| G 室内 | `room-cozy.png` | 歯みがき・就寝・おうち | **要調整 ~0.74**（床に立たせる） |
| H 海辺 | `seaside.png` | もぐぴよ・口腔育成 | **要調整 ~0.72**（砂浜に立たせる） |
| I お祭り | `festival.png` | YourTIMEブース・イベント | 既定〜0.70 |
| J 雪 | `village-snow.png` | ゆき | 既定でOK |

※ 既定 `background` は `village-day.png`（旧 `village-bg.png` 640×640 は低解像のため非推奨）。
※ 屋外シーンは横一線の地面で既定0.66が合うが、**室内/海辺は地面ラインが違う**ため `"layout":{"characterBaselineY":0.74}` 等で各シーン微調整する。

## 運用メモ
- まず **A/C/D/E/F の5枚**を生成（昼・夕・夜・雨・くもり）。これで「シーンが変わる」を最小コストで実現。
- 生成後 Canva で、必要なら**下1/3をほんの少しだけ落ち着かせる**（白い吹き出しの視認性確保。ただし `render.py` の字幕は枠付き白箱なので大抵不要）。
- 1枚できたら必ず**実機プレビュー**（`python3 shorts/render.py --preview <script> <秒>`）でタイトル/キャラ/字幕の安全域を確認してから量産に回す。
- 画風がブレたら、STYLE ブロックをそのまま固定し、SCENE だけ差し替える（プロンプトの順序も変えない）。
