"""Small raster-array helpers (grid maths only — no image output anywhere).

The city generator stores scalar fields (terrain height, density, accessibility)
in 2-D numpy arrays. These helpers keep the field code readable; `scipy` is used
when available purely as an accelerator, with a numpy fallback so the pipeline
never hard-depends on it.
"""

from __future__ import annotations

import numpy as np

try:  # pragma: no cover - exercised implicitly by which branch exists
    from scipy import ndimage as _nd
    HAVE_SCIPY = True
except Exception:  # pragma: no cover
    _nd = None
    HAVE_SCIPY = False


def distance_transform(mask: np.ndarray) -> np.ndarray:
    """Euclidean distance (in cells) from every cell to the nearest True cell."""
    m = np.asarray(mask, dtype=bool)
    if not m.any():
        return np.full(m.shape, np.inf)
    if HAVE_SCIPY:
        return _nd.distance_transform_edt(~m).astype(np.float32)
    inf = 1e12
    d = np.where(m, 0.0, inf)
    # chamfer sweeps (approximate Euclidean, ~2% error)
    a, b = 1.0, math_sqrt2()
    for _ in range(2):
        for j in range(d.shape[0]):
            for i in range(d.shape[1]):
                v = d[j, i]
                if j > 0:
                    v = min(v, d[j - 1, i] + a)
                    if i > 0:
                        v = min(v, d[j - 1, i - 1] + b)
                    if i + 1 < d.shape[1]:
                        v = min(v, d[j - 1, i + 1] + b)
                if i > 0:
                    v = min(v, d[j, i - 1] + a)
                d[j, i] = v
        d = np.flipud(np.fliplr(d))
    return d.astype(np.float32)


def math_sqrt2() -> float:
    return 2.0 ** 0.5


def smooth(field: np.ndarray, sigma_cells: float) -> np.ndarray:
    if sigma_cells <= 0:
        return field
    if HAVE_SCIPY:
        return _nd.gaussian_filter(field, sigma_cells, mode="nearest")
    k = max(1, int(sigma_cells * 3))
    x = np.arange(-k, k + 1)
    ker = np.exp(-(x ** 2) / (2 * sigma_cells ** 2))
    ker /= ker.sum()
    out = np.apply_along_axis(lambda v: np.convolve(v, ker, mode="same"), 1, field)
    return np.apply_along_axis(lambda v: np.convolve(v, ker, mode="same"), 0, out)


def dilate(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    m = np.asarray(mask, dtype=bool)
    if HAVE_SCIPY:
        return _nd.binary_dilation(m, iterations=iterations)
    out = m.copy()
    for _ in range(iterations):
        p = np.pad(out, 1, constant_values=False)
        out = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
               | p[:-2, :-2] | p[:-2, 2:] | p[2:, :-2] | p[2:, 2:] | out)
    return out


def erode(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    return ~dilate(~np.asarray(mask, dtype=bool), iterations)


def sample_bilinear(field: np.ndarray, x0: float, y0: float, cell: float,
                    xs: np.ndarray, ys: np.ndarray) -> np.ndarray:
    fx = np.clip((xs - x0) / cell, 0, field.shape[1] - 1.001)
    fy = np.clip((ys - y0) / cell, 0, field.shape[0] - 1.001)
    i0 = fx.astype(int)
    j0 = fy.astype(int)
    tx = fx - i0
    ty = fy - j0
    a = field[j0, i0]
    b = field[j0, i0 + 1]
    c = field[j0 + 1, i0]
    d = field[j0 + 1, i0 + 1]
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty


def normalize(field: np.ndarray) -> np.ndarray:
    f = np.asarray(field, dtype=float)
    lo, hi = float(np.min(f)), float(np.max(f))
    if hi - lo < 1e-12:
        return np.zeros_like(f)
    return (f - lo) / (hi - lo)
