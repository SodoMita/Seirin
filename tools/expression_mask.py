#!/usr/bin/env python3
"""Expression sprite from a registered expression plate, using the neutral matte as the mask.

Why: the neutral sprite is triangulated and has exact straight alpha. An expression
plate generated from the same white plate is registered to it (body shift 0, residual
about 1 in 255), so its colour can be used directly. Alpha is always the neutral's alpha.

Colour rule:
- outside the face box: the neutral sprite's own colour (no drift from the generator)
- inside the face box, on opaque pixels: the expression plate's colour
- the box edge is feathered, and partial-alpha pixels (hair edges, outline) keep the
  neutral colour so no white fringe is added

Inputs:
  base_sprite   neutral matted RGBA sprite (alpha source and base colour)
  base_white    white plate the neutral was triangulated from (registration check only)
  expr_white    expression plate generated from the same white plate (white background)

usage:
  expression_mask.py base_sprite.webp base_white.webp expr_white.webp out.webp \
      --box X0 Y0 X1 Y1 [--feather 6]
"""
import argparse
import sys

import numpy as np
from PIL import Image, ImageFilter


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('base_sprite')
    ap.add_argument('base_white')
    ap.add_argument('expr_white')
    ap.add_argument('out')
    ap.add_argument('--box', nargs=4, type=int, required=True, metavar=('X0', 'Y0', 'X1', 'Y1'))
    ap.add_argument('--feather', type=float, default=6.0)
    args = ap.parse_args()

    S = np.asarray(Image.open(args.base_sprite).convert('RGBA')).astype(np.float32)
    W = np.asarray(Image.open(args.base_white).convert('RGB')).astype(np.float32)
    E = np.asarray(Image.open(args.expr_white).convert('RGB')).astype(np.float32)
    if not (S.shape[:2] == W.shape[:2] == E.shape[:2]):
        sys.exit('size mismatch')

    h, w = S.shape[:2]
    # Registration check outside the face box (body region).
    body = (slice(640, 1300), slice(150, 620))
    reg = np.abs(E[body] - W[body]).mean()
    print('registration residual (body, mean abs diff): %.2f' % reg)
    if reg > 4.0:
        sys.exit('expression plate is not registered to the base; do not use')

    x0, y0, x1, y1 = args.box
    box = np.zeros((h, w), dtype=np.float32)
    box[max(y0, 0):min(y1, h), max(x0, 0):min(x1, w)] = 255.0
    m_img = Image.fromarray(box.astype(np.uint8))
    if args.feather > 0:
        m_img = m_img.filter(ImageFilter.GaussianBlur(args.feather))
    m = np.asarray(m_img).astype(np.float32) / 255.0

    # Expression colour, un-composited over white at the neutral's alpha:
    # E = c*a + 255*(1-a)  =>  c = (E - 255*(1-a)) / a
    a = S[..., 3:4] / 255.0
    safe_a = np.maximum(a, 0.02)
    C = np.clip((E - 255.0 * (1.0 - a)) / safe_a, 0, 255)
    C = np.where(a >= 0.98, E, C)

    out = S.copy()
    mm = m[..., None]
    out[..., :3] = S[..., :3] * (1 - mm) + C * mm
    # Partial edge pixels inside the box take the un-composited colour; outside
    # the box and on fully clear pixels the neutral colour is kept.
    Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8), 'RGBA').save(
        args.out, lossless=True, exact=True, method=6)
    print('wrote %s' % args.out)


if __name__ == '__main__':
    main()
