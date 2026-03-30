import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useReportsStore = create(
  persist(
    (set, get) => ({
      reports: [],

      addReport: (report) =>
        set((state) => ({
          reports: [{ ...report, id: Date.now(), processedAt: Date.now() }, ...state.reports],
        })),

      getReportsForTicker: (ticker) =>
        get().reports.filter((r) =>
          r.extraction?.assets?.some((a) => a.ticker === ticker)
        ),
    }),
    { name: 'reports-store' }
  )
);
