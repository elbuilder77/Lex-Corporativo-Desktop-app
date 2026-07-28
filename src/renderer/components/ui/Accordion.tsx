import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const AccordionContext = createContext<{
  openValue: string | null;
  toggleValue: (value: string) => void;
}>({ openValue: null, toggleValue: () => {} });

export function Accordion({ children, className }: { children: React.ReactNode; className?: string }) {
  const [openValue, setOpenValue] = useState<string | null>(null);

  const toggleValue = (value: string) => {
    setOpenValue((prev) => (prev === value ? null : value));
  };

  return (
    <AccordionContext.Provider value={{ openValue, toggleValue }}>
      <div className={cn('space-y-2', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  return <div className={cn('border-b border-slate-200 last:border-0', className)} data-value={value}>{children}</div>;
}

export function AccordionTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { openValue, toggleValue } = useContext(AccordionContext);
  const isOpen = openValue === value;

  return (
    <button
      type="button"
      onClick={() => toggleValue(value)}
      className={cn(
        'flex w-full items-center justify-between py-4 text-sm font-medium transition-all hover:underline',
        className
      )}
      aria-expanded={isOpen}
    >
      {children}
      <ChevronDown
        className={cn('h-4 w-4 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
      />
    </button>
  );
}

export function AccordionContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { openValue } = useContext(AccordionContext);
  const isOpen = openValue === value;

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className={cn('pb-4 text-sm text-slate-500', className)}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
