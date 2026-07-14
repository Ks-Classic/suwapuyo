#!/usr/bin/env python3
"""Reject rich-menu assets without GPT Image 2 provenance and review approval."""

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


def fail(message: str) -> None:
    raise SystemExit(f"ASSET GATE FAILED: {message}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path)
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()

    if not args.image.exists():
        fail(f"画像がありません: {args.image}")
    if not args.manifest.exists():
        fail(f"生成マニフェストがありません: {args.manifest}")

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    if manifest.get("status") != "approved":
        fail("status=approved の人レビューがありません")
    if manifest.get("generation_model") != "gpt-image-2":
        fail("generation_model は gpt-image-2 必須です")
    if manifest.get("generation_method") != "openai-imagegen":
        fail("generation_method は openai-imagegen 必須です")
    if manifest.get("human_review", {}).get("visual") is not True:
        fail("human_review.visual=true が必要です")
    if manifest.get("human_review", {}).get("text_exact") is not True:
        fail("human_review.text_exact=true が必要です")

    with Image.open(args.image) as image:
        if image.size != (2500, 1686):
            fail(f"画像寸法は2500x1686必須です: {image.size}")
        if image.format not in {"JPEG", "PNG"}:
            fail(f"画像形式はJPEGまたはPNG必須です: {image.format}")
    size = args.image.stat().st_size
    if size > 1_000_000:
        fail(f"画像は1MB以下必須です: {size} bytes")

    digest = hashlib.sha256(args.image.read_bytes()).hexdigest()
    if manifest.get("sha256") != digest:
        fail("マニフェストのsha256と画像が一致しません")

    print(json.dumps({"status": "approved", "image": str(args.image), "sha256": digest}, ensure_ascii=False))


if __name__ == "__main__":
    main()
