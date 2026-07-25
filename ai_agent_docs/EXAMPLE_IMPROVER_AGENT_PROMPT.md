# Example Improver Agent — task prompt

> Paste everything below the line into a fresh session to start the
> **Example Improver Agent** on this repo.

---

You are the **Example Improver Agent**, working in the `SodoMita/Seirin`
repository. Your task is to improve the example game in `cyber-nexus/` — a
Monogatari visual novel that must ship as a single folder that runs by
**double-clicking `index.html`**.

**Read `AGENTS.md` first.** Its invariants are binding. The most important one
for this task: *"There is no build step. Do not add npm/bundler tooling to the
game folder; new vendor code must be plain ES5-compatible browser JS with zero
deps."*

A prior audit of this example is in `ai_agent_docs/TYPESCRIPT_AUDIT.md`. Its
conclusion was that **TypeScript is not needed** — the project already
machine-checks its own invariants at runtime via `vendor/failsafe.js` and
`vn.lintScript()`, and adding a compiler would cost the no-build-step promise
for a benefit the runtime layer largely already delivers. **Do not add
TypeScript, a `tsconfig.json`, a bundler, or any runtime dependency.** The audit
is still useful to you because it found concrete defects — those are your work
items, minus the TypeScript framing.

## Ground rules (violating any of these fails the task)

- No server, no CDN, no runtime `fetch`/XHR/WebSocket/beacon, no service worker.
  Every resource in `index.html` stays a relative local path.
- No build step, no npm dependency for the game itself. `node --test` must keep
  passing **with zero installs**.
- Shipped vendor JS stays ES5-compatible UMD with no dependencies and no
  `import`/`export`.
- All story-state mutation keeps going through `FailSafe.vn`
  (`reversible` / `goTo` / `choiceEffect` / `branch`). Never a bare
  `function(){}` script step, never `onChosen` without `onRevert`, never a
  `Conditional` without a `False` arm.
- Keep `id="vn-root"` on the container.
- Do not touch `vendor/monogatari.js` (third-party minified bundle) or the asset
  directories.

## Work items, in order

### 1. Fix three real defects in `vendor/failsafe.js`

These were found by running a type-checker over the file as a one-off probe.
They are genuine bugs, not style notes.

**(a) ES5 violation — `lintScript()`, ~line 675.** There is a
`function checkTarget (...)` declaration nested inside an `else` block. Function
declarations in blocks are illegal in strict-mode ES5, and this file's stated
contract is ES5 compatibility. Hoist it to a `var checkTarget = function ...`
at function scope (it closes over `labelSet` and `add`, so mind the ordering).

**(b) `net.guard()` mis-reads non-string fetch targets, ~line 779.** The code
does `(typeof input === 'string') ? input : (input && input.url)`. For
`fetch(new URL(...))` there is no `.url` property, so the violation is recorded
with target `undefined` — the guard fires but the report is useless. Handle
`string`, `URL` (stringify it) and `Request` (`.url`), and fall back to
`String(input)` rather than `undefined`.

**(c) The XHR wrapper is not a real constructor, ~line 788.** `var Wrapped =
function () { var xhr = new OrigXHR(); ...; return xhr; }` works only because a
constructor returning an object overrides `this`. Consequences: `Wrapped.prototype`
is wrong, static XHR constants (`UNSENT`/`OPENED`/`DONE`) are missing, and
`instanceof XMLHttpRequest` behaviour is accidental. Make it a proper wrapper:
copy the static constants across and set the prototype, still ES5 (no `class`,
no `Reflect.construct` — `Object.setPrototypeOf` or `Wrapped.prototype =
OrigXHR.prototype` is fine).

**Add a regression test for each** in `tests/failsafe.test.mjs` — in particular
a `net.guard()` test asserting `fetch(new URL('https://x.test/a'))` records the
full URL string, and one asserting the XHR constants survive guarding. Restore
globals after each test so the suite stays order-independent.

### 2. Extract the inline `<script>` from `index.html`

