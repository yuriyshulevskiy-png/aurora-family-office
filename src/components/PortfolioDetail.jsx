import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend as RLegend,
} from 'recharts';
import { usePortfolioStore, computePortfolioMetrics } from '../store/portfolioStore';
import { useConvictionStore } from '../store/convictionStore';
import { useHistoryStore } from '../store/historyStore';
import { formatCurrency, formatPnL, formatPnLPercent, pnlColor } from '../utils/formatting';

const COLORS = ['#635bff', '#0abd5e', '#d97706', '#cd3d64', '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b'];

const directionBadge = {
  bullish: { label: 'Bullish', cls: 'bg-[#efffed] text-[#0abd5e]' },
  bearish: { label: 'Bearish', cls: 'bg-[#fff0f0] text-[#cd3d64]' },
  neutral: { label: 'Neutral', cls: 'bg-[#fff8e6] text-[#d97706]' },
};

/* ─── Portfolio Chart with tooltip ─── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e3e8ee] rounded-lg p-3 text-[12px] shadow-sm">
      <div className="text-[#a3acb9] mb-1.5 text-[11px]">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#697386]">{p.name}:</span>
          <span className="mono text-[#1a1f36] font-medium">
            {typeof p.value === 'number' ? (p.name === 'Портфель $' ? formatCurrency(p.value) : `${p.value > 0 ? '+' : ''}${p.value.toFixed(2)}%`) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function PortfolioChart() {
  const snapshots = useHistoryStore((s) => s.snapshots);
  const benchmarks = useHistoryStore((s) => s.benchmarks);
  const initialValue = useHistoryStore((s) => s.initialValue);

  const chartData = useMemo(() => {
    if (snapshots.length === 0) return [];
    return snapshots.map((snap) => {
      const entry = {
        date: snap.date.slice(5),
        fullDate: snap.date,
        'Портфель $': snap.value,
        'Портфель %': Math.round(((snap.value - initialValue) / initialValue) * 10000) / 100,
      };
      if (benchmarks.SPY?.length > 0) {
        const spyMatch = benchmarks.SPY.find((b) => b.date === snap.date);
        const spyFirst = benchmarks.SPY[0];
        if (spyMatch && spyFirst) {
          entry['S&P 500'] = Math.round(((spyMatch.price - spyFirst.price) / spyFirst.price) * 10000) / 100;
        }
      }
      return entry;
    });
  }, [snapshots, benchmarks, initialValue]);

  if (chartData.length < 2) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-[#697386] text-[14px] mb-1">Portfolio Chart</div>
          <div className="text-[#a3acb9] text-[12px]">Графік будується після 2+ днів даних</div>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f3f7" />
        <XAxis dataKey="date" tick={{ fill: '#a3acb9', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e3e8ee' }} />
        <YAxis
          yAxisId="value"
          tick={{ fill: '#a3acb9', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#e3e8ee' }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
        />
        <Tooltip content={<ChartTooltip />} />
        <Line yAxisId="value" type="monotone" dataKey="Портфель $" stroke="#635bff" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ─── Donut pie legend ─── */
function DonutLabel({ viewBox, total }) {
  if (!viewBox || !viewBox.cx) return null;
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-6" fill="#a3acb9" fontSize={11}>Баланс</tspan>
      <tspan x={cx} dy="18" fill="#1a1f36" fontSize={15} fontWeight={600}>{formatCurrency(total)}</tspan>
    </text>
  );
}

