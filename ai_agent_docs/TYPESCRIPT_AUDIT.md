# Audit: `cyber-nexus/` — and would TypeScript help in the future?

Date: 2026-07-26 · Scope: the example game (`cyber-nexus/`), its vendored
libraries and its tests. Asset directories are out of scope.

**Short answer: yes — but only the *type-checking* half of TypeScript, not the
*compiler* half.** A `// @ts-check` + JSDoc setup (plus one hand-written
`.d.ts` for the engine) buys most of the value while keeping the project's
hardest invariant — no build step, double-click `index.html` — intact. Emitting
JS from `.ts` sources is the one variant I'd argue against for this repo, at
least until there is a second game.

---

## 1. What the project actually is

| Unit | Lines | Nature |
|---|---:|---|
| `index.html` | 1298 | ~640 lines markup/CSS, **653 lines inline `<script>`** (12 functions, the whole story script, HUD, minigame, boot) |
| `vendor/failsafe.js` | 841 | Hand-rolled ES5 UMD lib: `result`, `schema`, `immut`, `match`, `machine`, `vn`, `net` |
| `vendor/icons-offline.js` | 97 | FA-class → glyph shim + missing-icon failsafe |
| `vendor/icons-offline.css` | 82 | glyph map |
| `vendor/monogatari.js` | 1865 | **Third-party, minified Parcel bundle.** Not ours to touch |
| `tests/` | 623 | `node --test` unit tests (0 deps), jsdom `file://` smoke test, Playwright Python rewind regression |

Constraints from `AGENTS.md` that any proposal must respect:

- Runs from `file://` by double-click: no server, no CDN, no runtime `fetch`.
- **"There is no build step. Do not add npm/bundler tooling to the game folder;
  new vendor code must be plain ES5-compatible browser JS with zero deps."**
- All story mutation routed through `FailSafe.vn`; `vn.lintScript()` enforces
  it at boot.

### Current health

Good. `node --test` passes 27/27. The offline smoke test skips cleanly without
jsdom. The design is unusually disciplined for a VN example: the failsafe layer
is documented, tested and actually used by the script, and the runtime linter
encodes the traps that previously caused real bugs (bare `function` steps,
`onChosen` without `onRevert`, `Conditional` with no `False`, dead jump
targets).

The weak spots are *not* correctness-today, they're **scale and feedback
latency**:

1. **653 lines of game logic live inside `index.html`.** No editor
   intelligence, no lint, no unit test can reach it. The jsdom smoke test is
   the only thing that executes it, and it is optional (skips when jsdom is
   absent — which is the default state of this checkout).
2. **All the invariants are checked at *runtime*, in the browser console.**
   `lintScript()` runs on boot; a typo in `vn.reversible({ crds: 100 })` is
   silently accepted (unknown key → new storage field), and the schema's
   `unknown key(s)` issue is downgraded to non-fatal.
3. **The FailSafe libs are deliberate re-implementations of TS-first
   libraries** — zod, ts-pattern, xstate, immer, neverthrow
   (`ai_agent_docs/additionallibs1.md` names all five). In the originals,
   *half the safety is the type inference*: `z.infer`, `.exhaustive()` failing
   at compile time, typed machine events. The JS ports keep the runtime half
   and drop the compile-time half. **That gap is precisely the thing TypeScript
   would close** — it is the single strongest argument in this repo.

---

## 2. Evidence: what a type-checker finds today

I ran `tsc --allowJs --checkJs --noEmit` over the two first-party JS units
(TypeScript 5, nothing added to the repo).

**`vendor/failsafe.js` — 4 errors, non-strict:**

```
(34,12)  TS2339 Property 'FailSafe' does not exist on type 'Window & typeof globalThis'
(675,26) TS1250 Function declarations are not allowed inside blocks in strict mode
                when targeting 'ES5'          <-- a real ES5-target violation
                                                  in a file whose contract is "ES5-compatible"
(779,88) TS2339 Property 'url' does not exist on type 'Request | URL'
                                              <-- net.guard() mis-reads fetch(new URL(...))
(798,17) TS2322 XMLHttpRequest wrapper is not assignable to the XHR constructor type
                                              <-- `new XMLHttpRequest()` after guard()
                                                  works only by accident of JS semantics
```

