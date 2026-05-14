'use client';
import { TrendingUp, Activity } from 'lucide-react';

export default function InsightStrip() {
  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-zinc-50 border-y border-zinc-200 text-[11px] font-medium text-zinc-500 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
        <span className="uppercase tracking-wider text-zinc-400">System ready</span>
      </div>

      <div className="h-3 w-px bg-zinc-200 shrink-0" />

      <div className="flex items-center gap-2 shrink-0">
        <TrendingUp className="h-3 w-3 text-teal-600" />
        <span>Compliance insights appear here as filings are processed</span>
      </div>
    </div>
  );
}
