# 05 — Flat-shading restyle + straight portrait (ren), 2026-07-29

## Goal
Restyle `ren_normal.png` into the Miya/Kurogane flat-shaded VN sprite style and
correct the body pose from 3/4 to a fully straight front-facing portrait, per
user request ("Improve sprites ... styled like Mia, Kurogane VN sprite with
flat shading ... Characters in 3/4 need to be modified for straight
portrait").

## Style references
- `characters/krea-2-turbo_a_Мия_Кагэцуки_—__Полу.png` — Mia (Miya) sheet, flat
  cel shading target.
- `characters/kurogane/kurogane_normal.png` — flat shading target, adult male.

## Attempt 1 — `_wip/ren_normal_v2_flatshade.png`
Prompt: style-transfer onto `ren_normal.png` identity (17yo mechanic, black
hair, amber eyes, black/red REDLINE jumpsuit, wrench, tool belt, boots),
"straight-on portrait framing (no 3/4 turn)". Result: face turned to camera
but hips/legs/boots still angled 3/4 — pose correction insufficient.

## Attempt 2 (approved) — `_wip/ren_normal_v3_flatshade_straight.png`
Added explicit anatomical constraints: shoulders horizontal, hips/belt square
to camera, both feet flat pointing forward, torso centerline vertical, flat
orthographic front-elevation camera. Result: fully frontal symmetric standing
pose, flat shading achieved, identity (face, jumpsuit, wrench, tool belt,
boots) preserved. **Accepted as new base.**
