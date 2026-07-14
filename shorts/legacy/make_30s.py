#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ふわふわランド わーわー 30秒回 動画ジェネレータ
背景 + わーわー(ぴょこぴょこ/口パク風squash) + 字幕同期 + キャンディ雨 + ピロピロ音声 → mp4
依存: Pillow, numpy, ffmpeg, Noto Sans CJK JP
"""
import os, sys, math, wave, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
BG_PATH   = os.path.join(ROOT, "public/content/01_すわぷよ/03_背景/01_村_昼.png")
CHAR_PATH = os.path.join(ROOT, "public/content/01_すわぷよ/01_キャラクター/01_原本/02_わーわー.png")
FONT_PATH = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
OUT_MP4   = os.path.join(os.path.dirname(__file__), "waawaa_30s.mp4")

W, H, FPS = 1080, 1920, 30
DUR = 30.0
SR = 44100
rng = np.random.default_rng(7)

# ---------- 字幕タイムライン (start, end, text) ----------
# weather=Trueのキューでキャンディ雨開始
CUES = [
    (0.0, 1.8,  "みなさん、おはようございます！"),
    (1.8, 3.4,  "きょうの おてんきは……"),
    (3.4, 5.2,  "……あめ、です！"),                       # ← 天気: キャンディ雨
    (5.2, 6.6,  "わーい！"),
    (6.6, 9.2,  "ねえ、みんな。きみは さんすう、すき？ とくい？"),
    (9.2, 12.2, "にがてでも『100てん とろうね』って おうえん されるよね。"),
    (12.2,14.4, "でもね……にがてな さんすうを、"),
    (14.4,18.2, "ずーっと がんばってる人も、おおいらしいよ？"),
    (18.2,21.2, "やりたくも ないのに……。ちょっと ふしぎだよね？"),
    (21.2,24.2, "ほんとうに たいせつなもの、おしえるね。"),
    (24.2,27.4, "つづきは、ふわふわランドで！"),
    (27.4,30.0, "あ、はみがきして まっててね。ばいばーい！"),
]
WEATHER_T = 3.4  # キャンディ雨開始
TITLE = "AIってなんだろー？"  # 上部タイトル(一覧クロップに収まる位置に描画)

# ---------- 音声: shorts/render.py (oguchi-de-asobo) と同一の合成 ----------
import random
random.seed(7)               # 再現性（毎回同じ音）
WAAWAA_PITCH = 920           # わーわー（shorts/script.json と同一）

def synth_blip(freq, dur, chirp=1.18):
    """立ち上がりで少しピッチが上がる＝ピロッとした効果音。"""
    n = int(SR * dur); t = np.arange(n) / SR
    inst = freq * (1 + (chirp - 1) * (t / dur))
    ph = 2 * np.pi * np.cumsum(inst) / SR
    wave_ = 0.7 * np.sin(ph) + 0.3 * np.sin(2 * ph)
    env = np.clip(np.minimum(t / 0.004, (dur - t) / 0.02), 0, 1)
    return (wave_ * env).astype(np.float32)

def animalese(text, base, dur):
    """字幕の文字数だけ高速ピロピロ＝すーすーわーわー語。"""
    out = np.zeros(int(SR * dur), np.float32)
    kana = [c for c in text if c not in "、。！？ 　"]
    n = min(len(kana), 16)
    if n == 0: return out
    span = min(dur * 0.8, n * 0.075)
    step = span / n
    for i in range(n):
        f = base * random.uniform(0.92, 1.12)
        blip = synth_blip(f, 0.05)
        s = int(i * step * SR); e = min(len(out), s + len(blip))
        out[s:e] += blip[:e - s]
    return out * 0.85

def bgm_bed(total):
    """明るい著作権フリー（自前生成）。I-V-vi-IV パッド＋きらきらアルペジオ。"""
    chords = [[261.63, 329.63, 392.00], [392.00, 493.88, 587.33],
              [440.00, 523.25, 659.25], [349.23, 440.00, 523.25]]
    clen = 2.6
    N = int(SR * total)
    pad = np.zeros(N, np.float32); arp = np.zeros(N, np.float32)
    pos = 0.0; ci = 0
    while pos < total:
        ch = chords[ci % len(chords)]; ci += 1
        n = int(SR * clen); t = np.arange(n) / SR; s = int(pos * SR)
        seg = sum(np.sin(2 * np.pi * f * t) for f in ch) / len(ch)
        env = np.clip(np.minimum(t / 0.3, (clen - t) / 0.5), 0, 1)
        e = min(N, s + n); pad[s:e] += (seg * env).astype(np.float32)[:e - s]
        notes = [ch[0] * 2, ch[1] * 2, ch[2] * 2, ch[1] * 2]
        nl = clen / len(notes)
        for j, f in enumerate(notes):
            ns = s + int(j * nl * SR)
            if ns >= N: break
            nn = int(nl * SR); tt = np.arange(nn) / SR
            bell = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 6)
            ee = min(N, ns + nn); arp[ns:ee] += bell[:ee - ns].astype(np.float32)
        pos += clen
    return pad * 0.15 + arp * 0.11

def synth_audio():
    total = DUR
    aud = bgm_bed(total)                       # BGMベッド（oguchiと同一）
    for (s, e, text) in CUES:                  # 各字幕の頭でアニマリーズ
        voice = animalese(text, WAAWAA_PITCH, e - s)
        i0 = int(s * SR); i1 = min(len(aud), i0 + len(voice))
        aud[i0:i1] += voice[:i1 - i0]
    aud = np.clip(aud, -1, 1)
    pcm = (aud * 32767).astype(np.int16)
    wav_path = os.path.join(tempfile.gettempdir(), "waawaa_30s.wav")
    with wave.open(wav_path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return wav_path

# ---------- 背景: cover-scale 640→1080x1920 ----------
def make_bg():
    bg = Image.open(BG_PATH).convert("RGB")
    bw, bh = bg.size
    sc = max(W / bw, H / bh)
    bg = bg.resize((int(bw*sc), int(bh*sc)), Image.LANCZOS)
    x = (bg.width - W)//2; y = (bg.height - H)//2
    bg = bg.crop((x, y, x+W, y+H))
    # 下部に字幕用の暗グラデ
    grad = Image.new("L", (1, H), 0)
    for yy in range(H):
        v = 0
        if yy > H*0.62:
            v = int(150 * (yy - H*0.62) / (H*0.38))
        grad.putpixel((0, yy), min(v, 150))
    grad = grad.resize((W, H))
    dark = Image.new("RGB", (W, H), (10, 30, 45))
    bg = Image.composite(dark, bg, grad)
    return bg.convert("RGBA")

# ---------- わーわー: ベース縮小 ----------
def make_char():
    ch = Image.open(CHAR_PATH).convert("RGBA")
    target_w = 560
    sc = target_w / ch.width
    ch = ch.resize((target_w, int(ch.height*sc)), Image.LANCZOS)
    return ch

FONT_TITLE= ImageFont.truetype(FONT_PATH, 86, index=2)   # index2 = JP
FONT_BODY = ImageFont.truetype(FONT_PATH, 58, index=2)
FONT_SMALL= ImageFont.truetype(FONT_PATH, 44, index=2)

# 字幕折り返しルール: スペース/句読点でだけ改行（語の途中で切らない）
BREAK_AFTER = "　 、。！？・…"
def wrap_jp(draw, text, font, maxw):
    tokens, cur = [], ""
    for ch in text:
        cur += ch
        if ch in BREAK_AFTER:
            tokens.append(cur); cur = ""
    if cur:
        tokens.append(cur)
    lines, line = [], ""
    for tk in tokens:
        cand = line + tk
        if draw.textlength(cand.strip(), font=font) > maxw and line.strip():
            lines.append(line.strip()); line = tk
        else:
            line = cand
    if line.strip():
        lines.append(line.strip())
    return lines

def draw_subtitle(base, text, alpha):
    if not text: return base
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(layer)
    font = FONT_BODY if len(text) <= 22 else FONT_SMALL
    lines = wrap_jp(d, text, font, W-150)
    lh = font.size + 18
    total_h = lh*len(lines)
    y0 = 1330 - total_h//2   # 安全域(下UIに被らない・一覧クロップ内)
    for li, line in enumerate(lines):
        tw = d.textlength(line, font=font)
        x = (W - tw)//2
        y = y0 + li*lh
        # 縁取り
        for dx in (-3,-2,0,2,3):
            for dy in (-3,-2,0,2,3):
                d.text((x+dx, y+dy), line, font=font, fill=(15,40,55,alpha))
        d.text((x, y), line, font=font, fill=(255,255,255,alpha))
    return Image.alpha_composite(base, layer)

# ---------- キャンディ(袋に包まれた飴) ----------
CANDY_COLORS = [(255,120,160),(255,205,80),(120,225,200),(255,150,100),(170,160,255),(255,170,210)]

def make_candy_sprite(color, size, angle):
    pad = int(size*2.2); s = pad*2
    tile = Image.new("RGBA",(s,s),(0,0,0,0))
    d = ImageDraw.Draw(tile)
    cx=cy=pad
    bw, bh = size*1.25, size*0.9
    dark  = tuple(max(0,int(c*0.78)) for c in color)
    # 包み(両端の三角フリル)
    d.polygon([(cx-bw*1.7, cy-bh*0.95),(cx-bw*0.35,cy),(cx-bw*1.7,cy+bh*0.95)], fill=dark+(255,))
    d.polygon([(cx+bw*1.7, cy-bh*0.95),(cx+bw*0.35,cy),(cx+bw*1.7,cy+bh*0.95)], fill=dark+(255,))
    # 包みのねじれ線
    d.line([(cx-bw*0.9,cy-bh*0.4),(cx-bw*1.5,cy-bh*0.7)], fill=(255,255,255,120), width=max(2,int(size*0.10)))
    d.line([(cx+bw*0.9,cy-bh*0.4),(cx+bw*1.5,cy-bh*0.7)], fill=(255,255,255,120), width=max(2,int(size*0.10)))
    # 本体(つやのある飴玉)
    d.ellipse([cx-bw, cy-bh, cx+bw, cy+bh], fill=color+(255,))
    d.ellipse([cx-bw, cy-bh, cx+bw, cy+bh], outline=dark+(255,), width=max(2,int(size*0.10)))
    # ハイライト
    d.ellipse([cx-bw*0.55, cy-bh*0.62, cx-bw*0.02, cy-bh*0.05], fill=(255,255,255,170))
    if angle:
        tile = tile.rotate(angle, resample=Image.BICUBIC, expand=False)
    return tile

NCANDY = 52
candy = []
for i in range(NCANDY):
    col = CANDY_COLORS[int(rng.integers(0,len(CANDY_COLORS)))]
    size = float(rng.uniform(17, 27))
    angle = float(rng.uniform(0, 360))
    candy.append(dict(
        x=float(rng.uniform(0, W)), y0=float(rng.uniform(-H*1.3, -40)),
        spd=float(rng.uniform(240, 430)),
        sway=float(rng.uniform(0.5, 1.6)), ph=float(rng.uniform(0, 6.28)),
        spr=make_candy_sprite(col, size, angle),
    ))

def draw_candy(base, t):
    if t < WEATHER_T: return base
    age = t - WEATHER_T
    intensity = 1.0 if age < 4.6 else max(0.45, 1.0 - (age-4.6)/5.0)  # 強→弱(0.45で持続)
    active = int(NCANDY * intensity)
    for c in candy[:active]:
        yy = (c["y0"] + age*c["spd"]) % (H+260) - 60
        xx = c["x"] + math.sin(age*c["sway"]+c["ph"])*30
        spr = c["spr"]
        base.alpha_composite(spr, (int(xx-spr.width/2), int(yy-spr.height/2)))
    return base

def speaking_at(t):
    for (s,e,txt) in CUES:
        if s <= t < e and txt not in ("わーい！",):
            return True
    return False

def cue_at(t):
    for (s,e,txt) in CUES:
        if s <= t < e:
            a = min(1.0, (t-s)/0.18)  # フェードイン
            return txt, int(255*a)
    return "", 0

def main():
    print("audio...")
    wav = synth_audio()
    print("bg/char...")
    bg = make_bg()
    char = make_char()

    cmd = ["ffmpeg","-y","-f","rawvideo","-pixel_format","rgba",
           "-video_size", f"{W}x{H}","-framerate",str(FPS),"-i","pipe:0",
           "-i", wav, "-c:v","libx264","-pix_fmt","yuv420p","-preset","medium",
           "-crf","20","-c:a","aac","-b:a","160k","-shortest","-movflags","+faststart", OUT_MP4]
    print("ffmpeg encode...")
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)

    nframes = int(DUR*FPS)
    base_y = 660   # わーわーを画面中央へ(一覧クロップの真ん中に来る)
    for f in range(nframes):
        t = f/FPS
        frame = bg.copy()
        frame = draw_candy(frame, t)
        # わーわー: ベースbob + 天気ホップ + 口パクsquash
        bob = math.sin(t*2*math.pi/1.3)*16
        hop = 0
        if WEATHER_T <= t < WEATHER_T+2.6:
            hop = -abs(math.sin((t-WEATHER_T)*2*math.pi/0.5))*80
        talk = 0.0
        if speaking_at(t):
            talk = (math.sin(t*2*math.pi*7.5)*0.5+0.5)*0.06
        cw = char.width; chh = char.height
        sx = 1.0 + talk*0.5
        sy = 1.0 - talk
        cimg = char.resize((max(1,int(cw*sx)), max(1,int(chh*sy))), Image.BILINEAR)
        cx = (W - cimg.width)//2
        cy = int(base_y + bob + hop) - (cimg.height - chh)
        frame.alpha_composite(cimg, (cx, cy))
        # 字幕
        txt, alpha = cue_at(t)
        frame = draw_subtitle(frame, txt, alpha)
        # タイトル(上部・安全域)
        d = ImageDraw.Draw(frame)
        title = TITLE
        tw = d.textlength(title, font=FONT_TITLE)
        d.text(((W-tw)//2, 470), title, font=FONT_TITLE, fill=(255,255,255,255),
               stroke_width=7, stroke_fill=(15,118,110,255))
        tag = "ふわふわランド｜わーわー"
        tw2 = d.textlength(tag, font=FONT_SMALL)
        d.text(((W-tw2)//2, 583), tag, font=FONT_SMALL, fill=(255,255,255,235),
               stroke_width=4, stroke_fill=(15,118,110,255))
        p.stdin.write(frame.convert("RGBA").tobytes())
        if f % 60 == 0:
            print(f"  frame {f}/{nframes}")
    p.stdin.close()
    p.wait()
    print("done ->", OUT_MP4)

if __name__ == "__main__":
    main()
