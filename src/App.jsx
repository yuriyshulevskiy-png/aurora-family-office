import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import PortfolioDetail from './components/PortfolioDetail';
import AdvisorView from './components/AdvisorView';
import PLView from './components/PLView';
import ConvictionMap from './components/ConvictionMap';
import ReportsView from './components/ReportsView';
import DashboardView from './components/DashboardView';
import ActivityFeed from './components/ActivityFeed';
import { useHistoryStore } from './store/historyStore';
import { usePortfolioStore } from './store/portfolioStore';
import { useConvictionStore } from './store/convictionStore';
import { fetchCryptoPrices } from './services/coinGecko';
import { fetchStockPrices } from './services/yahooFinance';
import { suggestRebalance } from './services/convictionEngine';

function ErrorBoundaryFallback({ error, onReset }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="bg-white border border-[#e3e8ee] rounded-lg p-6 max-w-md text-center">
        <div className="text-[#cd3d64] text-[15px] font-medium mb-2">Щось пішло не так</div>
        <div className="text-[13px] text-[#697386] mb-4">{error?.message || 'Невідома помилка'}</div>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-[#635bff] text-white text-[13px] font-medium rounded-md hover:bg-[#5851db] transition-colors"
        >
          Спробувати знову
        </button>
      </div>
    </div>
  );
}

const selectPositions = (s) => s.positions;
const selectPrices = (s) => s.prices;
const selectSetPrices = (s) => s.setPrices;
const selectSetPricesLoading = (s) => s.setPricesLoading;
const selectAssets = (s) => s.assets;

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [technicals] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const fetchingRef = useRef(false);

  const positions = usePortfolioStore(selectPositions);
  const prices = usePortfolioStore(selectPrices);
  const cash = usePortfolioStore((s) => s.cash);
  const setPrices = usePortfolioStore(selectSetPrices);
  const setPricesLoading = usePortfolioStore(selectSetPricesLoading);
  const convictionAssets = useConvictionStore(selectAssets);
  const addSnapshot = useHistoryStore((s) => s.addSnapshot);
  const setBenchmarks = useHistoryStore((s) => s.setBenchmarks);

  const fetchPrices = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setPricesLoading(true);
    try {
      const positionTickers = positions.map((p) => ({ ticker: p.ticker, type: p.type }));
      const convictionTickers = Object.values(convictionAssets).map((a) => ({
        ticker: a.ticker,
        type: a.asset_type === 'crypto' ? 'crypto' : 'stock',
      }));

      const allTickers = [...positionTickers, ...convictionTickers];
      const uniqueCrypto = [...new Set(allTickers.filter((t) => t.type === 'crypto').map((t) => t.ticker))];
      const uniqueStocks = [...new Set(allTickers.filter((t) => t.type !== 'crypto').map((t) => t.ticker))];

      const [cryptoPrices, stockPrices] = await Promise.allSettled([
        uniqueCrypto.length > 0 ? fetchCryptoPrices(uniqueCrypto) : {},
        uniqueStocks.length > 0 ? fetchStockPrices(uniqueStocks) : {},
      ]);

      const allPrices = {
        ...(cryptoPrices.status === 'fulfilled' ? cryptoPrices.value : {}),
        ...(stockPrices.status === 'fulfilled' ? stockPrices.value : {}),
      };

      setPrices(allPrices);

      const totalPositionValue = positions.reduce((sum, p) => {
        const price = allPrices[p.ticker]?.price;
        return sum + (price ? p.qty * price : 0);
      }, 0);
      addSnapshot({ value: totalPositionValue + cash, cash });

      try {
        const benchmarkPrices = await fetchStockPrices(['SPY', 'VT']);
        const today = new Date().toISOString().split('T')[0];
        const newBenchmarks = {};
        if (benchmarkPrices.SPY?.price) {
          newBenchmarks.SPY = [{ date: today, price: benchmarkPrices.SPY.price }];
        }
        if (benchmarkPrices.VT?.price) {
          newBenchmarks.VT = [{ date: today, price: benchmarkPrices.VT.price }];
        }
        if (Object.keys(newBenchmarks).length > 0) {
          setBenchmarks(newBenchmarks);
        }
      } catch { /* benchmarks are optional */ }
    } catch (err) {
      console.error('Price fetch error:', err);
    } finally {
      fetchingRef.current = false;
    }
  }, [positions, convictionAssets, cash, setPrices, setPricesLoading, addSnapshot, setBenchmarks]);

  useEffect(() => {
    const newAlerts = suggestRebalance(positions, convictionAssets);
    setAlerts(newAlerts);
  }, [positions, convictionAssets, prices]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  if (error) {
    return (
      <div className="flex min-h-screen bg-[#f6f9fc]">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <ErrorBoundaryFallback error={error} onReset={() => setError(null)} />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'portfolio':
        return <PortfolioDetail />;
      case 'advisor':
        return <AdvisorView />;
      case 'pl':
        return <PLView />;
      case 'conviction':
        return <ConvictionMap technicals={technicals} />;
      case 'reports':
        return <ReportsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f6f9fc]">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="flex-1 flex min-w-0">
        {/* Center content — scrollable, max-width centered */}
        <div className="flex-1 min-w-0 overflow-auto">
          <div className="max-w-[1340px] mx-auto min-h-screen flex flex-col">
            {renderContent()}
          </div>
        </div>
        {/* Right activity feed */}
        <aside className="w-[300px] shrink-0 border-l border-[#e3e8ee] bg-white overflow-auto hidden xl:block">
          <ActivityFeed alerts={alerts} />
        </aside>
      </main>
    </div>
  );
}
