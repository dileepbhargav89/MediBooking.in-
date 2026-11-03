import React from 'react';

export interface BadgeProps {
  variant?: 'blue' | 'mint' | 'amber' | 'red' | 'gray' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-600',
  },
  mint: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-600',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-600',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-600',
  },
  gray: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-600',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'blue',
  size = 'md',
  dot = false,
  pulse = false,
  children,
  className = '',
}) => {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES['blue']!;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses} ${className}`}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${styles.dot}`} />
        </span>
      )}
      {children}
    </span>
  );
};
