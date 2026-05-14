/**
 * 5 unit tests for the payroll service. Run via:  npx tsx scripts/test-payroll.ts
 * Pure functions, no Supabase needed.
 */
import { computePayroll } from '../lib/services/payroll-service';

type Test = { name: string; run: () => void };
let pass = 0;
let fail = 0;
function expect(actual: any, expected: any, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) { console.error(`  ✗ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); fail++; }
  else { pass++; }
}
function near(actual: number, expected: number, label: string, tol = 1) {
  if (Math.abs(actual - expected) > tol) { console.error(`  ✗ ${label}: expected ~${expected}, got ${actual}`); fail++; }
  else { pass++; }
}

const tests: Test[] = [
  {
    name: '1) full attendance → full pay, zero unpaid',
    run: () => {
      const r = computePayroll(
        { monthly_salary: 100000, paid_leaves_per_month: 2, deduction_applicable: true, salary_adjustment_for_leaves: true },
        { total_working_days: 22, actual_present_days: 22, actual_leave_days: 0 },
      );
      expect(r.unpaid_leave_days, 0, 'unpaid days');
      expect(r.deduction_for_excess_leaves, 0, 'no excess deduction');
      near(r.gross_salary, 100000, 'gross around 100k');
    },
  },
  {
    name: '2) excess unpaid leave → deduction',
    run: () => {
      const r = computePayroll(
        { monthly_salary: 88000, paid_leaves_per_month: 2, deduction_applicable: true, salary_adjustment_for_leaves: true },
        { total_working_days: 22, actual_present_days: 18, actual_leave_days: 4 },
      );
      // 4 leaves — 2 paid — 2 unpaid; daily rate 4000; expect 8000 deducted
      expect(r.unpaid_leave_days, 2, 'unpaid days');
      near(r.deduction_for_excess_leaves, 8000, 'deduction equals 2 * 4000');
    },
  },
  {
    name: '3) reimbursements / bonus increase gross + final',
    run: () => {
      const r = computePayroll(
        { monthly_salary: 50000, paid_leaves_per_month: 2, deduction_applicable: true, salary_adjustment_for_leaves: true },
        { total_working_days: 22, actual_present_days: 22, actual_leave_days: 0 },
        [{ type: 'bonus', amount: 5000, reason: 'project bonus' }],
      );
      near(r.bonuses, 5000, 'bonus echoed');
      near(r.gross_salary, 55000, 'gross includes bonus');
    },
  },
  {
    name: '4) one-off deduction reduces final but not gross',
    run: () => {
      const r = computePayroll(
        { monthly_salary: 60000, paid_leaves_per_month: 2, deduction_applicable: true, salary_adjustment_for_leaves: true },
        { total_working_days: 22, actual_present_days: 22, actual_leave_days: 0 },
        [{ type: 'deduction', amount: 1500, reason: 'advance recovery' }],
      );
      near(r.gross_salary, 60000, 'gross unaffected by deduction');
      near(r.other_deductions, 1500, 'other deductions captured');
      near(r.total_deductions, 1500, 'total deductions excludes TDS');
    },
  },
  {
    name: '5) TDS slab boundary: 100k/month → 12L annual triggers 5% & 10% slabs',
    run: () => {
      const r = computePayroll(
        { monthly_salary: 100000, paid_leaves_per_month: 2, deduction_applicable: true, salary_adjustment_for_leaves: true },
        { total_working_days: 22, actual_present_days: 22, actual_leave_days: 0 },
      );
      // 12L annual: tax = 5% on 3L (15000) + 10% on 3L (30000) + 15% on 3L (45000) = 90000 / 12 = 7500/month
      near(r.tds_estimate, 7500, 'TDS estimate at 12L slab boundary', 200);
    },
  },
];

for (const t of tests) { console.log(`\n${t.name}`); t.run(); }
console.log(`\nPayroll tests: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
