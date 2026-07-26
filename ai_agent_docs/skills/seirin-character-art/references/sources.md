# Sources

The design grammar in this skill is distilled from the professional Japanese
character-design literature and Chinese gacha production practice.

## How to use this file

Sources are split into two tiers:

- **Tier A — fetchable.** Free, complete, and readable right now with the
  agent's web-fetch tool (not with `curl` — see the sandbox note below). Everything in `design-canon.md` that is stated as concrete
  geometry (the eye typology, the 6:3:1 mass ratio, shape language) traces to
  Tier A and can be verified in full.
- **Tier B — purchase-only.** The books. Only their tables of contents,
  publisher blurbs and professional reviews are public. These shaped the
  *structure* of the skill (which fields exist, and why) rather than supplying
  copyable text.

**The books are not bundled and were not downloaded.** They are copyrighted and
sold; obtaining them from shadow libraries would put pirated provenance behind
the art direction of a product intended for commercial release, which is a real
liability in a publisher or platform review. If you want the full contents,
buy them — they are inexpensive (¥1,000-2,750) and the Kindle editions are
immediate.

**Sandbox note.** Bash egress is *allowlisted*: package registries (pypi, npm)
and GitHub work, but general web hosts do not — `curl`/`wget` cannot reach a
documentation site, and `raw.githubusercontent.com` is blocked even though
`github.com` is not. Only the agent's web-fetch tooling reaches the open web,
and it returns text into the conversation rather than files on disk. So there is
no path to download a book or PDF here even setting the licensing question
aside. See `../../ARENA_ENVIRONMENT.md`.

## Tier B — books (purchase-only; TOC and reviews are public)

### 『キャラクターデザインの教科書 メイキングで学ぶ魅力的な人物イラストの描き方』
Playce / MdN, 2015. ISBN 978-4-8443-6556-3. B5, 160pp.

The source of the **`symbol_set`** field. Its closing section
「キャラクター記号学」 (character semiotics, pp.137-157) enumerates 目 (eyes,
p.138) / 眉 (brows, p.142) / 口 (mouth, p.143) / 輪郭 (contour, p.144) /
肌 (skin, p.146) / 髪型 (hair, p.147) / 体型 (body, p.153) / 配色 (colour,
p.155) as *signs* encoding personality, closing with 「記号を組み合わせた
キャラクター」 — a character assembled from chosen signs.

Also the source of the **design vs illustration split** we use for
turnaround/sprite vs hero shot; toi8's 「戦闘力と性格を表す配色」 (palette
encodes power and temperament) and 「画面の情報量をコントロールする」
(control information density → our `visual_density`); and つなこ's staged
escalation discipline behind the rarity tiers.

- Full TOC with page numbers: https://books.mdn.co.jp/books/3215303020/
- Detailed TOC + review: http://comics.blog.shinobi.jp/character/キャラクターデザインの教科書
- Publisher release notes: https://books.mdn.co.jp/release/43417/

### 『アニメーター室田雄平が考えるヒットするキャラクターデザインの作り方』
Yuhei Murota, Genkosha, 2020. ISBN 978-4-7683-1387-9.

By the Love Live! character designer. Source of the **cast-level**
differentiation rule: a marketable roster is designed as a *set*, with colour,
costume logic and silhouette allocated across characters so each is
individually memorable and instantly distinguishable from teammates. Covers
「女子の作られたかわいさや魅力」 (constructed cuteness and appeal),
「デザインにおける色の選び方」 (colour selection), 「アイドル衣装の合わせ方」
(costume coordination).

- Publisher page: https://www.hanmoto.com/bd/isbn/9784768313879
- Description + TOC: https://honto.jp/netstore/pd-book_30491575.html

### 『「キャラクター」のデザイン&描き方 カラフルポップで魅せるイラスト技巧』
くるみつ, 2021. ISBN 978-4-7986-2594-9.

