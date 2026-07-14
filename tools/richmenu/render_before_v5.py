"""Render the approved-before rich menu from the v4 illustration.

The illustration remains the source artwork; this script only swaps the two
lower panels and draws exact, readable labels plus restrained panel outlines.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
MENU_DIR = ROOT / "public/content/02_ユアタイム/01_リッチメニュー"
SOURCE = MENU_DIR / "02_開催前_案v4.jpg"
OUTPUT = MENU_DIR / "01_開催前_最終v5.jpg"
FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"

SIZE = (2500, 1686)
AREAS = {
    "main": (0, 0, 1000, 1686),
    "top_left": (1000, 0, 1750, 843),
    "top_right": (1750, 0, 2500, 843),
    "bottom_left": (1000, 843, 1750, 1686),
    "bottom_right": (1750, 843, 2500, 1686),
}


def crop_box(image: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    return image.crop(box).copy()


def paste_box(image: Image.Image, box: tuple[int, int, int, int], panel: Image.Image) -> None:
    image.paste(panel.resize((box[2] - box[0], box[3] - box[1]), Image.Resampling.LANCZOS), box[:2])


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT, size)


def centered_text(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], text: str, size: int) -> None:
    left, top, right, bottom = box
    draw.multiline_text(
        ((left + right) / 2, (top + bottom) / 2),
        text,
        font=font(size),
        fill=(47, 42, 28, 255),
        anchor="mm",
        align="center",
        spacing=4,
        stroke_width=1,
        stroke_fill=(255, 249, 225, 210),
    )


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    if image.size != SIZE:
        raise ValueError(f"expected {SIZE}, got {image.size}")

    # Swap only the illustrated upper portion of the lower panels. Keeping the
    # label bands out of this operation avoids carrying any old text across.
    swap_top = 843
    swap_bottom = 1370
    left_art = image.crop((1000, swap_top, 1750, swap_bottom)).copy()
    right_art = image.crop((1750, swap_top, 2500, swap_bottom)).copy()
    image.paste(right_art, (1000, swap_top))
    image.paste(left_art, (1750, swap_top))

    overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Very soft separators: visible enough to infer the five tap zones,
    # deliberately lighter than the illustration and existing cards.
    line = (255, 249, 225, 105)
    for box in AREAS.values():
        left, top, right, bottom = box
        inset = 18
        draw.rounded_rectangle(
            (left + inset, top + inset, right - inset, bottom - inset),
            radius=34,
            outline=line,
            width=7,
        )

    # Paint only the existing label bands before drawing exact text. The
    # translucent cream bands retain the v4 palette while removing old copy.
    bands = {
        "main": (70, 68, 930, 260),
        "top_left": (1040, 58, 1710, 235),
        "top_right": (1790, 58, 2460, 245),
        "bottom_left": (1040, 1290, 1710, 1645),
        "bottom_right": (1790, 1290, 2460, 1645),
    }
    for box in bands.values():
        draw.rounded_rectangle(box, radius=44, fill=(255, 249, 225, 250))

    # The source illustration contains a decorative duplicate booth sign.
    # Cover it softly so the menu has one unambiguous label per tap area.
    draw.rounded_rectangle((1170, 590, 1690, 735), radius=42, fill=(248, 239, 211, 235))
    booth = (213, 126, 36, 220)
    draw.rectangle((1380, 635, 1480, 700), outline=booth, width=8)
    draw.line((1360, 635, 1500, 635), fill=booth, width=8)
    for x in (1365, 1400, 1435, 1470):
        draw.line((x, 635, x + 18, 610), fill=booth, width=8)
    draw.line((1430, 655, 1430, 700), fill=booth, width=8)

    centered_text(draw, bands["main"], "すわぷよで遊ぶ", 86)
    centered_text(draw, bands["top_left"], "YourTIME.出展ブース紹介", 43)
    centered_text(draw, bands["top_right"], "YourTIME.\n日時／アクセス", 48)
    centered_text(draw, bands["bottom_left"], "すわぷよって？", 55)
    centered_text(draw, bands["bottom_right"], "すわぷよの作り手", 55)

    result = Image.alpha_composite(image, overlay).convert("RGB")
    result.save(OUTPUT, format="JPEG", quality=82, optimize=True, progressive=True)
    print(f"wrote {OUTPUT} ({result.size[0]}x{result.size[1]})")


if __name__ == "__main__":
    main()
