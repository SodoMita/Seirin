#!/usr/bin/env node
/**
 * build-textures.mjs — Seirin "Holoframe" UI texture pipeline (DEV ONLY).
 *
 * Turns the AI-generated art in design/preview/three-ui/tex/src/ into textures
 * that are safe to map: seamless tiles, nine-sliced frame parts with measured
 * (not guessed) slice metrics, and a base64 data-URI bundle so the mockup runs
 * from file:// with zero fetches and zero canvas tainting.
 *
 * Why each step exists
 * ---------------------
 * 1. seamlessize()  — AI art is never periodic. A naive RepeatWrapping shows a
 *    hard cross seam every tile. We offset the image by half a tile and cross-
 *    fade the (now centred) original seam out under a smooth mask, so the wrap
 *    edges become continuous. Continuity is then MEASURED (wrap delta before /
 *    after) and printed; the build fails if a tile is still discontinuous.
 * 2. nine-slice     — the frame plate is cut into corner / edge / centre parts.
 *    Corners are never scaled and never repeated; edges repeat only along their
 *    own axis; the centre is a flat fill. Slice margins are auto-detected from
 *    the art (flat-centre rect + column-signature scan), never eyeballed, so a
 *    regenerated plate re-slices correctly.
 * 3. constant texel density — every emitted part records `pxPerUnit`, the ratio
 *    of texture pixels to CSS/world pixels at which it must be sampled. The
 *    runtime repeats edges/centres by physical size / part size, so a 200px and
 *    a 900px panel show the same grain: nothing ever stretches.
 * 4. half-texel insets — sub-rect sampling (the frame atlas used by WebGL) is
 *    inset by half a texel so mip/linear filtering cannot bleed a neighbour.
 *
 * Outputs (committed; the mockup runs with no build step):
 *   design/preview/three-ui/js/tex-data.js   data-URI bundle + manifest
 *   design/preview/three-ui/tex/qa/*.png     seam + nine-slice QA renders
 *
 * Usage:
 *   npm i sharp --prefix design/tools/three-ui --no-save
 *   node design/tools/three-ui/build-textures.mjs
 */
import sharp from 'sharp';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');           // repo root
const OUT = join(ROOT, 'design', 'preview', 'three-ui');
const SRC = join(OUT, 'tex', 'src');
const QA = join(OUT, 'tex', 'qa');
mkdirSync(QA, { recursive: true });

/* ------------------------------------------------------------------ utils */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);

function px(buf, w, x, y) { const i = (y * w + x) * 4; return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]; }
function setPx(buf, w, x, y, rgba) { const i = (y * w + x) * 4; buf[i] = rgba[0]; buf[i + 1] = rgba[1]; buf[i + 2] = rgba[2]; buf[i + 3] = rgba[3]; }

async function loadRaw(file, w, h) {
  const { data, info } = await sharp(file)
    .flatten({ background: '#000000' })
    .ensureAlpha()
    .resize(w, h, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { buf: Uint8ClampedArray.from(data), w: info.width, h: info.height };
}

async function savePng(buf, w, h, file) {
  await sharp(Buffer.from(buf.buffer, buf.byteOffset, w * h * 4), { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 }).toFile(file);
}

async function saveWebpDataUri(buf, w, h, quality = 82) {
  const webp = await sharp(Buffer.from(buf.buffer, buf.byteOffset, w * h * 4), { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality, effort: 6, alphaQuality: 90 }).toBuffer();
  return 'data:image/webp;base64,' + webp.toString('base64');
}

/* ------------------------------------------------------------- seamlessize */
/**
 * Make an image tileable: shift by half a tile so the discontinuity lands in
 * the middle, then cross-fade the clean original back in under a mask that is
 * 1 in the middle and 0 at the wrap edges. Axes can be disabled independently
 * (an edge strip only needs to tile along one axis).
 */
function seamlessize(buf, w, h, { axisX = true, axisY = true, ramp = 0.34 } = {}) {
  const out = new Uint8ClampedArray(buf.length);
  const ox = axisX ? (w >> 1) : 0;
  const oy = axisY ? (h >> 1) : 0;
  const rx = w * ramp, ry = h * ramp;
  for (let y = 0; y < h; y++) {
    // weight: 0 at the wrap edge, 1 once `ramp` inside, mirrored on both sides
    const dy = Math.min(y, h - 1 - y);
    const my = axisY ? smooth(clamp(dy / ry, 0, 1)) : 1;
    for (let x = 0; x < w; x++) {
      const dx = Math.min(x, w - 1 - x);
      const mx = axisX ? smooth(clamp(dx / rx, 0, 1)) : 1;
      const m = mx * my;
      const sx = (x + ox) % w, sy = (y + oy) % h;
      const a = px(buf, w, sx, sy);      // shifted (continuous at wrap edges)
      const b = px(buf, w, x, y);        // original (continuous in the middle)
      setPx(out, w, x, y, [
        a[0] + (b[0] - a[0]) * m,
        a[1] + (b[1] - a[1]) * m,
        a[2] + (b[2] - a[2]) * m,
        a[3] + (b[3] - a[3]) * m,
      ]);
    }
  }
  return out;
}

/**
 * Seam quality metric. Adjacent-pixel delta in a grainy texture is naturally
 * non-zero, so an absolute threshold would fail even perfect tiles. Instead we
 * compare the delta ACROSS the wrap seam with the mean delta between adjacent
 * pixels INSIDE the tile: ratio ~1 means the seam is indistinguishable from
 * ordinary grain; ratio >> 1 means a visible line.
 */
function wrapDelta(buf, w, h) {
  const d = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  let seam = 0, base = 0, ns = 0, nb = 0;
  for (let y = 0; y < h; y++) {
    seam += d(px(buf, w, w - 1, y), px(buf, w, 0, y)); ns++;
    for (let x = 2; x < w - 1; x++) { base += d(px(buf, w, x - 1, y), px(buf, w, x, y)); nb++; }
  }
  for (let x = 0; x < w; x++) {
    seam += d(px(buf, w, x, h - 1), px(buf, w, x, 0)); ns++;
    for (let y = 2; y < h - 1; y++) { base += d(px(buf, w, x, y - 1), px(buf, w, x, y)); nb++; }
  }
  seam /= 3 * ns; base /= 3 * nb;
  return { seam: +seam.toFixed(4), base: +base.toFixed(4), ratio: +(seam / Math.max(base, 1e-6)).toFixed(3) };
}

function crop(buf, w, x0, y0, cw, ch) {
  const out = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const s = px(buf, w, x0 + x, y0 + y);
      setPx(out, cw, x, y, s);
    }
  }
  return out;
}

