# gemini-tts

Turn text into a `.wav` voiceover with Google's Gemini TTS models. Single voice or multi-speaker dialogue, tone and pace controlled in plain language ("say this in a calm documentary voice"). The script handles the API call, base64 PCM decoding and WAV framing.

## Requirements

- **Python 3.8+** — standard library only, nothing to `pip install`
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey), exported as `GEMINI_API_KEY`
- Outbound access to `generativelanguage.googleapis.com`

## Usage

```bash
# basic — writes speech-<timestamp>.wav in the current directory
python3 scripts/tts.py "Say cheerfully: Have a wonderful day!"

# pick the file name and voice
python3 scripts/tts.py "Read this warmly: Welcome back." --out welcome.wav --voice Puck

# long text — pipe it in
cat script.txt | python3 scripts/tts.py --out narration.wav

# two speakers
python3 scripts/tts.py "TTS the following conversation:
Joe: How's it going today, Jane?
Jane: Not too bad, how about you?" --speaker Joe=Kore --speaker Jane=Puck --out dialogue.wav
```

On Windows use `python` if `python3` isn't on PATH.

| flag | |
|---|---|
| `-o, --out` | output filename (default `speech-<timestamp>.wav`) |
| `-v, --voice` | prebuilt voice, default `Kore` — others: `Puck`, `Charon`, `Fenrir`, `Aoede`, `Leda`, `Zephyr`, … |
| `-m, --model` | default `gemini-3.1-flash-tts-preview` |
| `--speaker NAME=VOICE` | repeatable; maps speaker names in the text to voices |

Output is 24 kHz 16-bit mono WAV. For MP3: `ffmpeg -i out.wav out.mp3`.

## Prompting

The model only does TTS, so the text needs an instruction verb — "Say", "Read", "Narrate". Put the style direction before a colon and the content after it; only the content is spoken:

```
Narrate this slowly, like a nature documentary: The river bends east past the old mill.
```

See [`SKILL.md`](SKILL.md) for the full guidance the agent follows.

## Keep the key out of the repo

The script only reads `GEMINI_API_KEY` from the environment. Never paste the key into a prompt, a command line, or a committed settings file — for Claude Code, `.claude/settings.local.json` is the gitignored place for it.
