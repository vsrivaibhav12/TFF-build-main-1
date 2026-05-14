'use client';
import { useEffect, useState } from 'react';
import { Keyboard } from 'lucide-react';

const SHORTCUTS = [
  ['⌘/Ctrl + K', 'Open command palette'],
  ['?', 'Show this overlay'],
  ['esc', 'Close overlays / palettes'],
  ['G then C', 'Go to clients'],
  ['G then T', 'Go to tasks'],
  ['G then Q', 'Go to queries'],
  ['G then D', 'Go to documents'],
  ['N', 'New (context-sensitive)'],
];

export default function ShortcutsHelp({ role }: { role: 'admin' | 'team' | 'client' }) {
  const [open, setOpen] = useState(false);
  const [g, setG] = useState(false);

  const basePath = role === 'admin' ? '/admin' : '/team';

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).matches?.('input, textarea, [contenteditable]')) return;
      if (e.key === '?') { e.preventDefault(); setOpen((v) => !v); }
      else if (e.key === 'Escape') setOpen(false);
      else if (e.key === 'g' || e.key === 'G') setG(true);
      else if (g) {
        if (e.key === 'c') window.location.href = `${basePath}/clients`;
        else if (e.key === 't') window.location.href = `${basePath}/tasks`;
        else if (e.key === 'q') window.location.href = `${basePath}/queries`;
        else if (e.key === 'd') window.location.href = `${basePath}/documents`;
        setG(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g, basePath]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} data-testid="shortcuts-overlay">
      <div className="max-w-md w-[90%] rounded-xl border border-zinc-200 bg-white shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold flex items-center gap-2"><Keyboard className="h-4 w-4 text-teal-600" /> Keyboard shortcuts</h3>
        <div className="mt-4 divide-y divide-zinc-100">
          {SHORTCUTS.map(([k, label]) => (
            <div key={k} className="flex items-center justify-between py-2 text-sm">
              <span>{label}</span>
              <kbd className="font-mono text-xs bg-zinc-100 px-2 py-0.5 rounded">{k}</kbd>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-zinc-400">Press <kbd>?</kbd> anytime to toggle this overlay.</div>
      </div>
    </div>
  );
}
