#!/usr/bin/env python3
"""
すーすーわーわー ショート量産レンダラ
PIL + numpy + ffmpeg のみ（ブラウザ不要・ヘッドレス・追加pip不要）。
script.json を差し替えるだけで新作 = 量産の背骨。

レイヤー: 背景 / キャラ(bob+喋りhop) / 上部タイトル+常設イラスト / 字幕(話者色) / 音(animalese+BGM)

使い方（安い→高いチェックポイント階段）:
        python3 shorts/render.py --check      [script.json]          # 検証＋医療広告NG lint（即時）
        python3 shorts/render.py --preview    [script.json] [秒]     # 指定秒の1枚PNG
        python3 shorts/render.py --storyboard [script.json] [列数]   # 全カット＋hookを1枚に（通し確認）
        python3 shorts/render.py --draft      [script.json]          # 半解像度/15fps/KenBurns off の高速ドラフト
        python3 shorts/render.py              [script.json]          # 本番書き出し（音声つき＋台帳）
出力:    shorts/out/<title>.mp4 / _draft.mp4 / _storyboard.png / _preview_*.png
依存:    Pillow, numpy, ffmpeg(PATH), Noto CJK フォント
"""
import colorsys, csv, hashlib, json, math, os, subprocess, sys, unicodedata, wave, random
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
import numpy as np

def stable_hash(s):
    """プロセス間で安定なハッシュ（random.seed と独立。台本シードに使う）。"""
    return int(hashlib.md5(str(s).encode("utf-8")).hexdigest(), 16)

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

# ---------- キャラ正本（character-bible.json） ----------
BIBLE_REL = "public/content/01_すわぷよ/05_設定/01_キャラクター台帳.json"
_bible = None
def load_bible():
    """全キャラの声・性格・画像の正本。台本は名前を呼ぶだけ→ここから自動解決。"""
    global _bible
    if _bible is None:
        try:
            _bible = json.load(open(resolve(BIBLE_REL), encoding="utf-8")).get("characters", {})
        except Exception:
            _bible = {}
    return _bible

def bible_lookup(key, char_spec=None):
    """slotキー/idから正本エントリを引く。spec.id優先→key一致→name一致→短縮別名(keto→ketonyan等)。"""
    bible = load_bible()
    cid = (char_spec or {}).get("id")
    if cid and cid in bible: return bible[cid]
    if key in bible: return bible[key]
    for e in bible.values():
        if e.get("name") == key: return e
    for bid, e in bible.items():                       # 短縮別名: keto/wawa/mogu/suu...
        if bid.startswith(key) or (len(key) >= 4 and key.startswith(bid[:4])): return e
    return {}

# ---------- キャラ画像から"雰囲気の色"を自動抽出（吹き出し枠＝話者ブランド色） ----------
_brand_cache = {}
def brand_color_from_image(path):
    key = path
    if key in _brand_cache: return _brand_cache[key]
    im = load_rgba(path); im.thumbnail((72, 72))
    arr = np.asarray(im, dtype=np.float32) / 255.0
    rgb = arr[..., :3].reshape(-1, 3); a = arr[..., 3].reshape(-1)
    rgb = rgb[a > 0.7]
    if len(rgb) == 0:
        _brand_cache[key] = (120, 120, 130); return _brand_cache[key]
    mx = rgb.max(1); mn = rgb.min(1); v = mx
    s = np.where(mx > 1e-6, (mx - mn) / np.clip(mx, 1e-6, 1.0), 0.0)
    vivid = (s > 0.30) & (v > 0.22) & (v < 0.97)       # 白い歯/縁取り/黒は除外＝鮮やかな主要色
    pick = rgb[vivid] if vivid.sum() >= max(8, int(0.02 * len(rgb))) else rgb
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in pick])
    bins = (np.floor(hsv[:, 0] * 12).astype(int)) % 12
    w = hsv[:, 1] * (0.4 + 0.6 * hsv[:, 2])
    best = max(range(12), key=lambda b: float(w[bins == b].sum()) if (bins == b).any() else -1.0)
    base = pick[bins == best].mean(0)
    h, sH, vH = colorsys.rgb_to_hsv(*base)             # 枠として視認できる彩度・明度に整える
    sH = min(1.0, max(0.45, sH)); vH = min(0.82, max(0.45, vH))
    r, g, b = colorsys.hsv_to_rgb(h, sH, vH)
    _brand_cache[key] = (int(r * 255), int(g * 255), int(b * 255))
    return _brand_cache[key]

def resolve_speaker(key, spec, cast_map=None):
    """話者1人を正本＋台本から解決。画像/ピッチ/色/ジッターを返す。色は未指定なら画像から自動。"""
    c = (spec.get("characters") or {}).get(key, {}) or {}
    bid = (cast_map or {}).get(key)                    # ランダム配役の上書き
    be = bible_lookup(bid, c) if bid else bible_lookup(key, c)
    img_path = c.get("img") or be.get("image")
    if not img_path: return None
    voice = be.get("voice", {})
    color = tuple(c["color"]) if c.get("color") else brand_color_from_image(img_path)
    return {
        "img": img_path,
        "pitch": c.get("pitch", voice.get("baseHz", 800)),
        "jitter": c.get("pitchJitter", voice.get("pitchJitter", 0.10)),
        "color": color,
        "side": c.get("side"),
    }

def maybe_random_cast(spec):
    """cast:"random"/{count} のとき、台本のスロット話者を正本11体からシード選出して束ねる(generic回向け)。"""
    cast = spec.get("cast")
    if not cast: return None
    ids = list(load_bible().keys())
    if not ids: return None
    slots = []
    for ln in spec.get("lines", []):
        w = ln.get("who")
        if w != "cta" and w not in slots: slots.append(w)
    n = int(cast.get("count", len(slots) or 1)) if isinstance(cast, dict) else (len(slots) or 1)
    n = max(1, min(2, n))
    rnd = random.Random(stable_hash(spec.get("title", "")))
    chosen = rnd.sample(ids, min(n, len(ids)))
    return {slots[i]: chosen[i] for i in range(min(len(slots), len(chosen)))}

# ---------- シーン（背景＋接地）。内容(weather/theme)から自動選択 ----------
BG_DIR = "public/content/01_すわぷよ/03_背景/"
SCENES = {  # scene -> (ファイル, キャラ接地 characterBaselineY)
    "day":     ("01_村_昼.png", 0.66),
    "morning": ("02_村_朝.png", 0.66),
    "dusk":    ("05_村_夕方.png", 0.66),
    "night":   ("06_村_夜.png", 0.66),
    "rain":    ("04_村_雨.png", 0.66),
    "cloudy":  ("03_村_くもり.png", 0.66),
    "snow":    ("07_村_雪.png", 0.66),
    "room":    ("room-cozy.png",       0.74),
    "seaside": ("seaside.png",         0.72),
    "festival":("festival.png",        0.70),
}

def resolve_scene(spec):
    """scene明示→天気→テーマ/タイトルのキーワード→既定day、の順で内容からシーンを決める。"""
    s = spec.get("scene")
    if isinstance(s, str) and s.strip() in SCENES:
        return s.strip()
    w = spec.get("weather") or ""
    for k, v in (("はれ","day"),("晴","day"),("あめ","rain"),("雨","rain"),
                 ("くもり","cloudy"),("曇","cloudy"),("ゆき","snow"),("雪","snow"),
                 ("よる","night"),("夜","night"),("あさ","morning"),("朝","morning"),
                 ("ゆうがた","dusk"),("夕","dusk")):
        if k in w:
            return v
    text = f"{spec.get('theme','')} {spec.get('topTitle','')} {spec.get('series','')}"
    for scene, keys in (("room", ["歯みがき","はみがき","おうち","室内","部屋","就寝"]),
                        ("night", ["夜","ねる","睡眠","おやすみ","寝る"]),
                        ("seaside", ["海","うみ","口腔育成","もぐぴよ"]),
                        ("festival", ["祭","イベント","ブース","YourTIME","yourtime"]),
                        ("dusk", ["夕"]), ("morning", ["朝","あさ"])):
        if any(k in text for k in keys):
            return scene
    return "day"

