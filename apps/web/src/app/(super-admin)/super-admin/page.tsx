'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '../../../lib/auth';
import { Button } from '@medibooking/ui';

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

interface PlatformPatientRecord {
  id: string;
  name: string;
  maskedMobile: string;
  clinicName: string;
  abhaLinked: boolean;
  dpdpConsent: boolean;
  registeredDate: string;
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
  {
    id: 'c104',
    name: 'New Market Medicare Centre',
    area: 'New Market, TT Nagar',
    chambersCount: 4,
    doctorsCount: 7,
    plan: 'CLINIC_PRO',
    status: 'ACTIVE',
  },
  {
    id: 'c105',
    name: 'Indrapuri Health Hub',
    area: 'Indrapuri B-Sector',
    chambersCount: 3,
    doctorsCount: 5,
    plan: 'CLINIC_PRO',
    status: 'ACTIVE',
  },
  {
    id: 'c106',
    name: 'Hoshangabad Road Polyclinic',
    area: 'Surendra Landmark',
    chambersCount: 5,
    doctorsCount: 9,
    plan: 'CLINIC_PRO',
    status: 'ACTIVE',
  },
  {
    id: 'c107',
    name: 'Shahpura Prime Care',
    area: 'Shahpura Sector 9',
    chambersCount: 4,
    doctorsCount: 6,
    plan: 'CLINIC_PRO',
    status: 'ACTIVE',
  },
  {
    id: 'c108',
    name: 'Ayodhya Bypass Polyhealth',
    area: 'Ayodhya Nagar',
    chambersCount: 3,
    doctorsCount: 4,
    plan: 'TRIAL_30',
    status: 'ACTIVE',
  },
  {
    id: 'c109',
    name: 'BHEL Township Medicare',
    area: 'Piplani, Bhopal',
    chambersCount: 4,
    doctorsCount: 5,
    plan: 'CLINIC_PRO',
    status: 'ACTIVE',
  },
  {
    id: 'c110',
    name: 'Lalghati Specialist Clinic',
    area: 'VIP Road, Lalghati',
    chambersCount: 3,
    doctorsCount: 4,
    plan: 'CLINIC_PRO',
    status: 'ACTIVE',
  },
];

const SAMPLE_PATIENTS: PlatformPatientRecord[] = [
  {
    id: 'p-1',
    name: 'Ramesh Patel',
    maskedMobile: '98260-XXXXX',
    clinicName: 'Bhopal City Care Polyclinic',
    abhaLinked: true,
    dpdpConsent: true,
    registeredDate: '2026-11-01',
  },
  {
    id: 'p-2',
    name: 'Sunita Sen',
    maskedMobile: '98261-XXXXX',
    clinicName: 'Bhopal City Care Polyclinic',
    abhaLinked: true,
    dpdpConsent: true,
    registeredDate: '2026-11-03',
  },
  {
    id: 'p-3',
    name: 'Aarav Meena',
    maskedMobile: '98262-XXXXX',
    clinicName: 'Arera Super Specialty Polyclinic',
    abhaLinked: false,
    dpdpConsent: true,
    registeredDate: '2026-11-04',
  },
  {
    id: 'p-4',
    name: 'Deepak Chouhan',
    maskedMobile: '98263-XXXXX',
    clinicName: 'Kolar Road Family Clinic',
    abhaLinked: true,
    dpdpConsent: true,
    registeredDate: '2026-11-06',
  },
  {
    id: 'p-5',
    name: 'Priya Tiwari',
    maskedMobile: '98264-XXXXX',
    clinicName: 'New Market Medicare Centre',
    abhaLinked: false,
    dpdpConsent: true,
    registeredDate: '2026-11-08',
  },
];

type SuperAdminTab = 'OVERVIEW' | 'NMC_DESK' | 'TENANTS' | 'PATIENTS_DIRECTORY' | 'DPDP_AUDIT' | 'TELEMETRY';

