/**
 * Stage 09 — Excel Report Service
 * Uses ExcelJS to generate a proper .xlsx workbook from normalised report data.
 * Writes directly into the Express response (streaming via workbook.xlsx.write).
 */

const ExcelJS = require('exceljs');

/**
 * Generate Excel workbook and pipe into a writable stream.
 * @param {object} reportData  — from customReportService.buildReportData()
 * @param {import('stream').Writable} outputStream
 */
async function generateExcel(reportData, outputStream) {
  const { dataset, indicators, periods, matrix, generatedAt } = reportData;

  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Hospital Health Data Management System';
  workbook.created = new Date(generatedAt);
  workbook.modified = new Date(generatedAt);

  const sheet = workbook.addWorksheet('Custom Report', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    properties: { tabColor: { argb: 'FF1E40AF' } },
  });

  // ── Report header rows ─────────────────────────────────────────────────────

  const titleStyle = {
    font: { bold: true, size: 14, color: { argb: 'FF1E293B' } },
  };
  const metaStyle = {
    font: { size: 9, color: { argb: 'FF64748B' } },
  };

  sheet.addRow(['Custom Report']).getCell(1).style = titleStyle;
  sheet.addRow([`Dataset: ${dataset.name}  (${dataset.code})`]).getCell(1).style = metaStyle;
  sheet.addRow([`Generated: ${new Date(generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`]).getCell(1).style = metaStyle;
  sheet.addRow([`Periods: ${periods.map(p => p.label).join(', ')}`]).getCell(1).style = metaStyle;
  sheet.addRow([]);  // blank separator

  // ── Column header row ──────────────────────────────────────────────────────

  const headerRow = sheet.addRow(['Indicator', 'Code', 'Type', ...periods.map(p => p.label)]);

  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left:   { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right:  { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  // Left-align the indicator and code columns
  headerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  headerRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

  headerRow.height = 30;

  // ── Data rows ──────────────────────────────────────────────────────────────

  const evenBg = 'FFF8FAFC';   // slate-50
  const oddBg  = 'FFFFFFFF';   // white
  const missingFont = { italic: true, color: { argb: 'FF94A3B8' }, size: 9 };  // slate-400

  indicators.forEach((ind, rowIdx) => {
    const periodValues = periods.map(period => {
      const v = matrix[ind.id]?.[period.id];
      return v !== null && v !== undefined ? v : null;
    });

    const row = sheet.addRow([ind.name, ind.code, ind.data_type, ...periodValues]);

    const bgColor = rowIdx % 2 === 0 ? evenBg : oddBg;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border = {
        top:    { style: 'hair', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
        left:   { style: 'hair', color: { argb: 'FFE2E8F0' } },
        right:  { style: 'hair', color: { argb: 'FFE2E8F0' } },
      };
      cell.alignment = { vertical: 'middle', wrapText: colNumber === 1 };

      if (colNumber > 3) {  // period value cells
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (cell.value === null) {
          cell.value = 'N/A';
          cell.font = missingFont;
        } else {
          cell.font = { size: 10 };
        }
      }
    });

    row.height = 20;
  });

  // ── Blank row + note ───────────────────────────────────────────────────────
  sheet.addRow([]);
  const noteRow = sheet.addRow(['Note: Only APPROVED submissions are included. N/A = no approved data available.']);
  noteRow.getCell(1).font = { italic: true, size: 8, color: { argb: 'FF64748B' } };
  sheet.mergeCells(`A${noteRow.number}:${colLetter(3 + periods.length)}${noteRow.number}`);

  // ── Column widths ──────────────────────────────────────────────────────────
  sheet.getColumn(1).width = 35;   // Indicator name
  sheet.getColumn(2).width = 14;   // Code
  sheet.getColumn(3).width = 12;   // Type
  for (let i = 0; i < periods.length; i++) {
    sheet.getColumn(4 + i).width = Math.max(12, Math.min(20, periods[i].label.length + 2));
  }

  // Freeze header rows and indicator column
  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 6 }];  // freeze after row 6 (5 header + 1 col header)

  // ── Stream output ──────────────────────────────────────────────────────────
  await workbook.xlsx.write(outputStream);
}

// ExcelJS column letter helper (A, B, ..., Z, AA, AB, ...)
function colLetter(n) {
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

module.exports = { generateExcel };