def pick_background(spec):
    """明示 background → backgrounds(シードでローテ) → 内容から自動シーン、の順。"""
    if spec.get("background"):
        return spec["background"]
    bgs = spec.get("backgrounds")
    if isinstance(bgs, list) and bgs:
        return bgs[stable_hash(spec.get("title", "")) % len(bgs)]
    path = BG_DIR + SCENES[resolve_scene(spec)][0]
    try:
        resolve(path)                       # 解決できればそのシーンを使う
    except FileNotFoundError:
        path = BG_DIR + SCENES["day"][0]    # 未生成シーン(festival/room/seaside等)は day にフォールバック＝落とさない
    return path

def scene_baseline(spec):
    """選ばれた背景に合うキャラ接地。室内0.74/海辺0.72等を自動。layoutが明示すればそちら優先。"""
    bg = pick_background(spec)
    name = os.path.basename(bg)
    for f, bl in SCENES.values():
        if f == name:
            return bl
    return 0.66

# ---------- 背景スローズーム/パン（Ken Burns・素材いらずで画面に動きを足す） ----------
KB_MAX = 1.10  # 背景を1.10倍に拡大し、その内側をゆっくりズーム/パン
def ken_burns(bg_big, tsec, W, H):
    BW, BH = bg_big.size
    k = 1.0 + (KB_MAX - 1.0) * (0.5 - 0.5 * math.cos(tsec * 2 * math.pi / 20.0))  # 1.0(寄り)〜1.10(引き)
    cw = min(BW, int(W * k)); ch = min(BH, int(H * k))
    maxdx = (BW - cw) / 2.0; maxdy = (BH - ch) / 2.0
    cx = BW / 2.0 + maxdx * math.sin(tsec * 2 * math.pi / 26.0) * 0.8
    cy = BH / 2.0 + maxdy * math.sin(tsec * 2 * math.pi / 34.0) * 0.8
    x0 = max(0, min(BW - cw, int(cx - cw / 2))); y0 = max(0, min(BH - ch, int(cy - ch / 2)))
    return bg_big.crop((x0, y0, x0 + cw, y0 + ch)).resize((W, H), Image.BILINEAR)

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

def orient_character(img, side):
    """Default to a stage-like setup where left/right characters face the center."""
    if side == "right":
        return img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return img

# ---------- 音声 ----------
def synth_blip(freq, dur, chirp=1.18):
    """立ち上がりで少しピッチが上がる＝ピロッとした効果音。"""
    n = int(SR * dur); t = np.arange(n) / SR
    inst = freq * (1 + (chirp - 1) * (t / dur))
    ph = 2 * np.pi * np.cumsum(inst) / SR
    wave_ = 0.7 * np.sin(ph) + 0.3 * np.sin(2 * ph)
    env = np.clip(np.minimum(t / 0.004, (dur - t) / 0.02), 0, 1)  # 速い attack/decay
    return (wave_ * env).astype(np.float32)

def animalese(text, base, dur, jitter=0.10):
    """字幕の文字数だけ高速ピロピロ＝すーすーわーわー語。jitter=キャラ別の声のゆらぎ。"""
    out = np.zeros(int(SR * dur), np.float32)
    kana = [c for c in text if c not in "、。！？ 　"]
    n = min(len(kana), 16)
    if n == 0: return out
    span = min(dur * 0.8, n * 0.075)        # 高速・密
    step = span / n
    for i in range(n):
        f = base * random.uniform(1.0 - jitter, 1.0 + jitter)
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

# ---------- 検証 ----------
def add_issue(issues, kind, path, message):
    issues.append({"type": kind, "path": path, "message": message})

def require_key(spec, key, issues):
    if key not in spec:
        add_issue(issues, "schema_invalid", key, "required field is missing")

def validate_asset(path, field, issues):
    if not isinstance(path, str) or not path.strip():
        add_issue(issues, "schema_invalid", field, "asset path must be a non-empty string")
        return
    try:
        resolve(path)
    except FileNotFoundError:
        add_issue(issues, "asset_missing", field, f"asset not found: {path}")

def validate_layout(layout, issues):
    if layout is None:                 # 任意。未指定はゴールデン既定を使う
        return
    if not isinstance(layout, dict):
        add_issue(issues, "schema_invalid", "layout", "layout must be an object")
        return
    bounds = {
        "titleY": (0.24, 0.40),
        "subtitleY": (0.48, 0.92),
        "characterBaselineY": (0.52, 0.90),
        "leftCharacterX": (0.05, 0.49),
        "rightCharacterX": (0.51, 0.95),
    }
    for key, (low, high) in bounds.items():
        if key not in layout:
            continue
        try:
            value = float(layout[key])
        except (TypeError, ValueError):
            add_issue(issues, "layout_out_of_bounds", f"layout.{key}", "layout value must be numeric")
            continue
        if value < low or value > high:
            add_issue(issues, "layout_out_of_bounds", f"layout.{key}", f"{value} is outside {low}-{high}")

def validate_lines(spec, issues):
    lines = spec.get("lines")
    if not isinstance(lines, list) or not lines:
        add_issue(issues, "schema_invalid", "lines", "lines must be a non-empty array")
        return 0.0
    total = 0.0
    for i, line in enumerate(lines):
        path = f"lines[{i}]"
        if not isinstance(line, dict):
            add_issue(issues, "schema_invalid", path, "line must be an object")
            continue
        # 話者の解決可能性は validate_spec 側で正本込みで検証する
        text = line.get("text")
        if not isinstance(text, str) or not text.strip():
            add_issue(issues, "schema_invalid", f"{path}.text", "text must be non-empty")
        try:
            dur = float(line.get("dur"))
        except (TypeError, ValueError):
            add_issue(issues, "schema_invalid", f"{path}.dur", "duration must be numeric")
            continue
        if dur <= 0:
            add_issue(issues, "duration_out_of_range", f"{path}.dur", "duration must be greater than zero")
        total += max(0.0, dur)
    if total < 30 or total > 60:
        add_issue(issues, "duration_out_of_range", "lines", f"total duration {total:.1f}s is outside 30-60s")
    if len(lines) >= 3:
        if lines[0].get("text") != "おはようございます！":
            add_issue(issues, "schema_invalid", "lines[0].text", "first line must be おはようございます！")
        if lines[1].get("text") != "今日のふわふわランドの天気は、、、":
            add_issue(issues, "schema_invalid", "lines[1].text", "second line must be 今日のふわふわランドの天気は、、、")
        if not str(lines[2].get("text", "")).endswith("です！"):
            add_issue(issues, "schema_invalid", "lines[2].text", "third line must end with です！")
    return total

SUPPORTED_EVENT_ANIMATIONS = {
    "candy-rain",
    "cheek-balloon",
    "halo-link",
    "care-glow",
    "tongue-flag",
    "smile-stamp",
    "small-plate",
    "water-sparkle",
    "soft-popup",
    "breath-wind",
    "shadow-fade",
    "posture-line",
    "mirror-sparkle",
    "bubble-fire-out",
    "self-care-heart",
    "none",
}

def is_error_issue(issue):
    return issue.get("severity", "error") != "warning"

def event_animation_id(item):
    if isinstance(item, str):
        return item.strip()
    if isinstance(item, dict) and isinstance(item.get("id"), str):
        return item["id"].strip()
    return None

def event_animation_ids(spec):
    value = spec.get("eventAnimation")
    if value is None:
        return []
    if isinstance(value, str) or isinstance(value, dict):
        value = [value]
    if not isinstance(value, list):
        return []
    return [anim_id for item in value for anim_id in [event_animation_id(item)] if anim_id]

