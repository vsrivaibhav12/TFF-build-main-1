import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose prose-zinc">
      <Link href="/login" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 no-underline"><ChevronLeft className="h-4 w-4" /> Back</Link>
      <h1>Terms of Use</h1>
      <p className="text-zinc-500">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <h2>1. Acceptance</h2><p>By accessing the TFF portal you agree to these terms in addition to your engagement letter.</p>
      <h2>2. Permitted use</h2><p>The portal is exclusively for the engaged client and authorised representatives. Sharing credentials with non-authorised parties is prohibited.</p>
      <h2>3. Intellectual property</h2><p>Tools, dashboards (BizLens, vCFO, Insights) and analytics outputs are proprietary to TFF. You receive a non-transferable, engagement-bounded licence to use them.</p>
      <h2>4. Liability</h2><p>Our liability is capped at the most recent year’s engagement fees actually paid, except where higher liability is mandated by ICAI or applicable law.</p>
      <h2>5. Termination</h2><p>We may suspend access for non-payment, suspected misuse or termination of the engagement. Data export will be made available for 60 days post-termination.</p>
      <h2>6. Governing law</h2><p>These terms are governed by Indian law. Jurisdiction: Chennai courts.</p>
    </div>
  );
}
