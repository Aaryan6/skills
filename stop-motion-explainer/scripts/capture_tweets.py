#!/usr/bin/env python3
"""Screenshot tweets as clean receipt cards (the official embed, light theme, footer trimmed).

  python capture_tweets.py 2099925682726002904=launch 2100288951978164647=demo --out assets/receipts

Writes <out>/tweet-<name>.png at 2.5x density. The embed shows the post text, author and media poster;
the likes/reply footer is cropped off so the card can scale up. Needs `pip install playwright pillow`
and `playwright install chromium` (or pass --chrome <path to a Chrome executable>).
"""
import argparse, asyncio
from pathlib import Path
from playwright.async_api import async_playwright
from PIL import Image

FOOTER_CSS_PX = 110   # likes / reply / "read replies" rows


async def main(pairs, out: Path, keep_footer: bool, chrome: str | None):
    out.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await (p.chromium.launch(executable_path=chrome) if chrome else p.chromium.launch())
        ctx = await b.new_context(viewport={"width": 600, "height": 1600}, device_scale_factor=2.5)
        for tid, name in pairs:
            page = await ctx.new_page()
            await page.goto(f"https://platform.twitter.com/embed/Tweet.html?id={tid}&theme=light&width=550&dnt=true",
                            wait_until="networkidle", timeout=60000)
            await page.wait_for_timeout(2500)
            el = await page.query_selector("article") or await page.query_selector("#app > div > div")
            path = out / f"tweet-{name}.png"
            await el.screenshot(path=str(path))
            if not keep_footer:
                im = Image.open(path)
                im.crop((0, 0, im.width, im.height - int(FOOTER_CSS_PX * 2.5))).save(path)
            print("saved", path)
            await page.close()
        await b.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tweets", nargs="+", help="<status id>=<name>")
    ap.add_argument("--out", type=Path, default=Path("assets/receipts"))
    ap.add_argument("--keep-footer", action="store_true")
    ap.add_argument("--chrome", help="path to a Chrome/Chromium executable (default: Playwright's bundled one)")
    a = ap.parse_args()
    asyncio.run(main([t.split("=", 1) for t in a.tweets], a.out, a.keep_footer, a.chrome))
