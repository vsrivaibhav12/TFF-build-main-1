import Link from 'next/link';

export default function LegalIndex() {
  const docs = [
    { href: '/legal/privacy', label: 'Privacy Policy', desc: 'How we collect, use and protect your data (DPDP-compliant).' },
    { href: '/legal/terms', label: 'Terms of Use', desc: 'Portal usage rules.' },
    { href: '/legal/engagement', label: 'Engagement Letter (template)', desc: 'Scope of services and fees.' },
    { href: '/legal/sla', label: 'Service Level Agreement', desc: 'Response, uptime and filing commitments.' },
  ];
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="tff-page-title">Legal documents</h1>
      <p className="tff-page-subtitle">Engagement, privacy, terms and SLA in one place.</p>
      <div className="mt-8 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
        {docs.map((d) => (
          <Link key={d.href} href={d.href} className="block p-5 hover:bg-zinc-50">
            <div className="font-medium text-zinc-900">{d.label}</div>
            <div className="text-sm text-zinc-500 mt-1">{d.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
