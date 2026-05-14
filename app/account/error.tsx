'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AccountError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Account error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-6">
        <h1 className="text-2xl font-bold text-zinc-900">Something went wrong</h1>
        <p className="text-zinc-500 text-sm">An error occurred while loading this page. Try refreshing.</p>
        <Button onClick={() => reset()} variant="outline" className="rounded-xl">Try again</Button>
      </div>
    </div>
  );
}
