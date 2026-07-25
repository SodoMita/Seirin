# Next art pipeline

## Current production direction

### Consistency sheets
- Use a **green background** for mannequin, turnaround, and other consistency sheets.
- Do not remove the background from sheet-level sources.
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
- `tools/triangulate_matte.py`
- `tools/apply_mask.py`
- `tools/composite_over.py`

## Lyra consistency note
In side view, the front dress panel must remain visibly in front rather than moving behind the body silhouette.
