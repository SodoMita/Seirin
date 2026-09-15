/* ============================================================================
 * Browser-free visual proof: rasterise the ACTUAL plate geometry on the CPU,
 * sampling the shipped textures through the geometry's own UVs with the same
 * wrap modes three.js will use. If this PNG looks right, the GPU path — same
 * UVs, same textures, same wrap — looks right.
 *
 *   node tests/render-plate.mjs            -> tex/qa/geometry_render_*.png
 * ========================================================================= */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const { buildPlate } = require('../js/plates.js');

const js = readFileSync(join(HERE, '..', 'js', 'tex-data.js'), 'utf8');
const TEX = JSON.parse(js.slice(js.indexOf('= ') + 2, js.lastIndexOf(';\n')));
const M = TEX.manifest.plate;

async function part(name) {
  const rec = TEX.images[name];
  const { data, info } = await sharp(Buffer.from(rec.uri.split(',')[1], 'base64'))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { buf: data, w: info.width, h: info.height };
}
const sample = (t, u, v, wrapU, wrapV) => {
  let x = u * t.w, y = (1 - v) * t.h;                 // three.js flipY convention
  if (wrapU) x = ((x % t.w) + t.w) % t.w; else x = Math.min(t.w - 1, Math.max(0, x));
  if (wrapV) y = ((y % t.h) + t.h) % t.h; else y = Math.min(t.h - 1, Math.max(0, y));
  const i = ((y | 0) * t.w + (x | 0)) * 4;
  return [t.buf[i], t.buf[i + 1], t.buf[i + 2], t.buf[i + 3]];
};

async function render(w, h, file) {
  const p = buildPlate(w, h, M.corner, M.edgeLen);
  const corner = await part('frame_plate_corner');
  const edgeH = await part('frame_plate_edge_h');
  const edgeV = await part('frame_plate_edge_v');
  const center = TEX.manifest.center_plate.rgb;
  const out = Buffer.alloc(w * h * 4);
  const matOf = (idx) => {
    for (const g of p.groups) if (idx >= g.start && idx < g.start + g.count) return g.mat;
    return -1;
  };
  for (let t = 0; t < p.index.length; t += 3) {
    const mat = matOf(t);
    const tri = [0, 1, 2].map((k) => {
      const vi = p.index[t + k];
      return {
        x: p.positions[vi * 3] + w / 2, y: p.positions[vi * 3 + 1] + h / 2,
        u: p.uvs[vi * 2], v: p.uvs[vi * 2 + 1],
      };
    });
    const minX = Math.max(0, Math.floor(Math.min(...tri.map((v) => v.x))));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(...tri.map((v) => v.x))));
    const minY = Math.max(0, Math.floor(Math.min(...tri.map((v) => v.y))));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(...tri.map((v) => v.y))));
    const area = (tri[1].x - tri[0].x) * (tri[2].y - tri[0].y) - (tri[2].x - tri[0].x) * (tri[1].y - tri[0].y);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((tri[1].x - px) * (tri[2].y - py) - (tri[2].x - px) * (tri[1].y - py)) / area;
      const w1 = ((tri[2].x - px) * (tri[0].y - py) - (tri[0].x - px) * (tri[2].y - py)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const u = w0 * tri[0].u + w1 * tri[1].u + w2 * tri[2].u;
      const v = w0 * tri[0].v + w1 * tri[1].v + w2 * tri[2].v;
      let c;
      if (mat === 0) c = sample(corner, u, v, false, false);
      else if (mat === 1) c = sample(edgeH, u, v, true, false);
      else if (mat === 2) c = sample(edgeV, u, v, false, true);
      else c = [center[0], center[1], center[2], 255];
      // screen y is down, geometry y is up
      const i = ((h - 1 - y) * w + x) * 4;
      out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255;
    }
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(file);
  console.log('wrote', file);
}

await render(560, 320, join(HERE, '..', 'tex', 'qa', 'geometry_render_md.png'));
await render(980, 240, join(HERE, '..', 'tex', 'qa', 'geometry_render_wide.png'));
void writeFileSync;
