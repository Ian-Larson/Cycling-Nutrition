import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

export interface OverflowMenuItem {
  label: string;
  onSelect: () => void;
  tone?: 'default' | 'danger';
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
  label?: string;
}

export function OverflowMenu({ items, label = 'More' }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-500 hover:bg-shell-100 hover:text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-200"
      >
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="currentColor"
          aria-hidden
        >
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="16" cy="10" r="1.5" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-white shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={clsx(
                'block w-full px-3 py-2 text-left text-sm hover:bg-shell-50 focus:outline-none focus:bg-shell-50',
                item.tone === 'danger' ? 'text-rose-700' : 'text-ink-700'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
