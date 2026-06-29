"""Generate a minimal solid-color PNG icon without external deps."""
import struct
import zlib

width, height = 512, 512
r, g, b = 61, 139, 110

raw_rows = []
for _ in range(height):
    row = b"\x00" + bytes([r, g, b]) * width
    raw_rows.append(row)
raw = b"".join(raw_rows)
compressed = zlib.compress(raw, 9)

def chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )

ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", ihdr)
png += chunk(b"IDAT", compressed)
png += chunk(b"IEND", b"")

with open("app-icon.png", "wb") as f:
    f.write(png)

print("app-icon.png created")