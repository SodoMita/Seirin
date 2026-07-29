# 03 — Known defects to fix next session (2026-07-29, post-review)

**⚠️ Read `HANDOFF_2026-07-29.md` in this same directory first** — it is the
up-to-date, ran-out-of-context-so-wrote-a-full-handoff summary of the whole
session (state table per character, cleanup notes, tooling usage, remaining
work). This file is the earlier defect log the handoff was written from;
kept for detail/history, but the handoff is the entry point.

User caught three real problems in the first restyle pass (commit
`e0ea244`). None of these are style disagreements — they are execution bugs.
Recording them here per OPERATIONS.md "honest reporting" before the next
image-generation budget resets.

## 1. Pipeline order was backwards (tools/flatcel_finish.sh) — FIXED IN CODE
The script matted (flood-filled transparency) at native resolution and THEN
Lanczos-upscaled the already-transparent RGBA image. `references/sprite-spec.md`
says the opposite: "Upscale to the working canvas. Matting happens after the
final upscale — upscaling a matted sprite re-introduces fringing." Verified
the predicted defect is real: `characters/ren/ren_normal_v2.png` has a visible
white halo/fringe at hair edges when composited over magenta (see
`/tmp/ren_v2_tip_zoom.png` in that session — not persisted, reproduce with
`convert characters/ren/ren_normal_v2.png -background "#FF00FF" -flatten X;
convert X -crop 150x150+950+50 -resize 900x900 Y`).

`tools/flatcel_finish.sh` has been corrected: upscale the still-fully-opaque
image first, matte (corner flood-fill) at final resolution second. This
requires **regenerating the finished PNG/WebP for every asset already
shipped in commit e0ea244** — the fix is in the tool, not retroactive on the
old outputs, because the `_wip/` source masters (gitignored, `_wip/` is not
committed) do not persist across agent sessions and were not available when
this was caught. Re-running the corrected script needs either (a) the base
restyle images regenerated fresh, or (b) sourcing from the still-opaque
`_wip/final/*.png` that fed the OLD script — also gone for the same reason.
**Action: regenerate every character's base + emotion sprites through the
fixed `flatcel_finish.sh`, not by patching pixels post-hoc.**

## 2. Aria "happy" has an extra (fourth) hand — FIXED (aria_happy_v4)
`characters/aria/aria_happy_v2.png`: the edit added a third arm/hand holding
the coat hem at hip height in addition to both hands correctly raised to the
headphones. Visible at full res, right side of the hip, holding a fold of
the trench coat that shouldn't have a hand there. Confirmed by crop (hand +
five fingers gripping fabric, disconnected from either raised arm).
**Action: regenerate `aria_happy` from the (corrected) `aria_normal_v2` base
with a stronger single-change constraint ("only two hands, both already
occupied at the headphones; no third hand appears anywhere in the image") —
per iteration.md, this is exactly the kind of generator artifact the
qa-checklist's "generator artifacts" pass exists to catch, and it was missed
before shipping.**

## 3. Reika base restyle lost real garment detail — FIXED (reika_normal_v4)
`characters/reika/reika_normal_v2.png` vs `characters/reika/reika_normal.png`:
the flat-shading pass flattened the jacket's camo/tonal fabric texture to a
single flat black, dropped a second chest pin/emblem next to the
"IRON REQUIEM" skull patch, and lost the quilted texture on the bodysuit
torso. "Flat shading" should simplify *gradient rendering*, not *erase
distinguishing silhouette/memory-point detail* — c.f. SKILL.md's own rule
"Identity before polish. A beautiful off-model sprite is a defect." This is
the closest thing to a fourth defect: an instruction-following failure
where "flat cel shading" over-triggered simplification of graphic elements
that are not shading at all (patches, camo print, stitching).
**Action: regenerate `reika_normal` with an explicit instruction to preserve
every distinct emblem/pin/texture-pattern element as flat colour shapes
(i.e., flatten the RENDERING of the camo pattern into clean flat shapes,
but do not delete the pattern or the second pin) rather than a generic
"flat shading" instruction that a generator can satisfy by deleting detail.**

## Status of shipped commit e0ea244
Not reverted — no destructive action was taken (per OPERATIONS.md, existing
assets are additive-only regardless). The v2 files stay in place as
work-in-progress until superseded by corrected regenerations under a new
`_v3` suffix (never overwrite `_v2`, per "new work gets a new filename").
`game/vendor/game.js` should be re-pointed to `_v3` sprites once they exist
and pass review; until then the v2 sprites remain wired (they are a real
quality improvement over the originals for everyone except Reika/Aria-happy,
and are not broken enough to pull without a replacement ready).

## Update 2026-07-29 (later in session) — both fixed and verified

Both defects above are now fixed and independently re-verified (crops
checked over magenta background, not just trusted from commit messages):

- **Fringing/halo (defect 1):** `characters/ren/ren_normal_v3.png` wrench-tip
  and hair edges checked at 900x900 crop over `#FF00FF` — clean edge, zero
  white halo pixels.
- **Halftone/dither alpha noise:** `ren_normal_v3.webp` alpha channel vs
  `ren_normal_v3.png` alpha channel — `compare -metric AE` = **0**, i.e. the
  WebP re-encode is bit-identical in alpha. No dither.
- **Aria extra hand (defect 2):** `aria_happy_v4.png` visually confirmed —
  exactly two hands, both at the headphones, no third hand at the hip.
- **Reika detail loss (defect 3):** `reika_normal_v4.png` visually confirmed
  — camo/tonal jacket pattern, holstered pistol, knee pads and the skull
  patch are all present again, much closer to the original's detail level
  than `reika_normal_v2/v3`.

`tools/img_pipeline/` (plain C, no ImageMagick, no GPU/GLSL — see
`upscale_filter.c`'s header comment for why the GLSL/EGL/SwiftShader route
was abandoned) is now the canonical finishing pipeline. `tools/
flatcel_finish.sh` is superseded and should not be used for new work; it is
kept only as a record, not deleted (OPERATIONS.md: never destroy existing
work).

Still outstanding for a future session: whole-body happy/sad emotion sprites
for kitsune, yuki, lumina, momo, saya (ren, kaito, aria, nao already have
them). Aria has no `engine.characters` entry in `game/vendor/game.js` yet —
her sprites exist and are finished but unwired; decide whether to add her as
a speaking character or leave art-only.
