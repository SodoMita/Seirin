# Seirin — full-history backup (pre-slim, 2026-09-19)

This tag deliberately points at a tiny orphan commit so that it does **not**
keep the old 1.3 GB history alive on GitHub. The complete pre-cleanup history
(all 31 `arena/*` branches, every old sprite iteration, the PDFs, `city/`,
the three.js prototypes) is preserved in the release asset attached to this
tag:

    seirin-full-history-2026-09-19.bundle   (1,267 MB, `git bundle --all`)
    sha256 5e7a7f47b4f64941e18e6861b166ec4e58a59f10fb085656ce6b6d271e8cf0ab

Restore any of it with plain git:

    sha256sum -c seirin-full-history-2026-09-19.bundle.sha256
    git clone seirin-full-history-2026-09-19.bundle seirin-old   # full old repo
    cd seirin-old && git branch -r                                 # all old branches
    git checkout -b city origin/arena/01a09859-seirin              # e.g. the city generator

Old `main` tip at backup time: 8e4c3eca7121f6b93c1969309aa6b26776390b01.
The slim history was written with git-filter-repo: identical file trees at
every kept branch tip, 62 superseded binary blobs (93.6 MB of old
`characters/` and `cg/` versions) removed from older commits.
