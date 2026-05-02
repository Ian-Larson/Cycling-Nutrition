import { useState } from 'react';
import type { Product } from '@/types';
import type { BottleInventory } from '@/types/bottle';
import type { FuelingPrescription } from '@/lib/fueling';

interface DebugCopyButtonProps {
  prescription: FuelingPrescription | null;
  products: Product[];
  selectedBottleCounts: BottleInventory;
  selectedDrinkMixId: string | null;
  selectedSolidIds: string[];
}

export function DebugCopyButton({
  prescription,
  products,
  selectedBottleCounts,
  selectedDrinkMixId,
  selectedSolidIds,
}: DebugCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const payload = JSON.stringify(
      {
        prescription,
        products,
        selectedBottleCounts,
        selectedDrinkMixId,
        selectedSolidIds,
      },
      null,
      2,
    );
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs text-ink-500 underline hover:text-ink-700"
    >
      {copied ? 'Copied!' : 'Copy debug payload'}
    </button>
  );
}
