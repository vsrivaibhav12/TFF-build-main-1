'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { unlinkSubServiceAction, linkSubServiceAction, linkServiceToClientAction, updateClientServiceHeadAction } from '@/lib/actions/services';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Props {
  clientId: string;
  existingSubServices: any[];
  existingServices: any[];
  teamUsers: any[];
}

export default function ClientServiceManager({ clientId, existingSubServices, existingServices, teamUsers }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openSub, setOpenSub] = useState(false);
  const [openService, setOpenService] = useState(false);
  const [pickedSubServiceId, setPickedSubServiceId] = useState('');
  const [pickedServiceId, setPickedServiceId] = useState('');
  const [pickedServiceHeadId, setPickedServiceHeadId] = useState('');

  const [allSubServices, setAllSubServices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [loadedAll, setLoadedAll] = useState(false);

  async function loadAll() {
    if (loadedAll) return;
    try {
      const [resSub, resServ] = await Promise.all([
        fetch('/api/sub-services', { cache: 'no-store' }),
        fetch('/api/services', { cache: 'no-store' })
      ]);
      if (!resSub.ok || !resServ.ok) {
        toast.error('Failed to load services');
        return;
      }
      const subData = await resSub.json();
      const servData = await resServ.json();
      setAllSubServices(subData.items ?? []);
      setAllServices(servData.items ?? []);
      setLoadedAll(true);
    } catch (e) {
      toast.error('Failed to load services');
    }
  }

  function unlinkSub(linkId: string) {
    if (!confirm('Remove this sub-service from the client?')) return;
    startTransition(async () => {
      const r = await unlinkSubServiceAction({ id: linkId, client_id: clientId });
      if (!r.success) toast.error(r.error);
      else { toast.success('Removed'); router.refresh(); }
    });
  }

  function addSub() {
    if (!pickedSubServiceId) return;
    startTransition(async () => {
      const r = await linkSubServiceAction({ client_id: clientId, sub_service_id: pickedSubServiceId });
      if (!r.success) toast.error(r.error);
      else { toast.success('Added'); setOpenSub(false); setPickedSubServiceId(''); router.refresh(); }
    });
  }

  function addService() {
    if (!pickedServiceId) return;
    startTransition(async () => {
      const r = await linkServiceToClientAction({
        client_id: clientId,
        service_id: pickedServiceId,
        service_head_id: pickedServiceHeadId || null,
      });
      if (!r.success) toast.error(r.error);
      else { toast.success('Subscribed'); setOpenService(false); setPickedServiceId(''); setPickedServiceHeadId(''); router.refresh(); }
    });
  }

  function updateServiceHead(linkId: string, headId: string) {
    startTransition(async () => {
      const r = await updateClientServiceHeadAction({ id: linkId, client_id: clientId, service_head_id: headId || null });
      if (!r.success) toast.error(r.error);
      else { toast.success('Service head updated'); router.refresh(); }
    });
  }

  const linkedSubIds = new Set(existingSubServices.map((x: any) => x.sub_services?.id).filter(Boolean));
  const availableSubs = allSubServices.filter((s: any) => !linkedSubIds.has(s.id));

  const linkedServiceIds = new Set(existingServices.map((x: any) => x.services?.id).filter(Boolean));
  const availableServices = allServices.filter((s: any) => !linkedServiceIds.has(s.id));

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">Main service subscriptions</h3>
          <Dialog open={openService} onOpenChange={(o) => { setOpenService(o); if (o) loadAll(); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50" data-testid="add-service-btn">
                <Plus className="h-4 w-4" /> Subscribe to service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Subscribe to service</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-zinc-500">Subscribing a client to a service enables the corresponding module in their portal.</p>
                <Select value={pickedServiceId} onValueChange={setPickedServiceId}>
                  <SelectTrigger data-testid="pick-service"><SelectValue placeholder="Select service..." /></SelectTrigger>
                  <SelectContent>
                    {availableServices.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={pickedServiceHeadId} onValueChange={setPickedServiceHeadId}>
                  <SelectTrigger><SelectValue placeholder="Service head (optional)..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {teamUsers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableServices.length === 0 && <p className="text-xs text-zinc-500">All services already subscribed.</p>}
              </div>
              <DialogFooter>
                <Button onClick={addService} disabled={!pickedServiceId || pending} className="bg-teal-600 hover:bg-teal-700">Subscribe</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {existingServices.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 p-10 text-center bg-zinc-50/50">
            <div className="text-sm font-bold text-zinc-900">No active subscriptions</div>
            <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto leading-relaxed">
              Main services like BizLens or vCFO must be subscribed here to enable their respective dashboards and portal access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {existingServices.map((s: any) => (
              <div key={s.id} className="flex flex-col gap-3 p-5 rounded-xl border border-zinc-200 bg-white hover:border-teal-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-zinc-900">{s.services?.name}</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                      {s.services?.code} · Subscribed {formatDateIST(s.start_date)}
                    </div>
                  </div>
                  <Badge variant="success" className="bg-emerald-50 text-emerald-600 border-emerald-100">Active</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Service head:</span>
                  <Select value={s.service_head_id ?? ''} onValueChange={(v) => updateServiceHead(s.id, v)}>
                    <SelectTrigger className="h-8 text-xs w-full max-w-xs"><SelectValue placeholder="Select head..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None assigned</SelectItem>
                      {teamUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-zinc-100" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">Recurring sub-services (filing/tasks)</h3>
          <Dialog open={openSub} onOpenChange={(o) => { setOpenSub(o); if (o) loadAll(); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" data-testid="add-sub-service-btn"><Plus className="h-4 w-4" /> Add sub-service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add sub-service</DialogTitle></DialogHeader>
              <div className="space-y-3 py-4">
                <Select value={pickedSubServiceId} onValueChange={setPickedSubServiceId}>
                  <SelectTrigger data-testid="pick-sub-service"><SelectValue placeholder="Select sub-service..." /></SelectTrigger>
                  <SelectContent>
                    {availableSubs.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.code} — {s.name} ({s.frequency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={addSub} disabled={!pickedSubServiceId || pending}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {existingSubServices.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 p-10 text-center bg-zinc-50/50">
            <div className="text-sm font-bold text-zinc-900">No sub-services active</div>
            <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto leading-relaxed">
              Add specific sub-services (e.g. GSTR-3B) to enable automated compliance task generation.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-100 bg-white overflow-hidden">
            {existingSubServices.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-5 hover:bg-zinc-50 transition-colors">
                <div>
                  <div className="font-bold text-zinc-900">{s.sub_services?.name}</div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                    {s.sub_services?.services?.name} · {s.sub_services?.frequency} · {s.sub_services?.code}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {s.is_active ? <Badge variant="success" className="bg-emerald-50 text-emerald-600 border-emerald-100">Active</Badge> : <Badge variant="outline">Paused</Badge>}
                  <Button variant="ghost" size="sm" onClick={() => unlinkSub(s.id)} disabled={pending} className="text-zinc-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateIST(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
