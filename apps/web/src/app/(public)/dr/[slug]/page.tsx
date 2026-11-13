'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button, Input, Card, Badge, Modal } from '@medibooking/ui';
import {
  DOCTORS_MASTER_DIRECTORY,
  DoctorDirectoryItem,
  PracticeVenue,
} from '@/lib/doctor-directory';

interface SlotItem {
  id: string;
  time: string;
  session: 'MORNING' | 'EVENING';
  isAvailable: boolean;
  isLocked?: boolean;
}

const INITIAL_SLOTS: SlotItem[] = [
  // Morning
  { id: 's1', time: '10:00 AM', session: 'MORNING', isAvailable: true },
  { id: 's2', time: '10:15 AM', session: 'MORNING', isAvailable: true },
  { id: 's3', time: '10:30 AM', session: 'MORNING', isAvailable: false, isLocked: true },
  { id: 's4', time: '10:45 AM', session: 'MORNING', isAvailable: true },
  { id: 's5', time: '11:00 AM', session: 'MORNING', isAvailable: true },
  { id: 's6', time: '11:15 AM', session: 'MORNING', isAvailable: false },
  // Evening
  { id: 's7', time: '05:30 PM', session: 'EVENING', isAvailable: true },
  { id: 's8', time: '05:45 PM', session: 'EVENING', isAvailable: true },
  { id: 's9', time: '06:00 PM', session: 'EVENING', isAvailable: true },
  { id: 's10', time: '06:15 PM', session: 'EVENING', isAvailable: true },
  { id: 's11', time: '06:30 PM', session: 'EVENING', isAvailable: false },
  { id: 's12', time: '06:45 PM', session: 'EVENING', isAvailable: true },
];

