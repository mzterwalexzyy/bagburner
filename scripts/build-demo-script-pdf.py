"""
One-off converter: turns demo-video-script.md into a designed PDF for download from
the website. Not part of the running app — run manually whenever the script changes.

Usage: py scripts/build-demo-script-pdf.py
"""
import re
from pathlib import Path

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, ListFlowable, ListItem

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "demo-video-script.md"
OUT = ROOT / "web" / "public" / "bagburner-demo-script.pdf"

ACCENT = HexColor("#1fbf75")
INK = HexColor("#111417")
MUTED = HexColor("#5b6470")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle("H1", parent=styles["Title"], textColor=ACCENT, fontSize=22, spaceAfter=4))
styles.add(ParagraphStyle("H2", parent=styles["Heading2"], textColor=INK, spaceBefore=18, spaceAfter=6))
styles.add(ParagraphStyle("Scene", parent=styles["Normal"], textColor=MUTED, fontName="Helvetica-Oblique", spaceBefore=6, spaceAfter=4))
styles.add(ParagraphStyle("VO", parent=styles["Normal"], leftIndent=14, textColor=INK, spaceAfter=8, leading=15))
styles.add(ParagraphStyle("Body", parent=styles["Normal"], textColor=INK, spaceAfter=8, leading=15))
styles.add(ParagraphStyle("Sub", parent=styles["Normal"], textColor=MUTED, fontSize=10, spaceAfter=14))


def inline(text: str) -> str:
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", text)
    return text


def build():
    md = SRC.read_text(encoding="utf-8")
    lines = md.splitlines()

    story = []
    shot_items = []
    in_shot_list = False

    for raw in lines:
        line = raw.rstrip()

        if not line.strip():
            continue
        if line.startswith("---"):
            story.append(Spacer(1, 6))
            story.append(HRFlowable(width="100%", color=HexColor("#dde2e6"), thickness=0.75))
            story.append(Spacer(1, 6))
            continue
        if line.startswith("# "):
            story.append(Paragraph(inline(line[2:]), styles["H1"]))
            story.append(Paragraph("A script for the BagBurner submission demo video.", styles["Sub"]))
            continue
        if line.startswith("## "):
            in_shot_list = False
            story.append(Paragraph(inline(line[3:]), styles["H2"]))
            continue
        if line.startswith("*") and line.endswith("*") and not line.startswith("**"):
            story.append(Paragraph(inline(line.strip("*")), styles["Scene"]))
            continue
        if line.startswith(">"):
            story.append(Paragraph(inline(line.lstrip("> ").strip()), styles["VO"]))
            continue
        if re.match(r"^\d+\.\s", line):
            in_shot_list = True
            shot_items.append(inline(re.sub(r"^\d+\.\s", "", line)))
            continue
        if in_shot_list and shot_items:
            story.append(ListFlowable(
                [ListItem(Paragraph(item, styles["Body"])) for item in shot_items],
                bulletType="1", start=1, leftIndent=18,
            ))
            shot_items = []
            in_shot_list = False
        story.append(Paragraph(inline(line), styles["Body"]))

    if shot_items:
        story.append(ListFlowable(
            [ListItem(Paragraph(item, styles["Body"])) for item in shot_items],
            bulletType="1", start=1, leftIndent=18,
        ))

    doc = SimpleDocTemplate(
        str(OUT), pagesize=LETTER,
        topMargin=0.85 * inch, bottomMargin=0.85 * inch,
        leftMargin=0.9 * inch, rightMargin=0.9 * inch,
        title="BagBurner Demo Video Script",
    )
    doc.build(story)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
