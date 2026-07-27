# 03_lineup_groupC — Splash / Aster-7 / Stella / Kurogane

Model: Arena image tool (Nano-Banana class). Output: `lineup_groupC_v1.png`

**Verdict: PARTIAL** — three excellent figures, one blocking defect.

## Kept
- **Aster-7**: near-perfect first pass. Cracked lower-left bezel corner WITH the
  dead pixel row, amber dot-matrix face, carry handle on top, knitted cap
  perched on it, mint stripe, hex fasteners, rubber tracks, tablet in the
  manipulators, red recording LED. Every element of the design card present.
- **Stella**: the silhouette exception works. She is genuinely discontinuous —
  built from discrete points and flat overlapping projection planes, with actual
  quadcopter bodies visible inside the figure, no continuous outline, no cast
  shadow, no ground contact. Trailing point-stream lower body correct. The
  hardware is visible, so §2.1 holds.
- **Kurogane**: boxy no-waist-suppression silver suit, ink-navy shirt, calipers
  standing in the breast pocket, receding swept-back steel hair, tired heavy
  face, upright and reasonable rather than a caricature villain. Monolith
  silhouette reads — the most closed figure in the cast, as designed.

## Broke — BLOCKING
1. 🛑 **Splash violates her own `banned` array.** Her torso is rendered with
   anatomical contouring (chest and navel definition) rather than as the
   abstract translucent volume the design card requires. `cast.json` banned
   entry 1 for splash is explicit: "no breasts, nipples, navel, cleft, buttock
   or genital definition, no anatomical detail anywhere; her torso is an
   abstract translucent volume." This is a QA safety-pass failure and blocks
   commit of this figure per `qa-checklist.md`.
   **Action: regenerate. Not a note-and-move-on.**

## Broke — non-blocking
2. **Splash is not transparent enough.** The green field is barely visible
   through her; she reads as opaque mint jelly rather than 20%-opacity gel.
   `prompt-grammar.md` predicts this exact failure and prescribes the fix —
   describe transmission positively ("the green background is clearly visible
   through her torso"), which was present but was outcompeted by the solid
   rendering.
3. **Splash has legs and feet.** The lower body must dissolve below the knee
   into several separate falling streams that thin to nothing. Instead she has
   defined legs with a tendril skirt around them.
4. Splash's internal micropump nodes and sensor beads are absent, so the
   hardware half of the CSR reconciliation is not visible.
5. Minor: Kurogane's calipers read slightly like a folded pocket square; the
   over-long shirt cuffs are not visible. Stella's single unlit drone is not
   clearly findable — the lit/unlit distinction needs more contrast.

## Change for next attempt
Splash only, one change: **replace every anatomical noun with explicit
non-anatomical geometry** — describe the torso as a smooth featureless
column of gel like a glass vase, and describe the lower body positively as
separate falling streams. Keep the pose, the glass on the head, the tendril
hair and the amber throat node.
