# 02 — Flat-shading restyle, straight portrait (reika), 2026-07-29

## Base restyle — `_wip/reika_normal_v2_flatshade_straight.png` (ACCEPTED)
Style-transfer of `game/assets/characters/reika_normal.png` (Reika "Ironheart"
Takashiro: short dark red bob, black tactical flight jacket with red lining,
IRON REQUIEM skull patch, tactical belt, knee pads, combat boots, pilot
helmet held under arm) onto the Miya/Kurogane flat cel-shading look, with
explicit straight-pose correction (original stood at a slight 3/4 angle).
Result: fully frontal, flat-shaded, identity and helmet prop held.

Whole-body happy/sad emotion variants queued for next session (hit the
per-turn image-generation cap).

## Defect found on review (2026-07-29, post-ship)
Shipped `reika_normal_v2.png` lost real garment detail versus the original
`reika_normal.png`: the jacket's camo/tonal fabric texture was flattened to
solid black, a second chest pin/emblem next to the "IRON REQUIEM" skull patch
was dropped, and the bodysuit's quilted texture panel was lost. This is an
over-simplification bug, not a style choice — flat shading should simplify
gradient rendering, not delete distinguishing detail. **Needs regeneration**
with an explicit instruction to preserve every emblem/pin/pattern element as
flat-coloured shapes rather than erasing them. See
`../../ai_agent_docs/skills/seirin-character-art/_session_notes.md`.

## Regeneration — reika_normal_v4 (2026-07-29, fixes the defect above)
`_wip/reika_normal_v4_flatshade_detailed.png` ← same style references (Miya
chibi sheet, Kurogane sprite) + `reika_normal.png` as identity, but the
prompt now explicitly lists every surface detail that must survive the flat
cel-shading pass: the camo/tonal jacket print (rendered as flat colored
shapes, not deleted), the second chest pin next to the skull patch, the
bodysuit's quilted panel seams, the holstered pistol, belt pouches, knee
pads. Result: **accepted** — camo pattern, second pin, holster and knee pads
all present; upscaled via `tools/img_pipeline` (upscale_filter 4096px +
matte_floodfill) → `reika_normal_v4.png`/`.webp`, delivery WebP at
`game/assets/characters/reika_normal_v4.webp`, wired into
`game/vendor/game.js` replacing `reika_normal_v3.webp`.
