'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Layout,
  Users,
  Briefcase,
  FileText,
  MessageSquare,
  BarChart3,
  Calendar,
  Settings,
  ShieldCheck,
  KeyRound,
  Wallet,
  TrendingUp,
  ScrollText,
  ClipboardList,
  Gavel,
  Search,
  Bell,
  Receipt,
  Calculator,
  Layers,
  UsersRound,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationsBell from './notifications-bell';
import CommandPalette from './command-palette';
import ShortcutsHelp from '@/components/sophistication/shortcuts-help';
import ViewAsClientToggle from '@/components/sophistication/view-as-client-toggle';

const ICONS: Record<string, LucideIcon> = {
  layout: Layout,
  dashboard: LayoutDashboard,
  users: Users,
  briefcase: Briefcase,
  file: FileText,
  message: MessageSquare,
  chart: BarChart3,
  calendar: Calendar,
  settings: Settings,
  shield: ShieldCheck,
  key: KeyRound,
  wallet: Wallet,
  trending: TrendingUp,
  scroll: ScrollText,
  clipboard: ClipboardList,
  gavel: Gavel,
  bell: Bell,
  receipt: Receipt,
  calculator: Calculator,
  layers: Layers,
  group: UsersRound,
};

export type NavIconName = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  section?: string;
}

function getInitials(name: string | null): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadge(role: string) {
  const styles: Record<string, string> = {
    admin: 'bg-teal-100 text-teal-700 border-teal-200',
    team: 'bg-blue-100 text-blue-700 border-blue-200',
    client: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  };
  const labels: Record<string, string> = {
    admin: 'Admin',
    team: 'Team',
    client: 'Client',
  };
  return { style: styles[role] || styles.client, label: labels[role] || 'User' };
}

export default function AppShell({
  user,
  role,
  nav,
  children,
}: {
  user: { email: string; full_name: string | null; role: string };
  role: 'admin' | 'team' | 'client';
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const roleBadge = getRoleBadge(role);

  // Build breadcrumbs from pathname
  const breadcrumbSegments = pathname
    .split('/')
    .filter(Boolean)
    .slice(1); // Skip role prefix (admin/team/portal)

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white">
          {/* Logo */}
          <div className="px-5 py-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-teal-sm">
                <span className="text-white font-bold text-sm">FF</span>
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-zinc-900 leading-none">
                  The <span className="text-teal-600">Fiscal</span>
                </div>
                <div className="text-sm font-bold tracking-tight text-zinc-900 leading-none">
                  Fulcrum
                </div>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
            {(() => {
              let currentSection: string | undefined = undefined;
              return nav.map((n) => {
                const Icon = ICONS[n.icon] ?? Layout;
                const active = pathname === n.href || pathname.startsWith(n.href + '/');
                const showSection = n.section && n.section !== currentSection;
                if (showSection) currentSection = n.section;
                return (
                  <div key={n.href}>
                    {showSection && (
                      <div className="px-2.5 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        {n.section}
                      </div>
                    )}
                    <Link
                      href={n.href}
                      data-testid={`nav-${n.label.toLowerCase().replace(/ /g, '-')}`}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200',
                        active
                          ? 'bg-teal-50 text-teal-800 border-l-2 border-l-teal-500'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          active ? 'text-teal-600' : 'text-zinc-400 group-hover:text-zinc-600'
                        )}
                      />
                      <span className="truncate">{n.label}</span>
                      {active && (
                        <ChevronRight className="ml-auto h-3.5 w-3.5 text-teal-400 opacity-60" />
                      )}
                    </Link>
                  </div>
                );
              });
            })()}
          </nav>

          {/* User profile */}
          <div className="mx-3 mb-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50/80">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {getInitials(user.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-zinc-900 truncate">
                  {user.full_name || user.email}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                      roleBadge.style
                    )}
                  >
                    {roleBadge.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              data-testid="logout-btn"
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 py-1.5 rounded-md hover:bg-zinc-100 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between border-b border-zinc-200/80 bg-white/90 backdrop-blur-lg px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">FF</span>
            </div>
            <span className="text-sm font-bold text-zinc-900">TFF</span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <button onClick={() => setMobileOpen((v) => !v)} className="p-2" aria-label="menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-20 bg-black/20 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">FF</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-zinc-900">The Fiscal Fulcrum</div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                        {roleBadge.label}
                      </div>
                    </div>
                  </div>
                </div>
                <nav className="px-3 py-3 space-y-0.5">
                  {(() => {
                    let currentSection: string | undefined = undefined;
                    return nav.map((n) => {
                      const Icon = ICONS[n.icon] ?? Layout;
                      const active = pathname === n.href || pathname.startsWith(n.href + '/');
                      const showSection = n.section && n.section !== currentSection;
                      if (showSection) currentSection = n.section;
                      return (
                        <div key={n.href}>
                          {showSection && (
                            <div className="px-2.5 pt-4 pb-1 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                              {n.section}
                            </div>
                          )}
                          <Link
                            href={n.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                              active
                                ? 'bg-teal-50 text-teal-800 border-l-2 border-l-teal-500'
                                : 'text-zinc-700 hover:bg-zinc-50'
                            )}
                          >
                            <Icon className={cn('h-4 w-4', active ? 'text-teal-600' : 'text-zinc-400')} />
                            {n.label}
                          </Link>
                        </div>
                      );
                    });
                  })()}
                </nav>
                <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                      {getInitials(user.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900 truncate">
                        {user.full_name || user.email}
                      </div>
                      <div className="text-xs text-zinc-500">{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Desktop top bar */}
          <div className="hidden md:flex items-center justify-between gap-4 px-8 py-4 sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
              <Link href={`/${role}`} className="hover:text-zinc-900 transition-colors capitalize">
                {role === 'client' ? 'Portal' : role}
              </Link>
              {breadcrumbSegments.map((segment, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
                  <span
                    className={cn(
                      'capitalize',
                      i === breadcrumbSegments.length - 1
                        ? 'text-zinc-900 font-medium'
                        : 'hover:text-zinc-900 transition-colors'
                    )}
                  >
                    {segment.replace(/-/g, ' ')}
                  </span>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Search trigger */}
              <button
                onClick={() =>
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
                }
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-500 bg-zinc-50/80 border border-zinc-200/80 rounded-lg hover:border-zinc-300 hover:bg-white transition-all group"
              >
                <Search className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600" />
                <span className="text-zinc-400">Search...</span>
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-zinc-400">
                  <span className="text-[10px]">Ctrl</span>K
                </kbd>
              </button>
              <NotificationsBell />
            </div>
          </div>

          {/* Content area */}
          <div className="px-6 md:px-8 py-6 md:py-8 pt-20 md:pt-6 bg-zinc-50 min-h-screen">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </div>
        </main>

        {/* Global overlays */}
        <CommandPalette role={role} />
        <ShortcutsHelp role={role} />
        {(role === 'admin' || role === 'team') && <ViewAsClientToggle />}
      </div>
    </div>
  );
}
