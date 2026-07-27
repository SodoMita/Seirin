# 06/07/08 — v3 BRIGHT pass: four owner corrections

Model: Arena image tool. **Verdict: KEEP** — all four corrections land.

## What the owner caught, and what was true

### 1. "Mountain faction is a miss" — CORRECT, and it was the dullest thing in the cast
Measured: yuki 0.25 mean zone saturation, the lowest of 14. The old answer
("cedar green, slate, milk fog — landscape-coloured") was wrong twice:
- It contradicted `design-canon.md` §3, which I had quoted in the same document.
- It was bad in-world reasoning. People who live in fog and steep terrain dress
  to be **FOUND**, not to blend in — mountain rescue, hill walkers and festival
  dress are all deliberately high-visibility.
**Rebuilt:** brilliant turquoise + jade + bright cerulean, saffron and lacquer
vermilion accents. Now the BRIGHTEST faction (figure saturation 0.673) and the
most rational. `yuki` 0.25 → 0.53, `ryuki` 0.41 → 0.59.

### 2. "All colors are dull" — CORRECT, and measurable
Cast mean zone saturation was **0.32, with 8/14 below 0.35**. `design-canon.md`
§3: *"bright, saturated palettes read well at scale... brightness is doing real
perceptual work."* I quoted that line and then ignored it. Every zone in
`cast.json` re-specified: **0.32 → 0.48**.

### 3. "Green bg is a mistake. Colors of bg do affect generation result" — CORRECT, and this is the big one
This is a genuine correction to the SKILL, not just to my output. The flat
`#00B140` field conditions the model: it harmonises the figure against the
field it is given, and a field in nobody's palette drags the whole render
toward desaturation. The old rationale (green cannot contaminate the palette)
optimised a contamination risk that barely exists while paying a large,
measurable cost in colour quality.

**Measured, figure-only pixels with the background excluded:**

| Sheet | Background | Figure saturation |
|---|---|---|
| group A v2 | flat green | 0.342 |
| **group A v4** | **sunset gradient** | **0.540  (+58%)** |
| group B v1 | flat green | 0.397 |
| **group B v2** | **lantern gradient** | **0.592  (+49%)** |
| **mountain v3** | **turquoise aurora** | **0.673** |

Same characters, same model, same hex codes — the ground alone moved figure
saturation by half. Recorded in `cast.json` as `generation_background`.
Matting is unaffected: alpha still comes from white+black plates at the END.

### 4. "quadrocopters look bad on stella" — CORRECT
v1/v2 pasted opaque black clip-art quadcopters over the figure like bugs stuck
to her. Root cause: they were described as literal aircraft, so the model
pasted stock drones ON the light figure instead of BUILDING her from them.
**Fix (v3):** the drones ARE the points of light; the sky around her is
explicitly empty of separate objects. Also fixed the black-fill finding that
her wings read as solid anatomical wings (`banned[1]`) — planes are now gapped.

## Also fixed this pass
- **Splash**: v3 groupC overshot — "treat the torso as a glass vase" removed her
  HEAD entirely. Re-prompted with head/face/hair as explicit requirements while
  keeping the vase instruction scoped to the torso only. `splash_v3_bright.png`
  is correct and appealing.
- 🛑 **Text violation caught**: groupA v3 rendered the word "OXIDE" across Ren's
  shirt, violating `forbidden_global`. Regenerated as v4 with blank-garment
  instructions. The violating file is quarantined in `_wip/`, not committed.
- **Lumina's ring light** enlarged to shoulder width — the silhouette hole now
  survives, fixing the weakness the black-fill test found.
- **Kitsune's booms** now fan wide from the hip yoke instead of haloing her head.

## Still outstanding — honest
- **Reika still reads male** (attempt 2). Stating "clearly and unmistakably
  female, feminine face, softer jaw" was not enough against the undercut +
  flight-jacket + harness combination. Per the stop rules, next attempt changes
  exactly ONE thing: grow the hair out to a short feminine cut and keep
  everything else. If that fails, the *design* is the problem, not the prompt.
- Ryuki's three mismatched dragon-head repairs still not rendering.
- Splash's transparency ~50%, still short of the specified 20%.
