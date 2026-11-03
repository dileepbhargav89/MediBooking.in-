'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Modal,
  StatCard,
  ChamberBadge,
  TokenCard,
  getChamberStyle,
} from '@medibooking/ui';

interface ChamberDeskInfo {
  chamberNumber: string;
  doctorName: string;
  specialty: string;
  consultationFee: number;
  status: 'ACTIVE' | 'BREAK' | 'DELAYED' | 'OFFLINE';
  delayMinutes?: number;
  callingToken?: number;
  waitingCount: number;
}

interface ReceptionTokenItem {
  id: string;
  tokenNumber: number;
  patientName: string;
  patientMobile: string;
  chamberNumber: string;
  doctorName: string;
  status: string;
  isUrgent?: boolean;
  paymentStatus: string;
  estimatedTime?: string;
  source: string;
  feePaidRupees: number;
}

const INITIAL_CHAMBERS: ChamberDeskInfo[] = [
  {
    chamberNumber: 'CH-1',
    doctorName: 'Dr. Rajesh Sharma',
    specialty: 'Cardiologist',
    consultationFee: 600,
    status: 'ACTIVE',
    callingToken: 14,
    waitingCount: 5,
  },
  {
    chamberNumber: 'CH-2',
    doctorName: 'Dr. Priya Patel',
    specialty: 'Dermatologist',
    consultationFee: 500,
    status: 'ACTIVE',
    callingToken: 9,
    waitingCount: 3,
  },
  {
    chamberNumber: 'CH-3',
    doctorName: 'Dr. Amit Verma',
    specialty: 'Pediatrician',
    consultationFee: 600,
    status: 'DELAYED',
    delayMinutes: 15,
    callingToken: 22,
    waitingCount: 7,
  },
  {
    chamberNumber: 'CH-4',
    doctorName: 'Dr. Sunita Rao',
    specialty: 'Orthopedic',
    consultationFee: 700,
    status: 'BREAK',
    delayMinutes: 10,
    callingToken: 7,
    waitingCount: 3,
  },
];

const INITIAL_TOKENS: ReceptionTokenItem[] = [
  {
    id: 't-1',
    tokenNumber: 15,
    patientName: 'P*** Patel',
    patientMobile: '9826011111',
    chamberNumber: 'CH-1',
    doctorName: 'Rajesh Sharma',
    status: 'WAITING',
    paymentStatus: 'PAID_CASH',
    estimatedTime: '10 mins',
    source: 'WALK_IN',
    feePaidRupees: 600,
  },
  {
    id: 't-2',
    tokenNumber: 16,
    patientName: 'S*** Verma',
    patientMobile: '9826022222',
    chamberNumber: 'CH-1',
    doctorName: 'Rajesh Sharma',
    status: 'WAITING',
    isUrgent: true,
    paymentStatus: 'PAID_UPI_QR',
    estimatedTime: '20 mins',
    source: 'ONLINE_PORTAL',
    feePaidRupees: 600,
  },
  {
    id: 't-3',
    tokenNumber: 10,
    patientName: 'A*** Sen',
    patientMobile: '9826033333',
    chamberNumber: 'CH-2',
    doctorName: 'Priya Patel',
    status: 'WAITING',
    paymentStatus: 'PAID_CASH',
    estimatedTime: '15 mins',
    source: 'WALK_IN',
    feePaidRupees: 500,
  },
  {
    id: 't-4',
    tokenNumber: 23,
    patientName: 'Baby K***',
    patientMobile: '9826044444',
    chamberNumber: 'CH-3',
    doctorName: 'Amit Verma',
    status: 'WAITING',
    paymentStatus: 'PENDING',
    estimatedTime: '25 mins',
    source: 'WALK_IN',
    feePaidRupees: 0,
  },
];

