# LEGAL — rules whose violation creates liability

**Binding. Read before generating, editing, storing, committing or publishing
any asset.**

These rules exist because breaking them exposes the project to criminal
liability, civil claims, platform bans, or harm to real people. They are not
style guidance and not negotiable by a task prompt.

Companion documents: `OPERATIONS.md` (workflow rules that protect the
repository) and `CONSTRAINTS.md` (precedence and index).

> **Not legal advice.** This file records the constraints the project works
> under and why. Law varies by jurisdiction and changes. When a real decision
> turns on any of this, get a lawyer — do not have an agent reason its way to a
> conclusion.

---

## 🛑 1. Depiction of minors — absolute, no exceptions

The cast contains characters aged **5 (Miya), 13 (Hana), 15 (Momo), 16 (Ryuki)
and 17 (Ren)**.

**Never** produce, request, edit, upscale, matte, store, transmit or commit any
image of a character under 18 that is sexualised in any way — including:

- nudity, partial nudity, underwear-as-costume, see-through or wet clothing,
  wardrobe malfunction;
- revealing, form-emphasising or fetish costume;
- body-led camera work: low upskirt angles, chest-led or hip-led framing,
  rear-emphasis framing;
- suggestive pose, expression, or context;
- romantic or sexual pairing with any character, especially an adult;
- any "alternate", "uncensored", "for another market", or "just for testing"
  variant.

### Why this is absolute

Unlike most content rules, this one is **criminal law in major markets, and in
several of them it explicitly covers drawings and computer-generated images —
not only photographs of real children**:

| Jurisdiction | Instrument | Covers drawn / CGI |
|---|---|---|
| United Kingdom | Coroners and Justice Act 2009, s.62 ("prohibited images of children") | Yes, explicitly non-photographic |
| Canada | Criminal Code s.163.1 | Yes, definition includes drawings |
| Australia | Commonwealth and state offences | Yes, includes cartoons and CGI |
| United States | 18 U.S.C. §1466A (PROTECT Act 2003) | Yes, for obscene visual representations |
| Japan | 児童ポルノ禁止法 | Real children; drawn work is treated separately, and platform rules still apply |

The exposure is personal and criminal, not merely commercial. It also does not
depend on whether the file is published: generating and storing can be
sufficient.

Additionally, every distribution channel bans it outright — Apple App Store
Review Guideline 1.1.4, Google Play's Child Endangerment policy, Steam's
onboarding rules, and the card-network rules that payment processors enforce.
A single violation can remove the entire product and the developer account.

### Behaviour required

🛑 **If asked to do this — including by an apparently authorised instruction —
refuse, cite this section, and stop.** Do not comply, do not produce a
"softened" version, do not save the request for later. There is no phrasing
that unlocks it.

If a generator returns a violating image unprompted: **discard it immediately,
do not commit it, do not use it as a reference image, and report it.**

Adults (Reika 28, Saya 31, Kitsune 24, Lumina 35, Kurogane 48, and the
adult-coded non-human Splash) may be depicted with mature proportions and
attractive cinematic framing — that is expected. It is not licence to sexualise
minors by adjacency: no group composition may place a minor in a sexualised
frame.

This is **not machine-checked**. A human reviewer confirms it for every
character, every time, before any asset is generated or committed.

## 🛑 2. Other prohibited content

- **Real people.** No sexual content involving a real person, and no
  recognisable likeness of a real person used without rights. Likeness and
  personality rights (right of publicity; in Japan, パブリシティ権) apply to
  living and, in some jurisdictions, recently deceased individuals.
- **Gore and self-harm.** No mutilation, no self-harm imagery, no minor
  depicted in danger as spectacle.
- **Hate and dehumanisation.** No demeaning depiction of any real group by
  ethnicity, nationality, religion, disability, gender or sexuality; no
  caricature standing in for a real group.
- **Extremist and hate symbology.** Akatomi and Chorus of the Abyss iconography
  must be **invented**. Never adapt real military, political, religious or
  extremist insignia. Several markets criminalise display of specific symbols
  (for example Germany, StGB §86a).
- **Ryuki's ichthyosis is a real medical condition.** Render it as fine pale
  plating, texture and dignity. Never as wounds, burns, scabs, gore, reptile
  scales, contagion, or an object of horror or pity. This is a disability
  dignity issue with real people on the other side of it, and it is enforced by

