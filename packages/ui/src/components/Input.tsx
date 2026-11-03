import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  prefixText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      prefixText,
      leftIcon,
      rightIcon,
      id,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            {label}
          </label>
        )}

        <div
          className={`relative flex items-center rounded-lg border bg-white shadow-sm transition-colors duration-150 ${
            error
              ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-400/20 focus-within:border-red-600'
              : 'border-slate-300 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600'
          } ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}`}
        >
          {prefixText && (
            <span className="pl-3.5 pr-2 py-2.5 text-sm font-semibold text-slate-500 select-none border-r border-slate-200">
              {prefixText}
            </span>
          )}

          {leftIcon && !prefixText && (
            <span className="pl-3 text-slate-400 pointer-events-none">{leftIcon}</span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent rounded-lg focus:outline-none ${className}`}
            {...props}
          />

          {rightIcon && <span className="pr-3 text-slate-400">{rightIcon}</span>}
        </div>

        {error ? (
          <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
