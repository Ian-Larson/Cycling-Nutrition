import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PowerProfileHexagon } from './power-profile-hexagon';

const samplePoints = [5, 30, 60, 300, 1200, 3600].map((d, i) => ({
  durationSeconds: d,
  wkg: 6 - i * 0.5,
}));

describe('PowerProfileHexagon', () => {
  it('renders an SVG with two polygon paths', () => {
    const { container } = render(
      <PowerProfileHexagon
        current={samplePoints}
        comparison={samplePoints.map((p) => ({ ...p, wkg: (p.wkg ?? 0) - 0.3 }))}
        currentLabel="Last 90d"
        comparisonLabel="Previous 90d"
      />
    );
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelectorAll('polygon[data-period]')).toHaveLength(2);
  });

  it('renders the period labels in the legend', () => {
    render(
      <PowerProfileHexagon
        current={samplePoints}
        comparison={samplePoints}
        currentLabel="2026"
        comparisonLabel="2025"
      />
    );
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('renders an empty-state hint when both periods have no wkg data', () => {
    const empty = samplePoints.map((p) => ({ ...p, wkg: null }));
    render(
      <PowerProfileHexagon
        current={empty}
        comparison={empty}
        currentLabel="A"
        comparisonLabel="B"
      />
    );
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument();
  });

  it('does not show an empty state while profile data is loading', () => {
    const empty = samplePoints.map((p) => ({ ...p, wkg: null }));
    render(
      <PowerProfileHexagon
        current={empty}
        comparison={empty}
        currentLabel="A"
        comparisonLabel="B"
        isLoading
      />
    );
    expect(screen.getByText(/Loading power profile/i)).toBeInTheDocument();
    expect(screen.queryByText(/not enough data/i)).not.toBeInTheDocument();
  });
});
