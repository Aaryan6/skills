---
name: ig-lookup
description: Fetch Instagram reels with headless Playwright + yt-dlp — a creator's reels ranked by views (full history with the saved login), a single reel's caption/likes/comments/date, hashtag top reels, plus optional mp4 download, contact sheets and Whisper transcripts. Use whenever the user shares an instagram.com link or @handle, asks "what are <creator>'s most viewed reels", wants competitor/benchmark research for a channel, wants a reel's script/transcript, or wants a reference reel downloaded. Do not use WebFetch or curl for instagram.com — the API rate-limits (429) logged out; this skill's script is the known-good path.
---

# Instagram lookup

One command gets you JSON of reels (views, caption, likes, comments, date, duration, file, transcript) from any Instagram profile, reel or hashtag. Don't rediscover this — run the script.

## Fast path

```bash
node ~/.claude/skills/ig-lookup/scripts/ig-fetch.js "<instagram url | @handle>" --quiet --out <scratchpad>/ig.json
```

Then read `ig.json` (Read tool or `node -e`). On Windows, print through Python only with `PYTHONIOENCODING=utf-8` — captions are full of emoji.

| flag | when |
|---|---|
| `--all` | scroll a profile's whole reels grid (needs the login; 250 reels ≈ 2 min). Default is `--scrolls 8` (~20–30 reels). |
| `--top N` | keep only the N most-viewed reels in the output. |
| `--meta N` | fetch caption/likes/comments/date for the first N reels after sorting (default 10). `--meta 0` = views only, fastest. |
| `--download DIR` | save the mp4s (1080×1920) for the reels that got metadata. Adds `file` + real `duration`. |
| `--sheets` | 12-frame contact sheet (`<id>.jpg`, 6×2) next to each mp4 — Read it to see the format. |
| `--transcribe` | faster-whisper `small` on each mp4 → `transcript`. ~10–20s per reel on CPU. Implies a download (to temp if no `--download`). |
| `--login` | one-time: opens a visible Chromium, user logs in, session is saved to `ig-lookup/.profile`. Ask the user to run it themselves: `! node ~/.claude/skills/ig-lookup/scripts/ig-fetch.js --login`. |
| `--no-profile` | force logged-out (debug). |
| `--headed` | watch the browser (debug). |

Accepted inputs: `instagram.com/<user>/`, `…/<user>/reels/`, `…/stories/<user>/` (→ profile), `@user` or bare `user`, `…/reel/<id>/`, `…/p/<id>/`, `…/<user>/reel/<id>/`, `…/explore/tags/<tag>/`.

## Logged in vs logged out (verified 2026-10-07)

| | logged out | with `.profile` |
|---|---|---|
| profile reels grid | latest ~12 + pinned, then a hard login wall ("Unauthorized logged out query") | full history (254 reels for @harpercarrollai) |
| single reel metadata / download | ✅ (yt-dlp) | ✅ |
| hashtag | redirects to `/popular/<tag>/`, ~24 top reels | ✅ |
| `api/v1/users/web_profile_info` | 429 | — don't use it |

The script uses `.profile` automatically when it exists. If the output has `note: "logged out…"` and the user wants all-time top reels, ask them to run `--login` once. Prefer a secondary account — heavy scraping on a main account can trigger a checkpoint.

## Common jobs

**"Most viewed reels of these creators"** (benchmark research):
```bash
node …/ig-fetch.js <user> --all --meta 0 --quiet --out <scratch>/<user>.json   # every reel + views, quick
node …/ig-fetch.js <user> --all --top 8 --download <scratch>/<user> --sheets --transcribe --quiet --out <scratch>/<user>-top.json
```
Report per channel: total reels, median views, then a table of the top ones (views · topic in a few words · format). Read 3–5 contact sheets to describe the format (talking head + screen recording, before/after reveal, no-voice result montage…). When the user asks for N videos across several channels, split N across channels rather than taking the global top N — one big channel will otherwise take every slot.

**"What's in this reel / get me its script"**: pass the reel URL with `--download DIR --transcribe --sheets`, then quote the transcript and describe the sheet.

**Reference reel for a video project**: `--download` straight into the project's assets dir.

## Output shape

```jsonc
{
  "source": "swiperightai", "kind": "profile",          // profile | reel | tag
  "user": "swiperightai", "loggedIn": true, "loginWall": false,
  "header": "57K Followers, 88 Following, 242 Posts - …", // og:description
  "totalSeen": 196, "medianViews": 5728, "count": 196,
  "reels": [{                                           // sorted by views when the grid shows them
    "id": "DWSoHx0CWrg", "url": "https://www.instagram.com/reel/DWSoHx0CWrg/",
    "viewsText": "995K", "views": 995000,               // from the grid tile; null for single reels and hashtags
    "handle": "swiperightai", "name": "Ritu Mahal",
    "caption": "AI isn't boring. …", "likes": 47150, "comments": 8053,
    "date": "2026-03-25", "duration": 40, "width": 1080, "height": 1920,
    "file": "…/DWSoHx0CWrg.mp4", "sheet": "…/DWSoHx0CWrg.jpg", "transcript": "Proof that the internet…"
  }]
}
```

Quirks (not bugs):
- `views` only exists on profile grids. A single reel URL or hashtag page has no view count — yt-dlp doesn't get one either.
- `duration` is null unless downloaded (yt-dlp doesn't report it for Instagram; the script probes the file).
- Brand deals can show huge views with likes hidden (likes = 3). Treat views with near-zero likes as paid boosts and say so.
- Creators repost the same reel several times; identical captions/transcripts in the top list are a strong "this topic works" signal, not a scrape duplicate.
- No-voice reels transcribe to `""` or `"You"` — use the contact sheet.

## Why this path

- Plain HTTP on instagram.com returns a login-gated shell, and the JSON endpoints 429 logged out. A real headless Chromium renders the grid with view counts on each tile.
- yt-dlp's Instagram extractor fetches single-reel metadata and the muxed mp4 without a login; its profile extractor is broken, so the grid comes from the browser.
- Playwright/Chromium resolution is shared with `x-lookup` (global npm, `@playwright/mcp`'s bundled copy, newest `chromium-*` in the Playwright cache).
