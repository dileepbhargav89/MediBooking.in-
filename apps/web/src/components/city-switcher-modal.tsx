'use client';

import React, { useState, useEffect, useMemo } from 'react';

export interface CityOption {
  id: string;
  name: string;
  slug: string;
  state: string;
  status: 'GA_ACTIVE' | 'PILOT_ACTIVE' | 'PLANNED';
  isHq?: boolean;
  activeClinicsCount?: number;
  activeDoctorsCount?: number;
  coordinates?: { lat: number; lng: number };
}

const DEFAULT_CITIES: CityOption[] = [
  {
    id: 'city-bhopal-hq',
    name: 'Bhopal',
    slug: 'bhopal',
    state: 'Madhya Pradesh',
    status: 'GA_ACTIVE',
    isHq: true,
    activeClinicsCount: 10,
    activeDoctorsCount: 8,
    coordinates: { lat: 23.2599, lng: 77.4126 },
  },
  {
    id: 'city-indore-hub',
    name: 'Indore',
    slug: 'indore',
    state: 'Madhya Pradesh',
    status: 'GA_ACTIVE',
    isHq: false,
    activeClinicsCount: 4,
    activeDoctorsCount: 5,
    coordinates: { lat: 22.7196, lng: 75.8577 },
  },
  {
    id: 'city-gwalior-hub',
    name: 'Gwalior',
    slug: 'gwalior',
    state: 'Madhya Pradesh',
    status: 'PILOT_ACTIVE',
    isHq: false,
    activeClinicsCount: 1,
    activeDoctorsCount: 1,
    coordinates: { lat: 26.2183, lng: 78.1828 },
  },
  {
    id: 'city-jabalpur-hub',
    name: 'Jabalpur',
    slug: 'jabalpur',
    state: 'Madhya Pradesh',
    status: 'PILOT_ACTIVE',
    isHq: false,
    activeClinicsCount: 0,
    activeDoctorsCount: 0,
    coordinates: { lat: 23.1815, lng: 79.9864 },
  },
];

interface CitySwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string;
  onSelectCity: (cityName: string) => void;
}

export function CitySwitcherModal({
  isOpen,
  onClose,
  selectedCity,
  onSelectCity,
}: CitySwitcherModalProps) {
  const [cities, setCities] = useState<CityOption[]>(DEFAULT_CITIES);
  const [searchFilter, setSearchFilter] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  // Fetch live cities from backend on mount
  useEffect(() => {
    async function loadCities() {
      try {
        const res = await fetch('http://127.0.0.1:4000/api/v1/saas/cities');
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setCities(json.data);
          }
        }
      } catch {
        // Fall back gracefully to DEFAULT_CITIES
      }
    }
    loadCities();
  }, []);

  const filteredCities = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return cities;
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [cities, searchFilter]);

  const gaActiveCities = useMemo(
    () => filteredCities.filter((c) => c.status === 'GA_ACTIVE'),
    [filteredCities]
  );

  const pilotActiveCities = useMemo(
    () => filteredCities.filter((c) => c.status === 'PILOT_ACTIVE' || c.status === 'PLANNED'),
    [filteredCities]
  );

  const handleAutoDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingLocation(true);
    setGeoMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsDetectingLocation(false);
        const { latitude, longitude } = position.coords;

        // Euclidean distance finder to determine closest city center
        let closestCity = DEFAULT_CITIES[0];
        let minDistance = Number.MAX_VALUE;

        DEFAULT_CITIES.forEach((c) => {
          if (c.coordinates) {
            const dist = Math.hypot(
              c.coordinates.lat - latitude,
              c.coordinates.lng - longitude
            );
            if (dist < minDistance) {
              minDistance = dist;
              closestCity = c;
            }
          }
        });

        if (closestCity) {
          const targetCityName = closestCity.name;
          setGeoMessage(`Detected nearest healthcare cluster: ${targetCityName}`);
          setTimeout(() => {
            onSelectCity(targetCityName);
            onClose();
          }, 600);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoMessage('Location permission was denied. Defaulting to Bhopal HQ.');
        } else {
          setGeoMessage('Could not detect location. Please choose your city manually.');
        }
      },
      { timeout: 8000 }
    );
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        data-testid="modal-city-switcher"
        className="w-full max-w-xl bg-white rounded-3xl border border-emerald-100 shadow-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Decorative Glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-56 h-56 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg">
              📍
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Select Your City
              </h2>
              <p className="text-xs text-slate-500">
                Central India Polyclinic OS & Specialist Directory
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-city-modal"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Geolocation Auto-Detection & Search Controls */}
        <div className="py-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                data-testid="input-search-city"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search city (Bhopal, Indore, Gwalior...)"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              data-testid="btn-auto-detect-location"
              onClick={handleAutoDetectLocation}
              disabled={isDetectingLocation}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
            >
              <span>{isDetectingLocation ? '⏳' : '📍'}</span>
              <span>{isDetectingLocation ? 'Detecting GPS...' : 'Auto-Detect Location'}</span>
            </button>
          </div>

          {geoMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center gap-2">
              <span>ℹ️</span>
              <span>{geoMessage}</span>
            </div>
          )}
        </div>

        {/* Cities Grid with Scroll */}
        <div className="overflow-y-auto space-y-5 pr-1 flex-1 py-1">
          {/* 1. Live Markets (GA_ACTIVE) */}
          {gaActiveCities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                  Live Markets (Full Queue & Doctor Directory)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {gaActiveCities.map((city) => {
                  const isSelected =
                    selectedCity.toLowerCase() === city.name.toLowerCase();
                  return (
                    <button
                      key={city.id}
                      type="button"
                      data-testid={`city-option-${city.slug.toLowerCase()}`}
                      onClick={() => {
                        onSelectCity(city.name);
                        onClose();
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/90 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          🏙️
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-slate-900">
                              {city.name}
                            </span>
                            {city.isHq && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                HQ
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 block">
                            {city.state} • {city.activeClinicsCount ?? 5}+ Polyclinics
                          </span>
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="text-emerald-700 font-black text-base">✓</span>
                      ) : (
                        <span className="text-slate-300 text-xs">→</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Pilot & Beta Hubs (PILOT_ACTIVE) */}
          {pilotActiveCities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                  Pilot Expansion Hubs (Private Clinic Onboarding)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pilotActiveCities.map((city) => {
                  const isSelected =
                    selectedCity.toLowerCase() === city.name.toLowerCase();
                  return (
                    <button
                      key={city.id}
                      type="button"
                      data-testid={`city-option-${city.slug.toLowerCase()}`}
                      onClick={() => {
                        onSelectCity(city.name);
                        onClose();
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/90 border-amber-500 shadow-xs ring-1 ring-amber-500'
                          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isSelected
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          🧪
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-slate-900">
                              {city.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                              Pilot
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block">
                            {city.state} • Seed Polyclinics
                          </span>
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="text-amber-700 font-black text-base">✓</span>
                      ) : (
                        <span className="text-slate-300 text-xs">→</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredCities.length === 0 && (
            <div className="text-center py-8 text-slate-500 space-y-1">
              <span className="text-2xl block">🗺️</span>
              <p className="text-xs font-bold text-slate-700">No city clusters match &apos;{searchFilter}&apos;</p>
              <p className="text-[11px] text-slate-400">
                We are actively expanding across Madhya Pradesh and Central India.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <span>🛡️</span>
            <span>DPDP Act 2023 Explicit Consent Compliant</span>
          </div>
          <span className="text-slate-400 font-mono">Central India Grid</span>
        </div>
      </div>
    </div>
  );
}
