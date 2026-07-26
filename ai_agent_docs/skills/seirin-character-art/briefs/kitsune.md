# Kitsune Yubikiri — art brief

`id: kitsune` · tsukimachi · SSR · density 10/10 · appeal track **hero_glamour**

> Nine tails of borrowed light and one very real address book.

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
| **Age / proportions** | 24 — adult, 7 heads |
| **Role** | teahouse heir, community network hub, streamer, safehouse keeper |
| **Memory point** | Nine articulated 'tails' - slim carbon booms tipped with warm-white LED panels and tiny cameras - that fan out behind her like a peacock rig and fold into a single bustle when off. |
| **Secondary hook** | A fox half-mask worn pushed up on the side of her head, never over the face. |
| **Silhouette class** | fanned peacock |
| **Shape language** | circle 30% / square 20% / triangle 50% |

**Silhouette masses** (Big:Mid:Small ≈ 6:3:1)

- **Big** — the nine-boom tail fan, asymmetrically weighted to her right
- **Mid** — a short kimono-cut jacket over a fitted bodysuit, wide obi-style belt
- **Small** — cable runs, lens glints, bell charms, a row of small ring lights
- **Negative space to protect** — the gaps between the booms are the whole point - the fan must read as separated rays, never a solid disc
- **Black-fill read** — the only radial silhouette in the cast

**Palette — 60-30-10.** Accent is reserved for the memory point and the eyes.

| slot | colour | hex |
|---|---|---|
| 60% dominant | lacquer chestnut | `#5A2E24` |
| 30% secondary | paper cream | `#F2EAD8` |
| 10% accent | teahouse gold | `#C9A227` |
| skin | | `#F7D9BE` |
| eyes | | `#C9A227` |
| shadow tint | | `#2E1B14` |

> warm throughout; the LED panels are the only cool light source and they are practical lights, so they colour-contaminate her outline in cool white

**Symbol set** — copy literally into any prompt; paraphrasing starts drift.

- **Eyes** — long, upswept outer corner, half-lidded confident; heavy lower lash
- **Brows** — arched, thin, expressive
- **Mouth** — wide, one-corner smirk as default
- **Face shape** — defined adult oval, visible cheekbone
- **Hair** — long copper-brown, high side-gathered tail with a gold cord, two long face-framing strands
- **Build** — tall adult hourglass; the bodysuit is a technical performance garment - high neck, long sleeves, and the glamour reads through posture and the tail rig, not exposure

**Wardrobe**

- default — Short lacquer-red kimono jacket with rolled sleeves over a charcoal technical bodysuit, wide gold obi-belt housing the tail rig battery, tall split-toe boots
- alt — Teahouse service: full plain kimono, rig off and folded, apron
- props — fox half-mask, nine-boom LED and camera tail rig, a cheap dented phone with a cracked screen, tea tray

**Shared style bible** (applies to every stage)

- Render — modern anime key-visual illustration, clean confident linework with tapered weight, cel shading plus one soft gradient pass, restrained rim light, subsurface warmth on skin
- Line — dark chromatic outline (never pure black): outline hue is the local colour shifted toward the character's shadow_hue
- Eyes — high-gloss gacha eye: 3 layers minimum - gradient iris (dark rim, bright lower half), sharp specular highlight upper, soft bounce light lower, plus a faint colour-echo of the accent colour in the lower iris
- Density — detail is spent on the head and the memory_point, thinned toward the extremities; never uniform detail

### Never — hard filter

Carry every item into the exclusion section of every prompt for this
character, plus the global forbidden list.

- real fox ears or tail
- supernatural transformation
- tails used as weapons
- nudity

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
character: kitsune
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/kitsune/prompts/NN_turnaround.txt
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

**Pose.** hip cocked, one hand on the obi, other holding the phone up at chest height, smirk

**Handoff — prompt agent fills this in**

```yaml
stage: sprite
character: kitsune
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/kitsune/prompts/NN_sprite.txt
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

- `broadcast-charm`
- `reading-the-room`
- `protective-steel`

**Handoff — prompt agent fills this in**

```yaml
stage: expressions
character: kitsune
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/kitsune/prompts/NN_expressions.txt
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

**Pose.** back three-quarter with the full nine-tail fan deployed and lit, head turned to camera over the shoulder, rain lit from behind

**Handoff — prompt agent fills this in**

```yaml
stage: hero
character: kitsune
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/kitsune/prompts/NN_hero.txt
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
character: kitsune
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/kitsune/prompts/NN_chibi.txt
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
  characters/_wip/kitsune_white.png \
  characters/_wip/kitsune_black.png \
  characters/kitsune/kitsune_default_neutral.png \
  --alpha-out characters/_wip/kitsune_alpha.png

python3 tools/check_matte.py characters/kitsune/kitsune_default_neutral.png --report
python3 tools/check_matte.py characters/kitsune/kitsune_default_neutral.png --checks --out /tmp/kitsune_check.png
```

Verify over backgrounds that are neither white nor black — those two are the
inputs, so the sprite always looks correct over them.

**Handoff — prompt agent fills this in**

```yaml
stage: matte
character: kitsune
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/kitsune/prompts/NN_matte.txt
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

