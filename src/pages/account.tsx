import { Link, useSearchParams } from 'react-router-dom';
import { Settings } from '@/components/account/settings';
import { PageIntro } from '@/components/layout/page-intro';

export function AccountPage() {
  const [searchParams] = useSearchParams();
  const plannerReturnStep =
    searchParams.get('return') === 'planner-step2' ? '?step=2' : '';

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-xl space-y-5 md:space-y-7">
        {plannerReturnStep ? (
          <Link
            to={`/${plannerReturnStep}`}
            className="-ml-2 inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-ink-700 transition-colors hover:bg-shell-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 md:min-h-9"
          >
            ← Back to plan
          </Link>
        ) : null}

        <PageIntro
          title="Account"
          description="Profile, fueling preferences, and connections."
        />

        <Settings />
      </div>
    </div>
  );
}
