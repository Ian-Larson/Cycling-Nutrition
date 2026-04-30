import type { ReactNode } from 'react';
import {
  Card,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui';

interface NutritionRailProps {
  children: ReactNode;
}

interface NutritionRailPanelProps {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function NutritionRail({ children }: NutritionRailProps) {
  return <div className="space-y-3 md:space-y-4">{children}</div>;
}

export function NutritionRailPanel({
  title,
  summary,
  defaultOpen,
  children,
}: NutritionRailPanelProps) {
  return (
    <Card className="overflow-hidden">
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger className="rounded-none px-4 py-3.5 md:px-4 md:py-3.5">
          <span className="min-w-0">
            <span className="section-title block text-base">{title}</span>
            {summary ? (
              <span className="mt-1 block truncate text-sm leading-5 text-ink-600">
                {summary}
              </span>
            ) : null}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-[color:var(--border-soft)] px-4 py-3.5">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
