'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button, StatCard, ChamberBadge } from '@medibooking/ui';
import { COMMON_SYMPTOMS_TAXONOMY, searchDoctorsAndSymptoms } from '@/lib/symptom-search';
import { BHOPAL_LOCALITIES } from '@/lib/doctor-directory';

interface ClinicDirectoryItem {
  id: string;
  name: string;
  locality: string;
  address: string;
  badgeColor: string;
  doctorName: string;
  specialty: string;
  credentials: string;
  chamberNumber: string;
  feeRupees: number;
  doctorSlug: string;
  tvSlug: string;
  treatedSymptoms: string[];
}

const BHOPAL_CLINICS: ClinicDirectoryItem[] = [
  {
    id: 'citycare-mpnagar',
    name: 'CityCare Polyclinic',
    locality: 'MP Nagar',
    address: 'Near Sargam Cinema, Zone-II',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    doctorName: 'Dr. Rajesh Sharma',
    specialty: 'Cardiology',
    credentials: 'Interventional Cardiologist (NMC: MP-38492)',
    chamberNumber: 'CH-1',
    feeRupees: 600,
    doctorSlug: 'dr-rajesh-sharma-cardio',
    tvSlug: 'citycare-mpnagar-bhopal',
    treatedSymptoms: ['chest pain', 'chest heaviness', 'high bp', 'blood pressure', 'palpitations', 'heart'],
  },
  {
    id: 'narmada-arera',
    name: 'Narmada Health & Specialty',
    locality: 'Arera Colony',
    address: 'Near 10 No. Market Bus Stop',
    badgeColor: 'bg-teal-100 text-teal-800',
    doctorName: 'Dr. Alok Verma',
    specialty: 'Neurology',
    credentials: 'Senior Neurologist (PGIMER, MPMC-39182)',
    chamberNumber: 'CH-1',
    feeRupees: 800,
    doctorSlug: 'dr-alok-verma-neuro',
    tvSlug: 'narmada-health-arera-bhopal',
    treatedSymptoms: ['migraine', 'headache', 'dizziness', 'vertigo', 'stroke', 'seizures', 'tremor'],
  },
  {
    id: 'kolar-prime',
    name: 'Kolar Prime MediChambers',
    locality: 'Kolar Road',
    address: 'Sarvadharam C-Sector, Opp D-Mart',
    badgeColor: 'bg-blue-100 text-blue-800',
    doctorName: 'Dr. Vivek Saxena',
    specialty: 'General Medicine',
    credentials: 'Consultant Physician & Diabetologist (NMC: MP-41029)',
    chamberNumber: 'CH-1',
    feeRupees: 500,
    doctorSlug: 'dr-vivek-saxena-genmed',
    tvSlug: 'kolar-prime-sarvadharam-bhopal',
    treatedSymptoms: ['diabetes', 'sugar', 'fever', 'cough', 'cold', 'weakness', 'fatigue', 'thyroid'],
  },
  {
    id: 'bhopal-care',
    name: 'Bhopal Care Daycare',
    locality: 'TT Nagar',
    address: 'Platinum Plaza, Mata Mandir',
    badgeColor: 'bg-purple-100 text-purple-800',
    doctorName: 'Dr. Manish Dubey',
    specialty: 'Gastroenterology',
    credentials: 'Gastroenterologist & Hepatologist (NMC: MP-42510)',
    chamberNumber: 'CH-1',
    feeRupees: 750,
    doctorSlug: 'dr-manish-dubey-gastro',
    tvSlug: 'bhopal-care-ttnagar-bhopal',
    treatedSymptoms: ['acidity', 'gas', 'stomach pain', 'heartburn', 'indigestion', 'liver', 'constipation'],
  },
  {
    id: 'aura-skin',
    name: 'Aura Skin & Cosmetology',
    locality: 'Arera Colony',
    address: 'E-4 Commercial Complex, Bittan Market',
    badgeColor: 'bg-pink-100 text-pink-800',
    doctorName: 'Dr. Priya Patel',
    specialty: 'Dermatology',
    credentials: 'Consultant Dermatologist & Trichologist (NMC: MP-39210)',
    chamberNumber: 'CH-2',
    feeRupees: 700,
    doctorSlug: 'dr-priya-patel-derma',
    tvSlug: 'citycare-mpnagar-bhopal',
    treatedSymptoms: ['acne', 'pimples', 'skin rash', 'hair fall', 'dandruff', 'itching', 'eczema', 'fungal'],
  },
  {
    id: 'little-angels',
    name: 'Little Angels Pediatric Center',
    locality: 'Kolar Road',
    address: 'Chuna Bhatti Main Road, Bhopal',
    badgeColor: 'bg-amber-100 text-amber-800',
    doctorName: 'Dr. Rohit Chouhan',
    specialty: 'Pediatrics',
    credentials: 'Senior Pediatrician & Neonatologist (NMC: MP-50119)',
    chamberNumber: 'CH-3',
    feeRupees: 500,
    doctorSlug: 'dr-rohit-chouhan-pedia',
    tvSlug: 'citycare-mpnagar-bhopal',
    treatedSymptoms: ['child fever', 'baby', 'infant', 'pediatric', 'vaccination', 'child cough', 'vomiting'],
  },
  {
    id: 'bhopal-ortho',
    name: 'Bhopal Ortho & Joint Clinic',
    locality: 'MP Nagar',
    address: 'Zone-I, Above Apollo Pharmacy',
    badgeColor: 'bg-indigo-100 text-indigo-800',
    doctorName: 'Dr. Sandeep Kothari',
    specialty: 'Orthopedics',
    credentials: 'Joint Replacement & Spine Specialist (NMC: MP-38019)',
    chamberNumber: 'CH-4',
    feeRupees: 750,
    doctorSlug: 'dr-sandeep-kothari-ortho',
    tvSlug: 'citycare-mpnagar-bhopal',
    treatedSymptoms: ['knee pain', 'joint pain', 'backache', 'back pain', 'sciatica', 'cervical', 'fracture', 'arthritis'],
  },
  {
    id: 'metro-heart',
    name: 'Metro Care Clinic',
    locality: 'TT Nagar',
    address: 'Near New Market, Malviya Nagar',
    badgeColor: 'bg-rose-100 text-rose-800',
    doctorName: 'Dr. Kavita Deshmukh',
    specialty: 'Gynecology',
    credentials: 'Obstetrician & Gynecologist (NMC: MP-44102)',
    chamberNumber: 'CH-2',
    feeRupees: 600,
    doctorSlug: 'dr-kavita-deshmukh-gyn',
    tvSlug: 'citycare-mpnagar-bhopal',
    treatedSymptoms: ['periods', 'pregnancy', 'pcos', 'pcod', 'fertility', 'pelvic pain', 'cramps'],
  },
];

