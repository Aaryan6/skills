# Receipts

A receipt is real evidence for the line being said: a tweet, a docs page, a pricing table, a chart. Aim for a new
one every few seconds in the claim-heavy part of the reel.

## Tweets
`python <skill>/scripts/capture_tweets.py 2099925682726002904=launch --out assets/receipts`
→ `tweet-launch.png` (official light embed, 2.5x, likes/replies footer cropped).
- A very tall tweet reads tiny on a phone: crop it to the text + the top of the media (Pillow).
- A video tweet whose embed poster is a black frame: download the video (`yt-dlp <status url>`), grab a frame
  (`ffmpeg -ss 8 -i x.mp4 -frames:v 1 f.png`) and paste it over the dark poster area.

## Launch videos, pricing tables, charts
Download the video (`yt-dlp`), make a contact sheet (`ffmpeg -i v.mp4 -vf fps=4,scale=320:-1,tile=8x8 sheet.png`),
pick the frame where the table is complete, crop to the rows that matter. One table can make two beats: the whole
table, then a tight crop on the row that matters.

## Web pages and docs
Playwright at `device_scale_factor=2.5`, full page, then crop the element's rect. Keep receipts ≥ 860px wide
in the frame so the text survives a phone screen.

## Logos
Official SVG/PNG from the company's site or press kit.

## Drawn receipts
When there's nothing to screenshot, draw it honestly: a stat card for a sourced number (with a `.src` chip), a
code card for what an API call looks like (from the docs), a strike-through for "it's not X, it's Y".
Never invent numbers, quotes, tweets or UI.
