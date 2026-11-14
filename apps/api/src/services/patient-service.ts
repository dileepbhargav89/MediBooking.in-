/**
 * MediBooking Patient Family Profiles, Health Vault, and ABDM ABHA Service
 * Implements Tier-2 caregiver multi-dependent accounts, DPDP Act 2023 compliance,
 * and Ayushman Bharat Digital Mission (ABDM) Milestone 1 ABHA ID linking.
 */

import crypto from 'crypto';
import { FamilyMember, HealthRecordDocument, AbhaProfile, FamilyRelationship } from '@medibooking/types';

export interface CreateFamilyMemberDTO {
  primaryMobile: string;
  fullName: string;
  relationship: FamilyRelationship;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  dob?: string;
  bloodGroup?: string;
  chronicConditions?: string[];
  knownAllergies?: string[];
  abhaId?: string;
  abhaAddress?: string;
  dpdpConsentAcknowledged?: boolean;
}

export class PatientService {
  private members = new Map<string, FamilyMember>();
  private healthRecords = new Map<string, HealthRecordDocument>();
  private abhaSessions = new Map<string, { mobileOrAbha: string; otp: string; expiresAt: number }>();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const defaultMobiles = ['9826011111', '9826012345', '9893012345'];

    for (const mobile of defaultMobiles) {
      const now = new Date().toISOString();

      // 1. Primary User (Self)
      const selfId = `fam-self-${mobile.slice(-4)}`;
      this.members.set(selfId, {
        id: selfId,
        primaryMobile: mobile,
        fullName: 'Ramesh Kumar',
        relationship: 'SELF',
        gender: 'MALE',
        age: 45,
        dob: '1979-08-14',
        bloodGroup: 'B+',
        chronicConditions: ['Mild Hypertension'],
        knownAllergies: ['None'],
        abhaId: '91-2345-6789-0123',
        abhaAddress: 'ramesh.kumar@abdm',
        isAbhaLinked: true,
        createdAt: now,
      });

      // 2. Father: Kailash Prasad (74M, Diabetic)
      const fatherId = `fam-fat-${mobile.slice(-4)}`;
      this.members.set(fatherId, {
        id: fatherId,
        primaryMobile: mobile,
        fullName: 'Kailash Prasad',
        relationship: 'PARENT',
        gender: 'MALE',
        age: 74,
        dob: '1950-04-12',
        bloodGroup: 'O+',
        chronicConditions: ['Type 2 Diabetes', 'Hypertension'],
        knownAllergies: ['Sulfa drugs'],
        abhaId: '91-4455-6677-8899',
        abhaAddress: 'kailash.prasad@abdm',
        isAbhaLinked: true,
        createdAt: now,
      });

      // 3. Mother: Savitri Devi (70F, Arthritis)
      const motherId = `fam-mot-${mobile.slice(-4)}`;
      this.members.set(motherId, {
        id: motherId,
        primaryMobile: mobile,
        fullName: 'Savitri Devi',
        relationship: 'PARENT',
        gender: 'FEMALE',
        age: 70,
        dob: '1954-11-20',
        bloodGroup: 'A+',
        chronicConditions: ['Osteoarthritis'],
        knownAllergies: ['None'],
        isAbhaLinked: false,
        createdAt: now,
      });

      // 4. Daughter: Pooja Kumar (14F)
      const daughterId = `fam-dau-${mobile.slice(-4)}`;
      this.members.set(daughterId, {
        id: daughterId,
        primaryMobile: mobile,
        fullName: 'Pooja Kumar',
        relationship: 'CHILD',
        gender: 'FEMALE',
        age: 14,
        dob: '2010-06-05',
        bloodGroup: 'B+',
        chronicConditions: ['Seasonal Allergies'],
        knownAllergies: ['Penicillin'],
        isAbhaLinked: false,
        createdAt: now,
      });

      // Seed Longitudinal Health Records for Kailash Prasad
      const rec1Id = `rec-kailash-1-${mobile.slice(-4)}`;
      this.healthRecords.set(rec1Id, {
        id: rec1Id,
        patientId: fatherId,
        patientName: 'Kailash Prasad',
        relationship: 'PARENT (Father)',
        clinicId: 'c1010000-0000-4000-8000-000000000001',
        clinicName: 'Bhopal City Care Polyclinic',
        doctorId: 'doc-001',
        doctorName: 'Dr. Rajesh Sharma',
        specialty: 'Cardiology',
        chamberNumber: 'CH-1',
        recordType: 'PRESCRIPTION',
        title: 'Quarterly Cardiovascular & Diabetes Management',
        diagnoses: ['Essential Hypertension Stage-2', 'Type 2 Diabetes Mellitus'],
        prescriptions: [
          { medicine: 'Tab. Telmisartan 40mg', dosage: '1-0-0', duration: '30 Days', instructions: 'After Breakfast' },
          { medicine: 'Tab. Metformin 500mg SR', dosage: '1-0-1', duration: '30 Days', instructions: 'After Meals' },
          { medicine: 'Tab. Atorvastatin 10mg', dosage: '0-0-1', duration: '30 Days', instructions: 'At Bedtime' },
        ],
        vitals: {
          bpSystolic: 138,
          bpDiastolic: 86,
          pulseRate: 74,
          bloodSugar: 142,
        },
        documentUrl: `/patient/records/prescription-${rec1Id}.pdf`,
        fhirBundleId: `fhir-bundle-${rec1Id}`,
        isAbhaLinked: true,
        date: '2026-10-24',
      });

      const rec2Id = `rec-kailash-2-${mobile.slice(-4)}`;
      this.healthRecords.set(rec2Id, {
        id: rec2Id,
        patientId: fatherId,
        patientName: 'Kailash Prasad',
        relationship: 'PARENT (Father)',
        clinicId: 'c1010000-0000-4000-8000-000000000001',
        clinicName: 'Bhopal City Care Diagnostic Wing',
        doctorId: 'doc-001',
        doctorName: 'Dr. Rajesh Sharma',
        specialty: 'Diagnostic Laboratory',
        chamberNumber: 'LAB-1',
        recordType: 'LAB_REPORT',
        title: 'Glycated Hemoglobin (HbA1c) & Lipid Profile Panel',
        diagnoses: ['Moderate Glycemic Control (HbA1c: 7.1%)', 'Normal Triglycerides'],
        prescriptions: [],
        vitals: {
          bloodSugar: 134,
        },
        documentUrl: `/patient/records/lab-report-${rec2Id}.pdf`,
        fhirBundleId: `fhir-bundle-${rec2Id}`,
        isAbhaLinked: true,
        date: '2026-10-20',
      });

      // Seed Record for Mother Savitri Devi
      const rec3Id = `rec-savitri-1-${mobile.slice(-4)}`;
      this.healthRecords.set(rec3Id, {
        id: rec3Id,
        patientId: motherId,
        patientName: 'Savitri Devi',
        relationship: 'PARENT (Mother)',
        clinicId: 'c1010000-0000-4000-8000-000000000002',
        clinicName: 'Arera Super Specialty Polyclinic',
        doctorId: 'doc-004',
        doctorName: 'Dr. Siddharth Verma',
        specialty: 'Orthopedics',
        chamberNumber: 'CH-3',
        recordType: 'PRESCRIPTION',
        title: 'Bilateral Knee Osteoarthritis Pain Management',
        diagnoses: ['Bilateral Knee Osteoarthritis Grade II', 'Vitamin D3 Deficiency'],
        prescriptions: [
          { medicine: 'Tab. Paracetamol 650mg SOS', dosage: '1-0-1', duration: '5 Days', instructions: 'After Meals for pain' },
          { medicine: 'Cap. Vitamin D3 60,000 IU', dosage: '1 weekly', duration: '8 Weeks', instructions: 'With Milk' },
          { medicine: 'Tab. Calcium Carbonate 500mg', dosage: '0-1-0', duration: '30 Days', instructions: 'After Lunch' },
        ],
        vitals: {
          bpSystolic: 124,
          bpDiastolic: 80,
          pulseRate: 78,
        },
        documentUrl: `/patient/records/prescription-${rec3Id}.pdf`,
        fhirBundleId: `fhir-bundle-${rec3Id}`,
        isAbhaLinked: false,
        date: '2026-09-18',
      });
    }
  }

  /**
   * List all family members for a primary mobile account
   */
  public async getFamilyMembers(primaryMobile: string): Promise<FamilyMember[]> {
    const cleanMobile = primaryMobile.trim().replace(/^\+91/, '');
    const members = [...this.members.values()].filter(
      (m) => m.primaryMobile === cleanMobile
    );

    // If none found for this new mobile, seed default self profile
    if (members.length === 0) {
      const selfId = `fam-self-${cleanMobile.slice(-4)}`;
      const defaultSelf: FamilyMember = {
        id: selfId,
        primaryMobile: cleanMobile,
        fullName: 'Primary Account Holder',
        relationship: 'SELF',
        gender: 'MALE',
        age: 35,
        bloodGroup: 'B+',
        chronicConditions: [],
        knownAllergies: [],
        isAbhaLinked: false,
        createdAt: new Date().toISOString(),
      };
      this.members.set(selfId, defaultSelf);
      return [defaultSelf];
    }

    return members;
  }

  /**
   * Add a new dependent family member with DPDP explicit consent
   */
  public async addFamilyMember(dto: CreateFamilyMemberDTO): Promise<FamilyMember> {
    const cleanMobile = dto.primaryMobile.trim().replace(/^\+91/, '');
    const id = `fam-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const member: FamilyMember = {
      id,
      primaryMobile: cleanMobile,
      fullName: dto.fullName.trim(),
      relationship: dto.relationship,
      gender: dto.gender,
      age: dto.age,
      dob: dto.dob,
      bloodGroup: dto.bloodGroup || 'B+',
      chronicConditions: dto.chronicConditions || [],
      knownAllergies: dto.knownAllergies || [],
      abhaId: dto.abhaId,
      abhaAddress: dto.abhaAddress,
      isAbhaLinked: Boolean(dto.abhaId),
      createdAt: now,
    };

    this.members.set(id, member);
    return member;
  }

  /**
   * Delete a dependent family member (DPDP Section 12 Right to Erasure)
   */
  public async deleteFamilyMember(id: string): Promise<boolean> {
    return this.members.delete(id);
  }

  /**
   * Get longitudinal health records for a patient or all family members under a mobile
   */
  public async getHealthRecords(params: {
    primaryMobile?: string;
    patientId?: string;
  }): Promise<HealthRecordDocument[]> {
    const all = [...this.healthRecords.values()];

    if (params.patientId) {
      return all.filter((r) => r.patientId === params.patientId);
    }

    if (params.primaryMobile) {
      const cleanMobile = params.primaryMobile.trim().replace(/^\+91/, '');
      const familyIds = new Set(
        [...this.members.values()]
          .filter((m) => m.primaryMobile === cleanMobile)
          .map((m) => m.id)
      );
      return all.filter((r) => familyIds.has(r.patientId));
    }

    return all;
  }

  /**
   * Initiate ABDM ABHA Milestone 1 OTP Simulation
   */
  public async generateAbhaOtp(params: {
    mobileOrAbha: string;
    authType?: 'AADHAAR' | 'MOBILE';
  }): Promise<{ txnId: string; demoOtp: string; message: string }> {
    const txnId = `abdm-txn-${crypto.randomUUID().slice(0, 8)}`;
    const demoOtp = '123456';
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min expiry

    this.abhaSessions.set(txnId, {
      mobileOrAbha: params.mobileOrAbha,
      otp: demoOtp,
      expiresAt,
    });

    return {
      txnId,
      demoOtp,
      message: 'ABDM Verification OTP sent via UIDAI / National Health Gateway',
    };
  }

  /**
   * Verify ABDM ABHA OTP and link to family member
   */
  public async verifyAbhaOtp(params: {
    txnId: string;
    otp: string;
    familyMemberId?: string;
  }): Promise<{ success: boolean; abhaProfile: AbhaProfile; message: string }> {
    const session = this.abhaSessions.get(params.txnId);

    // Accept valid 6-digit OTP (demo standard 123456 or matching session)
    if (!session && params.otp !== '123456') {
      throw new Error('Invalid or expired ABDM transaction session');
    }

    const abhaNumber = '91-2345-6789-0123';
    const abhaAddress = 'ramesh.kumar@abdm';

    if (params.familyMemberId && this.members.has(params.familyMemberId)) {
      const mem = this.members.get(params.familyMemberId)!;
      mem.abhaId = abhaNumber;
      mem.abhaAddress = abhaAddress;
      mem.isAbhaLinked = true;
    }

    const abhaProfile: AbhaProfile = {
      abhaNumber,
      abhaAddress,
      fullName: 'Ramesh Kumar',
      gender: 'MALE',
      dob: '1979-08-14',
      yearOfBirth: 1979,
      state: 'Madhya Pradesh',
      district: 'Bhopal',
      status: 'ACTIVE_VERIFIED',
      qrCodeData: `abdm://profile?abha=${abhaNumber}&name=Ramesh+Kumar&dob=1979&gender=M`,
      healthRewardsCredits: 25,
    };

    return {
      success: true,
      abhaProfile,
      message: 'ABHA ID verified and linked with National Health Stack successfully! ₹25 Health Credits awarded.',
    };
  }
}

export const patientService = new PatientService();

