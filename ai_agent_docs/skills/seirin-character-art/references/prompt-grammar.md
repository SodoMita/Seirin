# Prompt grammar — natural-language image editors

Tuned for Seedream / Nano-Banana / Krea-class models: they read **prose**, not
Danbooru tag soup, and they respond to structure and repetition. Tag-style
prompts with heavy negative blocks (SD/Flux idiom) underperform here.

**This file is the prompt agent's spec.** Each character's brief in
`briefs/<id>.md` supplies the content — design card, per-stage requirements,
exclusions — and leaves the wording to you. Assemble it with the grammar below.

## The seven sections

Always in this order. The model weights early tokens more heavily, so identity
comes before staging and exclusions come last.

```
[1 FORMAT]     what kind of asset, canvas aspect, background
[2 STYLE]      render style, line, eye rendering
[3 IDENTITY]   name, age band, silhouette class, symbol set, hair, body
[4 WARDROBE]   garments, props, memory point named as the focus
[5 COLOR]      60-30-10 with hex, skin, eye, shadow hue, light direction
[6 STAGING]    pose, camera, expression, framing, anchor
[7 EXCLUDE]    global forbidden list + this character's banned array
```

## Rules that repeatedly decide the result

1. **State the memory point twice** — once in IDENTITY, once in STAGING as the
   focal point. Mentioned once, it gets dropped roughly half the time.
2. **Positive phrasing beats negation.** These models are weak at "no X".
   - Weak: `no legs, no feet`
   - Strong: `her lower body dissolves below the knee into three separate
     falling streams of water that trail into the air`
   Keep section 7, but never rely on it for anything structural.
3. **Hex codes work.** Give the name and the hex: `signal-orange hair (#D9531E)`.
4. **One change per edit.** Restate everything to preserve, then the single
   change. Multi-change edits drift identity every time.
5. **Never open with a generic noun phrase.** "anime girl", "beautiful woman",
   "1girl" pull hard toward the training-set mean and erase the design. Open
   with the asset type and the character's structural class.
6. **Name the light direction explicitly** — otherwise you get flat frontal
   light that kills the silhouette.
7. **Anchor and framing must be stated** for sprites, or the figure floats and
   crops inconsistently between characters.

## Stage templates

### `turnaround` — identity lock

```
[1] Character turnaround reference sheet, four views in one row on a flat
    chroma-green field (#00B140), even neutral studio light, one shared
    horizontal height guide across all four figures: front, three-quarter,
    side, and back.
[2] <style_bible.render>. <style_bible.line>. <style_bible.eye_render>.
[3] <name>, <age band>. Overall silhouette is a <silhouette.class>:
    <silhouette.big>. <symbol_set.eye/brow/mouth/contour/hair/body>.
    Head ratio <n>. The single defining feature is <memory_point>.
[4] Wearing <wardrobe.default>. Carrying <props>.
[5] <dominant_60> across roughly 60% ... <secondary_30> ... <accent_10>
    reserved for <memory_point> and the eyes. Skin <hex>. Eyes <hex>.
    Shadows tinted <hex>.
[6] Relaxed neutral A-pose, arms slightly away from the body so the silhouette
    reads clearly. Identical proportions, costume and colour in all four views.
    The <memory_point> is clearly visible in every view.
[7] <forbidden_global>. <banned>.
```

Green field because `#00B140` appears in no character's palette, so it never
contaminates the design. Do not remove the background from sheets.

### `sprite` — runtime standing pose

Pass the approved turnaround in as a reference image.

```
[1] Full-body character sprite for a visual novel, single figure, tall portrait
    canvas, plain flat mid-grey background, full body from the top of the head
    to the soles of the feet with clear margin on all sides.
[2] <style>
[3] <identity, same wording as the turnaround>
[4] <wardrobe + props + memory point>
[5] <palette>. Soft key light from the upper front-left, gentle cool fill from
    the right, subtle rim light separating the figure from the background.
[6] <poses.sprite_neutral>. Neutral pleasant expression, alert and present, eyes
    to camera. Feet flat on an implied ground line at the very bottom edge.
    Head upright and centred horizontally. The <memory_point> is the focal
    point and is fully visible and unobstructed.
[7] <forbidden_global>. <banned>. No cropping of hands or feet, no ground
    shadow baked in, no background scenery.
```

Plain mid-grey, not green: grey gives cleaner edge values for the later
white/black plates. Green is only for sheets.

### `expressions` — head-only differential

Pass the **approved sprite** in. This is an edit, not a generation.

```
Edit the supplied character sprite. Preserve exactly, with no change at all:
the pose, the body, the hands, the costume, every accessory, the hair
silhouette, the colours, the lighting, the canvas size, the figure's position
and scale in the frame, and <memory_point>.

Change only the facial expression, inside the head area, to: <expression>.
Brow: <brow>. Eyes: <eye>. Mouth: <mouth>. <extra if present>

The head must not move, rotate, tilt or change size. Everything outside the
face reads as the identical image.
```

Generate all differentials **from the same approved sprite**, never in a chain
— chaining compounds drift. If a model still moves the head, generate the head
crop alone at the face-box resolution and composite.

