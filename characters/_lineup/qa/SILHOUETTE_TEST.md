# Silhouette test — cast lineup, 2026-07-27

The gate from `references/qa-checklist.md`: fill the figure 100% black, look at
it at 64px, and see whether you can name the character. Run with
`.venv-art` (Pillow + numpy) by keying out the `#00B140` field; outputs are the
`*_black_64.png` files in this folder.

**This is a real measurement, not an eyeball.** It changed three conclusions.

## Result per character

| Character | Class in registry | Reads at 64px? | Note |
|---|---|---|---|
| Kitsune | fan | ✅ **outstanding** | best silhouette in the cast; the boom spray is unmistakable |
| Splash | comet | ✅ **outstanding** | tendrils + dissolving ribbons, unique in the roster |
| Aster-7 | stacked boxes | ✅ **outstanding** | head/body notch and tracks read instantly |
| Kurogane | monolith | ✅ strong | the only closed rectangle; reads as "the big square man" |
| Miya | mascot | ✅ strong | small round bell + crown + raven lump on the shoulder |
| Ryuki | compact + object | ✅ strong | the carried mass at hip height does the work |
| Hana | bell | ✅ good | coat flare reads, clearly distinct from the others in group A |
| Yuki | vertical column | ✅ good | the diagonal tube across the back is doing all of it |
| Saya | column, broken hem | 🟡 adequate | coat reads; would be stronger with the front panels open |
| Stella | constellation | ⚠️ **fails black fill — as predicted** | see below |
| Lumina | tailored + held light | ⚠️ weak | see below |
| Reika | vertical blade | ⚠️ weak | see below |
| Momo | crisp A-line | ⚠️ weak | see below |
| Ren | top-heavy wedge | ⚠️ weak | see below |

## Three findings that change the design

### 1. Stella fails the black-fill test — and that is the correct result
Filled solid she becomes a generic winged figure, which is exactly why
`cast.json` documents her `silhouette_exception`. The exception is not an
excuse; it is now **evidenced**. Her gate is the dot test and the off-axis
shear test, not this one.

⚠️ But the fill also exposed a real problem: her wings currently read as
**solid anatomical wings** in black, which her `banned` array forbids. At
turnaround the projection planes must be separated enough that they break up
even when filled.

### 2. Four figures are weak, and the cause is one thing
Ren, Momo, Reika and Lumina all reduce to "standing person in trousers". Their
memory points — knotted sleeves, jaw cable, insignia hole, ring light — are all
**internal detail or small held objects**, which is precisely what a black fill
deletes. `design-canon.md` §1 warns about this: the outer contour is parsed
first, and detail inside it does not survive.

This is a **design note, not a rendering note**. Fixes, in registry terms:

- **Ren** — the knotted sleeve-ends must swing *outside* her body contour, so
  the knot breaks the outline instead of sitting flat on it.
- **Momo** — the jacket's structured shoulder needs to be squarer and wider, so
  the A-line is a real trapezoid, not a rectangle. Ponytail should read as a
  separate mass.
- **Reika** — the harness must lift far enough off the jacket that the straps
  make holes in the fill, and the dorsal D-ring should break the back line.
- **Lumina** — her ring light must be **large enough that the hole in its centre
  survives the fill**. At 64px it currently closes. This is the single most
  fixable weakness in the cast: enlarge the lamp and her silhouette becomes
  unique instantly.

### 3. Group A's minors need the boldest silhouettes in the roster, and don't have them yet
`appeal-and-safety.md` puts silhouette recognisability first for `cool_kid`
characters, because that is the appeal lever available at any age rating. Three
of the four weak figures are minors. They should be the boldest shapes in the
cast and are currently the blandest. Amplify at turnaround — this is the
highest-return work left.

## Cross-check: no two silhouettes collide
Even among the weak four, no pair is confusable *with each other*: Ren is
bare-shouldered with a hip mass, Momo is a light trapezoid, Reika is tall and
strapped, Lumina is narrow and holds a circle. The roster-differentiation rule
holds. The weakness is against a generic figure, not against each other.

---

## Note on group C artifacts

`lineup_groupC_v1.png` and its black-fill outputs were **moved to
`characters/_wip/`** (gitignored) rather than committed: that render contained
the Splash anatomy defect described in
`../prompts/03_lineup_groupC.result.md`, and per `LEGAL.md` and
`qa-checklist.md` a figure that fails its own `banned` array is not committed
even as an intermediate.

The committed group C sheet is `lineup_groupC_v2_splashfixed.png`, which
composites the corrected Splash (`splash_v2_nonanatomical.png`) into the
Aster-7 / Stella / Kurogane row — those three were correct in v1 and did not
need regenerating. Splash's silhouette rating in the table above was measured
from the corrected figure.