function rotate90cw(buf, w, h) {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    setPx(out, h, h - 1 - y, x, px(buf, w, x, y));
  }
  return out; // new dims: w'=h, h'=w
}

function tileCompose(buf, w, h, nx, ny, scale = 1) {
  const W = w * nx * scale, H = h * ny * scale;
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    setPx(out, W, x, y, px(buf, w, Math.floor(x / scale) % w, Math.floor(y / scale) % h));
  }
  return { buf: out, w: W, h: H };
}

/* ------------------------------------------------------- nine-slice metrics */
/**
 * Auto-detect the flat centre rectangle by growing a rect out of the exact
 * middle while every newly added perimeter pixel stays within tolerance of the
 * centre colour. (A row/column-variance scan does NOT work here: every row of a
 * frame sheet also crosses the border, so no row is ever "flat".)
 */
function detectFlatCenter(buf, w, h, TOL = 7) {
  const c = px(buf, w, w >> 1, h >> 1);
  const near = (x, y) => {
    const p = px(buf, w, x, y);
    return Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) + Math.abs(p[2] - c[2]) < TOL * 3;
  };
  let x0 = w >> 1, x1 = w >> 1, y0 = h >> 1, y1 = h >> 1;
  let grew = true;
  while (grew) {
    grew = false;
    if (x0 > 1) { let ok = true; for (let y = y0; y <= y1; y++) if (!near(x0 - 1, y)) { ok = false; break; } if (ok) { x0--; grew = true; } }
    if (x1 < w - 2) { let ok = true; for (let y = y0; y <= y1; y++) if (!near(x1 + 1, y)) { ok = false; break; } if (ok) { x1++; grew = true; } }
    if (y0 > 1) { let ok = true; for (let x = x0; x <= x1; x++) if (!near(x, y0 - 1)) { ok = false; break; } if (ok) { y0--; grew = true; } }
    if (y1 < h - 2) { let ok = true; for (let x = x0; x <= x1; x++) if (!near(x, y1 + 1)) { ok = false; break; } if (ok) { y1++; grew = true; } }
  }
  return { x0, y0, x1, y1 };
}

const isCyan = (p) => p[1] > 130 && p[2] > 140 && p[0] < 140 && p[1] - p[0] > 40;

/**
 * Corner size from the glowing channel line: along the top border the channel
 * runs at a constant depth; where it curves into the corner arc its y deviates.
 * The corner square must cover that arc plus the chamfer/bolt ornament, so we
 * take the last deviating column on each side (+ pad) and never go below the
 * border width.
 */