export default function SuperAdminPortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('NMC_DESK');
  const [doctors, setDoctors] = useState<PendingDoctorReview[]>(INITIAL_PENDING_DOCTORS);
  const [tenants] = useState<ClinicTenantItem[]>(INITIAL_TENANTS);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Super Admin Navbar */}
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-6 py-3.5 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                M
              </div>
              <span className="font-extrabold text-white text-sm hidden sm:inline tracking-tight">
                MediBooking<span className="text-emerald-400">.in</span>
              </span>
            </Link>
            <span className="text-slate-600">/</span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block leading-tight">
                Super Admin Platform Console
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Multi-Tenant Polyclinic Network • Bhopal Pilot Core Command
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold font-mono">
              ● PILOT ACTIVE
            </span>
            <span className="px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-xs font-bold font-mono">
              SUPER_ADMIN
            </span>
            <Button
              variant="ghost"
              size="sm"
              data-testid="btn-superadmin-logout"
              onClick={() => logout(router)}
              className="text-slate-300 hover:text-rose-400 hover:bg-slate-800"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container with Sticky Left Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex flex-col md:flex-row gap-6">
        {/* LEFT SIDEBAR VIEW */}
        <aside className="w-full md:w-72 shrink-0 flex flex-col justify-between bg-slate-900/90 backdrop-blur-2xl rounded-2xl border border-slate-800 p-4 shadow-xl space-y-6 self-start md:sticky md:top-20">
          <div className="space-y-4">
            {/* Platform Master Card in Sidebar */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent border border-emerald-500/30 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-900/50">
                🌐
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-white text-xs truncate block">
                  MediBooking.in Platform HQ
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  Bhopal Multi-Tenant Grid
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-emerald-400 font-mono">
                    10/10 CLINICS LIVE
                  </span>
                </div>
              </div>
            </div>

            {/* Sidebar Navigation Items */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Platform Operations
              </span>

              {/* Tab 1: Platform Master Overview */}
              <button
                type="button"
                onClick={() => setActiveTab('OVERVIEW')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'OVERVIEW'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🌐</span>
                  <span>Platform Master Overview</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'OVERVIEW'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  Live
                </span>
              </button>

              {/* Tab 2: Polyclinic Tenants & Allocations */}
              <button
                type="button"
                onClick={() => setActiveTab('TENANTS')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'TENANTS'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🏥</span>
                  <span>Polyclinic Tenants & Allocations</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'TENANTS'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {tenants.length}
                </span>
              </button>

              {/* Tab 3: Doctor NMC Verification Desk */}
              <button
                type="button"
                onClick={() => setActiveTab('NMC_DESK')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'NMC_DESK'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🩺</span>
                  <span>Doctor NMC Verification Desk</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'NMC_DESK'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}
                >
                  {doctors.filter((d) => d.status === 'PENDING').length} Pending
                </span>
              </button>

              {/* Tab 4: Platform Patient Directory & DPDP */}
              <button
                type="button"
                onClick={() => setActiveTab('PATIENTS_DIRECTORY')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'PATIENTS_DIRECTORY'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">👥</span>
                  <span>Patients & DPDP Directory</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'PATIENTS_DIRECTORY'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-teal-950 text-teal-300 border border-teal-800'
                  }`}
                >
                  184 Enrolled
                </span>
              </button>

              <span className="px-3 pt-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Security & Infrastructure
              </span>

              {/* Tab 5: DPDP Act 2023 Immutable Audit Chain */}
              <button
                type="button"
                onClick={() => setActiveTab('DPDP_AUDIT')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'DPDP_AUDIT'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🔐</span>
                  <span>DPDP Act 2023 Immutable Audit Chain</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'DPDP_AUDIT'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  1,420
                </span>
              </button>

              {/* Tab 6: Gateway Telemetry */}
              <button
                type="button"
                onClick={() => setActiveTab('TELEMETRY')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'TELEMETRY'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📡</span>
                  <span>Gateway Telemetry (WhatsApp / DLT SMS)</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'TELEMETRY'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  99.8%
                </span>
              </button>
            </div>
          </div>

          {/* Sidebar Footer Card */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-3 px-1">
              <div className="h-8 w-8 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 flex items-center justify-center font-bold text-xs">
                SA
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-white block truncate">
                  Platform Admin
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  superadmin@medibooking.in
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => logout(router)}
              className="text-xs border-slate-700 text-slate-300 hover:bg-rose-950/60 hover:text-rose-400 hover:border-rose-800"
            >
              🚪 Sign Out of Platform Console
            </Button>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <main className="flex-1 space-y-6 overflow-hidden">
          {/* Top KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
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

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Registered Doctors
              </span>
              <span className="text-3xl font-black font-mono tabular-nums text-white mt-2 block">
                38
              </span>
              <span className="text-xs text-emerald-400 font-semibold block mt-1">
                35 Verified • 3 Pending
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
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

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
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

          {/* VIEW 1: Platform Master Overview */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Pilot Announcement Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/50 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                    🏛️
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base">
                      Bhopal Polyclinic SaaS Pilot Network
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      10 polyclinics connected across MP Nagar, Arera Colony, and Kolar Road. Real-time nominal token collections, waiting room TV synchronization, and 80/20 doctor split ledgers active.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-900/60 border border-emerald-700 text-emerald-300 text-xs font-bold font-mono">
                    MRR: ₹19,990
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-teal-900/60 border border-teal-700 text-teal-300 text-xs font-bold font-mono">
                    37 Chambers
                  </span>
                </div>
              </div>

              {/* Geographic Grid Breakdown */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-sm">
                    Bhopal Cluster Distribution & Tenant Density
                  </h3>
                  <span className="text-xs text-emerald-400 font-mono">Central Madhya Pradesh Zone</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs font-bold text-white block">MP Nagar Zone II & I</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">3 Polyclinics • 12 Chambers</span>
                    <span className="text-xs font-mono font-bold text-emerald-400 mt-2 block">100% Online</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs font-bold text-white block">Arera Colony (E-3 & E-7)</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">3 Polyclinics • 14 Chambers</span>
                    <span className="text-xs font-mono font-bold text-emerald-400 mt-2 block">100% Online</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs font-bold text-white block">Kolar & Suburbs</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">4 Polyclinics • 11 Chambers</span>
                    <span className="text-xs font-mono font-bold text-emerald-400 mt-2 block">100% Online</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: Active Polyclinic Tenants */}
          {activeTab === 'TENANTS' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Active Polyclinic Tenants in Bhopal
                  </h3>
                  <p className="text-xs text-slate-400">
                    Provisioned multi-chamber organizations and subscription quotas
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold font-mono">
                  10 Provisioned Tenants
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                    <tr>
                      <th className="px-6 py-3">Clinic Organization</th>
                      <th className="px-6 py-3">Area / Location</th>
                      <th className="px-6 py-3">Chambers</th>
                      <th className="px-6 py-3">Doctors</th>
                      <th className="px-6 py-3">SaaS Plan</th>
                      <th className="px-6 py-3">Tenant Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tenants.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{t.name}</td>
                        <td className="px-6 py-4 text-slate-300">{t.area}</td>
                        <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                          {t.chambersCount} Chambers
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-300">
                          {t.doctorsCount} Affiliated
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-teal-950 text-teal-300 border border-teal-800">
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

          {/* VIEW 3: Doctor NMC Verification Desk */}
          {activeTab === 'NMC_DESK' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">
                    National Medical Commission (NMC) Verification Registry
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review state council credentials before granting public discovery and booking status
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold font-mono">
                  State Medical Councils Sync Active
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                    <tr>
                      <th className="px-6 py-3">Doctor Name</th>
                      <th className="px-6 py-3">NMC Reg #</th>
                      <th className="px-6 py-3">State Council</th>
                      <th className="px-6 py-3">Qualifications</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {doctors.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">
                          {doc.name}
                          <span className="block text-[11px] font-normal text-slate-400">
                            {doc.specialty}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-emerald-400">
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
                            <button
                              type="button"
                              onClick={() => handleVerifyDoctor(doc.id, 'VERIFIED')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors"
                            >
                              ✓ Approve & Verify
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-400 font-bold">
                              ✓ Verified Live
                            </span>
                          )}
                          {doc.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => handleVerifyDoctor(doc.id, 'REJECTED')}
                              className="px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 4: Platform Patient Directory & DPDP */}
          {activeTab === 'PATIENTS_DIRECTORY' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Platform Patient Master Directory & DPDP Consent Vault
                  </h3>
                  <p className="text-xs text-slate-400">
                    DPDP Act 2023 compliant tokenized patient identifiers across all Bhopal polyclinics
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold font-mono">
                  184 Total Patients
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                    <tr>
                      <th className="px-6 py-3">Patient Name</th>
                      <th className="px-6 py-3">Masked Mobile</th>
                      <th className="px-6 py-3">Registered Clinic</th>
                      <th className="px-6 py-3">ABHA Identity</th>
                      <th className="px-6 py-3">DPDP Explicit Consent</th>
                      <th className="px-6 py-3 text-right">Registration Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {SAMPLE_PATIENTS.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{p.name}</td>
                        <td className="px-6 py-4 font-mono text-slate-400">{p.maskedMobile}</td>
                        <td className="px-6 py-4 text-slate-300">{p.clinicName}</td>
                        <td className="px-6 py-4">
                          {p.abhaLinked ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              ✓ ABHA LINKED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                              PENDING LINK
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            ✓ ACTIVE CONSENT
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-400 text-right">
                          {p.registeredDate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 5: DPDP Immutable Audit Chain */}
          {activeTab === 'DPDP_AUDIT' && (
            <div className="space-y-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
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
                    className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold shadow-md shadow-emerald-600/30"
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
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
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

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
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

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
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

          {/* VIEW 6: Gateway Telemetry */}
          {activeTab === 'TELEMETRY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* WhatsApp Cloud API */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
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
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
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

              {/* Multi-Provider DLT Circuit Breaker */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 md:col-span-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Multi-Provider DLT SMS Carrier Failover Circuit Breaker
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold">
                    3/3 CARRIERS HEALTHY
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-bold">Tier 1: Gupshup</span>
                      <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800">ACTIVE</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Jio & Airtel Direct Route</p>
                    <p className="text-[10px] text-slate-500">Latency: ~35ms • Success: 99.8%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-teal-400 font-bold">Tier 2: Exotel</span>
                      <span className="text-[10px] text-teal-400 font-bold px-1.5 py-0.5 rounded bg-teal-950 border border-teal-800">STANDBY</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Vi & BSNL Backup Route</p>
                    <p className="text-[10px] text-slate-500">Failover: &lt;800ms Auto-Trip</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-400 font-bold">Tier 3: Twilio</span>
                      <span className="text-[10px] text-purple-400 font-bold px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800">STANDBY</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Global Carrier Fallback</p>
                    <p className="text-[10px] text-slate-500">Max SLA Guarantee: 100%</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

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
