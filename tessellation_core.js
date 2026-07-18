// ============================================================
// Core math engine for Euclidean-triangle-group wallpaper art.
// Pure logic, no DOM/canvas — testable head­lessly in Node.
// ============================================================

// ---- complex number helpers: represented as {re, im} ----
const C = {
  add: (a,b) => ({re:a.re+b.re, im:a.im+b.im}),
  sub: (a,b) => ({re:a.re-b.re, im:a.im-b.im}),
  mul: (a,b) => ({re:a.re*b.re - a.im*b.im, im:a.re*b.im + a.im*b.re}),
  scale: (a,s) => ({re:a.re*s, im:a.im*s}),
  conj: (a) => ({re:a.re, im:-a.im}),
  fromPolar: (theta) => ({re:Math.cos(theta), im:Math.sin(theta)}),
};

// ---- permutations: 1-indexed arrays, perm[i] = image of i ----
function cyclesToPerm(cycles, d) {
  const p = new Array(d+1);
  for (let i=1;i<=d;i++) p[i]=i;
  for (const cyc of cycles) {
    const n = cyc.length;
    for (let i=0;i<n;i++) p[cyc[i]] = cyc[(i+1)%n];
  }
  return p;
}
function invPerm(p) {
  const inv = new Array(p.length);
  for (let i=1;i<p.length;i++) inv[p[i]] = i;
  return inv;
}
function composeLtoR(p,q) { // apply p first, then q
  const r = new Array(p.length);
  for (let i=1;i<p.length;i++) r[i] = q[p[i]];
  return r;
}
function isIdentity(p) {
  for (let i=1;i<p.length;i++) if (p[i]!==i) return false;
  return true;
}
function numCycles(p) {
  const seen = new Array(p.length).fill(false);
  let count=0;
  for (let i=1;i<p.length;i++) {
    if (!seen[i]) {
      count++;
      let j=i;
      while(!seen[j]) { seen[j]=true; j=p[j]; }
    }
  }
  return count;
}
function cycleLengths(p) {
  const seen = new Array(p.length).fill(false);
  const lens = [];
  for (let i=1;i<p.length;i++) {
    if (!seen[i]) {
      let len=0, j=i;
      while(!seen[j]) { seen[j]=true; j=p[j]; len++; }
      lens.push(len);
    }
  }
  return lens;
}

// ---- Verify a triple is a valid transitive Euclidean permutation triple ----
function isTransitive(sa,sb,sc,d) {
  const gens = [sa,sb,sc,invPerm(sa),invPerm(sb),invPerm(sc)];
  const seen = new Set([1]);
  let frontier=[1];
  while (frontier.length) {
    const next=[];
    for (const x of frontier) for (const g of gens) {
      const y=g[x];
      if (!seen.has(y)) { seen.add(y); next.push(y); }
    }
    frontier=next;
  }
  return seen.size===d;
}
function validateTriple(sa,sb,sc,d) {
  const comp = composeLtoR(composeLtoR(sa,sb),sc);
  return { identityOK: isIdentity(comp), transitive: isTransitive(sa,sb,sc,d) };
}

// ---- Geometry: vertex coordinates + rotation generators for a given (a,b,c) ----
function setupGeometry(a,b,c) {
  const vc = {re:0,im:0};
  const vb = {re:1,im:0};
  const za = C.fromPolar(2*Math.PI/a);
  const zb = C.fromPolar(2*Math.PI/b);
  // va = -za*(1-zb)/(1-za) * vb   (vb=1, so just compute the scalar)
  const one = {re:1,im:0};
  const numer = C.mul(C.scale(za,-1), C.sub(one,zb));
  const denom = C.sub(one,za);
  // complex division numer/denom
  const denomConjNorm = denom.re*denom.re + denom.im*denom.im;
  const va = C.scale(C.mul(numer, C.conj(denom)), 1/denomConjNorm);

  const zc = C.fromPolar(2*Math.PI/c);
  return {
    v: {a:va, b:vb, c:vc},
    zeta: {a:za, b:zb, c:zc},
  };
}

