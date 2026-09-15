"""Save and reload a generated world.

Generating the full city takes about four minutes. The exporters, the atlas and
the 3-D scene all need the same world, and iterating on a map style should not
mean regenerating the city, so a world can be pickled and reloaded. The heavy
spatial indexes are dropped on pickling and rebuilt on load (they are C++
objects and are not serialisable, and they are cheap to rebuild).
"""

from __future__ import annotations

import os
import pickle
from typing import Dict

FORMAT = 3


def save(world: Dict, path: str) -> str:
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    payload = dict(world)
    payload["_format"] = FORMAT
    with open(path, "wb") as fh:
        pickle.dump(payload, fh, protocol=4)
    return path


def load(path: str) -> Dict:
    with open(path, "rb") as fh:
        world = pickle.load(fh)
    if world.get("_format") != FORMAT:
        raise ValueError(
            f"cached world at {path} has format {world.get('_format')}, "
            f"this build expects {FORMAT}; regenerate with `seirin build`")
    world.pop("_format", None)
    return world


def get_or_generate(path: str, seed: int, log=None, refresh: bool = False) -> Dict:
    """Load the cached world, or generate and cache it."""
    from . import generate
    if path and os.path.exists(path) and not refresh:
        if log:
            log(f"loading cached world from {path}")
        return load(path)
    world = generate(seed=seed, log=log)
    if path:
        save(world, path)
        if log:
            log(f"cached world to {path}")
    return world
