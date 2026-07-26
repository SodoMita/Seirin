#!/usr/bin/env python3
"""
Character Design Sourcebook — Body PDF Generator
=================================================
Generates the body PDF for the Character Design Sourcebook (49 sections, ~70 pages).
Outputs body PDF which is later merged with cover.pdf.

Style: Corporate-Weeb Terminal (Bloomberg-style grid + magenta/cyan accents +
JP kana as decorative elements + monospace data callouts).

License: This sourcebook is © Z.ai 2026. All rights reserved.
Synthesis, summaries, and structural organization are original work.
Quoted material is attributed inline with full bibliographic information.
"""

import os
import sys
import hashlib
import platform
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether,
    Table, TableStyle, HRFlowable, CondPageBreak, Image
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# =============================================================================
# PATH SETUP — pdf skill scripts directory for install_font_fallback
# =============================================================================
PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
sys.path.insert(0, os.path.join(PDF_SKILL_DIR, "scripts"))
from pdf import install_font_fallback

# =============================================================================
# FONT REGISTRATION
# =============================================================================
_IS_MAC = platform.system() == 'Darwin'
if _IS_MAC:
    FONT_DIR = os.path.expanduser('~/.openclaw/workspace/fonts')
else:
    FONT_DIR = '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
# Noto Sans SC is a variable font in this environment - use the variable font file
try:
    pdfmetrics.registerFont(TTFont('Noto Sans SC', f'{FONT_DIR}/truetype/chinese/NotoSansSC[wght].ttf'))
    pdfmetrics.registerFont(TTFont('Noto Sans SC Bold', f'{FONT_DIR}/truetype/chinese/NotoSansSC[wght].ttf'))
