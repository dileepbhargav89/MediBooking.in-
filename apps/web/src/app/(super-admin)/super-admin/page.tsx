'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '../../../lib/auth';
import { Button } from '@medibooking/ui';
import {
  NetworkOPDMetrics,
  DoctorRevenueShareRecord,
  ChamberUtilizationHeatmap,
  Section194JQuarterlySummary,
} from '@medibooking/types';

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

const INITIAL_NETWORK_METRICS: NetworkOPDMetrics = {
  totalClinicsLive: 10,
  activeChambersCount: 32,
  totalChambersCount: 37,
  totalConsultationsToday: 248,
  avgWaitTimeMinutes: 14,
  totalRevenueToday: 148800,
  cashCollections: 59520,
  upiCollections: 89280,
  networkOccupancyRate: 86.5,
};

const INITIAL_DOCTOR_LEDGER: DoctorRevenueShareRecord[] = [
  {
    id: 'payout-sharma-01',
    doctorId: 'doc-sharma-cardio',
    doctorName: 'Dr. Rajesh Sharma',
    clinicId: 'clinic-bhopal-city-care',
    clinicName: 'Bhopal City Care Polyclinic',
    totalConsultations: 24,
    grossConsultationFee: 14400,
    doctorShare80: 11520,
    clinicShare20: 2880,
    tdsDeductionSection194J: 1152,
    netPayableToDoctor: 10368,
    payoutStatus: 'PENDING',
    bankAccountMasked: 'HDFC Bank •••• 4819',
    ifscCode: 'HDFC0000042',
  },
  {
    id: 'payout-patel-02',
    doctorId: 'doc-patel-derma',
    doctorName: 'Dr. Priya Patel',
    clinicId: 'clinic-arera-super',
    clinicName: 'Arera Super Specialty Polyclinic',
    totalConsultations: 18,
    grossConsultationFee: 10800,
    doctorShare80: 8640,
    clinicShare20: 2160,
    tdsDeductionSection194J: 864,
    netPayableToDoctor: 7776,
    payoutStatus: 'PENDING',
    bankAccountMasked: 'ICICI Bank •••• 7721',
    ifscCode: 'ICIC0001004',
  },
  {
    id: 'payout-singh-03',
    doctorId: 'doc-singh-neuro',
    doctorName: 'Dr. Vikramaditya Singh',
    clinicId: 'clinic-kolar-family',
    clinicName: 'Kolar Road Family Clinic',
    totalConsultations: 20,
    grossConsultationFee: 16000,
    doctorShare80: 12800,
    clinicShare20: 3200,
    tdsDeductionSection194J: 1280,
    netPayableToDoctor: 11520,
    payoutStatus: 'PENDING',
    bankAccountMasked: 'Axis Bank •••• 5590',
    ifscCode: 'UTIB0000128',
  },
  {
    id: 'payout-sen-04',
    doctorId: 'doc-sen-gynae',
    doctorName: 'Dr. Ananya Sen',
    clinicId: 'clinic-bhopal-city-care',
    clinicName: 'Bhopal City Care Polyclinic',
    totalConsultations: 15,
    grossConsultationFee: 9000,
    doctorShare80: 7200,
    clinicShare20: 1800,
    tdsDeductionSection194J: 720,
    netPayableToDoctor: 6480,
    payoutStatus: 'DISBURSED',
    bankAccountMasked: 'SBI •••• 9012',
    ifscCode: 'SBIN0001234',
    disbursedAt: '2026-11-13T18:30:00Z',
    utrReference: 'UTR-HDFC-20261113-984210',
  },
];

