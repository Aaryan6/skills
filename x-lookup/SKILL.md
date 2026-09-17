---
name: x-lookup
description: Fetch posts, text, images and videos from X/Twitter with headless Playwright — trending pages (x.com/i/trending/…), single posts, threads, search and profiles. Use whenever the user shares an x.com / twitter.com link, asks "what's this trend / what are people saying on X about …", wants tweet text or media pulled for a reel, or asks to find something on X. Do not use WebFetch or a generic browser tool for x.com — they fail; this skill's script is the known-good path.
---

# X lookup

One command gets you a JSON of posts (author, text, stats, image URLs, best-quality mp4 URLs) from any x.com link. No login needed for trends, single posts and threads. Don't rediscover this — run the script.

## Fast path

```bash
node ~/.claude/skills/x-lookup/scripts/x-fetch.js "<x.com url>" --quiet --out <scratchpad>/x.json
```

Then read `x.json` (Read tool or `node -e`). On Windows, don't print it through Python without `PYTHONIOENCODING=utf-8` — cp1252 chokes on emoji.

Flags:

| flag | when |
|---|---|
| `--full` | any post shows `"truncated": true` ("Show more" cut). Opens each truncated post page and swaps in the full body. ~3s per post. |
| `--download DIR` | user wants the media (reels, receipts). Images → `handle_id_n.jpg` at original res; videos → `handle_id.mp4` via **yt-dlp** on the post URL (best muxed quality; ffmpeg-from-m3u8 fallback). Adds `files[]` to each post. A quote-post that shows the quoted video reuses the original's file. |
| `--scrolls N` | default 6. Logged-out timelines cap at ~5–10 posts anyway; the loop stops early when nothing new appears. |
| `--query "text"` | instead of a URL → live search. **Needs `--profile`** (X blocks logged-out search). |
| `--profile` | use the saved logged-in profile in `x-lookup/.profile`. Auto-on for search and profile URLs. |
| `--login` | one-time: opens a headed Chromium, user logs in, profile is saved. Ask the user to run it themselves (`! node ~/.claude/skills/x-lookup/scripts/x-fetch.js --login`) — it needs their interaction. |
| `--headed` | debug only. |

Accepted URL kinds: `x.com/i/trending/<id>`, `x.com/<user>/status/<id>`, `x.com/search?q=…`, `x.com/<user>`. `twitter.com` and bare `user/status/id` are normalised.

## Output shape

```jsonc
{
  "source": "...", "fetchedAt": "...",
  "title": "Claude Launches Projects for Managing Parallel AI Tasks",   // trend title or page title
  "updated": "Sep 17, 2026", "summary": "…Grok's trend summary…",       // trend pages only
  "loginWall": false,                                                   // true → rerun with --profile
  "count": 5,
  "posts": [{
    "id": "2100633571543367691", "url": "https://x.com/ClaudeDevs/status/…",
    "handle": "@ClaudeDevs", "name": "ClaudeDevs", "age": "1h",
    "text": "Today we're rolling out Projects…", "truncated": false,
    "images": ["https://pbs.twimg.com/media/XXXX?format=webp&name=orig"],
    "hasVideo": true, "poster": "https://pbs.twimg.com/amplify_video_thumb/…",
    "video": "https://video.twimg.com/amplify_video/…/3840x2160/….mp4",  // highest res seen
    "card": "https://external-link…", "quoted": "https://x.com/claudeai/status/…",
    "stats": { "replies": "205", "reposts": "192", "likes": "3.8K", "views": "251K", "duration": "00:25",
               "date": "10:46 PM · Sep 17, 2026", "bookmarks": "95" }   // date/bookmarks: focal post on a status page
  }]
}
```

Quirks to expect (don't treat as bugs):
- On a status page the quoted post and the replies come back as their own entries; the focal post is first.
- A quote-post that embeds a video shows the *quoted* post's `video`.
- `poster` for some videos is a generic `pbs.twimg.com/media/…` URL, not a thumb — the script already matches those by elimination.
- `video` URLs are sniffed from network requests while the page plays previews; if a video post has no `video`, run again with `--full` (the post page always loads the player).
- The sniffed `video` URL (`…/vid/avc1/0/0/WxH/….mp4`) is a **DASH init segment, not a downloadable file** — it's useful as an identifier and resolution hint only. To get the file use `--download` (yt-dlp) or `hlsPlaylists[mediaId]` with ffmpeg. Don't hand the raw URL to the user as "the video".
- Image URLs come back as `format=webp&name=orig`, which 404s if fetched directly — swap to `format=jpg&name=orig` (the download step does this).

## Seeing what's *in* the media

When the post's substance is the video/image (a demo, a doodle reel, a screenshot), don't stop at the URL — look at it:

```bash
# images: just Read the downloaded .jpg
# video: contact sheet, one frame every N seconds, then Read it
ffmpeg -v error -y -i DIR/<file>.mp4 -vf "fps=1/6,scale=480:-1,tile=4x3" DIR/contact.jpg
ffprobe -v error -show_entries format=duration:stream=width,height -of csv=p=0 DIR/<file>.mp4
```

Pick the fps so 12 tiles cover the whole clip (`1/6` for ~70s, `1/2` for ~25s). For a specific moment: `-ss 12 -frames:v 1`. Needs `ffmpeg` on PATH (see README). Describe the frames concretely — what's on screen, on-screen text, the visual gag — that's what the user wants when they ask "what's this post".

## Reporting back

Lead with the trend title + one-line summary, then a compact table: who · text (trimmed) · media (🎬 duration / 🖼 count) · stats. Put direct media URLs below the table when the user is likely to want them (reels, receipts, "get the video"). Quote text verbatim — the user cares about exact wording.

## Why this path

- `WebFetch` / plain HTTP on x.com → 402 or the empty React shell. X only renders through a real browser.
- Headless Chromium + a desktop UA is enough: X serves a full logged-out render for trends, posts and threads.
- The script finds Playwright (local, global npm, or the copy bundled in `@playwright/mcp`) and the newest Chromium in Playwright's browser cache on Windows, macOS and Linux — no config needed.
- Logged-out DOM has **no `data-testid`** — the script parses the text layout (`name / @handle / age / body / [m:ss] / replies reposts likes views`). Logged-in DOM has testids and the script prefers them.
- `waitUntil: 'load'` never fires on X; the script uses `domcontentloaded` + `waitForSelector('article')`.

## When it's not enough

- Need more than the top ~10 posts of a trend, or search, or a profile timeline → ask the user to run `--login` once, then add `--profile`.
- Need replies/thread depth → pass the status URL; scroll count controls how many replies come back.
- Media for a reel → `--download` into the reel's assets dir, then hand off to `/media-use` / the reel skill.
