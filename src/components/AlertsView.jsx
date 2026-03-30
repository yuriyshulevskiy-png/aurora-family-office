import { useState } from 'react';
import AlertCard from './AlertCard';

export default function AlertsView({ alerts }) {
  const [dismissed, setDismissed] = useState(new Set());
  const visibleAlerts = alerts.filter((a) => !dismissed.has(`${a.ticker}-${a.type}`));
  const rebalanceAlerts = visibleAlerts.filter((a) => a.type === 'reversal' || a.type === 'low_conviction');
  const opportunities = visibleAlerts.filter((a) => a.type === 'opportunity');

  function handleDismiss(alert) { setDismissed((prev) => new Set([...prev, `${alert.ticker}-${alert.type}`])); }

  return (
    <div className="flex-1 overflow-auto px-8 py-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[15px] font-semibold text-[#1a1f36]">Ребалансування</h2>
          {rebalanceAlerts.length > 0 && <span className="text-[11px] bg-[#fff0f0] text-[#cd3d64] px-2 py-0.5 rounded-full font-medium">{rebalanceAlerts.length}</span>}
        </div>
        {rebalanceAlerts.length === 0 ? (
          <div className="text-[13px] text-[#697386] border border-[#e3e8ee] rounded-lg bg-white p-6 text-center">Немає сповіщень.</div>
        ) : (
          <div className="space-y-2">{rebalanceAlerts.map((a, i) => <AlertCard key={i} alert={a} onDismiss={handleDismiss} />)}</div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[15px] font-semibold text-[#1a1f36]">Можливості</h2>
          {opportunities.length > 0 && <span className="text-[11px] bg-[#efffed] text-[#0abd5e] px-2 py-0.5 rounded-full font-medium">{opportunities.length}</span>}
        </div>
        {opportunities.length === 0 ? (
          <div className="text-[13px] text-[#697386] border border-[#e3e8ee] rounded-lg bg-white p-6 text-center">Немає можливостей.</div>
        ) : (
          <div className="space-y-2">{opportunities.map((a, i) => <AlertCard key={i} alert={a} onDismiss={handleDismiss} />)}</div>
        )}
      </div>
    </div>
  );
}
