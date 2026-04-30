import { useState } from 'react';
import { PageIntro } from '@/components/layout/page-intro';
import { Button } from '@/components/ui';
import { GearSubNav } from '@/components/gear/gear-sub-nav';
import { GearInventory } from '@/components/gear/gear-inventory';
import { AddPartSheet } from '@/components/gear/add-part-sheet';
import { useStore } from '@/store';

export function GearInventoryPage() {
  const bikes = useStore((s) => s.bikes);
  const gearPartCatalog = useStore((s) => s.gearPartCatalog);
  const gearPartInstances = useStore((s) => s.gearPartInstances);
  const gearInstallRecords = useStore((s) => s.gearInstallRecords);
  const [addOpen, setAddOpen] = useState(false);
  const [editInstanceId, setEditInstanceId] = useState<string | null>(null);

  const sheetOpen = addOpen || editInstanceId !== null;

  return (
    <div className="page-shell space-y-4 md:space-y-6">
      <PageIntro
        title="Inventory"
        description="Physical parts you own."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setAddOpen(true)}
          >
            + Add part
          </Button>
        }
      />

      <GearSubNav />

      <GearInventory
        catalog={gearPartCatalog}
        instances={gearPartInstances}
        installRecords={gearInstallRecords}
        bikes={bikes}
        onEdit={(id) => setEditInstanceId(id)}
      />

      <AddPartSheet
        open={sheetOpen}
        instanceId={editInstanceId}
        onClose={() => {
          setAddOpen(false);
          setEditInstanceId(null);
        }}
      />
    </div>
  );
}
