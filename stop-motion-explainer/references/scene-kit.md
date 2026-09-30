# Scene kit

`assets/kit/kit.css` + `kit.js`, copied into every project by `new_reel.py` and inlined by `build_scenes.py`.
The reel's own `src/index.tpl` holds the scene HTML, scene CSS and scene tweens.

## Page skeleton (from the scaffold)
```
#root.sm (data-duration="__END__")
  #sky: #ground #tint #grid #wisps #vig         ← K.travel moves these
  #stage                                        ← K.shake shakes this; scenes live here
    section.clip.scene#sN (data-start, data-duration, data-track-index 1/2 alternating)
      .sc#sNsc                                  ← animate enter/exit on .sc, never on the clip
  #fx > #grain #flicker                         ← noise over the scenes (below captions + chrome,
                                                  or the layout audit reports text_occluded on every label)
  <!--__CAPTIONS__-->                            ← .clip.cap > span.w[data-t]
  #chrome  #chap > span#chK  #progwrap > #prog
  <audio id="vo"> + sfx <audio id> (every audio needs an id)
```

## Layout rules
- Scene art: y 140–1250. Caption band: y 1262–1350 (one line, 64px). Instagram/TikTok UI covers the bottom ~20%
  and the right edge: nothing important below y 1540.
- Prefix ids per scene (`#s7card`, `#p1key`). Generate repeated DOM in JS before building tweens (racks, pages,
  coins); it must be deterministic: use `K.R()` (seeded), never `Math.random`.
- CSS transforms on an element you also tween with GSAP conflict (`gsap_css_transform_conflict`): set initial 3D
  angles with `gsap.set`, keep CSS `transform` only on elements GSAP never touches (cube faces, `.base`, `.lidb`).
- GSAP 3 has no `className` tween: tween `color`/`backgroundSize` instead. Text swaps: `tl.to(el, {textContent})`.
- Marker highlights that wrap lines: `background-image` accent + `background-size 0% → 100%` + `box-decoration-break: clone`.

## kit.js API
```js
const W = /*__WORDS__*/;
const K = createKit({ words: W, end: __END__, stopmotion: true });   // fps 12, seed 7 by default
const { tl, at, q, qa, R, END } = K;       // at(i) = start of word i − 0.06
```
| call | does |
|---|---|
| `K.travel(t, dir, level)` | camera altitude: +1 rise (grid rushes down, wisps pass), −1 drop; `level` 1 = sky tint, 0 = ground |
| `K.shake(t, amp=12)` | 5-keyframe camera shake on `#stage` (≤ 1 per ~8s) |
| `K.chapters([t1, t2, …])` | fades `#ch1…#chN` labels in/out at scene starts |
| `K.split(sel)` / `K.type(sel, t, per)` | split text into `.ch` spans / reveal them (typing) |
| `K.blink(sel, t0, t1, p)` | caret blink with a finite repeat |
| `K.draw(sel, t, d)` | stroke draw-on for `.draw` paths (`pathLength="100"`) |
| `K.mark(sel, t, d)` | scaleX 0→1 highlighter (`.hl`, origin left) |
| `K.odometer(sel, tLand, dur)` | turns text like `$100` into digit reels that land at `tLand` |
| `K.stamp(sel, t, rot)` | stamp slam from 2.4× |
| `K.rays(container, t, n)` / `K.coins(container, t, n)` / `K.sparks(container, t, x0, x1, y)` | particle bursts |
| `K.leds(sel, t0, t1)` | blinking LEDs, seeded periods |
| `K.boil(sel, amp=2.5, rot=0.45, fps=8)` | stop-motion jitter via CSS `translate`/`rotate` (never fights GSAP transforms) |
| `K.finish("main")` | karaoke captions, progress bar, boil, grain, flicker, **12fps stepping**, registers the timeline |

Always end with `K.finish("main")` (it registers `window.__timelines["main"]`).

