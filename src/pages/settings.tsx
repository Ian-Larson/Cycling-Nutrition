import { Link } from 'react-router-dom';
import { useStore, type TemperatureUnit } from '@/store';
import { Card, CardHeader, CardContent } from '@/components/ui';
import { clsx } from 'clsx';
import { PageIntro } from '@/components/layout/page-intro';

const tempOptions: { value: TemperatureUnit; label: string }[] = [
  { value: 'celsius', label: '°C' },
  { value: 'fahrenheit', label: '°F' },
];

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  return (
    <div className="page-shell space-y-4 md:space-y-6">
      <PageIntro
        eyebrow="Settings"
        title="Settings"
        description={
          <>
            App defaults.
          </>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 bg-white/55">
          <h2 className="section-title text-lg">Temperature</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 md:flex">
            {tempOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateSettings({ temperatureUnit: opt.value })}
                className={clsx(
                  'min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors md:min-h-10',
                  settings.temperatureUnit === opt.value
                    ? 'border-brand-300 bg-brand-100 text-brand-800'
                    : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-sm leading-5 text-ink-600 md:leading-6">
            Used in planner weather fields.
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 bg-white/55">
          <h2 className="section-title text-lg">Athlete profile</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-5 text-ink-600 md:leading-6">
            Update rider metrics on{' '}
            <Link to="/athlete" className="font-semibold text-brand-700 underline">
              Athlete
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
