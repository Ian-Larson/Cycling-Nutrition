import { useState } from 'react';
import { Slider, Select, Button } from '@/components/ui';
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
      <Slider
        label="Ride Duration"
        displayValue={formatDuration(durationMinutes)}
        min={30}
        max={300}
        step={15}
        value={durationMinutes}
        onChange={(e) => setDuration(Number(e.target.value))}
      />

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

      <Slider
        label="Carb Target"
        displayValue={`${carbTarget}g/hour`}
        min={30}
        max={120}
        step={5}
        value={carbTarget}
        onChange={(e) => setCarbTarget(Number(e.target.value))}
      />

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
          })
        }
      >
        Calculate Fuel Plan
      </Button>
    </div>
  );
}
