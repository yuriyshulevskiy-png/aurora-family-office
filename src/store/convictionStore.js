import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { updateConviction } from '../services/convictionEngine';

// Canonical ticker mapping — merges duplicates into one liquid ticker
const TICKER_ALIASES = {
  GOLD: 'GLD',
  XAUUSD: 'GLD',
  'XAU/USD': 'GLD',
  BITCOIN: 'BTC',
  ETHEREUM: 'ETH',
  SP500: 'SPY',
  'S&P500': 'SPY',
  'S&P 500': 'SPY',
  NASDAQ: 'QQQ',
  NDX: 'QQQ',
  SILVER: 'SLV',
  XAGUSD: 'SLV',
  OIL: 'BRENT',
  CRUDE: 'BRENT',
  WTI: 'USO',
};

function resolveCanonicalTicker(ticker) {
  const upper = (ticker || '').toUpperCase().trim();
  return TICKER_ALIASES[upper] || upper;
}

export const useConvictionStore = create(
  persist(
    (set, get) => ({
      assets: {},

      updateAssetConviction: (ticker, newSignal, reportDate, source) => {
        const canonical = resolveCanonicalTicker(ticker);
        set((state) => {
          const existing = state.assets[canonical];
          const signal = { ...newSignal, ticker: canonical, source };
          const updated = updateConviction(existing, signal, reportDate);
          // Remove old alias key if it existed separately
          const newAssets = { ...state.assets, [canonical]: updated };
          if (ticker !== canonical && newAssets[ticker]) {
            delete newAssets[ticker];
          }
          return { assets: newAssets };
        });
      },

      getAlertCount: () =>
        Object.values(get().assets).filter((a) => a.rebalance_suggested).length,

      resetConvictions: () => set({ assets: {} }),
    }),
    { name: 'conviction-store' }
  )
);
