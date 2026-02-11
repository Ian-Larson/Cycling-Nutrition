import { useState } from 'react';
import { Slider, Select, Button, PresetButtons } from '@/components/ui';
import { useStore } from '@/store';
import type { RideCharacteristics } from '@/types';

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

export function RideForm({ onCalculate, disabled }: RideFormProps) {
  const [durationMinutes, setDuration] = useState(90);
  const [intensity, setIntensity] =
    useState<RideCharacteristics['intensity']>('endurance');
  const [heatFactor, setHeatFactor] =
    useState<RideCharacteristics['heatFactor']>('moderate');
  const [carbTarget, setCarbTarget] = useState(60);
  const [refuelStops, setRefuelStops] = useState(0);

  const temperatureUnit = useStore((s) => s.settings.temperatureUnit);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const heatOptions = Object.entries(HEAT_LABELS[temperatureUnit]).map(
    ([value, label]) => ({ value, label })
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
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
          label="Ride Duration"
          displayValue={formatDuration(durationMinutes)}
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

      <Select
        label="Weather / Heat"
        value={heatFactor}
        onChange={(e) =>
          setHeatFactor(e.target.value as RideCharacteristics['heatFactor'])
        }
        options={heatOptions}
      />

      <div className="space-y-2">
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
          label="Carb Target"
          displayValue={`${carbTarget}g/hour`}
          min={30}
          max={120}
          step={5}
          value={carbTarget}
          onChange={(e) => setCarbTarget(Number(e.target.value))}
        />
      </div>

      {durationMinutes >= 120 && (
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
        disabled={disabled}
        onClick={() =>
          onCalculate({
            durationMinutes,
            intensity,
            heatFactor,
            carbTargetGramsPerHour: carbTarget,
            ...(refuelStops > 0 && durationMinutes >= 120 ? { refuelStops } : {}),
          })
        }
      >
        Calculate Fuel Plan
      </Button>
    </div>
  );
}
