import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });
// Polyfill WebSocket for Node < 22 (Supabase realtime client requires it)
import WS from 'ws';
(globalThis as any).WebSocket = WS;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log('[migrate-bizlens] starting...');

  // Pull all old JSONB records from financial_data
  const { data: legacyData, error } = await sb
    .from('financial_data')
    .select('*')
    .in('data_type', ['profit_loss', 'balance_sheet', 'customer_metrics', 'supplier_metrics']);

  if (error) {
    console.error('Failed to fetch legacy data:', error);
    process.exit(1);
  }

  if (!legacyData || legacyData.length === 0) {
    console.log('[migrate-bizlens] No legacy financial_data rows found. Migration complete.');
    process.exit(0);
  }

  // We need to group by client_id, period_month, period_year to merge P&L and BS into a single bizlens_data row
  const grouped = new Map<string, any>();

  for (const row of legacyData) {
    const key = `${row.client_id}_${row.period_year}_${row.period_month}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        client_id: row.client_id,
        period_month: row.period_month,
        period_year: row.period_year,
        created_by: row.entered_by,
        status: 'published',
      });
    }
    const target = grouped.get(key);
    const json = row.data_json || {};

    if (row.data_type === 'profit_loss') {
      target.sales_revenue = json.revenue || 0;
      target.variable_costs = json.variable_costs || 0;
      target.fixed_costs = json.fixed_costs || 0;
      target.purchases = json.purchases || 0;
      target.interest_expense = json.interest || 0;
      target.target_profit = json.target_profit || 0;
      target.inventory_change = json.inventory_change || 0;
      target.other_income = json.other_income || 0;
      target.non_cash_expenses = json.non_cash_expenses || 0;
    } else if (row.data_type === 'balance_sheet') {
      target.bs_cash = json.cash || 0;
      target.bs_inventory = json.inventory || 0;
      target.bs_accounts_receivable = json.accounts_receivable || 0;
      target.bs_other_current_assets = json.other_current_assets || 0;
      target.bs_loans_advances = json.loans_advances || 0;
      target.bs_accounts_payable = json.accounts_payable || 0;
      target.bs_short_term_borrowings = json.short_term_borrowings || 0;
      target.bs_long_term_borrowings = json.long_term_borrowings || 0;
      target.bs_equity = json.equity || 0;
    }
  }

  console.log(`[migrate-bizlens] Found ${grouped.size} distinct periods to migrate.`);

  for (const record of grouped.values()) {
    const { error: insertErr } = await sb
      .from('bizlens_data')
      .upsert(record, { onConflict: 'client_id, period_month, period_year, is_current' });
    
    if (insertErr) {
      console.error(`[migrate-bizlens] Error inserting record for client ${record.client_id}:`, insertErr);
    }
  }

  console.log('[migrate-bizlens] Migration complete.');
}

main().catch((e) => {
  console.error('[migrate-bizlens] FATAL', e?.message ?? e);
  process.exit(1);
});
