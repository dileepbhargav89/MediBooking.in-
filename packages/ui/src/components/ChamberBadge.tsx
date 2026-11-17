import React from 'react';
import { getChamberStyle, getChamberStatusStyle } from '../tokens';

export interface ChamberBadgeProps {
  chamberNumber: string; // e.g. "CH-1"
  doctorName?: string;
  specialty?: string;
  consultationFee?: number;
  waitingCount?: number;
  status?: 'ACTIVE' | 'BREAK' | 'DELAYED' | 'OFFLINE';
  delayMinutes?: number;
  currentCallingToken?: number;
  onClick?: () => void;
  className?: string;
}

export const ChamberBadge: React.FC<ChamberBadgeProps> = ({
  chamberNumber,
  doctorName,
  specialty,
  consultationFee,
  waitingCount,
  status = 'OFFLINE',
  delayMinutes = 0,
  currentCallingToken,
  onClick,
  className = '',
}) => {
  const chamberStyle = getChamberStyle(chamberNumber);
  const statusStyle = getChamberStatusStyle(status);

  return (
    <div
      data-testid={`chamber-card-${chamberNumber.toLowerCase()}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`rounded-2xl border p-4.5 bg-white/95 backdrop-blur-sm shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-150 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''
      } ${className}`}
      style={{
        borderColor: chamberStyle.border,
      }}
    >
      <div>
        {/* Top Header: Chamber Code & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
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

          {delayMinutes > 0 ? (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              +{delayMinutes}m delay
            </span>
          ) : waitingCount !== undefined ? (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">
              {waitingCount} waiting
            </span>
          ) : null}
        </div>

        {/* Doctor Identity & Specialty */}
        {doctorName && (
          <div className="mb-3">
            <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">
              {doctorName}
            </h4>
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-xs text-slate-500 font-medium truncate">{specialty}</p>
              {consultationFee !== undefined && (
                <span className="font-mono font-bold text-xs text-slate-700 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                  ₹{consultationFee}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Calling Token Bottom Strip - Normalized & Zero Overlap */}
      {currentCallingToken !== undefined && currentCallingToken > 0 && (
        <div className="mt-2 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            Calling Now:
          </span>
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

