/**
 * Stage 09 — PDF Report Service
 * Uses pdfkit to generate a structured PDF from normalised report data.
 * Streams directly into the Express response.
 */

const PDFDocument = require('pdfkit');

// Colour palette matching the app design language
const COLOURS = {
  primary: '#1e40af',   // blue-800
  header: '#1e293b',    // slate-800
  subtext: '#64748b',   // slate-500
  border: '#e2e8f0',    // slate-200
  rowEven: '#f8fafc',   // slate-50
  white: '#ffffff',
  approved: '#166534',  // green-800
  missing: '#94a3b8',   // slate-400
  accent: '#0f172a',    // slate-900
};

const FONT = {
  normal: 'Helvetica',
  bold: 'Helvetica-Bold',
};

/**
 * Generate PDF and pipe into a writable stream (e.g. res).
 * @param {object} reportData  — from customReportService.buildReportData()
 * @param {import('stream').Writable} outputStream
 */
function generatePDF(reportData, outputStream) {
  const { dataset, indicators, periods, matrix, generatedAt } = reportData;

  const doc = new PDFDocument({
    size: 'A4',
    layout: indicators.length > 6 ? 'landscape' : 'portrait',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: 'Custom Report',
      Author: 'Hospital Health Data Management System',
      Subject: `${dataset.name} — Custom Report`,
      CreationDate: new Date(generatedAt),
    },
  });

  doc.pipe(outputStream);

  const pageWidth = doc.page.width - 100; // margins 50 each side

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 90).fill(COLOURS.header);

  doc.fill(COLOURS.white)
    .font(FONT.bold)
    .fontSize(18)
    .text('Custom Report', 50, 20);

  doc.fill('#94a3b8')
    .font(FONT.normal)
    .fontSize(9)
    .text('Hospital Health Data Management System', 50, 44);

  doc.fill(COLOURS.white)
    .font(FONT.normal)
    .fontSize(10)
    .text(`Generated: ${new Date(generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`, 50, 60);

  doc.moveDown(0.5);
  doc.y = 105;

  // ── Dataset info ────────────────────────────────────────────────────────────
  doc.fill(COLOURS.accent).font(FONT.bold).fontSize(13).text(dataset.name, 50, doc.y);
  doc.fill(COLOURS.subtext).font(FONT.normal).fontSize(9)
    .text(`Dataset Code: ${dataset.code}`, 50, doc.y + 2);

  doc.y += 20;

  // Period list
  doc.fill(COLOURS.subtext).font(FONT.normal).fontSize(8)
    .text(`Periods: ${periods.map(p => p.label).join('  ·  ')}`, 50, doc.y);

  doc.moveDown(1);

  // ── Matrix table ────────────────────────────────────────────────────────────
  const INDICATOR_COL_W = Math.min(180, pageWidth * 0.35);
  const remainingWidth = pageWidth - INDICATOR_COL_W;
  const periodColW = Math.max(50, Math.min(90, Math.floor(remainingWidth / periods.length)));
  const ROW_H = 22;
  const HEADER_H = 28;

  // Table header background
  const tableStartX = 50;
  let tableStartY = doc.y + 5;

  // Check if we need a new page
  if (tableStartY + HEADER_H + indicators.length * ROW_H > doc.page.height - 60) {
    doc.addPage();
    tableStartY = 50;
  }

  // Header row
  doc.rect(tableStartX, tableStartY, pageWidth, HEADER_H).fill(COLOURS.primary);

  doc.fill(COLOURS.white).font(FONT.bold).fontSize(8)
    .text('Indicator', tableStartX + 6, tableStartY + 9, { width: INDICATOR_COL_W - 10, ellipsis: true });

  periods.forEach((period, i) => {
    const x = tableStartX + INDICATOR_COL_W + i * periodColW;
    doc.fill(COLOURS.white).font(FONT.bold).fontSize(7)
      .text(period.label, x + 3, tableStartY + 4, { width: periodColW - 6, align: 'right', ellipsis: true });
  });

  // Data rows
  indicators.forEach((ind, rowIdx) => {
    const y = tableStartY + HEADER_H + rowIdx * ROW_H;

    // Check page break
    if (y + ROW_H > doc.page.height - 50) {
      doc.addPage();
      // Reprint a mini-header on continuation pages could go here
    }

    // Row background
    if (rowIdx % 2 === 0) {
      doc.rect(tableStartX, y, pageWidth, ROW_H).fill(COLOURS.rowEven);
    }

    // Indicator name + code
    doc.fill(COLOURS.accent).font(FONT.bold).fontSize(8)
      .text(ind.name, tableStartX + 6, y + 4, { width: INDICATOR_COL_W - 8, ellipsis: true });
    doc.fill(COLOURS.subtext).font(FONT.normal).fontSize(6)
      .text(ind.code, tableStartX + 6, y + 14, { width: INDICATOR_COL_W - 8, ellipsis: true });

    // Period values
    periods.forEach((period, colIdx) => {
      const x = tableStartX + INDICATOR_COL_W + colIdx * periodColW;
      const cellValue = matrix[ind.id]?.[period.id];

      if (cellValue !== null && cellValue !== undefined) {
        doc.fill(COLOURS.accent).font(FONT.normal).fontSize(8)
          .text(String(cellValue), x + 3, y + 8, { width: periodColW - 6, align: 'right' });
      } else {
        doc.fill(COLOURS.missing).font(FONT.normal).fontSize(7)
          .text('N/A', x + 3, y + 9, { width: periodColW - 6, align: 'right' });
      }
    });

    // Bottom border
    doc.moveTo(tableStartX, y + ROW_H).lineTo(tableStartX + pageWidth, y + ROW_H)
      .strokeColor(COLOURS.border).lineWidth(0.5).stroke();
  });

  // Table bottom border
  const tableEndY = tableStartY + HEADER_H + indicators.length * ROW_H;
  doc.rect(tableStartX, tableStartY, pageWidth, tableEndY - tableStartY)
    .strokeColor(COLOURS.border).lineWidth(1).stroke();

  // ── Footer ──────────────────────────────────────────────────────────────────
  const footerY = doc.page.height - 40;
  doc.fill(COLOURS.subtext).font(FONT.normal).fontSize(7)
    .text(
      `${indicators.length} indicators · ${periods.length} periods · APPROVED data only`,
      50, footerY,
      { width: pageWidth, align: 'center' }
    );

  // Page number
  doc.fill(COLOURS.subtext).font(FONT.normal).fontSize(7)
    .text(`Page 1`, 50, footerY + 10, { width: pageWidth, align: 'right' });

  doc.end();
}

module.exports = { generatePDF };
