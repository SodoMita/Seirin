# Character Design Brief — AI Agent Questionnaire

> **Purpose.** This questionnaire defines the questions an AI agent (or human
> designer) must answer to create a character that meets industry standards for
> sellable manga / anime / gacha character IP. It is derived from the
> methodology principles extracted from **27 primary sources** catalogued in
> `Character_Design_Sourcebook_JP_CN_Manga_Anime_Gacha.pdf` (this folder).
> Each question is tagged with the source principle it operationalises, so
> the agent can trace any answer back to the underlying industry / academic
> evidence.
>
> **How to use.** An AI agent receiving a character-creation brief should
> answer every question below in order. Missing answers signal design gaps
> that will hurt the character's downstream marketability, narrative
> coherence, or merchandising potential. Answers should be specific enough
> that a second agent (or a human reviewer) can evaluate the character
> against them without further context.
>
> **Languages.** Terms are paired English / Japanese (romaji + kana) /
> Chinese (pinyin + hanzi) per the sourcebook convention. Where a question
> is JP-specific or CN-specific, this is noted inline.

---

## 0. Pre-Flight — Brief Intake

Before answering the design questions, the agent must confirm the brief
intake. Skipping any of these forces a default that is almost always wrong
for the project.

- **0.1 Project name** — What game / manga / anime / VTuber project is this
  character for? (sets the IP context)
- **0.2 Target market** — JP / CN / KR / global? (sets the cultural-context
  baseline — see Principle VI-2.5 Cultural Layering)
- **0.3 Release window** — When does this character ship? (sets the
  production-cadence constraint — see Principle VI-3.2 Weekly Live-Ops
  Cadence)
- **0.4 Pull-rate tier** — Is this character a 5★ / 4★ / 3★ / event-only
  unit? (sets the design-investment budget — see Principle VI-3.1
  Pull-Rate-Stratified Character Tiers)
- **0.5 Existing roster size** — How many characters are already in the
  project? (sets the distinguishability constraint — see Principle VI-1.1
  Silhouette-First Design)
- **0.6 Region / faction** — What in-world region or faction does this
  character belong to? (sets the cultural-layering inputs — see Principle
  VI-2.5)
- **0.7 Medium breadth** — Will this character appear in game only, or also
  in anime / manga / merchandise / VTuber streams? (sets the transmedia-
  portability requirement — see Principle VI-1.5 and VI-4.3)

---

## A. Visual Design (Principles VI-1.1 – VI-1.5)

### A.1 Silhouette (Principle VI-1.1 — Silhouette-First Design)

The character's silhouette is the primary visual-recognition signal and
must be locked before any other character-design work begins. The
silhouette must be uniquely identifiable at thumbnail size and must be
visually distinguishable from every existing character in the same
project.

- **A.1.1** Generate 5–10 silhouette candidates for this character. Which
  one is selected, and why is it the most visually distinct from the
  existing roster?
- **A.1.2** Can a viewer identify the character from the silhouette alone
  at 64×64 px (thumbnail size used in gacha pull animations and
  character-select screens)? If not, what silhouette element needs
  amplification?
- **A.1.3** Which 3 existing characters in the project have the most
  similar silhouettes? What is the visual-distance metric (silhouette
  overlap percentage) between the new character and each of them?
- **A.1.4** Does the silhouette read as the intended character archetype
  (heroic / villainous / neutral / comedic / mysterious) at thumbnail
  size?

### A.2 Kawaii Engineering (Principle VI-1.2 — Kawaii Engineering)

If the character is intended to elicit kawaii (かわいい / 可爱) response —
the dominant affective target for female gacha character IP in the JP
market — the following perceptual dimensions must be calibrated to the
empirically-validated ranges documented in Li Yingchao 2021 (Kyoto Seika
University PhD thesis, see sourcebook §II-1).

- **A.2.1 Face shape** — What is the face roundness ratio (face-width /
  face-height)? Target range for high-kawaii perception: 0.85–1.05.
- **A.2.2 Eye-to-face ratio** — What is the eye-height / face-height
  ratio? Target range for high-kawaii perception: 0.30–0.45. (Larger
  eyes = more kawaii, up to the upper bound where the face reads as
  grotesque.)
