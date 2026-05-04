import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroStrip } from './hero-strip';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('HeroStrip', () => {
  it('renders the w/kg numeral with one decimal', () => {
    renderWithRouter(
      <HeroStrip
        currentWkg={4.07}
        delta90d={0.18}
        ftpWatts={285}
        weightKg={70}
      />
    );
    expect(screen.getByText('4.1')).toBeInTheDocument();
  });

  it('renders the delta with sign and arrow', () => {
    renderWithRouter(
      <HeroStrip
        currentWkg={4.0}
        delta90d={0.2}
        ftpWatts={280}
        weightKg={70}
      />
    );
    expect(screen.getByText(/↑\s*\+0\.2/)).toBeInTheDocument();
  });

  it('renders a downward arrow for negative deltas', () => {
    renderWithRouter(
      <HeroStrip
        currentWkg={4.0}
        delta90d={-0.1}
        ftpWatts={280}
        weightKg={70}
      />
    );
    expect(screen.getByText(/↓\s*0\.1/)).toBeInTheDocument();
  });

  it('omits delta when undefined', () => {
    renderWithRouter(
      <HeroStrip
        currentWkg={4.0}
        delta90d={undefined}
        ftpWatts={280}
        weightKg={70}
      />
    );
    expect(screen.queryByText(/↑/)).not.toBeInTheDocument();
    expect(screen.queryByText(/↓/)).not.toBeInTheDocument();
  });

  it('renders FTP and weight subtext', () => {
    renderWithRouter(
      <HeroStrip
        currentWkg={4.0}
        delta90d={undefined}
        ftpWatts={280}
        weightKg={70}
      />
    );
    expect(screen.getByText(/280\s*W/)).toBeInTheDocument();
    expect(screen.getByText(/70\s*kg/)).toBeInTheDocument();
  });

  it('shows the log-your-FTP prompt when w/kg is undefined', () => {
    renderWithRouter(
      <HeroStrip
        currentWkg={undefined}
        delta90d={undefined}
        ftpWatts={undefined}
        weightKg={undefined}
      />
    );
    expect(screen.getByText(/log your ftp and weight/i)).toBeInTheDocument();
  });
});
