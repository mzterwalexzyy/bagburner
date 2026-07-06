import PDFDocument from "pdfkit";
import type { OpenPosition, TaxReport, Verdict } from "../types.js";

const COLORS = {
  navy: "#0f172a",
  slate: "#475569",
  lightGray: "#f1f5f9",
  border: "#e2e8f0",
  green: "#16a34a",
  red: "#dc2626",
  white: "#ffffff",
  black: "#111827",
};

const VERDICT_COLORS: Record<Verdict, string> = {
  cut: "#dc2626",
  watch: "#d97706",
  hold: "#2563eb",
  "take-profit": "#16a34a",
};

function usd(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

const MARGIN = 40;

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - MARGIN) {
    doc.addPage();
  }
}

function drawHeader(doc: PDFKit.PDFDocument, report: TaxReport) {
  const pageWidth = doc.page.width;
  doc.rect(0, 0, pageWidth, 90).fill(COLORS.navy);
  doc.fillColor(COLORS.white).fontSize(22).font("Helvetica-Bold").text("BagBurner", MARGIN, 22);
  doc.fontSize(11).font("Helvetica").text("Tax Position Report", MARGIN, 50);
  doc.fontSize(9).fillColor("#cbd5e1").text(`Wallet ${report.walletAnalyzed}`, MARGIN, 68);

  doc.y = 110;
  doc.fillColor(COLORS.black);
}

function drawStatCards(doc: PDFKit.PDFDocument, report: TaxReport) {
  const pageWidth = doc.page.width;
  const hasTax = report.taxRatePercent !== undefined && report.potentialTaxOwedUsd !== undefined;
  const cards: Array<[string, number, boolean?]> = [
    ["Realized P&L", report.realizedPnlUsd],
    ["Unrealized P&L", report.unrealizedPnlUsd],
  ];
  if (hasTax) cards.push([`Est. Tax Owed (${report.taxRatePercent}%)`, report.potentialTaxOwedUsd as number, true]);

  const gap = 16;
  const cardWidth = (pageWidth - MARGIN * 2 - gap * (cards.length - 1)) / cards.length;
  const cardHeight = 60;
  const top = doc.y;

  cards.forEach(([label, value, isTax], i) => {
    const x = MARGIN + i * (cardWidth + gap);
    const color = isTax ? COLORS.navy : value < 0 ? COLORS.red : COLORS.green;
    doc.roundedRect(x, top, cardWidth, cardHeight, 6).fillAndStroke(COLORS.lightGray, COLORS.border);
    doc.fillColor(COLORS.slate).fontSize(9).font("Helvetica").text((label as string).toUpperCase(), x + 14, top + 12, { width: cardWidth - 28 });
    doc.fillColor(color).fontSize(18).font("Helvetica-Bold").text(usd(value as number), x + 14, top + 30);
  });

  doc.y = top + cardHeight + 24;
  doc.fillColor(COLORS.black);
}

interface Column {
  header: string;
  width: number;
  align?: "left" | "right" | "center";
}

function drawTableHeader(doc: PDFKit.PDFDocument, x: number, y: number, columns: Column[]): number {
  const rowHeight = 22;
  const totalWidth = columns.reduce((s, c) => s + c.width, 0);
  doc.rect(x, y, totalWidth, rowHeight).fill(COLORS.navy);
  let cx = x;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.white);
  for (const col of columns) {
    doc.text(col.header, cx + 8, y + 7, { width: col.width - 16, align: col.align ?? "left" });
    cx += col.width;
  }
  return y + rowHeight;
}

function drawTable(doc: PDFKit.PDFDocument, title: string, columns: Column[], rows: string[][], verdictColIndex?: number) {
  ensureSpace(doc, 60);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.navy).text(title, MARGIN, doc.y);
  doc.moveDown(0.4);

  const totalWidth = columns.reduce((s, c) => s + c.width, 0);
  let y = drawTableHeader(doc, MARGIN, doc.y, columns);
  const rowHeight = 20;

  if (rows.length === 0) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.slate).text("None found.", MARGIN + 8, y + 6);
    doc.y = y + rowHeight;
    return;
  }

  rows.forEach((row, i) => {
    if (y + rowHeight > doc.page.height - MARGIN) {
      doc.addPage();
      y = drawTableHeader(doc, MARGIN, MARGIN, columns);
    }
    if (i % 2 === 1) doc.rect(MARGIN, y, totalWidth, rowHeight).fill(COLORS.lightGray);

    let cx = MARGIN;
    doc.font("Helvetica").fontSize(8.5);
    row.forEach((cell, colIdx) => {
      const col = columns[colIdx];
      if (verdictColIndex === colIdx) {
        doc.fillColor(VERDICT_COLORS[cell as Verdict] ?? COLORS.slate).font("Helvetica-Bold");
      } else {
        doc.fillColor(COLORS.black).font("Helvetica");
      }
      doc.text(cell, cx + 8, y + 6, { width: col.width - 16, align: col.align ?? "left" });
      cx += col.width;
    });
    y += rowHeight;
  });

  doc.y = y + 20;
  doc.fillColor(COLORS.black);
}

function positionRow(p: OpenPosition, includeVerdictSuffix = false): string[] {
  const price = p.currentPriceUsd !== null ? `$${p.currentPriceUsd}` : "no listing";
  return [
    p.tokenSymbol,
    p.quantity.toFixed(4),
    `$${p.avgCostUsd.toFixed(6)}`,
    price,
    usd(p.unrealizedUsd),
    includeVerdictSuffix ? p.verdict : p.verdict,
  ];
}

export function generateReportPdf(report: TaxReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawHeader(doc, report);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.slate).text(`Chain: ${report.chain}    Generated: ${report.computedAt}`, MARGIN);
    doc.moveDown(1);

    drawStatCards(doc, report);

    const harvestColumns: Column[] = [
      { header: "Token", width: 90 },
      { header: "Qty", width: 90, align: "right" },
      { header: "Avg Cost", width: 80, align: "right" },
      { header: "Price", width: 70, align: "right" },
      { header: "Unrealized", width: 90, align: "right" },
      { header: "Verdict", width: 95 },
    ];

    drawTable(
      doc,
      "Harvest Opportunities",
      harvestColumns,
      report.harvestOpportunities.map((p) => positionRow(p)),
      5
    );

    drawTable(
      doc,
      "All Open Positions",
      harvestColumns,
      report.positions.map((p) => positionRow(p)),
      5
    );

    ensureSpace(doc, 80);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.navy).text("Summary", MARGIN, doc.y);
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.black).text(report.llmSummary, MARGIN, doc.y, { width: doc.page.width - MARGIN * 2 });
    doc.moveDown(1);

    ensureSpace(doc, 50);
    const quipWidth = doc.page.width - MARGIN * 2;
    const quipTop = doc.y;
    doc.roundedRect(MARGIN, quipTop, quipWidth, 40, 6).fill(COLORS.navy);
    doc.fillColor(COLORS.white).font("Helvetica-Oblique").fontSize(10).text(report.quip, MARGIN + 14, quipTop + 12, { width: quipWidth - 28 });
    doc.y = quipTop + 50;
    doc.fillColor(COLORS.black);

    ensureSpace(doc, 30);
    doc.font("Helvetica").fontSize(8).fillColor(COLORS.slate).text(
      "This is a mathematical analysis tool, not tax advice. Consult a qualified tax professional for your jurisdiction. Rules vary significantly by country.",
      MARGIN,
      doc.y,
      { width: doc.page.width - MARGIN * 2 }
    );

    doc.end();
  });
}
