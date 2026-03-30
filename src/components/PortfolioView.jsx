import { useMemo } from 'react';
import { usePortfolioStore, computePortfolioMetrics } from '../store/portfolioStore';
import { useConvictionStore } from '../store/convictionStore';
import { formatCurrency, formatPnL, formatPnLPercent, pnlColor } from '../utils/formatting';

const directionBadge = {
  bullish: { label: 'Bullish', cls: 'bg-[#efffed] text-[#0abd5e]' },
  bearish: { label: 'Bearish', cls: 'bg-[#fff0f0] text-[#cd3d64]' },
  neutral: { label: 'Neutral', cls: 'bg-[#fff8e6] text-[#d97706]' },
};

function ConvictionDot({ score }) {
  const color = score >= 65 ? '#0abd5e' : score >= 40 ? '#d97706' : '#cd3d64';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="mono text-[13px] text-[#697386]">{score}</span>
    </div>
  );
}

export default function PortfolioView() {
  const positions = usePortfolioStore((s) => s.positions);
  const prices = usePortfolioStore((s) => s.prices);
  const cash = usePortfolioStore((s) => s.cash);
  const pricesLoading = usePortfolioStore((s) => s.pricesLoading);
  const assets = useConvictionStore((s) => s.assets);

  const metrics = useMemo(() => computePortfolioMetrics(positions, prices, cash), [positions, prices, cash]);

  const totalInvested = useMemo(() =>
    positions.reduce((s, p) => s + p.qty * p.entryPrice, 0), [positions]);
  const totalMarket = useMemo(() =>
    positions.reduce((s, p) => s + p.qty * (prices[p.ticker]?.price || p.entryPrice), 0), [positions, prices]);
  const totalPnL = totalMarket - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  const isEmpty = positions.length === 0;

  return (
    <div className="flex-1 overflow-auto">
      {/* Header with metrics */}
      <div className="bg-white border-b border-[#e3e8ee] px-6 py-5">
        <div className="flex items-baseline gap-8">
          <div>
            <div className="text-[11px] text-[#a3acb9] uppercase tracking-wide mb-0.5">Портфель</div>
            <div className="text-[28px] font-semibold text-[#1a1f36] mono">{formatCurrency(metrics.totalValue)}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#a3acb9] uppercase tracking-wide mb-0.5">P&L</div>
            <div className={`text-lg font-medium mono ${pnlColor(totalPnL)}`}>{formatPnL(totalPnL)}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#a3acb9] uppercase tracking-wide mb-0.5">P&L %</div>
            <div className={`text-lg font-medium mono ${pnlColor(totalPnLPct)}`}>{formatPnLPercent(totalPnLPct)}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#a3acb9] uppercase tracking-wide mb-0.5">Кеш</div>
            <div className="text-lg font-medium mono text-[#1a1f36]">{formatCurrency(cash)}</div>
          </div>
        </div>
      </div>

      <div className="p-6">

        {/* Positions section */}
        <div className="bg-white rounded-md border border-[#e3e8ee]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#e3e8ee]">
            <span className="text-[15px] font-semibold text-[#1a1f36]">Позиції</span>
            <span className="text-[13px] text-[#697386]">{positions.length} активів</span>
          </div>

          {isEmpty ? (
            <div className="text-center py-12 px-6">
              <div className="text-[#697386] text-[15px] mb-1">Портфель порожній</div>
              <div className="text-[13px] text-[#a3acb9] mb-1">Стартовий капітал: {formatCurrency(100000)}</div>
              <div className="text-[13px] text-[#a3acb9]">
                Завантажте звіт у розділі «Звіти» для аналізу.
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-[#a3acb9] border-b border-[#e3e8ee]">
                  <th className="text-left py-2 px-5 font-medium">Тікер</th>
                  <th className="text-left py-2 px-3 font-medium">Назва</th>
                  <th className="text-center py-2 px-3 font-medium">Напрямок</th>
                  <th className="text-center py-2 px-3 font-medium">Conviction</th>
                  <th className="text-right py-2 px-3 font-medium">К-сть</th>
                  <th className="text-right py-2 px-3 font-medium">Вхід</th>
                  <th className="text-right py-2 px-3 font-medium">Ціна</th>
                  <th className="text-right py-2 px-3 font-medium">P&L</th>
                  <th className="text-right py-2 px-3 font-medium">P&L %</th>
                  <th className="text-right py-2 px-5 font-medium">Вага</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => {
                  const priceData = prices[pos.ticker];
                  const currentPrice = priceData?.price;
                  const asset = assets[pos.ticker];
                  const costBasis = pos.qty * pos.entryPrice;
                  const currentValue = currentPrice ? pos.qty * currentPrice : null;
                  const pnl = currentValue ? currentValue - costBasis : null;
                  const pnlPct = currentValue ? ((currentValue - costBasis) / costBasis) * 100 : null;
                  const weight = currentValue && metrics.totalValue
                    ? (currentValue / metrics.totalValue) * 100
                    : null;
                  const dir = directionBadge[asset?.direction] || directionBadge.neutral;

                  return (
                    <tr key={pos.ticker} className="border-b border-[#f0f2f5] hover:bg-[#f6f8fa] transition-colors">
                      <td className="py-3 px-5">
                        <span className="mono font-semibold text-[#1a1f36] text-[13px]">{pos.ticker}</span>
                      </td>
                      <td className="py-3 px-3 text-[13px] text-[#697386]">{pos.name}</td>
                      <td className="py-3 px-3 text-center">
                        {asset && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${dir.cls}`}>
                            {dir.label}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex justify-center">
                          {asset ? <ConvictionDot score={asset.conviction_score} /> : <span className="text-[#a3acb9] text-[13px]">—</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right mono text-[13px] text-[#697386]">{pos.qty}</td>
                      <td className="py-3 px-3 text-right mono text-[13px] text-[#697386]">{formatCurrency(pos.entryPrice)}</td>
                      <td className="py-3 px-3 text-right mono text-[13px] text-[#1a1f36]">
                        {currentPrice ? formatCurrency(currentPrice) : <span className="text-[#a3acb9]">—</span>}
                      </td>
                      <td className={`py-3 px-3 text-right mono text-[13px] ${pnlColor(pnl)}`}>
                        {pnl != null ? formatPnL(pnl) : '—'}
                      </td>
                      <td className={`py-3 px-3 text-right mono text-[13px] ${pnlColor(pnlPct)}`}>
                        {pnlPct != null ? formatPnLPercent(pnlPct) : '—'}
                      </td>
                      <td className="py-3 px-5 text-right mono text-[13px] text-[#697386]">
                        {weight != null ? weight.toFixed(1) + '%' : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