By a social-game character/card illustrator. Strong on ポーズ・シルエットの
作り方 (pose and silhouette construction) and 色の選び方 (colour selection)
specifically for gacha card art.

- https://www.amazon.co.jp/dp/4798625949

### 『萌え絵の教科書 vol.5 ゲーム絵師が教える！ファンタジーイラストの基本ルール』
天野英, 2017. Front-line vs back-line character construction rules for game
illustration — useful when adding characters with a clear combat/support role.

## Tier A — fetchable craft references

These are complete and free. Open them directly.

- **Eye typology by personality** — Clip Studio, thorough, illustrated and
  directly usable: https://tips.clip-studio.com/ja-jp/articles/6521
  Maps size / curve / outer-corner tilt / gloss to personality, then gives
  eleven concrete character types with the geometry for each. This is the full
  source of the eye tables in `design-canon.md`, reproduced there in summary —
  **open the original when assigning eyes to a new character**, because the
  illustrations carry information the table cannot.
- **Eye variation by character type** — https://www.clipstudio.net/oekaki/archives/152284
- **Silhouette, Big/Mid/Small and shape language** — https://posani.jp/blog/character-design-basics-2025.html
  Source of the 大:中:小 = 6:3:1 mass ratio and the black-fill test phrasing.
- **Yoyogi Animation Academy instructors' book roundup** — useful map of which
  book solves which problem: https://www.mdn.co.jp/web/book_review/4626

## Tier A — Chinese gacha production practice

- **《少女前线2：追放》art team breakdown** — https://game.xiaomi.com/viewpoint/1392697565_1644457607820_11
  Character information flows 世界观 → 故事脉络 → 关键出场主角 → 相关角色
  before anyone draws; 视觉密度 standardised per rarity tier; each character
  assigned 视觉关键字 (visual keywords) and a defined player expectation.
  Directly behind our `visual_density`, `memory_point` and brief-first workflow.
- **Game character design concepts primer** — https://www.gcores.com/articles/156026
  Geometric-ratio approach to shape language: protagonists square-dominant,
  antagonists triangle-dominant, and why 剪影 (silhouette) is judged before
  internal structure.
- **二次元 scene/character rendering tips** — https://bbs.gameres.com/thread_889676_1_1.html
  On why a well-designed silhouette beats dense detail
  (「经过设计过的轮廓剪影比复杂的细节画面更抓人眼球」).

## Project canon (in-repo, authoritative)

- `ai_agent_docs/SEIRIN_Design_Document_edited.md` — §5 factions, §6 cast,
  §10 visual and sound language, §11 commercial/merch principles.
- `ai_agent_docs/IMAGE_PROMPTS.md` — existing background and Splash prompts;
  the Splash blocks are hard-won and worth reading before regenerating her.
- `ai_agent_docs/ART_PIPELINE_NEXT.md` — green-sheet convention, matting order.
- `AGENTS.md` — offline invariants, asset and archive policy.

## Further free material worth mining

Not yet distilled into this skill; good next stops if a problem isn't covered.

- **CEDiL** (https://cedil.cesa.or.jp) — the CEDEC digital library. Free with
  registration; slides from Japan's largest game-developer conference,
  including Cygames and other studios on character art production pipelines.
- **CEDEC follow-up roundups** — https://gamemakers.jp collects publicly posted
  slide decks each year, no registration needed.
- **Clip Studio TIPS** (https://tips.clip-studio.com) — the single densest free
  source of Japanese illustration craft; the eye typology above came from here.

## A note on trust

Where this skill states a rule as fact, it came from a Tier A source and can be
verified there. Where it reports the *structure* of a Tier B book — that
「キャラクター記号学」 enumerates eye/brow/mouth/contour/skin/hair/body as
personality-encoding signs — that comes from published tables of contents and
reviews, not from the book's text.

Where the skill makes a judgement call for *this project* — the appeal tracks,
the silhouette allocation across the roster, the locked face-box numbers, the
cast's memory points — that is project policy, not received wisdom, and can be
changed if it stops working.
