import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Slider, Select, Button, PresetButtons, Input } from '@/components/ui';
import { useStore } from '@/store';
import { calculateAutoTarget } from '@/lib/calculator/auto-target';
import type { AutoInputPair, RideCharacteristics } from '@/types';

interface RideFormProps {
  onCalculate: (ride: RideCharacteristics) => void;
  disabled?: boolean;
}

const HEAT_LABELS = {
  celsius: {
    cool: 'Cool (< 15°C)',
    moderate: 'Moderate (15–25°C)',
    warm: 'Warm (25–32°C)',
    hot: 'Hot (> 32°C)',
  },
  fahrenheit: {
    cool: 'Cool (< 60°F)',
    moderate: 'Moderate (60–77°F)',
    warm: 'Warm (77–90°F)',
    hot: 'Hot (> 90°F)',
  },
} as const;

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsedValue = Number(trimmed);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

export function RideForm({ onCalculate, disabled }: RideFormProps) {
  const [durationMinutes, setDuration] = useState(90);
  const [intensity, setIntensity] =
    useState<RideCharacteristics['intensity']>('endurance');
  const [heatFactor, setHeatFactor] =
    useState<RideCharacteristics['heatFactor']>('moderate');
  const [carbTarget, setCarbTarget] = useState(60);
  const [refuelStops, setRefuelStops] = useState(0);

  const [planningMode, setPlanningMode] =
    useState<RideCharacteristics['planningMode']>('manual');
  const [autoInputPair, setAutoInputPair] = useState<AutoInputPair>('duration_if');
  const [autoDurationInput, setAutoDurationInput] = useState('120');
  const [autoIfInput, setAutoIfInput] = useState('0.8');
  const [autoTssInput, setAutoTssInput] = useState('120');
  const [autoCarbOverrideInput, setAutoCarbOverrideInput] = useState('');

  const temperatureUnit = useStore((s) => s.settings.temperatureUnit);
  const athleteProfile = useStore((s) => s.settings.athleteProfile);

  const hasFtp =
    typeof athleteProfile.ftpWatts === 'number' && athleteProfile.ftpWatts > 0;

  const heatOptions = Object.entries(HEAT_LABELS[temperatureUnit]).map(
    ([value, label]) => ({ value, label })
  );

  const autoPreview = useMemo(() => {
    if (!hasFtp) {
      return {
        error: 'Set your FTP in Settings to enable auto mode.',
      };
    }

    try {
      return {
        result: calculateAutoTarget({
          inputPair: autoInputPair,
          durationMinutes: parseOptionalNumber(autoDurationInput),
          intensityFactor: parseOptionalNumber(autoIfInput),
          tss: parseOptionalNumber(autoTssInput),
          ftpWatts: athleteProfile.ftpWatts!,
          heatFactor,
          sweatRateLph: athleteProfile.sweatRateLph,
          heavySweater: athleteProfile.heavySweater,
          gutTrained: athleteProfile.gutTrained,
          carbTargetOverrideGramsPerHour: parseOptionalNumber(
            autoCarbOverrideInput
          ),
        }),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Invalid auto inputs.',
      };
    }
  }, [
    autoInputPair,
    autoDurationInput,
    autoIfInput,
    autoTssInput,
    autoCarbOverrideInput,
    athleteProfile.ftpWatts,
    athleteProfile.sweatRateLph,
    athleteProfile.heavySweater,
    athleteProfile.gutTrained,
    hasFtp,
    heatFactor,
  ]);

  const isInputActive = {
    duration: autoInputPair === 'duration_if' || autoInputPair === 'duration_tss',
    intensityFactor:
      autoInputPair === 'duration_if' || autoInputPair === 'if_tss',
    tss: autoInputPair === 'duration_tss' || autoInputPair === 'if_tss',
  };

  const effectiveDurationMinutes =
    planningMode === 'manual'
      ? durationMinutes
      : autoPreview.result?.durationMinutes || 0;

  const isAutoCalculateDisabled = !autoPreview.result || !hasFtp;

  const handleCalculateClick = () => {
    if (planningMode === 'manual') {
      onCalculate({
        durationMinutes,
        intensity,
        heatFactor,
        carbTargetGramsPerHour: carbTarget,
        planningMode: 'manual',
        ...(refuelStops > 0 && durationMinutes >= 120 ? { refuelStops } : {}),
      });
      return;
    }

    if (!autoPreview.result) return;

    onCalculate({
      durationMinutes: autoPreview.result.durationMinutes,
      intensity: autoPreview.result.intensity,
      heatFactor,
      carbTargetGramsPerHour: autoPreview.result.carbTargetGramsPerHour,
      planningMode: 'auto',
      autoMetrics: autoPreview.result.autoMetrics,
      ...(refuelStops > 0 && autoPreview.result.durationMinutes >= 120
        ? { refuelStops }
        : {}),
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Planning Mode</p>
        <div className="grid grid-cols-2 rounded-lg border border-gray-200 p-1">
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              planningMode === 'manual'
                ? 'bg-brand-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setPlanningMode('manual')}
          >
            Manual
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              planningMode === 'auto'
                ? 'bg-brand-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setPlanningMode('auto')}
          >
            Auto (TSS/IF)
          </button>
        </div>
      </div>

      {planningMode === 'manual' ? (
        <>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-700">Ride Duration</span>
              <span className="text-sm font-semibold text-brand-600">
                {formatDuration(durationMinutes)}
              </span>
            </div>
            <PresetButtons
              options={[
                { label: '1h', value: 60 },
                { label: '1.5h', value: 90 },
                { label: '2h', value: 120 },
                { label: '3h', value: 180 },
                { label: '4h', value: 240 },
              ]}
              value={durationMinutes}
              onChange={setDuration}
            />
            <Slider
              min={30}
              max={300}
              step={15}
              value={durationMinutes}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>

          <Select
            label="Intensity"
            value={intensity}
            onChange={(e) =>
              setIntensity(e.target.value as RideCharacteristics['intensity'])
            }
            options={[
              { value: 'recovery', label: 'Recovery - Easy spin' },
              { value: 'endurance', label: 'Endurance - Zone 2' },
              { value: 'tempo', label: 'Tempo - Steady effort' },
              { value: 'threshold', label: 'Threshold - Hard' },
              { value: 'race', label: 'Race - All out' },
            ]}
          />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-700">Carb Target</span>
              <span className="text-sm font-semibold text-brand-600">
                {carbTarget}g/hour
              </span>
            </div>
            <PresetButtons
              options={[
                { label: 'Low 30g', value: 30 },
                { label: 'Moderate 60g', value: 60 },
                { label: 'High 90g', value: 90 },
                { label: 'Max 120g', value: 120 },
              ]}
              value={carbTarget}
              onChange={setCarbTarget}
            />
            <Slider
              min={30}
              max={120}
              step={5}
              value={carbTarget}
              onChange={(e) => setCarbTarget(Number(e.target.value))}
            />
          </div>
        </>
      ) : (
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          {!hasFtp && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Auto mode requires FTP in your athlete profile. Set it in{' '}
              <Link className="underline font-medium" to="/settings">
                Settings
              </Link>
              .
            </div>
          )}

          <Select
            label="Known Inputs"
            value={autoInputPair}
            onChange={(e) => setAutoInputPair(e.target.value as AutoInputPair)}
            options={[
              { value: 'duration_if', label: 'Duration + IF' },
              { value: 'duration_tss', label: 'Duration + TSS' },
              { value: 'if_tss', label: 'IF + TSS' },
            ]}
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              id="auto-duration"
              type="number"
              min={30}
              max={300}
              step={1}
              label="Duration (minutes)"
              value={autoDurationInput}
              disabled={!isInputActive.duration}
              onChange={(e) => setAutoDurationInput(e.target.value)}
            />
            <Input
              id="auto-if"
              type="number"
              min={0.4}
              max={1.3}
              step={0.01}
              label="Intensity Factor (IF)"
              value={autoIfInput}
              disabled={!isInputActive.intensityFactor}
              onChange={(e) => setAutoIfInput(e.target.value)}
            />
            <Input
              id="auto-tss"
              type="number"
              min={1}
              step={1}
              label="TSS"
              value={autoTssInput}
              disabled={!isInputActive.tss}
              onChange={(e) => setAutoTssInput(e.target.value)}
            />
            <Input
              id="auto-carb-override"
              type="number"
              min={0}
              max={120}
              step={5}
              label="Carb Override (g/h, optional)"
              value={autoCarbOverrideInput}
              onChange={(e) => setAutoCarbOverrideInput(e.target.value)}
              placeholder={
                autoPreview.result
                  ? `${autoPreview.result.autoMetrics.autoCarbTargetGramsPerHour}`
                  : 'Auto recommendation'
              }
            />
          </div>

          {autoPreview.result && (
            <div className="rounded-lg bg-brand-50 p-3 text-sm">
              <p className="font-semibold text-brand-800 mb-2">
                Auto Recommendation
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-brand-900">
                <span>Duration:</span>
                <span>{formatDuration(autoPreview.result.durationMinutes)}</span>
                <span>IF:</span>
                <span>{autoPreview.result.autoMetrics.intensityFactor}</span>
                <span>TSS:</span>
                <span>{autoPreview.result.autoMetrics.tss}</span>
                <span>Intensity:</span>
                <span className="capitalize">{autoPreview.result.intensity}</span>
                <span>Carbs:</span>
                <span>{autoPreview.result.carbTargetGramsPerHour}g/h</span>
                <span>Hydration:</span>
                <span>{autoPreview.result.autoMetrics.hydrationMlPerHour}ml/h</span>
                <span>Sodium:</span>
                <span>{autoPreview.result.autoMetrics.sodiumMgPerHour}mg/h</span>
              </div>
            </div>
          )}

          {autoPreview.error && hasFtp && (
            <p className="text-sm text-red-600">{autoPreview.error}</p>
          )}
        </div>
      )}

      <Select
        label="Weather / Heat"
        value={heatFactor}
        onChange={(e) =>
          setHeatFactor(e.target.value as RideCharacteristics['heatFactor'])
        }
        options={heatOptions}
      />

      {effectiveDurationMinutes >= 120 && (
        <Select
          label="Bottle Refueling"
          value={String(refuelStops)}
          onChange={(e) => setRefuelStops(Number(e.target.value))}
          options={[
            { value: '0', label: 'No refueling' },
            { value: '1', label: '1 refill' },
            { value: '2', label: '2 refills' },
          ]}
        />
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={disabled || (planningMode === 'auto' && isAutoCalculateDisabled)}
        onClick={handleCalculateClick}
      >
        Calculate Fuel Plan
      </Button>
    </div>
  );
}
