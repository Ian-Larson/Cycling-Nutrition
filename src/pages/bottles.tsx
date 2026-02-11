import { useState } from 'react';
import { useStore } from '@/store';
import { Button, Card, CardContent } from '@/components/ui';
import { BottleCard } from '@/components/bottles/bottle-card';
import { BottleForm } from '@/components/bottles/bottle-form';

export function BottlesPage() {
  const [showForm, setShowForm] = useState(false);
  const bottles = useStore((s) => s.bottles);
  const addBottle = useStore((s) => s.addBottle);
  const updateBottle = useStore((s) => s.updateBottle);
  const deleteBottle = useStore((s) => s.deleteBottle);

  const handleAddBottle = (data: { name: string; capacityMl: number }) => {
    addBottle({ ...data, isAvailable: true });
    setShowForm(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Bottles</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>Add Bottle</Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent>
            <BottleForm
              onSubmit={handleAddBottle}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {bottles.length === 0 && !showForm ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">No bottles added yet</p>
            <Button onClick={() => setShowForm(true)}>
              Add Your First Bottle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bottles.map((bottle) => (
            <BottleCard
              key={bottle.id}
              bottle={bottle}
              onToggleAvailable={() =>
                updateBottle(bottle.id, { isAvailable: !bottle.isAvailable })
              }
              onDelete={() => deleteBottle(bottle.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
