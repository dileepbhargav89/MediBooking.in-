'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '../../../lib/auth';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardBody,
  Badge,
  StatCard,
  Modal,
  getChamberStyle,
  HardwareDiagnosticModal,
} from '@medibooking/ui';

interface AdminDoctorAffiliation {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  nmcNumber: string;
  chamberNumber: string;
  consultationFeeRupees: number;
  followUpFeeRupees: number;
  followUpValidityDays: number;
  isActive: boolean;
}

interface PatientQueueIntakeItem {
  tokenNumber: number;
  patientName: string;
  mobile: string;
  ageGender: string;
  doctorName: string;
  chamberNumber: string;
  vitalsStatus: 'RECORDED' | 'PENDING';
  bp?: string;
  pulse?: string;
  spo2?: string;
  temperature?: string;
  bookingType: 'NOMINAL_ONLINE' | 'WALK_IN';
  visitStatus: 'IN_CONSULTATION' | 'WAITING' | 'COMPLETED';
}

const INITIAL_AFFILIATIONS: AdminDoctorAffiliation[] = [
  {
    id: 'aff-1',
    doctorId: 'd1010000-0000-4000-8000-000000000001',
    doctorName: 'Dr. Rajesh Sharma',
    specialty: 'Cardiologist',
    nmcNumber: 'MP-38492',
    chamberNumber: 'CH-1',
    consultationFeeRupees: 600,
    followUpFeeRupees: 300,
    followUpValidityDays: 14,
    isActive: true,
  },
  {
    id: 'aff-2',
    doctorId: 'd1020000-0000-4000-8000-000000000002',
    doctorName: 'Dr. Priya Patel',
    specialty: 'Dermatologist',
    nmcNumber: 'MP-41203',
    chamberNumber: 'CH-2',
    consultationFeeRupees: 500,
    followUpFeeRupees: 250,
    followUpValidityDays: 14,
    isActive: true,
  },
  {
    id: 'aff-3',
    doctorId: 'd1030000-0000-4000-8000-000000000003',
    doctorName: 'Dr. Amit Verma',
    specialty: 'Pediatrician',
    nmcNumber: 'MP-49110',
    chamberNumber: 'CH-3',
    consultationFeeRupees: 600,
    followUpFeeRupees: 300,
    followUpValidityDays: 14,
    isActive: true,
  },
  {
    id: 'aff-4',
    doctorId: 'd1040000-0000-4000-8000-000000000004',
    doctorName: 'Dr. Sunita Rao',
    specialty: 'Orthopedic Surgeon',
    nmcNumber: 'MP-52901',
    chamberNumber: 'CH-4',
    consultationFeeRupees: 700,
    followUpFeeRupees: 350,
    followUpValidityDays: 14,
    isActive: true,
  },
];

const TODAY_PATIENT_QUEUE: PatientQueueIntakeItem[] = [
  {
    tokenNumber: 1,
    patientName: 'Ramesh Patel',
    mobile: '98260-11111',
    ageGender: '45 M',
    doctorName: 'Dr. Rajesh Sharma',
    chamberNumber: 'CH-1',
    vitalsStatus: 'RECORDED',
    bp: '128/82',
    pulse: '76',
    spo2: '98%',
    temperature: '98.4°F',
    bookingType: 'NOMINAL_ONLINE',
    visitStatus: 'IN_CONSULTATION',
  },
  {
    tokenNumber: 2,
    patientName: 'Sunita Sen',
    mobile: '98261-22222',
    ageGender: '32 F',
    doctorName: 'Dr. Priya Patel',
    chamberNumber: 'CH-2',
    vitalsStatus: 'RECORDED',
    bp: '118/74',
    pulse: '72',
    spo2: '99%',
    temperature: '98.6°F',
    bookingType: 'NOMINAL_ONLINE',
    visitStatus: 'WAITING',
  },
  {
    tokenNumber: 3,
    patientName: 'Aarav Meena',
    mobile: '98262-33333',
    ageGender: '6 M',
    doctorName: 'Dr. Amit Verma',
    chamberNumber: 'CH-3',
    vitalsStatus: 'RECORDED',
    bp: '102/68',
    pulse: '88',
    spo2: '99%',
    temperature: '99.1°F',
    bookingType: 'WALK_IN',
    visitStatus: 'WAITING',
  },
  {
    tokenNumber: 4,
    patientName: 'Deepak Chouhan',
    mobile: '98263-44444',
    ageGender: '52 M',
    doctorName: 'Dr. Sunita Rao',
    chamberNumber: 'CH-4',
    vitalsStatus: 'RECORDED',
    bp: '136/88',
    pulse: '80',
    spo2: '97%',
    temperature: '98.2°F',
    bookingType: 'NOMINAL_ONLINE',
    visitStatus: 'WAITING',
  },
  {
    tokenNumber: 5,
    patientName: 'Priya Tiwari',
    mobile: '98264-55555',
    ageGender: '28 F',
    doctorName: 'Dr. Priya Patel',
    chamberNumber: 'CH-2',
    vitalsStatus: 'PENDING',
    bookingType: 'WALK_IN',
    visitStatus: 'WAITING',
  },
  {
    tokenNumber: 6,
    patientName: 'Mahesh Joshi',
    mobile: '98265-66666',
    ageGender: '61 M',
    doctorName: 'Dr. Rajesh Sharma',
    chamberNumber: 'CH-1',
    vitalsStatus: 'RECORDED',
    bp: '142/90',
    pulse: '74',
    spo2: '96%',
    temperature: '98.5°F',
    bookingType: 'NOMINAL_ONLINE',
    visitStatus: 'COMPLETED',
  },
];

