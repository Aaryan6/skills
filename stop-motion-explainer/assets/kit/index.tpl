<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      /*__KIT_CSS__*/

      /* ---------- scene CSS (prefix every id with its scene: #s1…, #s2…) ---------- */
      #s1head { position: absolute; left: 0; right: 0; top: 380px; text-align: center; font-weight: 900; font-size: 130px; letter-spacing: -6px; line-height: 1.08; }
      #s1sub { position: absolute; left: 0; right: 0; top: 820px; text-align: center; font-family: var(--mono); font-size: 44px; color: var(--dim); }
      #s2card { position: absolute; left: 140px; top: 330px; width: 800px; height: 620px; border-radius: 40px; background: var(--card); border: 3px solid var(--line); }
      #s2lbl { position: absolute; left: 0; right: 0; top: 70px; text-align: center; font-family: var(--mono); font-size: 36px; color: var(--dim); }
      #s2num { position: absolute; left: 0; right: 0; top: 170px; text-align: center; font-weight: 900; font-size: 230px; letter-spacing: -8px; color: var(--acc); }
      #s2stamp { left: 470px; top: 480px; font-size: 64px; color: var(--red); }
      #s3card { position: absolute; left: 110px; top: 260px; width: 860px; }
      #s3card img { display: block; width: 860px; border-radius: 24px; }
      #s3src { left: 110px; top: 1150px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="__END__">
      <div id="sky"><div id="ground"></div><div id="tint"></div><div id="grid" data-layout-ignore></div><div id="wisps" data-layout-ignore></div><div id="vig"></div></div>

      <div id="stage">
        <!-- one clip per scene; overlap the next scene by 0.3-0.5s so every cut is a transition.
             Replace these example times with word anchors once the voice exists (at(i) in the script below). -->
        <section id="s1" class="clip scene" data-start="0" data-duration="3.5" data-track-index="1">
          <div class="sc" id="s1sc">
            <div id="s1head" class="ransom"><span>Hook</span><span class="acc">word</span><br /><span>goes</span><span>here</span></div>
            <div id="s1sub">a line under the headline</div>
          </div>
        </section>
        <section id="s2" class="clip scene" data-start="3.2" data-duration="4.3" data-track-index="2">
          <div class="sc" id="s2sc">
            <div id="s2card" class="cut">
              <div id="s2lbl">a sourced number</div>
              <div id="s2num">$100</div>
              <div id="s2stamp" class="stamp">REAL</div>
            </div>
          </div>
        </section>
        <section id="s3" class="clip scene" data-start="7.2" data-duration="3.8" data-track-index="1">
          <div class="sc" id="s3sc">
            <div id="s3card" class="taped"><img class="paper" src="assets/receipts/receipt.png" alt="" /></div>
            <div id="s3src" class="src">source: <b>where this came from</b></div>
          </div>
        </section>
      </div>

      <div id="fx" data-layout-ignore><div id="grain" data-layout-ignore data-layout-allow-occlusion></div><div id="flicker" data-layout-ignore data-layout-allow-occlusion></div></div>

      <!--__CAPTIONS__-->

      <div id="chrome"><span class="dot"></span><b>__HANDLE__</b><span>/ __TOPIC__</span></div>
      <div id="chap"><span id="ch1"><b>01</b> hook</span><span id="ch2"><b>02</b> number</span><span id="ch3"><b>03</b> proof</span></div>
      <div id="progwrap"><div id="prog"></div></div>

      <audio id="vo" src="assets/voice.wav" data-start="0" data-duration="__VO__" data-track-index="50" data-volume="1"></audio>
      <!-- sound effects go here: one <audio id="fxN"> per hit, tracks 51+ (see SKILL.md step 8) -->
    </div>

    <script>/*__KIT_JS__*/</script>
    <script>
      const W = /*__WORDS__*/;
      const K = createKit({ words: W, end: __END__, stopmotion: true });
      const { tl, at, q, qa, R, END } = K;
      K.chapters([0, 3.2, 7.2]);

      // ===== S1 · hook: ransom words slap down one by one =====
      qa("#s1head > span").forEach((s, k) => tl.fromTo(s, { opacity: 0, y: 80, rotation: k % 2 ? 8 : -8 }, { opacity: 1, y: 0, rotation: 0, duration: 0.35, ease: "back.out(2)" }, 0.1 + k * 0.18));
      tl.fromTo("#s1sub", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.0);
      K.travel(3.1, 1, 1);
      tl.to("#s1sc", { y: 1300, duration: 0.6, ease: "power2.in" }, 3.1);

      // ===== S2 · number: card drops in, odometer lands, stamp slams =====
      tl.fromTo("#s2sc", { y: -1300 }, { y: 0, duration: 0.6, ease: "power3.out" }, 3.2);
      K.odometer("#s2num", 5.0);
      K.stamp("#s2stamp", 5.6); K.shake(5.6, 10);
      tl.to("#s2sc", { x: -1100, duration: 0.4, ease: "power3.in" }, 7.1);

      // ===== S3 · proof: the real receipt slides in on taped paper =====
      tl.fromTo("#s3sc", { x: 1100, rotation: 6 }, { x: 0, rotation: -1.5, duration: 0.5, ease: "power3.out" }, 7.2);
      tl.fromTo("#s3src", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 7.9);

      // ===== boil + finish =====
      K.boil("#s1head", 2, 0.4); K.boil("#s2card", 2.5, 0.35); K.boil("#s3card", 2.5, 0.35); K.boil(".cap", 1.5, 0.5);
      K.finish("main");
    </script>
  </body>
</html>
