/**
 * MediBooking Enterprise Clinic & Multi-Chamber Provisioning Service
 * Manages polyclinic tenant lifecycle and physical chambers (CH-1..CH-4)
 * with strict unique constraints per clinic.
 */

import crypto from 'crypto';
import { Clinic, Chamber, UserRole, StaffScope, UserContext } from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';
import { authService } from './auth-service';

export interface CreateClinicDTO {
  name: string;
  slug?: string;
  tagline?: string;
  addressLine: string;
  locality: string;
  city?: string;
  state?: string;
  pincode: string;
  contactPhone: string;
  contactEmail?: string;
  initialChambersCount?: number;
}

export interface OnboardClinicWizardDTO {
  name: string;
  slug?: string;
  tagline?: string;
  addressLine: string;
  locality: string;
  city?: string;
  state?: string;
  pincode: string;
  adminName: string;
  contactPhone: string;
  contactEmail?: string;
  chambers: Array<{
    chamberNumber: string;
    chamberName: string;
    floor?: string;
  }>;
  receptionistName?: string;
  receptionistMobile?: string;
  upiVpa?: string;
  merchantName?: string;
  openingCashFloat?: number;
  autoPrintReceipt?: boolean;
}

export interface CreateChamberDTO {
  chamberNumber: string;
  chamberName: string;
  floor?: string;
}

export class ClinicService {
  private clinics = new Map<string, Clinic>();
  private chambers = new Map<string, Chamber[]>();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // Seed default Bhopal polyclinic
    const defaultClinic: Clinic = {
      id: SEED_DATA.clinic.id,
      name: SEED_DATA.clinic.name,
      slug: SEED_DATA.clinic.slug,
      tagline: SEED_DATA.clinic.tagline,
      addressLine: SEED_DATA.clinic.addressLine,
      locality: SEED_DATA.clinic.locality,
      city: SEED_DATA.clinic.city,
      state: SEED_DATA.clinic.state,
      pincode: SEED_DATA.clinic.pincode,
      contactPhone: SEED_DATA.clinic.contactPhone,
      contactEmail: 'contact@citycarebhopal.com',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.clinics.set(defaultClinic.id, defaultClinic);

    // Seed default chambers (CH-1 to CH-4)
    const defaultChambers: Chamber[] = SEED_DATA.chambers.map((ch) => ({
      id: ch.id,
      clinicId: defaultClinic.id,
      chamberNumber: ch.chamberNumber,
      chamberName: ch.chamberName,
      floor: ch.floor,
      isActive: true,
    }));

    this.chambers.set(defaultClinic.id, defaultChambers);
  }

