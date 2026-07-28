import React from 'react';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, position = 'top', className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-100 transition-opacity',
            {
              'bottom-full left-1/2 mb-2 -translate-x-1/2': position === 'top',
              'top-full left-1/2 mt-2 -translate-x-1/2': position === 'bottom',
              'right-full top-1/2 mr-2 -translate-y-1/2': position === 'left',
              'left-full top-1/2 ml-2 -translate-y-1/2': position === 'right',
            },
            className
          )}
        >
          {content}
          <div
            className={cn(
              'absolute h-2 w-2 bg-slate-900',
              {
                'bottom-[-4px] left-1/2 -translate-x-1/2 rotate-45': position === 'top',
                'top-[-4px] left-1/2 -translate-x-1/2 rotate-45': position === 'bottom',
                'right-[-4px] top-1/2 -translate-y-1/2 rotate-45': position === 'left',
                'left-[-4px] top-1/2 -translate-y-1/2 rotate-45': position === 'right',
              }
            )}
          />
        </div>
      )}
    </div>
  );
}
