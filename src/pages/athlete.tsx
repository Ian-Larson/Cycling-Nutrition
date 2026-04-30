import { Link, useSearchParams } from 'react-router-dom';
import { AthletePane } from '@/components/account/athlete-pane';
import { PageIntro } from '@/components/layout/page-intro';
import { SectionNav } from '@/components/layout/section-nav';

export function AthletePage() {
  const [searchParams] = useSearchParams();
  const plannerReturnStep = searchParams.get('return') === 'planner-step2' ? '?step=2' : '';

  return (
    <div className="page-shell space-y-4 md:space-y-6">
      <PageIntro
        title="Athlete"
        description={
          <>
            Profile and planning defaults.
          </>
        }
        actions={
          <Link
            to={`/${plannerReturnStep}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[color:var(--border-soft)] bg-white px-4 py-2 text-sm font-medium text-ink-800 sm:w-auto md:min-h-10"
          >
            Back to plan
          </Link>
        }
      />

      <SectionNav section="account" />

      <AthletePane />
    </div>
  );
}
