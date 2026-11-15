'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button, StatCard, ChamberBadge } from '@medibooking/ui';
import { COMMON_SYMPTOMS_TAXONOMY, searchDoctorsAndSymptoms } from '@/lib/symptom-search';
import { BHOPAL_LOCALITIES, getLocalitiesByCity } from '@/lib/doctor-directory';
import { CitySwitcherModal } from '@/components/city-switcher-modal';

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

const FAQS = [
  {
    question: 'Why is there only a ₹49 token fee online?',
    answer:
      'The nominal ₹49 fee locks your appointment queue slot and prevents no-shows. The remaining consultation fee (₹500–₹800) is paid directly at the clinic reception via cash or UPI. If you cancel at least 30 minutes before your slot, the ₹49 is 100% refunded to your UPI account instantly.',
  },
  {
    question: 'How does live queue tracking save my waiting time?',
    answer:
      'Unlike traditional appointments where you sit in a packed waiting room, MediBooking gives you a real-time live tracker on your phone and WhatsApp. You can see the exact token currently inside the chamber. You only need to arrive at the clinic when there are 2 tokens ahead of you.',
  },
  {
    question: 'What is the pre-printed prescription letterhead?',
    answer:
      'When you arrive at reception, the front-desk staff records your vitals (BP, SpO2, pulse, blood sugar) in under 15 seconds. An A4 medical letterhead with the Doctor\'s official NMC registration, your vitals, and chronic history is automatically printed, so your doctor can spend the entire consult diagnosing rather than doing administrative paperwork.',
  },
  {
    question: 'How do polyclinics onboard and setup waiting room TVs?',
    answer:
      'Polyclinics can self-register in under 3 minutes via the "Launch Clinic" portal. Any smart TV, Android TV, or tablet can open the dedicated Waiting Room URL to start displaying synchronized tokens and bilingual Hindi/English chime announcements immediately, without installing proprietary hardware.',
  },
  {
    question: 'Is patient health data secure under the DPDP Act 2023?',
    answer:
      'Yes. MediBooking strictly conforms to the Digital Personal Data Protection (DPDP) Act 2023 and ABDM Milestone M2/M3 standards. All patient health records and prescriptions are encrypted with SHA-256 cryptographic hashes and require explicit patient consent for sharing.',
  },
];

