#!/usr/bin/env python3
"""
すーすーわーわー ショート量産レンダラ
PIL + numpy + ffmpeg のみ（ブラウザ不要・ヘッドレス・追加pip不要）。
script.json を差し替えるだけで新作 = 量産の背骨。

レイヤー: 背景 / キャラ(bob+喋りhop) / 上部タイトル+常設イラスト / 字幕(話者色) / 音(animalese+BGM)

使い方:  python3 shorts/render.py
出力:    shorts/out/<title>.mp4   （音声つき最終）
依存:    Pillow, numpy, ffmpeg(PATH), Noto CJK フォント
"""
import json, math, os, subprocess, sys, unicodedata, wave, random
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100
random.seed(7)  # 再現性（量産で毎回同じ音に）

def repo(p): return os.path.join(ROOT, p)

def resolve(path):
    """Unicode正規化差(NFC/NFD)や和名を吸収。完全→正規化→番号prefix の順。"""
    full = repo(path)
    if os.path.exists(full): return full
    d, base = os.path.dirname(full), os.path.basename(full)
    if os.path.isdir(d):
        norm = unicodedata.normalize("NFC", base)
        for f in os.listdir(d):
            if unicodedata.normalize("NFC", f) == norm: return os.path.join(d, f)
        pre = base.split("_")[0]
        if pre and pre != base:
            for f in sorted(os.listdir(d)):
                if f.startswith(pre + "_"): return os.path.join(d, f)
    raise FileNotFoundError(path)

def load_rgba(path): return Image.open(resolve(path)).convert("RGBA")

def find_font():
    for q in ["Noto Sans CJK JP:bold", "Noto Sans CJK JP", "Noto Serif CJK JP:bold"]:
        try:
            f = subprocess.check_output(["fc-match", "-f", "%{file}", q], text=True).strip()
            if f and os.path.exists(f): return f
        except Exception: pass
    sys.exit("日本語フォントが見つかりません")

def cover(img, w, h):
    iw, ih = img.size; s = max(w / iw, h / ih)
    img = img.resize((int(iw * s), int(ih * s)), Image.LANCZOS)
    x = (img.width - w) // 2; y = (img.height - h) // 2
    return img.crop((x, y, x + w, y + h))

def scale_to_h(img, th):
    s = th / img.height
    return img.resize((max(1, int(img.width * s)), th), Image.LANCZOS)

# ---------- 音声 ----------
def synth_blip(freq, dur, chirp=1.18):
    """立ち上がりで少しピッチが上がる＝ピロッとした効果音。"""
    n = int(SR * dur); t = np.arange(n) / SR
    inst = freq * (1 + (chirp - 1) * (t / dur))
    ph = 2 * np.pi * np.cumsum(inst) / SR
    wave_ = 0.7 * np.sin(ph) + 0.3 * np.sin(2 * ph)
    env = np.clip(np.minimum(t / 0.004, (dur - t) / 0.02), 0, 1)  # 速い attack/decay
    return (wave_ * env).astype(np.float32)

def animalese(text, base, dur):
    """字幕の文字数だけ高速ピロピロ＝すーすーわーわー語。"""
    out = np.zeros(int(SR * dur), np.float32)
    kana = [c for c in text if c not in "、。！？ 　"]
    n = min(len(kana), 16)
    if n == 0: return out
    span = min(dur * 0.8, n * 0.075)        # 高速・密
    step = span / n
    for i in range(n):
        f = base * random.uniform(0.92, 1.12)
        blip = synth_blip(f, 0.05)          # 短い＝ピロピロ
        s = int(i * step * SR); e = min(len(out), s + len(blip))
        out[s:e] += blip[:e - s]
    return out * 0.85

