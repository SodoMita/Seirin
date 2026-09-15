"""Seirin city-generator foundation.

Deterministic RNG, procedural noise, local metric projection, Japanese toponym
generation, contour extraction and vector/SVG helpers.

Everything in this package is *vector*. No raster imagery is produced anywhere in
the pipeline: maps are SVG, 3D is triangle geometry with per-face material
colours, and statistics are CSV/SVG. See ../docs/METHOD.md.

Units: metres, seconds, yen. Angles: radians unless a name says otherwise.
Axes: +x east, +y north, +z up. Origin (0, 0) is Seirin Bay's waterfront axis.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
from shapely.geometry import (GeometryCollection, LineString, LinearRing,
                              MultiLineString, MultiPolygon, Point, Polygon)
from shapely.ops import linemerge, polygonize, unary_union

# --------------------------------------------------------------------------
# Projection
# --------------------------------------------------------------------------

# Seirin anchors a plausible stretch of the Pacific coast of central Honshu.
# The frame is a local equirectangular projection, accurate to < 1 m over the
# 20 km of the city, and round-trips cleanly into WGS84 GeoJSON.
LAT0 = 34.8072
LON0 = 138.4419
M_PER_DEG_LAT = 110_946.0
M_PER_DEG_LON = M_PER_DEG_LAT * math.cos(math.radians(LAT0))


def to_wgs84(x: float, y: float) -> Tuple[float, float]:
    """Local metres -> (longitude, latitude) in WGS84."""
    return (LON0 + x / M_PER_DEG_LON, LAT0 + y / M_PER_DEG_LAT)


def from_wgs84(lon: float, lat: float) -> Tuple[float, float]:
    return ((lon - LON0) * M_PER_DEG_LON, (lat - LAT0) * M_PER_DEG_LAT)


def geom_to_wgs84(geom):
    from shapely.ops import transform as shp_transform
    return shp_transform(lambda x, y, z=None: to_wgs84(x, y), geom)


# --------------------------------------------------------------------------
# Deterministic RNG
# --------------------------------------------------------------------------


class Rng:
    """Seeded RNG: one reproducible stream for Python scalars, one for numpy.

    Both streams are derived from a single 64-bit seed so that a run is fully
    reproducible; `seed_for(name)` derives independent sub-streams, which keeps
    one generator's consumption from shifting another's output.
    """

    def __init__(self, seed: int = 20320401):
        self.seed = int(seed)
        self.py = random.Random(self.seed)
        self.np = np.random.default_rng(np.random.PCG64(self.seed))

    def seed_for(self, name: str) -> int:
        h = 1469598103934665603
        for ch in f"{self.seed}:{name}".encode("utf-8"):
            h ^= ch
            h = (h * 1099511628211) % (2 ** 64)
        return h

    def sub(self, name: str) -> "Rng":
        return Rng(self.seed_for(name))

    # scalar helpers -------------------------------------------------------
    def uniform(self, a: float, b: float) -> float:
        return self.py.uniform(a, b)

    def normal(self, mu: float = 0.0, sigma: float = 1.0) -> float:
        return self.py.gauss(mu, sigma)

    def lognorm(self, median: float, sigma: float) -> float:
        return float(median * math.exp(self.py.gauss(0.0, sigma)))

    def randint(self, a: int, b: int) -> int:
        return self.py.randint(a, b)

    def choice(self, seq: Sequence):
        return self.py.choice(list(seq))

    def weighted(self, items: Sequence, weights: Sequence[float]):
        return self.py.choices(list(items), weights=list(weights), k=1)[0]

    def chance(self, p: float) -> bool:
        return self.py.random() < p

    def shuffled(self, seq: Iterable) -> List:
        out = list(seq)
        self.py.shuffle(out)
        return out

    def beta(self, a: float, b: float) -> float:
        """Beta-distributed draw in [0, 1] — used for skewed size distributions."""
        return float(self.np.beta(a, b))

    def pareto(self, xm: float, alpha: float) -> float:
        return float(xm * (1.0 - self.np.random()) ** (-1.0 / alpha))

    def pick_weighted_array(self, weights: np.ndarray, count: int) -> np.ndarray:
        """Vectorised weighted sampling without replacement-free draws."""
        w = np.asarray(weights, dtype=float)
        w = np.clip(w, 0.0, None)
        total = w.sum()
        if total <= 0:
            return self.np.integers(0, len(w), size=count)
        return self.np.choice(len(w), size=count, p=w / total)


# --------------------------------------------------------------------------
# Procedural noise
# --------------------------------------------------------------------------


_U64 = np.uint64


def _hash2(ix: np.ndarray, iy: np.ndarray, seed: int) -> np.ndarray:
    """Integer hash -> float in [0, 1). Vectorised, wraparound uint64 maths."""
    with np.errstate(over="ignore"):
        h = (ix.astype(_U64) * _U64(0x9E3779B97F4A7C15)
             + iy.astype(_U64) * _U64(0xC2B2AE3D27D4EB4F)
             + _U64(seed & 0xFFFFFFFFFFFFFFFF))
        h ^= h >> _U64(29)
        h *= _U64(0xBF58476D1CE4E5B9)
        h ^= h >> _U64(32)
        h *= _U64(0x94D049BB133111EB)
        h ^= h >> _U64(31)
    return (h & _U64(0xFFFFFF)).astype(np.float64) / float(0x1000000)


def value_noise(x: np.ndarray, y: np.ndarray, seed: int = 1) -> np.ndarray:
    """Smooth 2-D value noise with quintic interpolation, range [0, 1]."""
    ix = np.floor(x).astype(np.int64)
    iy = np.floor(y).astype(np.int64)
    fx = x - ix
    fy = y - iy
    ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
    uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
    c00 = _hash2(ix, iy, seed)
    c10 = _hash2(ix + 1, iy, seed)
    c01 = _hash2(ix, iy + 1, seed)
    c11 = _hash2(ix + 1, iy + 1, seed)
    top = c00 + (c10 - c00) * ux
    bot = c01 + (c11 - c01) * ux
    return top + (bot - top) * uy


def fbm(x: np.ndarray, y: np.ndarray, octaves: int = 5, freq: float = 1.0,
        lacunarity: float = 2.0, gain: float = 0.5, seed: int = 1) -> np.ndarray:
    """Fractal Brownian motion in [0, 1]."""
    total = np.zeros(np.broadcast(x, y).shape, dtype=float)
    amp = 1.0
    norm = 0.0
    f = freq
    for o in range(octaves):
        total += amp * value_noise(x * f, y * f, seed + o * 131)
        norm += amp
        amp *= gain
        f *= lacunarity
    return total / norm


def ridged(x: np.ndarray, y: np.ndarray, octaves: int = 5, freq: float = 1.0,
           seed: int = 1) -> np.ndarray:
    """Ridged multifractal — used for mountain crests."""
    total = np.zeros(np.broadcast(x, y).shape, dtype=float)
    amp = 1.0
    norm = 0.0
    f = freq
    for o in range(octaves):
        n = value_noise(x * f, y * f, seed + o * 977)
        total += amp * (1.0 - np.abs(2.0 * n - 1.0)) ** 2
        norm += amp
        amp *= 0.5
        f *= 2.0
    return total / norm


def smoothstep(a: float, b: float, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# --------------------------------------------------------------------------
# Geometry helpers
# --------------------------------------------------------------------------


def chaikin(coords: Sequence[Sequence[float]], iterations: int = 3,
            closed: bool = False) -> List[Tuple[float, float]]:
    """Chaikin corner cutting — cheap, stable road/coast smoothing."""
    pts = [(float(p[0]), float(p[1])) for p in coords]
    if len(pts) < 3:
        return pts
    for _ in range(iterations):
        out: List[Tuple[float, float]] = []
        if not closed:
            out.append(pts[0])
        n = len(pts)
        rng = range(n) if closed else range(n - 1)
        for i in rng:
            p, q = pts[i], pts[(i + 1) % n]
            out.append((0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]))
            out.append((0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]))
        if not closed:
            out.append(pts[-1])
        pts = out
    return pts


def catmull_rom(coords: Sequence[Sequence[float]], samples_per_seg: int = 8,
                closed: bool = False) -> List[Tuple[float, float]]:
    """Centripetal Catmull-Rom through the control points."""
    p = [np.array([float(c[0]), float(c[1])]) for c in coords]
    if len(p) < 3:
        return [(float(a[0]), float(a[1])) for a in p]
    if closed:
        p = [p[-1]] + p + [p[0], p[1]]
    else:
        p = [p[0] + (p[0] - p[1])] + p + [p[-1] + (p[-1] - p[-2])]
    out: List[Tuple[float, float]] = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        t0 = 0.0
        t1 = t0 + max(1e-6, float(np.linalg.norm(p1 - p0)) ** 0.5)
        t2 = t1 + max(1e-6, float(np.linalg.norm(p2 - p1)) ** 0.5)
        t3 = t2 + max(1e-6, float(np.linalg.norm(p3 - p2)) ** 0.5)
        for s in range(samples_per_seg):
            t = t1 + (t2 - t1) * s / samples_per_seg
            a1 = (t1 - t) / (t1 - t0) * p0 + (t - t0) / (t1 - t0) * p1
            a2 = (t2 - t) / (t2 - t1) * p1 + (t - t1) / (t2 - t1) * p2
            a3 = (t3 - t) / (t3 - t2) * p2 + (t - t2) / (t3 - t2) * p3
            b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2
            b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3
            c = (t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2
            out.append((float(c[0]), float(c[1])))
    if not closed:
        out.append((float(p[-2][0]), float(p[-2][1])))
    return out


def resample(line: LineString, spacing: float) -> List[Tuple[float, float]]:
    n = max(2, int(line.length / max(spacing, 0.5)) + 1)
    return [(line.interpolate(i / (n - 1), normalized=True).x,
             line.interpolate(i / (n - 1), normalized=True).y) for i in range(n)]


def offset_polyline(coords: Sequence[Sequence[float]], dist: float) -> List[Tuple[float, float]]:
    """Constant-offset polyline (miter join, no self-intersection handling)."""
    if len(coords) < 2:
        return [(float(c[0]), float(c[1])) for c in coords]
    out = []
    n = len(coords)
    for i in range(n):
        p = np.array(coords[max(0, i - 1)], dtype=float)
        q = np.array(coords[min(n - 1, i + 1)], dtype=float)
        c = np.array(coords[i], dtype=float)
        d = q - p
        ln = float(np.linalg.norm(d))
        if ln < 1e-9:
            continue
        nx, ny = -d[1] / ln, d[0] / ln
        out.append((float(c[0] + nx * dist), float(c[1] + ny * dist)))
    return out


def obb(points: np.ndarray) -> Tuple[float, float, float, float, float]:
    """Oriented bounding box of 2-D points -> (cx, cy, width, depth, angle)."""
    if len(points) == 0:
        return (0.0, 0.0, 0.0, 0.0, 0.0)
    mean = points.mean(axis=0)
    d = points - mean
    cov = np.cov(d.T) if len(points) > 2 else np.eye(2)
    if not np.all(np.isfinite(cov)):
        cov = np.eye(2)
    w, v = np.linalg.eigh(np.atleast_2d(cov))
    axis = v[:, int(np.argmax(w))]
    ang = math.atan2(axis[1], axis[0])
    c, s = math.cos(-ang), math.sin(-ang)
    rot = np.array([[c, -s], [s, c]])
    r = d @ rot.T
    mn, mx = r.min(axis=0), r.max(axis=0)
    size = mx - mn
    # centre back to world space
    rc = (mn + mx) / 2.0
    back = np.array([[math.cos(ang), -math.sin(ang)], [math.sin(ang), math.cos(ang)]]) @ rc
    return (float(mean[0] + back[0]), float(mean[1] + back[1]),
            float(size[0]), float(size[1]), float(ang))


def rect_polygon(cx: float, cy: float, w: float, d: float,
                 angle: float = 0.0) -> Polygon:
    c, s = math.cos(angle), math.sin(angle)
    hw, hd = w / 2.0, d / 2.0
    pts = []
    for dx, dy in ((-hw, -hd), (hw, -hd), (hw, hd), (-hw, hd)):
        pts.append((cx + dx * c - dy * s, cy + dx * s + dy * c))
    return Polygon(pts)


def angle_diff(a: float, b: float) -> float:
    d = (a - b + math.pi) % (2 * math.pi) - math.pi
    return d


def bearing_norm(a: float) -> float:
    """Fold an orientation into [0, pi) — undirected streets have no heading."""
    return a % math.pi


# --------------------------------------------------------------------------
# Contours (marching squares) — used for coastline, rivers, terrain isolines
# --------------------------------------------------------------------------


def contour_segments(field: np.ndarray, level: float, x0: float, y0: float,
                     dx: float, dy: float) -> MultiLineString:
    """Marching squares isoline of `field` at `level`.

    `field[j, i]` is the value at ``(x0 + i*dx, y0 + j*dy)``. Corners of a cell
    are labelled bl, br, tr, tl; the case index is the 4-bit mask of corners
    above the level, and saddle cases (5 and 10) are resolved with the mean of
    the four corners, which is the standard and deterministic choice.
    """
    f = np.asarray(field, dtype=np.float64)
    ny, nx = f.shape
    if ny < 2 or nx < 2:
        return MultiLineString([])

    bl = f[:-1, :-1]
    br = f[:-1, 1:]
    tr = f[1:, 1:]
    tl = f[1:, :-1]

    xs = x0 + np.arange(nx) * dx
    ys = y0 + np.arange(ny) * dy
    shape = (ny - 1, nx - 1)
    X0 = np.broadcast_to(xs[None, :-1], shape)
    X1 = np.broadcast_to(xs[None, 1:], shape)
    Y0 = np.broadcast_to(ys[:-1][:, None], shape)
    Y1 = np.broadcast_to(ys[1:][:, None], shape)

    def interp(v0, v1):
        denom = v1 - v0
        with np.errstate(divide="ignore", invalid="ignore"):
            t = np.where(np.abs(denom) < 1e-12, 0.5, (level - v0) / denom)
        return np.clip(t, 0.0, 1.0)

    t_bottom = interp(bl, br)   # y = Y0, from x0 -> x1
    t_right = interp(br, tr)    # x = X1, from y0 -> y1
    t_top = interp(tl, tr)      # y = Y1, from x0 -> x1
    t_left = interp(bl, tl)     # x = X0, from y0 -> y1

    def edge_point(kind, t):
        if kind == "bottom":
            return (X0 + (X1 - X0) * t, Y0)
        if kind == "right":
            return (X1, Y0 + (Y1 - Y0) * t)
        if kind == "top":
            return (X0 + (X1 - X0) * t, Y1)
        return (X0, Y0 + (Y1 - Y0) * t)   # left

    def t_of(kind):
        return {"bottom": t_bottom, "right": t_right,
                "top": t_top, "left": t_left}[kind]

    # case index -> the two cell edges the isoline crosses
    CASES = {
        1: ("bottom", "left"),
        2: ("bottom", "right"),
        3: ("left", "right"),
        4: ("right", "top"),
        6: ("bottom", "top"),
        7: ("left", "top"),
        8: ("left", "top"),
        9: ("bottom", "top"),
        11: ("right", "top"),
        12: ("left", "right"),
        13: ("bottom", "right"),
        14: ("bottom", "left"),
    }

    above = np.stack([bl >= level, br >= level, tr >= level, tl >= level])
    idx = (above[0].astype(np.uint8) | (above[1].astype(np.uint8) << 1)
           | (above[2].astype(np.uint8) << 2) | (above[3].astype(np.uint8) << 3))
    centre_above = (bl + br + tr + tl) * 0.25 >= level

    def edge_point(kind, t):
        if kind == "bottom":
            return (X0 + (X1 - X0) * t, Y0)
        if kind == "right":
            return (X1, Y0 + (Y1 - Y0) * t)
        if kind == "top":
            return (X0 + (X1 - X0) * t, Y1)
        return (X0, Y0 + (Y1 - Y0) * t)   # left

    def t_of(kind):
        return {"bottom": t_bottom, "right": t_right,
                "top": t_top, "left": t_left}[kind]

    segs: List[Tuple[Tuple[float, float], Tuple[float, float]]] = []

    def emit(mask, e1: str, e2: str):
        j, i = np.nonzero(mask)
        if len(j) == 0:
            return
        pa, pb = edge_point(e1, t_of(e1)), edge_point(e2, t_of(e2))
        xa = np.asarray(pa[0])[j, i]
        ya = np.asarray(pa[1])[j, i]
        xb = np.asarray(pb[0])[j, i]
        yb = np.asarray(pb[1])[j, i]
        for k in range(len(j)):
            p = (float(xa[k]), float(ya[k]))
            q = (float(xb[k]), float(yb[k]))
            if p != q:
                segs.append((p, q))

    for code, (e1, e2) in CASES.items():
        emit(idx == code, e1, e2)

    # Saddles. Case 5 = bl & tr above. If the centre is above too the two
    # inside quadrants connect, so the isoline wraps the outside corners
    # (br via bottom+right, tl via top+left); otherwise each inside corner is
    # separated and gets its own crossing pair.
    m5 = idx == 5
    if m5.any():
        emit(m5 & centre_above, "bottom", "right")
        emit(m5 & centre_above, "top", "left")
        emit(m5 & ~centre_above, "bottom", "left")
        emit(m5 & ~centre_above, "top", "right")
    # Case 10 = br & tl above — mirror image.
    m10 = idx == 10
    if m10.any():
        emit(m10 & centre_above, "bottom", "left")
        emit(m10 & centre_above, "top", "right")
        emit(m10 & ~centre_above, "bottom", "right")
        emit(m10 & ~centre_above, "top", "left")

    if not segs:
        return MultiLineString([])
    return MultiLineString([LineString(s) for s in segs])


def contour_lines(field: np.ndarray, level: float, x0: float, y0: float,
                  dx: float, dy: float, merge_tol: float = 1e-6) -> List[LineString]:
    segs = contour_segments(field, level, x0, y0, dx, dy)
    if segs.is_empty:
        return []
    merged = linemerge(segs)
    if isinstance(merged, LineString):
        return [merged]
    return [g for g in merged.geoms if isinstance(g, LineString) and g.length > 0]


def contour_polygons(field: np.ndarray, level: float, x0: float, y0: float,
                     dx: float, dy: float, above: bool = True) -> List[Polygon]:
    """Filled polygons of the region `field >= level` (or `<= level`).

    `polygonize` returns a polygon for *every* closed ring, on both sides of the
    contour, so each candidate is kept only if its own interior lies on the
    requested side — tested at a representative point, which is exact for the
    ring that produced it and cheap to evaluate.
    """
    # Polygonize the raw segments rather than merged lines: linemerge can fuse
    # two rings that touch at a single point into one non-ring figure-eight, and
    # those rings — exactly the complex boundaries — would then be lost.
    segs = contour_segments(field, level, x0, y0, dx, dy)
    if segs.is_empty:
        return []
    f = np.asarray(field)
    ny, nx = f.shape
    out: List[Polygon] = []
    for poly in polygonize(segs.geoms):
        if not isinstance(poly, Polygon) or poly.area <= 0:
            continue
        try:
            rp = poly.representative_point()
        except Exception:
            continue
        if rp.is_empty:
            continue
        i = int(np.clip(round((rp.x - x0) / dx), 0, nx - 1))
        j = int(np.clip(round((rp.y - y0) / dy), 0, ny - 1))
        inside = f[j, i] >= level
        if inside == above:
            out.append(poly)
    return out


# --------------------------------------------------------------------------
# Japanese toponyms
# --------------------------------------------------------------------------

# Each element is a (kanji, romaji) pair so romanisation can never drift from
# the characters; romaji is generated, never transliterated ad hoc.
NAME_ELEMENTS = {
    "light": ("光", "Hikari"),
    "moon": ("月", "Tsuki"),
    "iron": ("鉄", "Tetsu"),
    "harbour": ("港", "Minato"),
    "sky": ("天", "Ten"),
    "god": ("神", "Kami"),
    "storehouse": ("倉", "Kura"),
    "bell": ("鈴", "Suzu"),
    "blue": ("青", "Ao"),
    "white": ("白", "Shiro"),
    "rain": ("雨", "Ame"),
    "mountain": ("山", "Yama"),
    "river": ("川", "Kawa"),
    "bridge": ("橋", "Bashi"),
    "field": ("原", "Hara"),
    "pine": ("松", "Matsu"),
    "cherry": ("桜", "Sakura"),
    "wave": ("波", "Nami"),
    "island": ("島", "Shima"),
    "stone": ("石", "Ishi"),
    "north": ("北", "Kita"),
    "south": ("南", "Minami"),
    "east": ("東", "Higashi"),
    "west": ("西", "Nishi"),
    "middle": ("中", "Naka"),
    "new": ("新", "Shin"),
    "old": ("古", "Furu"),
    "long": ("長", "Naga"),
    "high": ("高", "Taka"),
    "wide": ("広", "Hiro"),
    "wood": ("木", "Ki"),
    "bamboo": ("竹", "Take"),
    "sand": ("砂", "Suna"),
    "tide": ("潮", "Shio"),
    "cloud": ("雲", "Kumo"),
    "star": ("星", "Hoshi"),
    "sea": ("海", "Umi"),
    "valley": ("谷", "Tani"),
    "slope": ("坂", "Saka"),
    "temple": ("寺", "Tera"),
    "shrine": ("宮", "Miya"),
    "wheel": ("輪", "Wa"),
    "machine": ("機", "Ki"),
    "forge": ("鍛", "Kita"),
    "anchor": ("錨", "Ikari"),
    "crane": ("鶴", "Tsuru"),
    "reed": ("葦", "Ashi"),
    "dawn": ("曙", "Akebono"),
    "evening": ("宵", "Yoi"),
    "silver": ("銀", "Gin"),
    "copper": ("銅", "Aka"),
}

DISTRICT_KANJI_SUFFIX = {"machi": ("町", "machi"), "chome": ("丁目", "chōme")}

# Qualifier prefixes. Two elements alone give only 51 x 50 = 2550 combinations,
# which a city of 150 000 buildings exhausts long before it runs out of streets;
# a qualifier takes the space past 60 000 names per name kind. The empty entry is
# repeated so that plain two-element names stay the common case.
NAME_PREFIXES = [
    ("", ""), ("", ""), ("", ""), ("", ""), ("", ""), ("", ""),
    ("北", "Kita"), ("南", "Minami"), ("東", "Higashi"), ("西", "Nishi"),
    ("上", "Kami"), ("下", "Shimo"), ("新", "Shin"), ("本", "Hon"),
    ("大", "Ō"), ("小", "Ko"), ("中", "Naka"), ("外", "Soto"),
    ("朝", "Asa"), ("夕", "Yū"), ("春", "Haru"), ("秋", "Aki"),
    ("青", "Ao"), ("白", "Shiro"), ("紅", "Kurenai"), ("緑", "Midori"),
]


@dataclass
class NameBank:
    """Deterministic generator of unique Seirin toponyms."""

    rng: Rng
    used: set = field(default_factory=set)

    def _make(self, kind: str) -> Tuple[str, str]:
        for attempt in range(240):
            keys = self.rng.shuffled(list(NAME_ELEMENTS.keys()))
            a = NAME_ELEMENTS[keys[0]]
            b = NAME_ELEMENTS[keys[1]]
            pre = NAME_PREFIXES[self.rng.randint(0, len(NAME_PREFIXES) - 1)]
            if attempt > 120:
                # Space is exhausted for a plain pair: fall back to a three-element
                # name (which is also how real Japanese toponymy behaves), and only
                # then to the numbered form.
                pre = NAME_PREFIXES[self.rng.randint(6, len(NAME_PREFIXES) - 1)]
                b = NAME_ELEMENTS[self.rng.shuffled(list(NAME_ELEMENTS.keys()))[0]]
            stem_k, stem_r = a[0] + b[0], a[1] + b[1]
            if pre[0]:
                stem_k, stem_r = pre[0] + stem_k, pre[1] + "-" + stem_r
            if kind == "river":
                kanji, romaji = stem_k + "川", stem_r + "-gawa"
            elif kind == "bridge":
                kanji, romaji = stem_k + "橋", stem_r + "-bashi"
            elif kind == "station":
                kanji, romaji = stem_k + "駅", stem_r + "-eki"
            elif kind == "park":
                kanji, romaji = stem_k + "公園", stem_r + "-kōen"
            elif kind == "street":
                kanji, romaji = stem_k + "通り", stem_r + "-dōri"
            elif kind == "slope":
                kanji, romaji = stem_k + "坂", stem_r + "-zaka"
            elif kind == "village":
                kanji, romaji = stem_k + "村", stem_r + "-mura"
            elif kind == "port":
                kanji, romaji = stem_k + "埠頭", stem_r + "-futō"
            elif kind == "industrial":
                kanji, romaji = stem_k + "工区", stem_r + "-kōku"
            elif kind == "mall":
                kanji, romaji = stem_k + "商店街", stem_r + "-shōtengai"
            elif kind == "shrine":
                kanji, romaji = stem_k + "神社", stem_r + "-jinja"
            else:  # neighbourhood / machi
                kanji, romaji = stem_k + "町", stem_r + "-machi"
            if romaji not in self.used:
                self.used.add(romaji)
                return kanji, romaji
        # Last resort: a numbered chōme. Unique by construction, and it is
        # registered so the next call cannot return the same name.
        n = len(self.used) + 1
        kanji, romaji = f"{n}号町", f"Chōme-{n}"
        self.used.add(romaji)
        return kanji, romaji

    def river(self):
        return self._make("river")

    def bridge(self):
        return self._make("bridge")

    def station(self):
        return self._make("station")

    def park(self):
        return self._make("park")

    def street(self):
        return self._make("street")

    def slope(self):
        return self._make("slope")

    def village(self):
        return self._make("village")

    def port(self):
        return self._make("port")

    def neighbourhood(self):
        return self._make("machi")

    def mall(self):
        return self._make("mall")

    def shrine(self):
        return self._make("shrine")


def japanese_address(district_kanji: str, chome: int, block: int, banchi: int) -> str:
    return f"{district_kanji}{chome}丁目{block}番{banchi}号"


# --------------------------------------------------------------------------
# SVG writer
# --------------------------------------------------------------------------


def fmt(v: float, nd: int = 2) -> str:
    s = f"{v:.{nd}f}"
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s or "0"


def _q(v: float, nd: int) -> int:
    """Quantise a coordinate to `nd` decimals and return it as an integer."""
    return int(round(v * (10 ** nd)))


def path_d_compact(geom, precision: int = 1, close: bool = True) -> str:
    """Path data for many small polygons, delta-encoded in tenths.

    Absolute coordinates cost five or six characters each; a building footprint
    is a dozen metres across, so relative deltas cost one or two. Across a city
    of 170 000 footprints that is the difference between a 20 MB sheet and a 6 MB
    one, for the same drawing at the same precision.
    """
    scale = 10 ** precision
    parts: List[str] = []
    polys = ([geom] if geom.geom_type == "Polygon"
             else list(getattr(geom, "geoms", [])))
    for g in polys:
        if g.is_empty:
            continue
        for ring in [g.exterior] + list(g.interiors):
            pts = list(ring.coords)
            if len(pts) < 3:
                continue
            xs = [_q(x, precision) for (x, y) in pts]
            ys = [_q(y, precision) for (x, y) in pts]
            out = [f"M{fmt(xs[0] / scale, precision)},{fmt(ys[0] / scale, precision)}"]
            if len(pts) > 1 and xs[0] == xs[-1] and ys[0] == ys[-1]:
                pairs = list(zip(xs, ys))[1:-1]
            else:
                pairs = list(zip(xs, ys))[1:]
            if pairs:
                seg = ["l"]
                px, py = xs[0], ys[0]
                for (x, y) in pairs:
                    dx, dy = x - px, y - py
                    seg.append(f"{dx},{dy}")
                    px, py = x, y
                out.append(" ".join(seg))
            out.append("Z")
            parts.append(" ".join(out))
    return "".join(parts)


def path_d(geom, close: bool = True, precision: int = 2) -> str:
    """Shapely (Multi)Polygon / (Multi)LineString -> SVG path data."""
    parts: List[str] = []

    def ring(pts):
        if len(pts) < 2:
            return ""
        body = " ".join(
            ("M" if i == 0 else "L") + fmt(x, precision) + "," + fmt(y, precision)
            for i, (x, y) in enumerate(pts)
        )
        return body + ("Z" if close else "")

    def walk(g):
        if g is None or g.is_empty:
            return
        if isinstance(g, Polygon):
            parts.append(ring(list(g.exterior.coords)))
            for hole in g.interiors:
                parts.append(ring(list(hole.coords)))
        elif isinstance(g, (MultiPolygon, GeometryCollection)):
            for sub in g.geoms:
                walk(sub)
        elif isinstance(g, (LineString, LinearRing)):
            parts.append(ring(list(g.coords)))
        elif isinstance(g, MultiLineString):
            for sub in g.geoms:
                walk(sub)
        elif isinstance(g, Point):
            x, y = g.x, g.y
            parts.append(f"M{fmt(x, precision)},{fmt(y, precision)}")

    walk(geom)
    return " ".join(p for p in parts if p)


class SvgDoc:
    """Minimal, dependency-free SVG document builder (vector only)."""

    def __init__(self, width: float, height: float,
                 view: Tuple[float, float, float, float],
                 bg: str = "#0b0f14", title: str = "Seirin", font: str = "sans-serif"):
        """`view` is given as world bounds (x0, y0, x1, y1) and stored as a
        viewBox (x, y, w, h). Callers work in bounds because that is what the
        geography is expressed in; the SVG wants the box.
        """
        x0, y0, x1, y1 = view
        x0, x1 = min(x0, x1), max(x0, x1)
        y0, y1 = min(y0, y1), max(y0, y1)
        if x1 - x0 <= 0 or y1 - y0 <= 0:
            raise ValueError(f"degenerate view bounds {view}")
        self.width = width
        self.height = height
        self.bounds = (x0, y0, x1, y1)
        self.view = (x0, y0, x1 - x0, y1 - y0)
        self.bg = bg
        self.title = title
        self.font = font
        self.layers: List[Tuple[str, List[str]]] = []
        self.open_layer("base")

    def _esc(self, s: str) -> str:
        return (str(s).replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace('"', "&quot;"))

    def open_layer(self, name: str):
        self.layers.append((name, []))
        return name

    def add(self, svg: str):
        self.layers[-1][1].append(svg)

    # drawing primitives ---------------------------------------------------
    def poly(self, geom, fill: str = "none", stroke: str = "none", sw: float = 1.0,
             opacity: float = 1.0, dash: Optional[str] = None, extra: str = "",
             precision: int = 2):
        d = path_d(geom, close=not isinstance(geom, (LineString, MultiLineString)),
                   precision=precision)
        if not d:
            return
        attrs = [f'd="{d}"', f'fill="{fill}"']
        if stroke != "none":
            attrs.append(f'stroke="{stroke}" stroke-width="{fmt(sw, 3)}"')
            attrs.append('stroke-linejoin="round" stroke-linecap="round"')
        if dash:
            attrs.append(f'stroke-dasharray="{dash}"')
        if opacity < 1.0:
            attrs.append(f'opacity="{fmt(opacity, 3)}"')
        if extra:
            attrs.append(extra)
        self.add(f"<path {' '.join(attrs)}/>")

    def line(self, x1, y1, x2, y2, stroke: str, sw: float = 1.0,
             opacity: float = 1.0, dash: Optional[str] = None, cap: str = "round"):
        a = [f'x1="{fmt(x1, 3)}"', f'y1="{fmt(y1, 3)}"', f'x2="{fmt(x2, 3)}"',
             f'y2="{fmt(y2, 3)}"', f'stroke="{stroke}"', f'stroke-width="{fmt(sw, 3)}"',
             f'stroke-linecap="{cap}"']
        if dash:
            a.append(f'stroke-dasharray="{dash}"')
        if opacity < 1.0:
            a.append(f'opacity="{fmt(opacity, 3)}"')
        self.add(f"<line {' '.join(a)}/>")

    def text(self, x: float, y: float, s: str, size: float = 12.0, fill: str = "#e8eef5",
             anchor: str = "middle", weight: str = "normal", opacity: float = 1.0,
             rotate: Optional[float] = None, halo: Optional[str] = None,
             letter_spacing: float = 0.0, family: Optional[str] = None):
        style = [f'font-family="{self._esc(family or self.font)}"',
                 f'font-size="{fmt(size, 2)}"',
                 f'fill="{fill}"',
                 f'text-anchor="{anchor}"']
        if weight != "normal":
            style.append(f'font-weight="{weight}"')
        if opacity < 1.0:
            style.append(f'opacity="{fmt(opacity, 3)}"')
        if letter_spacing:
            style.append(f'letter-spacing="{fmt(letter_spacing, 2)}"')
        tr = f' transform="rotate({fmt(rotate, 2)} {fmt(x, 2)} {fmt(y, 2)})"' if rotate is not None else ""
        if halo:
            self.add(f'<text x="{fmt(x, 2)}" y="{fmt(y, 2)}" {" ".join(style)}{tr} '
                     f'stroke="{halo}" stroke-width="{fmt(size * 0.22, 2)}" '
                     f'paint-order="stroke fill">{self._esc(s)}</text>')
        else:
            self.add(f'<text x="{fmt(x, 2)}" y="{fmt(y, 2)}" {" ".join(style)}{tr}>'
                     f'{self._esc(s)}</text>')

    def rect(self, x, y, w, h, fill: str = "none", stroke: str = "none", sw: float = 1.0,
             opacity: float = 1.0, rx: float = 0.0):
        a = [f'x="{fmt(x, 2)}"', f'y="{fmt(y, 2)}"', f'width="{fmt(w, 2)}"',
             f'height="{fmt(h, 2)}"', f'fill="{fill}"']
        if rx:
            a.append(f'rx="{fmt(rx, 2)}"')
        if stroke != "none":
            a.append(f'stroke="{stroke}" stroke-width="{fmt(sw, 3)}"')
        if opacity < 1.0:
            a.append(f'opacity="{fmt(opacity, 3)}"')
        self.add(f"<rect {' '.join(a)}/>")

    def circle(self, cx, cy, r, fill="none", stroke="none", sw=1.0, opacity=1.0,
               dash: Optional[str] = None):
        a = [f'cx="{fmt(cx, 2)}"', f'cy="{fmt(cy, 2)}"', f'r="{fmt(r, 2)}"', f'fill="{fill}"']
        if stroke != "none":
            a.append(f'stroke="{stroke}" stroke-width="{fmt(sw, 3)}"')
        if dash:
            a.append(f'stroke-dasharray="{dash}"')
        if opacity < 1.0:
            a.append(f'opacity="{fmt(opacity, 3)}"')
        self.add(f"<circle {' '.join(a)}/>")

    def path_multi(self, ds: List[str], fill: str = "none", stroke: str = "none",
                   sw: float = 1.0, opacity: float = 1.0):
        """One <path> holding many subpaths.

        A city of 170 000 buildings is 170 000 polygons; written one element
        each, the atlas runs to tens of megabytes of repeated markup. Collected
        into a single path per colour they are the same drawing at a fraction of
        the file size, and SVG fills disjoint subpaths exactly as separate shapes.
        """
        if not ds:
            return
        attrs = [f'd="{"".join(ds)}"', f'fill="{fill}"']
        if stroke != "none":
            attrs.append(f'stroke="{stroke}" stroke-width="{fmt(sw, 3)}"')
        if opacity < 1.0:
            attrs.append(f'opacity="{fmt(opacity, 3)}"')
        self.add(f"<path {' '.join(attrs)}/>")

    def raw(self, svg: str):
        self.add(svg)

    # output ---------------------------------------------------------------
    def to_string(self, attribution: str = "") -> str:
        x, y, w, h = self.view
        out = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            f'<svg xmlns="http://www.w3.org/2000/svg" version="1.1" '
            f'width="{fmt(self.width, 1)}" height="{fmt(self.height, 1)}" '
            f'viewBox="{fmt(x, 2)} {fmt(y, 2)} {fmt(w, 2)} {fmt(h, 2)}" '
            f'preserveAspectRatio="xMidYMid meet">',
            f'<title>{self._esc(self.title)}</title>',
            f'<rect x="{fmt(x, 1)}" y="{fmt(y, 1)}" width="{fmt(w, 1)}" '
            f'height="{fmt(h, 1)}" fill="{self.bg}"/>',
        ]
        for name, items in self.layers:
            out.append(f'<g id="{self._esc(name)}">')
            out.extend(items)
            out.append("</g>")
        if attribution:
            out.append(f'<desc>{self._esc(attribution)}</desc>')
        out.append("</svg>")
        return "\n".join(out)

    def write(self, path, attribution: str = "") -> str:
        import os
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(self.to_string(attribution))
        return path
