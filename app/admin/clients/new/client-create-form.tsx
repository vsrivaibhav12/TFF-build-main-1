'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/actions/clients';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Re-declare schema for client-side validation
const formSchema = z.object({
  business_name: z.string().min(1, "Business name is required"),
  pan: z.string().optional(),
  gstin: z.string().optional(),
  category: z.string().optional(),
  industry: z.string().optional(),
  primary_contact_person: z.string().optional(),
  primary_contact_phone: z.string().optional(),
  primary_contact_email: z.string().email().optional().or(z.literal('')),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  lifecycle_stage: z.enum(['lead', 'onboarding', 'active', 'churned']).default('lead'),
  group_id: z.string().optional().or(z.literal('')),
  portal_enabled: z.boolean().default(false),
  portal_email: z.string().email().optional().or(z.literal('')),
  portal_password: z.string().min(6).optional().or(z.literal('')),
  internal_notes: z.string().optional(),
});

export function ClientCreateForm({ groups }: { groups: { id: string; name: string }[] }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      business_name: '',
      lifecycle_stage: 'lead',
      group_id: '',
      portal_enabled: false,
    },
  });

  // Auto-derive state from GSTIN (first 2 characters)
  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    form.setValue('gstin', val);
    if (val.length >= 2) {
      const stateCode = val.substring(0, 2);
      // Example map: '33' is Tamil Nadu. Add full map in production.
      const states: Record<string, string> = {
        '33': 'Tamil Nadu',
        '27': 'Maharashtra',
        '07': 'Delhi',
        '29': 'Karnataka',
        '32': 'Kerala',
        '36': 'Telangana',
        '19': 'West Bengal',
        '24': 'Gujarat',
        '09': 'Uttar Pradesh',
      };
      if (states[stateCode]) form.setValue('state', states[stateCode]); 
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const result = await createClient(values);
    setIsSubmitting(false);

    if (result.success) {
      toast.success('Client created successfully');
      router.push(`/admin/clients/${result.data?.id}`); // Navigate to overview
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12 max-w-3xl pb-24">
      {/* Business Section */}
      <section className="space-y-6">
        <h3 className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2">Business</h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Business name *</Label>
            <Input id="business_name" {...form.register('business_name')} placeholder="e.g., Acme Corp Pvt Ltd" />
            {form.formState.errors.business_name && <span className="text-sm text-red-600">{form.formState.errors.business_name.message}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pan">PAN</Label>
              <Input id="pan" {...form.register('pan')} onChange={(e) => form.setValue('pan', e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input id="gstin" {...form.register('gstin')} onChange={handleGstinChange} />
            </div>
          </div>
        </div>
      </section>

      {/* Primary Contact Section */}
      <section className="space-y-6">
        <h3 className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2">Primary contact</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Person name</Label>
            <Input {...form.register('primary_contact_person')} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input {...form.register('primary_contact_phone')} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...form.register('primary_contact_email')} />
          </div>
        </div>
      </section>

      {/* Address Section */}
      <section className="space-y-6">
        <h3 className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2">Address</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>City</Label>
            <Input {...form.register('city')} />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input {...form.register('state')} />
          </div>
          <div className="space-y-2">
            <Label>Pincode</Label>
            <Input {...form.register('pincode')} />
          </div>
        </div>
      </section>

      {/* Engagement Section */}
      <section className="space-y-6">
        <h3 className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2">Engagement</h3>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Group</Label>
              <Select value={form.watch('group_id') || ''} onValueChange={(val) => form.setValue('group_id', val)}>
                <SelectTrigger><SelectValue placeholder="No group" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No group</SelectItem>
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lifecycle stage</Label>
              <Select value={form.watch('lifecycle_stage')} onValueChange={(val) => form.setValue('lifecycle_stage', val as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Switch 
              id="portal_enabled" 
              checked={form.watch('portal_enabled')}
              onCheckedChange={(val) => {
                form.setValue('portal_enabled', val);
                if (!val) {
                  form.setValue('portal_email', '');
                  form.setValue('portal_password', '');
                }
              }}
            />
            <div className="space-y-0.5">
              <Label htmlFor="portal_enabled">Enable client portal access</Label>
              <p className="text-sm text-zinc-500">When enabled, set login credentials so they can sign in immediately.</p>
            </div>
          </div>
          {form.watch('portal_enabled') && (
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 p-4 bg-zinc-50">
              <div className="space-y-2">
                <Label htmlFor="portal_email">Portal login email *</Label>
                <Input id="portal_email" type="email" {...form.register('portal_email')} placeholder="client@company.in" />
                {form.formState.errors.portal_email && <span className="text-sm text-red-600">{form.formState.errors.portal_email.message}</span>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="portal_password">Portal password *</Label>
                <Input id="portal_password" type="password" {...form.register('portal_password')} placeholder="Min 6 characters" />
                {form.formState.errors.portal_password && <span className="text-sm text-red-600">{form.formState.errors.portal_password.message}</span>}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700">
          {isSubmitting ? 'Saving...' : 'Save client'}
        </Button>
      </div>
    </form>
  );
}
