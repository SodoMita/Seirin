#!/usr/bin/env python3
"""Chroma-key a sprite sheet off flat green #00B140 to RGBA.

DEV-ONLY tool. Not part of the shipped VN (the game has zero Python deps and
runs by double-clicking index.html). Mirrors the role of the project's
white/black triangulation matting tooling, but uses a single green plate with
a two-criterion key (green-excess + distance-to-target-green) and an edge
despill, because the image generator here cannot output alpha and is not
deterministic enough for paired plates.

Usage:  ./.venv/bin/python last-frequency/tools/mat_chroma.py [<in> <out>]...
        with no args it mats every *_green/*.png into the parent folder.
"""
import sys, os, glob
import numpy as np
from PIL import Image

# target chroma green #00B140 normalised
GR = np.array([0.0, 177/255.0, 64/255.0], dtype=np.float64)

def key(img):
    a = np.asarray(img.convert('RGB')).astype(np.float64) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    excess = g - np.maximum(r, b)                       # green-excess criterion
    dist = np.sqrt(((a - GR) ** 2).sum(-1))             # distance-to-green criterion
    # alpha ramps: 1 = opaque character, 0 = transparent green
    a_excess = np.clip((0.30 - excess) / (0.30 - 0.06), 0.0, 1.0)
    a_dist   = np.clip((dist - 0.05) / (0.30 - 0.05), 0.0, 1.0)
    alpha = np.minimum(a_excess, a_dist)
    # despill: pull green out of semi-transparent edge pixels
    spill = np.clip(excess - 0.02, 0.0, None)
    g2 = g - spill * (1.0 - alpha * 0.5)
    out = np.empty((*alpha.shape, 4), dtype=np.uint8)
    out[..., 0] = np.clip(r * 255.0, 0, 255).astype(np.uint8)
    out[..., 1] = np.clip(g2 * 255.0, 0, 255).astype(np.uint8)
    out[..., 2] = np.clip(b * 255.0, 0, 255).astype(np.uint8)
    out[..., 3] = (alpha * 255.0).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def mat(src, dst):
    key(Image.open(src)).save(dst)

if __name__ == '__main__':
    args = sys.argv[1:]
    if args:
        pairs = [(args[i], args[i+1]) for i in range(0, len(args), 2)]
    else:
        here = os.path.join(os.path.dirname(__file__), '..', 'assets', 'characters')
        green = os.path.join(here, '_green')
        pairs = [(os.path.join(green, os.path.basename(p)), os.path.join(here, os.path.basename(p)))
                 for p in sorted(glob.glob(os.path.join(green, '*.png')))]
    for s, d in pairs:
        mat(s, d)
        print('matted', os.path.basename(s), '->', os.path.basename(d))
    print('done:', len(pairs), 'sprites')
