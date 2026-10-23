# gemini-api

Teaches an agent to use the official [`gemini-api` CLI](https://github.com/google-gemini/gemini-api-cli) for Gemini models from the shell: generate and edit images, make video clips, speech, music, transcribe audio and video, analyze files and YouTube links, and run managed background agents.

The skill is a thin, accurate guide to the CLI: which command fits which task, the working rules (preview with `--dry-run`, iterate with `--previous-interaction-id`, check what was generated), and prompting tips. Detail lives in `references/`.

## Requirements

- The `gemini-api` binary on `PATH` (install steps in [`references/setup.md`](references/setup.md))
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey), as `GEMINI_API_KEY` or via `gemini-api configure`

Check with `gemini-api whoami`.

## Usage

Ask your agent in plain language:

- "Generate a 9:16 image of a lighthouse at sunset with Gemini"
- "Make a 5-second video clip from this image"
- "Transcribe this recording to SRT"
- "What does this PDF say about pricing?"

Or call the CLI directly:

```bash
gemini-api image "a lighthouse at sunset" --aspect-ratio 9:16 --image-size 2K --out lighthouse.png
gemini-api video "waves at dawn" --aspect-ratio 9:16 --out waves.mp4
gemini-api transcribe -i talk.mp3 --format srt --out talk.srt
```

## Files

- `SKILL.md`: what the agent reads
- `references/setup.md`: install and API key
- `references/commands.md`: examples and flags per command
- `references/prompting.md`: prompting for images, video, speech, music
