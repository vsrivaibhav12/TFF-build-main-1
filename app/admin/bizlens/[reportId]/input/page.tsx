import { notFound } from 'next/navigation';
import { getBizlensReport } from '@/lib/actions/bizlens-actions';
import { listBizlensSnapshots } from '@/lib/repositories/bizlens-snapshots';
import BizlensStudioInputForm from '@/components/operations/bizlens/input-form';

export default async function BizlensInputPage({ params }: { params: { reportId: string } }) {
  const report = await getBizlensReport(params.reportId);
  if (!report) notFound();

  const snapshots = await listBizlensSnapshots(report.client_id);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="tff-page-title">BizLens Studio</h1>
        <p className="tff-page-subtitle">Data entry for client diagnostic reporting.</p>
      </div>
      <BizlensStudioInputForm report={report} clientId={report.client_id} role="admin" snapshots={snapshots as any} />
    </div>
  );
}
