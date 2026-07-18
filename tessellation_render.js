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
  const EDGE_PX = 64;      // on-screen length of the base triangle edge |v_b - v_c|
  const STROKE = 'rgba(0,0,0,0.15)';

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

  // Evenly-spaced random hues around the color wheel, so every triangle
  // color is easy to tell apart no matter how many there are.
  function randomPalette(d) {
    const h0 = Math.random() * 360;
    const sat = 55 + Math.random() * 25;   // 55-80%
    const light = 55 + Math.random() * 12; // 55-67%
    const colors = [];
    for (let i = 0; i < d; i++) {
      const h = (h0 + (360 * i) / d) % 360;
      colors.push(`hsl(${h.toFixed(1)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`);
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
    // Euclidean distance exactly.
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

    return M.computeFacts(a, b, c, sigma, entry.d);
  }

  function cycleToString(cyc) { return '(' + cyc.join(' ') + ')'; }
  function permToString(cycles) { return cycles.map(cycleToString).join(''); }

  function writeBlurb(entry, facts) {
    const el = document.getElementById('tessellation-blurb');
    if (!el) return;
    const [a, b, c] = entry.type;
    el.innerHTML =
      `This background is generated live from a transitive Euclidean permutation triple ` +
      `for &Delta;(${a},${b},${c}), giving a subgroup &Gamma; of index <b>d = ${facts.d}</b> ` +
      `(one tile color per coset). The quotient &#8450;/&Gamma; has genus <b>${facts.genus}</b> ` +
      `and rotation index <b>${facts.rotationIndex}</b>. ` +
      `&sigma;<sub>a</sub> = ${permToString(entry.sigma_a)}, ` +
      `&sigma;<sub>b</sub> = ${permToString(entry.sigma_b)}, ` +
      `&sigma;<sub>c</sub> = ${permToString(entry.sigma_c)} ` +
      `&mdash; ${entry.source}.`;
  }

  // The triple + palette are chosen once per page visit, not once per
  // render call, so that resizing the window redraws the *same* pattern
  // to fit the new size rather than reshuffling colors mid-visit.
  let currentEntry = null;
  let currentPalette = null;

  function render() {
    const canvas = document.getElementById('tessellation-bg');
    if (!canvas) return;
    if (!currentEntry) {
      currentEntry = pickTriple();
      currentPalette = randomPalette(currentEntry.d);
    }
    const facts = draw(canvas, currentEntry, currentPalette);
    writeBlurb(currentEntry, facts);
  }

  // Redraw on resize, debounced so we don't rebuild the whole tessellation
  // on every pixel of a drag-resize.
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
