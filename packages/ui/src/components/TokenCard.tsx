import React from 'react';
import {
  getChamberStyle,
  getPaymentBadgeStyle,
  getQueueStatusBadgeStyle,
  getTriageStyle,
} from '../tokens';

export interface TokenCardProps {
  tokenNumber: number;
  patientName: string;
  status: string;
  chamberNumber?: string;
  doctorName?: string;
  isUrgent?: boolean;
  triageUrgency?: 'NORMAL' | 'URGENT' | 'EMERGENCY';
  estimatedTime?: string;
  source?: string;
  paymentStatus?: string;
  onAction?: (action: 'CALL' | 'START' | 'COMPLETE' | 'DELAY' | 'NO_SHOW') => void;
  className?: string;
}

export const TokenCard: React.FC<TokenCardProps> = ({
  tokenNumber,
  patientName,
  status,
  chamberNumber,
  doctorName,
  isUrgent = false,
  triageUrgency = 'NORMAL',
  estimatedTime,
  source = 'WALK_IN',
  paymentStatus = 'PAID_CASH',
  onAction,
  className = '',
}) => {
  const isEmergency = triageUrgency === 'EMERGENCY';
  const isUrgentItem = isUrgent || triageUrgency === 'URGENT';
  const triage = getTriageStyle(isUrgentItem, triageUrgency);
  const queueStatus = getQueueStatusBadgeStyle(status);
  const payment = getPaymentBadgeStyle(paymentStatus);
  const chamber = chamberNumber ? getChamberStyle(chamberNumber) : null;

  return (
    <div
      className={`relative bg-white border rounded-xl p-4 shadow-sm transition-all duration-150 hover:shadow-md ${
        isEmergency
          ? 'border-red-400 bg-red-50/10'
          : isUrgentItem
          ? 'border-amber-400 bg-amber-50/10'
          : 'border-slate-200'
      } ${className}`}
    >
      {/* Top Header: Token Number & Triage/Chamber Tags */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center min-w-14 h-12 px-3 rounded-lg font-mono tabular-nums font-black text-2xl tracking-tight shadow-inner ${
              isEmergency
                ? 'bg-red-600 text-white'
                : isUrgentItem
                ? 'bg-amber-500 text-white'
                : 'bg-blue-600 text-white'
            }`}
          >
            #{tokenNumber}
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-base leading-tight tracking-tight">
              {patientName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500 font-medium capitalize">
                {source.toLowerCase().replace(/_/g, ' ')}
              </span>
              {estimatedTime && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    Est. {estimatedTime}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {/* Triage Badge if Urgent or Emergency */}
          {(isEmergency || isUrgentItem) && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full ${
                isEmergency
                  ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isEmergency ? 'bg-red-600' : 'bg-amber-600'
                }`}
              />
              {triage.label}
            </span>
          )}

          {/* Chamber Tag */}
          {chamber && (
            <span
              className="px-2 py-0.5 text-xs font-bold rounded"
              style={{
                backgroundColor: chamber.bg,
                color: chamber.text,
                border: `1px solid ${chamber.border}`,
              }}
            >
              {chamberNumber?.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Middle Row: Status Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {/* Queue Status */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full"
            style={{
              backgroundColor: queueStatus.bg,
              color: queueStatus.text,
              border: `1px solid ${queueStatus.border}`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: queueStatus.dot }}
            />
            {queueStatus.label}
          </span>

          {/* Payment Status */}
          <span
            className="px-2 py-0.5 text-xs font-medium rounded-full"
            style={{
              backgroundColor: payment.bg,
              color: payment.text,
              border: `1px solid ${payment.border}`,
            }}
          >
            {payment.label}
          </span>
        </div>

        {doctorName && (
          <span className="text-xs text-slate-500 font-medium truncate max-w-44">
            Dr. {doctorName.replace(/^dr\.?\s*/i, '')}
          </span>
        )}
      </div>

      {/* Action Buttons (when onAction is provided) */}
      {onAction && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
          {status === 'WAITING' && (
            <button
              onClick={() => onAction('CALL')}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Call Token
            </button>
          )}
          {status === 'ARRIVED' && (
            <button
              onClick={() => onAction('START')}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              Send In
            </button>
          )}
          {status === 'IN_CONSULTATION' && (
            <button
              onClick={() => onAction('COMPLETE')}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-900 text-white transition-colors"
            >
              Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
};
