# Stella — art brief

`id: stella` · akatomi · SSR · density 4/10 · appeal track **mascot**

> Beautiful conclusions that are not necessarily true.

**This is an art-direction brief, not a prompt.** It states what the
asset must be and why. Writing the actual generator prompt is the prompt
agent's job — see *Handoff* at the end of each stage. Read
`../LEGAL.md` and `../OPERATIONS.md` first (`../CONSTRAINTS.md` indexes both);
for this character the binding limits are in **Never** below.

---

## Design card — authoritative, do not paraphrase

Source of truth is `../assets/cast.json`. Change the design there, not here.

| | |
|---|---|
| **Age / proportions** | non-human, non-corporeal |
| **Role** | networked art installation: drone swarm plus projection plus generative system |
| **Memory point** | She has no body - her 'figure' is a standing human-scale outline assembled from several hundred hovering drone points, and the outline is always slightly wrong, like a constellation someone insists is a person. |
| **Secondary hook** | Where a face should be, three brighter points hold the position of two eyes and a mouth without ever forming them. |
| **Silhouette class** | dotted constellation figure |
| **Shape language** | circle 40% / square 20% / triangle 40% |

**Silhouette masses** (Big:Mid:Small ≈ 6:3:1)

- **Big** — a tall implied feminine outline made of discrete points, densest at the perimeter
- **Mid** — trailing point-streams where hair and hem would be
- **Small** — individual drone glints with tiny rotor blur
- **Negative space to protect** — she is mostly negative space by definition - the background must read clearly through her
- **Black-fill read** — black-fill test intentionally fails; she is identified by the point-cloud instead. This is the documented exception.

**Palette — 60-30-10.** Accent is reserved for the memory point and the eyes.

| slot | colour | hex |
|---|---|---|
| 60% dominant | night ground (she is mostly the sky behind her) | `#0B1026` |
| 30% secondary | cool drone point | `#7FA8FF` |
| 10% accent | warm anomaly point | `#FFD98E` |
| skin | | `n/a` |
| eyes | | `#FFFFFF` |
| shadow tint | | `#050814` |

> the warm accent points mark data the system is least confident about - a visual tell the audience can learn

**Symbol set** — copy literally into any prompt; paraphrasing starts drift.

- **Eyes** — three bright points, no geometry
- **Brows** — none
- **Mouth** — implied by point spacing
- **Face shape** — perimeter point density only
- **Hair** — trailing point-streams
- **Build** — implied human scale, 1.7m

**Wardrobe**

- default — n/a
- alt — projected onto rain, smoke, or a wet wall - the projection surface is part of the design
- props — watershed map that resolves into a constellation, rain as a projection medium

**Shared style bible** (applies to every stage)

- Render — modern anime key-visual illustration, clean confident linework with tapered weight, cel shading plus one soft gradient pass, restrained rim light, subsurface warmth on skin
- Line — dark chromatic outline (never pure black): outline hue is the local colour shifted toward the character's shadow_hue
- Eyes — high-gloss gacha eye: 3 layers minimum - gradient iris (dark rim, bright lower half), sharp specular highlight upper, soft bounce light lower, plus a faint colour-echo of the accent colour in the lower iris
- Density — detail is spent on the head and the memory_point, thinned toward the extremities; never uniform detail

### Never — hard filter

Carry every item into the exclusion section of every prompt for this
character, plus the global forbidden list.

- solid body
- anime face
- clothing
- physical contact with characters
- presentation as a ghost or spirit

Global forbidden: no watermark, no signature, no readable text, no logos, no UI, no dialogue box, no border, no colour chart, no multiple panels unless the stage explicitly asks for a sheet, no extra fingers, no fused hands, no melted jewellery, no asymmetric eye size, no floating accessories, no lens flare wash

---

## Stages

Generate in order. Each stage locks identity for the next, and each takes
the previous approved asset as a **reference image** — a prompt alone will
not hold identity across a dozen assets.

