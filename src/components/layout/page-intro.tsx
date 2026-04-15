import type { ReactNode } from 'react';

interface PageIntroProps {
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageIntro({
  title,
  description,
  actions,
  meta,
}: PageIntroProps) {
  return (
    <header className="page-intro">
      <div className="page-intro-grid">
        <div className="space-y-1.5 md:space-y-2">
          <h1 className="page-title">{title}</h1>
          <div className="page-summary">{description}</div>
          {actions ? <div className="flex flex-wrap gap-2 pt-0.5 md:pt-1">{actions}</div> : null}
        </div>
        {meta ? <div className="min-w-0 space-y-2 lg:justify-self-end">{meta}</div> : null}
      </div>
    </header>
  );
}
