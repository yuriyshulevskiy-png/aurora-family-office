/**
 * Asset icons — SVG data URIs or emoji fallbacks for known tickers.
 * Returns a small icon URL or emoji for display next to asset names.
 */

const ICONS = {
  // Crypto
  BTC: '₿',
  ETH: 'Ξ',
  HYPE: '⬡',
  SOL: '◎',
  DOGE: 'Ð',
  ADA: '₳',
  XRP: '✕',
  DOT: '●',
  AVAX: '▲',
  LINK: '⬡',
  UNI: '🦄',
  MATIC: '⬟',

  // Major stocks & ETFs
  AAPL: '🍎',
  MSFT: '🪟',
  GOOGL: '🔍',
  GOOG: '🔍',
  AMZN: '📦',
  NVDA: '🟩',
  META: '🔵',
  TSLA: '⚡',
  SPY: '📊',
  QQQ: '📈',

  // Oil & Energy
  PBR: '🛢️',
  XOM: '🛢️',
  CVX: '🛢️',

  // Finance
  JPM: '🏦',
  GS: '🏦',
  BAC: '🏦',

  // Other
  DIS: '🏰',
  NFLX: '🎬',
  AMD: '💻',
  INTC: '💻',
};

// Color accents for known tickers
const COLORS = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  HYPE: '#00FF88',
  SOL: '#9945FF',
  AAPL: '#A2AAAD',
  NVDA: '#76B900',
  TSLA: '#CC0000',
  SPY: '#4A90D9',
  PBR: '#009639',
  META: '#0668E1',
  GOOGL: '#4285F4',
  AMZN: '#FF9900',
  MSFT: '#00A4EF',
};

export function getAssetIcon(ticker) {
  return ICONS[ticker?.toUpperCase()] || '◆';
}

export function getAssetColor(ticker) {
  return COLORS[ticker?.toUpperCase()] || null;
}