// Apply generator move: given current tile transform D(z)=omega*z+beta,
// compute D' = D∘delta_n (or D∘delta_n^{-1}) as (omega',beta').
function applyGen(omega, beta, n, geo, inverse) {
  const zn = inverse ? C.conj(geo.zeta[n]) : geo.zeta[n]; // |zeta|=1 so inverse = conjugate
  const vn = geo.v[n];
  const newOmega = C.mul(omega, zn);
  const oneMinusZn = C.sub({re:1,im:0}, zn);
  const newBeta = C.add(C.mul(omega, C.mul(vn, oneMinusZn)), beta);
  return [newOmega, newBeta];
}

// BFS over tiles, each tile = {omega, beta, label}.
// Stops once every frontier tile's shaded-triangle centroid lies outside
// the bounding box (in world/unit coordinates) + margin, or at a safety cap.
function generateTiles(a, b, c, sigma, bbox, opts) {
  opts = opts || {};
  const cap = opts.cap || 6000;
  const margin = opts.margin != null ? opts.margin : 2; // in "unit" triangle-edge lengths
  const geo = setupGeometry(a,b,c);
  const centroidOf = (omega,beta) => {
    // centroid of shaded triangle v_a,v_b,v_c under this transform
    const pa = C.add(C.mul(omega, geo.v.a), beta);
    const pb = C.add(C.mul(omega, geo.v.b), beta);
    const pc = C.add(C.mul(omega, geo.v.c), beta);
    return {re:(pa.re+pb.re+pc.re)/3, im:(pa.im+pb.im+pc.im)/3};
  };
  const inBounds = (p) => (
    p.re >= bbox.xmin - margin && p.re <= bbox.xmax + margin &&
    p.im >= bbox.ymin - margin && p.im <= bbox.ymax + margin
  );

  const key = (omega,beta) => [omega.re,omega.im,beta.re,beta.im].map(x=>x.toFixed(4)).join(',');
  const start = {omega:{re:1,im:0}, beta:{re:0,im:0}, label:1};
  const seen = new Set([key(start.omega,start.beta)]);
  const queue = [start];
  const tiles = [];
  let qi = 0;
  while (qi < queue.length && tiles.length < cap) {
    const cur = queue[qi++];
    const c0 = centroidOf(cur.omega, cur.beta);
    tiles.push(cur);
    if (!inBounds(c0)) continue; // don't expand past the margin
    for (const n of ['a','b','c']) {
      for (const inverse of [false, true]) {
        const [no, nb] = applyGen(cur.omega, cur.beta, n, geo, inverse);
        const k = key(no,nb);
        if (!seen.has(k)) {
          seen.add(k);
          const perm = inverse ? invPerm(sigma[n]) : sigma[n];
          queue.push({omega:no, beta:nb, label:perm[cur.label]});
        }
      }
    }
  }
  return {tiles, geo};
}

// ---- Mathematical "fun facts" for the blurb, computed directly from the triple ----
function computeFacts(a,b,c,sigma,d) {
  const excess = ['a','b','c'].reduce((s,n)=> s + (d - numCycles(sigma[n])), 0);
  const genus = (-2*d + excess + 2)/2;
  const order = {a,b,c};
  let rotationIndex = 1;
  for (const n of ['a','b','c']) {
    for (const len of cycleLengths(sigma[n])) {
      rotationIndex = Math.max(rotationIndex, order[n]/len);
    }
  }
  return { d, genus, rotationIndex };
}

const TessellationCore = { C, cyclesToPerm, invPerm, composeLtoR, isIdentity, numCycles, cycleLengths,
  isTransitive, validateTriple, setupGeometry, applyGen, generateTiles, computeFacts };

// Work both as a Node module (for testing) and as a plain browser <script>.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TessellationCore;
} else {
  window.TessellationCore = TessellationCore;
}
