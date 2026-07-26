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

⚠️ **But if the prompt is near the tool's character limit, move the exclusions
and the memory point up.** Truncation cuts from the end, and losing the EXCLUDE
block is how a banned element reaches a committed asset. Order for weighting
when you have room; order for survival when you do not.

```
[1 FORMAT]     what kind of asset, canvas aspect, background
[2 STYLE]      render style, line, eye rendering
[3 IDENTITY]   name, age band, silhouette class, symbol set, hair, body
[4 WARDROBE]   garments, props, memory point named as the focus
[5 COLOR]      zone colours with hex, main colour, shadow hue, light direction
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
3. **Hex codes work.** Give the colour name *and* the hex.
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

## Nano Banana specifics (Gemini image models)

Model-specific behaviour, gathered from practitioner reports with shown results.
Applies to Nano Banana (Gemini 2.5 Flash Image), Nano Banana Pro (Gemini 3 Pro
Image) and Nano Banana 2. Sources and confidence in `sources.md`.

### Never write "transparent" in a prompt

The model has **no alpha channel** — it outputs flat RGB. Asking for a
transparent background makes it *paint a checkerboard*: solid grey-and-white
squares imitating the Photoshop transparency grid. The community explanation is
that training on stock images and Photoshop screenshots taught it
"transparency = checkerboard". Google has confirmed transparency is
unsupported.

This is why the project mattes from white and black plates. That method is
**independently the recommended workaround**, and the reported reason matches
our own measurement: the model reproduces the subject consistently enough
between runs that the difference between plates yields true alpha. Green screen
(`#00FF00`) is the fallback, but the white/black pair gives cleaner soft edges —
which is exactly why green is reserved for consistency sheets here.

### Verbatim token reuse

Describe a character's traits in **exactly the same words every time** —
identical strings, not synonyms. Practitioners keep a text file and paste from
it. Drift is subtle at first: hair lengthens slightly, a colour shifts, and two
scenes later it is a different person. This is the single most-repeated
consistency technique, and it is why the briefs say to copy the symbol set
literally rather than paraphrasing.

### Lead with art direction, not the character

Front-load the style before naming the character. Leading with the character
description makes the model default toward semi-realistic rendering. Our
seven-section order already does this — STYLE precedes IDENTITY — and this is
independent confirmation of it.

### Film-direction language for expressions

"Reacts with exaggerated surprise, eyebrows raised, mouth open" outperforms
"surprised face", which tends to come back flat. Write expression prompts as a
director's note to an actor, and overstate slightly.

### Each edit degrades the image — so batch changes, but branch from the origin

Two findings that pull in opposite directions, and the resolution matters:

- Iterative editing **visibly degrades quality** with each pass; practitioners
  attribute this partly to watermark re-encoding. The advice is to make all
  changes in one prompt and keep the number of steps minimal.
- One change per edit is what lets you learn *which* change worked.

Resolution: **use one-change-per-edit while exploring, then apply the learned
set in a single generation from the original anchor.** Never chain edit onto
edit. When drift appears, return to the *first, best* reference — not the fifth
generation. Composite small fixes in an image editor instead of spending
another generation.

### The "unchanged image" failure

Reported at roughly 10–40% of edits: the model returns the original image with
the requested change simply not applied. Google has acknowledged it. Mitigations
that practitioners report working:

- Phrase as `"Modify this image by …"` or `"Change only [X] while keeping
  everything else identical"` rather than a bare instruction.
- Re-upload the source and start a fresh session; session state contributes.
- Treat it as a retry condition, not a prompt defect — but if the *same* edit
  fails three times, rephrase rather than retrying.

### Aspect ratio drift

Outputs drift toward 1:1 and can ignore a requested ratio. **This matters for
our 2048 × 4096 sprite canvas**, which is an extreme 1:2. Plan to generate at a
more moderate ratio and crop/composite to the sprite canvas, and verify actual
output dimensions rather than trusting the request.

### Capacity limits (Nano Banana Pro)

