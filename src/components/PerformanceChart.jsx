import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { useHistoryStore } from '../store/historyStore';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e3e8ee] rounded-lg p-3 text-[12px] shadow-sm">
      <div className="text-[#a3acb9] mb-1.5 text-[11px]">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#697386]">{p.name}:</span>
          <span className="font-mono text-[#1a1f36] font-medium">{p.value > 0 ? '+' : ''}{p.value.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}

export default function PerformanceChart() {
  const snapshots = useHistoryStore((s) => s.snapshots);
  const benchmarks = useHistoryStore((s) => s.benchmarks);
  const initialValue = useHistoryStore((s) => s.initialValue);

  const chartData = useMemo(() => {
    if (snapshots.length === 0) return [];
    return snapshots.map((snap) => {
      const portfolioReturn = ((snap.value - initialValue) / initialValue) * 100;
      const entry = {
        date: snap.date.slice(5),
        fullDate: snap.date,
        'Портфель': Math.round(portfolioReturn * 100) / 100,
      };
      if (benchmarks.SPY?.length > 0) {
        const spyMatch = benchmarks.SPY.find((b) => b.date === snap.date);
        const spyFirst = benchmarks.SPY[0];
        if (spyMatch && spyFirst) {
          entry['S&P 500'] = Math.round(((spyMatch.price - spyFirst.price) / spyFirst.price) * 10000) / 100;
        }
      }
      if (benchmarks.VT?.length > 0) {
        const vtMatch = benchmarks.VT.find((b) => b.date === snap.date);
        const vtFirst = benchmarks.VT[0];
        if (vtMatch && vtFirst) {
          entry['Світові акції'] = Math.round(((vtMatch.price - vtFirst.price) / vtFirst.price) * 10000) / 100;
        }
      }
      return entry;
    });
  }, [snapshots, benchmarks, initialValue]);

  if (chartData.length < 2) {
    return (
      <div className="border border-[#e3e8ee] rounded-lg bg-white p-6 text-center">
        <div className="text-[#697386] text-[14px] mb-1">Графік доходності</div>
        <div className="text-[#a3acb9] text-[13px]">
          Потрібно мінімум 2 дні даних. Графік будується автоматично щодня.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#e3e8ee] rounded-lg bg-white p-5">
      <div className="text-[13px] text-[#697386] uppercase tracking-wider mb-4 font-medium">
        Динаміка доходності (%)
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f3f7" />
          <XAxis dataKey="date" tick={{ fill: '#a3acb9', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e3e8ee' }} />
          <YAxis tick={{ fill: '#a3acb9', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e3e8ee' }} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#697386' }} />
          <ReferenceLine y={0} stroke="#e3e8ee" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="Портфель" stroke="#635bff" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
          <Line type="monotone" dataKey="S&P 500" stroke="#0abd5e" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="Світові акції" stroke="#a3acb9" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
