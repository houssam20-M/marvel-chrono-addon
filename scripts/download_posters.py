"""Download every poster into ~/Pictures/marvel-posters, one folder per catalog,
with the chronological number burned onto the image and in the file name.

Run: python3 -I scripts/download_posters.py [--clean]
  --clean  save the untouched poster instead of drawing the number badge
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = Path.home() / "Pictures" / "marvel-posters"
FONT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
MARVEL_RED = (237, 29, 36)
CLEAN = "--clean" in sys.argv


def safe(name):
    """Turn a title into a file name that survives every file manager."""
    return re.sub(r'[<>:"/\\|?*]', "-", name).strip(". ")


def fetch(url):
    # metahub serves 'small' in the catalog data; 'large' is the same image bigger.
    for size in ("large", "medium"):
        try:
            with urllib.request.urlopen(url.replace("/small/", f"/{size}/"), timeout=30) as r:
                return r.read()
        except Exception:
            continue
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read()


def badge(img, order):
    """Draw '#N' in a Marvel-red tab across the top-left corner."""
    img = img.convert("RGB")
    w, h = img.size
    text = f"#{order}"
    size = max(28, int(w * 0.13))
    font = ImageFont.truetype(str(FONT), size)
    draw = ImageDraw.Draw(img)

    pad = int(size * 0.28)
    box = draw.textbbox((0, 0), text, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    rect = [0, 0, tw + pad * 2, th + pad * 2]
    draw.rectangle(rect, fill=MARVEL_RED)
    draw.text((pad - box[0], pad - box[1]), text, font=font, fill=(255, 255, 255))
    return img


data = json.loads((ROOT / "data" / "catalogs.json").read_text())
total = saved = 0

for n, catalog in enumerate(data["catalogs"], 1):
    folder = OUT / f"{n} - {safe(catalog['name'].replace('Marvel — ', ''))}"
    folder.mkdir(parents=True, exist_ok=True)
    print(f"\n{folder.name}")
    for item in catalog["items"]:
        total += 1
        dest = folder / f"{item['order']:02d} - {safe(item['name'])}.jpg"
        try:
            raw = fetch(item["poster"])
            tmp = folder / ".tmp.jpg"
            tmp.write_bytes(raw)
            img = Image.open(tmp)
            if not CLEAN:
                img = badge(img, item["order"])
            img.convert("RGB").save(dest, "JPEG", quality=92)
            tmp.unlink(missing_ok=True)
            saved += 1
            print(f"  ✓ {dest.name}")
        except Exception as err:
            print(f"  ✗ {item['name']}: {err}")

size_mb = sum(f.stat().st_size for f in OUT.rglob("*.jpg")) / 1024 / 1024
print(f"\n{saved}/{total} posters → {OUT}  ({size_mb:.1f} MB)")
