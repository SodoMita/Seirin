#!/usr/bin/env python3
"""Shared-boundary vector trace of a flat-colour sprite (vtrace family).

Every boundary between two colour regions is traced ONCE on the pixel-corner
grid, fitted ONCE with cubic Beziers (fit_cubic from trace_curves.py), and then
referenced by both regions (reversed for one of them). Adjacent regions therefore
have identical control points by construction; the check at the end asserts it.

Pipeline:
  1. composite the sprite on white, crop to the figure
  2. k-means colours on figure pixels; majority smoothing; merge tiny regions
  3. trace label boundaries on the corner grid into chains between junctions
  4. smooth each chain (junctions fixed), fit cubic Beziers within ERR px
  5. build each region as evenodd loops from its shared chains
  6. fill colour = mean of the sprite pixels in the region
  7. write SVG, rasterise it, report error and the shared-point check

usage: trace_shared.py SPRITE OUT_PREFIX [K] [ERR] [MAJORITY_SIZE] [MIN_AREA] [PREC] [MASK_SMOOTH]
"""
import os
import sys
from collections import defaultdict

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trace_curves import fit_cubic, _norm  # noqa: E402

MASK_SMOOTH = 0.0  # gaussian sigma on the figure mask of flat renders (px); 0 = off
PREC = 1  # decimal places kept in the SVG; shared points are rounded once


def load(path, pad=2):
    raw = Image.open(path)
    if raw.mode in ('RGBA', 'LA') or (raw.mode == 'P' and 'transparency' in raw.info):
        im = raw.convert('RGBA')
        alpha = np.array(im.split()[3]) >= 128
    else:
        # flat render on white: figure = any pixel clearly not background white
        im = raw.convert('RGBA')
        alpha = np.array(raw.convert('RGB')).min(axis=-1) < 254
        if MASK_SMOOTH > 0:
            alpha = ndimage.gaussian_filter(alpha.astype(float), MASK_SMOOTH) > 0.5
    ys, xs = np.where(alpha)
    y0, y1 = max(0, ys.min() - pad), min(alpha.shape[0], ys.max() + 1 + pad)
    x0, x1 = max(0, xs.min() - pad), min(alpha.shape[1], xs.max() + 1 + pad)
    bg = Image.new('RGB', im.size, (255, 255, 255))
    bg.paste(im, mask=im.split()[3])
    rgb = np.array(bg)[y0:y1, x0:x1].astype(np.float64)
    return rgb, alpha[y0:y1, x0:x1]


def kmeans(pts, k, iters=30, seed=3):
    rng = np.random.default_rng(seed)
    cent = pts[rng.choice(len(pts), k, replace=False)].astype(np.float64)
    for _ in range(iters):
        d = ((pts[:, None, :] - cent[None]) ** 2).sum(-1)
        lab = d.argmin(1)
        for j in range(k):
            m = lab == j
            if m.any():
                cent[j] = pts[m].mean(0)
    return cent


def labelise(rgb, mask, k):
    px = rgb[mask]
    rng = np.random.default_rng(1)
    samp = px[rng.choice(len(px), min(len(px), 60000), replace=False)]
    cent = kmeans(samp, k)
    lab = np.full(mask.shape, -1, dtype=int)
    best = np.zeros(len(px), dtype=int)
    d = ((px[:, None, :] - cent[None]) ** 2).sum(-1)
    lab[mask] = d.argmin(1)
    return lab, cent


def majority(lab, mask, k, size=5):
    counts = np.stack([ndimage.uniform_filter((lab == j).astype(float), size=size) for j in range(k)])
    new = counts.argmax(0)
    return np.where(mask, new, -1)


def merge_small(lab, min_area, passes=3):
    for _ in range(passes):
        changed = False
        for j in np.unique(lab[lab >= 0]):
            comp, n = ndimage.label(lab == j)
            for ci in range(1, n + 1):
                m = comp == ci
                if m.sum() >= min_area:
                    continue
                ring = ndimage.binary_dilation(m) & ~m
                nb = lab[ring]
                nb = nb[(nb != j) & (nb >= 0)]
                if nb.size == 0:
                    continue
                vals, cnt = np.unique(nb, return_counts=True)
                lab[m] = vals[cnt.argmax()]
                changed = True
        if not changed:
            break
    return lab


