# QA checklist

Run before committing any character asset. Automated checks first (they cost
nothing), then the eye passes.

## Automated

```bash
python3 tools/check_matte.py <sprite> --report          # matted sprites only
python3 tools/check_matte.py <sprite> --checks --out /tmp/check.png
```

Everything else below is an eye pass. If an asset fails, record the failure in
`characters/<id>/prompts/NN_<stage>.result.md` before regenerating — see
`iteration.md`.

## Silhouette test — the gate

Fill the figure 100% black and look at it small.

- [ ] Nameable without colour or detail.
- [ ] `silhouette.class` from the registry is what you actually see.
- [ ] The `negative_space` holes are open and readable.
- [ ] Big/Mid/Small masses read at roughly 6:3:1, not evenly.
- [ ] Distinguishable from every other cast member in black fill.

**A design that fails this does not proceed.** Rendering will not save it.
A bodiless character (drone swarm, projection) may be a documented
exception — if the exception is written down.

## Thumbnail test

Downscale to 64px and 128px.

- [ ] Still identifiable at 64px.
- [ ] The memory point still reads, or its shape does.
- [ ] Doesn't turn to mush — if it does, detail is spread too evenly.
- [ ] In greyscale, distinct from every other character.

## Identity and canon

- [ ] Memory point present, correct and unobstructed.
- [ ] Secondary hook present but not competing for first read.
- [ ] Symbol set matches the registry — eye shape, brow, mouth, contour, hair,
      body. This is where off-model drift shows first.
- [ ] Zone colours match the approved answers (Head, Skin, Eye, Tops1/2,
      Waist, Bottom1/2, Shoes, Decoration1/2).
- [ ] Head reads as 3 colours; body 8 or fewer, unless extra complexity was
      explicitly justified.
- [ ] The declared main colour is the one that actually reads as "theirs".
- [ ] The reserved colour appears only where it is meant to.
- [ ] Checked at full sprite size, not as swatches — large areas shift in
      apparent brightness (area effect).
- [ ] Placed beside the rest of the cast, this character separates in hue AND
      in greyscale.
- [ ] Head ratio matches the answered height/ratio for this character.
- [ ] Wardrobe and props match the record.
- [ ] Nothing from the character's `banned` array is present.
- [ ] Faction palette respected; character reads against her usual environment.

## Cross-asset consistency

Lay every asset for one character side by side.

- [ ] Same face. Print two heads at the same size and flip between them — drift
      is obvious in alternation and invisible side by side.
- [ ] Same costume details, same count of buttons/straps/tails.
- [ ] Same colours (sample the hexes; do not trust your eye).
- [ ] Memory point identical in every asset.
- [ ] Scale correct against the sprite-spec height table.

## Expression differentials

- [ ] All eight core expressions present, plus any character-specific extras.
- [ ] Head has not moved, rotated or scaled — flip between them and watch for
      jitter. Any movement is a defect.
- [ ] Only pixels inside the locked face box changed.
- [ ] Each expression follows the registry's brow/eye/mouth geometry.
- [ ] `neutral` reads pleasant and alert, not blank or sullen.
- [ ] Each expression still reads as *this character*, not a generic mood.

## Technical

- [ ] Correct canvas size per `references/sprite-spec.md`.
- [ ] Straight (unpremultiplied) alpha. Verify with
      `python3 tools/check_matte.py <sprite> --checks --out check.png` and
      inspect over mid-grey, magenta and green — **not** over white or black,
      which are the triangulation inputs and always look correct.
- [ ] `python3 tools/check_matte.py <sprite> --report` is clean: some fully
      clear area, real partial alpha at the edges, and soft-edge colour close
      to the body colour. "No soft edges" means the plates were flattened;
      strong edge drift means background contamination.
- [ ] Feet on the bottom edge, head upright, figure horizontally centred.
- [ ] No baked ground shadow, no background remnant, no green spill from a
      sheet.
- [ ] Filename follows the convention; ASCII, lowercase, underscores.
- [ ] No text, watermark, signature, logo, UI, border or colour chart anywhere.

## Generator artifacts

The failure modes that survive a casual look:

- [ ] Hands — correct finger count, no fusion, no extra thumb.
- [ ] Eyes — same size, same height, same iris size, highlights consistent
      between them (unless asymmetry or perfect symmetry is a stated design answer).
- [ ] Accessories attached to something; nothing floating.
- [ ] Straps, cables and chains continuous — they enter and exit plausibly.
- [ ] Symmetric garment elements actually symmetric.
- [ ] Costume seams and trim lines continuous around the body.
- [ ] No melted, duplicated or half-dissolved objects.
- [ ] Text-like marks removed — generators love to invent pseudo-text on badges.

## Safety pass — blocking

- [ ] Every character under 18: full costume
      coverage, age-accurate proportions, no body-emphasising camera angle,
      no romantic or sexual framing, nothing in the pose or expression that
      reads as suggestive.
- [ ] Any real medical condition reads as texture and dignity, not wounds,
      gore or horror.
- [ ] Scars and marks that belong to a character are present and unminimised.
- [ ] No real supernatural effect anywhere.
- [ ] No safety-coded prop used as a weapon.

**Any failure here blocks the commit.** See `references/appeal-and-safety.md`.

## Ship

```bash
./tools/archive_and_commit_assets.sh "character sprites: <what changed>"
```

Approved assets only. WIP stays in `characters/_wip/` and is not committed.
