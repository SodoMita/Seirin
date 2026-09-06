# Branch triage — September 2026

**Why this exists:** 27 `arena/*` branches on origin, several of them UI
rewrites, and no record of which are alive. This is the inventory as
measured on 2026-09-05/06 (GitHub compare API + real Chromium 131 boots
over `file://`). Update or delete it when the branches are gone.

## 1. The inventory

| Branch | vs `main` | Verdict |
|---|---|---|
| `019f9aef` … `019faf15` (17 branches) | **no common ancestor** — from before the `879d577` history rewrite | **Dead.** Cannot be merged or compared. Everything of value from them was already combined into `879d577` ("clean repository"). Safe to delete. |
| `019fb2d3`, `019fcb98`, `019fcbb7`, `019fcc8a`, `019fcc8c`, `019fd28e`, `019ff758` | 0 ahead, 1–75 behind | **Dead.** Fully merged (PRs #11–#13). Safe to delete. |
| `019ff788` — **PR #14** | 3 ahead | **Alive: UI candidate.** Pure-CSS skin. See §2. |
| `019ffa90` | 8 ahead | **Alive: docs + duplicate of PR #14.** Its first 3 commits ARE PR #14 (same SHAs `e48be62`, `f696df6`, `91ba04f`); the other 5 add `ai_agent_docs/SEIRIN_World_Systems.md` (597-line worldbuilding reference, Russian) and set the story year to 2030. **No PR opened.** |
| `01a072b4` | 1 ahead (2026-09-06) | **Alive: story + fix.** Balcony-cat easter egg (`story/nyan.js`, SVG sprite) **and a real bug fix**: `hide character X with fadeOut` never removed sprites because `mecha-ui.css` pins `animation: none !important` on them (the engine removes sprites on `animationend`). **No PR opened.** Does NOT carry the sprite-path fix. |
| `01a072b0` — **PR #15** (this branch) | 2 ahead | Sprite-path fix (5 characters were 404 since `879d577`) + regression test. |

So the real count is **four live branches**, and two of them are the same
UI change. Everything else is noise.

## 2. The UI question: `main` skin vs PR #14 skin

Both were booted in Chromium 131 with the PR #15 sprite fix applied to
both copies, so the comparison is UI-only. Shots:
`design/preview/shots/12_compare_{main,pr14}_{1280x720,412x915}_{1_menu,2_dialogue}.webp`.

| | `main` (JS-driven skin, 5 926 CSS + 1 674 JS lines) | PR #14 (pure CSS, 1 033 lines, no JS) |
|---|---|---|
| Boots, console errors | yes / none (after sprite fix) | yes / none (after sprite fix) |
| Main menu title | one title | **two titles, stacked** — `custom-ui.css` still paints `main-screen::before/::after` (`'СЭЙРИН'` at `top:16%`) and PR #14 dropped the `content:none !important` override that `main`'s `mecha-ui.css` line 1179 has. Visible at both sizes. |
| HUD badges (desktop) | text present, badge widths 261/83/117/71 px | **location badge clips its own text** ("Цукимати: К…" → next badge overlaps); the four badge groups are `justify-content: space-between` with `flex: 0 1 auto; min-width: 0`, so the middle group loses the fight for width. |
| HUD (412×915 portrait) | 2 rows, all readable | 2 rows, readable |
| Instrument rail / ticker | rendered by JS | static markup in `index.html`, animated in CSS — works |
| Sprite exit animations | **broken** (see `01a072b4`) | broken the same way (same `animation:none` pin) |
| Tests (`node --test`) | 66/66 with PR #15 | 65/65 on its own; PR #15's sprite test would also pass once applied |
| Maintainability | 7 600 lines across two files; several sessions lost to engine traps (`design/MECHA_UI.md`) | 1 033 lines, one file, no runtime JS |

**Reading:** PR #14 is the better *architecture* (5× less code, no JS
mutating the DOM the engine owns) but it shipped with two visible
regressions that `main` does not have: the doubled title and the clipped
location badge. Both are small CSS fixes (≈5 lines: re-add the
`main-screen::before/::after { content:none }` override; give
`#hud-location` `flex-shrink:0` or `overflow:hidden; text-overflow:ellipsis`).
`main`'s skin is visually more finished today but is the version several
sessions have described as fragile.

## 3. Recommended order of operations

1. **Merge PR #15** (sprite fix). Independent of the UI decision; both
   skins need it.
2. **Pick one skin.** If PR #14: fix the two regressions above first, then
   rebase `01a072b4` (ghost-sprite fix) onto it — the fix's selector still
   applies. If `main`: close #14 and cherry-pick nothing from it.
3. **Open a PR from `01a072b4`** — the ghost-sprite fix is a genuine bug
   fix regardless of the easter egg.
4. **Open a PR from `019ffa90` for the docs only** (`SEIRIN_World_Systems.md`
   + year change); drop its three UI commits since they're PR #14.
5. **Delete the 24 dead branches** listed in §1. They are what makes the
   repo look like "so many branches that do different things".
