import { clsx } from 'clsx';
import {
  createContext,
  useContext,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

interface CollapsibleContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  contentId: string;
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

function useCollapsibleContext(componentName: string): CollapsibleContextValue {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside Collapsible.`);
  }
  return context;
}

interface CollapsibleProps {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Collapsible({
  children,
  className,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const contentId = useId();
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  const contextValue = {
    open,
    setOpen,
    contentId,
  };

  return (
    <CollapsibleContext.Provider value={contextValue}>
      <div className={className} data-state={open ? 'open' : 'closed'}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

interface CollapsibleTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  showChevron?: boolean;
}

export function CollapsibleTrigger({
  className,
  children,
  onClick,
  showChevron = true,
  ...props
}: CollapsibleTriggerProps) {
  const { open, setOpen, contentId } = useCollapsibleContext('CollapsibleTrigger');

  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={contentId}
      data-state={open ? 'open' : 'closed'}
      className={clsx(
        'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left md:min-h-0 md:rounded-md md:px-2 md:py-1.5',
        'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
        className
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen(!open);
        }
      }}
      {...props}
    >
      <span className="flex-1">{children}</span>
      {showChevron && (
        <svg
          className={clsx(
            'h-4 w-4 shrink-0 text-gray-500 transition-transform',
            open && 'rotate-180'
          )}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

interface CollapsibleContentProps extends HTMLAttributes<HTMLDivElement> {
  keepMounted?: boolean;
}

export function CollapsibleContent({
  className,
  children,
  keepMounted = false,
  ...props
}: CollapsibleContentProps) {
  const { open, contentId } = useCollapsibleContext('CollapsibleContent');

  if (!open && !keepMounted) return null;

  return (
    <div
      id={contentId}
      hidden={!open}
      data-state={open ? 'open' : 'closed'}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}
