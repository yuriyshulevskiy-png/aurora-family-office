import { useState } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { useConvictionStore } from '../store/convictionStore';
import { useAdvisorStore } from '../store/advisorStore';
import { getPortfolioAdvice } from '../services/portfolioAdvisor';
import { gatherMarketData } from '../services/verificationEngine';
import { formatCurrency } from '../utils/formatting';

const urgencyLabels = {
  now: { label: 'Зараз', cls: 'bg-[#efffed] text-[#0abd5e]' },
  wait_for_level: { label: 'Чекати рівня', cls: 'bg-[#fff8e6] text-[#d97706]' },
  watch: { label: 'Спостерігати', cls: 'bg-[#f6f9fc] text-[#697386]' },
  gradual: { label: 'Поступово', cls: 'bg-[#fff8e6] text-[#d97706]' },
};

function BuyCard({ rec }) {
  const urg = urgencyLabels[rec.urgency] || urgencyLabels.watch;
  const upside = rec.target_price && rec.entry_level
    ? (((rec.target_price - rec.entry_level) / rec.entry_level) * 100).toFixed(1)
    : null;

  return (
    <div className="border border-[#e3e8ee] rounded-lg p-4 bg-white hover:border-[#d0d5dd] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center">
            <span className="mono text-[11px] font-semibold text-[#1a1f36]">{rec.ticker}</span>
          </div>
          <div>
            <span className="mono font-semibold text-[#1a1f36] text-[14px]">{rec.ticker}</span>
            <span className="text-[12px] text-[#697386] ml-2">{rec.name}</span>
          </div>
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${urg.cls}`}>{urg.label}</span>
      </div>

      <div className="text-[13px] text-[#697386] mb-3 leading-relaxed">{rec.thesis}</div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] mb-3">
        <div className="flex justify-between">
          <span className="text-[#a3acb9]">Поточна</span>
          <span className="text-[#1a1f36] mono">{formatCurrency(rec.current_price)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#a3acb9]">Вхід</span>
          <span className="text-[#0abd5e] mono">{formatCurrency(rec.entry_level)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#a3acb9]">Ціль</span>
          <span className="text-[#0abd5e] mono">{formatCurrency(rec.target_price)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#a3acb9]">Стоп-лос</span>
          <span className="text-[#cd3d64] mono">{formatCurrency(rec.stop_loss)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#a3acb9]">Conviction</span>
          <span className="text-[#1a1f36] mono">{rec.conviction}/100</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#a3acb9]">Розмір</span>
          <span className="text-[#1a1f36] mono">{rec.position_size_pct}%</span>
        </div>
        {upside && (
          <div className="flex justify-between col-span-2">
            <span className="text-[#a3acb9]">Потенціал</span>
            <span className="text-[#0abd5e] mono">+{upside}%</span>
          </div>
        )}
      </div>
      <div className="text-[12px] text-[#a3acb9] leading-relaxed">{rec.entry_reason}</div>
    </div>
  );
}

function CashCard({ rec, onBuyBonds, isBought }) {
  const actionLabels = {
    hold_cash: { label: 'Тримати кеш', badge: '$', bg: 'bg-[#0abd5e]' },
    buy_bonds: { label: 'Купити облігації', badge: 'T', bg: 'bg-[#0ea5e9]' },
    deploy: { label: 'Інвестувати', badge: '↗', bg: 'bg-[#635bff]' },
  };
  const action = actionLabels[rec.action] || actionLabels.hold_cash;

  return (
    <div className="border border-[#e3e8ee] rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-lg ${action.bg} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>{action.badge}</div>
        <span className="text-[15px] font-semibold text-[#1a1f36]">{action.label}</span>
        {rec.bond_etf && <span className="text-[12px] text-[#697386] bg-[#f6f9fc] px-1.5 py-0.5 rounded mono">{rec.bond_etf}</span>}
      </div>
      <div className="text-[13px] text-[#697386] mb-2 leading-relaxed">{rec.reason}</div>
      <div className="text-[12px] text-[#a3acb9]">Алокація кешу: {rec.cash_allocation_pct}%</div>
      {rec.action === 'buy_bonds' && rec.bond_etf && onBuyBonds && (
        isBought ? (
          <div className="mt-3 w-full py-2 bg-[#efffed] text-[#0abd5e] text-[13px] font-medium rounded-lg text-center">
            ✓ {rec.bond_etf} додано
          </div>
        ) : (
          <button onClick={() => onBuyBonds(rec)} className="mt-3 w-full py-2 bg-[#635bff] hover:bg-[#5851db] text-white text-[13px] font-medium rounded-lg transition-colors">
            Купити {rec.bond_etf}
          </button>
        )
      )}
    </div>
  );
}

export default function AdvisorView() {
  const advice = useAdvisorStore((s) => s.advice);
  const setAdvice = useAdvisorStore((s) => s.setAdvice);
  const boughtArr = useAdvisorStore((s) => s.boughtTickers);
  const soldArr = useAdvisorStore((s) => s.soldTickers);
  const addBought = useAdvisorStore((s) => s.addBought);
  const addSold = useAdvisorStore((s) => s.addSold);
  const boughtTickers = new Set(boughtArr);
  const soldTickers = new Set(soldArr);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const positions = usePortfolioStore((s) => s.positions);
  const cash = usePortfolioStore((s) => s.cash);
  const prices = usePortfolioStore((s) => s.prices);
  const addPosition = usePortfolioStore((s) => s.addPosition);
  const removePosition = usePortfolioStore((s) => s.removePosition);
  const reducePosition = usePortfolioStore((s) => s.reducePosition);
  const convictionAssets = useConvictionStore((s) => s.assets);

  async function handleGetAdvice() {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const allAssets = Object.values(convictionAssets).map((a) => ({ ticker: a.ticker, name: a.name, asset_type: a.asset_type }));
      const marketData = {};
      for (const [ticker, priceData] of Object.entries(prices)) { marketData[ticker] = { prices: priceData, technicals: null, filings: [] }; }
      if (allAssets.length > 0) { const freshData = await gatherMarketData(allAssets); Object.assign(marketData, freshData); }
      const result = await getPortfolioAdvice({ positions, cash }, convictionAssets, marketData);
      setAdvice(result);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function calcPortfolioValue() { return cash + positions.reduce((s, p) => s + p.qty * (prices[p.ticker]?.price || p.entryPrice), 0); }

  function handleBuy(rec) {
    const totalValue = calcPortfolioValue();
    const positionValue = totalValue * ((rec.position_size_pct || 10) / 100);
    const realPrice = prices[rec.ticker]?.price;
    const price = realPrice || rec.current_price || rec.entry_level;
    if (!price || price <= 0) { setError(`Немає ціни для ${rec.ticker}`); return; }
    const qty = rec.asset_type === 'crypto' ? Math.round((positionValue / price) * 10000) / 10000 : Math.floor(positionValue / price);
    if (qty > 0 && price * qty <= cash) {
      addPosition({ ticker: rec.ticker, name: rec.name, qty, entryPrice: price, entryDate: new Date().toISOString().split('T')[0], type: rec.asset_type === 'crypto' ? 'crypto' : 'stock' });
      addBought(rec.ticker);
    }
  }

  function handleSell(rec) {
    const sellPct = rec.sell_pct || (rec.action === 'close' ? 100 : 50);
    if (sellPct >= 100) removePosition(rec.ticker); else reducePosition(rec.ticker, sellPct);
    addSold(rec.ticker);
  }

  function handleBuyBonds(cashRec) {
    const ticker = cashRec.bond_etf;
    const totalValue = calcPortfolioValue();
    const positionValue = totalValue * ((cashRec.cash_allocation_pct || 15) / 100);
    const price = prices[ticker]?.price;
    if (!price || price <= 0) { setError(`Немає ціни для ${ticker}`); return; }
    const qty = Math.floor(positionValue / price);
    if (qty > 0 && price * qty <= cash) {
      addPosition({ ticker, name: `${ticker} Bond ETF`, qty, entryPrice: price, entryDate: new Date().toISOString().split('T')[0], type: 'etf' });
      addBought(ticker);
    }
  }

  const hasConvictionData = Object.keys(convictionAssets).length > 0;

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-[#e3e8ee] px-8 py-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1a1f36] tracking-[-0.02em]">Портфельний радник</h1>
          <p className="text-[13px] text-[#a3acb9] mt-0.5">Аналізує тези, ринкові дані та пропонує дії</p>
        </div>
        <button
          onClick={handleGetAdvice}
          disabled={loading || !hasConvictionData}
          className="px-5 py-2.5 bg-[#635bff] hover:bg-[#5851db] disabled:bg-[#e3e8ee] disabled:text-[#a3acb9] text-white text-[13px] font-medium rounded-lg transition-colors"
        >
          {loading ? <span className="animate-pulse">🧠 Аналізую...</span> : 'Отримати рекомендації'}
        </button>
      </div>

      <div className="px-8 py-6 space-y-5">
        {!hasConvictionData && (
          <div className="border border-[#e3e8ee] rounded-lg bg-white p-8 text-center text-[13px] text-[#697386]">
            Спочатку завантажте звіт у розділі «Звіти».
          </div>
        )}

        {error && (
          <div className="text-[13px] text-[#cd3d64] bg-[#fff0f0] border border-[#f8d0d8] rounded-lg p-3">{error}</div>
        )}

        {advice && (
          <div className="space-y-5">
            {/* Model badge */}
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              advice._model?.includes('opus') ? 'bg-[#f0efff] text-[#635bff]' : 'bg-[#efffed] text-[#0abd5e]'
            }`}>
              {advice._model?.includes('opus') ? '🧠 Opus 4.6' : '⚡ Sonnet 4'}
            </span>

            {/* Market Assessment */}
            <div className="border border-[#e3e8ee] rounded-lg bg-white p-5">
              <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-1.5">Оцінка ринку</div>
              <div className="text-[14px] text-[#1a1f36] leading-relaxed">{advice.market_assessment}</div>
            </div>

            {/* Summary */}
            <div className="bg-[#f0efff] border border-[#d4d1f7] rounded-lg p-5">
              <div className="text-[11px] text-[#635bff] uppercase tracking-wider mb-1.5">Рекомендація</div>
              <div className="text-[14px] text-[#1a1f36] leading-relaxed">{advice.summary}</div>
            </div>

            {/* Cash */}
            {advice.cash_recommendation && (
              <div>
                <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-2 font-medium">Кеш та облігації</div>
                <CashCard rec={advice.cash_recommendation} onBuyBonds={handleBuyBonds} isBought={boughtTickers.has(advice.cash_recommendation.bond_etf)} />
              </div>
            )}

            {/* Buy */}
            {advice.buy_recommendations?.length > 0 && (
              <div>
                <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-2 font-medium">Купити ({advice.buy_recommendations.length})</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {advice.buy_recommendations.map((rec) => {
                    const alreadyOwned = boughtTickers.has(rec.ticker) || positions.some((p) => p.ticker === rec.ticker);
                    return (
                      <div key={rec.ticker} className={alreadyOwned ? 'opacity-40' : ''}>
                        <BuyCard rec={rec} />
                        {alreadyOwned ? (
                          <div className="mt-2 w-full py-2 bg-[#f6f9fc] text-[#a3acb9] text-[13px] font-medium rounded-lg text-center">✓ В портфелі</div>
                        ) : (rec.urgency === 'now' || rec.action === 'buy') && cash > 0 ? (
                          <button onClick={() => handleBuy(rec)} className="mt-2 w-full py-2 bg-[#0abd5e] hover:bg-[#09a553] text-white text-[13px] font-medium rounded-lg transition-colors">
                            Купити {rec.ticker} ({rec.position_size_pct}%)
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sell */}
            {advice.sell_recommendations?.length > 0 && (
              <div>
                <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-2 font-medium">Продати</div>
                <div className="space-y-2">
                  {advice.sell_recommendations.map((rec) => {
                    const pos = positions.find((p) => p.ticker === rec.ticker);
                    const isSold = !pos && soldTickers.has(rec.ticker);
                    const sellPct = rec.sell_pct || (rec.action === 'close' ? 100 : 50);
                    const isClose = sellPct >= 100 || rec.action === 'close';
                    return (
                      <div key={rec.ticker} className={`border border-[#f8d0d8] bg-[#fff0f0] rounded-lg p-4 ${isSold ? 'opacity-40' : ''}`}>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="mono font-semibold text-[#1a1f36] text-[14px]">{rec.ticker}</span>
                          <span className="text-[13px] text-[#697386] flex-1">{rec.reason}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${urgencyLabels[rec.urgency]?.cls || ''}`}>
                            {urgencyLabels[rec.urgency]?.label || rec.urgency}
                          </span>
                        </div>
                        {pos && !isSold && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[12px] text-[#a3acb9]">{pos.qty} шт @ {formatCurrency(pos.entryPrice)}</span>
                            <div className="flex-1" />
                            <button onClick={() => handleSell(rec)} className={`px-4 py-1.5 text-white text-[12px] font-medium rounded-lg transition-colors ${isClose ? 'bg-[#cd3d64] hover:bg-[#b53358]' : 'bg-[#d97706] hover:bg-[#c26a05]'}`}>
                              {isClose ? 'Закрити' : `Скоротити ${sellPct}%`}
                            </button>
                          </div>
                        )}
                        {isSold && <div className="mt-2 text-center text-[12px] text-[#cd3d64]">✓ Виконано</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rebalance */}
            {advice.rebalance_actions?.length > 0 && (
              <div>
                <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-2 font-medium">Ребалансування</div>
                <div className="space-y-2">
                  {advice.rebalance_actions.map((action, i) => (
                    <div key={i} className="border border-[#e3e8ee] rounded-lg p-4 flex items-center gap-3 bg-white">
                      <span className="text-[13px] text-[#697386] mono">{action.from_ticker}</span>
                      <span className="text-[#a3acb9]">→</span>
                      <span className="text-[13px] text-[#1a1f36] mono font-medium">{action.to_ticker}</span>
                      <span className="text-[13px] text-[#697386] flex-1">{action.reason}</span>
                      <span className="text-[12px] text-[#a3acb9] mono">{action.pct_of_portfolio}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
