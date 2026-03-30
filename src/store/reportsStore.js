import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { saveReport, loadReports, isSupabaseReady } from '../services/supabase';

export const useReportsStore = create(
  persist(
    (set, get) => ({
      reports: [],
      _hydrated: false,

      hydrateFromSupabase: async () => {
        if (!isSupabaseReady() || get()._hydrated) return;
        try {
          const reports = await loadReports();
          if (reports && reports.length > 0) {
            set({ reports, _hydrated: true });
          } else {
            set({ _hydrated: true });
          }
        } catch (e) {
          console.warn('Supabase reports hydrate error:', e);
          set({ _hydrated: true });
        }
      },

      addReport: (report) =>
        set((state) => {
          const newReport = { ...report, id: Date.now(), processedAt: Date.now() };
          saveReport(newReport);
          return { reports: [newReport, ...state.reports] };
        }),

      getReportsForTicker: (ticker) =>
        get().reports.filter((r) =>
          r.extraction?.assets?.some((a) => a.ticker === ticker)
        ),
    }),
    { name: 'reports-store' }
  )
);
