const directionConfig = {
  bullish: { label: 'Bullish', cls: 'bg-[#efffed] text-[#0abd5e]' },
  bearish: { label: 'Bearish', cls: 'bg-[#fff0f0] text-[#cd3d64]' },
  neutral: { label: 'Neutral', cls: 'bg-[#fff8e6] text-[#d97706]' },
};

const trendLabels = { rising: 'зростає', falling: 'падає', stable: 'стабільний' };
const trendIcons = { rising: '↑', falling: '↓', stable: '→' };
const trendColors = { rising: 'text-[#0abd5e]', falling: 'text-[#cd3d64]', stable: 'text-[#a3acb9]' };
const horizonLabels = { short: 'короткий', medium: 'середній', long: 'довгий' };

function ConvictionBar({ score }) {
  const color = score >= 65 ? '#0abd5e' : score >= 40 ? '#d97706' : '#cd3d64';
  return (
    <div className="w-full h-1 bg-[#f0f3f7] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  );
}

export default function AssetCard({ asset, technicals, onClick }) {
  const dir = directionConfig[asset.direction] || directionConfig.neutral;

  return (
    <div onClick={onClick} className="border border-[#e3e8ee] rounded-lg p-4 bg-white hover:border-[#d0d5dd] transition-colors cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center shrink-0">
            <span className="mono text-[11px] font-semibold text-[#1a1f36]">{asset.ticker}</span>
          </div>
          <div>
            <div className="text-[14px] font-medium text-[#1a1f36]">{asset.ticker}</div>
            <div className="text-[12px] text-[#697386]">{asset.name}</div>
          </div>
        </div>
        <div className={`text-[22px] font-semibold mono ${
          asset.conviction_score >= 65 ? 'text-[#0abd5e]' : asset.conviction_score >= 40 ? 'text-[#d97706]' : 'text-[#cd3d64]'
        }`}>
          {asset.conviction_score}
        </div>
      </div>

      <ConvictionBar score={asset.conviction_score} />

      <div className="flex items-center gap-2 mt-2.5">
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${dir.cls}`}>{dir.label}</span>
        <span className={`text-[12px] ${trendColors[asset.trend]}`}>{trendIcons[asset.trend]} {trendLabels[asset.trend]}</span>
      </div>

      {asset.our_view && (
        <div className="mt-3 text-[12px] text-[#697386] leading-relaxed border-t border-[#f0f3f7] pt-2.5 line-clamp-2">{asset.our_view}</div>
      )}

      {asset.theses?.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] uppercase tracking-wider text-[#a3acb9] mb-1">Тези</div>
          {asset.theses.slice(0, 3).map((t, i) => (
            <div key={i} className="text-[12px] text-[#697386] truncate">• {t}</div>
          ))}
        </div>
      )}

      {asset.risks?.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] uppercase tracking-wider text-[#a3acb9] mb-1">Ризики</div>
          {asset.risks.slice(0, 2).map((r, i) => (
            <div key={i} className="text-[12px] text-[#cd3d64] truncate">⚠ {r}</div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-[#f0f3f7] flex justify-between text-[11px] text-[#a3acb9]">
        <span>{asset.report_count} звітів</span>
        <span>{horizonLabels[asset.time_horizon] || asset.time_horizon} термін</span>
      </div>
    </div>
  );
}
