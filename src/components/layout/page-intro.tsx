import type { ReactNode } from 'react';

interface PageIntroProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  divided?: boolean;
}

export function PageIntro({
  title,
  description,
  actions,
  meta,
  divided = true,
}: PageIntroProps) {
  return (
    <header className={divided ? 'page-intro' : 'page-intro border-b-0 pb-0'}>
      <div className="page-intro-grid">
        <div className="space-y-1.5 md:space-y-2">
          <h1 className="page-title">{title}</h1>
          {description ? <div className="page-summary">{description}</div> : null}
          {actions ? <div className="flex flex-wrap gap-2 pt-0.5 md:pt-1">{actions}</div> : null}
        </div>
        {meta ? <div className="min-w-0 space-y-2 lg:justify-self-end">{meta}</div> : null}
      </div>
    </header>
  );
}
