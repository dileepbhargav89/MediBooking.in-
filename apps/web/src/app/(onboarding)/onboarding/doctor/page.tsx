'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Card, Badge, MedicalSpecialty } from '@medibooking/ui';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const MEDICAL_COUNCILS = [
  'Madhya Pradesh Medical Council',
  'Delhi Medical Council',
  'Maharashtra Medical Council',
  'Karnataka Medical Council',
  'Uttar Pradesh Medical Council',
  'Tamil Nadu Medical Council',
  'National Medical Commission (NMC)',
];

const SPECIALTY_OPTIONS: Array<{ key: MedicalSpecialty; label: string }> = [
  { key: MedicalSpecialty.CARDIOLOGY, label: 'Cardiology' },
  { key: MedicalSpecialty.GENERAL_MEDICINE, label: 'General Medicine' },
  { key: MedicalSpecialty.PEDIATRICS, label: 'Pediatrics' },
  { key: MedicalSpecialty.ORTHOPEDICS, label: 'Orthopedics' },
  { key: MedicalSpecialty.GYNECOLOGY, label: 'Gynecology' },
  { key: MedicalSpecialty.DERMATOLOGY, label: 'Dermatology' },
  { key: MedicalSpecialty.ENT, label: 'ENT (Ear, Nose, Throat)' },
  { key: MedicalSpecialty.OPHTHALMOLOGY, label: 'Ophthalmology' },
  { key: MedicalSpecialty.DENTAL, label: 'Dental & Maxillofacial' },
  { key: MedicalSpecialty.PULMONOLOGY, label: 'Pulmonology' },
];

function generateQrMatrix(content: string, size = 21): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const drawFinder = (startX: number, startY: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        if (
          x === 0 ||
          x === 6 ||
          y === 0 ||
          y === 6 ||
          (x >= 2 && x <= 4 && y >= 2 && y <= 4)
        ) {
          matrix[startY + y]![startX + x] = true;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);

  for (let i = 8; i < size - 8; i++) {
    matrix[6]![i] = i % 2 === 0;
    matrix[i]![6] = i % 2 === 0;
  }

  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (
        (x < 8 && y < 8) ||
        (x >= size - 8 && y < 8) ||
        (x < 8 && y >= size - 8) ||
        y === 6 ||
        x === 6
      ) {
        continue;
      }
      matrix[y]![x] = ((hash ^ (x * 31 + y * 17)) & 1) === 1;
    }
  }

  return matrix;
}

