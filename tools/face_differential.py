#!/usr/bin/env python3
"""Face-only expression differential for a triangulated sprite.

Inputs:
  sprite      approved matted RGBA sprite (the neutral base)
  white       the white plate the sprite was triangulated from
  expr        an expression plate generated from the SAME white plate

Only pixels that the expression plate changed, inside the locked face box,
are taken from the expression plate. The sprite's own alpha is kept
everywhere, so hair edges and the outline stay exactly as triangulated.
Pixels outside the box are never touched. Report: how many changed pixels
fell outside the box (should be ~0, otherwise the generator moved something
it should not have).

usage:
  face_differential.py sprite.png white.png expr.png out.png \
      --box X0 Y0 X1 Y1 [--thresh 24] [--feather 4]
"""
import argparse
import sys

import numpy as np
from PIL import Image, ImageFilter


def load_rgb(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(np.float32)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("sprite")
    ap.add_argument("white")
    ap.add_argument("expr")
    ap.add_argument("out")
    ap.add_argument("--box", nargs=4, type=int, required=True,
                    metavar=("X0", "Y0", "X1", "Y1"))
    ap.add_argument("--thresh", type=float, default=24.0)
    ap.add_argument("--feather", type=float, default=4.0)
    args = ap.parse_args()

    S = np.asarray(Image.open(args.sprite).convert("RGBA")).astype(np.float32)
    W = load_rgb(args.white)
    E = load_rgb(args.expr)
    if not (S.shape[:2] == W.shape[:2] == E.shape[:2]):
        sys.exit("size mismatch: sprite %s white %s expr %s"
                 % (S.shape[:2], W.shape[:2], E.shape[:2]))

    h, w = S.shape[:2]
    x0, y0, x1, y1 = args.box
    box = np.zeros((h, w), dtype=bool)
    box[max(y0, 0):min(y1, h), max(x0, 0):min(x1, w)] = True

    diff = np.abs(E - W).max(axis=2)
    changed = diff > args.thresh
    outside = int((changed & ~box).sum())
    inside = changed & box
    print("changed px inside box: %d" % int(inside.sum()))
    print("changed px OUTSIDE box: %d" % outside)
    if inside.any():
        ys, xs = np.nonzero(inside)
        print("changed bbox: x %d..%d  y %d..%d" % (xs.min(), xs.max(), ys.min(), ys.max()))

    mask_img = Image.fromarray((inside * 255).astype(np.uint8))
    if args.feather > 0:
        mask_img = mask_img.filter(ImageFilter.GaussianBlur(args.feather))
    m = np.asarray(mask_img).astype(np.float32) / 255.0
    # Never write into partial alpha: hair edges keep the triangulated colour.
    m = m * (S[..., 3] >= 250)

    out = S.copy()
    out[..., :3] = S[..., :3] * (1 - m[..., None]) + E * m[..., None]
    # Deliverables are lossless WebP (never PNG). exact=True keeps the RGB of
    # fully transparent pixels, so the sprite round-trips bit-for-bit.
    Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8), "RGBA").save(
        args.out, lossless=True, exact=True, method=6)
    print("wrote %s" % args.out)


if __name__ == "__main__":
    main()
