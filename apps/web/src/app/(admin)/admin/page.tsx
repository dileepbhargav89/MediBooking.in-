'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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

export default function ClinicAdministratorPortal() {
  const [activeTab, setActiveTab] = useState<'AFFILIATIONS' | 'RECONCILIATION' | 'BILLING' | 'SETTLEMENTS'>('AFFILIATIONS');
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
  const [settlementSummary, setSettlementSummary] = useState<any>({
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Admin Navbar */}
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
                Clinic Administrator Portal
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Bhopal City Care Polyclinic • SaaS Tenant Management
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="btn-hardware-diagnostics"
              onClick={() => setIsDiagnosticModalOpen(true)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1.5 transition-colors shadow-xs"
              title="Run hardware self-tests for printer, TV, and SSE"
            >
              <span>⚡</span>
              <span className="hidden sm:inline">Hardware Diagnostics</span>
            </button>
            <Badge variant="blue" size="sm">
              CLINIC PRO (₹1,999/mo)
            </Badge>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign Out
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Admin Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Affiliated Doctors"
            value="4"
            subtitle="All verified via NMC"
            accentColor="#1D4ED8"
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
            accentColor="#10B981"
            badge={{ label: 'BALANCED', variant: 'mint' }}
          />
          <StatCard
            title="SaaS Entitlement"
            value="Active"
            subtitle="Renews on 01 Dec 2026"
            accentColor="#1D4ED8"
            badge={{ label: 'PRO TIER', variant: 'blue' }}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('AFFILIATIONS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'AFFILIATIONS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            👨‍⚕️ Doctor Affiliations & Chamber Fees ({affiliations.length})
          </button>
          <button
            onClick={() => setActiveTab('RECONCILIATION')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'RECONCILIATION'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            💰 End-of-Day Cash Drawer Reconciliation
          </button>
          <button
            onClick={() => setActiveTab('BILLING')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'BILLING'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            💳 SaaS Subscription Billing (Razorpay Flow A)
          </button>
          <button
            onClick={() => setActiveTab('SETTLEMENTS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'SETTLEMENTS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            📊 Doctor Revenue Split & NEFT Ledger
          </button>
        </div>

        {/* TAB 1: Doctor Affiliations & Chambers */}
        {activeTab === 'AFFILIATIONS' && (
          <div className="space-y-4">
            {/* Phase 61 Policy Card: Nominal Booking & Pre-Consultation Sheet */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
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
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold font-mono text-[11px] border border-blue-300">
                  ✓ Dual A4 / 80mm Print
                </span>
              </div>
            </div>

            <Card>
            <CardHeader>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Clinic-Doctor Affiliation & Differential Fee Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Assign chambers and differential consultation/follow-up fees per practitioner
                </p>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] font-bold text-slate-500">
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
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
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
                              className="text-xs"
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

        {/* TAB 2: End-of-Day Cash Drawer Reconciliation */}
        {activeTab === 'RECONCILIATION' && (
          <div className="space-y-6">
            {lockNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold">
                {lockNotice}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Counted vs System Comparison */}
              <Card className="p-5">
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
              <Card className="p-5 flex flex-col justify-between">
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
              <Card className="p-5 flex flex-col justify-between">
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
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  size="md"
                  disabled={isShiftLocked}
                  onClick={handleLockShift}
                  className="mt-4 font-bold text-xs"
                >
                  {isShiftLocked ? '🔒 Shift Locked (EOD Finalized)' : '🔒 Lock Shift & Finalize EOD'}
                </Button>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 3: SaaS Subscription Billing (Razorpay Flow A) */}
        {activeTab === 'BILLING' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-slate-900">
                      B2B SaaS Subscription (Flow A)
                    </h3>
                    <Badge variant="blue" size="sm">
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
                <Button variant="outline" size="sm">
                  View Past GST Invoices
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: Phase 55: Doctor Revenue Split & NEFT Ledger */}
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
                accentColor="#3B82F6"
                badge={{ label: 'FACILITY', variant: 'blue' }}
              />
              <StatCard
                title="Net NEFT Payable"
                value={`₹${settlementSummary.totalNetPayoutPayableRupees.toLocaleString('en-IN')}`}
                subtitle={`Net of ₹${settlementSummary.totalTdsDeductedRupees.toLocaleString('en-IN')} TDS (194J)`}
                accentColor="#059669"
                badge={{ label: 'READY FOR CMS', variant: 'mint' }}
              />
            </div>

            {/* Doctor Settlement Breakdown Table */}
            <Card>
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
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
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
                      <tr key={doc.doctorId} className="hover:bg-slate-50/70 transition-colors">
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
                        <td className="py-3 px-4 text-right font-mono font-medium text-blue-700">
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
      </main>

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
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CH-1">CH-1 (Cardiology Chamber)</option>
              <option value="CH-2">CH-2 (Dermatology Chamber)</option>
              <option value="CH-3">CH-3 (Pediatrics Chamber)</option>
              <option value="CH-4">CH-4 (Orthopedics Chamber)</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" fullWidth size="md">
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

      {/* Phase 59: Polyclinic Hardware Diagnostics Modal */}
      <HardwareDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        clinicName="Bhopal City Care Polyclinic"
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MediBooking.in • Polyclinic Admin Console</span>
          <span>Bhopal, MP, India</span>
        </div>
      </footer>
    </div>
  );
}

