import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { Card, CardContent, CardHeader, Button, Toast } from '@/components/ui';
import { RideForm } from '@/components/planner/ride-form';
import { FuelResult } from '@/components/planner/fuel-result';
import { FuelOptionsCard } from '@/components/planner/fuel-options-card';
import { calculateFuelPlan } from '@/lib/calculator';
import type { RideCharacteristics, FuelPlan } from '@/types';

export function PlannerPage() {
  const [plan, setPlan] = useState<Omit<FuelPlan, 'id' | 'createdAt'> | null>(
    null
  );
  const bottles = useStore((s) => s.bottles);
  const products = useStore((s) => s.products);
  const saveFuelPlan = useStore((s) => s.saveFuelPlan);

  const drinkMixes = products.filter((p) => p.type === 'drink_mix');
  const solidProducts = products.filter((p) => p.type !== 'drink_mix');
  const availableBottles = bottles.filter((b) => b.isAvailable);

  const [selectedDrinkMixId, setSelectedDrinkMixId] = useState<string | null>(null);
  const [selectedSolidIds, setSelectedSolidIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canCalculate = availableBottles.length > 0 && drinkMixes.length > 0;

  const getSelectedDrinkMix = () => {
    if (selectedDrinkMixId) {
      const found = drinkMixes.find((m) => m.id === selectedDrinkMixId);
      if (found) return found;
    }
    return drinkMixes[0];
  };

  const handleCalculate = (ride: RideCharacteristics) => {
    if (!canCalculate) return;

    const drinkMix = getSelectedDrinkMix();
    const availableSolids = solidProducts.filter((p) =>
      selectedSolidIds.includes(p.id)
    );

    const result = calculateFuelPlan({
      ride,
      availableBottles,
      drinkMix,
      availableSolids,
    });

    setPlan(result);
  };

  const handleSavePlan = () => {
    if (plan) {
      saveFuelPlan(plan);
      setToastMessage('Plan saved to history!');
    }
  };

  const dismissToast = useCallback(() => setToastMessage(null), []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Plan Your Ride Fuel</h1>

      {!canCalculate && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <p className="text-amber-800 font-medium mb-2">
              Before you can calculate a fuel plan:
            </p>
            <ul className="text-amber-700 text-sm space-y-1">
              {availableBottles.length === 0 && (
                <li>
                  • Add at least one available bottle on the{' '}
                  <Link to="/inventory" className="underline font-medium">
                    Inventory page
                  </Link>
                </li>
              )}
              {drinkMixes.length === 0 && (
                <li>
                  • Add at least one drink mix on the{' '}
                  <Link to="/inventory" className="underline font-medium">
                    Inventory page
                  </Link>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Ride Details</h2>
            </CardHeader>
            <CardContent>
              <RideForm onCalculate={handleCalculate} disabled={!canCalculate} />
            </CardContent>
          </Card>

          <FuelOptionsCard
            drinkMixes={drinkMixes}
            solidProducts={solidProducts}
            selectedDrinkMixId={selectedDrinkMixId}
            selectedSolidIds={selectedSolidIds}
            onDrinkMixChange={setSelectedDrinkMixId}
            onSolidChange={setSelectedSolidIds}
          />
        </div>

        <div>
          {plan ? (
            <>
              <FuelResult plan={plan} bottles={bottles} products={products} />
              <Button
                className="w-full mt-4"
                variant="secondary"
                onClick={handleSavePlan}
              >
                Save to History
              </Button>
            </>
          ) : (
            <Card className="flex items-center justify-center h-full min-h-[300px]">
              <CardContent className="text-center text-gray-500">
                {canCalculate
                  ? 'Configure your ride and click Calculate'
                  : 'Add bottles and products to get started'}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {toastMessage && (
        <Toast message={toastMessage} onDismiss={dismissToast} />
      )}
    </div>
  );
}