def bgm_bed(total):
    """明るい・著作権フリー（自前生成）。I-V-vi-IV パッド＋きらきらアルペジオ。"""
    chords = [[261.63, 329.63, 392.00], [392.00, 493.88, 587.33],
              [440.00, 523.25, 659.25], [349.23, 440.00, 523.25]]
    clen = 2.6                               # 速め＝明るい
    N = int(SR * total)
    pad = np.zeros(N, np.float32); arp = np.zeros(N, np.float32)
    pos = 0.0; ci = 0
    while pos < total:
        ch = chords[ci % len(chords)]; ci += 1
        n = int(SR * clen); t = np.arange(n) / SR; s = int(pos * SR)
        seg = sum(np.sin(2 * np.pi * f * t) for f in ch) / len(ch)   # オクターブ下げない＝明るい
        env = np.clip(np.minimum(t / 0.3, (clen - t) / 0.5), 0, 1)
        e = min(N, s + n); pad[s:e] += (seg * env).astype(np.float32)[:e - s]
        notes = [ch[0] * 2, ch[1] * 2, ch[2] * 2, ch[1] * 2]         # 1oct上の8分＝きらきら
        nl = clen / len(notes)
        for j, f in enumerate(notes):
            ns = s + int(j * nl * SR)
            if ns >= N: break
            nn = int(nl * SR); tt = np.arange(nn) / SR
            bell = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 6)
            ee = min(N, ns + nn); arp[ns:ee] += bell[:ee - ns].astype(np.float32)
        pos += clen
    return pad * 0.15 + arp * 0.11

def write_wav(path, audio):
    a16 = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(a16.tobytes())

