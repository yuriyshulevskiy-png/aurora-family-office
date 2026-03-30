import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * History Store — зберігає щоденні snapshots портфеля для графіків P&L.
 * Також зберігає бенчмарки (SPY, VT) для порівняння.
 */
export const useHistoryStore = create(
  persist(
    (set, get) => ({
      // Daily portfolio value snapshots: [{ date, value, cash, positions }]
      snapshots: [],
      // Benchmark data: { SPY: [{ date, price }], VT: [{ date, price }] }
      benchmarks: {},
      // Initial portfolio value for % calculation
      initialValue: 100000,

      addSnapshot: (snapshot) =>
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          // Replace if same date, otherwise append
          const existing = state.snapshots.findIndex((s) => s.date === today);
          const newSnapshots = [...state.snapshots];
          const entry = { ...snapshot, date: today };
          if (existing >= 0) {
            newSnapshots[existing] = entry;
          } else {
            newSnapshots.push(entry);
          }
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
