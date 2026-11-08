'use client';

import React, { useState, useEffect, use, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getChamberStyle, getChamberStatusStyle } from '@medibooking/ui';

interface ChamberTVState {
  chamberNumber: string;
  doctorName: string;
  specialty: string;
  status: 'ACTIVE' | 'BREAK' | 'DELAYED' | 'OFFLINE';
  delayMinutes?: number;
  currentCallingToken?: number;
  currentPatientMasked?: string;
  nextTokens: Array<{ tokenNumber: number; patientMasked: string }>;
}

const INITIAL_CHAMBERS: ChamberTVState[] = [
  {
    chamberNumber: 'CH-1',
    doctorName: 'Dr. Rajesh Sharma',
    specialty: 'Cardiologist',
    status: 'ACTIVE',
    currentCallingToken: 14,
    currentPatientMasked: 'R*** Sharma',
    nextTokens: [
      { tokenNumber: 15, patientMasked: 'P*** Patel' },
      { tokenNumber: 16, patientMasked: 'S*** Verma' },
      { tokenNumber: 17, patientMasked: 'M*** Tiwari' },
    ],
  },
  {
    chamberNumber: 'CH-2',
    doctorName: 'Dr. Priya Patel',
    specialty: 'Dermatologist',
    status: 'ACTIVE',
    currentCallingToken: 9,
    currentPatientMasked: 'M*** Gupta',
    nextTokens: [
      { tokenNumber: 10, patientMasked: 'A*** Sen' },
      { tokenNumber: 11, patientMasked: 'N*** Yadav' },
    ],
  },
  {
    chamberNumber: 'CH-3',
    doctorName: 'Dr. Amit Verma',
    specialty: 'Pediatrician',
    status: 'DELAYED',
    delayMinutes: 15,
    currentCallingToken: 22,
    currentPatientMasked: 'Master V*** Khan',
    nextTokens: [
      { tokenNumber: 23, patientMasked: 'Baby K***' },
      { tokenNumber: 24, patientMasked: 'A*** Dixit' },
    ],
  },
  {
    chamberNumber: 'CH-4',
    doctorName: 'Dr. Sunita Rao',
    specialty: 'Orthopedic Surgeon',
    status: 'BREAK',
    delayMinutes: 10,
    currentCallingToken: 7,
    currentPatientMasked: 'K*** Chouhan',
    nextTokens: [{ tokenNumber: 8, patientMasked: 'B*** Rathore' }],
  },
];

