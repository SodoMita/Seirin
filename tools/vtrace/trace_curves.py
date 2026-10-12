#!/usr/bin/env python3
"""Flat-colour Hana -> compact SVG with real Bezier curves (no polygons).

Pipeline:
  1. k-means colours on figure pixels only (background excluded)
  2. background painted black; vtracer in CUTOUT mode (no stacking, no overlap)
  3. drop the black background shape(s)
  4. encode cubic curves in relative integer form (compact)
  5. report size and coverage vs the original silhouette (IoU)

usage: trace_curves.py SRC.png OUT.svg SCALE K SPECKLE CORNER LAYER_DIFF
"""
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw
import vtracer

BG = (0, 0, 0)


def kmeans(pts, k, iters=15, seed=3):
    rng = np.random.default_rng(seed)
    cent = pts[rng.choice(len(pts), k, replace=False)].astype(np.float64)
    for _ in range(iters):
        d = ((pts[:, None, :] - cent[None]) ** 2).sum(axis=2)
        lab = d.argmin(axis=1)
        for j in range(k):
            m = lab == j
            if m.any():
                cent[j] = pts[m].mean(axis=0)
    return cent.round().astype(np.uint8)


def prep(src, scale, k, thresh):
    im = Image.open(src).convert('RGB')
    if scale != 1.0:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    a = np.asarray(im).astype(np.int32)
    fig = a.min(axis=2) < thresh
    cent = kmeans(a[fig].astype(np.float64), k)
    out = np.zeros(a.shape, dtype=np.uint8)
    d = ((a[fig][:, None, :] - cent[None].astype(np.int32)) ** 2).sum(axis=2)
    out[fig] = cent[d.argmin(axis=1)]
    out[~fig] = BG
    return Image.fromarray(out), fig, cent


def run_vtracer(img, tmp, out, speckle, corner, layer_diff):
    img.save(tmp)
    vtracer.convert_image_to_svg_py(
        tmp, out, colormode='color', hierarchical='cutout', mode='spline',
        filter_speckle=speckle, color_precision=8, layer_difference=layer_diff,
        corner_threshold=int(corner), length_threshold=4, max_iterations=10,
        splice_threshold=45, path_precision=0)


def parse_items(d):
    """Yield subpaths as lists of commands: ('M',x,y), ('C',x1,y1,x2,y2,x,y), ('L',x,y), ('Z',)."""
    toks = re.findall(r'[MCLZmclz]|-?\d+(?:\.\d+)?', d)
    subs, cur, i, cmd = [], [], 0, None
    cx = cy = 0.0
    start = (0.0, 0.0)
    while i < len(toks):
        t = toks[i]
        if t in 'MCLZmclz':
            cmd = t
            i += 1
            if cmd in 'Zz':
                cur.append(('Z',))
                subs.append(cur)
                cur = []
            continue
        rel = cmd.islower()
        if cmd in 'Mm':
            x, y = float(toks[i]), float(toks[i + 1]); i += 2
            if rel:
                x += cx; y += cy
            cx, cy = x, y
            start = (x, y)
            cur = [('M', x, y)]
            cmd = 'L' if cmd == 'M' else 'l'
        elif cmd in 'Ll':
            x, y = float(toks[i]), float(toks[i + 1]); i += 2
            if rel:
                x += cx; y += cy
            cx, cy = x, y
            cur.append(('L', x, y))
        elif cmd in 'Cc':
            v = [float(toks[i + k]) for k in range(6)]; i += 6
            if rel:
                v = [v[0] + cx, v[1] + cy, v[2] + cx, v[3] + cy, v[4] + cx, v[5] + cy]
            cx, cy = v[4], v[5]
            cur.append(('C', *v))
        else:
            i += 1
    if cur:
        subs.append(cur)
    return subs


def _bez(ctrl, t):
    u = 1 - t
    return (u**3 * ctrl[0][0] + 3*u*u*t * ctrl[1][0] + 3*u*t*t * ctrl[2][0] + t**3 * ctrl[3][0],
            u**3 * ctrl[0][1] + 3*u*u*t * ctrl[1][1] + 3*u*t*t * ctrl[2][1] + t**3 * ctrl[3][1])


