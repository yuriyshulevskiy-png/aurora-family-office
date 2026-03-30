import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { saveAdvisorState, loadAdvisorState, isSupabaseReady } from '../services/supabase';

let advisorSyncTimer = null;
function debouncedAdvisorSync(state) {
  clearTimeout(advisorSyncTimer);
  advisorSyncTimer = setTimeout(() => saveAdvisorState(state), 500);
}

export const useAdvisorStore = create(
  persist(
    (set, get) => ({
      advice: null,
      boughtTickers: [],
      soldTickers: [],
      _hydrated: false,

      hydrateFromSupabase: async () => {
        if (!isSupabaseReady() || get()._hydrated) return;
        try {
          const state = await loadAdvisorState();
          if (state) {
            set({ ...state, _hydrated: true });
          } else {
            set({ _hydrated: true });
          }
        } catch (e) {
          console.warn('Supabase advisor hydrate error:', e);
          set({ _hydrated: true });
        }
      },

      setAdvice: (advice) => {
        set({ advice });
        const s = get();
        debouncedAdvisorSync({ advice, boughtTickers: s.boughtTickers, soldTickers: s.soldTickers });
      },
      addBought: (ticker) => {
        set((s) => ({ boughtTickers: [...new Set([...s.boughtTickers, ticker])] }));
        const s = get();
        debouncedAdvisorSync({ advice: s.advice, boughtTickers: s.boughtTickers, soldTickers: s.soldTickers });
      },
      addSold: (ticker) => {
        set((s) => ({ soldTickers: [...new Set([...s.soldTickers, ticker])] }));
        const s = get();
        debouncedAdvisorSync({ advice: s.advice, boughtTickers: s.boughtTickers, soldTickers: s.soldTickers });
      },
      clearAdvice: () => {
        set({ advice: null, boughtTickers: [], soldTickers: [] });
        debouncedAdvisorSync({ advice: null, boughtTickers: [], soldTickers: [] });
      },
    }),
    { name: 'advisor-store' }
  )
);
