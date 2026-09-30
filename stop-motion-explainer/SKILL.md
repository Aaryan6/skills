---
name: stop-motion-explainer
description: Make a vertical 9:16 explainer reel (30-60s) with HyperFrames where every line of the voiceover gets its own hand-built animated scene in a stop-motion paper look. 12fps stepped motion, boiling props, film grain and flicker, real screenshots taped on as paper printouts, ransom-note hook words, cut-out cards with hard shadows, karaoke captions. Props that act out the words (3D laptop, cloud, server racks, cubes, flip cards, tear-off calendar, comic panels, odometers, stamps, coins). Built on a shared scene kit (kit.css + kit.js). Use for "stop-motion reel about X", "paper-style explainer on X", "/stop-motion-explainer <topic>".
---

# Stop-motion explainer reel

A 30–60s vertical reel where the picture **acts out every sentence** of the voiceover. Nothing is a template
slide: each line gets a scene designed for it, with a prop that does what the words say, landing on the spoken
word. Real screenshots prove the claims. The whole reel sits in one visual world and runs in a hand-made
**stop-motion** look.

Read in order: this file → [references/scene-design.md](references/scene-design.md) (how to invent the
scenes, pattern catalogue) → [references/scene-kit.md](references/scene-kit.md) (kit API, props, stop-motion
classes, layout rules) → [references/receipts.md](references/receipts.md) (getting real evidence).

Requirements: Node 18+ (for `npx hyperframes`), Python 3.10+, ffmpeg/ffprobe on PATH, Pillow,
`pip install faster-whisper` (word timings). Tweet screenshots: `pip install playwright`.

## Look
- **Palette** lives in the `:root` tokens at the top of `assets/kit/kit.css`: a dark flat ground, off-white
  text, **one accent colour** (`--acc`, default amber, with `--acc-rgb` kept in sync), red only for "wrong",
  limits and deadlines. Change the tokens to make it yours; every prop reads them.
- **Type**: Inter 800–900 for display and captions, JetBrains Mono for labels and code.
- **Always on**: a handle tag top-left (`● @handle / topic`), a chapter label top-right (`01 hook`), a progress
  bar on top, karaoke captions at y≈1262.
- **Stop-motion by default** (`createKit({ stopmotion: true })`): the reel is sampled on a 12fps grid, props
  boil (hand-placed jitter), grain re-rolls every step with a light flicker, screenshots are taped paper
  printouts, cards are cut-outs with hard offset shadows, hook words are ransom-note strips.
  `stopmotion: false` gives a smooth version of the same scenes.

## Workflow
1. **Research**: primary sources only (launch post, docs, pricing page, the founder's post). Note every number
   with its source. Nothing goes on screen that you can't point to.
2. **Script**: the user's. Ask for it, or for their notes and how they want it written. Save it as
   `SCRIPT.txt`; every sentence becomes a scene.
3. **Scaffold + voice**: the voiceover comes from the user (their own recording or any TTS tool they use).
   ```bash
   python <skill>/scripts/new_reel.py <slug> --dir reels --handle @yourhandle   # reels/<slug>: kit, skeleton, placeholder receipt
   # from reels/<slug>:
   python <skill>/scripts/words.py <voiceover.mp3|wav> --script SCRIPT.txt
   # -> assets/voice.wav + assets/voice.words.json, and prints every word with its index and start time
   ```
4. **Receipts** into `assets/receipts/` ([receipts.md](references/receipts.md)); tweets via
   `python <skill>/scripts/capture_tweets.py <id>=<name> ...`. Also crop **chips**: the one line of a receipt
   that proves a scene, to pin next to drawn props.
5. **Scene plan → `SCENES.md`** ([scene-design.md](references/scene-design.md)). Pick the world first (an axis
   the camera travels, a motif that transforms, a last frame that loops to the first). Then one row per
   sentence: time range + words, the **hero move** and the word it lands on, props, receipt, transition out.
6. **Build** the scenes in `src/index.tpl` with the kit ([scene-kit.md](references/scene-kit.md)). The skeleton
   has three example scenes (hook, number, proof) to copy from and replace. Anchor tweens to words with
   `at(i)` (i = the word index `words.py` printed). Then:
   ```bash
   python <skill>/scripts/build_scenes.py .        # -> index.html (kit + words + captions inlined)
   # first run writes a draft captions.json: add *accent* words, write numbers as digits, build again
   npx --yes hyperframes@0.8.65 check              # must pass (slow in stop-motion, ~1 min)
   ```
   Mark deliberate layering with `data-layout-allow-overlap` / `data-layout-ignore`; fix everything else.
7. **Review**: `npx --yes hyperframes@0.8.65 snapshot --at <mid of every scene + every transition>` and look at
   the frames (checklist in scene-kit.md). Stop-motion snaps to the 12fps grid, so a word that starts a few ms
   after the sample time is not on screen yet.
8. **Sound effects (optional)**: drop short mp3s into `assets/sfx/` (paper slide, tape, pop, whoosh, shutter,
   click) and add one `<audio>` per hit in `src/index.tpl`, next to the voice. Use sounds you have the rights to.
   ```html
   <audio id="fx1" src="assets/sfx/paper-slide.mp3" data-start="7.2" data-duration="0.75" data-track-index="51" data-volume="0.35"></audio>
   ```
   Every `<audio>` needs an id; give each overlapping hit its own track (51, 52, …).
9. **Render**: `npx --yes hyperframes@0.8.65 render -o out/raw.mp4`, then either
   - with music: put a quiet instrumental at `assets/music.mp3` and run `python <skill>/scripts/add_music.py .`
     (trims, fades, levels the bed to -19 LUFS, ducks it under the voice, normalises to -14 LUFS, encodes
     `out/<slug>.mp4`; `--start <s>` skips a weak intro, `--bed -17` / `-21` raises or lowers it), or
   - without: `ffmpeg -i out/raw.mp4 -c:v libx264 -crf 26 -tune grain -maxrate 12M -bufsize 24M -preset slow -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k out/<slug>.mp4`
     (grain makes the raw render huge; this brings it down).
   Watch the whole MP4 before calling it done.

## Honesty rules for drawn scenes
Drawn props illustrate; receipts prove. A drawn scene may show generic activity (a terminal typing, a log
scrolling, a ticket printing) but never a claim that isn't in the sources, never a fake UI of a real product,
and never a made-up number. Commands and examples taken from docs get a `.src` chip ("example from the docs").
When a drawn stat could be doubted, flip it over to the real screenshot (the flip-card pattern).

## Files
- `scripts/new_reel.py`: scaffold a project (kit, skeleton `src/index.tpl`, placeholder receipt, package.json).
- `scripts/words.py`: any voiceover file → `assets/voice.wav` + word timestamps (faster-whisper).
- `scripts/build_scenes.py`: `src/index.tpl` + `voice.words.json` + `captions.json` → `index.html`.
- `scripts/capture_tweets.py`: official tweet embeds → clean receipt PNGs.
- `scripts/add_music.py`: final encode with a music bed ducked under the voice.
- `assets/kit/kit.css`, `kit.js`, `grain.png`, `index.tpl`: the scene kit and skeleton (copied into each project).
