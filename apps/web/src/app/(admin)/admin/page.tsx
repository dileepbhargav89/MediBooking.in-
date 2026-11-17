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
  onboardingStatus?: 'INVITE_SENT' | 'PENDING_NMC' | 'ACTIVE';
  inviteDispatchedAt?: string;
  mobile?: string;
  email?: string;
}

interface ReceptionStaffMember {
  id: string;
  staffId: string;
  fullName: string;
  mobile: string;
  shift: 'MORNING' | 'EVENING' | 'NIGHT' | 'FULL_DAY';
  shiftTimings: string;
  handoverPin: string;
  status: 'ON_DUTY' | 'OFF_DUTY';
  onboardingStatus: 'INVITE_DISPATCHED' | 'ACTIVE_ON_DUTY';
  lastInviteSentAt?: string;
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
    onboardingStatus: 'ACTIVE',
    mobile: '98260-11111',
    email: 'dr.sharma@bhopalcitycare.in',
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
    onboardingStatus: 'ACTIVE',
    mobile: '98261-22222',
    email: 'dr.patel@bhopalcitycare.in',
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
    onboardingStatus: 'ACTIVE',
    mobile: '98262-33333',
    email: 'dr.verma@bhopalcitycare.in',
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
    onboardingStatus: 'ACTIVE',
    mobile: '98263-44444',
    email: 'dr.rao@bhopalcitycare.in',
  },
];

