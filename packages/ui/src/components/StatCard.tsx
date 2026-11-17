import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: {
    label: string;
    variant: 'blue' | 'mint' | 'amber' | 'red' | 'gray';
  };
  icon?: React.ReactNode;
  accentColor?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  icon,
  accentColor,
  className = '',
}) => {
  return (
    <div
      className={`bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 relative overflow-hidden transition-all duration-150 ${className}`}
    >
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-1.5 opacity-90"
          style={{ backgroundColor: accentColor }}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {value}
            </span>
            {badge && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  badge.variant === 'mint'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : badge.variant === 'amber'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : badge.variant === 'red'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}
              >
                {badge.label}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>

        {icon && (
          <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-100 shadow-2xs">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

