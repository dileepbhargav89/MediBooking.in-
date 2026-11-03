'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  TokenCard,
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

export default function DoctorChamberPage() {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [currentClinicId, setCurrentClinicId] = useState(DEMO_CLINICS[0]!.clinicId);
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [activeTokenNumber, setActiveTokenNumber] = useState(14);

  const activeClinic =
    DEMO_CLINICS.find((c) => c.clinicId === currentClinicId) || DEMO_CLINICS[0]!;

  const handleSelectClinic = (newClinicId: string) => {
    setCurrentClinicId(newClinicId);
    setIsSwitcherOpen(false);
    // In production, update active clinic in session cookie / context
    document.cookie = `medibooking_active_clinic=${newClinicId}; path=/; max-age=604800`;
  };

  const handleBroadcastDelay = (mins: number) => {
    setDelayMinutes((prev) => prev + mins);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Doctor Chamber Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900">Dr. Rajesh Sharma, MD</p>
              <p className="text-[10px] text-slate-500 font-mono">NMC: MP-38492 • Cardio</p>
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
        {/* Multi-Clinic Practice Location Switcher Bar */}
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
              🔄 Switch Clinic Practice ({DEMO_CLINICS.length} Locations)
            </Button>
          </div>
        </div>

        {/* Doctor Controls: Delay Broadcast & Chamber Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Active Consultation Box */}
          <Card className="p-5 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-md">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
              Now In Consultation
            </span>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-4xl font-extrabold font-mono tabular-nums">
                  #{activeTokenNumber}
                </span>
                <p className="text-sm font-semibold text-blue-100 mt-1">R*** Sharma (Follow-up)</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveTokenNumber((prev) => prev + 1)}
                className="bg-white text-blue-700 hover:bg-blue-50"
              >
                Next Token →
              </Button>
            </div>
          </Card>

          {/* 1-Click Delay Broadcast */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1-Click Delay Broadcast
              </span>
              {delayMinutes > 0 && (
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  +{delayMinutes}m Broadcast
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Notifies waiting room TV, compounder queue, and WhatsApp patients.
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

          {/* Chamber Summary */}
          <Card className="p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Session Overview Today
            </span>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">18</p>
                <p className="text-xs text-slate-500 font-medium">Waiting Outside</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600">32</p>
                <p className="text-xs text-slate-500 font-medium">Completed</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Live Patient Queue List */}
        <Card>
          <CardHeader>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Up Next in {activeClinic.chamberNumber} ({activeClinic.clinicName})
              </h3>
              <p className="text-xs text-slate-500">
                Patients lined up outside chamber • Realtime synchronized
              </p>
            </div>
            <Badge variant="mint" size="sm" dot pulse>
              Live Chamber Active
            </Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            <TokenCard
              tokenNumber={15}
              patientName="P*** Patel"
              status="WAITING"
              chamberNumber={activeClinic.chamberNumber}
              doctorName="Rajesh Sharma"
              estimatedTime="10 mins"
              source="WALK_IN"
              paymentStatus="PAID_CASH"
              onAction={() => setActiveTokenNumber(15)}
            />
            <TokenCard
              tokenNumber={16}
              patientName="S*** Verma"
              status="WAITING"
              chamberNumber={activeClinic.chamberNumber}
              doctorName="Rajesh Sharma"
              isUrgent={true}
              triageUrgency="URGENT"
              estimatedTime="25 mins"
              source="ONLINE_PORTAL"
              paymentStatus="PAID_UPI_QR"
              onAction={() => setActiveTokenNumber(16)}
            />
          </CardBody>
        </Card>
      </main>

      {/* Multi-Clinic Practice Switcher Modal */}
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
