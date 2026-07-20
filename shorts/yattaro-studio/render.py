#!/usr/bin/env python3
"""Deterministic 2D renderer for review-only Yattaro shorts."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "shorts" / "out" / "yattaro-studio"
MASTER_SIZE = (1080, 1920)
FEED_BOX = (0, 285, 1080, 1635)
DEFAULT_ASSET = "public/content/04_ツナやす_ブランド/01_キャラクター案/yasu-cousin-draft-v1.png"


@dataclass(frozen=True)
class Motion:
    at: float
    x: float
    y: float
    scale: float
    rotation: float


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_spec(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as source:
        value: Any = json.load(source)
    if not isinstance(value, dict):
        raise ValueError("root must be an object")
    return value


def validate(spec: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    title = spec.get("title")
    duration = spec.get("duration")
    fps = spec.get("fps", 30)
    motions = spec.get("motions")
    if not isinstance(title, str) or not title.strip():
        issues.append("title must be a non-empty string")
    if not isinstance(duration, (int, float)) or not 1 <= duration <= 60:
        issues.append("duration must be between 1 and 60 seconds")
    if fps not in (15, 24, 30):
        issues.append("fps must be 15, 24, or 30")
    if not isinstance(motions, list) or not motions:
        issues.append("motions must contain at least one keyframe")
        return issues
    previous = -1.0
    for index, raw in enumerate(motions):
        if not isinstance(raw, dict):
            issues.append(f"motions[{index}] must be an object")
            continue
        for key in ("at", "x", "y", "scale", "rotation"):
            if not isinstance(raw.get(key), (int, float)):
                issues.append(f"motions[{index}].{key} must be numeric")
        if issues:
            continue
        at = float(raw["at"])
        if at < previous:
            issues.append("motions must be sorted by at")
        if isinstance(duration, (int, float)) and not 0 <= at <= duration:
            issues.append(f"motions[{index}].at is outside duration")
        if not 0 <= float(raw["x"]) <= 1 or not 0 <= float(raw["y"]) <= 1:
            issues.append(f"motions[{index}] x/y must be between 0 and 1")
        if not 0.1 <= float(raw["scale"]) <= 1.5:
            issues.append(f"motions[{index}].scale must be between 0.1 and 1.5")
        if not -45 <= float(raw["rotation"]) <= 45:
            issues.append(f"motions[{index}].rotation must be between -45 and 45")
        previous = at
    return issues


def motions_from(spec: dict[str, Any]) -> list[Motion]:
    return [Motion(**{key: float(raw[key]) for key in ("at", "x", "y", "scale", "rotation")}) for raw in spec["motions"]]


def interpolate(motions: list[Motion], at: float) -> Motion:
    if at <= motions[0].at:
        return motions[0]
    if at >= motions[-1].at:
        return motions[-1]
    for left, right in zip(motions, motions[1:]):
        if left.at <= at <= right.at:
            amount = (at - left.at) / (right.at - left.at)
            return Motion(
                at=at,
                x=left.x + (right.x - left.x) * amount,
                y=left.y + (right.y - left.y) * amount,
                scale=left.scale + (right.scale - left.scale) * amount,
                rotation=left.rotation + (right.rotation - left.rotation) * amount,
            )
    return motions[-1]


def clear_edge_white(image: Image.Image, threshold: int = 246) -> Image.Image:
    """Remove only near-white pixels connected to the image edge."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    stack = [(x, 0) for x in range(width)] + [(x, height - 1) for x in range(width)]
    stack += [(0, y) for y in range(height)] + [(width - 1, y) for y in range(height)]
    seen: set[tuple[int, int]] = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in seen:
            continue
        seen.add((x, y))
        red, green, blue, alpha = pixels[x, y]
        if alpha == 0 or min(red, green, blue) < threshold:
            continue
        pixels[x, y] = (red, green, blue, 0)
        if x > 0:
            stack.append((x - 1, y))
        if x + 1 < width:
            stack.append((x + 1, y))
        if y > 0:
            stack.append((x, y - 1))
        if y + 1 < height:
            stack.append((x, y + 1))
    return rgba


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def draw_centered(draw: ImageDraw.ImageDraw, text: str, y: int, text_font: ImageFont.ImageFont, fill: str) -> None:
    box = draw.textbbox((0, 0), text, font=text_font, stroke_width=8)
    x = (MASTER_SIZE[0] - (box[2] - box[0])) // 2
    draw.text((x, y), text, font=text_font, fill=fill, stroke_width=8, stroke_fill="#263238")


