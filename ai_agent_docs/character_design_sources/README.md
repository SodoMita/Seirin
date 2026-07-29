# Character Design Sources — README

This directory indexes the **27 primary source documents** referenced in
`../Character_Design_Sourcebook_JP_CN_Manga_Anime_Gacha.pdf` (the
"Sourcebook"). The source PDFs were formerly kept here as a local mirror.
They were removed on 2026-07-29 to keep the repository lightweight: the
Sourcebook remains the compact, self-contained orientation guide, while this
README retains the complete file and section index for a deep-dive download
from each source's original public publisher.

## Licensing summary

Every file in this directory falls into one of the following licensing
categories. **No copyrighted commercial full texts are included.** For the
10 commercial books referenced in the Sourcebook (MdN, KADOKAWA, Arknights
artbook series, Genshin Impact artbook series), only bibliographic
information is provided in Sourcebook §V — those books are **not** in this
directory.

| License category | Files in this directory |
|---|---|
| Public-domain / government publication | METI, Bunka-chō (×3) — `JP/` |
| Free industry-association public release | AJA (×3), CEDEC/CESA (×4) — `JP/` |
| Open-access institutional repository (OCW) | Kyoto Seika (×2), TEU (×1), JSSD (×2) — `JP/` |
| CC-BY 4.0 open access | F1000Research Watabe — `JP/`; Francis Press (×3) — `CN/` |
| Free public archive | Taiwan NTMoFA — `CN/` |
| Conference-slide free release | GDC Vault, GDC China — `CN/` |
| Official free course / article transcript | Tencent Game Institute, Unity Developer Community — `CN/` |

## Directory layout

```
character_design_sources/
├── JP/                              # optional local deep-dive downloads
├── CN/                              # source transcripts retained; PDFs are not versioned
└── build/                           # reproducibility scripts for the compact Sourcebook
    ├── build_body.py
    └── cover.html
```

## Source → Sourcebook section cross-reference

For each file, the table below maps it to the corresponding section in
`../Character_Design_Sourcebook_JP_CN_Manga_Anime_Gacha.pdf` where the
2–3 page summary and bibliographic block live.

| File | Sourcebook § | Source title (short) |
|---|---|---|
| `JP/AJA_anime_industry_report_2023_summary_jp.pdf` | §I-1 | AJA 2023 Summary |
| `JP/AJA_anime_industry_report_2024_summary_jp.pdf` | §I-2 | AJA 2024 Summary |
| `JP/AJA_anime_industry_report_2025_summary_jp.pdf` | §I-3 | AJA 2025 Summary |
| `JP/METI_anime_action_plan.pdf` | §I-4 | METI Anime Action Plan |
| `JP/Bunkacho_animation_research_guide.pdf` | §I-5 | Bunka-chō Animation Guide |
| `JP/Bunkacho_manga_research_guide.pdf` | §I-6 | Bunka-chō Manga Guide II |
| `JP/Bunkacho_game_research_guide.pdf` | §I-7 | Bunka-chō Game Guide II |
| `JP/CEDEC_*.pdf` (4 files) | §I-8 | CEDEC/CESA Roadmaps |
| `JP/KyotoSeika_cute_character_thesis_2021.pdf` | §II-1 | Li Yingchao kawaii PhD |
| `JP/TEU_character_design_support.pdf` | §II-2 | Mogi character formalization PhD |
| `JP/F1000_transmedia_character.pdf` | §II-3 | Watabe transmedia (CC-BY) |
| `JP/JSTAGE_jssd_character_design_structure.pdf` | §II-4 | Huang JSSD PA-36 |
| `JP/JSSD_2024_program_71th_conference.pdf` | §II-5 | JSSD 71st Conference Program |
| `JP/KyotoSeeka_MangaStudies_v1_Kishida_character_expression.pdf` | §II-6 | Matsushita Manga Studies Vol.1 |
| `CN/mihoyo_gdc2021_genshin_openworld.pdf` | §III-1 | Cai Haoyu GDC 2021 |
| `CN/netease_gdcchina15_fantastic_gaming.pdf` | §III-2 | Chen Junxiong NetEase |
| `CN/netease_gdcchina15_agile_iteration.pdf` | §III-3 | Wen Fujun NetEase |
| `CN/ea_ufc_gdcchina14_character_cn.pdf` | §III-4 | EA UFC GDC China 2014 (CN) |
| `CN/tencent_tgdc2018_honor_of_kings_character_design.txt` | §III-5 | Zhan Tao TGDC 2018 |
| `CN/hypergryph_unite2020_arknights_3d2d_combination.txt` | §III-6 | Haigao Unite 2020 |
| `CN/francispress_chinese_3d_animation_character.pdf` | §IV-1 | CN 3D Animation Character (CC-BY) |
| `CN/francispress_pixar_animation_modeling.pdf` | §IV-2 | Yang Shuting Pixar Modeling (CC-BY) |
| `CN/francispress_color_in_animation_scenes.pdf` | §IV-3 | Color in Animation Scenes (CC-BY) |
| `CN/taiwan_ntmofa_character_design_methods.pdf` | §IV-4 | Ke Kai-Ren NTMoFA |

