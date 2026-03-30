/**
 * Technical analysis — compute from OHLCV data.
 */

export function computeSMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

export function computeRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function computeTechnicals(ohlcv) {
  if (!ohlcv || ohlcv.length === 0) return null;

  const closes = ohlcv.map((d) => d.close).filter(Boolean);
  if (closes.length < 14) return null;

  const sma50 = computeSMA(closes, Math.min(50, closes.length));
  const sma200 = computeSMA(closes, Math.min(200, closes.length));
  const rsi = computeRSI(closes);
  const currentPrice = closes[closes.length - 1];

  let trendSignal = 'neutral';
  if (sma200 && currentPrice > sma200) trendSignal = 'uptrend';
  else if (sma200 && currentPrice < sma200) trendSignal = 'downtrend';

  return {
    sma50: sma50 ? Math.round(sma50 * 100) / 100 : null,
    sma200: sma200 ? Math.round(sma200 * 100) / 100 : null,
    rsi: rsi ? Math.round(rsi * 10) / 10 : null,
    trendSignal,
    currentPrice,
  };
}
