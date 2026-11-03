'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';

export interface BharatQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenNumber: number;
  doctorName: string;
  chamberNumber: string;
  amountRupees: number;
  patientName: string;
  onPaymentSuccess: (txnId: string, amount: number) => void;
}

/**
 * Pure SVG QR code generator with deterministic patterns based on input text
 */
function generateQrMatrix(content: string, size = 21): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // 1. Finder patterns (top-left, top-right, bottom-left 7x7 boxes)
  const drawFinder = (startX: number, startY: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        if (
          x === 0 ||
          x === 6 ||
          y === 0 ||
          y === 6 ||
          (x >= 2 && x <= 4 && y >= 2 && y <= 4)
        ) {
          matrix[startY + y]![startX + x] = true;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6]![i] = i % 2 === 0;
    matrix[i]![6] = i % 2 === 0;
  }

  // 3. Simple deterministic hash of content for data modules
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Skip finder zones
      const inTopLeft = x < 8 && y < 8;
      const inTopRight = x >= size - 8 && y < 8;
      const inBottomLeft = x < 8 && y >= size - 8;
      const onTiming = x === 6 || y === 6;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !onTiming) {
        // Pseudo-random deterministic fill based on coordinate and content hash
        const val = ((x * 31 + y * 17) ^ (hash >> ((x + y) % 16))) & 1;
        matrix[y]![x] = val === 1;
      }
    }
  }

  return matrix;
}

export function BharatQrModal({
  isOpen,
  onClose,
  tokenNumber,
  doctorName,
  chamberNumber,
  amountRupees,
  patientName,
  onPaymentSuccess,
}: BharatQrModalProps) {
  const [txnId, setTxnId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(180); // 3 minutes QR validity

  useEffect(() => {
    if (isOpen) {
      const generatedTxn = `TXN-UPI-${Date.now().toString().slice(-6)}`;
      setTxnId(generatedTxn);
      setIsSuccess(false);
      setIsProcessing(false);
      setSecondsRemaining(180);
    }
  }, [isOpen]);

  // Countdown timer for QR validity
  useEffect(() => {
    if (!isOpen || isSuccess || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isSuccess, secondsRemaining]);

  const upiPayload = `upi://pay?pa=bhopalcare@icici&pn=Bhopal+CityCare+Polyclinic&am=${amountRupees}.00&tr=${txnId}&cu=INR&tn=Token+${tokenNumber}+${encodeURIComponent(doctorName)}`;
  const qrMatrix = generateQrMatrix(upiPayload, 25);

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        onPaymentSuccess(txnId, amountRupees);
      }, 900);
    }, 500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dynamic BharatQR UPI Collection"
      subtitle={`Instant Counter Settlement • ${chamberNumber} • ${doctorName}`}
      maxWidth="md"
    >
      {!isSuccess ? (
        <div className="space-y-4 text-center">
          {/* Header Amount Banner */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                Token #{tokenNumber} • {patientName}
              </span>
              <span className="text-xs text-slate-600 font-semibold">{doctorName}</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono tabular-nums text-blue-900 block leading-tight">
                ₹{amountRupees}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold">Zero MDR Charge</span>
            </div>
          </div>

          {/* High-Contrast SVG QR Code Frame */}
          <div className="relative inline-block p-4 bg-white border-2 border-slate-900 rounded-2xl shadow-md mx-auto">
            <svg
              width="210"
              height="210"
              viewBox="0 0 25 25"
              className="shape-rendering-crispEdges mx-auto"
            >
              <rect width="25" height="25" fill="#FFFFFF" />
              {qrMatrix.map((row, y) =>
                row.map((isDark, x) =>
                  isDark ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0F172A" /> : null
                )
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-8 w-8 rounded-lg bg-white border border-slate-300 shadow flex items-center justify-center font-black text-blue-600 text-[10px]">
                UPI
              </div>
            </div>
          </div>

          {/* VPA and NPCI Support Strip */}
          <div className="space-y-1">
            <p className="text-xs font-mono font-bold text-slate-800">
              VPA: <span className="text-blue-700">bhopalcare@icici</span>
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Txn ID: <strong>{txnId}</strong> • Expires in{' '}
              <span className="font-bold tabular-nums text-slate-700">
                {Math.floor(secondsRemaining / 60)}:
                {secondsRemaining % 60 < 10 ? '0' : ''}
                {secondsRemaining % 60}
              </span>
            </p>
          </div>

          {/* Supported Apps Badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <Badge variant="blue" size="sm">PhonePe</Badge>
            <Badge variant="blue" size="sm">Google Pay</Badge>
            <Badge variant="mint" size="sm">Paytm</Badge>
            <Badge variant="amber" size="sm">BHIM UPI</Badge>
            <Badge variant="purple" size="sm">Cred</Badge>
          </div>

          {/* Live Polling Status Indicator */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-medium">Waiting for patient to enter UPI PIN on mobile...</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <Button
              variant="urgent"
              fullWidth
              size="md"
              isLoading={isProcessing}
              onClick={handleSimulatePayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              ⚡ Simulate Scan & Pay (Dev / Testing)
            </Button>
            <Button variant="outline" size="md" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* Payment Verified State */
        <div className="text-center py-6 space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-black shadow-sm animate-bounce">
            ✓
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">UPI Payment Verified!</h3>
            <p className="text-xs text-emerald-700 font-bold mt-0.5">
              ₹{amountRupees} successfully credited to Clinic Account
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">Ref ID: {txnId}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            Generating 80mm ESC/POS thermal receipt slip...
          </div>
        </div>
      )}
    </Modal>
  );
}

