# Level 3 Hierarchy: Choice Node Graph & Branching Architecture
## Project: Seirin: Night Shift — Resonance 2030

### Game Storage State & Variable Schema

```javascript
{
  player: {
    name: "Рэн",              // String: Operative name
    route: "none",            // Enum: 'solo_1', 'solo_2', 'solo_3', 'solo_4', 'solo_5', 'miya', 'ai', 'faction'
    procrastination: 0,       // Integer (0-10): Apathy score
    philosophical_depth: 0,   // Integer (0-10): 4th wall awareness
    miya_affinity: 0,         // Integer (0-10): Trust with 5yo Miya
    ai_empathy: 0,            // Integer (0-10): Connection with Stella & Splash
    akatomi_alert: 0,         // Integer (0-100): Corporate alert score
    location: "Тэцуба: Улица"
  },
  flags: {
    met_miya: false,
    met_splash: false,
    met_stella: false,
    met_reika: false,
    met_saya: false,
    met_lumina: false,
    met_kurogane: false,
    ritual_started: false,
    magic_rejected: false,
    happy_ending_achieved: false
  }
}
```

---

### Detailed Route Selection & Decision Tree

```
=================================================================================
                    CHAPTER 0: ORDINARY STREET WALK & PROLOGUE
=================================================================================
                                       │
                                [START IN ROOM]
                                       │
                             [CHOICE NODE 0.1]
                  ┌────────────────────┴────────────────────┐
                  ▼                                         ▼
         [Stay Home / Sleep]                       [Walk Out to Street]
         • route = 'solo_1'                        • location = 'Тэцуба: Улица'
                  │                                         │
                  ▼                                         ▼
         [SOLO ROUTE 1: HOME]                      [CHOICE NODE 0.2]
       (Enemy Corporate Victory)         ┌──────────────────┼──────────────────┐
                                         ▼                  ▼                  ▼
                                  [Visit Miya]       [Visit Docks]     [Tetsuba Bar]
                                  • met_miya=true    • met_splash=true • route='solo_2'
                                         │                  │                  │
                                         ▼                  ▼                  ▼
                                   [MIYA ROUTE]         [AI ROUTE]     [SOLO ROUTE 2]
                                 (Mystic Rituals)   (Stella & Splash)  (Self-Destruct)

                                         │                  │
                                         └─────────┬────────┘
                                                   │
                                           [CHOICE NODE 0.3]
                                ┌──────────────────┴──────────────────┐
                                ▼                                     ▼
                       [Corporate Freelance]                 [Refuse All Factions]
                       • route = 'solo_3'                    • route = 'solo_4' / 'solo_5'
                                │                                     │
                                ▼                                     ▼
                       [SOLO ROUTE 3: SUCCESS]               [SOLO 4: 4TH WALL]
                       (Global Dystopia)                     [SOLO 5: LONE FIGHT]

=================================================================================
                          MIYA'S MYSTICAL RITUAL ROUTE
=================================================================================
                                       │
                             [Miya's Playroom Window]
                                       │
                             [CHOICE NODE M.1]
                  ┌────────────────────┴────────────────────┐
                  ▼                                         ▼
         [Embrace Magic Rituals]                   [Reject Magic / Protect Miya]
         • ritual_started = true                   • magic_rejected = true
         • Allies with Factions                    • Fights Corporate Threat
                  │                                         │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                       [HAPPY ENDING: FACTION HARMONY]
                     (Saves Playground & >1 Faction)

=================================================================================
                       STELLA & SPLASH AI ROUTE
=================================================================================
                                       │
                           [Aquaforge Research Tank]
                                       │
                             [CHOICE NODE AI.1]
                  ┌────────────────────┴────────────────────┐
                  ▼                                         ▼
         [Connect Neural Lattice]                  [Isolate Core Data]
         • ai_empathy +5                           • Splash safety
                  │                                         │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                         [AI TRANSCENDENCE ENDING]