### 1. Turnaround sheet — identity lock — generate first

**Deliverable.** Four views in one row — front, three-quarter, side, back — on a
flat chroma-green field `#00B140`, one shared height guide, even neutral studio
light. 4096 x 2304.

**Why green.** It appears in no character's palette, so it cannot contaminate
the design. Sheets keep their background and are never matted.

**Must be true of the result**
- Proportions, costume, accessories and colour identical across all four views.
- The memory point is clearly visible in *every* view, including the back.
- The negative space listed above is open and reads as a hole.
- Relaxed neutral A-pose, arms held off the body so the outline is legible.
- No colour chart, no annotation text, no second character.

**Pose.** see deliverable above

**Handoff — prompt agent fills this in**

```yaml
stage: turnaround
character: stella
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/stella/prompts/NN_turnaround.txt
```

### 2. Standing sprite — the runtime asset

**Input.** The approved turnaround, passed as a reference image. Identity comes
from the image; the text only has to describe the *pose and framing*.

**Deliverable.** Single full-body figure on plain flat mid-grey, 2048 x 4096.
Mid-grey rather than green — it gives cleaner edge values for the later
white/black plates.

**Must be true of the result**
- Whole body in frame, top of head to soles of feet, clear margin all round.
- Feet flat on an implied ground line at the very bottom edge; head upright;
  figure horizontally centred. This is what makes sprites line up in-engine.
- Neutral expression that reads pleasant and alert — never blank or sullen. It
  is the most-seen frame in the game.
- The memory point is the focal point, fully visible and unobstructed.
- No baked ground shadow, no background scenery, no cropped hands or feet, no
  tilted camera.

**Pose.** standing outline, slow drift, points breathing in and out of position

**Handoff — prompt agent fills this in**

```yaml
stage: sprite
character: stella
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/stella/prompts/NN_sprite.txt
```

### 3. Expression differentials — the emotional range

**Input.** The approved *sprite*. Every differential is a separate edit **of
that same sprite** — never chain edits, chaining compounds drift.

**Deliverable.** One head per expression, changing only pixels inside the
locked face box (`references/sprite-spec.md`).

**Must be true of every result**
- The head does not move, rotate, tilt or change size. Flip between two
  differentials: any jitter is a defect.
- Everything outside the face is the identical image — pose, hands, costume,
  accessories, hair silhouette, colours, lighting, canvas, position, scale.
- The memory point is preserved untouched.
- Each expression still reads as *this character*, not a generic mood. Hold the
  character's eye style throughout.

If an expression genuinely needs motion outside the box — a sharp head turn,
hair lifting on a shout — it is not a differential. Promote it to a separate
pose variant with its own name.

**Set.** 8 core + 3 character-specific = **11 heads**.

| id | brow | eyes | mouth |
|---|---|---|---|
| `neutral` | level | default open | small closed |
| `smile` | slightly raised outer | soft arc, lower lid raised | closed upward curve |
| `grin` | raised | narrowed happy, high gloss | open, teeth visible, asymmetric corner |
| `angry` | inner-down V, hard | half-lidded, iris smaller, highlight reduced | flat downturn or open shout |
| `sad` | inner-up inverted-V | upper lid lowered, iris wet, extra bounce highlight | small wavering |
| `surprise` | high and outer-up | circular, iris shrunk, white visible around | small vertical O |
| `blush` | inner-up soft | averted gaze, half-lidded | small pressed line · _nasal-bridge blush + steam-free warm cheeks_ |
| `serious` | level and low | steady, highlight sharpened to a single point | firm flat |

Character-specific, interpret in character:

- `resolving`
- `uncertain-scatter`
- `confident-lock`

**Handoff — prompt agent fills this in**

```yaml
stage: expressions
character: stella
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/stella/prompts/NN_expressions.txt
```

### 4. Hero shot — the selling image

