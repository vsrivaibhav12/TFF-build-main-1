'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { sendPasswordResetAction } from '@/lib/actions/auth';

export default function ForgotForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await sendPasswordResetAction(email);
    setLoading(false);
    if (!r.success) {
      toast.error(r.error);
      return;
    }
    setSent(true);
    toast.success('Check your email for a reset link');
  }

  return (
    <Card className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="text-center space-y-4 py-4">
            <p className="text-sm text-zinc-600">
              If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
            </p>
            <Link href="/login" className="text-sm text-teal-700 hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@firm.com"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending</>) : 'Send reset link'}
            </Button>
            <div className="text-center">
              <Link href="/login" className="text-xs text-teal-700 hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
