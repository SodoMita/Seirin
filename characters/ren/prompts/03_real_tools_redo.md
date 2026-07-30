# 03 — Real-tools redo (ren), 2026-07-28

## Why
The project owner rejected the v1 card + sprite tools: the belt carried
fantasy "glowing canisters" — nothing real. Requirement: **only real tools**,
in three tiers, plus real machines that belong in a mecha service garage.

## Card (new `ren_card.png`; old v1 kept as `ren_card_v1_superseded.png`)
> Anime visual novel key art portrait, Ren Akatsuki (17 years old), handsome
> young male mechanic apprentice, dark short hair, fierce amber eyes, wearing
> a dark mechanic jumpsuit with red piping, holding a steel combination
> wrench, tired but determined brave expression; on his belt: cordless impact
> wrench in a holster, rugged diagnostic tablet, tool roll with sockets;
> background: a real mecha service bay — heavy-duty lift platform carrying a
> bipedal mecha leg actuator, gantry crane beam overhead, red rolling tool
> cabinets, coiled pneumatic air hoses, workbench with a bench vise, engine
> hoist, parts shelves with servo motors

Tool tiers as drawn:
- **Ordinary hand tools**: combination wrench (in hand), socket set in the
  belt tool roll, bench vise.
- **Automatic / powered**: cordless impact wrench (holstered), pneumatic
  air-line hoses, robotic arm manipulator, engine hoist.
- **High-tech**: rugged diagnostic tablet showing the mecha wireframe, plus
  holographic repair-mode displays (SP-DRAGON V8, tactical armor layout).
- **Machines**: lift platform with a mecha leg actuator, gantry crane beam,
  rolling tool cabinets, engine hoist, parts shelving.

## Plates — `plates/ren_white.png` / `plates/ren_black.png`
White plate prompt mirrors the card kit (tool roll + impact wrench +
diagnostic tablet + combination wrench — no glowing canisters).
Black plate: first attempt came back near-white (plate failure mode);
regenerated with the "replace the entire background" phrasing. It still
tinted green (bg ≈ [4,5,1]) — **plates normalized with the new
`tools/normalize_plates.py`** (clamps haze/tinted plate backgrounds to exact
#FFFFFF / #000000 before triangulation; without it the matte reports
"almost nothing is transparent").

## Matte
`resize_and_triangulate.py` → 16.4→8.0% opaque / 66% clear, no WARN.
Visual: clean over white/black/grey/magenta. Installed as `ren_normal.png`
(characters + game assets).
