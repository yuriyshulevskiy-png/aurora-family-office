const severityConfig = {
  high: { bg: 'bg-[#fff0f0]', border: 'border-[#f8d0d8]', icon: '⚠', text: 'text-[#cd3d64]' },
  medium: { bg: 'bg-[#fff8e6]', border: 'border-[#f5e1a4]', icon: '◆', text: 'text-[#d97706]' },
  info: { bg: 'bg-[#efffed]', border: 'border-[#b4e6c4]', icon: '◈', text: 'text-[#0abd5e]' },
};

const directionLabels = {
  bullish: { label: 'Bullish', cls: 'text-[#0abd5e]' },
  bearish: { label: 'Bearish', cls: 'text-[#cd3d64]' },
  neutral: { label: 'Neutral', cls: 'text-[#d97706]' },
};

const messageTranslations = {
  'Conviction reversed on': 'Переконання змінилось для',
  'Review position.': 'Переглянте позицію.',
  'Consider reducing': 'Розгляньте зменшення',
  'conviction at': 'переконання на рівні',
  'High conviction on': 'Високе переконання для',
  'Not in portfolio.': 'Відсутній у портфелі.',
};

function translateMessage(msg) {
  let result = msg;
  for (const [en, ua] of Object.entries(messageTranslations)) result = result.replace(en, ua);
  return result;
}

export default function AlertCard({ alert, onDismiss }) {
  const config = severityConfig[alert.severity] || severityConfig.info;
  const dir = directionLabels[alert.direction] || directionLabels.neutral;

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-3.5 flex items-start gap-2.5`}>
      <span className={`${config.text} text-[18px] mt-0.5`}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="mono text-[13px] font-semibold text-[#1a1f36]">{alert.ticker}</span>
          <span className="text-[12px] text-[#697386]">{alert.name}</span>
          <span className={`text-[12px] mono ${config.text}`}>{alert.score}/100</span>
          <span className={`text-[11px] ${dir.cls}`}>• {dir.label}</span>
        </div>
        <div className="text-[13px] text-[#1a1f36] mb-1 leading-relaxed">{translateMessage(alert.message)}</div>
        {alert.theses?.length > 0 && (
          <div className="text-[12px] text-[#697386]">
            {alert.theses.map((t, i) => <span key={i}>{i > 0 ? ' · ' : ''}{t}</span>)}
          </div>
        )}
      </div>
      {onDismiss && <button onClick={() => onDismiss(alert)} className="text-[#a3acb9] hover:text-[#697386] text-[12px]">✕</button>}
    </div>
  );
}
