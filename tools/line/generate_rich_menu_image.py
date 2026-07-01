#!/usr/bin/env python3
"""
LINEリッチメニュー画像(2500x843・compactサイズ)を生成する。
すーすーわーわーの実キャラクターイラストを使い、ふわふわランドの世界観
(暖色クリーム×キャラクター)に合わせた仕上げにしている。

使い方: python3 tools/line/generate_rich_menu_image.py
出力: public/content/yourtime-platform/menu/rich-menu-2500x843.png
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont

WIDTH, HEIGHT = 2500, 843
OUT = "public/content/yourtime-platform/menu/rich-menu-2500x843.png"
BOLD_FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
REGULAR_FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
CHAR_DIR = "public/content/fuwafuwa-land/characters/display"

CELL_W = WIDTH // 2
CELL_H = HEIGHT // 2
BG = "#f7efe1"
INK = "#302819"
SUB = "#7b6f55"

TILES = [
    {
        "label": "すわぷよ",
        "body": "なかまと遊んで、お口体操へ",
        "accent": "#f5a623",
        "card": "#fff7e4",
        "character": "suusuu.png",
        "char_side": "right",
    },
    {
        "label": "村の案内所",
        "body": "マップ・スタンプラリー",
        "accent": "#69bdb5",
        "card": "#eef8f5",
        "character": "waawaa.png",
        "char_side": "left",
    },
    {
        "label": "ふわふわランド",
        "body": "描いた絵と村を見る",
        "accent": "#8bd46e",
        "card": "#f2f9ec",
        "character": "rapiko.png",
        "char_side": "right",
    },
    {
        "label": "お口体操",
        "body": "もぐぴよとすぐ体操する",
        "accent": "#ff8fab",
        "card": "#fff0f4",
        "character": "mogupiyo.png",
        "char_side": "left",
    },
]


def rounded_shadow(size, radius, blur=18, offset=(0, 10), opacity=70):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    pad = blur * 2
    draw.rounded_rectangle(
        [pad, pad, size[0] - pad - offset[0], size[1] - pad - offset[1]],
        radius=radius,
        fill=(30, 20, 10, opacity),
    )
    return layer.filter(ImageFilter.GaussianBlur(blur))


def draw_cell(base, tile, x0, y0):
    cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))

    card_pad = 18
    card_box = [card_pad, card_pad, CELL_W - card_pad, CELL_H - card_pad]

    shadow = rounded_shadow((CELL_W, CELL_H), radius=32)
    cell.alpha_composite(shadow)

    draw = ImageDraw.Draw(cell)
    draw.rounded_rectangle(card_box, radius=32, fill=tile["card"])
    # アクセントカラーのタブ(上端だけ帯を乗せて単調な全周ボーダーを避ける)
    tab_w = 96
    draw.rounded_rectangle(
        [card_box[0] + 26, card_box[1], card_box[0] + 26 + tab_w, card_box[1] + 14],
        radius=7,
        fill=tile["accent"],
    )

    # キャラクター(カード上端からわずかにはみ出させて奥行きを出す)
    char = Image.open(f"{CHAR_DIR}/{tile['character']}").convert("RGBA")
    bbox = char.getbbox()
    if bbox is not None:
        char = char.crop(bbox)
    char_h = int(CELL_H * 0.86)
    ratio = char_h / char.height
    char = char.resize((int(char.width * ratio), char_h))
    char_y = CELL_H - char_h - 6
    if tile["char_side"] == "right":
        char_x = CELL_W - char.width - 40
        text_x = card_box[0] + 56
        text_align_right = False
    else:
        char_x = 40
        text_x = CELL_W - card_pad - 56
        text_align_right = True
    cell.alpha_composite(char, (char_x, char_y))

    label_font = ImageFont.truetype(BOLD_FONT, 68)
    body_font = ImageFont.truetype(REGULAR_FONT, 32)
    label_y = CELL_H / 2 - 66
    body_y = CELL_H / 2 + 14

    if text_align_right:
        lb = draw.textbbox((0, 0), tile["label"], font=label_font)
        draw.text((text_x - (lb[2] - lb[0]), label_y), tile["label"], fill=INK, font=label_font)
        bb = draw.textbbox((0, 0), tile["body"], font=body_font)
        draw.text((text_x - (bb[2] - bb[0]), body_y), tile["body"], fill=SUB, font=body_font)
    else:
        draw.text((text_x, label_y), tile["label"], fill=INK, font=label_font)
        draw.text((text_x, body_y), tile["body"], fill=SUB, font=body_font)

    base.alpha_composite(cell, (x0, y0))


def main() -> None:
    base = Image.new("RGBA", (WIDTH, HEIGHT), BG)
    for index, tile in enumerate(TILES):
        col = index % 2
        row = index // 2
        draw_cell(base, tile, col * CELL_W, row * CELL_H)
    base.convert("RGB").save(OUT)
    print(f"saved: {OUT} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
