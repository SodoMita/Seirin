# Sprite spec — canvas, face box, naming, wiring

Production spec for runtime sprites (立ち絵 / tachie) and their expression
differentials (表情差分). These numbers are the reason expression swaps do not
jitter and sprites do not jump between scenes.

## Canvas and resolution

| Asset | Working canvas | Delivered | Format |
|---|---|---|---|
| Turnaround sheet | 4096 × 2304 | keep as-is, reference only | PNG on `#00B140` green |
| Full-body sprite | 2048 × 4096 | 1024 × 2048 | PNG, straight alpha |
| Waist-up sprite | 2048 × 2560 | 1024 × 1280 | PNG, straight alpha |
| Expression differential | head crop at sprite scale | composited or overlay | PNG, straight alpha |
| Hero shot / key visual | 2048 × 2896 (portrait) | 1448 × 2048 | PNG or high-q JPEG |
| CG | 3840 × 2160 (16:9) | 1920 × 1080 | PNG or high-q JPEG |
| Chibi | 1024 × 1024 | 512 × 512 | PNG, straight alpha |
| Roster icon | derived from hero shot | 256 × 256 | PNG |

Work at 2× and downsample: it hides generator micro-artifacts and gives an
upscale path for a store page. Never upscale a delivered asset back up.

**Do not expect the generator to hit these ratios directly.** Nano Banana
outputs drift toward 1:1 and can ignore a requested aspect ratio — and the
full-body sprite canvas is an extreme 1:2. Generate at a moderate ratio, then
crop and composite onto the sprite canvas, and **verify the actual pixel
dimensions of every output** rather than trusting the request — the sizes in
this table are the spec, and nothing checks them for you.

**Straight (unpremultiplied) alpha**, always. The triangulation matte in
`tools/triangulate_matte.py` produces straight alpha; premultiplying it will
dark-fringe every sprite over a light background.

## The locked face box

This is the mechanism that makes expression differentials work. Define it once
per character at sprite time and never move it.

```
Full-body sprite, 2048 × 4096:
  head top          y =  180
  chin              y =  760
  face box          x = 764 … 1284   (520 wide)
                    y = 180 … 820    (640 tall, chin + 60px slack)
  body anchor       x = 1024 (centre), y = 4096 (feet on the bottom edge)
```

Rules:

1. Every expression differential changes **only pixels inside the face box**.
2. The head must not translate, rotate or scale between differentials. Hair
   silhouette outside the box stays byte-identical wherever possible.
3. If an expression genuinely needs motion outside the box — a sharp head turn,
   hair lifting on a shout — it is **not** a differential. Promote it to a
   separate full pose variant with its own name.
4. Blush, tears, sweat drops and anger marks are overlay layers inside the box,
   authored separately so they can stack on any base expression.

Record the actual box per character in a sidecar next to the sprite:

```json
{ "character": "ren", "canvas": [2048, 4096], "face_box": [764, 180, 1284, 820],
  "anchor": [1024, 4096], "head_ratio": 6.5 }
```

## Cross-character scale

Sprites share one world scale so nobody looks wrong standing next to anyone
else. Feet sit on the canvas bottom edge; height is the variable.

**Heights are a design answer, not an art-agent decision.** Record each
character's height and head ratio in `assets/cast.json` once decided, then
build the table below from those answers before the first sprite. Until then
this is empty on purpose.

| Character | Height | Head ratio | Sprite height at 4096 canvas |
|---|---|---|---|
| _(unanswered)_ | | | |

Head-ratio convention: roughly 7 heads for adults, 6.5 for teens, 4–5 for young
children, chibi at 2. Confirm per character rather than assuming.

Generate at full canvas, then scale to the row's sprite height and bottom-align.
Do not ask the generator to handle relative scale — it will not hold.

## Expression set

A core set of eight is mandatory for every speaking character: neutral,
smile, grin, angry, sad, surprise, blush, serious — plus any
character-specific extras the design answers call for.

The brief's expression questions decide what a given expression should *mean*
for that character. Geometry follows from the symbol-set answers, so
expressions stay in character rather than becoming generic mood faces.

`neutral` is the sprite's default and appears more than all others combined:
it must read as *pleasant and alert*, never blank or sullen. A dead-eyed
neutral makes a whole game feel cheap.

## Naming

```
characters/<id>/<id>_<variant>_<expression>.png
characters/<id>/<id>_sheet_turnaround.png
characters/<id>/<id>_hero.png
characters/<id>/<id>_chibi.png
cg/cg_<scene-slug>.png
```

