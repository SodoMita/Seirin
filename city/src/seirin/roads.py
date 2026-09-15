"""Seirin street network.

Two mechanisms, because real cities are built by two mechanisms:

1. **Arterials** are *routed*: a least-cost path over the terrain cost field
   connects the anchors of the city (station, CBD, old town, industrial belt,
   port gates, suburbs, the mountain villages and the Shelf-4 works). The cost
   field charges for slope, forest, and above all for water — crossing water is
   only possible at the bridges, which are therefore exactly where an arterial
   meets a river.
2. **Local streets** are *grown*: every district lays down a warped lattice whose
   spacing, orientation and degree of distortion follow its land use — tight and
   organic in Tsukimachi, coarse and rectangular on the reclaimed port, sparse
   and curving in the suburbs.

The two are merged, snapped and split at intersections; the resulting planar
graph gives both the blocks (faces, used for parcels and buildings) and the
routing network (used for traffic, transit and accessibility). Street
importance is measured, not assigned: `betweenness` over demand-weighted paths
decides which lanes are arterials.
"""

from __future__ import annotations

import heapq
import math
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import networkx as nx
import numpy as np
from shapely.geometry import (GeometryCollection, LineString, MultiLineString,
                             MultiPolygon, Point, Polygon, box)
from shapely.ops import linemerge, polygonize, split, unary_union
from shapely.strtree import STRtree

from .base import Rng, chaikin, obb, resample, smoothstep, value_noise
from .districts import DistrictSystem, Neighbourhood
from .raster import sample_bilinear
from .terrain import GRID, X0, X1, Y0, Y1, Terrain

# Street classes, in descending importance. `width` is the carriageway +
# footway width in metres, `speed` the design speed in km/h.
STREET_CLASSES = {
    "trunk": dict(width=26.0, speed=60.0, lanes=4, colour="#f0b46a"),
    "arterial": dict(width=19.0, speed=50.0, lanes=4, colour="#e8a35c"),
    "collector": dict(width=13.0, speed=40.0, lanes=2, colour="#d9975a"),
    "local": dict(width=7.5, speed=30.0, lanes=2, colour="#c8bda8"),
    "alley": dict(width=4.5, speed=15.0, lanes=1, colour="#b6ab97"),
    "service": dict(width=6.0, speed=20.0, lanes=1, colour="#a89d8a"),
}

# Anchors the arterial network must connect. (name, x, y, rank)
ANCHORS: List[Tuple[str, float, float, str]] = [
    ("seirin_station", 1_450.0, 1_900.0, "trunk"),
    ("hikari_core", 1_050.0, 1_150.0, "trunk"),
    ("tsukimachi_centre", -3_250.0, 3_150.0, "arterial"),
    ("tetsuba_centre", 2_700.0, 2_650.0, "arterial"),
    ("port_gate_a", 5_600.0, -600.0, "trunk"),
    ("port_gate_b", 7_000.0, -2_600.0, "arterial"),
    ("north_harbour", 3_350.0, -700.0, "arterial"),
    ("east_suburb", 8_100.0, 3_900.0, "collector"),
    ("west_suburb", -7_100.0, 2_600.0, "collector"),
    ("tenro_village", 900.0, 9_600.0, "collector"),
    ("kamikura_village", 3_900.0, 8_000.0, "collector"),
    ("shelf4_works", -2_400.0, 11_200.0, "collector"),
    ("minami_housing", 4_950.0, 700.0, "arterial"),
    ("kita_waterfront", 3_000.0, 300.0, "collector"),
]

# Ordered trunk corridors: the coastal trunk road, the port loop and the
# mountain road. Each is a list of anchor names.
TRUNK_CORRIDORS: List[List[str]] = [
    ["west_suburb", "tsukimachi_centre", "hikari_core", "seirin_station",
     "kita_waterfront", "north_harbour", "port_gate_a", "port_gate_b"],
    ["tsukimachi_centre", "tetsuba_centre", "minami_housing", "port_gate_a"],
    ["east_suburb", "kamikura_village", "seirin_station"],
    ["hikari_core", "tenro_village", "shelf4_works"],
]