def trace_chains(lab):
    """Boundary chains on the corner grid. Returns list of dict(pts, labs, cyc)."""
    P = np.full((lab.shape[0] + 2, lab.shape[1] + 2), -1, dtype=int)
    P[1:-1, 1:-1] = lab
    up, dn = P[:-1, :], P[1:, :]
    left, right = P[:, :-1], P[:, 1:]
    segs = []
    for r, c in np.argwhere(up != dn):
        segs.append(((r + 1, c), (r + 1, c + 1), int(up[r, c]), int(dn[r, c])))
    for r, c in np.argwhere(left != right):
        segs.append(((r, c + 1), (r + 1, c + 1), int(left[r, c]), int(right[r, c])))
    adj = defaultdict(list)
    for si, (u, v, _, _) in enumerate(segs):
        adj[u].append(si)
        adj[v].append(si)

    def other(si, n):
        u, v = segs[si][0], segs[si][1]
        return v if u == n else u

    used = [False] * len(segs)
    chains = []
    for n, sis in list(adj.items()):
        if len(sis) == 2:
            continue
        for si in sis:
            if used[si]:
                continue
            pts = [n]
            cur, s = n, si
            used[s] = True
            while True:
                nxt = other(s, cur)
                pts.append(nxt)
                if len(adj[nxt]) != 2 or nxt == n:
                    break
                s2 = [x for x in adj[nxt] if x != s][0]
                used[s2] = True
                s, cur = s2, nxt
            chains.append({'pts': pts, 'labs': (segs[si][2], segs[si][3]), 'cyc': False})
    for si in range(len(segs)):
        if used[si]:
            continue
        u = segs[si][0]
        pts = [u]
        cur, s = u, si
        used[s] = True
        while True:
            nxt = other(s, cur)
            pts.append(nxt)
            if nxt == u:
                break
            s2 = [x for x in adj[nxt] if x != s][0]
            used[s2] = True
            s, cur = s2, nxt
        chains.append({'pts': pts, 'labs': (segs[si][2], segs[si][3]), 'cyc': True})
    return chains


def smooth(P, closed, iters=8):
    P = np.array(P, float)
    if closed:
        R = P[:-1].copy()
        for _ in range(iters):
            prev, nxt = np.roll(R, 1, axis=0), np.roll(R, -1, axis=0)
            avg = 0.25 * prev + 0.5 * R + 0.25 * nxt
            R[1:] = avg[1:]
        return np.vstack([R, R[:1]])
    for _ in range(iters):
        out = P.copy()
        out[1:-1] = 0.25 * P[:-2] + 0.5 * P[1:-1] + 0.25 * P[2:]
        P = out
    return P


def fit_chain(ch, err):
    """Corner points (padded) -> fitted cubic list [p0,c1,c2,p3], in chain order."""
    raw = [(c - 1.0, r - 1.0) for r, c in ch['pts']]  # undo the 1-px padding
    P = smooth(raw, ch['cyc'])
    pts = [tuple(p) for p in P]
    if ch['cyc']:
        t1 = _norm((pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]))
        t2 = _norm((pts[-2][0] - pts[-1][0], pts[-2][1] - pts[-1][1]))
    else:
        t1 = _norm((pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]))
        t2 = _norm((pts[-2][0] - pts[-1][0], pts[-2][1] - pts[-1][1]))
    segs = []
    if len(pts) == 2:
        p0, p3 = pts
        d = ((p3[0] - p0[0]) ** 2 + (p3[1] - p0[1]) ** 2) ** 0.5 / 3.0
        segs.append([p0, (p0[0] + t1[0] * d, p0[1] + t1[1] * d), (p3[0] + t2[0] * d, p3[1] + t2[1] * d), p3])
    else:
        fit_cubic(pts, t1, t2, err, segs)
    # round once: both regions will use these exact numbers
    return [[tuple(round(v, PREC) for v in p) for p in s] for s in segs]


