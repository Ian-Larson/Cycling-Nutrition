import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface SystemSpecRowProps {
  label: string;
  value: ReactNode;
  /** When true, the value is rendered dimmer (for "—" placeholders). */
  muted?: boolean;
  /** Optional action slot rendered after the value (e.g. edit icon button). */
  action?: ReactNode;
}

export function SystemSpecRow({ label, value, muted, action }: SystemSpecRowProps) {
  return (
    <div className="flex items-baseline gap-2 text-sm leading-6">
      <span className="shrink-0 text-ink-600">{label}</span>
      <span
        aria-hidden
        className="mx-1 min-w-[1.5rem] flex-1 translate-y-[-0.22em] border-b border-dotted border-[color:var(--border-soft)]"
      />
      <span
        className={clsx(
          'shrink-0 font-medium tabular-nums',
          muted ? 'text-ink-400' : 'text-ink-900'
        )}
      >
        {value}
      </span>
      {action ? <span className="shrink-0">{action}</span> : null}
    </div>
  );
}
