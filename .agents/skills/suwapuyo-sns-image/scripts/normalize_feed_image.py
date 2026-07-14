#!/usr/bin/env python3
"""Normalize generated artwork to an exact 1080x1350 Instagram feed canvas."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageColor, ImageOps


WIDTH = 1080
HEIGHT = 1350


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--mode", choices=("contain", "cover"), default="contain")
    parser.add_argument("--fill", default="#08152f")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.input.resolve() == args.output.resolve():
        raise SystemExit("input and output must differ")

    with Image.open(args.input) as source:
        image = source.convert("RGB")
        if args.mode == "cover":
            result = ImageOps.fit(image, (WIDTH, HEIGHT), method=Image.Resampling.LANCZOS)
        else:
            result = Image.new("RGB", (WIDTH, HEIGHT), ImageColor.getrgb(args.fill))
            fitted = ImageOps.contain(image, (WIDTH, HEIGHT), method=Image.Resampling.LANCZOS)
            x = (WIDTH - fitted.width) // 2
            y = (HEIGHT - fitted.height) // 2
            result.paste(fitted, (x, y))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.save(args.output, format="PNG")
    print(f"OK {args.output} {WIDTH}x{HEIGHT} mode={args.mode}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
