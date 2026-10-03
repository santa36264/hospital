/**
 * Shared value formatter used by preview, PDF, and Excel.
 * Returns a display string or null (never converts missing to 0).
 */
function formatIndicatorValue(raw, dataType, precision) {
  if (raw === null || raw === undefined || String(raw).trim() === '') return null;

  const value = String(raw).trim();

  switch (dataType) {
    case 'numeric': {
      const n = Number(value);
      return isNaN(n) ? value : String(Math.round(n));
    }
    case 'decimal': {
      const n = Number(value);
      if (isNaN(n)) return value;
      return precision != null ? n.toFixed(Number(precision)) : value;
    }
    case 'percentage': {
      const n = Number(value);
      if (isNaN(n)) return value;
      const prec = precision != null ? Number(precision) : 1;
      return `${n.toFixed(prec)}%`;
    }
    case 'yes/no': {
      const v = value.toLowerCase();
      if (['yes', 'true', '1'].includes(v)) return 'Yes';
      if (['no', 'false', '0'].includes(v)) return 'No';
      return value;
    }
    case 'date': {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    default:
      return value;
  }
}

module.exports = { formatIndicatorValue };
