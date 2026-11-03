'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button, Input, Card, Badge, Modal } from '@medibooking/ui';

interface SlotItem {
  id: string;
  time: string;
  session: 'MORNING' | 'EVENING';
  isAvailable: boolean;
  isLocked?: boolean;
}

interface PracticeVenue {
  clinicId: string;
  clinicName: string;
  address: string;
  chamberNumber: string;
  feeRupees: number;
  morningTiming: string;
  eveningTiming: string;
}

const DEFAULT_VENUES: PracticeVenue[] = [
  {
    clinicId: 'c1010000-0000-4000-8000-000000000001',
    clinicName: 'Bhopal City Care Polyclinic',
    address: 'Plot 42, MP Nagar Zone II, Bhopal',
    chamberNumber: 'CH-1',
    feeRupees: 600,
    morningTiming: '10:00 AM – 01:00 PM',
    eveningTiming: '05:30 PM – 08:30 PM',
  },
  {
    clinicId: 'c1020000-0000-4000-8000-000000000002',
    clinicName: 'Arera Super Specialty Polyclinic',
    address: 'E-3 Commercial Complex, Arera Colony, Bhopal',
    chamberNumber: 'CH-3',
    feeRupees: 800,
    morningTiming: '08:30 AM – 10:00 AM',
    eveningTiming: '04:00 PM – 05:30 PM',
  },
];

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

  const [selectedVenue, setSelectedVenue] = useState<PracticeVenue>(DEFAULT_VENUES[0]!);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number>(300); // 5 minutes
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [symptoms, setSymptoms] = useState('');
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-sm">
              M
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">
              MediBooking<span className="text-blue-600">.in</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Staff Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Profile & Booking Flow */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
        {/* Doctor Master Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-md shrink-0">
                DR
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Dr. Rajesh Sharma
                  </h1>
                  <Badge variant="mint" size="sm" dot>
                    Verified Practitioner
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-blue-700">
                  MBBS, MD, DM (Cardiology) • Senior Interventional Cardiologist
                </p>
                <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-xs text-slate-500 font-medium">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700 font-semibold">
                    🛡️ NMC: MP-38492
                  </span>
                  <span>•</span>
                  <span>18+ Years Experience</span>
                  <span>•</span>
                  <span>Hindi, English</span>
                </div>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <span className="text-xs text-slate-400 font-medium block">Consultation Fee</span>
              <span className="text-3xl font-black text-slate-900 font-mono tabular-nums">
                ₹{selectedVenue.feeRupees}
              </span>
              <span className="text-xs text-emerald-600 font-semibold block mt-0.5">
                Pay at Clinic Desk
              </span>
            </div>
          </div>
        </div>

        {/* Practice Venue / Polyclinic Selection */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            1. Select Practice Location in Bhopal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEFAULT_VENUES.map((venue) => {
              const isSelected = venue.clinicId === selectedVenue.clinicId;
              return (
                <div
                  key={venue.clinicId}
                  onClick={() => setSelectedVenue(venue)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-bold text-slate-900 text-sm truncate">
                      {venue.clinicName}
                    </h3>
                    <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-blue-100 text-blue-800">
                      {venue.chamberNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2 truncate">{venue.address}</p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Fee: ₹{venue.feeRupees}</span>
                    <span className="text-emerald-700 font-semibold">
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
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            2. Choose Consultation Date
          </h2>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {dates.map((d) => {
              const isSelected = d.index === selectedDateIndex;
              return (
                <button
                  key={d.index}
                  type="button"
                  onClick={() => setSelectedDateIndex(d.index)}
                  className={`min-w-24 p-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
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
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              3. Available Time Slots ({selectedVenue.chamberNumber})
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Booked
              </span>
            </div>
          </div>

          {/* Morning Slots */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Morning Session • {selectedVenue.morningTiming}
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
                  className={`py-2.5 px-3 rounded-lg border text-xs font-bold font-mono tabular-nums transition-all ${
                    !slot.isAvailable
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : slot.isLocked
                      ? 'border-amber-200 bg-amber-50 text-amber-600 cursor-not-allowed'
                      : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 cursor-pointer shadow-xs'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>

          {/* Evening Slots */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Evening Session • {selectedVenue.eveningTiming}
              </span>
              <Badge variant="blue" size="sm">
                Slots Open
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {eveningSlots.map((slot) => (
                <button
                  key={slot.id}
                  disabled={!slot.isAvailable || slot.isLocked}
                  onClick={() => handleSelectSlot(slot)}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-bold font-mono tabular-nums transition-all ${
                    !slot.isAvailable
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : slot.isLocked
                      ? 'border-amber-200 bg-amber-50 text-amber-600 cursor-not-allowed'
                      : 'border-blue-200 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-800 cursor-pointer shadow-xs'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Booking Confirmation / Slot Lock Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setBookingConfirmed(false);
        }}
        title={bookingConfirmed ? 'Appointment Confirmed!' : 'Complete Your Booking'}
        subtitle={
          bookingConfirmed
            ? `Dr. Rajesh Sharma • ${selectedVenue.clinicName} • ${selectedVenue.chamberNumber}`
            : `Slot Locked for 5 Minutes • ${selectedSlot?.time} (${selectedVenue.chamberNumber})`
        }
      >
        {!bookingConfirmed ? (
          <form onSubmit={handleConfirmBooking} className="space-y-4">
            {/* Lock Expiry Timer Banner */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
              <span className="font-medium">Slot held exclusively for you</span>
              <span className="font-mono tabular-nums font-bold">
                ⏱️ {formatSeconds(lockCountdown)} left
              </span>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {errorMessage}
              </div>
            )}

            <Input
              label="Patient Full Name"
              placeholder="e.g. Ramesh Kumar"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              required
            />

            <Input
              label="10-Digit WhatsApp Mobile Number"
              prefixText="+91"
              placeholder="98260 12345"
              value={patientMobile}
              onChange={(e) =>
                setPatientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))
              }
              helperText="You will receive token updates and live delay notifications on WhatsApp"
              required
            />

            <Input
              label="Reason for Visit / Symptoms (Optional)"
              placeholder="e.g. Routine blood pressure review, chest heaviness"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />

            {/* Zero Online Charge Disclaimer */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>Direct Clinic Cashiering (Flow B)</span>
                <span className="text-emerald-700">₹0 Payable Now</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Doctor consultation fee of ₹{selectedVenue.feeRupees} is settled directly at the{' '}
                {selectedVenue.chamberNumber} reception desk via Cash or UPI QR.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              Confirm Appointment & Reserve Token
            </Button>
          </form>
        ) : (
          /* Booking Confirmed State */
          <div className="text-center py-4 space-y-5">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-black">
              ✓
            </div>

            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Your Chamber Token Number
              </span>
              <div className="text-5xl font-black font-mono tabular-nums text-slate-900 mt-1">
                #{allocatedToken}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Please present this token at {selectedVenue.chamberNumber} reception desk
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient Name:</span>
                <span className="font-bold text-slate-900">{patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-bold text-slate-900">Dr. Rajesh Sharma</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Clinic Venue:</span>
                <span className="font-semibold text-slate-900">{selectedVenue.clinicName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chamber:</span>
                <span className="font-bold text-blue-700">{selectedVenue.chamberNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Appointment Slot:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {selectedSlot?.time}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                <span className="text-slate-700">Counter Fee:</span>
                <span className="font-mono text-slate-900">₹{selectedVenue.feeRupees}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Link href="/patient">
                <Button variant="primary" fullWidth size="md">
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Dr. Rajesh Sharma • MediBooking.in Verified Practice</span>
          <span>Bhopal, MP, India</span>
        </div>
      </footer>
    </div>
  );
}