@dataclass
class Street:
    id: int
    name_kanji: str
    name_romaji: str
    klass: str
    line: LineString
    width: float = 8.0
    speed: float = 30.0
    oneway: bool = False
    lanes: int = 2

    @property
    def length(self) -> float:
        return self.line.length


@dataclass
class Bridge:
    id: int
    name_kanji: str
    name_romaji: str
    line: LineString
    deck_width: float
    river: str
    kind: str = "road"           # road | rail | foot
    year_built: int = 1985
    length_m: float = 0.0


class RoadNetwork:
    """Arterials + local streets + bridges, as a routable planar graph."""

    def __init__(self, rng: Rng, terrain: Terrain, districts: DistrictSystem,
                 names):
        self.rng = rng.sub("roads")
        self.terrain = terrain
        self.districts = districts
        self.names = names
        self.streets: List[Street] = []
        self.routed: List[Street] = []          # arterials as routed (pre-split)
        self.bridges: List[Bridge] = []
        self._street_id = 0
        self.anchor_points = {n: (x, y) for n, x, y, _ in ANCHORS}
        # Water bodies a road may cross on a bridge: every river channel, the
        # canal, and the bay itself.
        self._river_ribbons = {rv.name_romaji: rv.line().buffer(
            max(3.0, float(np.max(rv.half_width)) * 1.15), cap_style=2)
            for rv in terrain.rivers}
        self._water_body = terrain.water_polygon()
        self._cost_grid()
        self._route_arterials()
        self._local_streets()
        self._merge()
        self._bridges()
        self._graph_and_centrality()

    # -- cost field --------------------------------------------------------
    def _cost_grid(self):
        """Routing cost per cell: flat land is cheap, water is forbidden."""
        ter = self.terrain
        cell = 40.0
        self.cell = cell
        xs = np.arange(X0, X1 + cell, cell)
        ys = np.arange(Y0, Y1 + cell, cell)
        self.cx, self.cy = np.meshgrid(xs, ys)
        slope = self._sample(ter.height, xs, ys)  # approximate below
        h = sample_bilinear(ter.height, X0, Y0, GRID, self.cx.ravel(), self.cy.ravel()).reshape(self.cx.shape)
        # slope from the sampled heights via finite differences on the coarse grid
        gy, gx = np.gradient(h, cell, cell)
        sl = np.hypot(gx, gy)
        cost = 1.0 + 9.0 * np.clip(sl, 0, 1.2) ** 1.4
        # Forest / mountain penalty above 320 m: roads there are expensive.
        cost += 2.6 * smoothstep(280.0, 620.0, h)
        # Built-up bonus: an existing urban fabric already has lanes.
        built = self._built_mask(xs, ys)
        cost *= (1.0 - 0.35 * built)
        # River crossing: allowed only at a crossing cost, so bridges are rare.
        water = self._water_mask(xs, ys)
        cost = np.where(water, 55.0, cost)
        # Sea is impassable.
        sea = self._sea_mask(xs, ys)
        cost = np.where(sea, 1.0e6, cost)
        self.cost = cost
        self.cost_h = h

    def _sample(self, field, xs, ys):
        return sample_bilinear(field, X0, Y0, GRID, *np.meshgrid(xs, ys))

    def _water_mask(self, xs, ys) -> np.ndarray:
        gx, gy = np.meshgrid(xs, ys)
        m = sample_bilinear(self.terrain.water.astype(np.float32), X0, Y0, GRID,
                            gx.ravel(), gy.ravel()).reshape(gx.shape)
        return m > 0.5

    def _sea_mask(self, xs, ys) -> np.ndarray:
        gx, gy = np.meshgrid(xs, ys)
        m = sample_bilinear(self.terrain.sea.astype(np.float32), X0, Y0, GRID,
                            gx.ravel(), gy.ravel()).reshape(gx.shape)
        return m > 0.5

    def _built_mask(self, xs, ys) -> np.ndarray:
        gx, gy = np.meshgrid(xs, ys)
        d = np.zeros_like(gx)
        for dspec in self.districts.districts:
            if dspec["kind"] in ("mountain_village", "construction"):
                continue
            cx, cy = dspec["centre"]
            d = np.maximum(d, np.exp(-np.hypot(gx - cx, gy - cy) / (dspec["radius"] * 1.35)))
        return np.clip(d, 0.0, 1.0)

    # -- arterial routing --------------------------------------------------
    def _route_arterials(self):
        """Least-cost paths for the trunk corridors, then a radial fill-in."""
        for corridor in TRUNK_CORRIDORS:
            for a, b in zip(corridor[:-1], corridor[1:]):
                pts = self._astar(self.anchor_points[a], self.anchor_points[b])
                if len(pts) < 2:
                    continue
                line = LineString(chaikin(pts, 2))
                klass = "trunk" if (a in ("hikari_core", "seirin_station")
                                    and b in ("kita_waterfront", "north_harbour")) else "arterial"
                self._add_street(line, klass or "arterial", self.names.street(), routed=True)
        # Secondary connections that a real city always has: station to each
        # suburb, old town to the mountain road, port to the industrial belt.
        extra = [("seirin_station", "east_suburb"), ("seirin_station", "west_suburb"),
                 ("tsukimachi_centre", "tenro_village"), ("tetsuba_centre", "east_suburb"),
                 ("north_harbour", "minami_housing"), ("kamikura_village", "shelf4_works"),
                 ("port_gate_a", "minami_housing"), ("west_suburb", "tenro_village")]
        for a, b in extra:
            pts = self._astar(self.anchor_points[a], self.anchor_points[b])
            if len(pts) < 2:
                continue
            self._add_street(LineString(chaikin(pts, 2)), "collector",
                             self.names.street(), routed=True)

    def _astar(self, start: Tuple[float, float], goal: Tuple[float, float],
               slope_weight: float = 6.0, curve_penalty: float = 0.0) -> List[Tuple[float, float]]:
        """A* over the cost grid with 16-neighbour movement.

        `slope_weight` sets how strongly a metre of climb is penalised (rail uses
        a much higher value than road); `curve_penalty` adds a cost for changing
        direction, which is what makes a rail alignment smooth.
        """
        cell = self.cell
        ni, nj = self.cx.shape[1], self.cx.shape[0]

        def to_idx(p):
            return (int(np.clip(round((p[0] - self.cx[0, 0]) / cell), 0, ni - 1)),
                    int(np.clip(round((p[1] - self.cy[0, 0]) / cell), 0, nj - 1)))

        si, sj = to_idx(start)
        gi, gj = to_idx(goal)
        nbrs = []
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                if di == 0 and dj == 0:
                    continue
                nbrs.append((di, dj, math.hypot(di, dj)))
        goal_n = (gi, gj)
        openq: List[Tuple[float, Tuple[int, int]]] = [(0.0, (si, sj))]
        gscore = {(si, sj): 0.0}
        came: Dict[Tuple[int, int], Tuple[int, int]] = {}
        seen = set()
        limit = 900_000
        steps = 0
        while openq:
            _, cur = heapq.heappop(openq)
            if cur in seen:
                continue
            seen.add(cur)
            steps += 1
            if steps > limit:
                break
            if cur == goal_n:
                path = [cur]
                while path[-1] in came:
                    path.append(came[path[-1]])
                path.reverse()
                return [(self.cx[0, 0] + i * cell, self.cy[0, 0] + j * cell) for i, j in path]
            ci, cj = cur
            hcur = self.cost_h[cj, ci]
            for di, dj, dist in nbrs:
                ii, jj = ci + di, cj + dj
                if not (0 <= ii < ni and 0 <= jj < nj):
                    continue
                if (ii, jj) in seen:
                    continue
                c = self.cost[jj, ii] * dist
                # extra penalty for steep steps (switchbacks are cheap to draw,
                # expensive to build)
                c += slope_weight * abs(self.cost_h[jj, ii] - hcur) * dist
                if curve_penalty:
                    pd = came.get(cur)
                    if pd is not None:
                        if (ii - pd[0]) != (ci - pd[0]) or (jj - pd[1]) != (cj - pd[1]):
                            c += curve_penalty * dist
                ng = gscore[cur] + c
                if ng < gscore.get((ii, jj), 1e18):
                    gscore[(ii, jj)] = ng
                    came[(ii, jj)] = cur
                    h = math.hypot(ii - gi, jj - gj)
                    heapq.heappush(openq, (ng + h * 0.9, (ii, jj)))
        return []

    # -- local streets -----------------------------------------------------
    # spacing: lattice pitch (m); warp: how far streets bend (m); drop: share of
    # lattice lines that never get built; max_slope / max_elev: ground the kind of
    # street can occupy; min_elev: ground it avoids (flood plain).
    LATTICE = {
        "commercial": dict(spacing=72.0, warp=24.0, drop=0.05, max_slope=0.30, max_elev=120.0),
        "residential_mid": dict(spacing=62.0, warp=22.0, drop=0.12, max_slope=0.34, max_elev=180.0),
        "residential_low": dict(spacing=84.0, warp=30.0, drop=0.20, max_slope=0.40, max_elev=260.0),
        "industrial": dict(spacing=205.0, warp=34.0, drop=0.26, max_slope=0.16, max_elev=60.0),
        "warehouse": dict(spacing=165.0, warp=28.0, drop=0.28, max_slope=0.14, max_elev=40.0),
        "port": dict(spacing=250.0, warp=12.0, drop=0.34, max_slope=0.10, max_elev=25.0),
        "farmland": dict(spacing=210.0, warp=40.0, drop=0.55, max_slope=0.10, max_elev=80.0),
        "village": dict(spacing=70.0, warp=38.0, drop=0.48, max_slope=0.45, max_elev=520.0),
        "forest": dict(spacing=340.0, warp=60.0, drop=0.88, max_slope=0.55, max_elev=620.0),
        "construction": dict(spacing=250.0, warp=20.0, drop=0.65, max_slope=0.25, max_elev=420.0),
    }

    def _local_streets(self):
        for nb in self.districts.neighbourhoods:
            spec = self.LATTICE.get(nb.kind)
            if spec is None:
                continue
            self._lattice(nb, spec)

    def _lattice(self, nb: Neighbourhood, spec: Dict):
        """Lay a warped, rotated lattice over one neighbourhood and keep the
        parts that fall on buildable land inside the neighbourhood."""
        spacing, warp, drop = spec["spacing"], spec["warp"], spec["drop"]
        poly = nb.polygon
        if poly.is_empty or poly.area < 60_000.0:
            return
        rng = self.rng
        # Orientation: old town follows the river, the port follows the quays,
        # the CBD follows the station axis, the rest follow the slope contour.
        ter = self.terrain
        base_angle = self._orientation(nb)
        minx, miny, maxx, maxy = poly.bounds
        c = math.cos(-base_angle)
        s = math.sin(-base_angle)
        # working in rotated frame (u,v)
        u0 = c * (minx - nb.anchor[0]) - s * (miny - nb.anchor[1])
        u1 = c * (maxx - nb.anchor[0]) - s * (maxy - nb.anchor[1])
        v0 = s * (minx - nb.anchor[0]) + c * (miny - nb.anchor[1])
        v1 = s * (maxx - nb.anchor[0]) + c * (maxy - nb.anchor[1])
        umin, umax = min(u0, u1), max(u0, u1)
        vmin, vmax = min(v0, v1), max(v0, v1)
        seed = rng.seed_for(nb.id)

        ca, sa = math.cos(base_angle), math.sin(base_angle)

        def W(u, v):
            return (nb.anchor[0] + ca * u - sa * v, nb.anchor[1] + sa * u + ca * v)

        lines: List[LineString] = []
        n_u = int((umax - umin) / spacing) + 1
        n_v = int((vmax - vmin) / spacing) + 1
        for i in range(n_u + 1):
            u = umin + i * spacing
            pts = []
            m = max(8, int((vmax - vmin) / 25.0))
            for k in range(m + 1):
                v = vmin + (vmax - vmin) * k / m
                # smooth warp: real streets bend around terrain, not randomly
                wu = warp * (value_noise(u / 900.0, v / 700.0, seed) - 0.5) * 2
                wv = warp * (value_noise(u / 700.0 + 4.0, v / 900.0 + 7.0, seed + 5) - 0.5) * 2
                pts.append(W(u + wu, v + wv))
            lines.append(LineString(pts))
        for j in range(n_v + 1):
            v = vmin + j * spacing
            pts = []
            m = max(8, int((umax - umin) / 25.0))
            for k in range(m + 1):
                u = umin + (umax - umin) * k / m
                wu = warp * (value_noise(u / 900.0 + 11.0, v / 700.0 + 3.0, seed + 9) - 0.5) * 2
                wv = warp * (value_noise(u / 700.0 + 2.0, v / 900.0 + 13.0, seed + 13) - 0.5) * 2
                pts.append(W(u + wu, v + wv))
            lines.append(LineString(pts))

        prepared = poly.buffer(6.0)
        kept = 0
        for ln in lines:
            if drop > 0 and rng.py.random() < drop:
                # thin the network: cut the line short of the neighbourhood edge
                # (a dead end), which is what low-density areas look like
                ln = LineString(list(ln.coords)[:max(2, int(len(ln.coords) * rng.uniform(0.35, 0.75)))])
            clipped = ln.intersection(prepared)
            for part in self._parts(clipped):
                if part.length < spacing * 0.45:
                    continue
                # Keep only segments whose whole run sits on plausible ground:
                # sampled every ~40 m, a street must be on land, inside the
                # kind's slope and elevation band, on a majority of samples.
                n = max(3, int(part.length / 40.0))
                ok = 0
                for k in range(n):
                    p = part.interpolate((k + 0.5) / n, normalized=True)
                    if ter.is_water(p.x, p.y):
                        continue
                    if ter.slope_at(p.x, p.y) > spec["max_slope"]:
                        continue
                    if ter.height_at(p.x, p.y) > spec["max_elev"]:
                        continue
                    ok += 1
                if ok < 0.75 * n:
                    continue
                self._add_street(part, "local" if nb.kind != "port" else "service",
                                 self.names.street())
                kept += 1
        nb.street_count = kept

    def _orientation(self, nb: Neighbourhood) -> float:
        """Street bearing for a neighbourhood, from its district's logic."""
        d = next((d for d in self.districts.districts if d["id"] == nb.district_id), None)
        kind = d["kind"] if d else "mixed"
        ideal = {
            "cbd": math.radians(12.0),           # aligned to the station axis
            "port": math.radians(-32.0),         # aligned to the quay walls
            "industrial": math.radians(-14.0),   # aligned to the canal
            "oldtown": math.radians(38.0),       # aligned to the old post road
            "waterfront": math.radians(-18.0),
            "mountain_village": math.radians(64.0),
        }.get(kind)
        # Otherwise: follow the local contour direction (perpendicular to slope).
        if ideal is None:
            hx = self.terrain.height_at(nb.anchor[0] + 40, nb.anchor[1]) - \
                self.terrain.height_at(nb.anchor[0] - 40, nb.anchor[1])
            hy = self.terrain.height_at(nb.anchor[0], nb.anchor[1] + 40) - \
                self.terrain.height_at(nb.anchor[0], nb.anchor[1] - 40)
            grad = math.atan2(hy, hx)
            ideal = grad + math.pi / 2
        return ideal + self.rng.uniform(-0.06, 0.06)

    @staticmethod
    def _parts(geom) -> List[LineString]:
        if geom.is_empty:
            return []
        if isinstance(geom, LineString):
            return [geom]
        if isinstance(geom, MultiLineString):
            return list(geom.geoms)
        if isinstance(geom, GeometryCollection):
            out = []
            for g in geom.geoms:
                out.extend(RoadNetwork._parts(g))
            return out
        return []

    def _add_street(self, line: LineString, klass: str, name: Tuple[str, str],
                    routed: bool = False) -> Street:
        spec = STREET_CLASSES[klass]
        st = Street(id=self._street_id, name_kanji=name[0], name_romaji=name[1],
                    klass=klass, line=line, width=spec["width"], speed=spec["speed"],
                    lanes=spec["lanes"], oneway=klass in ("alley", "service"))
        self.streets.append(st)
        if routed:
            self.routed.append(st)
        self._street_id += 1
        return st

    # -- merge, clean, snap ------------------------------------------------
    def _merge(self):
        """Snap the network together: union, then split every line at every
        crossing so the result is a proper planar graph with real junctions."""
        lines = [st.line for st in self.streets]
        if not lines:
            return
        merged = unary_union(lines)
        parts: List[LineString] = []
        for g in ([merged] if isinstance(merged, MultiLineString) else list(merged.geoms)
                  if isinstance(merged, MultiLineString) else [merged] if isinstance(merged, LineString)
                  else list(getattr(merged, "geoms", []))):
            parts.extend(self._parts(g))
        # split at intersections
        noded = unary_union(parts)
        from shapely import node as shp_node
        try:
            noded = shp_node(noded)
        except Exception:
            pass
        segs: List[LineString] = []
        for g in getattr(noded, "geoms", [noded]):
            segs.extend(self._parts(g))
        segs = [s for s in segs if s.length > 2.0]

        # Re-attach attributes: each new segment inherits from the highest-class
        # original street that covers it. A spatial index keeps this linear-ish
        # instead of comparing every segment against every street.
        from shapely.strtree import STRtree
        self._index = STRtree([st.line for st in self.streets])
        self._indexed = list(self.streets)
        out: List[Street] = []
        for i, seg in enumerate(segs):
            owner = self._owner_street(seg)
            out.append(Street(id=i, name_kanji=owner.name_kanji, name_romaji=owner.name_romaji,
                              klass=owner.klass, line=seg, width=owner.width,
                              speed=owner.speed, lanes=owner.lanes, oneway=owner.oneway))
        self.streets = out
        self.adjacency = self._build_adjacency()
        self._connect_fragments()

    RANK = {"trunk": 0, "arterial": 1, "collector": 2, "local": 3,
            "service": 4, "alley": 5}

    def _connect_fragments(self, max_link_m: float = 900.0, min_keep: int = 3):
        """Link isolated fragments, or drop the ones that cannot be reached.

        A real road network is connected: every lane you can drive ends up
        somewhere. The generator's three mechanisms (routed arterials, warped
        lattices, port service roads) can leave fragments that come within a few
        hundred metres of each other without touching, so the largest component is
        grown by joining each remaining fragment to it with a short access road.
        Fragments further than `max_link_m` from anything are unreachable
        hill tracks and are removed instead of being left as phantom islands.
        """
        g = self.adjacency
        if g.number_of_nodes() == 0:
            return
        comps = sorted(nx.connected_components(g), key=len, reverse=True)
        main = g.subgraph(comps[0])
        main_pos = np.array([g.nodes[n]["pos"] for n in main.nodes])
        main_ids = list(main.nodes)
        by_street = {st.id: st for st in self.streets}
        dropped: List[int] = []
        added = 0
        for comp in comps[1:]:
            pts = np.array([g.nodes[n]["pos"] for n in comp])
            # nearest pair between this fragment and the main network
            d = np.hypot(pts[:, None, 0] - main_pos[None, :, 0],
                         pts[:, None, 1] - main_pos[None, :, 1])
            if d.size == 0:
                continue
            ci, mi = np.unravel_index(np.argmin(d), d.shape)
            dist = float(d[ci, mi])
            if dist > max_link_m and len(comp) < min_keep:
                for n in comp:
                    for (u, v, data) in g.edges(n, data=True):
                        if u in comp and v in comp:
                            dropped.append(data["street"])
                continue
            if dist <= max_link_m:
                a = tuple(pts[ci])
                b = tuple(main_pos[mi])
                if dist > 2.0:
                    line = LineString([a, b])
                    self._add_street(line, "local", self.names.street())
                    added += 1
        if dropped:
            drop = set(dropped)
            self.streets = [st for st in self.streets if st.id not in drop]
        if added or dropped:
            for i, st in enumerate(self.streets):
                st.id = i
            self._index = STRtree([st.line for st in self.streets])
            self._indexed = list(self.streets)
            self.adjacency = self._build_adjacency()
        self.fragments_linked = added
        self.fragments_dropped = len(dropped)

    def _owner_street(self, seg: LineString) -> Street:
        """The highest-class original street that covers this segment."""
        mid = seg.interpolate(0.5, normalized=True)
        best, best_rank = None, 99
        for hit in self._index.query(mid.buffer(14.0), predicate="intersects"):
            st = self._indexed[int(hit)]
            r = self.RANK[st.klass]
            if r < best_rank:
                best, best_rank = st, r
        return best or self._indexed[0]

    def _build_adjacency(self, snap_tol: float = 4.0) -> nx.Graph:
        """Junction graph with endpoint snapping.

        Segments that come from different generators (routed arterials, warped
        lattices, port service roads) frequently end a metre or two apart. Without
        snapping, each such near-miss becomes a separate tiny component and the
        network looks 20 % disconnected — a measuring artefact, not a city
        property. Endpoints within `snap_tol` are merged onto their cluster
        centroid with a union-find pass.
        """
        g = nx.Graph()
        points: List[Tuple[float, float]] = []
        for st in self.streets:
            coords = list(st.line.coords)
            points.append(coords[0])          # index 2 * position in self.streets
            points.append(coords[-1])         # index 2 * position + 1
        parent = list(range(len(points)))

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        def union(i, j):
            ri, rj = find(i), find(j)
            if ri != rj:
                parent[rj] = ri

        # bucket endpoints on a grid of the snap tolerance and merge neighbours
        cell = snap_tol
        buckets: Dict[Tuple[int, int], List[int]] = {}
        for i, (x, y) in enumerate(points):
            buckets.setdefault((int(x // cell), int(y // cell)), []).append(i)
        for (bx, by), items in buckets.items():
            neigh = []
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    neigh.extend(buckets.get((bx + dx, by + dy), ()))
            for i in items:
                xi, yi = points[i]
                for j in neigh:
                    if i == j:
                        continue
                    xj, yj = points[j]
                    if (xi - xj) ** 2 + (yi - yj) ** 2 <= snap_tol ** 2:
                        union(i, j)
        roots: Dict[int, List[int]] = {}
        for i in range(len(points)):
            roots.setdefault(find(i), []).append(i)
        node_of: Dict[int, Tuple[float, float]] = {}
        for root, members in roots.items():
            xs = sum(points[m][0] for m in members) / len(members)
            ys = sum(points[m][1] for m in members) / len(members)
            key = (int(round(xs / snap_tol)), int(round(ys / snap_tol)))
            node_of[root] = (xs, ys)
            g.add_node(key, pos=(xs, ys))
        for i, st in enumerate(self.streets):
            a = find(2 * i)
            b = find(2 * i + 1)
            ka = (int(round(node_of[a][0] / snap_tol)), int(round(node_of[a][1] / snap_tol)))
            kb = (int(round(node_of[b][0] / snap_tol)), int(round(node_of[b][1] / snap_tol)))
            if ka == kb:
                continue
            g.add_edge(ka, kb, weight=st.length, street=st.id, klass=st.klass,
                       length=st.length, speed=st.speed)
        return g

    def _node_id(self, pt: Tuple[float, float], tol: float = 1.5) -> Tuple[int, int]:
        return (int(round(pt[0] / tol)), int(round(pt[1] / tol)))

    # -- bridges -----------------------------------------------------------
    def _bridges(self):
        """Every arterial crossing of a river becomes a named bridge."""
        # A bridge exists where a road crosses the *channel*: the deck is the
        # stretch of the road inside the river's water ribbon. Crossings are
        # detected on the routed arterials rather than on the split segments,
        # because splitting cuts a crossing into several short pieces.
        seen: set = set()
        ribbons = dict(self._river_ribbons)
        ribbons["the bay"] = self._water_body
        for st in self.routed:
            for rv, ribbon in ribbons.items():
                if st.line.distance(ribbon) > 8.0:
                    continue
                inter = st.line.intersection(ribbon)
                if inter.is_empty:
                    continue
                geom = [inter] if inter.geom_type == "LineString" else list(getattr(inter, "geoms", []))
                for piece in geom:
                    if piece.geom_type != "LineString":
                        continue
                    mid = piece.interpolate(0.5, normalized=True)
                    key = (round(mid.x / 60.0), round(mid.y / 60.0))
                    if key in seen:
                        continue
                    seen.add(key)
                    t0 = st.line.project(Point(piece.coords[0]))
                    t1 = st.line.project(Point(piece.coords[-1]))
                    a = st.line.interpolate(max(0.0, t0 - 12.0))
                    b = st.line.interpolate(min(st.line.length, t1 + 12.0))
                    kj, rj = self.names.bridge()
                    self.bridges.append(Bridge(
                        id=len(self.bridges), name_kanji=kj, name_romaji=rj,
                        line=LineString([a, b]), deck_width=st.width + 7.0,
                        river=rv, kind="road",
                        year_built=int(self.rng.normal(1981, 16)),
                        length_m=float(a.distance(b))))

    # -- centrality --------------------------------------------------------
    def _graph_and_centrality(self):
        """Demand-weighted betweenness decides which lanes are arterials.

        Sources and targets are demand points (neighbourhood anchors weighted by
        population + jobs, plus the port gates and the station), so a lane
        counts as important only if it actually carries the city's movement.
        """
        g = self.adjacency
        if g.number_of_nodes() == 0:
            self.centrality = {}
            return
        # Attach every demand point to its nearest graph node.
        pos = np.array([g.nodes[n]["pos"] for n in g.nodes])
        ids = list(g.nodes)
        sources = []
        for nb in self.districts.neighbourhoods:
            w = max(1.0, (nb.population + nb.jobs) / 500.0)
            sources.append((nb.anchor, w))
        for name, (x, y) in self.anchor_points.items():
            sources.append(((x, y), 6.0))
        node_of = {}
        for (p, w) in sources:
            d = np.hypot(pos[:, 0] - p[0], pos[:, 1] - p[1])
            node_of[ids[int(np.argmin(d))]] = node_of.get(ids[int(np.argmin(d))], 0.0) + w
        # Weighted betweenness with a sampled source set for speed.
        k = min(len(node_of), 60)
        try:
            cent = nx.betweenness_centrality(
                g, k=k, weight="weight", seed=int(self.rng.seed % 10_000),
                normalized=True)
        except Exception:
            cent = {n: 0.0 for n in g.nodes}
        # Map centrality back onto street segments; class follows rank.
        by_street: Dict[int, float] = {}
        for (u, v, data) in g.edges(data=True):
            w = 0.5 * (cent.get(u, 0.0) + cent.get(v, 0.0))
            by_street[data["street"]] = max(by_street.get(data["street"], 0.0), w)
        vals = np.array([by_street.get(st.id, 0.0) for st in self.streets]) if self.streets else np.array([0.0])
        if len(vals) > 1:
            q_hi = float(np.quantile(vals, 0.97))
            q_mid = float(np.quantile(vals, 0.82))
            q_low = float(np.quantile(vals, 0.45))
            for st in self.streets:
                c = by_street.get(st.id, 0.0)
                if st.klass in ("trunk", "arterial"):
                    continue
                if c >= q_hi:
                    st.klass = "arterial"
                elif c >= q_mid:
                    st.klass = "collector"
                elif c >= q_low:
                    st.klass = "local"
                else:
                    st.klass = "alley" if st.width <= 5.0 else "local"
                spec = STREET_CLASSES[st.klass]
                st.width, st.speed, st.lanes = spec["width"], spec["speed"], spec["lanes"]
        self.centrality = {st.id: by_street.get(st.id, 0.0) for st in self.streets}

    # -- derived products --------------------------------------------------
    def blocks(self) -> List[Polygon]:
        """Faces of the street graph = city blocks (parcels come later)."""
        lines = [st.line for st in self.streets if st.klass != "service"]
        if not lines:
            return []
        faces = []
        for poly in polygonize(unary_union(lines)):
            if poly.area < 220.0:
                continue
            rp = poly.representative_point()
            if self.terrain.is_water(rp.x, rp.y):
                continue
            faces.append(poly)
        return faces

    _CACHE_ATTRS = ('_index', '_indexed',)

    def __getstate__(self):
        state = self.__dict__.copy()
        for k in self._CACHE_ATTRS:
            state.pop(k, None)
        return state

    def __setstate__(self, state):
        self.__dict__.update(state)
        self._index = STRtree([st.line for st in self.streets])
        self._indexed = list(self.streets)
    def stats(self) -> Dict[str, float]:
        lengths: Dict[str, float] = {}
        for st in self.streets:
            lengths[st.klass] = lengths.get(st.klass, 0.0) + st.length
        total = sum(lengths.values())
        return {
            "segments": len(self.streets),
            "length_km": round(total / 1000.0, 1),
            "by_class_km": {k: round(v / 1000.0, 1) for k, v in sorted(lengths.items())},
            "bridges": len(self.bridges),
            "junctions": self.adjacency.number_of_nodes() if hasattr(self, "adjacency") else 0,
        }