def validate_event_animations(spec, issues):
    if "eventAnimation" not in spec or spec.get("eventAnimation") is None:
        return
    value = spec.get("eventAnimation")
    items = value if isinstance(value, list) else [value]
    if not isinstance(items, list):
        add_issue(issues, "schema_invalid", "eventAnimation", "eventAnimation must be an array, string, or object")
        return
    for i, item in enumerate(items):
        anim_id = event_animation_id(item)
        if not anim_id:
            add_issue(issues, "schema_invalid", f"eventAnimation[{i}]", "animation id must be a non-empty string")
            continue
        if anim_id not in SUPPORTED_EVENT_ANIMATIONS:
            issues.append({
                "type": "unsupported_animation",
                "severity": "warning",
                "path": f"eventAnimation[{i}]",
                "message": f"unsupported eventAnimation ignored by renderer: {anim_id}",
            })

# 医療広告NG（断定・効能）。出典: docs/20_事業/医療広告・コンテンツ方針.md の言い換え集
COMPLIANCE_NG = ["治る", "治っ", "治り", "治療", "完治", "予防", "効果", "効能", "効く",
                 "改善", "保証", "日本一", "No.1", "ＮＯ．１"]
def lint_compliance(spec, issues):
    """台本テキストを医療広告NG語でlint。warningで報告（子ども×健康×SNSの一発アウトを機械で止める）。"""
    fields = []
    if isinstance(spec.get("topTitle"), str): fields.append(("topTitle", spec["topTitle"]))
    h = spec.get("hook")
    if isinstance(h, dict) and isinstance(h.get("text"), str): fields.append(("hook.text", h["text"]))
    for i, ln in enumerate(spec.get("lines", []) or []):
        if isinstance(ln, dict) and isinstance(ln.get("text"), str):
            fields.append((f"lines[{i}].text", ln["text"]))
    for path, text in fields:
        for ng in COMPLIANCE_NG:
            if ng in text:
                issues.append({
                    "type": "compliance_risk", "severity": "warning", "path": path,
                    "message": f"医療広告NGの可能性: 「{ng}」（断定・効能）→ 言い換え推奨（docs/20_事業/医療広告・コンテンツ方針.md）",
                })

def validate_spec(spec):
    issues = []
    # titleStyle / layout / background / characters は任意
    # （未指定でゴールデン既定・村背景・正本からの自動解決になる）
    for key in ["title", "size", "fps", "topTitle", "cta", "lines"]:
        require_key(spec, key, issues)
    size = spec.get("size")
    if not (isinstance(size, list) and len(size) == 2 and all(isinstance(v, int) and v > 0 for v in size)):
        add_issue(issues, "schema_invalid", "size", "size must be [positiveInt, positiveInt]")
    if not isinstance(spec.get("fps"), int) or spec.get("fps", 0) <= 0:
        add_issue(issues, "schema_invalid", "fps", "fps must be a positive integer")
    if spec.get("background"):
        validate_asset(spec.get("background"), "background", issues)
    for i, bg in enumerate(spec.get("backgrounds", []) or []):
        validate_asset(bg, f"backgrounds[{i}]", issues)
    if spec.get("topIllust"):
        validate_asset(spec.get("topIllust"), "topIllust", issues)
    # characters は任意。提供された値だけ型チェック（不足は正本から解決される）
    characters = spec.get("characters")
    if characters is not None and not isinstance(characters, dict):
        add_issue(issues, "schema_invalid", "characters", "characters must be an object")
    elif isinstance(characters, dict):
        for key, character in characters.items():
            path = f"characters.{key}"
            if not isinstance(character, dict):
                add_issue(issues, "schema_invalid", path, "character must be an object")
                continue
            if character.get("img") is not None:
                validate_asset(character.get("img"), f"{path}.img", issues)
            if character.get("side") is not None and character.get("side") not in ("left", "right"):
                add_issue(issues, "schema_invalid", f"{path}.side", "side must be left or right")
            if character.get("pitch") is not None and not isinstance(character.get("pitch"), (int, float)):
                add_issue(issues, "schema_invalid", f"{path}.pitch", "pitch must be numeric")
            color = character.get("color")
            if color is not None and not (isinstance(color, list) and len(color) == 3 and all(isinstance(v, int) for v in color)):
                add_issue(issues, "schema_invalid", f"{path}.color", "color must be [r,g,b]")
    # 台詞の各話者が解決できるか（明示img or 正本ヒット）を検証
    cast_map = maybe_random_cast(spec)
    seen = set()
    for i, line in enumerate(spec.get("lines", []) or []):
        if not isinstance(line, dict): continue
        who = line.get("who")
        if who in ("cta", None) or who in seen: continue
        seen.add(who)
        if resolve_speaker(who, spec, cast_map) is None:
            add_issue(issues, "schema_invalid", f"lines[{i}].who",
                      f"speaker '{who}' は正本に無く、charactersにimgも未指定で解決できません")
    cta = spec.get("cta")
    if not isinstance(cta, dict) or "color" not in cta:
        add_issue(issues, "schema_invalid", "cta.color", "cta.color is required")
    validate_layout(spec.get("layout"), issues)
    validate_event_animations(spec, issues)
    hook = spec.get("hook")                       # 任意: 冒頭フック
    if hook is not None:
        if not isinstance(hook, dict):
            add_issue(issues, "schema_invalid", "hook", "hook must be an object")
        else:
            if not (isinstance(hook.get("text"), str) and hook["text"].strip()):
                add_issue(issues, "schema_invalid", "hook.text", "hook.text must be non-empty")
            d = hook.get("durationSec", 1.5)
            if not isinstance(d, (int, float)) or not (0.5 <= float(d) <= 3.0):
                add_issue(issues, "schema_invalid", "hook.durationSec", "0.5〜3.0秒で指定してください")
    lint_compliance(spec, issues)                 # 医療広告NG語 lint（warning）
    total = validate_lines(spec, issues)
    return issues, total

# ---------- 描画 ----------
TITLE_STYLES = {
    "puku-yellow": {
        "name": "ぷくっと黄色",
        "fill": (104, 70, 29, 255),
        "outer": (109, 81, 38, 255),
        "inner": (255, 201, 60, 255),
        "shadow": (125, 83, 25, 95),
        "rot": 0,
    },
    "teacher-green": {
        "name": "先生みどり",
        "fill": (47, 104, 65, 255),
        "outer": (78, 138, 85, 255),
        "inner": (237, 247, 221, 255),
        "shadow": (74, 126, 73, 85),
        "rot": 0.8,
    },
    "fuwa-blue": {
        "name": "ふわ水色",
        "fill": (36, 113, 134, 255),
        "outer": (102, 183, 199, 255),
        "inner": (228, 248, 255, 255),
        "shadow": (66, 152, 177, 90),
        "rot": -0.6,
    },
    "kiratto-peach": {
        "name": "きらっと桃",
        "fill": (151, 72, 102, 255),
        "outer": (215, 131, 155, 255),
        "inner": (255, 233, 239, 255),
        "shadow": (196, 99, 126, 80),
        "rot": -1.0,
    },
    "hand-white": {
        "name": "手書き白",
        "fill": (79, 67, 57, 255),
        "outer": (128, 109, 90, 255),
        "inner": (255, 255, 255, 245),
        "shadow": (74, 55, 40, 75),
        "rot": -1.6,
    },
    "adventure-orange": {
        "name": "探検オレンジ",
        "fill": (94, 50, 21, 255),
        "outer": (139, 82, 32, 255),
        "inner": (255, 159, 61, 255),
        "shadow": (120, 66, 18, 95),
        "rot": -2.0,
    },
    "night-drop": {
        "name": "夜のしずく",
        "fill": (244, 248, 255, 255),
        "outer": (109, 133, 183, 255),
        "inner": (54, 67, 109, 255),
        "shadow": (38, 50, 91, 115),
        "rot": 0,
    },
    "fire-red": {
        "name": "火消し赤",
        "fill": (255, 248, 223, 255),
        "outer": (139, 47, 36, 255),
        "inner": (255, 107, 85, 255),
        "shadow": (139, 47, 36, 95),
        "rot": 1.4,
    },
}

