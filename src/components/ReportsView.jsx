import { useState } from 'react';
import { useReportsStore } from '../store/reportsStore';
import ReportUploader from './ReportUploader';

const STATUS_MAP = {
  confirmed: { label: 'Підтверджено', color: 'text-[#0abd5e]', icon: '✓' },
  weakened: { label: 'Послаблено', color: 'text-[#d97706]', icon: '~' },
  refuted: { label: 'Спростовано', color: 'text-[#cd3d64]', icon: '✗' },
  unverifiable: { label: 'Не перевірено', color: 'text-[#a3acb9]', icon: '?' },
};

function VerifiedAssetDetail({ asset }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="mono font-semibold text-[#1a1f36] text-[13px]">{asset.ticker}</span>
        <span className="text-[13px] text-[#697386]">{asset.name}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
          asset.direction === 'bullish' ? 'bg-[#efffed] text-[#0abd5e]' :
          asset.direction === 'bearish' ? 'bg-[#fff0f0] text-[#cd3d64]' : 'bg-[#fff8e6] text-[#d97706]'
        }`}>
          {asset.direction === 'bullish' ? 'Bullish' : asset.direction === 'bearish' ? 'Bearish' : 'Neutral'}
        </span>
        <span className="text-[12px] text-[#a3acb9]">{asset.conviction}/100</span>
      </div>

      {asset.our_view && (
        <div className="mb-2 bg-[#f0efff] border border-[#d4d1f7] rounded-lg p-3">
          <div className="text-[11px] text-[#635bff] uppercase tracking-wider mb-0.5">Позиція Opus</div>
          <div className="text-[12px] text-[#1a1f36] leading-relaxed">{asset.our_view}</div>
        </div>
      )}

      {asset.verified_theses?.length > 0 && (
        <div className="space-y-1 mb-2">
          {asset.verified_theses.map((vt, i) => {
            const s = STATUS_MAP[vt.status] || STATUS_MAP.unverifiable;
            return (
              <div key={i} className="flex items-start gap-2 bg-[#f6f9fc] rounded-lg p-2.5">
                <span className={`text-[12px] mt-0.5 font-medium ${s.color}`}>{s.icon}</span>
                <div className="flex-1">
                  <span className="text-[12px] text-[#1a1f36]">{vt.thesis}</span>
                  <span className={`text-[11px] ml-2 ${s.color}`}>{s.label}</span>
                  {vt.evidence && <p className="text-[11px] text-[#a3acb9] mt-0.5 leading-relaxed">{vt.evidence}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {asset.key_theses?.length > 0 && (
        <div className="mb-2">
          <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-1">Тези</div>
          {asset.key_theses.map((t, i) => <div key={i} className="text-[12px] text-[#697386] ml-2">• {t}</div>)}
        </div>
      )}

      {asset.risks?.length > 0 && (
        <div className="mb-2">
          <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-1">Ризики</div>
          {asset.risks.map((r, i) => <div key={i} className="text-[12px] text-[#cd3d64] ml-2">• {r}</div>)}
        </div>
      )}

      {asset.additional_insights?.length > 0 && (
        <div className="mb-2">
          <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-1">Інсайти</div>
          {asset.additional_insights.map((ins, i) => <div key={i} className="text-[12px] text-[#635bff] ml-2">• {ins}</div>)}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report, isExpanded, onToggle }) {
  const hasVerification = !!report.verified;
  const verifiedAssets = report.verified?.assets || [];
  const originalAssets = report.extraction?.assets || [];
  const statusCounts = {};
  for (const a of verifiedAssets) { for (const vt of a.verified_theses || []) { statusCounts[vt.status] = (statusCounts[vt.status] || 0) + 1; } }

  return (
    <div className={`border border-[#e3e8ee] rounded-lg overflow-hidden bg-white transition-all ${isExpanded ? 'ring-1 ring-[#635bff]/20' : ''}`}>
      <div onClick={onToggle} className="px-5 py-4 cursor-pointer hover:bg-[#fafbfd] transition-colors">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center shrink-0">
              <span className="text-[15px]">◫</span>
            </div>
            <div>
              <span className="text-[14px] font-medium text-[#1a1f36]">{report.source || 'Невідоме джерело'}</span>
              <span className="text-[12px] text-[#a3acb9] ml-2">{report.date || 'Без дати'}</span>
            </div>
            {hasVerification && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                report.verified?._model?.includes('opus') ? 'bg-[#f0efff] text-[#635bff]' : 'bg-[#efffed] text-[#0abd5e]'
              }`}>
                {report.verified?._model?.includes('opus') ? '🧠 Opus' : '✓ Verified'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {statusCounts.confirmed > 0 && <span className="text-[11px] text-[#0abd5e] bg-[#efffed] px-1.5 py-0.5 rounded-full">✓{statusCounts.confirmed}</span>}
            {statusCounts.weakened > 0 && <span className="text-[11px] text-[#d97706] bg-[#fff8e6] px-1.5 py-0.5 rounded-full">~{statusCounts.weakened}</span>}
            {statusCounts.refuted > 0 && <span className="text-[11px] text-[#cd3d64] bg-[#fff0f0] px-1.5 py-0.5 rounded-full">✗{statusCounts.refuted}</span>}
            {report.tickersExtracted?.map((t) => (
              <span key={t} className="text-[11px] mono bg-[#f6f9fc] text-[#697386] px-1.5 py-0.5 rounded">{t}</span>
            ))}
            <span className={`text-[#a3acb9] transition-transform duration-150 ml-2 ${isExpanded ? 'rotate-90' : ''}`}>›</span>
          </div>
        </div>
        <div className="text-[13px] text-[#697386] ml-11 leading-relaxed">{report.verified?.summary || report.summary}</div>
      </div>

      {isExpanded && (
        <div className="border-t border-[#e3e8ee] px-5 py-4 bg-[#fafbfd]">
          {hasVerification ? (
            <div>
              {report.verified.macro_signals?.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] text-[#a3acb9] uppercase tracking-wider mb-2">Макросигнали</div>
                  {report.verified.macro_signals.map((ms, i) => (
                    <div key={i} className="bg-white border border-[#e3e8ee] rounded-lg p-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[12px] ${ms.direction === 'positive' ? 'text-[#0abd5e]' : ms.direction === 'negative' ? 'text-[#cd3d64]' : 'text-[#d97706]'}`}>
                          {ms.direction === 'positive' ? '▲' : ms.direction === 'negative' ? '▼' : '►'}
                        </span>
                        <span className="text-[13px] text-[#1a1f36] font-medium">{ms.theme}</span>
                        <span className="text-[11px] text-[#a3acb9]">[{ms.affected_assets?.join(', ')}]</span>
                      </div>
                      <p className="text-[12px] text-[#697386] mt-1 ml-5 leading-relaxed">{ms.description}</p>
                    </div>
                  ))}
                </div>
              )}
              {verifiedAssets.map((asset) => <VerifiedAssetDetail key={asset.ticker} asset={asset} />)}
            </div>
          ) : (
            <div>
              {originalAssets.map((asset) => (
                <div key={asset.ticker} className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="mono font-semibold text-[#1a1f36] text-[13px]">{asset.ticker}</span>
                    <span className="text-[12px] text-[#697386]">{asset.name}</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                      asset.direction === 'bullish' ? 'bg-[#efffed] text-[#0abd5e]' : asset.direction === 'bearish' ? 'bg-[#fff0f0] text-[#cd3d64]' : 'bg-[#fff8e6] text-[#d97706]'
                    }`}>{asset.direction}</span>
                    <span className="text-[12px] text-[#a3acb9]">{asset.conviction}/100</span>
                  </div>
                  {asset.key_theses?.map((t, i) => <div key={i} className="text-[12px] text-[#697386] ml-2">• {t}</div>)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportsView() {
  const reports = useReportsStore((s) => s.reports);
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-[#e3e8ee] px-8 py-6">
        <h1 className="text-[22px] font-semibold text-[#1a1f36] tracking-[-0.02em]">Звіти</h1>
        <p className="text-[13px] text-[#a3acb9] mt-0.5">Завантажте аналітичні звіти для обробки AI</p>
      </div>
      <div className="px-8 py-6 space-y-5">
        <ReportUploader />
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-[#1a1f36]">Оброблені звіти ({reports.length})</h2>
          </div>
          {reports.length === 0 ? (
            <div className="text-center text-[#697386] py-10 border border-[#e3e8ee] rounded-lg bg-white text-[13px]">
              <div className="mb-1">Ще немає оброблених звітів.</div>
              <div className="text-[#a3acb9]">Завантажте файл або вставте текст для аналізу.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} isExpanded={expandedId === report.id} onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
