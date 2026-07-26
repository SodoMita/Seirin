# Ren Akatsuki — art brief

`id: ren` · iron_requiem · SSR · density 9/10 · appeal track **cool_kid**

> Grease-stained prodigy who would rather be right than safe.

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
| **Age / proportions** | 17 — age-accurate teenage proportions, 6.5 heads |
| **Role** | mechanic apprentice, Scrap-Titan operator under adult supervision |
| **Memory point** | The asymmetric welding visor pushed up into her hair like a crown, one cracked lens still glowing amber. |
| **Secondary hook** | Mismatched gloves - left is a heavy insulated gauntlet, right is bare to the knuckle for fine work. |
| **Silhouette class** | top-heavy triangle |
| **Shape language** | circle 15% / square 30% / triangle 55% |

**Silhouette masses** (Big:Mid:Small ≈ 6:3:1)

- **Big** — flared open coverall tied at the waist, sleeves knotted - a wide inverted delta across the shoulders
- **Mid** — spiky shoulder-length hair with a long single tail whipping right; the gauntlet mass on the left
- **Small** — clipped tools, cable ties, a single earring nut
- **Negative space to protect** — clear gap between the knotted sleeves and the hips; open triangle between arm and torso when hand is on hip
- **Black-fill read** — reads instantly by the visor-crown notch plus the one-sided gauntlet bulk

**Palette — 60-30-10.** Accent is reserved for the memory point and the eyes.

| slot | colour | hex |
|---|---|---|
| 60% dominant | oil-slate coverall | `#3A4A52` |
| 30% secondary | signal-orange hair | `#D9531E` |
| 10% accent | hazard yellow strap | `#F2C230` |
| skin | | `#F2CDB0` |
| eyes | | `#2FBF9B` |
| shadow tint | | `#2A3A55` |

> warm-dominant with a cool ground; the teal eye is the only cool accent on the head, so the gaze wins the face

**Symbol set** — copy literally into any prompt; paraphrasing starts drift.

- **Eyes** — large, outer-upper corner sharp, iris tall - awake and combative
- **Brows** — thick, short, low - stubborn
- **Mouth** — wide, expressive, canine tooth visible on grin
- **Face shape** — soft jaw, pointed chin - still a teenager
- **Hair** — layered chopped bob with one long asymmetric tail, singed tips
- **Build** — wiry athletic, broad shoulders for her height, visible forearm definition

**Wardrobe**

- default — Grey-slate mechanic coverall unzipped to the waist with sleeves tied off, orange thermal undershirt, hazard-yellow tool harness, one insulated gauntlet, steel-toe boots with mismatched laces
- alt — Off-shift: oversized orange thermal, cargo shorts, the visor still on her head
- props — cracked amber welding visor, impact driver holstered at the thigh, grease rag through the belt loop

**Shared style bible** (applies to every stage)

- Render — modern anime key-visual illustration, clean confident linework with tapered weight, cel shading plus one soft gradient pass, restrained rim light, subsurface warmth on skin
- Line — dark chromatic outline (never pure black): outline hue is the local colour shifted toward the character's shadow_hue
- Eyes — high-gloss gacha eye: 3 layers minimum - gradient iris (dark rim, bright lower half), sharp specular highlight upper, soft bounce light lower, plus a faint colour-echo of the accent colour in the lower iris
- Density — detail is spent on the head and the memory_point, thinned toward the extremities; never uniform detail

### Never — hard filter

Carry every item into the exclusion section of every prompt for this
character, plus the global forbidden list.

- clean clothing
- generic wrench
- pigtails
- any depiction implying combat piloting
- any sexualised framing, pose, camera angle, or revealing costume

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
character: ren
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/ren/prompts/NN_turnaround.txt
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

**Pose.** weight on back foot, arms crossed low, chin slightly down, looking up through her lashes - defensive but ready

**Handoff — prompt agent fills this in**

```yaml
stage: sprite
character: ren
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/ren/prompts/NN_sprite.txt
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

- `smug-sideways`
- `exhausted`
- `furious-shout`

**Handoff — prompt agent fills this in**

```yaml
stage: expressions
character: ren
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/ren/prompts/NN_expressions.txt
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

**Pose.** three-quarter turn away with head snapped back toward camera, gauntlet hand raised holding the impact driver, coat-tails of the coverall flaring

**Handoff — prompt agent fills this in**

```yaml
stage: hero
character: ren
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/ren/prompts/NN_hero.txt
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
character: ren
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/ren/prompts/NN_chibi.txt
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
  characters/_wip/ren_white.png \
  characters/_wip/ren_black.png \
  characters/ren/ren_default_neutral.png \
  --alpha-out characters/_wip/ren_alpha.png

python3 tools/check_matte.py characters/ren/ren_default_neutral.png --report
python3 tools/check_matte.py characters/ren/ren_default_neutral.png --checks --out /tmp/ren_check.png
```

Verify over backgrounds that are neither white nor black — those two are the
inputs, so the sprite always looks correct over them.

**Handoff — prompt agent fills this in**

```yaml
stage: matte
character: ren
reference_image: <path to previous approved asset, or none for turnaround>
prompt: |
  <TO BE WRITTEN — assemble from the design card above using the
   seven-section grammar in ../references/prompt-grammar.md:
   FORMAT · STYLE · IDENTITY · WARDROBE · COLOR · STAGING · EXCLUDE>
negative_or_exclude: |
  <TO BE WRITTEN — every 'Never' item above + the global forbidden list>
saved_to: characters/ren/prompts/NN_matte.txt
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

