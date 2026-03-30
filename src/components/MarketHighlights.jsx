import { useState, useEffect, useCallback } from 'react';
import { fetchStockPrices, fetchExtendedPrices, fetchOHLCV } from '../services/yahooFinance';
import { formatCurrency } from '../utils/formatting';

/* ─── DropsTab-style badge icon ─── */
function Badge({ bg, text, children, size = 'sm' }) {
  const sizes = {
    xs: 'w-4 h-4 text-[8px] rounded',
    sm: 'w-5 h-5 text-[9px] rounded-md',
    md: 'w-6 h-6 text-[10px] rounded-lg',
  };
  return (
    <div className={`${sizes[size]} ${bg} ${text} flex items-center justify-center font-bold shrink-0 leading-none`}>
      {children}
    </div>
  );
}

const MARKET_TICKERS = {
  SPX: { label: 'S&P 500', group: 'index' },
  'BTC-USD': { label: 'Bitcoin', group: 'crypto' },
  GOLD: { label: 'Gold', group: 'commodity' },
  BRENT: { label: 'Oil Brent', group: 'commodity' },
  TNX: { label: 'US 10Y Yield', group: 'bond' },
};

const SECTOR_TICKERS = ['XLK', 'XLE', 'XLV', 'GLD', 'XLF'];
const SECTOR_META = {
  XLK: { label: 'Tech' },
  XLE: { label: 'Energy' },
  XLV: { label: 'Healthcare' },
  GLD: { label: 'Gold' },
  XLF: { label: 'Financials' },
};

const BADGE_CONFIG = {
  SPX: { bg: 'bg-[#dc2626]', text: 'text-white', label: '500' },
  'BTC-USD': { bg: 'bg-[#f59e0b]', text: 'text-white', label: '₿' },
  GOLD: { bg: 'bg-[#d97706]', text: 'text-white', label: 'Au' },
  BRENT: { bg: 'bg-[#1a1f36]', text: 'text-white', label: '▲' },
  TNX: { bg: 'bg-[#0ea5e9]', text: 'text-white', label: '%' },
  XLK: { bg: 'bg-[#3b82f6]', text: 'text-white', label: '⌘' },
  XLE: { bg: 'bg-[#16a34a]', text: 'text-white', label: '⚡' },
  XLV: { bg: 'bg-[#dc2626]', text: 'text-white', label: '+' },
  GLD: { bg: 'bg-[#d97706]', text: 'text-white', label: 'Au' },
  XLF: { bg: 'bg-[#6366f1]', text: 'text-white', label: '$' },
  VIX: { bg: 'bg-[#ef4444]', text: 'text-white', label: '⚡' },
  MOVE: { bg: 'bg-[#8b5cf6]', text: 'text-white', label: '~' },
};

function getFearGreedFromVix(vixPrice) {
  if (!vixPrice) return { score: null, label: '—' };
  let score;
  if (vixPrice <= 12) score = 90;
  else if (vixPrice <= 15) score = 75;
  else if (vixPrice <= 20) score = 60;
  else if (vixPrice <= 25) score = 45;
  else if (vixPrice <= 30) score = 30;
  else if (vixPrice <= 35) score = 18;
  else score = 8;
  let label;
  if (score >= 75) label = 'Extreme Greed';
  else if (score >= 55) label = 'Greed';
  else if (score >= 45) label = 'Neutral';
  else if (score >= 25) label = 'Fear';
  else label = 'Extreme Fear';
  return { score, label };
}

function getFearGreedColor(score) {
  if (score >= 75) return '#0abd5e';
  if (score >= 55) return '#5cb85c';
  if (score >= 45) return '#d97706';
  if (score >= 25) return '#e67e22';
  return '#cd3d64';
}

