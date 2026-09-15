/* ============================================================================
 * Nine-slice plate geometry — invariants (run: node --test tests/)
 * These are the guarantees the user asked for, as executable claims:
 *   no stretching  -> corners exact, edge thickness exact, UV density exact
 *   no seams       -> tiling parts wrap by RepeatWrapping at whole-tile UVs,
 *                     corners clamp and are never repeated
 * ========================================================================= */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { buildPlate, retileBoxUVs } = require('../js/plates.js');

const C = 84, E = 134;   // measured 'plate' variant metrics (see tex-data.js)
const SIZES = [[300, 200], [560, 320], [980, 480], [169, 169], [1200, 240]];

function quads(p) {
  const out = [];
  for (let i = 0; i < p.index.length; i += 6) {
    const base = p.index[i];            // quad verts are base+0..base+3
    const v = [0, 1, 2, 3].map((k) => {
      const bi = (base + k) * 3;
      const ui = (base + k) * 2;
      return { x: p.positions[bi], y: p.positions[bi + 1], u: p.uvs[ui], v: p.uvs[ui + 1] };
    });
    out.push(v);
  }
  return out;
}
function groupOf(p, indexStart) {
  for (const g of p.groups) if (indexStart >= g.start && indexStart < g.start + g.count) return g.mat;
  return -1;
}

test('corners are exactly C×C at every panel size (never stretched)', () => {
  for (const [w, h] of SIZES) {
    const q = quads(buildPlate(w, h, C, E));
    const corners = q.filter((_, i) => i < 4);
    for (const c of corners) {
      const xs = c.map((v) => v.x), ys = c.map((v) => v.y);
      assert.equal(Math.max(...xs) - Math.min(...xs), C, `corner width @${w}x${h}`);
      assert.equal(Math.max(...ys) - Math.min(...ys), C, `corner height @${w}x${h}`);
      // corner UVs span exactly 0..1 => sampled once, never tiled
      const us = c.map((v) => v.u), vs = c.map((v) => v.v);
      assert.equal(Math.max(...us) - Math.min(...us), 1);
      assert.equal(Math.max(...vs) - Math.min(...vs), 1);
    }
  }
});

test('corner UV mirroring: the sheet\'s outer ornament corner lands on the panel\'s outer corner', () => {
  const w = 600, h = 300;
  const q = quads(buildPlate(w, h, C, E));
  const outerPanel = [[-w / 2, h / 2], [w / 2, h / 2], [-w / 2, -h / 2], [w / 2, -h / 2]];
  q.slice(0, 4).forEach((quad, i) => {
    // the texture's outer ornament corner is uv (0,1); it must sit exactly on
    // the panel corner, and the diagonal inner vertex must be (1,0)
    const outer = quad.find((v) => v.u === 0 && v.v === 1);
    assert.ok(outer, 'corner ' + i + ' has a (0,1) sample');
    assert.equal(outer.x, outerPanel[i][0]);
    assert.equal(outer.y, outerPanel[i][1]);
    const inner = quad.find((v) => v.u === 1 && v.v === 0);
    assert.ok(inner, 'corner ' + i + ' has a (1,0) sample');
    assert.equal(inner.x, outerPanel[i][0] === -w / 2 ? -w / 2 + C : w / 2 - C);
    assert.equal(inner.y, outerPanel[i][1] === h / 2 ? h / 2 - C : -h / 2 + C);
  });
});

test('edge strips keep thickness C and repeat by physical length (density 1 tex/px)', () => {
  for (const [w, h] of SIZES) {
    const p = buildPlate(w, h, C, E);
    const q = quads(p);
    const [top, bottom, left, right] = q.slice(4, 8);
    const ysT = top.map((v) => v.y);
    assert.equal(Math.max(...ysT) - Math.min(...ysT), C, 'top thickness');
    const usT = top.map((v) => v.u);
    assert.ok(Math.abs((Math.max(...usT) - Math.min(...usT)) - (w - 2 * C) / E) < 1e-9, 'top repeat == innerW/tile');
    const xsL = left.map((v) => v.x);
    assert.equal(Math.max(...xsL) - Math.min(...xsL), C, 'left thickness');
    const vsL = left.map((v) => v.v);
    assert.ok(Math.abs((Math.max(...vsL) - Math.min(...vsL)) - (h - 2 * C) / E) < 1e-9, 'left repeat == innerH/tile');
    assert.ok(right.every((v) => v.x <= w / 2 && v.x >= w / 2 - C), 'right strip inside');
    assert.equal(bottom.length, 4);
  }
});

test('groups map to the four materials and cover the whole index buffer', () => {
  const p = buildPlate(600, 300, C, E);
  const total = p.groups.reduce((a, g) => a + g.count, 0);
  assert.equal(total, p.index.length);
  assert.deepEqual(p.groups.map((g) => g.mat), [0, 1, 2, 3]);
  assert.equal(groupOf(p, 0), 0);
  assert.equal(groupOf(p, 24), 1);
  assert.equal(groupOf(p, 36), 2);
  assert.equal(groupOf(p, 48), 3);
});

test('centre quad is exactly the inner rect and carries no image UV repeat', () => {
  const p = buildPlate(600, 300, C, E);
  const c = quads(p)[8];
  const xs = c.map((v) => v.x), ys = c.map((v) => v.y);
  assert.equal(Math.max(...xs) - Math.min(...xs), 600 - 2 * C);
  assert.equal(Math.max(...ys) - Math.min(...ys), 300 - 2 * C);
});

test('boxes below the nine-slice minimum throw instead of scaling corners', () => {
  assert.throws(() => buildPlate(2 * C - 1, 400, C, E));
  assert.throws(() => buildPlate(400, 2 * C - 1, C, E));
});

test('no NaN / degenerate UVs anywhere', () => {
  for (const [w, h] of SIZES) {
    const p = buildPlate(w, h, C, E);
    for (const v of p.uvs) assert.ok(Number.isFinite(v));
    for (const v of p.positions) assert.ok(Number.isFinite(v));
  }
});

test('retileBoxUVs keeps texel density constant across face proportions', () => {
  // fake BufferGeometry surface: 6 faces x 4 verts, uv 0..1
  const uvArr = [];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) uvArr.push([v % 2, v > 1 ? 1 : 0]);
  const geo = { attributes: { uv: {
    getX: (i) => uvArr[i][0], getY: (i) => uvArr[i][1],
    setXY: (i, x, y) => { uvArr[i][0] = x; uvArr[i][1] = y; },
    needsUpdate: false,
  } } };
  retileBoxUVs(geo, [40, 400, 40], 200);   // a tall strut
  const face = (f) => uvArr.slice(f * 4, f * 4 + 4);
  const span = (vs, i) => Math.max(...vs.map((v) => v[i])) - Math.min(...vs.map((v) => v[i]));
  // +x face is 40(z) x 400(y) => uv span 0.2 x 2.0 at tile 200
  assert.ok(Math.abs(span(face(0), 0) - 40 / 200) < 1e-9);
  assert.ok(Math.abs(span(face(0), 1) - 400 / 200) < 1e-9);
  // +z face is 40 x 40 => 0.2 x 0.2
  assert.ok(Math.abs(span(face(4), 0) - 0.2) < 1e-9);
});
