#!/usr/bin/env python3
"""Paste a protected raster source 1:1 without crop, scaling, or colour edits."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

from PIL import Image


EXPECTED_SIZE = (1080, 1350)


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--background", required=True, type=Path)
    parser.add_argument("--protected", required=True, type=Path)
    parser.add_argument("--expected-sha256", required=True)
    parser.add_argument("--x", required=True, type=int)
    parser.add_argument("--y", required=True, type=int)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    actual_hash = file_hash(args.protected)
    if actual_hash != args.expected_sha256.lower():
        raise SystemExit(f"protected source hash mismatch: {actual_hash}")
    if args.output.resolve() in {args.background.resolve(), args.protected.resolve()}:
        raise SystemExit("output must not overwrite an input")

    with Image.open(args.background) as background_source:
        background = background_source.convert("RGB")
    if background.size != EXPECTED_SIZE:
        raise SystemExit(f"background must be {EXPECTED_SIZE[0]}x{EXPECTED_SIZE[1]}")

    with Image.open(args.protected) as protected_source:
        protected = protected_source.convert("RGB")
    if args.x < 0 or args.y < 0:
        raise SystemExit("x and y must be non-negative")
    if args.x + protected.width > background.width or args.y + protected.height > background.height:
        raise SystemExit("protected source does not fit without transformation")

    background.paste(protected, (args.x, args.y))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    background.save(args.output, format="PNG")
    print(f"OK {args.output} protected={protected.width}x{protected.height} at {args.x},{args.y}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
