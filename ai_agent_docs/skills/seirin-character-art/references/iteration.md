# Iteration and prompt persistence

One shot is the *target*, not the assumption. Generators are stochastic: some
characters land on attempt one; one character in this repo took eleven. This
file is
the failsafe — it makes refinement cheap, resumable across sessions, and
cumulative instead of circular.

## The one rule

**Every prompt you actually send gets saved to a file, with its result.**

A prompt that exists only in a chat transcript is lost the moment the session
ends. The repo's own history shows the cost: `characters/` holds eleven unexplained
iterations of one character plus generator-named files nobody can interpret.
Nobody can now tell what was asked for, what changed between versions, or which
was the keeper. That knowledge was thrown away, and the next agent rediscovers
it by burning generations.

## Layout

```
characters/<id>/
  prompts/
    01_turnaround.txt        # exact text sent, verbatim
    01_turnaround.result.md  # what came back, verdict, what to change
    02_turnaround.txt        # the refinement
    02_turnaround.result.md
    05_sprite.txt
    05_sprite.result.md
    KEPT.md                  # pointer to the winning prompt per stage
  _wip/                      # rejected generations, not committed
  ren_default_neutral.png    # approved assets only
```

Numbering is a single sequence per character across all stages, so the order of
work is recoverable. `KEPT.md` is the short answer to "which prompt actually
produced the asset we shipped".

`characters/*/prompts/` **is committed** — it is as much the product as the
PNGs, because it is what lets anyone regenerate or extend the character later.
`_wip/` is not.

## Result note format

Keep it short. Three lines is usually enough.

```markdown
# 02_turnaround — <character>

Verdict: REJECT
Kept: front and 3/4 views on-model; palette correct.
Broke: side view lost the defining detail; back view added an extra element.
Change for next: state the defining detail in staging as well as identity, and
specify it must be identical in all four views.
```

Verdicts: `KEEP` · `KEEP WITH EDIT` · `REJECT` · `PARTIAL` (some views usable).

## The refinement loop

1. Write the prompt from the brief in `briefs/<id>.md` (or take it from the
   prompt agent), and send it.
2. Save it verbatim as `NN_<stage>.txt` **before** looking at the result — so a
   crash or a context reset does not lose it.
3. Judge against `references/qa-checklist.md`. Be specific about what broke.
4. Write the `.result.md`.
5. **Change exactly one thing.** Multi-change refinement teaches you nothing:
   if two edits and the output improves, you don't know which one worked, and
   the next character can't benefit.
6. Repeat. On `KEEP`, record it in `KEPT.md`.
7. **Promote the fix.** If a change worked, edit the prompt in
   the iteration log in `briefs/<id>.md`, and promote anything reusable to
   `references/prompt-grammar.md`, so the next session starts ahead. If it worked for *several*
   characters, promote it to `references/prompt-grammar.md` — that is how the
   skill gets better instead of staying static.

Step 7 is the whole point. Without it every character pays the same tuition.

## Open experiments worth recording

Cheap tests where this project has no data yet. Run one when the opportunity
comes up naturally, and write the result into the character's log so it stops
being an opinion.

- **Emoji expression labels.** Does `😳 blush` beside the brow/eye/mouth
  geometry help, hurt, or do nothing versus the geometry alone? Two
  differentials from the same sprite, one with the label, one without.
- **Aspect-ratio drift.** How far does a 1:2 sprite request actually drift, and
  is a moderate ratio plus crop more reliable?
- **Green vs mid-grey sprite background.** Which gives cleaner soft edges
  through the white/black matte?

## Stop rules

Guard against burning generations on a losing prompt:

- **3 attempts at the same stage with no improvement** → stop editing the
  prompt. The problem is upstream: the design itself, or the reference image.
  Re-read the design card, run the silhouette test on the *concept*.
- **5 attempts total on one stage** → stop and ask. Something is wrong that
  more sampling will not fix.
- **The same defect twice in a row** → it is not randomness, it is the prompt.
  Rephrase positively (see the negation rule in `prompt-grammar.md`) rather
  than restating the negative harder.
- **Identity drifting across a stage** → you are chaining edits. Go back to the
  last approved asset and branch from it, not from the latest output.

## Partial acceptance

You rarely need to reject a whole generation. A turnaround with three good
views and one bad one is a `PARTIAL`: keep the sheet as reference, and generate
the failing view alone as a targeted edit. Same for an expression set — regenerate
the two heads that jittered, not all eleven.

## Resuming cold

An agent picking this up in a fresh session with no memory should:

1. Read `briefs/<id>.md` — is the character answered and approved at all?
2. `ls characters/<id>/` — what exists.
3. Read `characters/<id>/prompts/KEPT.md` — what already worked.
4. Read the highest-numbered `.result.md` — what was being tried when work stopped.
5. Continue from there.

That sequence is why the files matter. It should take under a minute to know
exactly where the previous session left off.

## When the design itself is wrong

If refinement keeps failing, the fault may be the design — or the design may
not exist yet. Symptoms: the silhouette doesn't read even when the generator
obeys perfectly; two characters keep coming out similar; the memory point never
survives. Check first whether the character's questions were actually answered,
or whether someone quietly invented an answer to get moving.

Fix it in `assets/cast.json` first, regenerate the brief, and start the stage
over. Never patch a design flaw by piling
adjectives onto a prompt — the flaw will resurface in every later asset.
