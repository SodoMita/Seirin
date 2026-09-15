"""Command line interface: build the city, then export what you need.

    python -m seirin all          # everything: maps, tables, 3-D
    python -m seirin maps         # the SVG atlas only
    python -m seirin 3d           # OBJ/MTL + GLB + the Blender import script
    python -m seirin stats        # printed summary and CSV tables
    python -m seirin check        # run the invariant checks and print a report
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time
from typing import Dict, Optional

DEFAULT_SEED = 20_320_401


def _world(args):
    """The world for this run: from the cache when there is one, else built."""
    from .store import get_or_generate
    cache = args.cache if getattr(args, "cache", None) else None
    if cache == "-":
        cache = None
    return get_or_generate(cache, args.seed, log=print if args.verbose else None,
                           refresh=getattr(args, "refresh", False))


def _default_out() -> str:
    here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return here


def cmd_build(args) -> int:
    from . import generate
    t0 = time.time()
    world = _world(args)
    print(f"city generated in {world['elapsed_s']}s")
    print(json.dumps(world["census"].summary(), ensure_ascii=False, indent=2))
    return 0


def cmd_maps(args) -> int:
    from . import generate
    from .maps import Atlas
    world = _world(args)
    atlas = Atlas(world["terrain"], world["districts"], world["roads"],
                  world["city"], world["landmarks"], world["census"])
    files = atlas.build_all(args.out)
    for k, v in files.items():
        print(f"  {k:24s} {os.path.relpath(v, os.getcwd())}")
    print(f"{len(files)} SVG maps written to {args.out}")
    return 0


def cmd_3d(args) -> int:
    from . import generate
    from .export3d import Scene3D, export_scene
    world = _world(args)
    scene = Scene3D(world["terrain"], world["districts"], world["roads"],
                    world["city"], world["landmarks"], world["census"])
    files = export_scene(scene, args.out, terrain_step=args.terrain_step,
                         per_district=not args.no_districts)
    for k, v in files.items():
        if isinstance(v, list):
            print(f"  {k}: {len(v)} files")
        else:
            print(f"  {k}: {os.path.relpath(v, os.getcwd())} "
                  f"({os.path.getsize(v)/1e6:.1f} MB)")
    return 0


def cmd_tables(args) -> int:
    from . import generate
    from .export import write_geojson, write_tables, write_world_json
    world = _world(args)
    tables = write_tables(args.out, world["terrain"], world["districts"],
                          world["roads"], world["city"], world["landmarks"],
                          world["census"])
    for k, v in tables.items():
        print(f"  {k:16s} {os.path.relpath(v, os.getcwd())}")
    print(json.dumps(world["census"].summary(), ensure_ascii=False, indent=2))
    return 0


def cmd_all(args) -> int:
    from . import generate
    from .export import write_geojson, write_tables, write_world_json
    from .export3d import Scene3D, export_scene
    from .maps import Atlas
    t0 = time.time()
    world = _world(args)
    root = args.out
    maps_dir = os.path.join(root, "svg")
    data_dir = os.path.join(root, "data")
    three_dir = os.path.join(root, "3d")

    print("building the SVG atlas ...")
    atlas = Atlas(world["terrain"], world["districts"], world["roads"],
                  world["city"], world["landmarks"], world["census"])
    maps = atlas.build_all(maps_dir)
    print(f"  {len(maps)} maps")

    print("writing data tables ...")
    tables = write_tables(data_dir, world["terrain"], world["districts"],
                          world["roads"], world["city"], world["landmarks"],
                          world["census"])
    geojson = write_geojson(os.path.join(data_dir, "seirin.geojson"),
                            world["terrain"], world["districts"], world["roads"],
                            world["city"], world["landmarks"], world["census"])
    world_json = write_world_json(os.path.join(data_dir, "seirin_world.json"),
                                  world["terrain"], world["districts"], world["roads"],
                                  world["city"], world["landmarks"], world["census"],
                                  args.seed)
    print(f"  {len(tables)} csv/json tables + geojson")

    if not args.no_3d:
        print("building the 3-D city ...")
        scene = Scene3D(world["terrain"], world["districts"], world["roads"],
                        world["city"], world["landmarks"], world["census"])
        files = export_scene(scene, three_dir, terrain_step=args.terrain_step,
                             per_district=not args.no_districts)
        print(f"  glb: {os.path.getsize(files['glb'])/1e6:.1f} MB, "
              f"districts: {len(files.get('district_objs', []))}")

    if args.gazetteer:
        from .gazetteer import write_gazetteer
        write_gazetteer(world, args.gazetteer)
        print(f"  gazetteer: {args.gazetteer}")

    print(f"\ncomplete in {time.time() - t0:.0f}s")
    print(json.dumps(world["census"].summary(), ensure_ascii=False, indent=2))
    return 0


def cmd_check(args) -> int:
    from . import generate
    from .checks import run_checks
    world = _world(args)
    report = run_checks(world)
    for line in report["lines"]:
        print(line)
    print(f"\n{report['passed']} passed, {report['failed']} failed")
    return 0 if report["failed"] == 0 else 1


def build_parser() -> argparse.ArgumentParser:
    # The common options live on a parent parser so they are accepted both
    # before and after the subcommand (`seirin maps --out build/svg` works).
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--seed", type=int, default=DEFAULT_SEED,
                        help=f"random seed (default {DEFAULT_SEED})")
    common.add_argument("--out", default=None, help="output directory")
    common.add_argument("--terrain-step", type=int, default=3,
                        help="terrain mesh decimation (1 = full 20 m grid)")
    common.add_argument("--no-districts", action="store_true",
                        help="skip per-district OBJ extracts")
    common.add_argument("--no-3d", action="store_true", help="skip the 3-D export")
    common.add_argument("--gazetteer", default=None,
                        help="also write the gazetteer markdown to this path")
    common.add_argument("-v", "--verbose", action="store_true")
    common.add_argument("--cache", default=None, metavar="PATH",
                        help="pickle file to cache the generated world in; "
                             "regenerating takes minutes, exporting seconds")
    common.add_argument("--refresh", action="store_true",
                        help="regenerate even if the cache exists")

    p = argparse.ArgumentParser(
        prog="seirin", parents=[common],
        description="Seirin city generator — vector city, 2-D atlas and 3-D "
                    "export, with a society and economy model.")
    sub = p.add_subparsers(dest="command")
    for name, fn in (("all", cmd_all), ("maps", cmd_maps), ("3d", cmd_3d),
                     ("stats", cmd_tables), ("build", cmd_build), ("check", cmd_check)):
        sp = sub.add_parser(name, parents=[common])
        sp.set_defaults(func=fn)
    return p


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    root = _default_out()
    if args.out is None:
        args.out = os.path.join(root, "build")
    if not getattr(args, "func", None):
        args.func = cmd_all
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
