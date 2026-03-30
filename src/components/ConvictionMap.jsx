import { useState, useMemo } from 'react';
import { useConvictionStore } from '../store/convictionStore';
import AssetCard from './AssetCard';

const SORT_OPTIONS = [
  { id: 'conviction', label: 'За переконанням' },
  { id: 'recent', label: 'За зміною' },
  { id: 'name', label: 'За назвою' },
];

export default function ConvictionMap({ technicals }) {
  const [sortBy, setSortBy] = useState('conviction');
  const assets = useConvictionStore((s) => s.assets);

  const sorted = useMemo(() => {
    const arr = Object.values(assets);
    return [...arr].sort((a, b) => {
      if (sortBy === 'conviction') return b.conviction_score - a.conviction_score;
      if (sortBy === 'recent') return (b.last_updated || 0) - (a.last_updated || 0);
      return a.ticker.localeCompare(b.ticker);
    });
  }, [assets, sortBy]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-[#e3e8ee] px-8 py-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1a1f36] tracking-[-0.02em]">Карта переконань</h1>
          <p className="text-[13px] text-[#a3acb9] mt-0.5">{sorted.length} активів відстежується</p>
        </div>
        <div className="flex gap-1 bg-[#f6f9fc] rounded-lg p-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`text-[12px] px-3 py-1.5 rounded-md transition-colors ${
                sortBy === opt.id
                  ? 'bg-white text-[#1a1f36] font-medium shadow-sm'
                  : 'text-[#697386] hover:text-[#1a1f36]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sorted.map((asset) => (
            <AssetCard key={asset.ticker} asset={asset} technicals={technicals?.[asset.ticker]} />
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="text-center text-[#697386] py-16 text-[13px]">
            Активи ще не відстежуються. Завантажте звіт, щоб почати.
          </div>
        )}
      </div>
    </div>
  );
}
