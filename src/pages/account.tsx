import { Link, useSearchParams } from 'react-router-dom';
import { IdentityStrip } from '@/components/account/identity-strip';
import { SettingsCard } from '@/components/account/settings-card';

export function AccountPage() {
  const [searchParams] = useSearchParams();
  const plannerReturnStep =
    searchParams.get('return') === 'planner-step2' ? '?step=2' : '';

  return (
    <div className="page-shell space-y-4 md:space-y-6">
      {plannerReturnStep ? (
        <div>
          <Link
            to={`/${plannerReturnStep}`}
            className="inline-flex min-h-9 items-center rounded-lg border border-[color:var(--border-soft)] bg-white px-3 text-sm font-medium text-ink-800 transition-colors hover:bg-shell-50"
          >
            ← Back to plan
          </Link>
        </div>
      ) : null}

      <h1 className="page-title">Account</h1>

      <IdentityStrip />

      <SettingsCard />
    </div>
  );
}
