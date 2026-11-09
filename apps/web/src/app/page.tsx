import React from 'react';
import Link from 'next/link';
import { Button, StatCard, ChamberBadge } from '@medibooking/ui';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/40 flex flex-col justify-between relative overflow-hidden">
      {/* Ambient Glassmorphism Orbs */}
      <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[32rem] h-[32rem] rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 -ml-40 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

      {/* Top Navbar: Frosted Glass */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-emerald-100/70 px-6 py-4 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-600/20">
              M
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                MediBooking<span className="text-emerald-600">.in</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Polyclinic Operating System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/onboarding/clinic"
              data-testid="nav-btn-onboard-clinic"
              className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs"
            >
              Launch Clinic (3 Min)
            </Link>
            <Link
              href="/onboarding/doctor"
              data-testid="nav-btn-onboard-doctor"
              className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg bg-white/90 text-slate-800 border border-slate-300 hover:bg-emerald-50 hover:text-emerald-800 transition-colors shadow-xs"
            >
              Join as Doctor
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs font-semibold">
                Staff Login
              </Button>
            </Link>
            <Link href="/tv/citycare-mpnagar-bhopal">
              <Button variant="primary" size="sm" className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20">
                Waiting Room TV
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 lg:py-16 w-full relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 text-emerald-800 border border-emerald-200/80 text-xs font-bold mb-5 shadow-xs backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Clinic-First Operations & Polyclinic SaaS (Bhopal Pilot)
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            High-Throughput Multi-Chamber Queue Management
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Engineered for rapid 15-second reception intake, real-time live waiting room displays,
            doctor delay broadcasts, and seamless patient token tracking.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/dr/dr-rajesh-sharma-cardio"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-black rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition-all transform hover:-translate-y-0.5"
            >
              📱 Book Verified Doctor (₹49 Nominal Token)
            </Link>
            <Link
              href="/onboarding/clinic"
              data-testid="hero-btn-onboard-clinic"
              className="inline-flex items-center justify-center px-5 py-3 text-sm font-bold rounded-xl bg-white/90 hover:bg-white text-slate-800 border border-slate-300 shadow-sm backdrop-blur-md transition-all hover:border-emerald-300"
            >
              ✨ Launch My Clinic (3-Min Setup)
            </Link>
            <Link
              href="/onboarding/doctor"
              data-testid="hero-btn-onboard-doctor"
              className="inline-flex items-center justify-center px-5 py-3 text-sm font-bold rounded-xl bg-white/90 hover:bg-white text-slate-800 border border-slate-300 shadow-sm backdrop-blur-md transition-all hover:border-emerald-300"
            >
              🩺 Doctor Self-Registration
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-sm font-semibold">
                Open Staff Portal
              </Button>
            </Link>
          </div>
        </div>

        {/* Business Value Cards Strip (Glassmorphism) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 shadow-md shadow-emerald-950/5 space-y-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-bold">
              ⚡
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Pre-Consultation Rx Velocity</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Reception prints A4 letterhead with Doctor NMC registration and pre-recorded vitals. Saves doctors 3–4 minutes per consultation.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 shadow-md shadow-emerald-950/5 space-y-2">
            <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center text-lg font-bold">
              🛡️
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Nominal Booking & Zero No-Shows</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Patients pay ₹49 online via UPI to commit their token. Full consultation fee (₹600) and custom procedures are settled at the clinic.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 shadow-md shadow-emerald-950/5 space-y-2">
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-lg font-bold">
              📊
            </div>
            <h3 className="font-bold text-slate-900 text-sm">80/20 Automated Split & Section 194J</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated ledger split between visiting consultants and clinic facility, with 10% TDS withholding and 1-click batch NEFT export.
            </p>
          </div>
        </div>

        {/* Live Metrics Showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <StatCard
            title="Active Chambers"
            value="4 / 4"
            subtitle="All chambers running"
            accentColor="#10B981"
            badge={{ label: '100% ONLINE', variant: 'mint' }}
          />
          <StatCard
            title="Waiting Patients"
            value="18"
            subtitle="Avg. wait: 12 mins"
            accentColor="#059669"
            badge={{ label: 'NORMAL FLOW', variant: 'blue' }}
          />
          <StatCard
            title="Consulted Today"
            value="64"
            subtitle="Settled & completed"
            accentColor="#10B981"
            badge={{ label: 'ON TRACK', variant: 'mint' }}
          />
          <StatCard
            title="Avg Intake Time"
            value="14.2s"
            subtitle="Sub-15s reception target"
            accentColor="#059669"
            badge={{ label: 'BENCHMARK MET', variant: 'mint' }}
          />
        </div>

        {/* Multi-Chamber Live Glance Preview: Glassmorphic Container */}
        <div className="bg-white/85 backdrop-blur-xl border border-white/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-950/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Live Polyclinic Chambers (Bhopal City Care)
              </h2>
              <p className="text-xs text-slate-500">
                Real-time synchronized chamber state across TV, reception, and doctor desks
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
              Chambers 1–4 Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ChamberBadge
              chamberNumber="CH-1"
              doctorName="Dr. Rajesh Sharma"
              specialty="Cardiologist"
              status="ACTIVE"
              currentCallingToken={14}
            />
            <ChamberBadge
              chamberNumber="CH-2"
              doctorName="Dr. Priya Patel"
              specialty="Dermatologist"
              status="ACTIVE"
              currentCallingToken={9}
            />
            <ChamberBadge
              chamberNumber="CH-3"
              doctorName="Dr. Amit Verma"
              specialty="Pediatrician"
              status="DELAYED"
              delayMinutes={15}
              currentCallingToken={22}
            />
            <ChamberBadge
              chamberNumber="CH-4"
              doctorName="Dr. Sunita Rao"
              specialty="Orthopedic"
              status="BREAK"
            />
          </div>
        </div>
      </section>

      {/* Footer: Frosted Glass */}
      <footer className="bg-white/70 backdrop-blur-md border-t border-emerald-100/60 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 MediBooking.in — Clinic-First Operations & Polyclinic SaaS</span>
          <span>Bhopal, MP, India • WCAG AAA Healthcare Tokens</span>
        </div>
      </footer>
    </main>
  );
}
