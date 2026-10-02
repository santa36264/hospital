function durationToMs(value, fallbackMs) {
  const match = /^(\d+)([smhd])$/.exec(String(value || ''));
  if (!match) return fallbackMs;
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(match[1]) * unitMs[match[2]];
}

module.exports = { durationToMs };
