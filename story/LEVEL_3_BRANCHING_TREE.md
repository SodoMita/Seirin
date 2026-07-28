# Level 3 Hierarchy: Choice Node Graph & Branching Architecture (v2)
## Project: Seirin: Night Shift — Resonance 2030

This level is the authoritative mirror of the shipped script
(`game/vendor/game.js`, 14 labels). Engine-side invariants: all state changes
go through `FailSafe.vn` (`reversible` / `goTo` / `choiceEffect` / `branch`);

every route-fork is tested in `game/tests/game.test.mjs`. Each route opens
with a teaching micro-choice (nodes S1.0–S5.0, M.05, AI.0): `effectChoice`
only, no jumps — they tutorialize stats before the route's commitment node.

### Game Storage State & Variable Schema

```javascript
{
  player: {
    name: "Рэн",              // Operative name (HUD + Archives)
    route: "none",            // 'none' | 'solo_1'..'solo_5' | 'miya' | 'ai'
    procrastination: 0,       // Apathy score
    philosophical_depth: 0,   // 4th-wall awareness
    miya_affinity: 0,         // Trust with 5yo Miya
    ai_empathy: 0,            // Connection with Stella & Splash
    akatomi_alert: 0,         // Corporate alert (%) — GATES Solo 5 ending
    location: "Тэцуба: Улица"
  },
  flags: {
    met_miya: false, met_splash: false, met_stella: false,
    met_reika: false, met_saya: false, met_lumina: false, met_kurogane: false,
    ritual_started: false, magic_rejected: false, happy_ending_achieved: false
    // met_* power the Archives codex; met_lumina reserved for the Chorus route
  }
}
```

Route display names (HUD): `solo_1` Соло I — Уединение · `solo_2` Соло II —
Null-Point · `solo_3` Соло III — Башня · `solo_4` Соло IV — Пустота ·
`solo_5` Соло V — Одиночная война · `miya` Рут Мии · `ai` Рут ИИ.

---

### Shipped Decision Tree

### First-15-Minutes Hook Ladder (audience 14–20)

The prologue is paced to earn the route fork instead of opening on a menu:

| Beat | Minutes | Content | Mechanic taught |
|---|---|---|---|
| 0–2 | atmosphere | Sweeper squares his metre **and nods at Ren** ("he sees his watchers") | World-state text, title banner |
| 2–5 | chemistry | Miya banter from the window (chalk-keeper, no exposition dumps) | Character voice = hook |
| ~3 | agency | **Micro-choice M0 "Ты веришь в магию?"** — instant stat pop | Choices have weight (Before the fork!) |
| 5–8 | anomaly | Looped Momo jingle, too-long anchor smile, `akatomi_alert +3` with HUD pulse | HUD is live, city is not fine |
| 8–12 | stakes | Timebox: "до рассвета — одна попытка" | Urgency framing |
| 12–15 | fork | The Seven Ways, now informed | Big choice = commitment |

