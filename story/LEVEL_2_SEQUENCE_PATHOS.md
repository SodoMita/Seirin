# Level 2 Hierarchy: Macro Sequence, Pathos Set-Pieces & Route Outcomes (v2)
## Project: Seirin: Night Shift — Resonance 2030

### Macro Sequence of Events (matches shipped node graph)

```
                     [CHAPTER 0: ORDINARY STREET WALK — 7 options A–G]
                                     │
   ┌─────────┬──────────┬───────────┼────────────┬────────────┬───────────┐
   ▼ A       ▼ B        ▼ C         ▼ D          ▼ E          ▼ F         ▼ G
[SOLO 1]  [SOLO 2]   [SOLO 3]    [SOLO 4]     [SOLO 5]     [MIYA]      [AI]
 Home      Null-Point  Tower     4th Wall     Dojo prep    Playroom   Docks→Tank
   │         │          │           │       S5.1 choice    M.1 choice  AI.1 choice
   ▼         ▼          ▼           ▼        alert≥30?       │            │
[ТИХОЕ    [ТРАГИЧ.   [ЗОЛОТАЯ   [ВЫХОД   ┌───┴────┐    ┌────┴───┐   ┌───┴─────┐
 ПОРАЖЕНИЕ] ФИНАЛ]    КЛЕТКА]    ЗА ПРЕД.]│        │    │        │   │         │
                                СЦЕНАРИЯ][ЗАХВАЧ.][НИЧЬЯ] [ГАРМОНИЯ][ХРАНИТ.]│
                                                         └────────┘[ТРАНСЦЕНД.]
                                                                      [ТИШИНА]
```

Timeline canon: everything between 08:00 and dawn, when the Resonance
Lattice either goes live — or loses its night. Solo routes *end before* dawn
(the city is already lost); Miya/AI routes reach dawn with a changed city.

---

### High-Pathos Set-Pieces across Routes

#### 1. "The Street Sweeper & Miya's Window" (Chapter 0 / Miya Route)
- **Setting:** Tsukimachi courtyard; Miya's third-floor window, cathedral
  spire and cedar forest behind her.
- **Dramatic core:** the sweeper has swept the same square metre since before
  Ren was born. He sees every watcher — and simply keeps sweeping. Miya asks:
  *«If I sweep my chalk drawings away, does the day start over?»*
- **Seed note (from `plot/пролог_Мии.txt`):** watching is curiosity, not
  surveillance — and it must turn into something important. That "something"
  is the playground pact of the harmony ending.

#### 2. "The Closed Blinds" (Solo 1 climax)
- Silence inside; the purple circular-wave icon replaces the network logo;
  anchors smile too widely; **Momo's voice pours from every open window.**
  Ren turns the screen off and rolls to the wall. *ТИХОЕ ПОРАЖЕНИЕ.*

#### 3. "The Last Set at Null-Point" (Solo 2 climax)
- **Setting:** Basement club under the rusted port vaults; Kaito banging the
  sticky table: *«Да какая разница, кто нами управляет?!»*
- Months blur into ringing ears. When Akatomi patrols seal the club, the
  bass is still so loud nobody hears the sirens; nobody can stand up anyway.
  The truck route is read out like a set list: *клуб → грузовик → Шельф-4.*
- **Pathos:** self-destruction as a group activity — the loneliest crowd in
  Seirin.

#### 4. "Whiskey on the 84th Floor" (Solo 3 climax)
- **Setting:** Akatomi executive tower at night; the ocean on one side, the
  frozen puppet-city on the other.
- Kurogane pours and means every word: *«Все слушают нашу музыку и не задают
  вопросов.»* Ren has money, a view, corporate privileges — and the exact
  ending Solo 1 had, furnished better. *ЗОЛОТАЯ КЛЕТКА.*

#### 5. "Break through the Mirror" (Solo 4 climax)
- The bench, the too-accurate sky, the sound of keyboard keys from beyond.
  Ren reads his own dialogue options aloud, touches the screen edge, names
  the variables (`procrastination`, `akatomi_alert`, `miya_affinity`), and
  steps through the line of text into the unwritten. *ВЫХОД ЗА ПРЕДЕЛЫ
  СЦЕНАРИЯ.*

#### 6. "Twenty Minutes of Blind Zone" / "Trap #1" (Solo 5 climax, stat-gated)
- **Setting:** Abandoned dojo → Substation 09 perimeter.
- If Ren strikes the same night (`akatomi_alert ≥ 30`): the 'Опекун-9'
  turrets already know his route — a capture narrated as the first of dozens
  of loss traps the route *could* have hit. *ЛОВУШКА №1: ЗАХВАЧЕН.*
- If he scouts for a week first: 23 minutes of blind zone, one relay tower
  disabled, and the city's hum unchanged by a decibel. One is not an army —
  but he can no longer stop. *НИЧЬЯ.*

#### 7. "The Cathedral Circle" (Miya harmony ending)
- Chalk, petals and copper wire on the cathedral courtyard at sunset.
  Demolition drones frozen at the perimeter; Kurogane stepping out of the
  limousine into Reika's hydraulic platforms and Saya's live broadcast.
  No magic happened — *«See? The spell worked!»* — and that is the magic.
  *СЧАСТЛИВЫЙ ФИНАЛ МИИ — ГАРМОНИЯ ФРАКЦИЙ.*

#### 8. "Splash's Translucent Tears" (AI transcendence ending)
- Splash's gel body glowing cyan, water droplets like tears on her visor as
  Stella's memory array floods in; Saya's palm against the tank glass; an
  artificial constellation above the bay. *ТРАНСЦЕНДЕНТНОСТЬ.*
- The Isolation variant is deliberately anti-pathos: the same tank, quiet,
  lit exactly halfway. *ТИШИНА В АКВАРИУМЕ.*

---

### Endings Inventory (shipped)

| Ending | Route | Tone | Condition |
|---|---|---|---|
| ТИХОЕ ПОРАЖЕНИЕ | Solo 1 | Quiet defeat | — |
| ТРАГИЧЕСКИЙ ФИНАЛ | Solo 2 | Decay | — |
| ЗОЛОТАЯ КЛЕТКА | Solo 3 | Hollow victory | — |
| ВЫХОД ЗА ПРЕДЕЛЫ СЦЕНАРИЯ | Solo 4 | Melancholy transcendence | — |
| ЛОВУШКА №1: ЗАХВАЧЕН | Solo 5 | Trap | `akatomi_alert ≥ 30` |
| НИЧЬЯ | Solo 5 | Grim persistence | `akatomi_alert < 30` |
| ГАРМОНИЯ ФРАКЦИЙ | Miya | Happy | M.1 = embrace magic |
| ХРАНИТЕЛЬ БЕЗ МАГИИ | Miya | Happy | M.1 = reject magic |
| ТРАНСЦЕНДЕНТНОСТЬ | AI | Transcendent | AI.1 = connect lattice |
| ТИШИНА В АКВАРИУМЕ | AI | Sombre safety | AI.1 = isolate core |

Both Miya endings and the Transcendence ending set
`flags.happy_ending_achieved = true` (drives the Archives "ФИНАЛЫ" section).