- Up to **14 reference images** in one prompt.
- Up to **5 characters** held consistent. Beyond that the identity mechanism
  fails and faces blend into generic or merged features.
- With 3+ characters, map them explicitly: "A on the left, B centre, C right".
- 1K / 2K / 4K output. 2K is sufficient for sheet and storyboard stages.

### The whole sheet as reference

Rather than a single portrait, pass the **entire approved turnaround sheet** as
the reference for later generations. The model then has profile and back views
in front of it and does not have to hallucinate blind spots. This is the
workflow the skill already prescribes; practitioners report it as the single
biggest consistency gain.

## Emoji in prompts — where they help and where they hurt

Two different questions, with two different answers. Getting them confused
produces worse art.

### Character budget — the real constraint

The generator tool here enforces a **maximum prompt length in characters**.
That is a hard wall, not an efficiency preference, and it changes the advice.

Measured against the seven-section sprite prompt in this file:

| | |
|---|---|
| Full sprite prompt as written | **~2130 characters** |
| Typical tool ceiling | 1000–2000 |

So the default prompt **does not fit** and must be shortened deliberately —
otherwise the tool truncates it, and truncation silently drops whatever sits at
the end. In our section order that is the EXCLUDE block, which is exactly the
part that must not be lost.

⚠️ **Put the exclusions and the memory point early enough to survive
truncation, and verify the sent prompt fits before generating.**

#### What emojis actually recover

Measured per swap, plain word → emoji:

| Swap | Saved |
|---|---|
| `surprised` → `😮` | 8 |
| `elephant` → `🐘` | 7 |
| `neutral` → `😐` | 6 |
| `ribbon` → `🎀`, `sleepy` → `😴` | 5 |
| `girl` → `👧`, `coat` → `🧥`, `smug` → `😏` | 3 |
| `sad` → `😢`, `rain` → `🌧️` | 1–2 |

Roughly **3–8 characters per swap, averaging ~5**. On a 2130-char prompt with
~15 swappable nouns that is **~75 characters, about 3.5%**.

Caveats that matter when counting against a limit:

- Some tools count **UTF-16 units**, where most emojis are 2 not 1 — halving
  the saving. `🌧️` and other variation-selector or ZWJ emojis can be 3+.
- Emojis only replace **concrete nouns and emotions**. They cannot replace hex
  codes, garment construction, framing, or exclusions — which is where the bulk
  of our characters sit.

**Verdict: use them, but they are a trim, not a solution.** 3.5% does not close
a 2× overage.

#### Where the characters actually are

Cut in this order. These recover far more than emoji swaps, and cost nothing in
render quality:

1. **Drop the style block after the first generation.** ~430 chars. Once a
   reference image is attached, it carries the style — restating it is waste.
2. **Compress exclusions to the ones that character actually risks.** ~250
   chars. The global forbidden list is a checklist for authors, not something
   the model needs recited in full every time.
3. **Hex codes without colour names.** `Tops1 #3A4A52` not
   `oil-slate coverall (#3A4A52)`. ~120 chars.
4. **Drop zone entries that are not visible in this shot.** A waist-up frame
   does not need `Bottom2` or `Shoes`.
5. **Cut hedging and connectives.** "the whole body from the top of the head to
   the soles of the feet" → "full body, head to feet". ~200 chars across a
   prompt.
6. **Then** swap concrete nouns for emojis. ~75 chars.

Steps 1–5 recover roughly 1000 characters, which is the difference between
fitting and not. Step 6 is the last 3.5%.

#### Emoji shorthand worth using

Where a swap is lossless because the word is a plain concrete noun or a
conventional emotion:

```
😐 neutral · 😊 smile · 😠 angry · 😢 sad · 😮 surprise · 😳 blush
😏 smug · 😴 sleepy · 🌧️ rain · ⚫ black · 🔴 red · 🔵 blue
```

