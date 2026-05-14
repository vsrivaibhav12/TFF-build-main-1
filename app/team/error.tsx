'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function TeamError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Team error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-6">
        <h1 className="text-2xl font-bold text-zinc-900">Something went wrong</h1>
        <p className="text-zinc-500 text-sm">An error occurred while loading this page. Try refreshing.</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => reset()} variant="outline" className="rounded-xl">Try again</Button>
          <Button onClick={() => window.location.href = '/team'} variant="ghost" className="rounded-xl">Go to workspace</Button>
        </div>
      </div>
    </div>
  );
}
