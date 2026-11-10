'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, UserRole } from '@medibooking/ui';

interface QuickRole {
  role: UserRole;
  label: string;
  sublabel: string;
  mobile: string;
  clinicId?: string;
  clinicName?: string;
  portalRoute: string;
  category: 'ALL' | 'CLINICAL' | 'ADMIN' | 'PATIENT';
  badgeColor: string;
  icon: string;
}

const QUICK_ROLES: QuickRole[] = [
  {
    role: UserRole.RECEPTIONIST,
    label: 'Reception Desk',
    sublabel: 'Central Intake & Cashiering',
    mobile: '9826033333',
    clinicId: 'c1010000-0000-4000-8000-000000000001',
    clinicName: 'CityCare MP Nagar',
    portalRoute: '/receptionist',
    category: 'CLINICAL',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: '📋',
  },
  {
    role: UserRole.DOCTOR,
    label: 'Doctor Chamber',
    sublabel: 'Dr. Rajesh Sharma (CH-1)',
    mobile: '9826022222',
    clinicId: 'c1010000-0000-4000-8000-000000000001',
    clinicName: 'CityCare MP Nagar',
    portalRoute: '/doctor',
    category: 'CLINICAL',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: '🩺',
  },
  {
    role: UserRole.CLINIC_ADMIN,
    label: 'Clinic Admin',
    sublabel: 'Operations & 80/20 Ledger',
    mobile: '9826011111',
    clinicId: 'c1010000-0000-4000-8000-000000000001',
    clinicName: 'CityCare MP Nagar',
    portalRoute: '/admin',
    category: 'ADMIN',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: '🏢',
  },
  {
    role: UserRole.SUPER_ADMIN,
    label: 'Super Admin',
    sublabel: 'Platform Console (10 Clinics)',
    mobile: '9826000000',
    portalRoute: '/super-admin',
    category: 'ADMIN',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '🛡️',
  },
  {
    role: UserRole.PATIENT,
    label: 'Patient Tracker',
    sublabel: 'Token Queue & Rx History',
    mobile: '9826044444',
    portalRoute: '/patient',
    category: 'PATIENT',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '👤',
  },
];

interface DemoPersona {
  label: string;
  sublabel: string;
  mobile: string;
  role: UserRole;
  portalRoute: string;
  clinicTag: string;
  icon: string;
}

