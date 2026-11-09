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
  patientAge?: number;
  patientGender?: 'MALE' | 'FEMALE' | 'OTHER';
  symptoms?: string;
  chamberNumber: string;
  doctorName: string;
  status: string;
  isUrgent?: boolean;
  paymentStatus: string;
  estimatedTime?: string;
  source: string;
  feePaidRupees: number;
  bookingFeeRupees?: number;
  consultationFeeDue?: number;
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
    patientName: 'Ramesh Kumar',
    patientMobile: '9826011111',
    patientAge: 48,
    patientGender: 'MALE',
    symptoms: 'Routine checkup & chest discomfort',
    chamberNumber: 'CH-1',
    doctorName: 'Rajesh Sharma',
    status: 'WAITING',
    paymentStatus: 'PAID_CASH',
    estimatedTime: '10 mins',
    source: 'WALK_IN',
    feePaidRupees: 600,
    bookingFeeRupees: 49,
    consultationFeeDue: 600,
  },
  {
    id: 't-2',
    tokenNumber: 16,
    patientName: 'Suresh Verma',
    patientMobile: '9826022222',
    patientAge: 35,
    patientGender: 'MALE',
    symptoms: 'High blood pressure monitoring',
    chamberNumber: 'CH-1',
    doctorName: 'Rajesh Sharma',
    status: 'WAITING',
    isUrgent: true,
    paymentStatus: 'PAID_UPI_QR',
    estimatedTime: '20 mins',
    source: 'ONLINE_PORTAL',
    feePaidRupees: 600,
    bookingFeeRupees: 49,
    consultationFeeDue: 600,
  },
  {
    id: 't-3',
    tokenNumber: 10,
    patientName: 'Anita Sen',
    patientMobile: '9826033333',
    patientAge: 29,
    patientGender: 'FEMALE',
    symptoms: 'Skin rash & allergy',
    chamberNumber: 'CH-2',
    doctorName: 'Priya Patel',
    status: 'WAITING',
    paymentStatus: 'PAID_CASH',
    estimatedTime: '15 mins',
    source: 'WALK_IN',
    feePaidRupees: 500,
    bookingFeeRupees: 49,
    consultationFeeDue: 500,
  },
  {
    id: 't-4',
    tokenNumber: 23,
    patientName: 'Baby Kavita',
    patientMobile: '9826044444',
    patientAge: 4,
    patientGender: 'FEMALE',
    symptoms: 'Fever & viral cough',
    chamberNumber: 'CH-3',
    doctorName: 'Amit Verma',
    status: 'WAITING',
    paymentStatus: 'PENDING',
    estimatedTime: '25 mins',
    source: 'WALK_IN',
    feePaidRupees: 0,
    bookingFeeRupees: 0,
    consultationFeeDue: 600,
  },
  {
    id: 't-wa-1',
    tokenNumber: 18,
    patientName: 'Sunita Mehra',
    patientMobile: '9826055555',
    patientAge: 52,
    patientGender: 'FEMALE',
    symptoms: 'Diabetes & hypertension review',
    chamberNumber: 'CH-1',
    doctorName: 'Rajesh Sharma',
    status: 'WAITING',
    paymentStatus: 'PAID_UPI_QR',
    estimatedTime: '18 mins',
    source: 'WHATSAPP_1TAP',
    feePaidRupees: 600,
    bookingFeeRupees: 49,
    consultationFeeDue: 600,
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

  // Phase 61: Prescription Sheet & Offline Settlement State
  const [selectedRxToken, setSelectedRxToken] = useState<ReceptionTokenItem | null>(null);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [rxPrintNotice, setRxPrintNotice] = useState<string | null>(null);
  const [rxSheetFormat, setRxSheetFormat] = useState<'A4' | 'THERMAL_80MM'>('A4');

  const [selectedSettleToken, setSelectedSettleToken] = useState<ReceptionTokenItem | null>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [consultationType, setConsultationType] = useState<'STANDARD' | 'FOLLOW_UP' | 'WAIVED'>('STANDARD');
  const [consultationFeeRupees, setConsultationFeeRupees] = useState<number>(600);
  const [waiverReason, setWaiverReason] = useState<string>('');
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [settlePaymentMode, setSettlePaymentMode] = useState<'PAID_CASH' | 'PAID_UPI_QR' | 'WAIVED_BY_DOCTOR'>('PAID_CASH');
  const [settledSlipPreview, setSettledSlipPreview] = useState<string | null>(null);
  const [isSettlementComplete, setIsSettlementComplete] = useState(false);

  // Business Fix: Ad-Hoc Custom Procedures & Online Booking Credit State
  const [customProcedures, setCustomProcedures] = useState<Array<{ id: string; name: string; amountRupees: number; doctorSplitPercent: number }>>([]);
  const [adhocProcName, setAdhocProcName] = useState('');
  const [adhocProcAmount, setAdhocProcAmount] = useState<number>(0);
  const [adhocProcSplit, setAdhocProcSplit] = useState<number>(80);
  const [showAdhocForm, setShowAdhocForm] = useState(false);
  const [creditOnlineBookingFee, setCreditOnlineBookingFee] = useState(false);

  // Business Fix: Fast Cash Drawer Denomination Tally Counter
  const [isDenominationOpen, setIsDenominationOpen] = useState(false);
  const [denominations, setDenominations] = useState<{ [denom: number]: number }>({
    500: 20, // 10000
    200: 10, // 2000
    100: 4,  // 400
    50: 0,
    20: 0,
    10: 0,
  });

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
    if (typeof window === 'undefined') return;

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

  const PROCEDURE_OPTIONS = [
    { id: 'proc-ecg', name: '12-Lead ECG with Rhythm Strip', amountRupees: 200, doctorSplit: 160, clinicSplit: 40 },
    { id: 'proc-dressing', name: 'Sterile Wound Dressing / Suture Care', amountRupees: 150, doctorSplit: 105, clinicSplit: 45 },
    { id: 'proc-neb', name: 'Duolin/Budecort Nebulization (1 Cycle)', amountRupees: 100, doctorSplit: 60, clinicSplit: 40 },
    { id: 'proc-rbs', name: 'Random Blood Sugar (Accu-Chek)', amountRupees: 50, doctorSplit: 25, clinicSplit: 25 },
    { id: 'proc-inj', name: 'IM / IV Antibiotic / Pain Injection', amountRupees: 40, doctorSplit: 20, clinicSplit: 20 },
  ];

  const calculateDenominationTotal = () => {
    return Object.entries(denominations).reduce(
      (sum, [denom, count]) => sum + Number(denom) * (count || 0),
      0
    );
  };

  const calculateGrossCharges = () => {
    const fee = consultationType === 'WAIVED' ? 0 : consultationFeeRupees;
    const catalogProcTotal = selectedProcedures.reduce((sum, id) => {
      const match = PROCEDURE_OPTIONS.find((p) => p.id === id);
      return sum + (match?.amountRupees || 0);
    }, 0);
    const customProcTotal = customProcedures.reduce((sum, p) => sum + p.amountRupees, 0);
    return fee + catalogProcTotal + customProcTotal;
  };

  const calculateNetPayable = () => {
    const gross = calculateGrossCharges();
    const onlineCredit =
      creditOnlineBookingFee && selectedSettleToken?.bookingFeeRupees
        ? selectedSettleToken.bookingFeeRupees
        : 0;
    return Math.max(0, gross - onlineCredit);
  };

  const calculateDoctorSplit = () => {
    const fee = consultationType === 'WAIVED' ? 0 : consultationFeeRupees;
    const docConsult = Math.round(fee * 0.8);
    const docCatalogProc = selectedProcedures.reduce((sum, id) => {
      const match = PROCEDURE_OPTIONS.find((p) => p.id === id);
      return sum + (match?.doctorSplit || 0);
    }, 0);
    const docCustomProc = customProcedures.reduce((sum, p) => {
      return sum + Math.round(p.amountRupees * (p.doctorSplitPercent / 100));
    }, 0);
    return docConsult + docCatalogProc + docCustomProc;
  };

  const calculateClinicSplit = () => {
    return calculateGrossCharges() - calculateDoctorSplit();
  };

  const handleOpenRxModal = (token: ReceptionTokenItem) => {
    setSelectedRxToken(token);
    setIsRxModalOpen(true);
    setRxPrintNotice(null);
  };

  const handleOpenSettleModal = (token: ReceptionTokenItem) => {
    setSelectedSettleToken(token);
    setConsultationType('STANDARD');
    setConsultationFeeRupees(token.consultationFeeDue || 600);
    setWaiverReason('');
    setSelectedProcedures([]);
    setCustomProcedures([]);
    setCreditOnlineBookingFee(false);
    setShowAdhocForm(false);
    setSettlePaymentMode(token.paymentStatus === 'PAID_UPI_QR' ? 'PAID_UPI_QR' : 'PAID_CASH');
    setSettledSlipPreview(null);
    setIsSettlementComplete(false);
    setIsSettleModalOpen(true);
  };

  const handleConfirmSettlement = () => {
    if (!selectedSettleToken) return;

    const gross = calculateGrossCharges();
    const net = calculateNetPayable();
    const docSplit = calculateDoctorSplit();
    const clinicSplit = calculateClinicSplit();
    const cleanDate = new Date().toISOString().split('T')[0]?.replace(/-/g, '') || '20261108';
    const receiptNo = `ESC-REC-${cleanDate}-${Math.floor(1000 + Math.random() * 9000)}`;

    const selectedProcDetails = selectedProcedures.map((id) =>
      PROCEDURE_OPTIONS.find((p) => p.id === id)!
    );

    const slipLines = [
      '========================================',
      '      BHOPAL CITYCARE POLYCLINIC',
      '    Plot 42, MP Nagar Zone-II, Bhopal',
      '        Phone: +91 755 492 8800',
      '========================================',
      `Receipt No : ${receiptNo}`,
      `Date & Time: ${new Date().toLocaleString('en-IN')}`,
      `Patient    : ${selectedSettleToken.patientName}`,
      `Token #    : ${selectedSettleToken.tokenNumber}  Chamber: ${selectedSettleToken.chamberNumber}`,
      `Doctor     : Dr. ${selectedSettleToken.doctorName}`,
      '----------------------------------------',
      'ITEM                       QTY    AMOUNT',
      '----------------------------------------',
      `Doctor Consultation (${consultationType}) 1  ₹${consultationType === 'WAIVED' ? 0 : consultationFeeRupees}`,
      ...selectedProcDetails.map((p) => `${p.name.slice(0, 24).padEnd(24)}  1   ₹${p.amountRupees}`),
      ...customProcedures.map((p) => `${p.name.slice(0, 24).padEnd(24)}  1   ₹${p.amountRupees}`),
      '----------------------------------------',
      `TOTAL CHARGES COLLECTED:          ₹${gross}`,
      ...(creditOnlineBookingFee && selectedSettleToken.bookingFeeRupees ? [
        `Less: Online Token Fee (UPI):    -₹${selectedSettleToken.bookingFeeRupees}`,
        `NET COUNTER AMOUNT COLLECTED:     ₹${net}`
      ] : []),
      `Payment Mode: ${settlePaymentMode}`,
      '----------------------------------------',
      `Doctor Share (80% / Proc):        ₹${docSplit}`,
      `Polyclinic Facility Share:        ₹${clinicSplit}`,
      '========================================',
      '  Thank You! Get Well Soon - MediBooking',
      '========================================',
    ];

    setSettledSlipPreview(slipLines.join('\n'));
    setIsSettlementComplete(true);

    // Update tokens list
    setTokens((prev) =>
      prev.map((t) =>
        t.id === selectedSettleToken.id
          ? {
              ...t,
              paymentStatus: settlePaymentMode,
              feePaidRupees: (t.bookingFeeRupees || 0) + gross,
            }
          : t
      )
    );
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

        {/* Fast Cash Drawer Denomination Tally (Anti-Pilferage) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🧮</span>
              <span className="text-xs font-bold text-slate-800">
                Front-Desk Physical Cash Denomination Tally
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                Anti-Pilferage Verified
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsDenominationOpen(!isDenominationOpen)}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              {isDenominationOpen ? '▲ Hide Denomination Keypad' : '▼ Quick Cash Counter (₹500 / ₹200 / ₹100)'}
            </button>
          </div>

          {isDenominationOpen && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                {[500, 200, 100, 50, 20, 10].map((denom) => (
                  <div key={denom} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <span className="font-mono font-bold text-slate-700 block text-xs">₹{denom} Notes</span>
                    <input
                      type="number"
                      min="0"
                      value={denominations[denom] || ''}
                      onChange={(e) =>
                        setDenominations({
                          ...denominations,
                          [denom]: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-full mt-1 px-1.5 py-1 text-center font-mono font-bold text-slate-900 border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-500 font-mono block mt-1">
                      = ₹{((denominations[denom] || 0) * denom).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs gap-2">
                <div className="flex flex-wrap items-center gap-4">
                  <span>Counted Cash: <span className="font-mono font-black text-slate-900 text-sm">₹{calculateDenominationTotal().toLocaleString('en-IN')}</span></span>
                  <span>System Expected: <span className="font-mono font-semibold text-slate-700">₹12,400</span></span>
                  <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                    calculateDenominationTotal() === 12400 ? 'bg-emerald-600 text-white' : 'bg-rose-100 text-rose-800'
                  }`}>
                    Variance: {calculateDenominationTotal() - 12400 >= 0 ? `+₹${calculateDenominationTotal() - 12400}` : `-₹${12400 - calculateDenominationTotal()}`} {calculateDenominationTotal() === 12400 ? '✓ (100% BALANCED)' : '⚠️ (DISCREPANCY)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDenominationOpen(false)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                >
                  Confirm Drawer Count
                </button>
              </div>
            </div>
          )}
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
              <div key={t.id} className="relative group">
                <TokenCard
                  tokenNumber={t.tokenNumber}
                  patientName={`${t.patientName}${t.patientAge ? ` (${t.patientAge}${t.patientGender === 'FEMALE' ? 'F' : 'M'})` : ''}`}
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

                {/* Phase 61: Pre-Consultation Sheet & Custom Counter Charges Bar */}
                <div className="mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    {t.bookingFeeRupees && t.bookingFeeRupees > 0 ? (
                      <span
                        data-testid="badge-booking-paid"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300"
                      >
                        ✓ ₹{t.bookingFeeRupees} Booking Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] bg-slate-100 text-slate-600">
                        Counter Token
                      </span>
                    )}

                    {t.symptoms && (
                      <span className="text-slate-600 truncate max-w-xs text-[11px]">
                        <span className="font-semibold text-slate-700">Symptoms:</span> {t.symptoms}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="btn-print-rx-sheet"
                      onClick={() => handleOpenRxModal(t)}
                      className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs shadow-2xs flex items-center gap-1 transition-colors"
                    >
                      🖨️ Prescription Sheet
                    </button>

                    <button
                      type="button"
                      data-testid="btn-settle-custom-charges"
                      onClick={() => handleOpenSettleModal(t)}
                      className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs shadow-2xs flex items-center gap-1 transition-colors"
                    >
                      ⚡ Settle Custom Charges
                    </button>
                  </div>
                </div>
              </div>
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

      {/* Phase 61: Pre-Consultation Prescription Sheet Modal */}
      {selectedRxToken && (
        <Modal
          isOpen={isRxModalOpen}
          onClose={() => setIsRxModalOpen(false)}
          maxWidth="lg"
          title="📋 Pre-Consultation Prescription Sheet"
          subtitle="Auto-formatted for A4 / 80mm Print • Generated prior to Chamber Entry"
        >
          <div data-testid="modal-prescription-sheet" className="space-y-4">
            {/* Format Switcher: A4 vs 80mm Thermal */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-600">Select Print Media:</span>
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setRxSheetFormat('A4')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    rxSheetFormat === 'A4'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📄 A4 Letterhead
                </button>
                <button
                  type="button"
                  onClick={() => setRxSheetFormat('THERMAL_80MM')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    rxSheetFormat === 'THERMAL_80MM'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🧾 80mm Thermal (Zero-Ink)
                </button>
              </div>
            </div>

            {/* Printable Prescription Body: A4 or 80mm */}
            {rxSheetFormat === 'A4' ? (
              <div className="p-6 bg-white border border-slate-300 rounded-xl shadow-inner text-slate-800 space-y-4 font-sans">
                {/* Polyclinic Header */}
                <div className="border-b-2 border-slate-800 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      BHOPAL CITYCARE POLYCLINIC
                    </h2>
                    <p className="text-xs text-blue-700 font-semibold">
                      Multi-Specialty Consultation & Diagnostic Centre
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Plot 42, MP Nagar Zone-II, Bhopal • Ph: +91 755 492 8800 • UPI: bhopalcare@icici
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-slate-900">Dr. {selectedRxToken.doctorName}</div>
                    <div className="text-[11px] text-slate-600 font-medium">MBBS, MD, DM (Cardiology)</div>
                    <div className="text-[10px] font-mono text-slate-500">Reg: MP-38492-NMC</div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs font-mono">
                      {selectedRxToken.chamberNumber}
                    </span>
                  </div>
                </div>

                {/* Patient Demographics & Booking Fee Strip */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Token Number</span>
                    <span className="font-mono font-black text-base text-slate-900">
                      #{selectedRxToken.tokenNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient Name</span>
                    <span className="font-bold text-slate-900">{selectedRxToken.patientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Age / Gender</span>
                    <span className="font-bold text-slate-900">
                      {selectedRxToken.patientAge || 48} Yrs / {selectedRxToken.patientGender || 'MALE'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Date</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {new Date().toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  <div className="sm:col-span-2 pt-1 border-t border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Chief Complaints</span>
                    <span className="text-slate-700 font-medium">
                      {selectedRxToken.symptoms || 'Routine Examination / General Consultation'}
                    </span>
                  </div>
                  <div className="sm:col-span-2 pt-1 border-t border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Fees Status</span>
                    <span className="text-emerald-700 font-bold">
                      ✓ ₹{selectedRxToken.bookingFeeRupees ?? 49} Booking Fee Paid Online (UPI)
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      Consultation Fee Due at Desk: ₹{selectedRxToken.consultationFeeDue ?? 600}
                    </span>
                  </div>
                </div>

                {/* Compounder Pre-Consultation Vitals Grid */}
                <div className="border border-slate-300 rounded-lg p-3 bg-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Compounder Pre-Consultation Vitals Recording
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                    <div className="p-2 border border-dashed border-slate-300 rounded bg-slate-50">
                      <span className="text-[10px] text-slate-400 block">BP (mmHg)</span>
                      <span className="font-mono font-bold text-slate-700">____ / ____</span>
                    </div>
                    <div className="p-2 border border-dashed border-slate-300 rounded bg-slate-50">
                      <span className="text-[10px] text-slate-400 block">Pulse (bpm)</span>
                      <span className="font-mono font-bold text-slate-700">____</span>
                    </div>
                    <div className="p-2 border border-dashed border-slate-300 rounded bg-slate-50">
                      <span className="text-[10px] text-slate-400 block">SpO2 (%)</span>
                      <span className="font-mono font-bold text-slate-700">____ %</span>
                    </div>
                    <div className="p-2 border border-dashed border-slate-300 rounded bg-slate-50">
                      <span className="text-[10px] text-slate-400 block">Temp (°F)</span>
                      <span className="font-mono font-bold text-slate-700">____ °F</span>
                    </div>
                    <div className="p-2 border border-dashed border-slate-300 rounded bg-slate-50">
                      <span className="text-[10px] text-slate-400 block">Weight (kg)</span>
                      <span className="font-mono font-bold text-slate-700">____ kg</span>
                    </div>
                    <div className="p-2 border border-dashed border-slate-300 rounded bg-slate-50">
                      <span className="text-[10px] text-slate-400 block">RBS (mg/dL)</span>
                      <span className="font-mono font-bold text-slate-700">____</span>
                    </div>
                  </div>
                </div>

                {/* Rx Blank Section for Doctor Handwriting */}
                <div className="border border-slate-200 rounded-lg p-4 min-h-[160px] bg-white relative">
                  <span className="text-3xl font-serif font-black text-blue-600/30 select-none">Rx</span>
                  <div className="mt-2 space-y-4">
                    <div className="border-b border-dashed border-slate-200 h-6" />
                    <div className="border-b border-dashed border-slate-200 h-6" />
                    <div className="border-b border-dashed border-slate-200 h-6" />
                    <div className="border-b border-dashed border-slate-200 h-6" />
                  </div>
                </div>

                {/* Footer Signature */}
                <div className="pt-4 flex justify-between items-end text-xs text-slate-500">
                  <span className="text-[10px]">MediBooking.in Pre-Consultation EHR Slip • Chamber {selectedRxToken.chamberNumber}</span>
                  <div className="text-center">
                    <div className="w-48 border-b border-slate-400 mb-1" />
                    <span className="font-semibold text-slate-700">Doctor Signature & Stamp</span>
                  </div>
                </div>
              </div>
            ) : (
              /* 80mm Monospace Thermal Prescription Slip */
              <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center text-xs leading-relaxed text-slate-800 shadow-inner">
                <p className="font-bold text-sm tracking-wider">BHOPAL CITYCARE POLYCLINIC</p>
                <p className="text-[10px] text-slate-500">MP Nagar Zone-II, Bhopal • +91 755 492 8800</p>
                <p className="border-b border-dashed border-slate-400 my-2" />
                <span className="text-[11px] font-bold text-slate-500 block uppercase">PRE-CONSULTATION RX SHEET</span>
                <span className="text-4xl font-black text-slate-900 block my-1">#{selectedRxToken.tokenNumber}</span>
                <span className="text-xs font-bold text-blue-700 block">
                  Dr. {selectedRxToken.doctorName} (NMC: MP-38492-NMC) • {selectedRxToken.chamberNumber}
                </span>
                <p className="border-b border-dashed border-slate-400 my-2" />
                <div className="text-left text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>Patient:</span>
                    <span className="font-bold">{selectedRxToken.patientName} ({selectedRxToken.patientAge || 48}M)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mobile:</span>
                    <span>+91 {selectedRxToken.patientMobile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Complaints:</span>
                    <span className="font-medium truncate max-w-44">{selectedRxToken.symptoms || 'Routine Examination'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Booking Fee:</span>
                    <span className="font-bold text-emerald-700">✓ ₹{selectedRxToken.bookingFeeRupees ?? 49} PAID (UPI)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Counter Due:</span>
                    <span className="font-bold">₹{selectedRxToken.consultationFeeDue ?? 600}</span>
                  </div>
                </div>
                <p className="border-b border-dashed border-slate-400 my-2" />
                <span className="text-[10px] font-bold uppercase text-slate-600 block text-left">
                  Compounder Pre-Consultation Vitals Recording:
                </span>
                <div className="text-left text-[11px] font-mono grid grid-cols-2 gap-1 my-1">
                  <div>BP (mmHg): ____/____</div>
                  <div>Pulse: ____ bpm</div>
                  <div>SpO2 (%): ____ %</div>
                  <div>Temp: ____ °F</div>
                  <div>Weight: ____ kg</div>
                  <div>RBS: ____ mg/dL</div>
                </div>
                <p className="border-b border-dashed border-slate-400 my-2" />
                <div className="text-left min-h-24 py-2 border-b border-dashed border-slate-400 text-slate-400">
                  [ Rx - Doctor Handwriting / Advice ]
                </div>
                <div className="pt-2 text-right text-[10px] text-slate-500">
                  Doctor Signature: ____________________
                </div>
              </div>
            )}

            {rxPrintNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold text-center animate-fadeIn">
                {rxPrintNotice}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                data-testid="btn-close-rx-modal"
                onClick={() => setIsRxModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                data-testid="btn-do-print-rx"
                onClick={() => {
                  setRxPrintNotice('✓ Prescription Sheet sent to Reception Printer (A4 / 80mm).');
                  if (typeof window !== 'undefined') window.print();
                }}
              >
                🖨️ Print Prescription Sheet (A4 / 80mm)
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Phase 61: Offline Consultation Settlement Modal */}
      {selectedSettleToken && (
        <Modal
          isOpen={isSettleModalOpen}
          onClose={() => setIsSettleModalOpen(false)}
          maxWidth="lg"
          title="⚡ Settle Consultation & Custom Charges"
          subtitle="Counter Cashiering • In-Chamber Procedures & Split Accounting"
        >
          <div data-testid="modal-settle-charges" className="space-y-4">
            {!isSettlementComplete ? (
              <div className="space-y-4">
                {/* Patient Summary Header */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-mono font-bold text-blue-700">
                      Token #{selectedSettleToken.tokenNumber}
                    </span>{' '}
                    • <span className="font-bold text-slate-900">{selectedSettleToken.patientName}</span>
                  </div>
                  <div className="text-slate-600">
                    Chamber: <span className="font-mono font-bold">{selectedSettleToken.chamberNumber}</span> • Dr. {selectedSettleToken.doctorName}
                  </div>
                </div>

                {/* Consultation Type Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Consultation Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConsultationType('STANDARD');
                        setConsultationFeeRupees(600);
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                        consultationType === 'STANDARD'
                          ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-600/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Standard (₹600)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConsultationType('FOLLOW_UP');
                        setConsultationFeeRupees(300);
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                        consultationType === 'FOLLOW_UP'
                          ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-600/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Follow-Up (₹300)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConsultationType('WAIVED');
                        setConsultationFeeRupees(0);
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                        consultationType === 'WAIVED'
                          ? 'border-amber-600 bg-amber-50 text-amber-800 ring-2 ring-amber-600/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Doctor Waiver (₹0)
                    </button>
                  </div>
                </div>

                {/* Consultation Fee Custom Editing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Consultation Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      data-testid="input-consultation-fee"
                      value={consultationFeeRupees}
                      disabled={consultationType === 'WAIVED'}
                      onChange={(e) => setConsultationFeeRupees(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  {consultationType === 'WAIVED' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                        Doctor Waiver Reason
                      </label>
                      <input
                        type="text"
                        data-testid="input-waiver-reason"
                        placeholder="e.g. Doctor courtesy, review report only"
                        value={waiverReason}
                        onChange={(e) => setWaiverReason(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* In-Chamber Procedures Checklist */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    In-Chamber Procedures & Diagnostics
                  </label>
                  <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                    {PROCEDURE_OPTIONS.map((proc) => {
                      const isChecked = selectedProcedures.includes(proc.id);
                      return (
                        <label
                          key={proc.id}
                          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                            isChecked
                              ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              data-testid={`chk-${proc.id}`}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProcedures([...selectedProcedures, proc.id]);
                                } else {
                                  setSelectedProcedures(selectedProcedures.filter((id) => id !== proc.id));
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>{proc.name}</span>
                          </div>
                          <span className="font-mono font-bold">+₹{proc.amountRupees}</span>
                        </label>
                      );
                    })}

                    {/* Dynamic Ad-Hoc Custom Procedures Added */}
                    {customProcedures.map((cp) => (
                      <div
                        key={cp.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-purple-200 bg-purple-50 text-xs text-purple-950 font-semibold"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-mono">
                            CUSTOM
                          </span>
                          <span>{cp.name}</span>
                          <span className="text-[10px] text-purple-700 font-normal">
                            ({cp.doctorSplitPercent}% Doc / {100 - cp.doctorSplitPercent}% Clinic)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-purple-900">+₹{cp.amountRupees}</span>
                          <button
                            type="button"
                            onClick={() => setCustomProcedures(customProcedures.filter((p) => p.id !== cp.id))}
                            className="text-rose-500 hover:text-rose-700 font-bold px-1"
                            title="Remove custom procedure"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Inline Form to Add Ad-Hoc Custom Procedure */}
                    {showAdhocForm ? (
                      <div className="p-2.5 rounded-lg border border-dashed border-purple-300 bg-purple-50/50 space-y-2 mt-2">
                        <div className="text-[11px] font-bold text-purple-900 flex justify-between items-center">
                          <span>+ Add Uncataloged / Ad-Hoc Procedure</span>
                          <button
                            type="button"
                            onClick={() => setShowAdhocForm(false)}
                            className="text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Procedure name (e.g. Suture Removal)"
                            value={adhocProcName}
                            onChange={(e) => setAdhocProcName(e.target.value)}
                            className="px-2 py-1 text-xs border border-purple-200 rounded bg-white focus:ring-1 focus:ring-purple-500 sm:col-span-1"
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="Amount (₹)"
                            value={adhocProcAmount || ''}
                            onChange={(e) => setAdhocProcAmount(Number(e.target.value) || 0)}
                            className="px-2 py-1 text-xs border border-purple-200 rounded bg-white font-mono focus:ring-1 focus:ring-purple-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (adhocProcName.trim() && adhocProcAmount > 0) {
                                setCustomProcedures([
                                  ...customProcedures,
                                  {
                                    id: `custom-${Date.now()}`,
                                    name: adhocProcName.trim(),
                                    amountRupees: adhocProcAmount,
                                    doctorSplitPercent: adhocProcSplit,
                                  },
                                ]);
                                setAdhocProcName('');
                                setAdhocProcAmount(0);
                                setShowAdhocForm(false);
                              }
                            }}
                            className="px-2 py-1 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded transition-colors"
                          >
                            + Add to Bill
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAdhocForm(true)}
                        className="w-full py-1.5 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50/60 hover:bg-purple-100/60 border border-dashed border-purple-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 mt-1"
                      >
                        <span>+</span> Add Custom Ad-Hoc Procedure (e.g. Suture Removal, Ear Syringing, Abscess)
                      </button>
                    )}
                  </div>
                </div>

                {/* Online ₹49 Booking Fee Deduction Checkbox */}
                {selectedSettleToken.bookingFeeRupees && selectedSettleToken.bookingFeeRupees > 0 && (
                  <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        data-testid="chk-credit-booking-fee"
                        checked={creditOnlineBookingFee}
                        onChange={(e) => setCreditOnlineBookingFee(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Deduct Online Booking Token Fee (-₹{selectedSettleToken.bookingFeeRupees})</span>
                    </label>
                    <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                      UPI Verified Paid
                    </span>
                  </div>
                )}

                {/* Settlement Calculation & Ledger Split Preview */}
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Gross Counter Charges:</span>
                    <span data-testid="settle-gross-total" className="text-emerald-400 font-mono text-base">
                      ₹{calculateGrossCharges()}
                    </span>
                  </div>
                  {creditOnlineBookingFee && selectedSettleToken.bookingFeeRupees ? (
                    <div className="flex justify-between items-center text-xs text-blue-300 font-mono pt-1 border-t border-slate-800">
                      <span>Less: Online Booking Fee Paid:</span>
                      <span className="text-blue-300">-₹{selectedSettleToken.bookingFeeRupees}</span>
                    </div>
                  ) : null}
                  {creditOnlineBookingFee && selectedSettleToken.bookingFeeRupees ? (
                    <div className="flex justify-between items-center text-sm font-black text-amber-300 font-mono pt-1 border-t border-slate-800">
                      <span>Net Collected at Desk:</span>
                      <span className="text-amber-300 text-base">₹{calculateNetPayable()}</span>
                    </div>
                  ) : null}
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div>
                      <span>Doctor Share: </span>
                      <span className="font-mono font-bold text-white">₹{calculateDoctorSplit()}</span>
                    </div>
                    <div className="text-right">
                      <span>Polyclinic Share: </span>
                      <span className="font-mono font-bold text-white">₹{calculateClinicSplit()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Mode Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Payment Collection Method
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSettlePaymentMode('PAID_CASH')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                        settlePaymentMode === 'PAID_CASH'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400/20'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      💵 Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettlePaymentMode('PAID_UPI_QR')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                        settlePaymentMode === 'PAID_UPI_QR'
                          ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-400/20'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      📱 BharatQR UPI
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsSettleModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    data-testid="btn-confirm-settlement"
                    onClick={handleConfirmSettlement}
                  >
                    Confirm Settlement & Print Itemized 80mm Slip
                  </Button>
                </div>
              </div>
            ) : (
              /* Settlement Confirmed & 80mm Slip Display */
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-bold text-center">
                  ✓ Consultation & Custom Charges Settled Successfully!
                </div>

                <pre
                  data-testid="settled-thermal-slip"
                  className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre leading-relaxed shadow-inner"
                >
                  {settledSlipPreview}
                </pre>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== 'undefined') window.print();
                    }}
                  >
                    🖨️ Print Slip
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsSettleModalOpen(false);
                      setIsSettlementComplete(false);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

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

