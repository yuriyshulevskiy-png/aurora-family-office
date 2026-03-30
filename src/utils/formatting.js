const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const currencyCompactFmt = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
});
const pctFmt = new Intl.NumberFormat('en-US', {
  style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const numberFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '—';
  return currencyFmt.format(value);
}

export function formatCurrencyCompact(value) {
  if (value == null || isNaN(value)) return '—';
  return currencyCompactFmt.format(value);
}

export function formatPercent(value) {
  if (value == null || isNaN(value)) return '—';
  return pctFmt.format(value / 100);
}

export function formatNumber(value) {
  if (value == null || isNaN(value)) return '—';
  return numberFmt.format(value);
}

export function formatPnL(value) {
  if (value == null || isNaN(value)) return '—';
  const prefix = value >= 0 ? '+' : '';
  return prefix + currencyFmt.format(value);
}

export function formatPnLPercent(value) {
  if (value == null || isNaN(value)) return '—';
  const prefix = value >= 0 ? '+' : '';
  return prefix + value.toFixed(2) + '%';
}

export function pnlColor(value) {
  if (value > 0) return 'text-[#0abd5e]';
  if (value < 0) return 'text-[#cd3d64]';
  return 'text-[#697386]';
}