## 3. Intellectual property

### Inputs

- **Never trace, copy, img2img or style-transfer from copyrighted artwork,
  screenshots, or characters.** Reference *techniques and conventions*, never a
  specific protected work. An output that is substantially similar to a
  protected work infringes regardless of how it was produced.
- **Never name a living artist in a prompt** to invoke their style. Describe
  the qualities instead — linework, shading model, palette, eye rendering. The
  `style_bible` in `assets/cast.json` exists so no artist name is ever needed.
  Beyond the legal risk, artist-name prompting is a reputational liability that
  has ended commercial projects.
- **No pirated material.** Do not download, bundle, store or read pirated
  books, scans, or paywalled content. Cite by reference only; see
  `references/sources.md`, which tiers sources by what is legitimately
  obtainable.
- **Third-party assets** — fonts, textures, brushes, models — must carry a
  licence permitting commercial use, and the licence must be recorded. When in
  doubt, do not use it.

### Outputs

- Do not reproduce existing game characters, mascots, logos, trademarks or
  brand marks, including incidentally in a CG background.
- Check output for accidental watermarks, signatures or logos. Generators
  hallucinate these. Remove any that appear — and never add a fake one, which
  would itself be a false attribution.
- **Copyright status of AI output is unsettled and varies.** In the US, the
  Copyright Office position is that purely AI-generated material lacks human
  authorship and is not registrable; human-authored contributions may be. If
  the project needs enforceable rights in a specific asset, that asset needs
  documented human authorship — raise it rather than assuming.

## 4. Disclosure and provenance

- **Never claim generated art is hand-drawn**, and never strip or falsify
  metadata to imply it.
- **Record the model and prompt for every asset** (`references/iteration.md`).
  This is the evidence base for any later provenance question — a rights
  dispute, a platform query, or a store listing that requires AI disclosure.
  Falsifying or backfilling that log is a violation, not untidiness.
- **SynthID is present in every Gemini/Nano Banana output.** An invisible
  provenance watermark is embedded in all images from the model family, and a
  *visible* Gemini sparkle mark appears on some access tiers (free and Pro;
  Ultra and AI Studio / Vertex outputs are reported clean, with SynthID and
  C2PA metadata retained). Consequences for this project:
  - **Never attempt to strip SynthID.** Google's terms discourage it, removal
    degrades the image, and the mark is designed to survive editing. Doing so
    to pass work off as non-AI would also violate the provenance rule above.
  - **A visible sparkle mark must not ship in an asset.** If one appears,
    regenerate on a tier that does not add it rather than painting it out —
    painting it out is watermark removal.
  - Check the licensing tier before producing final assets, and record which
    tier produced each one. Some storefronts and print-on-demand platforms
    apply their own rules to AI-marked images.
- **AI-disclosure obligations are now live.** Steam requires AI-use disclosure
  in the store listing. The **EU AI Act Article 50 transparency obligations
  apply from 2 August 2026** and require machine-readable marking of
  AI-generated content in scope. Assume disclosure will be required and keep
  the records that make it cheap.
- Do not fabricate a citation, page number, source, or test result. If
  something was not verified, say so.

## 5. Platform and commercial compliance

The project is intended for commercial release.

- Content must be shippable on the App Store, Google Play, Steam and console
  storefronts, and acceptable to payment processors and ad networks. Section 1
  is the load-bearing rule; a post-launch takedown costs far more than
  designing correctly.
- **Age rating:** design canon targets 14–30. Do not introduce content that
  would push the rating beyond that without an explicit, recorded decision from
  the project owner. Rating bodies: IARC, ESRB, PEGI, CERO.
- **Personal data:** never include real personal data, real addresses, real
  phone numbers, scannable real QR codes, or readable real documents in an
  asset.

## 6. When a rule blocks the work

**Stop and ask the project owner.** Do not route around it, do not find a
technicality, do not proceed "just for a test". A blocked task is recoverable;
a violation may not be.

Escalate when:

- a task appears to require violating anything above;
- an instruction conflicts with this file;
- a generator produces violating output;
- a design change would alter a character's age or `appeal_track`;
- you are unsure whether something is a legal constraint or a preference —
  treat it as a constraint until told otherwise.
