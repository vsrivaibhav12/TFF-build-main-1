import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { getBizlensReports } from '@/lib/actions/bizlens-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import Link from 'next/link';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

export default async function PortalBizLensPage() {
  await requireRole('client');
  const sb = createClient();
  const { data: cu } = await sb
    .from('client_users')
    .select('client_id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
    
  const clientId = (cu as any)?.client_id ?? null;

  if (!clientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="tff-page-title">BizLens</h1>
          <p className="tff-page-subtitle">Your business analytics workspace.</p>
        </div>
        <EmptyState
          title="No business linked"
          body="Your account is not linked to a client business yet. Contact your engagement team."
          icon={<BarChart3 className="h-6 w-6 text-zinc-400" />}
        />
      </div>
    );
  }

  const allReports = await getBizlensReports(clientId);
  const publishedReports = allReports.filter(r => r.status === 'published');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="tff-page-title">BizLens</h1>
        <p className="tff-page-subtitle">Your business analytics workspace.</p>
      </div>
      
      {publishedReports.length === 0 ? (
        <EmptyState
          title="No reports yet"
          body="There are no published BizLens reports available for your business yet."
          icon={<BarChart3 className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {publishedReports.map((report) => (
            <Card key={report.id} className="hover:border-zinc-300 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">
                  {new Date(report.period_year, (report.period_month || 1) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <CardDescription>
                  {report.months_covered} Month{report.months_covered > 1 ? 's' : ''} Period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="default" className="w-full bg-teal-600 hover:bg-teal-700" asChild>
                  <Link href={`/portal/bizlens/${report.id}`}>View Insights</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