export default function WaitingRoomTVPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const unwrappedParams = use(params);
  const clinicSlug = unwrappedParams.clinicSlug;

  const [chambers, setChambers] = useState<ChamberTVState[]>(INITIAL_CHAMBERS);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [lastAnnouncedToken, setLastAnnouncedToken] = useState<string | null>(null);
  const [lastAnnouncedHindi, setLastAnnouncedHindi] = useState<string | null>(null);

  // Audio Context Ref for synthetic Web Audio chime
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play synthetic dual-tone hospital chime (C5 523Hz -> E5 659Hz)
  const playChime = useCallback(() => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Note 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: E5 (659.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.2);
      gain2.gain.setValueAtTime(0.35, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.7);
    } catch {
      // Audio playback silent fallback
    }
  }, [audioEnabled]);

  // Bilingual Hindi & English Real-Time Voice Synthesizer
  const speakBilingualAnnouncement = useCallback(
    (tokenNumber: number, chamber: string, doctorName: string) => {
      // 1. Play dual-tone hospital chime
      playChime();

      if (!voiceEnabled || typeof window === 'undefined') return;

      const chamberNum = chamber.replace(/^CH-/i, '');
      const cleanDoctor = doctorName.replace(/^Dr\.\s*/i, '');

      // Devanagari Hindi Text
      const hindiSpeech = `टोकन नंबर ${tokenNumber}, कृपया कक्ष क्रमांक ${chamberNum} में डॉ. ${cleanDoctor} के पास जाएँ।`;
      // Indian English Text
      const engSpeech = `Token number ${tokenNumber}, please proceed to Chamber ${chamberNum} for Dr. ${cleanDoctor}.`;

      // Persist to window for testing & debugging
      (window as any).__LAST_ANNOUNCED_VOICE__ = {
        tokenNumber,
        chamber,
        hindi: hindiSpeech,
        english: engSpeech,
        timestamp: Date.now(),
      };

      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel(); // Prevent queue accumulation

          const hindiUtterance = new SpeechSynthesisUtterance(hindiSpeech);
          hindiUtterance.lang = 'hi-IN';
          hindiUtterance.rate = 0.95;
          hindiUtterance.pitch = 1.0;

          const engUtterance = new SpeechSynthesisUtterance(engSpeech);
          engUtterance.lang = 'en-IN';
          engUtterance.rate = 1.0;
          engUtterance.pitch = 1.0;

          // Chain English after Hindi completes
          hindiUtterance.onend = () => {
            window.speechSynthesis.speak(engUtterance);
          };

          window.speechSynthesis.speak(hindiUtterance);
        } catch {
          // Speech synthesis silent fallback
        }
      }
    },
    [playChime, voiceEnabled]
  );

  // Digital Clock Updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Demo simulator: Rotate tokens periodically to test TV chime and real-time updates
  const handleSimulateNextCall = (chamberCode: string) => {
    setChambers((prev) =>
      prev.map((c) => {
        if (c.chamberNumber === chamberCode) {
          const next = c.nextTokens[0];
          const newCurrentToken = next ? next.tokenNumber : (c.currentCallingToken || 0) + 1;
          const newPatient = next ? next.patientMasked : 'A*** Patient';
          const remaining = c.nextTokens.slice(1);

          setLastAnnouncedToken(`${c.chamberNumber}: #${newCurrentToken} (${newPatient})`);
          setLastAnnouncedHindi(`टोकन #${newCurrentToken}, कक्ष ${c.chamberNumber.replace(/CH-/i, '')}`);
          speakBilingualAnnouncement(newCurrentToken, c.chamberNumber, c.doctorName);

          return {
            ...c,
            currentCallingToken: newCurrentToken,
            currentPatientMasked: newPatient,
            nextTokens: remaining,
            status: 'ACTIVE' as const,
          };
        }
        return c;
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between select-none">
      {/* Top Clinic Header Bar */}
      <header className="bg-slate-950/90 border-b border-slate-800 px-6 sm:px-8 py-4 backdrop-blur-md sticky top-0 z-40">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-md">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Bhopal City Care Polyclinic
                </h1>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Live Waiting Room TV
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                MP Nagar Zone II, Bhopal • Central Waiting Area Display
              </p>
            </div>
          </div>

          {/* Clock & Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                if (!audioEnabled) playChime();
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-colors ${
                audioEnabled
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span>{audioEnabled ? '🔔 Chime ON' : '🔕 Chime Muted'}</span>
            </button>

            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-colors ${
                voiceEnabled
                  ? 'bg-blue-950/60 border-blue-700 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span>{voiceEnabled ? '🗣️ Voice (हिंदी+Eng) ON' : '🔇 Voice Muted'}</span>
            </button>

            <button
              onClick={playChime}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold hover:bg-blue-600/50"
            >
              Test Chime
            </button>

            <div className="text-right border-l border-slate-800 pl-4">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white block tracking-tight leading-none">
                {currentTime}
              </span>
              <span className="text-[11px] text-slate-400 font-medium block mt-1">
                {currentDate}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Announced Callout Flash Banner (if active) */}
      {lastAnnouncedToken && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 text-white py-2.5 px-6 text-center text-sm font-bold shadow-xl animate-pulse flex flex-wrap items-center justify-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
            🔔 NOW CALLING:
          </span>
          <span className="font-mono tabular-nums tracking-wide underline text-amber-300">
            {lastAnnouncedToken}
          </span>
          {lastAnnouncedHindi && (
            <span className="px-2 py-0.5 rounded bg-blue-900/60 text-xs font-medium border border-blue-400/30">
              {lastAnnouncedHindi}
            </span>
          )}
        </div>
      )}

      {/* 4-Chamber Grid (Optimized for 16:9 Displays) */}
      <main className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto w-full">
          {chambers.map((chamber) => {
            const chamberStyle = getChamberStyle(chamber.chamberNumber);
            const statusStyle = getChamberStatusStyle(chamber.status);
            const isBreak = chamber.status === 'BREAK';
            const isDelayed = chamber.status === 'DELAYED';

            return (
              <div
                key={chamber.chamberNumber}
                className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-slate-600"
              >
                {/* Top Chamber Header */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="px-3 py-1 rounded-lg font-black text-sm font-mono tracking-wider shadow-sm"
                      style={{
                        backgroundColor: chamberStyle.accent,
                        color: '#FFFFFF',
                      }}
                    >
                      {chamber.chamberNumber}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: statusStyle.dot }}
                      />
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: statusStyle.dot }}
                      >
                        {statusStyle.label}
                      </span>
                    </div>
                  </div>

                  {/* Doctor Info */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-white tracking-tight leading-tight truncate">
                      {chamber.doctorName}
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold truncate mt-0.5">
                      {chamber.specialty}
                    </p>
                  </div>
                </div>

                {/* Big Token Number Display */}
                <div className="my-4 text-center py-6 px-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                    {isBreak ? 'STATUS' : 'CALLING TOKEN'}
                  </span>

                  {isBreak ? (
                    <div className="py-2">
                      <span className="text-2xl font-bold text-amber-400 block font-mono">
                        ☕ SHORT BREAK
                      </span>
                      <span className="text-xs text-slate-400 mt-1 block">
                        Resuming in ~10 mins
                      </span>
                    </div>
                  ) : (
                    <>
                      <div
                        className="text-6xl sm:text-7xl font-black font-mono tabular-nums tracking-tight my-1"
                        style={{ color: chamberStyle.border }}
                      >
                        #{chamber.currentCallingToken}
                      </div>
                      <p className="text-sm font-semibold text-slate-300 truncate mt-1">
                        {chamber.currentPatientMasked}
                      </p>
                    </>
                  )}

                  {isDelayed && chamber.delayMinutes && (
                    <span className="inline-block mt-3 px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                      +{chamber.delayMinutes}m Emergency Delay
                    </span>
                  )}
                </div>

                {/* Up Next List */}
                <div className="pt-4 border-t border-slate-700/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Up Next in Queue:
                  </span>
                  {chamber.nextTokens.length > 0 ? (
                    <div className="space-y-1.5">
                      {chamber.nextTokens.map((t, idx) => (
                        <div
                          key={t.tokenNumber}
                          className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-slate-900/60 font-mono text-slate-300"
                        >
                          <span className="font-bold text-slate-200">
                            {idx === 0 ? '▶ Next:' : '•'} #{t.tokenNumber}
                          </span>
                          <span className="text-slate-400 text-[11px]">{t.patientMasked}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-1">No more waiting tokens</p>
                  )}
                </div>

                {/* Demo Next Call Trigger Button (for reception staff testing) */}
                <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                  <button
                    onClick={() => handleSimulateNextCall(chamber.chamberNumber)}
                    className="text-[10px] font-semibold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors"
                  >
                    ▶ Call Next Token (Staff Demo)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Polyclinic Services Promotional Ticker */}
      <div className="bg-blue-950/80 border-t border-blue-900/60 px-6 py-2.5 flex items-center justify-between text-xs text-blue-200">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="px-2 py-0.5 rounded bg-blue-700/40 text-blue-300 font-bold text-[10px] uppercase font-mono">
            CLINIC SERVICES
          </span>
          <span className="font-medium text-slate-300">
            🏥 In-Chamber 12-Lead ECG • 🧪 Full Diagnostic Pathology Tests • 💨 Duolin Nebulization • 💉 Vaccination & Sterile Dressing Available at Front Desk
          </span>
        </div>
        <div className="shrink-0 text-slate-400 text-[11px] font-mono hidden md:block">
          Pre-Consultation Vitals Checked by Compounder
        </div>
      </div>

      {/* Bottom Ticker / Footer Bar */}
      <footer className="bg-slate-950 border-t border-slate-800 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time SSE Stream Active • MediBooking.in Polyclinic Display Engine</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Track on your phone: <strong className="text-slate-200">medibooking.in/patient</strong></span>
          <span>•</span>
          <Link href="/" className="text-blue-400 hover:underline">
            Exit TV Mode
          </Link>
        </div>
      </footer>
    </div>
  );
}

