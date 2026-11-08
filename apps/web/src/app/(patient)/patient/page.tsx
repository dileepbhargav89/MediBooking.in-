'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Badge, StatCard, getChamberStyle } from '@medibooking/ui';

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

  // Phase 54 & Phase 60: Two-Way WhatsApp Bot Assistant State
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; sender: 'PATIENT' | 'BOT'; text: string; time: string }>
  >([
    {
      id: 'm1',
      sender: 'BOT',
      text: '🙏 नमस्ते! MediBooking.in भोपाल केयर WhatsApp बॉट में आपका स्वागत है।\n1-टैप टोकन प्राप्त करने के लिए "HI" या "BOOK" लिखें, अथवा नीचे दिए गए बटन्स का उपयोग करें।',
      time: 'Just now',
    },
  ]);
  const [inputCommand, setInputCommand] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Sync token from URL query params (e.g., from WhatsApp live tracking link: /patient?token=18&chamber=CH-1)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('token');
      const chamberParam = params.get('chamber');
      if (tokenParam) {
        const parsedToken = parseInt(tokenParam, 10);
        if (!isNaN(parsedToken)) {
          setTokenState((prev) => ({
            ...prev,
            tokenNumber: parsedToken,
            chamberNumber: chamberParam || prev.chamberNumber,
            patientName: 'WhatsApp 1-Tap Patient',
            status: 'WAITING',
          }));
        }
      }
    }
  }, []);

  const sendWhatsAppCommand = async (commandText: string) => {
    if (!commandText.trim()) return;
    const timeNow = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: `user-${Date.now()}`, sender: 'PATIENT' as const, text: commandText, time: timeNow };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputCommand('');
    setIsBotTyping(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
      const res = await fetch(`${apiBase}/api/v1/whatsapp/simulate-inbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderMobile: '9826011111',
          messageText: commandText,
        }),
      });
      const data = await res.json();
      if (data?.botReply?.replyText) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'BOT',
            text: data.botReply.replyText,
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        // Auto-update on-screen token if a new token was issued via WhatsApp DPDP Agreement
        if (data.botReply.tokenInfo?.tokenNumber) {
          setTokenState((prev) => ({
            ...prev,
            tokenNumber: data.botReply.tokenInfo.tokenNumber,
            chamberNumber: data.botReply.tokenInfo.chamberNumber || prev.chamberNumber,
            patientName: 'WhatsApp 1-Tap Patient',
            status: 'WAITING',
            currentCallingToken: data.botReply.tokenInfo.callingNow || prev.currentCallingToken,
          }));
        }
      }
    } catch {
      // Local fallback simulation
      const upper = commandText.trim().toUpperCase();
      let fallbackText = `🙏 *नमस्ते Ramesh Kumar!*\n\n📋 *आपकी टोकन स्थिति (Live Token Status)*:\n• टोकन क्रमांक: #15\n• कक्ष (Chamber): CH-1 (डॉ. Rajesh Sharma)\n• स्थिति: WAITING`;
      if (upper === 'HI' || upper === 'BOOK') {
        fallbackText = `🙏 *नमस्ते! MediBooking.in भोपाल केयर*\n\nडॉ. राजेश शर्मा (CH-1) के साथ लाइव टोकन प्राप्त करने के लिए कृपया सहमति दें:\n\n📜 *DPDP Act 2023 Digital Consent*:\nआपका मोबाइल नंबर केवल टोकन स्थिति एवं पर्ची भेजने हेतु उपयोग किया जाएगा।\n\nकृपया आगे बढ़ने हेतु *AGREE* या *सहमत* चुनें।`;
      } else if (upper === 'AGREE' || upper === 'सहमत') {
        fallbackText = `🎉 *अपॉइंटमेंट टोकन पुष्टिकरण (Token Confirmed)!*\n\n• टोकन क्रमांक: *#18*\n• कक्ष (Chamber): *CH-1* (डॉ. राजेश शर्मा)\n• स्थिति: *WAITING*\n• DPDP सहमति: *प्रदत्त (Recorded)*\n\n🔗 ट्रैकिंग: http://localhost:3000/patient?token=18&chamber=CH-1`;
        setTokenState((prev) => ({
          ...prev,
          tokenNumber: 18,
          patientName: 'WhatsApp 1-Tap Patient',
          status: 'WAITING',
        }));
      }
      setChatMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'BOT',
          text: fallbackText,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsBotTyping(false);
    }
  };

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
                <span
                  data-testid="assigned-token-number"
                  className="text-5xl sm:text-6xl font-black font-mono tabular-nums text-slate-900 tracking-tight"
                >
                  #{tokenState.tokenNumber}
                </span>
                <Badge variant={isMyTurn ? 'mint' : 'blue'} size="md" dot pulse={isMyTurn}>
                  {isMyTurn ? 'Inside Chamber' : 'Waiting Outside'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Patient: <span className="font-bold text-slate-800">{tokenState.patientName}</span>
              </p>
              {tokenState.patientName.includes('WhatsApp') && (
                <span
                  data-testid="badge-whatsapp-onboarding"
                  className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                >
                  <span>📱</span>
                  <span>WhatsApp 1-Tap Booking • DPDP Verified</span>
                </span>
              )}
            </div>

            <div className="sm:text-right">
              <span className="text-xs text-slate-500 block">Consultation Chamber</span>
              <div className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-base shadow-xs"
                style={{
                  backgroundColor: chamberStyle.bg,
                  borderColor: chamberStyle.border,
                  color: chamberStyle.accent,
                }}
              >
                <span data-testid="assigned-chamber-number">{tokenState.chamberNumber}</span>
                <span className="text-slate-400 font-normal">|</span>
                <span className="text-slate-800">{tokenState.doctorName}</span>
              </div>
              <span className="block text-xs text-slate-500 mt-1 font-medium">
                {tokenState.specialty} • {tokenState.clinicName}
              </span>
            </div>
          </div>

          {/* Real-Time Queue Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6">
            <StatCard
              label="Currently Calling"
              value={`#${tokenState.currentCallingToken}`}
              highlight={isMyTurn}
              subtext="Inside Doctor's Chamber"
            />
            <StatCard
              label="Patients Ahead"
              value={tokensAhead === 0 ? 'Next Up!' : tokensAhead.toString()}
              subtext="In Waiting Lounge"
            />
            <StatCard
              label="Estimated Wait"
              value={isMyTurn ? '0 mins' : `~${estimatedWait} mins`}
              subtext={tokenState.delayMinutes > 0 ? `Includes +${tokenState.delayMinutes}m delay` : 'Based on 8m avg pace'}
              className="col-span-2 sm:col-span-1"
            />
          </div>

          {/* Pre-Consultation Prescription Sheet Ready Notice */}
          <div className="mt-6 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📋</span>
              <div>
                <span className="font-bold text-blue-900 block">
                  Pre-Consultation Prescription Sheet Prepared
                </span>
                <span className="text-slate-600 text-[11px]">
                  Your prescription slip with Dr. Rajesh Sharma&apos;s NMC details is ready at the reception desk. Please have your BP and pulse checked by the compounder before chamber call.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] shrink-0 font-mono">
              ₹49 BOOKING PAID
            </span>
          </div>
        </div>

        {/* Phase 54 & Phase 60: Two-Way WhatsApp Cloud Bot Interactive Assistant */}
        <div data-testid="wa-chat-container" className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* WhatsApp Header */}
          <div className="bg-[#075E54] text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#25D366] flex items-center justify-center font-bold text-white text-lg shadow-sm">
                💬
              </div>
              <div>
                <span className="text-sm font-bold block leading-tight flex items-center gap-1.5">
                  MediBooking Bhopal Care Bot
                  <span className="text-[10px] bg-emerald-700 px-1.5 py-0.5 rounded font-mono font-medium">
                    2-Way AI
                  </span>
                </span>
                <span className="text-[11px] text-emerald-200">
                  Online • 1-Tap Intake & DPDP Act 2023 Compliant
                </span>
              </div>
            </div>
            <span className="text-[11px] text-emerald-100 hidden sm:inline">
              +91 755 4019283
            </span>
          </div>

          {/* Chat Message Stream */}
          <div className="p-4 bg-[#ECE5DD] min-h-[180px] max-h-[300px] overflow-y-auto space-y-3 font-sans">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'PATIENT' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs shadow-sm whitespace-pre-line leading-relaxed ${
                    msg.sender === 'PATIENT'
                      ? 'bg-[#DCF8C6] text-slate-900 rounded-tr-none'
                      : 'bg-white text-slate-800 rounded-tl-none border border-slate-200/50'
                  }`}
                >
                  {msg.text}
                  <div
                    className={`text-[9px] mt-1 flex items-center gap-1 justify-end ${
                      msg.sender === 'PATIENT' ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    <span>{msg.time}</span>
                    {msg.sender === 'PATIENT' && <span className="font-bold">✓✓</span>}
                  </div>
                </div>
              </div>
            ))}
            {isBotTyping && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500 italic bg-white/70 px-2 py-1 rounded w-fit">
                <span>Bot is typing...</span>
              </div>
            )}
          </div>

          {/* Interactive WhatsApp Quick Command Chips */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                data-testid="wa-chip-book"
                onClick={() => sendWhatsAppCommand('HI')}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
              >
                👋 1-Tap Book (शुरू करें)
              </button>
              <button
                type="button"
                data-testid="wa-chip-agree"
                onClick={() => sendWhatsAppCommand('AGREE')}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 border border-teal-300 text-teal-800 hover:bg-teal-100 transition-colors shadow-xs"
              >
                ✅ Agree DPDP (सहमत)
              </button>
              <button
                type="button"
                data-testid="wa-chip-status"
                onClick={() => sendWhatsAppCommand('STATUS')}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition-colors shadow-xs"
              >
                📊 STATUS
              </button>
              <button
                type="button"
                data-testid="wa-chip-delay"
                onClick={() => sendWhatsAppCommand('DELAY')}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition-colors shadow-xs"
              >
                ⏳ DELAY
              </button>
              <button
                type="button"
                data-testid="wa-chip-cancel"
                onClick={() => sendWhatsAppCommand('CANCEL')}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:border-red-500 hover:text-red-700 transition-colors shadow-xs"
              >
                ❌ CANCEL
              </button>
              <button
                type="button"
                data-testid="wa-chip-help"
                onClick={() => sendWhatsAppCommand('HELP')}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:border-blue-500 hover:text-blue-700 transition-colors shadow-xs"
              >
                ❓ HELP
              </button>
            </div>

            {/* Custom text sender */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendWhatsAppCommand(inputCommand);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                data-testid="wa-input-command"
                placeholder="Type WhatsApp keyword (e.g. HI, AGREE, STATUS)..."
                value={inputCommand}
                onChange={(e) => setInputCommand(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              <button
                type="submit"
                data-testid="wa-btn-send"
                className="px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold shadow-sm transition-colors"
              >
                Send
              </button>
            </form>
          </div>
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
