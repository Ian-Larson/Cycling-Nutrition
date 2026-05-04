interface EmptyStateProps {
  title: string;
  hint?: string;
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
      <p className="text-sm font-medium text-neutral-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-neutral-500">{hint}</p>}
    </div>
  );
}
