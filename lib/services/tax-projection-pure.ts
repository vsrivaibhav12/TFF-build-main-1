/**
 * Pure calculation utilities for tax projection.
 * Safe to import from both server and client components.
 */

export function computeProjectedTax(grossIncome: number, deductions: number): { taxable_income: number; tax: number } {
  const taxable = Math.max(0, grossIncome - deductions);
  let tax = 0;
  if (taxable > 1500000) tax += (taxable - 1500000) * 0.30;
  if (taxable > 1200000) tax += (Math.min(taxable, 1500000) - 1200000) * 0.20;
  if (taxable > 900000) tax += (Math.min(taxable, 1200000) - 900000) * 0.15;
  if (taxable > 600000) tax += (Math.min(taxable, 900000) - 600000) * 0.10;
  if (taxable > 300000) tax += (Math.min(taxable, 600000) - 300000) * 0.05;
  // health & education cess 4%
  tax = tax * 1.04;
  return { taxable_income: taxable, tax: Math.round(tax) };
}

export function advanceTaxSchedule(totalTax: number) {
  return [
    { instalment: 'Q1 (15 Jun)', percent: 15, amount: Math.round(totalTax * 0.15) },
    { instalment: 'Q2 (15 Sep)', percent: 45, amount: Math.round(totalTax * 0.45) },
    { instalment: 'Q3 (15 Dec)', percent: 75, amount: Math.round(totalTax * 0.75) },
    { instalment: 'Q4 (15 Mar)', percent: 100, amount: Math.round(totalTax) },
  ];
}