## Stop-motion (`stopmotion: true`)
- `K.finish` wraps the timeline in a master that seeks it on a 12fps grid: every tween jumps pose to pose, no
  per-ease rewriting needed. Audio is untouched.
- Boil: call `K.boil` on props, receipts and captions (`.cap`). Anything with class `boil` in the HTML boils with
  defaults.
- CSS classes (active under `#root.sm`): `.paper` on a receipt `<img>` (paper border + hard shadow), `.taped` on
  its wrapper (two tape strips; the wrapper must not clip overflow), `.cut` on drawn cards/panels (hard offset
  shadow), `.ransom > span` for hook words (paper strips; `.acc` = accent strip).
- The check and render are slower (grain + drop shadows): `check` ~1 min, render ~3–5 min.
- The layout audit can report `text_occluded … inside #grain` for dark text on light paper: mark those text
  elements `data-layout-allow-occlusion` (the grain is meant to sit over them).

## Props (HTML + CSS in kit.css)
| prop | markup | moves |
|---|---|---|
| 3D laptop | `.lapstage > .lcam > .base(.kb .pad .kglow .seam) + .lid(.lidf > .scr, .lidb)` | `gsap.set(lcam, {rotationX:-26, rotationY:-24})`; lid `rotationX` 8 = open, −88 = shut; `.kglow`/`.seam` light |
| terminal text | `.term > div` lines (`.d` dim, `.a` accent, `.r` red, `.wht`) | reveal lines on a stagger, scroll `.term` up |
| cloud | `svg.cloud` with `path.fill` + `path.draw` | `K.draw` the outline, fade the fill |
| server rack | `.rack > .unit(i i b)` ×8 | rise in, `K.leds` |
| isometric cube | `.cubest > .cube > .face.f3 + .f2 + .f1` | `gsap.set(cube, {rotationX:-28, rotationY:-38})`, drop with `bounce.out` |
| flip card | `.flip > .cf.front + .cf.back` | `rotationY` 0 → 180 reveals the back (put the real screenshot there) |
| calendar | `#cal > .cpage(.mo .dy)` stacked, top page last in DOM | top pages `rotationX: 110, opacity: 0` one by one; red circle `path.draw` |
| comic panel | `.panel.cut > .pnum + .plbl + content` | slide in from alternating sides, slight rotation |
| coin / ray | `.coin`, `.ray` (or `K.coins` / `K.rays`) | fall with spin / burst |
| stamp | `.stamp` (color = ink) | `K.stamp` |

Laptop markup to start from:
```html
<div class="lapstage" style="top:260px"><div class="lcam" id="s1cam">
  <div class="base"><div class="kb"></div><div class="pad"></div><div class="kglow"></div></div>
  <div class="lid" id="s1lid">
    <div class="lidf"><div class="scr"><div class="term" id="s1term"><div class="a">$ run task</div><div class="d">working…</div></div></div></div>
    <div class="lidb"><i></i></div>
    <div class="seam" id="s1seam"></div>
  </div>
</div></div>
```
```js
// in the tween block
gsap.set("#s1cam", { rotationX: -26, rotationY: -24 }); gsap.set("#s1lid", { rotationX: 8 });
tl.to("#s1lid", { rotationX: -88, duration: 0.22, ease: "power3.in" }, at(12));   // slams shut on word 12
tl.to("#s1seam", { opacity: 1, duration: 0.1 }, at(12) + 0.2); K.shake(at(12) + 0.2);
```

## Review checklist (snapshots)
- Every scene's hero move is visible at its word; nothing important sits under the caption band.
- Receipt text is legible at phone size (tweets ≥ 860px wide, crops for small text); highlights sit on the words.
- No invented product UI; drawn text is generic or from a source with a `.src` chip.
- Transitions: previous scene gone before the next scene's hero move.
- `check` passes (0 errors). Deliberate overlaps are marked, not ignored.