```
================================================================================
   CHAPTER 0 (label Start) — HOOK LADDER → THE SEVEN WAYS, 08:00
================================================================================
      courtyard · sweeper's nod · Miya window banter (chalk-keeper gag)
                                       │
                              [MICRO-NODE M.0]
                   «Ты веришь в магию?» (no jump — teach stats)
               ┌──────────────┬──────────────┬──────────────┐
               ▼ Believe      ▼ Skeptic      ▼ Meta
          affinity +2      phil_depth +2   phil +2, affin +1
               └──────────────┴──────┬──────┘
                                      ▼
     anomaly beat: looped jingle, long smile, reversible akatomi_alert +3
     sys: «НОЧНАЯ СМЕНА — до рассвета одна попытка»
                                      │
   ┌───────┬─────────┬─────────┬───────┼─────────┬────────────┬──────────┐
   ▼ A     ▼ B       ▼ C       ▼ D     ▼ E       ▼ F          ▼ G
 Home      Bar      Freelance Bench  LoneFight  Miya          Docks
 solo_1    solo_2   solo_3    solo_4 solo_5     miya          ai
 proc+5    proc+3   —          phil+10 alert+10  affin+5       empathy+5
           │         │          │     │          met_miya      met_splash
           │         │          │     │          ritual_start  met_stella
   ▼       ▼         ▼          ▼     ▼          ▼              ▼
[SoloRoute1][SoloRoute2][SoloRoute3][SoloRoute4]│          │
 workshop   port      tsukimachi   courtyard    ▼          ▼
 S1.0      S2.0      S3.0        S4.0      [SoloRoute5]  [AIRoute]
 micro     micro     micro       micro      dojo S5.0    port→lab AI.0
 alert+15  alert+2   met_kurogane                  │            │
 momo TV   proc+10   kurogane                    │            │
   ▼       ▼         ▼          ▼                S5.1         AI.1
[END: ТИХОЕ [END:    [END:     [END:              │            │
 ПОРАЖЕНИЕ] ТРАГИЧ.]  ЗОЛОТАЯ   4-я СТЕНА        │            │
                      КЛЕТКА]                     │            │
                ┌──────── strike alert+30        │            │ connect empathy+5
                └──────── scout  alert+5         │            │ isolate (safe)
                     vn.branch(alert ≥ 30)       │            │
                     ┌────────┴────────┐         │            │
                     ▼                 ▼         ▼            ▼
              [Solo5BadEnd]     [Solo5Standoff]         [MiyaRoute] (M.05, M.1 below)
              ЗАХВАЧЕН_truck    НИЧЬЯ_23min             [AI endings below]

================================================================================
 ROUTE MICRO-BEATS (teaching choices — effectChoice only, NO jumps)
================================================================================
 S1.0 (SoloRoute1) «Идеальный вечер ничегонеделания начинается с…»
   ├ Марафон роликов   → proc +5
   ├ Сон «на пять минут» → proc +3
   └ Взгляд на «Титана»  → proc +2, phil +1
 S2.0 (SoloRoute2) «За что пьём, механик?»
   ├ За status quo     → proc +3
   ├ За непришедших    → phil +2
   └ За громкость      → proc +2
      (then reversible: akatomi_alert +2 — bass synced to Lattice test 27%)
 S3.0 (SoloRoute3) «Как пройдёт твоя первая неделя в башне?»
   ├ Блестяще и молча  → alert +3
   ├ Спросить про инфразвук → phil +2, alert +5
   └ Тихий журнал команд    → phil +3
 S4.0 (SoloRoute4) «Проверка реальности начинается с…»
   ├ Небо (облака по кругу) → phil +2
   ├ Память (вчера = сегодня) → phil +3
   └ Мысленный звонок Мие   → phil +1, miya_affinity +1
 S5.0 (SoloRoute5) «Последняя проверка снаряжения»
   ├ Тройные ЭМИ-заряды → alert +2
   ├ Расписание патрулей → phil +2
   └ Ключ Рейки (талисман) → phil +1
      BALANCE LOCK: worst watchful path = 3 + 10 + 2 + 5 = 20 < 30 (tested)
 M.05 (MiyaRoute) «Вклад хранителя мела в Большой Круг»
   ├ Медная проволока «нити судьбы» → miya_affinity +2
   ├ Светодиод «светлячок-хранитель» → miya_affinity +1, ai_empathy +1
   └ Честно: «просто резистор»      → miya_affinity +1, phil +2
 AI.0 (AIRoute) «Как поздороваться со Сплеш?»
   ├ Ритм сердца по стеклу → ai_empathy +2
   ├ «Привет. Я Рэн» вслух → ai_empathy +1, phil +1
   └ Вопросы про нейросеть → phil +2

================================================================================
 MIYA ROUTE (label MiyaRoute → micro-node M.05 → choice node M.1)
================================================================================
 miya_room · Obryad of Friendship · artifact catalogue beat
 micro-node M.05 — «Вклад хранителя мела» (deltas above, no jump)
 stakes beat: Kurogane's surveyor drones measure the park through the window
 reversible: met_reika, met_saya
 reika (toy chair) + saya (juice as potion) lines
        choice M.1 — "Мия протягивает тебе кусок мела:"
   ┌────────────────────────────┴────────────────────────────┐
   ▼ Embrace (miya_affinity +5)                               ▼ Reject (flags.magic_rejected)
[MiyaEndingHarmony]                                    [MiyaEndingGuardian]
 cathedral · met_kurogane · happy_ending_achieved     cathedral · happy_ending_achieved
 kurogane outburst → reika pact + saya broadcast      "adult" protection: petition + lawyer
 miya: «Заклинание сработало!»                        miya: скучная, но настоящая магия
 [END: ГАРМОНИЯ ФРАКЦИЙ]                              [END: ХРАНИТЕЛЬ БЕЗ МАГИИ]

================================================================================
 AI ROUTE (label AIRoute → micro-node AI.0 → choice node AI.1)
================================================================================
 port → lab · reversible: met_saya · Splash heartbeat line
 docks beat: Stella's light net dimmed "until orders" (transcendence seed)
 micro-node AI.0 — «Как поздороваться со Сплеш?» (deltas above, no jump)
 saya dilemma line: empathy appeared a month ago
        choice AI.1 — "Сплеш прижалась гелевой ладонью к стеклу:"
   ┌────────────────────────────┴────────────────────────────┐
   ▼ Connect (ai_empathy +5)                                  ▼ Isolate (safety, no delta)
[AIEndingTranscendence]                                [AIEndingIsolation]
 bay constellation · happy_ending_achieved             quiet tank, half-lit
 stella + splash harmonize                             saya self-doubt / splash «так тихо»
 [END: ТРАНСЦЕНДЕНТНОСТЬ]                               [END: ТИШИНА В АКВАРИУМЕ]
================================================================================
```

