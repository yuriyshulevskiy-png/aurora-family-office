import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { updateConviction } from '../services/convictionEngine';
import { saveConvictions, loadConvictions, isSupabaseReady } from '../services/supabase';

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

let convSyncTimer = null;
function debouncedConvSync(assets) {
  clearTimeout(convSyncTimer);
  convSyncTimer = setTimeout(() => saveConvictions(assets), 500);
}

export const useConvictionStore = create(
  persist(
    (set, get) => ({
      assets: {},
      _hydrated: false,

      hydrateFromSupabase: async () => {
        if (!isSupabaseReady() || get()._hydrated) return;
        try {
          const assets = await loadConvictions();
          if (assets && Object.keys(assets).length > 0) {
            set({ assets, _hydrated: true });
          } else {
            set({ _hydrated: true });
          }
        } catch (e) {
          console.warn('Supabase convictions hydrate error:', e);
          set({ _hydrated: true });
        }
      },

      updateAssetConviction: (ticker, newSignal, reportDate, source) => {
        const canonical = resolveCanonicalTicker(ticker);
        set((state) => {
          const existing = state.assets[canonical];
          const signal = { ...newSignal, ticker: canonical, source };
          const updated = updateConviction(existing, signal, reportDate);
          const newAssets = { ...state.assets, [canonical]: updated };
          if (ticker !== canonical && newAssets[ticker]) {
            delete newAssets[ticker];
          }
          debouncedConvSync(newAssets);
          return { assets: newAssets };
        });
      },

      getAlertCount: () =>
        Object.values(get().assets).filter((a) => a.rebalance_suggested).length,

      resetConvictions: () => {
        debouncedConvSync({});
        return set({ assets: {} });
      },
    }),
    { name: 'conviction-store' }
  )
);
