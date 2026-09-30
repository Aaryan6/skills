"""Scaffold a hand-built stop-motion explainer reel.

    python new_reel.py <slug> [--dir ./reels] [--handle @yourhandle] [--topic "<slug>"]

Creates <dir>/<slug>/ with: package.json, hyperframes.json, src/index.tpl (skeleton: sky, three example scenes,
chrome, captions, noise layers), assets/kit (kit.css, kit.js, grain.png), a placeholder receipt in
assets/receipts/, and empty assets/sfx/ and out/.
Then: SCRIPT.txt -> words.py -> receipts -> SCENES.md -> scenes in src/index.tpl -> build_scenes.py.
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent


def placeholder_receipt(path: Path):
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return
    im = Image.new("RGB", (1720, 1100), "#ffffff")
    d = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype("arial.ttf", 64)
    except OSError:
        font = ImageFont.load_default()
    d.rectangle((40, 40, 1680, 1060), outline="#d0d0d0", width=6)
    d.text((110, 460), "Put a real screenshot here", fill="#222222", font=font)
    d.text((110, 560), "(assets/receipts/receipt.png)", fill="#888888", font=font)
    im.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--dir", default="reels")
    ap.add_argument("--handle", default="@yourhandle", help="shown in the top-left tag")
    ap.add_argument("--topic", help="shown after the handle (default: the slug)")
    a = ap.parse_args()
    root = Path(a.dir).resolve() / a.slug
    if (root / "src" / "index.tpl").exists():
        sys.exit(f"{root} already has src/index.tpl; not overwriting")
    for d in ("src", "assets/kit", "assets/sfx", "assets/receipts", "out"):
        (root / d).mkdir(parents=True, exist_ok=True)
    kit = SKILL / "assets" / "kit"
    for f in ("kit.css", "kit.js", "grain.png"):
        shutil.copy2(kit / f, root / "assets/kit" / f)
    tpl = (kit / "index.tpl").read_text(encoding="utf-8")
    tpl = tpl.replace("__HANDLE__", a.handle).replace("__TOPIC__", a.topic or a.slug)
    (root / "src/index.tpl").write_text(tpl, encoding="utf-8")
    placeholder_receipt(root / "assets/receipts/receipt.png")
    (root / "package.json").write_text(json.dumps({
        "name": a.slug, "private": True, "type": "module",
        "scripts": {"build": f"python \"{SKILL / 'scripts' / 'build_scenes.py'}\" .",
                    "check": "npx --yes hyperframes@0.8.65 check",
                    "render": "npx --yes hyperframes@0.8.65 render -o out/raw.mp4"},
        "devDependencies": {"@hyperframes/core": "^0.8.41"}}, indent=2), encoding="utf-8")
    (root / "hyperframes.json").write_text(json.dumps({
        "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
        "paths": {"blocks": "compositions", "components": "compositions/components", "assets": "assets"},
        "media": {"autoProxy": True}, "authoringSkill": "stop-motion-explainer"}, indent=2), encoding="utf-8")
    print(f"scaffolded {root}")
    print("next: SCRIPT.txt -> words.py <voiceover> -> assets/receipts -> SCENES.md -> src/index.tpl -> build_scenes.py")


if __name__ == "__main__":
    main()
