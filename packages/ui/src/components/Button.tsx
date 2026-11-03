import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'urgent' | 'outline' | 'ghost' | 'mint';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  fullWidth?: boolean;
  hotkey?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_MAP: Record<string, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm border border-transparent focus:ring-blue-500',
  secondary:
    'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 border border-slate-200 focus:ring-slate-400',
  urgent:
    'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-sm border border-transparent focus:ring-amber-400',
  mint:
    'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm border border-transparent focus:ring-emerald-500',
  outline:
    'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm focus:ring-blue-500',
  ghost:
    'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600 border border-transparent focus:ring-slate-400',
};

const SIZE_MAP: Record<string, string> = {
  sm: 'px-2.5 py-1.5 text-xs font-medium rounded-md gap-1.5',
  md: 'px-3.5 py-2 text-sm font-medium rounded-lg gap-2',
  lg: 'px-4.5 py-2.5 text-base font-semibold rounded-lg gap-2.5',
  xl: 'px-6 py-3.5 text-lg font-bold rounded-xl gap-3',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  hotkey,
  leftIcon,
  rightIcon,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const variantClass = VARIANT_MAP[variant] || VARIANT_MAP.primary;
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const widthClass = fullWidth ? 'w-full' : '';
  const stateClass = disabled || isLoading ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer';

  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`inline-flex items-center justify-center transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none ${variantClass} ${sizeClass} ${widthClass} ${stateClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-0.5 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {rightIcon && !isLoading && rightIcon}
      {hotkey && !isLoading && (
        <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono uppercase bg-black/10 rounded tracking-wider">
          {hotkey}
        </kbd>
      )}
    </button>
  );
};
