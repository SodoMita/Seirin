# Cyber-Nexus: The Static Singularity

A Monogatari visual novel that runs **100% offline from the local filesystem**,
guarded by **FailSafe** (`vendor/failsafe.js`) — a zero-dependency abstraction
layer that makes the game logic hard to break: storage schema validation,
rollback-safe mutations, a script linter, a tiny state machine, exhaustive
matching, and an active no-fetch guard.

## How to run

Double-click **`index.html`**. That's it — no web server, no build step, no internet.

## Tests

```bash
# 1. Unit tests for the failsafe library + icon shim — zero dependencies
node --test tests/failsafe.test.mjs tests/icons-offline.test.mjs

# 2. Offline smoke test — loads the real page over file:// and asserts:
#    no remote requests, no runtime fetch, lint CLEAN, icons mapped,
#    rollback restores snapshots. Needs jsdom (dev-only, never shipped):
#    `npm i jsdom` anywhere on the module path, e.g. cyber-nexus/node_modules
node tests/offline-smoke.mjs

# 3. Full browser regression (Playwright, optional)
python tests/test_rewind.py
```

## What was broken, and what I changed

### 1. Nothing worked after a choice  ← the main bug

In Monogatari 2.x, a choice's `Do` must be a **statement** (e.g. `'jump Label'`).
The original code used arrow functions that *returned* a jump string:

```js
'Do': () => {
    monogatari.storage().player.karma += 20;
    return 'jump Chapter1_SideAria';   // <-- silently discarded
}
```

The engine calls the function but **ignores the return value**, so the story
advanced past the end of the label and froze. Confirmed by instrumenting the
engine: the game got stuck at `Chapter1_Dive` step 12 with no way forward, and
clicking did nothing.

Fixed by splitting the two concerns the way the engine expects (today the
choice side effects are built with `vn.choiceEffect`, which pairs `onChosen`
with a snapshot-correct `onRevert` — see rule 5):

```js
'SideWithAria': Object.assign({
    'Text': '...',
    'Do': 'jump Chapter1_SideAria'
}, vn.choiceEffect({ karma: 20 }, { sided_with_aria: true }))
```

Stat-gated branching (the "needs HACK 4+" option) can't be expressed in `Do`
at all, so it now routes through a `Conditional` statement, which *is* the
engine's supported mechanism:

```js
'Chapter3_HackAttempt': [
    vn.branch(
        function () { return engine.storage('player').hacking >= 4; },
        { 'True': 'jump Chapter3_SuccessHack', 'False': 'jump Chapter3_FailedHack' }
    )
]
```

### 2. `window.monogatari` was hijacked by the DOM

The container was `<div id="monogatari">`. Browsers expose every `id` as a
global, so `window.monogatari` pointed at the **div**, not the engine. Every
HUD update and mini-game reward silently no-opped (`monogatari.storage` was
not a function). The container is now `id="vn-root"` and the engine is exposed
deliberately as `window.engine`.

### 3. Broken / missing images

* Scene and sprite images were hot-linked from `images.pexels.com`, so with no
  connection the game rendered on a blank background.
* The "character sprites" were rectangular stock **photos** with opaque
  backgrounds — they showed up as photo blocks pasted over the scene, not as
  VN sprites.

Now everything is local under `assets/`, and the four characters are real
cut-out sprites with transparent alpha channels.

### 4. It needed a server

Removed the runtime dependencies on the Tailwind CDN, the FontAwesome CDN, the
Google Fonts CDN and the jsDelivr Monogatari build. Also removed the
`Content-Security-Policy` meta tag (`default-src 'self'` is hostile to
`file://`) and the Pexels `AssetsPath` root. Engine settings pin this down:
`'ServiceWorkers': false` (service workers cannot register on `file://`) and
`'Preload': false`.

**Icon gap, fixed properly this time:** earlier revisions claimed "FontAwesome
uses the copy the Monogatari bundle already ships" — but `monogatari.css` only
contains the FA class *names*, not the icon *font*, so every `<i class="fas
fa-…">` glyph (quick menu, settings, HUD, choices) silently rendered as an
empty box after the CDN link was removed. Icons are now provided by
`vendor/icons-offline.css` (every fa-* class the engine and game use is mapped
to a Unicode glyph — zero font files, zero fetches) plus
`vendor/icons-offline.js`, a failsafe that marks and names any *unmapped* icon
in the console instead of shipping a broken box. The v6 `fa-solid` /
`fa-location-dot` names were also reverted to the v5 names the engine emits.

Finally, `FailSafe.net.guard()` wraps `fetch`/`XMLHttpRequest`/`sendBeacon`/
`WebSocket`/`EventSource` at boot: in a page that must never need a server, a
network attempt is a bug, and now it's a loud one (console error with a stack
trace; `mode: 'block'` for tests).

### 5. Rewind (Back button) corrupted or froze the game state

Monogatari has **no story DSL and no failsafe abstractions** — the script is
raw JS objects. The engine therefore cannot tell that a function mutated state,
and it has no way to invert one for you. Two consequences, both reproduced in a
browser:

**(a) A bare `function () {...}` step silently disables Back.** The engine's
rollback stops dead at it — the Back button just does nothing.

**(b) A Choice with `onChosen` but no `onRevert` is declared non-reversible.**
`Choice.willRevert` rejects with *"The choice taken is not reversible because it
did not defined a `onRevert` function."* The story rewinds past the choice but
the stats it changed stay applied — take the +20 karma option, hit Back, and you
keep the karma while standing before the choice again.

This mattered because fix #1 moved all the side effects into `onChosen`.

