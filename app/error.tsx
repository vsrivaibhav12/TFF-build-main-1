'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Root error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4 max-w-md px-6">
        <h1 className="text-2xl font-bold text-zinc-900">Something went wrong</h1>
        <p className="text-zinc-500 text-sm">An unexpected error occurred. Try refreshing the page.</p>
        <Button onClick={() => reset()} variant="outline" className="rounded-xl">Try again</Button>
      </div>
    </div>
  );
}
