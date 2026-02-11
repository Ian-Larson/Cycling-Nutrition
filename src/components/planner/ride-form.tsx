import { useState } from 'react';
import { Slider, Select, Button } from '@/components/ui';
import type { RideCharacteristics } from '@/types';

interface RideFormProps {
  onCalculate: (ride: RideCharacteristics) => void;
  disabled?: boolean;
}

export function RideForm({ onCalculate, disabled }: RideFormProps) {
  const [durationMinutes, setDuration] = useState(90);
  const [intensity, setIntensity] =
    useState<RideCharacteristics['intensity']>('endurance');
  const [heatFactor, setHeatFactor] =
    useState<RideCharacteristics['heatFactor']>('moderate');
  const [carbTarget, setCarbTarget] = useState(60);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

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
        options={[
          { value: 'cool', label: 'Cool (<15°C / <60°F)' },
          { value: 'moderate', label: 'Moderate (15-25°C / 60-77°F)' },
          { value: 'warm', label: 'Warm (25-32°C / 77-90°F)' },
          { value: 'hot', label: 'Hot (>32°C / >90°F)' },
        ]}
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