- **A.2.3 Color palette** — What are the primary, secondary, and accent
  colors? Warm pastels (HSL saturation 0.30–0.55, lightness 0.70–0.90)
  score higher on kawaii perception than cool or saturated palettes.
- **A.2.4 Hairstyle curvature** — What is the dominant curvature of the
  hairstyle (soft-rounded vs. sharp-angular)? Soft-rounded forms score
  higher on kawaii perception.
- **A.2.5 Predicted kawaii score** — Given the answers to A.2.1–A.2.4,
  what is the predicted kawaii score on the Li Yingchao 5-point scale?
  (If below 3.5, the design is unlikely to elicit the target affective
  response and should be recalibrated.)

### A.3 SD / Chibi Variant (Principle VI-1.3 — SD / Chibi Formalization)

If the character will ship an SD / chibi (SD / ちび / Q版) variant —
standard practice in JP gacha for overworld sprites and Live2D card
animations — the following constraint ranges from Mogi 2018 (Tokyo
University of Technology PhD thesis, see sourcebook §II-2) must be
satisfied.

- **A.3.1 Head-to-body ratio** — What is the SD variant's head-to-body
  ratio? Standard SD range: 2:1 to 3:1. (1:1 is "baby" proportion;
  4:1+ is "ultra-SD"; both read as different affective categories.)
- **A.3.2 Facial-feature placement** — Where are the eyes, nose, and
  mouth placed on the SD face? Standard SD placement: eyes at 50–60%
  of face height, nose omitted or as dot, mouth at 75–85% of face
  height.
- **A.3.3 Limb proportion** — What is the SD limb-to-torso ratio?
  Standard SD range: 0.6–0.8 (shorter limbs than realistic proportion).
- **A.3.4 Automated-SD-generation compatibility** — Is the full-art
  character design compatible with the parametric SD-generation
  approach documented in Mogi 2018? If not, what full-art elements
  need to be reworked?

### A.4 Physiognomic Coding (Principle VI-1.4 — Physiognomic Coding)

JP character design uses a stable physiognomic coding system to signal
character alignment (hero / villain / neutral) through facial features.
Rounded, open features code heroic; sharp, angular features code
villainous. This coding has remained stable from Kishida Ryūsei's 1920s
illustrations to contemporary manga / anime / gacha (Matsushita 2025,
 Kyoto Seika Manga Studies Vol.1, see sourcebook §II-6).

- **A.4.1 Alignment signal** — What alignment (heroic / villainous /
  neutral / ambiguous) does the character signal through facial
  features?
- **A.4.2 Coding convention** — Is the physiognomic coding conventional
  (rounded = heroic, angular = villainous) or deliberately subverted?
  If subverted, what is the narrative reason for the subversion?
- **A.4.3 Subversion risk** — If the coding is subverted, what is the
  risk that the audience will misread the character's alignment? How
  is the subversion reinforced through other channels (costume,
  color, narrative)?

### A.5 Transmedia-Portable 2D Flatness (Principle VI-1.5 — Transmedia-Portable 2D Flatness)

The two-dimensional flatness of JP-style character line-art is the
structural property that enables character transmedia spreadability
(Watabe 2023, F1000Research CC-BY, see sourcebook §II-3). Designs that
drift toward 3D-realist rendering sacrifice this transmedia portability.

- **A.5.1 Line-art density** — Is the character rendered in flat 2D
  line-art (compatible with transmedia deployment across manga / anime
  / game / merch / advertising), or in 3D-realist rendering (which
  constrains downstream IP deployment)?
- **A.5.2 Multi-plane image compatibility** — Does the design respect
  the LaMarre "multi-plane image" framework (layered 2D depth) that
  distinguishes anime imagery from Western 3D-pursuit animation?
- **A.5.3 Sticker / emoji readability** — Can the character be reduced
  to a 2-color sticker or emoji at 128×128 px and still be
  recognisable? (This is the minimum transmedia portability test.)

---

## B. Narrative Arch & Role Function (Principles VI-2.1 – VI-2.5)

### B.1 Character-as-Content (Principle VI-2.1 — Character-as-Content)

In anime-style gacha games, characters are not narrative instruments —
they ARE the content. Storytelling revolves around characters
(character-based), not around plot (plotline-based), and characters are
the basis for commercialization (Cai 2021, miHoYo GDC, see sourcebook
§III-1).

