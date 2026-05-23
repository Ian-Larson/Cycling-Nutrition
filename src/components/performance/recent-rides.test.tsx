import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecentRides } from './recent-rides';
import type { Activity } from '@/types/activity';

const sample: Activity = {
  stravaId: '1',
  startedAt: '2025-06-01T10:00:00Z',
  durationS: 3661,
  distanceM: 30000,
  avgWatts: 200,
  npWatts: 220,
  maxWatts: 800,
  kj: 720,
  hasPower: true,
  bikeId: null,
  stravaGearId: null,
  name: 'Morning Ride',
  source: 'strava',
};

describe('RecentRides', () => {
  it('renders rows for each activity with date, name, distance and duration', () => {
    render(<RecentRides activities={[sample]} />);
    expect(screen.getByText('Morning Ride')).toBeInTheDocument();
    expect(screen.getByText(/30\.0\s*km/)).toBeInTheDocument();
    expect(screen.getByText(/1h\s*01m/)).toBeInTheDocument();
  });

  it('surfaces useful power details for recent rides', () => {
    render(<RecentRides activities={[sample]} />);
    expect(screen.getByText(/NP\s*220\s*W/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg\s*200\s*W/i)).toBeInTheDocument();
    expect(screen.getByText(/720\s*kJ/i)).toBeInTheDocument();
  });

  it('shows a dash when distance is missing', () => {
    render(<RecentRides activities={[{ ...sample, distanceM: null }]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('caps the list to the five most recent rides', () => {
    const many: Activity[] = Array.from({ length: 8 }, (_, i) => ({
      ...sample,
      stravaId: `id-${i}`,
      name: `Ride ${i}`,
    }));
    render(<RecentRides activities={many} />);
    expect(screen.getByText('Ride 0')).toBeInTheDocument();
    expect(screen.getByText('Ride 4')).toBeInTheDocument();
    expect(screen.queryByText('Ride 5')).not.toBeInTheDocument();
  });

  it('links each row to the Strava activity', () => {
    render(<RecentRides activities={[sample]} />);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://www.strava.com/activities/1'
    );
  });
});