def _bez_d1(ctrl, t):
    u = 1 - t
    return tuple(3*u*u*(ctrl[1][k]-ctrl[0][k]) + 6*u*t*(ctrl[2][k]-ctrl[1][k]) + 3*t*t*(ctrl[3][k]-ctrl[2][k]) for k in (0, 1))


def _bez_d2(ctrl, t):
    u = 1 - t
    return tuple(6*u*(ctrl[2][k]-2*ctrl[1][k]+ctrl[0][k]) + 6*t*(ctrl[3][k]-2*ctrl[2][k]+ctrl[1][k]) for k in (0, 1))


def _norm(v):
    l = (v[0]**2 + v[1]**2) ** 0.5
    return (v[0]/l, v[1]/l) if l > 1e-9 else (0.0, 0.0)


def _generate(pts, u, t1, t2):
    p0, p3 = pts[0], pts[-1]
    A = []
    for ui in u:
        b1 = 3*ui*(1-ui)**2; b2 = 3*ui*ui*(1-ui)
        A.append(((t1[0]*b1, t1[1]*b1), (t2[0]*b2, t2[1]*b2)))
    C00 = C01 = C11 = X0 = X1 = 0.0
    for i, ui in enumerate(u):
        a0, a1 = A[i]
        C00 += a0[0]*a0[0] + a0[1]*a0[1]
        C01 += a0[0]*a1[0] + a0[1]*a1[1]
        C11 += a1[0]*a1[0] + a1[1]*a1[1]
        b0 = (1-ui)**3; b1 = 3*ui*(1-ui)**2; b2 = 3*ui*ui*(1-ui); b3 = ui**3
        tmp = (pts[i][0] - (p0[0]*(b0+b1) + p3[0]*(b2+b3)), pts[i][1] - (p0[1]*(b0+b1) + p3[1]*(b2+b3)))
        X0 += a0[0]*tmp[0] + a0[1]*tmp[1]
        X1 += a1[0]*tmp[0] + a1[1]*tmp[1]
    det = C00*C11 - C01*C01
    seg = ((p3[0]-p0[0])**2 + (p3[1]-p0[1])**2) ** 0.5
    if abs(det) > 1e-12:
        al = (X0*C11 - X1*C01) / det
        ar = (C00*X1 - C01*X0) / det
    else:
        al = ar = 0.0
    if al < 1e-6*seg or ar < 1e-6*seg:
        al = ar = seg / 3.0
    return [p0, (p0[0]+t1[0]*al, p0[1]+t1[1]*al), (p3[0]+t2[0]*ar, p3[1]+t2[1]*ar), p3]


def _max_err(pts, ctrl, u):
    worst, split = 0.0, len(pts)//2
    for i in range(1, len(pts)-1):
        bx, by = _bez(ctrl, u[i])
        d = (bx-pts[i][0])**2 + (by-pts[i][1])**2
        if d > worst:
            worst, split = d, i
    return worst ** 0.5, split


def _reparam(ctrl, pts, u):
    out = []
    for p, ui in zip(pts, u):
        bx, by = _bez(ctrl, ui)
        d1 = _bez_d1(ctrl, ui); d2 = _bez_d2(ctrl, ui)
        diff = (bx-p[0], by-p[1])
        num = diff[0]*d1[0] + diff[1]*d1[1]
        den = d1[0]**2 + d1[1]**2 + diff[0]*d2[0] + diff[1]*d2[1]
        out.append(ui - num/den if abs(den) > 1e-12 else ui)
    return [min(1.0, max(0.0, x)) for x in out]


