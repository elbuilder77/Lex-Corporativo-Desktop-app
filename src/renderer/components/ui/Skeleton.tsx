import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'paragraph' | 'card' | 'avatar';
}

export function Skeleton({ className, variant = 'text', ...props }: SkeletonProps) {
  if (variant === 'paragraph') {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'animate-pulse bg-slate-200',
        {
          'h-4 w-full rounded': variant === 'text',
          'h-48 w-full rounded-2xl': variant === 'card',
          'h-12 w-12 rounded-full': variant === 'avatar',
        },
        className
      )}
      {...props}
    />
  );
}
