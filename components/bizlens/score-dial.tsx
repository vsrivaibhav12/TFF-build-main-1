'use client';
import { Badge } from '@/components/ui/badge';

const BAND_COLORS: Record<string, string> = {
  elite: '#059669', strong: '#10b981', improve: '#f59e0b',
  atrisk: '#f97316', critical: '#ef4444',
};

export default function ScoreDial({ score }: { score: any }) {
  if (!score) return null;
  const pct = Math.min(1, score.total / 1000);
  const r = 56, cx = 70, cy = 70;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = BAND_COLORS[score.bandColor] ?? '#6b7280';

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e4e4e7" strokeWidth="12" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="800" fill="currentColor" className="text-zinc-900">{score.total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="currentColor" className="text-zinc-500">/ 1000</text>
      </svg>
      <Badge className="mt-2 text-xs py-1 px-4" style={{ backgroundColor: color, color: '#fff' }}>{score.band}</Badge>
    </div>
  );
}