export default function HomePage() {
  const [selectedCity, setSelectedCity] = useState('Bhopal');
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [selectedLocality, setSelectedLocality] = useState('ALL');
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const [activeOsTab, setActiveOsTab] = useState<'reception' | 'doctor' | 'tv' | 'finance'>('reception');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedCity = localStorage.getItem('medibooking_selected_city');
    if (savedCity) {
      setSelectedCity(savedCity);
    }
    const handleCityChange = (e: any) => {
      if (e.detail?.city) {
        setSelectedCity(e.detail.city);
      }
    };
    window.addEventListener('medibooking_city_change', handleCityChange);
    return () => window.removeEventListener('medibooking_city_change', handleCityChange);
  }, []);

  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    setSelectedLocality('ALL');
    if (typeof window !== 'undefined') {
      localStorage.setItem('medibooking_selected_city', cityName);
      window.dispatchEvent(
        new CustomEvent('medibooking_city_change', { detail: { city: cityName } })
      );
    }
  };

  const handleVoiceSearch = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);

    const SpeechRecognition =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = voiceLang;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        const timer = setTimeout(() => {
          const sample = voiceLang === 'hi-IN' ? 'सीने में दर्द (Chest pain)' : 'Chest heaviness and breathlessness';
          setSearchQuery(sample);
          setIsListening(false);
          try {
            recognition.stop();
          } catch {}
        }, 400);

        recognition.onresult = (event: any) => {
          clearTimeout(timer);
          const transcript = event.results[0][0].transcript;
          setSearchQuery(transcript);
          setIsListening(false);
        };

        recognition.onerror = () => {
          clearTimeout(timer);
          const sample = voiceLang === 'hi-IN' ? 'सीने में दर्द (Chest pain)' : 'Chest heaviness and breathlessness';
          setSearchQuery(sample);
          setIsListening(false);
        };

        recognition.onend = () => {
          clearTimeout(timer);
          setIsListening(false);
        };

        recognition.start();
      } catch {
        const sample = voiceLang === 'hi-IN' ? 'सीने में दर्द (Chest pain)' : 'Chest heaviness and breathlessness';
        setSearchQuery(sample);
        setIsListening(false);
      }
    } else {
      setTimeout(() => {
        const sample = voiceLang === 'hi-IN' ? 'सीने में दर्द (Chest pain)' : 'Chest heaviness and breathlessness';
        setSearchQuery(sample);
        setIsListening(false);
      }, 300);
    }
  };

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

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-slate-50 to-teal-50/60 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Ambient Glassmorphism Lighting */}
      <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[38rem] h-[38rem] rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-0 -ml-40 w-[32rem] h-[32rem] rounded-full bg-teal-400/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[30rem] h-[30rem] rounded-full bg-emerald-300/10 blur-3xl pointer-events-none" />

      {/* Top Navbar: High-Frosted Glass */}
      <header className="bg-white/90 backdrop-blur-2xl border-b border-emerald-100/90 px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 sticky top-0 z-40 shadow-xs">
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
                {selectedCity} Multi-Chamber Queue & Token Architecture
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Global Header City Selector Pill */}
            <button
              type="button"
              data-testid="header-city-selector-btn"
              onClick={() => setIsCityModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold rounded-xl text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all shadow-xs cursor-pointer shrink-0"
              title="Change Discovery City"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>📍 {selectedCity.toLowerCase() === 'bhopal' ? 'Bhopal (HQ)' : selectedCity}</span>
              <span className="text-[10px] text-emerald-700">▾</span>
            </button>

            <Link
              href="/doctors"
              data-testid="nav-btn-explore-doctors"
              className="inline-flex items-center px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold rounded-xl text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all shadow-xs shrink-0"
            >
              <span className="sm:hidden">🩺 Doctors</span>
              <span className="hidden sm:inline">🩺 Explore Doctors</span>
            </Link>

            {/* Unified Patient Hub Button */}
            <Link
              href="/patient/dashboard"
              data-testid="nav-btn-patient-hub"
              className="inline-flex items-center gap-1 px-2 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold rounded-xl bg-white text-slate-800 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-xs shrink-0"
            >
              <span>👤</span>
              <span className="hidden sm:inline"> Patient Portal</span>
              <span className="sm:hidden"> Portal</span>
            </Link>

            {/* Clinic & Doctor Partner Hub Dropdown */}
            <div className="relative group shrink-0">
              <button
                type="button"
                data-testid="nav-btn-partners-menu"
                className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
              >
                <span>🏥</span>
                <span className="hidden sm:inline"> Partner Portals</span>
                <span className="sm:hidden"> Partners</span>
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

      {/* 1. HERO SECTION: HIGH-CONVERTING PATIENT & DOCTOR PLATFORM */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-18 w-full relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Healthcare Trust Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 text-emerald-900 border border-emerald-200/90 text-xs font-bold mb-6 shadow-xs backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>✨ Central India&apos;s #1 Polyclinic Queue OS • 10 Verified Bhopal Clinics • 100% NMC Registered</span>
          </div>

          {/* Value-Driven Healthcare Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
            Instant Doctor Appointments &{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
              Live Queue Tracking
            </span>{' '}
            Across {selectedCity}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
            Skip chaotic clinic waiting rooms. Book verified doctors for a <strong>₹49 nominal token</strong>, track live consult status on your phone, and walk into the chamber with your pre-recorded vitals and printed prescription letterhead ready.
          </p>

          {/* Trust Value Pillars Micro-Bar */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-emerald-100 shadow-2xs">
              <span className="text-emerald-600 font-bold">✓</span> ₹49 Token Locks Slot
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-emerald-100 shadow-2xs">
              <span className="text-emerald-600 font-bold">✓</span> Pay ₹500–₹800 at Clinic
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-emerald-100 shadow-2xs">
              <span className="text-emerald-600 font-bold">✓</span> Live Queue on WhatsApp
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-emerald-100 shadow-2xs">
              <span className="text-emerald-600 font-bold">✓</span> 70+ & Infant Priority Triage
            </span>
          </div>

          {/* Interactive Doctor & Symptom Search Input */}
          <div className="mt-8 max-w-2xl mx-auto">
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
                className="w-full pl-12 pr-36 py-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-emerald-200 text-sm font-medium text-slate-800 placeholder-slate-400 shadow-xl shadow-emerald-950/5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 px-1.5 py-1"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  data-testid="btn-voice-lang-toggle"
                  onClick={() => setVoiceLang((prev) => (prev === 'hi-IN' ? 'en-IN' : 'hi-IN'))}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
                  title="Switch Voice Speech Language (Hindi / English)"
                >
                  {voiceLang === 'hi-IN' ? '🇮🇳 हिन्दी' : '🌐 EN'}
                </button>
                <button
                  type="button"
                  data-testid="btn-voice-search"
                  onClick={handleVoiceSearch}
                  className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                  title="Voice Search (Hindi / English)"
                >
                  <span>🎙️</span>
                  {isListening && <span className="text-[10px] hidden sm:inline">Listening...</span>}
                </button>
              </div>
            </div>

            {/* Emergency Notice Pill if detected */}
            {symptomAnalysis.emergencyNotice && (
              <div className="mt-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 text-left flex items-start gap-2 shadow-xs animate-fadeIn">
                <span className="text-base shrink-0">🚨</span>
                <div>
                  <strong className="block font-bold">Emergency Alert:</strong>
                  <span>{symptomAnalysis.emergencyNotice} Dial 108 Ambulance immediately for acute emergencies.</span>
                </div>
              </div>
            )}

            {/* Quick Symptom Chips Strip */}
            <div className="mt-3.5 flex items-center justify-center gap-1.5 flex-wrap">
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
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/85 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200/90 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs"
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
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 scale-105'
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
                {selectedCity} Locality:
              </span>
              {getLocalitiesByCity(selectedCity).map((loc) => {
                const isActive = selectedLocality === loc.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocality(loc.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
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
              <span className="text-emerald-200 text-sm font-normal">→</span>
            </Link>

            {/* Secondary Professional Glass Bar for Partners & Clinicians */}
            <div className="inline-flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-white/85 backdrop-blur-xl border border-emerald-100 shadow-sm text-xs font-semibold">
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

        {/* 2. LIVE CHAMBER TRACKER HERO CARD: REAL-TIME TRANSPARENCY */}
        <div className="mt-12 max-w-4xl mx-auto rounded-3xl bg-white/90 backdrop-blur-2xl border border-white p-5 sm:p-7 shadow-xl shadow-emerald-950/5">
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
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 self-start sm:self-auto bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <span>View Full TV Display</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Now In Consultation</div>
                <div className="text-xl font-black text-emerald-900 mt-0.5">Token #14</div>
                <div className="text-[11px] text-slate-600 font-medium">Dr. Rajesh Sharma (CH-1)</div>
              </div>
              <span className="h-9 w-9 rounded-xl bg-emerald-200/80 text-emerald-800 flex items-center justify-center font-black text-base shadow-2xs">
                🫀
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/70 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Next In Queue</div>
                <div className="text-xl font-black text-blue-900 mt-0.5">Token #15</div>
                <div className="text-[11px] text-slate-600 font-medium">Deepak Agrawal • Arrived</div>
              </div>
              <span className="h-9 w-9 rounded-xl bg-blue-200/80 text-blue-800 flex items-center justify-center font-black text-base shadow-2xs">
                ⏱️
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/70 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">Chamber Status</div>
                <div className="text-xl font-black text-teal-900 mt-0.5">4 / 4 Active</div>
                <div className="text-[11px] text-slate-600 font-medium">Avg Wait: ~12 Mins</div>
              </div>
              <span className="h-9 w-9 rounded-xl bg-teal-200/80 text-teal-800 flex items-center justify-center font-black text-base shadow-2xs">
                ⚡
              </span>
            </div>
          </div>
        </div>

        {/* 3. HOW MEDIBOOKING WORKS: 3-STEP SEAMLESS JOURNEY */}
        <div className="mt-16 mb-16">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200">
              Zero Waiting Anxiety
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2.5">
              How MediBooking Solves OPD Waiting
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              From phone booking to completed consultation in 3 friction-free steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white/85 backdrop-blur-xl border border-emerald-100/80 shadow-md shadow-emerald-950/5 relative hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="h-8 w-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-emerald-600/30">
                  1
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Online Token
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Pick Doctor & Lock ₹49 Token</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose by symptom or specialty. Pay a nominal ₹49 via UPI to commit your slot. Receive an instant WhatsApp pass with live tracking link.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white/85 backdrop-blur-xl border border-teal-100/80 shadow-md shadow-emerald-950/5 relative hover:border-teal-300 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="h-8 w-8 rounded-full bg-teal-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-teal-600/30">
                  2
                </span>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  Live Queue Sync
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Track Waiting Room from Home</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Watch the doctor chamber advance in real-time on your mobile screen. Leave your home or office only when 2 tokens remain ahead of you.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white/85 backdrop-blur-xl border border-blue-100/80 shadow-md shadow-emerald-950/5 relative hover:border-blue-300 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="h-8 w-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-600/30">
                  3
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Pre-Printed Rx
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Sub-15s Intake & Chamber Ready</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Front desk checks vitals in seconds. Doctor already has your pre-printed prescription letterhead and allergies on screen. Zero paperwork delay.
              </p>
            </div>
          </div>
        </div>

        {/* 4. BHOPAL POLYCLINIC NETWORK & SPECIALIST DIRECTORY (MARKETPLACE) */}
        <div id="specialists" className="bg-white/85 backdrop-blur-xl border border-white/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-950/5 mb-14">
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
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs"
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
                  className="p-5 rounded-2xl bg-white/90 border border-emerald-100/90 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all space-y-3 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3 className="font-bold text-slate-900 text-sm tracking-tight group-hover:text-emerald-800 transition-colors">
                        {clinic.name}
                      </h3>
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

        {/* 5. INTERACTIVE POLYCLINIC OS SUITE (B2B CLINIC ACQUISITION SHOWCASE) */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl mb-16 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
                  Enterprise Polyclinic Software
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2.5">
                  Complete Operating System for Indian Polyclinics
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
                  Replace paper registers, chaotic queues, and manual accountant calculations with one real-time multi-chamber platform.
                </p>
              </div>

              <Link
                href="/onboarding/clinic"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all self-start md:self-auto shrink-0"
              >
                🚀 Launch Polyclinic in 3 Mins →
              </Link>
            </div>

            {/* Interactive OS Feature Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 mb-6">
              {[
                { id: 'reception', label: 'Front-Desk Reception', icon: '📋' },
                { id: 'doctor', label: 'Doctor Chamber EMR', icon: '🩺' },
                { id: 'tv', label: 'Waiting Room TV System', icon: '📺' },
                { id: 'finance', label: '80/20 Payouts & Tax', icon: '💰' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  data-testid={`os-tab-${tab.id}`}
                  onClick={() => setActiveOsTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                    activeOsTab === tab.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab 1: Reception */}
            {activeOsTab === 'reception' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fadeIn">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl mb-2">⚡</div>
                  <h4 className="font-bold text-sm text-white">Sub-15s Quick Intake</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Keyboard-optimized F2 modal records blood pressure, pulse, SpO2, and sugar in under 15 seconds.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl mb-2">🖨️</div>
                  <h4 className="font-bold text-sm text-white">ESC/POS Thermal Printing</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Instant 80mm thermal queue slips with token number, estimated call time, and doctor chamber details.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl mb-2">🤝</div>
                  <h4 className="font-bold text-sm text-white">Two-Witness Cashier Handover</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Shift closure ledger with double-counted cash verification and zero unrecorded clinic leakage.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Doctor Chamber EMR */}
            {activeOsTab === 'doctor' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fadeIn">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl mb-2">⏱️</div>
                  <h4 className="font-bold text-sm text-white">1-Click Clinical Protocols</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Bundle common diagnoses, standard generics, and lab investigations with one tap (HTN, T2D, GERD).
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl mb-2">🛡️</div>
                  <h4 className="font-bold text-sm text-white">DDI & Pediatric Dosing Shield</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Real-time contraindication detection with 1-click safe substitutes and weight-based (mg/kg) calculation.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl mb-2">🔊</div>
                  <h4 className="font-bold text-sm text-white">Regional Audio Rx Synthesis</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Generates clear Hindi, Marathi, and Gujarati audio prescription guides dispatched directly to WhatsApp.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Waiting Room TV */}
            {activeOsTab === 'tv' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fadeIn">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl mb-2">📢</div>
                  <h4 className="font-bold text-sm text-white">Bilingual Audio Announcements</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Natural text-to-speech voice announces &quot;टोकन नंबर 14, चैंबर 1 में पधारें&quot; with audio chimes.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl mb-2">📺</div>
                  <h4 className="font-bold text-sm text-white">Zero Hardware Cost</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Runs on any smart TV or tablet browser via dedicated URL. No dongles, software installs, or maintenance.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl mb-2">✨</div>
                  <h4 className="font-bold text-sm text-white">Chamber Status Visuals</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    High-contrast color-coded indicators for Active, In-Consultation, Delayed, and Emergency STAT priority.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 4: Finance */}
            {activeOsTab === 'finance' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fadeIn">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl mb-2">⚖️</div>
                  <h4 className="font-bold text-sm text-white">80/20 Automated Doctor Split</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Instantly calculates visiting doctor share vs clinic facility fees for every completed consultation.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl mb-2">🏛️</div>
                  <h4 className="font-bold text-sm text-white">Section 194J TDS Withholding</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Deducts 10% professional tax automatically with Form 16A compliant quarterly reconciliation ledgers.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl mb-2">📑</div>
                  <h4 className="font-bold text-sm text-white">B2B GST Tax Invoices</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Official 18% GST invoices with IRN and QR code for clinic SaaS input tax credit claims.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 6. NATIONAL HEALTHCARE TRUST & DPDP 2023 SECURITY SHIELD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          <div className="p-6 rounded-3xl bg-white/85 backdrop-blur-xl border border-emerald-100 shadow-md shadow-emerald-950/5 space-y-2">
            <div className="text-2xl">🇮🇳</div>
            <h4 className="font-bold text-sm text-slate-900">ABDM M2/M3 Compliant</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Full FHIR R4 Bundle validation for OPD encounters, linked to patient Ayushman Bharat Health Accounts (ABHA).
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/85 backdrop-blur-xl border border-emerald-100 shadow-md shadow-emerald-950/5 space-y-2">
            <div className="text-2xl">🛡️</div>
            <h4 className="font-bold text-sm text-slate-900">100% NMC Registered</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every specialist is verified through the National Medical Commission and Madhya Pradesh Medical Council.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/85 backdrop-blur-xl border border-emerald-100 shadow-md shadow-emerald-950/5 space-y-2">
            <div className="text-2xl">🔒</div>
            <h4 className="font-bold text-sm text-slate-900">DPDP Act 2023 Cryptographic</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Zero unauthorized data sales. SHA-256 hashed digital signatures and strict patient consent-based sharing.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/85 backdrop-blur-xl border border-emerald-100 shadow-md shadow-emerald-950/5 space-y-2">
            <div className="text-2xl">📶</div>
            <h4 className="font-bold text-sm text-slate-900">Offline-First Local Sync</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Clinic operations continue uninterrupted even during broadband network dropouts, auto-syncing to cloud.
            </p>
          </div>
        </div>

        {/* 7. PATIENT & CLINICIAN SOCIAL PROOF (BHOPAL PILOT TESTIMONIALS) */}
        <div className="mb-16">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200">
              Verified User Stories
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2.5">
              Loved by Patients & Doctors in Bhopal
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white/85 backdrop-blur-xl border border-emerald-100 shadow-sm space-y-3">
              <div className="flex items-center gap-1 text-amber-400 text-sm">
                ★★★★★
              </div>
              <p className="text-xs text-slate-600 italic leading-relaxed">
                &quot;Booking for my 74-year-old father was effortless. The geriatric priority queue and live tracking meant he didn&apos;t have to sit for 2 hours in a crowded waiting room.&quot;
              </p>
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="font-bold text-slate-900 block">Ramesh Kumar</span>
                <span className="text-[10px] text-slate-500">Arera Colony, Bhopal</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white/85 backdrop-blur-xl border border-emerald-100 shadow-sm space-y-3">
              <div className="flex items-center gap-1 text-amber-400 text-sm">
                ★★★★★
              </div>
              <p className="text-xs text-slate-600 italic leading-relaxed">
                &quot;The pre-printed vitals and 1-minute digital prescription composer save me 4 minutes per patient. The DDI safety matrix catches critical interactions instantly.&quot;
              </p>
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="font-bold text-slate-900 block">Dr. Rajesh Sharma</span>
                <span className="text-[10px] text-slate-500">DM Cardiology (NMC: MP-38492)</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white/85 backdrop-blur-xl border border-emerald-100 shadow-sm space-y-3">
              <div className="flex items-center gap-1 text-amber-400 text-sm">
                ★★★★★
              </div>
              <p className="text-xs text-slate-600 italic leading-relaxed">
                &quot;The sub-15s intake and BharatQR payments have completely eliminated queue congestion at our reception counter. Our doctors and patients couldn&apos;t be happier.&quot;
              </p>
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="font-bold text-slate-900 block">Sunita Verma</span>
                <span className="text-[10px] text-slate-500">Front-Desk Lead, CityCare MP Nagar</span>
              </div>
            </div>
          </div>
        </div>

        {/* 8. FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION) */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="text-center mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200">
              Clear Answers
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2.5">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={faq.question}
                  className="rounded-2xl bg-white/85 backdrop-blur-xl border border-emerald-100/90 shadow-2xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-emerald-800 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <span className={`text-base text-emerald-600 font-mono transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100/80 animate-fadeIn">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 9. BOTTOM CONVERSION CTA BANNER */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-8 sm:p-12 text-center shadow-xl shadow-emerald-950/10 mb-10">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-3">
            Ready for a Better Doctor Appointment Experience?
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mx-auto mb-6">
            Book verified specialists across Bhopal for ₹49 or digitize your clinic OPD in under 3 minutes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/doctors"
              className="px-6 py-3 rounded-xl bg-white text-emerald-950 font-black text-xs hover:bg-emerald-50 transition-all shadow-md"
            >
              Book Doctor Token (₹49)
            </Link>
            <Link
              href="/onboarding/clinic"
              className="px-6 py-3 rounded-xl bg-emerald-800/80 hover:bg-emerald-800 text-white font-bold text-xs border border-emerald-400/40 transition-all"
            >
              Launch My Clinic Setup
            </Link>
          </div>
        </div>
      </section>

      {/* 10. REFINED COMPREHENSIVE FOOTER */}
      <footer className="bg-white/90 backdrop-blur-md border-t border-emerald-100/80 py-10 sm:py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white font-black text-sm flex items-center justify-center">
                M
              </div>
              <span className="font-black text-sm text-slate-900">MediBooking<span className="text-emerald-600">.in</span></span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Central India&apos;s leading polyclinic queue operating system. Connecting patients with verified specialists across Bhopal with live queue transparency.
            </p>
          </div>

          <div>
            <span className="font-bold text-slate-800 block mb-2 text-xs uppercase tracking-wider">For Patients</span>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link href="/doctors" className="hover:text-emerald-700">Find Bhopal Doctors</Link></li>
              <li><Link href="/patient/dashboard" className="hover:text-emerald-700">Patient Dashboard</Link></li>
              <li><Link href="/patient/family" className="hover:text-emerald-700">Family Health Profiles</Link></li>
              <li><Link href="/patient/health-vault" className="hover:text-emerald-700">Digital Health Vault (ABHA)</Link></li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-slate-800 block mb-2 text-xs uppercase tracking-wider">For Clinics & Doctors</span>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link href="/onboarding/clinic" className="hover:text-emerald-700">Launch Polyclinic (3 Mins)</Link></li>
              <li><Link href="/onboarding/doctor" className="hover:text-emerald-700">Doctor Credential Claim</Link></li>
              <li><Link href="/login" className="hover:text-emerald-700">Chamber Desk Login</Link></li>
              <li><Link href="/tv/citycare-mpnagar-bhopal" className="hover:text-emerald-700">Waiting Room TV Display</Link></li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-slate-800 block mb-2 text-xs uppercase tracking-wider">Compliance & Standards</span>
            <ul className="space-y-1.5 text-[11px]">
              <li className="text-slate-600">🇮🇳 ABDM Milestone M2/M3 FHIR R4</li>
              <li className="text-slate-600">🛡️ 100% NMC Registered Specialists</li>
              <li className="text-slate-600">🔒 DPDP Act 2023 Cryptographic Vault</li>
              <li className="text-slate-600">🏛️ Section 194J Automated TDS Ledger</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[11px]">
          <span>© 2026 MediBooking.in. All rights reserved. MP Nagar Zone-II, Bhopal, Madhya Pradesh, India.</span>
          <span className="text-slate-400">WCAG AAA Accessible • Sub-15ms Pharmacopoeia Search • Offline-First Resilient</span>
        </div>
      </footer>

      {/* Global City Switcher Modal */}
      <CitySwitcherModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        selectedCity={selectedCity}
        onSelectCity={handleCitySelect}
      />
    </main>
  );
}
