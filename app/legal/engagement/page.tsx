import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function EngagementLetter() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose prose-zinc">
      <Link href="/legal" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 no-underline"><ChevronLeft className="h-4 w-4" /> Back</Link>
      <h1>Engagement Letter (Template)</h1>
      <p className="text-zinc-500">This is a template; the executed letter you signed governs the actual engagement.</p>
      <h2>1. Scope of services</h2>
      <ul>
        <li>Bookkeeping and accounting</li>
        <li>GST registration, monthly / quarterly returns and reconciliation</li>
        <li>TDS computation, deposit and quarterly returns</li>
        <li>Income-tax filings and advance-tax planning</li>
        <li>ROC filings and secretarial compliance (where applicable)</li>
        <li>Notice drafting and representation before authorities</li>
        <li>vCFO support: cash, runway, variance and advisory notes</li>
      </ul>
      <h2>2. Fees</h2>
      <p>Fees are billed monthly in advance (or per the executed schedule). Out-of-scope work is quoted separately.</p>
      <h2>3. Client responsibilities</h2>
      <p>You agree to provide accurate and complete records, respond to queries within 5 working days and maintain primary records for the statutory retention period.</p>
      <h2>4. Confidentiality</h2>
      <p>Both parties keep all engagement information confidential except where disclosure is statutorily required.</p>
      <h2>5. Term</h2>
      <p>This engagement is on a rolling annual basis terminable by either party on 30 days’ written notice.</p>
    </div>
  );
}