const INITIAL_CHAMBER_HEATMAPS: ChamberUtilizationHeatmap[] = [
  {
    clinicId: 'clinic-bhopal-city-care',
    clinicName: 'Bhopal City Care Polyclinic',
    chamberNumber: 'CH-1',
    chamberName: 'Consultation Suite 1 (Cardiology)',
    utilizationPercentage: 92,
    hourlySlots: [
      { hour: '09:00', isOccupied: true, doctorName: 'Dr. Rajesh Sharma', specialty: 'Cardiology' },
      { hour: '10:00', isOccupied: true, doctorName: 'Dr. Rajesh Sharma', specialty: 'Cardiology' },
      { hour: '11:00', isOccupied: true, doctorName: 'Dr. Rajesh Sharma', specialty: 'Cardiology' },
      { hour: '12:00', isOccupied: true, doctorName: 'Dr. Rajesh Sharma', specialty: 'Cardiology' },
      { hour: '13:00', isOccupied: true, doctorName: 'Dr. Rajesh Sharma', specialty: 'Cardiology' },
      { hour: '14:00', isOccupied: false, idleOpportunityNote: 'Lunch / Sanitization Break' },
      { hour: '15:00', isOccupied: false, idleOpportunityNote: 'Afternoon Vacancy: Available for visiting consultant' },
      { hour: '16:00', isOccupied: false, idleOpportunityNote: 'Afternoon Vacancy: Available for visiting consultant' },
      { hour: '17:00', isOccupied: true, doctorName: 'Dr. Rajesh Sharma', specialty: 'Cardiology' },
      { hour: '18:00', isOccupied: true, doctorName: 'Dr. Rajesh Sharma', specialty: 'Cardiology' },
      { hour: '19:00', isOccupied: true, doctorName: 'Dr. Rajesh Sharma', specialty: 'Cardiology' },
    ],
  },
  {
    clinicId: 'clinic-bhopal-city-care',
    clinicName: 'Bhopal City Care Polyclinic',
    chamberNumber: 'CH-2',
    chamberName: 'Consultation Suite 2 (Multi-Specialty)',
    utilizationPercentage: 58,
    hourlySlots: [
      { hour: '09:00', isOccupied: true, doctorName: 'Dr. Ananya Sen', specialty: 'Gynaecology' },
      { hour: '10:00', isOccupied: true, doctorName: 'Dr. Ananya Sen', specialty: 'Gynaecology' },
      { hour: '11:00', isOccupied: true, doctorName: 'Dr. Ananya Sen', specialty: 'Gynaecology' },
      { hour: '12:00', isOccupied: true, doctorName: 'Dr. Ananya Sen', specialty: 'Gynaecology' },
      { hour: '13:00', isOccupied: false, idleOpportunityNote: 'Idle Gap' },
      { hour: '14:00', isOccupied: false, idleOpportunityNote: 'CH-2 Idle (14:00 - 17:00): Sublease Opportunity for Paediatrician' },
      { hour: '15:00', isOccupied: false, idleOpportunityNote: 'CH-2 Idle (14:00 - 17:00): Sublease Opportunity for Paediatrician' },
      { hour: '16:00', isOccupied: false, idleOpportunityNote: 'CH-2 Idle (14:00 - 17:00): Sublease Opportunity for Paediatrician' },
      { hour: '17:00', isOccupied: false, idleOpportunityNote: 'Evening Vacancy' },
      { hour: '18:00', isOccupied: true, doctorName: 'Dr. Amit Verma', specialty: 'General Medicine' },
      { hour: '19:00', isOccupied: true, doctorName: 'Dr. Amit Verma', specialty: 'General Medicine' },
    ],
  },
  {
    clinicId: 'clinic-arera-super',
    clinicName: 'Arera Super Specialty Polyclinic',
    chamberNumber: 'CH-3',
    chamberName: 'Dermatology & Cosmetology Suite',
    utilizationPercentage: 85,
    hourlySlots: [
      { hour: '09:00', isOccupied: true, doctorName: 'Dr. Priya Patel', specialty: 'Dermatology' },
      { hour: '10:00', isOccupied: true, doctorName: 'Dr. Priya Patel', specialty: 'Dermatology' },
      { hour: '11:00', isOccupied: true, doctorName: 'Dr. Priya Patel', specialty: 'Dermatology' },
      { hour: '12:00', isOccupied: true, doctorName: 'Dr. Priya Patel', specialty: 'Dermatology' },
      { hour: '13:00', isOccupied: false, idleOpportunityNote: 'Sanitization Break' },
      { hour: '14:00', isOccupied: false, idleOpportunityNote: 'Break' },
      { hour: '15:00', isOccupied: true, doctorName: 'Dr. Priya Patel', specialty: 'Dermatology' },
      { hour: '16:00', isOccupied: true, doctorName: 'Dr. Priya Patel', specialty: 'Dermatology' },
      { hour: '17:00', isOccupied: true, doctorName: 'Dr. Priya Patel', specialty: 'Dermatology' },
      { hour: '18:00', isOccupied: true, doctorName: 'Dr. Priya Patel', specialty: 'Dermatology' },
      { hour: '19:00', isOccupied: true, doctorName: 'Dr. Priya Patel', specialty: 'Dermatology' },
    ],
  },
];

