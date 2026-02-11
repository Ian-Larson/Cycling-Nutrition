import { useStore, type TemperatureUnit } from '@/store';
import { Card, CardHeader, CardContent } from '@/components/ui';
import { clsx } from 'clsx';

const tempOptions: { value: TemperatureUnit; label: string }[] = [
  { value: 'celsius', label: '°C' },
  { value: 'fahrenheit', label: '°F' },
];

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Temperature Unit</h2>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {tempOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateSettings({ temperatureUnit: opt.value })}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  settings.temperatureUnit === opt.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Controls temperature display in the weather/heat selector on the Planner page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
