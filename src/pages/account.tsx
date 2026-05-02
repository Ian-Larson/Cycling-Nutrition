import { Link, useSearchParams } from 'react-router-dom';
import { Settings } from '@/components/account/settings';

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
            className="inline-flex h-8 items-center rounded-lg px-2 text-xs font-medium text-ink-600 transition-colors hover:bg-shell-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
          >
            ← Back to plan
          </Link>
        ) : null}

        <Settings />
      </div>
    </div>
  );
}
