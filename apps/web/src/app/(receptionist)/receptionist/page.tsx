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
  BharatQrModal,
  EscposPrinterDriver,
  OfflineSyncQueueManager,
  type OfflineIntakeRecord,
  getChamberStyle,
  HardwareDiagnosticModal,
  ProductTourGuide,
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
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [selectedUpiToken, setSelectedUpiToken] = useState<ReceptionTokenItem | null>(null);
  const [upiCollectionsRupees, setUpiCollectionsRupees] = useState(18600);
  const [directPrintNotice, setDirectPrintNotice] = useState<string | null>(null);
  const [isPrintingDirect, setIsPrintingDirect] = useState(false);

  // Phase 53: Front-Desk PWA Offline Sync State
  const [isOnline, setIsOnline] = useState(true);
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedbackNotice, setSyncFeedbackNotice] = useState<string | null>(null);

  // Phase 59: Guided Tour & Hardware Diagnostics
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);

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

  // Phase 53: Network Connectivity & IndexedDB Offline Queue Listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      OfflineSyncQueueManager.getPendingCount().then(setPendingOfflineCount);

      const handleOnline = () => {
        setIsOnline(true);
        triggerAutoSync();
      };
      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Register PWA Service Worker in production/supporting environments
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => { });
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const triggerAutoSync = async () => {
    setIsSyncing(true);
    setSyncFeedbackNotice(null);
    try {
      const result = await OfflineSyncQueueManager.syncPendingRecords(
        process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000'
      );
      setPendingOfflineCount(0);
      setSyncFeedbackNotice(
        `✓ Cloud Sync Reconciled: ${result.syncedCount} offline walk-in tokens synchronized with central server.`
      );
      setTimeout(() => setSyncFeedbackNotice(null), 6000);
    } catch {
      setSyncFeedbackNotice('Sync deferred: Waiting for server connectivity.');
    } finally {
      setIsSyncing(false);
    }
  };


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

    const isEffectivelyOffline = !isOnline || simulatedOffline;

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
      source: isEffectivelyOffline ? 'OFFLINE_WALK_IN' : 'WALK_IN',
      feePaidRupees: paymentMode === 'PENDING' ? 0 : assignedDoctor.consultationFee,
    };

    // If offline, buffer into IndexedDB sync queue
    if (isEffectivelyOffline) {
      OfflineSyncQueueManager.enqueueIntake({
        tokenNumber: nextTokenNum,
        patientName,
        patientMobile: mobile,
        chamberNumber: selectedChamber,
        doctorName: assignedDoctor.doctorName.replace(/^Dr\.\s*/i, ''),
        paymentMode,
        feePaidRupees: paymentMode === 'PENDING' ? 0 : assignedDoctor.consultationFee,
        isUrgent,
      }).then(() => {
        OfflineSyncQueueManager.getPendingCount().then(setPendingOfflineCount);
      });
      setSyncFeedbackNotice(
        `⚡ Token #${nextTokenNum} saved to local offline storage (${selectedChamber}). Will sync to cloud automatically.`
      );
      setTimeout(() => setSyncFeedbackNotice(null), 6000);
    }

    // Insert token: if urgent, interleave ahead of regular waiting
    setTokens((prev) => (isUrgent ? [newToken, ...prev] : [...prev, newToken]));

    setLatestIssuedToken(newToken);
    setIsIntakeModalOpen(false);

    // If UPI QR selected, open dynamic BharatQR modal; otherwise open thermal receipt
    if (paymentMode === 'PAID_UPI_QR') {
      setSelectedUpiToken(newToken);
      setIsUpiModalOpen(true);
    } else {
      setIsReceiptModalOpen(true);
    }

    // Reset Form
    setMobile('');
    setPatientName('');
    setIsUrgent(false);
    setPaymentMode('PAID_CASH');
    setFormError(null);
  };

  const handleUpiSuccess = (txnId: string, amount: number) => {
    if (selectedUpiToken) {
      const updated: ReceptionTokenItem = {
        ...selectedUpiToken,
        paymentStatus: 'PAID_UPI_QR',
        feePaidRupees: amount,
      };
      setTokens((prev) =>
        prev.map((t) => (t.id === selectedUpiToken.id ? updated : t))
      );
      setLatestIssuedToken(updated);
    }
    setUpiCollectionsRupees((prev) => prev + amount);
    setIsUpiModalOpen(false);
    setIsReceiptModalOpen(true);
  };

  const handleDirectHardwarePrint = async () => {
    if (!latestIssuedToken) return;
    setIsPrintingDirect(true);
    setDirectPrintNotice(null);

    const assignedDoctor = INITIAL_CHAMBERS.find(
      (c) => c.chamberNumber === latestIssuedToken.chamberNumber
    );

    const result = await EscposPrinterDriver.printDirect({
      clinicName: 'Bhopal City Care Polyclinic',
      clinicAddress: 'MP Nagar Zone II, Bhopal',
      clinicPhone: '0755-4019283',
      tokenNumber: latestIssuedToken.tokenNumber,
      chamberNumber: latestIssuedToken.chamberNumber,
      patientName: latestIssuedToken.patientName,
      patientMobile: latestIssuedToken.patientMobile,
      doctorName: latestIssuedToken.doctorName,
      specialty: assignedDoctor?.specialty || 'General Practice',
      paymentStatus: latestIssuedToken.paymentStatus,
      feePaidRupees: latestIssuedToken.feePaidRupees,
    });

    setIsPrintingDirect(false);
    setDirectPrintNotice(`✓ ${result.message}`);
    setTimeout(() => setDirectPrintNotice(null), 5000);
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
            {/* Phase 53: PWA Network & Offline Queue Status */}
            <div className="flex items-center gap-2">
              {!isOnline || simulatedOffline || pendingOfflineCount > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Offline Mode ({pendingOfflineCount} queued)
                  </span>
                  <button
                    type="button"
                    onClick={triggerAutoSync}
                    disabled={isSyncing}
                    className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              ) : (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Online (Synced)
                </span>
              )}

              <button
                type="button"
                onClick={() => setSimulatedOffline(!simulatedOffline)}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline ml-1"
                title="Toggle offline intake simulation"
              >
                {simulatedOffline ? '📶 Reconnect' : '📡 Simulate Offline'}
              </button>
            </div>

            {/* Phase 59: Help Tour Trigger */}
            <button
              type="button"
              data-testid="btn-start-tour"
              onClick={() => setIsTourActive(true)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-xs"
              title="Interactive reception tour"
            >
              <span>🎓</span>
              <span className="hidden md:inline">Tour Guide</span>
            </button>

            {/* Phase 59: Hardware Diagnostics Modal Trigger */}
            <div data-testid="tour-hardware-step">
              <button
                type="button"
                data-testid="btn-hardware-diagnostics"
                onClick={() => setIsDiagnosticModalOpen(true)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1.5 transition-colors shadow-xs"
                title="Run hardware self-tests for printer, TV, and SSE"
              >
                <span>⚡</span>
                <span className="hidden md:inline">Hardware Diagnostics</span>
              </button>
            </div>

            {/* Global F2 Trigger Button */}
            <div data-testid="tour-intake-step">
              <Button
                variant="urgent"
                size="sm"
                hotkey="F2"
                data-testid="btn-walkin-intake"
                onClick={() => setIsIntakeModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm"
              >
                + Walk-In Intake
              </Button>
            </div>

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
        {/* Phase 53: Offline Sync Feedback Alert Banner */}
        {syncFeedbackNotice && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-lg flex items-center justify-between text-xs font-medium shadow-sm transition-all animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-base">🔄</span>
              <span>{syncFeedbackNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncFeedbackNotice(null)}
              className="text-blue-500 hover:text-blue-800 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Cash Drawer & Shift Summary Stats */}
        <div data-testid="tour-cashier-step" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Cash In Drawer"
            value="₹12,400"
            subtitle="Counted physical cash"
            accentColor="#10B981"
            badge={{ label: 'BALANCED', variant: 'mint' }}
          />
          <StatCard
            title="UPI Collections"
            value={`₹${upiCollectionsRupees.toLocaleString('en-IN')}`}
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
        <div data-testid="tour-chambers-step" className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedChamberTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedChamberTab === 'ALL'
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${selectedChamberTab === ch.chamberNumber
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
                  className={`p-3 rounded-xl border text-left transition-all ${selectedChamber === ch.chamberNumber
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
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${!isUrgent
                    ? 'border-slate-400 bg-slate-100 text-slate-800'
                    : 'border-slate-200 bg-white text-slate-500'
                    }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setIsUrgent(true)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${isUrgent
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
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${paymentMode === 'PAID_CASH'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600'
                    }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('PAID_UPI_QR')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${paymentMode === 'PAID_UPI_QR'
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-600'
                    }`}
                >
                  📱 UPI QR
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('PENDING')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${paymentMode === 'PENDING'
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

              {/* Direct ESC/POS Hardware Print Banner / Feedback */}
              {directPrintNotice && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold text-center animate-fadeIn">
                  {directPrintNotice}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  variant="urgent"
                  fullWidth
                  size="md"
                  isLoading={isPrintingDirect}
                  onClick={handleDirectHardwarePrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
                >
                  ⚡ Direct Hardware Print (ESC/POS)
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    fullWidth
                    size="sm"
                    onClick={() => {
                      if (typeof window !== 'undefined') window.print();
                    }}
                  >
                    🖨️ Browser Print (Dialog)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReceiptModalOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
          </div>
        )}
      </Modal>

      {/* Dynamic BharatQR UPI Collection Modal */}
      {selectedUpiToken && (
        <BharatQrModal
          isOpen={isUpiModalOpen}
          onClose={() => {
            setIsUpiModalOpen(false);
            setIsReceiptModalOpen(true);
          }}
          tokenNumber={selectedUpiToken.tokenNumber}
          doctorName={`Dr. ${selectedUpiToken.doctorName}`}
          chamberNumber={selectedUpiToken.chamberNumber}
          amountRupees={
            INITIAL_CHAMBERS.find((c) => c.chamberNumber === selectedUpiToken.chamberNumber)?.consultationFee || 600
          }
          patientName={selectedUpiToken.patientName}
          onPaymentSuccess={handleUpiSuccess}
        />
      )}

      {/* Phase 59: Interactive Product Tour Guide */}
      <ProductTourGuide
        isActive={isTourActive}
        onClose={() => setIsTourActive(false)}
      />

      {/* Phase 59: Polyclinic Hardware Diagnostics Modal */}
      <HardwareDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        clinicName="Bhopal City Care Polyclinic"
      />

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

