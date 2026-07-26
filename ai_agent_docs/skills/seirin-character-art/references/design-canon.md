# Design canon — the five levers

Why a character sells, in the order you must apply the levers. Every rule here
is expressed as a field in `assets/cast.json`, so following the registry
already follows this document. Read this when a design feels generic, when
adding a character, or when generations keep coming out bland.

## Where this comes from

These are the working methods taught in the Japanese professional
character-design literature and used in Chinese gacha 立绘 production, not
forum opinion. The books are copyrighted and not bundled here — full citations
and fetchable links are in `sources.md`, so you can verify any rule rather than
trusting this summary:

- **『キャラクターデザインの教科書』** (Playce / MdN, 2015, ISBN 978-4-8443-6556-3).
  Its closing section **「キャラクター記号学」** (character semiotics, pp.137-157)
  is the direct source of the `symbol_set` field: it enumerates eye, brow,
  mouth, contour, skin, hair, body type and colour scheme as *signs* that
  encode personality, and demonstrates that combining chosen signs produces a
  legible character. The book's central practical distinction — 「キャラクター
  デザイン」 (the model sheet: who this person is, reusable) versus
  「キャラクターイラスト」 (the single selling image) — is exactly the split
  between our `turnaround`/`sprite` stages and our `hero` stage.
  toi8's chapter contributes 「戦闘力と性格を表す配色」 — palette encodes power
  level and temperament — and 「画面の情報量をコントロールする」 — control the
  information density, which is our `visual_density` field and the 6:3:1 mass
  rule. つなこ's game-character chapter is the source of the escalation
  discipline we use for rarity tiers: each step up is *visibly bolder*, not
  merely more detailed.
- **『アニメーター室田雄平が考えるヒットするキャラクターデザインの作り方』**
  (Genkosha, 2020, ISBN 978-4-7683-1387-9), by the Love Live! character
  designer. The book is organised around designing a marketable idol cast, and
  its through-line is that a *cast* must be designed as a set: colour
  assignment, costume logic and silhouette are allocated across characters so
  each is individually memorable and instantly distinguishable from her
  teammates. That is our roster-differentiation rule.
- **Chinese gacha production practice** (e.g. the *Girls' Frontline 2* art-team
  breakdowns): character information flows 世界观 → 故事脉络 → 关键出场主角 →
  相关角色 before anyone draws, so the designer starts with a complete brief;
  and 视觉密度 (visual density) is standardised per rarity tier, with each
  character assigned 视觉关键字 — visual keywords — and a defined player
  expectation. Our `visual_density` and `memory_point` fields implement this.
  Also from that practice: 剪影 (silhouette) is judged before internal
  structure, because viewers parse the outer contour first.

## 1. Silhouette

**Test:** fill the figure 100% black. If you cannot name the character, the
design has failed. Fix it before spending a generation on rendering.

Build the outline in three mass tiers at roughly **6:3:1**:

| Tier | What it is | Job |
|---|---|---|
| Big | head, torso, coat/skirt volume | decides the class of shape from across the room |
| Mid | hair masses, sleeves, boots, rigs | gives rhythm, breaks monotony |
| Small | buttons, cables, charms, trim | density and eye-stops, up close only |

Equal thirds make a design read as noise. The registry's `silhouette.big/mid/small`
fields are already apportioned this way.

**Negative space is a design element, not leftovers.** The gap between arm and
torso, the separation between hat brim and shoulders, the holes between
the gaps in a fanned rig, a silhouette that breaks into separate strands —
these are what
survive downscaling to a 64px roster icon. Every record has a
`negative_space` field; protect it. Adding detail that closes a hole makes the
character *less* readable, not more.

Every character needs a silhouette class that no one else in the roster shares. That allocation is a **design decision, not an art-agent decision** — it is answered per character in `../assets/cast.json`.

A character with no solid body — a drone swarm, a projection — may be a documented exception to the black-fill test, but the exception must be written down and justified, not assumed.

## 2. The memory point

Exactly **one** per character — the detail a player names when describing the
character to a friend. Not "she has a cool jacket": *"the girl with the cracked welding visor pushed up in her hair like a crown."*
(An illustration of the form an answer takes — not an answer for any character
in this project.)

Rules:

- It gets the **highest detail density** and, where possible, the accent colour.
- It appears in **every** asset for that character. Consistency is what turns a
  detail into recognition.
- **Two competing focal points halve both.** A quiet second detail — found on
  the second look — is the right way to add richness.
- A good memory point is **causal**: it exists because of who the character is
  and what they do, not as decoration. Detail that states a fact about a person
  is remembered; ornament is not.

