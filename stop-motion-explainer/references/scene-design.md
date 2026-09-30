# Scene design

The reel is a short film where the picture **does** what the voice says. The test for every scene: with the
sound off, would someone still understand this sentence from the motion alone? A screenshot sliding in is
evidence, not a scene. The scene is what happens to things.

## 1. Pick the world before the scenes
Decide three things and write them at the top of `SCENES.md`:

- **An axis the camera travels.** Topics have a natural geography: local ↔ cloud (up/down), before ↔ after
  (left/right), outside ↔ inside a product (zoom through), small ↔ huge (scale). `K.travel(t, ±1, level)` moves
  the sky (grid rush, wisps, tint) so the viewer feels the altitude change between scenes.
- **A motif that transforms.** One object carried through the reel: a laptop lid, an orb that stands for "the
  session", a progress bar that survives a handoff, a coin that bounces off a wall. Transformations make cuts
  feel continuous: the phone collapses into the first cube, the bar floats up into the cloud.
- **A loop.** The last frame answers the first (lid closes → lid opens). Reels replay; a loop makes the replay
  feel intended.

## 2. One scene per sentence, one hero move per scene
For each sentence of the script, write a row: time range (from word indices), the words, the **hero move** and
**the exact word it lands on**, props, receipt/chip, transition out. The hero move is the thing that would make a
friend say "ha": the lid slams on "shut", the tape rips on "out of beta", the needle doesn't move on "doesn't
touch", the bar goes red on "limit", the calendar lands on the date.

Beats inside a scene follow the words: 3 clauses → 3 moves. Something changes at least every 1–2s; nothing holds
still for more than ~3s.

## 3. A worked example (made-up topic: a cloud coding agent)

World: desk (ground) ↔ cloud (sky). Motif: the laptop lid. Loop: lid shuts → lid opens.

| # | sentence is about | hero move (on word) | props / receipt | out |
|---|---|---|---|---|
| 1 | closing the laptop while work continues | lid slams shut, camera shake, light leaks from the seam | 3D laptop typing; ransom headline | `travel(+1)` |
| 2 | the feature leaving beta | two BETA tapes rip off the announcement | announcement screenshot on taped paper, highlighter on the key line, stamp | zoom through |
| 3 | where it runs | racks rise into a cloud as it draws; the laptop snores | cloud outline, racks with LEDs, chip from the docs | whip left |
| 4 | a list of three actions | comic triptych, one panel per verb | 3 panels | panels fly apart |
| 5 | a price | odometer lands on the number + coins + shake; card flips to the real pricing screenshot | flip card, coins, rays | up |
| 6 | a deadline | calendar pages tear to the date and it gets circled | calendar, chip with the fine print | `travel(-1)` |
| 7 | the last line | lid opens again | 3D laptop | loop |

## 4. Pattern catalogue (reuse, remix)
- **Slam**: a lid/door/book closes on the word with `power3.in`, a tiny rebound, `K.shake`, light leak.
- **Rip the label**: tapes/stickers across a receipt fly off on the word that removes the label ("preview", "beta").
- **Flip to proof**: a drawn stat card turns over to reveal the real screenshot on its back (`.flip` + `.cf.back`).
- **Handoff**: an element detaches from one world and continues in the other (bar → cloud, file → server).
- **Bounce off**: something tries to reach something and hits a wall: "doesn't touch", "can't access", "blocked".
- **Count up / land**: odometer on a price with coins or rays, shake on the landing word. Max 1 hit per ~8s.
- **Triptych**: 2–4 comic panels for a list of actions, each entering on its verb.
- **Multiply**: one object splits into N (phone → 3 cubes), each lands on its own word.
- **Deadline**: tear-off calendar pages flip to the date, red circle drawn on the date word.
- **Print / stamp**: tickets print in steps (`ease: "steps(9)"`), stamps slam (`K.stamp`).
- **Glitch / limit**: red fill, 3 red scan bars flashing on `steps(1)`, a jitter on the screen, one shake.
- **Chip**: the one receipt line that proves a drawn scene, pinned small beside it.

## 5. Transitions
Scenes overlap 0.3–0.5s. Match the direction to the world: rising = old scene falls (`y: +1300`), new comes from
above (`y: -1300`); dropping is the reverse. Inside the same altitude: zoom through (scale 2.6 + blur), whip
(`x: -1100` + blur), collapse into the next scene's first object. Always end the previous scene's `.sc` motion
before its clip ends.
