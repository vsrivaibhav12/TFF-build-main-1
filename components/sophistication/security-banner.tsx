'use client';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function SecurityBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="bg-teal-600 text-white px-4 py-2 flex items-center justify-between gap-4 text-xs font-medium animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4" />
        <span>Protect your firm. Enable Two-Factor Authentication (2FA) to secure your data and client records.</span>
        <button className="underline underline-offset-4 flex items-center gap-1 hover:text-teal-100 transition-colors ml-2">
          Setup now <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <button 
        onClick={() => setVisible(false)}
        className="p-1 hover:bg-teal-700 rounded-md transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
