import type { ReactNode } from 'react';

interface RowProps {
  label: ReactNode;
  control: ReactNode;
  helper?: ReactNode;
  helperLive?: 'polite' | 'assertive';
  id?: string;
}

export function Row({ label, control, helper, helperLive, id }: RowProps) {
  return (
    <li id={id} className="scroll-mt-24 py-2.5 md:py-3">
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
        <div className="text-sm font-medium text-ink-800">{label}</div>
        <div className="min-w-0">{control}</div>
        {helperLive ? (
          <p
            role="status"
            aria-live={helperLive}
            className="text-xs leading-5 text-ink-500 sm:col-start-2"
          >
            {helper}
          </p>
        ) : helper ? (
          <p className="text-xs leading-5 text-ink-500 sm:col-start-2">{helper}</p>
        ) : null}
      </div>
    </li>
  );
}

type HeadingLevel = 2 | 3 | 4;

interface SectionProps {
  kicker: string;
  children: ReactNode;
  id?: string;
  headingLevel?: HeadingLevel;
}

export function Section({ kicker, children, id, headingLevel = 2 }: SectionProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  return (
    <section id={id} className="scroll-mt-24" aria-labelledby={id ? `${id}-heading` : undefined}>
      <Heading
        id={id ? `${id}-heading` : undefined}
        className="section-kicker mb-1 uppercase tracking-[0.08em] text-ink-500"
      >
        {kicker}
      </Heading>
      <ul className="divide-y divide-[color:var(--border-soft)]">{children}</ul>
    </section>
  );
}
