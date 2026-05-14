import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Fiscal Fulcrum — Portal',
  description: 'Structured compliance, financial intelligence, strategic advisory.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            className: 'border-zinc-200 rounded-xl shadow-lg',
          }}
        />
      </body>
    </html>
  );
}
