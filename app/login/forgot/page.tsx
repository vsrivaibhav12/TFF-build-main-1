import { Metadata } from 'next';
import ForgotForm from './forgot-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Reset password — The Fiscal Fulcrum',
};

export default function ForgotPage() {
  return (
    <main className="min-h-screen flex">
      {/* Left side - brand */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 flex-col justify-between bg-gradient-to-br from-teal-500 via-teal-600 to-teal-800 text-white p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <span className="text-white font-bold text-lg">FF</span>
            </div>
            <div className="text-lg font-bold tracking-tight">The Fiscal Fulcrum</div>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight leading-tight">
            Reset your<br />password
          </h2>
          <p className="mt-4 text-teal-100 text-sm leading-relaxed max-w-sm">
            We will send you a secure link to reset your password. The link expires in 24 hours.
          </p>
        </div>

        <div className="relative z-10 text-xs text-teal-200">
          &copy; {new Date().getFullYear()} The Fiscal Fulcrum. All rights reserved.
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-zinc-50/50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">FF</span>
              </div>
              <span className="text-lg font-bold text-zinc-900">The Fiscal Fulcrum</span>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Reset password</h1>
            <p className="text-sm text-zinc-500 mt-1.5">
              Enter your email and we will send you a reset link
            </p>
          </div>

          <ForgotForm />
        </div>
      </div>
    </main>
  );
}
