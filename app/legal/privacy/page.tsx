import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose prose-zinc">
      <Link href="/login" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 no-underline"><ChevronLeft className="h-4 w-4" /> Back</Link>
      <h1>Privacy Policy</h1>
      <p className="text-zinc-500">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <h2>1. Who we are</h2>
      <p>The Fiscal Fulcrum (“TFF”, “we”, “us”) operates a chartered-accountancy operations portal at <strong>fiscalfulcrum.in</strong> for our engaged clients. This policy explains how we collect, use, store, share and protect personal data in compliance with India’s <strong>Digital Personal Data Protection Act, 2023</strong> (DPDP).</p>

      <h2>2. Data we hold</h2>
      <ul>
        <li><strong>Identity & contact:</strong> name, email, phone, role, business affiliation</li>
        <li><strong>Financial / regulatory:</strong> PAN, GSTIN, financial statements, tax filings, bank statements as supplied for engagement</li>
        <li><strong>Operational:</strong> tasks, queries, documents, notices, vault items (DSC, portal credentials — encrypted at rest)</li>
        <li><strong>System:</strong> audit logs, access timestamps, IP addresses</li>
      </ul>

      <h2>3. Lawful basis</h2>
      <p>We process personal data on the basis of (a) the engagement contract you have signed with us; (b) our statutory obligations as your auditor / tax practitioner; and (c) your explicit consent for portal access.</p>

      <h2>4. How we protect data</h2>
      <ul>
        <li>Row-Level Security (RLS) on every Postgres table — data is partitioned per client at the database level</li>
        <li>AES-GCM encryption for portal credentials and DSC PINs</li>
        <li>Capability-based access control for staff (25 distinct rights, audited grants)</li>
        <li>Mandatory TLS / HTTPS for all traffic</li>
        <li>Role-based access reviewed quarterly</li>
      </ul>

      <h2>5. Sharing</h2>
      <p>We do not sell your data. We share only with: (a) statutory authorities as required by law; (b) sub-processors strictly necessary to operate the portal (Supabase, Vercel, Resend) under data-processing agreements.</p>

      <h2>6. Your rights under DPDP</h2>
      <ul>
        <li>Right to access your personal data</li>
        <li>Right to correction and erasure</li>
        <li>Right to grievance redressal (write to <a href="mailto:dpo@fiscalfulcrum.in">dpo@fiscalfulcrum.in</a>)</li>
        <li>Right to nominate a representative</li>
        <li>Right to withdraw consent (note: withdrawing may impair our ability to deliver the engagement)</li>
      </ul>

      <h2>7. Retention</h2>
      <p>We retain your data for the duration of the engagement plus 8 years thereafter to satisfy ICAI and tax-record-keeping mandates. After that, data is deleted or fully anonymised.</p>

      <h2>8. Data Protection Officer</h2>
      <p>Email: <a href="mailto:dpo@fiscalfulcrum.in">dpo@fiscalfulcrum.in</a> · Response window: 30 days</p>
    </div>
  );
}
