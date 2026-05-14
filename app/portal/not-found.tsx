import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PortalNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="h-16 w-16 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
        <ShieldAlert className="h-8 w-8 text-zinc-400" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Module Restricted or Not Found</h1>
      <p className="text-zinc-500 max-w-md mb-8">
        The module you are trying to access has not been enabled for your business profile, or the link is incorrect. Please contact your engagement team if you believe this is an error.
      </p>
      <Button asChild variant="default" className="bg-teal-600 hover:bg-teal-700">
        <Link href="/portal">Return to Dashboard</Link>
      </Button>
    </div>
  );
}
