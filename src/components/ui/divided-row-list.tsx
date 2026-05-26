import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Card } from './card';

interface DividedRowListProps<T> {
  items: readonly T[];
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** Optional className merged onto the wrapping element. */
  className?: string;
  /** Optional content rendered above the divided list (e.g., kicker + title row). */
  header?: ReactNode;
  /** Plain lists avoid nested card chrome inside already-framed sections. */
  variant?: 'card' | 'plain';
}

export function DividedRowList<T>({
  items,
  getKey,
  renderItem,
  className,
  header,
  variant = 'card',
}: DividedRowListProps<T>) {
  const list = (
    <>
      {header ? (
        <div className="border-b border-[color:var(--border-soft)] px-3 py-2.5 md:px-4 md:py-3">
          {header}
        </div>
      ) : null}
      <ul className="divide-y divide-[color:var(--border-soft)] py-1">
        {items.map((item, i) => (
          <li key={getKey(item, i)}>{renderItem(item, i)}</li>
        ))}
      </ul>
    </>
  );

  if (variant === 'plain') {
    return (
      <div
        className={clsx(
          'border-y border-[color:var(--border-soft)]',
          className
        )}
      >
        {list}
      </div>
    );
  }

  return (
    <Card className={clsx('overflow-hidden', className)}>
      {list}
    </Card>
  );
}
