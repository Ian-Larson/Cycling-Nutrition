import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SetupCard } from '@/components/planner/setup-card';

function renderSetupCard(props: Parameters<typeof SetupCard>[0]) {
  return render(
    <MemoryRouter>
      <SetupCard {...props} />
    </MemoryRouter>,
  );
}

describe('SetupCard bottle pool', () => {
  it('lets the rider increment a 950ml bottle past 1 with no inventory cap', () => {
    const onBottleCountChange = vi.fn();
    renderSetupCard({
      variant: 'embedded',
      bottleCounts: { 550: 0, 750: 0, 950: 1 },
      selectedBottleCounts: { 550: 0, 750: 0, 950: 1 },
      drinkMixes: [],
      solidProducts: [],
      selectedDrinkMixId: null,
      selectedSolidIds: [],
      onBottleCountChange,
      onDrinkMixChange: vi.fn(),
      onSolidChange: vi.fn(),
    });

    // The "Available bottles" section collapses when a bottle is already
    // selected. Open it so the counter buttons are in the DOM.
    fireEvent.click(screen.getByRole('button', { name: /Available bottles/i }));

    const addButton = screen.getByRole('button', {
      name: /Add one 950ml bottle/i,
    });
    fireEvent.click(addButton);

    expect(addButton).not.toBeDisabled();
    expect(onBottleCountChange).toHaveBeenCalledWith(950, 2);
  });

  it('clamps decrement at zero', () => {
    const onBottleCountChange = vi.fn();
    renderSetupCard({
      variant: 'embedded',
      bottleCounts: { 550: 0, 750: 0, 950: 1 },
      selectedBottleCounts: { 550: 0, 750: 0, 950: 0 },
      drinkMixes: [],
      solidProducts: [],
      selectedDrinkMixId: null,
      selectedSolidIds: [],
      onBottleCountChange,
      onDrinkMixChange: vi.fn(),
      onSolidChange: vi.fn(),
    });

    const removeButton = screen.getByRole('button', {
      name: /Remove one 950ml bottle/i,
    });
    expect(removeButton).toBeDisabled();
  });
});
