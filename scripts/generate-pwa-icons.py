#!/usr/bin/env python3
"""Generates the PWA app icons (192x192 and 512x512 PNG) as a simple
brand-purple rounded square with a white house+rupee glyph — no external
assets or network calls, just raw pixel drawing + zlib/PNG encoding via the
stdlib. Re-run with `python3 scripts/generate-pwa-icons.py` if the brand
color ever changes.
"""
import struct
import zlib
import os

BRAND = (79, 70, 229)  # #4f46e5 — matches --color-brand-500 in src/index.css
WHITE = (255, 255, 255)


def make_icon(size: int) -> bytes:
    px = [[BRAND for _ in range(size)] for _ in range(size)]

    # Rounded-square background via corner masking (antialiasing skipped —
    # fine at these sizes/purpose).
    radius = size * 0.18

    def in_rounded_square(x, y):
        cx = min(max(x, radius), size - radius)
        cy = min(max(y, radius), size - radius)
        return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 or (radius <= x <= size - radius) or (radius <= y <= size - radius)

    # House glyph: triangle roof + rectangle body, in white, centered.
    cx, cy = size / 2, size / 2
    roof_half_w = size * 0.28
    roof_top_y = size * 0.22
    roof_base_y = size * 0.48
    body_w = size * 0.4
    body_top_y = roof_base_y
    body_bottom_y = size * 0.78
    door_w = size * 0.12
    door_h = size * 0.18

    def in_roof(x, y):
        if y < roof_top_y or y > roof_base_y:
            return False
        t = (y - roof_top_y) / (roof_base_y - roof_top_y)
        half_w_at_y = roof_half_w * t
        return abs(x - cx) <= half_w_at_y

    def in_body(x, y):
        return body_top_y <= y <= body_bottom_y and abs(x - cx) <= body_w / 2

    def in_door(x, y):
        return (body_bottom_y - door_h) <= y <= body_bottom_y and abs(x - cx) <= door_w / 2

    for y in range(size):
        for x in range(size):
            if not in_rounded_square(x, y):
                px[y][x] = None  # transparent corner
                continue
            if in_roof(x, y) or (in_body(x, y) and not in_door(x, y)):
                px[y][x] = WHITE

    return encode_png(px, size)


def encode_png(px, size) -> bytes:
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # no filter
        for x in range(size):
            p = px[y][x]
            if p is None:
                raw.extend((0, 0, 0, 0))
            else:
                raw.extend((*p, 255))
    idat = zlib.compress(bytes(raw), 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
    os.makedirs(out_dir, exist_ok=True)
    for size in (192, 512):
        data = make_icon(size)
        path = os.path.join(out_dir, f"icon-{size}.png")
        with open(path, "wb") as f:
            f.write(data)
        print(f"wrote {path} ({len(data)} bytes)")
