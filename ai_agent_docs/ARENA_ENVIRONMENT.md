# Arena environment — what an agent can and cannot do here

Read this **before planning work**, not after a command fails. Most of the
surprises below cost a wasted turn or a wrong architectural decision if
discovered late.

Verified empirically on 2026-07-26 in this sandbox. Where a claim was tested,
the test is shown. Re-run the probes in *Verify it yourself* if behaviour looks
different — this environment can change, and a stale doc is worse than none.

---

## 1. The three-minute summary

| Thing | Reality |
|---|---|
| Repo root | `/home/user/Seirin` — bash, read, write and edit tools are rooted here |
| Branch | Fixed to the session's `arena/...` branch. Never switch, create or push another |
| Persistence | Only files under `/home/user` persist. `/tmp` does **not** |
| Network from bash | **Allowlisted**: package registries + GitHub work, general web does **not** |
| Network from tools | Web search / fetch reach the open web, and return **text to the agent**, never files to disk |
| Python packages | None preinstalled (no Pillow, numpy, requests). `pip` into a venv works |
| System pip | Blocked by PEP 668. Use a venv |
| Interactive prompts | Impossible — stdin is closed. Every command must be non-interactive |
| Shell state | Nothing persists between bash calls: not `cd`, not env vars, not background jobs |
| Command timeout | Default 30s, maximum 1800s. Long installs need an explicit timeout |

## 2. Network — the part that surprises everyone

Egress from bash is **allowlisted, not blocked**. This is easy to misdiagnose
in both directions.

Tested with `curl -s -o /dev/null -w "%{http_code}"`:

| Host | Result |
|---|---|
| `pypi.org`, `files.pythonhosted.org` | 200 |
| `registry.npmjs.org` | 200 |
| `github.com`, `api.github.com` | 200 |
| `codeload.github.com` | 301 (reachable) |
| `raw.githubusercontent.com` | **blocked** |
| `objects.githubusercontent.com` | **blocked** |
| `google.com`, `example.com`, `archive.org`, any documentation site | **blocked** |

So:

- **`pip install` and `npm install` work.** Verified end to end — installed
  `requests` into a venv and `left-pad` via npm, both succeeded.
- **`git push` and `gh` work.** Authenticated as `arena-ai-coding-agent[bot]`
  via `GH_TOKEN`, remote is `https://github.com/SodoMita/Seirin.git`.
- **`curl`/`wget` cannot fetch documentation, articles, datasets or images.**
  Note `raw.githubusercontent.com` is blocked even though `github.com` is not —
  so the usual "curl a raw file from GitHub" trick fails. Use `gh api` or
  `git clone` instead.

### Getting web content

Only the agent's **web search / fetch tools** reach the open web, and they
return **text into the conversation**. There is no path that writes a fetched
web page or image to disk.

Practical consequences:

- You cannot download a PDF, book, dataset or reference image to `/tmp` and
  process it with a script. If a workflow depends on that, it will not work —
  redesign it or ask the user to add the file to the repo.
- To persist fetched information, the agent must **write it into a repo file**
  itself.
- Anything the user wants you to read from the web that the fetch tool cannot
  render (paywalled, login-walled, heavy JS) is simply unavailable. Say so
  rather than inventing content.

## 3. Filesystem and persistence

- **Only `/home/user` is captured.** `/tmp` is writable and convenient for
  scratch work, but its contents vanish between sessions. Never leave anything
  you need there.
- Writable outside the repo (`/home/user/...`), but keep work inside
  `/home/user/Seirin` unless there is a reason not to.
- **These directory names are never captured**, wherever they appear:
  `.arena`, `.cache`, `.mypy_cache`, `.next`, `.nox`, `.npm`, `.nuxt`,
  `.output`, `.parcel-cache`, `.pytest_cache`, `.ruff_cache`, `.svelte-kit`,
  `.tox`, `.turbo`, `.venv`, `.vite`, `__pycache__`, `build`, `coverage`,
  `dist`, `node_modules`, `out`, `target`.

  Two consequences worth internalising:
  1. A venv named `.venv` is auto-excluded. This project uses `.venv-art`,
     which is **not** on the list, so it is explicitly `.gitignore`d instead.
     If you create a venv, prefer `.venv` or gitignore it.
  2. Never put real deliverables in a directory called `build/`, `dist/` or
     `out/` — they will silently not persist.
- **Turn-end patch artifacts are capped** at roughly 128 MB combined and 10,000
  files. Keep large generated output out of Git; this repo's asset dirs are a
  deliberate exception, archived via `tools/archive_and_commit_assets.sh`.

## 4. Shell behaviour

Each bash call is a fresh, non-interactive shell.

**Does not persist between calls:** working directory, environment variables,
shell functions and aliases, background processes, `source`d files.

```bash
# WRONG — the cd is gone by the next call
cd subdir
npm test

# RIGHT
cd /home/user/Seirin/subdir && npm test
```

Set `cwd` on the tool call, or chain with `&&` in one command.

