#!/usr/bin/env python3
"""Validate generated character assets on disk against the registry.

Checks filename convention, expected canvas sizes, alpha presence, opaque
background detection, and expression-set completeness per character.

Usage:
    check_assets.py characters/
    check_assets.py characters/ --character ren
    check_assets.py characters/ --strict     # missing expressions are errors

PNG header parsing is done with the standard library, so the basic checks run
with zero dependencies. Pillow, if installed, enables the alpha and background
checks; without it those are skipped with a note.
"""
from __future__ import annotations

import argparse
import json
import re
import struct
import sys
from pathlib import Path

REGISTRY = Path(__file__).resolve().parent.parent / "assets" / "cast.json"

NAME_RE = re.compile(r"^(?P<id>[a-z0-9]+)_(?P<variant>[a-z0-9]+)_(?P<expr>[a-z0-9-]+)\.png$")
SHEET_RE = re.compile(r"^(?P<id>[a-z0-9]+)_(?:sheet_turnaround|hero|chibi)\.png$")

# (width, height) tolerances from references/sprite-spec.md
EXPECTED = {
    "sprite_full": [(2048, 4096), (1024, 2048)],
    "sprite_waist": [(2048, 2560), (1024, 1280)],
    "hero": [(2048, 2896), (1448, 2048)],
    "chibi": [(1024, 1024), (512, 512)],
    "turnaround": [(4096, 2304)],
}

try:
    from PIL import Image  # type: ignore
    HAVE_PIL = True
except ImportError:
    HAVE_PIL = False


def png_size(path: Path) -> tuple[int, int] | None:
    """Read a PNG's dimensions from the IHDR chunk. No dependencies."""
    try:
        with path.open("rb") as fh:
            if fh.read(8) != b"\x89PNG\r\n\x1a\n":
                return None
            fh.read(4)
            if fh.read(4) != b"IHDR":
                return None
            w, h = struct.unpack(">II", fh.read(8))
            return int(w), int(h)
    except OSError:
        return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("root", help="asset directory, e.g. characters/")
    ap.add_argument("--registry", default=str(REGISTRY))
    ap.add_argument("--character", "-c", help="restrict to one character id")
    ap.add_argument("--strict", action="store_true",
                    help="treat missing expressions as errors")
    args = ap.parse_args()

    root = Path(args.root)
    if not root.exists():
        print(f"ERROR: no such directory: {root}", file=sys.stderr)
        return 1

    try:
        reg = json.loads(Path(args.registry).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: cannot read registry: {exc}", file=sys.stderr)
        return 1

    chars = {c["id"]: c for c in reg["characters"]}
    if args.character:
        if args.character not in chars:
            print(f"ERROR: unknown character '{args.character}'", file=sys.stderr)
            return 1
        chars = {args.character: chars[args.character]}

    core = [e["id"] for e in reg["expression_sets"]["core_8"]]

    errors: list[str] = []
    warnings: list[str] = []
    notes: list[str] = []

    if not HAVE_PIL:
        notes.append("Pillow not installed — alpha and background checks skipped "
                     "(pip install Pillow to enable)")

    pngs = sorted(root.rglob("*.png"))
    if not pngs:
        notes.append(f"no PNG files found under {root} — nothing generated yet")

    seen: dict[str, set[str]] = {cid: set() for cid in chars}

    for p in pngs:
        if "_wip" in p.parts:
            continue
        name = p.name
        m = NAME_RE.match(name) or SHEET_RE.match(name)
        if not m:
            warnings.append(f"{p}: filename does not follow the convention "
                            "<id>_<variant>_<expression>.png "
                            "(see references/sprite-spec.md)")
            continue
        cid = m.group("id")
        if cid not in chars:
            if args.character:
                continue
            warnings.append(f"{p}: '{cid}' is not a known character id")
            continue

        if NAME_RE.match(name):
            seen[cid].add(m.group("expr"))

        size = png_size(p)
        if size is None:
            errors.append(f"{p}: not a readable PNG")
            continue

        # canvas sanity: flag anything not in any expected bucket
        allowed = [s for group in EXPECTED.values() for s in group]
        if size not in allowed:
            warnings.append(f"{p}: canvas {size[0]}x{size[1]} is not one of the "
                            "sizes in references/sprite-spec.md")

        if HAVE_PIL:
            try:
                with Image.open(p) as im:
                    is_sprite = bool(NAME_RE.match(name)) or name.endswith("_chibi.png")
                    if is_sprite:
                        if im.mode not in ("RGBA", "LA", "PA"):
                            errors.append(f"{p}: sprite has no alpha channel "
                                          f"(mode {im.mode})")
                        else:
                            alpha = im.getchannel("A")
                            lo, hi = alpha.getextrema()
                            if lo == hi == 255:
                                errors.append(f"{p}: alpha channel is fully opaque — "
                                              "background was not removed, or the "
                                              "white/black plates were flattened "
                                              "instead of composited")
                            else:
                                # A correctly triangulated sprite has anti-aliased
                                # edges, so some partial alpha must exist. Purely
                                # binary alpha means the matte was thresholded or
                                # the plates did not differ where they should.
                                hist = alpha.histogram()
                                partial = sum(hist[8:248])
                                if partial * 200 < sum(hist):
                                    warnings.append(
                                        f"{p}: alpha is effectively binary (<0.5% "
                                        "partial) — anti-aliased hair and any "
                                        "glass/glow should produce soft edges; "
                                        "check the matting plates")
                    if name.endswith("_sheet_turnaround.png") and im.mode == "RGBA":
                        a = im.getchannel("A")
                        if a.getextrema()[0] < 255:
                            warnings.append(f"{p}: turnaround sheets keep their green "
                                            "background and should not be matted")
            except Exception as exc:  # noqa: BLE001 - report, never crash a QA run
                warnings.append(f"{p}: could not inspect ({exc})")

    # expression completeness
    for cid, char in chars.items():
        have = seen.get(cid, set())
        if not have:
            notes.append(f"[{cid}] no sprites generated yet")
            continue
        want = set(core) | set(char.get("expressions_extra", []))
        missing = sorted(want - have)
        if missing:
            msg = f"[{cid}] missing expressions: {', '.join(missing)}"
            (errors if args.strict else warnings).append(msg)
        extra = sorted(have - want)
        if extra:
            warnings.append(f"[{cid}] expressions not in the registry: "
                            f"{', '.join(extra)}")

    for e in errors:
        print(f"ERROR   {e}")
    for w in warnings:
        print(f"WARN    {w}")
    for n in notes:
        print(f"note    {n}")

    total = len([p for p in pngs if "_wip" not in p.parts])
    print(f"\n{total} asset(s) checked, {len(errors)} error(s), "
          f"{len(warnings)} warning(s).")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