---

### Stat Sources & Sinks

| Stat | Sources (choices/actions) | Sink / effect |
|---|---|---|
| `procrastination` | A +5, B +3, S1.0 +2..+5, S2.0 +2..+3, Solo 2 +10, S5.1-scout +2 | Flavor stat; displayed in Archives |
| `philosophical_depth` | M.0 Skeptic +2 / Meta +2, D +10, S1.0 +1, S2.0 +2, S3.0 +2..+3, S4.0 +1..+3, S5.0 +1..+2, M.05 +2, AI.0 +1..+2 | Flavor (Solo 4 route identity) |
| `miya_affinity` | M.0 Believe +2 / Meta +1, F +5, S4.0 +1, M.05 +1..+2, M.1-embrace +5 | Displayed; fuels future Miya content |
| `ai_empathy` | G +5, M.05 +1, AI.0 +1..+2, AI.1-connect +5 | Displayed; fuels AI transcendence arc |
| `akatomi_alert` | Prologue anomaly +3, E +10, Solo 1 +15, S2.0 note +2, S3.0 +3..+5, S5.0 +2, S5.1-strike +30, S5.1-scout +5 | **Gates Solo 5 ending** (`vn.branch`, threshold 30); HUD % pulses on rise |

### Flag Sources

| Flag | Set by |
|---|---|
| `met_miya`, `ritual_started` | Choice F (Start) |
| `met_splash`, `met_stella` | Choice G (Start) |
| `met_reika`, `met_saya` | MiyaRoute arrival step (reversible) |
| `met_saya` (AI) | AIRoute arrival step (reversible) |
| `met_kurogane` | SoloRoute3 arrival; MiyaEndingHarmony |
| `magic_rejected` | M.1 Reject choice |
| `happy_ending_achieved` | MiyaEndingHarmony, MiyaEndingGuardian, AIEndingTranscendence |

### Test coverage hooks
`game/tests/game.test.mjs` pins: the 14-label inventory, all 11 `routeChoice`
jump targets, absence of quoted `vn.goTo` strings, presence of a fully-armed
`vn.branch`, settable `met_*` flags, the per-route micro-beat ordering
(micro-choice strictly before each commitment node; micro-choices never
jump), and the Solo 5 balance lock (worst-case watchful alert < 30 ≤ any
strike path). `offline-smoke.mjs` plays the real engine through the 7-way
choice into the Miya branch and back, and applies+reverts one micro-beat per
route checking exact stat deltas and rewind.
