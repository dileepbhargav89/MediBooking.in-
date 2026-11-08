import React from 'react';
import Link from 'next/link';
import { Button, StatCard, ChamberBadge } from '@medibooking/ui';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-sm">
              M
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                MediBooking<span className="text-blue-600">.in</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-50 text-blue-700 border border-blue-200">
                Polyclinic OS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/onboarding/clinic"
              data-testid="nav-btn-onboard-clinic"
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              Launch Clinic (3 Min)
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">
                Staff Login
              </Button>
            </Link>
            <Link href="/tv/bhopal-city-care">
              <Button variant="primary" size="sm">
                Waiting Room TV
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 lg:py-16 w-full">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold mb-4">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Bhopal Polyclinic Pilot Live Architecture
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            High-Throughput Multi-Chamber Queue Management
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Engineered for rapid 15-second reception intake, real-time live waiting room displays,
            doctor delay broadcasts, and seamless patient token tracking.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/onboarding/clinic"
              data-testid="hero-btn-onboard-clinic"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors duration-150"
            >
              ✨ Launch My Clinic (3-Min Setup)
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Open Staff Portal
              </Button>
            </Link>
            <Link href="/dr/dr-rajesh-sharma-cardio">
              <Button size="lg" variant="outline">
                Doctor Profile (/dr/:slug)
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Metrics Showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <StatCard
            title="Active Chambers"
            value="4 / 4"
            subtitle="All chambers running"
            accentColor="#1D4ED8"
            badge={{ label: '100% ONLINE', variant: 'mint' }}
          />
          <StatCard
            title="Waiting Patients"
            value="18"
            subtitle="Avg. wait: 12 mins"
            accentColor="#10B981"
            badge={{ label: 'NORMAL FLOW', variant: 'blue' }}
          />
          <StatCard
            title="Consulted Today"
            value="64"
            subtitle="Settled & completed"
            accentColor="#F59E0B"
            badge={{ label: 'ON TRACK', variant: 'mint' }}
          />
          <StatCard
            title="Avg Intake Time"
            value="14.2s"
            subtitle="Sub-15s reception target"
            accentColor="#10B981"
            badge={{ label: 'BENCHMARK MET', variant: 'mint' }}
          />
        </div>

        {/* Multi-Chamber Live Glance Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Live Polyclinic Chambers (Bhopal City Care)
              </h2>
              <p className="text-xs text-slate-500">
                Real-time synchronized chamber state across TV, reception, and doctor desks
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              Chambers 1–4
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 MediBooking.in — Clinic-First Operations & Polyclinic SaaS</span>
          <span>Bhopal, MP, India • WCAG AAA Healthcare Tokens</span>
        </div>
      </footer>
    </main>
  );
}

