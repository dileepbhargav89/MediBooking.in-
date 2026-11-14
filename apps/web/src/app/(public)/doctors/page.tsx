'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button, Badge } from '@medibooking/ui';
import {
  DOCTORS_MASTER_DIRECTORY,
  BHOPAL_LOCALITIES,
  DoctorDirectoryItem,
} from '@/lib/doctor-directory';
import {
  COMMON_SYMPTOMS_TAXONOMY,
  searchDoctorsAndSymptoms,
} from '@/lib/symptom-search';

const SPECIALTY_OPTIONS = [
  { label: 'All Specialties', value: 'ALL', icon: '🩺' },
  { label: 'Cardiology', value: 'Cardiology', icon: '🫀' },
  { label: 'Dermatology', value: 'Dermatology', icon: '✨' },
  { label: 'Neurology', value: 'Neurology', icon: '🧠' },
  { label: 'Orthopedics', value: 'Orthopedics', icon: '🦴' },
  { label: 'General Medicine', value: 'General Medicine', icon: '💊' },
  { label: 'Pediatrics', value: 'Pediatrics', icon: '👶' },
  { label: 'Gastroenterology', value: 'Gastroenterology', icon: '🔬' },
  { label: 'Gynecology', value: 'Gynecology', icon: '🌸' },
];

