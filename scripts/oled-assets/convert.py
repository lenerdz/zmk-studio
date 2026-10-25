#!/usr/bin/env python3
"""
Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK Studio.

Turns the pictures and the fonts of the zmk-nice-oled shield (LVGL C files) into the
PNG sprites that the OLED tab draws, and writes src/oled/assets/sprites.ts with
what the app needs to know about each one (size, frames, URL).

    python scripts/oled-assets/convert.py \
        --nice-oled <zmk-nice-oled>/boards/shields/nice_oled \
        --unscii <lvgl>/src/font/lv_font_unscii_8.c \
        --revision <commit of zmk-nice-oled>

What it does to the data, so that the sprites are what the OLED shows:

* The LVGL images are 1 bit per pixel with a two colour palette. zmk-nice-oled draws
  its ink in black (LVGL_FOREGROUND) and the OLED shows it lit, so a pixel is lit
  when its palette entry is dark. The branch of the palette that is read is the one
  of the build without CONFIG_NICE_OLED_WIDGET_INVERTED (the default). A lit pixel is
  written opaque and the others are transparent, so the sprite goes on any
  background: the app puts it on a dark screen.
* The animations and the still images of the right screen are stored turned for the
  panel (the widget places them on the canvas after it was rotated), so they are
  rotated back here: the sprites are upright, as the screen is looked at. Their size
  in the manifest is the upright one; the size of the file is that one swapped.
* The pictures that scripts/pictures/make_pictures.py of the shield draws (the kinds
  from 7 on) are listed in assets/pictures/pictures.json of the shield: the script
  reads that list, so a new picture needs no change here, and it fails when a
  picture is not the size the list says. A retired picture (see "retired" in that file)
  is not in the list and has no sprite: the PNG files of the output folder that the run
  does not write are deleted, so the folder is what the list says and nothing else.
* The fonts become one row of cells, one cell per character from 0x20 to 0x7E, as
  wide as the advance of the font and as tall as its line, so the app draws a text
  by picking a cell for each letter.

The output is deterministic: running it twice gives the same files.
"""
import argparse
import json
import os
import re
import sys

from PIL import Image

LIT = (0xDF, 0xF1, 0xFF, 0xFF)
OFF = (0, 0, 0, 0)

# name in the manifest -> (C file of the assets, name of the first image, frames)
ANIMATIONS = {
    "crystal": ("crystal.c", "crystal_{:02d}", 16, 1),
    "cat": ("cat.c", "cat_{}", 8, 0),
    "head": ("head.c", "head_{:02d}", 16, 0),
    "spaceman": ("spaceman.c", "spaceman_{:02d}", 20, 0),
    "pokemon": ("pokemon.c", "pokemon_{:02d}", 48, 0),
}

# The still images of the original shield (vim and vip_marcos) were retired from the
# fork (kinds 5 and 6 keep their numbers but have no picture), so there is nothing here
# any more. Every still image that is left is drawn by make_pictures.py and comes
# from pictures.json.
STILLS = {}

# images that are drawn as they are (the canvas is turned after they are drawn)
ICONS = {
    "usb": ("images.c", "usb"),
    "bt": ("images.c", "bt"),
    "bt_no_signal": ("images.c", "bt_no_signal"),
    "bt_unbonded": ("images.c", "bt_unbonded"),
    "gauge": ("images.c", "gauge"),
    "grid": ("images.c", "grid"),
    "profiles": ("images.c", "profiles"),
    "profile": ("profile.c", "profile"),
    "profile_active": ("profile_active.c", "profile_active"),
}

FONTS = {
    # name in the manifest -> (file, kind)
    "pixel8": ("src/fonts/pixel_operator_mono_8.c", "nice"),
    "pixel12": ("src/fonts/pixel_operator_mono_12.c", "nice"),
    "pixel16": ("src/fonts/pixel_operator_mono_16.c", "nice"),
    "unscii8": (None, "unscii"),
}

FIRST_CHAR = 0x20
LAST_CHAR = 0x7E


def strip_c(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"//[^\n]*", "", text)