def fit_cubic(pts, t1, t2, err, out):
    if len(pts) == 2:
        d = ((pts[1][0]-pts[0][0])**2 + (pts[1][1]-pts[0][1])**2) ** 0.5 / 3.0
        out.append([pts[0], (pts[0][0]+t1[0]*d, pts[0][1]+t1[1]*d), (pts[1][0]+t2[0]*d, pts[1][1]+t2[1]*d), pts[1]])
        return
    dist = [0.0]
    for i in range(1, len(pts)):
        dist.append(dist[-1] + ((pts[i][0]-pts[i-1][0])**2 + (pts[i][1]-pts[i-1][1])**2) ** 0.5)
    total = dist[-1] or 1.0
    u = [d/total for d in dist]
    ctrl = _generate(pts, u, t1, t2)
    e, split = _max_err(pts, ctrl, u)
    if e < err:
        out.append(ctrl); return
    if e < err*4:
        for _ in range(6):
            u = _reparam(ctrl, pts, u)
            ctrl = _generate(pts, u, t1, t2)
            e, split = _max_err(pts, ctrl, u)
            if e < err:
                out.append(ctrl); return
    split = min(max(split, 1), len(pts)-2)
    tc = _norm((pts[split-1][0]-pts[split+1][0], pts[split-1][1]-pts[split+1][1]))
    fit_cubic(pts[:split+1], t1, tc, err, out)
    fit_cubic(pts[split:], (-tc[0], -tc[1]), t2, err, out)


def refit(subs, err=1.5):
    """Replace each closed outline by the fewest cubic Beziers within `err` px."""
    res = []
    for sub in subs:
        if not sub or sub[0][0] != 'M':
            continue
        pts = [(sub[0][1], sub[0][2])]
        cx, cy = pts[0]
        for item in sub[1:]:
            if item[0] == 'C':
                x1, y1, x2, y2, x, y = item[1:]
                for s in range(1, 7):
                    t = s/6; u = 1-t
                    pts.append((u**3*cx + 3*u*u*t*x1 + 3*u*t*t*x2 + t**3*x,
                                u**3*cy + 3*u*u*t*y1 + 3*u*t*t*y2 + t**3*y))
                cx, cy = x, y
            elif item[0] == 'L':
                cx, cy = item[1], item[2]
                pts.append((cx, cy))
        # drop the duplicated closing point
        if len(pts) > 3 and abs(pts[-1][0]-pts[0][0]) < 1e-6 and abs(pts[-1][1]-pts[0][1]) < 1e-6:
            pts = pts[:-1]
        if len(pts) < 3:
            continue
        closed = pts + [pts[0]]
        t1 = _norm((closed[1][0]-closed[0][0], closed[1][1]-closed[0][1]))
        t2 = _norm((closed[-2][0]-closed[-1][0], closed[-2][1]-closed[-1][1]))
        segs = []
        fit_cubic(closed, t1, t2, err, segs)
        item_list = [('M', pts[0][0], pts[0][1])]
        for c in segs:
            item_list.append(('C', c[1][0], c[1][1], c[2][0], c[2][1], c[3][0], c[3][1]))
        item_list.append(('Z',))
        res.append(item_list)
    return res


def encode(subs):
    """Compact relative encoding. Integers only, minimal separators."""
    parts = []
    for sub in subs:
        if not sub or sub[0][0] != 'M':
            continue
        x0, y0 = int(round(sub[0][1])), int(round(sub[0][2]))
        seg = ['M%d %d' % (x0, y0)]
        px, py = x0, y0
        for item in sub[1:]:
            k = item[0]
            if k == 'C':
                nums = [int(round(v)) for v in item[1:]]
                rel = [nums[0] - px, nums[1] - py, nums[2] - px, nums[3] - py, nums[4] - px, nums[5] - py]
                px, py = nums[4], nums[5]
                seg.append('c' + ' '.join(str(v) for v in rel))
            elif k == 'L':
                nx, ny = int(round(item[1])), int(round(item[2]))
                seg.append('l%d %d' % (nx - px, ny - py))
                px, py = nx, ny
            elif k == 'Z':
                seg.append('z')
        parts.append(''.join(seg))
    return ''.join(parts)


def flatten(subs, steps=6):
    """Polygon approximation of the curves, for rasterising/IoU only."""
    polys = []
    for sub in subs:
        pts, cx, cy = [], 0.0, 0.0
        for item in sub:
            if item[0] == 'M':
                cx, cy = item[1], item[2]
                pts.append((cx, cy))
            elif item[0] == 'L':
                cx, cy = item[1], item[2]
                pts.append((cx, cy))
            elif item[0] == 'C':
                x1, y1, x2, y2, x, y = item[1:]
                for s in range(1, steps + 1):
                    t = s / steps; u = 1 - t
                    px = u**3 * cx + 3*u*u*t*x1 + 3*u*t*t*x2 + t**3*x
                    py = u**3 * cy + 3*u*u*t*y1 + 3*u*t*t*y2 + t**3*y
                    pts.append((px, py))
                cx, cy = x, y
        if len(pts) >= 3:
            polys.append(pts)
    return polys