Do **not** swap where the word is doing descriptive work. `👗` loses "unlined
indigo work coat, sleeves pushed back and pinned"; `🎨` cannot express
`#3A4A52`. A swap is only safe when the emoji and the word mean the *same
single thing*.

### In the IMAGE prompt: emojis as labels, never as descriptions

Beyond the budget question, emojis have a rendering cost when they replace
description:

- **They collapse into a generic bucket.** Testing on Midjourney's style search
  found different emojis — star, fruit, ghost — producing results from a single
  shared "emoji" style pool, with *no significant variation between them*. The
  model was not reading their literal meaning. Same training-set-mean collapse
  this skill warns about with "anime girl".
- **Semantics are unstable** across models and versions.
- **Behaviour can be erratic**: a "no bicycles" sign produced a bicycle, two
  motorcycles and a truck.

The safe pattern is emoji-as-**label**, with the specification still present:

```
… change only the facial expression to: 😳 blush —
brow inner-up soft, eyes averted and half-lidded, mouth small and pressed,
warm cheeks.
```

The emoji is shorthand; the geometry does the work. Never send `😳` alone.

⚠️ **Untested on Nano Banana.** Record the result in the iteration log the
first time it is tried — see the open experiments in `iteration.md`.

### In AGENT-FACING text: yes, sparingly, as signposts

Briefs, checklists and handoff blocks are read by an LLM, not an image model.
Here a single emoji resists being skimmed past, and works as a salience marker
on a rule that must not be missed. Practitioners report models decoding a small
consistent set the same way on reverse testing, and report meaningful token
reduction when compressing long repeated instructions.

| Marker | Meaning | Use on |
|---|---|---|
| 🛑 | hard stop — refuse and escalate | `LEGAL.md` §1 and §2 rules |
| ⚠️ | known failure mode | trap entries, failure-mode rows |
| ✅ | acceptance criterion | "must be true of the result" items |
| ❓ | unanswered — ask, do not invent | unanswered brief sections |

Constraints, because this degrades fast if overused:

- **One marker per rule, at the start of the line.** A wall of emojis is noise
  and destroys the salience that justifies them.
- **Never the sole carrier of meaning.** The words must stand alone if the
  emoji is stripped — rendering and tokenisation vary.
- **Never in filenames, IDs, JSON keys, or committed prompt text.**

The distinction to remember: **emojis help an agent notice an instruction, and
work as compact labels for conventional emotions; they hurt an image model
trying to render a garment.**

## Failure modes and the fix

| Symptom | Cause | Fix |
|---|---|---|
| Design drifts toward generic anime | generic opener, or paraphrased symbol set | open with asset type + silhouette class; copy `symbol_set` literally |
| Memory point missing | mentioned once | state it in IDENTITY *and* STAGING |
| Colours drift between assets | names without hexes | always give both |
| Expression differential moves the head | treated as generation, not edit | restate the full preserve-list; generate from the approved sprite, never chained |
| Sprites don't line up in engine | no anchor/framing instruction | state "feet on the bottom edge, head upright and centred" |
| Silhouette lost in hero shot | figure and background at the same value | force value separation |
| A translucent character comes out opaque | negation-only phrasing | describe transmission positively: "the background is clearly visible through the head, torso and arms" |
| Output is a grey/white checkerboard | the word "transparent" appeared in the prompt | remove it; prompt a solid background and matte from white/black plates |
| Edit returns the original unchanged | known model failure, 10–40% of edits | rephrase as "modify this image by…"; re-upload; new session; retry |
| Quality drops over successive edits | edit chaining re-encodes the image | batch changes into one generation from the original anchor; composite small fixes manually |
| Canvas comes back square | aspect-ratio drift toward 1:1 | generate at a moderate ratio, then crop/composite to the sprite canvas; verify dimensions |
| Faces merge in a group image | more than 5 characters in one generation | split the image, or compose separately |
| Output is generic despite a detailed brief | emojis replacing description in the image prompt | replace each with the words it stood for; keep them only as expression labels beside the geometry |
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
