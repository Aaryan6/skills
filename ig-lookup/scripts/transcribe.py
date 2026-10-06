"""Transcribe video files with faster-whisper; prints {path: {"duration": s, "text": ...}} as JSON."""
import json
import sys

from faster_whisper import WhisperModel

model = WhisperModel("small", device="cpu", compute_type="int8")
out = {}
for f in sys.argv[1:]:
    try:
        segs, info = model.transcribe(f, vad_filter=True)
        out[f] = " ".join(s.text.strip() for s in segs)
    except Exception as e:  # keep going on a bad file
        out[f] = f"[transcription failed: {e}]"
    print(f, file=sys.stderr, flush=True)
print(json.dumps(out, ensure_ascii=False))
