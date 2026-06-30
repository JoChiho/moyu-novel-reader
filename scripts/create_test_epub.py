"""Create a minimal .epub fixture for fileReader tests."""
from __future__ import annotations

import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "electron" / "fixtures" / "sample.epub"

CONTAINER = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
"""

OPF = """<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>摸鱼 EPUB 导入测试</dc:title>
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="uid">moyu-epub-fixture</dc:identifier>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>
"""

CHAPTER = """<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>第一章</title></head>
  <body>
    <h1>摸鱼 EPUB 导入测试</h1>
    <p>第一章 主角开始了冒险。</p>
    <p>第二段内容。</p>
  </body>
</html>
"""


def main() -> None:
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(FIXTURE, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        zf.writestr("META-INF/container.xml", CONTAINER)
        zf.writestr("OEBPS/content.opf", OPF)
        zf.writestr("OEBPS/chapter1.xhtml", CHAPTER)
    print(f"Wrote {FIXTURE}")


if __name__ == "__main__":
    main()