TITLE_STYLE_ALIASES = {
    "ぷくっと黄色": "puku-yellow",
    "puku-yellow": "puku-yellow",
    "pop-yellow": "puku-yellow",
    "先生みどり": "teacher-green",
    "teacher-green": "teacher-green",
    "green-teacher": "teacher-green",
    "ふわ水色": "fuwa-blue",
    "fuwa-blue": "fuwa-blue",
    "soft-cyan": "fuwa-blue",
    "breath-blue": "fuwa-blue",
    "きらっと桃": "kiratto-peach",
    "kiratto-peach": "kiratto-peach",
    "sparkle-pink": "kiratto-peach",
    "手書き白": "hand-white",
    "hand-white": "hand-white",
    "handwritten-white": "hand-white",
    "探検オレンジ": "adventure-orange",
    "adventure-orange": "adventure-orange",
    "pop-orange": "adventure-orange",
    "夜のしずく": "night-drop",
    "night-drop": "night-drop",
    "night-blue": "night-drop",
    "火消し赤": "fire-red",
    "fire-red": "fire-red",
    "firefighter-red": "fire-red",
}

def normalize_title_style(value):
    if not isinstance(value, str):
        return "puku-yellow"
    key = value.strip()
    return TITLE_STYLE_ALIASES.get(key, "puku-yellow")

def pick_title_style(spec):
    """titleStyle 未指定/"random" は台本名シードで色・雰囲気を自動選択（再レンダで安定）。"""
    raw = spec.get("titleStyle")
    if raw is None or (isinstance(raw, str) and raw.strip().lower() in ("", "random", "auto", "ランダム", "おまかせ")):
        keys = list(TITLE_STYLES.keys())
        # シリーズ単位でシード＝同じシリーズは識別色が揃う／別シリーズは別色（series無ければtitle）
        seed_src = spec.get("series") or spec.get("seriesKey") or spec.get("title", "")
        idx = stable_hash(seed_src) % len(keys)
        return TITLE_STYLES[keys[idx]]
    style_id = normalize_title_style(raw)
    return TITLE_STYLES[style_id]

