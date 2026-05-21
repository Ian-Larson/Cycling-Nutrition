import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MobileNav } from './mobile-nav';

describe('MobileNav', () => {
  it('lays out every primary nav item without dropping Account to a hidden row', () => {
    const { container } = render(
      <MemoryRouter>
        <MobileNav />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(container.querySelector('.grid-cols-5')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Stats' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Performance' })
    ).not.toBeInTheDocument();
  });
});