const SPECIALTIES = [
  { label: 'All Specialties', value: 'ALL', icon: '🩺' },
  { label: 'Cardiology', value: 'Cardiology', icon: '🫀' },
  { label: 'Neurology', value: 'Neurology', icon: '🧠' },
  { label: 'General Medicine', value: 'General Medicine', icon: '💊' },
  { label: 'Pediatrics', value: 'Pediatrics', icon: '👶' },
  { label: 'Dermatology', value: 'Dermatology', icon: '✨' },
  { label: 'Gastroenterology', value: 'Gastroenterology', icon: '🔬' },
  { label: 'Orthopedics', value: 'Orthopedics', icon: '🦴' },
  { label: 'Gynecology', value: 'Gynecology', icon: '🌸' },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [selectedLocality, setSelectedLocality] = useState('ALL');

  // Semantic Symptom Search computation
  const symptomAnalysis = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return { matchedSpecialty: null, emergencyNotice: null };

    // Check against taxonomy
    const matched = COMMON_SYMPTOMS_TAXONOMY.find((entry) =>
      entry.keywords.some((kw) => q.includes(kw))
    );

    return {
      matchedSpecialty: matched ? matched.specialty : null,
      emergencyNotice: matched?.isEmergencyAlert ? matched.emergencyNotice : null,
    };
  }, [searchQuery]);

  const filteredClinics = useMemo(() => {
    return BHOPAL_CLINICS.filter((c) => {
      // 1. Specialty matching
      const targetSpecialty =
        selectedSpecialty !== 'ALL'
          ? selectedSpecialty
          : symptomAnalysis.matchedSpecialty;

      const matchesSpecialty =
        !targetSpecialty ||
        c.specialty.toLowerCase() === targetSpecialty.toLowerCase();

      // 2. Locality matching
      const matchesLocality =
        selectedLocality === 'ALL' ||
        (selectedLocality === 'MP_NAGAR' && c.locality.toLowerCase().includes('mp nagar')) ||
        (selectedLocality === 'ARERA' && c.locality.toLowerCase().includes('arera')) ||
        (selectedLocality === 'KOLAR' && c.locality.toLowerCase().includes('kolar')) ||
        (selectedLocality === 'TT_NAGAR' && c.locality.toLowerCase().includes('tt nagar'));

      // 3. Search query matching
      const q = searchQuery.toLowerCase().trim();
      if (!q) {
        return matchesSpecialty && matchesLocality;
      }

      const matchesText =
        c.name.toLowerCase().includes(q) ||
        c.locality.toLowerCase().includes(q) ||
        c.doctorName.toLowerCase().includes(q) ||
        c.specialty.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.treatedSymptoms.some((s) => s.includes(q));

      const matchesSymptomSpecialty = Boolean(
        symptomAnalysis.matchedSpecialty &&
          c.specialty.toLowerCase() === symptomAnalysis.matchedSpecialty.toLowerCase()
      );

      return matchesLocality && (matchesText || matchesSymptomSpecialty);
    });
  }, [searchQuery, selectedSpecialty, selectedLocality, symptomAnalysis]);

  const handleSymptomChipClick = (label: string, specialty: string) => {
    setSearchQuery(label);
    setSelectedSpecialty(specialty);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/50 flex flex-col justify-between relative overflow-hidden">
      {/* Ambient Glassmorphism Lighting */}
      <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[36rem] h-[36rem] rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-0 -ml-40 w-[30rem] h-[30rem] rounded-full bg-teal-400/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 rounded-full bg-emerald-300/10 blur-3xl pointer-events-none" />

      {/* Top Navbar: High-Frosted Glass */}
      <header className="bg-white/80 backdrop-blur-2xl border-b border-emerald-100/80 px-6 py-3.5 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-600/25 group-hover:scale-105 transition-transform">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  MediBooking<span className="text-emerald-600">.in</span>
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Polyclinic OS
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden md:block">
                Bhopal Multi-Chamber Queue & Token Architecture
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/doctors"
              data-testid="nav-btn-explore-doctors"
              className="inline-flex items-center px-3.5 py-2 text-xs font-bold rounded-xl text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all shadow-xs"
            >
              🩺 Explore Doctors
            </Link>

            {/* Unified Patient Hub Button */}
            <Link
              href="/patient/dashboard"
              data-testid="nav-btn-patient-hub"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white text-slate-800 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-xs"
            >
              <span>👤 Patient Portal</span>
            </Link>

            {/* Clinic & Doctor Partner Hub Dropdown */}
            <div className="relative group">
              <button
                type="button"
                data-testid="nav-btn-partners-menu"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
              >
                <span>🏥 Partner Portals</span>
                <span className="text-[10px] text-slate-400 group-hover:rotate-180 transition-transform">▾</span>
              </button>
              <div className="absolute right-0 mt-1 w-56 rounded-2xl bg-white/95 backdrop-blur-2xl border border-emerald-100 shadow-xl p-2 hidden group-hover:block hover:block z-50">
                <Link
                  href="/onboarding/clinic"
                  data-testid="nav-btn-onboard-clinic"
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 transition-colors"
                >
                  <span className="text-base">🏥</span>
                  <div>
                    <span className="text-xs font-bold block">Launch Clinic (3 Min)</span>
                    <span className="text-[10px] text-slate-500 block">Self-serve polyclinic setup</span>
                  </div>
                </Link>
                <Link
                  href="/onboarding/doctor"
                  data-testid="nav-btn-onboard-doctor"
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 transition-colors mt-1"
                >
                  <span className="text-base">🩺</span>
                  <div>
                    <span className="text-xs font-bold block">Join as Doctor</span>
                    <span className="text-[10px] text-slate-500 block">NMC credential claim</span>
                  </div>
                </Link>
                <Link
                  href="/register"
                  data-testid="nav-btn-patient-register"
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 transition-colors mt-1 border-t border-slate-100 pt-2"
                >
                  <span className="text-base">👤</span>
                  <div>
                    <span className="text-xs font-bold block">Patient Registration</span>
                    <span className="text-[10px] text-slate-500 block">ABHA & health profile</span>
                  </div>
                </Link>
              </div>
            </div>

            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs font-semibold rounded-xl">
                Staff Login
              </Button>
            </Link>

            <Link href="/tv/citycare-mpnagar-bhopal" className="hidden md:inline-block">
              <Button
                variant="primary"
                size="sm"
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 rounded-xl"
              >
                Waiting Room TV
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-10 lg:py-14 w-full relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Healthcare Trust Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 text-emerald-900 border border-emerald-200/90 text-xs font-bold mb-6 shadow-xs backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>✨ Bhopal Healthcare Pilot • 10 Verified Polyclinics • NMC Verified Doctors</span>
          </div>

          {/* Value-Driven Healthcare Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
            Instant Doctor Appointments &{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
              Live Queue Tracking
            </span>{' '}
            Across Bhopal
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Book verified specialists for <strong>₹49</strong>. Your pre-consultation vitals and official prescription letterhead are printed at reception before you arrive. Settle consultation fees directly at the clinic.
          </p>

          {/* Interactive Doctor Search Input */}
          <div className="mt-7 max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                data-testid="home-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symptoms ('chest pain', 'knee pain', 'acne'), doctor name, or area..."
                className="w-full pl-12 pr-16 py-3.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-emerald-200 text-sm font-medium text-slate-800 placeholder-slate-400 shadow-lg shadow-emerald-950/5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Emergency Notice Pill if detected */}
            {symptomAnalysis.emergencyNotice && (
              <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 text-left flex items-start gap-2 shadow-xs">
                <span className="text-base shrink-0">🚨</span>
                <div>
                  <strong className="block">Emergency Alert:</strong>
                  <span>{symptomAnalysis.emergencyNotice} Dial 108 Ambulance immediately for acute emergencies.</span>
                </div>
              </div>
            )}

            {/* Quick Symptom Chips Strip */}
            <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                Common Symptoms:
              </span>
              {[
                { label: 'Chest Heaviness', specialty: 'Cardiology', icon: '🫀' },
                { label: 'Acne & Skin', specialty: 'Dermatology', icon: '✨' },
                { label: 'Knee & Joint Pain', specialty: 'Orthopedics', icon: '🦴' },
                { label: 'Fever & Diabetes', specialty: 'General Medicine', icon: '💊' },
                { label: 'Child Fever', specialty: 'Pediatrics', icon: '👶' },
                { label: 'Acidity & Gas', specialty: 'Gastroenterology', icon: '🔬' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleSymptomChipClick(chip.label, chip.specialty)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/80 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200/90 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs"
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Specialty Quick-Filter Pills */}
            <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
              {SPECIALTIES.map((spec) => {
                const isActive = selectedSpecialty === spec.value;
                return (
                  <button
                    key={spec.value}
                    onClick={() => setSelectedSpecialty(spec.value)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                        : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 hover:border-emerald-300'
                    }`}
                  >
                    <span>{spec.icon}</span>
                    <span>{spec.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Locality Filter Strip */}
            <div className="mt-2.5 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                Locality:
              </span>
              {[
                { id: 'ALL', label: 'All Bhopal' },
                { id: 'MP_NAGAR', label: 'MP Nagar' },
                { id: 'ARERA', label: 'Arera Colony' },
                { id: 'KOLAR', label: 'Kolar Road' },
                { id: 'TT_NAGAR', label: 'TT Nagar' },
              ].map((loc) => {
                const isActive = selectedLocality === loc.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocality(loc.id)}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {loc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unified Action Layout: Primary Patient CTA + Frosted B2B Secondary Bar */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <Link
              href="/doctors"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-base font-black rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>📱 Find & Book Doctor (₹49 Nominal Token)</span>
            </Link>

            {/* Secondary Professional Glass Bar */}
            <div className="inline-flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-white/80 backdrop-blur-xl border border-emerald-100 shadow-sm text-xs font-semibold">
              <Link
                href="/onboarding/clinic"
                data-testid="hero-btn-onboard-clinic"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 transition-colors"
              >
                <span>✨ Launch My Clinic (3-Min Setup)</span>
              </Link>
              <Link
                href="/onboarding/doctor"
                data-testid="hero-btn-onboard-doctor"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors"
              >
                <span>🩺 Doctor Self-Registration</span>
              </Link>
              <Link
                href="/register"
                data-testid="hero-btn-patient-register"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors"
              >
                <span>👤 Patient Registration</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors"
              >
                <span>🔑 Open Staff Portal</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Live Chamber Tracker Hero Card: Real-Time Transparency */}
        <div className="mt-10 max-w-4xl mx-auto rounded-3xl bg-white/85 backdrop-blur-2xl border border-white/90 p-5 sm:p-6 shadow-xl shadow-emerald-950/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Live Waiting Room Tracker</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    CityCare MP Nagar Zone-II
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Sub-15s reception intake • Real-time synchronized displays • Zero clinic waiting anxiety
                </p>
              </div>
            </div>
            <Link
              href="/tv/citycare-mpnagar-bhopal"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 self-start sm:self-auto bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <span>View Full TV Display</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Now In Consultation</div>
                <div className="text-lg font-black text-emerald-900 mt-0.5">Token #14</div>
                <div className="text-[11px] text-slate-600">Dr. Rajesh Sharma (CH-1)</div>
              </div>
              <span className="h-8 w-8 rounded-xl bg-emerald-200/80 text-emerald-800 flex items-center justify-center font-black">
                🫀
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/70 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Next In Queue</div>
                <div className="text-lg font-black text-blue-900 mt-0.5">Token #15</div>
                <div className="text-[11px] text-slate-600">Deepak Agrawal • Arrived</div>
              </div>
              <span className="h-8 w-8 rounded-xl bg-blue-200/80 text-blue-800 flex items-center justify-center font-black">
                ⏱️
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/70 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">Chamber Status</div>
                <div className="text-lg font-black text-teal-900 mt-0.5">4 / 4 Active</div>
                <div className="text-[11px] text-slate-600">Avg Wait: ~12 Mins</div>
              </div>
              <span className="h-8 w-8 rounded-xl bg-teal-200/80 text-teal-800 flex items-center justify-center font-black">
                ⚡
              </span>
            </div>
          </div>
        </div>

        {/* Business Value Cards Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10 mb-12">
          <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-lg shadow-emerald-950/5 space-y-3 hover:border-emerald-200 transition-all">
            <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-bold shadow-xs">
              ⚡
            </div>
            <h3 className="font-bold text-slate-900 text-base">Pre-Consultation Rx Velocity</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Reception prints A4 letterhead with Doctor NMC registration and pre-recorded vitals. Saves doctors 3–4 minutes per consultation.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-lg shadow-emerald-950/5 space-y-3 hover:border-emerald-200 transition-all">
            <div className="h-11 w-11 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-xl font-bold shadow-xs">
              🛡️
            </div>
            <h3 className="font-bold text-slate-900 text-base">Nominal Booking & Zero No-Shows</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Patients pay ₹49 online via UPI to commit their token. Full consultation fee (₹600) and custom procedures are settled at the clinic.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-lg shadow-emerald-950/5 space-y-3 hover:border-emerald-200 transition-all">
            <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center text-xl font-bold shadow-xs">
              📊
            </div>
            <h3 className="font-bold text-slate-900 text-base">80/20 Automated Split & Section 194J</h3>
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

        {/* Multi-Chamber Live Glance Preview */}
        <div className="bg-white/85 backdrop-blur-xl border border-white/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-950/5 mb-10">
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
              doctorName="Dr. Rohit Chouhan"
              specialty="Pediatrician"
              status="DELAYED"
              delayMinutes={15}
              currentCallingToken={22}
            />
            <ChamberBadge
              chamberNumber="CH-4"
              doctorName="Dr. Sandeep Kothari"
              specialty="Orthopedic"
              status="BREAK"
            />
          </div>
        </div>

        {/* Bhopal Polyclinic Network & Specialist Directory */}
        <div id="specialists" className="bg-white/85 backdrop-blur-xl border border-white/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-950/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Bhopal Polyclinic Network & Specialist Chambers
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Explore affiliated multi-chamber polyclinics and verified doctor consultation desks across Bhopal
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/doctors"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                View Full Marketplace →
              </Link>
              {filteredClinics.length !== BHOPAL_CLINICS.length && (
                <button
                  onClick={() => {
                    setSelectedSpecialty('ALL');
                    setSelectedLocality('ALL');
                    setSearchQuery('');
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {filteredClinics.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">No doctors or clinics match &quot;{searchQuery}&quot;</p>
              <button
                onClick={() => {
                  setSelectedSpecialty('ALL');
                  setSelectedLocality('ALL');
                  setSearchQuery('');
                }}
                className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Show All Polyclinics
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredClinics.map((clinic) => (
                <div
                  key={clinic.id}
                  className="p-5 rounded-2xl bg-white/80 border border-emerald-100/90 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3 className="font-bold text-slate-900 text-sm tracking-tight">{clinic.name}</h3>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${clinic.badgeColor}`}>
                        {clinic.locality}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{clinic.address}</p>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs space-y-1">
                      <div className="font-bold text-slate-800 flex justify-between items-center">
                        <span>{clinic.doctorName}</span>
                        <span className="text-emerald-700 font-black font-mono">₹{clinic.feeRupees}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {clinic.credentials} • {clinic.chamberNumber}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <Link
                      href={`/dr/${clinic.doctorSlug}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center shadow-xs transition-colors"
                    >
                      Book Token (₹49)
                    </Link>
                    <Link
                      href={`/tv/${clinic.tvSlug}`}
                      className="py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs text-center transition-colors"
                    >
                      Live TV
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer: Frosted Glass */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-emerald-100/70 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
              M
            </div>
            <span className="font-semibold text-slate-700">© 2026 MediBooking.in</span>
            <span>—</span>
            <span>Clinic-First Operations & Polyclinic SaaS</span>
          </div>
          <span>Bhopal, MP, India • WCAG AAA Healthcare Tokens • Section 194J Automated Ledger</span>
        </div>
      </footer>
    </main>
  );
}