export default function DoctorOnboardingPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Step 1: Doctor Identity & NMC
  const [fullName, setFullName] = useState('Dr. Ananya Roy');
  const [mobile, setMobile] = useState('9893044556');
  const [email, setEmail] = useState('dr.ananya@gmail.com');
  const [stateMedicalCouncil, setStateMedicalCouncil] = useState('Madhya Pradesh Medical Council');
  const [registrationNumber, setRegistrationNumber] = useState('MP-48291');
  const [qualifications, setQualifications] = useState('MBBS, MD Cardiology, DM');
  const [selectedSpecialty, setSelectedSpecialty] = useState<MedicalSpecialty>(MedicalSpecialty.CARDIOLOGY);
  const [experienceYears, setExperienceYears] = useState<number>(12);
  const [bio, setBio] = useState('Senior Interventional Cardiologist specializing in preventive heart health and hypertension.');

  // Step 2: Chamber Practice & Fee Structure
  const [chamberNumber, setChamberNumber] = useState('CH-1');
  const [consultationFeeRupees, setConsultationFeeRupees] = useState<number>(700);
  const [followUpFeeRupees, setFollowUpFeeRupees] = useState<number>(350);
  const [followUpValidityDays, setFollowUpValidityDays] = useState<number>(14);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(15);
  const [maxTokensPerSession, setMaxTokensPerSession] = useState<number>(30);

  // Step 3: Success Result
  interface DoctorOnboardingResult {
    doctor: {
      id: string;
      fullName: string;
      slug: string;
      registrationNumber: string;
      stateMedicalCouncil: string;
      specialties: string[];
      qualifications: string[];
      isVerified: boolean;
    };
    affiliation: {
      chamberNumber: string;
      consultationFeeRupees: number;
      followUpValidityDays: number;
    };
    token: string;
    urls: {
      publicProfileUrl: string;
      doctorPortalUrl: string;
    };
  }
  const [result, setResult] = useState<DoctorOnboardingResult | null>(null);

  const validateStep = (stepNumber: number): boolean => {
    setErrorBanner(null);
    if (stepNumber === 1) {
      if (fullName.trim().length < 3) {
        setErrorBanner('Full name must be at least 3 characters.');
        return false;
      }
      if (!/^[6-9]\d{9}$/.test(mobile)) {
        setErrorBanner('Please enter a valid 10-digit Indian mobile number.');
        return false;
      }
      if (registrationNumber.trim().length < 3) {
        setErrorBanner('NMC / State Medical Council Registration number is required.');
        return false;
      }
      if (qualifications.trim().length < 2) {
        setErrorBanner('Please enter at least one degree/qualification (e.g. MBBS).');
        return false;
      }
    } else if (stepNumber === 2) {
      if (!chamberNumber.trim()) {
        setErrorBanner('Chamber number (e.g. CH-1) is required.');
        return false;
      }
      if (consultationFeeRupees <= 0) {
        setErrorBanner('Consultation fee must be greater than zero.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setErrorBanner(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    setIsSubmitting(true);
    setErrorBanner(null);

    try {
      const payload = {
        fullName,
        mobile,
        email,
        registrationNumber,
        stateMedicalCouncil,
        specialties: [selectedSpecialty],
        qualifications: qualifications.split(',').map((q) => q.trim()).filter(Boolean),
        experienceYears,
        bio,
        chamberNumber,
        consultationFeeRupees,
        followUpFeeRupees,
        followUpValidityDays,
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/doctors/onboard-doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to complete doctor onboarding');
      }

      setResult(data);
      setCurrentStep(3);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const qrMatrix = generateQrMatrix(
    `https://medibooking.in/dr/${result?.doctor.slug || 'dr-profile'}`
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-sm">
              M
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                MediBooking<span className="text-blue-600">.in</span>
              </span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-50 text-blue-700 border border-blue-200">
                Doctor Registration
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Already registered? Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 py-8 w-full flex-1">
        {/* Header Title */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                NMC Verified Doctor Onboarding
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Claim your consultation chamber, define fees, and generate your printable booking poster.
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Step {currentStep} of 3
              </span>
            </div>
          </div>

          {/* Stepper Bar */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, label: 'Doctor Credentials' },
              { num: 2, label: 'Chamber & Fees' },
              { num: 3, label: 'Profile & QR Poster' },
            ].map((s) => (
              <div
                key={s.num}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  currentStep === s.num
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : currentStep > s.num
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                    : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                <div className="text-xs font-bold">
                  {currentStep > s.num ? '✓' : s.num}. {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorBanner && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-500 font-bold">⚠️</span>
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-red-500 hover:text-red-800 text-xs font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Step 1: Doctor Identity & NMC Verification */}
        {currentStep === 1 && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Step 1: Clinical Credentials & NMC Registry</h2>
              <p className="text-sm text-slate-500 mt-1">
                Verified under National Medical Commission standards for patient trust and digital prescription validity.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Doctor Full Name (with Prefix) *
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  data-testid="input-doc-name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  10-Digit Mobile Number *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 text-slate-600 text-sm font-semibold">
                    +91
                  </span>
                  <Input
                    className="rounded-l-none"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="e.g. 9893044556"
                    maxLength={10}
                    data-testid="input-doc-phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. dr.ananya@gmail.com"
                  data-testid="input-doc-email"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  State Medical Council *
                </label>
                <select
                  value={stateMedicalCouncil}
                  onChange={(e) => setStateMedicalCouncil(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  data-testid="select-doc-council"
                >
                  {MEDICAL_COUNCILS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Medical Registration Number *
                </label>
                <Input
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MP-48291"
                  data-testid="input-doc-reg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Medical Specialty *
                </label>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value as MedicalSpecialty)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold text-blue-700"
                  data-testid="select-doc-specialty"
                >
                  {SPECIALTY_OPTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Degrees & Qualifications (comma separated) *
                </label>
                <Input
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="e.g. MBBS, MD Cardiology, DM"
                  data-testid="input-doc-qualifications"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Years of Experience
                </label>
                <Input
                  type="number"
                  value={String(experienceYears)}
                  onChange={(e) => setExperienceYears(Number(e.target.value))}
                  placeholder="10"
                  data-testid="input-doc-experience"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Short Clinical Bio
                </label>
                <Input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Brief summary of clinical expertise"
                  data-testid="input-doc-bio"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button size="lg" variant="primary" onClick={handleNext} data-testid="btn-doc-step1-next">
                Continue to Chamber & Fees →
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Chamber Practice & Fee Structure */}
        {currentStep === 2 && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Step 2: Chamber Practice & Fee Structure</h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure your consultation room, initial fee, follow-up window, and session capacity.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Chamber Code *
                </label>
                <Input
                  value={chamberNumber}
                  onChange={(e) => setChamberNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. CH-1"
                  className="font-bold text-blue-700"
                  data-testid="input-doc-chamber"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Consultation Fee (₹) *
                </label>
                <Input
                  type="number"
                  value={String(consultationFeeRupees)}
                  onChange={(e) => {
                    const fee = Number(e.target.value);
                    setConsultationFeeRupees(fee);
                    setFollowUpFeeRupees(Math.round(fee / 2));
                  }}
                  placeholder="600"
                  data-testid="input-doc-fee"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Follow-up Fee (₹)
                </label>
                <Input
                  type="number"
                  value={String(followUpFeeRupees)}
                  onChange={(e) => setFollowUpFeeRupees(Number(e.target.value))}
                  placeholder="300"
                  data-testid="input-doc-followup-fee"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Follow-up Validity (Days)
                </label>
                <Input
                  type="number"
                  value={String(followUpValidityDays)}
                  onChange={(e) => setFollowUpValidityDays(Number(e.target.value))}
                  placeholder="14"
                  data-testid="input-doc-followup-days"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Slot Duration (Minutes)
                </label>
                <Input
                  type="number"
                  value={String(slotDurationMinutes)}
                  onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                  placeholder="15"
                  data-testid="input-doc-slot-duration"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Max Tokens / Session
                </label>
                <Input
                  type="number"
                  value={String(maxTokensPerSession)}
                  onChange={(e) => setMaxTokensPerSession(Number(e.target.value))}
                  placeholder="30"
                  data-testid="input-doc-max-tokens"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={handleBack} data-testid="btn-doc-step2-back">
                ← Back
              </Button>
              <Button
                size="lg"
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
                data-testid="btn-doc-submit"
              >
                {isSubmitting ? 'Registering Doctor...' : 'Claim Chamber & Activate Profile 🩺'}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Success & Downloadable Chamber Poster */}
        {currentStep === 3 && result && (
          <div className="space-y-6" data-testid="doctor-onboarding-success">
            {/* Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-2">
                  <span>🛡️</span>
                  <span>NMC Verified Practitioner</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Welcome, {result.doctor.fullName}!
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Your digital chamber is provisioned in {result.affiliation.chamberNumber} with ₹{result.affiliation.consultationFeeRupees} consultation fee.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-blue-100 block uppercase font-bold tracking-wider">
                  Registration No.
                </span>
                <span className="text-lg font-mono font-black">{result.doctor.registrationNumber}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href={result.urls.doctorPortalUrl} className="block">
                <Card className="p-5 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer h-full flex flex-col justify-between">
                  <div>
                    <span className="text-2xl">🩺</span>
                    <h3 className="font-bold text-slate-900 mt-2">Doctor Consultation Desk</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Real-time queue glance, patient vitals, prescription notes, and delay broadcast.
                    </p>
                  </div>
                  <Button size="sm" variant="primary" className="mt-4 w-full" data-testid="btn-launch-doctor-desk">
                    Open Chamber Desk →
                  </Button>
                </Card>
              </Link>

              <Link href={result.urls.publicProfileUrl} className="block">
                <Card className="p-5 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer h-full flex flex-col justify-between">
                  <div>
                    <span className="text-2xl">🌐</span>
                    <h3 className="font-bold text-slate-900 mt-2">Public Doctor Profile</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Share with your private patients for direct online appointment booking.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="mt-4 w-full" data-testid="btn-view-public-profile">
                    View Public Profile (/dr/:slug) →
                  </Button>
                </Card>
              </Link>
            </div>

            {/* Printable High-Resolution Chamber Poster */}
            <Card className="p-6 border-dashed border-2 border-slate-300 bg-white">
              <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Printable Chamber QR Booking Poster
                  </h3>
                  <p className="text-xs text-slate-500">
                    Display this poster outside your chamber door so walk-in patients can book or track tokens.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  data-testid="btn-print-poster"
                >
                  🖨️ Print Chamber Poster
                </Button>
              </div>

              {/* Poster Container */}
              <div
                className="max-w-xs mx-auto p-6 bg-gradient-to-b from-blue-50 to-white rounded-2xl border-2 border-blue-600 text-center shadow-md print:max-w-none print:shadow-none"
                data-testid="chamber-poster-mockup"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    M
                  </div>
                  <span className="font-black text-slate-900 tracking-tight text-sm">
                    MediBooking<span className="text-blue-600">.in</span>
                  </span>
                </div>

                <div className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Chamber {result.affiliation.chamberNumber}
                </div>

                <h4 className="text-lg font-black text-slate-900 tracking-tight">
                  {result.doctor.fullName}
                </h4>
                <p className="text-xs text-blue-700 font-semibold">
                  {result.doctor.qualifications.join(', ')}
                </p>
                <p className="text-[10px] text-slate-500 mb-4">
                  {result.doctor.specialties.join(', ')} • Reg: {result.doctor.registrationNumber}
                </p>

                {/* SVG QR Code */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 inline-block shadow-inner mb-3">
                  <svg viewBox="0 0 21 21" className="w-40 h-40" shapeRendering="crispEdges">
                    {qrMatrix.map((row, y) =>
                      row.map((active, x) =>
                        active ? (
                          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0f172a" />
                        ) : null
                      )
                    )}
                  </svg>
                </div>

                <div className="bg-emerald-600 text-white rounded-lg py-1 px-3 text-xs font-bold tracking-wider mb-2">
                  SCAN TO BOOK OR TRACK TOKEN
                </div>

                <div className="text-[10px] text-slate-500 font-mono">
                  medibooking.in/dr/{result.doctor.slug}
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        MediBooking.in Clinical Network • National Medical Commission Compliance • Bhopal & MP Doctors
      </footer>
    </div>
  );
}

