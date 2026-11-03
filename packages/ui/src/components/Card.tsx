import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  interactive = false,
}) => {
  const baseClasses =
    'bg-white border border-slate-200 rounded-xl shadow-sm text-slate-900 transition-all duration-150';
  const interactiveClasses = interactive || onClick
    ? 'hover:shadow-md hover:border-slate-300 cursor-pointer'
    : '';

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${interactiveClasses} ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between ${className}`}>
    {children}
  </div>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-5 ${className}`}>{children}</div>;

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 rounded-b-xl flex items-center justify-between ${className}`}>
    {children}
  </div>
);
