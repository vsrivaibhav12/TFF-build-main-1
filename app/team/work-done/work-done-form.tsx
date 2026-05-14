'use client';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addWorkDoneAction } from '@/lib/actions/work-done';
import { toast } from 'sonner';

const schema = z.object({
  client_id: z.string().optional(),
  task_id: z.string().optional(),
  date: z.string(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  minutes: z.coerce.number().int().positive(),
  description: z.string().min(3, 'Please describe what you did'),
});

export default function WorkDoneForm({ clients, tasks }: { clients: any[]; tasks: any[] }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      start_time: '09:00',
      end_time: '17:00',
      minutes: 480,
      description: '',
    },
  });

  function computeMinutes() {
    const start = form.getValues('start_time');
    const end = form.getValues('end_time');
    if (start && end) {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins > 0) form.setValue('minutes', mins);
    }
  }

  async function onSubmit(data: z.infer<typeof schema>) {
    startTransition(async () => {
      const date = data.date;
      const started_at = data.start_time ? `${date}T${data.start_time}:00+05:30` : undefined;
      const ended_at = data.end_time ? `${date}T${data.end_time}:00+05:30` : undefined;
      const r = await addWorkDoneAction({
        client_id: data.client_id,
        task_id: data.task_id,
        date,
        minutes: data.minutes,
        description: data.description,
        started_at,
        ended_at,
      });
      if (r.success) {
        toast.success('Work log saved');
        form.reset({
          date: new Date().toISOString().slice(0, 10),
          start_time: '09:00',
          end_time: '17:00',
          minutes: 480,
          description: '',
        });
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 bg-white p-6 rounded-xl border border-zinc-200">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" {...form.register('date')} />
        </div>
        <div className="space-y-2">
          <Label>Minutes</Label>
          <Input type="number" {...form.register('minutes')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start time</Label>
          <Input type="time" {...form.register('start_time')} onBlur={computeMinutes} />
        </div>
        <div className="space-y-2">
          <Label>End time</Label>
          <Input type="time" {...form.register('end_time')} onBlur={computeMinutes} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Client (optional)</Label>
          <Select onValueChange={(v) => form.setValue('client_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Task (optional)</Label>
          <Select onValueChange={(v) => form.setValue('task_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select task" />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea {...form.register('description')} placeholder="Summarize your work..." />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving...' : 'Log work'}
      </Button>
    </form>
  );
}
