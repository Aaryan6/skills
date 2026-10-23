# skills

A collection of agent skills, which are small, self-contained folders that teach an AI coding agent how to do one thing well. Each skill has a `SKILL.md` with the instructions an agent reads and, where needed, scripts it can run.

The format follows the open [Agent Skills](https://agentskills.io) layout. These skills work with any tool that reads `SKILL.md`, including Claude Code, Codex, Cursor, OpenCode, and others.

## Skills

| skill | what it does |
|---|---|
| [`codex-image`](codex-image/) | Generate images with the Codex CLI's built-in image tool on your ChatGPT login. Supports reference images for consistent characters and `--transparent` for real alpha cut-outs. |
| [`gemini-api`](gemini-api/) | Use Google's official `gemini-api` CLI from the shell to generate and edit images, video, speech and music, transcribe audio and video, analyze files and YouTube links, and run managed agents. |
| [`gemini-tts`](gemini-tts/) | Text to speech with Google's Gemini TTS for a single voice or multiple speakers. Style is directed in plain language, and output is written to a `.wav` file. |
| [`ig-lookup`](ig-lookup/) | Instagram reels research that ranks a creator's reels by views, captions, likes, comments, dates, and hashtag top reels. Includes mp4 downloads, contact sheets, and Whisper transcripts using headless Playwright and yt-dlp. |
| [`stop-motion-explainer`](stop-motion-explainer/) | Create vertical explainer reels in a hand-made stop-motion paper look. Each voiceover line gets an animated scene, with 12fps boil, grain, taped screenshots, karaoke captions, and HyperFrames rendering. |
| [`x-lookup`](x-lookup/) | Fetch posts, text, images, and videos from X/Twitter, including trends, single posts, threads, search, and profiles, using headless Playwright. |

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

MIT. See [LICENSE](LICENSE).
