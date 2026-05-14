/**
 * Apply Group G schema migration: adds `service_kind` column to `services`.
 *
 * Canonical kinds: 'gst', 'tds', 'income_tax', 'compliance', 'bizlens', 'vcfo',
 * 'notice', 'payroll', 'other'. Stored as TEXT with a CHECK constraint so we
 * can extend in future without a hard ENUM migration.
 *
 * Idempotent: CHECK constraint and column re-create guarded.
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });

const PAT = process.env.SUPABASE_ACCESS_TOKEN!;
const REF = process.env.SUPABASE_PROJECT_REF!;
const ENDPOINT = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function runSql(query: string, label: string) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${label}] HTTP ${res.status}: ${text.slice(0, 800)}`);
  return text;
}

async function main() {
  const sql = `
    ALTER TABLE services
      ADD COLUMN IF NOT EXISTS service_kind TEXT;

    -- Drop old constraint if it exists (idempotent re-apply)
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'services' AND constraint_name = 'services_service_kind_check'
      ) THEN
        ALTER TABLE services DROP CONSTRAINT services_service_kind_check;
      END IF;
    END $$;

    ALTER TABLE services
      ADD CONSTRAINT services_service_kind_check
      CHECK (service_kind IS NULL OR service_kind IN (
        'gst','tds','income_tax','compliance','bizlens','vcfo','notice','payroll','other'
      ));

    CREATE INDEX IF NOT EXISTS idx_services_service_kind
      ON services(service_kind)
      WHERE service_kind IS NOT NULL;
  `;
  await runSql(sql, 'service_kind');
  console.log('[group-g] service_kind column applied');

  const r = await runSql(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='services' AND column_name='service_kind';`,
    'verify',
  );
  console.log('[group-g] verify ->', r);
}

main().catch((e) => {
  console.error('[group-g] FATAL', e?.message ?? e);
  process.exit(1);
});