const INITIAL_SECTION194J_SUMMARY: Section194JQuarterlySummary = {
  financialYear: '2026-27',
  quarter: 'Q3',
  totalGrossDisbursed: 1245000,
  totalTdsDeducted10Percent: 124500,
  form16ACertificatesCount: 38,
  tanNumber: 'BPLM01294F',
  complianceStatus: 'COMPLIANT',
  filingDueDate: '2027-01-31',
};

type SuperAdminTab = 'OVERVIEW' | 'SAAS_BI' | 'NMC_DESK' | 'TENANTS' | 'PATIENTS_DIRECTORY' | 'DPDP_AUDIT' | 'TELEMETRY';

export default function SuperAdminPortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('NMC_DESK');
  const [doctors, setDoctors] = useState<PendingDoctorReview[]>(INITIAL_PENDING_DOCTORS);
  const [tenants] = useState<ClinicTenantItem[]>(INITIAL_TENANTS);
  const [isChainVerifying, setIsChainVerifying] = useState(false);
  const [chainVerifyNotice, setChainVerifyNotice] = useState<string | null>(null);

  const [networkMetrics, setNetworkMetrics] = useState<NetworkOPDMetrics>(INITIAL_NETWORK_METRICS);
  const [doctorLedger, setDoctorLedger] = useState<DoctorRevenueShareRecord[]>(INITIAL_DOCTOR_LEDGER);
  const [chamberHeatmaps, setChamberHeatmaps] = useState<ChamberUtilizationHeatmap[]>(INITIAL_CHAMBER_HEATMAPS);
  const [taxReport, setTaxReport] = useState<Section194JQuarterlySummary>(INITIAL_SECTION194J_SUMMARY);
  const [isDisbursing, setIsDisbursing] = useState(false);
  const [payoutBatchResult, setPayoutBatchResult] = useState<any | null>(null);
  const [isGeneratingTax, setIsGeneratingTax] = useState(false);
  const [taxGeneratedNotice, setTaxGeneratedNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:4000/api/v1/saas/network-metrics')
      .then((res) => res.json())
      .then((d) => {
        if (d.success && d.metrics) setNetworkMetrics(d.metrics);
      })
      .catch((e) => console.error(e));

    fetch('http://127.0.0.1:4000/api/v1/saas/doctor-ledger')
      .then((res) => res.json())
      .then((d) => {
        if (d.success && d.ledger) setDoctorLedger(d.ledger);
      })
      .catch((e) => console.error(e));

    fetch('http://127.0.0.1:4000/api/v1/saas/chamber-utilization')
      .then((res) => res.json())
      .then((d) => {
        if (d.success && d.heatmaps) setChamberHeatmaps(d.heatmaps);
      })
      .catch((e) => console.error(e));

    fetch('http://127.0.0.1:4000/api/v1/saas/tax/section-194j-report')
      .then((res) => res.json())
      .then((d) => {
        if (d.success && d.report) setTaxReport(d.report);
      })
      .catch((e) => console.error(e));
  }, []);

  const handleBatchDisburse = async () => {
    setIsDisbursing(true);
    try {
      const res = await fetch('http://127.0.0.1:4000/api/v1/saas/doctor-ledger/batch-disburse', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setPayoutBatchResult(data);
        setDoctorLedger((prev) =>
          prev.map((r) =>
            r.payoutStatus === 'PENDING'
              ? {
                  ...r,
                  payoutStatus: 'DISBURSED',
                  disbursedAt: new Date().toISOString(),
                  utrReference: `UTR-HDFC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-CMS`,
                }
              : r
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDisbursing(false);
    }
  };

  const handleGenerateForm16A = () => {
    setIsGeneratingTax(true);
    setTaxGeneratedNotice(null);
    setTimeout(() => {
      setIsGeneratingTax(false);
      setTaxGeneratedNotice(
        '✓ Form 16A TDS Certificates (38 Doctors) & ITNS-281 Challan Batch Zip Generated Successfully for Q3 FY 2026-27.'
      );
    }, 600);
  };

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

              {/* Tab: Network OPD BI & 80/20 Revenue */}
              <button
                type="button"
                data-testid="sidebar-btn-saas-bi"
                onClick={() => setActiveTab('SAAS_BI')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'SAAS_BI'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📊</span>
                  <span>Network OPD & 80/20 Revenue</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'SAAS_BI'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  ₹1.48L Today
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

              {/* Tab 7: Review Moderation & Defamation Shield */}
              <Link href="/super-admin/reviews" className="block">
                <button
                  type="button"
                  data-testid="sidebar-btn-reviews"
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all text-slate-300 hover:bg-slate-800/80 hover:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">⭐</span>
                    <span>Review Moderation & Defamation</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                    Defamation Shield
                  </span>
                </button>
              </Link>
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

              {/* Live Network OPD Command Teaser */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-emerald-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-white">Network OPD Real-Time Velocity & Revenue Engine</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {networkMetrics.totalConsultationsToday} Consultations Today • ₹{networkMetrics.totalRevenueToday.toLocaleString('en-IN')} Total Collections (60% UPI, 40% Cash) • 80/20 Doctor Disbursals Ready
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab('SAAS_BI')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold shadow-md shadow-emerald-600/30 shrink-0"
                >
                  Open BI & Revenue Engine ↗
                </Button>
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

          {/* VIEW: Network OPD BI & 80/20 Revenue */}
          {activeTab === 'SAAS_BI' && (
            <div className="space-y-6" data-testid="network-opd-command-center">
              {/* Header Strip */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/70 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-500/20">
                    📊
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-base">
                        Network-Wide OPD Command Center & SaaS Engine
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold font-mono">
                        ● LIVE CLUSTER SYNC
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Real-time cross-polyclinic OPD velocity, automated 80/20 doctor ledger disbursals, chamber idle optimization, and Section 194J TDS compliance.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-emerald-900/60 border border-emerald-700 text-emerald-300 text-xs font-bold font-mono">
                    10/10 Clinics Live
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-teal-900/60 border border-teal-700 text-teal-300 text-xs font-bold font-mono">
                    86.5% Occupancy
                  </span>
                </div>
              </div>

              {/* 4 Multi-Clinic OPD Velocity KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Metric 1: Live Clinics & Chambers */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Network Capacity
                  </span>
                  <span data-testid="metric-clinics-live" className="text-2xl font-black font-mono tabular-nums text-white mt-1.5 block">
                    {networkMetrics.totalClinicsLive} / 10 Clinics Live
                  </span>
                  <span data-testid="metric-active-chambers" className="text-xs text-emerald-400 font-semibold block mt-1">
                    {networkMetrics.activeChambersCount} / {networkMetrics.totalChambersCount} Active Chambers
                  </span>
                </div>

                {/* Metric 2: Consultations Today */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    OPD Footfall
                  </span>
                  <span data-testid="metric-consultations-today" className="text-2xl font-black font-mono tabular-nums text-white mt-1.5 block">
                    {networkMetrics.totalConsultationsToday} Consultations
                  </span>
                  <span data-testid="metric-avg-wait-time" className="text-xs text-teal-400 font-semibold block mt-1">
                    Avg Wait Time: {networkMetrics.avgWaitTimeMinutes} mins
                  </span>
                </div>

                {/* Metric 3: Total Collections */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Revenue Today
                  </span>
                  <span data-testid="metric-total-revenue" className="text-2xl font-black font-mono tabular-nums text-emerald-400 mt-1.5 block">
                    ₹{networkMetrics.totalRevenueToday.toLocaleString('en-IN')}
                  </span>
                  <span data-testid="metric-collections-split" className="text-[11px] text-slate-300 font-semibold block mt-1 truncate">
                    Cash ₹{networkMetrics.cashCollections.toLocaleString('en-IN')} (40%) • UPI ₹{networkMetrics.upiCollections.toLocaleString('en-IN')} (60%)
                  </span>
                </div>

                {/* Metric 4: SaaS Net Yield (20%) */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Clinic 20% Net Yield
                  </span>
                  <span className="text-2xl font-black font-mono tabular-nums text-teal-400 mt-1.5 block">
                    ₹{(networkMetrics.totalRevenueToday * 0.2).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold block mt-1">
                    100% Reconciled
                  </span>
                </div>
              </div>

              {/* SECTION: Automated Doctor Revenue Ledger & 80/20 Payout Disbursal */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5" data-testid="doctor-revenue-ledger-section">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      Automated Doctor Revenue Ledger & 80/20 Payout Disbursal
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automated 80/20 split between visiting consultants and clinic facilities with 10% Section 194J TDS deductions and HDFC/ICICI NEFT CMS batch payment export.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    data-testid="batch-disburse-btn"
                    isLoading={isDisbursing}
                    onClick={handleBatchDisburse}
                    className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold shadow-md shadow-emerald-600/30 shrink-0"
                  >
                    ⚡ Disburse All via HDFC/ICICI NEFT CMS
                  </Button>
                </div>

                {/* Disburse Success Alert Banner */}
                {payoutBatchResult && (
                  <div
                    data-testid="payout-success-banner"
                    className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-600 text-emerald-200 text-xs space-y-2 shadow-lg"
                  >
                    <div className="flex items-center justify-between font-bold text-emerald-300">
                      <span className="flex items-center gap-2">
                        <span>✓</span>
                        <span>Bank NEFT CMS Batch Payout Disbursal Executed Successfully</span>
                      </span>
                      <span className="font-mono text-[11px] bg-emerald-900/80 px-2.5 py-0.5 rounded border border-emerald-700">
                        Batch Ref: {payoutBatchResult.batchId}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-emerald-300/90 pt-1">
                      <div>Total Disbursed: <span className="font-bold text-white">₹{payoutBatchResult.totalDisbursedAmount?.toLocaleString('en-IN')}</span></div>
                      <div>Doctors Disbursed: <span className="font-bold text-white">{payoutBatchResult.disbursedCount} Consultants</span></div>
                      <div>CMS File: <span className="font-bold text-white truncate">{payoutBatchResult.cmsFileName}</span></div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-800/60 text-[10px]">
                      <span className="font-mono text-emerald-400/80 truncate">
                        SHA-256 Hash: {payoutBatchResult.fileHashSha256}
                      </span>
                      <button
                        type="button"
                        data-testid="download-cms-file-btn"
                        onClick={() => alert(`Downloaded ${payoutBatchResult.cmsFileName} for HDFC/ICICI corporate banking upload.`)}
                        className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-bold tracking-tight"
                      >
                        📥 Download .enc File
                      </button>
                    </div>
                  </div>
                )}

                {/* Ledger Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 border-b border-slate-800 uppercase text-[10px] font-bold text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Consultant / Clinic</th>
                        <th className="px-4 py-3">OPD Visits</th>
                        <th className="px-4 py-3">Gross Fee</th>
                        <th className="px-4 py-3 text-emerald-400">Doctor 80%</th>
                        <th className="px-4 py-3 text-teal-400">Clinic 20%</th>
                        <th className="px-4 py-3 text-amber-400">Sec 194J TDS (10%)</th>
                        <th className="px-4 py-3 text-white font-bold">Net Payable</th>
                        <th className="px-4 py-3">Bank A/c & IFSC</th>
                        <th className="px-4 py-3 text-right">Payout Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {doctorLedger.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-sans">
                            <span className="font-bold text-white block">{record.doctorName}</span>
                            <span className="text-[10px] text-slate-400 block font-sans">{record.clinicName}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-300 font-bold">{record.totalConsultations}</td>
                          <td className="px-4 py-3 text-slate-300">₹{record.grossConsultationFee.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-bold text-emerald-400">₹{record.doctorShare80.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-teal-300">₹{record.clinicShare20.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-amber-300">-₹{record.tdsDeductionSection194J.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-bold text-white text-xs">₹{record.netPayableToDoctor.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-slate-400 text-[10px] font-sans">
                            <span className="text-white block font-mono">{record.bankAccountMasked}</span>
                            <span className="text-slate-500 font-mono">IFSC: {record.ifscCode}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {record.payoutStatus === 'DISBURSED' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 inline-block">
                                ✓ DISBURSED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 inline-block animate-pulse">
                                ● PENDING
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION: Chamber Idle Time Minimization Heatmap */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4" data-testid="chamber-utilization-section">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      Chamber Idle Time Minimization & Sublease Optimization
                    </h3>
                    <p className="text-xs text-slate-400">
                      Hourly chamber occupancy heatmaps across Bhopal clinics to detect afternoon lull vacancies and optimize facility monetization.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold font-mono">
                    3 Chambers Audited
                  </span>
                </div>

                {/* Actionable Sublease Optimization Alert */}
                <div
                  data-testid="chamber-idle-alert"
                  className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-700/80 text-amber-200 text-xs flex items-start gap-3 shadow-sm"
                >
                  <span className="text-base shrink-0 mt-0.5">💡</span>
                  <div>
                    <span className="font-bold text-amber-100 block">
                      Sublease Optimization Opportunity: Chamber CH-2 is vacant between 2:00 PM and 5:00 PM (14:00 - 17:00)
                    </span>
                    <p className="text-[11px] text-amber-300/90 mt-0.5 leading-relaxed">
                      High patient demand for Paediatrics & Sonology in MP Nagar Zone II during afternoon hours. Subleasing this chamber to visiting consultants can recover approximately <strong className="text-white">₹18,000/month</strong> in idle facility revenue.
                    </p>
                  </div>
                </div>

                {/* Heatmap Cards */}
                <div className="space-y-3">
                  {chamberHeatmaps.map((chamber) => (
                    <div key={chamber.chamberNumber} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-800 font-mono font-bold text-emerald-400 text-[11px]">
                            {chamber.chamberNumber}
                          </span>
                          <span className="font-bold text-white">{chamber.chamberName}</span>
                          <span className="text-slate-400 text-[11px]">({chamber.clinicName})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">Utilization:</span>
                          <span className={`font-mono font-bold text-xs ${chamber.utilizationPercentage >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {chamber.utilizationPercentage}%
                          </span>
                        </div>
                      </div>

                      {/* Hourly Grid */}
                      <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 pt-1">
                        {chamber.hourlySlots.map((slot) => (
                          <div
                            key={slot.hour}
                            title={slot.isOccupied ? `${slot.doctorName} (${slot.specialty})` : slot.idleOpportunityNote || 'Vacant'}
                            className={`p-1.5 rounded-lg border text-center transition-all ${
                              slot.isOccupied
                                ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-amber-700/60'
                            }`}
                          >
                            <span className="font-mono text-[10px] block font-semibold">{slot.hour}</span>
                            <span className="text-[9px] font-bold block truncate mt-0.5">
                              {slot.isOccupied ? '✓ In-Use' : 'Idle'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: Section 194J Quarterly TDS Tax Compliance & Form 16A Generator */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4" data-testid="section-194j-tax-section">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      Section 194J Quarterly TDS Tax Compliance (Form 16A)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Statutory 10% tax deduction on professional fees for visiting medical consultants under Indian Income Tax Act 1961.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    data-testid="generate-form16a-btn"
                    isLoading={isGeneratingTax}
                    onClick={handleGenerateForm16A}
                    className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold shadow-md shadow-emerald-600/30 shrink-0"
                  >
                    📄 Generate Quarterly Form 16A ZIP & ITNS-281
                  </Button>
                </div>

                {taxGeneratedNotice && (
                  <div
                    data-testid="form16a-generated-banner"
                    className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-600 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-md"
                  >
                    <span className="font-bold">{taxGeneratedNotice}</span>
                    <button
                      type="button"
                      onClick={() => alert('Downloading Form_16A_Q3_FY2026-27_Consortium.zip')}
                      className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0"
                    >
                      📥 Download ZIP
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Financial Quarter</span>
                    <span className="text-sm font-bold text-white mt-1 block">FY {taxReport.financialYear} ({taxReport.quarter})</span>
                    <span className="text-[10px] text-emerald-400 block mt-1">Due: {taxReport.filingDueDate}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Consortium TAN</span>
                    <span className="text-sm font-bold text-teal-300 mt-1 block">{taxReport.tanNumber}</span>
                    <span className="text-[10px] text-slate-400 block mt-1">Bhopal Polyclinics</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Total Gross Disbursed</span>
                    <span className="text-sm font-bold text-white mt-1 block">₹{taxReport.totalGrossDisbursed.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-slate-400 block mt-1">38 Doctors Audited</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">TDS Deducted (10%)</span>
                    <span className="text-sm font-bold text-amber-400 mt-1 block">₹{taxReport.totalTdsDeducted10Percent.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-emerald-400 block mt-1">✓ {taxReport.complianceStatus}</span>
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
