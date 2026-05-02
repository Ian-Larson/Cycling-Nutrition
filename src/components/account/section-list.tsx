import type { ReactNode } from 'react';

interface RowProps {
  label: ReactNode;
  control: ReactNode;
  helper?: ReactNode;
  id?: string;
}

export function Row({ label, control, helper, id }: RowProps) {
  return (
    <li id={id} className="scroll-mt-24 py-2.5 md:py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="w-32 shrink-0 text-sm font-medium text-ink-800">{label}</div>
        <div className="min-w-0">{control}</div>
      </div>
      {helper ? (
        <p className="mt-1 pl-[9rem] text-xs leading-5 text-ink-500">{helper}</p>
      ) : null}
    </li>
  );
}

interface SectionProps {
  kicker: string;
  children: ReactNode;
  id?: string;
}

export function Section({ kicker, children, id }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <p className="section-kicker mb-1 uppercase tracking-[0.08em] text-ink-500">
        {kicker}
      </p>
      <ul className="divide-y divide-[color:var(--border-soft)]">{children}</ul>
    </section>
  );
}
