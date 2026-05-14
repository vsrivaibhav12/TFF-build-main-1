import Link from 'next/link';
import { ClipboardList, CalendarDays, Wallet } from 'lucide-react';

interface HrCard {
  href: string;
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
  testid: string;
}

const CARDS: HrCard[] = [
  {
    href: '/admin/attendance',
    title: 'Attendance',
    body: 'View and mark attendance for all staff members. Override check-ins, mark WFH or field work.',
    icon: ClipboardList,
    testid: 'hr-attendance',
  },
  {
    href: '/admin/leave',
    title: 'Leave',
    body: 'Review and approve leave requests. View balances and team availability calendar.',
    icon: CalendarDays,
    testid: 'hr-leave',
  },
  {
    href: '/admin/payroll',
    title: 'Payroll',
    body: 'Run monthly payroll, generate payslips, and manage salary revisions.',
    icon: Wallet,
    testid: 'hr-payroll',
  },
];

export default function AdminHrHub() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="tff-page-title">HR</h1>
        <p className="tff-page-subtitle">
          Attendance, leave, and payroll management for your firm.
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
