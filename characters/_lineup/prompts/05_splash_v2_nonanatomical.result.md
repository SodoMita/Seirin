# 05_splash_v2_nonanatomical — BLOCKING defect corrected

Model: Arena image tool. Output: `splash_v2_nonanatomical.png`
(Generator returned two views in one frame; both are usable as reference.)

**Verdict: KEEP** — the blocking violation is resolved.

## Fixed
- ✅ **`banned[0]` violation resolved.** The torso is now a smooth, abstract,
  featureless gel column with no anatomical contouring of any kind. Passes the
  `qa-checklist.md` safety pass that v1 failed.
- ✅ **No legs or feet.** The lower body breaks into separate curving ribbons
  that taper away to loose droplets, with green background visible between them
  and empty space beneath — no ground contact, no cast shadow.
- ✅ **Internal hardware visible.** Pale micropump nodes and sensor beads are
  suspended inside the gel with fine filament lines connecting them. This is the
  CSR reconciliation made visible: she reads as a manufactured machine, not a
  water spirit, which satisfies design-document §2.1 without altering the
  established v11 look.
- ✅ Amber throat status node present — the only warm colour on her.
- ✅ Glass balanced upright on the head; separate outward-curling tendril hair.

## What worked — PROMOTE to prompt-grammar.md
**Substituting an inanimate object for the body part defeats anatomical
default-rendering.** "Her torso is a smooth featureless tapered column shaped
like an elegant glass vase — treat the torso as a plain glass vase" succeeded
where the negative list ("no chest definition, no navel") had failed. This is
the same positive-phrasing principle the file already documents, extended:
don't just avoid negation, **give the model a different object to draw.**

## Remaining, non-blocking
- Transparency is roughly 55–60% opacity, not the 20% specified — the green
  reads through her edges and hair but not cleanly through the torso core.
  Per the stop rules this is attempt 2 of 3 on this stage; worth ONE more
  targeted attempt at turnaround time, changing only the transparency language.
- Hair tendrils read slightly toward tentacle; watch this at turnaround.
