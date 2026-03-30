import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { saveSnapshot, loadSnapshots, isSupabaseReady } from '../services/supabase';

/**
 * History Store — зберігає щоденні snapshots портфеля для графіків P&L.
 * Також зберігає бенчмарки (SPY, VT) для порівняння.
 */
export const useHistoryStore = create(
  persist(
    (set, get) => ({
      snapshots: [],
      benchmarks: {},
      initialValue: 100000,
      _hydrated: false,

      hydrateFromSupabase: async () => {
        if (!isSupabaseReady() || get()._hydrated) return;
        try {
          const snapshots = await loadSnapshots();
          if (snapshots && snapshots.length > 0) {
            set({ snapshots, _hydrated: true });
          } else {
            set({ _hydrated: true });
          }
        } catch (e) {
          console.warn('Supabase history hydrate error:', e);
          set({ _hydrated: true });
        }
      },

      addSnapshot: (snapshot) =>
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          const existing = state.snapshots.findIndex((s) => s.date === today);
          const newSnapshots = [...state.snapshots];
          const entry = { ...snapshot, date: today };
          if (existing >= 0) {
            newSnapshots[existing] = entry;
          } else {
            newSnapshots.push(entry);
          }
          saveSnapshot(entry);
          return { snapshots: newSnapshots };
        }),

      setBenchmarks: (benchmarks) =>
        set((state) => ({
          benchmarks: { ...state.benchmarks, ...benchmarks },
        })),

      setInitialValue: (value) => set({ initialValue: value }),

      resetHistory: () => set({ snapshots: [], benchmarks: {}, initialValue: 100000 }),
    }),
    { name: 'history-store' }
  )
);
