const COIN_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  HYPE: 'hyperliquid',
};

export async function fetchCryptoPrices(tickers = ['BTC', 'ETH', 'HYPE']) {
  const ids = tickers.map((t) => COIN_IDS[t]).filter(Boolean).join(',');
  if (!ids) return {};

  const url = `/api/coingecko/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_7d_change=true`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);

  const data = await response.json();
  const results = {};

  for (const [ticker, coinId] of Object.entries(COIN_IDS)) {
    if (data[coinId]) {
      results[ticker] = {
        price: data[coinId].usd,
        change24h: data[coinId].usd_24h_change,
        change7d: data[coinId].usd_7d_change,
      };
    }
  }

  return results;
}
