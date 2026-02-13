import { useStore, type TemperatureUnit } from '@/store';
import { Card, CardHeader, CardContent, Input, Toggle } from '@/components/ui';
import { clsx } from 'clsx';

const tempOptions: { value: TemperatureUnit; label: string }[] = [
  { value: 'celsius', label: '°C' },
  { value: 'fahrenheit', label: '°F' },
];

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const updateAthleteProfile = useStore((s) => s.updateAthleteProfile);

  const ftpWatts = settings.athleteProfile.ftpWatts ?? '';
  const sweatRateLph = settings.athleteProfile.sweatRateLph ?? '';

  const updatePositiveNumber = (
    key: 'ftpWatts' | 'sweatRateLph',
    value: string
  ) => {
    if (value.trim() === '') {
      updateAthleteProfile({ [key]: undefined });
      return;
    }

    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue) && parsedValue > 0) {
      updateAthleteProfile({ [key]: parsedValue });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <Card className="mb-6">
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

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Athlete Profile</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="ftp-watts"
            label="FTP (watts)"
            type="number"
            min={1}
            step={1}
            value={ftpWatts}
            onChange={(e) => updatePositiveNumber('ftpWatts', e.target.value)}
            placeholder="e.g., 250"
          />
          <p className="text-sm text-gray-500 -mt-2">
            Required for auto mode on the Planner page.
          </p>

          <Input
            id="sweat-rate"
            label="Sweat Rate (L/hour)"
            type="number"
            min={0.1}
            step={0.1}
            value={sweatRateLph}
            onChange={(e) =>
              updatePositiveNumber('sweatRateLph', e.target.value)
            }
            placeholder="Optional, e.g., 0.9"
          />

          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div>
              <p className="font-medium text-sm">Heavy sweater</p>
              <p className="text-xs text-gray-500">
                Adds an additional sodium buffer in auto mode.
              </p>
            </div>
            <Toggle
              checked={settings.athleteProfile.heavySweater}
              onChange={(checked) =>
                updateAthleteProfile({ heavySweater: checked })
              }
              label="Heavy sweater"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div>
              <p className="font-medium text-sm">Gut-trained for high carbs</p>
              <p className="text-xs text-gray-500">
                Allows up to 120 g/h cap for race-level intensity.
              </p>
            </div>
            <Toggle
              checked={settings.athleteProfile.gutTrained}
              onChange={(checked) =>
                updateAthleteProfile({ gutTrained: checked })
              }
              label="Gut-trained"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
