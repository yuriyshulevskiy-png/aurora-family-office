// Yahoo Finance ticker mapping — translate our tickers to Yahoo symbols
const YAHOO_SYMBOLS = {
  BRENT: 'BZ=F',
  SPX: '^GSPC',
  'S&P500': '^GSPC',
  GOLD: 'GC=F',
  SILVER: 'SI=F',
  WTI: 'CL=F',
  OIL: 'CL=F',
  VIX: '^VIX',
  DXY: 'DX-Y.NYB',
  TNX: '^TNX',
  MOVE: '^MOVE',
  'ES-F': 'ES=F',
};

function toYahooSymbol(ticker) {
  return YAHOO_SYMBOLS[ticker.toUpperCase()] || ticker;
}

function fromYahooSymbol(yahooSymbol, originalTicker) {
  return originalTicker;
}

/**
 * Fetch price for a single ticker via v8 chart API
 */
async function fetchSinglePrice(yahooSymbol) {
  const url = `/api/yahoo/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`;
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      const retry = await fetch(url);
      if (!retry.ok) return null;
      const data = await retry.json();
      return data.chart?.result?.[0]?.meta || null;
    }
    return null;
  }
  const data = await response.json();
  return data.chart?.result?.[0]?.meta || null;
}

/**
 * Fetch prices for multiple tickers
 */
export async function fetchStockPrices(tickers = []) {
  if (tickers.length === 0) return {};

  const results = {};
  const tickerMap = {};

  for (const t of tickers) {
    const yahoo = toYahooSymbol(t);
    tickerMap[yahoo] = t;
  }

  const yahooSymbols = Object.keys(tickerMap);

  // Fetch all in parallel with small concurrency batches
  const batchSize = 5;
  for (let i = 0; i < yahooSymbols.length; i += batchSize) {
    const batch = yahooSymbols.slice(i, i + batchSize);

    const promises = batch.map(async (yahooSymbol) => {
      const originalTicker = tickerMap[yahooSymbol];
      try {
        const meta = await fetchSinglePrice(yahooSymbol);
        if (meta) {
          const prevClose = meta.chartPreviousClose || meta.previousClose;
          results[originalTicker] = {
            price: meta.regularMarketPrice,
            change24h: prevClose ? ((meta.regularMarketPrice - prevClose) / prevClose) * 100 : 0,
            week52High: meta.fiftyTwoWeekHigh || null,
            week52Low: meta.fiftyTwoWeekLow || null,
            peRatio: null,
            marketCap: null,
          };
        }
      } catch { /* skip */ }
    });

    await Promise.all(promises);

    if (i + batchSize < yahooSymbols.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}

/**
 * Fetch extended price data with 7d and 30d changes (for sectors)
 */
export async function fetchExtendedPrices(tickers = []) {
  if (tickers.length === 0) return {};
  const results = {};

  const batchSize = 5;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);

    const promises = batch.map(async (ticker) => {
      try {
        const yahooSymbol = toYahooSymbol(ticker);
        const url = `/api/yahoo/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=35d`;
        const response = await fetch(url);
        if (!response.ok) return;

        const data = await response.json();
        const result = data.chart?.result?.[0];
        if (!result) return;

        const meta = result.meta;
        const closes = result.indicators?.quote?.[0]?.close || [];
        const timestamps = result.timestamp || [];
        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || meta.previousClose;

        // Find close prices at ~7d and ~30d ago
        const now = Date.now() / 1000;
        let close7d = null, close30d = null;
        for (let j = timestamps.length - 1; j >= 0; j--) {
          const daysAgo = (now - timestamps[j]) / 86400;
          if (!close7d && daysAgo >= 6.5) close7d = closes[j];
          if (!close30d && daysAgo >= 28) close30d = closes[j];
        }

        results[ticker] = {
          price,
          change24h: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
          change7d: close7d ? ((price - close7d) / close7d) * 100 : null,
          change30d: close30d ? ((price - close30d) / close30d) * 100 : null,
        };
      } catch { /* skip */ }
    });

    await Promise.all(promises);
    if (i + batchSize < tickers.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return results;
}

/**
 * Fetch OHLCV data for technicals
 */
export async function fetchOHLCV(ticker, days = 90) {
  try {
    const yahooSymbol = toYahooSymbol(ticker);
    const url = `/api/yahoo/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=${days}d`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};

    return timestamps.map((t, i) => ({
      date: new Date(t * 1000).toISOString().split('T')[0],
      open: quotes.open?.[i],
      high: quotes.high?.[i],
      low: quotes.low?.[i],
      close: quotes.close?.[i],
      volume: quotes.volume?.[i],
    }));
  } catch {
    return [];
  }
}
