'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { saveNotificationPreferencesAction } from '@/lib/actions/notifications';
import { toast } from 'sonner';

type Freq = 'immediate' | 'daily' | 'weekly' | 'off';

export default function NotificationPrefsForm({ initial }: { initial: { email_frequency: Freq; in_app_enabled: boolean } }) {
  const [freq, setFreq] = useState<Freq>(initial.email_frequency || 'daily');
  const [inApp, setInApp] = useState<boolean>(initial.in_app_enabled !== false);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await saveNotificationPreferencesAction({ email_frequency: freq, in_app_enabled: inApp });
      if (r.success) toast.success('Preferences saved');
      else toast.error(r.error);
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Email frequency</Label>
        <Select value={freq} onValueChange={(v) => setFreq(v as Freq)}>
          <SelectTrigger data-testid="prefs-freq"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="immediate">Immediate (per event)</SelectItem>
            <SelectItem value="daily">Daily digest (09:30 IST)</SelectItem>
            <SelectItem value="weekly">Weekly digest (Sun 22:00 IST)</SelectItem>
            <SelectItem value="off">Off (no email)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label>In-app notifications</Label>
          <p className="text-xs text-zinc-500 mt-1">Bell icon updates in the top-right.</p>
        </div>
        <Switch checked={inApp} onCheckedChange={(v) => setInApp(!!v)} data-testid="prefs-inapp" />
      </div>
      <div className="md:col-span-2">
        <Button onClick={save} disabled={pending} data-testid="prefs-save">
          {pending ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </div>
  );
}
