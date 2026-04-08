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
    <div className="page-shell space-y-6">
      <PageIntro
        eyebrow="Settings"
        title="Settings"
        description={
          <>
            App preferences only.
          </>
        }
        meta={
          <div className="page-stat-grid">
            <div className="page-stat">
              <p className="page-stat-label">Temperature</p>
              <p className="page-stat-value">
                {settings.temperatureUnit === 'celsius' ? '°C' : '°F'}
              </p>
              <p className="page-stat-copy">Used in weather labels.</p>
            </div>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 bg-white/55">
          <p className="section-kicker">Preferences</p>
          <h2 className="section-title text-lg">Global defaults</h2>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm leading-6 text-ink-600">
            Athlete data is managed on Athlete.
          </p>
          <h3 className="section-kicker mb-2 text-[0.68rem]">Temperature Unit</h3>
          <div className="flex gap-2">
            {tempOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateSettings({ temperatureUnit: opt.value })}
                className={clsx(
                  'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  settings.temperatureUnit === opt.value
                    ? 'border-brand-300 bg-brand-100 text-brand-800'
                    : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-600">
            Controls temperature display in the weather/heat selector on the Planner page.
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 bg-white/55">
          <p className="section-kicker">Redirect</p>
          <h2 className="section-title text-lg">Athlete data lives elsewhere</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-ink-600">
            Update rider metrics on the{' '}
            <Link to="/athlete" className="font-semibold text-brand-700 underline">
              Athlete page
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
