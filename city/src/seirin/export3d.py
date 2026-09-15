"""3-D export: Seirin as geometry for Blender, Unity or any glTF viewer.

Design decisions, and why:

* **Everything is triangles.** The 3-D city is built from the same polygons the
  rest of the generator produced — building footprints, road centrelines, quay
  walls, bridge decks — extruded to their simulated heights. Nothing is
  rasterised, nothing is a sprite.
* **No normal vectors in the files.** Every face is planar and flat-shaded, so
  normals are computable from the geometry; omitting them removes a third of the
  file size and both Blender and the glTF loaders derive them on import.
* **Two output formats for two jobs.** A district `OBJ + MTL` pair is the format
  a person opens in Blender to work; a single binary `GLB` is the format that
  carries the whole 172 000-building city in ~30 MB.
* **Tiles, not one object.** The GLB is split into mesh primitives per district,
  so an importer gets manageable objects and a viewer can frustum-cull them.

Units are metres, axes are east/north/up (x/y/z). The Blender import script
rotates the scene so that north points along -Y, which is Blender's convention.
"""

from __future__ import annotations

import base64
import json
from array import array
import math
import os
import struct
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
from shapely.geometry import (LineString, MultiLineString, MultiPolygon, Point,
                              Polygon)

from .base import SvgDoc, fmt, obb
from .buildings import City
from .districts import DistrictSystem
from .landmarks import Landmarks
from .roads import RoadNetwork
from .society import Census
from .terrain import GRID, X0, X1, Y0, Y1, Terrain

# Material palette: one entry per (use, structure). Colours are the muted
# Japanese urban palette the design document specifies — no saturated neon.
MATERIALS: Dict[str, Dict] = {
    "wood_house":   dict(colour=(0.79, 0.66, 0.51), rough=0.85, metal=0.0),
    "wood_barn":    dict(colour=(0.55, 0.48, 0.37), rough=0.9, metal=0.0),
    "concrete_apart": dict(colour=(0.72, 0.70, 0.65), rough=0.8, metal=0.0),
    "steel_shop":   dict(colour=(0.66, 0.64, 0.60), rough=0.6, metal=0.2),
    "steel_office": dict(colour=(0.60, 0.65, 0.69), rough=0.35, metal=0.35),
    "glass_tower":  dict(colour=(0.52, 0.60, 0.67), rough=0.15, metal=0.55),
    "rc_hotel":     dict(colour=(0.66, 0.61, 0.56), rough=0.7, metal=0.05),
    "steel_factory": dict(colour=(0.62, 0.61, 0.58), rough=0.65, metal=0.25),
    "steel_warehouse": dict(colour=(0.56, 0.63, 0.63), rough=0.6, metal=0.3),
    "steel_plant":  dict(colour=(0.58, 0.60, 0.56), rough=0.6, metal=0.3),
    "steel_tank":   dict(colour=(0.63, 0.66, 0.64), rough=0.4, metal=0.5),
    "road_asphalt": dict(colour=(0.24, 0.24, 0.25), rough=0.95, metal=0.0),
    "road_marking": dict(colour=(0.85, 0.84, 0.78), rough=0.9, metal=0.0),
    "concrete_quay": dict(colour=(0.55, 0.55, 0.53), rough=0.9, metal=0.0),
    "steel_bridge": dict(colour=(0.42, 0.45, 0.47), rough=0.6, metal=0.4),
    "terrain_land": dict(colour=(0.31, 0.38, 0.29), rough=1.0, metal=0.0),
    "terrain_urban": dict(colour=(0.44, 0.43, 0.40), rough=1.0, metal=0.0),
    "terrain_rock": dict(colour=(0.46, 0.44, 0.41), rough=1.0, metal=0.0),
    "water":        dict(colour=(0.09, 0.20, 0.28), rough=0.08, metal=0.25),
    "park":         dict(colour=(0.30, 0.45, 0.28), rough=1.0, metal=0.0),
    "rail_ballast": dict(colour=(0.36, 0.34, 0.32), rough=1.0, metal=0.0),
    "canon_building": dict(colour=(0.58, 0.62, 0.68), rough=0.4, metal=0.25),
    "canon_hall":   dict(colour=(0.65, 0.60, 0.57), rough=0.6, metal=0.1),
    "canon_shrine": dict(colour=(0.62, 0.36, 0.26), rough=0.9, metal=0.0),
    "canon_industrial": dict(colour=(0.52, 0.54, 0.52), rough=0.7, metal=0.35),
    "metal_rust":   dict(colour=(0.46, 0.34, 0.28), rough=0.9, metal=0.15),
}


def material_for(building) -> str:
    kind = building.kind
    mat = building.material
    key = f"{mat}_{kind}"
    if key in MATERIALS:
        return key
    if kind == "tower":
        return "glass_tower"
    if mat == "wood":
        return "wood_house"
    if mat in ("rc", "src"):
        return "concrete_apart"
    return "steel_shop"


