import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StepperProps {
  steps: string[];
  currentStep: number;
  completedSteps?: number[];
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  completedSteps = [],
  onStepClick,
  className,
}: StepperProps) {
  return (
    <div className={cn('w-full py-4', className)}>
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-slate-200 z-0" />
        
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index) || index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && (isCompleted || isCurrent);

          return (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                  {
                    'border-emerald-500 bg-emerald-500 text-white': isCompleted,
                    'border-slate-900 bg-white text-slate-900': isCurrent && !isCompleted,
                    'border-slate-200 bg-white text-slate-400': !isCurrent && !isCompleted,
                    'cursor-pointer hover:border-slate-400': isClickable && !isCurrent && !isCompleted,
                  }
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <span className="text-sm font-medium">{index + 1}</span>}
              </button>
              <span
                className={cn(
                  'absolute -bottom-6 w-max text-xs font-medium',
                  {
                    'text-slate-900': isCurrent || isCompleted,
                    'text-slate-400': !isCurrent && !isCompleted,
                  }
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
