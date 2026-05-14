'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const redirect = params.get('redirect') || '/';
    router.replace(redirect);
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-zinc-700">
            Email address
          </Label>
          <div className="relative">
            <Mail
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                focusedField === 'email' ? 'text-teal-500' : 'text-zinc-400'
              }`}
            />
            <Input
              id="email"
              type="email"
              data-testid="login-email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              placeholder="you@firm.com"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-zinc-700">
              Password
            </Label>
          </div>
          <div className="relative">
            <Lock
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                focusedField === 'password' ? 'text-teal-500' : 'text-zinc-400'
              }`}
            />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              data-testid="login-password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder="Enter your password"
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
            <input type="checkbox" className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500" />
            Remember me
          </label>
          <a
            href="/login/forgot"
            className="text-sm text-teal-700 hover:text-teal-800 font-medium transition-colors"
          >
            Forgot password?
          </a>
        </div>

        <Button
          type="submit"
          disabled={loading}
          data-testid="login-submit"
          className="w-full h-11 text-base"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>
    </motion.div>
  );
}
