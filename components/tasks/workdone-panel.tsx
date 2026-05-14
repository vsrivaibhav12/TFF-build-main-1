'use client';
import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Square, Plus, Trash2, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { addManualWorkDoneAction, logTimerWorkDoneAction, deleteWorkDoneAction } from '@/lib/actions/workdone';
import { formatDateIST } from '@/lib/utils';
import type { WorkDoneRow } from '@/lib/repositories/workdone';

const STORAGE_PREFIX = 'tff:workdone-timer:';

export default function WorkDonePanel({
  taskId,
  initial,
  currentUserId,
}: {
  taskId: string;
  initial: WorkDoneRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ work_date: new Date().toISOString().slice(0, 10), hours: '', minutes: '', note: '' });
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [timerNote, setTimerNote] = useState('');
  const tickRef = useRef<any>(null);

  // Restore in-progress timer on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + taskId);
    if (saved) {
      const parsed = JSON.parse(saved);
      setTimerStart(parsed.startedAt);
      setTimerNote(parsed.note ?? '');
    }
  }, [taskId]);

  // Tick every second while a timer is running
  useEffect(() => {
    if (!timerStart) return;
    const update = () => setElapsedSec(Math.floor((Date.now() - timerStart) / 1000));
    update();
    tickRef.current = setInterval(update, 1000);
    return () => clearInterval(tickRef.current);
  }, [timerStart]);

  function startTimer() {
    const now = Date.now();
    setTimerStart(now);
    setElapsedSec(0);
    localStorage.setItem(STORAGE_PREFIX + taskId, JSON.stringify({ startedAt: now, note: timerNote }));
  }

  function stopTimer() {
    if (!timerStart) return;
    const startedAt = new Date(timerStart).toISOString();
    const endedAt = new Date().toISOString();
    const noteAtStop = timerNote;
    setTimerStart(null);
    setElapsedSec(0);
    localStorage.removeItem(STORAGE_PREFIX + taskId);
    startTransition(async () => {
      const r = await logTimerWorkDoneAction({ task_id: taskId, started_at: startedAt, ended_at: endedAt, note: noteAtStop || null });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(`Logged ${r.data.duration_minutes}m to this task`);
      setTimerNote('');
      router.refresh();
    });
  }

  function submitManual() {
    const totalMinutes = (Number(manual.hours) || 0) * 60 + (Number(manual.minutes) || 0);
    if (totalMinutes <= 0) { toast.error('Enter at least 1 minute'); return; }
    if (totalMinutes > 1440) { toast.error('Cannot log more than 24 hours in one entry'); return; }
    startTransition(async () => {
      const r = await addManualWorkDoneAction({
        task_id: taskId,
        work_date: manual.work_date,
        duration_minutes: totalMinutes,
        note: manual.note || null,
      });
      if (!r.success) { toast.error(r.error); return; }
      toast.success(`Logged ${totalMinutes}m`);
      setManual({ work_date: new Date().toISOString().slice(0, 10), hours: '', minutes: '', note: '' });
      setShowManual(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm('Delete this time entry?')) return;
    startTransition(async () => {
      const r = await deleteWorkDoneAction(id);
      if (!r.success) { toast.error(r.error); return; }
      toast.success('Entry deleted');
      router.refresh();
    });
  }

  const totalMin = initial.reduce((s, e) => s + e.duration_minutes, 0);
  const myTotalMin = initial.filter((e) => e.user_id === currentUserId).reduce((s, e) => s + e.duration_minutes, 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-teal-600" /> Time tracked
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {fmtHM(totalMin)} total · {fmtHM(myTotalMin)} by you
          </p>
        </div>
      </div>

      {/* Timer */}
      <div className="rounded-lg border border-zinc-100 bg-zinc-50/40 p-4">
        <div className="flex items-center gap-3">
          {!timerStart ? (
            <Button onClick={startTimer} size="sm" data-testid="timer-start">
              <Play className="h-3.5 w-3.5 mr-1" /> Start timer
            </Button>
          ) : (
            <>
              <Button onClick={stopTimer} size="sm" variant="destructive" disabled={pending} data-testid="timer-stop">
                <Square className="h-3.5 w-3.5 mr-1" /> Stop & log
              </Button>
              <span className="font-mono text-sm tabular-nums">{fmtHMS(elapsedSec)}</span>
            </>
          )}
          <Input
            placeholder="What are you working on? (optional)"
            value={timerNote}
            onChange={(e) => {
              setTimerNote(e.target.value);
              if (timerStart) localStorage.setItem(STORAGE_PREFIX + taskId, JSON.stringify({ startedAt: timerStart, note: e.target.value }));
            }}
            className="flex-1 h-8"
          />
        </div>
        {timerStart && (
          <p className="text-[11px] text-zinc-500 mt-2">
            Timer survives page reloads. Will auto-cap at 24h.
          </p>
        )}
      </div>

      {/* Manual entry */}
      {!showManual ? (
        <Button variant="outline" size="sm" onClick={() => setShowManual(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add manual entry
        </Button>
      ) : (
        <div className="rounded-lg border border-zinc-100 bg-white p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="wd-date" className="text-xs">Date</Label>
              <Input id="wd-date" type="date" value={manual.work_date} onChange={(e) => setManual({ ...manual, work_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wd-h" className="text-xs">Hours</Label>
              <Input id="wd-h" type="number" min={0} max={23} value={manual.hours} onChange={(e) => setManual({ ...manual, hours: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wd-m" className="text-xs">Minutes</Label>
              <Input id="wd-m" type="number" min={0} max={59} value={manual.minutes} onChange={(e) => setManual({ ...manual, minutes: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wd-note" className="text-xs">Note (optional)</Label>
            <Input id="wd-note" value={manual.note} onChange={(e) => setManual({ ...manual, note: e.target.value })} placeholder="What did you work on?" />
          </div>
          <div className="flex gap-2">
            <Button onClick={submitManual} disabled={pending} size="sm">
              {pending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Log entry
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowManual(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* History */}
      {initial.length > 0 && (
        <div className="border-t border-zinc-100 pt-3">
          <ul className="space-y-2">
            {initial.slice(0, 10).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium tabular-nums">{fmtHM(e.duration_minutes)}</span>
                  <span className="text-zinc-400 mx-2">·</span>
                  <span className="text-zinc-600">{e.users_profile?.full_name ?? 'You'}</span>
                  <span className="text-zinc-400 mx-2">·</span>
                  <span className="text-zinc-500 text-xs">{formatDateIST(e.work_date)}</span>
                  {e.entry_method === 'timer' && (
                    <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide text-teal-600 font-semibold">
                      <Clock className="h-2.5 w-2.5" /> timer
                    </span>
                  )}
                  {e.note && <div className="text-xs text-zinc-500 truncate">{e.note}</div>}
                </div>
                {(e.user_id === currentUserId) && (
                  <button onClick={() => remove(e.id)} disabled={pending} className="text-zinc-400 hover:text-red-600 p-1" aria-label="Delete entry">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {initial.length > 10 && <p className="text-xs text-zinc-400 mt-2">… and {initial.length - 10} more</p>}
        </div>
      )}
    </div>
  );
}

function fmtHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtHMS(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