export default function DoctorsMarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [selectedLocality, setSelectedLocality] = useState('ALL');
  const [onlyAvailableToday, setOnlyAvailableToday] = useState(false);
  const [sortBy, setSortBy] = useState<'RECOMMENDED' | 'FEE_LOW' | 'EXPERIENCE'>('RECOMMENDED');

  const searchResult = useMemo(() => {
    const rawResult = searchDoctorsAndSymptoms(searchQuery, selectedSpecialty, selectedLocality);
    let list = [...rawResult.filteredDoctors];

    // Filter by available today
    if (onlyAvailableToday) {
      list = list.filter((doc) => doc.venues.some((v) => v.currentStatus === 'ACTIVE'));
    }

    // Sort
    if (sortBy === 'FEE_LOW') {
      list.sort((a, b) => (a.venues[0]?.feeRupees || 0) - (b.venues[0]?.feeRupees || 0));
    } else if (sortBy === 'EXPERIENCE') {
      list.sort((a, b) => b.experienceYears - a.experienceYears);
    }

    return {
      ...rawResult,
      filteredDoctors: list,
    };
  }, [searchQuery, selectedSpecialty, selectedLocality, onlyAvailableToday, sortBy]);

  const handleSymptomClick = (symptomKey: string, specialty: string, label: string) => {
    setSearchQuery(label);
    setSelectedSpecialty(specialty);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('ALL');
    setSelectedLocality('ALL');
    setOnlyAvailableToday(false);
    setSortBy('RECOMMENDED');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/40 flex flex-col justify-between relative overflow-hidden">
      {/* Ambient Lighting */}
      <div className="absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 -ml-40 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-emerald-100/80 px-6 py-3.5 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-600/20">
              M
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                MediBooking<span className="text-emerald-600">.in</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Doctor Marketplace
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/register">
              <Button variant="outline" size="sm" className="text-xs font-semibold rounded-xl">
                Patient Register
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

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6 relative z-10">
        {/* Marketplace Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 text-emerald-900 border border-emerald-200 text-xs font-bold shadow-xs">
            <span>🛡️ National Medical Commission (NMC) Verified Specialist Network</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Find & Book Bhopal Specialists
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Reserve chamber tokens for <strong>₹49</strong>. Your vitals and prescription sheet are pre-printed at the counter before you arrive. Settle consultation fees at the clinic.
          </p>
        </div>

        {/* Emergency Alert Banner (Shown when cardiac / stroke keywords triggered) */}
        {searchResult.emergencyNotice && (
          <div
            data-testid="banner-emergency-triage"
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 shadow-sm text-xs text-rose-900"
          >
            <div className="h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-black shrink-0 text-sm">
              🚨
            </div>
            <div>
              <span className="font-bold text-rose-950 block text-sm">
                Emergency Medical Alert
              </span>
              <p className="mt-0.5 leading-relaxed text-rose-800">
                {searchResult.emergencyNotice} If this is a medical emergency, please dial <strong>108 Ambulance</strong> or visit the nearest trauma hospital immediately.
              </p>
            </div>
          </div>
        )}

        {/* Search & Filter Control Deck (Glassmorphism) */}
        <div className="bg-white/85 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-xl shadow-emerald-950/5 space-y-5">
          {/* Search Box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              data-testid="input-marketplace-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symptoms ('chest heaviness', 'knee pain', 'acne'), doctor name, or clinic..."
              className="w-full pl-12 pr-20 py-3.5 rounded-2xl bg-white border border-emerald-200 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Symptom Chips Strip */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Common Symptoms (Click to Auto-Match Specialty):
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-wrap">
              {COMMON_SYMPTOMS_TAXONOMY.map((sym) => {
                const isSelected = searchQuery.toLowerCase().includes(sym.displayLabel.toLowerCase());
                return (
                  <button
                    key={sym.symptomKey}
                    type="button"
                    onClick={() => handleSymptomClick(sym.symptomKey, sym.specialty, sym.displayLabel)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 border border-emerald-200/80'
                    }`}
                  >
                    <span>{sym.icon}</span>
                    <span>{sym.displayLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specialty, Locality & Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
            {/* Specialty Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Specialty:
              </label>
              <select
                value={selectedSpecialty}
                data-testid="select-filter-specialty"
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              >
                {SPECIALTY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Locality Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Bhopal Locality:
              </label>
              <select
                value={selectedLocality}
                data-testid="select-filter-locality"
                onChange={(e) => setSelectedLocality(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              >
                {BHOPAL_LOCALITIES.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    📍 {loc.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Sort By:
              </label>
              <select
                value={sortBy}
                data-testid="select-sort-by"
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              >
                <option value="RECOMMENDED">✨ Recommended</option>
                <option value="FEE_LOW">💰 Fee: Low to High</option>
                <option value="EXPERIENCE">🎓 Experience: High to Low</option>
              </select>
            </div>

            {/* Available Today Filter */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setOnlyAvailableToday(!onlyAvailableToday)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  onlyAvailableToday
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-300'
                }`}
              >
                <span>🟢</span>
                <span>Available Today</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Results Summary Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">
              Showing {searchResult.filteredDoctors.length} Verified Specialist
              {searchResult.filteredDoctors.length === 1 ? '' : 's'} in Bhopal
            </span>
            {searchResult.matchedSpecialty && (
              <Badge variant="mint" size="sm">
                Auto-Matched: {searchResult.matchedSpecialty}
              </Badge>
            )}
            {onlyAvailableToday && (
              <Badge variant="blue" size="sm">
                🟢 Today Only
              </Badge>
            )}
          </div>
          {(searchQuery || selectedSpecialty !== 'ALL' || selectedLocality !== 'ALL' || onlyAvailableToday || sortBy !== 'RECOMMENDED') && (
            <button
              onClick={handleClearFilters}
              data-testid="btn-reset-marketplace-filters"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 self-start sm:self-auto hover:underline"
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* Doctors Grid */}
        {searchResult.filteredDoctors.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/80 border border-slate-200 shadow-sm space-y-3">
            <div className="text-3xl">🔍</div>
            <h3 className="text-base font-bold text-slate-900">
              No doctors found matching your search criteria
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try searching a broader symptom (e.g. &apos;chest&apos;, &apos;fever&apos;, &apos;skin&apos;) or selecting &apos;All Bhopal&apos;.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="mt-2 text-xs font-bold"
            >
              Clear Search Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {searchResult.filteredDoctors.map((doc) => {
              const primaryVenue = doc.venues[0];
              return (
                <div
                  key={doc.id}
                  data-testid={`card-doctor-${doc.slug}`}
                  className="bg-white/85 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-lg shadow-emerald-950/5 hover:border-emerald-300 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Name, Credentials, NMC Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-600/20 shrink-0">
                          DR
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">
                              {doc.fullName}
                            </h2>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ NMC Verified
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-emerald-800">
                            {doc.specialtyLabel}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {doc.qualifications} • {doc.experienceYears}+ Yrs Exp.
                          </p>
                        </div>
                      </div>

                      {/* Consultation Fee */}
                      {primaryVenue && (
                        <div className="text-right shrink-0 bg-emerald-50/80 px-3 py-1.5 rounded-xl border border-emerald-200">
                          <span className="text-[10px] text-emerald-800 font-bold block uppercase">
                            Chamber Fee
                          </span>
                          <span className="text-lg font-black font-mono text-slate-900 block">
                            ₹{primaryVenue.feeRupees}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* NMC & Rating Badges */}
                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                          🛡️ NMC: {doc.nmcNumber}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                          ⭐ {doc.rating} ({doc.reviewCount}+ reviews)
                        </span>
                      </div>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `Check out ${doc.fullName} (${doc.specialtyLabel}) in Bhopal on MediBooking: http://localhost:3000/dr/${doc.slug}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                        title="Share on WhatsApp"
                      >
                        <span>📲 Share</span>
                      </a>
                    </div>

                    {/* Treated Symptoms Tags */}
                    <div className="mt-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Conditions & Symptoms Treated:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {doc.treatedSymptoms.slice(0, 4).map((sym) => (
                          <span
                            key={sym}
                            className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50/70 text-emerald-900 border border-emerald-100"
                          >
                            {sym}
                          </span>
                        ))}
                        {doc.treatedSymptoms.length > 4 && (
                          <span className="text-[10px] text-slate-400 font-semibold self-center">
                            +{doc.treatedSymptoms.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Practice Venues / Chambers */}
                    <div className="mt-3.5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Affiliated Polyclinic Chambers in Bhopal:
                      </span>
                      {doc.venues.map((venue) => (
                        <div
                          key={venue.clinicId}
                          className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block truncate">
                              {venue.clinicName}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {venue.locality} • {venue.eveningTiming}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {venue.chamberNumber}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Booking CTA Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <Link
                      href={`/dr/${doc.slug}`}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs text-center shadow-md shadow-emerald-600/20 transition-all"
                    >
                      📱 Book Token (₹49 Nominal)
                    </Link>
                    {primaryVenue && (
                      <Link
                        href={`/tv/${primaryVenue.tvSlug}`}
                        className="py-2.5 px-3.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs text-center transition-colors shrink-0"
                      >
                        Live TV
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-emerald-100/70 py-6 px-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
              M
            </div>
            <span className="font-semibold text-slate-700">© 2026 MediBooking.in</span>
            <span>—</span>
            <span>Bhopal Polyclinic OS & Specialist Directory</span>
          </div>
          <span>NMC Verified Practitioners • Section 194J Automated Payouts • DPDP Act 2023 Compliant</span>
        </div>
      </footer>
    </div>
  );
}
