import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAdvisorStore = create(
  persist(
    (set) => ({
      advice: null,
      boughtTickers: [],
      soldTickers: [],
      setAdvice: (advice) => set({ advice }),
      addBought: (ticker) => set((s) => ({ boughtTickers: [...new Set([...s.boughtTickers, ticker])] })),
      addSold: (ticker) => set((s) => ({ soldTickers: [...new Set([...s.soldTickers, ticker])] })),
      clearAdvice: () => set({ advice: null, boughtTickers: [], soldTickers: [] }),
    }),
    { name: 'advisor-store' }
  )
);
