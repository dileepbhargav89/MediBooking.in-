'use client';

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { getChamberStyle } from '../tokens';

export interface AffiliatedClinicItem {
  clinicId: string;
  clinicName: string;
  branchName?: string;
  address?: string;
  chamberNumber: string;
  consultationFeeRupees: number;
  isPrimary?: boolean;
  isCurrentActive?: boolean;
  activeToday?: boolean;
}

export interface ClinicSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorName: string;
  currentClinicId: string;
  clinics: AffiliatedClinicItem[];
  onSelectClinic: (clinicId: string) => void | Promise<void>;
  isLoading?: boolean;
}

export const ClinicSwitcherModal: React.FC<ClinicSwitcherModalProps> = ({
  isOpen,
  onClose,
  doctorName,
  currentClinicId,
  clinics,
  onSelectClinic,
  isLoading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title="Switch Practice Location"
      subtitle={`Dr. ${doctorName.replace(/^dr\.?\s*/i, '')} • Multi-Clinic Tenant Selection`}
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-500 font-medium">
            {clinics.length} Affiliated Clinic{clinics.length === 1 ? '' : 's'}
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-600 mb-2">
          Select the active clinic location you are practicing at today. Your active patient queue,
          chamber display, and consultation cashiering will switch instantly.
        </p>

        {clinics.map((item) => {
          const isActive = item.clinicId === currentClinicId || item.isCurrentActive;
          const chamberStyle = getChamberStyle(item.chamberNumber);

          return (
            <div
              key={item.clinicId}
              onClick={() => {
                if (!isActive && !isLoading) {
                  onSelectClinic(item.clinicId);
                }
              }}
              className={`p-4 rounded-xl border transition-all duration-150 flex items-center justify-between gap-4 ${
                isActive
                  ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 cursor-default'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-slate-900 text-sm truncate">
                    {item.clinicName}
                  </h4>
                  {isActive && (
                    <Badge variant="blue" size="sm" dot>
                      Active Practice
                    </Badge>
                  )}
                  {item.isPrimary && !isActive && (
                    <Badge variant="gray" size="sm">
                      Primary
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {item.address && <span>{item.address}</span>}
                  {item.branchName && (
                    <>
                      <span>•</span>
                      <span>{item.branchName}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="font-semibold text-slate-700 font-mono tabular-nums">
                    ₹{item.consultationFeeRupees} Fee
                  </span>
                </div>
              </div>

              {/* Chamber Badge & Switch CTA */}
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border font-mono"
                  style={{
                    backgroundColor: chamberStyle.bg,
                    borderColor: chamberStyle.border,
                    color: chamberStyle.text,
                  }}
                >
                  {item.chamberNumber.toUpperCase()}
                </span>

                {isActive ? (
                  <span className="text-xs font-bold text-blue-700 px-3 py-1.5 rounded-lg bg-blue-100/70">
                    Selected
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClinic(item.clinicId);
                    }}
                  >
                    Switch Here
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

