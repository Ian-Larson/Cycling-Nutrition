import type { ReactNode } from 'react';

interface PageIntroProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: PageIntroProps) {
  return (
    <header className="page-intro">
      <div className="page-intro-grid">
        <div className="relative z-10 space-y-4">
          <p className="section-kicker">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          <div className="page-summary">{description}</div>
          {actions ? <div className="flex flex-wrap gap-3 pt-2">{actions}</div> : null}
        </div>
        {meta ? <div className="relative z-10 space-y-3 lg:self-end">{meta}</div> : null}
      </div>
    </header>
  );
}