# ---------- 描画 ----------
def draw_title(canvas, text, font, cx, cy, rot=-3):
    """アニメロゴ風ステッカー（二重アウトライン＋影＋傾き）。セリフ帯とは別物。"""
    tmp = Image.new("RGBA", (canvas.width, 360), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    tb = d.textbbox((0, 0), text, font=font, stroke_width=20)
    tw = tb[2] - tb[0]; ox = (tmp.width - tw) // 2 - tb[0]; oy = 60 - tb[1]
    d.text((ox + 6, oy + 9), text, font=font, fill=(20, 30, 40, 90), stroke_width=20, stroke_fill=(20, 30, 40, 90))  # 影
    d.text((ox, oy), text, font=font, fill=(23, 50, 77, 255), stroke_width=20, stroke_fill=(23, 50, 77, 255))        # 外（濃紺）
    d.text((ox, oy), text, font=font, fill=(255, 255, 255, 255), stroke_width=11, stroke_fill=(255, 255, 255, 255))  # 白
    d.text((ox, oy), text, font=font, fill=(255, 140, 66, 255))                                                      # 中身（オレンジ）
    tmp = tmp.rotate(rot, resample=Image.BICUBIC, expand=True)
    canvas.alpha_composite(tmp, (int(cx - tmp.width / 2), int(cy - tmp.height / 2)))
    return canvas

def rounded_caption(canvas, text, font, cx, cy, border, fill, pop):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    tb = d.textbbox((0, 0), text, font=font); tw, th = tb[2] - tb[0], tb[3] - tb[1]
    pad = 34; x = int(cx - tw / 2); y = int(cy - (1 - pop) * 24)
    d.rounded_rectangle([x - pad, y - pad, x + tw + pad, y + th + pad],
                        radius=28, fill=fill, outline=border + (255,), width=7)
    d.text((x - tb[0], y - tb[1]), text, font=font, fill=(31, 41, 55, 255))
    if pop < 1.0:
        arr = np.array(layer); arr[..., 3] = (arr[..., 3] * pop).astype(np.uint8)
        layer = Image.fromarray(arr, "RGBA")
    return Image.alpha_composite(canvas, layer)

def main():
    spec = json.load(open(os.path.join(HERE, "script.json"), encoding="utf-8"))
    W, H = spec["size"]; FPS = spec["fps"]; title = spec["title"]
    fp = find_font()
    f_sub = ImageFont.truetype(fp, 64); f_cta = ImageFont.truetype(fp, 96); f_title = ImageFont.truetype(fp, 112)

    bg = cover(load_rgba(spec["background"]), W, H)
    top_illust = scale_to_h(load_rgba(spec["topIllust"]), 150) if spec.get("topIllust") else None

    chars = {}
    ch_h = int(H * 0.34)  # 少し小さく
    for k, c in spec["characters"].items():
        chars[k] = {"img": scale_to_h(load_rgba(c["img"]), ch_h),
                    "cx": int(W * (0.26 if c["side"] == "left" else 0.74)),
                    "side": c["side"], "color": tuple(c["color"]), "pitch": c["pitch"]}
    base_bottom = int(H * 0.62)  # 足元を上げてセーフゾーン確保

    lines = spec["lines"]; starts = []; t = 0.0
    for ln in lines: starts.append(t); t += ln["dur"]
    total = t; nframes = int(total * FPS)

    out_dir = os.path.join(HERE, "out"); os.makedirs(out_dir, exist_ok=True)
    vid_tmp = os.path.join(out_dir, "_video.mp4")
    wav_tmp = os.path.join(out_dir, "_audio.wav")
    final = os.path.join(out_dir, f"{title}.mp4")

    # --- 音声トラック ---
    aud = bgm_bed(total) if spec.get("audio", {}).get("bgm") else np.zeros(int(SR * total), np.float32)
    if spec.get("audio", {}).get("animalese"):
        for i, ln in enumerate(lines):
            if ln["who"] == "cta": continue
            voice = animalese(ln["text"], chars[ln["who"]]["pitch"], ln["dur"])
            s = int(starts[i] * SR); e = min(len(aud), s + len(voice))
            aud[s:e] += voice[:e - s]
    write_wav(wav_tmp, aud)

    # --- 映像 ---
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", vid_tmp],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def cur(tsec):
        for i in range(len(lines) - 1, -1, -1):
            if tsec >= starts[i]: return i
        return 0

    for fme in range(nframes):
        tsec = fme / FPS; canvas = bg.copy()
        li = cur(tsec); ln = lines[li]; t_in = tsec - starts[li]; who = ln["who"]
        # キャラ
        for k, ch in chars.items():
            bob = math.sin(tsec * 2.2 + (0 if ch["side"] == "left" else math.pi)) * 14
            hop = -abs(math.sin(t_in * 7.5)) * 34 if k == who else 0.0
            img = ch["img"]; x = ch["cx"] - img.width // 2
            canvas.alpha_composite(img, (x, int(base_bottom - img.height + bob + hop)))
        # 上部タイトル（常設・アニメロゴ風）＋イラスト
        tbob = int(math.sin(tsec * 2.0) * 6)
        if top_illust is not None:
            canvas.alpha_composite(top_illust, (40, int(H * 0.10) + tbob))
        if spec.get("topTitle"):
            canvas = draw_title(canvas, spec["topTitle"], f_title, W // 2, int(H * 0.135) + tbob)
        # 字幕（話者色）
        is_cta = who == "cta"
        col = tuple(spec["cta"]["color"]) if is_cta else chars[who]["color"]
        fill = (255, 247, 214, 240) if is_cta else (255, 255, 255, 240)
        fnt = f_cta if is_cta else f_sub
        cy = int(H * (0.43 if is_cta else 0.69))   # 字幕は下UIを避けた安全帯へ
        pop = min(1.0, t_in / 0.18)
        canvas = rounded_caption(canvas, ln["text"], fnt, W // 2, cy, col, fill, pop)

        if spec.get("debugSafezone"):
            ov = Image.new("RGBA", canvas.size, (0, 0, 0, 0)); dd = ImageDraw.Draw(ov)
            dd.rectangle([0, 0, W, int(H * 0.06)], fill=(255, 0, 0, 70))                       # 上UI
            dd.rectangle([0, int(H * 0.78), W, H], fill=(255, 0, 0, 80))                       # 下キャプション/ナビ
            dd.rectangle([int(W * 0.86), int(H * 0.30), W, int(H * 0.86)], fill=(255, 0, 0, 60))  # 右ボタン
            canvas = Image.alpha_composite(canvas, ov)

        ff.stdin.write(canvas.tobytes())
        if fme % 90 == 0: print(f"  frame {fme}/{nframes}", flush=True)
    ff.stdin.close(); ff.wait()

    # --- 音と映像を結合 ---
    subprocess.run(["ffmpeg", "-y", "-i", vid_tmp, "-i", wav_tmp,
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    "-movflags", "+faststart", final],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    for p in (vid_tmp, wav_tmp):
        try: os.remove(p)
        except OSError: pass
    print(f"✓ done: {final}  ({total:.1f}s, {nframes} frames, 音声つき)")

if __name__ == "__main__":
    main()