def region_loops(L, chains, node_chains):
    """Evenodd loops for label L: list of loops, each a list of (chain_index, reversed)."""
    cand = [ci for ci, ch in enumerate(chains) if L in ch['labs'] and not ch['cyc']]
    used = set()
    loops = []
    for ci in cand:
        if ci in used:
            continue
        start = chains[ci]['pts'][0]
        loop = [(ci, False)]
        used.add(ci)
        end = chains[ci]['pts'][-1]
        while end != start:
            opts = [cj for cj in node_chains[end] if cj not in used and L in chains[cj]['labs']]
            if not opts:
                raise RuntimeError('open loop for label %d at %s' % (L, end))
            cj = opts[0]
            rev = chains[cj]['pts'][0] != end
            loop.append((cj, rev))
            used.add(cj)
            end = chains[cj]['pts'][0] if rev else chains[cj]['pts'][-1]
        loops.append(loop)
    for ci, ch in enumerate(chains):
        if ch['cyc'] and L in ch['labs']:
            loops.append([(ci, False)])
    return loops


def _num(u, S):
    """Integer units (value * S) -> minimal SVG number text."""
    if PREC == 0:
        return str(u)
    neg = u < 0
    a = abs(u)
    ip, fp = divmod(a, S)
    txt = str(ip) if fp == 0 else ('%d.%0*d' % (ip, PREC, fp)).rstrip('0')
    if txt.startswith('0.'):
        txt = txt[1:]
    return ('-' if neg and a else '') + txt


def enc_path(segs):
    """One closed loop as 'M' + one 'c' run in relative units. Exact: uses the stored rounded values."""
    S = 10 ** PREC
    q = lambda p: (int(round(p[0] * S)), int(round(p[1] * S)))  # noqa: E731
    p0 = q(segs[0][0])
    toks = ['M' + _num(p0[0], S) + ' ' + _num(p0[1], S), 'c']
    cur = p0
    for sg in segs:
        a, b, c = q(sg[1]), q(sg[2]), q(sg[3])
        for pt in (a, b, c):
            pass
        vals = [a[0] - cur[0], a[1] - cur[1], b[0] - cur[0], b[1] - cur[1], c[0] - cur[0], c[1] - cur[1]]
        toks.append(' '.join(_num(v, S) for v in vals))
        cur = c
    body = ''
    for t in toks:
        if not body:
            body = t
        elif t == 'c' or body.endswith('c'):
            body += t
        else:
            body += ('' if t.startswith('-') else ' ') + t
    return body + 'z'


def fmt(p):
    return '%g %g' % (p[0], p[1])


def build(lab, k_colours, err, target_rgb):
    chains = trace_chains(lab)
    fitted = [fit_chain(ch, err) for ch in chains]
    node_chains = defaultdict(list)
    for ci, ch in enumerate(chains):
        if not ch['cyc']:
            node_chains[ch['pts'][0]].append(ci)
            node_chains[ch['pts'][-1]].append(ci)
    regions = {}
    usage = defaultdict(list)  # chain -> [(label, oriented control tuples)]
    for L in sorted(set(int(v) for v in np.unique(lab) if v >= 0)):
        loops = region_loops(L, chains, node_chains)
        paths = []
        for loop in loops:
            segs_all = []
            for ci, rev in loop:
                segs = fitted[ci]
                if rev:
                    segs = [[s[3], s[2], s[1], s[0]] for s in reversed(segs)]
                segs_all.extend(segs)
                usage[ci].append((L, [tuple(map(tuple, s)) for s in segs]))
            paths.append(enc_path(segs_all))
        m = lab == L
        col = target_rgb[m].mean(0)
        regions[L] = {'paths': paths, 'fill': tuple(int(round(v)) for v in col), 'loops': loops}
    return regions, chains, usage


def _rv(segs):
    """Exact reverse of a chain: reversed order, each cubic's control points reversed."""
    return [(s[3], s[2], s[1], s[0]) for s in reversed(segs)]