- **B.1.1 Standalone story potential** — What standalone character-
  focused story content (character quest, character event, character
  anime OVA) could this character support? Answer with a one-paragraph
  story pitch.
- **B.1.2 Character-based vs. plotline-based** — Does this character's
  narrative role revolve around the character (character-based
  storytelling) or around the plot (plotline-based storytelling)? If
  the latter, what would it take to convert to character-based?
- **B.1.3 Commercialization basis** — How does this character function
  as a basis for commercialization? (gacha pull target / skin sales /
  figure licensing / collaboration IP / all of the above?)

### B.2 Worldview-Character Symbiosis (Principle VI-2.2 — Worldview-Character Symbiosis)

Characters and worldview co-evolve. The worldview constrains which
characters are diegetically possible; new characters add new facets to
the worldview. This parallel-development approach produces the deep-lore
character IP that distinguishes post-2017 gacha character design
(Hypergryph Arknights Unite Shanghai 2020, see sourcebook §III-6).

- **B.2.1 New worldview facet** — What new facet of the game's worldview
  does this character add? (a new faction / region / historical period
  / cultural context / magical system / technological layer?)
- **B.2.2 Diegetic possibility** — Is this character diegetically
  possible within the existing worldview constraints? If not, what
  worldview element must be retconned or extended to accommodate the
  character?
- **B.2.3 Future narrative hooks** — What 3 future narrative hooks
  (story quests, event scenarios, anime OVA plots) does this
  character's settei enable?

### B.3 Affinity Loop Design (Principle VI-2.3 — Affinity Loop Design)

New characters should be designed to reactivate the player's emotional
attachment to existing characters. The new character should be visually
and narratively similar to 2–3 existing characters the player has bonded
with, but distinct enough to require fresh emotional investment. "Similar
but not the same feels best" (似曾相识感觉最好) — Chen 2015, NetEase GDC
China, see sourcebook §III-2.

- **B.3.1 Reactivation targets** — Which 2–3 existing characters is
  this new character designed to reactivate emotional attachment to?
- **B.3.2 Similarity hooks** — What visual and narrative similarity
  hooks does the new character share with each reactivation target?
  (shared faction / shared aesthetic / shared voice archetype / shared
  backstory element / shared gameplay role?)
- **B.3.3 Distinctiveness hook** — What is the distinctiveness hook
  that requires fresh emotional investment? (Different personality
  axis / different gameplay role / different visual sub-language /
  different narrative arc?)

### B.4 IP Bible / Settei (Principle VI-2.4 — IP Bible as Canonical Document)

The character's settei (設定 / 设定) is the canonical document that
defines the character across all media. Settei includes visual reference
(turnarounds, expression sheets, prop sheets), narrative reference
(personality, backstory, relationships, voice archetype), and production
reference (color palette, line-art specifications, rigging notes).

- **B.4.1 Visual settei** — Does the settei include: turnaround
  (front / 3/4 / side / back), expression sheet (min 8 expressions:
  neutral / happy / sad / angry / surprised / scared / thinking /
  special), prop sheet (all character-specific props)?
- **B.4.2 Narrative settei** — Does the settei include: personality
  profile (3–5 adjective axis), backstory (1-page summary), relationship
  map (min 5 relationships to other characters), voice archetype
  (referenced to existing voice-actor performance)?
- **B.4.3 Production settei** — Does the settei include: color palette
  (hex codes for primary / secondary / accent / shadow / highlight),
  line-art specifications (line weight, line color), rigging notes (for
  Live2D / 3D models), animation reference (key poses, gait cycle)?
- **B.4.4 Version control** — Is the settei version-controlled? What
  is the current version number?

### B.5 Cultural Layering (Principle VI-2.5 — Cultural Layering)

Characters for cross-cultural markets should be designed by layering
modern fashion silhouettes (contemporary, aspirational) with culturally-
specific elements (recognisable cultural context). Zhan Tao 2018 (Tencent
TGDC, see sourcebook §III-5) and Ke Kai-Ren (Taiwan NTMoFA, see
sourcebook §IV-4).

- **B.5.1 Modern fashion silhouette** — What modern fashion silhouette
  vocabulary is layered into this character? (streetwear / techwear /
  athleisure / formal / etc.)
- **B.5.2 Culturally-specific elements** — What culturally-specific
  elements are layered in? (Chinese traditional / Japanese traditional /
  MENA / Latin American / European / etc.)
