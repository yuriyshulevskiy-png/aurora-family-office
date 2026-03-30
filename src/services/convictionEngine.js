/**
 * Conviction Engine — the brain of the app.
 * Maintains conviction scores per asset using time-weighted signals from reports.
 */

/**
 * Calculate weight for a signal based on age.
 * weight = 1 / (days_since_report + 1), capped at 1.0
 */
function signalWeight(reportDate) {
  if (!reportDate) return 0.5;
  const days = Math.max(0, (Date.now() - new Date(reportDate).getTime()) / 86400000);
  return Math.min(1.0, 1 / (days + 1));
}

/**
 * Update conviction score for an asset given a new signal from a report.
 * Returns updated asset record.
 */
export function updateConviction(existingAsset, newSignal, reportDate) {
  const weight = signalWeight(reportDate);
  const signals = [...(existingAsset?.signals || []), { ...newSignal, weight, date: reportDate }];

  // Weighted average of all signal convictions
  let totalWeight = 0;
  let weightedSum = 0;
  for (const s of signals) {
    totalWeight += s.weight;
    weightedSum += s.conviction * s.weight;
  }
  const conviction_score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;

  // Determine direction from most recent signals (weighted)
  const directionVotes = { bullish: 0, bearish: 0, neutral: 0 };
  for (const s of signals) {
    directionVotes[s.direction] = (directionVotes[s.direction] || 0) + s.weight;
  }
  const direction = Object.entries(directionVotes).sort((a, b) => b[1] - a[1])[0][0];

  // Check if rebalance should be suggested
  const oldScore = existingAsset?.conviction_score ?? conviction_score;
  const oldDirection = existingAsset?.direction;
  const rebalance_suggested =
    (oldDirection && oldDirection !== direction) ||
    Math.abs(conviction_score - oldScore) > 20;

  // Aggregate theses and risks
  const theses = [...new Set([...(existingAsset?.theses || []), ...(newSignal.key_theses || [])])];
  const risks = [...new Set([...(existingAsset?.risks || []), ...(newSignal.risks || [])])];

  return {
    ticker: newSignal.ticker,
    name: newSignal.name || existingAsset?.name || newSignal.ticker,
    asset_type: newSignal.asset_type || existingAsset?.asset_type || 'stock',
    conviction_score,
    direction,
    trend: getConvictionTrend(signals),
    report_count: signals.length,
    last_updated: Date.now(),
    theses,
    risks,
    sources: [...(existingAsset?.sources || []), newSignal.source].filter(Boolean),
    signals,
    rebalance_suggested,
    our_view: newSignal.our_view || existingAsset?.our_view,
    price_target: newSignal.price_target || existingAsset?.price_target,
    catalysts: [...new Set([...(existingAsset?.catalysts || []), ...(newSignal.catalysts || [])])],
    time_horizon: newSignal.time_horizon || existingAsset?.time_horizon || 'medium',
  };
}

/**
 * Determine conviction trend from signals history.
 */
export function getConvictionTrend(signals) {
  if (!signals || signals.length < 2) return 'stable';
  const sorted = [...signals].sort((a, b) => new Date(a.date) - new Date(b.date));
  const recent3 = sorted.slice(-3);
  const prev3 = sorted.slice(-6, -3);
  if (prev3.length === 0) return 'stable';

  const avgRecent = recent3.reduce((s, x) => s + x.conviction, 0) / recent3.length;
  const avgPrev = prev3.reduce((s, x) => s + x.conviction, 0) / prev3.length;

  if (avgRecent - avgPrev > 5) return 'rising';
  if (avgPrev - avgRecent > 5) return 'falling';
  return 'stable';
}

/**
 * Suggest portfolio rebalances based on conviction vs holdings.
 */
export function suggestRebalance(positions, convictionAssets) {
  const alerts = [];

  // Check held positions
  for (const pos of positions) {
    const asset = convictionAssets[pos.ticker];
    if (!asset) continue;

    if (asset.rebalance_suggested && asset.direction !== pos.direction) {
      alerts.push({
        type: 'reversal',
        severity: 'high',
        ticker: pos.ticker,
        name: pos.name,
        score: asset.conviction_score,
        direction: asset.direction,
        theses: asset.theses?.slice(0, 2) || [],
        risks: asset.risks?.slice(0, 2) || [],
        message: `Conviction reversed on ${pos.ticker}. Review position.`,
      });
    } else if (asset.conviction_score < 40) {
      alerts.push({
        type: 'low_conviction',
        severity: 'medium',
        ticker: pos.ticker,
        name: pos.name,
        score: asset.conviction_score,
        direction: asset.direction,
        theses: asset.theses?.slice(0, 2) || [],
        risks: asset.risks?.slice(0, 2) || [],
        message: `Consider reducing ${pos.ticker} — conviction at ${asset.conviction_score}/100`,
      });
    }
  }

  // Check high-conviction assets not in portfolio
  const heldTickers = new Set(positions.map((p) => p.ticker));
  for (const [ticker, asset] of Object.entries(convictionAssets)) {
    if (!heldTickers.has(ticker) && asset.conviction_score > 70) {
      alerts.push({
        type: 'opportunity',
        severity: 'info',
        ticker,
        name: asset.name,
        score: asset.conviction_score,
        direction: asset.direction,
        theses: asset.theses?.slice(0, 2) || [],
        risks: asset.risks?.slice(0, 2) || [],
        message: `High conviction on ${ticker} (${asset.conviction_score}/100). Not in portfolio.`,
      });
    }
  }

  return alerts;
}
