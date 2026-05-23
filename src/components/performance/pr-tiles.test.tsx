import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrTiles } from './pr-tiles';

const emptyTiles = [300, 1200, 3600].map((durationSeconds) => ({
  durationSeconds,
  record: null,
}));

describe('PrTiles', () => {
  it('shows a loading state instead of empty records while records load', () => {
    render(<PrTiles tiles={emptyTiles} isLoading />);
    expect(screen.getByText(/Loading power records/i)).toBeInTheDocument();
    expect(screen.queryByText(/No qualifying ride yet/i)).not.toBeInTheDocument();
  });

  it('surfaces record loading errors inline', () => {
    render(<PrTiles tiles={emptyTiles} error="Unable to load curves" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Unable to load curves/i);
  });
});