export default function ReceptionDeskDashboardPage() {
  const [selectedChamberTab, setSelectedChamberTab] = useState<string>('ALL');
  const [tokens, setTokens] = useState<ReceptionTokenItem[]>(INITIAL_TOKENS);
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [latestIssuedToken, setLatestIssuedToken] = useState<ReceptionTokenItem | null>(null);

  // Intake Form State
  const [mobile, setMobile] = useState('');
  const [patientName, setPatientName] = useState('');
  const [selectedChamber, setSelectedChamber] = useState('CH-1');
  const [isUrgent, setIsUrgent] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'PAID_CASH' | 'PAID_UPI_QR' | 'PENDING'>('PAID_CASH');
  const [formError, setFormError] = useState<string | null>(null);

  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Global F2 Hotkey Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsIntakeModalOpen(true);
        setTimeout(() => {
          mobileInputRef.current?.focus();
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter tokens based on chamber tab
  const filteredTokens =
    selectedChamberTab === 'ALL'
      ? tokens
      : tokens.filter((t) => t.chamberNumber === selectedChamberTab);

  // Handle Walk-In Intake Submission (< 15 seconds benchmark)
  const handleSubmitIntake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setFormError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    if (!patientName.trim()) {
      setFormError('Please enter patient full name');
      return;
    }

    const assignedDoctor =
      INITIAL_CHAMBERS.find((c) => c.chamberNumber === selectedChamber) || INITIAL_CHAMBERS[0]!;

    const nextTokenNum =
      Math.max(
        ...tokens
          .filter((t) => t.chamberNumber === selectedChamber)
          .map((t) => t.tokenNumber),
        assignedDoctor.callingToken || 10
      ) + 1;

    const maskedName =
      patientName.length > 2
        ? `${patientName[0]}*** ${patientName.split(' ')[1] || ''}`.trim()
        : `${patientName}***`;

    const newToken: ReceptionTokenItem = {
      id: `tok-${Date.now()}`,
      tokenNumber: nextTokenNum,
      patientName: maskedName,
      patientMobile: mobile,
      chamberNumber: selectedChamber,
      doctorName: assignedDoctor.doctorName.replace(/^Dr\.\s*/i, ''),
      status: 'WAITING',
      isUrgent,
      paymentStatus: paymentMode,
      estimatedTime: '25 mins',
      source: 'WALK_IN',
      feePaidRupees: paymentMode === 'PENDING' ? 0 : assignedDoctor.consultationFee,
    };

    // Insert token: if urgent, interleave ahead of regular waiting
    setTokens((prev) => (isUrgent ? [newToken, ...prev] : [...prev, newToken]));

    setLatestIssuedToken(newToken);
    setIsIntakeModalOpen(false);
    setIsReceiptModalOpen(true);

    // Reset Form
    setMobile('');
    setPatientName('');
    setIsUrgent(false);
    setPaymentMode('PAID_CASH');
    setFormError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Reception Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-sm">
                M
              </div>
              <span className="font-bold text-slate-900 text-sm hidden sm:inline">
                MediBooking<span className="text-blue-600">.in</span>
              </span>
            </Link>
            <span className="text-slate-300">/</span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block leading-tight">
                Central Reception Desk
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Bhopal City Care Polyclinic • 4 Chambers Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global F2 Trigger Button */}
            <Button
              variant="urgent"
              size="sm"
              hotkey="F2"
              onClick={() => setIsIntakeModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm"
            >
              + Walk-In Intake
            </Button>

            <Link href="/tv/bhopal-city-care">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                Open TV
              </Button>
            </Link>

            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign Out
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Reception Dashboard Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* Cash Drawer & Shift Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Cash In Drawer"
            value="₹12,400"
            subtitle="Counted physical cash"
            accentColor="#10B981"
            badge={{ label: 'BALANCED', variant: 'mint' }}
          />
          <StatCard
            title="UPI Collections"
            value="₹18,600"
            subtitle="QR settlements"
            accentColor="#1D4ED8"
            badge={{ label: 'VERIFIED', variant: 'blue' }}
          />
          <StatCard
            title="In Waiting Queue"
            value={tokens.filter((t) => t.status === 'WAITING').length}
            subtitle="Across all chambers"
            accentColor="#F59E0B"
            badge={{ label: 'ACTIVE', variant: 'amber' }}
          />
          <StatCard
            title="Completed Today"
            value="64"
            subtitle="Settled consultations"
            accentColor="#10B981"
            badge={{ label: 'ON TRACK', variant: 'mint' }}
          />
        </div>

        {/* 4 Chambers Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INITIAL_CHAMBERS.map((ch) => (
            <ChamberBadge
              key={ch.chamberNumber}
              chamberNumber={ch.chamberNumber}
              doctorName={ch.doctorName}
              specialty={ch.specialty}
              status={ch.status}
              delayMinutes={ch.delayMinutes}
              currentCallingToken={ch.callingToken}
            />
          ))}
        </div>

        {/* Chamber Tab Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedChamberTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedChamberTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Chambers ({tokens.length})
            </button>
            {INITIAL_CHAMBERS.map((ch) => (
              <button
                key={ch.chamberNumber}
                onClick={() => setSelectedChamberTab(ch.chamberNumber)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                  selectedChamberTab === ch.chamberNumber
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {ch.chamberNumber} ({tokens.filter((t) => t.chamberNumber === ch.chamberNumber).length})
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[10px]">F2</kbd> for rapid intake
          </span>
        </div>

        {/* Multi-Chamber Live Token Queue */}
        <div className="space-y-3">
          {filteredTokens.length > 0 ? (
            filteredTokens.map((t) => (
              <TokenCard
                key={t.id}
                tokenNumber={t.tokenNumber}
                patientName={t.patientName}
                status={t.status}
                chamberNumber={t.chamberNumber}
                doctorName={t.doctorName}
                isUrgent={t.isUrgent}
                triageUrgency={t.isUrgent ? 'URGENT' : 'NORMAL'}
                estimatedTime={t.estimatedTime}
                source={t.source}
                paymentStatus={t.paymentStatus}
                onAction={(action) => {
                  if (action === 'CALL') {
                    setTokens((prev) =>
                      prev.map((item) =>
                        item.id === t.id ? { ...item, status: 'IN_CONSULTATION' } : item
                      )
                    );
                  }
                }}
              />
            ))
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
              No patients currently waiting in this chamber.
            </div>
          )}
        </div>
      </main>

      {/* Rapid 15-Second Walk-In Intake Modal (Triggered by F2) */}
      <Modal
        isOpen={isIntakeModalOpen}
        onClose={() => setIsIntakeModalOpen(false)}
        maxWidth="lg"
        title="⚡ Rapid Walk-In Patient Intake"
        subtitle="15-Second Direct Reception Registration • Press F2 anytime"
      >
        <form onSubmit={handleSubmitIntake} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              ref={mobileInputRef}
              label="Patient Mobile Number"
              prefixText="+91"
              placeholder="98260 12345"
              value={mobile}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setMobile(val);
                // Auto-fill mock returning patient name for testing
                if (val === '9826011111') setPatientName('Ramesh Kumar');
              }}
              required
              autoFocus
            />

            <Input
              label="Patient Full Name"
              placeholder="e.g. Ramesh Kumar"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              required
            />
          </div>

          {/* Chamber & Doctor Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Select Doctor Chamber
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INITIAL_CHAMBERS.map((ch) => (
                <button
                  key={ch.chamberNumber}
                  type="button"
                  onClick={() => setSelectedChamber(ch.chamberNumber)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedChamber === ch.chamberNumber
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs font-mono text-blue-700">
                      {ch.chamberNumber}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 font-mono">
                      ₹{ch.consultationFee}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate">{ch.doctorName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{ch.specialty}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Urgency & Cashiering Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Triage Priority */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Triage Priority
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsUrgent(false)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                    !isUrgent
                      ? 'border-slate-400 bg-slate-100 text-slate-800'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setIsUrgent(true)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                    isUrgent
                      ? 'border-amber-400 bg-amber-50 text-amber-700 ring-2 ring-amber-400/20'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  🚨 Urgent Priority
                </button>
              </div>
            </div>

            {/* Direct Counter Payment */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Payment Collection
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMode('PAID_CASH')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                    paymentMode === 'PAID_CASH'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('PAID_UPI_QR')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                    paymentMode === 'PAID_UPI_QR'
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  📱 UPI QR
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('PENDING')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                    paymentMode === 'PENDING'
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  ⏳ Pay Later
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" variant="primary" fullWidth size="lg">
            Allocate Token & Generate Receipt [Enter]
          </Button>
        </form>
      </Modal>

      {/* 80mm ESC/POS Thermal Receipt Slip Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        maxWidth="sm"
        title="Thermal Slip Generated"
        subtitle="80mm ESC/POS Print Slip Preview"
      >
        {latestIssuedToken && (
          <div className="space-y-4">
            {/* Monospace Thermal Slip Body */}
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center text-xs leading-relaxed text-slate-800 shadow-inner">
              <p className="font-bold text-sm tracking-wider">BHOPAL CITY CARE POLYCLINIC</p>
              <p className="text-[10px] text-slate-500">MP Nagar Zone II, Bhopal • 0755-4019283</p>
              <p className="border-b border-dashed border-slate-400 my-2" />

              <span className="text-[11px] font-bold text-slate-500 block uppercase">TOKEN NUMBER</span>
              <span className="text-4xl font-black text-slate-900 block my-1">
                #{latestIssuedToken.tokenNumber}
              </span>
              <span className="text-sm font-bold text-blue-700 block">
                {latestIssuedToken.chamberNumber}
              </span>
              <p className="border-b border-dashed border-slate-400 my-2" />

              <div className="text-left text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Patient:</span>
                  <span className="font-bold">{latestIssuedToken.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Doctor:</span>
                  <span className="font-bold">Dr. {latestIssuedToken.doctorName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span className="font-bold">{latestIssuedToken.paymentStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-bold">₹{latestIssuedToken.feePaidRupees}</span>
                </div>
              </div>

              <p className="border-b border-dashed border-slate-400 my-2" />
              <p className="text-[9px] text-slate-500">
                Please watch TV screen in waiting room.
                <br />
                Track live on WhatsApp: +91 {latestIssuedToken.patientMobile}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="primary"
                fullWidth
                size="md"
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
              >
                🖨️ Print Slip (80mm)
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsReceiptModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MediBooking.in • Receptionist Desk Operations Engine</span>
          <span>Bhopal, MP, India • Sub-15s Walk-In Intake Guaranteed</span>
        </div>
      </footer>
    </div>
  );
}
