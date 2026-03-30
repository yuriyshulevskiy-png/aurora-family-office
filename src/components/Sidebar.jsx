import { useMemo } from 'react';
import { usePortfolioStore, computePortfolioMetrics } from '../store/portfolioStore';
import { useReportsStore } from '../store/reportsStore';
import { formatCurrency, formatPnL, pnlColor } from '../utils/formatting';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Дашборд', badge: '⊞', bg: 'bg-[#1a1f36]' },
  { id: 'portfolio', label: 'Портфель', badge: '◧', bg: 'bg-[#3b82f6]' },
  { id: 'advisor', label: 'Радник AI', badge: '◉', bg: 'bg-[#8b5cf6]' },
  { id: 'pl', label: 'P&L', badge: '↗', bg: 'bg-[#0abd5e]' },
  { id: 'conviction', label: 'Тезіси', badge: '◎', bg: 'bg-[#e67e22]' },
  { id: 'reports', label: 'Звіти', badge: '▤', bg: 'bg-[#697386]' },
];

export default function Sidebar({ activeView, onNavigate }) {
  const positions = usePortfolioStore((s) => s.positions);
  const prices = usePortfolioStore((s) => s.prices);
  const reportCount = useReportsStore((s) => s.reports.length);
  const cash = usePortfolioStore((s) => s.cash);
  const metrics = useMemo(() => computePortfolioMetrics(positions, prices, cash), [positions, prices, cash]);

  return (
    <aside className="
      w-[60px] lg:w-[220px]
      min-h-screen bg-white flex flex-col shrink-0 border-r border-[#e3e8ee]
      transition-all duration-200
    ">
      {/* Logo */}
      <div className="px-2 lg:px-4 py-4 border-b border-[#e3e8ee]">
        <div className="flex items-center justify-center lg:justify-start">
          <img src="/logo-aurora-icon.svg" alt="Aurora" className="h-11 w-11 lg:hidden" />
          <img src="/logo-aurora.svg" alt="Aurora Family Office" className="hidden lg:block h-[72px]" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-1.5 lg:px-3">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={item.label}
            className={`w-full flex items-center gap-3 px-2 lg:px-3 py-[9px] text-left text-[14px] rounded-lg mb-0.5 transition-all duration-150 justify-center lg:justify-start ${
              activeView === item.id
                ? 'bg-[#f0efff] text-[#635bff] font-medium'
                : 'text-[#1a1f36] hover:bg-[#f6f9fc]'
            }`}
          >
            <div className={`w-7 h-7 lg:w-6 lg:h-6 rounded-lg ${
              activeView === item.id ? 'bg-[#635bff]' : item.bg
            } flex items-center justify-center text-white text-[12px] lg:text-[11px] font-bold shrink-0`}>{item.badge}</div>
            <span className="hidden lg:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Stats footer — hidden when collapsed */}
      <div className="hidden lg:block border-t border-[#e3e8ee] px-5 py-4 space-y-3">
        <div>
          <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-0.5">Вартість</div>
          <div className="mono text-[16px] text-[#1a1f36] font-semibold">{formatCurrency(metrics.totalValue)}</div>
        </div>
        <div>
          <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-0.5">P&L</div>
          <div className={`mono text-[14px] font-medium ${pnlColor(metrics.totalPnL)}`}>
            {formatPnL(metrics.totalPnL)}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#a3acb9]">
          <span>{positions.length} позицій</span>
          <span>·</span>
          <span>{reportCount} звітів</span>
        </div>
      </div>
    </aside>
  );
}
