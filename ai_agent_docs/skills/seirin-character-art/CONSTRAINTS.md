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

1. **Never sexualise a character under 18.** Miya 5, Hana 13, Momo 15, Ryuki 16,
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
7. **When blocked or unsure, stop and ask.** Treat anything ambiguous as a
   constraint until told otherwise.

## Machine-enforced

Some limits are checked in code, not left to judgement.
`scripts/check_roster.py` errors — never warns — if:

- an under-18 character loses its explicit anti-sexualisation entry
  (`LEGAL.md` §1);
- Ryuki loses the guard preventing her ichthyosis being rendered as wounds,
  gore or reptile scales (`LEGAL.md` §2).

**Never remove, weaken or disable these checks.** Verified by negative test:
stripping either entry fails the run.

## Verification before commit

```bash
python3 ai_agent_docs/skills/seirin-character-art/scripts/check_roster.py
python3 ai_agent_docs/skills/seirin-character-art/scripts/check_assets.py characters/
git status --short          # no unexplained deletions
git diff --cached --stat    # no existing asset or tool rewritten
```

Then the safety pass in `references/qa-checklist.md`. A `LEGAL.md` §1 or §2
failure blocks the commit unconditionally.