def draw_title(canvas, text, font_path, base_size, cx, cy, style):
    """アニメロゴ風ステッカー（二重アウトライン＋影＋傾き）。セリフ帯とは別物。"""
    max_w = int(canvas.width * 0.82)
    font = ImageFont.truetype(font_path, base_size)
    probe = Image.new("RGBA", (canvas.width, 260), (0, 0, 0, 0))
    pd = ImageDraw.Draw(probe)
    while base_size > 46:
        font = ImageFont.truetype(font_path, base_size)
        tb = pd.textbbox((0, 0), text, font=font, stroke_width=20)
        if tb[2] - tb[0] <= max_w:
            break
        base_size -= 4
    tmp = Image.new("RGBA", (canvas.width, 360), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    tb = d.textbbox((0, 0), text, font=font, stroke_width=20)
    tw = tb[2] - tb[0]; ox = (tmp.width - tw) // 2 - tb[0]; oy = 60 - tb[1]
    shadow = style.get("shadow", (20, 30, 40, 90))
    d.text((ox + 6, oy + 9), text, font=font, fill=shadow, stroke_width=20, stroke_fill=shadow)  # 影
    d.text((ox, oy), text, font=font, fill=style["outer"], stroke_width=20, stroke_fill=style["outer"])
    d.text((ox, oy), text, font=font, fill=style["inner"], stroke_width=11, stroke_fill=style["inner"])
    d.text((ox, oy), text, font=font, fill=style["fill"])
    tmp = tmp.rotate(style["rot"], resample=Image.BICUBIC, expand=True)
    canvas.alpha_composite(tmp, (int(cx - tmp.width / 2), int(cy - tmp.height / 2)))
    return canvas

# 字幕の改行ルール（読みやすさ最優先）: 改行はスペース＆句読点だけ（語中で切らない）・均等2行
_BREAK_AFTER = "、。！？・…"
_NO_START = "、。！？・…ー）」』】，."                  # これらで行を始めない

def _segments(text):
    """[chunk, sep] のリスト。sep=後ろの区切り（スペースは ' '、句読点区切りは ''）。行内ではsepを残す。"""
    segs, cur = [], ""
    for i, ch in enumerate(text):
        if ch in "　 ":                                  # スペース＝区切り（行内では維持・改行点では落とす）
            if cur:
                segs.append([cur, " "]); cur = ""
            continue
        cur += ch
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if ch in _BREAK_AFTER and nxt not in _NO_START and nxt not in "　 ":
            segs.append([cur, ""]); cur = ""
    if cur:
        segs.append([cur, ""])
    return segs

def _join(segs):
    return "".join(c + s for c, s in segs).rstrip()    # 行末のスペースは落とす

def wrap_text(draw, text, font, max_width):
    if text == "今日のふわふわランドの天気は、、、":
        return ["今日のふわふわランドの", "天気は、、、"]
    def w(s):
        b = draw.textbbox((0, 0), s, font=font); return b[2] - b[0]
    segs = _segments(text)
    full = _join(segs)
    if w(full) <= max_width:
        return [full]
    # まず「均等な2行」: まとまり境界で、両行が幅内・幅差最小の所で割る（語中で切らない・行頭に閉じ記号を出さない）
    best, best_diff = None, 1e9
    for k in range(1, len(segs)):
        a, b = _join(segs[:k]), _join(segs[k:])
        if w(a) <= max_width and w(b) <= max_width and abs(w(a) - w(b)) < best_diff:
            best_diff, best = abs(w(a) - w(b)), (a, b)
    if best is not None:
        return [best[0], best[1]]
    # 3行以上必要な長文：まとまりで貪欲詰め → それでも長い行だけ文字貪欲（最後の手段）
    lines, cur = [], []
    for seg in segs:
        if cur and w(_join(cur + [seg])) > max_width:
            lines.append(_join(cur)); cur = [seg]
        else:
            cur.append(seg)
    if cur:
        lines.append(_join(cur))
    out = []
    for ln in lines:
        if w(ln) <= max_width:
            out.append(ln); continue
        c = ""
        for ch in ln:
            if c and w(c + ch) > max_width:
                out.append(c); c = ch
            else:
                c += ch
        if c:
            out.append(c)
    return out

def draw_caption(canvas, text, font, cx, cy, color, pop, style="outline", layout=None):
    """字幕。話者区別をスタイルで:
       outline(推奨)=白文字＋黒フチ＋話者色の外フチ / color=話者色の文字＋白フチ / box=白座布団＋色枠。
       可読性は outline が最良（白文字＋黒フチ＝研究値）。"""
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    side = int(canvas.width * rel(layout or {}, "captionSideMargin", 0.055))  # 左右マージン（小さいほど横長）
    max_text_w = canvas.width - side * 2   # 横長に取り、改行は_segments(助詞/句読点境界)で内容に応じて自然に
    sw = max(3, int(font.size * 0.10))     # 黒フチ幅
    lines = wrap_text(d, text, font, max_text_w)
    line_gap = 12
    boxes = [d.textbbox((0, 0), l, font=font, stroke_width=sw) for l in lines]
    widths = [b[2] - b[0] for b in boxes]
    heights = [b[3] - b[1] for b in boxes]
    tw = max(widths) if widths else 0
    th = sum(heights) + line_gap * max(0, len(lines) - 1)
    y = int(cy - th / 2 - (1 - pop) * 24)
    col = tuple(color) + (255,)
    if style == "box":
        pad = 26; x = int(cx - tw / 2)
        d.rounded_rectangle([x - pad, y - pad, x + tw + pad, y + th + pad],
                            radius=28, fill=(255, 255, 255, 240), outline=col, width=7)
    yy = y
    for line, box, width, height in zip(lines, boxes, widths, heights):
        x = int(cx - width / 2) - box[0]; ty = yy - box[1]
        if style == "box":
            d.text((x, ty), line, font=font, fill=(31, 41, 55, 255))
        elif style == "color":                 # 話者色の文字＋白フチ（暗背景でも読める）
            d.text((x, ty), line, font=font, fill=(255, 255, 255, 235), stroke_width=sw, stroke_fill=(255, 255, 255, 235))
            d.text((x, ty), line, font=font, fill=col)
        else:                                   # outline(推奨): 話者色の外フチ→黒フチ→白文字
            d.text((x, ty), line, font=font, fill=col, stroke_width=sw + max(3, int(font.size * 0.07)), stroke_fill=col)
            d.text((x, ty), line, font=font, fill=(38, 42, 55, 255), stroke_width=sw, stroke_fill=(38, 42, 55, 255))
            d.text((x, ty), line, font=font, fill=(255, 255, 255, 255))
        yy += height + line_gap
    return Image.alpha_composite(canvas, alpha_layer(layer, pop))

def alpha_layer(layer, opacity):
    if opacity >= 0.999:
        return layer
    arr = np.array(layer)
    arr[..., 3] = (arr[..., 3] * opacity).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")

def draw_rotated_capsule(layer, cx, cy, w, h, angle, fill, outline):
    pad = max(w, h)
    tmp = Image.new("RGBA", (w + pad, h + pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    box = [pad // 2, pad // 2, pad // 2 + w, pad // 2 + h]
    d.rounded_rectangle(box, radius=h // 2, fill=fill, outline=outline, width=max(2, h // 7))
    d.line([box[0] - w * 0.18, box[1] + h * 0.45, box[0], box[1] + h * 0.5], fill=outline, width=max(2, h // 9))
    d.line([box[2], box[1] + h * 0.5, box[2] + w * 0.18, box[1] + h * 0.45], fill=outline, width=max(2, h // 9))
    tmp = tmp.rotate(angle, resample=Image.BICUBIC, expand=True)
    layer.alpha_composite(tmp, (int(cx - tmp.width / 2), int(cy - tmp.height / 2)))

def draw_candy_rain(layer, W, H, tsec):
    colors = [(255, 207, 74, 170), (255, 143, 171, 150), (134, 215, 240, 150)]
    xs = [0.13, 0.28, 0.46, 0.63, 0.78, 0.88]
    delays = [0.0, -2.4, -1.1, -3.6, -1.9, -4.2]
    for i, (xrel, delay) in enumerate(zip(xs, delays)):
        cycle = ((tsec - delay) % 5.0) / 5.0
        y = int(-0.10 * H + cycle * 0.78 * H)
        if y > int(H * 0.64):
            continue
        sway = math.sin((cycle * math.tau) + i) * W * 0.012
        draw_rotated_capsule(
            layer,
            int(W * xrel + sway),
            y,
            int(W * 0.036),
            int(W * 0.023),
            cycle * 120 + i * 18,
            colors[i % len(colors)],
            (91, 121, 198, 95),
        )

def draw_cheek_balloon(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    items = [
        (0.20, 0.63, 1.00, 0.0, (255, 150, 172, 118)),
        (0.28, 0.64, 0.72, -1.8, (255, 150, 172, 105)),
        (0.76, 0.62, 0.92, -0.8, (105, 196, 235, 105)),
        (0.84, 0.65, 0.65, -2.4, (105, 196, 235, 95)),
    ]
    for xrel, yrel, scale, delay, fill in items:
        phase = ((tsec - delay) % 3.6) / 3.6
        pulse = 0.78 + math.sin(phase * math.tau) * 0.10 + phase * 0.16
        r = int(W * 0.024 * scale * pulse)
        x = int(W * xrel + math.sin(phase * math.tau) * W * 0.01)
        y = int(H * yrel - phase * H * 0.11)
        d.ellipse([x - r, y - r, x + r, y + r], fill=fill, outline=(255, 255, 255, 110), width=max(2, r // 5))
        glint = max(2, r // 4)
        d.ellipse([x - r // 3, y - r // 3, x - r // 3 + glint, y - r // 3 + glint], fill=(255, 255, 255, 105))

def draw_halo_link(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    phase = (math.sin(tsec * math.tau / 3.0) + 1) / 2
    alpha = int(66 + phase * 34)
    for i, xrel in enumerate([0.20, 0.50, 0.80]):
        local = (math.sin(tsec * math.tau / 3.0 + i * 1.2) + 1) / 2
        w = int(W * (0.088 + local * 0.014))
        h = int(W * (0.039 + local * 0.007))
        x = int(W * xrel)
        y = int(H * 0.37 + math.sin(tsec * 1.5 + i) * H * 0.006)
        d.rounded_rectangle(
            [x - w // 2, y - h // 2, x + w // 2, y + h // 2],
            radius=h // 2,
            outline=(76, 177, 189, alpha),
            width=max(3, int(W * 0.004)),
        )
    y = int(H * 0.37)
    d.line([int(W * 0.24), y, int(W * 0.46), y], fill=(76, 177, 189, 35), width=max(2, int(W * 0.004)))
    d.line([int(W * 0.54), y, int(W * 0.76), y], fill=(76, 177, 189, 35), width=max(2, int(W * 0.004)))

def draw_care_glow(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    pulse = (math.sin(tsec * math.tau / 2.8) + 1) / 2
    cx, cy = W // 2, int(H * 0.44)
    max_r = int(W * (0.30 + pulse * 0.04))
    steps = 9
    for i in range(steps, 0, -1):
        r = int(max_r * i / steps)
        a = int((1 - i / (steps + 1)) * 28 + pulse * 5)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 246, 171, a))
    for i in range(6):
        ang = tsec * 0.8 + i * math.tau / 6
        x = int(cx + math.cos(ang) * W * 0.20)
        y = int(cy + math.sin(ang) * H * 0.08)
        r = int(W * (0.006 + pulse * 0.003))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 230, 75))

def draw_tongue_flag(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    phase = (math.sin(tsec * 4.0) + 1) / 2
    x = int(W * 0.50)
    y = int(H * 0.58 + phase * H * 0.015)
    w = int(W * 0.16)
    h = int(W * 0.055)
    d.rounded_rectangle([x - w // 2, y - h // 2, x + w // 2, y + h // 2], radius=h // 2, fill=(255, 146, 170, 92))
    d.polygon([(x + w // 2, y - h // 2), (x + w // 2 + int(W * 0.035), y), (x + w // 2, y + h // 2)], fill=(255, 146, 170, 82))

def draw_smile_stamp(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    phase = (math.sin(tsec * 3.2) + 1) / 2
    cx, cy = int(W * 0.50), int(H * 0.42)
    r = int(W * (0.045 + phase * 0.006))
    d.arc([cx - r, cy - r, cx + r, cy + r], start=25, end=155, fill=(255, 185, 68, 118), width=max(4, int(W * 0.006)))
    eye = max(3, int(W * 0.006))
    d.ellipse([cx - r // 2 - eye, cy - eye, cx - r // 2 + eye, cy + eye], fill=(255, 185, 68, 118))
    d.ellipse([cx + r // 2 - eye, cy - eye, cx + r // 2 + eye, cy + eye], fill=(255, 185, 68, 118))

def draw_small_plate(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    cx, cy = int(W * 0.50), int(H * 0.60 + math.sin(tsec * 2.4) * H * 0.006)
    w, h = int(W * 0.22), int(W * 0.055)
    d.ellipse([cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2], fill=(255, 255, 255, 115), outline=(107, 157, 120, 105), width=max(3, int(W * 0.004)))
    d.ellipse([cx - w // 4, cy - h // 4, cx + w // 4, cy + h // 4], outline=(107, 157, 120, 65), width=max(2, int(W * 0.003)))

def draw_water_sparkle(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    for i, xrel in enumerate([0.18, 0.33, 0.70, 0.84]):
        phase = ((tsec * 0.45 + i * 0.17) % 1.0)
        x = int(W * xrel + math.sin(phase * math.tau) * W * 0.01)
        y = int(H * (0.34 + phase * 0.22))
        r = int(W * (0.012 + phase * 0.006))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(119, 202, 231, 82), outline=(255, 255, 255, 75), width=2)

def draw_soft_popup(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    phase = (math.sin(tsec * 2.8) + 1) / 2
    boxes = [(0.28, 0.48, "？"), (0.72, 0.50, "！")]
    for xrel, yrel, mark in boxes:
        x = int(W * xrel)
        y = int(H * yrel - phase * H * 0.01)
        w, h = int(W * 0.095), int(W * 0.065)
        d.rounded_rectangle([x - w // 2, y - h // 2, x + w // 2, y + h // 2], radius=int(W * 0.018), fill=(255, 255, 255, 96), outline=(76, 177, 189, 70), width=3)
        d.text((x - int(W * 0.012), y - int(W * 0.027)), mark, fill=(76, 177, 189, 110))

def draw_breath_wind(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    for i in range(3):
        y = int(H * (0.38 + i * 0.07))
        offset = math.sin(tsec * 1.4 + i) * W * 0.035
        points = []
        for step in range(8):
            x = int(W * (0.20 + step * 0.085) + offset)
            points.append((x, int(y + math.sin(step * 0.9 + tsec * 2.0) * H * 0.008)))
        d.line(points, fill=(97, 173, 202, 72), width=max(4, int(W * 0.006)))

def draw_shadow_fade(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    alpha = int(44 + (math.sin(tsec * 2.0) + 1) * 12)
    for xrel in [0.30, 0.70]:
        cx = int(W * xrel)
        cy = int(H * 0.80)
        d.ellipse([cx - int(W * 0.11), cy - int(W * 0.025), cx + int(W * 0.11), cy + int(W * 0.025)], fill=(72, 82, 92, alpha))

def draw_posture_line(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    alpha = int(62 + (math.sin(tsec * 2.4) + 1) * 20)
    for xrel in [0.30, 0.70]:
        x = int(W * xrel)
        d.line([x, int(H * 0.44), x, int(H * 0.74)], fill=(166, 184, 86, alpha), width=max(3, int(W * 0.004)))

def draw_mirror_sparkle(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    for i, (xrel, yrel) in enumerate([(0.24, 0.38), (0.80, 0.42), (0.50, 0.32), (0.68, 0.58)]):
        phase = (math.sin(tsec * 3.0 + i) + 1) / 2
        r = int(W * (0.012 + phase * 0.008))
        x, y = int(W * xrel), int(H * yrel)
        d.line([x - r, y, x + r, y], fill=(255, 222, 120, 105), width=3)
        d.line([x, y - r, x, y + r], fill=(255, 222, 120, 105), width=3)

def draw_bubble_fire_out(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    for i in range(5):
        phase = ((tsec * 0.42 + i * 0.19) % 1.0)
        x = int(W * (0.60 + i * 0.045))
        y = int(H * (0.62 - phase * 0.18))
        r = int(W * (0.014 + phase * 0.008))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(132, 212, 229, 74), outline=(255, 255, 255, 68), width=2)

def draw_self_care_heart(layer, W, H, tsec):
    d = ImageDraw.Draw(layer)
    phase = (math.sin(tsec * 2.6) + 1) / 2
    cx, cy = int(W * 0.50), int(H * 0.55)
    r = int(W * (0.022 + phase * 0.004))
    d.ellipse([cx - r * 2, cy - r, cx, cy + r], fill=(233, 132, 166, 74))
    d.ellipse([cx, cy - r, cx + r * 2, cy + r], fill=(233, 132, 166, 74))
    d.polygon([(cx - r * 2, cy), (cx + r * 2, cy), (cx, cy + r * 3)], fill=(233, 132, 166, 74))

def draw_event_animations(canvas, spec, tsec):
    anims = [anim for anim in event_animation_ids(spec) if anim in SUPPORTED_EVENT_ANIMATIONS and anim != "none"]
    if not anims:
        return canvas
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    W, H = canvas.size
    for anim in anims:
        if anim == "candy-rain":
            draw_candy_rain(layer, W, H, tsec)
        elif anim == "cheek-balloon":
            draw_cheek_balloon(layer, W, H, tsec)
        elif anim == "halo-link":
            draw_halo_link(layer, W, H, tsec)
        elif anim == "care-glow":
            draw_care_glow(layer, W, H, tsec)
        elif anim == "tongue-flag":
            draw_tongue_flag(layer, W, H, tsec)
        elif anim == "smile-stamp":
            draw_smile_stamp(layer, W, H, tsec)
        elif anim == "small-plate":
            draw_small_plate(layer, W, H, tsec)
        elif anim == "water-sparkle":
            draw_water_sparkle(layer, W, H, tsec)
        elif anim == "soft-popup":
            draw_soft_popup(layer, W, H, tsec)
        elif anim == "breath-wind":
            draw_breath_wind(layer, W, H, tsec)
        elif anim == "shadow-fade":
            draw_shadow_fade(layer, W, H, tsec)
        elif anim == "posture-line":
            draw_posture_line(layer, W, H, tsec)
        elif anim == "mirror-sparkle":
            draw_mirror_sparkle(layer, W, H, tsec)
        elif anim == "bubble-fire-out":
            draw_bubble_fire_out(layer, W, H, tsec)
        elif anim == "self-care-heart":
            draw_self_care_heart(layer, W, H, tsec)
    return Image.alpha_composite(canvas, alpha_layer(layer, 0.86))

def rel(layout, key, default):
    return float(layout.get(key, default))

def select_cast(spec):
    """台本に実際に登場する話者を出番順で抽出（cta除く）。台数=最適化の素。"""
    order, counts = [], {}
    for ln in spec.get("lines", []):
        w = ln.get("who")
        if w == "cta" or w is None:
            continue
        if w not in order:
            order.append(w)
        counts[w] = counts.get(w, 0) + 1
    return order, counts

def pick_draw_ids(order, counts, seed):
    """描画する1〜2体を決定。1話者=1人(中央)/複数=出番上位2体(同数はシードで安定タイブレーク)。"""
    if len(order) <= 1:
        return order[:1]
    top = sorted(order, key=lambda k: (-counts.get(k, 0), (seed + stable_hash(k)) % 997))[:2]
    return [k for k in order if k in top]          # 登場順を維持（左=先に喋る子）

def assign_sides(draw_ids, resolved):
    """2体の左右。両者に明示side(左/右)が揃えば尊重、でなければ登場順に左→右。"""
    explicit = [resolved[k].get("side") for k in draw_ids]
    if set(explicit) == {"left", "right"}:
        return {k: resolved[k]["side"] for k in draw_ids}
    return {k: ("left" if i == 0 else "right") for i, k in enumerate(draw_ids)}

def prepare_scene(spec, font_path):
    W, H = spec["size"]
    layout = spec.get("layout", {})
    title_style = pick_title_style(spec)
    bg = cover(load_rgba(pick_background(spec)), W, H)
    kb_on = spec.get("kenBurns", True) is not False
    bg_big = bg.resize((int(W * KB_MAX), int(H * KB_MAX)), Image.LANCZOS) if kb_on else None
    top_h = int(W * rel(layout, "topIllustHeight", 0.09))
    top_illust = scale_to_h(load_rgba(spec["topIllust"]), top_h) if spec.get("topIllust") else None

    cast_map = maybe_random_cast(spec)
    order, counts = select_cast(spec)
    resolved = {}
    for k in order:
        r = resolve_speaker(k, spec, cast_map)       # 正本＋台本から解決（色は画像から自動）
        if r:
            resolved[k] = r
    order = [k for k in order if k in resolved]

    # 全話者: 字幕色・声ピッチ・ジッター用（描画されない子も保持）
    speakers = {k: {"color": resolved[k]["color"], "pitch": resolved[k]["pitch"],
                    "jitter": resolved[k]["jitter"], "side": resolved[k]["side"]} for k in order}

    seed = stable_hash(spec.get("title", ""))
    draw_ids = pick_draw_ids(order, counts, seed)

    chars = {}
    if len(draw_ids) <= 1 and draw_ids:
        # 1人=中央・大きめ・反転なし（make_30s ゴールデン配置）
        k = draw_ids[0]
        h = int(W * rel(layout, "characterHeightSingle", rel(layout, "characterHeight", 0.60)))
        img = scale_to_h(load_rgba(resolved[k]["img"]), h)
        chars[k] = {"img": img, "cx": int(W * rel(layout, "centerCharacterX", 0.5)), "side": "center"}
    elif draw_ids:
        # 2人=左右・小さめ（横並びで収まる）
        hp = int(W * rel(layout, "characterHeightPair", rel(layout, "characterHeight", 0.60)))
        left_x = rel(layout, "leftCharacterX", 0.27)
        right_x = rel(layout, "rightCharacterX", 0.73)
        sides = assign_sides(draw_ids, resolved)
        for k in draw_ids:
            side = sides[k]
            img = orient_character(scale_to_h(load_rgba(resolved[k]["img"]), hp), side)
            chars[k] = {"img": img, "cx": int(W * (left_x if side == "left" else right_x)), "side": side}

    return {
        "bg": bg,
        "topIllust": top_illust,
        "chars": chars,        # 実際に描画する1〜2体
        "speakers": speakers,  # 色・ピッチ参照用（全話者）
        "titleStyle": title_style,
        "layout": layout,
        "baselineY": scene_baseline(spec),   # 背景に合うキャラ接地（室内/海辺は自動で下げる）
        "bgBig": bg_big, "kb": kb_on,        # Ken Burns 用
        "fonts": {
            "sub": ImageFont.truetype(font_path, int(W * rel(layout, "subtitleFontSize", 0.080))),
            "cta": ImageFont.truetype(font_path, int(W * rel(layout, "ctaFontSize", 0.072))),
        },
    }

def line_starts(lines, offset=0.0):
    starts, t = [], float(offset)
    for ln in lines:
        starts.append(t)
        t += ln["dur"]
    return starts, t

def current_line(lines, starts, tsec):
    for i in range(len(lines) - 1, -1, -1):
        if tsec >= starts[i]:
            return i
    return 0

def hook_seconds(spec):
    """冒頭フックの長さ（text付きの hook がある時だけ>0）。"""
    h = spec.get("hook")
    return float(h.get("durationSec", 1.5)) if isinstance(h, dict) and h.get("text") else 0.0

def draw_hook(canvas, text, font_path, t_in, layout, W, H):
    """冒頭0.5〜2秒の強いフック（上中央・大きく・ポップイン）。健康は2秒目以降に密輸。"""
    size = int(W * rel(layout, "hookFontSize", 0.066))
    font = ImageFont.truetype(font_path, size)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    lines = wrap_text(d, text, font, W - 160)
    gap = 14
    boxes = [d.textbbox((0, 0), l, font=font, stroke_width=9) for l in lines]
    ws = [b[2] - b[0] for b in boxes]; hs = [b[3] - b[1] for b in boxes]
    th = sum(hs) + gap * max(0, len(lines) - 1)
    pop = min(1.0, t_in / 0.18)
    y = int(H * rel(layout, "hookY", 0.40)) - th // 2 - int((1 - pop) * 22)
    for l, b, w, h in zip(lines, boxes, ws, hs):
        x = (W - w) // 2 - b[0]
        d.text((x, y - b[1]), l, font=font, fill=(255, 255, 255, 255), stroke_width=9, stroke_fill=(38, 42, 58, 255))
        y += h + gap
    return Image.alpha_composite(canvas, alpha_layer(layer, pop))

def render_frame(spec, scene, font_path, tsec, starts):
    W, H = spec["size"]
    layout = scene["layout"]
    canvas = ken_burns(scene["bgBig"], tsec, W, H) if scene.get("kb") and scene.get("bgBig") is not None else scene["bg"].copy()
    lines = spec["lines"]
    hook_dur = hook_seconds(spec)
    in_hook = tsec < hook_dur
    li = current_line(lines, starts, tsec)
    ln = lines[li]
    t_in = tsec if in_hook else tsec - starts[li]
    who = ln["who"]
    base_bottom = int(H * rel(layout, "characterBaselineY", scene.get("baselineY", 0.66)))
    for k, ch in scene["chars"].items():
        phase = math.pi if ch["side"] == "right" else 0
        bob = math.sin(tsec * 2.2 + phase) * 10
        if in_hook:
            hop = -abs(math.sin(tsec * 9.0)) * 30      # フック中は全員びっくりホップ
        else:
            hop = -abs(math.sin(t_in * 7.5)) * 26 if k == who else 0.0
        # 呼吸（全員・常時）＋喋りスクッシュ（話してる子だけ）＝素材ゼロのアニメ
        breath = math.sin(tsec * 2 * math.pi * 0.25 + phase) * 0.018
        sx, sy = 1.0 - breath * 0.5, 1.0 + breath
        if (not in_hook) and k == who:
            talk = (math.sin(tsec * 2 * math.pi * 7.5) * 0.5 + 0.5) * 0.05
            sx += talk * 0.5; sy -= talk
        img = ch["img"]
        if abs(sx - 1) > 0.004 or abs(sy - 1) > 0.004:   # 足を地面に固定したまま伸縮
            img = img.resize((max(1, int(img.width * sx)), max(1, int(img.height * sy))), Image.BILINEAR)
        x = ch["cx"] - img.width // 2
        canvas.alpha_composite(img, (x, int(base_bottom - img.height + bob + hop)))

    canvas = draw_event_animations(canvas, spec, tsec)

    tbob = int(math.sin(tsec * 2.0) * 4)
    top_illust = scene["topIllust"]
    if top_illust is not None:
        canvas.alpha_composite(top_illust, (int(W * rel(layout, "topIllustX", 0.06)), int(H * rel(layout, "topIllustY", 0.06)) + tbob))
    if spec.get("topTitle"):
        canvas = draw_title(
            canvas,
            spec["topTitle"],
            font_path,
            int(W * rel(layout, "titleFontSize", 0.110)),
            int(W * rel(layout, "titleX", 0.5)),
            int(H * rel(layout, "titleY", 0.30)) + tbob,
            scene["titleStyle"],
        )

    if in_hook:
        canvas = draw_hook(canvas, spec["hook"]["text"], font_path, tsec, layout, W, H)
    else:
        is_cta = who == "cta"
        spk = scene["speakers"].get(who) if not is_cta else None
        col = tuple(spec["cta"]["color"]) if is_cta else (spk["color"] if spk else (255, 255, 255))
        fnt = scene["fonts"]["cta"] if is_cta else scene["fonts"]["sub"]
        cy = int(H * rel(layout, "ctaY" if is_cta else "subtitleY", 0.69))
        pop = min(1.0, t_in / 0.18)
        canvas = draw_caption(canvas, ln["text"], fnt, W // 2, cy, col, pop, spec.get("subtitleStyle", "outline"), layout)

    if spec.get("debugSafezone"):
        ov = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        dd = ImageDraw.Draw(ov)
        dd.rectangle([0, 0, W, W], outline=(255, 0, 0, 180), width=6)
        dd.line([0, W // 2, W, W // 2], fill=(255, 0, 0, 100), width=3)
        dd.line([W // 2, 0, W // 2, W], fill=(255, 0, 0, 100), width=3)
        canvas = Image.alpha_composite(canvas, ov)
    return canvas

MODES = {"--check", "--compliance", "--preview", "--storyboard", "--draft"}
def load_spec_from_args(argv):
    """戻り値: (mode, extra[list], script_path, spec)。mode は render/check/compliance/preview/storyboard/draft。"""
    args = list(argv)
    mode = "render"
    if args and args[0] in MODES:
        mode = args.pop(0)[2:]
    script_path = args[0] if args else os.path.join(HERE, "script.json")
    extra = args[1:]
    spec = json.load(open(resolve(script_path) if not os.path.isabs(script_path) else script_path, encoding="utf-8"))
    return mode, extra, script_path, spec

def build_storyboard(spec, scene, font_path, starts, out_dir, title, cols=4):
    """全台詞＋hookを1枚のコンタクトシートに（通しの構図/字幕/配役/背景を秒で一覧）。"""
    W, H = spec["size"]; lines = spec["lines"]
    panels = []
    hd = hook_seconds(spec)
    if hd > 0:
        panels.append(("hook", render_frame(spec, scene, font_path, hd * 0.5, starts)))
    for i, ln in enumerate(lines):
        t = starts[i] + ln["dur"] * 0.5
        snip = (ln.get("text", "") or "")[:10]
        panels.append((f"{i} {ln['who']}: {snip}", render_frame(spec, scene, font_path, t, starts)))
    cols = max(1, cols); rows = (len(panels) + cols - 1) // cols
    pw, ph, pad, lab = 250, 444, 8, 20
    sheet = Image.new("RGB", (cols * pw + (cols + 1) * pad, rows * (ph + lab) + (rows + 1) * pad), (28, 28, 34))
    d = ImageDraw.Draw(sheet); f = ImageFont.truetype(font_path, 15)
    for idx, (name, fr) in enumerate(panels):
        r, c = divmod(idx, cols); x = pad + c * (pw + pad); y = pad + r * (ph + lab + pad)
        sheet.paste(fr.convert("RGB").resize((pw, ph), Image.LANCZOS), (x, y + lab))
        d.text((x + 3, y + 2), name[:24], fill=(255, 255, 255), font=f)
    out = os.path.join(out_dir, f"{title}_storyboard.png"); sheet.save(out)
    return out

LEDGER_HEAD = ["renderedAt", "file", "title", "series", "topTitle", "hookType", "weather", "theme",
               "charCount", "characters", "speakers", "durationSec", "titleStyle", "background", "events",
               "views", "avgViewSec", "retentionPct", "likes", "saves", "shares", "follows"]

def write_ledger(spec, scene, total, final_path):
    """投稿メタ行を台帳CSVに追記＋サイドカーJSON。指標列は空で用意（後で手入力→相関分析）。"""
    hook = spec.get("hook") if isinstance(spec.get("hook"), dict) else {}
    row = {
        "renderedAt": datetime.now().isoformat(timespec="seconds"),
        "file": os.path.basename(final_path),
        "title": spec.get("title", ""),
        "series": spec.get("series", spec.get("seriesKey", "")),
        "topTitle": spec.get("topTitle", ""),
        "hookType": hook.get("type", "") or spec.get("hookType", ""),
        "weather": spec.get("weather", ""),
        "theme": spec.get("theme", ""),
        "charCount": len(scene["chars"]),
        "characters": "|".join(scene["chars"].keys()),
        "speakers": "|".join(scene["speakers"].keys()),
        "durationSec": round(total, 1),
        "titleStyle": scene["titleStyle"].get("name", ""),
        "background": pick_background(spec),
        "events": "|".join(event_animation_ids(spec)),
    }
    ledger = os.path.join(HERE, "out", "post-ledger.csv")
    exists = os.path.exists(ledger)
    with open(ledger, "a", newline="", encoding="utf-8-sig") as f:  # BOM付=Excelで日本語OK
        w = csv.DictWriter(f, fieldnames=LEDGER_HEAD)
        if not exists:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in LEDGER_HEAD})
    side = os.path.splitext(final_path)[0] + ".meta.json"
    json.dump({**row, "lines": spec.get("lines")}, open(side, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return ledger

def print_check_report(issues, total):
    error_count = sum(1 for issue in issues if is_error_issue(issue))
    warning_count = len(issues) - error_count
    status = "ok" if error_count == 0 else "error"
    print(json.dumps({
        "status": status,
        "totalDuration": round(total, 2),
        "issueCount": len(issues),
        "errorCount": error_count,
        "warningCount": warning_count,
        "issues": issues,
    }, ensure_ascii=False, indent=2))

def main():
    mode, extra, _script_path, spec = load_spec_from_args(sys.argv[1:])
    issues, checked_total = validate_spec(spec)
    if mode in ("check", "compliance"):
        print_check_report(issues, checked_total)
        sys.exit(1 if any(is_error_issue(issue) for issue in issues) else 0)
    if any(is_error_issue(issue) for issue in issues):
        print_check_report(issues, checked_total)
        sys.exit(1)
    fp = find_font()
    draft = (mode == "draft")
    if draft:  # 半解像度・低fps・KenBurns off で高速ドラフト（動き/間の確認用・2.5分→~30秒）
        spec = {**spec, "size": [spec["size"][0] // 2, spec["size"][1] // 2], "fps": 15, "kenBurns": False}
    W, H = spec["size"]; FPS = spec["fps"]; title = spec["title"]
    scene = prepare_scene(spec, fp)
    lines = spec["lines"]
    hook_dur = hook_seconds(spec)
    starts, total = line_starts(lines, hook_dur)
    nframes = int(total * FPS)

    out_dir = os.path.join(HERE, "out"); os.makedirs(out_dir, exist_ok=True)
    if mode == "preview":
        sec = float(extra[0]) if extra else 0.0
        frame = render_frame(spec, scene, fp, sec, starts)
        out = os.path.join(out_dir, f"{title}_preview_{sec:.1f}s.png")
        frame.save(out)
        print(f"✓ preview: {out}")
        return
    if mode == "storyboard":
        cols = int(extra[0]) if extra else 4
        out = build_storyboard(spec, scene, fp, starts, out_dir, title, cols)
        print(f"✓ storyboard: {out}  ({len(lines)}カット{'＋hook' if hook_dur>0 else ''})")
        return

    out_title = f"{title}_draft" if draft else title
    tmp_tag = f"_{out_title}_{os.getpid()}"
    vid_tmp = os.path.join(out_dir, f"{tmp_tag}_video.mp4")
    wav_tmp = os.path.join(out_dir, f"{tmp_tag}_audio.wav")
    final = os.path.join(out_dir, f"{out_title}.mp4")

    # --- 音声トラック ---
    aud = bgm_bed(total) if spec.get("audio", {}).get("bgm") else np.zeros(int(SR * total), np.float32)
    if hook_dur > 0 and spec.get("audio", {}).get("animalese"):
        blip = synth_blip(700, 0.20, chirp=1.6) * 0.6          # 冒頭の注意喚起チャープ
        e = min(len(aud), len(blip)); aud[:e] += blip[:e]
    if spec.get("audio", {}).get("animalese"):
        for i, ln in enumerate(lines):
            if ln["who"] == "cta": continue
            spk = scene["speakers"].get(ln["who"])
            if not spk: continue
            voice = animalese(ln["text"], spk["pitch"], ln["dur"], spk.get("jitter", 0.10))
            s = int(starts[i] * SR); e = min(len(aud), s + len(voice))
            aud[s:e] += voice[:e - s]
    write_wav(wav_tmp, aud)

    # --- 映像 ---
    enc = ["-preset", "ultrafast", "-crf", "30"] if draft else ["-crf", "20"]
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", *enc, vid_tmp],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    for fme in range(nframes):
        tsec = fme / FPS
        canvas = render_frame(spec, scene, fp, tsec, starts)
        ff.stdin.write(canvas.tobytes())
        if fme % 90 == 0: print(f"  frame {fme}/{nframes}", flush=True)
    ff.stdin.close()
    video_rc = ff.wait()
    if video_rc != 0:
        raise RuntimeError(f"ffmpeg video encode failed: exit={video_rc} path={vid_tmp}")

    # --- 音と映像を結合 ---
    mux = subprocess.run(["ffmpeg", "-y", "-i", vid_tmp, "-i", wav_tmp,
                          "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                          "-movflags", "+faststart", final],
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if mux.returncode != 0:
        raise RuntimeError(f"ffmpeg mux failed: exit={mux.returncode}\n{mux.stderr[-2400:]}")
    for p in (vid_tmp, wav_tmp):
        try: os.remove(p)
        except OSError: pass
    tag = "DRAFT(確認用)" if draft else "音声つき"
    print(f"✓ done: {final}  ({total:.1f}s, {nframes} frames, {W}x{H}@{FPS}, {tag})")
    if draft:           # ドラフトは投稿物ではないので台帳に載せない
        return
    try:
        print(f"✓ ledger: {write_ledger(spec, scene, total, final)}")
    except Exception as e:
        print(f"⚠ ledger 書き込み失敗（描画は成功）: {e}")

if __name__ == "__main__":
    main()