  /**
   * Provision a new clinic tenant
   */
  public async createClinic(dto: CreateClinicDTO): Promise<{ clinic: Clinic; chambers: Chamber[] }> {
    const clinicId = crypto.randomUUID();
    const baseSlug = dto.slug || this.generateSlug(dto.name);
    let finalSlug = baseSlug;
    let counter = 1;

    // Guarantee unique slug
    while ([...this.clinics.values()].some((c) => c.slug === finalSlug)) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const now = new Date().toISOString();
    const clinic: Clinic = {
      id: clinicId,
      name: dto.name,
      slug: finalSlug,
      tagline: dto.tagline,
      addressLine: dto.addressLine,
      locality: dto.locality,
      city: dto.city || 'Bhopal',
      state: dto.state || 'Madhya Pradesh',
      pincode: dto.pincode,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.clinics.set(clinicId, clinic);

    // Automatically provision initial physical chambers (e.g. CH-1..CH-4)
    const initialCount = dto.initialChambersCount ?? 4;
    const initialChambers: Chamber[] = [];

    for (let i = 1; i <= initialCount; i++) {
      const chamberNumber = `CH-${i}`;
      initialChambers.push({
        id: crypto.randomUUID(),
        clinicId,
        chamberNumber,
        chamberName: `Chamber ${i}`,
        floor: 'Ground Floor',
        isActive: true,
      });
    }

    this.chambers.set(clinicId, initialChambers);

    return { clinic, chambers: initialChambers };
  }

  /**
   * Complete Self-Serve Polyclinic Onboarding Wizard
   */
  public async onboardPolyclinicWizard(dto: OnboardClinicWizardDTO): Promise<{
    clinic: Clinic;
    chambers: Chamber[];
    adminUser: { id: string; name: string; mobile: string; role: UserRole; token: string };
    receptionistUser?: { id: string; name: string; mobile: string; role: UserRole; token: string };
    trial: { plan: string; days: number; expiresAt: string };
    urls: {
      receptionistUrl: string;
      tvUrl: string;
      adminUrl: string;
    };
  }> {
    const clinicId = crypto.randomUUID();
    const baseSlug = dto.slug || this.generateSlug(dto.name);
    let finalSlug = baseSlug;
    let counter = 1;

    while ([...this.clinics.values()].some((c) => c.slug === finalSlug)) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const now = new Date().toISOString();
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const clinic: Clinic = {
      id: clinicId,
      name: dto.name,
      slug: finalSlug,
      tagline: dto.tagline || 'Outpatient Polyclinic & Diagnostic Care',
      addressLine: dto.addressLine,
      locality: dto.locality,
      city: dto.city || 'Bhopal',
      state: dto.state || 'Madhya Pradesh',
      pincode: dto.pincode,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail || `${finalSlug}@medibooking.in`,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      trialEndsAt,
      upiVpa: dto.upiVpa || `${finalSlug}@upi`,
      merchantName: dto.merchantName || dto.name,
      openingCashFloat: dto.openingCashFloat ?? 2000,
      autoPrintReceipt: dto.autoPrintReceipt ?? true,
    };

    this.clinics.set(clinicId, clinic);

    // Provision custom chambers
    const chamberList: Chamber[] = (dto.chambers && dto.chambers.length > 0 ? dto.chambers : [
      { chamberNumber: 'CH-1', chamberName: 'Cardiology & General Medicine', floor: 'Ground Floor' },
      { chamberNumber: 'CH-2', chamberName: 'Pediatrics & Child Wellness', floor: 'Ground Floor' },
      { chamberNumber: 'CH-3', chamberName: 'Orthopedics & Joint Care', floor: 'First Floor' },
      { chamberNumber: 'CH-4', chamberName: 'Gynecology & Women Health', floor: 'First Floor' },
    ]).map((ch, idx) => ({
      id: crypto.randomUUID(),
      clinicId,
      chamberNumber: (ch.chamberNumber || `CH-${idx + 1}`).toUpperCase().trim(),
      chamberName: ch.chamberName.trim(),
      floor: ch.floor || 'Ground Floor',
      isActive: true,
    }));

    this.chambers.set(clinicId, chamberList);

    // Register Admin user in authService
    const adminUserId = `usr-admin-${clinicId.slice(0, 8)}`;
    const cleanAdminMobile = dto.contactPhone.trim().replace(/^\+91/, '');
    const adminUserContext: UserContext = {
      userId: adminUserId,
      mobile: cleanAdminMobile,
      fullName: dto.adminName,
      email: dto.contactEmail,
      activeRole: UserRole.CLINIC_ADMIN,
      activeClinicId: clinicId,
      activeClinicName: dto.name,
      allowedRoles: [UserRole.CLINIC_ADMIN],
      availableClinics: [
        {
          clinicId,
          clinicName: dto.name,
          role: UserRole.CLINIC_ADMIN,
        },
      ],
    };
    authService.registerDynamicUser(adminUserContext);
    const adminToken = authService.signToken({
      sub: adminUserId,
      mobile: cleanAdminMobile,
      role: UserRole.CLINIC_ADMIN,
      clinicId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    });

    // Register Receptionist user if provided
    let receptionistUser: { id: string; name: string; mobile: string; role: UserRole; token: string } | undefined;
    if (dto.receptionistMobile && dto.receptionistName) {
      const recUserId = `usr-rec-${clinicId.slice(0, 8)}`;
      const cleanRecMobile = dto.receptionistMobile.trim().replace(/^\+91/, '');
      const recUserContext: UserContext = {
        userId: recUserId,
        mobile: cleanRecMobile,
        fullName: dto.receptionistName,
        activeRole: UserRole.RECEPTIONIST,
        activeClinicId: clinicId,
        activeClinicName: dto.name,
        staffScope: StaffScope.CLINIC_WIDE,
        allowedRoles: [UserRole.RECEPTIONIST],
        availableClinics: [
          {
            clinicId,
            clinicName: dto.name,
            role: UserRole.RECEPTIONIST,
          },
        ],
      };
      authService.registerDynamicUser(recUserContext);
      const recToken = authService.signToken({
        sub: recUserId,
        mobile: cleanRecMobile,
        role: UserRole.RECEPTIONIST,
        clinicId,
        staffScope: StaffScope.CLINIC_WIDE,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      });
      receptionistUser = {
        id: recUserId,
        name: dto.receptionistName,
        mobile: cleanRecMobile,
        role: UserRole.RECEPTIONIST,
        token: recToken,
      };
    }

    return {
      clinic,
      chambers: chamberList,
      adminUser: {
        id: adminUserId,
        name: dto.adminName,
        mobile: cleanAdminMobile,
        role: UserRole.CLINIC_ADMIN,
        token: adminToken,
      },
      receptionistUser,
      trial: {
        plan: 'CLINIC_PRO',
        days: 30,
        expiresAt: trialEndsAt,
      },
      urls: {
        receptionistUrl: `/receptionist?clinicId=${clinicId}`,
        tvUrl: `/tv/${finalSlug}`,
        adminUrl: `/admin?clinicId=${clinicId}`,
      },
    };
  }

  /**
   * Get clinic profile by UUID with its physical chambers
   */
  public async getClinicById(clinicId: string): Promise<{ clinic: Clinic; chambers: Chamber[] } | null> {
    const clinic = this.clinics.get(clinicId);
    if (!clinic) return null;
    const chambers = this.chambers.get(clinicId) || [];
    return { clinic, chambers };
  }

  /**
   * Get clinic by unique slug
   */
  public async getClinicBySlug(slug: string): Promise<{ clinic: Clinic; chambers: Chamber[] } | null> {
    const clinic = [...this.clinics.values()].find((c) => c.slug === slug);
    if (!clinic) return null;
    const chambers = this.chambers.get(clinic.id) || [];
    return { clinic, chambers };
  }

  /**
   * List all clinics
   */
  public async listClinics(): Promise<Clinic[]> {
    return [...this.clinics.values()];
  }

  /**
   * Add a new physical chamber to a clinic
   */
  public async addChamber(clinicId: string, dto: CreateChamberDTO): Promise<Chamber> {
    const clinic = this.clinics.get(clinicId);
    if (!clinic) {
      throw new Error(`Clinic with ID '${clinicId}' does not exist.`);
    }

    const clinicChambers = this.chambers.get(clinicId) || [];
    const normalizedChamberNumber = dto.chamberNumber.toUpperCase().trim();

    // Enforce UNIQUE(clinic_id, chamber_number)
    const duplicate = clinicChambers.find(
      (c) => c.chamberNumber.toUpperCase() === normalizedChamberNumber
    );

    if (duplicate) {
      throw new Error(
        `Chamber '${normalizedChamberNumber}' already exists in clinic '${clinic.name}'. Duplicate chamber numbers are not permitted.`
      );
    }

    const newChamber: Chamber = {
      id: crypto.randomUUID(),
      clinicId,
      chamberNumber: normalizedChamberNumber,
      chamberName: dto.chamberName.trim(),
      floor: dto.floor || 'Ground Floor',
      isActive: true,
    };

    clinicChambers.push(newChamber);
    this.chambers.set(clinicId, clinicChambers);

    return newChamber;
  }

  /**
   * List all physical chambers for a clinic
   */
  public async listChambers(clinicId: string): Promise<Chamber[]> {
    const clinic = this.clinics.get(clinicId);
    if (!clinic) {
      throw new Error(`Clinic with ID '${clinicId}' does not exist.`);
    }
    return this.chambers.get(clinicId) || [];
  }

  /**
   * Update chamber details or toggle active status
   */
  public async updateChamber(
    clinicId: string,
    chamberNumber: string,
    updates: Partial<{ chamberName: string; floor: string; isActive: boolean }>
  ): Promise<Chamber> {
    const clinicChambers = this.chambers.get(clinicId);
    if (!clinicChambers) {
      throw new Error(`No chambers found for clinic '${clinicId}'.`);
    }

    const chamber = clinicChambers.find(
      (c) => c.chamberNumber.toUpperCase() === chamberNumber.toUpperCase()
    );

    if (!chamber) {
      throw new Error(`Chamber '${chamberNumber}' was not found in clinic '${clinicId}'.`);
    }

    if (updates.chamberName !== undefined) chamber.chamberName = updates.chamberName.trim();
    if (updates.floor !== undefined) chamber.floor = updates.floor.trim();
    if (updates.isActive !== undefined) chamber.isActive = updates.isActive;

    return chamber;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  public reset(): void {
    this.resetStore();
  }

  public resetStore(): void {
    this.clinics.clear();
    this.chambers.clear();
    this.seedDefaultData();
  }
}

export const clinicService = new ClinicService();
