# skills

A collection of agent skills — small, self-contained folders that teach an AI coding agent how to do one thing well. Each skill has a `SKILL.md` (the instructions the agent reads) and, where needed, scripts it can run.

The format is the open [Agent Skills](https://agentskills.io) layout, so these work with any tool that reads `SKILL.md` — Claude Code, Codex, Cursor, OpenCode, and others.

## Skills

| skill | what it does |
|---|---|
| [`codex-image`](codex-image/) | Generate images with the Codex CLI's built-in image tool on your ChatGPT login — reference images for consistent characters, `--transparent` for real alpha cut-outs. |
| [`gemini-tts`](gemini-tts/) | Text to speech with Google's Gemini TTS — single voice or multi-speaker, style directed in plain language, writes a `.wav`. |
| [`ig-lookup`](ig-lookup/) | Instagram reels research — a creator's reels ranked by views, captions, likes, comments, dates, hashtag top reels, mp4 download, contact sheets and Whisper transcripts — with headless Playwright + yt-dlp. |
| [`stop-motion-explainer`](stop-motion-explainer/) | Vertical explainer reels in a hand-made stop-motion paper look — one animated scene per line of voiceover, 12fps boil, grain, taped screenshots, karaoke captions — rendered with HyperFrames. |
| [`x-lookup`](x-lookup/) | Fetch posts, text, images and videos from X/Twitter — trends, single posts, threads, search, profiles — with headless Playwright. |

Each skill's folder has its own README with requirements and usage.

## Install

Clone the repo, then link or copy the skill folders you want into wherever your agent looks for skills:

| tool | skills directory |
|---|---|
| Claude Code | `~/.claude/skills/` (global) or `.claude/skills/` (per project) |
| Codex | `~/.codex/skills/` |
| Cursor / OpenCode / others | see that tool's docs; most accept a `skills/` folder in the project |

Linking keeps a skill up to date with `git pull`:

**macOS / Linux**

```bash
git clone https://github.com/Aaryan6/skills.git
ln -s "$(pwd)/skills/x-lookup" ~/.claude/skills/x-lookup
```

**Windows (PowerShell)**

```powershell
git clone https://github.com/Aaryan6/skills.git
New-Item -ItemType Junction -Path "$HOME\.claude\skills\x-lookup" -Target "$PWD\skills\x-lookup"
```

Swap `x-lookup` for whichever skill you want, and the target directory for your tool's.

## License

MIT — see [LICENSE](LICENSE).
