# skills

Claude Code skills I use day to day. Each folder is one skill: drop it into `~/.claude/skills/` and Claude picks it up as `/<name>`.

| skill | what it does |
|---|---|
| [`x-lookup`](x-lookup/) | Fetch posts, text, images and videos from X/Twitter (trends, single posts, threads, search, profiles) with headless Playwright. |

## Install

```bash
git clone https://github.com/Aaryan6/skills.git
```

Then link or copy the skill you want. Linking keeps it in sync with `git pull`:

**macOS / Linux**

```bash
mkdir -p ~/.claude/skills
ln -s "$(pwd)/skills/x-lookup" ~/.claude/skills/x-lookup
```

**Windows (PowerShell)**

```powershell
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
New-Item -ItemType Junction -Path "$HOME\.claude\skills\x-lookup" -Target "$PWD\skills\x-lookup"
```

Or just copy the folder to `~/.claude/skills/x-lookup` if you don't want a link.

---

## x-lookup

Plain `fetch`/`curl` on x.com returns an empty React shell (or a 402), so this skill drives a real headless Chromium through Playwright and parses the rendered page. No login is needed for trend pages, single posts and threads; search and profile timelines need a one-time login.

### Requirements

- **Node 18+** (uses the built-in `fetch`)
- **Playwright + Chromium** — either is fine:
  ```bash
  npm i -g playwright-core && npx playwright install chromium
  ```
  If you already have `@playwright/mcp` installed globally, the script reuses its bundled `playwright-core` and the Chromium in your Playwright cache — nothing extra to install.
- **yt-dlp** and **ffmpeg** on your PATH — only for `--download` (X serves video as HLS/DASH, so it has to be muxed).
  - macOS: `brew install yt-dlp ffmpeg`
  - Windows: `winget install yt-dlp.yt-dlp` (bundles ffmpeg) or `pip install yt-dlp` + `winget install Gyan.FFmpeg`

The script locates Playwright and Chromium itself on Windows (`%LOCALAPPDATA%\ms-playwright`), macOS (`~/Library/Caches/ms-playwright`) and Linux (`~/.cache/ms-playwright`). Set `PLAYWRIGHT_BROWSERS_PATH` if yours lives elsewhere.

### Usage

```bash
node ~/.claude/skills/x-lookup/scripts/x-fetch.js "<x.com url>" --quiet --out x.json
```

| flag | |
|---|---|
| `--full` | re-open truncated ("Show more") posts and swap in the full text |
| `--download DIR` | save images at original resolution and best-quality mp4s into `DIR` |
| `--scrolls N` | how far to scroll the timeline (default 6) |
| `--query "text"` | live search instead of a URL (needs `--profile`) |
| `--profile` | use the saved logged-in browser profile (auto for search / profile URLs) |
| `--login` | one-time: opens a window, log in, profile is saved to `x-lookup/.profile` |
| `--headed` | watch the browser, for debugging |

Accepted URLs: `x.com/i/trending/<id>`, `x.com/<user>/status/<id>`, `x.com/search?q=…`, `x.com/<user>`. `twitter.com` links are normalised.

Output is a JSON file with the page title / trend summary and a `posts[]` array — handle, name, text, image URLs, best video URL, stats (replies, reposts, likes, views), quoted post, external card link. See [`x-lookup/SKILL.md`](x-lookup/SKILL.md) for the full shape and the quirks to expect.

### Login profile

`--login` stores a full Chromium user-data directory (your X session cookies) in `x-lookup/.profile/`. It's gitignored; don't commit or share it.

### A note on X's terms

This automates a browser against x.com, which X's Terms of Service restrict. It's built for personal use — pulling a post you were sent, checking a trend, grabbing media for a clip. Keep the scroll counts small, don't run it in a loop, and don't use it to harvest data at scale.

## License

MIT — see [LICENSE](LICENSE).
