'use client';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Floating "View as client" toggle. Doesn't actually swap auth (which would
 * be a security risk); instead, it dims admin-only UI and adds a top banner so
 * the team member can preview the layout from a client's perspective.
 */
export default function ViewAsClientToggle() {
  const [on, setOn] = useState(false);
  return (
    <>
      <button
        onClick={() => setOn((v) => !v)}
        className={cn('fixed bottom-4 right-4 z-40 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg flex items-center gap-2 hover:border-teal-400', on && 'border-teal-500 text-teal-800')}
        data-testid="view-as-client-toggle"
      >
        {on ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {on ? 'Exit client view' : 'View as client'}
      </button>
      {on && (
        <>
          <div className="fixed top-0 inset-x-0 z-40 bg-amber-100 text-amber-900 text-center text-xs py-1 border-b border-amber-200" data-testid="view-as-banner">
            Previewing as client — admin-only UI is hidden. RLS enforces the actual data scope.
          </div>
          <style jsx global>{`
            [data-admin-only], [data-testid^="admin-"] { opacity: 0.25; pointer-events: none; }
          `}</style>
        </>
      )}
    </>
  );
}
