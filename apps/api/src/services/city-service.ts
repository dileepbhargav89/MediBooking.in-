/**
 * MediBooking Enterprise City & Market Lifecycle Service
 * Manages dynamic multi-city provisioning, PIN-code reverse lookup, and liquidity gates.
 */

import {
  CityRecord,
  LocalityRecord,
  CityLaunchStatus,
  CreateCityPayload,
  PincodeResolutionResult,
} from '@medibooking/types';

const INITIAL_PINCODE_MAP: Record<string, { city: string; locality: string; state: string; gstStateCode: string }> = {
  // Bhopal PIN codes
  '462011': { city: 'Bhopal', locality: 'MP Nagar', state: 'Madhya Pradesh', gstStateCode: '23' },
  '462016': { city: 'Bhopal', locality: 'Arera Colony', state: 'Madhya Pradesh', gstStateCode: '23' },
  '462042': { city: 'Bhopal', locality: 'Kolar Road', state: 'Madhya Pradesh', gstStateCode: '23' },
  '462003': { city: 'Bhopal', locality: 'TT Nagar', state: 'Madhya Pradesh', gstStateCode: '23' },
  '462039': { city: 'Bhopal', locality: 'Shahpura', state: 'Madhya Pradesh', gstStateCode: '23' },
  '462022': { city: 'Bhopal', locality: 'Indrapuri', state: 'Madhya Pradesh', gstStateCode: '23' },
  '462041': { city: 'Bhopal', locality: 'Ayodhya Bypass', state: 'Madhya Pradesh', gstStateCode: '23' },
  '462023': { city: 'Bhopal', locality: 'Kasturba Nagar', state: 'Madhya Pradesh', gstStateCode: '23' },

  // Indore PIN codes
  '452010': { city: 'Indore', locality: 'Vijay Nagar', state: 'Madhya Pradesh', gstStateCode: '23' },
  '452001': { city: 'Indore', locality: 'Palasia', state: 'Madhya Pradesh', gstStateCode: '23' },
  '452014': { city: 'Indore', locality: 'Bhawarkua', state: 'Madhya Pradesh', gstStateCode: '23' },
  '452002': { city: 'Indore', locality: 'Rajwada', state: 'Madhya Pradesh', gstStateCode: '23' },
  '452009': { city: 'Indore', locality: 'Annapurna', state: 'Madhya Pradesh', gstStateCode: '23' },

  // Gwalior PIN codes
  '474001': { city: 'Gwalior', locality: 'Lashkar', state: 'Madhya Pradesh', gstStateCode: '23' },
  '474006': { city: 'Gwalior', locality: 'Morar', state: 'Madhya Pradesh', gstStateCode: '23' },
  '474002': { city: 'Gwalior', locality: 'City Center', state: 'Madhya Pradesh', gstStateCode: '23' },

  // Jabalpur PIN codes
  '482001': { city: 'Jabalpur', locality: 'Wright Town', state: 'Madhya Pradesh', gstStateCode: '23' },
  '482002': { city: 'Jabalpur', locality: 'Napier Town', state: 'Madhya Pradesh', gstStateCode: '23' },

  // Ujjain PIN codes
  '456001': { city: 'Ujjain', locality: 'Freeganj', state: 'Madhya Pradesh', gstStateCode: '23' },
};