def check_shared(chains, usage):
    """Interior chains (two figure labels) must be used by exactly two regions,
    and one region's oriented segments must be the exact reverse of the other's."""
    bad = []
    interior = 0
    for ci, ch in enumerate(chains):
        a, b = ch['labs']
        if not (a >= 0 and b >= 0):
            continue
        interior += 1
        uses = usage[ci]
        if len(uses) != 2:
            bad.append((ci, 'uses=%d' % len(uses)))
            continue
        s1, s2 = uses[0][1], uses[1][1]
        if s2 != s1 and s2 != _rv(s1):
            bad.append((ci, 'mismatch'))
    return interior, bad


def loop_poly(loop, chains_fitted, steps=16):
    pts = []
    for ci, rev in loop:
        segs = chains_fitted[ci]
        if rev:
            segs = [[s[3], s[2], s[1], s[0]] for s in reversed(segs)]
        for s in segs:
            p0 = pts[-1] if pts else s[0]
            for t in np.linspace(0, 1, steps + 1)[1:]:
                u = 1 - t
                q = (u ** 3 * p0[0] + 3 * u * u * t * s[1][0] + 3 * u * t * t * s[2][0] + t ** 3 * s[3][0],
                     u ** 3 * p0[1] + 3 * u * u * t * s[1][1] + 3 * u * t * t * s[2][1] + t ** 3 * s[3][1])
                pts.append(q)
    return pts


def main():
    src, out_prefix = sys.argv[1], sys.argv[2]
    k = int(sys.argv[3]) if len(sys.argv) > 3 else 24
    err = float(sys.argv[4]) if len(sys.argv) > 4 else 0.6
    maj = int(sys.argv[5]) if len(sys.argv) > 5 else 5
    min_area = int(sys.argv[6]) if len(sys.argv) > 6 else 40
    global PREC
    PREC = int(sys.argv[7]) if len(sys.argv) > 7 else 1
    global MASK_SMOOTH
    MASK_SMOOTH = float(sys.argv[8]) if len(sys.argv) > 8 else 0.0
    rgb, mask = load(src)
    H, W = mask.shape
    lab, _ = labelise(rgb, mask, k)
    lab = majority(lab, mask, k, size=maj)
    lab = merge_small(lab, min_area)
    labels = sorted(set(int(v) for v in np.unique(lab) if v >= 0))
    print('regions', len(labels), 'size', W, H, flush=True)

    regions, chains, usage = build(lab, k, err, rgb)
    interior, bad = check_shared(chains, usage)
    print('chains', len(chains), 'interior', interior, 'shared-check failures', len(bad), bad[:5], flush=True)

    body = []
    fitted = [fit_chain(ch, err) for ch in chains]
    for L in labels:
        r = regions[L]
        fill = '#%02X%02X%02X' % r['fill']
        body.append('<path fill="%s" fill-rule="evenodd" d="%s"/>' % (fill, ''.join(r['paths'])))
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (W, H, W, H)
           + ''.join(body) + '</svg>')
    open(out_prefix + '.svg', 'w').write(svg)

    # rasterise with evenodd (XOR of loop masks) for the error report
    rendered = np.ones((H, W, 3)) * 255.0
    union = np.zeros((H, W), bool)
    for L in labels:
        m = np.zeros((H, W), bool)
        for loop in regions[L]['loops']:
            img = Image.new('L', (W, H), 0)
            ImageDraw.Draw(img).polygon(loop_poly(loop, fitted), fill=255)
            m ^= np.array(img) > 127
        rendered[m] = regions[L]['fill']
        union |= m
    tgt = rgb
    err_rgb = np.sqrt(((rendered - tgt) ** 2)[mask].mean())
    iou = (union & mask).sum() / (union | mask).sum()
    print('bytes', len(svg.encode()), 'rgb RMSE (figure)', round(float(err_rgb), 2), 'silhouette IoU', round(float(iou), 4), flush=True)
    sheet = Image.new('RGB', (W * 2 + 8, H), (40, 40, 40))
    sheet.paste(Image.fromarray(tgt.astype(np.uint8)), (0, 0))
    sheet.paste(Image.fromarray(rendered.astype(np.uint8)), (W + 8, 0))
    sheet.save(out_prefix + '_sheet.png')


if __name__ == '__main__':
    main()
