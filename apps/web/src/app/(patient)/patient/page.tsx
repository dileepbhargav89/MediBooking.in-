'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, Badge, StatCard, getChamberStyle } from '@medibooking/ui';

interface PatientTokenState {
  tokenNumber: number;
  patientName: string;
  doctorName: string;
  specialty: string;
  clinicName: string;
  chamberNumber: string;
  currentCallingToken: number;
  status: 'SCHEDULED' | 'WAITING' | 'CALLING' | 'IN_CONSULTATION' | 'COMPLETED';
  delayMinutes: number;
  avgConsultationMinutes: number;
  whatsappOptIn: boolean;
  appointmentTime: string;
}

const INITIAL_TOKEN_STATE: PatientTokenState = {
  tokenNumber: 14,
  patientName: 'R*** Sharma',
  doctorName: 'Dr. Rajesh Sharma',
  specialty: 'Cardiologist',
  clinicName: 'Bhopal City Care Polyclinic',
  chamberNumber: 'CH-1',
  currentCallingToken: 11,
  status: 'WAITING',
  delayMinutes: 0,
  avgConsultationMinutes: 8,
  whatsappOptIn: true,
  appointmentTime: '10:30 AM',
};

export default function PatientQueueTrackerPage() {
  const [tokenState, setTokenState] = useState<PatientTokenState>(INITIAL_TOKEN_STATE);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [whatsappActive, setWhatsappActive] = useState(true);

  const tokensAhead = Math.max(0, tokenState.tokenNumber - tokenState.currentCallingToken);
  const isMyTurn = tokenState.tokenNumber === tokenState.currentCallingToken;
  const estimatedWait =
    tokensAhead === 0 ? 0 : tokensAhead * tokenState.avgConsultationMinutes + tokenState.delayMinutes;

  const chamberStyle = getChamberStyle(tokenState.chamberNumber);

  // Auto-refresh simulation every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefreshed(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshed(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 400);
  };

  // Demo simulator helper to fast forward token
  const handleSimulateCall = () => {
    setTokenState((prev) => ({
      ...prev,
      currentCallingToken: prev.tokenNumber,
      status: 'CALLING',
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-sm">
              M
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900 block leading-tight">
                MediBooking<span className="text-blue-600">.in</span>
              </span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Live Queue Tracker
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              isLoading={isRefreshing}
            >
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Tracker Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
        {/* Token Calling Announcement Banner */}
        {isMyTurn ? (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg animate-pulse text-center space-y-2">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider inline-block">
              🔔 IT&apos;S YOUR TURN NOW!
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Token #{tokenState.tokenNumber} Called!
            </h2>
            <p className="text-sm font-medium text-emerald-100">
              Please enter <span className="font-bold underline">{tokenState.chamberNumber}</span> immediately. Doctor is ready for consultation.
            </p>
          </div>
        ) : tokenState.delayMinutes > 0 ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <span className="font-bold block">Doctor Delay Announcement</span>
                <span>
                  Doctor announced a {tokenState.delayMinutes}-minute delay. Revised wait time updated below.
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Hero Token Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Your Assigned Token
              </span>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-5xl sm:text-6xl font-black font-mono tabular-nums text-slate-900 tracking-tight">
                  #{tokenState.tokenNumber}
                </span>
                <Badge variant={isMyTurn ? 'mint' : 'blue'} size="md" dot pulse={isMyTurn}>
                  {isMyTurn ? 'Inside Chamber' : 'Waiting Outside'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Patient: <span className="font-bold text-slate-800">{tokenState.patientName}</span>
              </p>
            </div>

            <div className="sm:text-right">
              <span
                className="inline-block px-3 py-1 rounded-lg text-sm font-bold font-mono border mb-1"
                style={{
                  backgroundColor: chamberStyle.bg,
                  borderColor: chamberStyle.border,
                  color: chamberStyle.text,
                }}
              >
                {tokenState.chamberNumber}
              </span>
              <p className="text-xs font-bold text-slate-900">{tokenState.doctorName}</p>
              <p className="text-[11px] text-slate-500">{tokenState.specialty}</p>
            </div>
          </div>

          {/* Real-time Wait Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 pt-6 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Calling Now
              </span>
              <span className="text-2xl font-black font-mono tabular-nums text-blue-700 mt-1 block">
                #{tokenState.currentCallingToken}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Ahead of You
              </span>
              <span className="text-2xl font-black font-mono tabular-nums text-slate-900 mt-1 block">
                {tokensAhead}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Est. Wait
              </span>
              <span className="text-2xl font-black font-mono tabular-nums text-emerald-600 mt-1 block">
                {tokensAhead === 0 ? 'Now!' : `~${estimatedWait}m`}
              </span>
            </div>
          </div>
        </div>

        {/* Stepper Progress */}
        <Card className="p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Consultation Progress
          </h3>
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 z-0" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 z-0 transition-all duration-300"
              style={{
                width: isMyTurn ? '100%' : '50%',
              }}
            />

            {/* Step 1: Arrived */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                ✓
              </div>
              <span className="text-[11px] font-bold text-slate-800 mt-1.5">Checked In</span>
            </div>

            {/* Step 2: Waiting in Lounge */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`h-7 w-7 rounded-full font-bold text-xs flex items-center justify-center ${
                  isMyTurn ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white animate-pulse'
                }`}
              >
                2
              </div>
              <span className="text-[11px] font-bold text-slate-800 mt-1.5">In Waiting Area</span>
            </div>

            {/* Step 3: Chamber Consultation */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`h-7 w-7 rounded-full font-bold text-xs flex items-center justify-center ${
                  isMyTurn
                    ? 'bg-emerald-600 text-white animate-ping ring-4 ring-emerald-200'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                3
              </div>
              <span className="text-[11px] font-bold text-slate-600 mt-1.5">Consultation</span>
            </div>
          </div>
        </Card>

        {/* Clinic & Cashiering Card */}
        <Card className="p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Venue & Cashiering Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Clinic Location:</span>
              <span className="font-bold text-slate-900 block mt-0.5">{tokenState.clinicName}</span>
              <span className="text-slate-500">Plot 42, MP Nagar Zone II, Bhopal</span>
            </div>
            <div>
              <span className="text-slate-400 block">Consultation Fee:</span>
              <span className="font-bold text-slate-900 block mt-0.5">₹600</span>
              <span className="text-emerald-700 font-medium">
                Pay at {tokenState.chamberNumber} reception desk (Cash / UPI)
              </span>
            </div>
          </div>
        </Card>

        {/* WhatsApp Notification Preference */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
              💬
            </div>
            <div>
              <span className="font-bold text-slate-900 block">WhatsApp Live Queue Alerts</span>
              <span className="text-slate-500">Receive token calls and delay alerts on phone</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWhatsappActive(!whatsappActive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              whatsappActive
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {whatsappActive ? '✓ Active' : 'Enable'}
          </button>
        </div>

        {/* Demo Fast-Forward Helper */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleSimulateCall}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
          >
            ⚡ Demo: Simulate Token #14 Being Called Right Now
          </button>
          <span className="text-[11px] text-slate-400 block mt-1">
            Last updated: {lastRefreshed}
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MediBooking.in • Live Patient Portal</span>
          <span>Bhopal, MP, India</span>
        </div>
      </footer>
    </div>
  );
}

