import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { savePositions, loadPositions, loadSetting, isSupabaseReady } from '../services/supabase';

// Debounced sync to Supabase
let syncTimer = null;
function debouncedSync(positions, cash) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => savePositions(positions, cash), 500);
}

export const usePortfolioStore = create(
  persist(
    (set, get) => ({
      positions: [],
      cash: 100000,
      prices: {},
      pricesLoading: false,
      pricesError: null,
      _hydrated: false,

      hydrateFromSupabase: async () => {
        if (!isSupabaseReady() || get()._hydrated) return;
        try {
          const [positions, cash] = await Promise.all([
            loadPositions(),
            loadSetting('portfolio_cash'),
          ]);
          if (positions && positions.length > 0) {
            set({
              positions: positions.map((p) => ({
                ticker: p.ticker,
                qty: Number(p.qty),
                entryPrice: Number(p.entry_price),
                type: p.asset_type || 'stock',
                name: p.name || p.ticker,
                sector: p.sector || null,
              })),
              cash: cash != null ? Number(cash) : get().cash,
              _hydrated: true,
            });
          } else {
            set({ _hydrated: true });
          }
        } catch (e) {
          console.warn('Supabase hydrate error:', e);
          set({ _hydrated: true });
        }
      },

      setPrices: (newPrices) => set({ prices: newPrices, pricesLoading: false, pricesError: null }),
      setPricesLoading: (loading) => set({ pricesLoading: loading }),
      setPricesError: (error) => set({ pricesError: error, pricesLoading: false }),

      updatePrice: (ticker, priceData) =>
        set((state) => ({
          prices: { ...state.prices, [ticker]: { ...state.prices[ticker], ...priceData } },
        })),

      addPosition: (position) =>
        set((state) => {
          const cost = position.qty * position.entryPrice;
          const existing = state.positions.find((p) => p.ticker === position.ticker);
          let newState;
          if (existing) {
            const totalQty = existing.qty + position.qty;
            const totalCost = existing.qty * existing.entryPrice + cost;
            const avgPrice = totalCost / totalQty;
            newState = {
              positions: state.positions.map((p) =>
                p.ticker === position.ticker
                  ? { ...p, qty: totalQty, entryPrice: avgPrice }
                  : p
              ),
              cash: state.cash - cost,
            };
          } else {
            newState = {
              positions: [...state.positions, position],
              cash: state.cash - cost,
            };
          }
          debouncedSync(newState.positions, newState.cash);
          return newState;
        }),

      removePosition: (ticker) =>
        set((state) => {
          const pos = state.positions.find((p) => p.ticker === ticker);
          const proceeds = pos ? pos.qty * (state.prices[ticker]?.price || pos.entryPrice) : 0;
          const newState = {
            positions: state.positions.filter((p) => p.ticker !== ticker),
            cash: state.cash + proceeds,
          };
          debouncedSync(newState.positions, newState.cash);
          return newState;
        }),

      reducePosition: (ticker, sellPct) =>
        set((state) => {
          const pos = state.positions.find((p) => p.ticker === ticker);
          if (!pos) return state;
          const price = state.prices[ticker]?.price || pos.entryPrice;
          const sellQty = pos.type === 'crypto'
            ? Math.round(pos.qty * (sellPct / 100) * 10000) / 10000
            : Math.floor(pos.qty * (sellPct / 100));
          if (sellQty <= 0) return state;
          const proceeds = sellQty * price;
          const remainingQty = pos.qty - sellQty;
          let newState;
          if (remainingQty <= 0) {
            newState = {
              positions: state.positions.filter((p) => p.ticker !== ticker),
              cash: state.cash + pos.qty * price,
            };
          } else {
            newState = {
              positions: state.positions.map((p) =>
                p.ticker === ticker ? { ...p, qty: remainingQty } : p
              ),
              cash: state.cash + proceeds,
            };
          }
          debouncedSync(newState.positions, newState.cash);
          return newState;
        }),

      resetPortfolio: () => {
        debouncedSync([], 100000);
        return set({ positions: [], cash: 100000, prices: {} });
      },
    }),
    { name: 'portfolio-store' }
  )
);

// Derived computations
export function computePortfolioMetrics(positions, prices, cash = 0) {
  let totalValue = cash;
  let totalCostBasis = 0;

  for (const pos of positions) {
    const price = prices[pos.ticker]?.price;
    if (price) {
      totalValue += pos.qty * price;
      totalCostBasis += pos.qty * pos.entryPrice;
    }
  }

  const totalPnL = totalValue - (totalCostBasis + cash);
  const totalPnLPct = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;
  const ltv = totalCostBasis > 0 ? (totalValue - cash) / totalCostBasis : 1;

  return { totalValue, totalCostBasis, totalPnL, totalPnLPct, ltv, cash };
}
