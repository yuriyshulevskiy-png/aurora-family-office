/**
 * Verification Engine — автоматично збирає ринкові дані та перевіряє тези зі звітів.
 * Потік: витяг тез → збір даних → верифікація через Claude → фінальний висновок
 */

import { fetchStockPrices, fetchOHLCV } from './yahooFinance';
import { fetchCryptoPrices } from './coinGecko';
import { fetchFilings } from './secEdgar';
import { computeTechnicals } from '../utils/technicals';

const VERIFICATION_PROMPT = `Ти — головний інвестиційний стратег. Тобі надано тези аналітиків та ринкові дані.

ТВОЯ РОЛЬ — НЕ ПРОСТО ПОВТОРЮВАТИ думку аналітиків, а СФОРМУВАТИ ВЛАСНУ ПОЗИЦІЮ.
Ти зважуєш аргументи за і проти, аналізуєш ринкові дані, і даєш СВІЙ висновок.

КРИТИЧНІ ПРАВИЛА:
1. ДЕДУПЛІКАЦІЯ: Якщо один актив згадується під різними тікерами (наприклад GLD і GOLD — обидва золото, BTC і BITCOIN — обидва біткоін), ОБ'ЄДНАЙ їх в ОДИН запис. Використовуй найбільш ліквідний тікер (GLD для золота, BTC для біткоіна, SPY для S&P 500).
2. КОНФЛІКТИ: Якщо різні джерела суперечать одне одному — зваж аргументи і прийми ОДНЕ рішення. Поясни чому ти обрав цю позицію.
3. ВЛАСНА ДУМКА: Кожна теза — це ТВОЯ теза, а не цитата аналітика. Пиши "Ми вважаємо..." не "Аналітик каже...".
4. ЧЕСНІСТЬ: Якщо дані суперечать тезі аналітика — скажи це прямо. Не підлаштовуйся.

Відповідай ТІЛЬКИ валідним JSON українською:
{
  "assets": [
    {
      "ticker": "TICKER (найбільш ліквідний тікер)",
      "name": "Назва",
      "asset_type": "stock|crypto|commodity|index|etf",
      "direction": "bullish|bearish|neutral",
      "conviction": 0-100,
      "time_horizon": "short|medium|long",
      "our_view": "Наша позиція: 2-3 речення — чому ми bullish/bearish/neutral. Це ГОЛОВНЕ поле.",
      "verified_theses": [
        {
          "thesis": "теза українською",
          "status": "confirmed|weakened|refuted|unverifiable",
          "evidence": "чому ми так вважаємо — конкретні дані"
        }
      ],
      "additional_insights": ["власні спостереження, яких не було у звіті"],
      "risks": ["ризик українською"],
      "key_theses": ["фінальна теза після власного аналізу"],
      "price_target": число або null,
      "catalysts": ["каталізатор українською"],
      "technical_assessment": "технічний аналіз українською"
    }
  ],
  "macro_signals": [
    {
      "theme": "тема українською",
      "direction": "positive|negative|neutral",
      "affected_assets": ["TICKER1"],
      "description": "НАША оцінка макросигналу"
    }
  ],
  "summary": "Загальний висновок після верифікації (2-3 речення українською). Вкажи які тези підтвердились, а які ні."
}`;

/**
 * Збирає ринкові дані для списку активів
 */
export async function gatherMarketData(assets) {
  const marketData = {};

  const cryptoTickers = assets
    .filter((a) => a.asset_type === 'crypto')
    .map((a) => a.ticker);
  const stockTickers = assets
    .filter((a) => a.asset_type !== 'crypto')
    .map((a) => a.ticker);

  // Fetch prices in parallel
  const [cryptoPrices, stockPrices] = await Promise.allSettled([
    cryptoTickers.length > 0 ? fetchCryptoPrices(cryptoTickers) : {},
    stockTickers.length > 0 ? fetchStockPrices(stockTickers) : {},
  ]);

  const allPrices = {
    ...(cryptoPrices.status === 'fulfilled' ? cryptoPrices.value : {}),
    ...(stockPrices.status === 'fulfilled' ? stockPrices.value : {}),
  };

  // Fetch technicals and filings in parallel for each asset
  const fetchPromises = assets.map(async (asset) => {
    const ticker = asset.ticker;
    const data = { prices: allPrices[ticker] || null, technicals: null, filings: [] };

    // Fetch OHLCV for technicals (stocks only — crypto doesn't have Yahoo OHLCV)
    if (asset.asset_type !== 'crypto') {
      try {
        const ohlcv = await fetchOHLCV(ticker, 90);
        if (ohlcv.length > 0) {
          data.technicals = computeTechnicals(ohlcv);
        }
      } catch { /* ignore */ }

      // Fetch SEC filings
      try {
        data.filings = await fetchFilings(ticker, 3);
      } catch { /* ignore */ }
    }

    marketData[ticker] = data;
  });

  await Promise.allSettled(fetchPromises);
  return marketData;
}

/**
 * Форматує зібрані дані для Claude
 */
