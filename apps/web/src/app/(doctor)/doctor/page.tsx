'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '../../../lib/auth';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  TokenCard,
  Modal,
  ClinicSwitcherModal,
  type AffiliatedClinicItem,
} from '@medibooking/ui';

const DEMO_CLINICS: AffiliatedClinicItem[] = [
  {
    clinicId: 'c1010000-0000-4000-8000-000000000001',
    clinicName: 'Bhopal City Care Polyclinic',
    branchName: 'MP Nagar Zone II',
    address: 'Plot 42, Near DB Mall, Bhopal',
    chamberNumber: 'CH-1',
    consultationFeeRupees: 600,
    isPrimary: true,
    isCurrentActive: true,
    activeToday: true,
  },
  {
    clinicId: 'c1020000-0000-4000-8000-000000000002',
    clinicName: 'Arera Super Specialty Polyclinic',
    branchName: 'Arera Colony E-3',
    address: 'Shop 14-16, Commercial Complex, Bhopal',
    chamberNumber: 'CH-3',
    consultationFeeRupees: 800,
    isPrimary: false,
    isCurrentActive: false,
    activeToday: true,
  },
];

interface ActivePatientData {
  tokenNumber: number;
  name: string;
  ageGender: string;
  mobile: string;
  vitals: {
    bloodPressure: string;
    pulse: string;
    spo2: string;
    weight: string;
  };
  symptoms: string;
  isFollowUp: boolean;
  isUrgent?: boolean;
}