/* ─── Main Component ─── */
export default function PortfolioDetail() {
  const positions = usePortfolioStore((s) => s.positions);
  const prices = usePortfolioStore((s) => s.prices);
  const cash = usePortfolioStore((s) => s.cash);
  const pricesLoading = usePortfolioStore((s) => s.pricesLoading);
  const assets = useConvictionStore((s) => s.assets);
  const [expandedTicker, setExpandedTicker] = useState(null);

  const metrics = useMemo(() => computePortfolioMetrics(positions, prices, cash), [positions, prices, cash]);
  const totalInvested = useMemo(() => positions.reduce((s, p) => s + p.qty * p.entryPrice, 0), [positions]);
  const totalMarket = useMemo(() => positions.reduce((s, p) => s + p.qty * (prices[p.ticker]?.price || p.entryPrice), 0), [positions, prices]);
  const totalPnL = totalMarket - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  // Position data enriched
  const positionsData = useMemo(() => {
    return positions.map((p) => {
      const currentPrice = prices[p.ticker]?.price || p.entryPrice;
      const marketValue = p.qty * currentPrice;
      const costBasis = p.qty * p.entryPrice;
      const pnl = marketValue - costBasis;
      const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      const weight = metrics.totalValue > 0 ? (marketValue / metrics.totalValue) * 100 : 0;
      const asset = assets[p.ticker];
      return { ...p, currentPrice, marketValue, costBasis, pnl, pnlPct, weight, asset };
    }).sort((a, b) => b.marketValue - a.marketValue);
  }, [positions, prices, metrics.totalValue, assets]);

  // Performance: top gainer / top loser
  const topGainer = useMemo(() => positionsData.reduce((best, p) => (!best || p.pnl > best.pnl) ? p : best, null), [positionsData]);
  const topLoser = useMemo(() => positionsData.reduce((worst, p) => (!worst || p.pnl < worst.pnl) ? p : worst, null), [positionsData]);

  // Donut chart data
  const donutData = useMemo(() => {
    const data = positionsData.map((p) => ({ name: p.ticker, value: p.marketValue }));
    if (cash > 0) data.push({ name: 'Кеш', value: cash });
    return data;
  }, [positionsData, cash]);

  const isEmpty = positions.length === 0;

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-6 space-y-4">

        {/* ─── ROW 1: Balance + Portfolio Chart ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
          {/* Balance Card */}
          <div className="border border-[#e3e8ee] rounded-lg bg-white p-5">
            <div className="text-[13px] text-[#a3acb9] mb-1">Current Balance</div>
            <div className="text-[32px] font-semibold text-[#1a1f36] mono tracking-tight leading-tight">
              {formatCurrency(metrics.totalValue)}
            </div>
            <div className={`text-[13px] mono mt-0.5 ${pnlColor(totalPnL)}`}>
              {formatPnLPercent(totalPnLPct)} {formatPnL(totalPnL)}
            </div>

            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#697386]">Total Profit</span>
                <span className={`mono text-[13px] font-medium ${pnlColor(totalPnL)}`}>{formatPnL(totalPnL)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#697386]">Unrealised P&L</span>
                <span className={`mono text-[13px] font-medium ${pnlColor(totalPnL)}`}>{formatPnL(totalPnL)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#697386]">Total Invested</span>
                <span className="mono text-[13px] text-[#1a1f36]">{formatCurrency(totalInvested)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#697386]">Cash</span>
                <span className="mono text-[13px] text-[#1a1f36]">{formatCurrency(cash)}</span>
              </div>
            </div>
          </div>

          {/* Portfolio Chart */}
          <div className="border border-[#e3e8ee] rounded-lg bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[15px] font-semibold text-[#1a1f36]">Portfolio Chart</span>
            </div>
            <div className="h-[220px]">
              <PortfolioChart />
            </div>
          </div>
        </div>

        {/* ─── ROW 2: Performance + Holdings Donut ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
          {/* Performance */}
          <div className="border border-[#e3e8ee] rounded-lg bg-white p-5">
            <div className="text-[15px] font-semibold text-[#1a1f36] mb-3">Performance</div>
            {isEmpty ? (
              <div className="text-[13px] text-[#a3acb9] text-center py-6">Немає позицій</div>
            ) : (
              <div className="space-y-3">
                {/* Top Gainer */}
                {topGainer && (
                  <div className="flex items-center gap-3 p-3 bg-[#efffed] rounded-lg">
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#b4e6c4] flex items-center justify-center shrink-0">
                      <span className="mono text-[11px] font-semibold text-[#0abd5e]">{topGainer.ticker}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[#0abd5e] uppercase tracking-wider">Top Gainer</div>
                      <div className="text-[13px] font-medium text-[#1a1f36]">{topGainer.name || topGainer.ticker}</div>
                    </div>
                    <div className="text-right">
                      <div className="mono text-[14px] font-medium text-[#0abd5e]">{formatPnL(topGainer.pnl)}</div>
                      <div className="mono text-[11px] text-[#0abd5e]">{formatPnLPercent(topGainer.pnlPct)}</div>
                    </div>
                  </div>
                )}
                {/* Top Loser */}
                {topLoser && topLoser.ticker !== topGainer?.ticker && (
                  <div className="flex items-center gap-3 p-3 bg-[#fff0f0] rounded-lg">
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#f8d0d8] flex items-center justify-center shrink-0">
                      <span className="mono text-[11px] font-semibold text-[#cd3d64]">{topLoser.ticker}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[#cd3d64] uppercase tracking-wider">Top Loser</div>
                      <div className="text-[13px] font-medium text-[#1a1f36]">{topLoser.name || topLoser.ticker}</div>
                    </div>
                    <div className="text-right">
                      <div className="mono text-[14px] font-medium text-[#cd3d64]">{formatPnL(topLoser.pnl)}</div>
                      <div className="mono text-[11px] text-[#cd3d64]">{formatPnLPercent(topLoser.pnlPct)}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Holdings Donut */}
          <div className="border border-[#e3e8ee] rounded-lg bg-white p-5">
            <div className="text-[15px] font-semibold text-[#1a1f36] mb-2">Holdings</div>
            {isEmpty && cash === 100000 ? (
              <div className="text-[13px] text-[#a3acb9] text-center py-10">Портфель порожній</div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-[200px] h-[200px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <text x="50%" y="45%" textAnchor="middle" fill="#a3acb9" fontSize={11}>Баланс</text>
                      <text x="50%" y="58%" textAnchor="middle" fill="#1a1f36" fontSize={14} fontWeight={600}>{formatCurrency(metrics.totalValue)}</text>
                      <Tooltip
                        formatter={(value, name) => [formatCurrency(value), name]}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e3e8ee' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {donutData.map((item, i) => {
                    const pct = metrics.totalValue > 0 ? ((item.value / metrics.totalValue) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={item.name} className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[13px] text-[#1a1f36] font-medium mono">{item.name}</span>
                        <span className="text-[12px] text-[#a3acb9] ml-auto mono">{pct}%</span>
                        <span className="text-[12px] text-[#697386] mono w-24 text-right">{formatCurrency(item.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── ROW 3: Your Assets table ─── */}
        <div className="border border-[#e3e8ee] rounded-lg bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e3e8ee]">
            <span className="text-[15px] font-semibold text-[#1a1f36]">Your Assets</span>
            <span className="text-[12px] text-[#a3acb9]">{positions.length} активів</span>
          </div>

          {isEmpty ? (
            <div className="text-center py-10 px-6">
              <div className="text-[#697386] text-[15px] mb-1">Портфель порожній</div>
              <div className="text-[13px] text-[#a3acb9]">Завантажте звіт у розділі «Звіти» для аналізу.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e3e8ee] text-[11px] uppercase tracking-wider text-[#a3acb9]">
                    <th className="text-left px-5 py-2.5 font-medium">Asset</th>
                    <th className="text-right px-3 py-2.5 font-medium">Price</th>
                    <th className="text-right px-3 py-2.5 font-medium">Conviction</th>
                    <th className="text-right px-3 py-2.5 font-medium">Total Invested</th>
                    <th className="text-right px-3 py-2.5 font-medium">Avg. Price</th>
                    <th className="text-right px-3 py-2.5 font-medium">Current Profit</th>
                    <th className="text-right px-5 py-2.5 font-medium">Holdings</th>
                  </tr>
                </thead>
                <tbody>
                  {positionsData.map((p) => {
                    const dir = directionBadge[p.asset?.direction] || directionBadge.neutral;
                    return (
                      <tr
                        key={p.ticker}
                        onClick={() => setExpandedTicker(expandedTicker === p.ticker ? null : p.ticker)}
                        className="border-b border-[#f0f3f7] hover:bg-[#fafbfd] transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center shrink-0">
                              <span className="mono text-[10px] font-semibold text-[#1a1f36]">{p.ticker}</span>
                            </div>
                            <div>
                              <div className="text-[13px] font-medium text-[#1a1f36]">{p.ticker}</div>
                              <div className="text-[11px] text-[#a3acb9]">{p.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <div className="mono text-[13px] text-[#1a1f36]">{formatCurrency(p.currentPrice)}</div>
                          {p.asset && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${dir.cls}`}>{dir.label}</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          {p.asset ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{
                                backgroundColor: p.asset.conviction_score >= 65 ? '#0abd5e' : p.asset.conviction_score >= 40 ? '#d97706' : '#cd3d64'
                              }} />
                              <span className="mono text-[13px] text-[#1a1f36]">{p.asset.conviction_score}</span>
                            </div>
                          ) : (
                            <span className="text-[13px] text-[#a3acb9]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-right mono text-[13px] text-[#697386]">{formatCurrency(p.costBasis)}</td>
                        <td className="px-3 py-3.5 text-right mono text-[13px] text-[#697386]">{formatCurrency(p.entryPrice)}</td>
                        <td className="px-3 py-3.5 text-right">
                          <div className={`mono text-[13px] font-medium ${pnlColor(p.pnl)}`}>{formatPnL(p.pnl)}</div>
                          <div className={`mono text-[11px] ${pnlColor(p.pnlPct)}`}>{formatPnLPercent(p.pnlPct)}</div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="mono text-[13px] text-[#1a1f36] font-medium">{formatCurrency(p.marketValue)}</div>
                          <div className="mono text-[11px] text-[#a3acb9]">{p.qty} {p.ticker}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Expanded row details */}
          {expandedTicker && (() => {
            const p = positionsData.find((x) => x.ticker === expandedTicker);
            if (!p) return null;
            return (
              <div className="border-t border-[#e3e8ee] bg-[#fafbfd] px-5 py-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                  <div>
                    <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-0.5">Вага в портфелі</div>
                    <div className="mono text-[14px] text-[#1a1f36]">{p.weight.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-0.5">Куплено</div>
                    <div className="text-[14px] text-[#1a1f36]">{p.entryDate || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-0.5">Тренд</div>
                    <div className="text-[14px]">
                      {p.asset?.trend === 'rising' && <span className="text-[#0abd5e]">↑ Зростає</span>}
                      {p.asset?.trend === 'falling' && <span className="text-[#cd3d64]">↓ Падає</span>}
                      {p.asset?.trend === 'stable' && <span className="text-[#a3acb9]">→ Стабільний</span>}
                      {!p.asset?.trend && <span className="text-[#a3acb9]">—</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-0.5">Conviction Score</div>
                    <div className="mono text-[14px] text-[#1a1f36]">{p.asset ? `${p.asset.conviction_score}/100` : '—'}</div>
                  </div>
                </div>
                {p.asset?.our_view && (
                  <div className="bg-[#f0efff] rounded-lg p-3 mt-2">
                    <div className="text-[11px] text-[#635bff] uppercase tracking-wider mb-1">Позиція Opus</div>
                    <div className="text-[12px] text-[#1a1f36] leading-relaxed">{p.asset.our_view}</div>
                  </div>
                )}
                {p.asset?.theses?.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-1">Ключові тези</div>
                    {p.asset.theses.slice(0, 3).map((t, i) => (
                      <div key={i} className="text-[12px] text-[#697386] flex items-start gap-1.5">
                        <span className="text-[#d0d5dd] mt-px">•</span><span>{t}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