### `hero` — the selling image

The 「キャラクターイラスト」 counterpart to the sprite's 「キャラクターデザイン」.
This is the one that has to make someone want the character.

```
[1] Character key visual illustration, tall portrait, full-colour finished
    illustration with a rendered environment.
[2] <style>, plus cinematic lighting and depth of field, background rendered
    softer than the figure.
[3] <identity>
[4] <wardrobe + props>
[5] <palette>. <light direction specific to the scene>.
[6] <poses.hero_shot>. Dynamic and readable, strong clear silhouette against
    the background, the <memory_point> catching the key light as the focal
    point of the whole image. Character occupies roughly 70% of the frame
    height, positioned on a third rather than dead centre.
[7] <forbidden_global>. <banned>.
```

Hero-shot craft that actually moves the needle:

- **Silhouette must survive the background.** Value-separate the figure from
  the environment — dark figure on light ground or the reverse. This single
  decision does more than any amount of rendering.
- **Effect layer for SSR only**: sparks, caustics, drone points, rain, fibre-
  optic glints. It must come from the character's own kit, never generic magic.
- **Face gets the cleanest light in the frame**, regardless of what the
  environment is doing.
- **One diagonal.** A single strong diagonal — a limb, a coat edge, a light
  shaft — organises the whole image. Two compete.

### `chibi` — merch and UI

```
[1] Chibi character sprite, 2-head-tall super-deformed proportions, square
    canvas, plain flat background, full figure with margin.
[2] Clean thick-outline chibi style, flat cel colour with one soft shadow tone,
    minimal internal detail.
[3] <name> reduced to essentials: <silhouette.class> reads even at this scale.
    Enormous eyes, tiny simplified body, oversized head.
[4] Simplified <wardrobe.default>: keep only the shapes that identify her.
    <memory_point> is kept at full size and detail even though everything else
    is simplified — it is the identifying feature.
[5] <palette>, flattened to the three main colours only.
[6] <a simple readable action tied to the character's personality>.
[7] <forbidden_global>. <banned>.
```

The chibi rule that matters: **simplify everything except the memory point**,
which stays full-size. That is what keeps a 2-head figure recognisable.

### `matte` — white and black plates

The generator cannot output alpha, so alpha is *measured* from two plates. The
difference between them is the alpha, which means the figure must composite
honestly over each background — not be pasted opaquely onto both.

```
Render this exact character on a pure white background (#FFFFFF).

Keep the pose, position in frame, scale, framing, lighting direction and all
colours precisely as they are — this must register pixel-for-pixel with the
other plate. Do not relight, do not restyle, do not move or resize the figure,
do not add a cast shadow, reflection, glow or vignette.

Composite the character honestly over the white: anywhere the character is not
fully opaque — soft hair edges, glass, glow, thin fabric, motion blur — the
white background must show through by the correct amount.
```

Same again for pure black (`#000000`), adding: *the character must not be
brightened or outlined to stay visible against the dark background.* Generate
the black plate as an edit of the white plate so the two register.

Then `tools/triangulate_matte.py`, then `tools/check_matte.py --checks` to
verify over backgrounds that are neither white nor black.

**Do not write "keep the character pixels byte-identical".** It reads as an
instruction to flatten the figure onto both plates, which erases the
transparency the technique exists to recover.

## Failure modes and the fix

| Symptom | Cause | Fix |
|---|---|---|
| Design drifts toward generic anime | generic opener, or paraphrased symbol set | open with asset type + silhouette class; copy `symbol_set` literally |
| Memory point missing | mentioned once | state it in IDENTITY *and* STAGING |
| Colours drift between assets | names without hexes | always give both |
| Expression differential moves the head | treated as generation, not edit | restate the full preserve-list; generate from the approved sprite, never chained |
| Sprites don't line up in engine | no anchor/framing instruction | state "feet on the bottom edge, head upright and centred" |
| Silhouette lost in hero shot | figure and background at the same value | force value separation |
| Splash comes out opaque | negation-only phrasing | describe transmission positively: "the background is clearly visible through her head, torso and arms" |
| Matted sprite is opaque where it should be transparent | plates were flattened, not composited | never ask for "identical character pixels"; ask for honest compositing over each background |
| Matted edges ghost or double | plates not registered | generate the black plate as an edit of the white plate |
| Soft edges tinted green | green sheet used as a matting background | green is for consistency sheets only; matte from white/black plates |
| Detail mush at thumbnail | density spread evenly | 6:3:1 masses; detail concentrated on head + memory point |
| Two characters look alike | shape/value convergence | check greyscale; move one per the differentiation rule |

## Editing existing assets

The repo already has usable Splash iterations in `characters/`. To bring an
existing asset up to spec, edit rather than regenerate — you keep the identity
you already paid for:

```
Edit the supplied image. Preserve the character's proportions, camera, face,
hair, colours and <memory_point> exactly. Change only <the single named thing>.
```

One change per pass. Re-derive from `cast.json` if the existing asset and the
registry disagree — the registry wins.
