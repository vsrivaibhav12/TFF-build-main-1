import Link from 'next/link';
import {
  ShieldCheck, Wallet, FolderTree, Calendar, Settings as SettingsIcon, Lock, Building2, FileText,
} from 'lucide-react';

interface SettingCard {
  href: string;
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
  testid: string;
}

const CARDS: SettingCard[] = [
  { href: '/admin/team/roles', title: 'Staff role templates', body: 'Group capabilities into roles like Senior Tax Associate. Apply to team members in one click.', icon: ShieldCheck, testid: 'set-roles' },
  { href: '/admin/settings/billing-entities', title: 'Billing entities', body: 'TFF LLP, your existing CA practice — manage GSTIN, invoice prefix, signing authority, bank details.', icon: Wallet, testid: 'set-billing-entities' },
  { href: '/admin/settings/profit-cost-centres', title: 'Profit & cost centres', body: 'Two-character codes used to slice tasks, work-done, and reports by pillar (CaaS / BizLens / vCFO).', icon: FolderTree, testid: 'set-pc-cc' },
  { href: '/admin/settings/compliance-rules', title: 'Compliance calendar rules', body: 'Edit the statutory due-date master. Add, disable, or change reminder windows.', icon: Calendar, testid: 'set-rules' },
  { href: '/admin/settings/labels', title: 'Labels', body: 'Categorise tasks, clients, and documents with custom colour-coded labels.', icon: Lock, testid: 'set-labels' },
  { href: '/admin/services', title: 'Service catalogue', body: 'Define services, sub-services, SOP steps, document-request templates.', icon: SettingsIcon, testid: 'set-catalogue' },
  { href: '/admin/settings/tax-rates', title: 'Income tax rates', body: 'Set slab rates, surcharge, and cess for each assessee category.', icon: FileText, testid: 'set-tax-rates' },
  { href: '/admin/settings/firm-profile', title: 'Firm profile', body: 'Your firm name, address, GSTIN, and contact details.', icon: Building2, testid: 'set-firm' },
];

export default function AdminSettingsHub() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="tff-page-title">Settings</h1>
        <p className="tff-page-subtitle">
          Firm-wide configuration. Most things you change here apply to every staff member and every client.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              data-testid={c.testid}
              className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-teal-300 hover:bg-teal-50/30 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 group-hover:border-teal-200 group-hover:bg-white">
                  <Icon className="h-4 w-4 text-teal-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{c.title}</div>
                  <p className="text-sm text-zinc-600 mt-1">{c.body}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
