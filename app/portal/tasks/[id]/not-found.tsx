import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PortalTaskNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 bg-white rounded-xl border border-zinc-200 py-12">
      <div className="h-16 w-16 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
        <FileQuestion className="h-8 w-8 text-zinc-300" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Task Unavailable</h1>
      <p className="text-zinc-500 max-w-sm mb-8">
        This task either doesn't exist, has been deleted, or your profile doesn't have permission to view it.
      </p>
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link href="/portal">Dashboard</Link>
        </Button>
        <Button asChild variant="default" className="bg-teal-600 hover:bg-teal-700">
          <Link href="/portal/tasks">All Tasks</Link>
        </Button>
      </div>
    </div>
  );
}