## How to use these sources

1. **Start with the Sourcebook PDF** (`../Character_Design_Sourcebook_JP_CN_Manga_Anime_Gacha.pdf`).
   It is a 66-page orientation guide that summarizes each source in 2–3
   pages and provides a complete bibliographic block for each.

2. **Use the AI Agent Questionnaire** (`../Character_Design_Brief_AI_Agent_Questionnaire.md`)
   as the structured brief template for any new character. Each question
   in the questionnaire is tagged with the source principle it
   operationalises — when in doubt about a question, consult the
   corresponding source PDF in this directory.

3. **Read the original sources** for any deep-dive. The most important
   sources for character-design practice are:
   - `JP/KyotoSeika_cute_character_thesis_2021.pdf` (502 pp.) —
     the foundational kawaii-perception model (Li Yingchao PhD).
   - `JP/F1000_transmedia_character.pdf` (21 pp., CC-BY) — the
     theoretical foundation for character-as-IP (Watabe).
   - `CN/mihoyo_gdc2021_genshin_openworld.pdf` (29 slides) — the
     character-as-content thesis (Cai Haoyu).
   - `CN/tencent_tgdc2018_honor_of_kings_character_design.txt` —
     silhouette + color recognition methodology (Zhan Tao).
   - `CN/hypergryph_unite2020_arknights_3d2d_combination.txt` —
     the Arknights character/worldview co-evolution methodology.

## Reproducibility — rebuilding the Sourcebook PDF

The `build/` subdirectory contains the persisted Python script
(`build_body.py`, 3,561 lines) and the cover HTML template (`cover.html`)
used to generate `../Character_Design_Sourcebook_JP_CN_Manga_Anime_Gacha.pdf`.

To rebuild the sourcebook:

```bash
# Prerequisites: Python 3.10+, reportlab, pypdf, playwright, node
# Render cover (single page)
node /path/to/pdf-skill/scripts/html2poster.js build/cover.html \
    --output build/cover.pdf --width 794px

# Build body PDF (66 pages total after merge)
python3 build/build_body.py    # produces build/body.pdf

# Merge cover + body
python3 -c "
from pypdf import PdfReader, PdfWriter
w = PdfWriter()
w.add_page(PdfReader('build/cover.pdf').pages[0])
for p in PdfReader('build/body.pdf').pages:
    w.add_page(p)
w.add_metadata({'/Title': 'Character Design Sourcebook', '/Author': 'Z.ai'})
with open('Character_Design_Sourcebook_JP_CN_Manga_Anime_Gacha.pdf', 'wb') as f:
    w.write(f)
"
```

The build script depends on the Z.ai PDF skill at
`/home/z/my-project/skills/pdf/` for the `install_font_fallback` helper
and palette generator. See the script header for full requirements.

## Attribution

Each file in this directory retains its original attribution. When citing
or redistributing, follow the license of the original source (CC-BY
sources require attribution; government publications are public domain;
GDC Vault free releases require GDC Vault attribution). Full attribution
metadata for each source is in Sourcebook Appendix A.

## Contact

For corrections, additions, or questions about this directory, contact
the Z.ai Research Open Intelligence Desk or open an issue on the Seirin
repository.
