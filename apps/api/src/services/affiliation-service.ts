/**
 * MediBooking Enterprise Clinic-Doctor Affiliation Service
 * Manages many-to-many polyclinic affiliations, chamber assignments,
 * differential venue-specific consultation fees, and follow-up validity.
 */

import crypto from 'crypto';
import { ClinicDoctorAffiliation } from '@medibooking/types';
import { SEED_DATA, BHOPAL_10_CLINICS } from '@medibooking/database';

export interface CreateAffiliationDTO {
  clinicId: string;
  doctorId: string;
  chamberId?: string;
  chamberNumber: string;
  consultationFeeRupees?: number;
  followUpFeeRupees?: number;
  followUpValidityDays?: number;
  isPrimaryClinic?: boolean;
}

export interface UpdateAffiliationDTO {
  chamberId?: string;
  chamberNumber?: string;
  consultationFeeRupees?: number;
  followUpFeeRupees?: number;
  followUpValidityDays?: number;
  isPrimaryClinic?: boolean;
  isActive?: boolean;
}

export class AffiliationService {
  // Key: `${clinicId}:${doctorId}`
  private affiliations = new Map<string, ClinicDoctorAffiliation>();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const now = new Date().toISOString();

    // 1. Seed legacy affiliations
    const defaultClinicId = SEED_DATA.clinic.id;
    for (const doc of SEED_DATA.doctors) {
      const chamber = SEED_DATA.chambers.find((c) => c.chamberNumber === doc.chamberNumber);
      const affiliation: ClinicDoctorAffiliation = {
        id: crypto.randomUUID(),
        clinicId: defaultClinicId,
        doctorId: doc.doctorId,
        chamberId: chamber?.id,
        chamberNumber: doc.chamberNumber,
        consultationFeeRupees: doc.consultationFee,
        followUpFeeRupees: doc.followUpFee,
        followUpValidityDays: 7,
        isPrimaryClinic: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      this.affiliations.set(`${defaultClinicId}:${doc.doctorId}`, affiliation);
    }

    // 2. Seed all affiliations across 10 Bhopal clinics
    for (const clinic of BHOPAL_10_CLINICS) {
      for (const doc of clinic.doctors) {
        const key = `${clinic.id}:${doc.doctorId}`;
        if (!this.affiliations.has(key)) {
          const matchingChamber = clinic.chambers.find((ch) => ch.chamberNumber === doc.chamberNumber);
          const affiliation: ClinicDoctorAffiliation = {
            id: crypto.randomUUID(),
            clinicId: clinic.id,
            doctorId: doc.doctorId,
            chamberId: matchingChamber?.id,
            chamberNumber: doc.chamberNumber,
            consultationFeeRupees: doc.consultationFee,
            followUpFeeRupees: doc.followUpFee,
            followUpValidityDays: 14,
            isPrimaryClinic: true,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          };
          this.affiliations.set(key, affiliation);
        }
      }
    }
  }

