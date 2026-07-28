# Level 3 Hierarchy: Choice Node Graph & Branching Architecture (v2)
## Project: Seirin: Night Shift — Resonance 2030

This level is the authoritative mirror of the shipped script
(`game/vendor/game.js`, 14 labels). Engine-side invariants: all state changes
go through `FailSafe.vn` (`reversible` / `goTo` / `choiceEffect` / `branch`);

every route-fork is tested in `game/tests/game.test.mjs`.

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

```
================================================================================
            CHAPTER 0 (label Start) — THE SEVEN WAYS, 08:00
================================================================================
                 courtyard scene · sweeper motif · Miya at window
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
 workshop   port      tsukimachi   void         │          │
 alert+15   proc+10   met_kurogane              ▼          ▼
 momo TV    kaito     kurogane             [SoloRoute5]  [AIRoute]
   ▼       ▼         ▼          ▼           dojo       port→lab
[END: ТИХОЕ [END:    [END:     [END:           │            │
 ПОРАЖЕНИЕ] ТРАГИЧ.]  ЗОЛОТАЯ   4-я СТЕНА    S5.1         AI.1
                      КЛЕТКА]                  │            │
                ┌──────── strike alert+30     │            │ connect empathy+5
                └──────── scout  alert+5      │            │ isolate (safe)
                     vn.branch(alert ≥ 30)    │            │
                     ┌────────┴────────┐      │            │
                     ▼                 ▼      ▼            ▼
              [Solo5BadEnd]     [Solo5Standoff]      [MiyaRoute] (M.1 below)
              ЗАХВАЧЕН_truck    НИЧЬЯ_23min          [AI endings below]

================================================================================
 MIYA ROUTE (label MiyaRoute → choice node M.1)
================================================================================
 miya_room · Obryad of Friendship · reversible: met_reika, met_saya
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
 AI ROUTE (label AIRoute → choice node AI.1)
================================================================================
 port → lab · reversible: met_saya · Splash heartbeat line
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
| `procrastination` | A +5, B +3, Solo 2 +10, S5.1-scout +2 | Flavor stat; displayed in Archives |
| `philosophical_depth` | D +10 | Flavor (Solo 4 route identity) |
| `miya_affinity` | F +5, M.1-embrace +5 | Displayed; fuels future Miya content |
| `ai_empathy` | G +5, AI.1-connect +5 | Displayed; fuels AI transcendence arc |
| `akatomi_alert` | E +10, Solo 1 +15, S5.1-strike +30, S5.1-scout +5 | **Gates Solo 5 ending** (`vn.branch`, threshold 30); HUD % |

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
`vn.branch`, and settable `met_*` flags. `offline-smoke.mjs` plays the real
engine through the 7-way choice into the Miya branch and back.