export default function DoctorPublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;

  const doctorInfo: DoctorDirectoryItem =
    DOCTORS_MASTER_DIRECTORY.find((d) => d.slug === slug) ||
    DOCTORS_MASTER_DIRECTORY[0]!;

  const [selectedVenue, setSelectedVenue] = useState<PracticeVenue>(
    doctorInfo.venues[0] || {
      clinicId: 'c1010000-0000-4000-8000-000000000001',
      clinicName: 'Bhopal City Care Polyclinic',
      locality: 'MP Nagar Zone-II',
      address: 'Plot 42, MP Nagar Zone II, Bhopal',
      chamberNumber: 'CH-1',
      feeRupees: 600,
      morningTiming: '10:00 AM – 01:00 PM',
      eveningTiming: '05:30 PM – 08:30 PM',
      tvSlug: 'citycare-mpnagar-bhopal',
    }
  );

  useEffect(() => {
    if (doctorInfo.venues[0]) {
      setSelectedVenue(doctorInfo.venues[0]);
    }
  }, [slug, doctorInfo]);

  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number>(300); // 5 minutes
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [patientAge, setPatientAge] = useState<string>('48');
  const [patientGender, setPatientGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [symptoms, setSymptoms] = useState('');
  const [dpdpConsent, setDpdpConsent] = useState(true);
  const [bookingConfirmed, setBookingConfirmed] = useState<boolean>(false);
  const [allocatedToken, setAllocatedToken] = useState<number>(14);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate next 7 dates
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      index: i,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dateNumber: d.getDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
      fullDate: d.toISOString().split('T')[0]!,
    };
  });

  // Countdown timer when slot is locked
  useEffect(() => {
    if (!selectedSlot || bookingConfirmed) return;
    const timer = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          setSelectedSlot(null);
          setIsBookingModalOpen(false);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedSlot, bookingConfirmed]);

  const handleSelectSlot = (slot: SlotItem) => {
    if (!slot.isAvailable || slot.isLocked) return;
    setSelectedSlot(slot);
    setLockCountdown(300);
    setIsBookingModalOpen(true);
    setErrorMessage(null);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setErrorMessage('Please enter patient full name');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(patientMobile)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    if (!dpdpConsent) {
      setErrorMessage('Please accept the DPDP Act 2023 consent to proceed with booking');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // Simulate backend booking dispatch
    setTimeout(() => {
      setIsLoading(false);
      setAllocatedToken(Math.floor(Math.random() * 20) + 12);
      setBookingConfirmed(true);
    }, 600);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const morningSlots = INITIAL_SLOTS.filter((s) => s.session === 'MORNING');
  const eveningSlots = INITIAL_SLOTS.filter((s) => s.session === 'EVENING');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 flex flex-col justify-between relative overflow-hidden">
      {/* Ambient Glassmorphic Glow Orbs */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-0 -ml-40 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

      {/* Top Navbar: Frosted Glass */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-emerald-100/70 px-6 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-600/20">
              M
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">
              MediBooking<span className="text-emerald-600">.in</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              ✓ Verified Clinic Booking
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/doctors">
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-emerald-800 hover:text-emerald-900">
                ← All Doctors
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-slate-700 hover:text-emerald-700">
                Staff Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 w-full">
        <nav className="text-xs text-slate-500 flex items-center gap-2 font-medium">
          <Link href="/" className="hover:text-emerald-700 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/doctors" className="hover:text-emerald-700 transition-colors">Bhopal Specialists</Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">{doctorInfo.fullName}</span>
        </nav>
      </div>

      {/* Main Profile & Booking Flow */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 w-full space-y-6 relative z-10">
        {/* Doctor Master Profile Card: Glassmorphic High-Conversion */}
        <div className="bg-white/85 backdrop-blur-xl border border-white/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-950/5 ring-1 ring-emerald-900/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-lg shadow-emerald-600/25 shrink-0 ring-4 ring-white">
                DR
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {doctorInfo.fullName}
                  </h1>
                  <Badge variant="mint" size="sm" dot>
                    Verified Practitioner
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-emerald-800">
                  {doctorInfo.qualifications}
                </p>
                <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-xs text-slate-600 font-medium">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 font-mono text-emerald-800 font-semibold border border-emerald-200">
                    🛡️ NMC: {doctorInfo.nmcNumber}
                  </span>
                  <span>•</span>
                  <span>{doctorInfo.experienceYears}+ Years Experience</span>
                  <span>•</span>
                  <span>{doctorInfo.specialtyLabel}</span>
                  <span>•</span>
                  <span>{doctorInfo.languages}</span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                    ⭐ {doctorInfo.rating} ({doctorInfo.reviewCount}+ Bhopal Reviews)
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2 max-w-xl">
                  {doctorInfo.bio}
                </p>
              </div>
            </div>

            {/* Transparent Commercial Fee Card */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:text-right backdrop-blur-sm shadow-xs shrink-0">
              <span className="text-[11px] text-emerald-900 font-bold uppercase tracking-wider block">
                Chamber Consultation Fee
              </span>
              <span className="text-3xl font-black text-slate-900 font-mono tabular-nums block my-0.5">
                ₹{selectedVenue.feeRupees}
              </span>
              <span className="text-xs text-emerald-700 font-bold flex items-center sm:justify-end gap-1">
                <span>🏥</span> Pay at Clinic Desk
              </span>
            </div>
          </div>

          {/* Conditions & Symptoms Treated Chips */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Conditions & Symptoms Treated by {doctorInfo.fullName}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {doctorInfo.treatedSymptoms.map((sym) => (
                <span
                  key={sym}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-200"
                >
                  ✓ {sym}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency Notice Pill */}
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🚑</span>
            <span>
              <strong>Need Emergency Care?</strong> In case of acute cardiac arrest, stroke, severe breathlessness or trauma, please dial <strong>108 Ambulance</strong> immediately.
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0 hidden sm:inline-block">
            Emergency 108
          </span>
        </div>

        {/* Business Value Proposition: Why Book Online via ₹49 Token? */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl bg-white/75 backdrop-blur-md border border-emerald-100 shadow-sm text-xs">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
              ⚡
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-sm">
                Online ₹49 Token Advantage (Zero Counter Wait)
              </span>
              <p className="text-slate-600 leading-relaxed mt-0.5">
                Guarantees your slot & prompts front-desk staff to pre-print your physical <span className="font-semibold text-emerald-800">Pre-Consultation Prescription Letterhead</span> with vitals recorded before chamber entry.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-emerald-100 md:pl-4">
            <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">
              📱
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-sm">
                Two-Way WhatsApp Live Queue Tracking
              </span>
              <p className="text-slate-600 leading-relaxed mt-0.5">
                Receive real-time token announcements, live chamber queue position, and doctor ETA updates on WhatsApp so you arrive just in time.
              </p>
            </div>
          </div>
        </div>

        {/* Practice Venue / Polyclinic Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">1</span>
              Select Practice Location in Bhopal
            </h2>
            <span className="text-xs text-slate-500 font-medium">{doctorInfo.venues[0]?.clinicName || 'Bhopal City Care'} Affiliate</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctorInfo.venues.map((venue) => {
              const isSelected = venue.clinicId === selectedVenue.clinicId;
              return (
                <div
                  key={venue.clinicId}
                  onClick={() => setSelectedVenue(venue)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-md ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/20 shadow-md shadow-emerald-600/10'
                      : 'border-slate-200/80 bg-white/70 hover:border-emerald-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-bold text-slate-900 text-sm truncate">
                      {venue.clinicName}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {venue.chamberNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2 truncate">{venue.address}</p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-semibold">Chamber Fee: ₹{venue.feeRupees}</span>
                    <span className="text-emerald-700 font-bold">
                      {venue.morningTiming.split('–')[0]} Today
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Date Selector */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">2</span>
            Choose Consultation Date
          </h2>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {dates.map((d) => {
              const isSelected = d.index === selectedDateIndex;
              return (
                <button
                  key={d.index}
                  type="button"
                  onClick={() => setSelectedDateIndex(d.index)}
                  className={`min-w-24 p-3 rounded-2xl border text-center transition-all backdrop-blur-md ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-600/20'
                      : 'border-slate-200 bg-white/80 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40'
                  }`}
                >
                  <span className="block text-[11px] font-semibold uppercase">{d.label}</span>
                  <span className="block text-xl font-bold font-mono tabular-nums my-0.5">
                    {d.dateNumber}
                  </span>
                  <span className="block text-[11px] opacity-80">{d.month}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Slots Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">3</span>
              Available Time Slots ({selectedVenue.chamberNumber})
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Booked
              </span>
            </div>
          </div>

          {/* Morning Slots */}
          <div className="bg-white/80 backdrop-blur-md border border-emerald-100 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>🌅</span> Morning Session • {selectedVenue.morningTiming}
              </span>
              <Badge variant="mint" size="sm">
                Slots Open
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {morningSlots.map((slot) => (
                <button
                  key={slot.id}
                  disabled={!slot.isAvailable || slot.isLocked}
                  onClick={() => handleSelectSlot(slot)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold font-mono tabular-nums transition-all ${
                    !slot.isAvailable
                      ? 'border-slate-200 bg-slate-100/80 text-slate-400 cursor-not-allowed'
                      : slot.isLocked
                      ? 'border-amber-200 bg-amber-50 text-amber-600 cursor-not-allowed'
                      : 'border-emerald-200/90 bg-emerald-50/70 hover:bg-emerald-600 hover:text-white text-emerald-900 cursor-pointer shadow-xs hover:shadow-md hover:shadow-emerald-600/20'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>

          {/* Evening Slots */}
          <div className="bg-white/80 backdrop-blur-md border border-emerald-100 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>🌆</span> Evening Session • {selectedVenue.eveningTiming}
              </span>
              <Badge variant="mint" size="sm">
                Slots Open
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {eveningSlots.map((slot) => (
                <button
                  key={slot.id}
                  disabled={!slot.isAvailable || slot.isLocked}
                  onClick={() => handleSelectSlot(slot)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold font-mono tabular-nums transition-all ${
                    !slot.isAvailable
                      ? 'border-slate-200 bg-slate-100/80 text-slate-400 cursor-not-allowed'
                      : slot.isLocked
                      ? 'border-amber-200 bg-amber-50 text-amber-600 cursor-not-allowed'
                      : 'border-emerald-200/90 bg-emerald-50/70 hover:bg-emerald-600 hover:text-white text-emerald-900 cursor-pointer shadow-xs hover:shadow-md hover:shadow-emerald-600/20'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Booking Confirmation / Slot Lock Modal (Glassmorphic) */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setBookingConfirmed(false);
        }}
        title={bookingConfirmed ? 'Appointment Confirmed!' : 'Complete Your Booking'}
        subtitle={
          bookingConfirmed
            ? `${doctorInfo.fullName} • ${selectedVenue.clinicName} • ${selectedVenue.chamberNumber}`
            : `Slot Locked for 5 Minutes • ${selectedSlot?.time} (${selectedVenue.chamberNumber})`
        }
      >
        {!bookingConfirmed ? (
          <form onSubmit={handleConfirmBooking} className="space-y-4">
            {/* Lock Expiry Timer Banner */}
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center justify-between text-xs text-amber-800 backdrop-blur-sm">
              <span className="font-semibold flex items-center gap-1.5">
                <span>🔒</span> Slot held exclusively for you
              </span>
              <span className="font-mono tabular-nums font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                ⏱️ {formatSeconds(lockCountdown)} left
              </span>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {errorMessage}
              </div>
            )}

            <div className="space-y-3">
              <Input
                label="Patient Full Name"
                placeholder="e.g. Ramesh Kumar"
                value={patientName}
                data-testid="input-patient-name"
                onChange={(e) => setPatientName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={patientAge}
                    data-testid="input-patient-age"
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={patientGender}
                    data-testid="select-patient-gender"
                    onChange={(e) => setPatientGender(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <Input
                label="10-Digit WhatsApp Mobile Number"
                prefixText="+91"
                placeholder="98260 12345"
                value={patientMobile}
                data-testid="input-patient-mobile"
                onChange={(e) =>
                  setPatientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))
                }
                helperText="Pre-printed prescription slip & live token updates sent to WhatsApp"
                required
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Reason for Visit / Symptoms (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Routine blood pressure review, chest heaviness, follow-up"
                  value={symptoms}
                  data-testid="input-patient-symptoms"
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {[
                    'Routine Checkup',
                    'Chest Heaviness',
                    'High Blood Pressure',
                    'Breathlessness',
                    '14-Day Follow-Up Review',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setSymptoms(chip)}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* DPDP Act 2023 Explicit Consent Checkbox */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dpdpConsent}
                    data-testid="checkbox-dpdp-consent"
                    onChange={(e) => setDpdpConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-600 text-[11px] leading-relaxed">
                    <strong>DPDP Act 2023 Consent:</strong> I agree to share my name, contact number, and symptoms with {doctorInfo.fullName}&apos;s clinic for appointment scheduling and queue management on WhatsApp.
                  </span>
                </label>
              </div>
            </div>

            {/* Nominal Booking Fee vs Counter Fee Breakdown */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2 backdrop-blur-sm shadow-xs">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-600">📱</span>
                  Online Token Booking Fee:
                </span>
                <span className="font-mono text-emerald-700 text-sm font-black">₹49 (Payable Now)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-emerald-100">
                <span>Doctor Consultation Fee:</span>
                <span className="font-mono font-semibold text-slate-900">₹{selectedVenue.feeRupees} (Pay at Clinic Desk)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                💡 <span className="font-semibold text-emerald-900">Why ₹49?</span> Confirms your chamber token and prepares your physical <span className="font-semibold text-emerald-800">Pre-Consultation Prescription Sheet</span> (with Doctor NMC registration & vitals checklist) at the counter before you arrive. Doctor fees and procedures are settled directly at the clinic.
              </p>
            </div>

            {/* Instant UPI QR Simulation Box */}
            <div className="p-3.5 bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white rounded-2xl flex items-center justify-between gap-3 shadow-xl shadow-emerald-950/20 border border-emerald-500/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-xl">📲</span>
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-emerald-400">BHARAT UPI QR: bhopalcare@icici</div>
                  <div className="text-[11px] text-slate-300">Fast 1-Click Secure Payment • ₹49.00</div>
                </div>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                data-testid="btn-pay-booking-fee"
                isLoading={isLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 shadow-lg shadow-emerald-600/30"
              >
                Pay ₹49 & Confirm Appointment
              </Button>
            </div>
          </form>
        ) : (
          /* Booking Confirmed State */
          <div className="text-center py-4 space-y-5">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-50">
              ✓
            </div>

            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Your Chamber Token Number
              </span>
              <div
                data-testid="confirmed-token-number"
                className="text-5xl font-black font-mono tabular-nums text-emerald-900 mt-1"
              >
                #{allocatedToken}
              </div>
              <div className="mt-2">
                <span
                  data-testid="badge-booking-fee-paid"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                >
                  ✓ ₹49 Booking Fee Paid Online
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Please present this token at {selectedVenue.chamberNumber} reception desk
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 border border-emerald-100 text-left text-xs space-y-2 shadow-xs backdrop-blur-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-900">
                  {patientName} ({patientAge} / {patientGender === 'MALE' ? 'M' : patientGender === 'FEMALE' ? 'F' : 'O'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-bold text-slate-900">{doctorInfo.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Clinic Venue:</span>
                <span className="font-semibold text-slate-900">{selectedVenue.clinicName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chamber:</span>
                <span className="font-bold text-emerald-800">{selectedVenue.chamberNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Appointment Slot:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {selectedSlot?.time}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-emerald-100">
                <span className="text-emerald-700 font-semibold">Online Booking Fee Paid:</span>
                <span className="font-mono font-bold text-emerald-700">₹49 (UPI)</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-700">Doctor Consultation Fee Due at Desk:</span>
                <span className="font-mono text-slate-900">₹{selectedVenue.feeRupees}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-left text-xs text-emerald-950 backdrop-blur-sm">
              <p className="font-bold mb-0.5 flex items-center gap-1.5">
                <span>📋</span> Pre-Consultation Prescription Sheet Ready
              </p>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Your pre-consultation prescription sheet is being printed at the counter. The compounder will record your blood pressure, pulse, and vitals before you enter Chamber {selectedVenue.chamberNumber}.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <Link href={`/patient?token=${allocatedToken}&chamber=${selectedVenue.chamberNumber}&doctor=${encodeURIComponent(doctorInfo.fullName)}&clinic=${encodeURIComponent(selectedVenue.clinicName)}&patient=${encodeURIComponent(patientName)}`}>
                <Button variant="primary" fullWidth size="md" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20">
                  Track Live Queue Position
                </Button>
              </Link>
              <Button
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => {
                  setIsBookingModalOpen(false);
                  setBookingConfirmed(false);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Footer: Frosted Glass */}
      <footer className="bg-white/70 backdrop-blur-md border-t border-emerald-100/60 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{doctorInfo.fullName} • MediBooking.in Verified Practice</span>
          <span>Bhopal, MP, India • National Medical Commission (NMC: {doctorInfo.nmcNumber})</span>
        </div>
      </footer>
    </div>
  );
}