- **B.5.3 Cultural-context audit** — Has the design been audited for
  cultural-context compatibility across the target markets? (See Ke
  Kai-Ren framework: silhouette vocabulary, color symbolism, costume
  vocabulary.)

---

## C. Marketability & Gacha Engineering (Principles VI-3.1 – VI-3.5)

### C.1 Pull-Rate-Stratified Character Tiers (Principle VI-3.1)

Gacha characters are designed in tier-stratified design languages that
correspond to their pull-rate rarity. The highest-rarity tier receives
the most design investment; lower tiers receive proportionally less.

- **C.1.1 Tier identification** — What pull-rate tier is this character?
  (5★ / 4★ / 3★ / event-only / collaboration?)
- **C.1.2 Design-investment budget** — Given the tier, what is the
  design-investment budget? (Number of costume variations, color
  palette size, settei depth, animation count.)
- **C.1.3 Tier-consistent design language** — Does the design language
  match the tier? (5★ characters typically: complex costume, multi-
  color palette, 8+ expressions, full-rig Live2D. 4★ characters
  typically: simpler costume, 4–6 color palette, 6 expressions,
  partial-rig Live2D.)
- **C.1.4 Cross-tier distinguishability** — Can a player visually
  distinguish this character's tier from one tier higher and one tier
  lower? (Players read tier-stratified design language as a signal of
  pull-rate rarity, which directly affects pull-rate conversion.)

### C.2 Weekly Live-Ops Cadence (Principle VI-3.2)

Live-service gacha operations require a weekly visible-art-resource
update. This requires the character-asset production pipeline to be
sized for weekly delivery cadence (Wen 2015, NetEase GDC China, see
sourcebook §III-3).

- **C.2.1 Production-pipeline stage** — At what stage in the production
  pipeline is this character currently? (Concept / settei / 3D model /
  animation / voice / QA / release-ready?)
- **C.2.2 Parallel production load** — How many other characters are in
  parallel production with this one? (Standard gacha studio load: 5–10
  characters in parallel.)
- **C.2.3 Time-to-release** — What is the estimated time-to-release in
  weeks? Does this fit the weekly-cadence constraint?
- **C.2.4 Asset-validation gates** — Has the character passed the
  standard asset-validation gates (silhouette check / color-palette
  check / settei completeness check / rigging test)?

### C.3 Moe Engineering (Principle VI-3.3 — Moe Engineering)

Moe (萌え / 萌) is the affective response of protective fondness toward a
character, distinct from kawaii (which is the visual aesthetic). Moe is
engineered via vulnerability cues, gap-moe design, and character-specific
verbal tics.

- **C.3.1 Vulnerability cue** — What vulnerability cue does the character
  have? (Small stature / large eyes / soft features / innocence / fear
  response / weakness in combat / etc.)
- **C.3.2 Gap-moe design** — What is the gap-moe design? (A "tough"
  surface trait paired with a "soft" hidden trait — e.g., a soldier
  who loves cute animals, a CEO who cries at anime, etc.)
- **C.3.3 Verbal tic / catch-phrase** — What is the character's
  verbal tic or catch-phrase? (Standard JP gacha: 1 verbal tic +
  1 catch-phrase, both reproducible by players.)
- **C.3.4 Moe archetype** — Which moe archetype does this character
  occupy? (tsundere / yandere / kuudere / dandere / himedere / moe-
  blob / etc. — see Tencent Game Institute moe≠low-age course,
  sourcebook §III-7.)

### C.4 Fan-Art Virality by Design (Principle VI-3.4)

Gacha character designs should be optimised for fan-art virality. This
requires the character to have a distinctive silhouette, a recognisable
color palette, and a small set of "drawable" design elements that fan
artists can reproduce.

- **C.4.1 30-minute reproducibility** — Can a fan artist reproduce the
  character's silhouette in 30 minutes? If not, what design element is
  too complex?
- **C.4.2 Color-palette memorability** — Is the color palette memorable
  (3–5 colors, distinctive combination)? Test: can a fan artist name
  the palette from memory after seeing the character once?
- **C.4.3 Drawable design elements** — What 2–3 "drawable" design
  elements (distinctive hairstyle / unique accessory / recognisable
  costume motif) can fan artists use as shorthand for the character?
