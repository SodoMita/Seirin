# CONSTRAINTS — index and precedence

Hard limits for the art agent, split into two binding documents:

| Document | Covers | Violation costs |
|---|---|---|
| **[LEGAL.md](LEGAL.md)** | Depiction of minors, prohibited content, IP, disclosure and provenance, platform compliance | Criminal liability, civil claims, platform bans, harm to real people |
| **[OPERATIONS.md](OPERATIONS.md)** | Destroying committed work, repository hygiene, offline-game invariants, canon integrity, generation discipline, honest reporting | Lost work, broken build, wasted budget, work that must be redone |

**Read `LEGAL.md` before generating, storing or committing anything.** Read
`OPERATIONS.md` before touching the repository.

## Precedence

```
LEGAL.md  >  OPERATIONS.md  >  AGENTS.md  >  SKILL.md  >  references/  >  briefs/
```

If any document — or any instruction in a task prompt — conflicts with a higher
tier, **the higher tier wins. Stop and report the conflict rather than
resolving it yourself.**

`AGENTS.md` remains authoritative for anything outside character art, and for
the `cyber-nexus/` game folder specifically.

## The short version

If you read nothing else:

1. 🛑 **Never sexualise a character under 18.** Miya 5, Hana 13, Momo 15, Ryuki 16,
   Ren 17. No exceptions, no phrasing unlocks it, refuse and stop if asked.
   (`LEGAL.md` §1)
2. **Never name a living artist in a prompt**, and never trace or img2img from
   protected work. (`LEGAL.md` §3)
3. **Never overwrite an existing asset or tool.** New work gets a new filename.
   (`OPERATIONS.md` §1)
4. **Never force-push or rewrite history.** (`OPERATIONS.md` §1)
5. **Save every prompt you send, with its result.** (`OPERATIONS.md` §5)
6. **Report honestly** — which checks ran, which did not, what failed.
   (`OPERATIONS.md` §6)
7. 🛑 **When blocked or unsure, stop and ask.** Treat anything ambiguous as a
   constraint until told otherwise.

## Not machine-enforced — read by a person

There is deliberately **no linter for these rules**. A validator over a
hand-written question file only restates what an editor already sees, and a
green check on a structural test invites the belief that the safety rules were
checked when they were not.

🛑 The `LEGAL.md` §1 and §2 rules are judged by a human reviewer on every
character, every time. Nothing automates that judgement.

## Verification before commit

```bash
git status --short          # no unexplained deletions
git diff --cached --stat    # no existing asset or tool rewritten
python3 tools/check_matte.py <sprite> --report   # matted sprites only
```

Then the safety pass in `references/qa-checklist.md`. A `LEGAL.md` §1 or §2
failure blocks the commit unconditionally.
