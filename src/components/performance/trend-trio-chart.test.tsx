import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrendTrioChart } from './trend-trio-chart';

const series = {
  wkg: [
    { dateIso: '2025-01-01', value: 3.4 },
    { dateIso: '2025-06-01', value: 3.6 },
    { dateIso: '2025-12-01', value: 3.7 },
  ],
  ftp: [
    { dateIso: '2025-01-01', value: 250 },
    { dateIso: '2025-06-01', value: 270 },
    { dateIso: '2025-12-01', value: 270 },
  ],
  weight: [
    { dateIso: '2025-01-01', value: 75 },
    { dateIso: '2025-06-01', value: 75 },
    { dateIso: '2025-09-01', value: 73 },
  ],
};

describe('TrendTrioChart', () => {
  it('renders an SVG with three line paths', () => {
    const { container } = render(<TrendTrioChart series={series} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelectorAll('path[data-series]')).toHaveLength(3);
  });

  it('renders a legend with all three labels', () => {
    render(<TrendTrioChart series={series} />);
    expect(screen.getByText(/W\/kg/)).toBeInTheDocument();
    expect(screen.getByText(/FTP/)).toBeInTheDocument();
    expect(screen.getByText(/Weight/)).toBeInTheDocument();
  });

  it('renders a hint when all three series are empty', () => {
    render(
      <TrendTrioChart
        series={{ wkg: [], ftp: [], weight: [] }}
      />
    );
    expect(screen.getByText(/log your ftp and weight/i)).toBeInTheDocument();
  });
});
