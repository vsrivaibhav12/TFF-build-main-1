import { Skeleton } from '@/components/ui/skeleton';

export default function PortalTasksLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Skeleton className="h-8 w-40" />
      <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
