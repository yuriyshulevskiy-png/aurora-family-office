import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseReady() {
  return supabase !== null;
}

// ─── Portfolio positions ────────────────────────────────────────────

export async function loadPositions() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.warn('Supabase loadPositions:', error.message); return null; }
  return data;
}

export async function savePositions(positions, cash) {
  if (!supabase) return;
  // Upsert all positions + cash meta row
  const rows = positions.map((p) => ({
    ticker: p.ticker,
    qty: p.qty,
    entry_price: p.entryPrice,
    asset_type: p.type || 'stock',
    name: p.name || p.ticker,
    sector: p.sector || null,
  }));

  // Delete all then insert (simple sync)
  await supabase.from('positions').delete().neq('ticker', '');
  if (rows.length > 0) {
    const { error } = await supabase.from('positions').insert(rows);
    if (error) console.warn('Supabase savePositions:', error.message);
  }

  // Save cash as a setting
  await saveSetting('portfolio_cash', cash);
}

// ─── Conviction assets ──────────────────────────────────────────────

export async function loadConvictions() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('conviction_assets')
    .select('*');
  if (error) { console.warn('Supabase loadConvictions:', error.message); return null; }
  // Convert array to object keyed by ticker
  const assets = {};
  for (const row of data || []) {
    assets[row.ticker] = {
      ticker: row.ticker,
      direction: row.direction,
      score: row.score,
      prev_score: row.prev_score,
      reasons: row.reasons || [],
      updated: row.updated_at,
      rebalance_suggested: row.rebalance_suggested,
      sector: row.sector,
    };
  }
  return assets;
}

export async function saveConvictions(assets) {
  if (!supabase) return;
  const rows = Object.entries(assets).map(([ticker, a]) => ({
    ticker,
    direction: a.direction,
    score: a.score,
    prev_score: a.prev_score || null,
    reasons: a.reasons || [],
    rebalance_suggested: a.rebalance_suggested || false,
    sector: a.sector || null,
    updated_at: a.updated || new Date().toISOString(),
  }));

  await supabase.from('conviction_assets').delete().neq('ticker', '');
  if (rows.length > 0) {
    const { error } = await supabase.from('conviction_assets').insert(rows);
    if (error) console.warn('Supabase saveConvictions:', error.message);
  }
}

// ─── Reports ────────────────────────────────────────────────────────

export async function loadReports() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('processed_at', { ascending: false });
  if (error) { console.warn('Supabase loadReports:', error.message); return null; }
  return (data || []).map((r) => ({
    id: r.id,
    fileName: r.file_name,
    source: r.source,
    extraction: r.extraction,
    processedAt: r.processed_at,
  }));
}

export async function saveReport(report) {
  if (!supabase) return;
  const { error } = await supabase.from('reports').insert({
    id: report.id,
    file_name: report.fileName,
    source: report.source || 'upload',
    extraction: report.extraction,
    processed_at: report.processedAt || Date.now(),
  });
  if (error) console.warn('Supabase saveReport:', error.message);
}

// ─── History snapshots ──────────────────────────────────────────────

export async function loadSnapshots() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('history_snapshots')
    .select('*')
    .order('date', { ascending: true });
  if (error) { console.warn('Supabase loadSnapshots:', error.message); return null; }
  return (data || []).map((s) => ({
    date: s.date,
    value: s.value,
    cash: s.cash,
    positions: s.positions,
  }));
}

export async function saveSnapshot(snapshot) {
  if (!supabase) return;
  const { error } = await supabase.from('history_snapshots').upsert({
    date: snapshot.date,
    value: snapshot.value,
    cash: snapshot.cash,
    positions: snapshot.positions || [],
  }, { onConflict: 'date' });
  if (error) console.warn('Supabase saveSnapshot:', error.message);
}

// ─── Advisor ────────────────────────────────────────────────────────

export async function loadAdvisorState() {
  if (!supabase) return null;
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'advisor_state')
    .single();
  return data?.value || null;
}

export async function saveAdvisorState(state) {
  if (!supabase) return;
  await saveSetting('advisor_state', state);
}

// ─── Settings (key-value) ───────────────────────────────────────────

export async function loadSetting(key) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();
  return data?.value ?? null;
}

export async function saveSetting(key, value) {
  if (!supabase) return;
  await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
}
