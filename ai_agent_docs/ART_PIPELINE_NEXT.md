# Next art pipeline

> **Character art is now governed by the `seirin-character-art` Agent Skill**
> (`ai_agent_docs/skills/seirin-character-art/`). That skill supersedes this
> file for characters: cast registry, per-character prompt cards, sprite spec
> (canvas / locked face box / naming), iteration loop and validators. The notes
> below remain accurate for the conventions they describe and for CGs.

## Current production direction

### Consistency sheets
- Use a **complex in-world background** for mannequin, turnaround, and other consistency sheets — the environment anchors identity. (The flat-green variant is retired: alpha is never keyed off a colour, it is triangulated from the white/black plate pair.)
- Do not remove the background from sheet-level sources. Sheets save as `<id>_reference.png` / `<id>_reference_sheet.png`, never as sprites.
- Sheets are references for identity, pose, scale, and cross-view consistency; they are not final runtime sprites.
- Generate the complete clothed character when that is more reliable than generating isolated wardrobe pieces.
- Runtime-separated pieces may still be authored manually where needed. For Lyra, planned independent pieces include boots, dress, nimbus, and hair.

### Final individual sprites
1. Approve and slice the individual sprite from the consistency work.
2. Upscale the individual sprite.
3. Only after the final upscale, produce the exactly registered white and black plates.
4. Triangulate those final plates to recover alpha.
5. Check the result over both white and black before runtime integration.

White/black variants are final-matting assets, not consistency-generation backgrounds.

### CGs
- CGs are complete story illustrations containing characters acting in a location.
- They are not empty backgrounds and do not need sprite-style alpha extraction.
- Preserve character identity and wardrobe from the sprite references.
- Prefer a readable cinematic action tied to a precise story beat.
- Keep CGs 16:9 and free of dialogue UI, labels, and watermarks.

## Current CG set
- `public/generated/cgs/cg_atrium_null_bloom.png`
  - Eira examines the collapsed councilor while Lyra and Noa react in the glass atrium.
- `public/generated/cgs/cg_archive_counter_key.png`
  - Mirei opens the hidden archive tablet with Aster's invitation in the foreground.
- `public/generated/cgs/cg_clinic_halo_injector.png`
  - Eira uses the contraband halo injector on the wounded witness.
- `public/generated/cgs/cg_cathedral_expose.png`
  - The four heroines coordinate the expose-ending attack on the cathedral network.

All four are registered in `src/content/story-data.ts` and inserted at their matching story beats.

## Final-matting tools

The generators in use (Nano-Banana class) cannot output alpha; alpha is
recovered from a white plate and a black plate. The difference between the two
plates *is* the alpha, so the plates must composite the figure honestly over
each background rather than paste it opaquely onto both.

- `tools/triangulate_matte.py` — white + black pair -> RGBA (+ optional alpha map)
- `tools/resize_and_triangulate.py` — aligns plate sizes, then runs the two above
- `tools/triangulate_sheet_extract.py` — same, for a sheet, sliced into named sprites
- `tools/check_matte.py` — verify a matte over non-white/black backgrounds;
  `--report` flags flattened plates, binary alpha and edge contamination
- `tools/composite_over.py` — composite a sprite onto a background image

Naming: reference sheets, cards and runtime sprites carry distinct suffixes
(`<id>_reference_sheet.png` / `<id>_card.png` / `<id>_normal.png`) — the
taxonomy and the "sprites only in `game/assets/characters/`" rule live in
`ai_agent_docs/skills/seirin-character-art/references/sprite-spec.md`.

(`apply_mask.py` was listed here historically but never existed in this repo.)

## Lyra consistency note
In side view, the front dress panel must remain visibly in front rather than moving behind the body silhouette.
