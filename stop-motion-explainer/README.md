# stop-motion-explainer

A Claude Code skill for vertical explainer reels in a hand-made stop-motion paper look: 12fps stepped motion,
boiling props, film grain, screenshots taped on as paper printouts, ransom-note hook words, karaoke captions.
Each line of your voiceover gets its own animated scene. Rendered with [HyperFrames](https://hyperframes.heygen.com).

## Install
Clone this repo and link or copy the folder into your skills directory (see the [repo README](../README.md#install)):

```bash
git clone https://github.com/Aaryan6/skills.git
ln -s "$(pwd)/skills/stop-motion-explainer" ~/.claude/skills/stop-motion-explainer
```

Then ask Claude Code: `/stop-motion-explainer <your topic>`.

## Requirements
- Node 18+ (HyperFrames runs through `npx`)
- Python 3.10+ with Pillow (`pip install pillow`)
- ffmpeg + ffprobe on your PATH
- A voiceover file (your own recording or any TTS tool) and `pip install faster-whisper` for the word timings.
- Optional: `pip install playwright` + `playwright install chromium` for tweet screenshots.

## Make it yours
The colours are the `:root` tokens at the top of `assets/kit/kit.css`. Change `--acc` (and `--acc-rgb` to
match), `--bg` and the fonts, and every prop, caption and chip follows. Your handle goes in with
`new_reel.py <slug> --handle @you`. Sound effects and music aren't included; add your own to `assets/sfx/` and
`assets/music.mp3`.