def array_bytes(body):
    """The bytes of a C array, taking the #else branch of CONFIG_NICE_OLED_WIDGET_INVERTED."""
    active = [True]
    out = []
    for line in strip_c(body).splitlines():
        stripped = line.strip()
        if stripped.startswith("#if"):
            # the branch that is read is the one of the default build
            active.append(active[-1] and "INVERTED" not in stripped)
        elif stripped.startswith("#else"):
            top = active.pop()
            active.append(active[-1] and not top)
        elif stripped.startswith("#endif"):
            active.pop()
        elif stripped.startswith("#"):
            continue
        elif active[-1]:
            out.extend(int(x, 16) for x in re.findall(r"0x([0-9a-fA-F]{1,2})", line))
    return out


def parse_images(path):
    """name -> (width, height, rows of lit flags) for every image of a LVGL C file."""
    text = open(path, encoding="utf-8", errors="replace").read()
    arrays = {}
    for m in re.finditer(r"uint8_t\s+(\w+)\[\]\s*=\s*\{(.*?)\};", text, re.S):
        arrays[m.group(1)] = array_bytes(m.group(2))
    images = {}
    for m in re.finditer(r"const\s+lv_(?:img|image)_dsc_t\s+(\w+)\s*=\s*\{(.*?)\};", text, re.S):
        name, body = m.group(1), m.group(2)
        w = int(re.search(r"\.header\.w\s*=\s*(\d+)", body).group(1))
        h = int(re.search(r"\.header\.h\s*=\s*(\d+)", body).group(1))
        data = arrays[re.search(r"\.data\s*=\s*(\w+)", body).group(1)]
        palette, pixels = data[:8], data[8:]
        stride = (w + 7) // 8
        if len(pixels) != stride * h:
            sys.exit(f"{path}: {name}: {len(pixels)} bytes of pixels, expected {stride * h}")
        # a palette entry is B, G, R, A; the dark one is lit on the OLED
        dark = [sum(palette[i * 4:i * 4 + 3]) / 3 < 128 for i in (0, 1)]
        rows = []
        for y in range(h):
            row = []
            for x in range(w):
                bit = (pixels[y * stride + x // 8] >> (7 - x % 8)) & 1
                row.append(dark[bit])
            rows.append(row)
        images[name] = (w, h, rows)
    return images


def to_image(rows, rotate=False):
    h, w = len(rows), len(rows[0])
    img = Image.new("RGBA", (w, h), OFF)
    px = img.load()
    for y in range(h):
        for x in range(w):
            if rows[y][x]:
                px[x, y] = LIT
    # PIL turns counterclockwise: the files hold the picture turned clockwise
    return img.rotate(90, expand=True) if rotate else img


def save(img, path):
    img.save(path, optimize=True)


def sheet(frames):
    w, h = frames[0].size
    out = Image.new("RGBA", (w * len(frames), h), OFF)
    for i, frame in enumerate(frames):
        if frame.size != (w, h):
            sys.exit("frames of different sizes")
        out.paste(frame, (i * w, 0))
    return out


def parse_font(path):
    text = open(path, encoding="utf-8", errors="replace").read()
    m = re.search(r"uint8_t\s+glyph_bitmap\w*\[\]\s*=\s*\{(.*?)\};", text, re.S)
    bitmap = [int(x, 16) for x in re.findall(r"0x([0-9a-fA-F]{1,2})", strip_c(m.group(1)))]
    glyphs = []
    for g in re.finditer(
        r"\{\s*\.bitmap_index\s*=\s*(\d+),\s*\.adv_w\s*=\s*(\d+),\s*\.box_w\s*=\s*(\d+),\s*"
        r"\.box_h\s*=\s*(\d+),\s*\.ofs_x\s*=\s*(-?\d+),\s*\.ofs_y\s*=\s*(-?\d+)\s*\}",
        text,
    ):
        glyphs.append(tuple(int(v) for v in g.groups()))
    cmap = re.search(
        r"\.range_start\s*=\s*(\d+),\s*\.range_length\s*=\s*(\d+),\s*\.glyph_id_start\s*=\s*(\d+)", text
    )
    start, length, first_id = (int(v) for v in cmap.groups())
    line_height = int(re.search(r"\.line_height\s*=\s*(\d+)", text).group(1))
    base_line = int(re.search(r"\.base_line\s*=\s*(\d+)", text).group(1))
    return bitmap, glyphs, (start, length, first_id), line_height, base_line


def font_atlas(path):
    bitmap, glyphs, (start, length, first_id), line_height, base_line = parse_font(path)
    advance = glyphs[first_id][1] / 16
    if advance != int(advance):
        sys.exit(f"{path}: the advance is not a whole number of pixels")
    advance = int(advance)
    count = LAST_CHAR - FIRST_CHAR + 1
    atlas = Image.new("RGBA", (advance * count, line_height), OFF)
    px = atlas.load()
    for code in range(FIRST_CHAR, LAST_CHAR + 1):
        if not (start <= code < start + length):
            continue
        _, adv, box_w, box_h, ofs_x, ofs_y = glyphs[first_id + code - start]
        if adv / 16 != advance:
            sys.exit(f"{path}: {code:#x} does not have the advance of the font")
        index = glyphs[first_id + code - start][0]
        for row in range(box_h):
            for col in range(box_w):
                bit_index = row * box_w + col
                if (bitmap[index + bit_index // 8] >> (7 - bit_index % 8)) & 1:
                    x = (code - FIRST_CHAR) * advance + ofs_x + col
                    y = line_height - base_line - box_h - ofs_y + row
                    if 0 <= y < line_height and (code - FIRST_CHAR) * advance <= x < (code - FIRST_CHAR + 1) * advance:
                        px[x, y] = LIT
    return atlas, advance, line_height, base_line


def load_pictures(assets):
    """The pictures of make_pictures.py, from assets/pictures/pictures.json (none if there is no file)."""
    path = os.path.join(assets, "pictures", "pictures.json")
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)["pictures"]


def camel(name):
    parts = re.split(r"[_\-]", name)
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--nice-oled", required=True, help="boards/shields/nice_oled of zmk-nice-oled")
    parser.add_argument("--unscii", required=True, help="src/font/lv_font_unscii_8.c of LVGL")
    parser.add_argument("--revision", required=True, help="commit of zmk-nice-oled the files come from")
    parser.add_argument("--out", default=os.path.join("src", "oled", "assets"))
    args = parser.parse_args()

    assets = os.path.join(args.nice_oled, "assets")
    os.makedirs(args.out, exist_ok=True)
    cache = {}

    def images_of(name):
        if name not in cache:
            cache[name] = parse_images(os.path.join(assets, name))
        return cache[name]

    entries = []  # (key, file, width, height, frames, kind)

    for key, (cfile, pattern, count, first) in ANIMATIONS.items():
        images = images_of(cfile)
        frames = []
        for i in range(count):
            name = pattern.format(i + first)
            if name not in images:
                sys.exit(f"{cfile}: no image {name}")
            w, h, rows = images[name]
            frames.append(to_image(rows, rotate=True))
        out = sheet(frames)
        file = f"anim-{key}.png"
        save(out, os.path.join(args.out, file))
        entries.append((key, file, frames[0].width, frames[0].height, count, "animation"))

    for key, (cfile, name) in STILLS.items():
        w, h, rows = images_of(cfile)[name]
        img = to_image(rows, rotate=True)
        file = f"still-{key}.png"
        save(img, os.path.join(args.out, file))
        entries.append((key, file, img.width, img.height, 1, "still"))

    taken = {e[0] for e in entries} | set(ICONS)
    for picture in load_pictures(assets):
        key, cfile = picture["name"], f"pictures/{picture['name']}.c"
        if key in taken:
            sys.exit(f"the picture {key} of pictures.json has the name of a sprite that exists")
        taken.add(key)
        images = images_of(cfile)
        if picture["type"] == "animation":
            frames = []
            for i in range(picture["frames"]):
                name = f"pic_{key}_{i:02d}"
                if name not in images:
                    sys.exit(f"{cfile}: no image {name}")
                frames.append(to_image(images[name][2], rotate=True))
            out = sheet(frames)
            file, kind, count = f"anim-{key}.png", "animation", picture["frames"]
            size = frames[0].size
        else:
            out = to_image(images[f"pic_{key}"][2], rotate=True)
            file, kind, count = f"still-{key}.png", "still", 1
            size = out.size
        if size != (picture["width"], picture["height"]):
            sys.exit(f"{cfile}: {size[0]} x {size[1]} pixels, pictures.json says {picture['width']} x {picture['height']}")
        save(out, os.path.join(args.out, file))
        entries.append((key, file, size[0], size[1], count, kind))

    for key, (cfile, name) in ICONS.items():
        w, h, rows = images_of(cfile)[name]
        img = to_image(rows)
        file = f"icon-{key.replace('_', '-')}.png"
        save(img, os.path.join(args.out, file))
        entries.append((key, file, w, h, 1, "icon"))

    fonts = []
    for key, (file, kind) in FONTS.items():
        path = args.unscii if kind == "unscii" else os.path.join(args.nice_oled, file)
        atlas, advance, line_height, base_line = font_atlas(path)
        out_file = f"font-{key}.png"
        save(atlas, os.path.join(args.out, out_file))
        fonts.append((key, out_file, advance, line_height, base_line))

    lines = [
        "/*",
        " * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK",
        " * Studio.",
        " *",
        " * GENERATED by scripts/oled-assets/convert.py from the pictures and fonts of",
        f" * zmk-nice-oled ({args.revision}). Do not edit it: run the script again.",
        " *",
        " * The sprites are upright, lit pixels opaque and the others transparent; see the",
        " * script for what it does to the data of the firmware.",
        " */",
    ]
    for key, file, *_ in entries:
        lines.append(f'import {camel("sprite_" + key)} from "./{file}";')
    for key, file, *_ in fonts:
        lines.append(f'import {camel("font_" + key)} from "./{file}";')
    lines += [
        "",
        f'export const NICE_OLED_REVISION = "{args.revision}";',
        "",
        "export interface SpriteInfo {",
        "  /** URL of the PNG: the frames side by side, in a row. */",
        "  url: string;",
        "  /** Size of one frame (upright, as the screen is looked at). */",
        "  width: number;",
        "  height: number;",
        "  frames: number;",
        '  kind: "animation" | "still" | "icon";',
        "}",
        "",
        "export const SPRITES = {",
    ]
    for key, file, w, h, frames, kind in entries:
        lines.append(
            f'  {key}: {{ url: {camel("sprite_" + key)}, width: {w}, height: {h}, frames: {frames}, kind: "{kind}" }},'
        )
    lines += [
        "} as const satisfies Record<string, SpriteInfo>;",
        "",
        "export type SpriteName = keyof typeof SPRITES;",
        "",
        "export interface FontInfo {",
        "  /** URL of the PNG: one cell per character, from the space to the tilde. */",
        "  url: string;",
        "  /** Width of a cell: every character advances this much. */",
        "  advance: number;",
        "  /** Height of a cell: the line of the font. */",
        "  lineHeight: number;",
        "  /** Rows between the bottom of the line and the baseline. */",
        "  baseLine: number;",
        "}",
        "",
        "export const FONTS = {",
    ]
    for key, file, advance, line_height, base_line in fonts:
        lines.append(
            f"  {key}: {{ url: {camel('font_' + key)}, advance: {advance}, lineHeight: {line_height}, baseLine: {base_line} }},"
        )
    lines += [
        "} as const satisfies Record<string, FontInfo>;",
        "",
        "export type FontName = keyof typeof FONTS;",
        "",
        f"export const FIRST_CHAR = {FIRST_CHAR};",
        f"export const LAST_CHAR = {LAST_CHAR};",
        "",
    ]
    with open(os.path.join(args.out, "sprites.ts"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))

    # A picture that was retired leaves its PNG behind: the folder has to hold what
    # this run wrote and nothing else, or the files would depend on the runs before.
    written = {e[1] for e in entries} | {fonts_entry[1] for fonts_entry in fonts}
    for name in sorted(os.listdir(args.out)):
        if name.endswith(".png") and name not in written:
            os.remove(os.path.join(args.out, name))
            print(f"removed   {name} (no longer in the pictures of the shield)")

    for key, file, w, h, frames, kind in entries:
        print(f"{kind:9} {key:15} {w}x{h} x{frames} -> {file}")
    for key, file, advance, line_height, base_line in fonts:
        print(f"font      {key:15} advance {advance}, line {line_height}, base {base_line} -> {file}")


if __name__ == "__main__":
    main()
