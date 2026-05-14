import 'server-only';
import type { ParsedClientRow } from '@/lib/services/client-import-service';

/**
 * Indian GSTIN state-code map (first 2 digits of GSTIN).
 * Source: CBIC list, current as of FY 2024-25.
 */
export const GSTIN_STATE_CODES: Record<string, { name: string; group: 'A' | 'B' }> = {
  '01': { name: 'Jammu and Kashmir', group: 'B' },
  '02': { name: 'Himachal Pradesh', group: 'B' },
  '03': { name: 'Punjab', group: 'A' },
  '04': { name: 'Chandigarh', group: 'A' },
  '05': { name: 'Uttarakhand', group: 'A' },
  '06': { name: 'Haryana', group: 'A' },
  '07': { name: 'Delhi', group: 'A' },
  '08': { name: 'Rajasthan', group: 'A' },
  '09': { name: 'Uttar Pradesh', group: 'A' },
  '10': { name: 'Bihar', group: 'A' },
  '11': { name: 'Sikkim', group: 'B' },
  '12': { name: 'Arunachal Pradesh', group: 'B' },
  '13': { name: 'Nagaland', group: 'B' },
  '14': { name: 'Manipur', group: 'B' },
  '15': { name: 'Mizoram', group: 'B' },
  '16': { name: 'Tripura', group: 'B' },
  '17': { name: 'Meghalaya', group: 'B' },
  '18': { name: 'Assam', group: 'B' },
  '19': { name: 'West Bengal', group: 'A' },
  '20': { name: 'Jharkhand', group: 'A' },
  '21': { name: 'Odisha', group: 'A' },
  '22': { name: 'Chhattisgarh', group: 'A' },
  '23': { name: 'Madhya Pradesh', group: 'A' },
  '24': { name: 'Gujarat', group: 'A' },
  '26': { name: 'Dadra & Nagar Haveli and Daman & Diu', group: 'A' },
  '27': { name: 'Maharashtra', group: 'A' },
  '29': { name: 'Karnataka', group: 'A' },
  '30': { name: 'Goa', group: 'A' },
  '31': { name: 'Lakshadweep', group: 'B' },
  '32': { name: 'Kerala', group: 'A' },
  '33': { name: 'Tamil Nadu', group: 'B' },
  '34': { name: 'Puducherry', group: 'B' },
  '35': { name: 'Andaman and Nicobar Islands', group: 'B' },
  '36': { name: 'Telangana', group: 'A' },
  '37': { name: 'Andhra Pradesh', group: 'A' },
  '38': { name: 'Ladakh', group: 'B' },
  '97': { name: 'Other Territory', group: 'B' },
  '99': { name: 'Centre Jurisdiction', group: 'B' },
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z0-9]{13}$/;

export interface GstinPasteRow extends ParsedClientRow {
  state_code?: string;       // 2-digit prefix
  state_group?: 'A' | 'B';   // for v3 compliance state-group predicate
  derived_pan?: string;      // 10 chars of GSTIN, positions 3-12
}

/**
 * Parse a multiline text blob of GSTINs (one per line, with optional whitespace/comments).
 * Each line yields one row with:
 *   - GSTIN (uppercased, trimmed)
 *   - PAN derived from positions 3-12 of the GSTIN
 *   - state name + state_group derived from the first 2 digits
 *   - business_name left blank (required — user must fill in)
 * No external HTTP calls. Pure regex + lookup.
 */
export function parseGstnPasteText(text: string): GstinPasteRow[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const seen = new Set<string>();
  const rows: GstinPasteRow[] = [];
  let idx = 0;
  for (const rawLine of lines) {
    idx += 1;
    // Allow commas / tabs / # comments — take the first GSTIN-looking token.
    const stripped = rawLine.replace(/#.*$/, '').trim();
    if (!stripped) continue;
    const token = stripped.split(/[\s,;]+/)[0].toUpperCase();
    const row: GstinPasteRow = {
      row_index: idx,
      business_name: '',
      errors: [],
    };
    if (!GSTIN_REGEX.test(token)) {
      row.gstin = token;
      row.errors.push(`Invalid GSTIN format (expected 15 chars, 2 digits + 13 alphanumeric)`);
      rows.push(row);
      continue;
    }
    if (seen.has(token)) {
      row.gstin = token;
      row.errors.push('Duplicate GSTIN in paste');
      rows.push(row);
      continue;
    }
    seen.add(token);
    const stateCode = token.slice(0, 2);
    const stateInfo = GSTIN_STATE_CODES[stateCode];
    if (!stateInfo) {
      row.gstin = token;
      row.errors.push(`Unknown state code "${stateCode}" — check the GSTIN`);
      rows.push(row);
      continue;
    }
    const derivedPan = token.slice(2, 12);
    row.gstin = token;
    row.pan = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(derivedPan) ? derivedPan : undefined;
    row.state_code = stateCode;
    row.state_group = stateInfo.group;
    row.state = stateInfo.name;
    row.derived_pan = row.pan;
    if (!row.pan) row.errors.push(`PAN derived from GSTIN failed format check (${derivedPan})`);
    // business_name validation deferred to commit step — UI prompts user to fill it.
    rows.push(row);
  }
  return rows;
}

/**
 * Look up state info by 2-digit code. Returns null for unknown codes.
 */
export function stateInfoForCode(code: string) {
  return GSTIN_STATE_CODES[code] ?? null;
}
