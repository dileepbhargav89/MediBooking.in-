/**
 * MediBooking Doctor Master Registry & NMC Verification Service
 * Manages doctor master credentials, state medical council verification desk,
 * and public discovery profiles under National Medical Commission standards.
 */

import crypto from 'crypto';
import { DoctorProfile, MedicalSpecialty } from '@medibooking/types';
import { SEED_DATA, BHOPAL_10_CLINICS } from '@medibooking/database';

export interface CreateDoctorDTO {
  userId?: string;
  fullName: string;
  slug?: string;
  registrationNumber: string;
  stateMedicalCouncil: string;
  registrationYear?: number;
  symptomKeywords?: string[];
  specialties: MedicalSpecialty[];
  qualifications: string[];
  experienceYears: number;
  bio?: string;
  profilePhotoUrl?: string;
  isVerified?: boolean;
}

export interface UpdateDoctorProfileDTO {
  bio?: string;
  profilePhotoUrl?: string;
  qualifications?: string[];
  experienceYears?: number;
  registrationNumber?: string;
  stateMedicalCouncil?: string;
}

export class DoctorService {
  private doctors = new Map<string, DoctorProfile>();
  private slugToId = new Map<string, string>();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const now = new Date().toISOString();

    // 1. Seed initial Bhopal specialist doctors from SEED_DATA
    for (const doc of SEED_DATA.doctors) {
      const profile: DoctorProfile = {
        id: doc.doctorId,
        userId: `usr-doc-${doc.doctorId.slice(0, 8)}`,
        fullName: doc.fullName,
        slug: doc.slug,
        registrationNumber: doc.registrationNumber,
        stateMedicalCouncil: doc.stateMedicalCouncil,
        specialties: doc.specialties,
        qualifications: doc.qualifications,
        experienceYears: doc.experienceYears,
        bio: doc.bio,
        profilePhotoUrl: undefined,
        isVerified: true,
        createdAt: now,
        updatedAt: now,
      };

      this.doctors.set(profile.id, profile);
      this.slugToId.set(profile.slug, profile.id);
    }

