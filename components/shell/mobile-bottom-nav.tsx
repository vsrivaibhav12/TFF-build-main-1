'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LayoutDashboard, Briefcase, Calendar, FileText, MessageSquare } from 'lucide-react';

const TABS = [
  { href: '/portal', label: 'Home', icon: LayoutDashboard },
  { href: '/portal/tasks', label: 'Work', icon: Briefcase },
  { href: '/portal/calendar', label: 'Calendar', icon: Calendar },
  { href: '/portal/documents', label: 'Docs', icon: FileText },
  { href: '/portal/queries', label: 'Queries', icon: MessageSquare },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      data-testid="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-lg border-t border-zinc-200/60 grid grid-cols-5 pb-[env(safe-area-inset-bottom,0)]"
    >
      {TABS.map((t) => {
        const active = t.href === '/portal' ? pathname === '/portal' : pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold min-h-[56px] transition-colors',
              active ? 'text-teal-700' : 'text-zinc-400'
            )}
            data-testid={`bottom-tab-${t.label.toLowerCase()}`}
          >
            {active && (
              <motion.div
                layoutId="activeTab"
                className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-teal-500"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <Icon className={cn('h-5 w-5 transition-all', active ? 'stroke-[2.5] -translate-y-0.5' : '')} />
            <span className={cn('transition-all', active ? 'font-bold' : '')}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
