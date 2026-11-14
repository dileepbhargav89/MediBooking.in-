'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Card, Badge } from '@medibooking/ui';
import { ReceptionistQuickTourModal } from '@/components/receptionist-quick-tour-modal';

interface ChamberItem {
  id: string;
  chamberNumber: string;
  chamberName: string;
  floor: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

export default function PolyclinicOnboardingPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Step 1: Clinic Identity & Admin
  const [clinicName, setClinicName] = useState('Apex Multispeciality Clinic');
  const [slug, setSlug] = useState('apex-multispeciality');
  const [tagline, setTagline] = useState('Advanced Outpatient & Multi-Chamber Care');
  const [addressLine, setAddressLine] = useState('Plot 42, MP Nagar Zone II');
  const [locality, setLocality] = useState('MP Nagar');
  const [city, setCity] = useState('Bhopal');
  const [state, setState] = useState('Madhya Pradesh');
  const [pincode, setPincode] = useState('462011');
  const [adminName, setAdminName] = useState('Dr. Vikram Malhotra');
  const [contactPhone, setContactPhone] = useState('9893012345');
  const [contactEmail, setContactEmail] = useState('admin@apexclinic.com');
  const [panNumber, setPanNumber] = useState('ABCDE1234F');
  const [gstin, setGstin] = useState('');

  // Step 2: Chambers Configuration
  const [chambers, setChambers] = useState<ChamberItem[]>([
    { id: '1', chamberNumber: 'CH-1', chamberName: 'Cardiology & General Medicine', floor: 'Ground Floor' },
    { id: '2', chamberNumber: 'CH-2', chamberName: 'Pediatrics & Child Wellness', floor: 'Ground Floor' },
    { id: '3', chamberNumber: 'CH-3', chamberName: 'Orthopedics & Joint Care', floor: 'First Floor' },
    { id: '4', chamberNumber: 'CH-4', chamberName: 'Gynecology & Women Health', floor: 'First Floor' },
  ]);

  // Step 3: Staff & Reception
  const [receptionistName, setReceptionistName] = useState('Pooja Sharma');
  const [receptionistMobile, setReceptionistMobile] = useState('9876543210');
  const [receptionistPin, setReceptionistPin] = useState('1234');

  // Step 4: BharatQR UPI & Cash Drawer
  const [upiVpa, setUpiVpa] = useState('apexclinic@icici');
  const [merchantName, setMerchantName] = useState('Apex Healthcare Services');
  const [openingCashFloat, setOpeningCashFloat] = useState<number>(2000);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState<boolean>(true);

  // Quick Start & Test Token States
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [sampleToken, setSampleToken] = useState<{
    tokenNumber: string;
    patientName: string;
    mobile: string;
    chamberNumber: string;
    doctorName: string;
    clinicName: string;
    feeRupees: number;
    status: string;
    timeSlot: string;
  } | null>(null);
  const [isGeneratingTestToken, setIsGeneratingTestToken] = useState(false);

  // Step 5: Finished Result
  interface OnboardingResult {
    clinic: { id: string; name: string; slug: string; trialEndsAt: string };
    chambers: Array<{ chamberNumber: string; chamberName: string; floor: string }>;
    urls: { receptionistUrl: string; tvUrl: string; adminUrl: string };
    adminUser: { name: string; mobile: string; role: string; token: string };
    receptionistUser?: { name: string; mobile: string; role: string; token: string };
    trial: { plan: string; days: number; expiresAt: string };
  }
  const [result, setResult] = useState<OnboardingResult | null>(null);

  // Auto-slugify when clinic name changes if not manually set
  const handleNameChange = (val: string) => {
    setClinicName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(autoSlug);
  };

  // Chamber management
  const addChamber = () => {
    const nextNumber = chambers.length + 1;
    setChambers([
      ...chambers,
      {
        id: String(Date.now()),
        chamberNumber: `CH-${nextNumber}`,
        chamberName: `Specialty Chamber ${nextNumber}`,
        floor: 'Ground Floor',
      },
    ]);
  };

