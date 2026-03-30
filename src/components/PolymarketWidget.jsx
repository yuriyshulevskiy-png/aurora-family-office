import { useState, useEffect, useCallback } from 'react';
import { fetchPolymarketData } from '../services/polymarket';

/* ─── Probability bar ─── */
function ProbBar({ value, color = '#635bff' }) {
  return (
    <div className="h-[6px] w-full bg-[#f0f3f7] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(value || 0, 100)}%`, background: color }}
      />
    </div>
  );
}

/* ─── Short label extractor ─── */
function shortLabel(question) {
  // "Russia x Ukraine ceasefire by June 30, 2026?" → "by Jun 30, 2026"
  // "Will no Fed rate cuts happen in 2026?" → "No cuts"
  // "US x Iran ceasefire by April 30?" → "by Apr 30"
  const byMatch = question.match(/by\s+(.+?)(?:\s*\?|$)/i);
  if (byMatch) return `by ${byMatch[1].replace(/\?$/, '')}`;

  const cutMatch = question.match(/(?:will\s+)?(\d+|no)\s+(?:fed\s+)?(?:rate\s+)?cut/i);
  if (cutMatch) {
    const n = cutMatch[1].toLowerCase();
    return n === 'no' ? '0 cuts' : `${n} cut${n === '1' ? '' : 's'}`;
  }

  return question.replace(/\?$/, '').slice(0, 30);
}

/* ─── Color by probability ─── */
function probColor(pct) {
  if (pct >= 60) return '#0abd5e';
  if (pct >= 30) return '#e67e22';
  return '#cd3d64';
}

/* ─── Event card ─── */
function EventCard({ icon, iconBg, title, markets, maxShow = 5 }) {
  if (!markets || markets.length === 0) return null;

  const shown = markets.slice(0, maxShow);

  return (
    <div className="border border-[#e3e8ee] rounded-xl bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-lg ${iconBg} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
          {icon}
        </div>
        <span className="text-[13px] font-medium text-[#1a1f36]">{title}</span>
      </div>

      <div className="space-y-2.5">
        {shown.map((m) => (
          <div key={m.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-[#697386]">{m.label || shortLabel(m.question)}</span>
              <span className="mono text-[13px] font-semibold" style={{ color: probColor(m.yesPct) }}>
                {m.yesPct != null ? `${m.yesPct.toFixed(1)}%` : '—'}
              </span>
            </div>
            <ProbBar value={m.yesPct} color={probColor(m.yesPct)} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PolymarketWidget() {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await fetchPolymarketData();
      setData(result);
    } catch (err) {
      console.error('Polymarket widget error:', err);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 300000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [load]);

  if (!data) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md bg-[#1a1f36] flex items-center justify-center text-white text-[9px] font-bold">P</div>
        <span className="text-[14px] font-semibold text-[#1a1f36]">Prediction Markets</span>
        <span className="text-[11px] text-[#a3acb9]">Polymarket</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <EventCard
          icon="🇺🇦"
          iconBg="bg-[#3b82f6]"
          title="Russia x Ukraine Ceasefire"
          markets={data['russia-ukraine']?.markets}
          maxShow={4}
        />
        <EventCard
          icon="🇮🇷"
          iconBg="bg-[#ef4444]"
          title="US x Iran Ceasefire"
          markets={data['us-iran']?.markets}
          maxShow={5}
        />
        <EventCard
          icon="$"
          iconBg="bg-[#0abd5e]"
          title="Fed Rate Cuts 2026"
          markets={data['fed-cuts']?.markets}
          maxShow={5}
        />
      </div>
    </div>
  );
}
