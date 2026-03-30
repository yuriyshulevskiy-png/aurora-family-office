import MarketHighlights from './MarketHighlights';
import PolymarketWidget from './PolymarketWidget';
import BreakingNews from './BreakingNews';

export default function DashboardView() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-6 space-y-5">
        <BreakingNews />
        <MarketHighlights />
        <PolymarketWidget />
      </div>
    </div>
  );
}
