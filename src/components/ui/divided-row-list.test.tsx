import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DividedRowList } from './divided-row-list';

describe('DividedRowList', () => {
  it('can render as a plain divided list without card chrome', () => {
    const { container } = render(
      <DividedRowList
        variant="plain"
        items={['Chain', 'Cassette']}
        getKey={(item) => item}
        renderItem={(item) => <span>{item}</span>}
      />,
    );

    expect(screen.getByText('Chain')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('border-y');
    expect(container.firstElementChild?.className).not.toContain(
      'shadow-[var(--shadow-soft)]',
    );
  });
});