- **C.4.4 Cosplay feasibility** — Is the character cosplay-able? What
  is the estimated cosplay difficulty (1–5 scale)? Difficulty 5
  (extremely complex) suppresses fan-art virality.

### C.5 Character-as-Brand Strategy (Principle VI-3.5)

A successful gacha character is not just a game asset — it is a brand.
The character-as-brand strategy requires the character to be designed
for cross-media deployment and to retain consistent brand identity
across all deployments.

- **C.5.1 Cross-media deployment plan** — What is the cross-media
  deployment plan for this character? (Game / anime / manga / figure /
  collaboration / VTuber appearance?)
- **C.5.2 Brand-identity consistency** — How will brand identity be
  maintained across deployments? (IP-bible enforcement / style-guide
  distribution / approval workflow?)
- **C.5.3 Brand-extension hooks** — What brand-extension hooks are
  built into the character? (Multiple costume variations / alternative
  universe versions / age-progressed versions / etc.)

---

## D. Merch & IP Strategy (Principles VI-4.1 – VI-4.4)

### D.1 Figure-Sculpting Brief (Principle VI-4.1)

Character designs intended for downstream figure merchandising should
embed figure-sculpting briefs in the original character design.

- **D.1.1 Figure stance** — What is the intended figure stance? (A-pose
  / dynamic action pose / sitting / signature pose?)
- **D.1.2 Topology considerations** — What topology considerations are
  documented for sculpting? (Hair partitioning / cape flow / weapon
  attachment points / etc.)
- **D.1.3 Accessory sculpting** — What accessories require separate
  sculpting? (Weapons / pets / effect parts / etc.)
- **D.1.4 Multi-angle reference** — Has multi-angle reference (front /
  side / back / 3/4) been provided for the figure sculptor?

### D.2 IP Rights Reality (Principle VI-4.2)

Under the current JP production-committee (製作委員会) financing model,
character designers retain almost no downstream IP rights. The
production committee holds the IP rights; the character designer is
typically compensated only with a one-time design fee. This is the
structural reality that METI's 5-year action plan proposes to reform
(see sourcebook §I-4).

- **D.2.1 IP-rights structure** — Under what IP-rights structure is this
  character created? (JP production committee / CN studio work-for-hire
  / individual creator retention / collaboration agreement?)
- **D.2.2 Designer compensation** — What is the character designer's
  compensation structure? (One-time fee / royalty % / IP-rights
  retention?)
- **D.2.3 Downstream licensing** — Who controls downstream licensing
  (figure / anime / collaboration / VTuber appearance)?

### D.3 Transmedia Character-as-IP (Principle VI-4.3)

A 2D character image is structurally suited to transmedia IP deployment
in a way that 3D-realist character images are not. The flat 2D design
language allows the character to circulate across manga / anime / game /
merchandise / advertising without losing its identity.

- **D.3.1 2D flat-design language retention** — Does the character
  design maintain the 2D flat-design language required for transmedia
  portability? (Reinforces A.5.1.)
- **D.3.2 Cross-media identity test** — Can the character be deployed
  across manga / anime / game / merchandise / advertising without
  losing identity? What media-mix deployment is planned?
- **D.3.3 Fan-content policy** — What is the fan-content policy for
  this character? (Fan-art allowed / fan-merch allowed / fan-
  translation allowed / etc. — affects transmedia spread, see Watabe
  2023 CC-BY, sourcebook §II-3.)

### D.4 Region-Layered IP for Global Gacha (Principle VI-4.4)

Gacha character IP targeting global markets should be designed with
region-layered cultural specificity. Each region's character-design
sub-language should be internally consistent and culturally grounded,
while the overall character roster should maintain a unified global
character-design language. The canonical implementation is Genshin
Impact's region-based character system (see sourcebook §V-6).

- **D.4.1 Region identification** — What region / cultural context is
  the character designed for? (Mondstadt-style Western fantasy /
  Liyue-style Chinese traditional / Inazuma-style Japanese traditional
  / Sumeru-style MENA / Fontaine-style French / Natlan-style Latin
  American / original region?)
- **D.4.2 Region sub-language** — What is the region's character-
  design sub-language? (Silhouette vocabulary / color palette /
  costume vocabulary / architectural reference / cultural symbols?)
