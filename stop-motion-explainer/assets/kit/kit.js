/* Stop-motion explainer scene kit: timeline helpers for hand-built reels (GSAP 3, seek-safe, deterministic).
   build_scenes.py inlines this file. Usage (see references/scene-kit.md):

     const K = createKit({ words: W, end: 42.6, stopmotion: true });
     const tl = K.tl, at = K.at;
     ... scene tweens on tl ...
     K.finish("main");          // captions, boil, grain, 12fps stepping, registers the timeline
*/
(function () {
  const smr = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function rng(seed) {
    return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // per-step deterministic random value: the hand-placed jitter of stop motion
  const boilEase = (seed, d, fps) => { const n = Math.max(1, Math.round(d * fps)); return (p) => smr(Math.min(n - 1, Math.floor(p * n)) + seed * 7919); };

  window.createKit = function (opt) {
    const W = opt.words, END = opt.end, FPS = opt.fps || 12, SM = opt.stopmotion !== false;
    const q = (s) => document.querySelector(s), qa = (s) => Array.from(document.querySelectorAll(s));
    const css = getComputedStyle(document.documentElement);
    const ACC = css.getPropertyValue("--acc").trim() || "#ffb82e", INK = css.getPropertyValue("--ink").trim() || "#f4f1ea";
    const tl = gsap.timeline({ paused: true });
    const R = rng(opt.seed || 7);
    const boils = [];
    const K = { tl, W, END, FPS, SM, q, qa, R, ACC, INK };
    if (SM) q("#root").classList.add("sm");

    K.at = (i) => W[i] - 0.06;                      // anchor: just before word i is spoken

    // ---- camera ----
    K.shake = (t, a = 12) => tl.to("#stage", { keyframes: [{ x: a, y: -a * 0.6, duration: 0.045 }, { x: -a * 0.8, y: a * 0.5, duration: 0.045 },
      { x: a * 0.5, y: a * 0.4, duration: 0.045 }, { x: -a * 0.3, y: -a * 0.2, duration: 0.045 }, { x: 0, y: 0, duration: 0.06 }] }, t);
    // altitude: dir +1 rises (world falls past), -1 drops back to the ground; level = sky tint 0..1
    let gridY = 0;
    for (let k = 0; k < 7; k++) {
      const d = document.createElement("div"); d.className = "wisp"; const w = 500 + R() * 700;
      d.style.width = w + "px"; d.style.height = w * 0.45 + "px"; d.style.left = (-200 + R() * 900) + "px"; d.style.top = (k * 290 - 100) + "px";
      q("#wisps") && q("#wisps").appendChild(d);
    }
    gsap.set("#wisps", { y: 3000 });
    K.travel = (t, dir, level) => {
      tl.fromTo("#grid", { backgroundPosition: `0px ${gridY}px` }, { backgroundPosition: `0px ${gridY + dir * 704}px`, duration: 0.8, ease: "power2.inOut", immediateRender: false }, t);
      gridY += dir * 704;
      tl.fromTo("#wisps", { y: dir > 0 ? -2100 : 2100 }, { y: dir > 0 ? 2100 : -2100, duration: 1.0, ease: "power1.inOut", immediateRender: false }, t - 0.1);
      tl.to("#tint", { opacity: level, duration: 0.8, ease: "power1.inOut" }, t);
      tl.to("#ground", { opacity: 1 - level, duration: 0.8, ease: "power1.inOut" }, t);
    };
    // chapter label per scene: <div id="chap"><span id="ch1"><b>01</b> name</span>…</div>
    K.chapters = (times) => times.forEach((t, k) => {
      const el = "#ch" + (k + 1);
      tl.fromTo(el, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", immediateRender: k === 0 }, t + 0.05);
      if (k < times.length - 1) tl.to(el, { opacity: 0, y: 14, duration: 0.2, ease: "power2.in" }, times[k + 1] - 0.05);
    });

    // ---- text ----
    K.split = (sel) => qa(sel).forEach((el) => {
      const txt = el.textContent; el.textContent = "";
      for (const c of txt) { const s = document.createElement("span"); s.className = "ch"; s.textContent = c === " " ? " " : c; el.appendChild(s); }
    });
    K.type = (sel, t, per = 0.045) => qa(sel + " .ch").forEach((s, k) => tl.to(s, { opacity: 1, duration: 0.01 }, t + k * per));
    K.blink = (sel, t0, t1, p = 0.2) => tl.fromTo(sel, { opacity: 1 }, { opacity: 0, duration: p, repeat: Math.max(0, Math.floor((t1 - t0) / p) - 1), yoyo: true, ease: "steps(1)" }, t0);
    K.draw = (sel, t, d = 0.5, ease = "power2.out") => tl.fromTo(sel, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: d, ease }, t);
    K.mark = (sel, t, d = 0.35) => tl.fromTo(sel, { scaleX: 0 }, { scaleX: 1, duration: d, ease: "power2.inOut" }, t);
    // odometer: element text like "$100" -> digit reels that land on tLand
    K.odometer = (sel, tLand, dur = 1.4) => {
      const el = q(sel), txt = el.textContent; el.textContent = ""; let k = 0;
      for (const c of txt) {
        if (/\d/.test(c)) {
          const v = 20 + +c, o = document.createElement("span"), r = document.createElement("span");
          o.className = "odo"; r.className = "reel";
          // the off-window digits are clipped by .odo on purpose: keep them out of the layout audit
          r.setAttribute("data-layout-ignore", ""); r.setAttribute("data-layout-allow-occlusion", "");
          for (let n = 0; n <= v; n++) r.insertAdjacentHTML("beforeend", `<b>${n % 10}</b>`);
          o.appendChild(r); el.appendChild(o);
          tl.fromTo(r, { yPercent: 0 }, { yPercent: (-100 * v) / (v + 1), duration: dur - k * 0.12, ease: "power3.out" }, tLand - dur + k * 0.12);
          k++;
        } else { const s = document.createElement("span"); s.textContent = c; el.appendChild(s); }
      }
    };
    // stamp slams down from big + tilted
    K.stamp = (sel, t, rot = -8) => tl.fromTo(sel, { opacity: 0, scale: 2.4, rotation: rot - 14 }, { opacity: 1, scale: 1, rotation: rot, duration: 0.2, ease: "power4.in" }, t);

    // ---- particles ----
    K.rays = (container, t, n = 14, len = 0.5) => {
      const box = q(container);
      for (let k = 0; k < n; k++) { const r = document.createElement("div"); r.className = "ray"; r.setAttribute("data-layout-ignore", ""); box.appendChild(r); gsap.set(r, { rotation: k * (360 / n) });
        tl.fromTo(r, { opacity: 1, scaleY: 0.3 }, { opacity: 0, scaleY: 1.4, duration: len, ease: "power2.out" }, t); }
    };
    K.coins = (container, t, n = 16, spread = 1.3) => {
      const box = q(container);
      for (let k = 0; k < n; k++) {
        const c = document.createElement("div"); c.className = "coin"; c.textContent = "$"; c.setAttribute("data-layout-ignore", "");
        const s = 44 + R() * 40, d = R(); c.style.width = c.style.height = s + "px"; c.style.fontSize = s * 0.6 + "px"; c.style.left = (30 + R() * 1000) + "px";
        box.appendChild(c);
        tl.fromTo(c, { y: -150, opacity: 1, rotation: 0 }, { y: 2000, rotation: (k % 2 ? 1 : -1) * 540, duration: 1.4 + d, ease: "power1.in" }, t + d * spread);
      }
    };
    // code glyphs that float up out of something (a laptop seam, a server)
    K.sparks = (container, t, x0, x1, y, n = 12) => {
      const glyphs = ["{", "}", ";", "<", "/>", "()", "=>", "$", "#", "[]"], box = q(container);
      for (let k = 0; k < n; k++) {
        const s = document.createElement("div"); s.className = "spark"; s.setAttribute("data-layout-ignore", ""); s.textContent = glyphs[k % glyphs.length];
        Object.assign(s.style, { position: "absolute", left: (x0 + R() * (x1 - x0)) + "px", top: (y + R() * 40) + "px", fontFamily: "JetBrains Mono, monospace", fontWeight: 800, fontSize: "34px", color: ACC, opacity: 0, textShadow: "0 0 18px rgba(var(--acc-rgb),.8)" });
        box.appendChild(s);
        const t0 = t + k * 0.05;
        tl.fromTo(s, { opacity: 0, y: 0 }, { opacity: 1, y: -120, duration: 0.15, ease: "power2.out" }, t0);
        tl.to(s, { y: -520 - (k % 4) * 90, x: (k % 2 ? 1 : -1) * (40 + k * 8), rotation: k % 2 ? 40 : -40, opacity: 0, duration: 0.7, ease: "power1.in" }, t0 + 0.15);
      }
    };
    // blinking LEDs (server racks etc.) from t0 to t1
    K.leds = (sel, t0, t1) => qa(sel).forEach((led) => {
      const p = 0.12 + R() * 0.2;
      tl.fromTo(led, { opacity: 1 }, { opacity: 0.15, duration: p, repeat: Math.max(0, Math.floor((t1 - t0) / p) - 1), yoyo: true, ease: "steps(1)" }, t0 + R() * 0.4);
    });

    // ---- stop-motion boil: jitter an element on its own grid without touching its GSAP transform ----
    K.boil = (sel, a = 2.5, ra = 0.45, fps = 8, base = 0) => boils.push([sel, a, ra, fps, base]);

    // ---- finish: captions, boil, grain, stepping, register ----
    K.finish = (id = "main") => {
      tl.fromTo("#prog", { scaleX: 0 }, { scaleX: 1, duration: END, ease: "none" }, 0);
      // karaoke captions: <div class="clip cap"><span class="w" data-t="1.23">word</span>…</div> (build_scenes.py writes them)
      qa(".cap").forEach((cap) => {
        const ws = Array.from(cap.querySelectorAll(".w"));
        ws.forEach((w, k) => {
          const t = +w.dataset.t;
          tl.fromTo(w, { opacity: 0, y: 18, color: ACC }, { opacity: 1, y: 0, duration: 0.12, ease: "power2.out" }, t - 0.04);
          if (!w.classList.contains("acc")) {
            const nt = k + 1 < ws.length ? +ws[k + 1].dataset.t : t + 0.35;
            tl.to(w, { color: INK, duration: 0.12 }, Math.max(t + 0.1, nt - 0.04));
          }
        });
      });
      let master = tl;
      if (SM) {
        qa(".boil").forEach((el) => { if (!boils.some((b) => b[0] === el)) boils.push([el, 2.5, 0.45, 8, 0]); });
        boils.forEach(([sel, a, ra, fps, base], i) => {
          (typeof sel === "string" ? qa(sel) : [sel]).forEach((el, j) => {
            el.classList.add("boil");
            const s = 3 * (i * 17 + j);
            tl.fromTo(el, { "--bx": -a + "px" }, { "--bx": a + "px", duration: END, ease: boilEase(s, END, fps), immediateRender: false }, 0);
            tl.fromTo(el, { "--by": -a + "px" }, { "--by": a + "px", duration: END, ease: boilEase(s + 1, END, fps), immediateRender: false }, 0);
            tl.fromTo(el, { "--br": base - ra + "deg" }, { "--br": base + ra + "deg", duration: END, ease: boilEase(s + 2, END, fps), immediateRender: false }, 0);
          });
        });
        // film grain that re-rolls every step, and a light exposure flicker
        tl.fromTo("#grain", { x: -256, y: -256 }, { x: 0, y: 0, duration: END, ease: boilEase(9001, END, FPS) }, 0);
        tl.fromTo("#flicker", { opacity: 0 }, { opacity: 0.05, duration: END, ease: boilEase(9002, END, FPS) }, 0);
        // the whole reel is sampled on a 12fps grid: everything jumps pose to pose like moved paper
        const n = Math.round(END * FPS);
        master = gsap.timeline({ paused: true });
        master.fromTo(tl, { time: 0 }, { time: END, duration: END, ease: (p) => Math.floor(p * n) / n });
      }
      window.__timelines = window.__timelines || {};
      window.__timelines[id] = master;
    };
    return K;
  };
})();
