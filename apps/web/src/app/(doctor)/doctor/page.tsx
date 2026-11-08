'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign Out
              </Button>
            </Link>
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
                <Badge variant="mint" size="sm">
                  ✓ Vitals Recorded
                </Badge>
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
              <div className="pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300">
                <span>⏱️ Avg Consult: <span className="font-semibold text-white">7.2 mins</span></span>
                <span className="text-emerald-300 font-semibold">⚡ ~42m Saved (Pre-Printed Rx)</span>
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
    </div>
  );
}
