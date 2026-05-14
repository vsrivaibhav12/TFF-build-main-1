'use client';
import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Smart empty state. Picks contextual copy + a single primary action.
 * Use everywhere a list might be empty so users always know the next step.
 *
 * Action can be either a link (`actionHref`) or a callback (`actionOnClick`).
 */
export default function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
  actionOnClick,
  icon = <Inbox className="h-6 w-6 text-zinc-400" />,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
  actionOnClick?: () => void;
  icon?: React.ReactNode;
}) {
  const renderAction = () => {
    if (!actionLabel) return null;
    if (actionHref) {
      return (
        <Link href={actionHref}>
          <Button size="sm" data-testid="empty-action">
            {actionLabel}
          </Button>
        </Link>
      );
    }
    if (actionOnClick) {
      return (
        <Button size="sm" onClick={actionOnClick} data-testid="empty-action">
          {actionLabel}
        </Button>
      );
    }
    return null;
  };

  return (
    <div
      className="rounded-xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center"
      data-testid="empty-state"
    >
      <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-50 border border-zinc-200">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <p className="text-sm text-zinc-500 mt-2 max-w-sm mx-auto">{body}</p>
      {(actionHref || actionOnClick) && actionLabel && (
        <div className="mt-6">{renderAction()}</div>
      )}
    </div>
  );
}