const INITIAL_RECEPTION_STAFF: ReceptionStaffMember[] = [
  {
    id: 'rec-1',
    staffId: 'REC-101',
    fullName: 'Sunita Sahu',
    mobile: '98260-33333',
    shift: 'MORNING',
    shiftTimings: '08:00 AM - 02:00 PM',
    handoverPin: '4821',
    status: 'ON_DUTY',
    onboardingStatus: 'ACTIVE_ON_DUTY',
    lastInviteSentAt: '2026-11-17 07:45 AM',
  },
  {
    id: 'rec-2',
    staffId: 'REC-102',
    fullName: 'Vikram Chouhan',
    mobile: '98261-44444',
    shift: 'EVENING',
    shiftTimings: '02:00 PM - 09:00 PM',
    handoverPin: '7392',
    status: 'OFF_DUTY',
    onboardingStatus: 'INVITE_DISPATCHED',
    lastInviteSentAt: '2026-11-17 01:30 PM',
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
  | 'RECEPTION_STAFF'
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
  const [isChamberQuotaModalOpen, setIsChamberQuotaModalOpen] = useState(false);
  const [chamberAddedToast, setChamberAddedToast] = useState<string | null>(null);

  // Doctor Addition & Onboarding Invitation State
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
  const [isDoctorInviteModalOpen, setIsDoctorInviteModalOpen] = useState(false);
  const [selectedDoctorForInvite, setSelectedDoctorForInvite] = useState<AdminDoctorAffiliation | null>(null);
  const [doctorInviteCopied, setDoctorInviteCopied] = useState(false);
  const [doctorToastNotice, setDoctorToastNotice] = useState<string | null>(null);

  // New Doctor Form State
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorSpecialty, setNewDoctorSpecialty] = useState('Cardiologist');
  const [newDoctorNmc, setNewDoctorNmc] = useState('');
  const [newDoctorChamber, setNewDoctorChamber] = useState('CH-1');
  const [newDoctorFee, setNewDoctorFee] = useState<number>(600);
  const [newDoctorFollowUpFee, setNewDoctorFollowUpFee] = useState<number>(300);
  const [newDoctorMobile, setNewDoctorMobile] = useState('');
  const [newDoctorEmail, setNewDoctorEmail] = useState('');
  const [addDoctorError, setAddDoctorError] = useState<string | null>(null);

  // Reception Staff State
  const [receptionStaff, setReceptionStaff] = useState<ReceptionStaffMember[]>(INITIAL_RECEPTION_STAFF);
  const [isAddReceptionistModalOpen, setIsAddReceptionistModalOpen] = useState(false);
  const [isReceptionInviteModalOpen, setIsReceptionInviteModalOpen] = useState(false);
  const [selectedReceptionistForInvite, setSelectedReceptionistForInvite] = useState<ReceptionStaffMember | null>(null);
  const [receptionInviteCopied, setReceptionInviteCopied] = useState(false);
  const [receptionToastNotice, setReceptionToastNotice] = useState<string | null>(null);

  // New Receptionist Form State
  const [newRecName, setNewRecName] = useState('');
  const [newRecStaffId, setNewRecStaffId] = useState('REC-103');
  const [newRecMobile, setNewRecMobile] = useState('');
  const [newRecShift, setNewRecShift] = useState<'MORNING' | 'EVENING' | 'NIGHT' | 'FULL_DAY'>('MORNING');
  const [newRecPin, setNewRecPin] = useState('5839');
  const [addRecError, setAddRecError] = useState<string | null>(null);

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

  // Phase 9: Self-Service B2B SaaS Plan & Chamber Licensing State
  const [saasPlan, setSaasPlan] = useState({
    tier: 'CLINIC_PRO' as 'STARTER' | 'CLINIC_PRO' | 'ENTERPRISE',
    tierName: 'Clinic Pro Plan',
    monthlyFeeRupees: 1999,
    renewalDateStr: '28 Nov 2026',
    daysRemaining: 14,
    licensedChambers: 4,
    activeChambers: 4,
    status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED' | 'TRIAL',
  });
  const [saasToast, setSaasToast] = useState<{ message: string; type: 'renew' | 'upgrade' | 'invoice' } | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  const handleRenewSaasPlan = () => {
    setSaasPlan((prev) => ({
      ...prev,
      daysRemaining: prev.daysRemaining + 30,
      renewalDateStr: '28 Dec 2026',
    }));
    setSaasToast({
      message: '✓ SaaS Subscription Renewed: +30 Days Extended. Razorpay B2B Order #RZP-SUB-82910 processed.',
      type: 'renew',
    });
    setTimeout(() => setSaasToast(null), 6000);
  };

  const handleUpgradeEnterprise = () => {
    setSaasPlan((prev) => ({
      ...prev,
      tier: 'ENTERPRISE',
      tierName: 'Polyclinic Enterprise',
      monthlyFeeRupees: 4999,
      licensedChambers: 8,
      daysRemaining: 30,
      renewalDateStr: '14 Dec 2026',
    }));
    setSaasToast({
      message: '✓ Upgraded to Polyclinic Enterprise: 8 Chambers unlocked with Multi-Specialty Analytics.',
      type: 'upgrade',
    });
    setTimeout(() => setSaasToast(null), 6000);
  };

  const handleSelectPlan = (tier: 'STARTER' | 'CLINIC_PRO' | 'ENTERPRISE') => {
    if (tier === 'STARTER') {
      setSaasPlan((prev) => ({
        ...prev,
        tier: 'STARTER',
        tierName: 'Starter Clinic',
        monthlyFeeRupees: 999,
        licensedChambers: 2,
      }));
      setSaasToast({
        message: '✓ Switched to Starter Clinic Plan (2 Chambers).',
        type: 'upgrade',
      });
    } else if (tier === 'CLINIC_PRO') {
      setSaasPlan((prev) => ({
        ...prev,
        tier: 'CLINIC_PRO',
        tierName: 'Clinic Pro Plan',
        monthlyFeeRupees: 1999,
        licensedChambers: 4,
      }));
      setSaasToast({
        message: '✓ Switched to Clinic Pro Plan (4 Chambers).',
        type: 'upgrade',
      });
    } else {
      handleUpgradeEnterprise();
      return;
    }
    setTimeout(() => setSaasToast(null), 6000);
  };

  const handleDownloadInvoice = () => {
    setSaasToast({
      message: '✓ GST Tax Invoice #MB-INV-2026-11-042 downloaded successfully (PDF with IRN & QR Code).',
      type: 'invoice',
    });
    setTimeout(() => setSaasToast(null), 6000);
  };

  const handleInitiateAddChamber = () => {
    if (affiliations.length >= saasPlan.licensedChambers) {
      setIsChamberQuotaModalOpen(true);
    } else {
      const newIndex = affiliations.length + 1;
      const newAff: AdminDoctorAffiliation = {
        id: `aff-${newIndex}`,
        doctorId: `d10${newIndex}0000-0000-4000-8000-00000000000${newIndex}`,
        doctorName: 'Dr. Alok Mathur',
        specialty: 'ENT Specialist',
        nmcNumber: 'MP-55102',
        chamberNumber: `CH-${newIndex}`,
        consultationFeeRupees: 500,
        followUpFeeRupees: 250,
        followUpValidityDays: 14,
        isActive: true,
      };
      setAffiliations((prev) => [...prev, newAff]);
      setSaasPlan((prev) => ({ ...prev, activeChambers: prev.activeChambers + 1 }));
      setChamberAddedToast(`✓ Chamber CH-${newIndex} provisioned for Dr. Alok Mathur (ENT Specialist).`);
      setTimeout(() => setChamberAddedToast(null), 6000);
    }
  };

  const handleUpgradeAndAddChamber = () => {
    setSaasPlan((prev) => ({
      ...prev,
      tier: 'ENTERPRISE',
      tierName: 'Polyclinic Enterprise',
      monthlyFeeRupees: 4999,
      licensedChambers: 8,
      activeChambers: 5,
      daysRemaining: 30,
      renewalDateStr: '14 Dec 2026',
    }));

    const newAff: AdminDoctorAffiliation = {
      id: 'aff-5',
      doctorId: 'd1050000-0000-4000-8000-000000000005',
      doctorName: 'Dr. Alok Mathur',
      specialty: 'ENT Specialist',
      nmcNumber: 'MP-55102',
      chamberNumber: 'CH-5',
      consultationFeeRupees: 500,
      followUpFeeRupees: 250,
      followUpValidityDays: 14,
      isActive: true,
    };
    setAffiliations((prev) => [...prev, newAff]);
    setIsChamberQuotaModalOpen(false);
    setChamberAddedToast('✓ Upgraded to Polyclinic Enterprise! Chamber CH-5 provisioned for Dr. Alok Mathur (ENT Specialist).');
    setTimeout(() => setChamberAddedToast(null), 6000);
  };

  const handleAddDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    setAddDoctorError(null);

    if (!newDoctorName.trim() || newDoctorName.trim().length < 3) {
      setAddDoctorError('Doctor full name must be at least 3 characters.');
      return;
    }
    if (!newDoctorNmc.trim()) {
      setAddDoctorError('NMC / State Medical Council Registration number is required.');
      return;
    }
    const cleanMobile = newDoctorMobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setAddDoctorError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    const newId = `aff-${affiliations.length + 1}`;
    const newDocId = `d10${affiliations.length + 1}0000-0000-4000-8000-00000000000${affiliations.length + 1}`;
    const formattedDoctorName = newDoctorName.trim().startsWith('Dr.') ? newDoctorName.trim() : `Dr. ${newDoctorName.trim()}`;

    const newAffiliation: AdminDoctorAffiliation = {
      id: newId,
      doctorId: newDocId,
      doctorName: formattedDoctorName,
      specialty: newDoctorSpecialty,
      nmcNumber: newDoctorNmc.trim(),
      chamberNumber: newDoctorChamber,
      consultationFeeRupees: Number(newDoctorFee) || 600,
      followUpFeeRupees: Number(newDoctorFollowUpFee) || 300,
      followUpValidityDays: 14,
      isActive: true,
      onboardingStatus: 'INVITE_SENT',
      inviteDispatchedAt: 'Just now',
      mobile: cleanMobile,
      email: newDoctorEmail.trim() || undefined,
    };

    setAffiliations((prev) => [...prev, newAffiliation]);
    setIsAddDoctorModalOpen(false);
    setSelectedDoctorForInvite(newAffiliation);
    setIsDoctorInviteModalOpen(true);
    setDoctorToastNotice(`✓ ${formattedDoctorName} added! Onboarding invitation ready.`);
    setTimeout(() => setDoctorToastNotice(null), 4000);

    // Reset form
    setNewDoctorName('');
    setNewDoctorNmc('');
    setNewDoctorMobile('');
    setNewDoctorEmail('');
  };

  const handleOpenDoctorInvite = (doc: AdminDoctorAffiliation) => {
    setSelectedDoctorForInvite(doc);
    setIsDoctorInviteModalOpen(true);
    setDoctorInviteCopied(false);
  };

  const handleAddReceptionist = (e: React.FormEvent) => {
    e.preventDefault();
    setAddRecError(null);

    if (!newRecName.trim() || newRecName.trim().length < 2) {
      setAddRecError('Receptionist full name must be at least 2 characters.');
      return;
    }
    const cleanMobile = newRecMobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setAddRecError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    const cleanPin = newRecPin.replace(/\D/g, '');
    if (cleanPin.length !== 4) {
      setAddRecError('Handover PIN must be exactly 4 numeric digits.');
      return;
    }

    const shiftTimings =
      newRecShift === 'MORNING'
        ? '08:00 AM - 02:00 PM'
        : newRecShift === 'EVENING'
        ? '02:00 PM - 09:00 PM'
        : newRecShift === 'NIGHT'
        ? '09:00 PM - 08:00 AM'
        : '09:00 AM - 08:00 PM';

    const newStaff: ReceptionStaffMember = {
      id: `rec-${receptionStaff.length + 1}`,
      staffId: newRecStaffId.trim() || `REC-${100 + receptionStaff.length + 1}`,
      fullName: newRecName.trim(),
      mobile: cleanMobile,
      shift: newRecShift,
      shiftTimings,
      handoverPin: cleanPin,
      status: 'ON_DUTY',
      onboardingStatus: 'INVITE_DISPATCHED',
      lastInviteSentAt: 'Just now',
    };

    setReceptionStaff((prev) => [...prev, newStaff]);
    setIsAddReceptionistModalOpen(false);
    setSelectedReceptionistForInvite(newStaff);
    setIsReceptionInviteModalOpen(true);
    setReceptionToastNotice(`✓ ${newStaff.fullName} added to front-desk staff! Access invite ready.`);
    setTimeout(() => setReceptionToastNotice(null), 4000);

    // Reset form
    setNewRecName('');
    setNewRecMobile('');
    setNewRecStaffId(`REC-${100 + receptionStaff.length + 2}`);
  };

  const handleOpenReceptionInvite = (staff: ReceptionStaffMember) => {
    setSelectedReceptionistForInvite(staff);
    setIsReceptionInviteModalOpen(true);
    setReceptionInviteCopied(false);
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
      <header className="bg-white/90 backdrop-blur-xl border-b border-emerald-100/80 px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 sticky top-0 z-30 shadow-xs">
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
                data-testid="tab-doctor-affiliations"
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

              {/* Tab 2.5: Front-Desk & Reception Staff */}
              <button
                type="button"
                data-testid="tab-reception-staff"
                onClick={() => setActiveTab('RECEPTION_STAFF')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === 'RECEPTION_STAFF'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                    : 'text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">👩‍💼</span>
                  <span>Reception Staff & Onboarding</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === 'RECEPTION_STAFF'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {receptionStaff.length}
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
              value={`${saasPlan.activeChambers} / ${saasPlan.licensedChambers}`}
              subtitle={saasPlan.tier === 'ENTERPRISE' ? '8 Chamber License' : 'CH-1 through CH-4'}
              accentColor="#10B981"
              badge={{ label: saasPlan.tier === 'ENTERPRISE' ? 'ENTERPRISE 8 CH' : '100% UTILIZED', variant: 'blue' }}
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
              value={saasPlan.status === 'ACTIVE' ? 'Active' : 'Expired'}
              subtitle={`Renews on ${saasPlan.renewalDateStr}`}
              accentColor="#0D9488"
              badge={{ label: saasPlan.tier === 'ENTERPRISE' ? 'ENTERPRISE' : saasPlan.tier === 'STARTER' ? 'STARTER' : 'PRO TIER', variant: 'blue' }}
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

              {/* SaaS Plan & Chamber Licensing Status Card (Phase 9) */}
              <div
                data-testid="card-saas-plan-status"
                className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 text-white shadow-xl border border-emerald-500/30 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        {saasPlan.tierName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-400/20 text-teal-200">
                        RBI Flow A Direct B2B
                      </span>
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                      <span>B2B Polyclinic SaaS Subscription</span>
                    </h3>
                    <p
                      data-testid="text-saas-expiry"
                      className="text-xs text-emerald-200/80 mt-0.5"
                    >
                      ⏳ {saasPlan.daysRemaining} Days Remaining (Renews {saasPlan.renewalDateStr})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      data-testid="btn-renew-saas-plan"
                      onClick={handleRenewSaasPlan}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all transform active:scale-95"
                    >
                      <span>⚡ 1-Click Instant Renewal</span>
                      <span className="font-mono text-[10px] opacity-80">(₹{saasPlan.monthlyFeeRupees.toLocaleString('en-IN')})</span>
                    </button>
                    {saasPlan.tier !== 'ENTERPRISE' && (
                      <button
                        type="button"
                        data-testid="btn-upgrade-enterprise"
                        onClick={handleUpgradeEnterprise}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5 transition-all"
                      >
                        <span>🚀 Upgrade to Enterprise (8 Chambers)</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Active Licensing</span>
                    <span data-testid="text-saas-chambers" className="text-sm font-black text-emerald-300 font-mono">
                      {saasPlan.activeChambers} / {saasPlan.licensedChambers} Chambers Active
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Monthly License Fee</span>
                    <span className="text-sm font-black text-white font-mono">
                      ₹{saasPlan.monthlyFeeRupees.toLocaleString('en-IN')} / mo
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Doctor Rostering</span>
                    <span className="text-sm font-black text-teal-300">
                      Unlimited NMC Profiles
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Compliance</span>
                    <span className="text-sm font-black text-emerald-300">
                      DPDP 2023 Cryptographic
                    </span>
                  </div>
                </div>

                {saasToast && (
                  <div
                    data-testid={
                      saasToast.type === 'renew'
                        ? 'toast-saas-renewed'
                        : saasToast.type === 'upgrade'
                        ? 'toast-saas-upgraded'
                        : 'toast-saas-notice'
                    }
                    className="mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center justify-between animate-fadeIn"
                  >
                    <span>{saasToast.message}</span>
                    <button
                      type="button"
                      onClick={() => setSaasToast(null)}
                      className="text-emerald-300 hover:text-white text-sm font-mono ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Chambers Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                    <span>Chamber Status & Live Queue Intake</span>
                    <span className="text-xs font-normal text-slate-500">
                      ({affiliations.map((a) => a.chamberNumber).join(', ')})
                    </span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="btn-add-chamber"
                      onClick={handleInitiateAddChamber}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <span>➕ Add New Chamber</span>
                    </button>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      ● Real-Time Waiting Room SSE Connected
                    </span>
                  </div>
                </div>

                {chamberAddedToast && (
                  <div
                    data-testid="toast-chamber-added"
                    className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn"
                  >
                    <span>{chamberAddedToast}</span>
                    <button
                      type="button"
                      onClick={() => setChamberAddedToast(null)}
                      className="text-white hover:text-emerald-200 text-sm font-mono ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}

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

                  {/* Chamber 5 (Enterprise) */}
                  {affiliations.some((a) => a.chamberNumber === 'CH-5') && (
                    <div
                      data-testid="chamber-card-ch-5"
                      className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-indigo-200/90 shadow-xs hover:border-indigo-400 transition-colors animate-fadeIn"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-lg font-mono font-black text-xs bg-indigo-100 text-indigo-800 border border-indigo-300">
                            CH-5
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">Dr. Alok Mathur</span>
                            <span className="text-[11px] text-slate-500">ENT Specialist • NMC: MP-55102</span>
                          </div>
                        </div>
                        <Badge variant="mint" size="sm">ACTIVE NOW</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-xl bg-slate-50">
                          <span className="text-[10px] text-slate-500 block">Current Serving</span>
                          <span className="font-mono font-bold text-emerald-700 text-base">Token #05</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50">
                          <span className="text-[10px] text-slate-500 block">Waiting in Lobby</span>
                          <span className="font-mono font-bold text-slate-800 text-base">0 Patients</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50">
                          <span className="text-[10px] text-slate-500 block">Est. Wait</span>
                          <span className="font-mono font-bold text-slate-800 text-base">0 Mins</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: Doctor Affiliations & Chamber Fees */}
          {activeTab === 'AFFILIATIONS' && (
            <div className="space-y-4">
              {doctorToastNotice && (
                <div
                  data-testid="toast-doctor-notice"
                  className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn"
                >
                  <span>{doctorToastNotice}</span>
                  <button
                    type="button"
                    onClick={() => setDoctorToastNotice(null)}
                    className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              <Card className="border-emerald-100/80 shadow-xs">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Clinic-Doctor Affiliation & Onboarding Directory
                      </h3>
                      <p className="text-xs text-slate-500">
                        Add specialist doctors, allocate chambers, configure differential consultation fees, and dispatch onboarding invites.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                        {affiliations.length} Doctors Affiliated
                      </span>
                      <button
                        type="button"
                        data-testid="btn-add-doctor-to-clinic"
                        onClick={() => {
                          setAddDoctorError(null);
                          setIsAddDoctorModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-950/20 transition-colors"
                      >
                        <span>➕</span>
                        <span>Add Doctor to Clinic</span>
                      </button>
                    </div>
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
                          <th className="px-5 py-3">Onboarding Status</th>
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
                                {item.mobile && (
                                  <span className="text-[10px] text-slate-400 block font-mono">
                                    +91 {item.mobile}
                                  </span>
                                )}
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
                                {item.onboardingStatus === 'INVITE_SENT' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    📨 Invite Sent ({item.inviteDispatchedAt || 'Active'})
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ✓ Active in Chamber
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    data-testid={`btn-send-doctor-invite-${item.id}`}
                                    onClick={() => handleOpenDoctorInvite(item)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                    title="Send onboarding link via WhatsApp or Email"
                                  >
                                    <span>📤</span>
                                    <span>Send Invite</span>
                                  </button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEdit(item)}
                                    className="text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                                  >
                                    Edit Fee / Chamber
                                  </Button>
                                </div>
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

          {/* VIEW 2.5: Front-Desk Reception Staff & Shift Operations */}
          {activeTab === 'RECEPTION_STAFF' && (
            <div className="space-y-4">
              {receptionToastNotice && (
                <div
                  data-testid="toast-reception-notice"
                  className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn"
                >
                  <span>{receptionToastNotice}</span>
                  <button
                    type="button"
                    onClick={() => setReceptionToastNotice(null)}
                    className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              <Card className="border-emerald-100/80 shadow-xs">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Front-Desk Reception Staff & Shift Operations
                      </h3>
                      <p className="text-xs text-slate-500">
                        Manage receptionist roster, cashier handover PINs, shift timing allocations, and send direct desk access invites.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                        {receptionStaff.length} Receptionists Enrolled
                      </span>
                      <button
                        type="button"
                        data-testid="btn-add-receptionist"
                        onClick={() => {
                          setAddRecError(null);
                          setIsAddReceptionistModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-950/20 transition-colors"
                      >
                        <span>➕</span>
                        <span>Add Receptionist</span>
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-emerald-50/50 border-b border-emerald-100 uppercase text-[10px] font-bold text-slate-600">
                        <tr>
                          <th className="px-5 py-3">Staff ID</th>
                          <th className="px-5 py-3">Receptionist Name</th>
                          <th className="px-5 py-3">Mobile (+91)</th>
                          <th className="px-5 py-3">Assigned Shift</th>
                          <th className="px-5 py-3">Handover PIN</th>
                          <th className="px-5 py-3">Duty Status</th>
                          <th className="px-5 py-3">Onboarding Status</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {receptionStaff.map((staff) => (
                          <tr key={staff.id} className="hover:bg-emerald-50/30 transition-colors">
                            <td className="px-5 py-3.5 font-mono font-bold text-slate-800">
                              {staff.staffId}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-slate-900">
                              {staff.fullName}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-slate-600">
                              +91 {staff.mobile}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                                {staff.shift} ({staff.shiftTimings})
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-slate-600 font-bold tracking-widest">
                              •••• {staff.handoverPin}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  staff.status === 'ON_DUTY'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {staff.status === 'ON_DUTY' ? '● On Duty' : '○ Off Duty'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                                {staff.onboardingStatus === 'INVITE_DISPATCHED'
                                  ? `📨 Invite Sent (${staff.lastInviteSentAt || 'Active'})`
                                  : '✓ Active on Desk'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                type="button"
                                data-testid={`btn-send-reception-invite-${staff.id}`}
                                onClick={() => handleOpenReceptionInvite(staff)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                title="Send reception desk login link & PIN via WhatsApp"
                              >
                                <span>📤</span>
                                <span>Send Invite</span>
                              </button>
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

          {/* VIEW 6: SaaS Subscription Billing & Self-Service Upgrades */}
          {activeTab === 'BILLING' && (
            <div className="space-y-6">
              {/* Active Subscription Summary Banner */}
              <Card className="p-6 border-emerald-100/80 shadow-xs bg-white/90 backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-slate-900">
                        B2B SaaS Subscription (RBI Flow A Direct)
                      </h3>
                      <Badge variant="mint" size="sm">
                        {saasPlan.tierName.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Compliant RBI Payment Aggregator Architecture • Platform SaaS Licensing • Next Renewal: {saasPlan.renewalDateStr} ({saasPlan.daysRemaining} days left)
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">Monthly SaaS Fee</span>
                      <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                        ₹{saasPlan.monthlyFeeRupees.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-500 block">+ 18% GST (₹{(saasPlan.monthlyFeeRupees * 0.18).toFixed(2)})</span>
                    </div>
                    <button
                      type="button"
                      data-testid="btn-renew-saas-plan"
                      onClick={handleRenewSaasPlan}
                      className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                    >
                      <span>⚡ Instant Renewal</span>
                    </button>
                  </div>
                </div>

                {saasToast && (
                  <div
                    data-testid={
                      saasToast.type === 'renew'
                        ? 'toast-saas-renewed'
                        : saasToast.type === 'upgrade'
                        ? 'toast-saas-upgraded'
                        : 'toast-saas-notice'
                    }
                    className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between"
                  >
                    <span>{saasToast.message}</span>
                    <button
                      type="button"
                      onClick={() => setSaasToast(null)}
                      className="text-emerald-700 hover:text-emerald-950 font-mono ml-2 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Billing Cycle Selector */}
                <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Change Subscription Tier</h4>
                    <p className="text-xs text-slate-500">Scale licensed chambers up or down instantly without data loss</p>
                  </div>

                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      data-testid="btn-cycle-monthly"
                      onClick={() => setSelectedBillingCycle('MONTHLY')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedBillingCycle === 'MONTHLY'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Monthly Billing
                    </button>
                    <button
                      type="button"
                      data-testid="btn-cycle-annual"
                      onClick={() => setSelectedBillingCycle('ANNUAL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        selectedBillingCycle === 'ANNUAL'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Annual Billing</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded">Save 20%</span>
                    </button>
                  </div>
                </div>

                {/* 3 Tier Interactive Plan Switcher */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  {/* Tier 1: Starter */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    saasPlan.tier === 'STARTER'
                      ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900">Starter Clinic</span>
                      {saasPlan.tier === 'STARTER' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">Current</span>
                      )}
                    </div>
                    <div className="mb-3">
                      <span className="text-2xl font-black text-slate-900 font-mono">
                        ₹{selectedBillingCycle === 'ANNUAL' ? '799' : '999'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium"> / mo</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 mb-4">
                      <li className="flex items-center gap-1.5">✓ Up to 2 Chambers (CH-1..CH-2)</li>
                      <li className="flex items-center gap-1.5">✓ 1 Front-Desk Receptionist</li>
                      <li className="flex items-center gap-1.5">✓ Standard Token Slip Engine</li>
                      <li className="flex items-center gap-1.5 text-slate-400">✗ Waiting Room TV Stream</li>
                    </ul>
                    <button
                      type="button"
                      data-testid="btn-select-starter"
                      disabled={saasPlan.tier === 'STARTER'}
                      onClick={() => handleSelectPlan('STARTER')}
                      className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                        saasPlan.tier === 'STARTER'
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {saasPlan.tier === 'STARTER' ? 'Current Plan' : 'Downgrade to Starter'}
                    </button>
                  </div>

                  {/* Tier 2: Clinic Pro (Current Default) */}
                  <div className={`p-4 rounded-xl border relative transition-all ${
                    saasPlan.tier === 'CLINIC_PRO'
                      ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/30 shadow-md'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900">Clinic Pro</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white">Most Popular</span>
                    </div>
                    <div className="mb-3">
                      <span className="text-2xl font-black text-slate-900 font-mono">
                        ₹{selectedBillingCycle === 'ANNUAL' ? '1,599' : '1,999'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium"> / mo</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 mb-4">
                      <li className="flex items-center gap-1.5 font-semibold text-slate-800">✓ Up to 4 Chambers (CH-1..CH-4)</li>
                      <li className="flex items-center gap-1.5">✓ Unlimited NMC Doctor Master</li>
                      <li className="flex items-center gap-1.5">✓ Waiting Room TV Live SSE</li>
                      <li className="flex items-center gap-1.5">✓ WhatsApp Cloud Alerts</li>
                      <li className="flex items-center gap-1.5">✓ Doctor 80/20 NEFT CMS</li>
                    </ul>
                    <button
                      type="button"
                      data-testid="btn-select-pro"
                      disabled={saasPlan.tier === 'CLINIC_PRO'}
                      onClick={() => handleSelectPlan('CLINIC_PRO')}
                      className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                        saasPlan.tier === 'CLINIC_PRO'
                          ? 'bg-emerald-600 text-white shadow-xs cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {saasPlan.tier === 'CLINIC_PRO' ? 'Active Plan' : 'Switch to Pro'}
                    </button>
                  </div>

                  {/* Tier 3: Polyclinic Enterprise */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    saasPlan.tier === 'ENTERPRISE'
                      ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-600/30 shadow-md'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900">Polyclinic Enterprise</span>
                      {saasPlan.tier === 'ENTERPRISE' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">Current</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">Scale</span>
                      )}
                    </div>
                    <div className="mb-3">
                      <span className="text-2xl font-black text-slate-900 font-mono">
                        ₹{selectedBillingCycle === 'ANNUAL' ? '3,999' : '4,999'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium"> / mo</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 mb-4">
                      <li className="flex items-center gap-1.5 font-bold text-indigo-900">✓ Up to 8 Chambers (CH-1..CH-8)</li>
                      <li className="flex items-center gap-1.5 font-semibold text-slate-800">✓ Multi-Shift Two-Witness Cashier</li>
                      <li className="flex items-center gap-1.5">✓ Cross-Specialty Utilization Heatmap</li>
                      <li className="flex items-center gap-1.5">✓ Section 194J Automated TDS Filing</li>
                      <li className="flex items-center gap-1.5">✓ Dedicated WhatsApp Priority SLA</li>
                    </ul>
                    <button
                      type="button"
                      data-testid="btn-select-enterprise"
                      disabled={saasPlan.tier === 'ENTERPRISE'}
                      onClick={() => handleSelectPlan('ENTERPRISE')}
                      className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                        saasPlan.tier === 'ENTERPRISE'
                          ? 'bg-indigo-600 text-white shadow-xs cursor-default'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                      }`}
                    >
                      {saasPlan.tier === 'ENTERPRISE' ? 'Active Enterprise Plan' : '🚀 Upgrade to Enterprise'}
                    </button>
                  </div>
                </div>

                {/* Gateway Metadata */}
                <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500 font-mono">
                    Billing Gateway: Razorpay B2B Flow A • Mandate ID: mand_bhopal_pro_99182 • RBI Tokenized
                  </span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    ✓ Next Auto-Debit: {saasPlan.renewalDateStr}
                  </span>
                </div>
              </Card>

              {/* Past GST Invoices Ledger */}
              <Card className="p-6 border-emerald-100/80 shadow-xs bg-white/90 backdrop-blur-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Past Tax Invoices & GST B2B Input Credit</h3>
                    <p className="text-xs text-slate-500">Official GST compliant tax receipts with IRN and QR code</p>
                  </div>
                  <button
                    type="button"
                    data-testid="btn-download-gst-invoice"
                    onClick={handleDownloadInvoice}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>⬇ Download Latest GST Invoice</span>
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">Invoice Number</th>
                        <th className="py-2.5 px-3">Billing Period</th>
                        <th className="py-2.5 px-3">Plan Tier</th>
                        <th className="py-2.5 px-3 text-right">Base Fee</th>
                        <th className="py-2.5 px-3 text-right">GST (18%)</th>
                        <th className="py-2.5 px-3 text-right font-bold text-slate-900">Total Paid</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">MB-INV-2026-11-042</td>
                        <td className="py-2.5 px-3 text-slate-600">28 Oct 2026 - 28 Nov 2026</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">Clinic Pro Plan</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹1,999.00</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">₹359.82</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹2,358.82</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">PAID</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">MB-INV-2026-10-038</td>
                        <td className="py-2.5 px-3 text-slate-600">28 Sep 2026 - 28 Oct 2026</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">Clinic Pro Plan</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹1,999.00</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">₹359.82</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹2,358.82</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">PAID</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
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

      {/* 1. Add Doctor to Clinic Modal */}
      <Modal
        isOpen={isAddDoctorModalOpen}
        onClose={() => setIsAddDoctorModalOpen(false)}
        title="Add Specialist Doctor to Clinic"
        subtitle="Onboard practitioner, map chamber, and generate onboarding invitation link"
      >
        <form onSubmit={handleAddDoctor} className="space-y-4" data-testid="modal-add-doctor">
          {addDoctorError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              ⚠️ {addDoctorError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Doctor Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Alok Mathur"
              value={newDoctorName}
              onChange={(e) => setNewDoctorName(e.target.value)}
              data-testid="input-doctor-name"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Medical Specialty *
              </label>
              <select
                value={newDoctorSpecialty}
                onChange={(e) => setNewDoctorSpecialty(e.target.value)}
                data-testid="select-doctor-specialty"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="General Physician">General Physician</option>
                <option value="Cardiologist">Cardiologist</option>
                <option value="Dermatologist">Dermatologist</option>
                <option value="Pediatrician">Pediatrician</option>
                <option value="Orthopedic Surgeon">Orthopedic Surgeon</option>
                <option value="ENT Specialist">ENT Specialist</option>
                <option value="Neurologist">Neurologist</option>
                <option value="Gynecologist">Gynecologist</option>
                <option value="Ophthalmologist">Ophthalmologist</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                NMC / State Reg # *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MP-68201"
                value={newDoctorNmc}
                onChange={(e) => setNewDoctorNmc(e.target.value)}
                data-testid="input-doctor-nmc"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Assigned Chamber *
              </label>
              <select
                value={newDoctorChamber}
                onChange={(e) => setNewDoctorChamber(e.target.value)}
                data-testid="select-doctor-chamber"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="CH-1">CH-1</option>
                <option value="CH-2">CH-2</option>
                <option value="CH-3">CH-3</option>
                <option value="CH-4">CH-4</option>
                <option value="CH-5">CH-5</option>
                <option value="CH-6">CH-6</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Consultation Fee (₹)
              </label>
              <input
                type="number"
                min={100}
                step={50}
                required
                value={newDoctorFee}
                onChange={(e) => setNewDoctorFee(Number(e.target.value))}
                data-testid="input-doctor-fee"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Follow-up Fee (₹)
              </label>
              <input
                type="number"
                min={0}
                step={50}
                required
                value={newDoctorFollowUpFee}
                onChange={(e) => setNewDoctorFollowUpFee(Number(e.target.value))}
                data-testid="input-doctor-followup-fee"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Doctor Mobile (+91) *
              </label>
              <input
                type="tel"
                required
                placeholder="98260 55555"
                value={newDoctorMobile}
                onChange={(e) => setNewDoctorMobile(e.target.value)}
                data-testid="input-doctor-mobile"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Doctor Email (Optional)
              </label>
              <input
                type="email"
                placeholder="doctor@clinic.in"
                value={newDoctorEmail}
                onChange={(e) => setNewDoctorEmail(e.target.value)}
                data-testid="input-doctor-email"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="md"
              data-testid="btn-save-new-doctor"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              ➕ Save Doctor & Prepare Onboarding Invite
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsAddDoctorModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Doctor Onboarding Invite Dispatch Modal */}
      {selectedDoctorForInvite && (
        <Modal
          isOpen={isDoctorInviteModalOpen}
          onClose={() => setIsDoctorInviteModalOpen(false)}
          title="Send Doctor Onboarding Invitation"
          subtitle={`Invite ${selectedDoctorForInvite.doctorName} to complete profile & schedule`}
        >
          <div className="space-y-4" data-testid="modal-doctor-invite">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span className="text-sm">{selectedDoctorForInvite.doctorName}</span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-200 text-emerald-900">
                  {selectedDoctorForInvite.chamberNumber}
                </span>
              </div>
              <div className="text-slate-600 flex items-center gap-3">
                <span>{selectedDoctorForInvite.specialty}</span>
                <span>•</span>
                <span className="font-mono">NMC: {selectedDoctorForInvite.nmcNumber}</span>
                <span>•</span>
                <span className="font-mono font-bold text-emerald-700">₹{selectedDoctorForInvite.consultationFeeRupees} Fee</span>
              </div>
              {selectedDoctorForInvite.mobile && (
                <div className="text-[11px] text-slate-500 font-mono">
                  Doctor Mobile: +91 {selectedDoctorForInvite.mobile}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Choose Invitation Dispatch Channel:
              </span>

              {/* Channel 1: WhatsApp */}
              <a
                href={`https://wa.me/91${(selectedDoctorForInvite.mobile || '9826011111').replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Hello ${selectedDoctorForInvite.doctorName}! You have been invited to join Bhopal City Care Polyclinic as ${selectedDoctorForInvite.specialty} in ${selectedDoctorForInvite.chamberNumber}. Complete your doctor onboarding and profile verification here: ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/doctor?clinicId=c101&doctorId=${selectedDoctorForInvite.doctorId}&chamber=${selectedDoctorForInvite.chamberNumber}`
                )}`}
                target="_blank"
                rel="noreferrer"
                data-testid="btn-whatsapp-doctor-invite"
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span>📱</span>
                <span>Send WhatsApp Onboarding Link</span>
              </a>

              {/* Channel 2: Copy 1-Click Link */}
              <button
                type="button"
                data-testid="btn-copy-doctor-invite-link"
                onClick={() => {
                  const link = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/doctor?clinicId=c101&doctorId=${selectedDoctorForInvite.doctorId}&chamber=${selectedDoctorForInvite.chamberNumber}`;
                  navigator.clipboard.writeText(link);
                  setDoctorInviteCopied(true);
                  setTimeout(() => setDoctorInviteCopied(false), 3000);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>🔗</span>
                <span>{doctorInviteCopied ? '✓ Link Copied to Clipboard!' : 'Copy 1-Click Onboarding Token Link'}</span>
              </button>

              {/* Channel 3: Email Invite */}
              <button
                type="button"
                data-testid="btn-email-doctor-invite"
                onClick={() => {
                  setDoctorToastNotice(`✓ Official email invitation dispatched to ${selectedDoctorForInvite.email || selectedDoctorForInvite.doctorName}!`);
                  setIsDoctorInviteModalOpen(false);
                  setTimeout(() => setDoctorToastNotice(null), 4000);
                }}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>✉️</span>
                <span>Send Official Onboarding Email</span>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="btn-close-doctor-invite"
                onClick={() => setIsDoctorInviteModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Add Receptionist Staff Modal */}
      <Modal
        isOpen={isAddReceptionistModalOpen}
        onClose={() => setIsAddReceptionistModalOpen(false)}
        title="Add Front-Desk Receptionist"
        subtitle="Enroll front-desk staff, allocate shift timings, and configure 4-digit handover PIN"
      >
        <form onSubmit={handleAddReceptionist} className="space-y-4" data-testid="modal-add-receptionist">
          {addRecError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              ⚠️ {addRecError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Receptionist Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pooja Sharma"
                value={newRecName}
                onChange={(e) => setNewRecName(e.target.value)}
                data-testid="input-receptionist-name"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Staff ID Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. REC-103"
                value={newRecStaffId}
                onChange={(e) => setNewRecStaffId(e.target.value)}
                data-testid="input-receptionist-staff-id"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Mobile Number (+91) *
              </label>
              <input
                type="tel"
                required
                placeholder="98260 77777"
                value={newRecMobile}
                onChange={(e) => setNewRecMobile(e.target.value)}
                data-testid="input-receptionist-mobile"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Cashier Handover PIN (4-Digits) *
              </label>
              <input
                type="text"
                maxLength={4}
                required
                placeholder="4-digit PIN (e.g. 5839)"
                value={newRecPin}
                onChange={(e) => setNewRecPin(e.target.value)}
                data-testid="input-receptionist-pin"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-widest text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Assigned Shift Timing *
            </label>
            <select
              value={newRecShift}
              onChange={(e) => setNewRecShift(e.target.value as any)}
              data-testid="select-receptionist-shift"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="MORNING">Morning Shift (08:00 AM - 02:00 PM)</option>
              <option value="EVENING">Evening Shift (02:00 PM - 09:00 PM)</option>
              <option value="NIGHT">Night / Emergency Shift (09:00 PM - 08:00 AM)</option>
              <option value="FULL_DAY">Full Day General Shift (09:00 AM - 08:00 PM)</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="md"
              data-testid="btn-save-new-receptionist"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              ➕ Save Receptionist & Prepare Access Invite
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsAddReceptionistModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Receptionist Access Invite Dispatch Modal */}
      {selectedReceptionistForInvite && (
        <Modal
          isOpen={isReceptionInviteModalOpen}
          onClose={() => setIsReceptionInviteModalOpen(false)}
          title="Send Reception Desk Access Invite"
          subtitle={`Provide ${selectedReceptionistForInvite.fullName} login access & handover PIN`}
        >
          <div className="space-y-4" data-testid="modal-reception-invite">
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span className="text-sm">{selectedReceptionistForInvite.fullName}</span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-teal-200 text-teal-900 font-bold">
                  {selectedReceptionistForInvite.staffId}
                </span>
              </div>
              <div className="text-slate-600 flex items-center gap-3">
                <span>{selectedReceptionistForInvite.shift} Shift</span>
                <span>•</span>
                <span className="font-mono">{selectedReceptionistForInvite.shiftTimings}</span>
              </div>
              <div className="text-[11px] text-teal-900 font-mono font-bold">
                Cashier Handover PIN: {selectedReceptionistForInvite.handoverPin}
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Choose Access Dispatch Channel:
              </span>

              {/* Channel 1: WhatsApp */}
              <a
                href={`https://wa.me/91${(selectedReceptionistForInvite.mobile || '9826033333').replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Welcome ${selectedReceptionistForInvite.fullName}! You have been registered as Front-Desk Receptionist at Bhopal City Care Polyclinic (${selectedReceptionistForInvite.shiftTimings}). Access Central Reception Desk: ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/receptionist?clinicId=c101 | Staff ID: ${selectedReceptionistForInvite.staffId} | Cashier Handover PIN: ${selectedReceptionistForInvite.handoverPin}`
                )}`}
                target="_blank"
                rel="noreferrer"
                data-testid="btn-whatsapp-reception-invite"
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span>📱</span>
                <span>Send WhatsApp Desk Access Slip</span>
              </a>

              {/* Channel 2: Copy 1-Click Link */}
              <button
                type="button"
                data-testid="btn-copy-reception-link"
                onClick={() => {
                  const link = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/receptionist?clinicId=c101&staffId=${selectedReceptionistForInvite.staffId}`;
                  navigator.clipboard.writeText(link);
                  setReceptionInviteCopied(true);
                  setTimeout(() => setReceptionInviteCopied(false), 3000);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>🔗</span>
                <span>{receptionInviteCopied ? '✓ Desk Link Copied!' : 'Copy Central Reception Link'}</span>
              </button>

              {/* Channel 3: Email Access Credentials */}
              <button
                type="button"
                data-testid="btn-email-reception-invite"
                onClick={() => {
                  setReceptionToastNotice(`✓ Desk access credentials emailed to ${selectedReceptionistForInvite.fullName}!`);
                  setIsReceptionInviteModalOpen(false);
                  setTimeout(() => setReceptionToastNotice(null), 4000);
                }}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>✉️</span>
                <span>Email Desk Credentials & PIN</span>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="btn-close-reception-invite"
                onClick={() => setIsReceptionInviteModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Polyclinic Hardware Diagnostics Modal */}
      <HardwareDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        clinicName="Bhopal City Care Polyclinic"
      />

      {/* SaaS Chamber Quota Gating Modal */}
      <Modal
        isOpen={isChamberQuotaModalOpen}
        onClose={() => setIsChamberQuotaModalOpen(false)}
        title="Chamber License Quota Reached"
        subtitle="B2B SaaS Plan Restriction • Polyclinic Tier Gating"
      >
        <div data-testid="modal-chamber-quota-exceeded" className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <span className="text-sm">⚠️</span>
              <span>Quota Cap Reached: {saasPlan.activeChambers} of {saasPlan.licensedChambers} Chambers in Use</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Your polyclinic is currently licensed under the <strong className="text-amber-950">{saasPlan.tierName}</strong> (capped at {saasPlan.licensedChambers} active chambers). Adding Chamber CH-5 requires upgrading to the <strong className="text-amber-950">Polyclinic Enterprise Plan</strong>.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Tier</span>
              <span className="font-black text-slate-800 text-sm block mt-0.5">{saasPlan.tierName}</span>
              <span className="font-mono text-slate-600 text-xs block mt-1">₹{saasPlan.monthlyFeeRupees.toLocaleString('en-IN')}/mo</span>
              <span className="text-[11px] text-slate-500 block mt-2">✓ Max {saasPlan.licensedChambers} Chambers</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-300 relative overflow-hidden">
              <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-600 text-white">Recommended</span>
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Upgrade To</span>
              <span className="font-black text-emerald-950 text-sm block mt-0.5">Polyclinic Enterprise</span>
              <span className="font-mono text-emerald-700 text-xs font-bold block mt-1">₹4,999/mo</span>
              <span className="text-[11px] text-emerald-800 font-semibold block mt-2">✓ 8 Chambers (+4 Unlocked)</span>
              <span className="text-[11px] text-emerald-800 font-semibold block">✓ Multi-Chamber TV Matrix</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="primary"
              fullWidth
              size="md"
              data-testid="btn-quota-upgrade-enterprise"
              onClick={handleUpgradeAndAddChamber}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold"
            >
              🚀 Upgrade to Enterprise & Provision CH-5
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              data-testid="btn-cancel-quota-modal"
              onClick={() => setIsChamberQuotaModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Footer */}
      <footer className="bg-white/90 backdrop-blur-md border-t border-emerald-100/80 py-3.5 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">CityCare Polyclinic Admin Console</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-semibold">Tier: Growth (4/4 Chambers Provisioned)</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Section 194J Automated TDS</span>
            <span>•</span>
            <span>Daily 80/20 Payouts</span>
            <span>•</span>
            <span>MP Nagar Zone-II, Bhopal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
