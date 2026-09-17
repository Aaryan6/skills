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
