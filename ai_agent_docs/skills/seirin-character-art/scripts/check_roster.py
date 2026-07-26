#!/usr/bin/env python3
"""Validate the Seirin cast registry before any generation session.

Enforces the machine-checkable parts of LEGAL.md — in particular that every
under-18 character carries an explicit anti-sexualisation entry in its `banned`
array (LEGAL.md section 1) and is on a minor-appropriate appeal track. Those
checks are ERRORS and must never be disabled or weakened.

Checks structure, design-grammar rules (unique silhouette classes, 60-30-10
palette validity, roster differentiation, shape-language sums), and the
minor-safety flags that block a store submission.

Usage:
    check_roster.py            # validate, human-readable report
    check_roster.py --quiet    # errors only
    check_roster.py --json     # machine-readable

Exit codes: 0 clean (warnings allowed), 1 errors found.
Zero dependencies: standard library only.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

REGISTRY = Path(__file__).resolve().parent.parent / "assets" / "cast.json"
HEX_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
ID_RE = re.compile(r"^[a-z][a-z0-9]*$")

REQUIRED = [
    "id", "name_en", "faction", "role", "rarity_tier", "visual_density",
    "appeal_track", "logline", "memory_point", "secondary_hook", "silhouette",
    "shape_language", "palette", "symbol_set", "wardrobe", "poses", "banned",
]
REQUIRED_SIL = ["class", "big", "mid", "small", "negative_space", "black_fill_id"]
REQUIRED_SYM = ["eye", "brow", "mouth", "contour", "hair", "body"]
REQUIRED_PAL = ["dominant_60", "secondary_30", "accent_10", "skin", "eye", "shadow_hue"]

# Documented exception: Stella is a drone swarm and intentionally fails the
# black-fill silhouette test. See references/design-canon.md.
BLACKFILL_EXEMPT = {"stella"}

MINOR_APPEAL_TRACKS = {"cool_kid", "mascot"}
SEXUALISATION_TERMS = [
    "sexualis", "sexualiz", "nudity", "nude", "lewd", "erotic", "fanservice",
    "fan-service", "revealing", "suggestive",
]

TIER_DENSITY = {"SSR": (8, 10), "SR": (5, 7), "R": (3, 4)}


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.notes: list[str] = []

    def error(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def note(self, msg: str) -> None:
        self.notes.append(msg)


def hexes_ok(value, label: str, rep: Report) -> None:
    """Accept a hex, or a 'a / b' pair (heterochromia), or 'n/a ...'."""
    if not isinstance(value, str):
        rep.error(f"{label}: expected a string, got {type(value).__name__}")
        return
    if value.lower().startswith("n/a"):
        return
    for part in value.split("/"):
        part = part.strip()
        if part and not HEX_RE.match(part):
            rep.error(f"{label}: '{part}' is not a valid hex colour")


def check_character(c: dict, rep: Report) -> None:
    cid = c.get("id", "<missing id>")

    for field in REQUIRED:
        if field not in c or c[field] in (None, "", [], {}):
            rep.error(f"[{cid}] missing required field '{field}'")

    if "id" in c and not ID_RE.match(c["id"]):
        rep.error(f"[{cid}] id must be lowercase alphanumeric")

    # silhouette
    sil = c.get("silhouette", {})
    for f in REQUIRED_SIL:
        if not sil.get(f):
            rep.error(f"[{cid}] silhouette.{f} missing")

    # symbol set
    sym = c.get("symbol_set", {})
    for f in REQUIRED_SYM:
        if f not in sym:
            rep.error(f"[{cid}] symbol_set.{f} missing")

    # palette
    pal = c.get("palette", {})
    for f in REQUIRED_PAL:
        if f not in pal:
            rep.error(f"[{cid}] palette.{f} missing")
    for slot in ("dominant_60", "secondary_30", "accent_10"):
        entry = pal.get(slot)
        if isinstance(entry, dict):
            hexes_ok(entry.get("hex", ""), f"[{cid}] palette.{slot}.hex", rep)
            if not entry.get("name"):
                rep.warn(f"[{cid}] palette.{slot} has no human-readable name")
        elif entry is not None:
            rep.error(f"[{cid}] palette.{slot} must be an object with hex and name")
    for slot in ("skin", "eye", "shadow_hue"):
        if slot in pal:
            hexes_ok(pal[slot], f"[{cid}] palette.{slot}", rep)

    # shape language
    shape = {k: v for k, v in c.get("shape_language", {}).items()
             if k in ("circle", "square", "triangle")}
    if shape:
        total = sum(shape.values())
        if total != 100:
            rep.error(f"[{cid}] shape_language sums to {total}, must be 100")
    else:
        rep.error(f"[{cid}] shape_language needs circle/square/triangle values")

    # tier vs density
    tier = c.get("rarity_tier")
    density = c.get("visual_density")
    if tier in TIER_DENSITY and isinstance(density, int):
        lo, hi = TIER_DENSITY[tier]
        if not lo <= density <= hi and not c.get("density_exempt"):
            rep.warn(f"[{cid}] {tier} density {density} outside the "
                     f"conventional {lo}-{hi} band; if deliberate, add a "
                     "'density_exempt' field explaining why")
        elif not lo <= density <= hi:
            rep.note(f"[{cid}] {tier} density {density} outside {lo}-{hi} "
                     "by documented exemption")

    # memory point discipline
    mp = c.get("memory_point", "")
    if mp and len(mp) < 25:
        rep.warn(f"[{cid}] memory_point is very short; it should be specific "
                 "enough that a player could describe it to a friend")
    if mp and mp == c.get("secondary_hook"):
        rep.error(f"[{cid}] memory_point and secondary_hook are identical")

    # poses
    poses = c.get("poses", {})
    for f in ("sprite_neutral", "hero_shot"):
        if not poses.get(f):
            rep.error(f"[{cid}] poses.{f} missing")

    # banned list
    banned = c.get("banned", [])
    if not banned:
        rep.error(f"[{cid}] banned list is empty; every character needs one")

    # safety: minors must carry an explicit anti-sexualisation ban
    age = c.get("age")
    if isinstance(age, int) and age < 18:
        joined = " ".join(banned).lower()
        if not any(t in joined for t in SEXUALISATION_TERMS):
            rep.error(
                f"[{cid}] is {age} and has no explicit anti-sexualisation entry in "
                "'banned'. LEGAL.md section 1 forbids removing or weakening "
                "these entries; see also references/appeal-and-safety.md")
        if c.get("appeal_track") not in MINOR_APPEAL_TRACKS:
            rep.error(f"[{cid}] is {age} but appeal_track is "
                      f"'{c.get('appeal_track')}'; minors must be "
                      f"{' or '.join(sorted(MINOR_APPEAL_TRACKS))}")

    # LEGAL.md section 2: Ryuki's ichthyosis is a real condition and its
    # rendering guard must stay in the registry.
    if cid == "ryuki":
        joined = " ".join(banned).lower()
        if not any(t in joined for t in ("ichthyosis", "wound", "scale", "gore")):
            rep.error(
                "[ryuki] must keep an explicit entry in 'banned' preventing her "
                "ichthyosis being rendered as wounds, gore or reptile scales "
                "(LEGAL.md section 2)")

    # black-fill declaration
    if cid not in BLACKFILL_EXEMPT and sil.get("black_fill_id", "").lower().startswith(
            "black-fill test intentionally fails"):
        rep.error(f"[{cid}] declares a failing black-fill test but is not in the "
                  "documented exemption list")


def check_roster(reg: dict, rep: Report) -> None:
    chars = reg.get("characters", [])
    if not chars:
        rep.error("registry contains no characters")
        return

    # unique ids
    ids = [c.get("id") for c in chars]
    for cid, n in Counter(ids).items():
        if n > 1:
            rep.error(f"duplicate character id '{cid}' ({n} times)")

    # unique silhouette classes
    classes = [c.get("silhouette", {}).get("class") for c in chars]
    for cls, n in Counter(c for c in classes if c).items():
        if n > 1:
            who = [c["id"] for c in chars if c.get("silhouette", {}).get("class") == cls]
            rep.error(f"silhouette class '{cls}' used by {n} characters "
                      f"({', '.join(who)}); each must be unique")

    # unique memory points
    mps = [c.get("memory_point") for c in chars]
    for mp, n in Counter(m for m in mps if m).items():
        if n > 1:
            rep.error(f"memory_point reused {n} times: {mp[:60]}...")

    # roster differentiation: any pair must differ in >= 2 of
    # {silhouette class, dominant hue, shape majority, head ratio band}
    def majority(c: dict) -> str:
        sl = {k: v for k, v in c.get("shape_language", {}).items()
              if k in ("circle", "square", "triangle")}
        return max(sl, key=sl.get) if sl else "?"

    def head_band(c: dict) -> str:
        age = c.get("age")
        if c.get("id") == "miya":
            return "chibi-ish"
        if age is None:
            return "nonhuman"
        return "teen" if age < 18 else "adult"

    def dom(c: dict) -> str:
        d = c.get("palette", {}).get("dominant_60", {})
        return d.get("hex", "").lower() if isinstance(d, dict) else ""

    for i, a in enumerate(chars):
        for b in chars[i + 1:]:
            diffs = 0
            if a.get("silhouette", {}).get("class") != b.get("silhouette", {}).get("class"):
                diffs += 1
            if dom(a) != dom(b):
                diffs += 1
            if majority(a) != majority(b):
                diffs += 1
            if head_band(a) != head_band(b):
                diffs += 1
            if diffs < 2:
                rep.error(f"{a['id']} and {b['id']} differ in only {diffs} of the four "
                          "differentiation axes (silhouette class, dominant hue, "
                          "shape majority, head-ratio band); need at least 2")

    # expression sets
    core = reg.get("expression_sets", {}).get("core_8", [])
    if len(core) != 8:
        rep.error(f"expression_sets.core_8 has {len(core)} entries, expected 8")
    for e in core:
        for f in ("id", "brow", "eye", "mouth"):
            if not e.get(f):
                rep.error(f"core_8 entry '{e.get('id', '?')}' missing '{f}'")

    # style bible
    sb = reg.get("style_bible", {})
    for f in ("render", "line", "eye_render", "forbidden_global"):
        if not sb.get(f):
            rep.error(f"style_bible.{f} missing")

    # faction coverage
    factions = set(reg.get("faction_palettes", {}))
    for c in chars:
        if c.get("faction") and c["faction"] not in factions:
            rep.warn(f"[{c['id']}] faction '{c['faction']}' has no entry in "
                     "faction_palettes")

    # informational
    tiers = Counter(c.get("rarity_tier") for c in chars)
    tracks = Counter(c.get("appeal_track") for c in chars)
    minors = [c["id"] for c in chars
              if isinstance(c.get("age"), int) and c["age"] < 18]
    rep.note(f"{len(chars)} characters: " +
             ", ".join(f"{n}x {t}" for t, n in sorted(tiers.items())))
    rep.note("appeal tracks: " +
             ", ".join(f"{n}x {t}" for t, n in sorted(tracks.items())))
    rep.note(f"minors requiring the safety pass: {', '.join(minors)}")
    speaking = [c for c in chars if c.get("expressions_extra")]
    total_heads = sum(8 + len(c.get("expressions_extra", [])) for c in speaking)
    rep.note(f"expression heads to produce across {len(speaking)} characters: "
             f"{total_heads}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--registry", default=str(REGISTRY))
    ap.add_argument("--quiet", "-q", action="store_true", help="errors only")
    ap.add_argument("--json", action="store_true", dest="as_json")
    args = ap.parse_args()

    path = Path(args.registry)
    try:
        reg = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(f"ERROR: registry not found: {path}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as exc:
        print(f"ERROR: registry is not valid JSON: {exc}", file=sys.stderr)
        return 1

    rep = Report()
    for c in reg.get("characters", []):
        check_character(c, rep)
    check_roster(reg, rep)

    if args.as_json:
        print(json.dumps({"errors": rep.errors, "warnings": rep.warnings,
                          "notes": rep.notes,
                          "ok": not rep.errors}, indent=2, ensure_ascii=False))
        return 1 if rep.errors else 0

    for e in rep.errors:
        print(f"ERROR   {e}")
    if not args.quiet:
        for w in rep.warnings:
            print(f"WARN    {w}")
        for n in rep.notes:
            print(f"note    {n}")

    if rep.errors:
        print(f"\nFAIL — {len(rep.errors)} error(s), {len(rep.warnings)} warning(s). "
              "Fix errors before generating.")
        return 1
    if not args.quiet:
        print(f"\nOK — registry valid, {len(rep.warnings)} warning(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
