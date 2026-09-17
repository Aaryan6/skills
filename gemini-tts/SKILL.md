---
name: gemini-tts
description: Generate spoken audio from text using the Gemini TTS API and save it as a .wav file in the current working directory. Use this skill whenever the user wants text turned into speech, audio, or a voiceover — including phrases like "read this out loud", "make an audio version", "narrate this", "voice this script", "generate a voiceover", "turn this into a podcast clip", or any request for a .wav/.mp3 of some text. Also use it when the user wants a specific voice, accent, tone, or pace applied to spoken output, or wants a multi-speaker dialogue rendered as audio.
---

# Gemini TTS

Turns text into a `.wav` file using Google's Gemini text-to-speech models. The API mechanics —
base64 PCM decoding, WAV headers, sample rates — are handled by the script below. Use the
script; do not hand-roll `curl` for this.

## Setup

The script reads the API key from the `GEMINI_API_KEY` environment variable. Get a key from
[Google AI Studio](https://aistudio.google.com/apikey) and set it wherever your agent picks up
env vars — a shell profile, a `.env` your tool loads, or the agent's own settings.

For Claude Code, add it to `.claude/settings.json` (this project) or `~/.claude/settings.json`
(all projects):

```json
{
  "env": {
    "GEMINI_API_KEY": "AIza..."
  }
}
```

If the project is shared with others, use `.claude/settings.local.json` instead — it's
gitignored by default and stays off the repo.

**If the script exits saying the key is missing:** tell the user to set `GEMINI_API_KEY` as
above and restart the session, then stop. Do not ask the user to paste the key into chat, do
not accept it if offered, and do not write it into a command line or a file. A key in the
transcript is a leaked key.

## First run

If `scripts/tts.py` does not exist relative to this skill, write it from the source in the
**Script** section below, then run it. Standard library only — nothing to install.

## Usage

Run from the directory where the audio should land; the script writes to the current working
directory. On Windows, use `python` instead of `python3` if `python3` isn't on PATH.

```bash
# basic
python3 scripts/tts.py "Say cheerfully: Have a wonderful day!"

# named output, chosen voice
python3 scripts/tts.py "Read this warmly: Welcome back." --out welcome.wav --voice Puck

# long text — pipe it in rather than fighting shell quoting
cat script.txt | python3 scripts/tts.py --out narration.wav

# multi-speaker: prefix each line with the speaker name, then map names to voices
python3 scripts/tts.py "TTS the following conversation:
Joe: How's it going today, Jane?
Jane: Not too bad, how about you?" \
  --speaker Joe=Kore --speaker Jane=Puck --out dialogue.wav
```

Flags: `--out/-o`, `--voice/-v`, `--model/-m`, `--speaker` (repeatable).
Default model is `gemini-3.1-flash-tts-preview`.

## Writing the prompt

Two things determine output quality, and both live in the text you send.

**The model only does TTS.** It needs an instruction verb — "Say", "Read", "TTS the
following". Text without one may produce no audio at all. If the user hands over bare prose,
prepend an instruction yourself rather than passing it through raw.

**Style is controlled in natural language**, not parameters. Put the direction before the
content, separated by a colon:

- `Say in a spooky whisper: "Something wicked this way comes."`
- `Read this disclaimer as fast as possible while remaining intelligible: ...`
- `Narrate this in a calm documentary voice, slowly: ...`

Only the content after the colon is spoken; the direction shapes how. If the user doesn't
specify a tone, pick one that fits the text and say what you chose.

## Voices

Roughly 30 prebuilt voices across 24 languages. Common ones: `Kore` (firm), `Puck` (upbeat),
`Charon` (informative), `Fenrir` (excitable), `Aoede` (breezy), `Leda` (youthful),
`Zephyr` (bright). An unrecognized voice name will error — report it and suggest one of the
above rather than guessing repeatedly. Language is inferred from the input text; no locale
flag needed.

## After generating

State the filename and duration, both of which the script prints. Don't claim the audio sounds
a particular way — you can't hear it. For a different take, adjust the style direction or
switch the voice and rerun.

## Notes

- Output is 24 kHz, 16-bit mono PCM in a WAV container. For MP3: `ffmpeg -i out.wav out.mp3`.
- Requires outbound access to `generativelanguage.googleapis.com`. In sandboxes with a domain
  allowlist the call fails regardless of the key — an environment limitation, not a bug.
- Long inputs take a while. Give the script time rather than assuming it hung.

## Script

Save as `scripts/tts.py`:

```python
#!/usr/bin/env python3
"""Generate speech with the Gemini TTS API and write a .wav in the current directory.

Reads the API key from the GEMINI_API_KEY environment variable.
Standard library only.
"""

import argparse
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.request
import wave
from datetime import datetime

DEFAULT_MODEL = "gemini-3.1-flash-tts-preview"
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def parse_args():
    p = argparse.ArgumentParser(description="Gemini text-to-speech")
    p.add_argument("text", nargs="?", help="Text to speak. Omit to read from stdin.")
    p.add_argument("-o", "--out", help="Output filename (default: speech-<timestamp>.wav)")
    p.add_argument("-v", "--voice", default="Kore", help="Prebuilt voice name (default: Kore)")
    p.add_argument("-m", "--model", default=DEFAULT_MODEL, help=f"Model (default: {DEFAULT_MODEL})")
    p.add_argument(
        "--speaker",
        action="append",
        metavar="NAME=VOICE",
        help="Multi-speaker mapping, repeatable. e.g. --speaker Joe=Kore --speaker Jane=Puck",
    )
    return p.parse_args()


def build_speech_config(args):
    if args.speaker:
        configs = []
        for pair in args.speaker:
            if "=" not in pair:
                sys.exit(f"--speaker expects NAME=VOICE, got: {pair}")
            name, voice = pair.split("=", 1)
            configs.append(
                {
                    "speaker": name.strip(),
                    "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice.strip()}},
                }
            )
        return {"multiSpeakerVoiceConfig": {"speakerVoiceConfigs": configs}}
    return {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": args.voice}}}


def call_api(api_key, model, text, speech_config):
    payload = {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": speech_config,
        },
    }
    req = urllib.request.Request(
        ENDPOINT.format(model=model),
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        sys.exit(f"Gemini API returned HTTP {e.code}:\n{body}")
    except urllib.error.URLError as e:
        sys.exit(f"Could not reach the Gemini API: {e.reason}")


def extract_audio(data):
    try:
        parts = data["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError):
        sys.exit(f"Unexpected API response:\n{json.dumps(data, indent=2)[:2000]}")
    for part in parts:
        inline = part.get("inlineData")
        if inline and inline.get("data"):
            return base64.b64decode(inline["data"]), inline.get("mimeType", "")
    sys.exit(
        "No audio in the response. The model only performs TTS — make sure the prompt "
        "instructs it to say or read something.\n"
        f"{json.dumps(data, indent=2)[:2000]}"
    )


def sample_rate_from(mime_type, default=24000):
    match = re.search(r"rate=(\d+)", mime_type or "")
    return int(match.group(1)) if match else default


def write_wav(path, pcm, rate):
    with wave.open(path, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(rate)
        wav.writeframes(pcm)


def main():
    args = parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        sys.exit(
            "GEMINI_API_KEY is not set. Export it in your environment (or your agent's env "
            "settings — see the skill's Setup section), then restart the session."
        )

    text = args.text if args.text else sys.stdin.read()
    text = (text or "").strip()
    if not text:
        sys.exit("No text supplied.")

    result = call_api(api_key, args.model, text, build_speech_config(args))
    pcm, mime_type = extract_audio(result)

    out = args.out or f"speech-{datetime.now():%Y%m%d-%H%M%S}.wav"
    if not out.lower().endswith(".wav"):
        out += ".wav"

    rate = sample_rate_from(mime_type)
    write_wav(out, pcm, rate)
    seconds = len(pcm) / (2 * rate)
    print(f"Wrote {out} ({seconds:.1f}s, {os.path.getsize(out) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
```
