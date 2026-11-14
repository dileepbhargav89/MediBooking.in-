'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Badge, Modal, Input } from '@medibooking/ui';
import {
  PatientFamilyMember,
  CaregiverProfile,
  HealthRecordDocument,
  WaitTimeRating,
} from '@medibooking/types';

// Pre-seeded Bhopal Caregiver & Family Data
const INITIAL_CAREGIVER: CaregiverProfile = {
  id: 'pat-ramesh-38',
  primaryMobile: '9826011111',
  fullName: 'Ramesh Kumar',
  abhaId: '91-4820-9182-3901',
  abhaAddress: 'ramesh.kumar@abdm',
  isAbhaVerified: true,
  familyMembersCount: 4,
};

const INITIAL_MEMBERS: PatientFamilyMember[] = [
  {
    id: 'fam-ramesh-self',
    caregiverId: 'pat-ramesh-38',
    fullName: 'Ramesh Kumar',
    relationship: 'SELF',
    ageYears: 42,
    gender: 'MALE',
    bloodGroup: 'B_POSITIVE',
    knownAllergies: [],
    chronicConditions: ['Pre-hypertension'],
    isAbhaLinked: true,
    abhaId: '91-4820-9182-3901',
    hasExplicitDpdpConsent: true,
  },
  {
    id: 'fam-kailash-father',
    caregiverId: 'pat-ramesh-38',
    fullName: 'Kailash Prasad',
    relationship: 'FATHER',
    ageYears: 74,
    gender: 'MALE',
    bloodGroup: 'O_POSITIVE',
    knownAllergies: ['Penicillin', 'Sulfa drugs'],
    chronicConditions: ['Type 2 Diabetes', 'Hypertension', 'Osteoarthritis'],
    isAbhaLinked: true,
    abhaId: '91-2849-1029-4829',
    hasExplicitDpdpConsent: true,
  },
  {
    id: 'fam-savitri-mother',
    caregiverId: 'pat-ramesh-38',
    fullName: 'Savitri Devi',
    relationship: 'MOTHER',
    ageYears: 68,
    gender: 'FEMALE',
    bloodGroup: 'A_POSITIVE',
    knownAllergies: ['Aspirin'],
    chronicConditions: ['Hypothyroidism'],
    isAbhaLinked: false,
    hasExplicitDpdpConsent: true,
  },
  {
    id: 'fam-pooja-spouse',
    caregiverId: 'pat-ramesh-38',
    fullName: 'Pooja Kumar',
    relationship: 'SPOUSE',
    ageYears: 39,
    gender: 'FEMALE',
    bloodGroup: 'B_POSITIVE',
    knownAllergies: [],
    chronicConditions: [],
    isAbhaLinked: true,
    abhaId: '91-9921-3948-2019',
    hasExplicitDpdpConsent: true,
  },
];

const INITIAL_HEALTH_RECORDS: HealthRecordDocument[] = [
  {
    id: 'rec-rx-kailash-01',
    patientId: 'fam-kailash-father',
    patientName: 'Kailash Prasad',
    caregiverId: 'pat-ramesh-38',
    documentType: 'PRESCRIPTION',
    title: 'Quarterly Cardiovascular & Diabetes Management',
    doctorName: 'Dr. Rajesh Sharma',
    doctorSpecialty: 'Cardiology',
    clinicName: 'Bhopal City Care Polyclinic',
    visitDate: '2026-11-12',
    diagnoses: ['Essential Hypertension (I10)', 'Type 2 Diabetes Mellitus', 'Dyslipidemia'],
    medicationsSummary: ['Tab. Telma 40 (Telmisartan)', 'Tab. Metformin 500mg SR', 'Tab. Atorva 10 (Atorvastatin)'],
    fileUrl: '/mock-vault/prescription-kailash-nov2026.pdf',
    fhirBundleJson: '{"resourceType":"Bundle","type":"document","entry":[{"resource":{"resourceType":"MedicationRequest"}}]}',
    isSignedByDoctor: true,
  },
  {
    id: 'rec-rx-savitri-02',
    patientId: 'fam-savitri-mother',
    patientName: 'Savitri Devi',
    caregiverId: 'pat-ramesh-38',
    documentType: 'LAB_REPORT',
    title: 'Thyroid Function Test (TSH, Free T3, Free T4)',
    doctorName: 'Dr. Amit Verma',
    doctorSpecialty: 'General Medicine',
    clinicName: 'Bhopal City Care Polyclinic',
    visitDate: '2026-11-05',
    diagnoses: ['Hypothyroidism Evaluation'],
    medicationsSummary: ['Thyronorm 50mcg'],
    fileUrl: '/mock-vault/lab-report-savitri-nov2026.pdf',
    isSignedByDoctor: true,
  },
];

