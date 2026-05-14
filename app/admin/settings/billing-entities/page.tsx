import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BillingEntitiesAdmin from './billing-entities-admin';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BillingEntitiesPage() {
  const sb = createClient();
  const [{ data: entities }, { data: pcs }, { data: users }] = await Promise.all([
    sb.from('billing_entities').select('*').order('name'),
    sb.from('profit_centres').select('code, name').eq('is_active', true).order('name'),
    sb.from('users_profile').select('id, full_name, email, role').in('role', ['admin', 'team']).eq('is_active', true).order('full_name'),
  ]);
  // Also pull existing user-entity access
  const { data: access } = await sb
    .from('user_billing_entity_access')
    .select('user_id, billing_entity_id');

  return (
    <div className="space-y-8 max-w-5xl">
      <Link href="/admin/settings" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Settings
      </Link>
      <div>
        <h1 className="tff-page-title">Billing entities</h1>
        <p className="tff-page-subtitle">
          Configure each legal entity that bills its own clients (TFF LLP, your existing CA practice, etc.).
          Each task and each invoice belongs to one billing entity.
        </p>
      </div>
      <BillingEntitiesAdmin
        entities={(entities ?? []) as any}
        profitCentres={(pcs ?? []) as any}
        staff={(users ?? []) as any}
        access={(access ?? []) as any}
      />
    </div>
  );
}