The art agent does not choose the memory point. It asks the identity questions
in the character's brief and works from the answer.


## 3. Colour — 60-30-10

- **60% dominant** — the mass of the costume, decides the mood at distance.
- **30% secondary** — supporting garments, hair, structural trim.
- **10% accent** — reserved for the **memory point and the eyes**. Nothing else
  may claim it.

Constraints:

- **Three hues maximum**, plus neutrals.
- **Temperature is a decision.** Unintentional mixed temperature is the most
  common reason a design looks subtly wrong.
- **Value separation, not just hue separation.** Convert the roster to
  greyscale: if two characters merge, one must move.
- Faction palettes describe the environments a character must stay readable
  against, which is a different question from what they wear.


## 4. Shape language

| Shape | Reads as | Typical role |
|---|---|---|
| Circle | warm, young, safe, approachable | protagonist, mascot, healer |
| Square | stable, reliable, immovable, honest | anchor, tank, mentor |
| Triangle | sharp, fast, dangerous, unstable | rival, trickster, antagonist |

Shape ratios should be allocated so the roster does not converge on a comfortable middle. That allocation is a design answer, recorded per character.

Mixing is where character lives: a triangle-dominant figure with a square
toolbelt is aggressive but trustworthy. A circle body under a triangle hat is
the classic mascot recipe.

## 5. Symbol set — 記号学

The anime idiom encodes personality in fixed parts. The eye alone carries most
of the read:

| Eye property | High value | Low value |
|---|---|---|
| **Size** (eye, pupil, iris) | expressive, emotional, open | reserved, cold, distant, unexpressive |
| **Curve** | kind, gentle, good-natured, sociable | straight/angular = strong, aggressive, serious, calculating |
| **Outer-corner tilt** | down = shy, nostalgic, melancholy | inner-down = brave, passionate; level = neutral, emotionless |
| **Gloss / highlight** | warm, human, cheerful, emotionally available | absent or tiny = detached, uncommunicative, inhuman |
| **Iris size in opening** | innocence, youth, sincerity | menace, focus, fanaticism |

### The eleven-type lookup

A practical typology for assigning `symbol_set.eye` to a new character. Source:
the Clip Studio eye tutorial in `sources.md` — free, illustrated, and worth
opening when a new character's eyes are hard to pin down.

| # | Type | Geometry |
|---|---|---|
| 1 | kind / gentle / sweet | round and large, emphasised gloss |
| 2 | extrovert / energetic / easygoing | elongated, centre lower than the outer edge, small simple iris |
| 3 | naive / simple | simple lines, minimal detail |
| 4 | shy / introverted | outer corner droops, gaze avoids camera, small pupil, muted gloss |
| 5 | brave / strong-willed / aggressive | straight upper lid, head tipped down looking up, small iris, little gloss |
| 6 | arrogant / ambitious / selfish | straight angular, small pupil and iris, looks down the nose; whiten the inner iris to push coldness |
| 7 | feminine | drooping outer lid, emphasised lower lashes |
| 8 | cold / distant / calculating | elongated, small, geometric; no gloss; iris may be whitened |
| 9 | villainous / cruel | elongated with inner corner down and outer corner up; the more geometric and straight, the more evil; sparse straight lashes |
| 10 | unhinged / psychopathic | very large and expressive but pupil and iris tiny and white, no gloss |
| 11 | superhuman / supernatural | deliberately non-human geometry, readable as "not a normal person" at a glance |

Accessories are part of this vocabulary: glasses, a monocle, an eyepatch, or
hair covering one eye all sharpen a type rather than diluting it.


## Rarity tier and visual density

`rarity_tier` and `visual_density` (1-10) set how much design information a
character carries. Standardising density per tier is what keeps a gacha roster
feeling coherent rather than arbitrary.

| Tier | Density | Treatment |
|---|---|---|
| SSR | 8-10 | full memory point + second detail, layered wardrobe, effect element in the hero shot |
| SR | 5-7 | memory point + simpler wardrobe, no effect layer |
| R | 3-4 | memory point only, flat palette |

Density means *design information*, not rendering effort. A low-density character is not lower quality. Never raise density to signal importance — raise **boldness of silhouette** instead.


## Adding a new character

1. Answer the question set in `assets/cast.json` for that character. Do not
   skip the wardrobe questions — see `wardrobe-questions.md`.
2. Check the silhouette class, dominant hue, shape majority and head ratio
   against every existing answered record — differ in **at least two**.
3. Run `scripts/check_roster.py`, then generate the question brief.
4. Only then generate. A character that enters the pipeline without a registry
   record will drift, because nothing anchors it.