**Input.** The approved sprite, as identity reference.

**Deliverable.** Finished key-visual illustration with a rendered environment,
2048 x 2896 portrait. This is the image that decides whether someone wants the
character.

**Must be true of the result**
- Silhouette survives the background: force value separation, dark figure on
  light ground or the reverse. This decision does more than any rendering.
- The memory point catches the key light and is the focal point.
- The face receives the cleanest light in the frame, whatever the environment
  is doing.
- One single strong diagonal organises the composition. Two compete.
- Figure occupies ~70% of frame height, placed on a third, not dead centre.
- Background rendered softer and lower-contrast than the figure.

**Pose.** over a wet old-quarter wall after rain, the watershed map slowly turning into a constellation - the season's final image

**Handoff — prompt agent fills this in**

```yaml
stage: hero
character: stella
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/stella/prompts/NN_hero.txt
```

### 5. Chibi — merch and UI

**Deliverable.** 2-head-tall super-deformed figure, 1024 x 1024 square, plain
flat background, clean thick outline, flat cel colour with one shadow tone.

**The rule that matters.** Simplify everything *except* the memory point, which
stays full size and full detail. That is what keeps a 2-head figure
recognisable. Palette flattens to the three main colours only.

**Must be true of the result**
- The silhouette class still reads at this scale.
- A simple, readable action expressing the character's personality.
- Front-facing, centred, feet at the lower third.

**Pose.** see deliverable above

**Handoff — prompt agent fills this in**

```yaml
stage: chibi
character: stella
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/stella/prompts/NN_chibi.txt
```

### 6. Matting plates — alpha recovery

The generators in use **cannot output alpha** — and do not need to. Two plates
of the same figure, over white and over black, recover alpha *and* true colour
exactly, including partial transparency.

**The difference between the plates IS the alpha.** Where the figure is opaque
the plates agree; where it is semi-transparent they diverge, and that divergence
*is* the transparency.

**Therefore — the single most important instruction on this page.** Do **not**
ask for "identical character pixels" or "byte-identical" plates. That reads as
an instruction to flatten the figure opaquely onto both backgrounds, which
destroys the signal being measured. Verified: a true 0.05–0.95 alpha ramp comes
back as 1.00 everywhere.

- **Identical between plates:** pose, position in frame, scale, framing,
  lighting direction, colour.
- **Different between plates:** how the background reads through every
  non-opaque pixel — soft hair edges, glass, glow, thin fabric, motion blur.
- The figure must not be brightened or outlined to stay visible on black.

**Order.** Approve sprite → final upscale → white plate → black plate *as an
edit of the white plate* (so the two register) → triangulate → verify.

```bash
python3 tools/triangulate_matte.py \
  characters/_wip/stella_white.png \
  characters/_wip/stella_black.png \
  characters/stella/stella_default_neutral.png \
  --alpha-out characters/_wip/stella_alpha.png

python3 tools/check_matte.py characters/stella/stella_default_neutral.png --report
python3 tools/check_matte.py characters/stella/stella_default_neutral.png --checks --out /tmp/stella_check.png
```

Verify over backgrounds that are neither white nor black — those two are the
inputs, so the sprite always looks correct over them.

**Stella** is a drone point cloud: nearly all of her frame is background. Her
plates will differ almost everywhere and the recovered alpha will be very
sparse — the individual points and their glow. That is correct.

**Handoff — prompt agent fills this in**

```yaml
stage: matte
character: stella
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/stella/prompts/NN_matte.txt
```

---

## Iteration log

Append a row for every prompt sent. Save the exact prompt text and its
result alongside the asset — see `../references/iteration.md`. Stop rules:
3 attempts at one stage with no improvement means the design is wrong, not
the prompt; 5 total means stop and ask.

| # | date | stage | model | changed vs previous | verdict | kept |
|---|---|---|---|---|---|---|
| | | | | initial generation from this brief | | |

