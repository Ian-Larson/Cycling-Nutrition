import type { ReactNode } from 'react';

interface NutritionWorkspaceLayoutProps {
  main: ReactNode;
  rail: ReactNode;
}

export function NutritionWorkspaceLayout({
  main,
  rail,
}: NutritionWorkspaceLayoutProps) {
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start lg:gap-5 lg:space-y-0 xl:gap-6">
      <div className="min-w-0 space-y-3 md:space-y-4">{main}</div>
      <aside className="min-w-0 lg:sticky lg:top-[5.25rem]">{rail}</aside>
    </div>
  );
}