- **D.4.3 Global roster integration** — How does the regional sub-
  language integrate with the global character-design language? (What
  is the unifying visual element — line-art weight / shading style /
  color-palette saturation / etc.?)
- **D.4.4 Cultural-consultation audit** — Has the design been audited
  by a cultural consultant from the represented region? (Industry
  standard for global gacha post-2022.)

---

## E. Production Specifications

These are the technical-production questions that bridge from character-
design concept to manufacturable asset.

### E.1 Color & Material

- **E.1.1 Primary palette** — List 3–5 hex codes for the primary color
  palette.
- **E.1.2 Secondary palette** — List 2–3 hex codes for the secondary
  palette (used for costume accents / props).
- **E.1.3 Shadow / highlight colors** — List hex codes for shadow and
  highlight variants of each primary color.
- **E.1.4 Material callouts** — For each major costume element, specify
  material (fabric / metal / leather / etc.) — affects downstream 3D
  material authoring.

### E.2 Voice & Audio

- **E.2.1 Voice archetype** — What is the voice archetype? (Referenced
  to existing voice-actor performance — e.g., "Tomoyo Kurosawa-style
  soft soprano" / "Daisuke Ono-style deep baritone".)
- **E.2.2 Vocal range** — What is the character's vocal range (Hz)?
- **E.2.3 Speech pattern** — What is the character's speech pattern?
  (First-person pronoun / sentence-ending particle / verbal tic /
  pitch accent.)
- **E.2.4 Combat vocalizations** — List 5–10 combat vocalizations
  (attack grunts / damage sounds / KO sound / victory call / etc.).

### E.3 Animation Reference

- **E.3.1 Key poses** — List 8–12 key poses the character must be
  drawable / animatable in (3/4 standing / dynamic action / emotional
  close-up / profile / sitting / crouching / falling / victory / etc.).
- **E.3.2 Gait cycle** — What is the character's gait cycle reference?
  (Confident stride / timid shuffle / athletic run / etc.)
- **E.3.3 Idle animation** — What is the character's idle animation?
  (For Live2D card art and in-game overworld model.)
- **E.3.4 Signature animation** — What is the character's signature
  animation? (Skill activation / victory animation / emotional
  reaction animation.)

### E.4 Gameplay Role (if applicable)

- **E.4.1 Combat role** — What is the character's combat role? (DPS /
  tank / healer / support / controller / etc.)
- **E.4.2 Element / type** — What is the character's element or type?
  (Pyro / Hydro / Anemo / etc. — affects particle effects and color
  palette.)
- **E.4.3 Weapon / ability** — What is the character's weapon or
  signature ability? (Affects silhouette via weapon prop.)
- **E.4.4 Skill kit** — List 3–5 signature skills, each with a one-
  line description.

---

## F. Review Checklist

After answering all questions above, the agent must self-review the
character against the following checklist. Each item must be YES for
the character to meet industry standards.

- [ ] **F.1** Silhouette is uniquely identifiable at 64×64 px thumbnail
      size (Principle VI-1.1).
- [ ] **F.2** Kawaii dimensions are calibrated to Li Yingchao 2021
      ranges IF the character targets kawaii response (Principle
      VI-1.2).
- [ ] **F.3** SD / chibi variant satisfies Mogi 2018 constraint ranges
      IF the character ships an SD variant (Principle VI-1.3).
- [ ] **F.4** Physiognomic coding is conventional OR the subversion is
      narratively justified (Principle VI-1.4).
- [ ] **F.5** Design maintains 2D flat-design language for transmedia
      portability (Principle VI-1.5).
- [ ] **F.6** Character supports standalone story content (Principle
      VI-2.1).
- [ ] **F.7** Character adds a new facet to the game's worldview
      (Principle VI-2.2).
- [ ] **F.8** Affinity-loop targets (2–3 existing characters) are
      identified (Principle VI-2.3).
- [ ] **F.9** Settei (visual + narrative + production) is complete and
      version-controlled (Principle VI-2.4).
- [ ] **F.10** Cultural-layering strategy is documented (Principle
      VI-2.5).
- [ ] **F.11** Tier-stratified design language matches pull-rate rarity
      (Principle VI-3.1).
- [ ] **F.12** Production-pipeline stage and time-to-release fit weekly
      cadence (Principle VI-3.2).