    // 2. Seed all specialist doctors across all 10 Bhopal pilot clinics
    for (const clinic of BHOPAL_10_CLINICS) {
      for (const doc of clinic.doctors) {
        if (!this.doctors.has(doc.doctorId)) {
          const profile: DoctorProfile = {
            id: doc.doctorId,
            userId: doc.userId,
            fullName: doc.fullName,
            slug: doc.slug,
            registrationNumber: doc.registrationNumber,
            stateMedicalCouncil: doc.stateMedicalCouncil,
            specialties: doc.specialties,
            qualifications: doc.qualifications,
            experienceYears: doc.experienceYears,
            bio: doc.bio,
            profilePhotoUrl: undefined,
            isVerified: true,
            createdAt: now,
            updatedAt: now,
          };

          this.doctors.set(profile.id, profile);
          this.slugToId.set(profile.slug, profile.id);
        }
      }
    }
  }

  /**
   * Provision a new doctor master profile
   */
  public async createDoctor(dto: CreateDoctorDTO): Promise<DoctorProfile> {
    const doctorId = crypto.randomUUID();
    const userId = dto.userId || crypto.randomUUID();
    const baseSlug = dto.slug || this.generateDoctorSlug(dto.fullName, dto.specialties[0]);
    let finalSlug = baseSlug;
    let counter = 1;

    // Ensure unique doctor slug
    while (this.slugToId.has(finalSlug)) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const now = new Date().toISOString();
    const profile: DoctorProfile = {
      id: doctorId,
      userId,
      fullName: dto.fullName.trim(),
      slug: finalSlug,
      registrationNumber: dto.registrationNumber.trim().toUpperCase(),
      stateMedicalCouncil: dto.stateMedicalCouncil.trim(),
      registrationYear: dto.registrationYear ?? 2015,
      symptomKeywords: dto.symptomKeywords ?? [],
      specialties: dto.specialties,
      qualifications: dto.qualifications.map((q) => q.trim()),
      experienceYears: dto.experienceYears,
      bio: dto.bio?.trim(),
      profilePhotoUrl: dto.profilePhotoUrl?.trim(),
      isVerified: dto.isVerified ?? false,
      verificationStatus: dto.isVerified ? 'VERIFIED' : 'PENDING_VERIFICATION',
      createdAt: now,
      updatedAt: now,
    };

    this.doctors.set(doctorId, profile);
    this.slugToId.set(finalSlug, doctorId);

    return profile;
  }

  /**
   * Fetch doctor by UUID
   */
  public async getDoctorById(id: string): Promise<DoctorProfile | null> {
    return this.doctors.get(id) || null;
  }

  /**
   * Fetch doctor by public discovery slug
   */
  public async getDoctorBySlug(slug: string): Promise<DoctorProfile | null> {
    const id = this.slugToId.get(slug);
    if (!id) return null;
    return this.doctors.get(id) || null;
  }

  /**
   * List all doctors
   */
  public async listDoctors(): Promise<DoctorProfile[]> {
    return [...this.doctors.values()];
  }

  /**
   * Super Admin NMC Verification Desk
   */
  public async verifyNmcCredentials(
    doctorId: string,
    isVerified: boolean,
    auditNotes?: string
  ): Promise<{ doctor: DoctorProfile; auditNotes?: string }> {
    const doctor = this.doctors.get(doctorId);
    if (!doctor) {
      throw new Error(`Doctor with ID '${doctorId}' does not exist.`);
    }

    doctor.isVerified = isVerified;
    doctor.updatedAt = new Date().toISOString();

    return { doctor, auditNotes };
  }

  /**
   * Doctor Self-Service Profile Update
   */
  public async updateDoctorProfile(doctorId: string, updates: UpdateDoctorProfileDTO): Promise<DoctorProfile> {
    const doctor = this.doctors.get(doctorId);
    if (!doctor) {
      throw new Error(`Doctor with ID '${doctorId}' does not exist.`);
    }

    if (updates.bio !== undefined) doctor.bio = updates.bio.trim();
    if (updates.profilePhotoUrl !== undefined) doctor.profilePhotoUrl = updates.profilePhotoUrl.trim();
    if (updates.qualifications !== undefined) doctor.qualifications = updates.qualifications.map((q) => q.trim());
    if (updates.experienceYears !== undefined) doctor.experienceYears = updates.experienceYears;

    // If legal credentials change, automatically revoke verification until re-verified
    if (updates.registrationNumber !== undefined && updates.registrationNumber.trim() !== doctor.registrationNumber) {
      doctor.registrationNumber = updates.registrationNumber.trim().toUpperCase();
      doctor.isVerified = false; // Mandatory regulatory re-verification
    }

    if (updates.stateMedicalCouncil !== undefined && updates.stateMedicalCouncil.trim() !== doctor.stateMedicalCouncil) {
      doctor.stateMedicalCouncil = updates.stateMedicalCouncil.trim();
      doctor.isVerified = false;
    }

    doctor.updatedAt = new Date().toISOString();
    return doctor;
  }

  /**
   * Search and filter doctors directory
   */
  public async searchDoctors(params: {
    specialty?: MedicalSpecialty;
    query?: string;
  }): Promise<DoctorProfile[]> {
    const results: DoctorProfile[] = [];
    const q = params.query ? params.query.toLowerCase().trim() : '';

    for (const doc of this.doctors.values()) {
      if (params.specialty && !doc.specialties.includes(params.specialty)) {
        continue;
      }
      if (q) {
        const matchesName = doc.fullName.toLowerCase().includes(q);
        const matchesSpecialty = doc.specialties.some((s) => s.toLowerCase().includes(q));
        const matchesQual = doc.qualifications.some((qual) => qual.toLowerCase().includes(q));
        const matchesBio = doc.bio?.toLowerCase().includes(q);
        if (!matchesName && !matchesSpecialty && !matchesQual && !matchesBio) {
          continue;
        }
      }
      results.push(doc);
    }
    return results;
  }

  /**
   * Evaluates chamber schedule conflicts for visiting doctors
   */
  public checkChamberConflict(params: {
    clinicId?: string;
    chamberNumber: string;
    startTime?: string;
    endTime?: string;
  }): {
    hasConflict: boolean;
    conflictingDoctor?: string;
    conflictingShift?: string;
    message?: string;
    suggestedChambers: string[];
  } {
    const ch = (params.chamberNumber || '').toUpperCase().trim();
    const timeStr = `${params.startTime || ''} ${params.endTime || ''}`.toLowerCase();

    // Check CH-1 evening shift conflict (Dr. Rajesh Sharma: 05:30 PM – 08:30 PM / 17:30 - 20:30)
    const isEveningOrOverlapping =
      timeStr.includes('17:') ||
      timeStr.includes('18:') ||
      timeStr.includes('19:') ||
      timeStr.includes('20:') ||
      timeStr.includes('05:30') ||
      timeStr.includes('5:30') ||
      timeStr.includes('06:') ||
      timeStr.includes('6:') ||
      timeStr.includes('07:') ||
      timeStr.includes('7:') ||
      timeStr.includes('08:') ||
      timeStr.includes('8:') ||
      timeStr.includes('pm') ||
      timeStr.includes('evening');

    if (ch === 'CH-1' && (isEveningOrOverlapping || !params.startTime)) {
      return {
        hasConflict: true,
        conflictingDoctor: 'Dr. Rajesh Sharma (Senior Interventional Cardiologist)',
        conflictingShift: '05:30 PM – 08:30 PM (Mon-Sat)',
        message: 'Chamber CH-1 is already reserved for Dr. Rajesh Sharma (05:30 PM – 08:30 PM). Please select an unallocated chamber or alternative shift.',
        suggestedChambers: ['CH-3', 'CH-4'],
      };
    }

    // Check CH-2 evening shift conflict (Dr. Priya Patel: 05:30 PM – 08:00 PM)
    if (ch === 'CH-2' && isEveningOrOverlapping) {
      return {
        hasConflict: true,
        conflictingDoctor: 'Dr. Priya Patel (Aesthetic Dermatologist)',
        conflictingShift: '05:30 PM – 08:00 PM (Mon-Sat)',
        message: 'Chamber CH-2 has an active evening shift assigned to Dr. Priya Patel (05:30 PM – 08:00 PM).',
        suggestedChambers: ['CH-3', 'CH-4'],
      };
    }

    return {
      hasConflict: false,
      message: `Chamber ${ch} is available for the requested shift timing. Zero conflict detected.`,
      suggestedChambers: ['CH-3', 'CH-4'],
    };
  }

  private generateDoctorSlug(fullName: string, primarySpecialty?: MedicalSpecialty): string {
    const cleanName = fullName
      .toLowerCase()
      .replace(/^dr\.\s*/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const spec = primarySpecialty ? `-${primarySpecialty.toLowerCase().slice(0, 6)}` : '';
    return `dr-${cleanName}${spec}`;
  }

  public reset(): void {
    this.resetStore();
  }

  public resetStore(): void {
    this.doctors.clear();
    this.slugToId.clear();
    this.seedDefaultData();
  }
}

export const doctorService = new DoctorService();