Fixed by routing **every** mutation through the `FailSafe.vn` facade, so
nothing in the script mutates state directly. The facade snapshots the
previous values at Apply-time and restores them at Revert-time — rollback is
correct *by construction*, unlike the earlier hand-written inverses
(subtract-the-delta, boolean-NOT-the-flag), which corrupted state whenever a
flag was already true before the choice that set it (the previous
`!flags[f]` revert would wrongly clear it):

| FailSafe helper | Use for | Mechanism |
|---|---|---|
| `vn.reversible(spec)` | stat / flag changes | engine `{Function: {Apply, Revert}}` + LIFO snapshot stack |
| `vn.goTo(location)` | location + HUD changes | same; previous location captured at apply-time |
| `vn.choiceEffect(deltas, flags)` | choice side effects | matched `onChosen` / `onRevert` with snapshot restore |
| `vn.branch(cond, {True, False})` | stat-gated branching | Conditional that can't throw and always has False |
| `vn.validateStorage(schema)` | saves / boot storage | zod-lite validation + default repair, reported not crashed |
| `vn.lintScript()` | the whole script | machine-checks the rules above on every boot (console) |
| `FS.machine(...)` | route/phase state (mini-game) | impossible state transitions become impossible |
| `FS.match(v)...exhaustive()` | outcome resolution | unhandled cases throw in dev console |

Verified:

```
TEST 1 rollback across reversible():
   start 1 -> fwd 4 (hack 5) -> back 1 (hack 3)
   [PASS] Back actually moves (was blocked by bare fn before)
   [PASS] hacking un-awarded on rewind

TEST 2 rollback across choice onChosen/onRevert:
   before  karma=0  aria=False
   chosen  karma=20 aria=True
   rewound karma=0  aria=False
   [PASS] karma restored to pre-choice value
   [PASS] sided_with_aria flag restored
   [PASS] no 'not reversible' warning
```

The one remaining bare function in the script is the `Conditional.Condition`,
which only *reads* state — that one is correct as-is.

### 6. Smaller fixes

* `Chapter1_Dive` called `hide character nyx` after `show scene`, which already
  clears characters → console error "Attempted to hide a character that was not
  being shown." Removed.
* Choice buttons rendered flush-left because the engine wraps them in a
  `[data-content="wrapper"]` set to `flex-start`; both levels are now centred.
* Main-menu buttons were clipped off the right edge (the engine pins
  `main-menu` bottom-right with no padding); the menu is now centred, with a
  title card.
* The `Input` `Save` handler now returns `true`, and sprites sit above the
  dialog box instead of behind it.

## Verified in a real browser

Automated Chromium playthroughs (Playwright) walk all five routes from the main
menu to an ending, asserting the story never stalls and that no image is
broken:

| Route | Path | Result |
|---|---|---|
| Lore → Aria → power grid | `Start → Prologue_Lore → Chapter1_Dive → Chapter1_SideAria → Chapter2_Confrontation → Ending_A_Singularity` | PASS |
| Dive → Corp → surrender | `Start → Chapter1_Dive → Chapter1_SideCorp → Chapter2_Confrontation → Ending_B_Corporate` | PASS |
| Dive → Aria → escape | `Start → Chapter1_Dive → Chapter1_SideAria → Chapter2_Confrontation → Ending_C_Refuge` | PASS |
| Hack at LVL 3 (gate fails) | `... → Chapter3_FailedHack → Ending_B_Corporate` | PASS |
| Hack at LVL 5 (gate passes) | `... → Chapter3_SuccessHack → Ending_A_Singularity` | PASS |

A second run with **`offline: true` and every non-`file://` request aborted**
reports: `EXTERNAL REQUESTS ATTEMPTED: NONE`, no JS errors, all three fonts
loaded, 34 FontAwesome icons rendered, choices advancing, and the Codex and
Matrix-Hack widgets updating the HUD (HACK 3 → 4, 500 → 600 CR).

## Layout

```
index.html                        (markup + CSS only — no inline <script>)
vendor/
  monogatari.js, monogatari.css   (engine, local copy)
  failsafe.js                     (abstraction layer: schema, state machine,
                                   match, immut, result, vn glue, net guard)
  game.js                         (story script, HUD, codex, mini-game, boot;
                                   extracted from index.html so it can be
                                   linted and unit-tested)
  icons-offline.css, icons-offline.js  (FA-class → Unicode glyph shim + failsafe)
assets/
  scenes/       4 backgrounds (jpg)
  characters/   4 sprites (transparent png)
  fonts/        Orbitron, Rajdhani, Share Tech Mono (woff2) + fonts.css
tests/
  failsafe.test.mjs     (node --test; failsafe library unit tests, zero dependencies)
  game.test.mjs         (node --test; game.js pure helpers + payout regression, zero dependencies)
  icons-offline.test.mjs(node --test; icon glyph-map coverage, zero dependencies)
  es5-scan.mjs          (helper: ES5-shape scanner used by the tests above)
  offline-smoke.mjs   (file:// boot verification; needs dev-only jsdom)
  test_rewind.py      (full-browser rollback regression; needs playwright)
```

### Why the game code is a separate file

It used to be a 653-line inline `<script>` inside `index.html`. Nothing could
lint, unit-test or usefully open it there — the jsdom smoke test was the only
thing that ever executed it, and that test skips by default. Moving it to
`vendor/game.js` was a pure move (byte-for-byte identical body), and it is what
makes `tests/game.test.mjs` possible. The file still ships as a plain ES5
`<script src>`: no build step, no modules, no dependencies.

## Note on the artwork

The backgrounds and character sprites are AI-generated placeholders created for
this fix so the game has working, correctly-shaped local art. Swap in your own
files of the same names and everything keeps working.
