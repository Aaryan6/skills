---
name: codex-image
description: Generate or restyle a raster image through the local Codex CLI's built-in image_gen tool (OpenAI's image model on the user's ChatGPT login, no API key or credits needed), with optional reference images for character or style consistency. Use when the user says "generate an image with Codex", "use Codex to make an image", "/codex-image", or wants a still (B-roll frame, prop, scene background, thumbnail, character image) made with Codex, including transparent cut-outs (props, stickers, characters) via --transparent, which generates on flat magenta and keys it out. Not for native-alpha needs such as glowing, glassy or magenta subjects, and not for diagrams or UI that are better drawn in HTML/SVG.
---

# Codex image generation

Codex CLI (`codex`, logged in with ChatGPT) has a built-in `image_gen` tool and a system `imagegen` skill
(`~/.codex/skills/.system/imagegen`). `scripts/codex_image.py` drives it non-interactively: it runs
`codex exec` in the output folder, has Codex save the PNG under the requested name, falls back to the newest
file in `~/.codex/generated_images/` if Codex didn't copy it, and reports size and whether the image has alpha.

## Run it

```bash
python <skill>/scripts/codex_image.py "<prompt>" -o <path/to/name.png> [-r ref.png ...]
```

- `-o` output PNG. Put project assets where they belong. It refuses to overwrite an existing file; pick a
  versioned name (`-v2`) or pass `--force` only when the user asked to replace it.
- `-r` reference images (repeatable), attached to the Codex prompt. Use them for any recurring character or
  style.
- `--model` overrides the Codex model for one run. The default comes from `~/.codex/config.toml`. ChatGPT
  logins reject some models ("not supported when using Codex with a ChatGPT account"); the available list is in
  `~/.codex/models_cache.json`.
- One image takes about 2–5 minutes. Use a 600000 ms Bash timeout, or run it in the background and wait. For
  several images, launch at most 2–3 runs in parallel, each with its own output name.
- Uses the ChatGPT plan's image quota. When that runs out the script exits with code **3** and a
  `CODEX_LIMIT:` line: tell the user, and switch to another image generator if they have one, instead of
  retrying. Stderr noise from Codex MCP servers that need re-auth (`rmcp::transport …`) doesn't affect the run.

## Always check the result

Read the output PNG and look at it before reporting. Check pose/composition against the prompt, text spelling,
and character details against the reference. Image models drift on specifics (pointing at the wrong thing, a
laptop turned the wrong way), so state what's off and offer a rerun with a sharper prompt rather than calling
it done.

## Transparency: use `--transparent`

Codex can't output real alpha: asking it for a transparent background gives an opaque image with a painted
grey-white checkerboard. Never ship that as a cut-out and never try to key the checkerboard out.

`--transparent` works around it: the prompt gets a flat pure magenta `#FF00FF` background (and "no magenta,
pink or purple on the subject"), then Codex's bundled `remove_chroma_key.py` keys it out
(`--auto-key border --soft-matte --despill`) into an RGBA PNG. The raw magenta image is kept next to the log.
Magenta rather than green, so green or lime details on the subject survive. Works cleanly on flat props and
flat 2D characters, including hair tips, glasses rims and outlines.

- Verify every cut-out on contrasting backgrounds, zooming into fine edges (hair, glasses, outlines, text):
  a quick PIL composite of the PNG on dark, white and red strips shows fringe or holes at once.
- Don't use it for subjects that are themselves magenta/pink/purple, or for soft, glowing, smoky or
  semi-transparent subjects (glass, fire, fur): chroma keying can't recover those. Use a generator with native
  transparent output instead (for example OpenAI's image API with `background: "transparent"`).

## Prompting

- Describe subject, style, framing, background and anything that must be spelled exactly (put exact text in
  quotes). Ask for one image; say what to avoid ("no extra text", "no watermark").
- For a recurring character, attach its reference images (a front view plus a character sheet works well) and
  restate its locked traits in the prompt every time: art style, outline weight, hair, glasses, clothing,
  logos and their exact text and colours.
