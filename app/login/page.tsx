import { Suspense } from 'react';
import LoginForm from './login-form';
import { FileCheck, Shield, Zap, BarChart3 } from 'lucide-react';

export const metadata = {
  title: 'Sign in — The Fiscal Fulcrum',
};

const FEATURES = [
  { icon: FileCheck, label: 'Compliance tracking', desc: 'Never miss a filing deadline' },
  { icon: Shield, label: 'Secure & encrypted', desc: 'Bank-grade data protection' },
  { icon: Zap, label: 'Real-time updates', desc: 'Instant notifications on status' },
  { icon: BarChart3, label: 'Financial insights', desc: 'BizLens analytics & reports' },
];

export default function LoginPage() {
  return (
    <main className="min-h-screen flex">
      {/* Left side - brand */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 flex-col justify-between bg-gradient-to-br from-teal-500 via-teal-600 to-teal-800 text-white p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <span className="text-white font-bold text-lg">FF</span>
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">The Fiscal Fulcrum</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight leading-tight">
              Structured compliance.<br />
              Financial intelligence.<br />
              Strategic advisory.
            </h2>
            <p className="mt-4 text-teal-100 text-sm leading-relaxed max-w-sm">
              The complete platform for CA firms to manage clients, track compliance, and deliver advisory services at scale.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon className="h-4 w-4 text-teal-100" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{f.label}</div>
                  <div className="text-xs text-teal-200">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-teal-200">
          &copy; {new Date().getFullYear()} The Fiscal Fulcrum. All rights reserved.
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-zinc-50/50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">FF</span>
              </div>
              <span className="text-lg font-bold text-zinc-900">The Fiscal Fulcrum</span>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Welcome back</h1>
            <p className="text-sm text-zinc-500 mt-1.5">
              Sign in to access your portal
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-center text-xs text-zinc-400">
            Authorised users only. All sessions are logged and monitored.
          </p>
        </div>
      </div>
    </main>
  );
}
