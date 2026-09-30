"""Build a hand-authored stop-motion reel: src/index.tpl -> index.html.

    python build_scenes.py <project-dir>

Fills the template's tokens:
  /*__KIT_CSS__*/ /*__KIT_JS__*/   assets/kit/kit.css + kit.js (inlined, so index.html is one file)
  /*__WORDS__*/                    word start times from assets/voice.words.json (index = the one words.py prints)
  <!--__CAPTIONS__-->              karaoke caption clips from captions.json
  __END__                          reel length (last word end + 0.9s, or "end" in captions.json)
  __VO__                           length of assets/voice.wav (for the voice <audio> clip)

captions.json: {"end": 42.6?, "captions": [[first_word_index, "text with *accent* words"], ...]}
A caption's words map 1:1 onto the spoken words when the counts match; rewritten numbers ("*$100*" for
"a hundred dollars") are spread over the spoken span. Missing captions.json -> a draft is written (up to 3 words
per caption, split on punctuation) for you to edit.
"""
import html
import json
import re
import sys
import wave
from pathlib import Path


def draft_captions(words):
    caps, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        end_punct = re.search(r"[.,!?;:]$", w["text"])
        if len(cur) >= 3 or (end_punct and len(cur) >= 2) or (end_punct and len(cur) == 1 and i + 1 < len(words)):
            caps.append([cur[0], " ".join(re.sub(r"[.,!?;:]$", "", words[j]["text"]) for j in cur)])
            cur = []
    if cur:
        caps.append([cur[0], " ".join(re.sub(r"[.,!?;:]$", "", words[j]["text"]) for j in cur)])
    return caps


def caption_html(words, caps, end):
    out = []
    for k, (i, text) in enumerate(caps):
        j = caps[k + 1][0] if k + 1 < len(caps) else len(words)
        start = words[i]["start"] - 0.06
        stop = (words[j]["start"] - 0.06) if j < len(words) else end
        toks, spoken = text.split(), words[i:j]
        if len(toks) == len(spoken):
            times = [w["start"] for w in spoken]
        else:
            a, b = spoken[0]["start"], spoken[-1]["start"]
            times = [a + (b - a) * n / max(1, len(toks) - 1) for n in range(len(toks))]
        spans = []
        for tok, t in zip(toks, times):
            acc = tok.startswith("*") and tok.endswith("*")
            spans.append(f'<span class="w{" acc" if acc else ""}" data-t="{t:.3f}">{html.escape(tok.strip("*"))}</span>')
        out.append(f'<div id="cap{k}" class="clip cap" data-start="{start:.3f}" data-duration="{stop - start:.3f}" '
                   f'data-track-index="40">{" ".join(spans)}</div>')
    return "\n      ".join(out)


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    words = json.loads((root / "assets/voice.words.json").read_text(encoding="utf-8"))
    cap_file = root / "captions.json"
    if not cap_file.exists():
        cap_file.write_text(json.dumps({"captions": draft_captions(words)}, indent=1), encoding="utf-8")
        print("wrote a draft captions.json: add *accents* and rewrite numbers, then build again")
    cfg = json.loads(cap_file.read_text(encoding="utf-8"))
    end = round(cfg.get("end") or (words[-1]["end"] + 0.9), 2)
    src = (root / "src/index.tpl").read_text(encoding="utf-8")
    kit = root / "assets/kit"
    src = (src.replace("/*__KIT_CSS__*/", (kit / "kit.css").read_text(encoding="utf-8"))
              .replace("/*__KIT_JS__*/", (kit / "kit.js").read_text(encoding="utf-8"))
              .replace("/*__WORDS__*/", json.dumps([round(w["start"], 3) for w in words]))
              .replace("<!--__CAPTIONS__-->", caption_html(words, cfg["captions"], end))
              .replace("__END__", str(end)))
    wav = root / "assets/voice.wav"
    if wav.exists():
        with wave.open(str(wav)) as w:
            src = src.replace("__VO__", f"{min(end, w.getnframes() / w.getframerate()):.3f}")
    left = re.findall(r"/\*__\w+__\*/|<!--__\w+__-->|__END__|__VO__|__[A-Z0-9_]+__", src)
    if left:
        sys.exit(f"unfilled tokens: {left}")
    (root / "index.html").write_text(src, encoding="utf-8")
    print(f"index.html: {len(words)} words, {len(cfg['captions'])} captions, {end}s")


if __name__ == "__main__":
    main()
