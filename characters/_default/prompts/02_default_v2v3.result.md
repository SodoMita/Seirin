# Default-idiom v2/v3 — the working formula

## Measured contrast
| image | p2 (dark) | p98 (light) | range | stdev |
|---|---|---|---|---|
| v1 green-field lineup | 12 | 241 | 229 | 48.2 |
| v2 bright mountain | 39 | 238 | 199 | 59.4 |
| ren default v2 | **0** | 177 | 177 | 39.3 |
| **ren default v3 (pushed)** | **0** | **246** | **246** | **69.1** |
| kitsune default v2 | **0** | 219 | 219 | 56.2 |

v3 is the widest range and the highest contrast of anything generated for this
project. True black at both ends of the new work — the old "bright" pass never
got below 39.

## The formula that works
1. **One short medium anchor, nothing more**: "Anime illustration, clean
   linework and cel colour." Zero style words = photoreal default (v1 test);
   long style blocks = the 2.5D problem. One clause is the whole fix.
2. **Name BOTH ends of the value range separately.** v2 said "darks very dark,
   lights very bright" and delivered blacks (0) but weak highlights (177).
   v3 named the highlights concretely — "blows her shoulders and steel toe caps
   to near-white with hot specular glare" — and got 246. **Darks are easy;
   highlights need a named lit OBJECT, not an adjective.**
3. **Lead with who the person is and what they do.** One or two sentences of
   real character before any visual spec. The model renders a person better
   when it knows the person.
4. **Give footwear its own sentence.** Boots were generic in every earlier pass
   and are now specific: bare metal at scuffed toe caps, caked lugged soles,
   mismatched cord laces, one strap undone.
5. **State body shape plainly** — build, posture, weight distribution, what the
   work did to them.
6. **Explain WHY a garment exists.** "An adult man's coverall cut down by hand,
   raw unhemmed edge" outperforms any adjective list.

## Boilerplate: confirmed removable, with one exception
Dropped from all prompts with no ill effect: no-text/watermark/logo/UI/border,
no-extra-fingers, global forbidden lists, flatness lectures, canvas conventions.
Hands were fine in all three images without being mentioned.

⚠️ **One exception found.** v3 hallucinated the word "SERVICE" across Ren's
undershirt — the first text artifact since the exclusions were dropped. Cause is
almost certainly my own prompt: "hot red-orange service decals" invited a
literal decal reading. So the rule is not "text exclusions are always safe to
cut" but:

> Keep a short "no lettering" clause ONLY when the design itself contains
> decals, badges, patches, signage or screens. Otherwise omit it.

Cheaper still: rename the element so it does not invite text — "small red-orange
paint marks" rather than "service decals".

## Kept exclusions (character-specific, load-bearing)
Minors' full coverage · Kitsune "costume not anatomy" · Splash non-anatomical
torso · Ryuki skin dignity. These are safety/canon rules, not boilerplate.