  /**
   * Affiliates a doctor to a clinic with specific chamber and fee structure.
   * Enforces UNIQUE(clinic_id, doctor_id) and non-negative fees.
   */
  async affiliateDoctor(dto: CreateAffiliationDTO): Promise<ClinicDoctorAffiliation> {
    const key = `${dto.clinicId}:${dto.doctorId}`;

    if (this.affiliations.has(key)) {
      const existing = this.affiliations.get(key)!;
      if (existing.isActive) {
        throw new Error(`Doctor is already affiliated with this clinic`);
      }
      // Re-activate previously inactive affiliation
      existing.isActive = true;
      existing.chamberId = dto.chamberId || existing.chamberId;
      existing.chamberNumber = dto.chamberNumber || existing.chamberNumber;
      if (dto.consultationFeeRupees !== undefined) existing.consultationFeeRupees = dto.consultationFeeRupees;
      if (dto.followUpFeeRupees !== undefined) existing.followUpFeeRupees = dto.followUpFeeRupees;
      if (dto.followUpValidityDays !== undefined) existing.followUpValidityDays = dto.followUpValidityDays;
      if (dto.isPrimaryClinic !== undefined) existing.isPrimaryClinic = dto.isPrimaryClinic;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }

    const consultationFee = dto.consultationFeeRupees !== undefined ? dto.consultationFeeRupees : 500;
    const followUpFee = dto.followUpFeeRupees !== undefined ? dto.followUpFeeRupees : 300;
    const followUpDays = dto.followUpValidityDays !== undefined ? dto.followUpValidityDays : 7;

    if (consultationFee < 0) {
      throw new Error(`Consultation fee must be non-negative`);
    }
    if (followUpFee < 0) {
      throw new Error(`Follow-up fee must be non-negative`);
    }
    if (followUpDays < 0) {
      throw new Error(`Follow-up validity days must be non-negative`);
    }

    // If marked as primary clinic, ensure doctor's other clinics are unset
    if (dto.isPrimaryClinic) {
      this.unsetOtherPrimaryClinics(dto.doctorId);
    }

    const affiliation: ClinicDoctorAffiliation = {
      id: crypto.randomUUID(),
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
      chamberId: dto.chamberId,
      chamberNumber: dto.chamberNumber,
      consultationFeeRupees: consultationFee,
      followUpFeeRupees: followUpFee,
      followUpValidityDays: followUpDays,
      isPrimaryClinic: dto.isPrimaryClinic || false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.affiliations.set(key, affiliation);
    return affiliation;
  }

  /**
   * Updates chamber assignment, differential fee matrix, or status
   */
  async updateAffiliation(
    clinicId: string,
    doctorId: string,
    dto: UpdateAffiliationDTO
  ): Promise<ClinicDoctorAffiliation> {
    const key = `${clinicId}:${doctorId}`;
    const affiliation = this.affiliations.get(key);

    if (!affiliation) {
      throw new Error(`Affiliation between clinic ${clinicId} and doctor ${doctorId} not found`);
    }

    if (dto.consultationFeeRupees !== undefined) {
      if (dto.consultationFeeRupees < 0) throw new Error(`Consultation fee must be non-negative`);
      affiliation.consultationFeeRupees = dto.consultationFeeRupees;
    }

    if (dto.followUpFeeRupees !== undefined) {
      if (dto.followUpFeeRupees < 0) throw new Error(`Follow-up fee must be non-negative`);
      affiliation.followUpFeeRupees = dto.followUpFeeRupees;
    }

    if (dto.followUpValidityDays !== undefined) {
      if (dto.followUpValidityDays < 0) throw new Error(`Follow-up validity days must be non-negative`);
      affiliation.followUpValidityDays = dto.followUpValidityDays;
    }

    if (dto.chamberId !== undefined) affiliation.chamberId = dto.chamberId;
    if (dto.chamberNumber !== undefined) affiliation.chamberNumber = dto.chamberNumber;
    if (dto.isActive !== undefined) affiliation.isActive = dto.isActive;

    if (dto.isPrimaryClinic !== undefined) {
      if (dto.isPrimaryClinic) {
        this.unsetOtherPrimaryClinics(doctorId);
      }
      affiliation.isPrimaryClinic = dto.isPrimaryClinic;
    }

    affiliation.updatedAt = new Date().toISOString();
    return affiliation;
  }

  /**
   * Retrieves all doctor affiliations for a specific clinic tenant
   */
  async getAffiliationsByClinic(clinicId: string, activeOnly = false): Promise<ClinicDoctorAffiliation[]> {
    const result: ClinicDoctorAffiliation[] = [];
    for (const aff of this.affiliations.values()) {
      if (aff.clinicId === clinicId) {
        if (!activeOnly || aff.isActive) {
          result.push(aff);
        }
      }
    }
    return result;
  }

  /**
   * Retrieves all clinic venues where a doctor practices
   */
  async getAffiliationsByDoctor(doctorId: string, activeOnly = true): Promise<ClinicDoctorAffiliation[]> {
    const result: ClinicDoctorAffiliation[] = [];
    for (const aff of this.affiliations.values()) {
      if (aff.doctorId === doctorId) {
        if (!activeOnly || aff.isActive) {
          result.push(aff);
        }
      }
    }
    return result;
  }

  /**
   * Retrieves a single affiliation record
   */
  async getAffiliation(clinicId: string, doctorId: string): Promise<ClinicDoctorAffiliation | null> {
    const key = `${clinicId}:${doctorId}`;
    return this.affiliations.get(key) || null;
  }

  /**
   * Deactivates an affiliation (doctor leaves clinic)
   */
  async deactivateAffiliation(clinicId: string, doctorId: string): Promise<ClinicDoctorAffiliation> {
    return this.updateAffiliation(clinicId, doctorId, { isActive: false });
  }

  /**
   * Hard removes an affiliation
   */
  async removeAffiliation(clinicId: string, doctorId: string): Promise<boolean> {
    const key = `${clinicId}:${doctorId}`;
    return this.affiliations.delete(key);
  }

  private unsetOtherPrimaryClinics(doctorId: string) {
    for (const aff of this.affiliations.values()) {
      if (aff.doctorId === doctorId && aff.isPrimaryClinic) {
        aff.isPrimaryClinic = false;
        aff.updatedAt = new Date().toISOString();
      }
    }
  }

  /**
   * Test helper to reset to clean seeded state
   */
  reset() {
    this.affiliations.clear();
    this.seedDefaultData();
  }
}

export const affiliationService = new AffiliationService();