const ADDITIONAL_DEMO_PERSONAS: DemoPersona[] = [
  {
    label: 'Narmada Reception',
    sublabel: 'Pooja (Arera Colony)',
    mobile: '9826055555',
    role: UserRole.RECEPTIONIST,
    portalRoute: '/receptionist',
    clinicTag: 'Arera E-3',
    icon: '🏥',
  },
  {
    label: 'Dr. Alok Verma',
    sublabel: 'Neurologist (PGIMER)',
    mobile: '9826144444',
    role: UserRole.DOCTOR,
    portalRoute: '/doctor',
    clinicTag: 'Arera E-3',
    icon: '🧠',
  },
  {
    label: 'Kolar Prime Desk',
    sublabel: 'Deepak (Kolar Rd)',
    mobile: '9826066666',
    role: UserRole.RECEPTIONIST,
    portalRoute: '/receptionist',
    clinicTag: 'Kolar Rd',
    icon: '🏥',
  },
  {
    label: 'Dr. Vivek Saxena',
    sublabel: 'Physician & Diabetologist',
    mobile: '9826155555',
    role: UserRole.DOCTOR,
    portalRoute: '/doctor',
    clinicTag: 'Kolar Rd',
    icon: '💊',
  },
  {
    label: 'Anita Mehra',
    sublabel: 'Patient (Arera Colony)',
    mobile: '9826077777',
    role: UserRole.PATIENT,
    portalRoute: '/patient',
    clinicTag: 'Patient',
    icon: '👤',
  },
  {
    label: 'Vikramaditya Rao',
    sublabel: 'Patient (CityCare MP Nagar)',
    mobile: '9826098765',
    role: UserRole.PATIENT,
    portalRoute: '/patient',
    clinicTag: 'Patient',
    icon: '👤',
  },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [activeRole, setActiveRole] = useState<QuickRole | null>(null);
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'CLINICAL' | 'ADMIN' | 'PATIENT'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Clean phone input handler
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
    setError(null);
  };

  // Clean OTP input handler
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
    setError(null);
  };

  // Request OTP from Backend or Fallback Simulator
  const handleRequestOtp = useCallback(
    async (targetPhone?: string) => {
      const mobileNumber = targetPhone || phone;
      if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
        setError('Please enter a valid 10-digit Indian mobile number (starts with 6-9)');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/request-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: mobileNumber }),
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
        setStep('otp');
        setCountdown(60);
      }
    },
    [phone]
  );

  // Quick Select Role shortcut
  const handleQuickSelect = (item: QuickRole) => {
    setActiveRole(item);
    setPhone(item.mobile);
    setOtp('');
    setError(null);
    handleRequestOtp(item.mobile);
  };

  // Verify OTP and persist session
  const handleVerifyOtp = async (overrideOtp?: string, roleOverride?: QuickRole) => {
    const code = overrideOtp || otp;
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit numeric OTP');
      return;
    }

    setIsLoading(true);
    setError(null);

    const currentRole = roleOverride || activeRole;
    let targetPath = currentRole?.portalRoute || '/receptionist';
    const targetMobile = phone || currentRole?.mobile || '9826033333';
    const targetRole = currentRole?.role || UserRole.RECEPTIONIST;
    let sessionToken = `mock-token-${targetMobile}-${targetRole}`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: targetMobile,
          otp: code,
          preferredRole: targetRole,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        sessionToken = data.token;
        const user = data.userContext || data.user;
        const role = user?.activeRole || user?.role || targetRole;
        if (role) {
          switch (role) {
            case UserRole.SUPER_ADMIN:
            case 'SUPER_ADMIN':
              targetPath = '/super-admin';
              break;
            case UserRole.CLINIC_ADMIN:
            case 'CLINIC_ADMIN':
              targetPath = '/admin';
              break;
            case UserRole.DOCTOR:
            case 'DOCTOR':
              targetPath = '/doctor';
              break;
            case UserRole.RECEPTIONIST:
            case 'RECEPTIONIST':
              targetPath = '/receptionist';
              break;
            case UserRole.PATIENT:
            case 'PATIENT':
            default:
              targetPath = '/patient';
              break;
          }
        }
      } else {
        if (code === '123456') {
          sessionToken = `mock-token-${targetMobile}-${targetRole}`;
        } else {
          setError('Invalid OTP code. Please use 123456 in test mode.');
          setIsLoading(false);
          return;
        }
      }
    } catch {
      if (code === '123456') {
        sessionToken = `mock-token-${targetMobile}-${targetRole}`;
      } else {
        setError('Connection error. Please try again or use 123456.');
        setIsLoading(false);
        return;
      }
    }

    // Store in cookie for Next.js Middleware inspection
    document.cookie = `medibooking_session=${sessionToken}; path=/; max-age=604800; SameSite=Lax`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('medibooking_session', sessionToken);
      localStorage.setItem(
        'medibooking_user',
        JSON.stringify({
          mobile: targetMobile,
          role: targetRole,
          clinicId: currentRole?.clinicId || 'c1010000-0000-4000-8000-000000000001',
        })
      );
    }

    setIsLoading(false);
    router.push(targetPath);
  };

  const visibleRoles = useMemo(() => {
    if (selectedTab === 'ALL') return QUICK_ROLES;
    return QUICK_ROLES.filter((r) => r.category === selectedTab);
  }, [selectedTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient Glassmorphism Orbs */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[30rem] h-[30rem] rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[30rem] h-[30rem] rounded-full bg-teal-400/15 blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-2xl shadow-md shadow-emerald-600/25 group-hover:scale-105 transition-transform">
            M
          </div>
          <span className="text-3xl font-black tracking-tight text-slate-900">
            MediBooking<span className="text-emerald-600">.in</span>
          </span>
        </Link>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          Single Sign-On Clinic Portal
        </h2>
        <p className="mt-1.5 text-xs text-slate-600 max-w-md mx-auto">
          Passwordless login via Indian mobile OTP with 5 dynamic RBAC portals
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="p-6 sm:p-8 rounded-3xl bg-white/85 backdrop-blur-2xl border border-white/90 shadow-2xl shadow-emerald-950/10">
          {/* Quick-Select Demo Roles Section */}
          <div className="mb-6 pb-5 border-b border-emerald-100/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Quick Select Role (Pilot Mode)
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                1-Tap Instant Auth
              </span>
            </div>

            {/* Segmented Persona Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 mb-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedTab('ALL')}
                className={`flex-1 py-1 px-2 rounded-lg transition-all ${
                  selectedTab === 'ALL'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Roles
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab('PATIENT')}
                className={`flex-1 py-1 px-2 rounded-lg transition-all ${
                  selectedTab === 'PATIENT'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Patients
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab('CLINICAL')}
                className={`flex-1 py-1 px-2 rounded-lg transition-all ${
                  selectedTab === 'CLINICAL'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Clinical
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab('ADMIN')}
                className={`flex-1 py-1 px-2 rounded-lg transition-all ${
                  selectedTab === 'ADMIN'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admins
              </button>
            </div>

            {/* Non-truncated Role Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visibleRoles.map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => handleQuickSelect(item)}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                    activeRole?.role === item.role
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-sm'
                      : 'border-slate-200/90 bg-white/70 hover:bg-emerald-50/40 hover:border-emerald-200'
                  }`}
                >
                  <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-sm shrink-0">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {item.label}
                      </span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
                        {item.role.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {item.sublabel}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-700 font-semibold mt-0.5">
                      +91 {item.mobile}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Multi-Clinic Demo Personas (Bhopal Pilot) */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 mb-2 flex items-center gap-1.5">
                <span>🏥</span> Multi-Clinic Demo Personas (Bhopal Pilot)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {ADDITIONAL_DEMO_PERSONAS.map((p) => (
                  <button
                    key={p.mobile}
                    type="button"
                    onClick={() =>
                      handleQuickSelect({
                        role: p.role,
                        label: p.label,
                        sublabel: p.sublabel,
                        mobile: p.mobile,
                        portalRoute: p.portalRoute,
                        category: p.role === UserRole.DOCTOR ? 'CLINICAL' : p.role === UserRole.RECEPTIONIST ? 'CLINICAL' : 'PATIENT',
                        badgeColor: p.role === UserRole.DOCTOR ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200',
                        icon: p.icon,
                      })
                    }
                    className="p-2 rounded-xl border border-emerald-100/90 bg-emerald-50/40 hover:bg-emerald-100/60 text-left transition-colors text-[11px]"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-xs">{p.icon}</span>
                      <span className="font-bold text-slate-900 truncate">{p.label}</span>
                    </div>
                    <div className="text-[10px] text-emerald-800 truncate mt-0.5">{p.sublabel}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
              {error}
            </div>
          )}

          {/* Step 1: Mobile Input */}
          {step === 'phone' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRequestOtp();
              }}
              className="space-y-4"
            >
              <Input
                label="Indian Mobile Number"
                prefixText="+91"
                placeholder="98260 12345"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={10}
                type="tel"
                helperText="TRAI compliant 10-digit mobile number"
                autoFocus
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                disabled={phone.length !== 10}
                className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 py-3 rounded-2xl font-bold"
              >
                Send Verification OTP
              </Button>
            </form>
          ) : (
            /* Step 2: 6-Digit OTP Input */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyOtp();
              }}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    6-Digit Verification OTP
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setOtp('');
                      setError(null);
                    }}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                  >
                    Change Number (+91 {phone})
                  </button>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={handleOtpChange}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono tabular-nums font-bold py-3.5 border border-emerald-200/90 rounded-2xl bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner"
                  autoFocus
                />

                {otpMessage && (
                  <p className="mt-2 text-xs text-emerald-700 font-semibold text-center bg-emerald-50 py-1 px-3 rounded-lg border border-emerald-200">
                    {otpMessage}
                  </p>
                )}
              </div>

              {/* Fast-Fill Test OTP Button */}
              <button
                type="button"
                onClick={() => {
                  setOtp('123456');
                  handleVerifyOtp('123456', activeRole || undefined);
                }}
                className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold text-center transition-colors shadow-xs"
              >
                ⚡ Instant Dev Login with Test OTP: 123456
              </button>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                disabled={otp.length !== 6}
                className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 py-3 rounded-2xl font-bold"
              >
                Verify & Enter Portal
              </Button>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Didn&apos;t receive code?</span>
                {countdown > 0 ? (
                  <span className="font-mono tabular-nums font-semibold text-slate-600">
                    Resend in {countdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestOtp()}
                    className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-slate-600 hover:text-emerald-800 font-semibold transition-colors"
          >
            ← Return to MediBooking.in Home
          </Link>
        </div>
      </div>
    </div>
  );
}