export default function DoctorChamberGlancePortal() {
  const router = useRouter();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [currentClinicId, setCurrentClinicId] = useState(DEMO_CLINICS[0]!.clinicId);
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelledSession, setIsCancelledSession] = useState(false);

  // Active consultation state
  const [activePatient, setActivePatient] = useState<ActivePatientData>({
    tokenNumber: 14,
    name: 'R*** Sharma',
    ageGender: '52 Yrs / Male',
    mobile: '98260*****',
    vitals: {
      bloodPressure: '128/84 mmHg',
      pulse: '74 bpm',
      spo2: '98%',
      weight: '72 kg',
    },
    symptoms: 'Mild retrosternal chest heaviness on climbing stairs, known hypertensive for 4 years.',
    isFollowUp: true,
  });

  const [rxNotes, setRxNotes] = useState('Tab. Telmisartan 40mg OD • Advised Lipid Profile & ECG Review');
  const [consultationSuccessNotice, setConsultationSuccessNotice] = useState<string | null>(null);
  const [chamberProcedures, setChamberProcedures] = useState<string[]>(['proc-ecg']);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);

  const activeClinic =
    DEMO_CLINICS.find((c) => c.clinicId === currentClinicId) || DEMO_CLINICS[0]!;

  const handleSelectClinic = (newClinicId: string) => {
    setCurrentClinicId(newClinicId);
    setIsSwitcherOpen(false);
    document.cookie = `medibooking_active_clinic=${newClinicId}; path=/; max-age=604800`;
  };

  const handleBroadcastDelay = (mins: number) => {
    setDelayMinutes((prev) => prev + mins);
  };

  const handleCompleteAndNext = (issueFollowUp: boolean = false) => {
    const prevToken = activePatient.tokenNumber;
    setConsultationSuccessNotice(
      `✓ Token #${prevToken} Completed! ${
        issueFollowUp ? '14-Day Free Follow-Up Token Issued.' : ''
      }`
    );

    // Call Next Token
    setActivePatient({
      tokenNumber: prevToken + 1,
      name: 'P*** Patel',
      ageGender: '38 Yrs / Female',
      mobile: '98261*****',
      vitals: {
        bloodPressure: '118/76 mmHg',
        pulse: '78 bpm',
        spo2: '99%',
        weight: '64 kg',
      },
      symptoms: 'Routine cardiology clearance before elective cholecystectomy.',
      isFollowUp: false,
    });
    setRxNotes('');
    setChamberProcedures([]);

    setTimeout(() => {
      setConsultationSuccessNotice(null);
    }, 4000);
  };

  const handleCancelSession = () => {
    if (!cancellationReason.trim()) return;
    setIsCancelledSession(true);
    setIsCancelModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Doctor Portal Header */}
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
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block leading-tight">
                Chamber Consultation Desk
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {activeClinic.chamberNumber} • {activeClinic.clinicName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900">Dr. Rajesh Sharma, MD</p>
              <p className="text-[10px] text-emerald-600 font-semibold font-mono">
                NMC: MP-38492 • Verified
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              data-testid="btn-doctor-logout"
              onClick={() => logout(router)}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* Practice Switcher Strip */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold font-mono text-sm">
              {activeClinic.chamberNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Practicing At:</span>
                <span className="text-sm font-bold text-slate-900">{activeClinic.clinicName}</span>
                <Badge variant="blue" size="sm">
                  {activeClinic.chamberNumber}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeClinic.address} • Consultation Fee: ₹{activeClinic.consultationFeeRupees}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/doctor/chamber">
              <Button
                size="sm"
                data-testid="btn-open-rx-composer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
              >
                ⚡ 1-Minute Rx Composer
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSwitcherOpen(true)}
              className="text-xs font-semibold"
            >
              🔄 Switch Practice ({DEMO_CLINICS.length} Venues)
            </Button>
          </div>
        </div>

        {/* Cancellation Notice Banner if triggered */}
        {isCancelledSession && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛑</span>
              <div>
                <span className="font-bold block">Session Emergency Cancelled</span>
                <span>
                  Reason: {cancellationReason} • All waiting patients auto-routed to 14-Day VIP Priority Reschedule Queue.
                </span>
              </div>
            </div>
            <Badge variant="red" size="sm">
              SESSION TERMINATED
            </Badge>
          </div>
        )}

        {/* Success Notice Banner */}
        {consultationSuccessNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-xs animate-fade-in">
            {consultationSuccessNotice}
          </div>
        )}

        {/* Doctor Workspace 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Active Consultation Workspace */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              {/* Active Token Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl bg-blue-600 text-white font-mono tabular-nums font-black text-2xl flex items-center justify-center shadow-md">
                    #{activePatient.tokenNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 leading-tight">
                        {activePatient.name}
                      </h2>
                      {activePatient.isFollowUp && (
                        <Badge variant="mint" size="sm">
                          Free Follow-Up
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {activePatient.ageGender} • Phone: {activePatient.mobile}
                    </p>
                  </div>
                </div>

                <Badge variant="blue" size="md" dot pulse>
                  In Consultation
                </Badge>
              </div>

              {/* Pre-Consultation Physical Rx Sheet Status Banner */}
              <div className="mb-4 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <div>
                    <span className="font-bold text-blue-900 block">
                      Pre-Consultation Prescription Sheet Ready on Desk
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      Demographics pre-printed at reception with NMC registration MP-38492. Vitals below recorded by compounder.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsRxModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 shadow-2xs transition-colors"
                  >
                    🖨️ View Rx Sheet
                  </button>
                  <Badge variant="mint" size="sm">
                    ✓ Vitals Recorded
                  </Badge>
                </div>
              </div>

              {/* Patient Vitals Glance */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Blood Pressure
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block">
                    {activePatient.vitals.bloodPressure}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Pulse Rate
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block">
                    {activePatient.vitals.pulse}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Oxygen (SpO2)
                  </span>
                  <span className="text-sm font-bold font-mono text-emerald-700 mt-0.5 block">
                    {activePatient.vitals.spo2}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Weight
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block">
                    {activePatient.vitals.weight}
                  </span>
                </div>
              </div>

              {/* Chief Complaints / History */}
              <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100 text-xs mb-5">
                <span className="font-bold text-blue-900 block mb-1">
                  Chief Complaints & History:
                </span>
                <p className="text-slate-700 leading-relaxed">{activePatient.symptoms}</p>
              </div>

              {/* Quick Rx / Clinical Advice Input */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Clinical Diagnosis & Rx Notes
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Click chip to auto-append</span>
                </div>

                {/* 1-Click Common Prescription & Diagnostic Chips */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {[
                    'Tab. Telmisartan 40mg OD',
                    'Tab. Metformin 500mg BD',
                    'Tab. Amlodipine 5mg OD',
                    'Tab. Paracetamol 650mg SOS',
                    'Advised 12-Lead ECG Review',
                    'Fasting Lipid Profile & HbA1c',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setRxNotes((prev) => (prev ? `${prev} • ${chip}` : chip))}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={rxNotes}
                  onChange={(e) => setRxNotes(e.target.value)}
                  placeholder="Enter diagnosis, prescribed medicines, dosage, and diagnostic tests..."
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-sans"
                />
              </div>

              {/* In-Chamber Diagnostic Procedures (Auto-Billed to Reception Desk) */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs mb-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>⚡</span> In-Chamber Procedures Conducted (Auto-Billed to Front Desk)
                  </span>
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    Plugs Revenue Leakage
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Check procedures conducted in chamber. Front desk reception cashier will automatically see these pre-selected for billing settlement.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    { id: 'proc-ecg', name: '12-Lead ECG Review', fee: 200, docShare: 160 },
                    { id: 'proc-dressing', name: 'Sterile Wound Dressing', fee: 150, docShare: 105 },
                    { id: 'proc-neb', name: 'Duolin Nebulization', fee: 100, docShare: 60 },
                    { id: 'proc-rbs', name: 'Random Blood Sugar', fee: 50, docShare: 25 },
                  ].map((proc) => {
                    const isChecked = chamberProcedures.includes(proc.id);
                    return (
                      <label
                        key={proc.id}
                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                          isChecked
                            ? 'bg-emerald-100/80 border-emerald-400 font-semibold text-emerald-950 shadow-xs'
                            : 'bg-white border-emerald-200/70 text-slate-700 hover:bg-emerald-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setChamberProcedures([...chamberProcedures, proc.id]);
                              } else {
                                setChamberProcedures(chamberProcedures.filter((id) => id !== proc.id));
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{proc.name}</span>
                        </div>
                        <span className="font-mono text-emerald-800 font-bold">
                          +₹{proc.fee} <span className="text-[10px] text-slate-500 font-normal">(Doc: ₹{proc.docShare})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 1-Click Consultation Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleCompleteAndNext(false)}
                  className="font-bold text-xs"
                >
                  ✓ Complete & Call Next Token
                </Button>
                <Button
                  variant="mint"
                  size="md"
                  onClick={() => handleCompleteAndNext(true)}
                  className="font-bold text-xs"
                >
                  🎟️ Complete + Issue 14-Day Free Follow-Up
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => handleCompleteAndNext(false)}
                  className="text-xs text-slate-600"
                >
                  ⏭️ Patient No-Show / Skip
                </Button>
              </div>
            </div>
          </div>

          {/* Right Col: Delay Broadcast & Emergency Chamber Controls */}
          <div className="space-y-6">
            {/* Session Velocity & Doctor 80% Earnings Glance Card */}
            <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Today's Session Velocity
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  80% Consultant Split
                </span>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-2xl font-black font-mono text-emerald-400">₹6,720</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Doctor Net Share</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold font-mono text-white">14</span>
                  <span className="text-[10px] text-slate-400 block">Consultations</span>
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-700/60 space-y-1.5 text-[11px] text-slate-300">
                <div className="flex justify-between items-center">
                  <span>⏱️ Avg Consult: <span className="font-semibold text-white">7.2 mins</span></span>
                  <span className="text-emerald-300 font-semibold">⚡ ~42m Saved (Pre-Printed Rx)</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                  <span>TDS (Sec 194J 10%): <span className="text-rose-300 font-mono">-₹672</span></span>
                  <span className="text-slate-300 font-mono">Net NEFT Bank Payout: <span className="text-white font-bold font-mono">₹6,048</span></span>
                </div>
              </div>
            </Card>

            {/* 1-Click Doctor Delay Broadcast Box */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  1-Click Delay Broadcast
                </span>
                {delayMinutes > 0 && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    +{delayMinutes}m Active Delay
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3.5">
                Automatically pushes ETA revision to Waiting Room TV, compounder queue, and patient WhatsApp.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBroadcastDelay(15)}
                  className="text-xs font-semibold"
                >
                  +15 Mins
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBroadcastDelay(30)}
                  className="text-xs font-semibold"
                >
                  +30 Mins
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDelayMinutes(0)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Reset
                </Button>
              </div>
            </Card>

            {/* Waiting Queue Ahead */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Up Next Outside Chamber
                </span>
                <span className="text-xs font-semibold text-slate-500 font-mono">
                  3 in Queue
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-slate-900">#15</span>
                    <span className="font-semibold text-slate-800">P*** Patel</span>
                  </div>
                  <Badge variant="blue" size="sm">
                    Waiting
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-slate-900">#16</span>
                    <span className="font-semibold text-slate-800">S*** Verma</span>
                  </div>
                  <Badge variant="amber" size="sm">
                    Urgent
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Emergency Session Cancellation */}
            <Card className="p-5 border-red-200 bg-red-50/20">
              <span className="text-xs font-bold uppercase tracking-wider text-red-700 block mb-1">
                Emergency Session Cancellation
              </span>
              <p className="text-xs text-slate-500 mb-3">
                Emergency hospital calls or surgery. Auto-cancels remaining slots and moves patients to 14-day VIP priority queue.
              </p>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => setIsCancelModalOpen(true)}
                className="border-red-300 text-red-700 hover:bg-red-50 font-semibold text-xs"
              >
                🚨 Emergency Session Cancellation
              </Button>
            </Card>
          </div>
        </div>
      </main>

      {/* Emergency Session Cancellation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Confirm Emergency Session Cancellation"
        subtitle="Doctor Immediate Departure • VIP Priority Auto-Reschedule"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Cancelling this session will immediately release all held slots for today, notify the
            reception desk and waiting room TV, and issue 14-day VIP priority claim tokens via WhatsApp
            to all patients.
          </p>
          <textarea
            rows={3}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Reason for cancellation (e.g. Called for emergency cardiac angioplasty at AIIMS Bhopal)..."
            className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex gap-2">
            <Button
              variant="urgent"
              fullWidth
              size="md"
              disabled={!cancellationReason.trim()}
              onClick={handleCancelSession}
            >
              Confirm Emergency Cancellation
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsCancelModalOpen(false)}
            >
              Back
            </Button>
          </div>
        </div>
      </Modal>

      {/* Multi-Clinic Practice Location Switcher Modal */}
      <ClinicSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        doctorName="Rajesh Sharma"
        currentClinicId={currentClinicId}
        clinics={DEMO_CLINICS}
        onSelectClinic={handleSelectClinic}
      />

      {/* Pre-Consultation Prescription Sheet Modal */}
      <Modal
        isOpen={isRxModalOpen}
        onClose={() => setIsRxModalOpen(false)}
        maxWidth="lg"
        title="📋 Pre-Consultation Prescription Sheet"
        subtitle="Auto-formatted A4 Clinical Intake Slip • Pre-recorded at Reception Desk"
      >
        <div className="space-y-4">
          <div className="p-6 bg-white border border-slate-300 rounded-xl font-sans text-xs text-slate-800 shadow-xs space-y-4">
            <div className="flex justify-between items-start border-b border-slate-300 pb-3">
              <div>
                <p className="font-black text-sm text-slate-900">DR. RAJESH SHARMA, MD, DM</p>
                <p className="text-[10px] text-slate-500 font-mono font-semibold">NMC Reg: MP-38492 • Senior Interventional Cardiologist</p>
                <p className="text-[10px] text-slate-500">{activeClinic.clinicName} • {activeClinic.chamberNumber}</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black font-mono text-emerald-800">#{activePatient.tokenNumber}</span>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Consultation Token</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-slate-50 rounded-lg text-[11px]">
              <div><span className="text-slate-400 block">Patient:</span><span className="font-bold text-slate-800">{activePatient.name}</span></div>
              <div><span className="text-slate-400 block">Age / Gender:</span><span className="font-semibold text-slate-800">{activePatient.ageGender}</span></div>
              <div><span className="text-slate-400 block">Contact:</span><span className="font-mono text-slate-800">{activePatient.mobile}</span></div>
              <div><span className="text-slate-400 block">Booking Fee:</span><span className="font-bold text-emerald-700">₹49 PAID (ONLINE)</span></div>
            </div>

            <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-3">
              <span className="font-bold text-emerald-950 block text-[11px] mb-1.5">Recorded Vitals (By Reception Compounder):</span>
              <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                <div className="bg-white p-1.5 rounded border border-emerald-200"><span className="text-[9px] text-slate-500 block">BP</span><span className="font-bold text-slate-900">{activePatient.vitals.bloodPressure}</span></div>
                <div className="bg-white p-1.5 rounded border border-emerald-200"><span className="text-[9px] text-slate-500 block">PULSE</span><span className="font-bold text-slate-900">{activePatient.vitals.pulse}</span></div>
                <div className="bg-white p-1.5 rounded border border-emerald-200"><span className="text-[9px] text-slate-500 block">SPO2</span><span className="font-bold text-emerald-700">{activePatient.vitals.spo2}</span></div>
                <div className="bg-white p-1.5 rounded border border-emerald-200"><span className="text-[9px] text-slate-500 block">WEIGHT</span><span className="font-bold text-slate-900">{activePatient.vitals.weight}</span></div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-bold text-slate-700 block text-[11px] mb-1">Chief Complaints:</span>
              <p className="text-slate-600 leading-relaxed text-[11px]">{activePatient.symptoms}</p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof window !== 'undefined') window.print();
              }}
            >
              🖨️ Print Prescription Sheet
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsRxModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