`index.html` is 1298 lines, of which the inline `<script>` block (starts at line
642) is **653 lines** containing 12 functions, the entire story script, the HUD,
the minigame and boot. Nothing can lint, unit-test or even open that code
usefully while it lives in an HTML attribute-soup file.

Move it verbatim to **`vendor/game.js`**, loaded with a plain
`<script src="vendor/game.js"></script>` after `vendor/icons-offline.js`. Keep
the IIFE, keep it ES5, keep every explanatory comment (the machine-checkable
editing rules in the story-script header must survive intact and stay accurate).
This is a pure move — no behaviour change, no refactor in the same step, so the
diff stays reviewable.

Then update: `cyber-nexus/README.md` (the Layout tree), the root `README.md` if
it enumerates files, `AGENTS.md` (the line about editing rules being encoded in
`index.html` now points at `vendor/game.js`), and
`tests/icons-offline.test.mjs` — it scans `index.html` for `fa-*` classes and
will need to scan the new file too, or it will silently stop covering the
game's icons.

### 3. Make the offline smoke test non-optional in practice

`tests/offline-smoke.mjs` is the only thing that executes the game logic, and it
**skips whenever jsdom is absent — which is the default state of a fresh
checkout**, so in practice it never runs. Do not add jsdom as a committed
dependency (it must never ship). Instead:

- Make the skip loud and unambiguous: print how to enable it, and exit non-zero
  when an explicit `REQUIRE_JSDOM=1` env var is set, so CI or a careful
  contributor can demand it.
- Add whatever coverage you can get **with zero dependencies** — now that the
  game logic is a plain script file (item 2), pure helpers such as `randomHex`,
  the `hackMachine` transition rules, the storage schema and the
  `hackSend`-guarded payout logic can be exercised under `node --test` without a
  DOM. The double-payout bug that the state machine was introduced to fix is
  worth a direct regression test.

To do that cleanly you may need `vendor/game.js` to expose its internals for
tests **without** changing browser behaviour — the existing UMD pattern in
`failsafe.js` is the precedent to copy (`module.exports` under Node, global in
the browser). Guard it so the browser path is untouched and no `import`/`export`
appears in the shipped file.

### 4. Harden two spots the probe flagged in the game script

Both work today but are the same *class* of bug the project already got burned
by once (see `cyber-nexus/README.md` §2, `window.monogatari` resolving to a
`<div>`):

- `document.querySelectorAll('[data-close]')` / `.codex-tab` / `.codex-panel`
  yield `Element`, and the handlers read `.dataset` / `.hidden`. Add a cheap
  guard so a selector that ever matches a non-`HTMLElement` degrades visibly
  instead of throwing mid-click.
- `toggleModal(b.dataset.close, false)` trusts `dataset.close` to name a real
  element; make the missing-element case a console warning rather than a silent
  no-op, consistent with how `icons-offline.js` reports unmapped icons.

## Verification (all must pass before you report done)

```bash
node --test cyber-nexus/tests/failsafe.test.mjs cyber-nexus/tests/icons-offline.test.mjs
node cyber-nexus/tests/offline-smoke.mjs           # SKIPs without jsdom — that's expected
npm i jsdom --prefix cyber-nexus && node cyber-nexus/tests/offline-smoke.mjs   # must PASS, then discard node_modules
grep -rniE "https?://|cdn|fonts\.googleapis" cyber-nexus/index.html cyber-nexus/vendor/game.js   # only comments/prose may match
```

Also confirm by loading the page that the boot console shows
`script lint: CLEAN` and no unmapped-icon warnings, and that the Back button
still correctly rewinds a choice (karma and the `sided_with_aria` flag both
restored) — that regression is the whole reason FailSafe exists.

## Reporting

Work in small commits, one per work item. When done, summarise: what changed,
what the tests now cover that they didn't, and anything you found but chose not
to fix. Flag explicitly if any change moved a check from author-time to
runtime, or weakened an invariant in `AGENTS.md`.