function detectCorner(buf, w, band) {
  const chanY = (x) => {
    for (let y = 0; y < band; y++) if (isCyan(px(buf, w, x, y))) return y;
    return -1;
  };
  const ys = [];
  for (let x = 0; x < w; x++) ys.push(chanY(x));
  const mid = [];
  for (let x = (w * 0.4) | 0; x < (w * 0.6) | 0; x++) if (ys[x] >= 0) mid.push(ys[x]);
  mid.sort((a, b) => a - b);
  const med = mid[mid.length >> 1] ?? band * 0.6;
  let left = 0;
  for (let x = 0; x < w / 2; x++) if (ys[x] >= 0 && Math.abs(ys[x] - med) > 3) left = x;
  let right = w - 1;
  for (let x = w - 1; x > w / 2; x--) if (ys[x] >= 0 && Math.abs(ys[x] - med) > 3) right = x;
  const PAD = Math.max(4, Math.round(w * 0.012));
  return clamp(Math.max(left + PAD + 1, w - right + PAD, band), Math.round(band), Math.round(w * 0.42));
}

/* ------------------------------------------------------------------- build */
const report = [];
const manifest = { generated: new Date().toISOString().slice(0, 10), pxPerCss: {}, images: {} };
const images = {};

async function addTile(name, file, { size = 512, axisX = true, axisY = true, quality } = {}) {
  const src = await loadRaw(file, size, size);
  const before = wrapDelta(src.buf, src.w, src.h);
  const done = seamlessize(src.buf, src.w, src.h, { axisX, axisY });
  const after = wrapDelta(done, src.w, src.h);
  report.push(`tile ${name.padEnd(12)} seam/base ${before.ratio} -> ${after.ratio} (seam ${before.seam} -> ${after.seam}) ${after.ratio < 1.35 ? 'OK' : 'FAIL'}`);
  if (after.ratio >= 1.35) throw new Error(`tile ${name} still has a visible seam (ratio ${after.ratio})`);
  // QA: 2x2 repeat at half scale so a reviewer sees the seams (or their absence)
  const qa = tileCompose(done, src.w, src.h, 2, 2, 0.5);
  await savePng(qa.buf, qa.w, qa.h, join(QA, `seam_${name}.png`));
  images[name] = { uri: await saveWebpDataUri(done, src.w, src.h, quality), w: src.w, h: src.h, seamless: true, seamBefore: before, seamAfter: after };
  return done;
}

