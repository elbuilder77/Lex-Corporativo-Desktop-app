import React, { useId, useState } from 'react';
import { cn } from '../../lib/utils';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      showCount,
      maxLength,
      autoResize,
      required,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const id = useId();
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const [charCount, setCharCount] = useState(String(value || '').length);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      if (autoResize) {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium leading-none text-slate-900">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <textarea
          id={id}
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus-visible:ring-red-400',
            autoResize && 'resize-none overflow-hidden',
            className
          )}
          ref={ref}
          required={required}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          {...props}
        />
        <div className="flex justify-between">
          <div>
            {error && (
              <p id={errorId} className="text-xs font-medium text-red-500">
                {error}
              </p>
            )}
            {!error && helperText && (
              <p id={helperId} className="text-xs text-slate-500">
                {helperText}
              </p>
            )}
          </div>
          {showCount && (
            <span className="text-xs text-slate-500">
              {charCount}{maxLength ? ` / ${maxLength}` : ''}
            </span>
          )}
        </div>
      </div>
    );
  }
);
TextArea.displayName = 'TextArea';