def render(polys, colors, size, fill_fn=None):
    im = Image.new('RGB', size, (255, 255, 255))
    dr = ImageDraw.Draw(im)
    for poly, col in zip(polys, colors):
        dr.polygon(poly, fill=col)
    return im


def main():
    src, out = sys.argv[1], sys.argv[2]
    scale = float(sys.argv[3]); k = int(sys.argv[4]); speckle = int(sys.argv[5])
    corner = float(sys.argv[6]); layer_diff = int(sys.argv[7])
    ERR = float(sys.argv[8]) if len(sys.argv) > 8 else 1.5
    img, fig, cent = prep(src, scale, k, 252)
    tmp = os.path.join(os.path.dirname(os.path.abspath(out)), '_trace_in.png')
    run_vtracer(img, tmp, out, speckle, corner, layer_diff)
    svg = open(out).read()
    w = re.search(r'width="(\d+)"', svg).group(1)
    h = re.search(r'height="(\d+)"', svg).group(1)
    kept_d, kept_c = [], []
    for tag in re.findall(r'<path ([^>]*)/>', svg):
        attrs = dict(re.findall(r'([\w-]+)="([^"]*)"', tag))
        fill = attrs.get('fill', '#000000')
        if fill.upper() == '#000000':
            continue
        tm = re.search(r'translate\(([-\d.]+)[ ,]([-\d.]+)\)', attrs.get('transform', ''))
        tx, ty = (float(tm.group(1)), float(tm.group(2))) if tm else (0.0, 0.0)
        subs = parse_items(attrs['d'])
        moved = []
        for sub in subs:
            ns = []
            for item in sub:
                if item[0] == 'M' or item[0] == 'L':
                    ns.append((item[0], item[1] + tx, item[2] + ty))
                elif item[0] == 'C':
                    v = item[1:]
                    ns.append(('C', v[0] + tx, v[1] + ty, v[2] + tx, v[3] + ty, v[4] + tx, v[5] + ty))
                else:
                    ns.append(item)
            moved.append(ns)
        kept_d.append(encode(refit(moved, ERR)))
        kept_c.append(tuple(int(fill[i:i+2], 16) for i in (1, 3, 5)))
    body = ''.join('<path d="%s" fill="#%02X%02X%02X"/>' % (d, c[0], c[1], c[2])
                   for d, c in zip(kept_d, kept_c))
    svg_out = ('<svg xmlns="http://www.w3.org/2000/svg" width="%s" height="%s" viewBox="0 0 %s %s">%s</svg>'
               % (w, h, w, h, body))
    open(out, 'w').write(svg_out)
    os.remove(tmp)
    # coverage check: rendered figure vs original silhouette
    size = (int(w), int(h))
    polys = [flatten(parse_items(d)) for d in kept_d]
    flat_polys, flat_cols = [], []
    for plist, col in zip(polys, kept_c):
        for p in plist:
            flat_polys.append(p); flat_cols.append(col)
    rend = render(flat_polys, flat_cols, size)
    r = np.asarray(rend).astype(np.int32)
    rend_mask = (np.abs(r - 255).sum(axis=2) > 6)
    orig = np.asarray(Image.fromarray(np.zeros((1, 1))).convert('L'))  # placeholder
    fig_small = np.asarray(Image.fromarray((fig * 255).astype(np.uint8)).resize(size, Image.NEAREST)) > 0
    inter = (rend_mask & fig_small).sum()
    union = (rend_mask | fig_small).sum()
    print('bytes', len(svg_out.encode()), 'paths', len(kept_d), 'colours', len(set(kept_c)),
          'IoU %.3f' % (inter / max(union, 1)), 'size', size)


if __name__ == '__main__':
    main()
