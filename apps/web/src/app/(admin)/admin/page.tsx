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
  const [activeTab, setActiveTab] = useState<'AFFILIATIONS' | 'RECONCILIATION' | 'BILLING'>('AFFILIATIONS');
  const [affiliations, setAffiliations] = useState<AdminDoctorAffiliation[]>(INITIAL_AFFILIATIONS);
  const [isAffiliationModalOpen, setIsAffiliationModalOpen] = useState(false);
  const [editingAffiliation, setEditingAffiliation] = useState<AdminDoctorAffiliation | null>(null);

  // EOD Cash Drawer State
  const [countedCash, setCountedCash] = useState<number>(12400);
  const [cashierNotes, setCashierNotes] = useState('Shift balanced. All cash vouchers verified.');
  const [isShiftLocked, setIsShiftLocked] = useState(false);
  const [lockNotice, setLockNotice] = useState<string | null>(null);

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
        </div>

        {/* TAB 1: Doctor Affiliations & Chambers */}
        {activeTab === 'AFFILIATIONS' && (
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