Under `--strict`: **166 diagnostics** (mostly implicit `any` on the many
`function (spec, extra)` signatures — noise, but it tells you the whole public
API is currently untyped for consumers).

**Inline `<script>` from `index.html` — 10 errors, non-strict:**

```
Cannot find name 'Monogatari'                        (no engine typings)
Property 'engine' / 'FailSafe' / 'updateHUD' does not exist on Window
Property 'webkitAudioContext' does not exist on Window
Property 'dataset' does not exist on type 'Element'   x3
Property 'hidden'  does not exist on type 'Element'
```

The `dataset` ones are the interesting class. `document.querySelectorAll(...)`
yields `Element`, and the code does `b.dataset.close` / `m.dataset.tab`. It
works because the selectors happen to match `HTMLElement`s — but this is
exactly the family of "silently no-ops" bug the project already got burned by
once (`window.monogatari` resolving to a `<div>`; see `cyber-nexus/README.md`
§2). A type-checker flags that class of mistake **before** it reaches a
console.

So: ~14 genuine signals, two of which (TS1250, the XHR wrapper) are real latent
defects in the failsafe layer itself, and one (`fetch(URL)`) is a hole in the
no-fetch guard's reporting.

---

## 3. Where TypeScript would pay the most

Ranked by value-per-effort for *this* codebase:

1. **Typed storage from the schema (zod's killer feature).**
   `STORAGE_SCHEMA` already declares the exact shape once. With generic
   JSDoc/TS signatures on `FailSafe.schema.*`, you get
   `Infer<typeof STORAGE_SCHEMA>` and then `engine.storage('player').hacking`
   is checked, `vn.reversible({ crds: 100 })` is a compile error, and save
   migrations get diffed by the compiler.
2. **`vn.reversible` / `choiceEffect` spec keys.** Today `normalise()` accepts
   *any* key and quietly creates storage fields. Typed against the storage
   shape, a misspelled stat cannot compile. This is the highest-frequency
   authoring surface in the game.
3. **`FS.machine` states/events.** `hackMachine.transition(hackState, 'HIT')`
   — string literal unions would make `hackState` a `'idle'|'active'|...`
   union and reject unknown events at author time, instead of returning
   `changed:false` at runtime.
4. **`FS.match(...).exhaustive()`** only throws at runtime when a case is
   missed. In ts-pattern the whole point is that the *compiler* proves
   exhaustiveness. Typed, `.exhaustive()` becomes a static guarantee.
5. **Label-safe jumps — the fun one.** `lintScript()` currently catches
   `'jump NoSuchLabel'` at boot. With template-literal types,
   `type Jump = \`jump ${keyof Script & string}\`` makes a dead jump target a
   *compile* error. That converts your best runtime linter rule into a static
   one, for free.
6. **`result` (neverthrow).** `validation.isErr()` narrowing to give
   `.error`/`.value` correctly is standard discriminated-union work.

Where it pays little or nothing:

- `index.html`'s CSS/markup (~640 lines) — unaffected.
- `vendor/monogatari.js` — third-party minified bundle; you'd write a small
  ambient `.d.ts` for the ~10 methods you call (`settings`, `preferences`,
  `storage`, `assets`, `characters`, `script`, `init`, `Monogatari.default`),
  not type the bundle.
- The Playwright Python test — out of scope.

---

## 4. The cost: the "no build step" invariant

This is the crux, and it's why I'd split the decision in two.

| Option | Ships compiled output? | Violates AGENTS.md? | Verdict |
|---|---|---|---|
| **A. `// @ts-check` + JSDoc, `tsc --noEmit` in CI only** | No — `.js` stays the source of truth | No. Nothing added to `cyber-nexus/`; tsconfig + devDep live at repo root, already gitignored `node_modules/` | **Recommended** |
| **B. `.ts` sources → committed `vendor/*.js` build output** | Yes | Yes in spirit: `cyber-nexus/` gains a build step, and a contributor editing the shipped `.js` edits a generated file | Only if a 2nd game/shared lib appears |
| **C. Full bundler (Vite) + TS** | Yes | Directly contradicts the project's whole premise | No |

Option A's properties: zero runtime change, zero bytes shipped, `git diff` on
`vendor/failsafe.js` stays reviewable, an agent or human without Node can still
edit the game, and the checker is opt-in per file via `// @ts-check`. JSDoc
generics are ugly for the schema inference work (item 1 above) — that's the
honest cost — but they do work, and you can put the gnarly generics in a
separate `vendor/failsafe.d.ts` that ships nowhere and is `.gitignore`-exempt
(it's tiny text, keep it tracked).

---

## 5. Recommended plan (incremental, each phase independently valuable)

**Phase 0 — fix what the probe already found** (no TypeScript required):
- `failsafe.js:675` — hoist the block-scoped function declaration (the file
  claims ES5 compatibility; this breaks it under strict-mode ES5).
- `net.guard()` — handle `fetch(new URL(...))` and `fetch(new Request(...))`
  in the target extraction, and make the XHR wrapper a real constructor
  (`class`-free, via `Object.setPrototypeOf`) so `instanceof` survives.
- `index.html` — the `dataset`/`hidden` accesses are fine at runtime but add
  the guard that makes them provably fine.

**Phase 1 — extract the inline script.**
Move the 653-line `<script>` block to `vendor/game.js` (plain script tag,
still ES5, still no fetch). This is the prerequisite for *any* tooling —
type-checking, linting, unit-testing the HUD/minigame helpers — and it is
valuable on its own. Keep the machine-checkable editing rules as comments.

**Phase 2 — `// @ts-check` + a root `tsconfig.json`, `noEmit`.**

```jsonc
// tsconfig.json (repo root — never inside cyber-nexus/)
{
  "compilerOptions": {
    "allowJs": true, "checkJs": true, "noEmit": true,
    "target": "es5", "lib": ["ES2015", "DOM"],
    "strict": false,                 // start loose; ratchet later
    "noImplicitAny": false,
    "types": []
  },
  "include": ["cyber-nexus/vendor/failsafe.js",
              "cyber-nexus/vendor/icons-offline.js",
              "cyber-nexus/vendor/game.js",
              "cyber-nexus/tests/*.mjs",
              "cyber-nexus/types/*.d.ts"],
  "exclude": ["cyber-nexus/vendor/monogatari.js"]
}
```

Add `cyber-nexus/types/monogatari.d.ts` (ambient, ~60–150 lines) declaring
`Monogatari.default`, the `engine.*` methods actually used, and
`Window { engine, FailSafe, updateHUD, webkitAudioContext }`. Add
`typescript` as a root devDependency and a `npm run typecheck` script — the
game folder stays dependency-free, which is what the invariant is protecting.

**Phase 3 — JSDoc the FailSafe public API, ratchet to `strict`.**
Type `schema` generically so `Infer<typeof STORAGE_SCHEMA>` works, then thread
that type through `vn.reversible`/`choiceEffect`/`validateStorage`. This is
where items 1–2 of §3 land. Do it file-by-file; `// @ts-check` makes that
trivially incremental.

**Phase 4 (optional, later) — literal-typed script DSL.**
`type Label = keyof typeof script` + template-literal `jump`/`call` types, so
`lintScript`'s `missing-label` rule becomes static. Keep the runtime rule too:
saves are loaded at runtime, types are not.

**Non-goals to write into AGENTS.md if you adopt this:** no emit into
`cyber-nexus/`, no bundler, no `import`/`export` in shipped vendor files, no
new runtime dependency, and `node --test` must keep passing with zero installs.

---

## 6. Bottom line

The project doesn't *need* TypeScript to be correct today — the FailSafe layer
plus the boot-time linter is a genuinely good substitute, and the tests back it
up. But it is a codebase whose entire thesis is "make the invariants
machine-checkable", and it currently checks them at the latest possible moment:
in the player's browser console. TypeScript in `checkJs` mode moves five of
those seven runtime guarantees to author-time, costs zero shipped bytes, and
doesn't touch the double-click-`index.html` promise.

Adopt **Option A / Phases 0–3**. Revisit compiled `.ts` sources only if a
second game or a shared `failsafe` package ever appears — at that point the
build step buys something it doesn't buy today.