const INITIAL_CITIES: CityRecord[] = [
  {
    id: 'city-bhopal-hq',
    name: 'Bhopal',
    slug: 'bhopal',
    state: 'Madhya Pradesh',
    stateCode: 'MP',
    gstStateCode: '23',
    centerLat: 23.259933,
    centerLng: 77.412613,
    radiusKm: 30,
    regionalDialects: ['Hindi', 'Urdu'],
    launchStatus: CityLaunchStatus.GA_ACTIVE,
    isHq: true,
    clinicsCount: 10,
    doctorsCount: 38,
    chambersCount: 37,
    todayConsultations: 248,
    localities: [
      { id: 'loc-bhopal-1', cityId: 'city-bhopal-hq', name: 'MP Nagar', slug: 'mp-nagar', pincode: '462011', isActive: true },
      { id: 'loc-bhopal-2', cityId: 'city-bhopal-hq', name: 'Arera Colony', slug: 'arera-colony', pincode: '462016', isActive: true },
      { id: 'loc-bhopal-3', cityId: 'city-bhopal-hq', name: 'Kolar Road', slug: 'kolar-road', pincode: '462042', isActive: true },
      { id: 'loc-bhopal-4', cityId: 'city-bhopal-hq', name: 'TT Nagar', slug: 'tt-nagar', pincode: '462003', isActive: true },
      { id: 'loc-bhopal-5', cityId: 'city-bhopal-hq', name: 'Shahpura', slug: 'shahpura', pincode: '462039', isActive: true },
      { id: 'loc-bhopal-6', cityId: 'city-bhopal-hq', name: 'Indrapuri', slug: 'indrapuri', pincode: '462022', isActive: true },
      { id: 'loc-bhopal-7', cityId: 'city-bhopal-hq', name: 'Ayodhya Bypass', slug: 'ayodhya-bypass', pincode: '462041', isActive: true },
    ],
    specialtyCoverage: [
      { specialty: 'General Medicine', doctorCount: 12, status: 'READY' },
      { specialty: 'Cardiology', doctorCount: 8, status: 'READY' },
      { specialty: 'Pediatrics', doctorCount: 6, status: 'READY' },
      { specialty: 'Orthopedics', doctorCount: 5, status: 'READY' },
      { specialty: 'Gynecology', doctorCount: 4, status: 'READY' },
      { specialty: 'Dermatology', doctorCount: 3, status: 'READY' },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

export class CityService {
  private static instance: CityService;
  private cities: Map<string, CityRecord> = new Map();
  private pincodeMap: Map<string, { city: string; locality: string; state: string; gstStateCode: string }> = new Map();

  private constructor() {
    // Seed cities
    for (const city of INITIAL_CITIES) {
      this.cities.set(city.id, { ...city });
    }
    // Seed PIN codes
    for (const [pin, info] of Object.entries(INITIAL_PINCODE_MAP)) {
      this.pincodeMap.set(pin, info);
    }
  }

  public static getInstance(): CityService {
    if (!CityService.instance) {
      CityService.instance = new CityService();
    }
    return CityService.instance;
  }

  /**
   * Get all cities with eager-loaded localities
   */
  public getAllCities(): CityRecord[] {
    return Array.from(this.cities.values()).sort((a, b) => {
      if (a.isHq) return -1;
      if (b.isHq) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get city by slug
   */
  public getCityBySlug(slug: string): CityRecord | null {
    const normalized = slug.toLowerCase().trim();
    for (const city of this.cities.values()) {
      if (city.slug === normalized) return city;
    }
    return null;
  }

  /**
   * Get city by ID
   */
  public getCityById(id: string): CityRecord | null {
    return this.cities.get(id) || null;
  }

  /**
   * Provision a new city cluster at the Super Admin tier
   */
  public createCity(payload: CreateCityPayload): CityRecord {
    // Strict slug normalization
    const rawSlug = payload.slug || payload.name;
    const slug = rawSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check slug collision
    if (this.getCityBySlug(slug)) {
      const error: any = new Error(`City with slug '${slug}' already exists.`);
      error.statusCode = 409;
      throw error;
    }

    const cityId = `city-${slug}-${Date.now().toString().slice(-4)}`;

    // Build localities
    const localities: LocalityRecord[] = (payload.initialLocalities || []).map((locName, idx) => {
      const locSlug = locName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      return {
        id: `loc-${slug}-${idx + 1}`,
        cityId,
        name: locName.trim(),
        slug: locSlug,
        isActive: true,
      };
    });

    // Default regional dialects based on city name
    let dialects = payload.regionalDialects || ['Hindi'];
    if (slug.includes('indore') || slug.includes('ujjain')) {
      if (!dialects.includes('Malwi')) dialects.push('Malwi');
    } else if (slug.includes('gwalior')) {
      if (!dialects.includes('Bundeli')) dialects.push('Bundeli');
    } else if (slug.includes('jabalpur')) {
      if (!dialects.includes('Bagheli')) dialects.push('Bagheli');
    }

    const newCity: CityRecord = {
      id: cityId,
      name: payload.name.trim(),
      slug,
      state: payload.state || 'Madhya Pradesh',
      stateCode: payload.stateCode || 'MP',
      gstStateCode: payload.gstStateCode || '23',
      centerLat: payload.centerLat,
      centerLng: payload.centerLng,
      radiusKm: payload.radiusKm || 25,
      regionalDialects: dialects,
      launchStatus: payload.launchStatus || CityLaunchStatus.PILOT_ACTIVE,
      isHq: false,
      clinicsCount: 0,
      doctorsCount: 0,
      chambersCount: 0,
      todayConsultations: 0,
      localities,
      specialtyCoverage: [
        { specialty: 'General Medicine', doctorCount: 0, status: 'GAP' },
        { specialty: 'Pediatrics', doctorCount: 0, status: 'GAP' },
        { specialty: 'Cardiology', doctorCount: 0, status: 'GAP' },
        { specialty: 'Orthopedics', doctorCount: 0, status: 'GAP' },
        { specialty: 'Gynecology', doctorCount: 0, status: 'GAP' },
        { specialty: 'Dermatology', doctorCount: 0, status: 'GAP' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.cities.set(cityId, newCity);
    return newCity;
  }

  /**
   * Update city launch status or add localities
   */
  public updateCity(
    id: string,
    updates: {
      launchStatus?: CityLaunchStatus;
      addLocalities?: string[];
      radiusKm?: number;
    }
  ): CityRecord {
    const city = this.cities.get(id);
    if (!city) {
      const error: any = new Error(`City with id '${id}' not found.`);
      error.statusCode = 404;
      throw error;
    }

    if (updates.launchStatus) {
      city.launchStatus = updates.launchStatus;
    }

    if (updates.radiusKm) {
      city.radiusKm = updates.radiusKm;
    }

    if (updates.addLocalities && updates.addLocalities.length > 0) {
      for (const locName of updates.addLocalities) {
        const trimmed = locName.trim();
        const locSlug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (!city.localities.some((l) => l.slug === locSlug)) {
          city.localities.push({
            id: `loc-${city.slug}-${city.localities.length + 1}`,
            cityId: city.id,
            name: trimmed,
            slug: locSlug,
            isActive: true,
          });
        }
      }
    }

    city.updatedAt = new Date().toISOString();
    this.cities.set(id, city);
    return city;
  }

  /**
   * Resolve 6-digit Indian PIN code to city & locality
   */
  public resolvePincode(pincode: string): PincodeResolutionResult {
    const cleanPin = pincode.replace(/\D/g, '').slice(0, 6);
    const match = this.pincodeMap.get(cleanPin);

    if (match) {
      return {
        pincode: cleanPin,
        city: match.city,
        locality: match.locality,
        state: match.state,
        gstStateCode: match.gstStateCode,
        matched: true,
      };
    }

    // Heuristic fallback based on PIN prefix in Central India
    if (cleanPin.startsWith('462')) {
      return { pincode: cleanPin, city: 'Bhopal', locality: 'Central Bhopal', state: 'Madhya Pradesh', gstStateCode: '23', matched: true };
    }
    if (cleanPin.startsWith('452')) {
      return { pincode: cleanPin, city: 'Indore', locality: 'Vijay Nagar', state: 'Madhya Pradesh', gstStateCode: '23', matched: true };
    }
    if (cleanPin.startsWith('474')) {
      return { pincode: cleanPin, city: 'Gwalior', locality: 'Lashkar', state: 'Madhya Pradesh', gstStateCode: '23', matched: true };
    }
    if (cleanPin.startsWith('482')) {
      return { pincode: cleanPin, city: 'Jabalpur', locality: 'Wright Town', state: 'Madhya Pradesh', gstStateCode: '23', matched: true };
    }
    if (cleanPin.startsWith('456')) {
      return { pincode: cleanPin, city: 'Ujjain', locality: 'Freeganj', state: 'Madhya Pradesh', gstStateCode: '23', matched: true };
    }

    return {
      pincode: cleanPin,
      city: 'Bhopal',
      locality: 'MP Nagar',
      state: 'Madhya Pradesh',
      gstStateCode: '23',
      matched: false,
    };
  }

  /**
   * Increment clinic count when a clinic onboards in this city
   */
  public registerClinicInCity(cityNameOrSlug: string): void {
    const normalized = cityNameOrSlug.toLowerCase().trim();
    for (const city of this.cities.values()) {
      if (city.slug === normalized || city.name.toLowerCase() === normalized) {
        city.clinicsCount += 1;
        city.updatedAt = new Date().toISOString();
        break;
      }
    }
  }
}

export const cityService = CityService.getInstance();
