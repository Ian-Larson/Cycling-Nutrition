import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '@/components/layout/page-intro';
import { Button } from '@/components/ui';
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
        meta={
          <Link
            to="/gear"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
          >
            <span aria-hidden>←</span>
            Back to garage
          </Link>
        }
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
