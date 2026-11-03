'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card, Badge, UserRole } from '@medibooking/ui';

interface QuickRole {
  role: UserRole;
  label: string;
  mobile: string;
  clinicId?: string;
  portalRoute: string;
  badgeVariant: 'blue' | 'mint' | 'amber' | 'purple' | 'gray';
}

const QUICK_ROLES: QuickRole[] = [
  {
    role: UserRole.RECEPTIONIST,
    label: 'Reception Desk',
    mobile: '9826033333',
    clinicId: 'c1010000-0000-4000-8000-000000000001',
    portalRoute: '/receptionist',
    badgeVariant: 'mint',
  },
  {
    role: UserRole.DOCTOR,
    label: 'Doctor Chamber',
    mobile: '9826022222',
    clinicId: 'c1010000-0000-4000-8000-000000000001',
    portalRoute: '/doctor',
    badgeVariant: 'blue',
  },
  {
    role: UserRole.CLINIC_ADMIN,
    label: 'Clinic Admin',
    mobile: '9826011111',
    clinicId: 'c1010000-0000-4000-8000-000000000001',
    portalRoute: '/admin',
    badgeVariant: 'amber',
  },
  {
    role: UserRole.SUPER_ADMIN,
    label: 'Super Admin',
    mobile: '9999999999',
    portalRoute: '/super-admin',
    badgeVariant: 'purple',
  },
  {
    role: UserRole.PATIENT,
    label: 'Patient Tracker',
    mobile: '9826044444',
    portalRoute: '/patient',
    badgeVariant: 'gray',
  },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [activeRole, setActiveRole] = useState<QuickRole | null>(null);
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
          // Dev bypass / fallback if API is not running locally during preview
          setOtpMessage('Test OTP 123456 ready for instant verification');
        }
      } catch {
        // Fallback for isolated client-side development
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
  const handleVerifyOtp = async (overrideOtp?: string) => {
    const code = overrideOtp || otp;
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit numeric OTP');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let sessionToken = '';
      let targetPath = activeRole?.portalRoute || '/receptionist';

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phone, otp: code }),
      });

      if (response.ok) {
        const data = await response.json();
        sessionToken = data.token;
        const user = data.user;
        if (user?.role) {
          switch (user.role) {
            case UserRole.SUPER_ADMIN:
              targetPath = '/super-admin';
              break;
            case UserRole.CLINIC_ADMIN:
              targetPath = '/admin';
              break;
            case UserRole.DOCTOR:
              targetPath = '/doctor';
              break;
            case UserRole.RECEPTIONIST:
              targetPath = '/receptionist';
              break;
            case UserRole.PATIENT:
            default:
              targetPath = '/patient';
              break;
          }
        }
      } else {
        // Fallback simulation for dev/standalone UI test
        if (code === '123456') {
          sessionToken = `mock-token-${phone}-${activeRole?.role || 'RECEPTIONIST'}`;
        } else {
          setError('Invalid OTP code. Please use 123456 in test mode.');
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
            mobile: phone,
            role: activeRole?.role || UserRole.RECEPTIONIST,
            clinicId: activeRole?.clinicId || 'c1010000-0000-4000-8000-000000000001',
          })
        );
      }

      // Navigate to destination portal
      router.push(targetPath);
    } catch {
      // In case of network fault, allow 123456 bypass
      if (code === '123456') {
        const targetPath = activeRole?.portalRoute || '/receptionist';
        document.cookie = `medibooking_session=mock-offline-token; path=/; max-age=604800; SameSite=Lax`;
        router.push(targetPath);
      } else {
        setError('Connection error. Please try again or use 123456.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-sm">
            M
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">
            MediBooking<span className="text-blue-600">.in</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Single Sign-On Clinic Portal
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Passwordless login via Indian mobile OTP with 5 dynamic RBAC portals
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="p-6 sm:p-8 shadow-md">
          {/* Quick-Select Demo Roles */}
          <div className="mb-6 pb-5 border-b border-slate-100">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Quick Select Role (Pilot Mode)
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUICK_ROLES.map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => handleQuickSelect(item)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-left transition-all ${
                    activeRole?.role === item.role
                      ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="truncate">{item.label}</span>
                    <Badge variant={item.badgeVariant} size="sm">
                      {item.role.slice(0, 3)}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.mobile.slice(0, 5)}...
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
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
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    6-Digit Verification OTP
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setOtp('');
                      setError(null);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
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
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono tabular-nums font-bold py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  autoFocus
                />

                {otpMessage && (
                  <p className="mt-1.5 text-xs text-emerald-600 font-medium text-center">
                    {otpMessage}
                  </p>
                )}
              </div>

              {/* Fast-Fill Test OTP Button */}
              <button
                type="button"
                onClick={() => {
                  setOtp('123456');
                  handleVerifyOtp('123456');
                }}
                className="w-full py-1.5 px-3 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold text-center transition-colors"
              >
                ⚡ Instant Dev Login with Test OTP: 123456
              </button>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                disabled={otp.length !== 6}
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
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}
        </Card>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-800 font-medium">
            ← Return to MediBooking.in Home
          </Link>
        </div>
      </div>
    </div>
  );
}
