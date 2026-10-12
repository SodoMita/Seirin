# Hana Shiroyashiki (ハナ・シロヤシキ) — provisional look card

Status: **PROVISIONAL.** Not canon, not approved. `briefs/hana.md` and
`assets/cast.json` remain unanswered (`questionnaire_answered: false`,
`approved: false`). This card exists so the sprites have a written source; the
project owner confirms or replaces every item marked *provisional*.

## Version log

- v1: dark brown hair, white-and-ice-blue dress (first draft, reference
  `hana_reference.png`, superseded).
- v2: white hair, mostly-white dress (owner request). Reference:
  `hana_reference_v2.png`.

## Sources used

- `ai_agent_docs/SEIRIN_Design_Document_edited.md` §6.1 (line 185) — role:
  witness and observer, 13, not a combatant, recovering from trauma.
- same document, §6.1 "Хана Сироясики" paragraph (line 192) — illusionist's
  father, heterochromia (*гетерохромия*), thermochromic stage dress
  (*термохромное сценическое платье*) that feeds rumours of a "witch",
  dissociation is not a superpower.
- `assets/cast.json` entry `hana` — age 13, faction `chorus_abyss`, role text.
- Existing images (reference only, not character art):
  - `backgrounds/hana_residential_courtyard.webp` — autumn courtyard with a
    shrine (torii, bench). Used as the environment reference for the
    identity sheet.
  - `backgrounds/hana_room_afternoon.webp` — rainy bedroom; a blue-teal
    tie-dye cloth on a chair, a broken-heart pendant, a notebook, green tea.
    Its blue-teal palette is the colour bridge between the light and dark
    outfits. It shows no figure.

## Identity

- Age 13. Child proportions; head ratio **6.5** (teen band, to confirm).
- Height **150 cm** — *provisional placeholder*, not in the sprite-spec table.
- Hair: shoulder-length **white** — *provisional* (owner change, v2: replaces the dark brown of v1).
- Eyes (heterochromia, from design doc): left sky blue `#7DD3FC`, right amber
  gold `#F59E0B` — *provisional colours*, the heterochromia itself is canon.
- **Memory point:** a dress whose panels change colour with temperature, and
  mismatched eyes. Name in six words: "mismatched eyes, colour-changing dress".

## Two outfits

### Dark — v3 look (supersedes the v1/v2 dark notes below)

- **Hair:** messy, tousled, near-black `#1A1A24`, shoulder-length, flyaway.
  Dark hair applies to the dark outfit only; the light outfit keeps white hair.
- **Eyes:** heterochromia kept, colours intensified. Left deep violet `#6D28D9`,
  right crimson `#BE123C`. Sharp dark eyeliner, narrowed lids, direct gaze.
  Provisional.
- **Expression (dark neutral):** guarded, defiant, a faint half-smirk. Not
  sexual, not threatening. The core-8 expression set comes later.
- **Clothing:** torn charcoal-navy dress with a frayed, asymmetric hem and ragged
  sleeves, torn cardigan-coat over it. Hem at knee length or lower. Opaque dark
  tights, intact. Scuffed dark boots. Accent: crimson ribbon and trim. No spikes,
  no buckles or chains that read as weapons, no blood, bruises or bandages.
- **Limit:** torn means frayed fabric only. Short or revealing hemlines are
  excluded (LEGAL §1, appeal-and-safety.md).

### Dark — v1/v2 notes (superseded)

### Light — maho shoujo stage dress (`light`)
- **Mostly white** layered dress (v2: white is the dominant colour; ice blue is
  only the trim and the thermochromic panels). Knee-length skirt, opaque white
  tights, white ankle boots. Long sleeves with white cuffs. Small blue ribbon at
  the collar.
- Thermochromic panels: ice blue `#A5D8F0` (cold) warming to pale rose
  `#F4B6C2` (warm), kept to the lower skirt and sleeve hems. Shown as fabric
  panels only.
- Accent colour: ice blue (trim, ribbon, panels). No cape, no wand, no weapon-like prop, no glowing
  particles — any "magic" look is fabric and stagecraft.

### Dark — separate outfit (`dark`)
- Deep navy `#1E2A3A` long-sleeved knee-length dress under a charcoal `#2B2F3A`
  cardigan-coat, opaque dark tights, dark boots. The white hair is kept, so the
  dark outfit reads as a deliberate contrast.
- Thermochromic panels in the cold state: near-black navy. The same panels
  would read as the light version's ice blue when warm, so the two outfits
  share one garment logic.
- Accent colour: muted teal `#2F6F73`, taken from the room image's tie-dye.

## Hard limits (copied into every prompt's exclusion section)

Modest and age-appropriate. No nudity, no bare midriff, no bare thighs, no
cleavage, no sexualised pose, expression or camera framing (no upskirt or
chest-level angles). No weapons or props used as weapons. No real magic or
glowing effects. No injuries, bandages or gore. No visible text, logos or
phone numbers (the bracelet in the story is plain). No real-person likeness.

## Appeal track

`cool_kid` (teen band). Levers used: silhouette, memory point, expression
charisma, costume design. No exposure levers.

## Expression set (core 8, provisional meanings)

neutral (calm, alert, not blank) · smile (small) · grin (restrained) ·
angry (shown as stillness and a tight jaw) · sad · surprise · blush · serious.
Each is a head-only edit from the approved sprite.

## Scale

Height 150 cm is a placeholder. Runtime `max-height` is set provisionally in
`game/vendor/custom-ui.css` (see the commit that added it) and must be
confirmed or replaced together with this card.
