import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectStravaCard } from './connect-strava-card';

describe('ConnectStravaCard', () => {
  it('renders power records as a quiet secondary prompt', () => {
    const { container } = render(<ConnectStravaCard onConnect={vi.fn()} />);

    expect(
      screen.getByRole('region', { name: /Power records/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Connect Strava')).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveClass('rounded-2xl');
    expect(container.firstElementChild).not.toHaveClass('shadow-[var(--shadow-soft)]');
  });
});