def frame(spec: dict[str, Any], character: Image.Image, at: float) -> Image.Image:
    width, height = MASTER_SIZE
    background = spec.get("background", {})
    top = background.get("top", "#17324d")
    bottom = background.get("bottom", "#4f9da6")
    canvas = Image.new("RGB", MASTER_SIZE)
    draw = ImageDraw.Draw(canvas)
    for y in range(height):
        amount = y / (height - 1)
        start = tuple(int(top[index:index + 2], 16) for index in (1, 3, 5))
        end = tuple(int(bottom[index:index + 2], 16) for index in (1, 3, 5))
        color = tuple(round(start[i] + (end[i] - start[i]) * amount) for i in range(3))
        draw.line((0, y, width, y), fill=color)

    motion = interpolate(motions_from(spec), at)
    pulse = 1 + 0.018 * math.sin(at * math.pi * 2 / 1.8)
    target_width = max(1, round(width * motion.scale * pulse))
    target_height = max(1, round(character.height * target_width / character.width))
    actor = character.resize((target_width, target_height), Image.Resampling.LANCZOS)
    actor = actor.rotate(motion.rotation, resample=Image.Resampling.BICUBIC, expand=True)
    x = round(width * motion.x - actor.width / 2)
    y = round(height * motion.y - actor.height / 2)
    canvas.paste(actor, (x, y), actor)

    title = spec.get("titleText", "")
    subtitle = spec.get("subtitle", "")
    if title:
        draw_centered(draw, title, 330, font(76), "#fff8dc")
    if subtitle:
        draw_centered(draw, subtitle, 1460, font(58), "#ffffff")
    return canvas


def render(spec: dict[str, Any], character: Image.Image, output: Path) -> None:
    fps = int(spec.get("fps", 30))
    duration = float(spec["duration"])
    output.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "ffmpeg", "-y", "-f", "rawvideo", "-pixel_format", "rgb24",
        "-video_size", "1080x1920", "-framerate", str(fps), "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    assert process.stdin is not None
    for index in range(round(duration * fps)):
        process.stdin.write(frame(spec, character, index / fps).tobytes())
    process.stdin.close()
    stderr = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
    if process.wait() != 0:
        raise RuntimeError(stderr[-3000:])


def crop_feed(master: Path, output: Path) -> None:
    subprocess.run([
        "ffmpeg", "-y", "-i", str(master), "-vf", "crop=1080:1350:0:285",
        "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(output),
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("spec", type=Path)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--preview", type=float)
    args = parser.parse_args()
    spec = load_spec(args.spec)
    issues = validate(spec)
    if issues:
        print(json.dumps({"status": "error", "issues": issues}, ensure_ascii=False, indent=2))
        return 1
    asset = ROOT / str(spec.get("characterAsset", DEFAULT_ASSET))
    if not asset.is_file():
        print(json.dumps({"status": "error", "issues": [f"character asset not found: {asset}"]}, ensure_ascii=False, indent=2))
        return 1
    manifest = {"status": "review", "characterAsset": str(asset.relative_to(ROOT)), "characterSha256": sha256(asset)}
    if args.check:
        print(json.dumps({"status": "ok", **manifest}, ensure_ascii=False, indent=2))
        return 0
    character = clear_edge_white(Image.open(asset))
    OUT.mkdir(parents=True, exist_ok=True)
    title = str(spec["title"])
    if args.preview is not None:
        at = max(0.0, min(float(spec["duration"]), args.preview))
        master_preview = frame(spec, character, at)
        master_path = OUT / f"{title}_preview_9x16.png"
        feed_path = OUT / f"{title}_preview_4x5.png"
        master_preview.save(master_path)
        master_preview.crop(FEED_BOX).save(feed_path)
        print(json.dumps({**manifest, "masterPreview": str(master_path), "feedPreview": str(feed_path)}, ensure_ascii=False, indent=2))
        return 0
    master_path = OUT / f"{title}_9x16.mp4"
    feed_path = OUT / f"{title}_4x5.mp4"
    render(spec, character, master_path)
    crop_feed(master_path, feed_path)
    manifest.update({"master": str(master_path), "feed": str(feed_path)})
    (OUT / f"{title}.manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
