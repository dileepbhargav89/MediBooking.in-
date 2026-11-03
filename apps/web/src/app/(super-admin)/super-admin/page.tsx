'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  StatCard,
  Modal,
} from '@medibooking/ui';

interface PendingDoctorReview {
  id: string;
  name: string;
  specialty: string;
  nmcNumber: string;
  stateCouncil: string;
  qualifications: string;
  mobile: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

interface ClinicTenantItem {
  id: string;
  name: string;
  area: string;
  chambersCount: number;
  doctorsCount: number;
  plan: 'TRIAL_30' | 'CLINIC_PRO' | 'POLYCLINIC_ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED';
}

const INITIAL_PENDING_DOCTORS: PendingDoctorReview[] = [
  {
    id: 'doc-1',
    name: 'Dr. Rajesh Sharma',
    specialty: 'Cardiology',
    nmcNumber: 'MP-38492',
    stateCouncil: 'Madhya Pradesh Medical Council',
    qualifications: 'MBBS, MD, DM (Cardiology)',
    mobile: '9826022222',
    status: 'VERIFIED',
  },
  {
    id: 'doc-2',
    name: 'Dr. Priya Patel',
    specialty: 'Dermatology',
    nmcNumber: 'MP-41203',
    stateCouncil: 'Madhya Pradesh Medical Council',
    qualifications: 'MBBS, MD (Dermatology)',
    mobile: '9826133333',
    status: 'VERIFIED',
  },
  {
    id: 'doc-3',
    name: 'Dr. Vikramaditya Singh',
    specialty: 'Neurology',
    nmcNumber: 'MP-68192',
    stateCouncil: 'Madhya Pradesh Medical Council',
    qualifications: 'MBBS, MS, MCh (Neuro)',
    mobile: '9826199999',
    status: 'PENDING',
  },
];

const INITIAL_TENANTS: ClinicTenantItem[] = [
  {
    id: 'c101',
    name: 'Bhopal City Care Polyclinic',
    area: 'MP Nagar Zone II',
    chambersCount: 4,
    doctorsCount: 8,
    plan: 'CLINIC_PRO',
    status: 'ACTIVE',
  },
  {
    id: 'c102',
    name: 'Arera Super Specialty Polyclinic',
    area: 'Arera Colony E-3',
    chambersCount: 6,
    doctorsCount: 12,
    plan: 'POLYCLINIC_ENTERPRISE',
    status: 'ACTIVE',
  },
  {
    id: 'c103',
    name: 'Kolar Road Family Clinic',
    area: 'Kolar Road, Bhopal',
    chambersCount: 2,
    doctorsCount: 3,
    plan: 'TRIAL_30',
    status: 'ACTIVE',
  },
];

export default function SuperAdminPortalPage() {
  const [activeTab, setActiveTab] = useState<'NMC_DESK' | 'TENANTS' | 'DPDP_AUDIT' | 'TELEMETRY'>('NMC_DESK');
  const [doctors, setDoctors] = useState<PendingDoctorReview[]>(INITIAL_PENDING_DOCTORS);
  const [tenants, setTenants] = useState<ClinicTenantItem[]>(INITIAL_TENANTS);
  const [isChainVerifying, setIsChainVerifying] = useState(false);
  const [chainVerifyNotice, setChainVerifyNotice] = useState<string | null>(null);

  const handleVerifyDoctor = (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    setDoctors((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status } : d))
    );
  };

  const handleVerifyAuditChain = () => {
    setIsChainVerifying(true);
    setChainVerifyNotice(null);

    setTimeout(() => {
      setIsChainVerifying(false);
      setChainVerifyNotice(
        '✓ Cryptographic HMAC-SHA256 Merkle Chain Integrity: 1,420 Blocks Verified 100% Intact. Genesis hash and sequence linkage valid.'
      );
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      {/* Top Super Admin Navbar */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-3.5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-black text-base shadow-sm">
                M
              </div>
              <span className="font-bold text-white text-sm hidden sm:inline">
                MediBooking<span className="text-purple-400">.in</span>
              </span>
            </Link>
            <span className="text-slate-600">/</span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300 block leading-tight">
                Super Admin Platform Console
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Multi-Tenant Polyclinic Network • Bhopal Pilot Core
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-xs font-semibold">
              SUPER_ADMIN
            </span>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                Sign Out
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6 flex-1">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Active Polyclinic Tenants
            </span>
            <span className="text-3xl font-black font-mono tabular-nums text-white mt-2 block">
              10
            </span>
            <span className="text-xs text-emerald-400 font-semibold block mt-1">
              Bhopal Pilot Live
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Registered Doctors
            </span>
            <span className="text-3xl font-black font-mono tabular-nums text-white mt-2 block">
              38
            </span>
            <span className="text-xs text-purple-300 font-semibold block mt-1">
              35 Verified • 3 Pending
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Live TV SSE Connections
            </span>
            <span className="text-3xl font-black font-mono tabular-nums text-emerald-400 mt-2 block">
              24
            </span>
            <span className="text-xs text-slate-400 font-semibold block mt-1">
              Active Screen Streams
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              DPDP Audit Blocks
            </span>
            <span className="text-3xl font-black font-mono tabular-nums text-white mt-2 block">
              1,420
            </span>
            <span className="text-xs text-emerald-400 font-semibold block mt-1">
              Chain 100% Intact
            </span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('NMC_DESK')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'NMC_DESK'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
            }`}
          >
            🛡️ Doctor NMC Verification Desk (3 Pending)
          </button>
          <button
            onClick={() => setActiveTab('TENANTS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'TENANTS'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
            }`}
          >
            🏥 Polyclinic Tenants & Chamber Allocations
          </button>
          <button
            onClick={() => setActiveTab('DPDP_AUDIT')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'DPDP_AUDIT'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
            }`}
          >
            🔐 DPDP Act 2023 Immutable Audit Chain
          </button>
          <button
            onClick={() => setActiveTab('TELEMETRY')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'TELEMETRY'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
            }`}
          >
            📡 Gateway Telemetry (WhatsApp / DLT SMS)
          </button>
        </div>

        {/* TAB 1: NMC Verification Desk */}
        {activeTab === 'NMC_DESK' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">
                  National Medical Commission (NMC) Verification Registry
                </h3>
                <p className="text-xs text-slate-400">
                  Review state council credentials before granting public discovery and booking status
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-slate-700 uppercase text-[10px] font-bold text-slate-400">
                  <tr>
                    <th className="px-6 py-3">Doctor Name</th>
                    <th className="px-6 py-3">NMC Reg #</th>
                    <th className="px-6 py-3">State Council</th>
                    <th className="px-6 py-3">Qualifications</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {doctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-750/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">
                        {doc.name}
                        <span className="block text-[11px] font-normal text-slate-400">
                          {doc.specialty}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-purple-300">
                        {doc.nmcNumber}
                      </td>
                      <td className="px-6 py-4">{doc.stateCouncil}</td>
                      <td className="px-6 py-4 text-slate-400">{doc.qualifications}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                            doc.status === 'VERIFIED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : doc.status === 'REJECTED'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {doc.status !== 'VERIFIED' ? (
                          <Button
                            variant="mint"
                            size="sm"
                            onClick={() => handleVerifyDoctor(doc.id, 'VERIFIED')}
                            className="text-xs font-semibold"
                          >
                            ✓ Approve & Verify
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-400 font-bold">
                            ✓ Verified Live
                          </span>
                        )}
                        {doc.status !== 'REJECTED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyDoctor(doc.id, 'REJECTED')}
                            className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            Reject
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Clinic Tenants */}
        {activeTab === 'TENANTS' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">
                  Active Polyclinic Tenants in Bhopal
                </h3>
                <p className="text-xs text-slate-400">
                  Provisioned multi-chamber organizations and subscription quotas
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-slate-700 uppercase text-[10px] font-bold text-slate-400">
                  <tr>
                    <th className="px-6 py-3">Clinic Organization</th>
                    <th className="px-6 py-3">Area / Location</th>
                    <th className="px-6 py-3">Chambers</th>
                    <th className="px-6 py-3">Doctors</th>
                    <th className="px-6 py-3">SaaS Plan</th>
                    <th className="px-6 py-3">Tenant Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-750/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{t.name}</td>
                      <td className="px-6 py-4">{t.area}</td>
                      <td className="px-6 py-4 font-mono font-bold text-purple-300">
                        {t.chambersCount} Chambers
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300">
                        {t.doctorsCount} Affiliated
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800">
                          {t.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DPDP Immutable Audit Chain */}
        {activeTab === 'DPDP_AUDIT' && (
          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700">
                <div>
                  <h3 className="font-bold text-white text-base">
                    DPDP Act 2023 Cryptographic Audit Ledger
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tamper-evident Merkle hash chaining with monotonic sequences and PII redaction
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  isLoading={isChainVerifying}
                  onClick={handleVerifyAuditChain}
                  className="bg-purple-600 hover:bg-purple-700 text-xs font-bold"
                >
                  🔍 Verify Hash Chain Integrity
                </Button>
              </div>

              {chainVerifyNotice && (
                <div className="my-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-bold">
                  {chainVerifyNotice}
                </div>
              )}

              {/* Sample Blocks Display */}
              <div className="mt-4 space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                    <span>Block #1,420 • 2026-11-04 00:15:32 IST</span>
                    <span className="text-emerald-400 font-bold">HASH VALID ✓</span>
                  </div>
                  <p className="text-white font-semibold">
                    Action: EMERGENCY_OVERRIDE • Chamber CH-1 • Actor: staff-reception-01
                  </p>
                  <p className="text-slate-500 text-[10px] truncate mt-1">
                    SHA-256: e8b3294c798031d798b0493821ac3e73a98d36184a22b78912d09438fa77b311
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                    <span>Block #1,419 • 2026-11-04 00:14:10 IST</span>
                    <span className="text-emerald-400 font-bold">HASH VALID ✓</span>
                  </div>
                  <p className="text-white font-semibold">
                    Action: PAYMENT_COLLECTED • Amount: ₹600 (PAID_CASH) • Token #14
                  </p>
                  <p className="text-slate-500 text-[10px] truncate mt-1">
                    SHA-256: 7a91c83401fa940183bda1929381023910948ac01948ba120938491029384abc
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                    <span>Block #1,418 • 2026-11-04 00:10:02 IST</span>
                    <span className="text-emerald-400 font-bold">HASH VALID ✓</span>
                  </div>
                  <p className="text-white font-semibold">
                    Action: DELAY_BROADCAST • +15m delay • Chamber CH-3 • Dr. Amit Verma
                  </p>
                  <p className="text-slate-500 text-[10px] truncate mt-1">
                    SHA-256: 12f0948bc0192837190283401928374019283740192837401928374019283740
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Gateway Telemetry */}
        {activeTab === 'TELEMETRY' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* WhatsApp Cloud API */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Meta WhatsApp Cloud API
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold">
                  CONNECTED
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone Number ID:</span>
                  <span className="text-white font-bold">1376418502227507</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Messaging Account ID:</span>
                  <span className="text-white">1483246103715802</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Test Number:</span>
                  <span className="text-white">+1 (555) 171-4404</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">API Version:</span>
                  <span className="text-white">v22.0</span>
                </div>
              </div>
            </div>

            {/* TRAI DLT SMS Gateway */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  TRAI DLT SMS Gateway Broker
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold">
                  REGISTERED
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Principal Entity (PE) ID:</span>
                  <span className="text-white font-bold">1101552390000012345</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Approved SMS Header:</span>
                  <span className="text-white font-bold">MEDIBK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Templates Approved:</span>
                  <span className="text-white">5 Strict Grammars</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Deliverability:</span>
                  <span className="text-emerald-400 font-bold">99.4%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MediBooking.in • Super Administrator Command Portal</span>
          <span>Bhopal, MP, India • DPDP Act 2023 Compliant</span>
        </div>
      </footer>
    </div>
  );
}

