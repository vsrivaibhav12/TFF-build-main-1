'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Briefcase, Users, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CmdItem {
  id: string;
  label: string;
  href: string;
  group: string;
  icon?: React.ReactNode;
  keywords?: string;
}

// v3: Cmd-K is RECORD search only — clients, tasks, notices.
// Navigation between pages is the sidebar's job. No "Go to ..." entries.
const BASE_ITEMS: CmdItem[] = [];

export default function CommandPalette({ role }: { role: 'admin' | 'team' | 'client' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [items, setItems] = useState<CmdItem[]>(BASE_ITEMS);
  const [pending, startTransition] = useTransition();

  const basePath = role === 'admin' ? '/admin' : '/team';

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') setOpen(false);
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onOpenEvent);
    };
  }, []);

  // When query changes, fetch dynamic suggestions (clients matching)
  useEffect(() => {
    if (!open || q.length < 2) { setItems([]); return; }
    startTransition(async () => {
      try {
        const r = await fetch(`/api/cmdk/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
        const j = await r.json();
        const out: CmdItem[] = [];
        for (const c of j.clients ?? []) {
          out.push({ id: `client-${c.id}`, label: c.business_name, group: 'Clients', href: `${basePath}/clients/${c.id}`, icon: <Users className="h-3.5 w-3.5" /> });
        }
        for (const t of j.tasks ?? []) {
          out.push({ id: `task-${t.id}`, label: t.title, group: 'Tasks', href: `${basePath}/tasks/${t.id}`, icon: <Briefcase className="h-3.5 w-3.5" />, keywords: t.client_name });
        }
        for (const n of j.notices ?? []) {
          out.push({ id: `notice-${n.id}`, label: n.subject || n.notice_type, group: 'Notices', href: `${basePath}/notices/${n.id}`, icon: <ScrollText className="h-3.5 w-3.5" />, keywords: n.client_name });
        }
        setItems(out);
      } catch { setItems([]); }
    });
  }, [q, open, basePath]);

  const ql = q.toLowerCase().trim();
  const filtered = items.filter((i) => !ql || i.label.toLowerCase().includes(ql) || (i.keywords ?? '').toLowerCase().includes(ql));
  const groups = filtered.reduce<Record<string, CmdItem[]>>((acc, i) => { (acc[i.group] = acc[i.group] || []).push(i); return acc; }, {});

  function go(href: string) { setOpen(false); router.push(href); }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] bg-zinc-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} data-testid="cmdk-overlay">
      <div className="w-full max-w-xl mx-4 rounded-xl border border-zinc-200 bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) go(filtered[active].href); }
            }}
            placeholder="Search clients, tasks, notices…"
            className="flex-1 outline-none text-sm placeholder:text-zinc-400"
            data-testid="cmdk-input"
          />
          <kbd className="text-xs text-zinc-400 font-mono">esc</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {q.length < 2 && <div className="p-8 text-sm text-center text-zinc-500">Type to search clients, tasks, notices…</div>}
          {q.length >= 2 && Object.keys(groups).length === 0 && <div className="p-8 text-sm text-center text-zinc-500">No matches.</div>}
          {Object.entries(groups).map(([gname, items]) => (
            <div key={gname}>
              <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">{gname}</div>
              {items.map((i) => {
                const idx = filtered.indexOf(i);
                return (
                  <button
                    key={i.id}
                    onClick={() => go(i.href)}
                    onMouseEnter={() => setActive(idx)}
                    className={cn('w-full flex items-center gap-2 px-4 py-2 text-sm text-left', idx === active ? 'bg-teal-50 text-teal-900' : 'hover:bg-zinc-50')}
                    data-testid={`cmdk-item-${i.id}`}
                  >
                    {i.icon}
                    <span className="flex-1">{i.label}</span>
                    <span className="text-[10px] text-zinc-400">{i.href}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-zinc-100 text-[10px] text-zinc-400 flex items-center justify-between">
          <span>↑↓ navigate · ↵ open · esc close</span>
          {pending && <span>Loading…</span>}
        </div>
      </div>
    </div>
  );
}