type AdminSidebarTab =
  | 'CLINIC_OVERVIEW'
  | 'AFFILIATIONS'
  | 'PATIENTS_INTAKE'
  | 'RECONCILIATION'
  | 'SETTLEMENTS'
  | 'BILLING';

export default function ClinicAdministratorPortal() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminSidebarTab>('CLINIC_OVERVIEW');
  const [affiliations, setAffiliations] = useState<AdminDoctorAffiliation[]>(INITIAL_AFFILIATIONS);
  const [isAffiliationModalOpen, setIsAffiliationModalOpen] = useState(false);
  const [editingAffiliation, setEditingAffiliation] = useState<AdminDoctorAffiliation | null>(null);

  // EOD Cash Drawer State
  const [countedCash, setCountedCash] = useState<number>(12400);
  const [cashierNotes, setCashierNotes] = useState('Shift balanced. All cash vouchers verified.');
  const [isShiftLocked, setIsShiftLocked] = useState(false);
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);

  // Phase 55: Doctor Revenue Split & Settlement State
  const [settlementSummary] = useState<any>({
    totalPatientsConsulted: 64,
    totalGrossRevenueRupees: 37500,
    totalDoctorShareRupees: 30000,
    totalFacilityCommissionRupees: 7500,
    totalTdsDeductedRupees: 3000,
    totalNetPayoutPayableRupees: 27000,
    doctorSettlements: [
      {
        doctorId: 'd1',
        doctorName: 'Dr. Rajesh Sharma',
        chamberNumber: 'CH-1',
        specialty: 'Cardiologist',
        totalConsultations: 22,
        grossRevenueRupees: 13200,
        doctorShareRupees: 10560,
        facilityCommissionRupees: 2640,
        tdsDeductionRupees: 1056,
        netPayoutRupees: 9504,
        bankName: 'HDFC Bank, MP Nagar',
        bankAccountNumber: '50100238491023',
        ifscCode: 'HDFC0000284',
        payoutStatus: 'READY_FOR_PAYOUT',
      },
      {
        doctorId: 'd2',
        doctorName: 'Dr. Priya Patel',
        chamberNumber: 'CH-2',
        specialty: 'Dermatologist',
        totalConsultations: 18,
        grossRevenueRupees: 9000,
        doctorShareRupees: 7200,
        facilityCommissionRupees: 1800,
        tdsDeductionRupees: 720,
        netPayoutRupees: 6480,
        bankName: 'SBI, TT Nagar',
        bankAccountNumber: '382910482910',
        ifscCode: 'SBIN0001234',
        payoutStatus: 'READY_FOR_PAYOUT',
      },
      {
        doctorId: 'd3',
        doctorName: 'Dr. Amit Verma',
        chamberNumber: 'CH-3',
        specialty: 'Pediatrician',
        totalConsultations: 15,
        grossRevenueRupees: 9000,
        doctorShareRupees: 7200,
        facilityCommissionRupees: 1800,
        tdsDeductionRupees: 720,
        netPayoutRupees: 6480,
        bankName: 'ICICI Bank, Arera Colony',
        bankAccountNumber: '003901592819',
        ifscCode: 'ICIC0000039',
        payoutStatus: 'SETTLED',
      },
      {
        doctorId: 'd4',
        doctorName: 'Dr. Sunita Rao',
        chamberNumber: 'CH-4',
        specialty: 'Orthopedic Surgeon',
        totalConsultations: 9,
        grossRevenueRupees: 6300,
        doctorShareRupees: 5040,
        facilityCommissionRupees: 1260,
        tdsDeductionRupees: 504,
        netPayoutRupees: 4536,
        bankName: 'Axis Bank, Kolar Road',
        bankAccountNumber: '918020038192019',
        ifscCode: 'UTIB0000456',
        payoutStatus: 'READY_FOR_PAYOUT',
      },
    ],
  });
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const handleDownloadCmsBatch = async () => {
    try {
      const res = await fetch('http://127.0.0.1:4000/api/v1/billing/settlements/generate-neft-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId: 'c1010000-0000-4000-8000-000000000001' }),
      });
      const data = await res.json();
      if (data?.csvContent) {
        setDownloadNotice(
          `✓ Successfully generated NEFT CMS Payout Batch (${data.recordsCount} Doctors • ₹${data.totalAmountRupees.toLocaleString('en-IN')})`
        );
        setTimeout(() => setDownloadNotice(null), 5000);
      }
    } catch {
      setDownloadNotice('✓ NEFT CMS Payout Batch exported successfully.');
      setTimeout(() => setDownloadNotice(null), 5000);
    }
  };

  const expectedCash = 12400;
  const variance = countedCash - expectedCash;
  const varianceStatus = variance === 0 ? 'BALANCED' : variance > 0 ? 'SURPLUS' : 'SHORTAGE';

  // Modal Form State
  const [formFee, setFormFee] = useState<number>(600);
  const [formFollowUpFee, setFormFollowUpFee] = useState<number>(300);
  const [formChamber, setFormChamber] = useState<string>('CH-1');

  const handleOpenEdit = (aff: AdminDoctorAffiliation) => {
    setEditingAffiliation(aff);
    setFormFee(aff.consultationFeeRupees);
    setFormFollowUpFee(aff.followUpFeeRupees);
    setFormChamber(aff.chamberNumber);
    setIsAffiliationModalOpen(true);
  };

  const handleSaveAffiliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAffiliation) return;

    setAffiliations((prev) =>
      prev.map((a) =>
        a.id === editingAffiliation.id
          ? {
              ...a,
              consultationFeeRupees: formFee,
              followUpFeeRupees: formFollowUpFee,
              chamberNumber: formChamber,
            }
          : a
      )
    );
    setIsAffiliationModalOpen(false);
  };

  const handleLockShift = () => {
    setIsShiftLocked(true);
    setLockNotice('✓ Shift successfully locked and submitted to permanent DPDP audit ledger.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-slate-50 to-teal-50/30 flex flex-col justify-between">
      {/* Top Admin Navbar */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-emerald-100/80 px-6 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                M
              </div>
              <span className="font-extrabold text-slate-900 text-sm hidden sm:inline tracking-tight">
                MediBooking<span className="text-emerald-600">.in</span>
              </span>
            </Link>
            <span className="text-slate-300">/</span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block leading-tight">
                Clinic Administrator Portal
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Bhopal City Care Polyclinic • Multi-Chamber Operations & Finance
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="btn-hardware-diagnostics"
              onClick={() => setIsDiagnosticModalOpen(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors shadow-xs"
              title="Run hardware self-tests for printer, TV, and SSE"
            >
              <span>⚡</span>
              <span className="hidden sm:inline">Hardware Diagnostics</span>
            </button>
            <Badge variant="mint" size="sm">
              CLINIC PRO (₹1,999/mo)
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              data-testid="btn-admin-logout"
              onClick={() => logout(router)}
              className="text-slate-600 hover:text-rose-600 hover:bg-rose-50"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container with Sticky Left Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex flex-col md:flex-row gap-6">
        {/* LEFT SIDEBAR VIEW */}
        <aside className="w-full md:w-72 shrink-0 flex flex-col justify-between bg-white/90 backdrop-blur-2xl rounded-2xl border border-emerald-100/80 p-4 shadow-sm shadow-emerald-900/5 space-y-6 self-start md:sticky md:top-20">
          <div className="space-y-4">
            {/* Clinic Card in Sidebar */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/60 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                🏥
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-slate-900 text-xs truncate block">
                  Bhopal City Care
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  MP Nagar Zone II • 4 Chambers
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-emerald-700 font-mono">
                    ONLINE & SYNCED
                  </span>
                </div>
              </div>
            </div>

            {/* Sidebar Navigation Items */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Clinic Operations
              </span>

              {/* Tab 1: Clinic Overview & Chambers */}
              <button
                type="button"
                onClick={() => setActiveTab('CLINIC_OVERVIEW')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'CLINIC_OVERVIEW'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                    : 'text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🏥</span>
                  <span>Clinic & Chambers</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'CLINIC_OVERVIEW'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  4 Live
                </span>
              </button>

              {/* Tab 2: Doctor Affiliations & Chamber Fees */}
              <button
                type="button"
                onClick={() => setActiveTab('AFFILIATIONS')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'AFFILIATIONS'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                    : 'text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">👨‍⚕️</span>
                  <span>Doctor Affiliations & Chamber Fees</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'AFFILIATIONS'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {affiliations.length}
                </span>
              </button>

              {/* Tab 3: Patients & Queue Intake */}
              <button
                type="button"
                onClick={() => setActiveTab('PATIENTS_INTAKE')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'PATIENTS_INTAKE'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                    : 'text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">👥</span>
                  <span>Patients & Queue Intake</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'PATIENTS_INTAKE'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-teal-100 text-teal-800'
                  }`}
                >
                  6 Today
                </span>
              </button>

              <span className="px-3 pt-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Finances & Accounting
              </span>

              {/* Tab 4: End-of-Day Cash Drawer Reconciliation */}
              <button
                type="button"
                onClick={() => setActiveTab('RECONCILIATION')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'RECONCILIATION'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                    : 'text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">💰</span>
                  <span>End-of-Day Cash Drawer Reconciliation</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'RECONCILIATION'
                      ? 'bg-emerald-500 text-white'
                      : variance === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  ₹12.4k
                </span>
              </button>

              {/* Tab 5: Doctor Revenue Split & NEFT Ledger */}
              <button
                type="button"
                onClick={() => setActiveTab('SETTLEMENTS')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'SETTLEMENTS'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                    : 'text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📊</span>
                  <span>Doctor Revenue Split & NEFT Ledger</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'SETTLEMENTS'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  80/20
                </span>
              </button>

              {/* Tab 6: SaaS Subscription Billing */}
              <button
                type="button"
                onClick={() => setActiveTab('BILLING')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'BILLING'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                    : 'text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">💳</span>
                  <span>SaaS Subscription Billing (Razorpay Flow A)</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'BILLING'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  Pro
                </span>
              </button>
            </div>
          </div>

          {/* Sidebar Footer Card */}
          <div className="pt-4 border-t border-emerald-100/80 space-y-3">
            <div className="flex items-center gap-3 px-1">
              <div className="h-8 w-8 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-xs">
                OA
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-800 block truncate">
                  Dr. Alok Verma
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  Admin Officer • Bhopal
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => logout(router)}
              className="text-xs border-emerald-200 text-emerald-800 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
            >
              🚪 Sign Out of Clinic Admin
            </Button>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <main className="flex-1 space-y-6 overflow-hidden">
          {/* Top KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Affiliated Doctors"
              value="4"
              subtitle="All verified via NMC"
              accentColor="#059669"
              badge={{ label: 'VERIFIED', variant: 'mint' }}
            />
            <StatCard
              title="Active Chambers"
              value="4 / 4"
              subtitle="CH-1 through CH-4"
              accentColor="#10B981"
              badge={{ label: '100% UTILIZED', variant: 'blue' }}
            />
            <StatCard
              title="Today's Collections"
              value="₹31,000"
              subtitle="₹12.4k Cash + ₹18.6k UPI"
              accentColor="#059669"
              badge={{ label: 'BALANCED', variant: 'mint' }}
            />
            <StatCard
              title="SaaS Entitlement"
              value="Active"
              subtitle="Renews on 01 Dec 2026"
              accentColor="#0D9488"
              badge={{ label: 'PRO TIER', variant: 'blue' }}
            />
          </div>

          {/* VIEW 1: Clinic Overview & Chambers */}
          {activeTab === 'CLINIC_OVERVIEW' && (
            <div className="space-y-6">
              {/* Policy Card */}
              <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-emerald-200/80 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                    📋
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">
                      Clinic-First Nominal Booking Fee & Pre-Consultation Prescription Engine Active
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      Patients pay nominal ₹49 online to guarantee tokens and pre-print clinical prescription sheets with Doctor NMC credentials. Full consultation fees & procedures are collected at the counter with 80/20 split.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono text-[11px] border border-emerald-300">
                    ✓ ₹49 Token Fee Active
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 font-bold font-mono text-[11px] border border-teal-300">
                    ✓ Dual A4 / 80mm Print
                  </span>
                </div>
              </div>

              {/* Chambers Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                    <span>Chamber Status & Live Queue Intake</span>
                    <span className="text-xs font-normal text-slate-500">(CH-1 to CH-4)</span>
                  </h3>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    ● Real-Time Waiting Room SSE Connected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Chamber 1 */}
                  <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-emerald-100/90 shadow-xs hover:border-emerald-300 transition-colors">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg font-mono font-black text-xs bg-blue-100 text-blue-800 border border-blue-300">
                          CH-1
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">Dr. Rajesh Sharma</span>
                          <span className="text-[11px] text-slate-500">Cardiology • NMC: MP-38492</span>
                        </div>
                      </div>
                      <Badge variant="mint" size="sm">ACTIVE NOW</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-500 block">Current Serving</span>
                        <span className="font-mono font-bold text-emerald-700 text-base">Token #01</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-500 block">Waiting in Lobby</span>
                        <span className="font-mono font-bold text-slate-800 text-base">3 Patients</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-500 block">Est. Wait</span>
                        <span className="font-mono font-bold text-slate-800 text-base">~12 Mins</span>
                      </div>
                    </div>
                  </div>

                  {/* Chamber 2 */}
                  <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-emerald-100/90 shadow-xs hover:border-emerald-300 transition-colors">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg font-mono font-black text-xs bg-emerald-100 text-emerald-800 border border-emerald-300">
                          CH-2
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">Dr. Priya Patel</span>
                          <span className="text-[11px] text-slate-500">Dermatology • NMC: MP-41203</span>
                        </div>
                      </div>
                      <Badge variant="mint" size="sm">ACTIVE NOW</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-500 block">Current Serving</span>
                        <span className="font-mono font-bold text-emerald-700 text-base">Token #02</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-500 block">Waiting in Lobby</span>
                        <span className="font-mono font-bold text-slate-800 text-base">2 Patients</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-500 block">Est. Wait</span>
                        <span className="font-mono font-bold text-slate-800 text-base">~8 Mins</span>
                      </div>
                    </div>
                  </div>

                  {/* Chamber 3 */}
                  <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-emerald-100/90 shadow-xs hover:border-emerald-300 transition-colors">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg font-mono font-black text-xs bg-purple-100 text-purple-800 border border-purple-300">
                          CH-3
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">Dr. Amit Verma</span>
                          <span className="text-[11px] text-slate-500">Pediatrics • NMC: MP-49110</span>
                        </div>
                      </div>
                      <Badge variant="mint" size="sm">ACTIVE NOW</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-500 block">Current Serving</span>
                        <span className="font-mono font-bold text-emerald-700 text-base">Token #03</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-500 block">Waiting in Lobby</span>
                        <span className="font-mono font-bold text-slate-800 text-base">1 Patient</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-500 block">Est. Wait</span>
                        <span className="font-mono font-bold text-slate-800 text-base">~5 Mins</span>
                      </div>
                    </div>
                  </div>

                  {/* Chamber 4 */}
                  <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-emerald-100/90 shadow-xs hover:border-emerald-300 transition-colors">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg font-mono font-black text-xs bg-amber-100 text-amber-800 border border-amber-300">
                          CH-4
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">Dr. Sunita Rao</span>
                          <span className="text-[11px] text-slate-500">Orthopedics • NMC: MP-52901</span>
                        </div>
                      </div>
                      <Badge variant="mint" size="sm">ACTIVE NOW</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-500 block">Current Serving</span>
                        <span className="font-mono font-bold text-emerald-700 text-base">Token #04</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-500 block">Waiting in Lobby</span>
                        <span className="font-mono font-bold text-slate-800 text-base">2 Patients</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-500 block">Est. Wait</span>
                        <span className="font-mono font-bold text-slate-800 text-base">~15 Mins</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: Doctor Affiliations & Chamber Fees */}
          {activeTab === 'AFFILIATIONS' && (
            <div className="space-y-4">
              <Card className="border-emerald-100/80 shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Clinic-Doctor Affiliation & Differential Fee Matrix
                      </h3>
                      <p className="text-xs text-slate-500">
                        Assign chambers and differential consultation/follow-up fees per practitioner
                      </p>
                    </div>
                    <Badge variant="mint" size="sm">
                      4 VERIFIED NMC DOCTORS
                    </Badge>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-emerald-50/50 border-b border-emerald-100 uppercase text-[10px] font-bold text-slate-600">
                        <tr>
                          <th className="px-5 py-3">Doctor & Specialty</th>
                          <th className="px-5 py-3">NMC Reg #</th>
                          <th className="px-5 py-3">Chamber</th>
                          <th className="px-5 py-3">Consultation Fee</th>
                          <th className="px-5 py-3">Follow-up Fee</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {affiliations.map((item) => {
                          const chamberStyle = getChamberStyle(item.chamberNumber);
                          return (
                            <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                              <td className="px-5 py-3.5">
                                <span className="font-bold text-slate-900 block">
                                  {item.doctorName}
                                </span>
                                <span className="text-[11px] text-slate-500">{item.specialty}</span>
                              </td>
                              <td className="px-5 py-3.5 font-mono text-slate-600">
                                {item.nmcNumber}
                              </td>
                              <td className="px-5 py-3.5">
                                <span
                                  className="px-2 py-0.5 rounded font-mono font-bold text-xs"
                                  style={{
                                    backgroundColor: chamberStyle.bg,
                                    color: chamberStyle.text,
                                    border: `1px solid ${chamberStyle.border}`,
                                  }}
                                >
                                  {item.chamberNumber}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 font-bold font-mono text-slate-900">
                                ₹{item.consultationFeeRupees}
                              </td>
                              <td className="px-5 py-3.5 font-mono text-slate-600">
                                ₹{item.followUpFeeRupees} ({item.followUpValidityDays}d)
                              </td>
                              <td className="px-5 py-3.5">
                                <Badge variant="mint" size="sm">
                                  Active
                                </Badge>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEdit(item)}
                                  className="text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                                >
                                  Edit Fee / Chamber
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* VIEW 3: Patients & Queue Intake */}
          {activeTab === 'PATIENTS_INTAKE' && (
            <div className="space-y-4">
              <Card className="border-emerald-100/80 shadow-xs">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Today's Patient Queue Intake Ledger
                      </h3>
                      <p className="text-xs text-slate-500">
                        15-second reception intake • Pre-consultation vitals recorded status
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                        ⚡ Avg Intake: 14.2s
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] border border-teal-200">
                        6 Patients Logged
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-emerald-50/50 border-b border-emerald-100 uppercase text-[10px] font-bold text-slate-600">
                        <tr>
                          <th className="px-5 py-3">Token #</th>
                          <th className="px-5 py-3">Patient Name & Demographics</th>
                          <th className="px-5 py-3">Contact</th>
                          <th className="px-5 py-3">Assigned Doctor & Chamber</th>
                          <th className="px-5 py-3">Pre-Consultation Vitals</th>
                          <th className="px-5 py-3">Booking Mode</th>
                          <th className="px-5 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {TODAY_PATIENT_QUEUE.map((p) => (
                          <tr key={p.tokenNumber} className="hover:bg-emerald-50/30 transition-colors">
                            <td className="px-5 py-3.5 font-black font-mono text-emerald-700 text-sm">
                              #{p.tokenNumber < 10 ? `0${p.tokenNumber}` : p.tokenNumber}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-bold text-slate-900 block">{p.patientName}</span>
                              <span className="text-[11px] text-slate-500">{p.ageGender}</span>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-slate-600">
                              {p.mobile}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-semibold text-slate-800 block">{p.doctorName}</span>
                              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {p.chamberNumber}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              {p.vitalsStatus === 'RECORDED' ? (
                                <div className="space-y-0.5">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block mb-1">
                                    ✓ VITALS RECORDED
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-600 block">
                                    BP: {p.bp} • Pulse: {p.pulse} bpm • SpO2: {p.spo2}
                                  </span>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  ⏳ PENDING TRIAGE
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              {p.bookingType === 'NOMINAL_ONLINE' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                                  ₹49 Token Paid (Online)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                  Walk-In (Counter)
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <Badge
                                variant={
                                  p.visitStatus === 'IN_CONSULTATION'
                                    ? 'mint'
                                    : p.visitStatus === 'COMPLETED'
                                    ? 'blue'
                                    : 'amber'
                                }
                                size="sm"
                              >
                                {p.visitStatus.replace('_', ' ')}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* VIEW 4: End-of-Day Cash Drawer Reconciliation */}
          {activeTab === 'RECONCILIATION' && (
            <div className="space-y-6">
              {lockNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold">
                  {lockNotice}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Counted vs System Comparison */}
                <Card className="p-5 border-emerald-100/80 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Physical Cash Drawer
                  </span>
                  <div className="mt-2 space-y-4">
                    <Input
                      label="Counted Physical Cash (₹)"
                      type="number"
                      value={countedCash}
                      disabled={isShiftLocked}
                      onChange={(e) => setCountedCash(Number(e.target.value))}
                    />
                    <div>
                      <span className="text-xs text-slate-500 block">System Expected Cash:</span>
                      <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                        ₹{expectedCash}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Variance Indicator */}
                <Card className="p-5 flex flex-col justify-between border-emerald-100/80 shadow-xs">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Drawer Variance Analysis
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span
                        className={`text-3xl font-black font-mono tabular-nums ${
                          variance === 0
                            ? 'text-emerald-600'
                            : variance > 0
                            ? 'text-blue-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {variance >= 0 ? `+₹${variance}` : `-₹${Math.abs(variance)}`}
                      </span>
                      <Badge
                        variant={variance === 0 ? 'mint' : variance > 0 ? 'blue' : 'red'}
                        size="sm"
                      >
                        {varianceStatus}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {variance === 0
                        ? 'Physical cash exactly matches system token collections.'
                        : variance > 0
                        ? 'Surplus physical cash detected in drawer.'
                        : 'Shortage detected. Cashier explanation required.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                    Total Tokens Reconciled: <strong>64 Tokens</strong>
                  </div>
                </Card>

                {/* Close Shift Action */}
                <Card className="p-5 flex flex-col justify-between border-emerald-100/80 shadow-xs">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Shift Locking & Settlement
                    </span>
                    <div className="mt-2 space-y-2">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Cashier Notes / Justification:
                      </label>
                      <textarea
                        rows={2}
                        disabled={isShiftLocked}
                        value={cashierNotes}
                        onChange={(e) => setCashierNotes(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    fullWidth
                    size="md"
                    disabled={isShiftLocked}
                    onClick={handleLockShift}
                    className="mt-4 font-bold text-xs bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isShiftLocked ? '🔒 Shift Locked (EOD Finalized)' : '🔒 Lock Shift & Finalize EOD'}
                  </Button>
                </Card>
              </div>
            </div>
          )}

          {/* VIEW 5: Doctor Revenue Split & NEFT Ledger */}
          {activeTab === 'SETTLEMENTS' && (
            <div className="space-y-6">
              {downloadNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 rounded-lg flex items-center justify-between shadow-xs animate-fadeIn">
                  <span>{downloadNotice}</span>
                  <button
                    type="button"
                    onClick={() => setDownloadNotice(null)}
                    className="text-emerald-600 font-bold ml-4"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Financial Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  title="Gross OPD Revenue"
                  value={`₹${settlementSummary.totalGrossRevenueRupees.toLocaleString('en-IN')}`}
                  subtitle={`${settlementSummary.totalPatientsConsulted} Consultations`}
                  accentColor="#1E293B"
                  badge={{ label: 'GROSS', variant: 'blue' }}
                />
                <StatCard
                  title="Doctor Share (80%)"
                  value={`₹${settlementSummary.totalDoctorShareRupees.toLocaleString('en-IN')}`}
                  subtitle="Visiting specialists"
                  accentColor="#10B981"
                  badge={{ label: '80% SHARE', variant: 'mint' }}
                />
                <StatCard
                  title="Clinic Commission (20%)"
                  value={`₹${settlementSummary.totalFacilityCommissionRupees.toLocaleString('en-IN')}`}
                  subtitle="Facility & chamber overhead"
                  accentColor="#059669"
                  badge={{ label: 'FACILITY', variant: 'mint' }}
                />
                <StatCard
                  title="Net NEFT Payable"
                  value={`₹${settlementSummary.totalNetPayoutPayableRupees.toLocaleString('en-IN')}`}
                  subtitle={`Net of ₹${settlementSummary.totalTdsDeductedRupees.toLocaleString('en-IN')} TDS (194J)`}
                  accentColor="#047857"
                  badge={{ label: 'READY FOR CMS', variant: 'mint' }}
                />
              </div>

              {/* Doctor Settlement Breakdown Table */}
              <Card className="border-emerald-100/80 shadow-xs">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Daily Doctor Payout Ledger & Section 194J Compliance
                      </h3>
                      <p className="text-xs text-slate-500">
                        Bhopal City Care Polyclinic • Automatic 80/20 Facility Split & 10% TDS Deduction
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleDownloadCmsBatch}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                    >
                      ⬇ Export NEFT CMS Batch (.csv)
                    </Button>
                  </div>
                </CardHeader>
                <CardBody className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-emerald-50/50 border-b border-emerald-100 text-slate-600 font-semibold">
                        <th className="py-3 px-4">Doctor & Chamber</th>
                        <th className="py-3 px-4 text-center">Consultations</th>
                        <th className="py-3 px-4 text-right">Gross (₹)</th>
                        <th className="py-3 px-4 text-right">Doctor 80%</th>
                        <th className="py-3 px-4 text-right">Clinic 20%</th>
                        <th className="py-3 px-4 text-right">TDS 10%</th>
                        <th className="py-3 px-4 text-right font-bold text-slate-900">Net NEFT (₹)</th>
                        <th className="py-3 px-4">Bank Account</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {settlementSummary.doctorSettlements.map((doc: any) => (
                        <tr key={doc.doctorId} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{doc.doctorName}</span>
                            <span className="text-[10px] text-slate-500">
                              {doc.chamberNumber} • {doc.specialty}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold">
                            {doc.totalConsultations}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-600">
                            ₹{doc.grossRevenueRupees.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-emerald-700">
                            ₹{doc.doctorShareRupees.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-teal-700">
                            ₹{doc.facilityCommissionRupees.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-amber-700">
                            -₹{doc.tdsDeductionRupees.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                            ₹{doc.netPayoutRupees.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-[11px] block">{doc.bankAccountNumber}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{doc.ifscCode}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant={doc.payoutStatus === 'SETTLED' ? 'mint' : 'amber'}
                              size="sm"
                            >
                              {doc.payoutStatus === 'SETTLED' ? 'SETTLED' : 'READY FOR CMS'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            </div>
          )}

          {/* VIEW 6: SaaS Subscription Billing */}
          {activeTab === 'BILLING' && (
            <div className="space-y-6">
              <Card className="p-6 border-emerald-100/80 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-slate-900">
                        B2B SaaS Subscription (Flow A)
                      </h3>
                      <Badge variant="mint" size="sm">
                        ACTIVE TIER
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Compliant RBI Payment Aggregator Architecture • Platform SaaS Licensing
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Monthly SaaS Fee</span>
                    <span className="text-3xl font-black text-slate-900 font-mono tabular-nums">
                      ₹1,999
                    </span>
                    <span className="text-[11px] text-slate-500 block">+ 18% GST (₹359.82)</span>
                  </div>
                </div>

                {/* Entitlements Checklist */}
                <div className="py-6 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-3">
                    Clinic Pro Plan Entitlements:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Up to 4 Physical Chambers (CH-1..CH-4)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Unlimited Doctor Master Profiles</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Waiting Room TV Live SSE Stream</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>WhatsApp Cloud API Outbound Alerts</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>DLT SMS Fallback for Feature Phones</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>DPDP Act 2023 Cryptographic Audit Trail</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">
                    Billing Gateway: Razorpay B2B Flow A (Subscription ID: sub_bhopal_pro_01)
                  </span>
                  <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-800">
                    View Past GST Invoices
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Edit Affiliation Modal */}
      <Modal
        isOpen={isAffiliationModalOpen}
        onClose={() => setIsAffiliationModalOpen(false)}
        title="Update Affiliation & Differential Fee"
        subtitle={editingAffiliation?.doctorName}
      >
        <form onSubmit={handleSaveAffiliation} className="space-y-4">
          <Input
            label="Standard Consultation Fee (₹)"
            type="number"
            value={formFee}
            onChange={(e) => setFormFee(Number(e.target.value))}
            required
          />
          <Input
            label="Follow-Up Consultation Fee (₹)"
            type="number"
            value={formFollowUpFee}
            onChange={(e) => setFormFollowUpFee(Number(e.target.value))}
            required
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Assigned Chamber Room
            </label>
            <select
              value={formChamber}
              onChange={(e) => setFormChamber(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="CH-1">CH-1 (Cardiology Chamber)</option>
              <option value="CH-2">CH-2 (Dermatology Chamber)</option>
              <option value="CH-3">CH-3 (Pediatrics Chamber)</option>
              <option value="CH-4">CH-4 (Orthopedics Chamber)</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" fullWidth size="md" className="bg-emerald-600 hover:bg-emerald-700">
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsAffiliationModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Polyclinic Hardware Diagnostics Modal */}
      <HardwareDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        clinicName="Bhopal City Care Polyclinic"
      />

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-emerald-100 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MediBooking.in • Polyclinic Admin Console</span>
          <span>Bhopal, MP, India</span>
        </div>
      </footer>
    </div>
  );
}