async function main() {
  /* ---- 1. seamless surface tiles ---------------------------------------- */
  await addTile('metal', join(SRC, 'metal_tile.webp'), { size: 512 });
  await addTile('hex', join(SRC, 'hex_tile.webp'), { size: 512 });
  await addTile('hazard', join(SRC, 'hazard_tile.webp'), { size: 512 });
  await addTile('trace', join(SRC, 'trace_tile.webp'), { size: 512 });

  /* ---- 2. nine-slice the frame plate at two UI scales -------------------- */
  for (const variant of [
    { id: 'plate', scale: 0.40 },  // console / panels:  corner ~84 css px
    { id: 'chip', scale: 0.20 },   // cards, speakers:    corner ~42 css px
    { id: 'btn', scale: 0.10 },    // buttons, HUD chips: corner ~21 css px
  ]) {
    const S = Math.round(1024 * variant.scale);
    const src = await loadRaw(join(SRC, 'frame_plate.webp'), S, S);
    const flat = detectFlatCenter(src.buf, S, S);
    const border = Math.max(
      flat.x0, S - 1 - flat.x1,
      flat.y0, S - 1 - flat.y1,
    );
    const corner = clamp(detectCorner(src.buf, S, border), Math.round(border * 1.05), Math.round(S * 0.42));
    report.push(`frame ${variant.id.padEnd(6)} sheet=${S} border=${border} corner=${corner} flat=[${flat.x0},${flat.y0}..${flat.x1},${flat.y1}]`);

    // corner: taken verbatim (top-left). Never scaled, never repeated.
    const cornerBuf = crop(src.buf, S, 0, 0, corner, corner);
    // edge: a window out of the middle of the top strip, made periodic along X.
    const edgeLen = clamp(Math.round(corner * 1.6), 64, S - corner * 2);
    const ex0 = ((S - edgeLen) >> 1);
    let edgeBuf = crop(src.buf, S, ex0, 0, edgeLen, corner);
    edgeBuf = seamlessize(edgeBuf, edgeLen, corner, { axisX: true, axisY: false, ramp: 0.3 });
    const eM = wrapDelta(edgeBuf, edgeLen, corner);
    report.push(`  edge ${variant.id} seam/base ${eM.ratio} (x-axis tiling) ${eM.ratio < 1.6 ? 'OK' : 'WARN'}`);
    // vertical edge = rotation; tiles along Y instead.
    const edgeVBuf = rotate90cw(edgeBuf, edgeLen, corner); // w'=corner, h'=edgeLen

    images[`frame_${variant.id}_corner`] = { uri: await saveWebpDataUri(cornerBuf, corner, corner, 88), w: corner, h: corner };
    images[`frame_${variant.id}_edge_h`] = { uri: await saveWebpDataUri(edgeBuf, edgeLen, corner, 88), w: edgeLen, h: corner, seamlessX: true };
    images[`frame_${variant.id}_edge_v`] = { uri: await saveWebpDataUri(edgeVBuf, corner, edgeLen, 88), w: corner, h: edgeLen, seamlessY: true };
    // Parts are emitted already at CSS-pixel scale: 1 texel == 1 css px.
    manifest.pxPerCss[variant.id] = 1;
    manifest[variant.id] = { corner, edgeLen, border, sheet: S };

    // centre flat colour sampled from the middle of the sheet
    const c = px(src.buf, S, S >> 1, S >> 1);
    manifest[`center_${variant.id}`] = { rgb: [c[0], c[1], c[2]] };

    /* QA: composite the nine-slice at three sizes with ONE canonical sampler —
       the exact region logic the runtime GPU path reproduces in UV space.
       Parts are sampled 1:1 (never scaled); edges repeat by tile count. */
    const sample9 = (cornerBuf, edgeH, edgeV, eLen, C, W, H, cCol) => {
      const out = new Uint8ClampedArray(W * H * 4);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const ix = x < C ? 0 : (x >= W - C ? 2 : 1);
        const iy = y < C ? 0 : (y >= H - C ? 2 : 1);
        let p;
        if (ix === 1 && iy === 1) p = [cCol[0], cCol[1], cCol[2], 255];
        else if (iy === 0 && ix === 0) p = px(cornerBuf, C, x, y);
        else if (iy === 0 && ix === 2) p = px(cornerBuf, C, C - 1 - (x - (W - C)), y);
        else if (iy === 2 && ix === 0) p = px(cornerBuf, C, x, C - 1 - (y - (H - C)));
        else if (iy === 2 && ix === 2) p = px(cornerBuf, C, C - 1 - (x - (W - C)), C - 1 - (y - (H - C)));
        else if (iy === 0) p = px(edgeH, eLen, (x - C) % eLen, y);
        else if (iy === 2) p = px(edgeH, eLen, (x - C) % eLen, C - 1 - (y - (H - C)));
        // rotate90cw puts the plate's OUTER face at the strip's +X, so the left
        // edge reads it mirrored and the right edge reads it straight.
        else if (ix === 0) p = px(edgeV, C, C - 1 - x, (y - C) % eLen);
        else p = px(edgeV, C, x - (W - C), (y - C) % eLen);
        setPx(out, W, x, y, p);
      }
      return out;
    };
    // Sizes respect the nine-slice minimum (2*corner); below that the runtime
      // switches variant, it never scales the corners.
      const sizes = { plate: [['sm', 300, 240], ['md', 560, 320], ['lg', 980, 480]], chip: [['sm', 160, 96], ['md', 260, 140], ['lg', 420, 200]], btn: [['sm', 96, 48], ['md', 180, 56], ['lg', 300, 64]] }[variant.id];
    for (const [tag, W, H] of sizes) {
      const comp = sample9(cornerBuf, edgeBuf, edgeVBuf, edgeLen, corner, W, H, c);
      await savePng(comp, W, H, join(QA, `nineslice_${variant.id}_${tag}.png`));
    }
  }

  /* ---- 3. hologram card: crop real scene art, aspect kept ---------------- */
  const scene = join(ROOT, 'game', 'assets', 'scenes', 'tsukimachi.webp');
  if (existsSync(scene)) {
    const meta = await sharp(scene).metadata();
    const cw = 512, ch = 288;
    const buf = await sharp(scene).resize(1024, Math.round(1024 * meta.height / meta.width)).extract({
      left: Math.round((1024 - cw) / 2),
      top: Math.round((Math.round(1024 * meta.height / meta.width) - ch) / 2),
      width: cw, height: ch,
    }).ensureAlpha().raw().toBuffer();
    images.holo_card = { uri: await saveWebpDataUri(Uint8ClampedArray.from(buf), cw, ch, 80), w: cw, h: ch, note: 'cropped from game/assets/scenes/tsukimachi.webp, aspect preserved (no stretch)' };
  }

  /* ---- 4. emit the data-URI bundle --------------------------------------- */
  const js =
    '/* GENERATED by design/tools/three-ui/build-textures.mjs — do not edit.  */\n' +
    '/* Base64 data URIs: no fetch(), no CORS, no canvas tainting, works from   */\n' +
    '/* file://. Manifest carries measured slice metrics + texel density.       */\n' +
    'window.SEIRIN_TEX = ' + JSON.stringify({ manifest, images }, null, 1) + ';\n';
  writeFileSync(join(OUT, 'js', 'tex-data.js'), js);
  report.push(`wrote js/tex-data.js (${(js.length / 1024).toFixed(0)} KB)`);
  console.log(report.join('\n'));
}

main().catch((e) => { console.error(e); process.exit(1); });
