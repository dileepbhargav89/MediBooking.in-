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
  patientAge?: number;
  patientGender?: 'MALE' | 'FEMALE' | 'OTHER' | string;
  bloodGroup?: string;
  village?: string;
  symptoms?: string;
  status: string;
  chamberNumber?: string;
  doctorName?: string;
  isUrgent?: boolean;
  triageUrgency?: 'NORMAL' | 'URGENT' | 'EMERGENCY';
  estimatedTime?: string;
  source?: string;
  paymentStatus?: string;
  onAction?: (action: 'CALL' | 'START' | 'COMPLETE' | 'DELAY' | 'NO_SHOW') => void;
  onEdit?: () => void;
  onRevert?: () => void;
  onTransfer?: () => void;
  className?: string;
}

export const TokenCard: React.FC<TokenCardProps> = ({
  tokenNumber,
  patientName,
  patientAge,
  patientGender,
  bloodGroup,
  village,
  symptoms,
  status,
  chamberNumber,
  doctorName,
  isUrgent = false,
  triageUrgency = 'NORMAL',
  estimatedTime,
  source = 'WALK_IN',
  paymentStatus = 'PAID_CASH',
  onAction,
  onEdit,
  onRevert,
  onTransfer,
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
      className={`relative bg-white/95 backdrop-blur-sm border rounded-2xl p-4 sm:p-5 shadow-xs transition-all duration-150 hover:shadow-md ${
        isEmergency
          ? 'border-red-400 bg-red-50/10'
          : isUrgentItem
          ? 'border-amber-400 bg-amber-50/10'
          : 'border-slate-200/80 hover:border-slate-300'
      } ${className}`}
    >
      {/* Top Header: Token Number & Triage/Chamber Tags */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex items-center justify-center min-w-14 h-12 px-3 rounded-xl font-mono tabular-nums font-black text-2xl tracking-tight shadow-inner ${
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
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base leading-tight tracking-tight">
                {patientName}
              </h3>
              {patientAge !== undefined && (
                <span className="font-semibold text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                  {patientAge} Yrs {patientGender ? `(${patientGender === 'FEMALE' ? 'F' : patientGender === 'MALE' ? 'M' : 'O'})` : ''}
                </span>
              )}
              {bloodGroup && (
                <span className="font-mono font-bold text-xs text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                  {bloodGroup}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-500">
              <span className="font-medium capitalize">
                {source.toLowerCase().replace(/_/g, ' ')}
              </span>
              {village && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-medium text-slate-600 flex items-center gap-1">
                    <span>📍</span> {village}
                  </span>
                </>
              )}
              {estimatedTime && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono tabular-nums">
                    Est. {estimatedTime}
                  </span>
                </>
              )}
            </div>

            {symptoms && (
              <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">
                <span className="font-semibold text-slate-700">Chief Complaint:</span> {symptoms}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {/* Triage Badge if Urgent or Emergency */}
          {(isEmergency || isUrgentItem) && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
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
              className="px-2.5 py-0.5 text-xs font-bold rounded-lg font-mono shadow-2xs"
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

      {/* Middle Row: Status Badges & Quick Receptionist Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {/* Queue Status */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold rounded-full shadow-2xs"
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
            className="px-2.5 py-0.5 text-[11px] font-bold rounded-full shadow-2xs"
            style={{
              backgroundColor: payment.bg,
              color: payment.text,
              border: `1px solid ${payment.border}`,
            }}
          >
            {payment.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {doctorName && (
            <span className="text-xs text-slate-500 font-semibold truncate max-w-44 mr-1">
              Dr. {doctorName.replace(/^dr\.?\s*/i, '')}
            </span>
          )}

          {/* Reception Operational Controls: Edit, Revert, Transfer */}
          {onEdit && (
            <button
              type="button"
              data-testid="btn-edit-patient"
              onClick={onEdit}
              className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors cursor-pointer"
              title="Update patient demographics (Name, Age, Blood Group, Village, Symptoms)"
            >
              ✏️ Edit
            </button>
          )}

          {onRevert && (
            <button
              type="button"
              data-testid="btn-revert-token"
              onClick={onRevert}
              className="px-2 py-1 text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
              title="Revert token status back to Waiting Queue"
            >
              ↩️ Revert
            </button>
          )}

          {onTransfer && (
            <button
              type="button"
              data-testid="btn-transfer-token"
              onClick={onTransfer}
              className="px-2 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
              title="Transfer patient to another Doctor Chamber"
            >
              🔀 Transfer
            </button>
          )}

          {onAction && (
            <>
              {status === 'WAITING' && (
                <button
                  type="button"
                  data-testid="btn-call-token"
                  onClick={() => onAction('CALL')}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                >
                  Call Token
                </button>
              )}
              {status === 'ARRIVED' && (
                <button
                  type="button"
                  data-testid="btn-start-token"
                  onClick={() => onAction('START')}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                >
                  Send In
                </button>
              )}
              {status === 'IN_CONSULTATION' && (
                <button
                  type="button"
                  data-testid="btn-complete-token"
                  onClick={() => onAction('COMPLETE')}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-900 text-white transition-colors cursor-pointer"
                >
                  Complete
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

