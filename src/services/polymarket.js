// Polymarket API — fetch prediction market data via Gamma API (proxied)

// Events we track — each contains multiple markets (date variants or outcome variants)
const TRACKED_EVENTS = [
  {
    id: 'russia-ukraine',
    label: 'Russia x Ukraine Ceasefire',
    eventId: null, // We'll fetch individual markets
    markets: [
      { id: '561829', label: 'by Mar 31, 2026' },
      { id: '1171663', label: 'by Jun 30, 2026' },
      { id: '567687', label: 'by end of 2026' },
    ],
  },
  {
    id: 'us-iran',
    label: 'US x Iran Ceasefire',
    eventId: '236840',
    markets: [], // Will be filled from event API
  },
  {
    id: 'fed-cuts',
    label: 'Fed Rate Cuts in 2026',
    eventId: '51456',
    markets: [], // Will be filled from event API
  },
];

async function fetchMarketById(id) {
  const res = await fetch(`/api/polymarket/markets/${id}`);
  if (!res.ok) return null;
  return res.json();
}

async function fetchEventById(id) {
  const res = await fetch(`/api/polymarket/events/${id}`);
  if (!res.ok) return null;
  return res.json();
}

function parseMarket(m) {
  let yesPrice = null;
  try {
    const prices = JSON.parse(m.outcomePrices || '[]');
    yesPrice = parseFloat(prices[0]);
  } catch {}
  return {
    id: m.id,
    question: m.question,
    slug: m.slug,
    yesPrice,
    yesPct: yesPrice != null ? (yesPrice * 100) : null,
    volume: m.volumeNum || 0,
    active: m.active && !m.closed,
  };
}

export async function fetchPolymarketData() {
  const result = {};

  try {
    // 1. Russia-Ukraine — fetch individual markets
    const ruMarkets = await Promise.all(
      TRACKED_EVENTS[0].markets.map(async (m) => {
        const data = await fetchMarketById(m.id);
        if (!data) return null;
        return { ...parseMarket(data), label: m.label };
      })
    );
    result['russia-ukraine'] = {
      label: TRACKED_EVENTS[0].label,
      markets: ruMarkets.filter(Boolean).filter(m => m.active),
    };

    // 2. US-Iran — fetch event
    const iranEvent = await fetchEventById('236840');
    if (iranEvent && iranEvent.markets) {
      const iranMarkets = iranEvent.markets
        .map(parseMarket)
        .filter(m => m.active && m.yesPct != null)
        .sort((a, b) => a.yesPct - b.yesPct);
      result['us-iran'] = {
        label: TRACKED_EVENTS[1].label,
        markets: iranMarkets,
      };
    }

    // 3. Fed Rate Cuts — fetch event
    const fedEvent = await fetchEventById('51456');
    if (fedEvent && fedEvent.markets) {
      const fedMarkets = fedEvent.markets
        .map(parseMarket)
        .filter(m => m.active && m.yesPct != null)
        .sort((a, b) => b.yesPct - a.yesPct); // Highest probability first
      result['fed-cuts'] = {
        label: TRACKED_EVENTS[2].label,
        markets: fedMarkets,
      };
    }
  } catch (err) {
    console.error('Polymarket fetch error:', err);
  }

  return result;
}
