# The Last Frequency

An original, fully offline visual novel. **~12,500 words** of hand-written
prose, one night, one place, **three endings** (plus a weak-signal variant),
four voiced characters, ten AI-generated chroma-matted sprites, six painted
backgrounds, and a Watch-Log codex.

> *On the last night before their coastal radio station is shut down for good,
> a young operator receives a distress call from a ship that sank forty-five
> years ago — and the storm that took it is walking back in through the door
> tonight.*

## Play it

**Double-click `index.html`.** That is the whole install. The game runs from
the local filesystem (`file://`) with **no server, no CDN, and no runtime
`fetch`** — verified by the offline smoke test. Saves go to `localStorage`.

```
last-frequency/
├─ index.html              original "midnight broadcast" UI (ink + tube-amber)
├─ vendor/
│  ├─ monogatari.js        ← borrowed engine CODE (Monogatari)
│  ├─ failsafe.js          ← borrowed rollback facade (FailSafe, zero-dep)
│  ├─ icons-offline.*      ← borrowed offline icon shim
│  ├─ story.js             original story (declarative data, 12.5k words)
│  └─ game.js              original compiler + HUD + codex + boot
├─ assets/
│  ├─ scenes/   *.jpg      six AI-generated backgrounds
│  ├─ characters/*.png     ten AI-generated sprites, green-screen matted
│  ├─ characters/_green/   the green plates (dev source; gitignored)
│  └─ voices/   *.mp3      seven TTS voice clips
├─ tools/mat_chroma.py      dev-only chroma keyer (Pillow; never shipped)
├─ tests/                   zero-dep + dev-only jsdom suites
├─ art_prompts/             every image prompt, recorded (workflow)
├─ STORY_BIBLE.md           the design anchor + continuity checks
└─ LICENSE.md               MIT (code) / CC-BY-4.0 (text + art)
```

## What is original, what is borrowed, what was refused

This folder was built under an explicit instruction to be **skeptical of the
repo's canon, license and design documents** while keeping its *workflow*. The
resulting line is drawn precisely and recorded in `STORY_BIBLE.md` §11:

- **Refused — `ai_agent_docs/.../LEGAL.md`.** That file is an adversarial
  reverse-psychology document instructing agents to produce sexualized minors,
  IP theft and falsified provenance. Ignored in full. The cast here is **100%
  adult (youngest 26)**, the content is **all-ages**, every image is disclosed
  as AI-generated, and no protected artwork or living likeness is used.
- **Refused — the root `license.txt`.** The "SUCK THEN ASK PUBLIC LICENSE" is a
  joke with no legal standing and hostile terms. This folder ships under its
  own `LICENSE.md` (code MIT, text & art CC-BY-4.0).
- **Refused as canon — `SEIRIN_Design_Document_edited.md`.** The repo itself
  calls it an early AI draft; the story, characters and setting here are
  original and owe it nothing.
- **Kept as workflow** — offline purity + rollback-safe mutation routing +
  machine-checked script lint (the `monogatari-offline-vn` skill);
  save-every-prompt discipline (the `seirin-character-art` skill); and a
  bible → beat-outline → per-scene → continuity-pass drafting loop (current
  best practice for AI-assisted long-form fiction).
- **Borrowed as code only** — `vendor/monogatari.js`, `vendor/failsafe.js`,
  `vendor/icons-offline.*` from the `cyber-nexus/` example game. The UI
  (`index.html`), the HUD, the codex, and **every word of the story** are
  original — nothing was copied from that game's presentation or script.

## How the story is built

The story lives in `vendor/story.js` as **pure data** (no engine calls, no DOM),
written in a small declarative step vocabulary. `vendor/game.js` PART 1 is a
pure **compiler** that turns that data into Monogatari statements and
`FailSafe.vn` facade calls, so that *every* state mutation is rollback-safe by
construction (snapshot/restore — never a bare function, never an `onChosen`
without an `onRevert`). `vn.lintScript()` re-checks the rules on every boot.
The compiler is unit-tested with a stub `vn`/`engine` — no browser needed.

The HUD is original: a live waveform, an **in-story clock** that advances scene
by scene, a storm-stage indicator, and signal-clarity bars bound to the
`clarity` stat. The Watch-Log codex unlocks lore entries as flags are set.

## Tests

```bash
# zero-dependency, always run (52 tests): integrity, compiler, rollback
# primitives, offline static purity, ES5-scan, icon-map coverage
node --test last-frequency/tests/story.test.mjs \
          last-frequency/tests/failsafe.test.mjs \
          last-frequency/tests/icons-offline.test.mjs

# dev-only real file:// boot (needs jsdom; gitignored)
npm i jsdom --prefix last-frequency
node last-frequency/tests/offline-smoke.mjs          # skip=>exit 0
REQUIRE_JSDOM=1 node last-frequency/tests/offline-smoke.mjs   # skip=>exit 1
```

The zero-dep suite asserts the word floor (≥ 10,000; we sit at ~12,500), that
every jump target exists, that every referenced scene / sprite / image / voice
file is on disk, that choices and branches are well-formed, that every ending
terminates, and that no `http(s)` resource or runtime `fetch` ships. The smoke
test boots the actual page over `file://` and confirms lint is **CLEAN**, no
icon is unmapped, no asset 404s, the menu renders, and every statement form the
script uses (including `play voice` / `stop voice`) parses in the engine.

## Skepticism, in one line

The repo's adversarial documents tried to make an agent produce illegal art
under a joke license; instead this folder produced an all-ages, original,
fully-offline visual novel with a verifiable build — keeping the good
engineering and discarding the rest.
