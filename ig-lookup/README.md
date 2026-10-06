# ig-lookup

Instagram reels → JSON. A headless Chromium (Playwright) reads a profile's or hashtag's reel grid with view counts, yt-dlp fills in each reel's caption, likes, comments and date and downloads the mp4, and faster-whisper transcribes it.

## Requirements

- Node 18+
- Playwright + Chromium: `npm i -g playwright-core && npx playwright install chromium` (or a global `@playwright/mcp`)
- `yt-dlp` and `ffmpeg` on PATH
- Python with `faster-whisper` (only for `--transcribe`)

## Usage

```bash
node ~/.claude/skills/ig-lookup/scripts/ig-fetch.js --login                      # once, interactive
node ~/.claude/skills/ig-lookup/scripts/ig-fetch.js harpercarrollai --all --top 10 --out top.json
node ~/.claude/skills/ig-lookup/scripts/ig-fetch.js https://www.instagram.com/reel/<id>/ --download dl --transcribe --sheets
node ~/.claude/skills/ig-lookup/scripts/ig-fetch.js https://www.instagram.com/explore/tags/aitools/
```

See [`SKILL.md`](SKILL.md) for every flag, the output shape and the logged-in vs logged-out limits. The login session lives in `.profile/`. Delete that folder to log out.
