"""Generate orange-themed PNG icons using only Python stdlib (zlib + struct)."""
import struct
import zlib
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets")


def make_png(size: int, path: str):
    bg = (11, 11, 15)
    orange_a = (255, 138, 61)
    orange_b = (255, 87, 34)
    cx = cy = size / 2
    radius_outer = size * 0.46
    corner = size * 0.22

    bar_left = size * 0.30
    bar_right = size * 0.40
    bar_top = size * 0.22
    bar_bottom = size * 0.78
    arc_cx = size * 0.40
    arc_cy = size * 0.50
    arc_outer = size * 0.30
    arc_inner = size * 0.20

    rows = []
    for y in range(size):
        row = bytearray()
        row.append(0)
        for x in range(size):
            dx = abs(x - cx)
            dy = abs(y - cy)
            half = size / 2
            outside = False
            if dx > half - corner and dy > half - corner:
                d = ((dx - (half - corner)) ** 2 + (dy - (half - corner)) ** 2) ** 0.5
                if d > corner:
                    outside = True
            if outside:
                row += bytes((0, 0, 0, 0))
                continue

            r, g, b = bg
            d_center = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            t = max(0, 1 - d_center / radius_outer)
            glow = t * t * 0.35
            r = int(min(255, r + (orange_a[0] - r) * glow))
            g = int(min(255, g + (orange_a[1] - g) * glow))
            b = int(min(255, b + (orange_a[2] - b) * glow))

            in_bar = bar_left <= x <= bar_right and bar_top <= y <= bar_bottom
            in_arc = False
            if x >= arc_cx - 2 and bar_top <= y <= bar_bottom:
                d_arc = ((x - arc_cx) ** 2 + (y - arc_cy) ** 2) ** 0.5
                if arc_inner <= d_arc <= arc_outer:
                    in_arc = True

            # connect arc top/bottom to the bar
            if bar_left <= x <= arc_cx:
                if abs(y - bar_top) < (arc_outer - arc_inner) and y >= bar_top:
                    in_arc = True
                if abs(y - bar_bottom) < (arc_outer - arc_inner) and y <= bar_bottom:
                    in_arc = True

            if in_bar or in_arc:
                tt = ((x - bar_left) + (y - bar_top)) / (size * 0.6)
                tt = max(0, min(1, tt))
                cr = int(orange_a[0] + (orange_b[0] - orange_a[0]) * tt)
                cg = int(orange_a[1] + (orange_b[1] - orange_a[1]) * tt)
                cb = int(orange_a[2] + (orange_b[2] - orange_a[2]) * tt)
                r, g, b = cr, cg, cb
            row += bytes((r, g, b, 255))
        rows.append(bytes(row))

    raw = b"".join(rows)
    compressed = zlib.compress(raw, 9)

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print(f"wrote {path} ({size}x{size}, {len(png)} bytes)")


if __name__ == "__main__":
    out = os.path.abspath(OUT_DIR)
    os.makedirs(out, exist_ok=True)
    make_png(192, os.path.join(out, "icon-192.png"))
    make_png(512, os.path.join(out, "icon-512.png"))