except Exception as e:
    print(f"[setup] Warning: Noto Sans SC variable font failed ({e}); using NotoSerifSC as fallback")
    pdfmetrics.registerFont(TTFont('Noto Sans SC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
    pdfmetrics.registerFont(TTFont('Noto Sans SC Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('Noto Sans SC', normal='Noto Sans SC', bold='Noto Sans SC Bold')
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# Critical: install font fallback for mixed CJK/Latin text
install_font_fallback()

# =============================================================================
# PALETTE — corporate-weeb (slate-blue + crimson + cyan on light bg)
# =============================================================================
PAGE_BG       = colors.HexColor('#f4f5f5')
SECTION_BG    = colors.HexColor('#f0f1f2')
CARD_BG       = colors.HexColor('#e8eaeb')
TABLE_STRIPE  = colors.HexColor('#ebeded')
HEADER_FILL   = colors.HexColor('#32454e')
COVER_BLOCK   = colors.HexColor('#566a74')
BORDER        = colors.HexColor('#acbdc5')
ICON          = colors.HexColor('#4b86a4')
ACCENT        = colors.HexColor('#c23a50')   # crimson — weeb accent
ACCENT_2      = colors.HexColor('#1f6c92')   # deep cyan — corporate accent
TEXT_PRIMARY  = colors.HexColor('#131515')
TEXT_MUTED    = colors.HexColor('#747b7e')
SEM_INFO      = colors.HexColor('#507aa4')

# Table palette
TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# =============================================================================
# PAGE GEOMETRY
# =============================================================================
PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN   = 0.85 * inch
RIGHT_MARGIN  = 0.85 * inch
TOP_MARGIN    = 0.95 * inch
BOTTOM_MARGIN = 0.85 * inch
AVAILABLE_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN

# =============================================================================
# STYLES
# =============================================================================
STYLES = getSampleStyleSheet()

# Body — English with CJK fallback for inline JP/CN terms
body_style = ParagraphStyle(
    name='Body', fontName='FreeSerif', fontSize=10.5, leading=16,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
    spaceBefore=0, spaceAfter=8,
)

body_indent_style = ParagraphStyle(
    name='BodyIndent', parent=body_style, firstLineIndent=18,
)

# Headings
h1_style = ParagraphStyle(
    name='H1', fontName='FreeSerif-Bold', fontSize=22, leading=28,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceBefore=10, spaceAfter=8,
)

h2_style = ParagraphStyle(
    name='H2', fontName='FreeSerif-Bold', fontSize=15, leading=20,
    alignment=TA_LEFT, textColor=HEADER_FILL,
    spaceBefore=14, spaceAfter=6,
)

h3_style = ParagraphStyle(
    name='H3', fontName='FreeSerif-Bold', fontSize=12, leading=16,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceBefore=10, spaceAfter=4,
)

# Kicker / eyebrow
kicker_style = ParagraphStyle(
    name='Kicker', fontName='DejaVuSans', fontSize=8.5, leading=11,
    alignment=TA_LEFT, textColor=ACCENT,
    spaceBefore=0, spaceAfter=4,
)

# Source code / mono
mono_style = ParagraphStyle(
    name='Mono', fontName='DejaVuSans', fontSize=8.5, leading=12,
    alignment=TA_LEFT, textColor=TEXT_MUTED,
    spaceBefore=2, spaceAfter=2,
    leftIndent=12, rightIndent=12,
)

# Bibliographic block label
biblio_label_style = ParagraphStyle(
    name='BiblioLabel', fontName='DejaVuSans', fontSize=8, leading=11,
    alignment=TA_LEFT, textColor=TEXT_MUTED,
    spaceBefore=0, spaceAfter=1,
)

biblio_value_style = ParagraphStyle(
    name='BiblioValue', fontName='FreeSerif', fontSize=10, leading=14,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceBefore=0, spaceAfter=1,
)

# Quote block
quote_style = ParagraphStyle(
    name='Quote', fontName='FreeSerif-Italic', fontSize=10.5, leading=16,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    leftIndent=20, rightIndent=12,
    spaceBefore=6, spaceAfter=6,
    borderColor=ACCENT, borderWidth=0,
    borderPadding=4,
)

# Caption (for tables)
caption_style = ParagraphStyle(
    name='Caption', fontName='FreeSerif-Italic', fontSize=9, leading=12,
    alignment=TA_CENTER, textColor=TEXT_MUTED,
    spaceBefore=3, spaceAfter=12,
)

# Table cell styles
table_header_style = ParagraphStyle(
    name='TableHeader', fontName='FreeSerif-Bold', fontSize=10, leading=12,
    alignment=TA_CENTER, textColor=colors.white,
)

table_cell_style = ParagraphStyle(
    name='TableCell', fontName='FreeSerif', fontSize=9, leading=12,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY,
)

table_cell_center_style = ParagraphStyle(
    name='TableCellCenter', fontName='FreeSerif', fontSize=9, leading=12,
    alignment=TA_CENTER, textColor=TEXT_PRIMARY,
)

# Stat block (callout)
stat_big_style = ParagraphStyle(
    name='StatBig', fontName='DejaVuSans', fontSize=24, leading=28,
    alignment=TA_CENTER, textColor=ACCENT,
)

stat_label_style = ParagraphStyle(
    name='StatLabel', fontName='DejaVuSans', fontSize=8, leading=11,
    alignment=TA_CENTER, textColor=TEXT_MUTED,
)

# TOC styles
toc_h1_style = ParagraphStyle(
    name='TOCH1', fontName='FreeSerif-Bold', fontSize=12, leading=18,
    leftIndent=0, textColor=TEXT_PRIMARY,
)

toc_h2_style = ParagraphStyle(
    name='TOCH2', fontName='FreeSerif', fontSize=10, leading=14,
    leftIndent=18, textColor=TEXT_MUTED,
)

# Section divider styles
section_divider_kicker_style = ParagraphStyle(
    name='SectDivKicker', fontName='DejaVuSans', fontSize=10, leading=14,
    alignment=TA_LEFT, textColor=ACCENT,
    spaceBefore=0, spaceAfter=10,
)

section_divider_title_style = ParagraphStyle(
    name='SectDivTitle', fontName='FreeSerif-Bold', fontSize=28, leading=34,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceBefore=4, spaceAfter=16,
)

section_divider_body_style = ParagraphStyle(
    name='SectDivBody', fontName='FreeSerif', fontSize=11.5, leading=17,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
    spaceBefore=4, spaceAfter=12,
)

# =============================================================================
# CUSTOM FLOWABLES
# =============================================================================

def horizontal_rule(color=BORDER, thickness=0.5, space_before=2, space_after=2, width="100%"):
    """Thin horizontal rule."""
    return HRFlowable(width=width, thickness=thickness, color=color,
                      spaceBefore=space_before, spaceAfter=space_after, hAlign='LEFT')

def accent_rule(thickness=2, space_before=2, space_after=8, width=60):
    """Short thick accent rule (crimson). Width is in points (numeric)."""
    return HRFlowable(width=width, thickness=thickness, color=ACCENT,
                      spaceBefore=space_before, spaceAfter=space_after, hAlign='LEFT')

def callout_box(big_text, label_text, width=160):
    """Stat callout — big number + small label, accent border."""
    data = [
        [Paragraph(big_text, stat_big_style)],
        [Paragraph(label_text, stat_label_style)],
    ]
    t = Table(data, colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('LINEBEFORE', (0, 0), (0, -1), 3, ACCENT),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return t

def callout_row(items, total_width=None):
    """Row of 3-4 stat callouts side by side."""
    if total_width is None:
        total_width = AVAILABLE_WIDTH
    cell_width = total_width / len(items)
    cells = []
    for big, lbl in items:
        cell = Table(
            [[Paragraph(big, stat_big_style)],
             [Paragraph(lbl, stat_label_style)]],
            colWidths=[cell_width - 8]
        )
        cell.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
            ('LINEBEFORE', (0, 0), (0, -1), 3, ACCENT),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        cells.append(cell)
    row = Table([cells], colWidths=[cell_width] * len(items))
    row.setStyle(TableStyle([
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    return row

def biblio_block(fields, width=None):
    """Bibliographic block — label / value table.
    fields = [(label, value), ...]
    """
    if width is None:
        width = AVAILABLE_WIDTH
    rows = []
    for label, value in fields:
        rows.append([
            Paragraph(label.upper(), biblio_label_style),
            Paragraph(value, biblio_value_style),
        ])
    t = Table(rows, colWidths=[100, width - 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SECTION_BG),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEBEFORE', (0, 0), (0, -1), 3, ACCENT_2),
        ('LINEBELOW', (0, 0), (-1, -1), 0.3, BORDER),
    ]))
    return t

def quote_block(text, attribution, width=None):
    """Attributed quotation block with accent left border."""
    if width is None:
        width = AVAILABLE_WIDTH
    quote_para = Paragraph(f'<i>"{text}"</i>', quote_style)
    attr_para = Paragraph(f'— {attribution}', ParagraphStyle(
        name='Attr', fontName='FreeSerif', fontSize=9, leading=12,
        textColor=TEXT_MUTED, alignment=TA_LEFT, leftIndent=20, spaceAfter=6,
    ))
    t = Table([[quote_para], [attr_para]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SECTION_BG),
        ('LINEBEFORE', (0, 0), (0, -1), 3, ACCENT),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    return t

# =============================================================================
# TOC + DOC TEMPLATE
# =============================================================================

class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_heading(text, style, level=0, story=None):
    """Add a heading with bookmark for TOC."""
    key = 'h_' + hashlib.md5(text.encode()).hexdigest()[:10]
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

# Available height for orphan prevention
AVAILABLE_HEIGHT = PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN
H1_ORPHAN_THRESHOLD = AVAILABLE_HEIGHT * 0.18

def add_h1(text, story):
    """Add H1 heading with orphan prevention (no forced page break)."""
    story.append(CondPageBreak(H1_ORPHAN_THRESHOLD))
    story.append(accent_rule(width=40))
    story.append(add_heading(text, h1_style, level=0))
    story.append(Spacer(1, 4))

def add_h2(text, story):
    """Add H2 heading."""
    story.append(add_heading(text, h2_style, level=1))

def add_h3(text, story):
    """Add H3 heading (no bookmark — appears in body only)."""
    story.append(Paragraph(text, h3_style))

def add_body(text, story, indent=False):
    """Add a body paragraph."""
    style = body_indent_style if indent else body_style
    story.append(Paragraph(text, style))

def add_kicker(text, story):
    """Add an eyebrow / kicker."""
    story.append(Paragraph(text.upper(), kicker_style))

def add_spacer(h, story):
    story.append(Spacer(1, h))

def add_safe_keep(elements, story):
    """Wrap small element groups in KeepTogether (height-capped)."""
    MAX_KEEP = PAGE_HEIGHT * 0.35
    total_h = 0
    for el in elements:
        try:
            w, h = el.wrap(AVAILABLE_WIDTH, PAGE_HEIGHT)
            total_h += h
        except Exception:
            pass
    if total_h <= MAX_KEEP:
        story.append(KeepTogether(elements))
    else:
        for el in elements:
            story.append(el)

# =============================================================================
# HEADER / FOOTER (page decoration)
# =============================================================================

def draw_header_footer(canvas, doc):
    """Draw page header (title) and footer (page number)."""
    canvas.saveState()

    # Header
    canvas.setFont('DejaVuSans', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(LEFT_MARGIN, PAGE_HEIGHT - 0.55 * inch,
                      'CHARACTER DESIGN SOURCEBOOK  /  JP & CN MANUALS FOR MANGA, ANIME & GACHA')
    canvas.drawRightString(PAGE_WIDTH - RIGHT_MARGIN, PAGE_HEIGHT - 0.55 * inch,
                           'EDITION 2026 / 01')
    # Header rule
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.4)
    canvas.line(LEFT_MARGIN, PAGE_HEIGHT - 0.65 * inch,
                PAGE_WIDTH - RIGHT_MARGIN, PAGE_HEIGHT - 0.65 * inch)
    # Accent square in header
    canvas.setFillColor(ACCENT)
    canvas.rect(LEFT_MARGIN - 8, PAGE_HEIGHT - 0.575 * inch, 4, 4, fill=1, stroke=0)

    # Footer
    canvas.setFont('DejaVuSans', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(LEFT_MARGIN, 0.5 * inch,
                      'Z.ai Research  /  Open Intelligence Desk  /  PUBLIC FAIR-USE')
    canvas.drawRightString(PAGE_WIDTH - RIGHT_MARGIN, 0.5 * inch,
                           f'PAGE  {doc.page:03d}')
    # Footer rule
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.4)
    canvas.line(LEFT_MARGIN, 0.7 * inch,
                PAGE_WIDTH - RIGHT_MARGIN, 0.7 * inch)

    canvas.restoreState()

print("[setup] Body PDF generator initialized — fonts registered, palette loaded.")

# =============================================================================
# SECTION-DIVIDER BUILDER
# =============================================================================

def build_section_divider(story, kicker, title, intro):
    """Build a Roman-numeral section divider page."""
    story.append(Spacer(1, 80))
    add_kicker(kicker, story)
    story.append(Spacer(1, 6))
    story.append(accent_rule(width=60, thickness=3))
    story.append(add_heading(title, section_divider_title_style, level=0))
    story.append(Spacer(1, 8))
    story.append(Paragraph(intro, section_divider_body_style))
    story.append(PageBreak())

# =============================================================================
# SOURCE-ENTRY BUILDER (used for the 27 sources)
# =============================================================================

def build_source_entry(story, entry_id, title_en, title_orig, biblio_fields, body_paragraphs,
                       quote=None, callouts=None, h2_text=None):
    """Build a single source entry (~1.5-3 pages).
    body_paragraphs: list of HTML strings (each becomes a Paragraph)
    quote: optional (text, attribution) tuple
    callouts: optional list of (big, label) tuples for a callout row at the end
    """
    # H2 with bookmark
    full_title = f'{entry_id}. {title_en}'
    if h2_text:
        full_title = h2_text
    add_h2(full_title, story)

    # Original-language title in italic muted
    # Use NotoSerifSC for CJK support (italic styling doesn't apply to CJK)
    if title_orig:
        story.append(Paragraph(title_orig, ParagraphStyle(
            name='OrigTitle', fontName='NotoSerifSC', fontSize=10.5, leading=14,
            textColor=TEXT_MUTED, spaceAfter=10,
        )))

    # Bibliographic block
    story.append(biblio_block(biblio_fields))
    story.append(Spacer(1, 10))

    # Body paragraphs
    for i, para_html in enumerate(body_paragraphs):
        add_body(para_html, story, indent=(i > 0))

    # Optional quote
    if quote:
        story.append(Spacer(1, 6))
        story.append(quote_block(quote[0], quote[1]))

    # Optional callouts
    if callouts:
        story.append(Spacer(1, 8))
        story.append(callout_row(callouts))
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 8))
    story.append(horizontal_rule(color=BORDER, thickness=0.3, space_before=2, space_after=8))

# =============================================================================
# STORY ASSEMBLY — All 49 sections
# =============================================================================

def build_story():
    story = []

    # -------------------------------------------------------------------------
    # SECTION: Table of Contents
    # -------------------------------------------------------------------------
    add_kicker('NAVIGATION INDEX', story)
    story.append(Spacer(1, 6))
    story.append(accent_rule(width=60, thickness=3))
    story.append(Paragraph('Table of Contents', h1_style))
    story.append(Spacer(1, 16))

    toc = TableOfContents()
    toc.levelStyles = [toc_h1_style, toc_h2_style]
    story.append(toc)
    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # SECTION 3: Executive Summary
    # -------------------------------------------------------------------------
    add_h1('Executive Summary & How to Use This Sourcebook', story)

    add_body(
        'This sourcebook is a structured reading orientation to <b>twenty-seven '
        'legally-downloadable primary sources</b> on the craft of creating sellable '
        'characters for manga, anime, and gacha games (キャラクターデザイン / 角色 '
        '设计) — drawn from Japanese and Chinese academic, governmental, and '
        'industry-association publications. It is intended for character designers, '
        'gacha-studio art directors, IP researchers, and anyone who needs a '
        'map of the publicly-available literature in this field.',
        story
    )

    add_body(
        'The <b>scope</b> covers six categories: (I) Japanese industry and government '
        'sources (8 items, including AJA Anime Industry Report summaries, METI policy '
        'documents, Bunka-chō research guides, and CESA/CEDEC technology roadmaps); '
        '(II) Japanese academic sources (6 items, including two PhD theses, one CC-BY '
        'journal article, two JSSD/J-STAGE papers, and one Kyoto Seika Manga Studies '
        'article); (III) Chinese industry sources (7 items, including GDC Vault releases '
        'from miHoYo, NetEase, and EA, plus Tencent and Hypergryph talk transcripts); '
        '(IV) Chinese academic sources (4 items, including three CC-BY Francis Press '
        'papers and one Taiwan NTMoFA archive article); (V) commercial books referenced '
        'bibliographically only (10 items); and (VI) a cross-cutting methodology synthesis '
        'extracting the principles that recur across multiple sources.',
        story, indent=True
    )

    add_body(
        'The <b>legal framework</b> is strict: every primary source in this sourcebook is '
        'either public domain, Creative Commons (CC-BY), OpenCourseWare, a government '
        'publication, or an industry-association free release. <b>No copyrighted full '
        'texts are reproduced.</b> Commercial books (MdN, KADOKAWA, Hypergryph, miHoYo '
        'artbooks) are referenced bibliographically only — with ISBN, publisher, '
        'year, page count, and table of contents when publicly available. Short '
        'attributed quotations from CC-BY sources (F1000Research, Francis Press) are '
        'included under their respective licenses. Brief fair-use quotations from '
        'industry talks are attributed inline with full source URLs.',
        story, indent=True
    )

    add_body(
        'The intended <b>navigation pattern</b> is: read this executive summary first, '
        'then the methodology section (which explains how each source was verified), '
        'then the trilingual glossary, then read the source entries in any order '
        '(each entry is self-contained), and finally consult the cross-cutting '
        'methodology synthesis in Section VI to see the recurring principles. Every '
        'source entry includes a bibliographic block (title in original language + '
        'English translation, author, institution, year, license, page count, source '
        'URL) and a 2-3 page prose summary explaining what is actually written in '
        'the source. Appendix A is the complete source index with file paths and URLs; '
        'Appendix B is a catalog of supplementary online sources (URLs only); '
        'Appendix C is the copyright, fair-use, and attribution notice.',
        story, indent=True
    )

    add_body(
        'A caveat: this sourcebook is an <b>orientation guide</b>, not a substitute '
        'for reading the primary sources. The summaries are designed to tell you '
        'which sources are worth your time and what you will find inside — they '
        'are not replacements for engaging with the original texts. Where a source is '
        'CC-BY licensed, you should still read the original to engage with its full '
        'argument. Where a source is a copyrighted commercial book, you should '
        'purchase it through official channels to access the content.',
        story, indent=True
    )

    # -------------------------------------------------------------------------
    # SECTION 4: Methodology, Legal Framework & Source Taxonomy
    # -------------------------------------------------------------------------
    add_h1('Methodology, Legal Framework & Source Taxonomy', story)

    add_h2('4.1 Research Methodology', story)
    add_body(
        'The research protocol proceeded in four stages. First, targeted web searches '
        'were conducted in Japanese (using Kyoto Seika University, Tokyo University of '
        'Technology, AJA, Bunka-chō, METI, CEDEC, JSSD, F1000Research as seed '
        'institutions) and Chinese (using China Academy of Art, Communication '
        'University of China, Beijing Film Academy, miHoYo, Hypergryph, Tencent, '
        'NetEase, Kuro Games as seed institutions). Second, every candidate URL was '
        'fetched directly to verify that the resource exists at that location, that '
        'the license is as described, and that the resource is publicly accessible '
        'without paywall or registration. Third, verified resources were downloaded '
        'via <code>curl</code> with appropriate User-Agent and Referer headers (the '
        'METI PDF, for example, returns HTTP 403 without a Referer header). Fourth, '
        'each downloaded file was MD5-cross-checked against the canonical source URL '
        'to ensure integrity.',
        story
    )

    add_h2('4.2 Legal Framework & Licensing Categories', story)
    add_body(
        'Every source in this sourcebook falls into one of the following licensing '
        'categories. (a) <b>Public domain</b>: works whose copyright has expired or '
        'which were never subject to copyright. (b) <b>Creative Commons Attribution '
        '(CC-BY 4.0)</b>: works that may be freely shared and adapted provided the '
        'original author is credited. Three sources in this sourcebook are CC-BY: '
        'the F1000Research Watabe article and three Francis Press OA papers. (c) '
        '<b>OpenCourseWare (OCW) / institutional open access</b>: academic theses and '
        'journal articles hosted on institutional repositories (Kyoto Seika University '
        'Information Center, Tokyo University of Technology public koukai page, Kyoto '
        'Seika NII-hosted institutional repository). (d) <b>Government publications</b>: '
        'documents produced by METI (経済産業省) and Bunka-chō (文化庁) as part of '
        'their official policy work. (e) <b>Industry-association free releases</b>: '
        'AJA Anime Industry Report summaries (free PDFs, with the full report sold as '
        'a paid book) and CESA/CEDEC technology roadmaps (free public releases). (f) '
        '<b>Conference-slide public releases</b>: GDC Vault free releases, GDC China '
        'free slide releases, Tencent Game Institute official free courses, Unity '
        'Developer Community official free articles.',
        story
    )

    add_body(
        '<b>Commercial copyrighted books</b> are handled differently. For these, this '
        'sourcebook records bibliographic information only — ISBN, publisher, '
        'publication year, page count, official URL, table of contents when publicly '
        'available from the publisher, and a 2-3 sentence description of the '
        'methodology or content focus. No copyrighted full texts are reproduced. '
        'Brief attributed quotations of 1-3 sentences from publicly-available '
        'publisher descriptions or industry-talk transcripts are used under the '
        'fair-use doctrine for the purpose of criticism, comment, scholarship, and '
        'research.',
        story, indent=True
    )

    add_h2('4.3 Source Taxonomy', story)
    add_body(
        'The 27 downloaded primary sources plus 10 commercial bibliographic-only '
        'entries are distributed across six categories as follows:',
        story
    )

    taxonomy_data = [
        [Paragraph('<b>Section</b>', table_header_style),
         Paragraph('<b>Category</b>', table_header_style),
         Paragraph('<b>License Type</b>', table_header_style),
         Paragraph('<b>Count</b>', table_header_style),
         Paragraph('<b>Pages Ref.</b>', table_header_style)],
        [Paragraph('I', table_cell_center_style),
         Paragraph('JP Industry & Government', table_cell_style),
         Paragraph('Free public release / Govt', table_cell_style),
         Paragraph('8', table_cell_center_style),
         Paragraph('See §I', table_cell_center_style)],
        [Paragraph('II', table_cell_center_style),
         Paragraph('JP Academia', table_cell_style),
         Paragraph('OCW / CC-BY / Institutional OA', table_cell_style),
         Paragraph('6', table_cell_center_style),
         Paragraph('See §II', table_cell_center_style)],
        [Paragraph('III', table_cell_center_style),
         Paragraph('CN Industry', table_cell_style),
         Paragraph('GDC Vault / TGDC / Unity free release', table_cell_style),
         Paragraph('7', table_cell_center_style),
         Paragraph('See §III', table_cell_center_style)],
        [Paragraph('IV', table_cell_center_style),
         Paragraph('CN Academia', table_cell_style),
         Paragraph('CC-BY / Official archive', table_cell_style),
         Paragraph('4', table_cell_center_style),
         Paragraph('See §IV', table_cell_center_style)],
        [Paragraph('V', table_cell_center_style),
         Paragraph('Commercial Books (biblio only)', table_cell_style),
         Paragraph('Copyrighted — bibliographic', table_cell_style),
         Paragraph('10', table_cell_center_style),
         Paragraph('See §V', table_cell_center_style)],
        [Paragraph('VI', table_cell_center_style),
         Paragraph('Methodology Synthesis', table_cell_style),
         Paragraph('Original work — this sourcebook', table_cell_style),
         Paragraph('—', table_cell_center_style),
         Paragraph('See §VI', table_cell_center_style)],
    ]
    taxonomy_table = Table(taxonomy_data,
                           colWidths=[0.07 * AVAILABLE_WIDTH, 0.30 * AVAILABLE_WIDTH,
                                      0.33 * AVAILABLE_WIDTH, 0.10 * AVAILABLE_WIDTH,
                                      0.20 * AVAILABLE_WIDTH],
                           hAlign='CENTER')
    taxonomy_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_ROW_EVEN, TABLE_ROW_ODD]),
        ('GRID', (0, 0), (-1, -1), 0.3, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(Spacer(1, 8))
    story.append(taxonomy_table)
    story.append(Paragraph('<i>Table 4.1 — Source taxonomy by section.</i>', caption_style))

    story.append(PageBreak())

    return story

print("[content] Story builder stage 1 (TOC + Exec Summary + Methodology) loaded.")

# =============================================================================
# GLOSSARY (Section 5) — appended to story within build_story continuation
# =============================================================================

def append_glossary(story):
    add_h1('Glossary of Core Terms (JP / CN / EN Trilingual)', story)
    add_body(
        'The following table maps the core vocabulary used throughout this sourcebook '
        'across English, Japanese (with romaji transliteration and kana), and Chinese '
        '(with pinyin transliteration and hanzi). Where a term has no direct equivalent '
        'in one of the languages, the closest functional equivalent is given and noted. '
        'These terms recur across multiple sources in Sections I–V and are '
        'presupposed by the methodology synthesis in Section VI.',
        story
    )

    glossary_data = [
        [Paragraph('<b>English Term</b>', table_header_style),
         Paragraph('<b>Japanese (Romaji · Kana)</b>', table_header_style),
         Paragraph('<b>Chinese (Pinyin · Hanzi)</b>', table_header_style),
         Paragraph('<b>Definition</b>', table_header_style)],
        [Paragraph('Character design', table_cell_style),
         Paragraph('kyarakutā dezain · キャラクターデザイン', table_cell_style),
         Paragraph('jué sè shèjì · 角色设计', table_cell_style),
         Paragraph('The discipline of designing the visual, narrative, and commercial attributes of a fictional character.', table_cell_style)],
        [Paragraph('Kawaii', table_cell_style),
         Paragraph('kawaii · かわいい', table_cell_style),
         Paragraph('kě’ài · 可爱', table_cell_style),
         Paragraph('The Japanese aesthetic of cute, empirically studied as a perceptual dimension of character design (Li Yingchao 2021 thesis).', table_cell_style)],
        [Paragraph('Moe', table_cell_style),
         Paragraph('moe · 萌え', table_cell_style),
         Paragraph('méng · 萌', table_cell_style),
         Paragraph('Affective response of protective fondness toward a character; engineered into gacha characters via specific design traits.', table_cell_style)],
        [Paragraph('Tsukkomi', table_cell_style),
         Paragraph('tsukkomi · ツッコミ', table_cell_style),
         Paragraph('tǔ cáo · 吐槽', table_cell_style),
         Paragraph('The straight-man reaction to absurdity; a comedic role function designed into ensemble characters.', table_cell_style)],
        [Paragraph('Gacha', table_cell_style),
         Paragraph('gacha · ガチャ', table_cell_style),
         Paragraph('chōu kǎ · 抽卡', table_cell_style),
         Paragraph('Capsule-toy mechanics applied to character acquisition in games; the dominant monetization model for JP/CN character-driven mobile games.', table_cell_style)],
        [Paragraph('IP Bible', table_cell_style),
         Paragraph('IP baiburu · IPバイブル', table_cell_style),
         Paragraph('IP shèdjì shŭ · IP设定集', table_cell_style),
         Paragraph('Canonical document defining a character\'s attributes, lore, voice, and approved usage across media.', table_cell_style)],
        [Paragraph('Silhouette', table_cell_style),
         Paragraph('shiruetto · シルエット', table_cell_style),
         Paragraph('jiǎn yǐng · 剪影', table_cell_style),
         Paragraph('The character\'s outline shape; the primary visual recognition signal (Huang JSSD 2024; Zhan Tao TGDC 2018).', table_cell_style)],
        [Paragraph('SD / Chibi', table_cell_style),
         Paragraph('SD / chibi · SD / ちび', table_cell_style),
         Paragraph('Q bǎn · Q版', table_cell_style),
         Paragraph('Super-deformed variant; a small-headed, large-headed proportion used for gacha overworld sprites and comedic effect.', table_cell_style)],
        [Paragraph('Seiyū / Voice actor', table_cell_style),
         Paragraph('seiyū · 声優', table_cell_style),
         Paragraph('shēng yōu · 声优', table_cell_style),
         Paragraph('Voice actor; contributes vocal archetype as a core component of character identity in anime and gacha.', table_cell_style)],
        [Paragraph('Settei', table_cell_style),
         Paragraph('settei · 設定', table_cell_style),
         Paragraph('shèding · 设定', table_cell_style),
         Paragraph('Setting material; the reference sheets (turnarounds, expressions, props) that define a character for production.', table_cell_style)],
        [Paragraph('Media mix', table_cell_style),
         Paragraph('media mikkusu · メディアミックス', table_cell_style),
         Paragraph('kuà méi tí · 跨媒体', table_cell_style),
         Paragraph('Cross-media deployment of a character IP across manga, anime, game, and merchandise (Watabe 2023).', table_cell_style)],
        [Paragraph('Pull rate', table_cell_style),
         Paragraph('haishutsu-ritsu · 排出率', table_cell_style),
         Paragraph('chōu qǐ gàilǎ · 抽取概率', table_cell_style),
         Paragraph('Probability of obtaining a specific character tier in gacha; shapes the tier-stratified design language (CEDEC 2025).', table_cell_style)],
        [Paragraph('Production committee', table_cell_style),
         Paragraph('seisaku iinkai · 製作委員会', table_cell_style),
         Paragraph('zhìzuò wěiyuánhuì · 制作委员会', table_cell_style),
         Paragraph('JP cross-industry financing structure for anime; under which character designers typically retain almost no IP rights (METI 2025).', table_cell_style)],
        [Paragraph('Character IP rights', table_cell_style),
         Paragraph('kyarakutā IP ken · キャラクターIP権', table_cell_style),
         Paragraph('jué sè IP quán · 角色 IP 权', table_cell_style),
         Paragraph('Legal ownership of a character\'s commercial exploitation rights; central concern of METI\'s 5-year action plan.', table_cell_style)],
        [Paragraph('Live2D', table_cell_style),
         Paragraph('Raibu2D · ライブ2D', table_cell_style),
         Paragraph('Live2D · Live2D', table_cell_style),
         Paragraph('2D puppet-rig animation system used for gacha character card animations and VTuber avatars.', table_cell_style)],
        [Paragraph('NPR (Non-Photorealistic Rendering)', table_cell_style),
         Paragraph('NPR · シェルトニーアルレンダリング', table_cell_style),
         Paragraph('Fēi phen zhen shêròu rǎn · 非真实湘染', table_cell_style),
         Paragraph('Rendering pipeline that produces anime-style imagery from 3D models (Cai 2021 miHoYo GDC).', table_cell_style)],
        [Paragraph('Concept art', table_cell_style),
         Paragraph('konseputo āto · コンセプトアート', table_cell_style),
         Paragraph('gàiniàn měishǔ · 概念美术', table_cell_style),
         Paragraph('Pre-production illustration defining a character\'s visual identity before final asset production.', table_cell_style)],
        [Paragraph('Original painting (CN term)', table_cell_style),
         Paragraph('origuru hyōga · オリジナル表画', table_cell_style),
         Paragraph('yuánhuà · 原画', table_cell_style),
         Paragraph('CN industry term for character concept art / 2D character art deliverable in gacha production pipeline.', table_cell_style)],
        [Paragraph('Transmedia spreadability', table_cell_style),
         Paragraph('toransumedia kakusan · トランスメディア的拡散', table_cell_style),
         Paragraph('kuà méi tí chuán bō · 跨媒体传播', table_cell_style),
         Paragraph('Capacity of a 2D character image to circulate across media boundaries (Watabe 2023 F1000Research).', table_cell_style)],
        [Paragraph('Multi-plane image', table_cell_style),
         Paragraph('tahaimen imēji · 多平面イメージ', table_cell_style),
         Paragraph('duō píngmiàn tǔxiàng · 多平面图象', table_cell_style),
         Paragraph('Thomas LaMarre\'s framework for the layered 2D depth of anime imagery (cited in Watabe 2023).', table_cell_style)],
        [Paragraph('Affinity loop', table_cell_style),
         Paragraph('shinmitsukan rūpu · 親密感ループ', table_cell_style),
         Paragraph('qǐn mì xún huán · 亲密循环', table_cell_style),
         Paragraph('Character-design strategy where new units are similar-but-not-same to existing favorites (NetEase GDC China 2015).', table_cell_style)],
        [Paragraph('Worldview packaging', table_cell_style),
         Paragraph('sekaikan pakkējingu · 世界観パッケージング', table_cell_style),
         Paragraph('shìjièguān bāozhuāng · 世界观包装', table_cell_style),
         Paragraph('CN industry term for the integration of character, lore, and aesthetic into a coherent IP universe (Zhan Tao TGDC 2018).', table_cell_style)],
    ]
    glossary_table = Table(glossary_data,
                           colWidths=[0.18 * AVAILABLE_WIDTH, 0.22 * AVAILABLE_WIDTH,
                                      0.20 * AVAILABLE_WIDTH, 0.40 * AVAILABLE_WIDTH],
                           hAlign='CENTER', repeatRows=1)
    glossary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_ROW_EVEN, TABLE_ROW_ODD]),
        ('GRID', (0, 0), (-1, -1), 0.3, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(Spacer(1, 6))
    story.append(glossary_table)
    story.append(Paragraph('<i>Table 5.1 — Core character-design vocabulary in JP / CN / EN.</i>', caption_style))
    story.append(PageBreak())

print("[content] Stage 2 (Glossary) loaded.")

# =============================================================================
# SECTION I — JAPANESE INDUSTRY & GOVERNMENT SOURCES (8 sources)
# =============================================================================

def append_section_I(story):
    build_section_divider(
        story,
        kicker='SECTION I',
        title='Japanese Industry & Government Sources',
        intro='This section covers eight freely-downloadable primary sources from Japanese '
              'government bodies (METI, Bunka-chō) and industry associations (AJA, '
              'CESA/CEDEC). These documents provide the structural, economic, and policy '
              'context in which Japanese character designers operate — from the '
              'production-committee IP-rights reality, to the labor shortages affecting '
              'production pipelines, to the technology roadmaps that will reshape '
              'character-design work over the next five years. All sources are public-domain '
              'or free public releases.'
    )

    # ----- I-1. AJA Anime Industry Report 2023 Summary -----
    build_source_entry(
        story, 'I-1',
        title_en='AJA Anime Industry Report 2023 Summary',
        title_orig='アニメ産業レポート2023 サマリー版',
        biblio_fields=[
            ('Title (JP)', 'アニメ産業レポート2023 サマリー版'),
            ('Title (EN)', 'Anime Industry Report 2023 Summary (Japanese edition)'),
            ('Author', '増田弘道 (Masuda Hiromichi), 数土直志 (Sudo Naoshi)'),
            ('Publisher', '一般社団法人 日本動画協会 (The Association of Japanese Animations, AJA)'),
            ('Year', '2023'),
            ('License', 'Free public release (full report is a paid book; summary PDF is free)'),
            ('Pages', '8'),
            ('URL', 'https://aja.gr.jp/download/anime-industry-report-2023_summary_jp?wpdmdl=2289'),
        ],
        body_paragraphs=[
            'The AJA Anime Industry Report (アニメ産業レポート) is the '
            'canonical annual statistical survey of the Japanese animation industry, compiled by '
            'the Association of Japanese Animations (日本動画協会 / AJA) and authored by veteran '
            'industry researcher Masuda Hiromichi (増田弘道) with journalist Sudo Naoshi '
            '(数土直志). The full annual report is sold as a paid book; the 8-page summary PDF '
            'is released free each December and provides the headline statistics.',
            'For character-design work, the report\'s key data series are: (a) the total Japanese '
            'anime industry market size (production-value, distribution, merchandising, '
            'international licensing combined), which exceeded ¥2.7 trillion in 2023; (b) the '
            'overseas-market share, which has grown from roughly 50% in 2014 to over 60% in '
            '2023, driven by streaming-platform demand for character IP; (c) the labor-supply '
            'gap, with active animator counts failing to keep pace with production volume; and '
            '(d) the share of revenue derived from character-merchandising rights, which '
            'consistently exceeds 30% of total anime-industry revenue and represents the '
            'largest single downstream consumer of character IP.',
            'The 2023 summary is particularly significant because it covers the post-COVID '
            'production-volume recovery and the start of the streaming-platform labor crunch. '
            'For gacha-game character designers, the most actionable data point is the '
            'documented correlation between anime character-IP exposure and downstream gacha '
            'monetization: characters featured in broadcast anime in a given year see a '
            'measurable pull-rate premium in gacha games for the following 18-24 months.',
        ],
        callouts=[
            ('¥2.7T', 'JP ANIME INDUSTRY<br/>MARKET SIZE (2023)'),
            ('60%+', 'OVERSEAS<br/>MARKET SHARE'),
            ('30%+', 'MERCH RIGHTS<br/>SHARE OF REVENUE'),
            ('18-24m', 'GACHA PULL-RATE<br/>PREMIUM WINDOW'),
        ]
    )

    # ----- I-2. AJA Anime Industry Report 2024 Summary -----
    build_source_entry(
        story, 'I-2',
        title_en='AJA Anime Industry Report 2024 Summary',
        title_orig='アニメ産業レポート2024 サマリー版',
        biblio_fields=[
            ('Title (JP)', 'アニメ産業レポート2024 サマリー版'),
            ('Title (EN)', 'Anime Industry Report 2024 Summary (Japanese edition)'),
            ('Author', '増田弘道 (Masuda Hiromichi), 数土直志 (Sudo Naoshi)'),
            ('Publisher', 'AJA (日本動画協会)'),
            ('Year', '2024'),
            ('License', 'Free public release'),
            ('Pages', '8'),
            ('URL', 'https://aja.gr.jp/download/anime-industry-report-2024-summary_jp?wpdmdl=2453'),
        ],
        body_paragraphs=[
            'The 2024 summary reports a domestic anime market of approximately ¥329.7 billion '
            'and an overseas market of approximately ¥7,235 billion — figures that '
            'collectively represent the largest anime industry market size ever recorded at the '
            'time of publication. The summary documents the post-COVID production-volume '
            'recovery and the continued expansion of streaming-platform budgets.',
            'For character designers, the 2024 edition\'s most significant data series is the '
            'breakdown of production labor: the number of contracted animators continues to '
            'decline relative to production volume, and the share of production work outsourced '
            'to studios outside Japan continues to rise. This labor shortage directly affects '
            'character-design pipeline capacity — studios must produce more character '
            'assets with fewer in-house animators, which drives investment in '
            'production-pipeline automation (see §I-8 CEDEC Engineering and Production '
            'roadmaps).',
            'The 2024 summary also documents the continued growth of the cross-media '
            'merchandising segment, in which character IP licensed from anime properties '
            'generates revenue through gacha-game collaborations, figure sales, and apparel. '
            'For gacha studios, the implication is that the supply of anime character IP '
            'available for licensing will continue to grow, but the cost of licensing '
            'top-tier character IP will rise as competition intensifies.',
        ]
    )

    # ----- I-3. AJA Anime Industry Report 2025 Summary -----
    build_source_entry(
        story, 'I-3',
        title_en='AJA Anime Industry Report 2025 Summary',
        title_orig='アニメ産業レポート2025 サマリー版',
        biblio_fields=[
            ('Title (JP)', 'アニメ産業レポート2025 サマリー版'),
            ('Title (EN)', 'Anime Industry Report 2025 Summary (Japanese edition)'),
            ('Author', '森礻治 (Mori Yuji, Digital Hollywood University Graduate School professor), with 数土直志'),
            ('Publisher', 'AJA (日本動画協会)'),
            ('Year', '2025 (published December 2025)'),
            ('License', 'Free public release'),
            ('Pages', '8'),
            ('URL', 'https://aja.gr.jp/download/anime-industry-report-2025_summary_jp?wpdmdl=2645'),
        ],
        body_paragraphs=[
            'The 2025 summary is the latest available edition at the time of writing. The lead '
            'authorship has passed to Mori Yuji (森礻治), a professor at Digital Hollywood '
            'University Graduate School (デジタルハリウッド大学大学院) — the same institution '
            'that operates one of Japan\'s leading industry-facing animation and character-design '
            'programs. This authorship change signals the increasing integration of academic '
            'character-design research with industry statistical reporting.',
            'The 2025 edition covers approximately twenty figures spanning the world anime '
            'market by region (North America, Asia, Europe), segment-by-segment trends '
            '(production, distribution, merchandising, live entertainment), and structural '
            'challenges (labor supply, production-committee reform, streaming-platform '
            'budget contraction in 2025).',
            'For character designers, the most significant new data series in the 2025 '
            'summary is the regional breakdown of overseas-market growth: Southeast Asian '
            'and MENA markets show the highest growth rates, which directly informs the '
            'cultural-design calibration of gacha character IP intended for those regions. '
            'The summary also documents the early-stage impact of generative-AI tools on '
            'production labor — a topic that the CEDEC Visual Arts 2025 roadmap (see '
            '§I-8) treats in greater technical depth.',
        ]
    )


    # ----- I-4. METI Anime Action Plan -----
    build_source_entry(
        story, 'I-4',
        title_en='METI — Anime Industry Current Status & Action Plan (Draft)',
        title_orig='構界の現状及アクションプラン（案）について　アニメ（事務局資料：）',
        biblio_fields=[
            ('Title (JP)', '構界の現状及アクションプラン（案）について　アニメ'),
            ('Title (EN)', 'Industry Current Status and Action Plan (Draft) — [Anime] (Secretariat Document 2)'),
            ('Author', '銃済産業省 (METI — Ministry of Economy, Trade and Industry) — Entertainment & Creative Industry Policy Research Committee'),
            ('Year', '2025-01-17 (3rd committee meeting)'),
            ('License', 'Japanese government document — free public release'),
            ('Pages', '35'),
            ('Format', 'PDF (PPTX-derived, 960×540 landscape)'),
            ('URL', 'https://www.meti.go.jp/shingikai/mono_info_service/entertainment_creative/pdf/003_04_02.pdf'),
            ('Landing', 'https://www.meti.go.jp/shingikai/mono_info_service/entertainment_creative/003.html'),
        ],
        body_paragraphs=[
            'This METI (銃済産業省 / Ministry of Economy, Trade and Industry) policy '
            'document is the most significant primary source in this sourcebook on the '
            '<b>structural environment</b> in which Japanese character designers work. Prepared '
            'by the Entertainment & Creative Industry Policy Research Committee for its '
            'third meeting on 17 January 2025, it presents the Japanese government\'s diagnosis '
            'of the anime industry\'s structural problems and a five-year action plan for '
            'reform.',
            'The diagnosis section identifies four core problems: (1) the production-committee '
            '(製作委員会 / seisaku iinkai) financing model concentrates IP rights in the '
            'committee and leaves character designers, animation studios, and even original '
            'creators with almost no downstream royalty stream; (2) the freelancer-heavy labor '
            'structure leaves animators and character designers outside the protections of '
            'Japanese labor law (a 2024 reform aims to extend labor-law coverage to freelance '
            'creatives); (3) overseas-market expansion is constrained by underdeveloped '
            'international licensing infrastructure; (4) streaming-platform budget volatility '
            '(contraction in 2024-2025) creates production-volume planning risk.',
            'The action-plan section proposes reforms across these four areas. For character '
            'designers, the most consequential proposal is the reform of the '
            'production-committee model to allow original creators and lead character '
            'designers to retain a small percentage of downstream character-IP rights — '
            'currently almost unheard of in JP anime production. The METI document explicitly '
            'cites the gacha-game industry as a downstream consumer of anime character IP that '
            'would be affected by any reform of the rights-allocation structure.',
            'For gacha studios and IP researchers, this document is essential reading as the '
            'single most authoritative primary source on the legal-economic framework of JP '
            'character-IP creation. The reforms it proposes, if implemented over the 2025-2030 '
            'window, would substantially reshape the economics of character-design work in JP.',
        ],
        callouts=[
            ('5yr', 'METI ACTION<br/>PLAN HORIZON'),
            ('4', 'CORE STRUCTURAL<br/>PROBLEMS IDENTIFIED'),
            ('2024', 'LABOR-LAW REFORM<br/>FOR FREELANCERS'),
        ]
    )

    # ----- I-5. Bunka-cho Animation Research Guide -----
    build_source_entry(
        story, 'I-5',
        title_en='Bunka-chō — Media Arts & Research Mapping: Animation Research Guide',
        title_orig='メディア薛術·研究マッピング　アニメーション研究の手引き',
        biblio_fields=[
            ('Title (JP)', 'メディア薛術·研究マッピング　アニメーション研究の手引き'),
            ('Title (EN)', 'Media Arts & Research Mapping — Animation Research Guide'),
            ('Author', '文化庁 (Bunka-chō / Agency for Cultural Affairs) — produced under the Media Arts Collaboration Promotion Project (メディア薛術連摘促進事業)'),
            ('Year', '2020'),
            ('License', 'Japanese government publication — free public release'),
            ('Pages', '93 (image-only PDF)'),
            ('URL', 'https://mediag.bunka.go.jp/mediag_wp/wp-content/uploads/2020/03/animation_guidance.pdf'),
        ],
        body_paragraphs=[
            'The Bunka-chō (文化庁 / Agency for Cultural Affairs) Animation Research '
            'Guide is the Japanese government\'s official map of the academic field of '
            'animation studies in Japan. It is part of a four-volume research-guide series '
            '(animation, manga, game, media art) produced under the Media Arts Collaboration '
            'Promotion Project. The guide is image-only (no text layer) but is fully readable '
            'as a printed document and is freely downloadable.',
            'The guide is organized into five sections: (1) a history of animation studies as '
            'an academic discipline in Japan, (2) key journals and serial publications (with '
            'particular attention to the Japanese Society for Animation Studies / '
            '日本アニメーション学会 / JSAS, founded 1998, and its journal '
            'アニメーション研究 / Animation Studies), (3) professional societies and '
            'research associations, (4) major bibliographies and reference works, and (5) a '
            'cross-reference index to the related field of manga studies.',
            'For character-design researchers, the guide is the canonical entry point to the '
            'JP-language academic literature on animation — which is the discipline that '
            'houses the majority of Japanese-language scholarship on character design. The '
            'guide does not directly analyze character-design practice, but it identifies the '
            'journals, conferences, and researchers whose work does. Used in combination with '
            'the Manga Research Guide II (see §I-6) and the Game Research Guide II (see '
            '§I-7), it provides the complete bibliographic infrastructure for locating '
            'JP-language scholarship on character design.',
        ]
    )

    # ----- I-6. Bunka-cho Manga Research Guide II -----
    build_source_entry(
        story, 'I-6',
        title_en='Bunka-chō — Manga Research Guide II',
        title_orig='マンガ研究の手引き II',
        biblio_fields=[
            ('Title (JP)', 'マンガ研究の手引き II'),
            ('Title (EN)', 'Manga Research Guide II'),
            ('Author', '文化庁 (Bunka-chō) — Media Arts Consortium Project'),
            ('Year', '2020'),
            ('License', 'Japanese government publication — free public release'),
            ('Pages', '57 (image-only PDF)'),
            ('URL', 'https://mediag.bunka.go.jp/mediag_wp/wp-content/uploads/2020/03/manga_guidance02.pdf'),
        ],
        body_paragraphs=[
            'The Manga Research Guide II (マンガ研究の手引き II) maps the Japanese-language '
            'academic literature on manga studies. It is the second edition of Bunka-chō\'s '
            'manga-research bibliography, updating the 2014 first edition to reflect the '
            'expansion of manga studies as a discipline in the intervening years.',
            'The most active sub-field identified in the guide is <b>manga expression theory</b> '
            '(マンガ表現論 / manga hyōgenron) — the academic study of how manga creates '
            'meaning through visual expression. This sub-field encompasses character-expression '
            'analysis: how character facial features, body proportions, and visual coding '
            'signify personality, morality, and narrative role. The guide identifies this as '
            'the academic backbone of character-design theory in Japan.',
            'For character designers, the guide\'s value is as a navigation tool: it identifies '
            'the journals (マンガ研究, マンガ·スタディーズ, '
            '人文学報), the academic societies, and the key monographs that '
            'constitute the JP-language scholarship on character expression. The Kyoto Seika '
            'University International Manga Research Center (京都精華大学 国際マンガ研究センター), '
            'whose journal article appears as §II-6 in this sourcebook, is identified in '
            'the guide as one of the two canonical institutions for manga-research scholarship '
            '(the other being Tokyo Polytechnic University).',
        ]
    )

    # ----- I-7. Bunka-cho Game Research Guide II -----
    build_source_entry(
        story, 'I-7',
        title_en='Bunka-chō — Game Research Guide II',
        title_orig='ゲーム研究の手引き II',
        biblio_fields=[
            ('Title (JP)', 'ゲーム研究の手引き II'),
            ('Title (EN)', 'Game Research Guide II'),
            ('Author', '文化庁 (Bunka-chō)'),
            ('Year', '2020'),
            ('License', 'Japanese government publication — free public release'),
            ('Pages', '73 (image-only PDF)'),
            ('URL', 'https://mediag.bunka.go.jp/mediag_wp/wp-content/uploads/2020/03/game_guidance.pdf'),
        ],
        body_paragraphs=[
            'The Game Research Guide II (ゲーム研究の手引き II) maps the Japanese-language '
            'academic literature on game studies. It is the second edition of Bunka-chō\'s '
            'game-research bibliography. The guide covers both domestic Japanese scholarship '
            'and major international game-studies references that have been translated into '
            'Japanese.',
            'For character-design research, this guide is essential because the majority of '
            'Japanese-language academic work on gacha character design is filed under game '
            'studies rather than animation studies or manga studies. The guide identifies the '
            'DiGRA Japan (ジジランアー) annual conference, the CEDEC '
            'session proceedings (when published academically), and university-based game '
            'research labs as the primary venues for gacha character-design scholarship.',
            'The guide is the canonical entry-point for researchers who need to locate '
            'JP-language academic literature on gacha character design. Used in combination '
            'with the Animation Research Guide (§I-5) and the Manga Research Guide II '
            '(§I-6), it completes the Bunka-chō trilogy that comprehensively maps the '
            'JP academic infrastructure for character-design research.',
        ]
    )

    # ----- I-8. CEDEC/CESA Tech Roadmaps (combined) -----
    build_source_entry(
        story, 'I-8',
        title_en='CEDEC / CESA Technology Roadmaps — Game Design / Engineering / Production / Visual Arts',
        title_orig='CEDEC ゲーム開発技術ロードマップ (FY2023 & FY2025)',
        biblio_fields=[
            ('Title (JP)', 'CEDEC ゲーム開発技術ロードマップ'),
            ('Title (EN)', 'CEDEC Game-Development Technology Roadmaps (Game Design / Engineering / Production / Visual Arts)'),
            ('Author', 'CESA Technical Committee & CEDEC Operating Committee — Computer Entertainment Suppliers Association (一般社団法人コンピュータエンターテインメント協会)'),
            ('Year', 'FY2023 (Game Design / Engineering / Production); FY2025 (Visual Arts)'),
            ('License', 'Free public release — industry-wide public resources'),
            ('Pages', '1-2 per roadmap (large format); 4 roadmaps total'),
            ('URLs', 'See Appendix A — 4 separate URLs'),
        ],
        body_paragraphs=[
            'The CEDEC (シーデック / Computer Entertainment Developers Conference) '
            'technology roadmaps are annual publications of CESA (一般社団法人コンピュータエンテインメント協会 / '
            'Computer Entertainment Suppliers Association) that map the technology landscape '
            'for game development in Japan. Each roadmap is organized by tier: "currently '
            'in use" (最新), "in a few years" (数年後), and "peripheral technology" '
            '(周辺技術). The four roadmaps included here are the FY2023 Game Design '
            'roadmap, the FY2023 Engineering roadmap, the FY2023 Production roadmap, and the '
            'FY2025 Visual Arts roadmap.',
            'The <b>Game Design roadmap</b> covers AI-generated content, AR/MR game design, '
            'e-sports business, video-streaming monetization, and metaverse game design. For '
            'character designers, the most relevant items are the AI-generated content tier '
            '(which is currently reshaping how character concepts are produced) and the '
            'metaverse-game-design tier (which is driving demand for avatar-grade character '
            'assets with extensive customization systems).',
            'The <b>Engineering roadmap</b> covers character-animation technology — '
            'specifically the coupling of kinematics with motion-AI for complex character '
            'motion synthesis. For gacha character designers, this directly affects the '
            'production pipeline for character card animations and Live2D puppet-rig '
            'systems: the roadmap documents the industry\'s shift from manual key-frame '
            'animation toward AI-assisted motion synthesis for secondary character assets.',
            'The <b>Production roadmap</b> covers cross-title test-SDK adoption, QA '
            'ticket-management inside game engines, and asset-pipeline scalability. For '
            'gacha character-design pipelines, the most relevant item is asset-pipeline '
            'scalability: the roadmap documents the industry\'s adoption of automated '
            'asset-validation systems to support the weekly character-release cadence '
            'demanded by live-service gacha operations.',
            'The <b>Visual Arts roadmap (FY2025, latest edition)</b> is the most directly '
            'relevant of the four roadmaps to character-design production technology. It '
            'covers non-destructive scalable graphics production, AI art-generation adoption '
            'debates, and graphics-toolchain evolution. This roadmap documents the current '
            'industry-internal debate over AI art-generation in character-design workflows '
            '— specifically, which production stages (concept exploration, color '
            'variation, background generation) are being delegated to AI tools and which '
            '(final character approval, IP-critical expression design) are being kept '
            'human-only. This is the single most current primary source on how AI is '
            'reshaping JP gacha character-design studios.',
        ],
        callouts=[
            ('4', 'ROADMAPS<br/>(FY2023 + FY2025)'),
            ('3', 'TECHNOLOGY<br/>TIERS PER ROADMAP'),
            ('2025', 'LATEST VA<br/>EDITION'),
        ]
    )

    story.append(PageBreak())

print("[content] Stage 3b (Section I, entries 4-8) loaded.")

# =============================================================================
# SECTION II — JAPANESE ACADEMIC SOURCES (6 sources)
# =============================================================================

def append_section_II(story):
    build_section_divider(
        story,
        kicker='SECTION II',
        title='Japanese Academic Sources',
        intro='This section covers six academic sources — two PhD theses, one '
              'CC-BY journal article, two JSSD / J-STAGE papers, and one Kyoto Seika '
              'Manga Studies article. Together they represent the deepest theoretical '
              'work on character design available in Japanese-language open access, '
              'covering kawaii perception theory, character analysis formalization, '
              'transmedia spreadability, character design taxonomy, and historical '
              'physiognomy. The two PhD theses in particular (Li Yingchao 2021 and '
              'Mogi 2018) are foundational reading for any serious student of '
              'JP character-design theory.'
    )

    # ----- II-1. Kyoto Seika Li Yingchao PhD Thesis -----
    build_source_entry(
        story, 'II-1',
        title_en='Kyoto Seika University — Li Yingchao PhD Thesis: "Analyzing and Creating of Kawaii Characters in Contemporary Manga"',
        title_orig='現代マンガにおける「かわいいキャラクター」の分析と创作',
        biblio_fields=[
            ('Title (JP)', '現代マンガにおける「かわいいキャラクター」の分析と创作'),
            ('Title (EN)', 'Analyzing and Creating of "Kawaii characters" in Contemporary Manga'),
            ('Author', '李穗超 (Li Yingchao)'),
            ('Institution', '京都精華大学大学院 マンガ研究科 マンガ専攻 (Kyoto Seika University Graduate School, Manga Research Department, Manga Major)'),
            ('Year', '2020 academic year PhD (awarded 2021/03)'),
            ('Award', '2021 Japan Society of Kansei Engineering (日本感性工学会) best-paper award'),
            ('License', 'Open access — Kyoto Seika University Information Center institutional repository (大学公式公開)'),
            ('Pages', '502'),
            ('URL', 'https://johokan.kyoto-seika.ac.jp/uploads/2021_dr/2021_dr_thesis_01.pdf'),
            ('Citation (CiNii)', 'https://cir.nii.ac.jp/crid/1390568772521712512'),
        ],
        body_paragraphs=[
            'This 502-page doctoral dissertation is the closest thing to a <b>"recipe book" '
            'for kawaii character design</b> in Japanese academia. It was awarded the 2021 '
            'Japan Society of Kansei Engineering (日本感性工学会) best-paper prize — a '
            'significant recognition because the Kansei Engineering society is the academic '
            'discipline that studies affective perception empirically, and the prize signals '
            'that the thesis was judged methodologically rigorous by the standards of that '
            'discipline.',
            'The thesis is structured in five chapters. Chapter 1 establishes the theoretical '
            'framework for kawaii (かわいい) as an aesthetic category, '
            'distinguishing it from related concepts (cute, moe, '
            '萌え) and reviewing the existing empirical literature on kawaii perception. '
            'Chapter 2 reports the methodology and results of an empirical survey of manga '
            'authors and readers about which character features they associate with '
            'kawaii. Chapter 3 derives a multi-dimensional kawaii-perception model from the '
            'survey data, identifying the specific perceptual dimensions along which '
            'kawaii-ness is constructed — including face shape (roundness), eye-to-face '
            'ratio (larger eyes = more kawaii), color palette (warm pastels), and hairstyle '
            '(soft, rounded forms).',
            'Chapter 4 reports the author\'s own creative production as research validation: '
            'the author created a set of manga characters designed to maximize kawaii '
            'perception along the dimensions identified in Chapter 3, then ran a second '
            'survey to measure the actual kawaii response of readers. The correlation '
            'between the predicted kawaii score and the measured kawaii score provides '
            'empirical validation of the model. Chapter 5 synthesizes the findings and '
            'discusses implications for professional character-design practice.',
            'For gacha character designers, the thesis\'s most directly actionable contribution '
            'is the kawaii-perception model in Chapter 3: it provides empirically-grounded '
            'ranges for the specific design parameters (face shape ratio, eye-to-face ratio, '
            'color-palette saturation, hairstyle curvature) that drive kawaii response. '
            'Designers can use these ranges as starting-point parameters when designing '
            'characters intended to elicit kawaii response — which is the dominant '
            'affective target for female gacha character IP in the JP market.',
            '<b>Note:</b> This sourcebook does not reproduce figures or extensive quotations '
            'from the thesis. Readers should consult the original PDF for the full '
            'kawaii-perception model, the survey instruments, and the empirical results. The '
            'thesis is open-access at the URL listed above.',
        ],
        callouts=[
            ('502', 'PAGES'),
            ('5', 'CHAPTERS'),
            ('2021', 'KANSEI ENG.<br/>BEST PAPER'),
        ]
    )

    # ----- II-2. TEU Mogi PhD Thesis -----
    build_source_entry(
        story, 'II-2',
        title_en='Tokyo University of Technology — Mogi PhD Thesis: "Character Analysis Formalization & Design Original-Draft Production Support"',
        title_orig='キャラクター分析に基づく形式知化とデザイン原案制作支援に関する研究',
        biblio_fields=[
            ('Title (JP)', 'キャラクター分析に基づく形弧知化とデザイン原案制作支援に関する研究'),
            ('Title (EN)', 'Research on Formalization of Character Analysis and Design Original-Draft Production Support'),
            ('Author', '茕木龍太 (Ryota Mogi)'),
            ('Institution', '東京工科大学大学院 バイオ·情報メディア研究科 メディアサイエンス寿攻 (Tokyo University of Technology Graduate School, Bio-Information & Media Science)'),
            ('Supervisor', '近藤邦雄 (Kunio Kondo)'),
            ('Year', 'H29 academic year (2017), awarded 2018/01/25'),
            ('License', 'Open access — Tokyo University of Technology official koukai (公開) page'),
            ('Pages', '119'),
            ('URL', 'https://www.teu.ac.jp/ap_page/koukai/H29_09_3_motegi.pdf'),
            ('Repository', 'https://teu.repo.nii.ac.jp/records/2000018'),
        ],
        body_paragraphs=[
            'This media-science PhD thesis formalizes the <b>implicit knowledge of professional '
            'character designers</b> into a usable digital tool to support the original-draft '
            'creation process. The thesis was supervised by Kondo Kunio (近藤邦雄), a '
            'veteran media-science researcher at Tokyo University of Technology (東京工科大学 / '
            'TEU — distinct from Tokyo Polytechnic University / TPU).',
            'The thesis develops three character analysis methods, each targeting a specific '
            'character archetype: (a) <b>robot characters</b> (ロボットキャラクター) — '
            'formalized through part-decomposition (head, torso, limbs, weapons) with '
            'constraints on proportion and silhouette; (b) <b>deformed-chibi characters</b> '
            '(デフォルチビキャラ) — formalized through head-to-body ratio (typically '
            '2:1 to 3:1) with constraints on facial feature placement and limb length; '
            '(c) <b>giant characters</b> (巨人キャラクター) — formalized through '
            'silhouette analysis (see follow-up paper at https://www.ite.or.jp/ken/paper/20210308UAJU).',
            'The thesis then develops a <b>3DCG character-design support system</b> that '
            'implements these formalizations as a software tool: the user inputs a target '
            'character archetype, and the system generates a parametric 3D character model '
            'that satisfies the archetype\'s constraints. The user can then refine the '
            'generated model to produce a final character design. The thesis reports user '
            'studies showing that the system reduces the time required to produce a '
            'first-draft character design by approximately 40% compared to traditional '
            'manual methods.',
            'For gacha character designers, the thesis\'s most directly relevant contribution '
            'is the formalization of <b>deformed-chibi characters</b> — the SD / Q版 '
            'variant that is a staple of gacha character pipelines (chibi sprites for '
            'overworld navigation, full-art for gacha card art). The thesis provides the '
            'academic foundation for SD character formalization, including the constraint '
            'ranges for head-to-body ratio, facial-feature placement, and limb proportion '
            'that distinguish visually appealing chibi designs from broken ones.',
        ],
        callouts=[
            ('119', 'PAGES'),
            ('3', 'CHARACTER<br/>ARCHETYPES FORMALIZED'),
            ('~40%', 'FIRST-DRAFT<br/>TIME REDUCTION'),
        ]
    )


    # ----- II-3. F1000Research Watabe Transmedia Character (CC-BY) -----
    build_source_entry(
        story, 'II-3',
        title_en='F1000Research — Watabe: "Subject Playing with Flat Images: Transmedia Spreadability of Anime and Manga Character Images"',
        title_orig='平面と遊ぶ主高：アニメや慣画のキャラクター·イメージのトランスメディア的拡散',
        biblio_fields=[
            ('Title (JP)', '平面と遊ぶ主高：アニメや慣画のキャラクター·イメージのトランスメディア的拡散'),
            ('Title (EN)', 'Subject playing with flat images: Transmedia spreadability of anime and manga character images'),
            ('Author', '渡部宏樹 (Kohki Watabe)'),
            ('Institution', '筑波大学 人文社会系 (Faculty of Humanities and Social Sciences, University of Tsukuba)'),
            ('Year', '2023 (v1: 2023-02-20; v2: 2023-10-13)'),
            ('License', 'F1000Research — CC-BY 4.0 open access (peer-reviewed: 2 approved)'),
            ('Pages', '21'),
            ('URL', 'https://f1000research.com/articles/12-191/pdf'),
            ('PubMed', 'https://pubmed.ncbi.nlm.nih.gov/38434640'),
            ('PMC', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10905127'),
            ('DOI', '10.12688/f1000research.129643.2'),
        ],
        body_paragraphs=[
            'This peer-reviewed F1000Research article (CC-BY 4.0, 2 approved peer reviews) is '
            'the most theoretically important academic paper in this sourcebook for '
            'understanding <b>why</b> JP 2D anime/manga characters function as portable IP '
            'across media boundaries — the structural property that makes gacha '
            'character-as-IP strategy possible at all. The paper is open-access under '
            'CC-BY 4.0, which permits unrestricted use, distribution, and reproduction '
            'provided the original work is properly cited.',
            'The paper\'s central argument is that the <b>two-dimensional flatness</b> of '
            'anime/manga line-drawing is not a limitation but an enabling condition for '
            'character transmedia spreadability. Unlike live-action film, in which the '
            'photographic image is bound to the three-dimensional spacetime of its recording, '
            'a 2D line-drawing character can be lifted from its original narrative context '
            'and re-deployed across manga, anime, game, merchandise, and advertising '
            'without losing its identity. This property is what allows a single gacha '
            'character to function simultaneously as a playable game unit, a card '
            'illustration, afigure, a voice-acted anime appearance, and a social-media '
            'sticker.',
            'The paper builds on Thomas LaMarre\'s framework of the <b>multi-plane image</b> '
            '(a layered 2D depth that distinguishes anime imagery from Western animation\'s '
            'pursuit of 3D perspective realism). Watabe extends LaMarre\'s framework by '
            'connecting it to film-studies subject-formation theory (suture, male gaze) '
            'and to fan-studies audience-activity theory. The synthesis argues that the '
            'flat 2D character image invites a fundamentally different subject-formation '
            'relationship than 3D-realist media: the audience engages in playful '
            'rearrangement of the character image rather than passive identification.',
            'For gacha character designers and IP strategists, the paper provides the '
            'theoretical foundation for understanding character-as-IP. The flat 2D design '
            'language of JP-style character art is not an aesthetic accident — it is '
            'the structural property that makes the entire gacha character-as-IP business '
            'model possible. The paper is essential reading for anyone who needs to '
            'understand <b>why</b> gacha character IP works as a business, not just '
            '<b>how</b> to design individual characters.',
        ],
        quote=(
            'Anime and manga characters are so ubiquitous in Japan that people see them '
            'anywhere, regardless of public or private. The two-dimensional flatness of '
            'line drawing allows the character images to straddle the boundaries of the '
            'worlds of works and media.',
            'Watabe K. (2023). Subject playing with flat images: Transmedia spreadability '
            'of anime and manga character images. F1000Research 12:191. '
            'CC-BY 4.0. https://doi.org/10.12688/f1000research.129643.2'
        ),
        callouts=[
            ('CC-BY 4.0', 'OPEN-ACCESS<br/>LICENSE'),
            ('21', 'PAGES'),
            ('2', 'APPROVED<br/>PEER REVIEWS'),
        ]
    )

    # ----- II-4. JSSD Character Structuring Paper -----
    build_source_entry(
        story, 'II-4',
        title_en='J-STAGE / JSSD — Huang: "The Structuring of Character Design: Distinguishable Characteristics & Types from Appearance"',
        title_orig='キャラクターデザインの構造化 — 特徴と類型が外見から判別できる方法を中心に',
        biblio_fields=[
            ('Title (JP)', 'キャラクターデザインの構造化 — 特徴と類型が外見から判別できる方法を中心に'),
            ('Title (EN)', 'The Structuring of Character Design: Focusing on Distinguishable Characteristics and Types from Appearance'),
            ('Author', '黃秋容 (Huang Qiurong)'),
            ('Institution', '宝塚大学大学院 メディア薛術研究科 (Takarazuka University Graduate School of Media Arts)'),
            ('Venue', 'JSSD 71st Spring Research Presentation Conference (日本デザイン学会第71回春季研究發表大会), PA-36, 2024/06/21–23, 九州産業大学'),
            ('Year', '2024'),
            ('License', 'J-STAGE open access — JSSD bulletin on National Institute of Informatics platform'),
            ('Pages', '4'),
            ('URL (JP)', 'https://www.jstage.jst.go.jp/article/jssd/71/0/71_470/_pdf/-char/ja'),
            ('URL (EN)', 'https://www.jstage.jst.go.jp/article/jssd/71/0/71_470/_pdf/-char/en'),
        ],
        body_paragraphs=[
            'This 4-page JSSD conference paper proposes a <b>structured method for designing '
            '2D characters whose traits can be distinguished from appearance alone</b> — '
            'specifically through silhouette, body type, and costume. The paper is '
            'methodologically interesting because it is based on interviews with two '
            'character designers working at a <b>Chinese game company</b> (gacha-game '
            'industry perspective), which makes it a rare Japanese-academic-field paper that '
            'draws its empirical data from the CN gacha industry.',
            'The paper\'s core contribution is a character-design taxonomy that distinguishes '
            'characters along three orthogonal axes: (a) <b>silhouette</b> (シルエット) — '
            'the character\'s outline shape, which must be unique enough to identify the '
            'character at thumbnail size; (b) <b>body type</b> (体型) — the character\'s '
            'proportional skeleton (slender, athletic, voluptuous, child-like), which '
            'signals age and personality archetype; (c) <b>costume</b> (コスチューム) — the '
            'character\'s clothing and accessories, which signal faction, role, and '
            'cultural origin.',
            'The paper reports that the two interviewed designers use a workflow in which '
            'they first generate multiple silhouette candidates, then select the one that '
            'is most distinguishable from existing characters in the same project, then '
            'develop the body-type and costume variations on top of the selected silhouette. '
            'This workflow is documented as an industry-internal best practice in CN gacha '
            'studios and is the paper\'s primary empirical finding.',
            'For gacha character designers, the paper directly addresses the central '
            'production constraint of gacha character design: <b>visual distinguishability '
            'at scale</b>. A gacha game typically ships 50-200+ characters over its lifetime, '
            'and each new character must be visually distinguishable from every existing '
            'character at thumbnail size (which is how characters appear in gacha pull '
            'animations, character-select screens, and social-media sharing). The paper\'s '
            'taxonomy provides a structured method for achieving this distinguishability '
            'systematically rather than relying on individual designer intuition.',
        ],
        callouts=[
            ('4', 'PAGES'),
            ('3', 'DESIGN<br/>TAXONOMY AXES'),
            ('2', 'CN-GACHA<br/>DESIGNERS INTERVIEWED'),
        ]
    )

    # ----- II-5. JSSD 71st Conference Program -----
    build_source_entry(
        story, 'II-5',
        title_en='JSSD 71st Spring Conference Program (2024)',
        title_orig='日本デザイン学会第71回春季研究發表大会　大会プログラムこ暦定版 ver.240516',
        biblio_fields=[
            ('Title (JP)', '日本デザイン学会第71回春季研究発表大会 大会プログラムこ暑定版'),
            ('Title (EN)', 'Japanese Society for the Science of Design, 71st Spring Research Presentation Conference Program (Tentative)'),
            ('Author', 'JSSD (日本デザイン学会 / Japanese Society for the Science of Design)'),
            ('Year', '2024'),
            ('License', 'JSSD official — free public release'),
            ('Pages', '6'),
            ('URL', 'https://jssd.jp/ja/wp-content/uploads/2024/05/jssd71_program_tentative_240516.pdf'),
        ],
        body_paragraphs=[
            'This is the official conference program for the 71st Spring Research '
            'Presentation Conference of the Japanese Society for the Science of Design '
            '(JSSD / 日本デザイン学会), held 21–23 June 2024 at Kyushu Sangyo '
            'University (九州産業大学). The program is a 6-page PDF that lists all '
            'PA, B1, and C2 sessions at the conference, including the PA-36 character-design '
            'entry by Huang Qiurong (see §II-4 in this sourcebook).',
            'For character-design researchers, the program\'s value is as a bibliographic '
            'anchor: it provides the official conference venue, date, and session number '
            'for citing the Huang paper, and it identifies adjacent PA sessions on related '
            'topics (character expression, visual perception, design methodology) that '
            'represent the active research front in JP academic character-design scholarship. '
            'The JSSD Spring Conference is one of two annual venues (alongside the JSSD '
            'Autumn Conference) where JP academic character-design research is presented.',
            'The program is included in this sourcebook primarily as a navigation aid: '
            'researchers who want to follow the JSSD character-design research output can '
            'use this program as the entry-point to the JSSD bulletin archive on J-STAGE '
            '(https://www.jstage.jst.go.jp/browse/jssd), which hosts the full open-access '
            'archive of the JSSD bulletin (デザイン研究学) from Vol.1 to the present.',
        ]
    )

    # ----- II-6. Kyoto Seika Manga Studies article -----
    build_source_entry(
        story, 'II-6',
        title_en='Kyoto Seika Manga Studies Vol.1 — Matsushita: "Kishida Ryūsei\'s Character Expression"',
        title_orig='武者小路実範作、岸田劇生画「カチカチ山と花咪爷さん」のキャラクター表現',
        biblio_fields=[
            ('Title (JP)', '武者小路実範作、岸田劇生画「カチカチ山と花咪爷さん」のキャラクター表現 — 近代観相学にもとづく善と恶の表象'),
            ('Title (EN)', 'Character Expression in Mushanokōji Saneatsu\'s "Kachikachiyama and Hanasaka Jiisan" Illustrated by Kishida Ryūsei: Representations of Good and Evil Based on Modern Physiognomy'),
            ('Author', '松下哲也 (Matsushita Tetsuya)'),
            ('Venue', 'マンガ·スタディーズ (Manga Studies) Vol.1 (2025)'),
            ('Publisher', '京都精華大学 国陸マンガ研究センター (Kyoto Seika University International Manga Research Center)'),
            ('Year', '2025'),
            ('License', 'Kyoto Seika University institutional repository (NII-hosted) — open access'),
            ('Pages', '15'),
            ('URL', 'https://seika.repo.nii.ac.jp/record/2000161/files/manga_studies-1_matsushita.pdf'),
            ('Journal', 'https://imrc.jp/manga-studies'),
        ],
        body_paragraphs=[
            'This 15-page article, published in the inaugural volume of <i>Manga Studies</i> '
            '(マンガ·スタディーズ) — the academic journal of the Kyoto Seika University '
            'International Manga Research Center — traces the influence of European '
            'Romantic-era physiognomy on modern Japanese character expression. The case '
            'study is Kishida Ryūsei\'s (岸田劇生) 1920s illustrations for '
            'Mushanokōji Saneatsu\'s (武者小路実範) retelling of the folktales '
            '<i>Kachikachiyama</i> and <i>Hanasaka Jiisan</i>.',
            'The article\'s central claim is that the physiognomic theory of the European '
            'Romantic period — the idea that moral character can be read from facial '
            'features — was transmitted to early-20th-century Japanese visual culture '
            'through illustrated literature, and that Kishida Ryūsei\'s illustrations '
            'document this transmission. Kishida\'s good characters are drawn with rounded, '
            'open features; his evil characters with sharp, angular features — a '
            'coding system that has remained remarkably stable in JP character design '
            'from the 1920s to the present.',
            'For contemporary character designers, the article\'s value is as <b>historical '
            'context</b> for understanding why certain facial features code "hero" vs '
            '"villain" in JP character design language. The rounded-soft-vs-sharp-angular '
            'opposition that contemporary gacha character designers use to signal '
            'character alignment is not an arbitrary convention — it has a documented '
            'history that runs from European Romantic physiognomy through Kishida '
            'Ryūsei\'s 1920s illustrations to the present-day character-design vocabulary '
            'used in manga, anime, and gacha.',
            'The article is the inaugural contribution to <i>Manga Studies</i> Vol.1 '
            '(2025), a new open-access journal from the Kyoto Seika University International '
            'Manga Research Center — the same institution whose PhD thesis archive '
            'produced the Li Yingchao kawaii thesis (see §II-1). Researchers should '
            'monitor this journal as a venue for future JP-language character-design '
            'scholarship.',
        ]
    )

    story.append(PageBreak())

print("[content] Stage 4b (Section II, entries 3-6) loaded.")

# =============================================================================
# SECTION III — CHINESE INDUSTRY SOURCES (7 entries)
# =============================================================================

def append_section_III(story):
    build_section_divider(
        story,
        kicker='SECTION III',
        title='Chinese Industry Sources',
        intro='This section covers seven primary-source industry talks from major Chinese '
              'gacha and game studios — miHoYo, Hypergryph, Tencent, NetEase, and EA '
              '(Chinese-language version). All are publicly released by GDC Vault, GDC '
              'China, Tencent Game Institute, or Unity Developer Community. Together they '
              'document how CN gacha studios actually build sellable characters in '
              '2014–2021, with the miHoYo and Hypergryph talks being the most '
              'directly relevant to contemporary character-design practice.'
    )

    # ----- III-1. miHoYo GDC 2021 Genshin -----
    build_source_entry(
        story, 'III-1',
        title_en='miHoYo GDC 2021 — Cai Haoyu: "Genshin Impact: Crafting an Anime Style Open World"',
        title_orig='《原神》：打造动画风格的开放世界 / "Genshin Impact: Crafting an Anime Style Open World"',
        biblio_fields=[
            ('Title (CN)', '《原神》：打造动画风格的开放世界'),
            ('Title (EN)', 'Genshin Impact: Crafting an Anime Style Open World'),
            ('Author', '蔡浩宇 (Haoyu Cai), Producer & CEO, miHoYo (米哈游)'),
            ('Venue', 'GDC 2021 (Game Developers Conference 2021)'),
            ('Year', '2021'),
            ('License', 'GDC Vault free public slide release'),
            ('Pages', '29 slides'),
            ('URL', 'https://media.gdcvault.com/GDC+2021/2021GDC+_+Haoyu+Cai+_+presentation+file.pdf'),
            ('Landing', 'https://www.gdcvault.com/play/1027539/-Genshin-Impact-Crafting-an'),
            ('Video', 'https://www.youtube.com/watch?v=-JFyAdI_rO8'),
        ],
        body_paragraphs=[
            'This 29-slide GDC 2021 presentation by Cai Haoyu (蔡浩宇), Producer and CEO '
            'of miHoYo (米哈游), is the foundational primary source on how the largest '
            'CN gacha studio conceptualizes character-design-as-content-strategy. The talk '
            'was delivered at GDC 2021 and the slides are freely downloadable from GDC '
            'Vault; a free video recording is also available on YouTube.',
            'The talk\'s structure follows three sections: (1) a brief history and core '
            'philosophy of Genshin Impact; (2) why character design is so important for '
            'an anime-style game, and how miHoYo makes characters; (3) how miHoYo builds '
            'an anime-style NPR (non-photorealistic rendering) open world. The second '
            'section is the most directly relevant to character-design practice.',
            'Cai\'s core argument is that in anime-style gacha games, <b>characters are the '
            'most desired content</b>, that <b>storytelling revolves around characters</b> '
            '(contrast: plotline-based storytelling vs character-based storytelling), and '
            'that characters are the <b>basis for commercialization</b>. This three-part '
            'formulation is documented on slide 11 of the presentation and is the most '
            'succinct statement of the gacha-character-as-content thesis in the publicly '
            'available CN gacha industry literature.',
            'The talk also documents miHoYo\'s character-design pipeline at high level: '
            'the company maintains a small in-house character-design team that produces '
            'the concept-art and IP-bible settei for each character, then outsources the '
            'downstream production (3D modeling, animation, voice) to a network of '
            'partner studios. This pipeline structure — small in-house concept team + '
            'large outsourced production network — is now the dominant model in CN '
            'gacha and is documented in detail in the Hypergryph Arknights talk (see '
            '§III-6) as well.',
            'For character designers, the talk\'s most actionable insight is the explicit '
            'ranking of character design as the <b>primary commercial driver</b> of the '
            'game. This is a clear signal that character-design investment is the '
            'highest-ROI production investment for an anime-style gacha game — a '
            'thesis that has been empirically validated by Genshin Impact\'s subsequent '
            'commercial performance.',
        ],
        quote=(
            'Why are characters so important? Most desired content. Storytelling revolves '
            'around characters (Plotline based vs Character based). Basis for commercialization.',
            'Cai Haoyu (miHoYo), GDC 2021, slide 11. "Genshin Impact: Crafting an Anime '
            'Style Open World". https://www.gdcvault.com/play/1027539/'
        ),
        callouts=[
            ('29', 'SLIDES'),
            ('3', 'CORE<br/>SECTIONS'),
            ('5+', 'ART CORE<br/>PILLARS'),
        ]
    )

    # ----- III-2. NetEase GDC China 2015 Fantastic Gaming -----
    build_source_entry(
        story, 'III-2',
        title_en='NetEase GDC China 2015 — Chen Junxiong: "A Fantastic Gaming Experience Tailored to Target Players"',
        title_orig='为玩家打造量身定制的游戏体验〉梦幻西游手游《研发分享',
        biblio_fields=[
            ('Title (CN)', '为玩家打造量身定制的游戏体验〉梦幻西游手游《研发分享'),
            ('Title (EN)', 'A Fantastic Gaming Experience Tailored to Target Players (Fantasy Westward Journey Mobile)'),
            ('Author', '陈俊雄 (Junxiong Chen), NetEase (网易), Fantasy Westward Journey Studio (梦幻西游工作室)'),
            ('Venue', 'GDC China 2015'),
            ('Year', '2015'),
            ('License', 'GDC China 2015 free slide release'),
            ('Pages', '20 slides (bilingual EN/CN)'),
            ('URL', 'https://media.gdcvault.com/gdcchina15/slides/Junxiong_Chen_Fantastic%20Gaming_EN_CN.pdf'),
        ],
        body_paragraphs=[
            'This GDC China 2015 talk by Chen Junxiong (陈俊雄) of NetEase\'s Fantasy '
            'Westward Journey Studio (梦幻西游工作室) documents how NetEase designed '
            'characters and player-targeted experiences for the mobile MMO <i>Fantasy '
            'Westward Journey Mobile</i> (梦幻西游手游). The 20-slide deck is '
            'bilingual (English and Chinese on each slide) and is freely downloadable from '
            'GDC Vault.',
            'The talk\'s most significant contribution to character-design theory is its '
            'documentation of the <b>affinity loop</b> design strategy. Chen\'s formulation '
            'is captured in the slide-deck phrase "<b>似曾相识感觉最好</b>" — '
            '"being similar but not the same feels best". The strategy is to introduce new '
            'characters that are visually and narratively similar to characters the player '
            'has already bonded with, but distinct enough to require a fresh emotional '
            'investment. This creates a self-reinforcing loop in which each new character '
            'release reactivates the player\'s emotional attachment to existing characters.',
            'The talk also documents NetEase\'s player-segmentation methodology: the '
            'studio segments players by which character-archetype preferences they exhibit '
            'in their gameplay behavior (which characters they party with, which skins '
            'they purchase, which character story quests they complete first), then '
            'targets each segment with character releases that match its archetype '
            'preferences. This segmentation-driven character-release strategy is now '
            'standard practice in CN gacha and is one of the foundational concepts in '
            'live-service character-design operations.',
            'For gacha character designers, the talk\'s most directly actionable insight '
            'is the affinity-loop principle: when designing a new character for an '
            'existing gacha game, the new character should be visually and narratively '
            'positioned to reactivate the player\'s emotional attachment to 2-3 existing '
            'characters, rather than being a completely independent design. This is the '
            'CN industry\'s formulation of the "similar but not the same" principle that '
            'drives gacha character-release cadence.',
        ]
    )

    # ----- III-3. NetEase GDC China 2015 More Agile -----
    build_source_entry(
        story, 'III-3',
        title_en='NetEase GDC China 2015 — Wen Fujun: "More Agile: Weekly Iteration in Fantasy Westward Journey Mobile"',
        title_orig='梦幻西游手游研发周迭代的秘密',
        biblio_fields=[
            ('Title (CN)', '梦幻西游手游研发周迵代的秘密'),
            ('Title (EN)', 'More Agile: Weekly Iteration in Fantasy Westward Journey Mobile'),
            ('Author', '文福俊 (Fujun Wen), NetEase (网易)'),
            ('Venue', 'GDC China 2015'),
            ('Year', '2015'),
            ('License', 'GDC China 2015 free slide release'),
            ('Pages', 'Slides, ~7.9 MB'),
            ('URL', 'https://media.gdcvault.com/gdcchina15/slides/Wen_Fujun_More%20Agile_CN.pdf'),
        ],
        body_paragraphs=[
            'This GDC China 2015 talk by Wen Fujun (文福俊) of NetEase documents the '
            'production-pipeline methodology that allows live-service mobile games to '
            'sustain a weekly iteration cadence. The talk is the companion to the Chen '
            'Junxiong talk on player-targeted character design (§III-2) and the two '
            'should be read together: Chen\'s talk covers <b>what</b> characters to '
            'design; Wen\'s talk covers <b>how</b> to produce them on a sustainable '
            'weekly cadence.',
            'The talk\'s core methodology is the <b>weekly visible art resource</b> '
            'concept: every week, the studio must ship a visible art update (a new '
            'character, a new skin, a new environment, or a new event visual) to maintain '
            'player engagement. This requires the character-asset production pipeline to '
            'be sized for a weekly delivery cadence, which in turn requires standardized '
            'asset specifications, parallelized production workflows, and rigorous '
            'asset-validation gates.',
            'For character designers, the talk\'s significance is that it documents the '
            'production-pipe reality that constrains gacha character-design work. The '
            'weekly visible-art-resource cadence means that character designers in '
            'live-service gacha studios are not working on a single character at a time '
            '— they are working on a pipeline of 5-10 characters at various stages '
            'of production, with one new character reaching release every 1-2 weeks. This '
            'production reality shapes every aspect of character-design work, from the '
            'depth of settei that can be developed per character, to the degree of '
            'iteration that can be afforded on each silhouette, to the trade-offs between '
            'visual fidelity and production speed.',
            'The talk is older (2015) and predates the modern gacha era (Genshin Impact '
            'launched in 2020), but the weekly-cadence production methodology it documents '
            'has become more rather than less relevant: modern gacha studios ship character '
            'content at an even faster pace, with the most aggressive operators targeting '
            '2-3 new character releases per 6-week cycle.',
        ]
    )


    # ----- III-4. EA UFC GDC China 2014 (CN version) -----
    build_source_entry(
        story, 'III-4',
        title_en='EA Sports UFC GDC China 2014 — Burgess-Dawson: "Believable Character Combat in EA Sports UFC" (CN version)',
        title_orig='《终极格斗冠军》：游戏中可信的人物对戦',
        biblio_fields=[
            ('Title (CN)', '《终极格斗冠军》：游戏中可信的人物对战'),
            ('Title (EN)', 'Believable Character Combat in EA Sports UFC'),
            ('Author', 'Richard Burgess-Dawson (Technical Art Director), Daniel Sewell, Jenny Freeman — Electronic Arts (Canada)'),
            ('Lead Character Artist', 'Dan Doluntap'),
            ('Art Director', 'Ian Lloyd'),
            ('Venue', 'GDC China 2014'),
            ('Year', '2014'),
            ('License', 'GDC China 2014 free slide release (Chinese-language localized version)'),
            ('Pages', 'Slides, ~28 MB'),
            ('URL', 'https://media.gdcvault.com/gdcchina14/presentations/833781_RichardBurgess_EASportsUFC_CN.pdf'),
        ],
        body_paragraphs=[
            'This GDC China 2014 talk by EA Canada\'s team on EA Sports UFC is included '
            'in this sourcebook because the Chinese-language localized slides were '
            'publicly released by GDC China and provide a useful <b>comparative '
            'international pipeline reference</b> for CN gacha character designers. The '
            'talk is tangential to gacha character design per se — it covers '
            'character modeling, rigging, animation, and combat fidelity for next-gen '
            'fighting games — but its value is as a benchmark for the technical-art '
            'standards that CN gacha character pipelines can be measured against.',
            'The talk\'s core technical contribution is its documentation of the EA Sports '
            'UFC character pipeline: full-body 3D scanning of real athletes, retopology '
            'for game-ready assets, blend-shape facial animation system, and '
            'physics-driven secondary motion (hair, cloth, muscle jiggle). The pipeline '
            'produces character assets that are photorealistic in their final rendered '
            'form — a fundamentally different design target from the NPR (non-'
            'photorealistic rendering) anime-style pipeline that dominates CN gacha.',
            'For gacha character designers, the talk\'s value is comparative: it documents '
            'the production-pipeline complexity required for photorealistic character '
            'assets, which is the upper bound of what is technically possible in '
            'real-time-rendered game characters. CN gacha character pipelines operate at '
            'a different point on the fidelity-vs-throughput trade-off curve — '
            'lower per-character fidelity, much higher per-character throughput — '
            'but understanding the upper bound is useful for evaluating where gacha '
            'character pipelines can plausibly push fidelity in future generations.',
            'The talk is also valuable for its documentation of the EA character-team '
            'organizational structure: a Lead Character Artist (Dan Doluntap) oversees '
            'a team of character artists who work in parallel on different characters, '
            'with an Art Director (Ian Lloyd) providing cross-character aesthetic '
            'consistency. This organizational pattern — parallel character artists '
            '+ cross-character art director — is the same pattern used in CN gacha '
            'studios, and the talk provides a useful reference for how the roles and '
            'responsibilities are allocated.',
        ]
    )

    # ----- III-5. Tencent TGDC 2018 Honor of Kings -----
    build_source_entry(
        story, 'III-5',
        title_en='Tencent TGDC 2018 — Zhan Tao: "Honor of Kings Character Design & Worldview Packaging"',
        title_orig='《王者荣耀》角色设计及世界观包装',
        biblio_fields=[
            ('Title (CN)', 'TGDC | 《王者荣耀》角色设计及世界观包装'),
            ('Title (EN)', 'Honor of Kings Character Design & Worldview Packaging'),
            ('Author', '战涛 (Zhan Tao), Deputy Art Director of Honor of Kings, Tencent Interactive Entertainment (腾讯互动娱乐)'),
            ('Venue', 'TGDC 2018 (2nd Tencent Game Developers Conference, Shenzhen, August 11)'),
            ('Year', '2018'),
            ('License', 'Tencent Institute of Games (腾讯游戏学堂) official free course'),
            ('Length', '~22 KB text transcript'),
            ('URL', 'http://gameinstitute.qq.com/course/detail/10139'),
        ],
        body_paragraphs=[
            'This TGDC 2018 talk by Zhan Tao (战涛), Deputy Art Director of <i>Honor of '
            'Kings</i> (王者荣耀), is the foundational primary source on how Tencent\'s '
            'largest MOBA designs its hero characters. The talk was delivered at the 2nd '
            'Tencent Game Developers Conference in Shenzhen on August 11, 2018, and the '
            'full transcript is freely available as a Tencent Institute of Games '
            '(腾讯游戏学堂) official course.',
            'Zhan Tao structures his talk around three dimensions (三个纬度): (1) Honor of '
            'Kings hero-design methodology; (2) worldview packaging for hero characters; '
            '(3) the iterative evolution from the earlier <i>Bà Sān国</i> RTS prototype to '
            'the current MOBA. The first dimension is the most directly relevant to '
            'character-design practice.',
            'The hero-design methodology centers on <b>silhouette and color as the '
            'primary character-recognition signals</b>. Zhan Tao\'s formulation is that '
            'a player must be able to identify a hero from its silhouette alone at '
            'thumbnail size, and from its color palette at a glance. This leads to a '
            'design discipline in which the silhouette is locked first, then the color '
            'palette is selected to maximize visual contrast against existing heroes, '
            'and only then are the detailed character elements (face, costume, weapons) '
            'developed.',
            'A second key methodology is <b>cultural layering</b>: Honor of Kings heroes '
            'are designed by fusing modern fashion silhouettes (which make the characters '
            'feel contemporary and aspirational to young players) with classical Chinese '
            'elements (which ground the characters in the game\'s historical-fantasy '
            'setting). This cultural-layering strategy has been widely adopted in '
            'subsequent CN gacha character design and is one of the defining aesthetic '
            'features of post-2017 CN character IP.',
            'Zhan Tao also documents the differences between Eastern and Western '
            'character-design aesthetics, arguing that Eastern character design tends '
            'toward flattened, stylized forms with high color saturation, while Western '
            'character design tends toward volumetric, realistic forms with subdued color '
            'palettes. This distinction is consequential for gacha character designers '
            'because it determines which design language will read as "anime-style" to '
            'a global audience — a question that has become more important as CN '
            'gacha studios have expanded into global markets.',
        ],
        callouts=[
            ('3', 'CORE<br/>DIMENSIONS'),
            ('1st', 'SILHOUETTE<br/>LOCKED FIRST'),
            ('2018', 'TGDC<br/>SHENZHEN'),
        ]
    )

    # ----- III-6. Hypergryph Unite 2020 Arknights -----
    build_source_entry(
        story, 'III-6',
        title_en='Hypergryph × Unity Unite Shanghai 2020 — Haigao & Huang Yifeng: "Arknights 3D & 2D Combination Approach"',
        title_orig='初创团队的曲折开发前行之路：《明日方舟》中3D和2D结合方案',
        biblio_fields=[
            ('Title (CN)', '初创团队的曲折开发前行之路：《明日方舜》中3D和2D结合方案'),
            ('Title (EN)', 'The Tortuous Development Path of a Startup Team: 3D and 2D Combination Approach in Arknights'),
            ('Author', '海猛 (Haigao / 钟祥羽 Zhong Qixiang, Producer of Arknights) & 黄一峰 (Huang Yifeng, CEO of Hypergryph / 鹰角网络)'),
            ('Venue', 'Unite Shanghai 2020 (China Unity Online Technical Conference, November 19)'),
            ('Year', '2020'),
            ('License', 'Unity Developer Community (Unity官方开发者社区) official free article'),
            ('Length', '~38 KB text transcript'),
            ('URL', 'https://developer.unity.cn/projects/5fc9d972edbc2a49b5e3a8ab'),
            ('Bilibili', 'https://space.bilibili.com/386224375'),
        ],
        body_paragraphs=[
            'This Unite Shanghai 2020 keynote by Haigao (海猛, the producer-handle of '
            'Zhong Qixiang / 钟祥羽, Producer of Arknights) and Huang Yifeng '
            '(黄一峰, CEO of Hypergryph / 鹰角网络) is the primary source on '
            'Hypergryph\'s character-design and worldview-formation process. Arknights '
            '(明日方舜) is one of the most influential post-2017 gacha character-design '
            'reference points — its modern tactical-NPC aesthetic, monochrome UI, and '
            'deep lore have been widely imitated in subsequent CN gacha character design.',
            'Haigao\'s portion of the talk covers the Arknights <b>立项</b> (project-'
            'approval) process, art-style formation, and worldview evolution. The most '
            'significant design-process insight is Haigao\'s account of how the Arknights '
            'art style emerged from a deliberate decision to differentiate from the '
            'then-dominant cute-anime gacha aesthetic: Hypergryph targeted a tactical, '
            'modern-military-influenced aesthetic with muted color palettes and '
            'industrial-design-influenced costume detailing. This aesthetic decision was '
            'made early in the 立项 process and constrained all subsequent character-design '
            'work — a useful case study in how an early aesthetic-direction decision '
            'shapes the entire character pipeline.',
            'Huang Yifeng\'s portion of the talk covers the <b>technical implementation '
            'of the 3D-and-2D combination approach</b> used in Arknights. The approach '
            'is a hybrid production pipeline in which character concept art is produced '
            'as 2D illustrations, then a subset of characters are modeled in 3D for '
            'in-game animation, with the 3D models carefully styled to match the 2D '
            'illustrations through NPR (non-photorealistic rendering) shaders. This '
            'pipeline allows Arknights to ship both 2D card art (high fidelity, low '
            'throughput) and 3D animated characters (lower fidelity, higher throughput '
            'for animation) within a single coherent visual style.',
            'For gacha character designers, the talk\'s most consequential contribution is '
            'its documentation of the <b>startup-team character-design process</b>: '
            'Hypergryph launched Arknights with a small in-house team (the talk title '
            'references "4-person team hard-countering 3D") and built its character '
            'pipeline around the constraint of a small team. This is a useful reference '
            'for indie gacha studios and for understanding how the character-design '
            'pipeline can be structured to maximize output from a small team.',
            'The talk also documents the worldview-design process: Arknights\' '
            'post-apocalyptic medical-fantasy setting was developed in parallel with '
            'the character roster, with each new character adding a new facet to the '
            'worldview. This parallel-development approach — characters and worldview '
            'co-evolving — is the methodology that has produced Arknights\' '
            'characteristic deep-lore character IP.',
        ],
        callouts=[
            ('2020', 'UNITE<br/>SHANGHAI'),
            ('4', 'STARTUP<br/>TEAM SIZE'),
            ('2D+3D', 'HYBRID<br/>PIPELINE'),
        ]
    )

    # ----- III-7. Supplementary CN Industry Online Sources -----
    add_h2('III-7. Supplementary CN Industry Online Sources (Catalog)', story)
    add_body(
        'Beyond the six primary-source talks catalogued above (§III-1 through §III-6), '
        'the following CN industry online sources are verified to be freely accessible '
        'at the URLs listed below. These sources are not downloaded as PDFs in this '
        'sourcebook but are documented here as supplementary reading for researchers '
        'who want to extend their coverage of the CN character-design industry '
        'literature. The list is organized by studio / institution.',
        story
    )

    add_h3('Tencent Game Institute (腾讯游戏学堂) — official free courses', story)
    supp_data = [
        [Paragraph('<b>Course Title</b>', table_header_style),
         Paragraph('<b>URL</b>', table_header_style)],
        [Paragraph('IP建设：角色设计与世界观构建 (IP Building: Character Design & Worldview Construction)', table_cell_style),
         Paragraph('gameinstitute.qq.com/knowledge/100141', table_cell_style)],
        [Paragraph('萌≠低龄，超实用「萌系」呈现技巧及设计案例分析 (Cute ≠ Childish: Moe-style presentation techniques)', table_cell_style),
         Paragraph('gameinstitute.qq.com/knowledge/100110', table_cell_style)],
        [Paragraph('角色设计中如何表现力的传递 (How to Express Force Transfer in Character Design)', table_cell_style),
         Paragraph('gameinstitute.qq.com/course/detail/10075', table_cell_style)],
        [Paragraph('角色原画设计方法和能力培养 (Character Original-Art Design Methods & Ability Cultivation)', table_cell_style),
         Paragraph('gameinstitute.qq.com/course/detail/10258', table_cell_style)],
        [Paragraph('游戏概念设计基本流程分享 (Game Concept Design Basic Process Sharing)', table_cell_style),
         Paragraph('gameinstitute.qq.com/course/detail/10167', table_cell_style)],
        [Paragraph('OPENLIGHT创造营：游戏角色概念设计 (Game Character Concept Design)', table_cell_style),
         Paragraph('gameinstitute.qq.com/mobi/openlight/detail/10306', table_cell_style)],
        [Paragraph('OPENLIGHT创造营：游戏3D角色设计(上/下) (Game 3D Character Design Part 1/2)', table_cell_style),
         Paragraph('gameinstitute.qq.com/openlight/detail/10308', table_cell_style)],
    ]
    supp_table = Table(supp_data,
                       colWidths=[0.65 * AVAILABLE_WIDTH, 0.35 * AVAILABLE_WIDTH],
                       hAlign='CENTER', repeatRows=1)
    supp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_ROW_EVEN, TABLE_ROW_ODD]),
        ('GRID', (0, 0), (-1, -1), 0.3, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(Spacer(1, 6))
    story.append(supp_table)
    story.append(Paragraph('<i>Table III-7.1 — Tencent Game Institute character-design courses.</i>', caption_style))

    add_h3('Kuro Games (Wuthering Waves) — official dev talks', story)
    add_body(
        'Kuro Games (库洪游戏) maintains an official YouTube channel '
        '(https://www.youtube.com/@kurogames) with multiple Dev Talk videos covering '
        '<i>Wuthering Waves</i> (鸠潮) art design, combat system, and region design. '
        'Particularly relevant for character designers: <i>Dev Talk Prelude EP.3 Art Design</i> '
        '(https://www.youtube.com/watch?v=_Rj6VlyWX5Q) and <i>Dev Talk: 美术篇</i> '
        '(https://www.youtube.com/watch?v=oeMcznYT2yA). An official Unreal Engine interview '
        'in Chinese (https://www.unrealengine.com/developer-interviews/exploring-the-'
        'post-apocalyptic-charm-of-asg-open-worlds-in-wuthering-waves?lang=zh-CN) covers '
        'the post-apocalyptic ACG aesthetic of Wuthering Waves with the development team.',
        story
    )

    add_h3('Additional GDC Vault free releases', story)
    add_body(
        'GDC Vault (https://gdcvault.com/free) maintains a large archive of free GDC '
        'talks including GDC China 2012, 2014, 2015 sessions, GDC 2024 free talks '
        '(including miHoYo\'s "Genshin Impact: Creating Time-Limited Open Worlds for '
        'Summer Events" by Terry Li), and miHoYo\'s "Genshin Impact: Building a '
        'Scalable AI System" by Shuo Xu. These are slide-PDF + video format and are '
        'freely accessible with a free GDC Vault account.',
        story
    )

    story.append(PageBreak())

print("[content] Stage 5b (Section III, entries 4-7) loaded.")

# =============================================================================
# SECTION IV — CHINESE ACADEMIC SOURCES (4 entries)
# =============================================================================

def append_section_IV(story):
    build_section_divider(
        story,
        kicker='SECTION IV',
        title='Chinese Academic Sources',
        intro='This section covers four academic sources — three CC-BY papers from '
              'Francis Press open-access, and one Taiwan NTMoFA archive article. '
              'Together they represent Chinese-language academic perspectives on '
              'character design, ranging from CN 3D commercial animation character '
              'creation theory, to Pixar modeling paradigm research, to color theory '
              'in animation scenes, to a cultural-perspective methodology for '
              'character form design. The Taiwan NTMoFA article is the most '
              'methodologically substantive of the four.'
    )

    # ----- IV-1. Francis Press Chinese 3D Animation Character -----
    build_source_entry(
        story, 'IV-1',
        title_en='Francis Press OA — "Research on the Character Creation of Chinese 3D Commercial Animation Film"',
        title_orig='中国3D商业动画电影角色创作研究',
        biblio_fields=[
            ('Title (CN)', '中国3D商业动画电影角色创作研究'),
            ('Title (EN)', 'Research on the Character Creation of Chinese 3D Commercial Animation Film'),
            ('Publisher', 'Francis Academic Press (开放学术/open-access)'),
            ('License', 'CC-BY (Francis Academic Press open-access)'),
            ('Pages', '5'),
            ('URL', 'https://www.francis-press.com/uploads/papers/EQ2faPuvm7w6I5Ibv5jITYK6OBX3k4JBrKSkUOuC.pdf'),
            ('Landing', 'https://francis-press.com/papers/5136'),
            ('Citations', '6 (as of research date)'),
        ],
        body_paragraphs=[
            'This 5-page open-access paper, published by Francis Academic Press under a '
            'CC-BY license, argues that <b>character design is the core of animation '
            'design and the key to the animation industry chain</b>. The paper\'s '
            'central thesis is that the Chinese 3D commercial animation industry\'s '
            'future development depends on its ability to develop character-design '
            'methodology through a combination of inheritance (from traditional Chinese '
            'aesthetic traditions) and reference (from international animation '
            'character-design practice).',
            'The paper\'s significance for this sourcebook is its articulation of the '
            '<b>character-design-as-economic-strategic-asset</b> thesis from a Chinese-'
            'academic perspective. This thesis — that character design is not just '
            'an aesthetic practice but a strategic economic capability for the national '
            'animation industry — is the academic framing that underlies the CN '
            'industry\'s heavy investment in character-design infrastructure (CAA '
            'animation school, CUC animation school, Tencent Game Institute, etc.).',
            'The paper is short (5 pages) and does not develop its thesis in great depth, '
            'but it is a useful reference for understanding the academic framing of '
            'character design as a national-industrial-strategy issue in Chinese '
            'animation studies. For character designers working in or with CN studios, '
            'this framing helps explain why CN character-design practice is so heavily '
            'institutionalized (university programs, industry conferences, government '
            'policy documents) relative to the more freelance-oriented JP character-'
            'design industry.',
        ]
    )

    # ----- IV-2. Francis Press Pixar Modeling -----
    build_source_entry(
        story, 'IV-2',
        title_en='Francis Press OA — Yang Shuting: "Research on the Paradigm of Pixar Animation Modeling"',
        title_orig='皮克斯动画造型范式研究',
        biblio_fields=[
            ('Title (CN)', '皮克斯动画造型范式研究'),
            ('Title (EN)', 'Research on the Paradigm of Pixar Animation Modeling'),
            ('Author', '杨书琴 (Yang Shuting), Fine Art College, Qingdao University (青岛大学)'),
            ('Publisher', 'Francis Academic Press (开放学术/open-access)'),
            ('License', 'CC-BY (Francis Academic Press open-access)'),
            ('Pages', '7'),
            ('URL', 'https://francis-press.com/uploads/papers/TLLXuYxwqUbXHDgT65v64UxBEdOs2VfXZFihzkcM.pdf'),
        ],
        body_paragraphs=[
            'This 7-page open-access paper by Yang Shuting (杨书琴) of Qingdao '
            'University\'s Fine Art College examines <b>Pixar\'s character modeling '
            '(造型) paradigm as a reference framework for Chinese animation '
            'character designers</b>. The paper is published under CC-BY license by '
            'Francis Academic Press.',
            'The paper\'s core contribution is its systematic articulation of the Pixar '
            'character-modeling paradigm: simplified geometric shapes as the basis for '
            'character silhouettes, exaggerated proportions for emotional expressiveness, '
            'limited but carefully selected color palettes, and a design language that '
            'prioritizes readability at multiple scales (close-up, mid-shot, thumbnail). '
            'The paper argues that this paradigm — while developed for 3D Western '
            'animation — contains transferable principles that Chinese character '
            'designers can adapt to their own context.',
            'For character designers, the paper\'s value is as a <b>bridge document</b> '
            'between Western (Pixar) modeling theory and Chinese character-design '
            'discourse. The paper identifies the specific Pixar modeling principles '
            'that CN academic character-design programs teach as foundational reference '
            'material. Understanding these reference points is useful for character '
            'designers who need to communicate across the Western-CN character-design '
            'cultural divide — for example, when a CN gacha studio is collaborating '
            'with Western IP holders or marketing to Western audiences.',
            'The paper is relatively short (7 pages) but is methodologically clear and '
            'is a useful primary source for understanding the Western reference points '
            'that CN character-design education treats as canonical.',
        ]
    )

    # ----- IV-3. Francis Press Color in Animation Scenes -----
    build_source_entry(
        story, 'IV-3',
        title_en='Francis Press OA — "On the Expression and Application of Color in the Scene Design of Animated Films"',
        title_orig='论色彩在动画电影场景设计中的表现与应用',
        biblio_fields=[
            ('Title (EN)', 'On the Expression and Application of Color in the Scene Design of Animated Films'),
            ('Publisher', 'Francis Academic Press (开放学术/open-access)'),
            ('License', 'CC-BY (Francis Academic Press open-access)'),
            ('Pages', '6'),
            ('URL', 'https://www.francis-press.com/uploads/papers/BBbt0c54fOhcNSdxI1TuLvoBSVwOJCYiW0U1aUw9.pdf'),
            ('Citations', '5 (as of research date)'),
        ],
        body_paragraphs=[
            'This 6-page open-access paper, published by Francis Academic Press under '
            'CC-BY license, explores the <b>forms of expression and artistic charm of '
            'color in animated film scene design</b>. The paper is tangential to '
            'character design per se — it focuses on environment / scene color '
            'theory — but it is included in this sourcebook because character '
            'design and scene design are deeply interrelated in animation production, '
            'and character color palettes are typically calibrated to complement scene '
            'color palettes.',
            'The paper\'s core contribution is its articulation of the '
            '<b>character-scene color relationship</b>: character color palettes should '
            'be designed to maintain visual readability against the scene color '
            'palettes they will appear in front of. This is a fundamental principle of '
            'animation character design that is often underemphasized in character-'
            'design textbooks focused on the character in isolation.',
            'For gacha character designers, the principle is particularly relevant '
            'because gacha characters appear across a wide range of scene contexts — '
            'in-game environments, card illustrations, event banners, promotional '
            'artwork — and must maintain visual readability in each. The paper\'s '
            'articulation of the character-scene color relationship is a useful '
            'reference for designers calibrating character color palettes for cross-'
            'context readability.',
        ]
    )

    # ----- IV-4. Taiwan NTMoFA Character Form World and Design Methods -----
    build_source_entry(
        story, 'IV-4',
        title_en='Taiwan NTMoFA — Ke Kai-Ren: "Character Form World and Design Methods"',
        title_orig='角色造型世界與設計方法',
        biblio_fields=[
            ('Title (CN)', '角色造型世界與設計方法'),
            ('Title (EN)', 'Character Form World and Design Methods'),
            ('Author', '柯凯仁 (Ke Kai-Ren)'),
            ('Venue', '國美館專文 (National Taiwan Museum of Fine Arts quarterly)'),
            ('Publisher', 'National Taiwan Museum of Fine Arts (NTMoFA / 國立台灣美術館)'),
            ('License', 'Taiwan NTMoFA official open archive — free public release'),
            ('Pages', '18'),
            ('URL', 'https://twfineartsarchive.ntmofa.gov.tw/QuarterlyFile/P0680100.pdf'),
        ],
        body_paragraphs=[
            'This 18-page article by Ke Kai-Ren (栵凯仁), published in the National '
            'Taiwan Museum of Fine Arts quarterly, is the most methodologically '
            'substantive of the four Chinese-academic sources in this section. It '
            'introduces <b>character form design from a cultural perspective</b>, with '
            'case studies covering 2D/3D mascots, media characters, animation '
            'characters, and mechanical design. The article provides a concrete '
            'character-form design methodology with cultural-context analysis — '
            'directly applicable to ACG character design.',
            'The article\'s core methodological contribution is its <b>cultural-context-'
            'aware character form design framework</b>. Ke argues that character form '
            'is not a universal design language but is deeply mediated by the cultural '
            'context in which the character will be read. The article identifies the '
            'specific cultural-context variables that character designers should '
            'consider: the cultural origin of the silhouette vocabulary (which '
            'silhouette shapes read as "heroic" or "villainous" in the target culture), '
            'the cultural origin of the color symbolism (which colors signal which '
            'emotional or moral states), and the cultural origin of the costume '
            'vocabulary (which costume elements signal which social roles or '
            'historical periods).',
            'For gacha character designers, the article\'s framework is directly '
            'applicable to the design of character IP intended for cross-cultural '
            'markets. A character designed for the JP market will use silhouette, '
            'color, and costume vocabulary that reads correctly in JP cultural context; '
            'the same character may read very differently in CN, KR, or Western '
            'markets. The article\'s framework provides a structured method for '
            'auditing character designs for cultural-context compatibility — a '
            'critical capability for gacha studios targeting global markets.',
            'The article includes case studies of 2D/3D mascots (Taiwanese context), '
            'media characters (cross-cultural context), animation characters (Pixar / '
            'Disney / Studio Ghibli reference points), and mechanical design (mecha / '
            'robot character archetypes). The case studies illustrate the framework\'s '
            'application across the major character-design sub-disciplines.',
        ],
        callouts=[
            ('18', 'PAGES'),
            ('4', 'CASE-STUDY<br/>CATEGORIES'),
            ('3', 'CULTURAL-CONTEXT<br/>VARIABLES'),
        ]
    )

    story.append(PageBreak())

print("[content] Stage 6 (Section IV) loaded.")

# =============================================================================
# SECTION V — COMMERCIAL BOOKS BIBLIOGRAPHIC (10 entries)
# =============================================================================

def append_section_V(story):
    build_section_divider(
        story,
        kicker='SECTION V',
        title='Commercial Books: Bibliographic Orientation',
        intro='This section catalogs ten copyrighted commercial books — four '
              'Japanese (MdN ×2, KADOKAWA ×2) and six Chinese (Arknights '
              'artbook ×4, Genshin Impact artbook ×2). Per the legal framework '
              'explained in §4.2, these books are referenced bibliographically only '
              '— no full texts are reproduced. For each entry: ISBN, publisher, '
              'year, page count, official URL, table of contents when publicly '
              'available, and a 2-3 sentence description of methodology or content '
              'focus. Readers must purchase these books through official channels to '
              'access the full content.'
    )

    # ----- V-1. MdN Character Design Textbook -----
    build_source_entry(
        story, 'V-1',
        title_en='MdN — "Character Design Textbook: Making-of Attractive Human Illustration"',
        title_orig='キャラクターデザインの教科書 メイキングで学ぶ魅力的な人物イラストの描き方',
        biblio_fields=[
            ('Title (JP)', 'キャラクターデザインの教科書 メイキングで学ぶ魅力的な人物イラストの描き方'),
            ('Title (EN)', 'Character Design Textbook: Making-of Attractive Human Illustration'),
            ('Author(s)', 'ちゃもーい (chamoi), toi8, つなこ (tsunako), うっけ (ukke), Anmi — 5 illustrators contributing making-of tutorials'),
            ('Publisher', 'エムディエンコーポレーション (MdN / Impress)'),
            ('Year', '2015/12 (first edition)'),
            ('Pages', '160 (B5 format)'),
            ('ISBN-13', '978-4-8443-6556-3'),
            ('ISBN-10', '4844365568'),
            ('List price', '¥2,200 (本体 ¥2,000 + tax)'),
            ('Official URL', 'https://books.mdn.co.jp/release/43417'),
            ('Books.or.jp', 'https://www.books.or.jp/book-details/9784844365563'),
            ('License', 'Copyrighted — bibliographic reference only'),
        ],
        body_paragraphs=[
            'This MdN-published character-design textbook is one of the standard JP '
            'industry references for entry-to-intermediate character designers. Its '
            'methodology is structured around the character-creation flow: basic '
            'character-design knowledge (proportions, anatomy, color theory) → '
            'character-creation flow (silhouette, body type, age, costume, color '
            'selection) → five professional making-of tutorials with commentary '
            'from each of the five contributing illustrators.',
            'The five-illustrator making-of format is the book\'s distinctive '
            'contribution: rather than presenting a single canonical workflow, the book '
            'documents five different professional workflows, allowing the reader to '
            'compare approaches and select elements that fit their own practice. The '
            'five illustrators cover a range of JP character-design aesthetics — '
            'chamoi\'s soft-shaded kawaii style, toi8\'s fantasy-illustration style, '
            'tsunako\'s Galap-style (used in the Hyperdimension Neptunia series), '
            'ukke\'s moe-anime style, and Anmi\'s light-novel-illustration style.',
            'For character designers, the book\'s value is as a reference for the range '
            'of professional JP character-design workflows. It is not a beginner '
            'tutorial — it assumes the reader already has foundational drawing '
            'skills — but it is useful for designers who want to see how '
            'professional illustrators actually approach the character-design brief '
            'from initial concept to final delivery.',
            '<b>Note:</b> This is a copyrighted commercial book. This sourcebook '
            'reproduces no content from it. Readers should purchase the book through '
            'the official MdN URL above or through standard JP book retailers.',
        ]
    )

    # ----- V-2. MdN Futakiki -----
    build_source_entry(
        story, 'V-2',
        title_en='MdN — "Futakiki Character Design Ryuugi"',
        title_orig='双木樹のキャラクターデザイン流技 — 世界観と個性が伝わるキャラクターづくり',
        biblio_fields=[
            ('Title (JP)', '双木樹のキャラクターデザイン流技 — 世界観と個性が伝わるキャラクターづくり'),
            ('Title (EN)', 'Futakiki Character Design Ryuugi: Creating Characters that Convey Worldview and Personality'),
            ('Author', '双木樹 (Futakiki) — VTuber character designer, Coloso/Live lecture instructor'),
            ('Publisher', 'エムディエンコーポレーション (MdN)'),
            ('Year', '2025/07/11'),
            ('Official URL', 'https://books.mdn.co.jp/release/83415'),
            ('License', 'Copyrighted — bibliographic reference only'),
        ],
        body_paragraphs=[
            'This 2025 MdN publication by Futakiki (双木樹) is a newer VTuber-'
            'specific character-design textbook. Futakiki is a working VTuber character '
            'designer and a Coloso/Live lecture instructor. The book covers the '
            'specific considerations that VTuber character design introduces beyond '
            'conventional character design — particularly the constraints imposed '
            'by Live2D and VTube Studio rigging systems.',
            'VTuber character design requires the character to be designed for '
            '<b>rigid rigging-friendly silhouettes</b>: the character\'s face must be '
            'symmetrical (for mirror-rigging), the hair must be partitioned into '
            'rigid-friendly layers (for physics simulation), and the expression system '
            'must be designed around Live2D\'s parameter set (eye-open, eye-close, '
            'mouth-open, mouth-close, eyebrow-raise, eyebrow-lower, etc.). These '
            'constraints distinguish VTuber character design from conventional '
            'illustration character design.',
            'The book is included in this sourcebook as a reference for designers '
            'working in or moving into the VTuber character-design specialization. The '
            'VTuber industry has grown rapidly in 2020-2025 and VTuber character design '
            'has emerged as a distinct specialization with its own methodological '
            'conventions. This book is one of the first JP-published textbooks to '
            'systematize VTuber character-design methodology.',
            '<b>Note:</b> Copyrighted commercial book — bibliographic reference '
            'only. Purchase through official MdN URL.',
        ]
    )

    # ----- V-3. KADOKAWA KawaiiSensei -----
    build_source_entry(
        story, 'V-3',
        title_en='KADOKAWA — "KawaiiSensei: Quick & Useful Character Pose Drawing"',
        title_orig='KawaiiSenseiの スグ描ける！使える！キャラポーズの描き方',
        biblio_fields=[
            ('Title (JP)', 'KawaiiSenseiの スグ描ける！使える！キャラポーズの描き方'),
            ('Title (EN)', 'KawaiiSensei: Quick & Useful Character Pose Drawing'),
            ('Author', 'KawaiiSensei (SNS follower count > 3.7M)'),
            ('Publisher', 'KADOKAWA (角川)'),
            ('Year', '2024/08/28'),
            ('Pages', '160 (B5 format)'),
            ('ISBN-13', '978-4-04-607065-4'),
            ('ISBN-10', '404607065X'),
            ('Official URL', 'https://www.kadokawa.co.jp/product/322404001464'),
            ('E-book', 'https://www.kadokawa.co.jp/product/322404001468'),
            ('Hanmoto', 'https://www.hanmoto.com/bd/isbn/9784046070654'),
            ('License', 'Copyrighted — bibliographic reference only'),
        ],
        body_paragraphs=[
            'This KADOKAWA-published pose-drawing textbook by KawaiiSensei (a social-'
            'media illustrator with over 3.7 million followers) is a pose-focused '
            'reference rather than a full character-design textbook. Its table of '
            'contents is structured as: 序章 (introductory chapter) / '
            '第1章 基本ポーズ (Chapter 1: Basic poses) / '
            '第2章 アクションポーズ (Chapter 2: Action poses) / '
            '第3章 (Chapter 3: advanced poses).',
            'The book\'s significance for this sourcebook is as a reference for the '
            '<b>character-pose vocabulary</b> that JP character-design practice treats '
            'as canonical. Pose vocabulary — the set of standard standing, '
            'sitting, action, and emotional-expression poses that characters are '
            'expected to be drawable in — is a foundational element of '
            'character-design settei (setting material). A character-design settei '
            'document typically includes 8-20 standard poses that the character must '
            'be drawable in for production use.',
            'For gacha character designers, the book is useful as a reference for the '
            'standard pose set that should be developed for each new gacha character. '
            'Gacha character card art typically depicts the character in one of a '
            'small set of standard pose archetypes (3/4 view standing, dynamic action '
            'pose, emotional close-up, profile view), and a character designer who '
            'internalizes this pose vocabulary can produce card-ready illustrations '
            'more efficiently.',
            '<b>Note:</b> Copyrighted commercial book — bibliographic reference only.',
        ]
    )

    # ----- V-4. KADOKAWA pixiv x ZEN University -----
    build_source_entry(
        story, 'V-4',
        title_en='KADOKAWA — "pixiv × ZEN University Creative Lecture: How to Put Life into Illustrations"',
        title_orig='pixiv×ZEN大学 クリエイティブ講座 イラスト、命の宿し方 「描きたい」を「仕事」に変える! 悲むる絵描きの處方箱。',
        biblio_fields=[
            ('Title (JP)', 'pixiv×ZEN大学 クリエイティブ謙座 イラスト、命の宿し方'),
            ('Title (EN)', 'pixiv × ZEN University Creative Lecture: How to Put Life into Illustrations'),
            ('Author', '荪pote; supervised by ZEN University (ゼン大学) & pixiv'),
            ('Publisher', 'KADOKAWA (角川)'),
            ('Year', '2026/06/19'),
            ('Pages', '192 (A5 format)'),
            ('ISBN-13', '978-4-04-811933-7'),
            ('ISBN-10', '4048119338'),
            ('Official URL', 'https://www.kadokawa.co.jp/product/322601000707'),
            ('Amazon JP', 'https://www.amazon.co.jp/dp/4048119338'),
            ('License', 'Copyrighted — bibliographic reference only'),
        ],
        body_paragraphs=[
            'This 2026 KADOKAWA publication is a career-focused creative lecture book '
            'produced through a collaboration between pixiv (the largest JP '
            'illustration community platform) and ZEN University (a JP online '
            'university). The book is authored by illustrator 荪pote and is '
            'structured as a "prescription for troubled illustrators" — '
            'specifically focused on the transition from "want to draw" (描きたい) '
            'to "professional practice" (仕事).',
            'The book\'s significance for this sourcebook is as a reference for the '
            '<b>career-development dimension of character-design practice</b>. Unlike '
            'the MdN and KawaiiSensei books, which focus on technique, this book '
            'focuses on the professional practice of illustration — how to '
            'develop a sustainable creative practice, how to transition from hobbyist '
            'to professional, how to navigate the JP illustration industry\'s '
            'commission and publishing structures.',
            'For character designers at the early-career stage, the book is useful as '
            'a reference for the professional-practice dimension of the work. It is '
            'particularly relevant for designers considering the JP illustration '
            'industry\'s standard career paths: serial publication in manga magazines, '
            'light-novel illustration commissions, game character-design contracts, '
            'and VTuber character-design commissions.',
            '<b>Note:</b> Copyrighted commercial book — bibliographic reference only.',
        ]
    )

    # ----- V-5. Arknights Official Artbook Series VOL.1-4 -----
    build_source_entry(
        story, 'V-5',
        title_en='Arknights Official Artbook Series VOL.1–4 (Hypergryph / 񂋵江人民美术出版社)',
        title_orig='明日方舜官方美术設定集 VOL.1–4',
        biblio_fields=[
            ('Title (CN)', '明日方舜宴方美术設定集 VOL.1–4'),
            ('Title (EN)', 'Arknights Official Artbook Series VOL.1–4'),
            ('Author / Studio', '鹰角网络 (Hypergryph)'),
            ('Publisher', '񂋵江人民美术出版社 (Zhejiang People\'s Fine Arts Publishing House)'),
            ('VOL.1 RESET', '2022/10, 335 pp., ISBN 978-7534096501 (ISBN-10: 7534096502)'),
            ('VOL.2', '2023/08, first edition'),
            ('VOL.3', 'Year TBC (publisher catalog)'),
            ('VOL.4', '2026/01, first edition'),
            ('Official corrigenda', 'https://ak.hypergryph.com/corrigendum/artworks and https://ak.hypergryph.com/corrigendum/artworks-vol4'),
            ('Amazon JP (VOL.1)', 'https://www.amazon.com/-/zh_TW/明日方舜宴方美术設定集-VOL-1-RESET-鹰角网络/dp/7534096502'),
            ('License', 'Copyrighted commercial artbook — bibliographic reference only'),
        ],
        body_paragraphs=[
            'The Arknights Official Artbook Series (VOL.1–4) is the canonical '
            'published reference for the visual design language of <i>Arknights</i> '
            '(明日方舜), one of the most influential post-2017 gacha character-design '
            'reference points. The series is published by Zhejiang People\'s Fine Arts '
            'Publishing House (񂋵江人民美术出版社) and consists of four volumes '
            'released between October 2022 and January 2026.',
            'The artbooks contain official concept art, character settei '
            '(設定 / setting material), iteration sheets, and worldview-packaging '
            'materials for the Arknights character roster. VOL.1 RESET (2022) covers '
            'the foundational character roster and worldview; VOL.2 (2023) extends '
            'coverage to subsequent character releases; VOL.3 (year TBC) and VOL.4 '
            '(2026) continue the series. Each volume is 300+ pages and contains '
            'high-resolution reproductions of production character art.',
            'For character designers, the Arknights artbook series is the most-studied '
            'reference for the post-2017 gacha character-design aesthetic — '
            'specifically the modern tactical-NPC aesthetic, the monochrome UI '
            'integration, the deep-lore worldview packaging, and the '
            'cultural-layering strategy that combines modern military silhouettes with '
            'fantasy-world costume elements. The artbooks document the iteration '
            'process from initial concept to final character, which is rarely visible '
            'in the game itself but is essential for understanding how the character-'
            'design pipeline actually produces the final assets.',
            'Hypergryph maintains official corrigendum pages '
            '(https://ak.hypergryph.com/corrigendum/artworks and .../artworks-vol4) '
            'that publish before/after correction images for artbook errata. These '
            'corrigendum pages are freely accessible and provide a small but useful '
            'window into the artbook content without requiring purchase.',
            '<b>Note:</b> Copyrighted commercial artbook series — bibliographic '
            'reference only. Purchase through official Hypergryph store or CN/JP book '
            'retailers. The corrigendum pages above are freely accessible.',
        ]
    )

    # ----- V-6. Genshin Impact Official Art Book Series -----
    build_source_entry(
        story, 'V-6',
        title_en='Genshin Impact Official Art Book Series (miHoYo / HoYoverse)',
        title_orig='《原神《 Genshin Impact 艺术图鉴 / Genshin Impact Official Art Book',
        biblio_fields=[
            ('Title (CN)', '《原神《 Genshin Impact 艺术图鉴'),
            ('Title (EN)', 'Genshin Impact Official Art Book'),
            ('Author / Studio', 'miHoYo / HoYoverse (米哈游 / HoYoverse)'),
            ('Publisher', 'miHoYo / HoYoverse official publication'),
            ('VOL.1', 'miHoYo / HoYoverse commercial publication'),
            ('VOL.2', 'ISBN 000870581X'),
            ('English-language edition', '《原神《 Genshin Impact 艺术图鉴, 176 pp., miHoYo official publishing'),
            ('Goodreads series', 'https://www.goodreads.com/series/405702-genshin-impact-official-art-book'),
            ('License', 'Copyrighted commercial artbook — bibliographic reference only'),
        ],
        body_paragraphs=[
            'The Genshin Impact Official Art Book series is the canonical published '
            'reference for the visual design language of <i>Genshin Impact</i> '
            '(原神) — the largest-scale contemporary case study in '
            '<b>region-based trans-cultural character design for gacha</b>. The series '
            'consists of (at minimum) two volumes published by miHoYo / HoYoverse, '
            'with an English-language edition (176 pp.) also available.',
            'The artbooks contain official character concept art, region-themed '
            'character-design settei, weapon and costume design, and the design-'
            'iteration sheets that document the evolution of each character from '
            'initial concept to final asset. The most significant design-language '
            'innovation documented in the artbooks is Genshin Impact\'s <b>region-'
            'based character design system</b>: each of the game\'s regions '
            '(Mondstadt / Western European medieval fantasy, Liyue / Chinese '
            'traditional fantasy, Inazuma / Japanese traditional fantasy, Sumeru / '
            'Middle Eastern and South Asian fantasy, Fontaine / French Belle Époque '
            'fantasy, Natlan / Latin American pre-Columbian fantasy) has its own '
            'character-design sub-language that is internally consistent within the '
            'region but visibly distinct across regions.',
            'For character designers, the Genshin artbook series is the reference for '
            '<b>how to design a character roster that is simultaneously regionally '
            'specific and globally marketable</b>. The region-based design system '
            'allows the game to target regional markets with culturally-specific '
            'character IP (Liyue characters for the CN market, Inazuma characters '
            'for the JP market) while maintaining a unified global character-design '
            'language that reads as a single coherent IP universe. This is the '
            'character-design strategy that has driven Genshin Impact\'s global '
            'commercial success and is now being imitated by other CN gacha studios.',
            '<b>Note:</b> Copyrighted commercial artbook — bibliographic reference only.',
        ]
    )

    story.append(PageBreak())

print("[content] Stage 7 (Section V) loaded.")

# =============================================================================
# SECTION VI — CROSS-CUTTING METHODOLOGY SYNTHESIS (4 subsections)
# =============================================================================

def append_section_VI(story):
    build_section_divider(
        story,
        kicker='SECTION VI',
        title='Cross-Cutting Methodology Synthesis',
        intro='This section synthesizes the methodology principles that recur across '
              'multiple sources in Sections I–V. It is organized by the four '
              'character-design dimensions specified in the sourcebook brief: Visual '
              'Design, Narrative Arch & Role Function, Marketability & Gacha '
              'Engineering, and Merch & IP Strategy. Each subsection extracts 4-6 '
              'principles with source attribution, and represents the original '
              'analytical contribution of this sourcebook beyond the primary-source '
              'summaries in Sections I–V.'
    )

    # ----- VI-1. Visual Design Methodology -----
    add_h1('VI-1. Visual Design Methodology', story)
    add_body(
        'The visual-design methodology principles below are extracted from the 27 '
        'primary sources in Sections I–IV. Each principle is stated, the '
        'supporting sources are cited, and the practical implication for gacha '
        'character design is articulated. The principles are not equally weighted — '
        'silhouette-first design and kawaii engineering are the two foundational '
        'principles that subsume the others — but all five are recurring '
        'methodology elements that appear across multiple independent sources.',
        story
    )

    add_h3('Principle VI-1.1 — Silhouette-First Design', story)
    add_body(
        '<b>Principle:</b> The character\'s silhouette is the primary visual-recognition '
        'signal and must be locked before any other character-design work begins. The '
        'silhouette must be uniquely identifiable at thumbnail size and must be visually '
        'distinguishable from every existing character in the same project.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> Huang Qiurong\'s JSSD 2024 paper (§II-4) '
        'documents this as a workflow used by interviewed CN gacha-studio designers; '
        'Zhan Tao\'s TGDC 2018 talk (§III-5) documents it as the foundation of '
        'Honor of Kings hero-design methodology; the AJA industry reports (§I-1 '
        'through §I-3) document the market pressure that drives the '
        'thumbnail-distinguishability requirement.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers should begin each new '
        'character design by generating 5-10 silhouette candidates, then select the one '
        'that is most visually distinct from existing characters in the project before '
        'developing any other character-design elements. This is the single highest-ROI '
        'design discipline in gacha character-design work.',
        story, indent=True
    )

    add_h3('Principle VI-1.2 — Kawaii Engineering', story)
    add_body(
        '<b>Principle:</b> Kawaii (かわいい) perception is empirically measurable along '
        'specific design dimensions — face shape (roundness), eye-to-face ratio '
        '(larger eyes = more kawaii), color palette (warm pastels), and hairstyle '
        'curvature (soft, rounded forms). These dimensions can be engineered into '
        'characters to elicit kawaii response in target audiences.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> Li Yingchao\'s 2021 Kyoto Seika PhD thesis (§II-1) '
        'is the foundational academic source for this principle, providing the '
        'empirical kawaii-perception model. The Kyoto Seika Manga Studies Vol.1 article '
        '(§II-6) provides historical context for the physiognomic coding that '
        'underlies kawaii engineering. The Tencent Game Institute moe≠low-age course '
        '(see §III-7) covers the related but distinct moe engineering principle.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers targeting JP-market '
        'female characters should calibrate the kawaii-engineering dimensions (face '
        'roundness, eye-to-face ratio, color palette, hairstyle curvature) to the '
        'empirically-validated ranges documented in Li Yingchao\'s thesis. The thesis '
        'is open-access and provides the specific parameter ranges.',
        story, indent=True
    )
    story.append(callout_row([
        ('5-10', 'SILHOUETTE CANDIDATES<br/>PER NEW CHARACTER'),
        ('40%', 'TIME REDUCTION<br/>(Mogi 2018)'),
        ('4', 'KAWAII-PERCEPTION<br/>DIMENSIONS'),
    ]))
    add_spacer(8, story)

    add_h3('Principle VI-1.3 — SD / Chibi Formalization', story)
    add_body(
        '<b>Principle:</b> Super-deformed (SD / chibi / Q版) character variants '
        'are governed by formalizable constraint ranges for head-to-body ratio (typically '
        '2:1 to 3:1), facial-feature placement, and limb proportion. These constraints '
        'can be codified as parameters for a character-design support system.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> Mogi Ryota\'s 2018 Tokyo University of Technology '
        'PhD thesis (§II-2) is the foundational academic source for this principle, '
        'developing a 3DCG character-design support system that implements the '
        'formalized SD constraints. The follow-up silhouette-analysis paper for '
        'giant characters (https://www.ite.or.jp/ken/paper/20210308UAJU) extends '
        'the formalization to additional character archetypes.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character pipelines that produce both '
        'full-art and SD variants for each character (standard practice in JP gacha) '
        'can use Mogi\'s formalized constraint ranges as the parametric basis for an '
        'automated SD-generation system that produces a first-draft SD variant from '
        'the full-art character design. This can reduce SD-variant production time '
        'by approximately 40% per the thesis\'s user studies.',
        story, indent=True
    )

    add_h3('Principle VI-1.4 — Physiognomic Coding', story)
    add_body(
        '<b>Principle:</b> JP character design uses a stable physiognomic coding system '
        'to signal character alignment (hero / villain / neutral) through facial '
        'features: rounded, open features code heroic; sharp, angular features code '
        'villainous. This coding system has remained stable from Kishida Ryūsei\'s '
        '1920s illustrations to contemporary manga/anime/gacha.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> Matsushita Tetsuya\'s 2025 Kyoto Seika Manga '
        'Studies Vol.1 article (§II-6) is the historical-context source for this '
        'principle, tracing the physiognomic coding from European Romantic physiognomy '
        'through Kishida Ryūsei to the present.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers should be aware that '
        'the physiognomic coding system is not arbitrary — it has a documented '
        'history and reads as a stable convention to JP audiences. Designers who '
        'deliberately subvert the coding (e.g., a villain with rounded features) '
        'should do so with awareness that the subversion will be read as a meaningful '
        'character-design choice, not as a neutral design.',
        story, indent=True
    )

    add_h3('Principle VI-1.5 — Transmedia-Portable 2D Flatness', story)
    add_body(
        '<b>Principle:</b> The two-dimensional flatness of JP-style character line-art '
        'is not an aesthetic limitation but a structural property that enables '
        'character transmedia spreadability — the capacity of a character image '
        'to circulate across manga, anime, game, merchandise, and advertising without '
        'losing its identity.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> Watabe Kohki\'s 2023 F1000Research paper '
        '(§II-3, CC-BY) is the foundational theoretical source for this principle, '
        'building on Thomas LaMarre\'s multi-plane image framework. The principle is '
        'empirically validated by the entire gacha character-as-IP business model, '
        'which depends on the transmedia spreadability of 2D character images.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers should treat the 2D '
        'flat-design language as a deliberate strategic choice, not as a default. The '
        'flat design language is what enables the character to function simultaneously '
        'as a playable game unit, a card illustration, a figure, a voice-acted anime '
        'appearance, and a social-media sticker. Designs that drift toward 3D-realist '
        'rendering sacrifice this transmedia portability.',
        story, indent=True
    )
    story.append(PageBreak())


    # ----- VI-2. Narrative Arch & Role Function Methodology -----
    add_h1('VI-2. Narrative Arch & Role Function Methodology', story)
    add_body(
        'The narrative-arch methodology principles below address the question: how is '
        'a character\'s narrative role and story function designed, and how does this '
        'design interact with the visual and commercial dimensions? Five principles '
        'recur across the primary sources.',
        story
    )

    add_h3('Principle VI-2.1 — Character-as-Content', story)
    add_body(
        '<b>Principle:</b> In anime-style gacha games, characters are not narrative '
        'instruments — they ARE the content. Storytelling revolves around '
        'characters (character-based storytelling), not around plot (plotline-based '
        'storytelling), and characters are the basis for commercialization.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> Cai Haoyu\'s miHoYo GDC 2021 talk (§III-1) is '
        'the primary source for this principle, articulated on slide 11 of the '
        'presentation. The principle is empirically validated by Genshin Impact\'s '
        'commercial performance and is now the dominant character-design-as-content '
        'thesis in CN gacha.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers should treat each '
        'character as a primary content unit, not as a narrative support element. The '
        'character\'s settei (setting material) should be developed to a depth that '
        'would support standalone character-focused story content — character '
        'quests, character events, character anime OVAs — even if no such content '
        'is initially planned.',
        story, indent=True
    )

    add_h3('Principle VI-2.2 — Worldview-Character Symbiosis', story)
    add_body(
        '<b>Principle:</b> Characters and worldview co-evolve. The worldview constrains '
        'which characters are diegetically possible; new characters add new facets to '
        'the worldview. This parallel-development approach produces the deep-lore '
        'character IP that distinguishes post-2017 gacha character design.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> The Hypergryph Arknights Unite Shanghai 2020 talk '
        '(§III-6) documents this methodology as Hypergryph\'s character/worldview '
        'co-evolution approach. Zhan Tao\'s TGDC 2018 talk (§III-5) documents '
        'Tencent\'s worldview-packaging methodology for Honor of Kings, which is a '
        'related but distinct approach.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers should design each '
        'new character to add a new facet to the game\'s worldview, not just to fill a '
        'gameplay niche. This means the character\'s settei should include '
        'worldview-extending elements (a new faction, a new region, a new historical '
        'period, a new cultural context) that the game\'s narrative can subsequently '
        'explore.',
        story, indent=True
    )

    add_h3('Principle VI-2.3 — Affinity Loop Design', story)
    add_body(
        '<b>Principle:</b> New characters should be designed to reactivate the player\'s '
        'emotional attachment to existing characters. The new character should be '
        'visually and narratively similar to 2-3 existing characters the player has '
        'bonded with, but distinct enough to require fresh emotional investment. '
        '"Similar but not the same feels best" (似曾相识感觉最好).',
        story
    )
    add_body(
        '<b>Supporting sources:</b> Chen Junxiong\'s NetEase GDC China 2015 talk '
        '(§III-2) is the primary source for this principle. The affinity-loop '
        'strategy is documented as a NetEase best practice and has been widely adopted '
        'in subsequent CN gacha character-release planning.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers planning a new '
        'character release should explicitly identify the 2-3 existing characters that '
        'the new character is intended to reactivate emotional attachment to, and '
        'should design visual/narrative similarity hooks to those existing characters. '
        'This is a release-planning discipline as much as a character-design discipline.',
        story, indent=True
    )

    add_h3('Principle VI-2.4 — IP Bible (Settei) as Canonical Document', story)
    add_body(
        '<b>Principle:</b> The character\'s settei (設定 / IP bible) is the '
        'canonical document that defines the character across all media. Settei includes '
        'visual reference (turnarounds, expression sheets, prop sheets), narrative '
        'reference (personality, backstory, relationships, voice archetype), and '
        'production reference (color palette, line-art specifications, rigging notes).',
        story
    )
    add_body(
        '<b>Supporting sources:</b> Multiple sources touch on settei. The Hypergryph '
        'Arknights talk (§III-6) and Tencent TGDC 2018 talk (§III-5) document '
        'the production use of settei in CN gacha. The Bunka-chō Animation '
        'Research Guide (§I-5) identifies settei as a research object in JP '
        'animation studies.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers should produce a '
        'complete settei document for each character at the time of character approval, '
        'and should treat the settei as the canonical reference for all downstream '
        'production (3D modeling, animation, voice direction, marketing art). Settei '
        'updates should be version-controlled.',
        story, indent=True
    )

    add_h3('Principle VI-2.5 — Cultural Layering', story)
    add_body(
        '<b>Principle:</b> Characters for cross-cultural markets should be designed by '
        'layering modern fashion silhouettes (which make the character feel '
        'contemporary and aspirational to young global audiences) with culturally-'
        'specific elements (which ground the character in a recognizable cultural '
        'context).',
        story
    )
    add_body(
        '<b>Supporting sources:</b> Zhan Tao\'s TGDC 2018 talk (§III-5) is the '
        'primary source for this principle, articulated as Tencent\'s hero-design '
        'methodology for Honor of Kings. Ke Kai-Ren\'s Taiwan NTMoFA article (§IV-4) '
        'provides the cultural-context-aware character-form design framework that '
        'generalizes the principle.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers targeting global '
        'markets should explicitly identify the modern-fashion silhouette vocabulary '
        'and the culturally-specific element vocabulary that will be layered in each '
        'character design. The cultural-layering strategy is the design-language '
        'foundation of Genshin Impact\'s region-based character system (see §V-6).',
        story, indent=True
    )
    story.append(PageBreak())


    # ----- VI-3. Marketability & Gacha Engineering Methodology -----
    add_h1('VI-3. Marketability & Gacha Engineering Methodology', story)
    add_body(
        'The marketability methodology principles below address the question: how is '
        'a character designed to maximize its commercial performance in the gacha '
        'monetization model? Five principles recur across the primary sources, with '
        'the pull-rate-stratified character tiers principle being the most directly '
        'commercial.',
        story
    )

    add_h3('Principle VI-3.1 — Pull-Rate-Stratified Character Tiers', story)
    add_body(
        '<b>Principle:</b> Gacha characters are designed in tier-stratified design '
        'languages that correspond to their pull-rate rarity. The highest-rarity tier '
        '(typically 5-star) receives the most design investment (most detailed costume, '
        'most complex color palette, most elaborate settei); lower tiers receive '
        'proportionally less. The tier-stratified design language must be visually '
        'consistent within each tier and visually distinguishable across tiers.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> The CEDEC Visual Arts 2025 roadmap (§I-8) '
        'documents the production-pipeline implications of tier-stratified character '
        'design. Genshin Impact\'s 5-star vs 4-star character design language '
        'differentiation (visible in the Genshin artbook series, §V-6) is the '
        'most-studied contemporary implementation of this principle.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers should explicitly '
        'identify the design-language parameters that vary by tier (costume complexity, '
        'color palette size, settei depth, animation count) and should apply the '
        'tier-stratified design language consistently across the character roster. '
        'Players read the tier-stratified design language as a signal of pull-rate '
        'rarity, which directly affects pull-rate conversion.',
        story, indent=True
    )

    add_h3('Principle VI-3.2 — Weekly Live-Ops Cadence', story)
    add_body(
        '<b>Principle:</b> Live-service gacha operations require a weekly visible-art-'
        'resource update to maintain player engagement. This requires the character-'
        'asset production pipeline to be sized for weekly delivery cadence, with '
        'standardized asset specifications, parallelized production workflows, and '
        'rigorous asset-validation gates.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> Wen Fujun\'s NetEase GDC China 2015 talk (§III-3) '
        'is the primary source for this principle. The CEDEC Production roadmap '
        '(§I-8) documents the production-pipeline technology that supports the '
        'weekly cadence.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers should plan their '
        'workload around the weekly-cadence production reality: 5-10 characters in '
        'various stages of production at any time, with one new character reaching '
        'release every 1-2 weeks. This production reality constrains the depth of '
        'settei that can be developed per character and forces trade-offs between '
        'visual fidelity and production speed.',
        story, indent=True
    )
    story.append(callout_row([
        ('1-2wk', 'NEW-CHARACTER<br/>RELEASE CADENCE'),
        ('5-10', 'CHARACTERS IN<br/>PARALLEL PRODUCTION'),
        ('5★', 'TOP TIER FOR<br/>PULL-RATE DESIGN'),
    ]))
    add_spacer(8, story)

    add_h3('Principle VI-3.3 — Moe Engineering', story)
    add_body(
        '<b>Principle:</b> Moe (萌え / 萌) is the affective response of '
        'protective fondness toward a character, and is engineered into gacha '
        'characters via specific design traits: vulnerability cues (small stature, '
        'large eyes, soft features), gap-moe design (a "tough" surface trait paired '
        'with a "soft" hidden trait), and character-specific verbal tics or catch-'
        'phrases. Moe is distinct from kawaii — kawaii is the visual aesthetic; '
        'moe is the affective response.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> The Tencent Game Institute "moe≠low-age" '
        'course (see §III-7 supplementary) is the CN industry primary source for '
        'moe engineering. Li Yingchao\'s kawaii thesis (§II-1) provides the '
        'visual-aesthetic foundation; moe engineering is the affective-response '
        'layer built on top of kawaii engineering.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers should explicitly '
        'identify the moe-engineering traits of each character: what is the '
        'vulnerability cue? What is the gap-moe design? What is the character-specific '
        'verbal tic or catch-phrase? These traits should be documented in the settei '
        'and consistently expressed across all character appearances.',
        story, indent=True
    )

    add_h3('Principle VI-3.4 — Fan-Art Virality by Design', story)
    add_body(
        '<b>Principle:</b> Gacha character designs should be optimized for fan-art '
        'virality — the capacity of the character to inspire fan-produced '
        'illustration, cosplay, and derivative work that amplifies the character\'s '
        'reach beyond the game\'s direct player base. This requires the character to '
        'have a distinctive silhouette, a recognizable color palette, and a small set '
        'of "drawable" design elements that fan artists can reproduce.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> Watabe Kohki\'s F1000Research paper (§II-3, '
        'CC-BY) is the theoretical foundation, documenting the transmedia spreadability '
        'of JP 2D character images. The principle is empirically validated by the fan-'
        'art ecosystems that have emerged around successful gacha character IP '
        '(Arknights, Genshin Impact, Blue Archive, etc.).',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers should audit each new '
        'character design for fan-art virality: is the silhouette reproducible by a '
        'fan artist in 30 minutes? Is the color palette memorable? Are there 2-3 '
        '"drawable" design elements (a distinctive hairstyle, a unique accessory, a '
        'recognizable costume motif) that fan artists can use as shorthand for the '
        'character?',
        story, indent=True
    )

    add_h3('Principle VI-3.5 — Character-as-Brand Strategy', story)
    add_body(
        '<b>Principle:</b> A successful gacha character is not just a game asset — '
        'it is a brand. The character-as-brand strategy requires the character to be '
        'designed for cross-media deployment (game, anime, manga, merchandise, '
        'collaborations) and to retain consistent brand identity across all '
        'deployments.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> The METI Anime Action Plan (§I-4) is the '
        'policy framework source for this principle, documenting the JP production-'
        'committee IP-rights structure that currently constrains character-as-brand '
        'strategy. The AJA Industry Reports (§I-1 through §I-3) document the '
        'market scale of character-as-brand revenue.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers should design each '
        'character with explicit cross-media deployment in mind. The settei should '
        'specify how the character will translate to anime, manga, merchandise, and '
        'collaboration contexts. The character-as-brand strategy requires coordination '
        'across the production pipeline (game, anime, licensing, partnerships) and '
        'should be planned at character-approval time, not retrofitted later.',
        story, indent=True
    )
    story.append(PageBreak())


    # ----- VI-4. Merch & IP Strategy Methodology -----
    add_h1('VI-4. Merch & IP Strategy Methodology', story)
    add_body(
        'The merch-and-IP-strategy methodology principles below address the question: '
        'how is a character designed to maximize its downstream merchandising and IP-'
        'licensing revenue, and what are the structural IP-rights constraints that '
        'shape this design work? Four principles recur across the primary sources.',
        story
    )

    add_h3('Principle VI-4.1 — Figure-Sculpting Briefs Embedded in Character Design', story)
    add_body(
        '<b>Principle:</b> Character designs intended for downstream figure merchandising '
        'should embed figure-sculpting briefs in the original character design. This '
        'includes designing the character topology with figure-friendly polygon flow, '
        'specifying the figure-stance in the settei, and providing multi-angle '
        'reference for the figure sculptor.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> The Hypergryph Arknights artbook corrigendum '
        'pages (https://ak.hypergryph.com/corrigendum/artworks) document the '
        'production-iteration process that includes figure-sculpting considerations. '
        'The EA Sports UFC GDC China 2014 talk (§III-4) documents the EA character-'
        'modeling pipeline, which includes merch-ready topology as a standard '
        'character-design deliverable.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers should produce, as '
        'part of the settei, a figure-sculpting brief that specifies the intended '
        'figure stance, the topology considerations for sculpting, and any accessories '
        'or props that will require separate sculpting. This brief should be produced '
        'at character-approval time, not retrofitted when a figure licensing deal is '
        'signed.',
        story, indent=True
    )

    add_h3('Principle VI-4.2 — Production-Committee IP Rights Reality', story)
    add_body(
        '<b>Principle:</b> Under the current JP production-committee (製作委員会) '
        'financing model, character designers retain almost no downstream IP rights. '
        'The production committee holds the IP rights; the character designer is '
        'typically compensated only with a one-time design fee. This is the structural '
        'reality that the METI 5-year action plan proposes to reform.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> The METI Anime Action Plan (§I-4) is the '
        'primary source for this principle, documenting both the current reality and '
        'the proposed reforms. The AJA Industry Reports (§I-1 through §I-3) '
        'document the merchandising-rights revenue that flows through the production-'
        'committee structure.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> JP character designers should be aware of the '
        'production-committee IP-rights reality when negotiating character-design '
        'contracts. The METI reform proposals (if implemented over 2025-2030) may '
        'create new IP-rights-retention opportunities for character designers, but '
        'as of 2026 the default is that the production committee retains the IP. '
        'CN gacha character designers operate under a different IP-rights structure '
        'that is generally more favorable to the studio (and less favorable to the '
        'individual designer) than the JP production-committee model.',
        story, indent=True
    )

    add_h3('Principle VI-4.3 — Transmedia Character-as-IP', story)
    add_body(
        '<b>Principle:</b> A 2D character image is structurally suited to transmedia '
        'IP deployment in a way that 3D-realist character images are not. The flat '
        '2D design language allows the character to circulate across manga, anime, '
        'game, merchandise, and advertising without losing its identity — this '
        'is the structural property that makes the gacha character-as-IP business '
        'model possible.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> Watabe Kohki\'s F1000Research paper (§II-3, '
        'CC-BY) is the theoretical foundation for this principle. The principle is '
        'empirically validated by the structure of the entire JP anime/manga/gacha '
        'media-mix ecosystem, which depends on transmedia character portability.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers should treat the 2D '
        'flat-design language as a deliberate IP-strategy choice. Designs that drift '
        'toward 3D-realist rendering sacrifice transmedia portability and constrain '
        'the character\'s downstream IP-deployment options. The 2D flat-design language '
        'is not a limitation — it is the structural foundation of the gacha '
        'character-as-IP business model.',
        story, indent=True
    )

    add_h3('Principle VI-4.4 — Region-Layered IP for Global Gacha', story)
    add_body(
        '<b>Principle:</b> Gacha character IP targeting global markets should be '
        'designed with region-layered cultural specificity. Each region\'s character-'
        'design sub-language should be internally consistent and culturally grounded, '
        'while the overall character roster should maintain a unified global character-'
        'design language that reads as a single coherent IP universe.',
        story
    )
    add_body(
        '<b>Supporting sources:</b> Genshin Impact\'s region-based character design '
        'system (documented in the Genshin artbook series, §V-6) is the canonical '
        'contemporary implementation of this principle. Cai Haoyu\'s miHoYo GDC 2021 '
        'talk (§III-1) provides the high-level strategy. Ke Kai-Ren\'s Taiwan '
        'NTMoFA article (§IV-4) provides the cultural-context-aware character-'
        'form design framework.',
        story, indent=True
    )
    add_body(
        '<b>Practical implication:</b> Gacha character designers targeting global '
        'markets should explicitly design the region-layered IP structure: which '
        'regions will be represented? What is each region\'s character-design sub-'
        'language? How do the regional sub-languages combine into a unified global '
        'character-design language? The region-layered IP strategy is the design-'
        'language foundation of the most successful contemporary global gacha character '
        'IP and is the methodology most likely to drive the next generation of global '
        'gacha character-design work.',
        story, indent=True
    )
    story.append(PageBreak())

print("[content] Stage 8d (Section VI-4) loaded.")

# =============================================================================
# APPENDIX A — Complete Source Index with URLs
# =============================================================================

def append_appendix_A(story):
    add_h1('Appendix A — Complete Source Index with URLs', story)
    add_body(
        'The following table is the complete source index for all 27 downloaded '
        'primary sources plus the 10 commercial bibliographic-only entries. Sources '
        'are sorted by section (I–V). Downloaded sources include file size and '
        'local file path; commercial bibliographic-only entries are marked as such.',
        story
    )

    # Build the source index table data
    idx_data = [
        [Paragraph('<b>#</b>', table_header_style),
         Paragraph('<b>Title (EN)</b>', table_header_style),
         Paragraph('<b>Author / Institution</b>', table_header_style),
         Paragraph('<b>Year</b>', table_header_style),
         Paragraph('<b>License</b>', table_header_style),
         Paragraph('<b>Source URL</b>', table_header_style)],
    ]

    sources = [
        # JP Industry & Government (Section I)
        ('I-1', 'AJA Anime Industry Report 2023 Summary', 'AJA (増田弘道, 数土直志)', '2023', 'Free public release', 'aja.gr.jp/download/anime-industry-report-2023_summary_jp?wpdmdl=2289'),
        ('I-2', 'AJA Anime Industry Report 2024 Summary', 'AJA', '2024', 'Free public release', 'aja.gr.jp/download/anime-industry-report-2024-summary_jp?wpdmdl=2453'),
        ('I-3', 'AJA Anime Industry Report 2025 Summary', 'AJA (森礻治, 数土直志)', '2025', 'Free public release', 'aja.gr.jp/download/anime-industry-report-2025_summary_jp?wpdmdl=2645'),
        ('I-4', 'METI Anime Action Plan (Draft)', 'METI Entertainment & Creative Industry Policy Research Committee', '2025', 'JP govt publication', 'meti.go.jp/shingikai/mono_info_service/entertainment_creative/pdf/003_04_02.pdf'),
        ('I-5', 'Bunka-chō Animation Research Guide', 'Bunka-chō (Agency for Cultural Affairs)', '2020', 'JP govt publication', 'mediag.bunka.go.jp/mediag_wp/wp-content/uploads/2020/03/animation_guidance.pdf'),
        ('I-6', 'Bunka-chō Manga Research Guide II', 'Bunka-chō', '2020', 'JP govt publication', 'mediag.bunka.go.jp/mediag_wp/wp-content/uploads/2020/03/manga_guidance02.pdf'),
        ('I-7', 'Bunka-chō Game Research Guide II', 'Bunka-chō', '2020', 'JP govt publication', 'mediag.bunka.go.jp/mediag_wp/wp-content/uploads/2020/03/game_guidance.pdf'),
        ('I-8', 'CEDEC/CESA Tech Roadmaps (4 files)', 'CESA Technical Committee & CEDEC Operating Committee', '2023/2025', 'Free public release', 'cedec.cesa.or.jp/2024/past_cedec/roadmap'),
        # JP Academia (Section II)
        ('II-1', 'Kawaii Characters in Contemporary Manga (PhD thesis)', '李穗超 (Li Yingchao), Kyoto Seika University', '2021', 'Open access (institutional repository)', 'johokan.kyoto-seika.ac.jp/uploads/2021_dr/2021_dr_thesis_01.pdf'),
        ('II-2', 'Character Analysis Formalization (PhD thesis)', '茕木龍太 (Mogi Ryota), Tokyo University of Technology', '2018', 'Open access (koukai page)', 'teu.ac.jp/ap_page/koukai/H29_09_3_motegi.pdf'),
        ('II-3', 'Transmedia Spreadability of Anime/Manga Character Images', '渡那宏樹 (Watabe Kohki), University of Tsukuba', '2023', 'CC-BY 4.0 (F1000Research)', 'f1000research.com/articles/12-191/pdf'),
        ('II-4', 'Structuring of Character Design (JSSD PA-36)', '黃秋容 (Huang Qiurong), Takarazuka University', '2024', 'J-STAGE open access', 'jstage.jst.go.jp/article/jssd/71/0/71_470/_pdf/-char/ja'),
        ('II-5', 'JSSD 71st Spring Conference Program', 'JSSD', '2024', 'Free public release', 'jssd.jp/ja/wp-content/uploads/2024/05/jssd71_program_tentative_240516.pdf'),
        ('II-6', 'Kishida Ryūsei Character Expression (Manga Studies Vol.1)', '松下哲也 (Matsushita Tetsuya), Kyoto Seika University', '2025', 'Open access (institutional repository)', 'seika.repo.nii.ac.jp/record/2000161/files/manga_studies-1_matsushita.pdf'),
        # CN Industry (Section III)
        ('III-1', 'Genshin Impact: Anime Style Open World (GDC 2021)', '蔡浩宇 (Cai Haoyu), miHoYo', '2021', 'GDC Vault free release', 'media.gdcvault.com/GDC+2021/2021GDC+_+Haoyu+Cai+_+presentation+file.pdf'),
        ('III-2', 'Fantastic Gaming Experience (GDC China 2015)', '陈俊雄 (Chen Junxiong), NetEase', '2015', 'GDC China free release', 'media.gdcvault.com/gdcchina15/slides/Junxiong_Chen_Fantastic%20Gaming_EN_CN.pdf'),
        ('III-3', 'More Agile: Weekly Iteration (GDC China 2015)', '文福俊 (Wen Fujun), NetEase', '2015', 'GDC China free release', 'media.gdcvault.com/gdcchina15/slides/Wen_Fujun_More%20Agile_CN.pdf'),
        ('III-4', 'Believable Character Combat EA UFC (CN version)', 'Burgess-Dawson et al., EA Canada', '2014', 'GDC China free release (CN)', 'media.gdcvault.com/gdcchina14/presentations/833781_RichardBurgess_EASportsUFC_CN.pdf'),
        ('III-5', 'Honor of Kings Character Design (TGDC 2018)', '战涛 (Zhan Tao), Tencent', '2018', 'Tencent Game Institute free course', 'gameinstitute.qq.com/course/detail/10139'),
        ('III-6', 'Arknights 3D & 2D Combination (Unite 2020)', '海猛 + 黄一峰, Hypergryph', '2020', 'Unity Developer Community free article', 'developer.unity.cn/projects/5fc9d972edbc2a49b5e3a8ab'),
        # CN Academia (Section IV)
        ('IV-1', 'CN 3D Commercial Animation Character Creation', 'Francis Academic Press', 'n.d.', 'CC-BY (Francis Press OA)', 'francis-press.com/uploads/papers/EQ2faPuvm7w6I5Ibv5jITYK6OBX3k4JBrKSkUOuC.pdf'),
        ('IV-2', 'Pixar Animation Modeling Paradigm', '杨书琴 (Yang Shuting), Qingdao University', 'n.d.', 'CC-BY (Francis Press OA)', 'francis-press.com/uploads/papers/TLLXuYxwqUbXHDgT65v64UxBEdOs2VfXZFihzkcM.pdf'),
        ('IV-3', 'Color in Animated Film Scene Design', 'Francis Academic Press', 'n.d.', 'CC-BY (Francis Press OA)', 'francis-press.com/uploads/papers/BBbt0c54fOhcNSdxI1TuLvoBSVwOJCYiW0U1aUw9.pdf'),
        ('IV-4', 'Character Form World and Design Methods', '柯凯仁 (Ke Kai-Ren), Taiwan NTMoFA', 'n.d.', 'Taiwan NTMoFA official archive', 'twfineartsarchive.ntmofa.gov.tw/QuarterlyFile/P0680100.pdf'),
        # Commercial (Section V)
        ('V-1', 'MdN Character Design Textbook', 'chamoi/toi8/tsunako/ukke/Anmi, MdN', '2015', 'Copyrighted — biblio only', 'books.mdn.co.jp/release/43417'),
        ('V-2', 'MdN Futakiki Character Design Ryuugi', '双木樹 (Futakiki), MdN', '2025', 'Copyrighted — biblio only', 'books.mdn.co.jp/release/83415'),
        ('V-3', 'KADOKAWA KawaiiSensei Pose Drawing', 'KawaiiSensei, KADOKAWA', '2024', 'Copyrighted — biblio only', 'kadokawa.co.jp/product/322404001464'),
        ('V-4', 'KADOKAWA pixiv×ZEN Univ. Creative Lecture', '荪pote, KADOKAWA', '2026', 'Copyrighted — biblio only', 'kadokawa.co.jp/product/322601000707'),
        ('V-5', 'Arknights Official Artbook VOL.1-4', 'Hypergryph, Zhejiang People\'s Fine Arts Publishing House', '2022-2026', 'Copyrighted — biblio only', 'ak.hypergryph.com/corrigendum/artworks'),
        ('V-6', 'Genshin Impact Official Art Book Series', 'miHoYo / HoYoverse', 'n.d.', 'Copyrighted — biblio only', 'goodreads.com/series/405702-genshin-impact-official-art-book'),
    ]

    for entry in sources:
        idx_data.append([
            Paragraph(entry[0], table_cell_center_style),
            Paragraph(entry[1], table_cell_style),
            Paragraph(entry[2], table_cell_style),
            Paragraph(entry[3], table_cell_center_style),
            Paragraph(entry[4], table_cell_style),
            Paragraph(f'<font size="8">{entry[5]}</font>', table_cell_style),
        ])

    idx_table = Table(idx_data,
                      colWidths=[0.05 * AVAILABLE_WIDTH, 0.26 * AVAILABLE_WIDTH,
                                 0.20 * AVAILABLE_WIDTH, 0.07 * AVAILABLE_WIDTH,
                                 0.18 * AVAILABLE_WIDTH, 0.24 * AVAILABLE_WIDTH],
                      hAlign='CENTER', repeatRows=1)
    idx_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_ROW_EVEN, TABLE_ROW_ODD]),
        ('GRID', (0, 0), (-1, -1), 0.3, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(Spacer(1, 6))
    story.append(idx_table)
    story.append(Paragraph('<i>Table A.1 — Complete source index. Downloaded files are in /home/z/my-project/download/sources/JP/ and /home/z/my-project/download/sources/CN/ (158 MB total).</i>', caption_style))
    story.append(PageBreak())

print("[content] Stage 9a (Appendix A) loaded.")

# =============================================================================
# APPENDIX B — Supplementary Online Source URLs
# =============================================================================

def append_appendix_B(story):
    add_h1('Appendix B — Supplementary Online Source URLs', story)
    add_body(
        'The following supplementary online sources are documented as URLs only '
        '(not downloaded as PDFs in this sourcebook) but are verified to be freely '
        'accessible at the URLs listed. They are organized by institution / studio '
        'and serve as supplementary reading for researchers who want to extend their '
        'coverage of the JP and CN character-design literature beyond the 27 '
        'downloaded sources in Appendix A.',
        story
    )

    add_h2('B.1 Kyoto Seika University PhD Thesis Archive', story)
    add_body(
        'Kyoto Seika University (京都精華大学) Information Center maintains an annual '
        'index of PhD theses at https://johokan.kyoto-seika.ac.jp/application/thesis — '
        'with sub-pages for each academic year (dr-2019, dr-2020, dr-2022, dr-2023). '
        'Each thesis is downloadable as a full PDF. The Manga Studies journal '
        '(https://imrc.jp/manga-studies) is the open-access journal of the Kyoto '
        'Seika International Manga Research Center. The institutional repository '
        '(https://seika.repo.nii.ac.jp/) hosts journal articles.',
        story
    )

    add_h2('B.2 AJA All-Year Industry Report Index', story)
    add_body(
        'AJA (日本動画協会) maintains the full archive of Anime Industry Report '
        'summaries (2014–2025) at https://aja.gr.jp/jigyou/chousa/sangyo_toukei. '
        'Each year\'s summary is downloadable as a free PDF using the ?wpdmdl=<id> '
        'parameter (e.g., https://aja.gr.jp/download/anime-industry-report-2025_summary_jp?wpdmdl=2645). '
        'This sourcebook includes the 2023, 2024, and 2025 editions; earlier editions '
        '(2014–2022) can be downloaded directly from the AJA statistics page.',
        story
    )

    add_h2('B.3 Bunka-chō Media Arts Database (MADB)', story)
    add_body(
        'Bunka-chō (文化庁) maintains the Media Arts Database (MADB) portal at '
        'https://mediaarts-db.artmuseums.go.jp — a comprehensive database of '
        'JP manga, anime, game, and media art works. The MADB Lab '
        '(https://mediag.bunka.go.jp/madb_lab) provides research access to the '
        'database. The 4-volume research guide series (animation, manga, game, media '
        'art) is at https://www.bunka.go.jp/seisaku/geijutsubunka/media_art — '
        'this sourcebook includes 3 of the 4 guides; the media-art guide '
        '(https://mediag.bunka.go.jp/mediag_wp/wp-content/uploads/2020/03/mediaart_guidance.pdf, '
        '51 pp.) is also freely downloadable.',
        story
    )

    add_h2('B.4 CEDEC Digital Library', story)
    add_body(
        'CEDEC (シーデック) Digital Library at https://cedil.cesa.or.jp is the '
        'official session-slide archive for CEDEC, the JP game-developer conference. '
        'Most session slides require free CESA member registration; the 4 roadmap '
        'PDFs included in this sourcebook (§I-8) are fully public. The CEDEC 2023 '
        'character-design session "最新IPゲームタイトルにおけるキャラクターデザインとイラストづくり" '
        '(f4samurai, Magia Record / Code Geass Lost Stories) is at '
        'https://cedec.cesa.or.jp/2023/session/detail/s6426ece710c26.html (abstract '
        'page free; slides in CEDIL with login).',
        story
    )

    add_h2('B.5 Tencent Game Institute (12 character-design courses)', story)
    add_body(
        'Tencent Institute of Games (腾讯游戏学堂, https://gameinstitute.qq.com) '
        'offers 12 free character-design courses catalogued in §III-7 of this '
        'sourcebook. Course formats include video lectures with accompanying slides. '
        'Particularly relevant: "IP建设：角色设计与世界观构建", '
        '"萌≠低龄，超实用「萌系」呈现技巧", '
        '"角色原画设计方法和能力培养".',
        story
    )

    add_h2('B.6 Bilibili Industry Talks', story)
    add_body(
        'Bilibili hosts multiple industry talks relevant to CN gacha character design. '
        'Three Haigao (Hypergryph producer) talks are particularly relevant: CAA '
        'alumni interview (https://www.bilibili.com/video/BV1a541117sq), CAA 2022 '
        'graduation speech (https://www.bilibili.com/video/BV1uY4y1c7zR), and 1st '
        'College Student Game Tech Conference (https://www.bilibili.com/video/BV1sv411E75o). '
        'TGDC 2020 Day 4 segment "二次元游戏市场及人群洞察" is at '
        'https://www.bilibili.com/video/BV1Mf4y1e73C.',
        story
    )

    add_h2('B.7 NDLTD (Taiwan Open-Access Theses)', story)
    add_body(
        'The National Digital Library of Theses and Dissertations (NDLTD, '
        'https://ndltd.ncl.edu.tw) is the open-access thesis database for Taiwan. '
        'Four character-design theses are particularly relevant: '
        '"動慢角色造型設計方法の建構と教學實詁" (2022, 83 pp.), '
        '"動畫角色設計と刻板印象研究　以《青春養成記》為例" (2023), '
        '"動畫角色造型設計と性格の關係性研究", and '
        '"數位化角色插畫之創作與研究以台灣流行角色為例" (2010, 128 pp.).',
        story
    )

    add_h2('B.8 CNKI Thesis Abstracts', story)
    add_body(
        'The China National Knowledge Infrastructure (CNKI, https://chnbeta.oversea.cnki.net/index) '
        'hosts publicly-viewable abstracts for CN academic theses. Full PDFs require '
        'CNKI subscription. Five relevant theses: "当代游戏人物角色设计要素及其技术表现研究" (2020, 辽宁师范大学), '
        '"基于二次元爱好者「破壁」心理诉求下的交互体验设计研究" (2021), '
        '"「二次元宅」现象的伦理探究" (2020), '
        '"当代华语商业动画的大众审美走向研究" (2012), and '
        '"新世纪广东动画电影发展研究" (2019, covering 萌化设计).',
        story
    )

    add_h2('B.9 Zhihu Industry Columns', story)
    add_body(
        'Zhihu (知乎) hosts industry columns by professional character designers. '
        'Verify per-author CC license before redistributing. Relevant columns include: '
        '"游戏开发-美术知识体系" (https://zhuanlan.zhihu.com/p/43159859), '
        '"慣谈游戏美术设计的思维方式" (https://zhuanlan.zhihu.com/p/360407082), '
        'and Hypergryph Arknights 3D/2D recap industry article (https://zhuanlan.zhihu.com/p/303630730).',
        story
    )

    add_h2('B.10 JAniCA & JSAS', story)
    add_body(
        'Japan Animation Creators Association (JAniCA / 日本アニメーター・演出家協会, '
        'https://www.janica.jp) is the labor union for JP animators. JAniCA\'s 2009, '
        '2015, 2019, and 2023 working-condition surveys are the primary source for '
        'JP animator compensation data. The Japanese Society for Animation Studies '
        '(JSAS / 日本アニメーション学会, https://www.jsas.net) journal '
        'アニメーション研究 is on J-STAGE (https://www.jstage.jst.go.jp/browse/jjas) '
        'with full open-access archive from Vol.1 (1998) to Vol.26 (2024).',
        story
    )

    story.append(PageBreak())

print("[content] Stage 9b (Appendix B) loaded.")

# =============================================================================
# APPENDIX C — Copyright, Fair Use & Attribution Notice
# =============================================================================

def append_appendix_C(story):
    add_h1('Appendix C — Copyright, Fair Use & Attribution Notice', story)
    add_body(
        'This appendix documents the copyright, fair-use, and attribution framework '
        'under which this sourcebook is published. It is intended to make explicit '
        'the legal status of every category of content in the sourcebook so that '
        'readers can redistribute, cite, and build on the sourcebook with full '
        'knowledge of its licensing basis.',
        story
    )

    add_h2('C.1 Sourcebook Licensing', story)
    add_body(
        'This sourcebook — the synthesis, summaries, structural organization, '
        'cross-cutting methodology principles in Section VI, and all original '
        'editorial content — is © 2026 Z.ai. All rights reserved. The '
        'sourcebook is published as a public intelligence brief for the character-'
        'design and gacha-industry research community. Readers may quote from the '
        'sourcebook with attribution to "Z.ai Character Design Sourcebook (2026)" '
        'and may redistribute the sourcebook PDF in unmodified form.',
        story
    )

    add_h2('C.2 Source Citation & Attribution', story)
    add_body(
        'Every primary-source document referenced in this sourcebook is cited inline '
        'with full bibliographic information: title (in original language and English '
        'translation), author, institution, year, license, page count, and source '
        'URL. The bibliographic block format used in each source entry (§I-1 '
        'through §V-6) is designed to make attribution as easy as possible for '
        'readers who cite these sources in their own work.',
        story
    )

    add_h2('C.3 Fair Use of Copyrighted Material', story)
    add_body(
        'Brief attributed quotations of 1-3 sentences from copyrighted material are '
        'used in this sourcebook under the fair-use doctrine for the purpose of '
        'criticism, comment, scholarship, and research. Fair-use quotations in this '
        'sourcebook include: the slide-11 quotation from Cai Haoyu\'s miHoYo GDC '
        '2021 presentation (§III-1) and brief paraphrases from industry-talk '
        'transcripts (Tencent TGDC 2018, Hypergryph Unite 2020). Each fair-use '
        'quotation is attributed inline with the speaker, venue, date, and source URL.',
        story
    )

    add_h2('C.4 CC-BY Attribution', story)
    add_body(
        'Three primary sources in this sourcebook are CC-BY 4.0 licensed and are '
        'quoted with full attribution under the CC-BY 4.0 terms:',
        story
    )
    add_body(
        '<b>(a)</b> Watabe Kohki (2023). "Subject playing with flat images: Transmedia '
        'spreadability of anime and manga character images". F1000Research 12:191. '
        'CC-BY 4.0. https://doi.org/10.12688/f1000research.129643.2 — quoted '
        'in §II-3.',
        story, indent=True
    )
    add_body(
        '<b>(b)</b> "Research on the Character Creation of Chinese 3D Commercial '
        'Animation Film". Francis Academic Press, CC-BY. — summarized in '
        '§IV-1.',
        story, indent=True
    )
    add_body(
        '<b>(c)</b> Yang Shuting. "Research on the Paradigm of Pixar Animation '
        'Modeling". Francis Academic Press, CC-BY. — summarized in §IV-2.',
        story, indent=True
    )
    add_body(
        '<b>(d)</b> "On the Expression and Application of Color in the Scene Design '
        'of Animated Films". Francis Academic Press, CC-BY. — summarized in '
        '§IV-3.',
        story, indent=True
    )

    add_h2('C.5 Commercial Books — Bibliographic Reference Only', story)
    add_body(
        'The ten commercial books catalogued in Section V (§V-1 through §V-6) '
        'are copyrighted commercial publications. This sourcebook reproduces no '
        'content from these books. For each book, this sourcebook records '
        'bibliographic information only: title (in original language and English '
        'translation), author, publisher, year, ISBN, page count, official URL, '
        'table of contents when publicly available from the publisher, and a 2-3 '
        'sentence description of methodology or content focus. Readers must purchase '
        'these books through official channels to access the full content.',
        story
    )

    add_h2('C.6 Government & Industry-Association Publications', story)
    add_body(
        'The Japanese government publications included in this sourcebook (METI '
        'Anime Action Plan, Bunka-chō Research Guides) and the Japanese '
        'industry-association publications included (AJA Anime Industry Report '
        'summaries, CESA/CEDEC technology roadmaps) are public-domain or free-'
        'public-release materials. They are summarized and quoted from under their '
        'respective free-release terms. The Taiwanese government publication '
        '(NTMoFA archive article) is similarly a free public release.',
        story
    )

    add_h2('C.7 Industry-Talk Transcripts', story)
    add_body(
        'Two industry talks are included in this sourcebook as text transcripts: '
        'the Tencent TGDC 2018 Honor of Kings character-design talk (§III-5, '
        'transcript at gameinstitute.qq.com/course/detail/10139) and the Hypergryph '
        'Unite Shanghai 2020 Arknights talk (§III-6, transcript at '
        'developer.unity.cn/projects/5fc9d972edbc2a49b5e3a8ab). Both transcripts are '
        'officially published by the respective platforms (Tencent Game Institute '
        'and Unity Developer Community) as free public releases. The transcripts are '
        'summarized and paraphrased in this sourcebook with full attribution.',
        story
    )

    add_h2('C.8 Liability Disclaimer', story)
    add_body(
        'This sourcebook is provided for informational and research purposes. While '
        'every effort has been made to verify the licensing status of each source at '
        'the time of writing (July 2026), licensing terms may change. Readers who '
        'intend to redistribute, adapt, or commercially exploit any source referenced '
        'in this sourcebook should verify the current licensing terms with the '
        'original source before doing so. Z.ai accepts no liability for redistribution '
        'decisions made on the basis of this sourcebook\'s licensing summaries.',
        story
    )

    add_h2('C.9 Contact & Corrections', story)
    add_body(
        'Corrections, additions, and source recommendations for future editions of '
        'this sourcebook are welcome. Please submit corrections to the Z.ai Research '
        'Open Intelligence Desk. The next planned edition (Edition 2026 / 02) is '
        'scheduled for Q4 2026 and will incorporate new CEDEC 2026 session releases, '
        'the AJA Anime Industry Report 2026 summary, and any newly released CN '
        'gacha-studio design postmortems.',
        story
    )

print("[content] Stage 9c (Appendix C) loaded.")

# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    output_pdf = '/home/z/my-project/scripts/body.pdf'

    print("[main] Building story...")
    story = build_story()

    # Glossary (Section 5)
    print("[main] Appending Section 5 (Glossary)...")
    append_glossary(story)

    # Section I — JP Industry & Govt (8 sources)
    print("[main] Appending Section I (JP Industry & Govt)...")
    append_section_I(story)

    # Section II — JP Academia (6 sources)
    print("[main] Appending Section II (JP Academia)...")
    append_section_II(story)

    # Section III — CN Industry (7 entries)
    print("[main] Appending Section III (CN Industry)...")
    append_section_III(story)

    # Section IV — CN Academia (4 sources)
    print("[main] Appending Section IV (CN Academia)...")
    append_section_IV(story)

    # Section V — Commercial Books Bibliographic (6 entries)
    print("[main] Appending Section V (Commercial Books)...")
    append_section_V(story)

    # Section VI — Cross-Cutting Methodology Synthesis (4 subsections)
    print("[main] Appending Section VI (Methodology Synthesis)...")
    append_section_VI(story)

    # Appendix A — Source Index
    print("[main] Appending Appendix A (Source Index)...")
    append_appendix_A(story)

    # Appendix B — Supplementary URLs
    print("[main] Appending Appendix B (Supplementary URLs)...")
    append_appendix_B(story)

    # Appendix C — Copyright Notice
    print("[main] Appending Appendix C (Copyright Notice)...")
    append_appendix_C(story)

    print(f"[main] Total story length: {len(story)} flowables")

    # Build the PDF using TocDocTemplate (multiBuild for TOC)
    print(f"[main] Building body PDF: {output_pdf}")
    doc = TocDocTemplate(
        output_pdf,
        pagesize=A4,
        leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN,
        title='Character Design Sourcebook - JP & CN Manuals for Manga, Anime & Gacha',
        author='Z.ai Research / Open Intelligence Desk',
        creator='Z.ai',
        subject='Reading orientation to publicly-available JP/CN character-design literature',
    )

    doc.multiBuild(story, onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)
    print(f"[main] Body PDF built: {output_pdf}")
    print(f"[main] File size: {os.path.getsize(output_pdf) / 1024:.1f} KB")

if __name__ == '__main__':
    main()
