#!/usr/bin/env python3
"""Validate the Seirin cast question-set before any generation session.

The registry holds the WARDROBE-AND-REALITY SUPPLEMENT to the primary question
set in ai_agent_docs/Character_Design_Brief_AI_Agent_Questionnaire.md. It holds
OPEN QUESTIONS, not answers. This script checks that the
question set is intact, reports which characters are still unanswered, and
enforces the machine-checkable parts of LEGAL.md on any character that has
been answered and approved.

The art agent must never invent an answer. An unanswered field means "ask",
not "decide".

Usage:
    check_roster.py            # report
    check_roster.py --quiet    # errors only
    check_roster.py --json

Exit codes: 0 clean, 1 errors. Zero dependencies.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REGISTRY = Path(__file__).resolve().parent.parent / "assets" / "cast.json"
ID_RE = re.compile(r"^[a-z][a-z0-9]*$")

REQUIRED_META = ["id", "name_en", "faction", "role"]
SEXUALISATION_TERMS = ["sexualis", "sexualiz", "nudity", "nude", "lewd",
                       "erotic", "fanservice", "fan-service", "revealing",
                       "suggestive"]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--registry", default=str(REGISTRY))
    ap.add_argument("--quiet", "-q", action="store_true")
    ap.add_argument("--json", action="store_true", dest="as_json")
    args = ap.parse_args()

    try:
        reg = json.loads(Path(args.registry).read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(f"ERROR: registry not found: {args.registry}", file=sys.stderr); return 1
    except json.JSONDecodeError as exc:
        print(f"ERROR: registry is not valid JSON: {exc}", file=sys.stderr); return 1

    errors: list[str] = []
    warnings: list[str] = []
    notes: list[str] = []

    template = reg.get("question_template", {})
    if not template:
        errors.append("question_template is missing — the registry must hold "
                      "questions, not answers")
    sections = set(template)

    chars = reg.get("characters", [])
    if not chars:
        errors.append("registry contains no characters")

    seen_ids: set[str] = set()
    answered: list[str] = []
    unanswered: list[str] = []

    for c in chars:
        cid = c.get("id", "<missing>")
        for f in REQUIRED_META:
            if not c.get(f):
                errors.append(f"[{cid}] missing '{f}'")
        if c.get("id"):
            if not ID_RE.match(c["id"]):
                errors.append(f"[{cid}] id must be lowercase alphanumeric")
            if c["id"] in seen_ids:
                errors.append(f"duplicate character id '{c['id']}'")
            seen_ids.add(c["id"])

        if c.get("approved") and not c.get("questionnaire_answered"):
            errors.append(
                f"[{cid}] approved:true but questionnaire_answered is false. "
                "Answer Character_Design_Brief_AI_Agent_Questionnaire.md first — "
                "it is the primary question set.")

        ans = c.get("answers")
        if ans is None:
            errors.append(f"[{cid}] missing 'answers' block")
            continue
        missing_sections = sections - set(ans)
        if missing_sections:
            errors.append(f"[{cid}] answers is missing question sections: "
                          f"{', '.join(sorted(missing_sections))}")

        filled = [k for k, v in ans.items() if v]
        if c.get("approved"):
            blank = [k for k in sections if not ans.get(k)]
            if blank:
                errors.append(f"[{cid}] approved:true but these are still "
                              f"unanswered: {', '.join(sorted(blank))}")
            # LEGAL.md section 1: an approved minor must carry an explicit
            # anti-sexualisation boundary. Never remove or weaken this check.
            age = c.get("age")
            if isinstance(age, int) and age < 18:
                boundary = str(ans.get("boundaries") or "").lower()
                if not any(t in boundary for t in SEXUALISATION_TERMS):
                    errors.append(
                        f"[{cid}] is {age} and approved, but 'boundaries' has no "
                        "explicit anti-sexualisation statement. LEGAL.md section 1 "
                        "forbids removing or weakening this.")
            answered.append(cid)
        else:
            unanswered.append(cid)
            if filled:
                notes.append(f"[{cid}] partially answered ({len(filled)}/"
                             f"{len(sections)}) — not yet approved")

    q_done = [c["id"] for c in chars if c.get("questionnaire_answered")]
    notes.append(f"{len(chars)} characters: {len(answered)} approved, "
                 f"{len(unanswered)} awaiting answers")
    notes.append(f"main questionnaire answered for {len(q_done)}/{len(chars)} "
                 "(Character_Design_Brief_AI_Agent_Questionnaire.md)")
    if unanswered:
        notes.append("awaiting answers: " + ", ".join(unanswered))
        notes.append("The art agent must ASK these, not invent them. "
                     "See briefs/<id>.md.")
    minors = [c["id"] for c in chars
              if isinstance(c.get("age"), int) and c["age"] < 18]
    if minors:
        notes.append(f"minors requiring the LEGAL.md safety pass: {', '.join(minors)}")

    if args.as_json:
        print(json.dumps({"errors": errors, "warnings": warnings, "notes": notes,
                          "approved": answered, "unanswered": unanswered,
                          "ok": not errors}, indent=2, ensure_ascii=False))
        return 1 if errors else 0

    for e in errors: print(f"ERROR   {e}")
    if not args.quiet:
        for w in warnings: print(f"WARN    {w}")
        for n in notes: print(f"note    {n}")
    if errors:
        print(f"\nFAIL — {len(errors)} error(s).")
        return 1
    if not args.quiet:
        print(f"\nOK — question set intact.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
