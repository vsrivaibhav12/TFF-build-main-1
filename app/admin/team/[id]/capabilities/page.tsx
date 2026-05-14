import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ALL_CAPABILITIES } from '@/lib/auth/capabilities';
import { listGrantedCapabilities } from '@/lib/repositories/staff-capabilities';
import CapabilitiesForm from './capabilities-form';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CapabilitiesPage({ params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: user } = await sb
    .from('users_profile')
    .select('id, full_name, email, role')
    .eq('id', params.id)
    .maybeSingle();
  if (!user) notFound();
  if ((user as any).role === 'admin') {
    return (
      <div className="space-y-6">
        <Link href={`/admin/team/${params.id}`} className="inline-flex items-center gap-1 text-sm text-zinc-500"><ChevronLeft className="h-4 w-4" /> Back</Link>
        <h1 className="tff-page-title">{(user as any).full_name}</h1>
        <div className="rounded-xl border border-zinc-200 p-6 bg-zinc-50 text-sm text-zinc-600">Admins implicitly hold every capability. There is nothing to grant.</div>
      </div>
    );
  }
  const granted = await listGrantedCapabilities(params.id);

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href={`/admin/team/${params.id}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Back to {(user as any).full_name}
      </Link>
      <div>
        <h1 className="tff-page-title">Manage capabilities</h1>
        <p className="tff-page-subtitle">Grant {(user as any).full_name} explicit rights. Every change is audited.</p>
      </div>
      <CapabilitiesForm
        userId={params.id}
        userName={(user as any).full_name}
        all={ALL_CAPABILITIES as unknown as string[]}
        granted={granted}
      />
    </div>
  );
}
