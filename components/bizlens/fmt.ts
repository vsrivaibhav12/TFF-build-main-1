/** Shared formatters for BizLens dashboard components */
export const fmtMoney = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return 'Rs. --';
  const abs = Math.round(Math.abs(n));
  const f = abs.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (n >= 0 ? 'Rs. ' : '−Rs. ') + f;
};

export const fmtMoneyCompact = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return 'Rs. --';
  const abs = Math.abs(n); const sign = n < 0 ? '−' : '';
  if (abs >= 1e7) return sign + 'Rs. ' + (abs / 1e7).toFixed(2) + ' Cr';
  if (abs >= 1e5) return sign + 'Rs. ' + (abs / 1e5).toFixed(2) + ' L';
  if (abs >= 1e3) return sign + 'Rs. ' + (abs / 1e3).toFixed(1) + 'K';
  return sign + 'Rs. ' + Math.round(abs);
};

export const fmtPct = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return '--';
  return (n * 100).toFixed(1) + '%';
};

export const fmtNum = (n: number | null | undefined, d = 0): string => {
  if (n == null || isNaN(n)) return '--';
  if (d > 0) return Number(n).toFixed(d);
  if (Math.abs(n) < 10 && n % 1 !== 0) return Number(n).toFixed(2);
  return Math.round(n).toLocaleString('en-IN');
};
