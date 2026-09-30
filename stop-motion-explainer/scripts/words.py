#!/usr/bin/env python3
"""Voiceover -> assets/voice.wav + assets/voice.words.json (word timestamps for scenes and captions).

  python words.py <your voiceover file> [--project .] [--model small.en] [--script SCRIPT.txt]

Takes any recording or TTS export (wav/mp3/m4a), writes a loudness-normalised 44.1 kHz mono copy to
<project>/assets/voice.wav, transcribes it with faster-whisper (word timestamps) and writes
<project>/assets/voice.words.json as [{id, text, start, end}]. Prints every word as index:word@start, which is
the index `at(i)` uses in src/index.tpl.

--script: if the transcript has the same number of words as your script, the script's spelling is used for the
words (names, numbers, punctuation) and Whisper's timings are kept.
Needs `pip install faster-whisper` and ffmpeg on PATH.
"""
import argparse, json, subprocess, sys
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio", type=Path)
    ap.add_argument("--project", type=Path, default=Path("."))
    ap.add_argument("--model", default="small.en", help="faster-whisper model (tiny.en, base.en, small.en, medium.en, large-v3)")
    ap.add_argument("--device", default="cpu", help="cpu (default, fine for a short voiceover) or cuda")
    ap.add_argument("--script", type=Path, help="the script text, to fix spellings when word counts match")
    a = ap.parse_args()
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("pip install faster-whisper")

    assets = a.project / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    wav = assets / "voice.wav"
    if a.audio.resolve() != wav.resolve():
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(a.audio),
                        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1", str(wav)], check=True)

    segments, _ = WhisperModel(a.model, device=a.device, compute_type="int8").transcribe(str(wav), word_timestamps=True)
    words = [{"text": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)}
             for seg in segments for w in (seg.words or []) if w.word.strip()]
    if not words:
        sys.exit("no words found in the audio")
    if a.script:
        typed = a.script.read_text(encoding="utf-8").split()
        if len(typed) == len(words):
            for w, t in zip(words, typed):
                w["text"] = t
        else:
            print(f"note: script has {len(typed)} words, transcript {len(words)}; keeping Whisper's spelling")
    for i, w in enumerate(words):
        w["id"] = f"w{i}"
    out = assets / "voice.words.json"
    out.write_text(json.dumps(words, indent=1), encoding="utf-8")
    print(f"{wav}  {len(words)} words -> {out}")
    print(" ".join(f"{i}:{w['text']}@{w['start']}" for i, w in enumerate(words)))


if __name__ == "__main__":
    main()
