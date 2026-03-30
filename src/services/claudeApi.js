const SYSTEM_PROMPT = `Ти — фінансовий аналітик. Витягни структуровану інвестиційну інформацію зі звіту.

КРИТИЧНО ВАЖЛИВО:
1. ДЕДУПЛІКАЦІЯ: Якщо один актив згадується під різними назвами/тікерами (GLD і GOLD — це золото, BTC і Bitcoin — це біткоін), ОБ'ЄДНАЙ в ОДИН запис з найбільш ліквідним тікером.
2. Всі текстові поля ОБОВ'ЯЗКОВО українською мовою.
3. key_theses — пояснюй ЧОМУ цей актив заслуговує уваги.

Відповідай ТІЛЬКИ валідним JSON:
{
  "report_date": "YYYY-MM-DD або null",
  "report_source": "назва аналітика/видання або null",
  "assets": [
    {
      "ticker": "TICKER (найліквідніший тікер — GLD не GOLD, BTC не BITCOIN, SPY не SP500)",
      "name": "Назва активу",
      "asset_type": "stock|crypto|commodity|index|etf",
      "direction": "bullish|bearish|neutral",
      "conviction": 0-100,
      "time_horizon": "short|medium|long",
      "key_theses": ["теза 1 українською", "теза 2"],
      "risks": ["ризик 1 українською", "ризик 2"],
      "price_target": число або null,
      "catalysts": ["каталізатор 1 українською"]
    }
  ],
  "macro_signals": [
    {
      "theme": "тема українською",
      "direction": "positive|negative|neutral",
      "affected_assets": ["TICKER1", "TICKER2"],
      "description": "пояснення українською"
    }
  ],
  "summary": "2-3 речення загальний висновок зі звіту українською"
}`;

export async function parseReportWithClaude(text) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-api-key-here') {
    throw new Error('Встановіть VITE_ANTHROPIC_API_KEY у .env файлі');
  }

  const model = import.meta.env.VITE_CLAUDE_MODEL_FAST || 'claude-sonnet-4-20250514';
  const body = {
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Проаналізуй цей інвестиційний звіт та витягни структуровані дані:\n\n${text}`,
      },
    ],
  };

  async function callWithRetry(attempt = 1) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429 && attempt <= 3) {
      // Rate limit — wait 60s and retry
      await new Promise((r) => setTimeout(r, 60000));
      return callWithRetry(attempt + 1);
    }

    return res;
  }

  const response = await callWithRetry();

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API помилка: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text;
  if (!content) throw new Error('Порожня відповідь від Claude API');

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  return JSON.parse(jsonMatch[1].trim());
}
