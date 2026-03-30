import { useState, useMemo } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { useReportsStore } from '../store/reportsStore';
import { useConvictionStore } from '../store/convictionStore';
import { formatCurrency } from '../utils/formatting';

const TAB_ITEMS = [
  { id: 'activity', label: 'Активність' },
  { id: 'recommendations', label: 'Рекомендації' },
];

function ActivityCard({ item }) {
  const iconStyles = {
    buy: { bg: 'bg-[#0abd5e]', icon: '↑' },
    sell: { bg: 'bg-[#cd3d64]', icon: '↓' },
    report: { bg: 'bg-[#697386]', icon: '▤' },
    recommendation: { bg: 'bg-[#635bff]', icon: '◉' },
    alert: { bg: 'bg-[#d97706]', icon: '!' },
  };
  const style = iconStyles[item.type] || iconStyles.report;

  return (
    <div className="flex gap-3 py-3 border-b border-[#f0f3f7] last:border-0">
      <div className={`w-7 h-7 rounded-lg ${style.bg} flex items-center justify-center shrink-0 mt-0.5`}>
        <span className="text-[12px] text-white font-bold">{style.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {item.badge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              item.badge.includes('Opus') ? 'bg-[#f0efff] text-[#635bff]' : 'bg-[#efffed] text-[#0abd5e]'
            }`}>{item.badge}</span>
          )}
          <span className="text-[11px] text-[#a3acb9]">{item.time}</span>
        </div>
        <div className="text-[13px] font-medium text-[#1a1f36] leading-snug">{item.title}</div>
        {item.description && (
          <div className="text-[12px] text-[#697386] mt-0.5 leading-relaxed line-clamp-2">{item.description}</div>
        )}
        {item.link && (
          <div className="text-[12px] text-[#635bff] mt-1 cursor-pointer hover:underline">{item.link}</div>
        )}
      </div>
    </div>
  );
}

function RecommendationCard({ asset }) {
  const color = asset.conviction_score >= 65 ? '#0abd5e' : asset.conviction_score >= 40 ? '#d97706' : '#cd3d64';
  const dirBadge = {
    bullish: { label: 'Bullish', cls: 'bg-[#efffed] text-[#0abd5e]' },
    bearish: { label: 'Bearish', cls: 'bg-[#fff0f0] text-[#cd3d64]' },
    neutral: { label: 'Neutral', cls: 'bg-[#fff8e6] text-[#d97706]' },
  };
  const dir = dirBadge[asset.direction] || dirBadge.neutral;

  return (
    <div className="border border-[#e3e8ee] rounded-lg p-3 bg-white hover:border-[#d0d5dd] transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="mono text-[13px] font-semibold text-[#1a1f36]">{asset.ticker}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${dir.cls}`}>{dir.label}</span>
        </div>
        <span className="mono text-[15px] font-semibold" style={{ color }}>{asset.conviction_score}</span>
      </div>
      <div className="text-[12px] text-[#697386]">{asset.name}</div>
      {asset.our_view && (
        <div className="text-[11px] text-[#697386] mt-2 line-clamp-3 leading-relaxed">{asset.our_view}</div>
      )}
      {asset.theses?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#f0f3f7]">
          {asset.theses.slice(0, 2).map((t, i) => (
            <div key={i} className="text-[11px] text-[#a3acb9] truncate">• {t}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ActivityFeed({ alerts }) {
  const [activeTab, setActiveTab] = useState('activity');
  const positions = usePortfolioStore((s) => s.positions);
  const reports = useReportsStore((s) => s.reports);
  const assets = useConvictionStore((s) => s.assets);

  // Build activity items from positions, reports, and alerts
  const activityItems = useMemo(() => {
    const items = [];

    // Positions as buy events
    for (const pos of positions) {
      items.push({
        type: 'buy',
        time: pos.entryDate || 'Сьогодні',
        title: `Куплено ${pos.ticker} × ${pos.qty}`,
        description: `Ціна входу ${formatCurrency(pos.entryPrice)}. ${pos.name || ''}`,
        sortDate: pos.entryDate || new Date().toISOString(),
      });
    }

    // Reports as events
    for (const report of reports) {
      items.push({
        type: 'report',
        time: report.date || 'Сьогодні',
        title: `Оброблено звіт: ${report.source || 'Невідомий'}`,
        description: `Витягнуто ${report.tickersExtracted?.length || 0} активів. ${report.verified ? 'Opus верифікував тези.' : ''}`,
        badge: report.verified?._model?.includes('opus') ? 'Opus 4.6' : null,
        sortDate: report.date || new Date().toISOString(),
      });
    }

    // Alerts as events
    for (const alert of (alerts || [])) {
      items.push({
        type: 'alert',
        time: 'Зараз',
        title: `${alert.ticker}: ${alert.type === 'opportunity' ? 'Можливість' : 'Увага'}`,
        description: alert.message,
        sortDate: new Date().toISOString(),
      });
    }

    return items.sort((a, b) => (b.sortDate || '').localeCompare(a.sortDate || ''));
  }, [positions, reports, alerts]);

  // Recommendation items from conviction assets
  const recommendationAssets = useMemo(() => {
    return Object.values(assets)
      .sort((a, b) => b.conviction_score - a.conviction_score);
  }, [assets]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab header */}
      <div className="px-5 pt-5 pb-0 border-b border-[#e3e8ee]">
        <div className="flex gap-4">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-[13px] pb-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-[#1a1f36] border-[#635bff] font-medium'
                  : 'text-[#a3acb9] border-transparent hover:text-[#697386]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-2">
        {activeTab === 'activity' && (
          activityItems.length === 0 ? (
            <div className="text-center text-[#a3acb9] text-[13px] py-10">
              Поки немає активності. Завантажте звіт, щоб почати.
            </div>
          ) : (
            activityItems.map((item, i) => <ActivityCard key={i} item={item} />)
          )
        )}

        {activeTab === 'recommendations' && (
          recommendationAssets.length === 0 ? (
            <div className="text-center text-[#a3acb9] text-[13px] py-10">
              Немає рекомендацій. Завантажте звіт для аналізу.
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {recommendationAssets.map((asset) => (
                <RecommendationCard key={asset.ticker} asset={asset} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
