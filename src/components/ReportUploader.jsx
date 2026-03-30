import { useState, useRef } from 'react';
import { parseReportWithClaude } from '../services/claudeApi';
import { fullAnalysisPipeline } from '../services/verificationEngine';
import { processLargeDocument } from '../services/chunkProcessor';
import { useReportsStore } from '../store/reportsStore';
import { useConvictionStore } from '../store/convictionStore';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

const MAX_TEXT_LENGTH = 2000000;

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Помилка читання файлу'));
    reader.readAsText(file);
  });
}

async function readPdfAsText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(' '));
  }
  return pages.join('\n\n');
}

const STEPS = [
  { key: 'compressing', label: 'Стискаю документ...', model: 'Sonnet 4' },
  { key: 'parsing', label: 'Витягую тези...', model: 'Sonnet 4' },
  { key: 'gathering', label: 'Збираю ринкові дані...', model: null },
  { key: 'verifying', label: 'Opus формує позицію...', model: 'Opus 4.6' },
  { key: 'complete', label: 'Готово!' },
];

export default function ReportUploader() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const fileInputRef = useRef(null);
  const addReport = useReportsStore((s) => s.addReport);
  const updateAssetConviction = useConvictionStore((s) => s.updateAssetConviction);

  async function handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const supported = ['txt', 'md', 'csv', 'json', 'rtf', 'pdf'];
    if (!supported.includes(ext)) { setError(`Формат .${ext} не підтримується`); return; }
    try {
      setError(null); setFileName(file.name); setLoadingFile(true);
      let content = ext === 'pdf' ? await readPdfAsText(file) : await readFileAsText(file);
      if (content.length > MAX_TEXT_LENGTH) { content = content.slice(0, MAX_TEXT_LENGTH); setError('Файл обрізано до 2M символів.'); }
      setText(content);
    } catch (err) { setError(`Помилка: ${err.message}`); }
    finally { setLoadingFile(false); }
  }

  function handleDrop(e) { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }
  function handleFileInput(e) { handleFile(e.target.files[0]); }

  async function handleAnalyze() {
    const content = text.trim();
    if (!content || analyzing) return;
    setAnalyzing(true); setError(null); setLastResult(null); setCurrentStep('parsing');
    try {
      let processedContent = content;
      if (content.length > 50000) {
        setCurrentStep('compressing');
        processedContent = await processLargeDocument(content, () => {});
      }
      setCurrentStep('parsing');
      const extraction = await parseReportWithClaude(processedContent);
      if (!extraction.assets?.length) throw new Error('Звіт не містить даних про активи.');
      const result = await fullAnalysisPipeline(extraction, (step) => setCurrentStep(step));
      const verifiedAssets = result.verified?.assets || extraction.assets;
      for (const asset of verifiedAssets) {
        updateAssetConviction(asset.ticker, {
          ticker: asset.ticker, name: asset.name, asset_type: asset.asset_type, direction: asset.direction,
          conviction: asset.conviction, key_theses: asset.key_theses || [], risks: asset.risks || [],
          our_view: asset.our_view || null, price_target: asset.price_target, catalysts: asset.catalysts || [],
          time_horizon: asset.time_horizon, source: extraction.report_source,
        }, extraction.report_date || new Date().toISOString().split('T')[0], extraction.report_source);
      }
      addReport({
        source: extraction.report_source, date: extraction.report_date,
        summary: result.verified?.summary || extraction.summary, extraction, verified: result.verified,
        marketData: result.marketData, rawText: content.slice(0, 500),
        tickersExtracted: verifiedAssets.map((a) => a.ticker), fileName,
      });
      setLastResult(result); setText(''); setFileName(null); setCurrentStep('complete');
    } catch (err) { setError(err.message); setCurrentStep(null); }
    finally { setAnalyzing(false); }
  }

  function clearFile() { setText(''); setFileName(null); setError(null); setLastResult(null); setCurrentStep(null); if (fileInputRef.current) fileInputRef.current.value = ''; }

  const activeStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="border border-[#e3e8ee] rounded-lg bg-white p-5">
      <div className="text-[14px] font-semibold text-[#1a1f36] mb-3">Завантажити звіт</div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-5 mb-3 text-center transition-colors ${
          dragOver ? 'border-[#635bff] bg-[#f0efff]' : 'border-[#e3e8ee] hover:border-[#d0d5dd]'
        }`}
      >
        <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,.rtf,.pdf" onChange={handleFileInput} className="hidden" id="file-upload" />
        {fileName ? (
          <div className="flex items-center justify-center gap-3">
            <span className="text-[13px] text-[#635bff]"><span className="text-[16px]">📄</span> {fileName}</span>
            {loadingFile && <span className="text-[12px] text-[#d97706] animate-pulse">Читаю...</span>}
            <button onClick={clearFile} className="text-[12px] text-[#a3acb9] hover:text-[#697386]">✕</button>
          </div>
        ) : (
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="text-[#697386] text-[13px]"><span className="text-[#635bff] hover:underline">Оберіть файл</span> або перетягніть</div>
            <div className="text-[11px] text-[#a3acb9] mt-0.5">TXT, MD, CSV, JSON, PDF</div>
          </label>
        )}
      </div>

      <textarea
        value={text} onChange={(e) => { setText(e.target.value); if (!e.target.value) setFileName(null); }}
        placeholder="Або вставте текст звіту..."
        className="w-full h-28 bg-[#f6f9fc] border border-[#e3e8ee] rounded-lg p-3 text-[13px] text-[#1a1f36] placeholder-[#a3acb9] resize-none focus:outline-none focus:border-[#635bff] focus:ring-1 focus:ring-[#635bff]/20 transition-colors"
        disabled={analyzing}
      />

      <div className="flex items-center justify-between mt-3">
        <div className="text-[12px] text-[#a3acb9]">{text.length > 0 ? `${text.length} символів` : 'Аналітичні звіти, earnings calls'}</div>
        <button onClick={handleAnalyze} disabled={!text.trim() || analyzing || loadingFile}
          className="px-5 py-2.5 bg-[#635bff] hover:bg-[#5851db] disabled:bg-[#e3e8ee] disabled:text-[#a3acb9] text-white text-[13px] font-medium rounded-lg transition-colors">
          {analyzing ? 'Аналізую...' : 'Аналізувати'}
        </button>
      </div>

      {currentStep && currentStep !== 'complete' && (
        <div className="mt-4 bg-[#f6f9fc] border border-[#e3e8ee] rounded-lg p-4 space-y-2">
          {STEPS.slice(0, -1).map((step, i) => {
            const isActive = step.key === currentStep;
            const isDone = i < activeStepIndex;
            if (step.key === 'compressing' && text.length <= 50000 && !isDone && !isActive) return null;
            return (
              <div key={step.key} className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 ${
                  isDone ? 'bg-[#0abd5e] text-white' : isActive ? 'bg-[#635bff] text-white animate-pulse' : 'bg-[#e3e8ee] text-[#a3acb9]'
                }`}>{isDone ? '✓' : i + 1}</div>
                <span className={`text-[13px] ${isDone ? 'text-[#0abd5e]' : isActive ? 'text-[#635bff]' : 'text-[#a3acb9]'}`}>
                  {step.label}
                  {step.model && isActive && <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${
                    step.model.includes('Opus') ? 'bg-[#f0efff] text-[#635bff]' : 'bg-[#efffed] text-[#0abd5e]'
                  }`}>{step.model}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {lastResult?.verified && (
        <div className="mt-4 bg-[#efffed] border border-[#b4e6c4] rounded-lg p-4">
          <div className="text-[13px] font-medium text-[#0abd5e] mb-2">✓ Верифікація завершена</div>
          <p className="text-[13px] text-[#1a1f36] mb-2 leading-relaxed">{lastResult.verified.summary}</p>
          {lastResult.verified.assets?.map((asset) => (
            <div key={asset.ticker} className="mb-2 last:mb-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="mono font-semibold text-[13px] text-[#1a1f36]">{asset.ticker}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  asset.direction === 'bullish' ? 'bg-[#efffed] text-[#0abd5e]' : asset.direction === 'bearish' ? 'bg-[#fff0f0] text-[#cd3d64]' : 'bg-[#fff8e6] text-[#d97706]'
                }`}>{asset.direction === 'bullish' ? 'Bullish' : asset.direction === 'bearish' ? 'Bearish' : 'Neutral'}</span>
                <span className="text-[12px] text-[#a3acb9]">{asset.conviction}/100</span>
              </div>
              {asset.verified_theses?.map((vt, i) => (
                <div key={i} className="flex items-start gap-1.5 ml-2 mb-0.5">
                  <span className={`text-[12px] ${vt.status === 'confirmed' ? 'text-[#0abd5e]' : vt.status === 'weakened' ? 'text-[#d97706]' : vt.status === 'refuted' ? 'text-[#cd3d64]' : 'text-[#a3acb9]'}`}>
                    {vt.status === 'confirmed' ? '✓' : vt.status === 'weakened' ? '~' : vt.status === 'refuted' ? '✗' : '?'}
                  </span>
                  <span className="text-[12px] text-[#697386]">{vt.thesis}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {error && <div className="mt-3 text-[13px] text-[#cd3d64] bg-[#fff0f0] border border-[#f8d0d8] rounded-lg p-3">{error}</div>}
    </div>
  );
}
