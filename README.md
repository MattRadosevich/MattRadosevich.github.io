# Euclidean triangle-group wallpaper background

This adds a live, randomly-generated background to your site: on every page
load, JavaScript picks a transitive Euclidean permutation triple, unfolds it
into the corresponding colored tessellation of the plane, and draws it on a
full-page `<canvas>` behind your existing content box.

## Files

- **`index.html`** — your existing page, unchanged, plus a `<canvas>` element
  and a new "About the background" blurb at the bottom of the box.
- **`tessellation_core.js`** — the math: triangle-group geometry, the
  permutation-triple BFS/coloring algorithm, and the genus / rotation-index
  formulas. No DOM code at all, so it's also unit-testable in plain Node.
- **`triples_data.js`** — the list of permutation triples to choose from.
  Currently the 14 verified examples from Section 5 of your thesis (example
  15 is left out — see note below).
- **`tessellation_render.js`** — glue code: picks a random triple and color
  palette, sizes/draws the canvas, and fills in the blurb text.

Just commit all four `.js`/`.html` files alongside your existing
`WebsiteHeadshot.png` and `RadosevichShortCV.pdf` — no build step, no
dependencies, nothing else to install. GitHub Pages serves static files
directly.

## The math, briefly

Given a triple `(a,b,c)` and a transitive permutation triple `(σ_a,σ_b,σ_c)`
in `S_d` with `σ_a σ_b σ_c = 1` (composed left to right, i.e. `σ_aσ_b` means
"apply σ_a then σ_b" — this is the convention your thesis fixes for `S_d`,
and it's also Magma's native convention), the labeling scheme in Lemma 2.15
of your thesis assigns each tile of the Δ(a,b,c) tessellation a label in
`{1,...,d}`. Two tiles get the same label iff they're Γ-equivalent.

The key simplification this project relies on: **that labeling can be computed
by pure BFS on the tessellation itself, without ever building Γ, T(Γ), or any
of the translation-subgroup machinery.** Starting from the base tile (label 1),
each time you rotate a tile about one of its three vertex-types (the local
copy of `v_a`, `v_b`, or `v_c`) to reach a neighboring tile, the neighbor's
label is obtained by applying `σ_a`, `σ_b`, or `σ_c` (or its inverse, for the
other rotational direction) to the current label. That's it — the entire
`generateTiles` function in `tessellation_core.js` is under 30 lines. This
was checked against three of your thesis's own worked examples (#9, #12,
#13) and reproduces the exact geometry and genus/rotation-index values given
there.

Practically, this means **the "data file" doesn't need Magma output at all**
— just the raw triple. Magma (or any other tool) is only needed if you want
to *validate* a candidate triple (`validateTriple` in the core file does
this in plain JS too) or to cross-reference a background with the actual
Belyi map you computed for it.

The vertex coordinates for each of the three tessellations were re-derived
from scratch here (not copied from the arXiv article, which uses the
opposite composition order `δ_c δ_b δ_a = 1` and a mirrored vertex
labeling) and checked numerically to satisfy `δ_a δ_b δ_c = 1` exactly, to
stay consistent with your thesis's specific convention.

## Adding more triples

Append an entry to the `TRIPLES` array in `triples_data.js`:

```js
{
  id: 16,
  type: [2,3,6],        // one of [3,3,3], [2,4,4], [2,3,6]
  d: 8,                  // the degree — must match your cycles below
  sigma_a: [[1,4],[2,7]],   // cycle notation, 1-indexed
  sigma_b: [[1,3,8],[4,7,6]],
  sigma_c: [[1,5,8,6,2,7],[3,4]],
  source: "wherever this came from"
}
```

You can validate a candidate triple in the browser console (or Node) with:

```js
TessellationCore.validateTriple(
  TessellationCore.cyclesToPerm(sigma_a, d),
  TessellationCore.cyclesToPerm(sigma_b, d),
  TessellationCore.cyclesToPerm(sigma_c, d),
  d
)
// -> { identityOK: true, transitive: true }  means it's valid
```

Both conditions must be `true` — `identityOK` checks `σ_aσ_bσ_c = 1`, and
`transitive` checks that the triple generates a transitive subgroup of `S_d`
(i.e. it actually corresponds to a *connected* fundamental domain, not a
disjoint union of several smaller ones).

## Note on thesis example #15

`σ_b` and `σ_c` as printed in the thesis table don't satisfy
`σ_aσ_bσ_c = 1`, but swapping them (i.e. using
`(1,6)(2,3,10,9)(4,7,8,5)` as `σ_b` and `(1,4,5,2)(3,8)(6,9,10,7)` as `σ_c`)
does. This looks like a column transcription slip rather than a genuine
error in the underlying computation, but it's worth checking against your
original notes/Magma session before adding it back into `triples_data.js`.

## Tuning

- `EDGE_PX` in `tessellation_render.js` sets the on-screen size of the base
  triangle edge (default 64px) — raise it for a bigger, sparser pattern,
  lower it for a busier one.
- `randomPalette()` controls the color scheme: currently evenly-spaced
  random hues at 55-80% saturation, 55-67% lightness. Swap in a curated
  list of palettes here if you'd rather not go fully random.
