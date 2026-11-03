import React from 'react';
import { getChamberStyle, getChamberStatusStyle } from '../tokens';

export interface ChamberBadgeProps {
  chamberNumber: string; // e.g. "CH-1"
  doctorName?: string;
  specialty?: string;
  status?: 'ACTIVE' | 'BREAK' | 'DELAYED' | 'OFFLINE';
  delayMinutes?: number;
  currentCallingToken?: number;
  className?: string;
}

export const ChamberBadge: React.FC<ChamberBadgeProps> = ({
  chamberNumber,
  doctorName,
  specialty,
  status = 'OFFLINE',
  delayMinutes = 0,
  currentCallingToken,
  className = '',
}) => {
  const chamberStyle = getChamberStyle(chamberNumber);
  const statusStyle = getChamberStatusStyle(status);

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-150 ${className}`}
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: chamberStyle.border,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-0.5 text-xs font-bold rounded-md"
            style={{
              backgroundColor: chamberStyle.bg,
              color: chamberStyle.text,
              border: `1px solid ${chamberStyle.border}`,
            }}
          >
            {chamberNumber.toUpperCase()}
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full"
            style={{
              backgroundColor: statusStyle.bg,
              color: statusStyle.text,
              border: `1px solid ${statusStyle.border}`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: statusStyle.dot }}
            />
            {statusStyle.label}
          </span>
        </div>

        {delayMinutes > 0 && (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-50 text-rose-700 border border-rose-200">
            +{delayMinutes}m delay
          </span>
        )}
      </div>

      {doctorName && (
        <div className="mb-2">
          <h4 className="font-semibold text-slate-900 text-sm leading-tight truncate">
            {doctorName}
          </h4>
          {specialty && (
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{specialty}</p>
          )}
        </div>
      )}

      {currentCallingToken !== undefined && currentCallingToken > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Calling Now:</span>
          <span
            className="text-lg font-bold font-mono tabular-nums px-2.5 py-0.5 rounded-md"
            style={{
              backgroundColor: chamberStyle.bg,
              color: chamberStyle.text,
            }}
          >
            #{currentCallingToken}
          </span>
        </div>
      )}
    </div>
  );
};
