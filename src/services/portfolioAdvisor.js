/**
 * Portfolio Advisor — пропонує дії на основі conviction scores та ринкових даних.
 * Генерує рекомендації: купити, тримати кеш, купити облігації.
 */

const ADVISOR_PROMPT = `Ти — старший портфельний менеджер довгосрочного інвестиційного портфеля.
Твоя стратегія: купуй якісні активи на привабливих рівнях, тримай довго, ребалансуй рідко.

Тобі надано:
1. Поточний стан портфеля (позиції, кеш, P&L)
2. Карта переконань (conviction scores по всіх активах)
3. Актуальні ринкові дані (ціни, технічні індикатори)

Правила:
- Не витрачай весь кеш одразу — завжди залишай мінімум 15% в резерві
- Якщо немає привабливих рівнів для покупки — рекомендуй тримати кеш або купити облігаційні ETF (BND, TLT, SHY)
- Для кожної рекомендації до покупки вкажи конкретний рівень входу та чому саме цей рівень
- Враховуй диверсифікацію — не концентруй >25% портфеля в одному активі
- Рекомендуй продаж тільки якщо conviction впав нижче 30 або фундаментально щось змінилось

Відповідай ТІЛЬКИ валідним JSON:
{
  "market_assessment": "короткий опис поточного ринкового середовища українською",
  "cash_recommendation": {
    "action": "hold_cash|buy_bonds|deploy",
    "reason": "пояснення українською",
    "bond_etf": "BND|TLT|SHY або null",
    "cash_allocation_pct": 15-100
  },
  "buy_recommendations": [
    {
      "ticker": "TICKER",
      "name": "Назва",
      "asset_type": "stock|crypto|etf",
      "action": "buy|accumulate|wait",
      "conviction": 0-100,
      "current_price": число,
      "entry_level": число,
      "entry_reason": "чому саме цей рівень — технічний аналіз, підтримка, тощо",
      "target_price": число,
      "stop_loss": число,
      "position_size_pct": 1-25,
      "time_horizon": "short|medium|long",
      "thesis": "головна теза українською",
      "urgency": "now|wait_for_level|watch"
    }
  ],
  "sell_recommendations": [
    {
      "ticker": "TICKER",
      "action": "close|reduce",
      "sell_pct": 100,
      "reason": "причина українською",
      "urgency": "now|gradual"
    }
  ],
  "rebalance_actions": [
    {
      "from_ticker": "TICKER або CASH",
      "to_ticker": "TICKER",
      "reason": "причина українською",
      "pct_of_portfolio": число
    }
  ],
  "summary": "2-3 речення — загальна рекомендація для портфеля українською"
}`;

// Store previous advice for consistency
let previousAdvice = null;

export function getPreviousAdvice() { return previousAdvice; }

export async function getPortfolioAdvice(portfolioState, convictionAssets, marketData) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('API ключ не встановлено');

  const positions = portfolioState.positions || [];
  const cash = portfolioState.cash || 0;
  const totalValue = cash + positions.reduce((sum, p) => {
    const price = marketData[p.ticker]?.prices?.price || p.entryPrice;
    return sum + p.qty * price;
  }, 0);

  // Build previous advice context for consistency
  let prevAdviceContext = '';
  if (previousAdvice) {
    prevAdviceContext = `\n\nПОПЕРЕДНІ РЕКОМЕНДАЦІЇ (будь послідовним — якщо зміни не виправдані новими даними, тримайся попереднього курсу):
- Оцінка ринку: ${previousAdvice.market_assessment || 'немає'}
- Кеш: ${previousAdvice.cash_recommendation?.action || 'немає'} (${previousAdvice.cash_recommendation?.reason || ''})
- Рекомендації до покупки: ${(previousAdvice.buy_recommendations || []).map(r => `${r.ticker} (urgency: ${r.urgency}, entry: $${r.entry_level})`).join(', ') || 'немає'}
- Загальний висновок: ${previousAdvice.summary || 'немає'}
ВАЖЛИВО: Якщо фундаментально нічого не змінилось, не міняй рекомендації кардинально. Поясни якщо змінив позицію.`;
  }

  const portfolioContext = `
Портфель:
- Загальна вартість: $${totalValue.toFixed(2)}
- Кеш: $${cash.toFixed(2)} (${((cash / totalValue) * 100).toFixed(1)}%)
- Позиції: ${positions.length === 0 ? 'ПОРОЖНІЙ — потрібно сформувати з нуля' : positions.map(p => {
    const price = marketData[p.ticker]?.prices?.price || p.entryPrice;
    const pnl = ((price - p.entryPrice) / p.entryPrice * 100).toFixed(1);
    return `${p.ticker}: ${p.qty} шт @ $${p.entryPrice} → $${price} (${pnl}%)`;
  }).join('\n  ')}

Карта переконань:
${Object.values(convictionAssets).map(a => {
    const md = marketData[a.ticker];
    const price = md?.prices?.price;
    const technicals = md?.technicals;
    return `${a.ticker} (${a.name}): conviction ${a.conviction_score}/100, ${a.direction}, тренд: ${a.trend}
  Тези: ${(a.theses || []).slice(0, 2).join('; ')}
  Ризики: ${(a.risks || []).slice(0, 2).join('; ')}
  ${price ? `Ціна: $${price}` : ''}
  ${technicals ? `RSI: ${technicals.rsi}, SMA50: $${technicals.sma50}, SMA200: $${technicals.sma200}, тренд: ${technicals.trendSignal}` : ''}`;
  }).join('\n\n')}${prevAdviceContext}`;

  // Use Opus for deep analysis, fallback to Sonnet
  const model = import.meta.env.VITE_CLAUDE_MODEL_DEEP || 'claude-opus-4-20250514';
  const fallback = import.meta.env.VITE_CLAUDE_MODEL_FAST || 'claude-sonnet-4-20250514';

  let usedModel = model;

  async function callApi(modelId, attempt = 1) {
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
        max_tokens: 4096,
        system: ADVISOR_PROMPT,
        messages: [{ role: 'user', content: portfolioContext }],
      }),
    });

    if (!res.ok) {
      console.warn(`[Advisor] ${modelId} attempt ${attempt}: HTTP ${res.status}`);

      // For Opus: retry ANY error up to 4 times (429, 529, 503, etc.)
      if (modelId !== fallback && attempt <= 4) {
        const wait = res.status === 429 ? 60000 : 30000;
        await new Promise(r => setTimeout(r, wait));
        return callApi(modelId, attempt + 1);
      }

      // Only fallback to Sonnet after exhausting retries on Opus
      if (modelId !== fallback) {
        console.warn(`[Advisor] Opus failed after ${attempt} attempts, falling back to Sonnet`);
        usedModel = fallback;
        return callApi(fallback, 99);
      }

      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API помилка: ${res.status}`);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API помилка: ${res.status}`);
    }

    usedModel = modelId;
    return res;
  }

  const response = await callApi(model);
  const data = await response.json();
  const content = data.content[0]?.text;
  if (!content) throw new Error('Порожня відповідь');

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  const result = JSON.parse(jsonMatch[1].trim());
  result._model = usedModel;
  previousAdvice = result; // Store for next call consistency
  return result;
}
