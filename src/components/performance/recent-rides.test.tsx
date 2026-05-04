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
  it('renders rows for each activity', () => {
    render(<RecentRides activities={[sample]} />);
    expect(screen.getByText('Morning Ride')).toBeInTheDocument();
    expect(screen.getByText(/220\s*W/)).toBeInTheDocument();
  });

  it('shows a dash when NP is missing', () => {
    render(<RecentRides activities={[{ ...sample, npWatts: null }]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