type PatientDashboardTab = 'FAMILY' | 'VAULT' | 'REVIEWS' | 'LIVE_QUEUE';

export default function UnifiedPatientDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PatientDashboardTab>('FAMILY');
  const [caregiver] = useState<CaregiverProfile>(INITIAL_CAREGIVER);
  const [members, setMembers] = useState<PatientFamilyMember[]>(INITIAL_MEMBERS);
  const [healthRecords] = useState<HealthRecordDocument[]>(INITIAL_HEALTH_RECORDS);

  // Review State
  const [rating, setRating] = useState<number>(5);
  const [waitTime, setWaitTime] = useState<WaitTimeRating>('ACCURATE');
  const [reviewComment, setReviewComment] = useState('Excellent consultation with Dr. Sharma. Pre-recorded vitals saved consultation time.');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Add Family Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState<'CHILD' | 'SPOUSE' | 'PARENT' | 'OTHER'>('CHILD');
  const [newMemberAge, setNewMemberAge] = useState<number>(10);
  const [newMemberGender, setNewMemberGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');

  // ABHA Modal State
  const [isAbhaModalOpen, setIsAbhaModalOpen] = useState(false);
  const [selectedMemberForAbha, setSelectedMemberForAbha] = useState<PatientFamilyMember | null>(null);
  const [abhaGeneratedNotice, setAbhaGeneratedNotice] = useState<string | null>(null);

  // Sync with API if reachable
  useEffect(() => {
    fetch('http://127.0.0.1:4000/api/v1/patients/pat-ramesh-38/family')
      .then((res) => res.json())
      .then((d) => {
        if (d.success && d.members && d.members.length > 0) {
          setMembers(d.members);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const newMember: PatientFamilyMember = {
      id: `fam-member-${Date.now()}`,
      caregiverId: caregiver.id,
      fullName: newMemberName.trim(),
      relationship: newMemberRelation,
      ageYears: Number(newMemberAge) || 12,
      gender: newMemberGender,
      knownAllergies: [],
      chronicConditions: [],
      isAbhaLinked: false,
      hasExplicitDpdpConsent: true,
    };

    setMembers((prev) => [...prev, newMember]);
    setNewMemberName('');
    setIsAddModalOpen(false);
  };

  const handleTriggerAbhaLink = (member: PatientFamilyMember) => {
    setSelectedMemberForAbha(member);
    setIsAbhaModalOpen(true);
    setAbhaGeneratedNotice(null);
  };

  const handleConfirmAbhaLink = () => {
    if (!selectedMemberForAbha) return;
    const generatedAbha = `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    setMembers((prev) =>
      prev.map((m) =>
        m.id === selectedMemberForAbha.id
          ? { ...m, isAbhaLinked: true, abhaId: generatedAbha }
          : m
      )
    );

    setAbhaGeneratedNotice(`✓ Ayushman Bharat Digital Health Card Created & Linked: ${generatedAbha}`);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/40 text-slate-900 flex flex-col justify-between pb-20 md:pb-8">
      {/* Top Navbar */}
      <header className="bg-white/90 backdrop-blur-2xl border-b border-emerald-100/90 px-6 py-3.5 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-600/20">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  MediBooking<span className="text-emerald-600">.in</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  Patient Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Longitudinal Family Records, ABHA M1 & Verified Consultations
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/doctors">
              <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl border-emerald-200 text-emerald-900 hover:bg-emerald-50">
                🩺 Find Doctors
              </Button>
            </Link>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="h-8 w-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                RK
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold block leading-tight">{caregiver.fullName}</span>
                <span className="text-[10px] text-slate-500 block">{caregiver.primaryMobile}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6 flex-1">
        {/* Caregiver Account Overview Strip */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-emerald-500/30 shrink-0">
              👤
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-black text-white">{caregiver.fullName} Family Healthcare Hub</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                  ✓ DPDP ACT 2023 COMPLIANT
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Primary Account • Linked ABHA: <strong className="text-white font-mono">{caregiver.abhaId}</strong> ({caregiver.abhaAddress})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="btn-add-family-member"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
            >
              <span>+ Add Family Member</span>
            </button>
            <Link
              href="/doctors"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20"
            >
              Book Specialist ↗
            </Link>
          </div>
        </div>

        {/* Tab Switcher Header */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto" data-testid="patient-portal-tabs">
          <button
            type="button"
            data-testid="tab-btn-family"
            onClick={() => setActiveTab('FAMILY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'FAMILY'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>👥</span>
            <span>Family Profiles ({members.length})</span>
          </button>

          <button
            type="button"
            data-testid="tab-btn-vault"
            onClick={() => setActiveTab('VAULT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'VAULT'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>📁</span>
            <span>Health Vault ({healthRecords.length} Records)</span>
          </button>

          <button
            type="button"
            data-testid="tab-btn-reviews"
            onClick={() => setActiveTab('REVIEWS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'REVIEWS'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>⭐</span>
            <span>Doctor Feedback & Reviews</span>
          </button>

          <button
            type="button"
            data-testid="tab-btn-queue"
            onClick={() => setActiveTab('LIVE_QUEUE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'LIVE_QUEUE'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>🎟️</span>
            <span>Live Token & Queue Tracker</span>
          </button>
        </div>

        {/* TAB 1: Family Healthcare Profiles */}
        {activeTab === 'FAMILY' && (
          <div className="space-y-4" data-testid="section-family-profiles">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">Family Healthcare Profiles & Dependents</h2>
                <p className="text-xs text-slate-500">
                  Manage medical history, ABHA health IDs, and 1-click appointment booking for your dependents.
                </p>
              </div>
              <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {members.length} Registered Members
              </span>
            </div>

            {/* Family Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="family-members-grid">
              {members.map((member) => (
                <div
                  key={member.id}
                  data-testid={`family-card-${member.id}`}
                  className="p-5 rounded-2xl bg-white/95 border border-slate-200 shadow-sm hover:border-emerald-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{member.fullName}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {member.relationship}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        {member.ageYears} Years • {member.gender} {member.bloodGroup ? `• Blood Group: ${member.bloodGroup.replace('_', ' ')}` : ''}
                      </span>
                    </div>

                    {member.isAbhaLinked ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold font-mono">
                        ✓ ABHA LINKED
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleTriggerAbhaLink(member)}
                        className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 text-[10px] font-bold transition-colors"
                      >
                        + Link ABHA ID
                      </button>
                    )}
                  </div>

                  {/* ABHA Number Display */}
                  {member.isAbhaLinked && member.abhaId && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 text-[11px]">ABHA: {member.abhaId}</span>
                      <span className="text-[10px] text-emerald-700 font-bold">ABDM M1 Active</span>
                    </div>
                  )}

                  {/* Chronic Conditions & Allergies */}
                  <div className="space-y-1.5 pt-1 text-xs">
                    {member.chronicConditions && member.chronicConditions.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400">Conditions:</span>
                        {member.chronicConditions.map((cond) => (
                          <span key={cond} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200">
                            {cond}
                          </span>
                        ))}
                      </div>
                    )}

                    {member.knownAllergies && member.knownAllergies.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-rose-500">Allergies:</span>
                        {member.knownAllergies.map((allergy) => (
                          <span key={allergy} className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                            ⚠️ {allergy}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <span>✓</span>
                      <span>DPDP Consent Granted</span>
                    </span>
                    <Link
                      href={`/dr/dr-rajesh-sharma-cardio?patientId=${member.id}&name=${encodeURIComponent(member.fullName)}`}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      Book for {member.fullName.split(' ')[0]} ↗
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Digital Health Vault */}
        {activeTab === 'VAULT' && (
          <div className="space-y-4" data-testid="section-health-vault">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">Family Digital Health Vault</h2>
                <p className="text-xs text-slate-500">
                  Tamper-evident longitudinal prescriptions, lab reports, and FHIR R4 standard health record bundles.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
                FHIR R4 Bundle Standard
              </span>
            </div>

            {/* Health Records List */}
            <div className="space-y-3" data-testid="health-records-list">
              {healthRecords.map((record) => (
                <div
                  key={record.id}
                  data-testid={`health-record-card-${record.id}`}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-lg">
                        {record.documentType === 'PRESCRIPTION' ? '💊' : '🔬'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{record.title}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {record.documentType}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          Patient: <strong className="text-slate-800">{record.patientName}</strong> • Prescribed by {record.doctorName} ({record.clinicName})
                        </span>
                      </div>
                    </div>

                    <span className="text-xs text-slate-400 font-mono self-start sm:self-auto">
                      Date: {record.visitDate}
                    </span>
                  </div>

                  {/* Medications Summary */}
                  {record.medicationsSummary && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 font-mono">
                      <span className="text-[10px] text-slate-400 font-sans block font-bold">Prescribed Generic Formulations:</span>
                      <div className="flex flex-wrap gap-2">
                        {record.medicationsSummary.map((med) => (
                          <span key={med} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-medium">
                            {med}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <span>✓</span>
                      <span>Digitally Signed under IT Act 2000 (SHA-256 Valid)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid="btn-download-fhir-bundle"
                        onClick={() => alert(`Downloaded FHIR R4 JSON for ${record.patientName}`)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold"
                      >
                        📄 Export FHIR JSON
                      </button>
                      <button
                        type="button"
                        data-testid="btn-download-rx-pdf"
                        onClick={() => alert(`Downloading official prescription PDF for ${record.patientName}`)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      >
                        📥 Download Signed PDF
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Doctor Reviews & Feedback */}
        {activeTab === 'REVIEWS' && (
          <div className="max-w-2xl mx-auto space-y-4" data-testid="section-patient-reviews">
            <div className="text-center space-y-1 pb-2">
              <h2 className="text-lg font-black text-slate-900">Rate Your Consultation with Dr. Rajesh Sharma</h2>
              <p className="text-xs text-slate-500">
                Verified Feedback for Consultation Token #10 • Bhopal City Care Polyclinic
              </p>
            </div>

            {reviewSubmitted ? (
              <div
                data-testid="review-submitted-banner"
                className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-2"
              >
                <span className="text-3xl block">🎉</span>
                <h3 className="font-bold text-emerald-900 text-base">Thank You for Your Feedback!</h3>
                <p className="text-xs text-emerald-800">
                  Your verified patient story has been published to Dr. Rajesh Sharma&apos;s public profile.
                </p>
                <button
                  type="button"
                  onClick={() => setReviewSubmitted(false)}
                  className="text-xs font-bold text-emerald-700 underline mt-2"
                >
                  Submit Another Feedback
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
                {/* 5-Star Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">Overall Experience Rating:</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        data-testid={`star-btn-${star}`}
                        onClick={() => setRating(star)}
                        className="text-3xl hover:scale-110 transition-transform"
                      >
                        {star <= rating ? '⭐' : '☆'}
                      </button>
                    ))}
                    <span className="text-xs font-bold text-emerald-700 ml-2" data-testid="rating-label">
                      {rating === 5 ? '⭐⭐⭐⭐⭐ Excellent' : `${rating} Stars`}
                    </span>
                  </div>
                </div>

                {/* Wait Time Accuracy */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">How Accurate Was the Wait Time?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'ACCURATE', label: 'On-Time / Minimal Wait' },
                      { id: 'MODERATE_DELAY', label: '10-15 Min Delay' },
                      { id: 'VERY_LONG', label: 'Significant Wait' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setWaitTime(opt.id as WaitTimeRating)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          waitTime === opt.id
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback Comment */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Detailed Patient Story:</label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Describe your consultation experience..."
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  data-testid="btn-submit-review"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 text-xs shadow-md shadow-emerald-600/30"
                >
                  ✓ Submit Verified Consultation Review
                </Button>
              </form>
            )}
          </div>
        )}

        {/* TAB 4: Live Queue & Token Tracker */}
        {activeTab === 'LIVE_QUEUE' && (
          <div className="max-w-xl mx-auto space-y-4" data-testid="section-live-queue">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-700">Real-Time Queue Active</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">Bhopal City Care Polyclinic</span>
              </div>

              {/* Token Number Display */}
              <div className="text-center py-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Your Consultation Token</span>
                <div className="text-5xl font-black font-mono text-emerald-950" data-testid="live-token-number">#14</div>
                <span className="text-xs text-slate-600 block">Kailash Prasad (Patient) • Chamber CH-1</span>
              </div>

              {/* Queue Status */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-sans">Now In Chamber</span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5 block">Token #11</span>
                  <span className="text-[10px] text-slate-500">Dr. Rajesh Sharma</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-sans">Estimated Wait</span>
                  <span className="text-lg font-bold text-emerald-700 mt-0.5 block">~24 mins</span>
                  <span className="text-[10px] text-slate-500">3 Patients Ahead</span>
                </div>
              </div>

              {/* Clinic Directions Link */}
              <a
                href="https://maps.google.com/?q=MP+Nagar+Zone+II+Bhopal"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <span>📍 Get Clinic Directions on Google Maps</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Mobile-First Sticky Bottom Navigation Bar (< md viewports) */}
      <nav
        data-testid="mobile-patient-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-slate-200 px-4 py-2 flex items-center justify-around md:hidden shadow-lg"
      >
        <Link href="/" className="flex flex-col items-center gap-0.5 text-slate-600 hover:text-emerald-700">
          <span className="text-base">🏠</span>
          <span className="text-[9px] font-bold">Home</span>
        </Link>
        <Link href="/doctors" className="flex flex-col items-center gap-0.5 text-slate-600 hover:text-emerald-700">
          <span className="text-base">🩺</span>
          <span className="text-[9px] font-bold">Doctors</span>
        </Link>
        <button
          type="button"
          data-testid="bottom-nav-family"
          onClick={() => setActiveTab('FAMILY')}
          className={`flex flex-col items-center gap-0.5 ${
            activeTab === 'FAMILY' ? 'text-emerald-600 font-bold' : 'text-slate-600'
          }`}
        >
          <span className="text-base">👥</span>
          <span className="text-[9px]">Family</span>
        </button>
        <button
          type="button"
          data-testid="bottom-nav-vault"
          onClick={() => setActiveTab('VAULT')}
          className={`flex flex-col items-center gap-0.5 ${
            activeTab === 'VAULT' ? 'text-emerald-600 font-bold' : 'text-slate-600'
          }`}
        >
          <span className="text-base">📁</span>
          <span className="text-[9px]">Vault</span>
        </button>
        <button
          type="button"
          data-testid="bottom-nav-reviews"
          onClick={() => setActiveTab('REVIEWS')}
          className={`flex flex-col items-center gap-0.5 ${
            activeTab === 'REVIEWS' ? 'text-emerald-600 font-bold' : 'text-slate-600'
          }`}
        >
          <span className="text-base">⭐</span>
          <span className="text-[9px]">Review</span>
        </button>
        <button
          type="button"
          data-testid="bottom-nav-token"
          onClick={() => setActiveTab('LIVE_QUEUE')}
          className={`flex flex-col items-center gap-0.5 ${
            activeTab === 'LIVE_QUEUE' ? 'text-emerald-600 font-bold' : 'text-slate-600'
          }`}
        >
          <span className="text-base">🎟️</span>
          <span className="text-[9px]">Token</span>
        </button>
      </nav>

      {/* Add Family Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Dependent Family Member"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Full Legal Name:</label>
            <Input
              type="text"
              data-testid="input-new-member-name"
              placeholder="e.g. Arjun Kumar"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Relationship:</label>
              <select
                value={newMemberRelation}
                onChange={(e) => setNewMemberRelation(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                <option value="CHILD">Child / Dependent</option>
                <option value="SPOUSE">Spouse</option>
                <option value="PARENT">Parent</option>
                <option value="OTHER">Other Relative</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Age (Years):</label>
              <Input
                type="number"
                value={newMemberAge.toString()}
                onChange={(e) => setNewMemberAge(Number(e.target.value))}
                min="0"
                max="120"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Gender:</label>
            <div className="flex gap-2">
              {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setNewMemberGender(g)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    newMemberGender === g
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
            <strong>DPDP Act 2023 Explicit Caregiver Consent:</strong> By adding this dependent, you confirm you are authorized to manage their healthcare records and book consultations on their behalf.
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            data-testid="btn-save-family-member"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 text-xs shadow-md shadow-emerald-600/30"
          >
            ✓ Save Dependent Profile
          </Button>
        </form>
      </Modal>

      {/* ABHA Link Modal */}
      <Modal
        isOpen={isAbhaModalOpen}
        onClose={() => setIsAbhaModalOpen(false)}
        title="Ayushman Bharat Health Account (ABHA M1) Integration"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Link National Health ID for <strong>{selectedMemberForAbha?.fullName}</strong> under National Health Authority (NHA) ABDM Milestone 1 specifications.
          </p>

          {abhaGeneratedNotice ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold">
              {abhaGeneratedNotice}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
                <div>Candidate: {selectedMemberForAbha?.fullName} ({selectedMemberForAbha?.relationship})</div>
                <div>Aadhaar OTP Authentication: <strong>Verified ✓</strong></div>
              </div>

              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={handleConfirmAbhaLink}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 text-xs shadow-md shadow-emerald-600/30"
              >
                Generate & Link ABHA ID
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
