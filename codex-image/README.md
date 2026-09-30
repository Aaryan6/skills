# codex-image

Generate images through the Codex CLI's built-in `image_gen` tool, on your ChatGPT login: no API key, no
credits. Attach reference images to keep a character or style consistent, and get real transparent cut-outs with
`--transparent` (generated on flat magenta, then chroma-keyed to alpha).

## Requirements

- [Codex CLI](https://github.com/openai/codex) on your PATH, logged in with a ChatGPT account that includes image generation
- Python 3.8+; Pillow (`pip install pillow`) for the size/alpha report
- `--transparent` uses the chroma-key script that ships with Codex's system `imagegen` skill
  (`~/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py`)

## Usage

```bash
# one image
python scripts/codex_image.py "A flat 2D sticker of a rubber duck wearing sunglasses, bold black outlines" -o duck.png

# keep a character consistent with reference images
python scripts/codex_image.py "The same character waving, chest-up" -o wave.png -r character-front.png -r character-sheet.png

# transparent cut-out (PNG with alpha)
python scripts/codex_image.py "A cactus in a pot with a sticky note reading \"water me\"" -o cactus.png --transparent
```

A run takes about 2–5 minutes. It won't overwrite an existing file unless you pass `--force`. When your plan's
image quota runs out it exits with code 3 and a `CODEX_LIMIT:` line.

## Install

```bash
git clone https://github.com/Aaryan6/skills.git
ln -s "$(pwd)/skills/codex-image" ~/.claude/skills/codex-image
```

Then ask your agent to "generate an image with Codex" or run `/codex-image`.
