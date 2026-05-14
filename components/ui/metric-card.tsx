import { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; positive: boolean };
  variant?: 'default' | 'warning' | 'danger' | 'teal';
  className?: string;
  href?: string;
}

export function MetricCard({
  label,
  value,
  icon,
  trend,
  variant = 'default',
  className,
  href,
}: MetricCardProps) {
  const variantStyles = {
    default: 'bg-white border-zinc-200/80 hover:border-zinc-300',
    warning: 'bg-amber-50/60 border-amber-200/60 hover:border-amber-300',
    danger: 'bg-red-50/60 border-red-200/60 hover:border-red-300',
    teal: 'bg-teal-50/60 border-teal-200/60 hover:border-teal-300',
  };

  const iconBg = {
    default: 'bg-zinc-100 text-zinc-500',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
    teal: 'bg-teal-100 text-teal-600',
  };

  const content = (
    <>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</div>
          <div className="mt-2 text-4xl font-bold tabular-nums tracking-tight">{value}</div>
          {trend && (
            <div
              className={cn(
                'mt-1 text-sm font-medium',
                trend.positive ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {trend.positive ? '+' : ''}{trend.value}% from last period
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'h-11 w-11 rounded-xl flex items-center justify-center',
              iconBg[variant]
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </>
  );

  const cls = cn(
    'rounded-xl border p-5 md:p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5',
    href ? 'cursor-pointer' : '',
    variantStyles[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }

  return <div className={cls}>{content}</div>;
}