function ChangeText({ value }) {
  if (value == null) return null;
  return (
    <span className={`mono text-[12px] ${value >= 0 ? 'text-[#0abd5e]' : 'text-[#cd3d64]'}`}>
      {value >= 0 ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

function ChangeCell({ value, width = 'w-[56px]' }) {
  if (value == null) return <span className={`mono text-[13px] text-[#a3acb9] ${width} text-right`}>—</span>;
  return (
    <span className={`mono text-[13px] ${width} text-right font-medium ${value >= 0 ? 'text-[#0abd5e]' : 'text-[#cd3d64]'}`}>
      {value >= 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

function TickerBadge({ ticker, size = 'sm' }) {
  const cfg = BADGE_CONFIG[ticker];
  if (!cfg) return null;
  return <Badge bg={cfg.bg} text={cfg.text} size={size}>{cfg.label}</Badge>;
}

/* ─── SVG Sparkline with gradient fill ─── */
let sparklineId = 0;
function Sparkline({ data, width = 200, height = 50 }) {
  if (!data || data.length < 2) return null;
  const closes = data.map(d => d.close).filter(Boolean);
  if (closes.length < 2) return null;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const coords = closes.map((v, i) => {
    const x = (i / (closes.length - 1)) * width;
    const y = height - ((v - min) / range) * (height * 0.85) - height * 0.05;
    return { x, y };
  });
  const points = coords.map(c => `${c.x},${c.y}`).join(' ');
  const isUp = closes[closes.length - 1] >= closes[0];
  const lineColor = isUp ? '#0abd5e' : '#cd3d64';
  const gradId = `spark-grad-${sparklineId++}`;
  // Build closed polygon for fill: line points + bottom-right + bottom-left
  const areaPath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
    + ` L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline fill="none" stroke={lineColor} strokeWidth="1.5" points={points} />
    </svg>
  );
}

export { TickerBadge, Badge, BADGE_CONFIG };

export default function MarketHighlights() {
  const [data, setData] = useState({});
  const [sectorData, setSectorData] = useState({});
  const [vixData, setVixData] = useState(null);
  const [spxChart, setSpxChart] = useState([]);
  const [btcChart, setBtcChart] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [prices, extSectors, chartData, btcChartData] = await Promise.all([
        fetchStockPrices([...Object.keys(MARKET_TICKERS), 'VIX', 'MOVE', 'ES-F']),
        fetchExtendedPrices(SECTOR_TICKERS),
        fetchOHLCV('SPX', 30),
        fetchOHLCV('BTC-USD', 30),
      ]);
      setData(prices);
      setSectorData(extSectors);
      setSpxChart(chartData);
      setBtcChart(btcChartData);
      if (prices.VIX) setVixData(prices.VIX);
    } catch (err) {
      console.error('Market highlights fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fearGreed = getFearGreedFromVix(vixData?.price);
  const fgColor = getFearGreedColor(fearGreed.score);

  const sectors = SECTOR_TICKERS
    .map((ticker) => ({
      ...SECTOR_META[ticker],
      ticker,
      price: sectorData[ticker]?.price,
      change: sectorData[ticker]?.change24h,
      change7d: sectorData[ticker]?.change7d,
      change30d: sectorData[ticker]?.change30d,
    }))
    .sort((a, b) => (b.change || 0) - (a.change || 0));

  const btcPrice = data['BTC-USD']?.price;
  const tnxYield = data.TNX?.price;

  // S&P 500: show futures (ES) when market is closed
  const isMarketOpen = (() => {
    const now = new Date();
    const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = et.getDay(); // 0=Sun, 6=Sat
    const h = et.getHours();
    const m = et.getMinutes();
    const mins = h * 60 + m;
    // Market open: Mon-Fri, 9:30 AM - 4:00 PM ET
    return day >= 1 && day <= 5 && mins >= 570 && mins < 960;
  })();
  const spxSource = isMarketOpen
    ? data.SPX
    : (data['ES-F'] || data.SPX);
  const spxLabel = isMarketOpen ? 'S&P 500' : 'S&P 500 Futures';
  const spxTag = isMarketOpen ? null : 'ES';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[5fr_3fr_5fr] gap-3">
      {/* LEFT: 2×2 price cards like DropsTab */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* S&P 500 / Futures with sparkline */}
        <div className="border border-[#e3e8ee] rounded-xl bg-white p-3.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <TickerBadge ticker="SPX" size="md" />
            <span className="text-[12px] text-[#a3acb9]">{spxLabel}</span>
            {spxTag && <span className="text-[9px] font-bold text-[#e67e22] bg-[#fff8e6] px-1 py-0.5 rounded">FUTURES</span>}
          </div>
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className="mono text-[20px] font-semibold text-[#1a1f36]">
              {spxSource?.price ? spxSource.price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
            </span>
            <ChangeText value={spxSource?.change24h} />
          </div>
          <div className="h-[48px]">
            <Sparkline data={spxChart} width={200} height={48} />
          </div>
        </div>

        {/* Bitcoin with sparkline */}
        <div className="border border-[#e3e8ee] rounded-xl bg-white p-3.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <TickerBadge ticker="BTC-USD" size="md" />
            <span className="text-[12px] text-[#a3acb9]">Bitcoin</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className="mono text-[20px] font-semibold text-[#1a1f36]">
              {btcPrice ? `$${btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
            </span>
            <ChangeText value={data['BTC-USD']?.change24h} />
          </div>
          <div className="h-[48px]">
            <Sparkline data={btcChart} width={200} height={48} />
          </div>
        </div>

        {/* Gold */}
        <div className="border border-[#e3e8ee] rounded-xl bg-white p-3.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <TickerBadge ticker="GOLD" size="md" />
            <span className="text-[12px] text-[#a3acb9]">Gold</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="mono text-[18px] font-semibold text-[#1a1f36]">
              {data.GOLD?.price ? formatCurrency(data.GOLD.price) : '—'}
            </span>
            <ChangeText value={data.GOLD?.change24h} />
          </div>
        </div>

        {/* Oil + US 10Y side by side in bottom row */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="border border-[#e3e8ee] rounded-xl bg-white p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <TickerBadge ticker="BRENT" />
              <span className="text-[11px] text-[#a3acb9]">Oil</span>
            </div>
            <span className="mono text-[15px] font-semibold text-[#1a1f36] block">
              {data.BRENT?.price ? formatCurrency(data.BRENT.price) : '—'}
            </span>
            <ChangeText value={data.BRENT?.change24h} />
          </div>
          <div className="border border-[#e3e8ee] rounded-xl bg-white p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <TickerBadge ticker="TNX" />
              <span className="text-[11px] text-[#a3acb9]">10Y</span>
            </div>
            <span className="mono text-[15px] font-semibold text-[#1a1f36] block">
              {tnxYield != null ? `${tnxYield.toFixed(2)}%` : '—'}
            </span>
            <ChangeText value={data.TNX?.change24h} />
          </div>
        </div>
      </div>

      {/* CENTER: Fear & Greed + VIX + MOVE stacked */}
      <div className="flex flex-col gap-2.5 min-w-[150px]">
        {/* Fear & Greed */}
        <div className="border border-[#e3e8ee] rounded-xl bg-white p-3.5 flex-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Badge bg="bg-[#e67e22]" text="text-white" size="sm">◎</Badge>
            <span className="text-[12px] text-[#a3acb9]">Fear & Greed</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="mono text-[22px] font-semibold" style={{ color: fgColor }}>{fearGreed.score ?? '—'}</span>
            <span className="text-[12px] font-medium" style={{ color: fgColor }}>{fearGreed.label}</span>
          </div>
        </div>

        {/* VIX */}
        <div className="border border-[#e3e8ee] rounded-xl bg-white p-3.5 flex-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TickerBadge ticker="VIX" size="sm" />
            <span className="text-[12px] text-[#a3acb9]">VIX</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="mono text-[20px] font-semibold text-[#1a1f36]">
              {vixData?.price != null ? vixData.price.toFixed(1) : '—'}
            </span>
            <ChangeText value={vixData?.change24h} />
          </div>
        </div>

        {/* MOVE */}
        <div className="border border-[#e3e8ee] rounded-xl bg-white p-3.5 flex-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TickerBadge ticker="MOVE" size="sm" />
            <span className="text-[12px] text-[#a3acb9]">MOVE</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="mono text-[20px] font-semibold text-[#1a1f36]">
              {data.MOVE?.price != null ? data.MOVE.price.toFixed(1) : '—'}
            </span>
            <ChangeText value={data.MOVE?.change24h} />
          </div>
        </div>
      </div>

      {/* RIGHT: Sectors */}
      <div className="border border-[#e3e8ee] rounded-lg bg-white p-4">
        <div className="flex items-center mb-3">
          <span className="text-[15px] font-semibold text-[#1a1f36] flex-1">Top Sectors (ETF)</span>
          <div className="flex">
            <span className="text-[11px] text-[#a3acb9] w-[56px] text-right">24h</span>
            <span className="text-[11px] text-[#a3acb9] w-[56px] text-right">7d</span>
            <span className="text-[11px] text-[#a3acb9] w-[56px] text-right">30d</span>
          </div>
        </div>
        <div>
          {sectors.map((s) => (
            <div key={s.ticker} className="flex items-center gap-2.5 py-[7px] border-b border-[#f0f3f7] last:border-0">
              <TickerBadge ticker={s.ticker} size="md" />
              <span className="text-[14px] font-medium text-[#1a1f36] flex-1">{s.label}</span>
              <span className="mono text-[14px] font-semibold text-[#1a1f36] w-[70px] text-right">{s.price != null ? formatCurrency(s.price) : '—'}</span>
              <ChangeCell value={s.change} width="w-[56px]" />
              <ChangeCell value={s.change7d} width="w-[56px]" />
              <ChangeCell value={s.change30d} width="w-[56px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