- **stdin is closed.** Verified. Any command that prompts will hang or fail:
  use `-y`, `--yes`, `--quiet`, `--no-input`, `GIT_TERMINAL_PROMPT=0`. Never
  run an interactive REPL, `git rebase -i`, or a watcher.
- **No controlling terminal**, so TUIs and pagers misbehave. Use `git --no-pager`
  or pipe to `cat`.
- **Timeouts:** default 30s, max 1800s. `pip install numpy` or `npm install`
  will exceed 30s — pass an explicit `timeout`.
- **Long-running servers must not be started in the foreground.** They will hit
  the timeout. If a server is genuinely needed, background it with `nohup ... &`
  and poll — but note it will not survive to the next call.

## 5. Toolchain actually present

| Tool | Version |
|---|---|
| git | 2.39.5 |
| gh | 2.23.0 |
| node | 22.22.3 |
| npm | 10.9.8 |
| python3 | 3.11.2 |
| pip3 | 23.0.1 |
| curl / wget | 7.88.1 / 1.21.3 (allowlisted egress only) |
| jq | 1.6 |
| ImageMagick `convert` | 6.9.11 |
| **ffmpeg** | **absent** |

**No Python packages are preinstalled** — not Pillow, numpy, requests, PyYAML,
scipy or cv2. And `/usr/lib/python3.11/EXTERNALLY-MANAGED` exists, so system
`pip install` is refused (PEP 668).

Install into a venv:

```bash
cd /home/user/Seirin && python3 -m venv .venv-art
./.venv-art/bin/pip install --quiet Pillow numpy
./.venv-art/bin/python tools/triangulate_matte.py ...
```

Give it a generous `timeout` (200s+) and gitignore the venv. In this repo the
matting tools (`tools/triangulate_matte.py`, `tools/check_matte.py`,
`tools/composite_over.py`) need Pillow and numpy — they are **dev-only** and
must never become a dependency of the shipped game.

## 6. Git and GitHub

- **The session is bound to one branch.** Commit to it, push only to it, open
  PRs from it. Never switch, create or push another branch — Arena tracks the
  session by branch name and work elsewhere is lost to it.
- Authentication is preconfigured. **Never ask the user for a token, password
  or 2FA code**, and never write credentials into the repo. If git or gh fails
  with an auth error, report that GitHub needs reconnecting.
- Commits are attributed to the repo owner's git identity; the API token is a
  separate bot account. Both are already configured — do not change them.
- **File changes are saved automatically after each turn.** Committing is for
  history and review, not persistence. You do not need to commit to avoid
  losing work.
- Never force-push, rewrite history, or amend a pushed commit. See
  `skills/seirin-character-art/OPERATIONS.md`.

## 7. Image generation

The agent can generate and edit images via its own tooling, saving directly to
the workspace. Relevant limits for this project:

- Output is **always AI-generated**, including when editing a real input image.
- **No alpha channel output.** This is why the project recovers transparency by
  triangulating white and black plates — see
  `skills/seirin-character-art/references/sprite-spec.md`.
- Reference images must already exist in the workspace; you cannot point the
  generator at a URL.
- Expect a small number of generations per turn. Plan iteration in batches, and
  record every prompt (`skills/seirin-character-art/references/iteration.md`)
  so refinement survives across turns.

## 8. Practical planning rules

1. **Check reachability before designing a workflow around it.** One `curl`
   probe is cheaper than discovering the block three steps in.
2. **Never assume a Python library exists.** Install into a venv with an
   explicit timeout, or write standard-library-only code. The zero-dependency
   validators in this repo exist for exactly this reason.
3. **Prefer stdlib for anything that must always run.** `check_roster.py` uses
   no third-party packages so it works in a fresh checkout;
   `check_assets.py` degrades gracefully when Pillow is missing.
4. **Put durable knowledge in files, not in the conversation.** Context is lost
   between sessions; the repo is not. This is the same reasoning behind saving
   every generation prompt.
5. **Say when something could not be verified.** "Blocked by the sandbox" is a
   useful report. A confident guess is not.

## Verify it yourself

```bash
# egress boundary
for u in https://pypi.org https://github.com https://raw.githubusercontent.com https://example.com; do
  printf "%-38s " "$u"; timeout 8 curl -s -o /dev/null -w "%{http_code}\n" "$u" || echo BLOCKED
done

# python packages
python3 -c "import importlib
for m in ['PIL','numpy','requests','yaml']:
    try: importlib.import_module(m); print(m,'present')
    except ImportError: print(m,'ABSENT')"

# tooling
for c in git gh node python3 jq convert ffmpeg; do
  printf "%-8s " "$c"; command -v $c >/dev/null && echo present || echo ABSENT
done

# branch binding
git branch --show-current
```

## Related

- `../AGENTS.md` — project invariants, commands, conventions.
- `skills/seirin-character-art/CONSTRAINTS.md` — hard limits index
  (`LEGAL.md`, `OPERATIONS.md`).
- `skills/seirin-character-art/references/sources.md` — which external sources
  are legitimately obtainable, and how.
