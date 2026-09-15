"""Seirin city generator — a procedural, fully vector generator for the
Seirin: Night Shift city.

The package builds the whole city from a single seed:

    from seirin import generate

    world = generate(seed=20320401)
    world["census"].summary()          # population, jobs, travel demand
    world["terrain"].height_at(0, 0)   # terrain queries

Nothing here produces raster imagery. Maps are SVG, the 3-D city is triangle
geometry exported as OBJ/MTL and binary glTF, and statistics are CSV/JSON.

See docs/METHOD.md for the model chain and docs/GAZETTEER.md for what the city
contains.
"""

from .base import Rng                     # noqa: F401
from .terrain import Terrain              # noqa: F401
from .districts import DistrictSystem     # noqa: F401
from .roads import RoadNetwork            # noqa: F401
from .buildings import City               # noqa: F401
from .landmarks import Landmarks          # noqa: F401
from .society import Census               # noqa: F401

__all__ = ["Rng", "Terrain", "DistrictSystem", "RoadNetwork", "City",
           "Landmarks", "Census", "generate", "generate_world"]

__version__ = "1.0.0"


def generate(seed: int = 20_320_401, log=None):
    """Build the whole city and return a dict of every subsystem.

    The order is not arbitrary — each stage consumes the previous one, and the
    two-phase landmark/census call sequence exists because the census needs the
    building stock while the POIs and the transit network need the census.
    """
    from .base import NameBank
    from .buildings import City as _City
    from .districts import DistrictSystem as _DS
    from .landmarks import Landmarks as _LM
    from .roads import RoadNetwork as _RN
    from .society import Census as _Cen
    from .terrain import Terrain as _Ter
    import time

    t0 = time.time()

    def mark(name: str):
        if log:
            log(f"  [{time.time() - t0:6.1f}s] {name}")

    rng = Rng(seed)
    terrain = _Ter(rng); mark("terrain")
    names = NameBank(rng.sub("names"))
    districts = _DS(rng, terrain, names); mark("districts")
    roads = _RN(rng, terrain, districts, names); mark("roads")
    city = _City(rng, terrain, districts, roads, names); mark("buildings")
    landmarks = _LM(rng, terrain, districts, roads, city, names); mark("landmarks")
    census = _Cen(rng, terrain, districts, roads, city, landmarks, names)
    mark("census")
    landmarks.place_pois(census); mark("services")
    landmarks.build_transit(); mark("transit")
    census.finish_travel_demand(); mark("travel demand")

    return dict(seed=seed, rng=rng, names=names, terrain=terrain,
                districts=districts, roads=roads, city=city, landmarks=landmarks,
                census=census, elapsed_s=round(time.time() - t0, 1))


# The name used in the docs for the same entry point.
generate_world = generate