- `<id>` matches the character's `id` in `cast.json` exactly.
- `<variant>` is `default` or a wardrobe-variant slug. Every character should
  have at least two — see `wardrobe-questions.md`.
- `<expression>` is a core-set id or a character-specific expression slug.
- Lowercase, underscores, ASCII. No spaces, no Cyrillic, no generator-default
  names like `krea-2-turbo_a_...` — those are unusable in an engine path and
  are the reason the current `characters/` directory is hard to navigate.

Work-in-progress iterations go in `characters/_wip/` and are not committed;
only approved assets land at the paths above.

## Engine wiring (Monogatari, offline)

`AGENTS.md` invariants apply: relative local paths only, no CDN, no fetch.

```js
'characters': {
  '<id>': {
    name: '<Name>',
    color: '<secondary hex>',              // dialogue name colour
    directory: '<id>',
    sprites:  { normal: '<id>_default_neutral.png' },
    expressions: {
      neutral: '<id>_default_neutral.png',
      smile:   '<id>_default_smile.png'
    }
  }
}
```

Files live under `cyber-nexus/assets/characters/<directory>/`. Use the
character's `secondary_30` hex as the dialogue name colour — it is the value
most legible against the VN's dark UI while still reading as "their" colour.

Keep delivered sprites at 1024 × 2048 or smaller for the shipped game; the
2× masters stay in `characters/` as the asset product, not in the game folder.

## Matting — white + black triangulation

**Nano-Banana and its class cannot output alpha.** They do not need to: two
plates of the same figure, one over white and one over black, recover both
alpha and true colour exactly — including partial transparency. This is the
project's standard route to a transparent sprite and it is lossless in
practice (verified: alpha error 0.0000, colour error <0.005 when
re-composited over an arbitrary new background).

The maths, as implemented in `tools/triangulate_matte.py`:

```
B = F·a            (figure over black)
W = F·a + (1 - a)  (figure over white)
=> a = 1 - (W - B) ; F = B / a
```

**The difference between the plates is the alpha.** Where the figure is opaque
the plates agree (`W - B = 0`, so `a = 1`); where it is fully transparent they
differ by the full range (`W - B = 1`, so `a = 0`); everything between is a
real partial alpha. This is why a fully transparent character like Splash mattes
correctly with no special handling.

The critical consequence: **never instruct the model to keep "character pixels
identical" between plates.** That asks it to flatten the figure opaquely onto
both backgrounds, which destroys the signal being measured — a true 0.05-0.95
alpha ramp comes back as 1.00 everywhere, and Splash mattes out as a solid
blob. Instead instruct it to *composite honestly*: identical pose, position,
scale, framing, lighting and colour, with the background genuinely showing
through wherever the character is not opaque.

Order of operations:

1. Approve the sprite.
2. Upscale to the working canvas. Matting happens **after** the final upscale —
   upscaling a matted sprite re-introduces fringing.
3. Generate the white plate, then the black plate as an **edit of the white
   plate** rather than a fresh generation, so the two register pixel for pixel.
4. Triangulate:
   ```bash
   python3 tools/triangulate_matte.py white.png black.png out.png --alpha-out a.png
   ```
5. Verify over backgrounds that are neither white nor black — white and black
   are the inputs, so a sprite always looks correct over them:
   ```bash
   python3 tools/check_matte.py out.png --checks --out check.png
   python3 tools/check_matte.py out.png --report
   ```
   `--report` flags a matte with no transparency (plates were flattened), no
   soft edges (binary alpha), or edge colour drifting from the body colour
   (background contamination).

Registration is the main practical failure. `triangulate_matte.py` errors on a
size mismatch but cannot detect sub-pixel drift; if edges look doubled or
ghosted, regenerate the black plate as an edit of the white plate.

Turnaround sheets keep their green background and are never matted — but note
that green is a *consistency* background, never a matting one. Chroma-keying
green leaves spill in every soft edge; that is exactly the contamination
`check_matte.py --report` looks for. CGs are complete illustrations and are
never matted.

### Sheet extraction

`tools/triangulate_sheet_extract.py` triangulates a white/black **pair of
sheets** and slices the result into individual sprites by finding column gaps:

```bash
python3 tools/triangulate_sheet_extract.py sheet_white.png sheet_black.png \
  out_rgba.png --dest-dir characters/ren --names ren_front ren_side
```

Useful when a single generation produced several usable poses side by side.
