#!/usr/bin/env python3
"""Fail closed on feed size, exact copy, protected-source hash, and pixel identity."""

from __future__ import annotations

import argparse
import hashlib
import json
import unicodedata
from pathlib import Path

from PIL import Image, ImageChops


EXPECTED_SIZE = (1080, 1350)


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_text(path: Path) -> str:
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
    return unicodedata.normalize("NFC", text).rstrip("\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, type=Path)
    parser.add_argument("--expected-copy", type=Path)
    parser.add_argument("--observed-copy", type=Path)
    parser.add_argument("--protected-source", type=Path)
    parser.add_argument("--protected-sha256")
    parser.add_argument("--protected-x", type=int)
    parser.add_argument("--protected-y", type=int)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    failures: list[str] = []
    checks: dict[str, object] = {}

    with Image.open(args.image) as image_source:
        image = image_source.convert("RGB")
    checks["size"] = list(image.size)
    if image.size != EXPECTED_SIZE:
        failures.append(f"size must be {EXPECTED_SIZE[0]}x{EXPECTED_SIZE[1]}")

    copy_args = (args.expected_copy, args.observed_copy)
    if any(copy_args) and not all(copy_args):
        failures.append("expected-copy and observed-copy must be provided together")
    elif all(copy_args):
        expected = canonical_text(args.expected_copy)
        observed = canonical_text(args.observed_copy)
        checks["copy_exact_match"] = expected == observed
        if expected != observed:
            failures.append("observed copy does not exactly match expected copy")

    protected_args = (
        args.protected_source,
        args.protected_sha256,
        args.protected_x,
        args.protected_y,
    )
    if any(value is not None for value in protected_args) and not all(value is not None for value in protected_args):
        failures.append("all protected-source arguments must be provided together")
    elif all(value is not None for value in protected_args):
        actual_hash = file_hash(args.protected_source)
        checks["protected_source_sha256"] = actual_hash
        if actual_hash != args.protected_sha256.lower():
            failures.append("protected source hash mismatch")
        with Image.open(args.protected_source) as protected_source:
            protected = protected_source.convert("RGB")
        box = (
            args.protected_x,
            args.protected_y,
            args.protected_x + protected.width,
            args.protected_y + protected.height,
        )
        if box[0] < 0 or box[1] < 0 or box[2] > image.width or box[3] > image.height:
            failures.append("protected source region is outside the final image")
        else:
            embedded = image.crop(box)
            exact = ImageChops.difference(embedded, protected).getbbox() is None
            checks["protected_pixels_exact"] = exact
            if not exact:
                failures.append("protected source pixels were changed")

    result = {
        "status": "pass" if not failures else "fail",
        "image": str(args.image),
        "checks": checks,
        "failures": failures,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
