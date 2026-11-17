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
      className={`rounded-2xl border p-4.5 bg-white/95 backdrop-blur-sm shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-150 ${className}`}
      style={{
        borderColor: chamberStyle.border,
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-0.5 text-xs font-bold rounded-lg font-mono shadow-2xs"
            style={{
              backgroundColor: chamberStyle.bg,
              color: chamberStyle.text,
              border: `1px solid ${chamberStyle.border}`,
            }}
          >
            {chamberNumber.toUpperCase()}
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold rounded-full shadow-2xs"
            style={{
              backgroundColor: statusStyle.bg,
              color: statusStyle.text,
              border: `1px solid ${statusStyle.border}`,
            }}
          >
            <span
              className={`h-2 w-2 rounded-full ${status === 'ACTIVE' ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: statusStyle.dot }}
            />
            {statusStyle.label}
          </span>
        </div>

        {delayMinutes > 0 && (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            +{delayMinutes}m delay
          </span>
        )}
      </div>

      {doctorName && (
        <div className="mb-2.5">
          <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">
            {doctorName}
          </h4>
          {specialty && (
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{specialty}</p>
          )}
        </div>
      )}

      {currentCallingToken !== undefined && currentCallingToken > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Calling Now:</span>
          <span
            className="text-lg font-black font-mono tabular-nums px-2.5 py-0.5 rounded-lg shadow-2xs"
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

