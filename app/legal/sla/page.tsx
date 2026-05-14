import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function SLAPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose prose-zinc">
      <Link href="/legal" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 no-underline"><ChevronLeft className="h-4 w-4" /> Back</Link>
      <h1>Service Level Agreement</h1>
      <h2>Response targets</h2>
      <table>
        <thead><tr><th>Channel</th><th>Severity</th><th>First response</th><th>Resolution</th></tr></thead>
        <tbody>
          <tr><td>Portal query</td><td>Standard</td><td>1 business day</td><td>5 business days</td></tr>
          <tr><td>Portal query</td><td>Urgent (notice / hearing)</td><td>4 hours</td><td>2 business days</td></tr>
          <tr><td>Email</td><td>Standard</td><td>1 business day</td><td>—</td></tr>
          <tr><td>Phone (escalation)</td><td>Critical</td><td>1 hour</td><td>—</td></tr>
        </tbody>
      </table>
      <h2>Uptime</h2>
      <p>Portal target: 99.5% rolling 30-day uptime, excluding scheduled maintenance windows announced 48h in advance.</p>
      <h2>Compliance filing dates</h2>
      <p>We commit to filing on or before statutory due dates provided records are received at least 5 working days prior.</p>
    </div>
  );
}
