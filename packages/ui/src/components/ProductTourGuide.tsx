'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './Button';

export interface TourStep {
  title: string;
  description: string;
  targetId: string;
  icon: string;
  tip?: string;
}

export interface ProductTourGuideProps {
  isActive: boolean;
  onClose: () => void;
  steps?: TourStep[];
  storageKey?: string;
}

const DEFAULT_RECEPTION_STEPS: TourStep[] = [
  {
    targetId: 'tour-intake-step',
    title: '⚡ Rapid Walk-In Intake (< 15s)',
    description:
      'Press F2 hotkey anywhere on your keyboard or click "+ Walk-In Intake" to register patients in under 15 seconds without screen lag.',
    icon: '⚡',
    tip: 'Tip: Works seamlessly even when broadband is completely down.',
  },
  {
    targetId: 'tour-chambers-step',
    title: '🏢 Multi-Chamber Queue Tabs',
    description:
      'Click chamber tabs (CH-1 to CH-4) to inspect waiting queues, calling tokens, and current delay estimates for each consulting doctor.',
    icon: '🏢',
    tip: 'Tip: Color-coded badges indicate doctor delay status automatically.',
  },
  {
    targetId: 'tour-cashier-step',
    title: '💰 Cash Drawer & Dynamic BharatQR',
    description:
      'Track cash collections and UPI QR payments in real time. Launch dynamic BharatQR to accept instantaneous zero-MDR UPI payments.',
    icon: '💰',
    tip: 'Tip: Reconciled automatically with EOD NEFT doctor payouts.',
  },
  {
    targetId: 'tour-hardware-step',
    title: '🖨️ Hardware & Diagnostics Checklist',
    description:
      'Click "⚡ Hardware Diagnostics" to run self-tests on your 80mm ESC/POS thermal printer, waiting room TV chime, and SSE live streams.',
    icon: '🖨️',
    tip: 'Tip: Run every morning before your 9:00 AM OPD rush starts.',
  },
];

export const ProductTourGuide: React.FC<ProductTourGuideProps> = ({
  isActive,
  onClose,
  steps = DEFAULT_RECEPTION_STEPS,
  storageKey = 'medibooking_reception_tour_done',
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (isActive) {
      setCurrentStepIndex(0);
    }
  }, [isActive]);

  if (!isActive || steps.length === 0) return null;

  const currentStep = steps[currentStepIndex];
  if (!currentStep) return null;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    if (typeof window !== 'undefined' && storageKey) {
      localStorage.setItem(storageKey, 'true');
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label="Interactive Product Tour"
      className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-center p-4 sm:p-6"
    >
      {/* Light semi-transparent backdrop for focus */}
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] pointer-events-auto transition-opacity" />

      {/* Floating Tour Guide Card */}
      <div
        data-testid="product-tour-card"
        className="relative pointer-events-auto w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-blue-500 overflow-hidden transform transition-all animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        {/* Top Accent Ribbon */}
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500" />

        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-base font-bold shadow-xs">
                {currentStep.icon}
              </span>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 block">
                  Interactive Receptionist Guide
                </span>
                <span
                  data-testid="tour-step-counter"
                  className="text-xs font-semibold text-slate-500"
                >
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>
            </div>

            <button
              type="button"
              data-testid="tour-skip-btn"
              onClick={handleFinish}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 hover:underline px-2 py-1"
            >
              Skip Tour
            </button>
          </div>

          {/* Title & Description */}
          <h3
            data-testid="tour-step-title"
            className="text-base font-bold text-slate-900 mb-1.5"
          >
            {currentStep.title}
          </h3>
          <p
            data-testid="tour-step-description"
            className="text-xs text-slate-600 leading-relaxed mb-3"
          >
            {currentStep.description}
          </p>

          {/* Tip Box */}
          {currentStep.tip && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 font-medium flex items-center gap-2 mb-4">
              <span>💡</span>
              <span>{currentStep.tip}</span>
            </div>
          )}

          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5 mb-5">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? 'w-8 bg-blue-600'
                    : idx < currentStepIndex
                    ? 'w-2 bg-blue-300'
                    : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Action Navigation Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              data-testid="tour-prev-btn"
              onClick={handlePrev}
              disabled={isFirstStep}
              className="text-xs font-medium"
            >
              ← Previous
            </Button>

            <div className="flex items-center gap-2">
              {isLastStep ? (
                <Button
                  variant="primary"
                  size="sm"
                  data-testid="tour-finish-btn"
                  onClick={handleFinish}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                >
                  ✓ Finish Tour & Get Started
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  data-testid="tour-next-btn"
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
                >
                  Next Step →
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

