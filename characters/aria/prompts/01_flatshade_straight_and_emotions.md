# 01 — Flat-shading restyle, straight portrait, whole-body emotions (aria), 2026-07-29

## Base restyle — `_wip/aria_normal_v2_flatshade_straight.png` (ACCEPTED)
Style-transfer of `game/assets/characters/aria_normal.png` (Aria Vane: long
wavy lavender hair, purple eyes, silver-white trench coat over a white/purple
crop top, black wide belt with chains, asymmetric pleated skirt, thigh strap,
headphones around neck, white heeled boots) onto the Miya/Kurogane flat
cel-shading look, with explicit straight-pose correction (shoulders/hips
square, both feet forward, vertical torso centerline). Original was a
contrapposto 3/4-ish stance. Result: fully frontal, flat-shaded, identity
held.

## Happy — `_wip/aria_happy_v2_wholebody.png` (ACCEPTED)
Whole-body happy edit: eyes closed in a joyful laugh, both hands raised near
her headphones as if about to put them on excitedly, one foot lifted onto its
toe, bouncy light stance. Same outfit/identity/canvas/background.

## Sad — `_wip/aria_sad_v2_wholebody.png` (ACCEPTED)
Whole-body sad edit: downcast glossy eyes, small frown, shoulders drawn in,
arms crossed hugging herself, weight back on heels, withdrawn closed-off
stance. Same outfit/identity/canvas/background.

## Defect found on review (2026-07-29, post-ship)
`_wip/aria_happy_v2_wholebody.png` / shipped `aria_happy_v2.png` has an extra
third hand: in addition to both hands correctly raised to the headphones, a
disembodied hand appears gripping the coat hem near her right hip. Not caught
before commit `e0ea244`. **Needs regeneration** with an explicit
"exactly two hands, both at the headphones, no third hand anywhere" negative
constraint. See `../../ai_agent_docs/skills/seirin-character-art/_session_notes.md`
for the full defect list across characters.