- [ ] **F.13** Moe engineering (vulnerability + gap-moe + verbal tic)
      is documented (Principle VI-3.3).
- [ ] **F.14** Fan-art virality test (30-minute reproducibility +
      memorable palette + 2–3 drawable elements + cosplay feasibility)
      passes (Principle VI-3.4).
- [ ] **F.15** Cross-media deployment plan and brand-identity
      consistency strategy are documented (Principle VI-3.5).
- [ ] **F.16** Figure-sculpting brief is embedded in settei (Principle
      VI-4.1).
- [ ] **F.17** IP-rights structure is documented (Principle VI-4.2).
- [ ] **F.18** Transmedia character-as-IP portability is verified
      (Principle VI-4.3).
- [ ] **F.19** Region-layered IP strategy is documented IF targeting
      global markets (Principle VI-4.4).
- [ ] **F.20** All Section E production specifications are complete.

---

## G. Source Attribution Index

Each principle above is derived from one or more primary sources in the
Character Design Sourcebook. The mapping is:

| Principle | Primary Source | Sourcebook Section |
|-----------|---------------|-------------------|
| VI-1.1 Silhouette-First Design | Huang Qiurong JSSD 2024; Zhan Tao TGDC 2018 | §II-4; §III-5 |
| VI-1.2 Kawaii Engineering | Li Yingchao Kyoto Seika PhD 2021 | §II-1 |
| VI-1.3 SD / Chibi Formalization | Mogi TEU PhD 2018 | §II-2 |
| VI-1.4 Physiognomic Coding | Matsushita Manga Studies Vol.1 2025 | §II-6 |
| VI-1.5 Transmedia 2D Flatness | Watabe F1000Research 2023 (CC-BY) | §II-3 |
| VI-2.1 Character-as-Content | Cai Haoyu miHoYo GDC 2021 | §III-1 |
| VI-2.2 Worldview-Character Symbiosis | Hypergryph Unite 2020; Zhan Tao TGDC 2018 | §III-6; §III-5 |
| VI-2.3 Affinity Loop Design | Chen Junxiong NetEase GDC China 2015 | §III-2 |
| VI-2.4 IP Bible / Settei | Hypergryph Unite 2020; Zhan Tao TGDC 2018; Bunka-chō | §III-6; §III-5; §I-5 |
| VI-2.5 Cultural Layering | Zhan Tao TGDC 2018; Ke Kai-Ren NTMoFA | §III-5; §IV-4 |
| VI-3.1 Pull-Rate-Stratified Tiers | CEDEC Visual Arts 2025; Genshin artbook | §I-8; §V-6 |
| VI-3.2 Weekly Live-Ops Cadence | Wen Fujun NetEase GDC China 2015; CEDEC Production | §III-3; §I-8 |
| VI-3.3 Moe Engineering | Tencent Game Institute moe≠low-age; Li Yingchao | §III-7; §II-1 |
| VI-3.4 Fan-Art Virality by Design | Watabe F1000Research 2023 (CC-BY) | §II-3 |
| VI-3.5 Character-as-Brand Strategy | METI Anime Action Plan 2025; AJA Industry Reports | §I-4; §I-1 to §I-3 |
| VI-4.1 Figure-Sculpting Briefs | Hypergryph artbook corrigendum; EA UFC GDC China 2014 | §V-5; §III-4 |
| VI-4.2 Production-Committee IP Reality | METI Anime Action Plan 2025; AJA Industry Reports | §I-4; §I-1 to §I-3 |
| VI-4.3 Transmedia Character-as-IP | Watabe F1000Research 2023 (CC-BY) | §II-3 |
| VI-4.4 Region-Layered IP for Global Gacha | Genshin artbook; Cai Haoyu GDC 2021; Ke Kai-Ren | §V-6; §III-1; §IV-4 |

For the full text of each source, see `character_design_sources/JP/` and
`character_design_sources/CN/` in this folder, or the bibliographic-only
references in §V of the sourcebook PDF.

---

## H. Licensing & Attribution

This questionnaire is © 2026 Z.ai, contributed to the Seirin project
under the same terms as the sourcebook. The methodology principles are
original analytical work derived from the 27 primary sources catalogued
in the sourcebook; each principle is attributed to its source(s) in
Section G above. No copyrighted full texts are reproduced in this
questionnaire.
