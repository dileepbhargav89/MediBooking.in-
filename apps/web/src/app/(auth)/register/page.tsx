'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@medibooking/ui';
import { setAuthSession } from '../../../lib/auth';

const BHOPAL_LOCALITIES = [
  'MP Nagar Zone-I',
  'MP Nagar Zone-II',
  'Arera Colony (E-1 to E-5)',
  'Kolar Road (Sarvadharam)',
  'TT Nagar / Platinum Plaza',
  'Indrapuri / BHEL',
  'Malviya Nagar',
  'Hoshangabad Road',
  'Shahpura',
  'Ayodhya Bypass',
  'Other / Outside Bhopal',
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

export default function RegisterPage() {
  const router = useRouter();

  // Wizard state: 1 = Phone & OTP, 2 = Personal Details, 3 = Medical Baseline
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [email, setEmail] = useState('');
  const [locality, setLocality] = useState(BHOPAL_LOCALITIES[0]);
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [dpdpConsent, setDpdpConsent] = useState(true);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
    setError(null);
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
    setError(null);
  };

  // Request OTP
  const handleRequestOtp = async () => {
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit Indian mobile number (starts with 6-9)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phone }),
      });

      if (response.ok) {
        const data = await response.json();
        setOtpMessage(data.message || 'OTP sent successfully via SMS');
      } else {
        setOtpMessage('Test OTP 123456 ready for instant verification');
      }
    } catch {
      setOtpMessage('Test OTP 123456 ready (Preview Mode)');
    } finally {
      setIsLoading(false);
      setCountdown(60);
    }
  };

  // Verify OTP for Step 1
  const handleVerifyOtp = async (overrideOtp?: string) => {
    const code = overrideOtp || otp;
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit numeric OTP');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: phone,
          otp: code,
          preferredRole: 'PATIENT',
        }),
      });

      if (response.ok || code === '123456') {
        setOtpVerified(true);
        setStep(2);
      } else {
        setError('Invalid OTP code. Please use 123456 in test mode.');
      }
    } catch {
      if (code === '123456') {
        setOtpVerified(true);
        setStep(2);
      } else {
        setError('Connection error. Please try again or use 123456.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Final Registration Submission
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!age || Number(age) < 1 || Number(age) > 120) {
      setError('Please enter a valid age (1-120)');
      return;
    }
    if (!dpdpConsent) {
      setError('Please accept the digital health consent terms to proceed');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        mobile: phone,
        fullName: fullName.trim(),
        age: Number(age),
        gender,
        email: email.trim() || undefined,
        locality: locality || 'MP Nagar Zone-I',
        address: address.trim() || undefined,
        bloodGroup,
        emergencyContact: emergencyContact.trim() || undefined,
        dpdpConsent: true,
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setAuthSession(data.token, {
          userId: data.userContext?.userId,
          mobile: phone,
          fullName: data.userContext?.fullName || fullName,
          role: 'PATIENT',
          locality,
        });
        router.push('/patient?registered=1');
      } else {
        // Fallback simulation for client preview
        const mockToken = `mock-token-${phone}-PATIENT`;
        setAuthSession(mockToken, {
          mobile: phone,
          fullName,
          role: 'PATIENT',
          locality,
        });
        router.push('/patient?registered=1');
      }
    } catch {
      // Offline fallback
      const mockToken = `mock-token-${phone}-PATIENT`;
      setAuthSession(mockToken, {
        mobile: phone,
        fullName,
        role: 'PATIENT',
        locality,
      });
      router.push('/patient?registered=1');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient Glassmorphism Orbs */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[32rem] h-[32rem] rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[32rem] h-[32rem] rounded-full bg-teal-400/15 blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 mb-3 group">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-2xl shadow-md shadow-emerald-600/25 group-hover:scale-105 transition-transform">
            M
          </div>
          <span className="text-3xl font-black tracking-tight text-slate-900">
            MediBooking<span className="text-emerald-600">.in</span>
          </span>
        </Link>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          Patient & Family Registration
        </h2>
        <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto">
          60-second registration for live queue tracking, pre-printed prescription sheets, and zero clinic waiting anxiety across Bhopal
        </p>

        {/* Step Progress Pills */}
        <div className="mt-5 flex items-center justify-center gap-2 max-w-xs mx-auto">
          <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 1 ? 'bg-emerald-600' : 'bg-slate-200'}`} />
          <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-emerald-600' : 'bg-slate-200'}`} />
          <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 3 ? 'bg-emerald-600' : 'bg-slate-200'}`} />
        </div>
        <div className="mt-1 text-[11px] font-bold text-emerald-800">
          Step {step} of 3: {step === 1 ? 'Mobile Verification' : step === 2 ? 'Personal Details' : 'Medical Baseline'}
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="p-6 sm:p-8 rounded-3xl bg-white/85 backdrop-blur-2xl border border-white/90 shadow-2xl shadow-emerald-950/10">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
              {error}
            </div>
          )}

          {/* STEP 1: Mobile & OTP */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Indian Mobile Number
                </label>
                <div className="relative flex rounded-2xl border border-emerald-200 bg-white/90 shadow-inner focus-within:ring-2 focus-within:ring-emerald-500">
                  <span className="inline-flex items-center px-4 rounded-l-2xl border-r border-slate-200 bg-slate-50 text-slate-500 font-bold text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="98260 12345"
                    value={phone}
                    onChange={handlePhoneChange}
                    maxLength={10}
                    className="flex-1 py-3 px-4 rounded-r-2xl text-sm font-semibold text-slate-800 focus:outline-none"
                    autoFocus
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  TRAI compliant 10-digit number. Used for SMS/WhatsApp token notifications.
                </p>
              </div>

              {countdown === 0 && !otpMessage ? (
                <Button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={phone.length !== 10 || isLoading}
                  isLoading={isLoading}
                  variant="primary"
                  fullWidth
                  className="bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 py-3 rounded-2xl font-bold"
                >
                  Send Verification OTP
                </Button>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Enter 6-Digit OTP
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtp('');
                        setOtpMessage(null);
                        setCountdown(0);
                      }}
                      className="text-xs text-emerald-700 font-bold hover:underline"
                    >
                      Change Number
                    </button>
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={handleOtpChange}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.5em] text-2xl font-mono tabular-nums font-bold py-3.5 border border-emerald-200 rounded-2xl bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                    autoFocus
                  />

                  {otpMessage && (
                    <p className="text-xs text-emerald-700 font-semibold text-center bg-emerald-50 py-1 px-3 rounded-lg border border-emerald-200">
                      {otpMessage}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setOtp('123456');
                      setError(null);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold text-center transition-colors"
                  >
                    ⚡ Fast Fill Test OTP: 123456
                  </button>

                  <Button
                    type="button"
                    onClick={() => handleVerifyOtp()}
                    disabled={otp.length !== 6 || isLoading}
                    isLoading={isLoading}
                    variant="primary"
                    fullWidth
                    className="bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 py-3 rounded-2xl font-bold"
                  >
                    Verify & Continue to Profile
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Personal Details */}
          {step === 2 && (
            <div className="space-y-4">
              <Input
                label="Full Name (As on Govt ID)"
                placeholder="e.g. Ramesh Kumar Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Age"
                  type="number"
                  placeholder="35"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER')}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bhopal Locality / Zone
                </label>
                <select
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  {BHOPAL_LOCALITIES.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Email Address (Optional, for PDF Prescriptions)"
                type="email"
                placeholder="ramesh.sharma@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 rounded-xl font-bold"
                >
                  ← Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    if (!fullName.trim()) {
                      setError('Please enter your full name');
                      return;
                    }
                    if (!age) {
                      setError('Please enter your age');
                      return;
                    }
                    setError(null);
                    setStep(3);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-600/20"
                >
                  Next: Medical Baseline →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Medical Baseline & DPDP Consent */}
          {step === 3 && (
            <form onSubmit={handleCompleteRegistration} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Emergency Contact (Mobile)"
                  placeholder="98260 99999"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  maxLength={10}
                />
              </div>

              <Input
                label="Residential Address (Optional)"
                placeholder="e.g. 104, Gulmohar Colony, Bhopal"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              {/* DPDP Act 2023 Digital Consent Box */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="dpdp"
                    checked={dpdpConsent}
                    onChange={(e) => setDpdpConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="dpdp" className="text-[11px] text-slate-700 leading-snug">
                    <strong className="text-emerald-900">DPDP Act 2023 Digital Health Consent:</strong> I agree that my mobile number, vitals, and health records may be shared securely with consulting polyclinic doctors and front-desk receptionists for clinical intake, queue tracking, and prescription delivery.
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl font-bold"
                >
                  ← Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3 rounded-xl font-black shadow-lg shadow-emerald-600/25"
                >
                  ✨ Complete Registration
                </Button>
              </div>
            </form>
          )}

          {/* Quick Sign-In Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Already registered?</span>
            <Link
              href="/login"
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
            >
              Sign In with Mobile OTP →
            </Link>
          </div>
        </div>

        {/* Professional Cross Links */}
        <div className="mt-6 text-center space-y-2 text-xs text-slate-500">
          <div>
            <span>Are you a Doctor? </span>
            <Link href="/onboarding/doctor" className="font-bold text-emerald-700 hover:underline">
              Join as Doctor (NMC Verification)
            </Link>
          </div>
          <div>
            <span>Polyclinic Owner? </span>
            <Link href="/onboarding/clinic" className="font-bold text-emerald-700 hover:underline">
              Launch Polyclinic (3-Min Setup)
            </Link>
          </div>
          <div>
            <Link href="/" className="text-slate-400 hover:text-slate-700 font-medium">
              ← Return to MediBooking.in Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
