import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { Card, CardContent, Button } from '@/components/ui';

export function HistoryPage() {
  const fuelPlans = useStore((s) => s.fuelPlans);
  const deleteFuelPlan = useStore((s) => s.deleteFuelPlan);
  const bottles = useStore((s) => s.bottles);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmingDeleteId) return;
    const timer = setTimeout(() => setConfirmingDeleteId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmingDeleteId]);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const sortedPlans = [...fuelPlans].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Fuel Plan History</h1>

      {sortedPlans.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">No saved fuel plans yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Create a plan on the Planner page and save it to see it here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedPlans.map((plan) => {
            const bottleNames = plan.bottles
              .map((b) => bottles.find((bt) => bt.id === b.bottleId)?.name)
              .filter(Boolean)
              .join(', ');

            const isConfirming = confirmingDeleteId === plan.id;

            return (
              <Card key={plan.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        {formatDate(plan.createdAt)}
                      </p>
                      <p className="font-semibold mt-1">
                        {formatDuration(plan.rideCharacteristics.durationMinutes)}{' '}
                        {plan.rideCharacteristics.intensity} ride
                      </p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-brand-600 font-medium">
                          {plan.summary.totalCarbsPlanned}g carbs
                        </span>
                        <span className="text-gray-500">
                          {plan.summary.hydrationMl}ml hydration
                        </span>
                        {plan.summary.sodiumMgPerHour !== undefined && (
                          <span className="text-gray-500">
                            {plan.summary.sodiumMgPerHour}mg/hr sodium
                          </span>
                        )}
                      </div>
                      {bottleNames && (
                        <p className="text-sm text-gray-500 mt-1">
                          Bottles: {bottleNames}
                        </p>
                      )}
                    </div>
                    {isConfirming ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deleteFuelPlan(plan.id)}
                      >
                        Confirm?
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingDeleteId(plan.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