function formatMarketContext(assets, marketData) {
  let context = '';

  for (const asset of assets) {
    const data = marketData[asset.ticker];
    if (!data) continue;

    context += `\n--- ${asset.ticker} (${asset.name}) ---\n`;

    // Original theses from report
    context += `Тези зі звіту: ${(asset.key_theses || []).join('; ')}\n`;
    context += `Напрямок зі звіту: ${asset.direction}, переконання: ${asset.conviction}/100\n`;
    context += `Ризики зі звіту: ${(asset.risks || []).join('; ')}\n`;

    // Price data
    if (data.prices) {
      context += `Поточна ціна: $${data.prices.price}\n`;
      if (data.prices.change24h != null) context += `Зміна за 24г: ${data.prices.change24h.toFixed(2)}%\n`;
      if (data.prices.change7d != null) context += `Зміна за 7д: ${data.prices.change7d.toFixed(2)}%\n`;
      if (data.prices.week52High) context += `52-тижневий діапазон: $${data.prices.week52Low} — $${data.prices.week52High}\n`;
      if (data.prices.peRatio) context += `P/E: ${data.prices.peRatio}\n`;
      if (data.prices.marketCap) context += `Капіталізація: $${(data.prices.marketCap / 1e9).toFixed(1)}B\n`;
    }

    // Technicals
    if (data.technicals) {
      context += `SMA50: $${data.technicals.sma50}, SMA200: $${data.technicals.sma200}\n`;
      context += `RSI(14): ${data.technicals.rsi}\n`;
      context += `Тренд: ${data.technicals.trendSignal}\n`;
    }

    // SEC filings
    if (data.filings?.length > 0) {
      context += `Останні SEC-подання:\n`;
      for (const f of data.filings) {
        context += `  - ${f.form} (${f.filingDate}): ${f.description}\n`;
      }
    }
  }

  return context;
}

/**
 * Верифікує тези через Claude з ринковими даними
 */
export async function verifyThesesWithClaude(extraction, marketData) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-api-key-here') {
    throw new Error('Встановіть VITE_ANTHROPIC_API_KEY у .env файлі');
  }

  const marketContext = formatMarketContext(extraction.assets || [], marketData);

  const userMessage = `Ось витяг зі звіту аналітика:

Резюме звіту: ${extraction.summary || 'Не вказано'}
Джерело: ${extraction.report_source || 'Невідоме'}
Дата звіту: ${extraction.report_date || 'Не вказана'}

Макросигнали: ${JSON.stringify(extraction.macro_signals || [], null, 2)}

Актуальні ринкові дані для верифікації:
${marketContext}

На основі наданих ринкових даних верифікуй тези зі звіту. Для кожної тези вкажи чи вона підтверджується (confirmed), послаблюється (weakened), спростовується (refuted), або неможливо перевірити (unverifiable). Дай фінальну оцінку conviction з урахуванням верифікації.`;

  // Use Opus for deep verification, with retry on rate limit
  const model = import.meta.env.VITE_CLAUDE_MODEL_DEEP || 'claude-opus-4-20250514';
  const fallbackModel = import.meta.env.VITE_CLAUDE_MODEL_FAST || 'claude-sonnet-4-20250514';

  let usedModel = model;

  async function callClaude(modelId, attempt = 1) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 8192,
        system: VERIFICATION_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      console.warn(`[Verification] ${modelId} attempt ${attempt}: HTTP ${res.status}`);

      // For Opus: retry ANY error up to 4 times (429, 529, 503, etc.)
      if (modelId !== fallbackModel && attempt <= 4) {
        const wait = res.status === 429 ? 60000 : 30000;
        await new Promise((r) => setTimeout(r, wait));
        return callClaude(modelId, attempt + 1);
      }

      // Only fallback to Sonnet after exhausting retries on Opus
      if (modelId !== fallbackModel) {
        console.warn(`[Verification] Opus failed after ${attempt} attempts, falling back to Sonnet`);
        usedModel = fallbackModel;
        return callClaude(fallbackModel, 99);
      }

      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Claude API помилка: ${res.status}`);
    }

    usedModel = modelId;
    return res;
  }

  const response = await callClaude(model);

  const data = await response.json();
  const content = data.content[0]?.text;
  if (!content) throw new Error('Порожня відповідь від Claude API');

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  const result = JSON.parse(jsonMatch[1].trim());
  result._model = usedModel;
  return result;
}

/**
 * Повний потік: витяг → збір даних → верифікація
 */
export async function fullAnalysisPipeline(extraction, onProgress) {
  // Step 1: report already parsed — extraction is input
  onProgress?.('gathering', 'Збираю ринкові дані та технічні індикатори...');

  const marketData = await gatherMarketData(extraction.assets || []);

  // Step 2: verify theses with market data
  onProgress?.('verifying', 'Верифікую тези через аналіз ринкових даних...');

  const verified = await verifyThesesWithClaude(extraction, marketData);

  // Step 3: merge results
  onProgress?.('complete', 'Аналіз завершено');

  return {
    original: extraction,
    verified,
    marketData,
    verifiedAt: Date.now(),
  };
}
