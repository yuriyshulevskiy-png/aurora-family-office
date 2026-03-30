import { useMemo } from 'react';
import { usePortfolioStore, computePortfolioMetrics } from '../store/portfolioStore';
import { useHistoryStore } from '../store/historyStore';
import { formatCurrency, formatPnL, pnlColor } from '../utils/formatting';
import PerformanceChart from './PerformanceChart';

export default function PLView() {
  const positions = usePortfolioStore((s) => s.positions);
  const prices = usePortfolioStore((s) => s.prices);
  const cash = usePortfolioStore((s) => s.cash);
  const metrics = useMemo(() => computePortfolioMetrics(positions, prices, cash), [positions, prices, cash]);

  const positionsPnL = useMemo(() => {
    return positions.map((p) => {
      const currentPrice = prices[p.ticker]?.price || p.entryPrice;
      const marketValue = p.qty * currentPrice;
      const costBasis = p.qty * p.entryPrice;
      const pnl = marketValue - costBasis;
      const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      return { ...p, currentPrice, marketValue, costBasis, pnl, pnlPct };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [positions, prices]);

  const totalInvested = positionsPnL.reduce((s, p) => s + p.costBasis, 0);
  const totalMarket = positionsPnL.reduce((s, p) => s + p.marketValue, 0);
  const totalPnL = totalMarket - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-[#e3e8ee] px-8 py-6">
        <h1 className="text-[22px] font-semibold text-[#1a1f36] tracking-[-0.02em] mb-4">Прибутки та збитки</h1>
        <div className="flex items-baseline gap-10">
          <div>
            <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-0.5">Вартість</div>
            <div className="text-[28px] font-semibold text-[#1a1f36] mono tracking-tight">{formatCurrency(metrics.totalValue)}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-0.5">P&L</div>
            <div className={`text-[17px] font-medium mono ${pnlColor(totalPnL)}`}>
              {formatPnL(totalPnL)}
              <span className="text-[13px] ml-1.5 opacity-75">({totalPnLPct > 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%)</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-0.5">Інвестовано</div>
            <div className="text-[17px] font-medium mono text-[#697386]">{formatCurrency(totalInvested)}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-0.5">Кеш</div>
            <div className="text-[17px] font-medium mono text-[#1a1f36]">
              {formatCurrency(cash)}
              <span className="text-[13px] text-[#a3acb9] ml-1.5">
                ({metrics.totalValue > 0 ? ((cash / metrics.totalValue) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        <PerformanceChart />

        {/* Per-position P&L as cards */}
        {positionsPnL.length > 0 ? (
          <div>
            <h2 className="text-[15px] font-semibold text-[#1a1f36] mb-3">P&L по позиціях</h2>
            <div className="space-y-2">
              {positionsPnL.map((p) => (
                <div key={p.ticker} className="flex items-center gap-4 border border-[#e3e8ee] rounded-lg bg-white px-5 py-3.5 hover:border-[#d0d5dd] transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center shrink-0">
                    <span className="mono text-[11px] font-semibold text-[#1a1f36]">{p.ticker}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-[#1a1f36]">{p.ticker}</span>
                      {p.name && <span className="text-[12px] text-[#a3acb9]">{p.name}</span>}
                    </div>
                    <div className="text-[12px] text-[#a3acb9]">{p.qty} шт @ {formatCurrency(p.entryPrice)}</div>
                  </div>
                  <div className="text-right">
                    <div className="mono text-[14px] text-[#1a1f36] font-medium">{formatCurrency(p.marketValue)}</div>
                  </div>
                  <div className="text-right w-24">
                    <div className={`mono text-[14px] font-medium ${pnlColor(p.pnl)}`}>{formatPnL(p.pnl)}</div>
                    <div className={`mono text-[11px] ${pnlColor(p.pnlPct)}`}>{p.pnlPct > 0 ? '+' : ''}{p.pnlPct.toFixed(2)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-[#e3e8ee] rounded-lg bg-white p-10 text-center">
            <div className="text-[#697386] text-[15px]">Портфель порожній</div>
            <div className="text-[13px] text-[#a3acb9] mt-1">Додайте позиції через Радник AI.</div>
          </div>
        )}
      </div>
    </div>
  );
}
