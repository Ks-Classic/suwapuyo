# 00 — ショート動画スタジオ 現状とTODO（次回ここから）

> 最終更新: 2026-06-27
> 本命の方針: **YourTIMEコンセプト告知 × 集客 × 口腔育成/未病の啓もう**。見る人＝来場見込みの保護者/家族。すーすーわーわー＝かわいい啓もうの案内役。
> 出展者紹介ショート(format A)は**凍結**（コンテンツが育ってから）。木幡(やす)のAI解説キャラは**おまけ**で、ビジュアルは**小夏さんのデザイン待ち**。

## できていること（2026-06-27時点）

**レンダエンジン `shorts/render.py`**（依存=PIL+numpy+ffmpegのみ）
- 正本駆動（`public/content/fuwafuwa-land/character-bible.json` から声/画像を解決）・**色はキャラ画像から自動抽出**
- ゴールデン位置を既定化（縦×H/横×W）・**1人=中央/2人=左右を台本シードで自動**
- **冒頭フック**（hook）・**シリーズ色シード**・**内容(weather/theme)から背景＆接地を自動**（10シーン）
- 素材ゼロのアニメ（喋りスクッシュ・呼吸・背景KenBurns）
- **字幕＝輪郭スタイル**（白文字＋黒フチ＋話者色の外フチ）・文節改行・均等2行・1行〜13字
- **チェックポイント**: `--check`(＋医療広告NG lint) / `--storyboard`(全カット1枚) / `--draft`(半解像度高速) / 本番
- **投稿台帳** `shorts/out/post-ledger.csv` 自動出力

**台本7本**（`public/content/shorts-studio/scripts/yt-001〜007`）
- 全てcraft適用済み（キャラ声・合いの手・へぇ→くすっオチ・標準語・自然なYourTIME CTA）
- 背景は内容から自動（晴れ/雨/くもり/夜）。yt-007=お口ぽかん3割が基準作

**投稿パッケージ** `python3 shorts/package_posts.py`
- `shorts/out/posts/<title>/` に mp4＋caption-{instagram,youtube,tiktok}.txt＋meta.json
- キャプション正本＝`public/content/shorts-studio/captions.json`（キャラのセリフ＋チャネル別ハッシュタグ）

**正本ドキュメント**（`docs/60_shorts-studio/`）
- 03 背景プロンプト / 04 台本仕様 / 05 バズ実証 / 06 生成の脳 / 07 笑い・啓もうcraft（Benign Violation＋共感、へぇネタ14、字幕数値、CTA型、そろ谷の学び）

**ワークフロー（確定）**: 台本生成 → **セリフをテキストで先出し → ユーザーがレビュー/修正 → OKで書き出し** → `--check`/`--storyboard`/`--draft` → 本番 → `package_posts.py` → 投稿。

## TODO（次回）

1. **［保留］Notionカレンダー作成** — Notion MCP認証のコールバックURL待ち（`mcp__notion__authenticate`→URL→ブラウザ許可→`http://localhost:.../callback?code=...`を貼る→`complete_authentication`）。DB案: 投稿日/タイトル/テーマ/キャラ/IG文/YT文/TikTok文/ハッシュタグ/ステータス/動画。JSONは人が触らなくてよくなる。
2. **push** — main がorigin より先行（コミット済み）。`git push origin main`。
3. **5本の本番書き出し＆パッケージ** — セッション中断で止まったら `for f in public/content/shorts-studio/scripts/yt-00[1-5]-*.json; do python3 shorts/render.py "$f"; done && python3 shorts/package_posts.py`。
4. **投稿運用** — まず**1日1本・週5〜7・複数プラットフォーム横展開**（同じ動画をIG/YT/TikTok）。最初の30〜50本は探索（台帳で計測）。2本/日は品質＋ストック確立後。
5. **決め台詞を1個固定**（そろ谷「あるゥ！？」級＝毎回入れるミーム装置）→ 06に固定ルール追記。
6. **自動投稿は半自動を推奨**（Notionで見る→人がトレンド音源足して投稿）。全自動IG APIは①トレンド音源が使えない②医療は監修必須、で時期尚早。
7. **［おまけ・小夏待ち］やすキャラ** — AI/Claude Code/医院AI活用を「かわいくガチ」。保護者ストリームとは別トーン。

## クイック操作
```bash
python3 shorts/render.py --check      <script.json>   # 検証＋医療広告lint
python3 shorts/render.py --storyboard <script.json>   # 全カット1枚（~2秒）
python3 shorts/render.py --draft      <script.json>   # 高速ドラフト（~30秒）
python3 shorts/render.py              <script.json>   # 本番 → shorts/out/<title>.mp4
python3 shorts/package_posts.py                       # out/posts/<title>/ に整理
```
全体地図＝ルート `STRUCTURE.md`。
