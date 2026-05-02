import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Settings } from '@/components/account/settings';
import { AuthProvider } from '@/lib/auth/auth-provider';

function renderSettings() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Settings />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Settings', () => {
  it('renders Gut target and Heavy sweater rows in the Fuel section', () => {
    renderSettings();
    expect(screen.getByText('Gut target')).toBeInTheDocument();
    // The Toggle uses 'Heavy sweater' both as the row label and as its own
    // accessible name, so multiple matches are expected.
    expect(screen.getAllByText('Heavy sweater').length).toBeGreaterThan(0);
  });

  it('does not render the Sweat rate row', () => {
    renderSettings();
    expect(screen.queryByText('Sweat rate')).not.toBeInTheDocument();
  });

  it('does not render the Fueling engine row', () => {
    renderSettings();
    expect(screen.queryByText('Fueling engine')).not.toBeInTheDocument();
  });

  it('does not render the gut-target tolerance helper', () => {
    renderSettings();
    expect(screen.queryByText(/Progressive tolerance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Conservative tolerance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Aggressive tolerance/i)).not.toBeInTheDocument();
  });
});
