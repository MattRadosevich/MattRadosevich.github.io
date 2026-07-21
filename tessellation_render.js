// ============================================================
// Renders a random Euclidean-triangle-group wallpaper onto a
// full-page <canvas>, and writes a short description of the
// data behind it into #tessellation-blurb (if present).
//
// Depends on tessellation_core.js and triples_data.js being
// loaded first (plain <script> tags, no bundler needed).
// ============================================================

(function () {
  const M = window.TessellationCore;
  const TRIPLES = window.TRIPLES;

  // ---------- tunables ----------
  const STROKE = 'rgba(0,0,0,0.15)';

  // On-screen edge length scales with the triple's index d: small-index
  // examples (few tiles) use big triangles so they read clearly; as d
  // climbs toward EDGE_MAX_D, triangles shrink so more of the underlying
  // structure is visible on screen at once.
  const EDGE_MIN_D = 4, EDGE_MAX_D = 30;
  const EDGE_MAX_PX = 64, EDGE_MIN_PX = 16;

  function idealEdgePx(d) {
    if (d <= EDGE_MIN_D) return EDGE_MAX_PX;
    if (d >= EDGE_MAX_D) return EDGE_MIN_PX;
    const t = (d - EDGE_MIN_D) / (EDGE_MAX_D - EDGE_MIN_D);
    return EDGE_MAX_PX + (EDGE_MIN_PX - EDGE_MAX_PX) * t;
  }

  // Exact tile-pair (shaded+unshaded) area for each tessellation type, used
  // to estimate how many tiles a given edge length would need for a given
  // viewport, so we can back off *before* generating them rather than
  // truncating a half-built tessellation (which leaves ugly gaps -- ask for
  // fewer, bigger tiles instead of cutting off the same tile count early).
  const TILE_AREA = { '3,3,3': 0.866, '2,4,4': 0.5, '2,3,6': 0.433 };
  const TILE_BUDGET = 25000; // keeps BFS+draw comfortably under ~150ms even on 4K/ultrawide

  function estimatedTiles(edgePx, type, W, H) {
    const area = TILE_AREA[type.join(',')];
    const halfW = (W / 2) / edgePx + 1.5, halfH = (H / 2) / edgePx + 1.5;
    const radius = Math.sqrt(halfW * halfW + halfH * halfH);
    return (Math.PI * radius * radius / area) * 1.3; // headroom: BFS frontier isn't a perfect disc
  }

  // Ideal edge length for this d, bumped up (bigger, fewer triangles) only
  // if the straightforward choice would blow past the tile budget for this
  // screen -- e.g. a d=30 example on a 4K monitor. Ordinary screens at
  // ordinary d never get touched by this.
  function edgePxForViewport(d, type, W, H) {
    const ideal = idealEdgePx(d);
    const est = estimatedTiles(ideal, type, W, H);
    if (est <= TILE_BUDGET) return ideal;
    return ideal * Math.sqrt(est / TILE_BUDGET);
  }

  // Explicitly lift every other direct child of <body> above the canvas,
  // rather than relying on the canvas having a negative z-index. This is
  // done generically (not by looking for a specific id/class) so it keeps
  // working even if the page's content wrapper changes shape later.
  function ensureContentAboveBackground() {
    for (const el of document.body.children) {
      if (el.id === 'tessellation-bg') continue;
      const computedPosition = getComputedStyle(el).position;
      if (computedPosition === 'static') {
        el.style.position = 'relative';
      }
      const currentZ = parseInt(getComputedStyle(el).zIndex, 10);
      if (isNaN(currentZ) || currentZ < 1) {
        el.style.zIndex = '1';
      }
    }
  }

  // ---------- pick today's triple + palette ----------
  function pickTriple() {
    return TRIPLES[Math.floor(Math.random() * TRIPLES.length)];
  }

  function buildSigma(entry) {
    return {
      a: M.cyclesToPerm(entry.sigma_a, entry.d),
      b: M.cyclesToPerm(entry.sigma_b, entry.d),
      c: M.cyclesToPerm(entry.sigma_c, entry.d),
    };
  }

  // Earth-tone palette: rust, sienna, terracotta, ochre, olive, moss,
  // saddle brown, and dried-husk gold -- the color range of dried
  // corn kernels -- plus a handful of dusty blue-greys to balance out all
  // the warm reds/oranges, and a couple of neutral outliers (dark grey,
  // near-cream). Anchored to real reference colors (as HSL) rather than a
  // free-floating hue/sat/light formula: an earlier version of this that
  // just picked random hue/sat/light within a "warm" range drifted into
  // pink at high lightness and neon yellow-green at high saturation.
  // Jittering around real reference points avoids that reliably.
  const EARTH_TONE_ANCHORS = [
    [18, 49, 46],   // sienna
    [15, 56, 41],   // rust / burnt orange
    [8, 44, 56],    // terracotta
    [42, 56, 53],   // ochre / goldenrod
    [80, 39, 40],   // olive drab
    [85, 29, 34],   // dark moss green
    [25, 49, 35],   // saddle brown
    [355, 39, 38],  // deep rusty maroon
    [34, 29, 70],   // tan
    [40, 34, 76],   // pale wheat / dried-husk gold
    [20, 49, 30],   // dark chocolate brown
    [95, 22, 48],   // sage / grayed moss
    [210, 22, 48],  // slate blue-grey
    [200, 26, 58],  // dusty steel blue
    [220, 20, 38],  // deeper denim blue-grey
    [30, 8, 30],    // dark grey (neutral outlier)
    [42, 20, 87],   // near-cream (light outlier)
  ];

  function randomPalette(d) {
    // Shuffle a copy of the anchor list before assigning colors, not just
    // the finished colors afterward -- otherwise a small-d example (say
    // d=4) would always draw its 4 colors from the same fixed prefix of
    // the list (sienna/rust/terracotta/ochre, every single time) and the
    // blue-greys and outliers near the end would never appear at all.
    const shuffledAnchors = EARTH_TONE_ANCHORS.slice();
    for (let i = shuffledAnchors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledAnchors[i], shuffledAnchors[j]] = [shuffledAnchors[j], shuffledAnchors[i]];
    }
    const colors = [];
    for (let i = 0; i < d; i++) {
      const [h0, s0, l0] = shuffledAnchors[i % shuffledAnchors.length];
      const h = (h0 + (Math.random() - 0.5) * 10 + 360) % 360;
      const s = Math.max(8, Math.min(62, s0 + (Math.random() - 0.5) * 14));
      const l = Math.max(25, Math.min(92, l0 + (Math.random() - 0.5) * 10));
      colors.push(`hsl(${h.toFixed(1)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`);
    }
    // Shuffle again so which anchor lands on which specific tile label is
    // independent of the (already-shuffled) anchor order above.
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    return colors;
  }

  function reflectPoint(p, a, b) {
    const d = M.C.sub(b, a);
    const ap = M.C.sub(p, a);
    const t = (ap.re * d.re + ap.im * d.im) / (d.re * d.re + d.im * d.im);
    const proj = M.C.add(a, M.C.scale(d, t));
    return M.C.sub(M.C.scale(proj, 2), p);
  }

  // ---------- main draw routine ----------
  function draw(canvas, entry, palette) {
    // Force the positioning that makes this a full-viewport backdrop via
    // direct inline styles, rather than relying only on the external
    // stylesheet rule. Inline styles set through the DOM always win the
    // cascade, so this is the most robust way to guarantee the canvas
    // stays glued to the viewport and never pushes the page taller --
    // regardless of anything else going on in the page's CSS.
    //
    // Deliberately z-index: 0 here, NOT a negative value. Negative
    // z-index depends on how the browser treats the <html>/<body>
    // background as a special bottom-most paint layer outside normal
    // stacking, which is a genuinely inconsistent corner of the CSS
    // spec across browsers. The robust pattern is the opposite: keep
    // this at an ordinary stacking level and explicitly lift the
    // content above it instead (see ensureContentAboveBackground below).
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '0';
    canvas.style.display = 'block';
    canvas.style.margin = '0';
    canvas.style.pointerEvents = 'none';
    ensureContentAboveBackground();

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const [a, b, c] = entry.type;
    const sigma = buildSigma(entry);
    const EDGE_PX = edgePxForViewport(entry.d, entry.type, W, H);

    // Screen (px, origin top-left, y-down) <-> world (unit complex plane, y-up).
    const cx = W / 2, cy = H / 2;
    const toScreen = (z) => ({ x: cx + z.re * EDGE_PX, y: cy - z.im * EDGE_PX });
    const toWorld = (x, y) => ({ re: (x - cx) / EDGE_PX, im: -(y - cy) / EDGE_PX });

    const topLeft = toWorld(0, 0), botRight = toWorld(W, H);
    const bbox = {
      xmin: Math.min(topLeft.re, botRight.re), xmax: Math.max(topLeft.re, botRight.re),
      ymin: Math.min(topLeft.im, botRight.im), ymax: Math.max(topLeft.im, botRight.im),
    };

    // Scale the safety cap to the viewport. The BFS grows outward from the
    // origin roughly circularly, so it has to reach the *corners* of the
    // screen (radius = half-diagonal) before every on-screen tile is found
    // -- a much larger disc than the screen rectangle itself, especially on
    // wide monitors. The densest of the three tessellations (2,3,6) packs
    // roughly 1 tile per 0.43 unit^2; we use 0.35 to stay safely under that,
    // plus 60% extra headroom since graph-distance in the BFS doesn't track
    // Euclidean distance exactly. (This is deliberately generous, unlike
    // the budget check above -- once we've committed to an edge length, we
    // want this tessellation to actually finish covering the screen rather
    // than stop partway and leave gaps.)
    const halfW = Math.max(Math.abs(bbox.xmin), Math.abs(bbox.xmax)) + 1.5;
    const halfH = Math.max(Math.abs(bbox.ymin), Math.abs(bbox.ymax)) + 1.5;
    const radius = Math.sqrt(halfW * halfW + halfH * halfH);
    const cap = Math.max(1500, Math.ceil((Math.PI * radius * radius / 0.35) * 1.6));

    const { tiles, geo } = M.generateTiles(a, b, c, sigma, bbox, { margin: 1.5, cap });
    const vcReflected = reflectPoint(geo.v.c, geo.v.a, geo.v.b);

    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    ctx.strokeStyle = STROKE;

    for (const tile of tiles) {
      const transform = (v) => M.C.add(M.C.mul(tile.omega, v), tile.beta);
      const pa = transform(geo.v.a), pb = transform(geo.v.b), pc = transform(geo.v.c);
      const pcRefl = transform(vcReflected);
      const color = palette[(tile.label - 1) % entry.d];

      for (const tri of [[pa, pb, pc], [pa, pb, pcRefl]]) {
        const pts = tri.map(toScreen);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.lineTo(pts[2].x, pts[2].y);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  function cycleToString(cyc) { return '(' + cyc.join(' ') + ')'; }
  function permToString(cycles) { return cycles.map(cycleToString).join(''); }

  function writeBlurb(entry) {
    const el = document.getElementById('tessellation-blurb');
    if (!el) return;
    const [a, b, c] = entry.type;
    el.innerHTML =
      `The background of this page visualizes an index <b>d = ${entry.d}</b> subgroup of ` +
      `the Euclidean triangle group &Delta;(${a},${b},${c}), determined by the permutation triple ` +
      `&sigma;<sub>a</sub> = ${permToString(entry.sigma_a)}, ` +
      `&sigma;<sub>b</sub> = ${permToString(entry.sigma_b)}, ` +
      `&sigma;<sub>c</sub> = ${permToString(entry.sigma_c)}.`;
  }

  // The triple + palette are chosen once per page visit, not once per
  // render call, so that resizing the window redraws the *same* pattern
  // to fit the new size rather than reshuffling colors mid-visit. A
  // manual shuffle (see wireControls) resets both and re-renders.
  let currentEntry = null;
  let currentPalette = null;

  function render() {
    const canvas = document.getElementById('tessellation-bg');
    if (!canvas) return;
    if (!currentEntry) {
      currentEntry = pickTriple();
      currentPalette = randomPalette(currentEntry.d);
    }
    draw(canvas, currentEntry, currentPalette);
    writeBlurb(currentEntry);
  }

  // ---------- info-box toggle + shuffle controls ----------
  // These live in their own always-present container (a sibling of the
  // info box, not nested inside it), so they stay reachable even when the
  // info box itself is hidden -- otherwise there'd be no way to bring it
  // back once it's gone.
  function wireControls() {
    const infoBox = document.getElementById('info-box');
    const toggleLink = document.getElementById('toggle-info-link');
    const shuffleLink = document.getElementById('shuffle-link');

    if (infoBox && toggleLink) {
      toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        const nowHidden = infoBox.style.display !== 'none';
        infoBox.style.display = nowHidden ? 'none' : '';
        toggleLink.textContent = nowHidden
          ? 'Click here to unhide info box'
          : 'Click here for full-screen wallpaper';
      });
    }

    if (shuffleLink) {
      shuffleLink.addEventListener('click', (e) => {
        e.preventDefault();
        currentEntry = null;
        currentPalette = null;
        render();
      });
    }
  }

  // Redraw on resize, debounced so we don't rebuild the whole tessellation
  // on every pixel of a drag-resize.
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });

  function init() {
    wireControls();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