class Mesh:
    """A triangle mesh under construction.

    Positions, colours and triangles live in flat typed arrays rather than in
    lists of tuples: the full city is five million vertices and three million
    triangles, and Python tuples for those would be a gigabyte of objects
    (measured: 3.6 GB peak, versus 0.4 GB for the same geometry in arrays).
    Per-vertex colour shading is what gives the model its surface relief without
    textures, so the colours travel with the geometry rather than in a material.
    """

    __slots__ = ("name", "material", "pos", "col", "tri")

    def __init__(self, name: str = "mesh", material: str = "steel_shop"):
        self.name = name
        self.material = material
        self.pos = array("f")            # x, y, z triples
        self.col = array("B")            # r, g, b triples
        self.tri = array("i")            # vertex indices

    def add_vertex(self, x: float, y: float, z: float, colour) -> int:
        col = _pack_colour(colour)
        self.pos.append(x); self.pos.append(y); self.pos.append(z)
        self.col.append(col[0]); self.col.append(col[1]); self.col.append(col[2])
        return len(self.pos) // 3 - 1

    def add_polygon(self, idx: Sequence[int]) -> None:
        """Fan-triangulate a polygon ring.

        Building footprints are convex enough that a fan from the first vertex
        never produces a self-overlapping triangle.
        """
        if len(idx) < 3:
            return
        if len(idx) == 3:
            self.tri.append(idx[0]); self.tri.append(idx[1]); self.tri.append(idx[2])
            return
        for k in range(1, len(idx) - 1):
            self.tri.append(idx[0]); self.tri.append(idx[k]); self.tri.append(idx[k + 1])

    def add_quad(self, a, b, c, d) -> None:
        self.tri.append(a); self.tri.append(b); self.tri.append(c)
        self.tri.append(a); self.tri.append(c); self.tri.append(d)

    def add_tri(self, a, b, c) -> None:
        self.tri.append(a); self.tri.append(b); self.tri.append(c)

    @property
    def n_verts(self) -> int:
        return len(self.pos) // 3

    @property
    def n_tris(self) -> int:
        return len(self.tri) // 3

    @property
    def is_empty(self) -> bool:
        return not self.tri

    def positions(self) -> np.ndarray:
        return np.frombuffer(self.pos, dtype=np.float32).reshape(-1, 3)

    def colours(self) -> np.ndarray:
        return np.frombuffer(self.col, dtype=np.uint8).reshape(-1, 3)

    def indices(self) -> np.ndarray:
        return np.frombuffer(self.tri, dtype=np.int32).reshape(-1, 3)

    def bounds(self):
        if not self.pos:
            return (0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
        v = self.positions()
        return (float(v[:, 0].min()), float(v[:, 1].min()), float(v[:, 2].min()),
                float(v[:, 0].max()), float(v[:, 1].max()), float(v[:, 2].max()))


def _pack_colour(c) -> Tuple[int, int, int]:
    return (int(max(0, min(255, round(c[0] * 255)))),
            int(max(0, min(255, round(c[1] * 255)))),
            int(max(0, min(255, round(c[2] * 255)))))


def _shade(colour, factor: float):
    return (max(0.0, colour[0] * factor), max(0.0, colour[1] * factor),
            max(0.0, colour[2] * factor))


# --------------------------------------------------------------------------
# Primitive builders
# --------------------------------------------------------------------------


def extrude_prism(mesh: Mesh, ring: Sequence[Tuple[float, float]], base: float,
                  top: float, colour, roof: str = "flat", ridge_angle: float = 0.0,
                  eave: float = 0.0, facade: float = 1.0) -> None:
    """Extrude a closed footprint ring into a building volume, with a roof.

    The roof type is not decoration: a 2-storey timber house in Japan has a
    pitched roof with eaves, while an office block has a flat roof with a parapet.
    """
    pts = list(ring)
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    if len(pts) < 3:
        return
    if eave > 0:
        # grow the ring outwards for the eave overhang, in plan
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        grown = []
        for (x, y) in pts:
            dx, dy = x - cx, y - cy
            l = math.hypot(dx, dy) or 1.0
            grown.append((x + dx / l * eave, y + dy / l * eave))
        pts = grown
    n = len(pts)
    # `base` and `top` are elevations; the vertex rings get their own names.
    top_ring = [mesh.add_vertex(x, y, top, _shade(colour, 1.0)) for (x, y) in pts]
    base_ring = [mesh.add_vertex(x, y, base, _shade(colour, 0.68 * facade))
                 for (x, y) in pts]
    for i in range(n):
        j = (i + 1) % n
        # The facade shade is constant for the whole building: adjacent walls then
        # share their corner vertices (half the vertices of the naive version) and
        # the variety comes from building to building instead of edge to edge.
        mesh.add_quad(base_ring[i], base_ring[j], top_ring[j], top_ring[i])

    if roof in ("gabled", "hip") and n >= 4:
        # ridge along the principal axis, height proportional to the span
        box = obb(np.array(pts))
        cx, cy, w, d, ang = box
        span = min(w, d)
        rise = max(0.9, span * 0.22)
        ux, uy = math.cos(ang), math.sin(ang)
        half = (max(w, d) * 0.5) - (span * 0.0 if roof == "hip" else 0.0)
        if roof == "hip":
            half *= 0.72
        r0 = (cx - ux * half, cy - uy * half)
        r1 = (cx + ux * half, cy + uy * half)
        zr = top + rise
        ra = mesh.add_vertex(r0[0], r0[1], zr, _shade(colour, 1.06))
        rb = mesh.add_vertex(r1[0], r1[1], zr, _shade(colour, 1.06))
        # project each footprint corner onto the eaves line and connect
        for i in range(n):
            j = (i + 1) % n
            a, b = top_ring[i], top_ring[j]
            mesh.add_tri(a, b, rb)
            mesh.add_tri(a, rb, ra)
    elif roof == "shed" and n >= 4:
        z2 = top + 0.7
        # lift one half of the flat cap
        cap_lo = [mesh.add_vertex(x, y, top, _shade(colour, 0.95)) for (x, y) in pts]
        cap_hi = [mesh.add_vertex(x, y, z2, _shade(colour, 1.02)) for (x, y) in pts[:n // 2 + 1]]
        mesh.add_polygon(cap_lo)
        for i in range(len(cap_hi) - 1):
            mesh.add_quad(cap_lo[i], cap_lo[i + 1], cap_hi[i + 1], cap_hi[i])
    else:
        cap = [mesh.add_vertex(x, y, top, _shade(colour, 1.04)) for (x, y) in pts]
        mesh.add_polygon(cap)
        if top - base > 8.0:
            # parapet band on taller flat roofs
            par = [mesh.add_vertex(x, y, top + 0.55, _shade(colour, 0.9)) for (x, y) in pts]
            mesh.add_polygon(par)


def extrude_ring_band(mesh: Mesh, ring: Sequence[Tuple[float, float]],
                      z0: float, z1: float, colour,
                      inward: bool = False) -> None:
    pts = list(ring)
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        a = mesh.add_vertex(pts[i][0], pts[i][1], z0, _shade(colour, 0.8))
        b = mesh.add_vertex(pts[j][0], pts[j][1], z0, _shade(colour, 0.8))
        c = mesh.add_vertex(pts[j][0], pts[j][1], z1, _shade(colour, 1.0))
        d = mesh.add_vertex(pts[i][0], pts[i][1], z1, _shade(colour, 1.0))
        if inward:
            mesh.add_quad(d, c, b, a)
        else:
            mesh.add_quad(a, b, c, d)


def add_flat_polygon(mesh: Mesh, ring: Sequence[Tuple[float, float]], z: float,
                     colour, up: bool = True) -> None:
    pts = list(ring)
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    idx = [mesh.add_vertex(x, y, z, colour) for (x, y) in pts]
    if up:
        mesh.add_polygon(idx)
    else:
        mesh.add_polygon(list(reversed(idx)))


def add_ribbon(mesh: Mesh, line: LineString, width: float, z: float, colour) -> None:
    """A horizontal ribbon along a centreline — used for roads and rail."""
    if line.length < 1.0:
        return
    n = max(2, int(line.length / 12.0) + 1)
    left, right = [], []
    for i in range(n):
        t = i / (n - 1)
        p = line.interpolate(t, normalized=True)
        p2 = line.interpolate(min(1.0, t + 0.01), normalized=True)
        p1 = line.interpolate(max(0.0, t - 0.01), normalized=True)
        dx, dy = p2.x - p1.x, p2.y - p1.y
        l = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / l, dx / l
        left.append((p.x + nx * width / 2, p.y + ny * width / 2))
        right.append((p.x - nx * width / 2, p.y - ny * width / 2))
    li = [mesh.add_vertex(x, y, z, _shade(colour, 0.92)) for (x, y) in left]
    ri = [mesh.add_vertex(x, y, z, _shade(colour, 0.92)) for (x, y) in right]
    for i in range(n - 1):
        mesh.add_quad(li[i], li[i + 1], ri[i + 1], ri[i])


def add_cylinder(mesh: Mesh, cx: float, cy: float, z0: float, z1: float,
                 radius: float, colour, segments: int = 16, cap: bool = True) -> None:
    seg = segments
    bottom, top = [], []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        x, y = cx + math.cos(a) * radius, cy + math.sin(a) * radius
        bottom.append(mesh.add_vertex(x, y, z0, _shade(colour, 0.7)))
        top.append(mesh.add_vertex(x, y, z1, _shade(colour, 1.0)))
    for i in range(seg):
        j = (i + 1) % seg
        f = 1.0 if i % 2 == 0 else 0.93
        a = mesh.add_vertex(*bottom[i][0:2], z0, _shade(colour, 0.68 * f)) if False else bottom[i]
        mesh.add_quad(bottom[i], bottom[j], top[j], top[i])
    if cap:
        mesh.add_polygon(top)


def add_gantry_crane(mesh: Mesh, x: float, y: float, angle: float, height: float,
                     span: float, colour, legs: int = 4) -> None:
    """A container crane: two portals, a boom and a trolley. The single most
    recognisable object in any port, and the reason Seirin's skyline reads as a
    working harbour rather than a generic waterfront."""
    ca, sa = math.cos(angle), math.sin(angle)

    def P(u, v, z):
        return (x + ca * u - sa * v, y + sa * u + ca * v, z)

    track = span * 0.5
    leg_w = 1.6
    for sgn in (-1, 1):
        for usgn in (-1, 1):
            u = sgn * track * 0.62
            v = usgn * 2.6
            for corner in ((-leg_w, -leg_w), (leg_w, -leg_w), (leg_w, leg_w), (-leg_w, leg_w)):
                pass
            # legs as thin boxes
            bx, by, _ = P(u, v, 0)
            _box(mesh, bx, by, 0.0, height, leg_w * 2, leg_w * 2, colour)

    # portal beams
    beam_z = height
    for sgn in (-1, 1):
        v = sgn * 2.6
        p0 = P(-track * 0.62, v, beam_z)
        p1 = P(track * 0.62, v, beam_z)
        _beam(mesh, p0, p1, 2.2, 2.0, colour)
    # boom reaching over the water
    p0 = P(track * 0.62, 0.0, beam_z + 1.0)
    p1 = P(track * 2.3, 0.0, beam_z + 3.2)
    _beam(mesh, p0, p1, 2.6, 2.2, colour)
    # trolley
    tx, ty, tz = P(track * 1.5, 0.0, beam_z + 1.4)
    _box(mesh, tx, ty, tz, tz + 2.2, 4.0, 3.0, _shade(colour, 1.15))


def _box(mesh: Mesh, cx: float, cy: float, z0: float, z1: float, w: float, d: float,
         colour) -> None:
    ring = [(cx - w / 2, cy - d / 2), (cx + w / 2, cy - d / 2),
            (cx + w / 2, cy + d / 2), (cx - w / 2, cy + d / 2)]
    extrude_prism(mesh, ring, z0, z1, colour, roof="flat")


def _beam(mesh: Mesh, p0, p1, thickness: float, height: float, colour) -> None:
    (x0, y0, z0), (x1, y1, z1) = p0, p1
    dx, dy = x1 - x0, y1 - y0
    l = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / l, dx / l
    t = thickness / 2
    ring = [(x0 + nx * t, y0 + ny * t), (x1 + nx * t, y1 + ny * t),
            (x1 - nx * t, y1 - ny * t), (x0 - nx * t, y0 - ny * t)]
    lo = [mesh.add_vertex(x, y, z0 - height / 2, _shade(colour, 0.72)) for (x, y) in ring]
    hi = [mesh.add_vertex(x, y, z0 + height / 2, _shade(colour, 1.0)) for (x, y) in ring]
    for i in range(4):
        j = (i + 1) % 4
        mesh.add_quad(lo[i], lo[j], hi[j], hi[i])
    mesh.add_polygon(hi)


# --------------------------------------------------------------------------
# Scene assembly
# --------------------------------------------------------------------------


class Scene3D:
    """Builds every mesh for the city, then writes OBJ/MTL and GLB."""

    def __init__(self, terrain: Terrain, districts: DistrictSystem,
                 roads: RoadNetwork, city: City, landmarks: Landmarks,
                 census: Census):
        self.terrain = terrain
        self.districts = districts
        self.roads = roads
        self.city = city
        self.landmarks = landmarks
        self.census = census
        self.meshes: List[Mesh] = []

    # -- ground ------------------------------------------------------------
    def build_terrain(self, step: int = 3, urban_under: bool = True) -> Mesh:
        """The land surface as a triangle mesh at `step` × 20 m resolution."""
        ter = self.terrain
        m = Mesh(name="terrain", material="terrain_land")
        h = ter.height[::step, ::step].astype(float)
        ny, nx = h.shape
        xs = X0 + np.arange(nx) * GRID * step
        ys = Y0 + np.arange(ny) * GRID * step
        land = MATERIALS["terrain_land"]["colour"]
        rock = MATERIALS["terrain_rock"]["colour"]
        urban = MATERIALS["terrain_urban"]["colour"]
        idx = np.empty(h.shape, dtype=object)
        for j in range(ny):
            for i in range(nx):
                z = float(h[j, i])
                if z <= 0.0:
                    idx[j, i] = None
                    continue
                t = min(1.0, max(0.0, z / 420.0))
                col = tuple(urban[k] * 0.0 + rock[k] * t + land[k] * (1 - t)
                            for k in range(3))
                if self._is_urban(xs[i], ys[j]):
                    col = tuple(col[k] * 0.55 + urban[k] * 0.45 for k in range(3))
                idx[j, i] = m.add_vertex(xs[i], ys[j], z, col)
        for j in range(ny - 1):
            for i in range(nx - 1):
                a, b = idx[j, i], idx[j, i + 1]
                c, d = idx[j + 1, i + 1], idx[j + 1, i]
                ring = [v for v in (a, b, c, d) if v is not None]
                if len(ring) >= 3:
                    m.add_polygon(ring)
        self.meshes.append(m)

        # Water: a single plane at sea level, plus the river surfaces.
        water = Mesh(name="water", material="water")
        wc = MATERIALS["water"]["colour"]
        for poly in [self.terrain.water_polygon()] + self.terrain.river_water_polygons():
            for g in ([poly] if poly.geom_type == "Polygon" else list(poly.geoms)):
                add_flat_polygon(water, list(g.exterior.coords), 0.0, wc, up=True)
                for r in g.interiors:
                    add_flat_polygon(water, list(r.coords), 0.0, wc, up=False)
        if not water.is_empty:
            self.meshes.append(water)
        return m

    def _is_urban(self, x: float, y: float) -> bool:
        nb = self.districts.neighbourhood_at(x, y)
        return nb is not None and nb.kind not in ("forest", "farmland")

    # -- buildings ---------------------------------------------------------
    def build_buildings(self, only_district: Optional[str] = None,
                        bbox: Optional[Tuple[float, float, float, float]] = None,
                        simplify_rural: float = 0.0) -> List[Mesh]:
        """Extrude every building. Meshes are grouped by material so an importer
        gets one object per surface type instead of 172 000 objects."""
        groups: Dict[str, Mesh] = {}
        for b in self.city.buildings:
            if only_district and b.district_id != only_district:
                continue
            if bbox:
                x0, y0, x1, y1 = bbox
                if not (x0 <= b.centre[0] <= x1 and y0 <= b.centre[1] <= y1):
                    continue
            mat = material_for(b)
            mesh = groups.get(mat)
            if mesh is None:
                mesh = Mesh(name=f"buildings_{mat}", material=mat)
                groups[mat] = mesh
            colour = MATERIALS[mat]["colour"]
            base = max(0.2, b.elevation - 0.25)
            ring = list(b.polygon.exterior.coords)
            if simplify_rural > 0 and b.storeys <= 2 and len(ring) > 5:
                ring = list(b.polygon.simplify(simplify_rural, preserve_topology=True).exterior.coords)
            # A per-building facade factor (0.93-1.0) keeps the massing from
            # looking like a single extruded solid without splitting vertices.
            facade = 0.93 + 0.07 * ((b.id * 0.6180339887) % 1.0)
            extrude_prism(mesh, ring, base, base + b.height_m, colour,
                          roof=b.roof, eave=0.55 if b.roof == "gabled" else 0.0,
                          facade=facade)
            # Rooftop plant on tall buildings: a real silhouette detail.
            if b.height_m > 24.0:
                cx, cy = b.centre
                _box(mesh, cx, cy, base + b.height_m, base + b.height_m + 2.4,
                     min(12.0, b.foot_m2 ** 0.5 * 0.35),
                     min(12.0, b.foot_m2 ** 0.5 * 0.35), _shade(colour, 0.8))
        out = [m for m in groups.values() if not m.is_empty]
        self.meshes.extend(out)
        return out

    def build_landmarks(self) -> List[Mesh]:
        """The canon landmarks, with shapes that match what they are."""
        m_civ = Mesh(name="landmarks_civic", material="canon_building")
        m_hall = Mesh(name="landmarks_hall", material="canon_hall")
        m_shrine = Mesh(name="landmarks_shrine", material="canon_shrine")
        m_ind = Mesh(name="landmarks_industrial", material="canon_industrial")
        m_port = Mesh(name="port_cranes", material="metal_rust")
        by_id = self.landmarks.by_id
        for poi in self.landmarks.canon:
            z = max(0.3, self.terrain.height_at(poi.x, poi.y))
            fp = max(120.0, poi.footprint_m2)
            side = math.sqrt(fp)
            if poi.kind in ("corporate", "civic", "hospital", "police", "rail_station"):
                # stepped tower: a base block, a shaft and a crown
                base_h = poi.floors * 3.4 * 0.28
                _box(m_civ, poi.x, poi.y, z, z + base_h, side * 1.25, side, MATERIALS["canon_building"]["colour"])
                shaft = side * 0.62
                _box(m_civ, poi.x, poi.y, z + base_h, z + poi.floors * 3.4, shaft, shaft * 0.85,
                     MATERIALS["canon_building"]["colour"])
                _box(m_civ, poi.x, poi.y, z + poi.floors * 3.4,
                     z + poi.floors * 3.4 + 4.5, shaft * 0.45, shaft * 0.45,
                     _shade(MATERIALS["canon_building"]["colour"], 0.85))
            elif poi.kind == "arena":
                add_cylinder(m_hall, poi.x, poi.y, z, z + poi.floors * 4.0,
                             side * 0.55, MATERIALS["canon_hall"]["colour"], segments=28)
                add_cylinder(m_hall, poi.x, poi.y, z + poi.floors * 4.0,
                             z + poi.floors * 4.0 + 2.2, side * 0.60,
                             _shade(MATERIALS["canon_hall"]["colour"], 0.8), segments=28)
            elif poi.kind in ("shrine", "teahouse", "bath", "theatre"):
                extrude_prism(m_shrine, [(poi.x - side * 0.6, poi.y - side * 0.45),
                                         (poi.x + side * 0.6, poi.y - side * 0.45),
                                         (poi.x + side * 0.6, poi.y + side * 0.45),
                                         (poi.x - side * 0.6, poi.y + side * 0.45)],
                              z, z + max(4.0, poi.floors * 3.2),
                              MATERIALS["canon_shrine"]["colour"], roof="gabled", eave=1.4)
                if poi.kind == "shrine":
                    # torii gate
                    for sgn in (-1, 1):
                        _box(m_shrine, poi.x + sgn * 3.6, poi.y + side * 1.1, z,
                             z + 4.2, 0.5, 0.5, (0.72, 0.30, 0.22))
                    _beam(m_shrine, (poi.x - 4.6, poi.y + side * 1.1, z + 4.2),
                          (poi.x + 4.6, poi.y + side * 1.1, z + 4.2), 0.7, 0.6,
                          (0.72, 0.30, 0.22))
            elif poi.kind in ("port", "drydock", "customs"):
                _box(m_ind, poi.x, poi.y, z, z + max(6.0, poi.floors * 4.2),
                     side * 1.1, side * 0.7, MATERIALS["canon_industrial"]["colour"])
                if poi.kind == "port":
                    # four container cranes along the quay
                    for k in range(4):
                        cx = poi.x - 260.0 + k * 175.0
                        add_gantry_crane(m_port, cx, poi.y - 190.0, math.radians(-32.0),
                                         26.0, 28.0, MATERIALS["metal_rust"]["colour"])
                        # container stacks behind the quay
                        for s in range(3):
                            _box(m_port, cx + 40.0, poi.y + 120.0 + s * 26.0, z, z + 5.4,
                                 22.0, 7.0, (0.35, 0.42, 0.47) if s % 2 else (0.55, 0.34, 0.28))
                if poi.kind == "drydock":
                    # dock walls and a gate
                    for sgn in (-1, 1):
                        _box(m_ind, poi.x + sgn * side * 0.55, poi.y, z - 3.0, z + 2.4,
                             12.0, side * 1.2, MATERIALS["concrete_quay"]["colour"])
            elif poi.kind in ("mecha_yard", "workshop", "lab", "hangar", "construction"):
                _box(m_ind, poi.x, poi.y, z, z + max(7.0, poi.floors * 4.6),
                     side * 1.05, side * 0.75, MATERIALS["canon_industrial"]["colour"])
                # an overhead travelling crane: the signature of a heavy works
                _beam(m_ind, (poi.x - side * 0.6, poi.y, z + 12.0),
                      (poi.x + side * 0.6, poi.y, z + 12.0), 1.6, 1.4,
                      _shade(MATERIALS["canon_industrial"]["colour"], 0.85))
                for sgn in (-1, 1):
                    _box(m_ind, poi.x + sgn * side * 0.58, poi.y, z, z + 12.0, 1.2, 1.2,
                         MATERIALS["canon_industrial"]["colour"])
            elif poi.kind in ("water", "market"):
                _box(m_hall, poi.x, poi.y, z, z + 5.0, side * 1.2, side * 0.8,
                     MATERIALS["canon_hall"]["colour"])
            elif poi.kind in ("archive", "studio", "university"):
                _box(m_civ, poi.x, poi.y, z, z + max(5.0, poi.floors * 3.6),
                     side * 1.1, side * 0.85, MATERIALS["canon_building"]["colour"])
            else:
                _box(m_ind, poi.x, poi.y, z, z + max(3.0, poi.floors * 3.2),
                     side, side * 0.8, MATERIALS["canon_industrial"]["colour"])
        out = [m for m in (m_civ, m_hall, m_shrine, m_ind, m_port) if not m.is_empty]
        self.meshes.extend(out)
        return out

    # -- infrastructure ----------------------------------------------------
    def build_roads(self, classes=("trunk", "arterial", "collector"),
                    with_markings: bool = False) -> List[Mesh]:
        """Roads as ribbons on the terrain. Only the classes that read at city
        scale are built by default: painting every 4.5 m alley would triple the
        triangle count for almost no visible gain."""
        asphalt = Mesh(name="roads", material="road_asphalt")
        colour = MATERIALS["road_asphalt"]["colour"]
        for st in self.roads.streets:
            if st.klass not in classes:
                continue
            z = self._median_z(st.line) + 0.12
            add_ribbon(asphalt, st.line, st.width, z, colour)
        out = [asphalt] if not asphalt.is_empty else []
        if with_markings:
            mk = Mesh(name="road_markings", material="road_marking")
            for st in self.roads.streets:
                if st.klass not in ("trunk", "arterial"):
                    continue
                z = self._median_z(st.line) + 0.16
                for off in (-st.width * 0.22, st.width * 0.22):
                    l = st.line.offset_curve(off)
                    if l.is_empty or l.geom_type != "LineString":
                        continue
                    add_ribbon(mk, l, 0.35, z, MATERIALS["road_marking"]["colour"])
            if not mk.is_empty:
                out.append(mk)
        self.meshes.extend(out)
        return out

    def _median_z(self, line: LineString) -> float:
        n = max(3, int(line.length / 40.0))
        zs = []
        for i in range(n):
            p = line.interpolate(i / (n - 1), normalized=True)
            zs.append(self.terrain.height_at(p.x, p.y))
        return float(np.median(zs))

    def build_bridges(self) -> List[Mesh]:
        m = Mesh(name="bridges", material="steel_bridge")
        colour = MATERIALS["steel_bridge"]["colour"]
        for br in self.roads.bridges:
            z = max(2.4, self._median_z(br.line) + 2.2)
            add_ribbon(m, br.line, br.deck_width, z, colour)
            # parapets and, on the long spans, a truss
            for sgn in (-1, 1):
                l = br.line.offset_curve(sgn * br.deck_width * 0.48)
                if l.is_empty or l.geom_type != "LineString":
                    continue
                add_ribbon(m, l, 0.35, z + 1.1, _shade(colour, 0.85))
            if br.length_m > 45.0:
                p0 = br.line.interpolate(0.0)
                p1 = br.line.interpolate(1.0)
                for k in range(1, 4):
                    t = k / 4.0
                    p = br.line.interpolate(t)
                    _box(m, p.x, p.y, z - 2.6, z, 1.6, 1.6, _shade(colour, 0.7))
                _beam(m, (p0.x, p0.y, z + 5.4), (p1.x, p1.y, z + 5.4), 0.5, 0.5, colour)
        out = [m] if not m.is_empty else []
        self.meshes.extend(out)
        return out

    def build_rail(self) -> List[Mesh]:
        """Rail lines: ballast bed, then the two tracks."""
        ballast = Mesh(name="rail_ballast", material="rail_ballast")
        rails = Mesh(name="rail_tracks", material="steel_bridge")
        bc = MATERIALS["rail_ballast"]["colour"]
        rc = (0.55, 0.56, 0.58)
        for line in self.landmarks.lines:
            if line.kind not in ("rail", "metro"):
                continue
            geom = line.geometry
            z = self._median_z(geom)
            if line.kind == "metro" and geom.length < 40_000.0:
                # metro runs underground in the core: show it as a shallow cut
                add_ribbon(ballast, geom, 9.0, z - 3.0, _shade(bc, 0.6))
                continue
            add_ribbon(ballast, geom, 9.6, z + 0.4, bc)
            for off in (-1.4, 1.4):
                l = geom.offset_curve(off)
                if l.is_empty or l.geom_type != "LineString":
                    continue
                add_ribbon(rails, l, 0.5, z + 0.62, rc)
        out = [m for m in (ballast, rails) if not m.is_empty]
        self.meshes.extend(out)
        return out

    def build_quays(self) -> List[Mesh]:
        """Quay walls at the water's edge along the reclaimed port platforms."""
        m = Mesh(name="quays", material="concrete_quay")
        colour = MATERIALS["concrete_quay"]["colour"]
        from .terrain import PORT_PLATFORMS
        for name, (cx, cy, w, d, ang) in PORT_PLATFORMS.items():
            ca, sa = math.cos(ang), math.sin(ang)
            corners = [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)]
            ring = [(cx + ca * u - sa * v, cy + sa * u + ca * v) for (u, v) in corners]
            extrude_ring_band(m, ring, -2.5, 3.2, colour)
            z = 3.2
            add_flat_polygon(m, ring, z, _shade(colour, 1.05))
        out = [m] if not m.is_empty else []
        self.meshes.extend(out)
        return out

    def build_parks(self) -> List[Mesh]:
        m = Mesh(name="parks", material="park")
        colour = MATERIALS["park"]["colour"]
        for poi in self.landmarks.pois:
            if poi.kind != "park":
                continue
            z = max(0.4, self.terrain.height_at(poi.x, poi.y)) + 0.2
            r = max(18.0, (poi.footprint_m2 or 4_000.0) ** 0.5 * 0.5)
            seg = 14
            ring = [(poi.x + math.cos(2 * math.pi * i / seg) * r * (1 + 0.18 * math.sin(3.1 * i)),
                     poi.y + math.sin(2 * math.pi * i / seg) * r * (1 + 0.18 * math.cos(2.3 * i)))
                    for i in range(seg)]
            add_flat_polygon(m, ring, z, colour)
        out = [m] if not m.is_empty else []
        self.meshes.extend(out)
        return out

    # -- serialisation -----------------------------------------------------
    def write_obj(self, path: str, meshes: Optional[List[Mesh]] = None,
                  makedirs: bool = True) -> str:
        """Wavefront OBJ + MTL. Vertices are shared only within a mesh, faces are
        polygons (Blender handles n-gons natively), and no normals are written."""
        if makedirs:
            os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        meshes = meshes if meshes is not None else self.meshes
        base = os.path.splitext(os.path.basename(path))[0]
        mtl_path = os.path.join(os.path.dirname(path), f"{base}.mtl")
        used = []
        for m in meshes:
            if m.material not in used:
                used.append(m.material)
        with open(mtl_path, "w", encoding="utf-8") as fh:
            fh.write(f"# Seirin city generator — materials for {base}.obj\n")
            fh.write("# Colours are the design document's muted Japanese urban palette.\n")
            for key in used:
                spec = MATERIALS.get(key, MATERIALS["steel_shop"])
                c = spec["colour"]
                fh.write(f"\nnewmtl {key}\n")
                fh.write(f"Ka {c[0]*0.35:.4f} {c[1]*0.35:.4f} {c[2]*0.35:.4f}\n")
                fh.write(f"Kd {c[0]:.4f} {c[1]:.4f} {c[2]:.4f}\n")
                fh.write(f"Ks {spec['metal']:.3f} {spec['metal']:.3f} {spec['metal']:.3f}\n")
                fh.write(f"Ns {max(4.0, (1.0 - spec['rough']) * 340.0):.1f}\n")
                fh.write("d 1.0\nillum 2\n")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(f"# Seirin — {base}\n")
            fh.write("# Axes: x = east, y = north, z = up. Units: metres.\n")
            fh.write(f"mtllib {base}.mtl\n")
            off = 1
            for m in meshes:
                fh.write(f"\no {m.name}\n")
                fh.write(f"usemtl {m.material}\n")
                for (x, y, z) in m.positions().tolist():
                    fh.write(f"v {x:.2f} {y:.2f} {z:.2f}\n")
                for (a, b, c) in m.indices().tolist():
                    fh.write(f"f {a+off} {b+off} {c+off}\n")
                off += m.n_verts
        size = os.path.getsize(path)
        return path

    def write_glb(self, path: str, meshes: Optional[List[Mesh]] = None,
                  makedirs: bool = True) -> str:
        """Binary glTF 2.0: one mesh, one primitive per material, vertex colours.

        glTF is Y-up, so the geometry is rotated on export (-90° about X) and the
        node carries that rotation; every consumer then sees the city upright.
        """
        if makedirs:
            os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        meshes = [m for m in (meshes if meshes is not None else self.meshes) if not m.is_empty]
        gltf_json, bin_blob = self._pack_glb(meshes)
        with open(path, "wb") as fh:
            fh.write(_glb_container(gltf_json, bin_blob))
        return path

    def _pack_glb(self, meshes: List[Mesh]):
        buffer_parts: List[bytes] = []
        buffer_views = []
        accessors = []
        primitives = []
        offset = 0

        def add_view(data: bytes, target: int) -> int:
            nonlocal offset
            pad = (-len(data)) % 4
            buffer_parts.append(data)
            if pad:
                buffer_parts.append(b"\x00" * pad)
            buffer_views.append(dict(buffer=0, byteOffset=offset, byteLength=len(data),
                                     target=target))
            offset += len(data) + pad
            return len(buffer_views) - 1

        material_names = []
        material_index = {}

        for m in meshes:
            if m.is_empty:
                continue
            # glTF is Y-up: (x, y, z)_world -> (x, z, -y)_gltf
            world = m.positions()
            pos = np.ascontiguousarray(np.stack(
                (world[:, 0], world[:, 2], -world[:, 1]), axis=1), dtype=np.float32)
            pos, col, idx = _weld(pos, m.colours(), m.indices())
            pos_bytes = pos.tobytes()
            col_bytes = col.tobytes()
            idx_bytes = idx.astype(np.uint32).tobytes()
            v_pos = add_view(pos_bytes, 34962)
            v_col = add_view(col_bytes, 34962)
            v_idx = add_view(idx_bytes, 34963)
            accessors.append(dict(bufferView=v_pos, componentType=5126, count=len(pos),
                                  type="VEC3",
                                  min=[float(pos[:, i].min()) for i in range(3)],
                                  max=[float(pos[:, i].max()) for i in range(3)]))
            a_pos = len(accessors) - 1
            accessors.append(dict(bufferView=v_col, componentType=5121, count=len(col),
                                  type="VEC3", normalized=True))
            a_col = len(accessors) - 1
            accessors.append(dict(bufferView=v_idx, componentType=5125, count=len(idx),
                                  type="SCALAR"))
            a_idx = len(accessors) - 1
            if m.material not in material_index:
                spec = MATERIALS.get(m.material, MATERIALS["steel_shop"])
                c = spec["colour"]
                material_index[m.material] = len(material_names)
                material_names.append(dict(
                    name=m.material,
                    pbrMetallicRoughness=dict(
                        baseColorFactor=[c[0], c[1], c[2], 1.0],
                        metallicFactor=float(spec["metal"]),
                        roughnessFactor=float(spec["rough"])),
                    doubleSided=False))
            primitives.append(dict(attributes=dict(POSITION=a_pos, COLOR_0=a_col),
                                   indices=a_idx, material=material_index[m.material],
                                   mode=4))

        gltf = dict(
            asset=dict(version="2.0", generator="Seirin city generator "
                                               "(vector geometry, no raster data)"),
            scene=0,
            scenes=[dict(nodes=[0], name="Seirin")],
            nodes=[dict(mesh=0, name="Seirin city")],
            meshes=[dict(name="Seirin", primitives=primitives)],
            materials=material_names,
            accessors=accessors,
            bufferViews=buffer_views,
            buffers=[dict(byteLength=sum(len(b) for b in buffer_parts))],
        )
        return gltf, b"".join(buffer_parts)


def _weld(pos: np.ndarray, col: np.ndarray, idx: np.ndarray):
    """Remove duplicated (position, colour) vertices before export.

    Building the meshes emits every face corner independently, so a cube arrives
    as up to 24 vertices. Dropping exact duplicates shrinks both the vertex
    buffer and the index buffer, and for a GLB it is the difference between a
    150 MB download and a 70 MB one. Doing it once, in numpy, after the city is
    built costs a couple of seconds and no noticeable memory.
    """
    flat = np.ascontiguousarray(idx.reshape(-1), dtype=np.int64)
    if len(pos) == 0:
        return pos, col, flat.astype(np.uint32)
    key = np.ascontiguousarray(np.concatenate(
        [pos.view(np.uint8).reshape(len(pos), pos.dtype.itemsize * 3),
         col.view(np.uint8).reshape(len(col), col.dtype.itemsize * 3)], axis=1))
    unique, first, inverse = np.unique(key, axis=0, return_index=True,
                                       return_inverse=True)
    return (np.ascontiguousarray(pos[first], dtype=np.float32),
            np.ascontiguousarray(col[first], dtype=np.uint8),
            inverse[flat].astype(np.uint32))


def _glb_container(gltf: dict, bin_blob: bytes) -> bytes:
    """Assemble a .glb: 12-byte header, JSON chunk, BIN chunk, 4-byte aligned."""
    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_bytes += b" " * ((-len(json_bytes)) % 4)
    bin_blob += b"\x00" * ((-len(bin_blob)) % 4)
    total = 12 + 8 + len(json_bytes) + 8 + len(bin_blob)
    out = bytearray()
    out += struct.pack("<III", 0x46546C67, 2, total)          # magic, version, length
    out += struct.pack("<II", len(json_bytes), 0x4E4F534A)     # JSON chunk
    out += json_bytes
    out += struct.pack("<II", len(bin_blob), 0x004E4942)       # BIN chunk
    out += bin_blob
    return bytes(out)


BLENDER_SCRIPT = '''"""Blender import helper for the Seirin 3-D city.

Usage:  blender --background --python import_seirin.py -- <path-to.glb|.obj>

Run the generator first (python -m seirin export-3d). The scene comes in at
1 unit = 1 metre, with north along -Y (Blender's convention) and Z up.
"""
import sys
import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
path = argv[0] if argv else "build/svg/../3d/seirin_city.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)

if path.lower().endswith(".glb") or path.lower().endswith(".gltf"):
    bpy.ops.import_scene.gltf(filepath=path)
else:
    # OBJ: axis_forward/axis_up match the generator's x=east, y=north, z=up export
    bpy.ops.wm.obj_import(filepath=path, forward_axis="Y", up_axis="Z")

# Frame the city and set up a workable view.
for obj in bpy.context.scene.objects:
    if obj.type == "MESH":
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        break
bpy.ops.object.select_all(action="SELECT")
bpy.ops.view3d.camera_to_view_selected() if bpy.context.mode == "OBJECT" else None

scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0
print("Seirin 3-D city imported:", path)
'''


def export_scene(scene: Scene3D, out_dir: str, terrain_step: int = 3,
                 per_district: bool = True, roads: bool = True,
                 glb: bool = True) -> Dict[str, object]:
    """Write the whole 3-D product: terrain, city, per-district OBJ extracts."""
    os.makedirs(out_dir, exist_ok=True)
    written: Dict[str, object] = {}
    ground = scene.build_terrain(step=terrain_step)
    scene.build_buildings(simplify_rural=1.2)
    scene.build_landmarks()
    if roads:
        scene.build_roads(with_markings=True)
        scene.build_bridges()
        scene.build_rail()
        scene.build_quays()
        scene.build_parks()
    if glb:
        written["glb"] = scene.write_glb(os.path.join(out_dir, "seirin_city_full.glb"))
    written["obj_city"] = scene.write_obj(os.path.join(out_dir, "seirin_city_full.obj"),
                                          scene.meshes)
    if per_district:
        for d in scene.districts.districts:
            sub = Scene3D(scene.terrain, scene.districts, scene.roads, scene.city,
                          scene.landmarks, scene.census)
            sub.build_buildings(only_district=d["id"])
            sub.build_landmarks() if d["id"] in ("hikari", "port", "tsukimachi") else None
            if not any(not m.is_empty for m in sub.meshes):
                continue
            name = f"district_{d['id']}.obj"
            written.setdefault("district_objs", []).append(
                sub.write_obj(os.path.join(out_dir, "districts", name)))
    with open(os.path.join(out_dir, "import_seirin.py"), "w", encoding="utf-8") as fh:
        fh.write(BLENDER_SCRIPT)
    return written
