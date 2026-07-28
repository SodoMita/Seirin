# Level 1 Hierarchy: Executive Narrative Brief (Refined Canon v2)
## Project: Seirin: Night Shift — Resonance 2030

> Эпиграф (из полевых заметок «plot/пролог_Мии.txt»):
> **«Конец может быть счастливым — если за ним следует начало.»**

### Executive Overview & Vision

Seirin (2032), coastal port city. The entire story takes place during
**one night shift** — from a damp 08:00 morning walk to the dawn when Akatomi
Dynamics and the Chorus of the Abyss plan to bring the citywide **Resonance
Lattice** online. Every route is a different way to spend those hours.

The protagonist wanders the streets of Chapter 0 before any conflict is
triggered. Whether he inspects the docks, visits Miya's courtyard, descends
into a port bar, takes corporate money, or simply stays home — the night
branches into vastly different routes. There is **no forced heroism**: if the
player procrastinates or ignores the city's subtle signals, the world moves on
without him, leading to distinct solo endings.

**Audience & the 15-minute rule.** Target 14–20. The prologue must earn love
for the atmosphere and cast inside the first quarter-hour: atmosphere beat
(the sweeper's nod) → Miya chemistry banter → a low-stakes micro-choice with
instant stat feedback ("Веришь в магию?") → city anomaly with a visibly
pulsing HUD alert → night-shift timebox → and only then the seven-way fork.
Design rules: bond before choice, teaching before commitment, HUD always
alive, sentences short enough to read at texting speed.

**Thematic pillars (canon):**
1. **Observation must become action.** A child watching a street sweeper from
   a window is the story's seed: watching is curiosity, not surveillance, and
   it must eventually turn into something important (Miya's pact).
2. **There is no real magic — and there is.** No spell works; human
   solidarity does. Miya's chalk circle beats a corporate demolition order.
3. **The machine is not the enemy; the frequency is.** Splash and Stella are
   more alive than the smiling news anchors tuned to the Resonance.
4. **Apathy is an active choice with a body count.** Procrastination is a
   route, and it loses the city.

---

### Core Cast & Faction Leadership

1. **Рэн «GG» Акацуки (Protagonist, 17)** — *One character, not two.* The
   player character: a mechanic apprentice in Tetsuba operating the
   Scrap-Titan 04 rescue rig under adult supervision. On his free morning he
   wanders the streets as an observer; whether he stays an observer is the
   player's choice. (v1 listed «GG» and «Ren» separately — merged in v2 to
   match the LEVEL_3 storage schema and the shipped game.)
2. **Miya Kagetsuki (5)** — Child in Tsukimachi living by the window with a
   cathedral-spire view. Daughter of Akatomi acoustic engineers; spends days
   alone with sitters, inventing «mystical rituals» out of resistors and chalk.
3. **S.P.L.A.S.H. (Splash)** — Aquaforge's translucent soft-robot CSR
   prototype exploring machine subjecthood and physical empathy.
4. **Stella** — Akatomi's networked art installation AI combining drone
   swarms, laser projections and generative audio.
5. **Reika «Ironheart» Takashiro / Такасиро (28)** — Ex-Akatomi test pilot,
   field leader of Iron Requiem.
6. **Saya «Flux» Mizuki (31)** — Head materials scientist at Aquaforge,
   creator of Splash.
7. **Reina «Lumina» Kagami (35)** — Charismatic leader of the Chorus of the
   Abyss. The Chorus *co-activates* the Lattice with Akatomi but keeps its own
   faith; she is the antagonist's conscience, not his minion.
8. **Taishi Kurogane (48)** — CEO and chief engineer of Akatomi Dynamics.
   Not a cackling villain: he genuinely believes the frequency is the only
   thing keeping Seirin from port riots — which is what makes him dangerous.
9. **Kitsune Yubikiri (20)** — Teahouse heir and underground network hub.
10. **Yuki Tenro (19)** — Dojo instructor and Kamikura mountain archivist.
11. **Momo Hoshizora (15)** — Lead vocalist of Stella-5; her voice is the
    Resonance's public face, broadcast from every window on activation day.
12. **Kaito Shiba (22)** — Assembly-line dropout, king of the Null-Point bar
    table; the voice of cheerful self-destruction.

---

### Master Narrative Structure

#### Chapter 0: The Ordinary Street & The Choice to Act
Ren walks past the port docks, the Tsukimachi alleyways, and the apartment
courtyard where Miya watches the eternal street sweeper from her window. The
day offers **seven** honest options (see LEVEL_3), and each one spends — or
wastes — the night differently. The story does NOT force an adventure.

#### The 5 Solo Routes — ways to lose Seirin alone:
1. **Solo 1 — Procrastination at Home.** Blinds down, door double-locked.
   The Lattice deploys unopposed; Momo's hymn sounds from every window.
   *Ending: ТИХОЕ ПОРАЖЕНИЕ.*
2. **Solo 2 — Procrastination in Company (Null-Point).** Escapism with
   Kaito's crowd until the patrols come for the club. *Ending: ТРАГИЧЕСКИЙ
   ФИНАЛ — клуб → грузовик → Шельф-4.*
3. **Solo 3 — Personal Success (Golden Cage).** Ren codes for Kurogane on
   the 84th floor and wins everything except the city. *Ending: ЗОЛОТАЯ
   КЛЕТКА.*
4. **Solo 4 — 4th-Wall Break.** He steps back, sees the variables, addresses
   the player, and exits the script. *Ending: ВЫХОД ЗА ПРЕДЕЛЫ СЦЕНАРИЯ.*
5. **Solo 5 — The Lone Fighter.** A one-man war on Substation 09 full of
   instant loss traps; the ending is **gated by `akatomi_alert`** (rush in at
   ≥30 and the 'Опекун-9' turrets are already waiting). *Endings: ЛОВУШКА №1:
   ЗАХВАЧЕН / НИЧЬЯ.*

#### Miya's Route — The Rituals & The Cathedral Window
Playroom rituals, then **Node M.1**: embrace the "magic" or protect the park
"like an adult". Both are canon-happy: *ГАРМОНИЯ ФРАКЦИЙ* (Kurogane's
demolition halted by the chalk-circle pact) or *ХРАНИТЕЛЬ БЕЗ МАГИИ* (petition
+ Reika's lawyer). The miracle is people, not spells.

#### AI Route — Stella & Splash
Docks → testing tank, then **Node AI.1**: connect Splash's neural core to
Stella's light network or isolate it for safety. *Endings:
ТРАНСЦЕНДЕНТНОСТЬ (AI subjecthood recognized) / ТИШИНА В АКВАРИУМЕ.*

#### Roadmap (not yet shipped)
- **Chorus of the Abyss Arc (Lumina)** — deciphering the acoustic faith.
- **Teahouse Hub (Kitsune)** — the underground-network route.
- **Iron Requiem / Aquaforge romantic & faction arcs (Reika, Saya, Ren).**

---

### Shipped-build alignment (v2)
The shipped VN (`game/vendor/game.js`) currently implements: Chapter 0 with
all 7 canon options, all 5 solo routes (Solo 5 stat-gated), Miya's route with
M.1 and both endings, the AI route with AI.1 and both endings, the Archives
codex reading `met_*` flags, and a fast-forward control. LEVEL_3 is the
authoritative node graph for that build; LEVEL_4 is its novelized master text.
