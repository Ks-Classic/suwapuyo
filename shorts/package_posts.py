#!/usr/bin/env python3
"""shorts/out を「投稿パッケージ」構造に整理する。

  out/posts/<title>/  … 完パケ（人が触る所）
      <title>.mp4                          投稿する動画（フル画質）
      caption-instagram.txt / -youtube.txt / -tiktok.txt   キャプション＋ハッシュタグ（チャネル別・キャラのセリフ）
      meta.json                            動画メタ（テーマ/キャラ/尺）
  out/_work/          … preview/draft/storyboard（確認用・捨ててOK）
  out/post-ledger.csv … 台帳（据え置き）

キャプション正本: public/content/03_ショート動画/02_キャプション/01_投稿キャプション.json
使い方: python3 shorts/package_posts.py   （本番書き出しの後に実行）
"""
import glob, json, os, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "shorts", "out")
CAP = json.load(open(os.path.join(ROOT, "public/content/03_ショート動画/02_キャプション/01_投稿キャプション.json"), encoding="utf-8"))
HASHTAGS = CAP.get("_hashtags", {})
CHANNELS = ["instagram", "youtube", "tiktok"]

def caption_text(title, ch):
    body = (CAP.get(title) or {}).get(ch, "")
    tags = " ".join(HASHTAGS.get(ch, []))
    return (body + "\n\n" + tags).strip() + "\n"

def main():
    posts = os.path.join(OUT, "posts"); work = os.path.join(OUT, "_work")
    os.makedirs(posts, exist_ok=True); os.makedirs(work, exist_ok=True)
    # 確認用（preview/draft/storyboard）→ _work へ退避
    for pat in ("*_preview_*.png", "*_draft.mp4", "*_storyboard.png"):
        for f in glob.glob(os.path.join(OUT, pat)):
            shutil.move(f, os.path.join(work, os.path.basename(f)))
    # 完パケ mp4 → posts/<title>/（captions.json にある作品だけ）＋キャプション3種＋meta
    packaged = []
    for mp4 in glob.glob(os.path.join(OUT, "*.mp4")):
        title = os.path.splitext(os.path.basename(mp4))[0]
        if title not in CAP:                      # 未知/旧mp4はそのまま残す
            continue
        d = os.path.join(posts, title); os.makedirs(d, exist_ok=True)
        shutil.move(mp4, os.path.join(d, os.path.basename(mp4)))
        meta = os.path.join(OUT, title + ".meta.json")
        if os.path.exists(meta):
            shutil.move(meta, os.path.join(d, "meta.json"))
        for ch in CHANNELS:
            with open(os.path.join(d, f"caption-{ch}.txt"), "w", encoding="utf-8") as f:
                f.write(caption_text(title, ch))
        packaged.append(title)
    with open(os.path.join(OUT, "README.md"), "w", encoding="utf-8") as f:
        f.write(
            "# shorts/out — 出力ガイド\n\n"
            "- `posts/<title>/` … 投稿パッケージ（ここを人が触る）\n"
            "  - `<title>.mp4` 投稿用フル画質動画\n"
            "  - `caption-instagram.txt` / `-youtube.txt` / `-tiktok.txt` キャプション＋ハッシュタグ（チャネル別・キャラのセリフ）\n"
            "  - `meta.json` 動画メタ\n"
            "- `_work/` … preview/draft/storyboard（確認用・捨ててOK）\n"
            "- `post-ledger.csv` … 全投稿の台帳（投稿後に指標を手入力）\n\n"
            "※ このフォルダは .gitignore（再生成可能）。キャプション正本は `public/content/03_ショート動画/02_キャプション/01_投稿キャプション.json`。\n"
        )
    print(f"packaged {len(packaged)} posts -> {posts}")
    for t in sorted(packaged):
        print("  -", t)

if __name__ == "__main__":
    main()