  const removeChamber = (id: string) => {
    if (chambers.length <= 1) return;
    setChambers(chambers.filter((c) => c.id !== id));
  };

  const updateChamberField = (id: string, field: keyof ChamberItem, value: string) => {
    setChambers(
      chambers.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Validation per step
  const validateStep = (stepNumber: number): boolean => {
    setErrorBanner(null);
    if (stepNumber === 1) {
      if (clinicName.trim().length < 3) {
        setErrorBanner('Clinic name must be at least 3 characters.');
        return false;
      }
      if (addressLine.trim().length < 5) {
        setErrorBanner('Address must be at least 5 characters.');
        return false;
      }
      if (!/^\d{6}$/.test(pincode)) {
        setErrorBanner('Please enter a valid 6-digit Indian PIN code (e.g. 462011).');
        return false;
      }
      if (!/^[6-9]\d{9}$/.test(contactPhone)) {
        setErrorBanner('Admin mobile number must be a valid 10-digit Indian number.');
        return false;
      }
      if (adminName.trim().length < 2) {
        setErrorBanner('Admin full name is required.');
        return false;
      }
    } else if (stepNumber === 2) {
      if (chambers.length === 0) {
        setErrorBanner('At least one examination chamber must be configured.');
        return false;
      }
      for (const ch of chambers) {
        if (!ch.chamberNumber.trim() || !ch.chamberName.trim()) {
          setErrorBanner('All chambers must have a code (e.g. CH-1) and specialty name.');
          return false;
        }
      }
    } else if (stepNumber === 3) {
      if (receptionistMobile && !/^[6-9]\d{9}$/.test(receptionistMobile)) {
        setErrorBanner('Receptionist mobile number must be a valid 10-digit Indian number.');
        return false;
      }
    } else if (stepNumber === 4) {
      if (upiVpa && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiVpa)) {
        setErrorBanner('Please enter a valid UPI VPA handle (e.g. clinic@icici).');
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
    if (!validateStep(4)) return;
    setIsSubmitting(true);
    setErrorBanner(null);

    try {
      const payload = {
        name: clinicName,
        slug,
        tagline,
        addressLine,
        locality,
        city,
        state,
        pincode,
        adminName,
        contactPhone,
        contactEmail,
        chambers: chambers.map((ch) => ({
          chamberNumber: ch.chamberNumber,
          chamberName: ch.chamberName,
          floor: ch.floor,
        })),
        receptionistName,
        receptionistMobile,
        receptionistPin,
        panNumber,
        gstin,
        upiVpa,
        merchantName,
        openingCashFloat,
        autoPrintReceipt,
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/clinics/onboard-wizard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to complete clinic onboarding');
      }

      setResult(data);
      setCurrentStep(5);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateTestToken = async () => {
    setIsGeneratingTestToken(true);
    try {
      const targetClinicId = result?.clinic.id || 'c1010000-0000-4000-8000-000000000001';
      const res = await fetch(`${API_BASE_URL}/api/v1/clinics/${targetClinicId}/test-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setSampleToken(data.token);
      } else {
        setSampleToken({
          tokenNumber: '#01',
          patientName: 'Ramesh Kumar (Verification OPD)',
          mobile: '9826011111',
          chamberNumber: 'CH-1',
          doctorName: 'Dr. Rajesh Sharma',
          clinicName: clinicName,
          feeRupees: 600,
          status: 'WAITING',
          timeSlot: '10:30 AM',
        });
      }
    } catch {
      setSampleToken({
        tokenNumber: '#01',
        patientName: 'Ramesh Kumar (Verification OPD)',
        mobile: '9826011111',
        chamberNumber: 'CH-1',
        doctorName: 'Dr. Rajesh Sharma',
        clinicName: clinicName,
        feeRupees: 600,
        status: 'WAITING',
        timeSlot: '10:30 AM',
      });
    } finally {
      setIsGeneratingTestToken(false);
    }
  };

  const qrMatrix = generateQrMatrix(
    `upi://pay?pa=${upiVpa || 'clinic@upi'}&pn=${encodeURIComponent(merchantName || clinicName)}&cu=INR`
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
              <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Clinic Setup Wizard
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
      <main className="max-w-4xl mx-auto px-4 py-8 w-full flex-1">
        {/* Progress Bar & Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Launch Your Polyclinic in 3 Minutes
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Configure physical chambers, reception cashiering, BharatQR, and waiting room TV.
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Step {currentStep} of 5
              </span>
            </div>
          </div>

          {/* Step Pill Indicators */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { num: 1, label: 'Identity' },
              { num: 2, label: 'Chambers' },
              { num: 3, label: 'Staff' },
              { num: 4, label: 'BharatQR' },
              { num: 5, label: 'Launch' },
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

        {/* Global Error Alert */}
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

        {/* Wizard Step 1: Clinic Identity & Admin */}
        {currentStep === 1 && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Step 1: Polyclinic Identity & Location</h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter your healthcare facility details and primary administrator contact.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Polyclinic Name *
                </label>
                <Input
                  value={clinicName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Apex Multispeciality Clinic"
                  data-testid="input-clinic-name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Unique Slug (URL) *
                </label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. apex-multispeciality"
                  data-testid="input-clinic-slug"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tagline / Speciality
                </label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Outpatient & Diagnostic Care"
                  data-testid="input-clinic-tagline"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Street Address Line *
                </label>
                <Input
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="e.g. Plot 42, MP Nagar Zone II"
                  data-testid="input-clinic-address"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Locality / Area *
                </label>
                <Input
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g. MP Nagar"
                  data-testid="input-clinic-locality"
                />
                <div className="flex flex-wrap gap-1.5 mt-2" data-testid="bhopal-locality-chips">
                  {['MP Nagar', 'Arera Colony', 'Kolar Road', 'Shahpura', 'TT Nagar', 'Indrapuri'].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocality(loc)}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
                        locality === loc
                          ? 'bg-emerald-600 text-white font-bold shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                      data-testid={`chip-locality-${loc.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  City & State
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                  <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  6-Digit Indian PIN Code *
                </label>
                <Input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="e.g. 462011"
                  maxLength={6}
                  data-testid="input-clinic-pincode"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Admin Full Name *
                </label>
                <Input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Dr. Vikram Malhotra"
                  data-testid="input-admin-name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Admin 10-Digit Mobile *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 text-slate-600 text-sm font-semibold">
                    +91
                  </span>
                  <Input
                    className="rounded-l-none"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="e.g. 9893012345"
                    maxLength={10}
                    data-testid="input-admin-phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Email
                </label>
                <Input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. admin@apexclinic.com"
                  data-testid="input-admin-email"
                />
              </div>

              {/* Section 194J Financial & Tax Compliance */}
              <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3" data-testid="section-194j-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">Section 194J TDS & Tax Compliance</span>
                    <Badge variant="outline" className="text-[10px]">Statutory Compliance</Badge>
                  </div>
                  <span className="text-xs text-emerald-700 font-semibold">Annual Form 16A Ready</span>
                </div>
                <p className="text-xs text-slate-500">
                  Required for annual Form 16A TDS certificates and transparent doctor revenue-split disbursements.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Clinic PAN Number *
                    </label>
                    <Input
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                      className="font-mono font-bold"
                      data-testid="input-clinic-pan"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Clinic GSTIN (Optional)
                    </label>
                    <Input
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase().slice(0, 15))}
                      placeholder="e.g. 23AAAAA0000A1Z5"
                      maxLength={15}
                      className="font-mono"
                      data-testid="input-clinic-gstin"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button size="lg" variant="primary" onClick={handleNext} data-testid="btn-step1-next">
                Continue to Chambers →
              </Button>
            </div>
          </Card>
        )}

        {/* Wizard Step 2: Chamber Layout */}
        {currentStep === 2 && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Step 2: Physical Examination Chambers</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Configure active consultation rooms (e.g. CH-1, CH-2) for concurrent doctor shifts.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={addChamber} data-testid="btn-add-chamber">
                + Add Chamber
              </Button>
            </div>

            {/* Chamber Conflict Protection Badge */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900" data-testid="chamber-conflict-guard-badge">
              <div className="flex items-center gap-2 font-semibold">
                <span>🛡️</span>
                <span>Automated Chamber Conflict Prevention Active</span>
              </div>
              <span className="text-[11px] text-emerald-700">Prevents overlapping doctor shifts per room</span>
            </div>

            <div className="space-y-3" data-testid="chamber-list">
              {chambers.map((chamber, index) => (
                <div
                  key={chamber.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row items-center gap-3"
                  data-testid={`chamber-row-${index}`}
                >
                  <div className="w-full md:w-28">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Code
                    </label>
                    <Input
                      value={chamber.chamberNumber}
                      onChange={(e) => updateChamberField(chamber.id, 'chamberNumber', e.target.value)}
                      placeholder="e.g. CH-1"
                      className="font-bold text-blue-700"
                      data-testid={`input-chamber-number-${index}`}
                    />
                  </div>

                  <div className="w-full md:flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Speciality / Chamber Name
                    </label>
                    <Input
                      value={chamber.chamberName}
                      onChange={(e) => updateChamberField(chamber.id, 'chamberName', e.target.value)}
                      placeholder="e.g. Cardiology & General Medicine"
                      data-testid={`input-chamber-name-${index}`}
                    />
                  </div>

                  <div className="w-full md:w-36">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Floor
                    </label>
                    <Input
                      value={chamber.floor}
                      onChange={(e) => updateChamberField(chamber.id, 'floor', e.target.value)}
                      placeholder="e.g. Ground Floor"
                      data-testid={`input-chamber-floor-${index}`}
                    />
                  </div>

                  <div className="mt-2 md:mt-5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeChamber(chamber.id)}
                      disabled={chambers.length <= 1}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      data-testid={`btn-remove-chamber-${index}`}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={handleBack} data-testid="btn-step2-back">
                ← Back
              </Button>
              <Button size="lg" variant="primary" onClick={handleNext} data-testid="btn-step2-next">
                Continue to Staff →
              </Button>
            </div>
          </Card>
        )}

        {/* Wizard Step 3: Staff Invitation */}
        {currentStep === 3 && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Step 3: Front Desk Receptionist Setup</h2>
              <p className="text-sm text-slate-500 mt-1">
                Invite your lead cashier or compounder. They will manage queue triage and counter billing.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
              <span className="text-2xl">👩‍💼</span>
              <div>
                <h4 className="text-sm font-bold text-blue-900">Front Desk Shared Cashier Account</h4>
                <p className="text-xs text-blue-700 mt-1">
                  The receptionist will have access to all {chambers.length} chambers, hotkey intake (F2),
                  thermal receipt printing, and BharatQR cashless cashiering.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lead Receptionist Name *
                </label>
                <Input
                  value={receptionistName}
                  onChange={(e) => setReceptionistName(e.target.value)}
                  placeholder="e.g. Pooja Sharma"
                  data-testid="input-receptionist-name"
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
                    value={receptionistMobile}
                    onChange={(e) => setReceptionistMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    data-testid="input-receptionist-phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Terminal 4-Digit Quick PIN *
                </label>
                <Input
                  type="password"
                  value={receptionistPin}
                  onChange={(e) => setReceptionistPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  maxLength={4}
                  className="font-mono tracking-widest text-center font-bold"
                  data-testid="input-receptionist-pin"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Enables rapid counter POS unlocking without passwords during busy morning OPD triage.
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={handleBack} data-testid="btn-step3-back">
                ← Back
              </Button>
              <Button size="lg" variant="primary" onClick={handleNext} data-testid="btn-step3-next">
                Continue to BharatQR & Billing →
              </Button>
            </div>
          </Card>
        )}

        {/* Wizard Step 4: BharatQR UPI & Cash Drawer */}
        {currentStep === 4 && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Step 4: BharatQR Cashless Counter & Billing</h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure your UPI payment handle for zero-MDR dynamic counter payments.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Clinic UPI VPA Handle *
                </label>
                <Input
                  value={upiVpa}
                  onChange={(e) => setUpiVpa(e.target.value)}
                  placeholder="e.g. apexclinic@icici"
                  data-testid="input-upi-vpa"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Supports Google Pay, PhonePe, Paytm, BHIM, and all bank UPI apps.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Merchant Display Name
                </label>
                <Input
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="e.g. Apex Healthcare Services"
                  data-testid="input-merchant-name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Initial Cash Drawer Float (₹)
                </label>
                <Input
                  type="number"
                  value={String(openingCashFloat)}
                  onChange={(e) => setOpeningCashFloat(Number(e.target.value))}
                  placeholder="2000"
                  data-testid="input-cash-float"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Front-desk petty cash float for patient change.
                </span>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPrintReceipt}
                    onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    data-testid="checkbox-autoprint"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-800">
                      Auto-Print 80mm ESC/POS Thermal Slip
                    </span>
                    <span className="text-xs text-slate-500 block">
                      Instantly prints token ticket upon patient registration.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={handleBack} data-testid="btn-step4-back">
                ← Back
              </Button>
              <Button
                size="lg"
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
                data-testid="btn-submit-onboarding"
              >
                {isSubmitting ? 'Provisioning Clinic...' : 'Activate Polyclinic (30-Day Free Trial) 🚀'}
              </Button>
            </div>
          </Card>
        )}

        {/* Wizard Step 5: Activation Success & Live Launch */}
        {currentStep === 5 && result && (
          <div className="space-y-6" data-testid="onboarding-success-screen">
            {/* Success Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-2">
                  <span>✨</span>
                  <span>30-Day Pro Trial Active</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {result.clinic.name} is Live!
                </h2>
                <p className="text-teal-100 text-sm mt-1">
                  Multi-chamber queue management, cashiering, and waiting room displays are ready.
                </p>
              </div>
              <div className="text-right" data-testid="chambers-ready-badge">
                <span className="text-3xl font-black">{result.chambers.length}</span>
                <span className="text-xs text-teal-100 block uppercase font-bold tracking-wider">
                  Chambers Ready
                </span>
              </div>
            </div>

            {/* Quick Launch Portals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href={result.urls.receptionistUrl} className="block">
                <Card className="p-5 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer h-full flex flex-col justify-between">
                  <div>
                    <span className="text-2xl">🖥️</span>
                    <h3 className="font-bold text-slate-900 mt-2">Front Desk Reception</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      15-second patient intake, BharatQR cashiering, and ESC/POS thermal printing.
                    </p>
                  </div>
                  <Button size="sm" variant="primary" className="mt-4 w-full" data-testid="btn-launch-reception">
                    Open Reception Desk →
                  </Button>
                </Card>
              </Link>

              <Link href={result.urls.tvUrl} className="block">
                <Card className="p-5 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer h-full flex flex-col justify-between">
                  <div>
                    <span className="text-2xl">📺</span>
                    <h3 className="font-bold text-slate-900 mt-2">Waiting Room TV Display</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Live 4-chamber split screen with bilingual Hindi & English voice synthesis.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="mt-4 w-full" data-testid="btn-launch-tv">
                    Launch TV Display →
                  </Button>
                </Card>
              </Link>

              <Link href={result.urls.adminUrl} className="block">
                <Card className="p-5 hover:border-purple-500 hover:shadow-md transition-all cursor-pointer h-full flex flex-col justify-between">
                  <div>
                    <span className="text-2xl">📊</span>
                    <h3 className="font-bold text-slate-900 mt-2">Clinic Admin Console</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Doctor affiliations, revenue split settlements, and operational telemetry.
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="mt-4 w-full" data-testid="btn-launch-admin">
                    Open Admin Console →
                  </Button>
                </Card>
              </Link>
            </div>

            {/* Day-1 Operational Verification & Rapid Training Suite */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: 90-Second Receptionist Quick Start */}
              <Card className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">👩‍💼</span>
                    <Badge variant="emerald">Rapid Staff Training</Badge>
                  </div>
                  <h3 className="font-bold text-slate-900">Sunita&apos;s 90-Sec Front Desk Tour</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Bilingual Hindi/English interactive walk-through for walk-in token issuance, vitals entry, and ESC/POS thermal printing.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setIsTourOpen(true)}
                  data-testid="btn-launch-receptionist-tour"
                >
                  Start Receptionist Training Tour →
                </Button>
              </Card>

              {/* Card 2: Interactive Verification Test Token */}
              <Card className="p-5 bg-white border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⚡</span>
                    <Badge variant="outline">Instant Hardware Test</Badge>
                  </div>
                  <h3 className="font-bold text-slate-900">Live Hardware & TV Check</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Generate a sample test token #01 to immediately verify waiting room TV sync and thermal ticket printing.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 w-full border-blue-600 text-blue-700 hover:bg-blue-50"
                  onClick={handleGenerateTestToken}
                  disabled={isGeneratingTestToken}
                  data-testid="btn-generate-test-token"
                >
                  {isGeneratingTestToken ? 'Generating...' : '⚡ Issue Sample Test Token #01'}
                </Button>
              </Card>
            </div>

            {/* Test Token Verification Preview */}
            {sampleToken && (
              <div data-testid="test-token-preview">
                <Card className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✅</span>
                      <span className="text-sm font-bold text-emerald-950">
                        Sample Token #{sampleToken.tokenNumber.replace('#', '')} Successfully Dispatched!
                      </span>
                    </div>
                    <Badge variant="emerald">Live Verified</Badge>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Patient</span>
                      <span className="font-bold text-slate-900">{sampleToken.patientName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Chamber</span>
                      <span className="font-bold text-emerald-800">{sampleToken.chamberNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Doctor</span>
                      <span className="font-semibold text-slate-800">{sampleToken.doctorName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Status</span>
                      <span className="font-bold text-blue-600">WAITING (TV Alert Active)</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Waiting room TV and thermal cashiering station are confirmed online and functional.
                  </p>
                </Card>
              </div>
            )}

            {/* Printable BharatQR Counter Standee */}
            <Card className="p-6 border-dashed border-2 border-slate-300 bg-white">
              <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Printable BharatQR Reception Standee
                  </h3>
                  <p className="text-xs text-slate-500">
                    Display this counter standee at your front desk for instant patient UPI payments.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  data-testid="btn-print-standee"
                >
                  🖨️ Print Standee Poster
                </Button>
              </div>

              {/* Standee Mockup Container */}
              <div
                className="max-w-xs mx-auto p-6 bg-gradient-to-b from-blue-50 to-white rounded-2xl border-2 border-blue-600 text-center shadow-md print:max-w-none print:shadow-none"
                data-testid="standee-mockup"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    M
                  </div>
                  <span className="font-black text-slate-900 tracking-tight text-sm">
                    MediBooking<span className="text-blue-600">.in</span>
                  </span>
                </div>

                <h4 className="text-base font-black text-slate-900 tracking-tight">
                  {result.clinic.name}
                </h4>
                <p className="text-[10px] text-slate-500 mb-4">
                  {tagline || 'Multi-Chamber Polyclinic'}
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

                <div className="bg-blue-600 text-white rounded-lg py-1 px-3 text-xs font-bold tracking-wider mb-2">
                  SCAN WITH ANY UPI APP
                </div>

                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono">
                  <span>VPA:</span>
                  <span className="font-bold text-slate-800">{upiVpa}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        <ReceptionistQuickTourModal
          isOpen={isTourOpen}
          onClose={() => setIsTourOpen(false)}
          clinicName={clinicName}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        MediBooking.in Polyclinic Platform • 30-Day Free Trial • Engineered for Bhopal & MP Clinics
      </footer>
    </div>
  );
}
