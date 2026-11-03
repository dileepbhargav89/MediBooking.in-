/**
 * MediBooking.in - 10-Clinic Bhopal Pilot Dataset & Deployment Migration Script
 * Document ID: MB-SPEC-14 (Stage V, Phase 47)
 * 
 * Provisions 10 high-volume polyclinics across Bhopal, Madhya Pradesh:
 * 1. MP Nagar Zone-II (CityCare Polyclinic)
 * 2. Arera Colony E-3 (Narmada Health & Polyclinic)
 * 3. Kolar Road / Sarvadharam (Kolar Prime MediChambers)
 * 4. TT Nagar / Platinum Plaza (Bhopal Care Polyclinic & Daycare)
 * 5. New Market / Malviya Nagar (New Market Doctors Plaza)
 * 6. Hoshangabad Road / Misrod (Hoshangabad Road Medical Enclave)
 * 7. Shahpura Sector B (Shahpura Lakeshore Polyclinic)
 * 8. Ayodhya Bypass / Minal Residency (Ayodhya Bypass Health Hub)
 * 9. Indrapuri Sector C / BHEL (Indrapuri Multi-Specialty Chambers)
 * 10. Bairagarh / Sant Hirdaram Nagar (Bairagarh Medical Center)
 */

import {
  UserRole,
  StaffScope,
  MedicalSpecialty,
  SessionType,
  DayOfWeek,
} from '@medibooking/types';

export interface PilotDoctorAffiliation {
  userId: string;
  doctorId: string;
  fullName: string;
  mobile: string;
  email: string;
  slug: string;
  registrationNumber: string;
  stateMedicalCouncil: string;
  specialties: MedicalSpecialty[];
  qualifications: string[];
  experienceYears: number;
  bio: string;
  chamberNumber: string;
  consultationFee: number;
  followUpFee: number;
  sessions: Array<{
    dayOfWeek: DayOfWeek;
    sessionType: SessionType;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    maxTokens: number;
  }>;
}

export interface PilotChamber {
  id: string;
  chamberNumber: string;
  chamberName: string;
  floor: string;
}

export interface PilotStaff {
  userId: string;
  fullName: string;
  mobile: string;
  email: string;
  role: UserRole;
  staffScope: StaffScope;
  dedicatedDoctorId?: string;
}

export interface PilotClinic {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  addressLine: string;
  locality: string;
  city: 'Bhopal';
  state: 'Madhya Pradesh';
  pincode: string;
  contactPhone: string;
  contactEmail: string;
  isActive: boolean;
  tier: 'MULTI_CHAMBER_POLYCLINIC';
  chambers: PilotChamber[];
  doctors: PilotDoctorAffiliation[];
  staff: PilotStaff[];
}

export const BHOPAL_10_CLINICS: PilotClinic[] = [
  // 1. MP Nagar Zone-II
  {
    id: 'c1010000-0000-4000-8000-000000000001',
    name: 'CityCare Polyclinic & Diagnostic Centre',
    slug: 'citycare-mpnagar-bhopal',
    tagline: 'Multi-Specialty Evening Consultation Chambers',
    addressLine: 'Plot 42, Above Apollo Pharmacy, Near Sargam Cinema, MP Nagar Zone-II',
    locality: 'MP Nagar Zone-II',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462011',
    contactPhone: '07552554433',
    contactEmail: 'contact@citycarebhopal.in',
    isActive: true,
    tier: 'MULTI_CHAMBER_POLYCLINIC',
    chambers: [
      { id: 'ch01-001', chamberNumber: 'CH-1', chamberName: 'Cardiology Suite', floor: '1st Floor, Room 101' },
      { id: 'ch01-002', chamberNumber: 'CH-2', chamberName: 'Dermatology & Cosmetology', floor: '1st Floor, Room 102' },
      { id: 'ch01-003', chamberNumber: 'CH-3', chamberName: 'Orthopedics & Joint Clinic', floor: '1st Floor, Room 103' },
      { id: 'ch01-004', chamberNumber: 'CH-4', chamberName: 'Pediatric Care & Vaccination', floor: '1st Floor, Room 104' },
    ],
    doctors: [
      {
        userId: 'u-doc-01-01',
        doctorId: 'd3010000-0000-4000-8000-000000000001',
        fullName: 'Dr. Rajesh Sharma',
        mobile: '9826122222',
        email: 'dr.rajesh.sharma@medibooking.in',
        slug: 'dr-rajesh-sharma-cardio',
        registrationNumber: 'MPMC-48291',
        stateMedicalCouncil: 'Madhya Pradesh Medical Council',
        specialties: [MedicalSpecialty.CARDIOLOGY, MedicalSpecialty.GENERAL_MEDICINE],
        qualifications: ['MBBS (GMC Bhopal)', 'MD (Medicine)', 'DM (Cardiology, AIIMS Delhi)'],
        experienceYears: 16,
        bio: 'Senior Consultant Interventional Cardiologist. Former Assistant Professor, AIIMS Bhopal.',
        chamberNumber: 'CH-1',
        consultationFee: 700,
        followUpFee: 400,
        sessions: [
          { dayOfWeek: DayOfWeek.MONDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '20:30', slotDurationMinutes: 15, maxTokens: 14 },
          { dayOfWeek: DayOfWeek.WEDNESDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '20:30', slotDurationMinutes: 15, maxTokens: 14 },
          { dayOfWeek: DayOfWeek.FRIDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '20:30', slotDurationMinutes: 15, maxTokens: 14 },
        ],
      },
      {
        userId: 'u-doc-01-02',
        doctorId: 'd3010000-0000-4000-8000-000000000002',
        fullName: 'Dr. Priya Patel',
        mobile: '9826133333',
        email: 'dr.priya.patel@medibooking.in',
        slug: 'dr-priya-patel-derma',
        registrationNumber: 'MPMC-51042',
        stateMedicalCouncil: 'Madhya Pradesh Medical Council',
        specialties: [MedicalSpecialty.DERMATOLOGY],
        qualifications: ['MBBS', 'MD (Dermatology, Venereology & Leprosy)'],
        experienceYears: 11,
        bio: 'Aesthetic Dermatologist and Trichologist.',
        chamberNumber: 'CH-2',
        consultationFee: 600,
        followUpFee: 300,
        sessions: [
          { dayOfWeek: DayOfWeek.MONDAY, sessionType: SessionType.EVENING, startTime: '17:30', endTime: '20:00', slotDurationMinutes: 15, maxTokens: 12 },
          { dayOfWeek: DayOfWeek.THURSDAY, sessionType: SessionType.EVENING, startTime: '17:30', endTime: '20:00', slotDurationMinutes: 15, maxTokens: 12 },
        ],
      },
    ],
    staff: [
      { userId: 'u-stf-01-01', fullName: 'Virendra Singh (Chief Receptionist)', mobile: '9826033333', email: 'reception@citycare.in', role: UserRole.RECEPTIONIST, staffScope: StaffScope.CLINIC_WIDE },
      { userId: 'u-stf-01-02', fullName: 'Ramesh Lodhi (Chamber 1 Compounder)', mobile: '9826044444', email: 'compounder1@citycare.in', role: UserRole.COMPOUNDER, staffScope: StaffScope.DOCTOR_DEDICATED, dedicatedDoctorId: 'd3010000-0000-4000-8000-000000000001' },
    ],
  },

  // 2. Arera Colony E-3
  {
    id: 'c1010000-0000-4000-8000-000000000002',
    name: 'Narmada Health & Specialty Polyclinic',
    slug: 'narmada-health-arera-bhopal',
    tagline: 'Premium Multi-Specialty Consultation & Diagnostics',
    addressLine: 'E-3/12, Near 10 No. Market Bus Stop, Arera Colony',
    locality: 'Arera Colony E-3',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462016',
    contactPhone: '07552467788',
    contactEmail: 'info@narmadahealthbhopal.in',
    isActive: true,
    tier: 'MULTI_CHAMBER_POLYCLINIC',
    chambers: [
      { id: 'ch02-001', chamberNumber: 'CH-1', chamberName: 'Neurology Consultation', floor: 'Ground Floor, Room 1' },
      { id: 'ch02-002', chamberNumber: 'CH-2', chamberName: 'Endocrinology & Diabetes Clinic', floor: 'Ground Floor, Room 2' },
      { id: 'ch02-003', chamberNumber: 'CH-3', chamberName: 'Eye & Retina Care', floor: '1st Floor, Room 3' },
      { id: 'ch02-004', chamberNumber: 'CH-4', chamberName: 'Women & Child Wellness', floor: '1st Floor, Room 4' },
    ],
    doctors: [
      {
        userId: 'u-doc-02-01',
        doctorId: 'd3010000-0000-4000-8000-000000000003',
        fullName: 'Dr. Alok Verma',
        mobile: '9826144444',
        email: 'dr.alok.verma@medibooking.in',
        slug: 'dr-alok-verma-neuro',
        registrationNumber: 'MPMC-39182',
        stateMedicalCouncil: 'Madhya Pradesh Medical Council',
        specialties: [MedicalSpecialty.NEUROLOGY],
        qualifications: ['MBBS', 'MD (Medicine)', 'DM (Neurology, PGIMER Chandigarh)'],
        experienceYears: 18,
        bio: 'Senior Neurologist specializing in stroke recovery, epilepsy, and headache management.',
        chamberNumber: 'CH-1',
        consultationFee: 800,
        followUpFee: 500,
        sessions: [
          { dayOfWeek: DayOfWeek.TUESDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '21:00', slotDurationMinutes: 15, maxTokens: 16 },
          { dayOfWeek: DayOfWeek.THURSDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '21:00', slotDurationMinutes: 15, maxTokens: 16 },
        ],
      },
    ],
    staff: [
      { userId: 'u-stf-02-01', fullName: 'Pooja Tiwari', mobile: '9826055555', email: 'pooja@narmadahealth.in', role: UserRole.RECEPTIONIST, staffScope: StaffScope.CLINIC_WIDE },
    ],
  },

  // 3. Kolar Road / Sarvadharam
  {
    id: 'c1010000-0000-4000-8000-000000000003',
    name: 'Kolar Prime MediChambers',
    slug: 'kolar-prime-sarvadharam-bhopal',
    tagline: 'Neighborhood Family Healthcare & Specialists',
    addressLine: 'A-14, Sarvadharam C-Sector, Main Kolar Road, Opp D-Mart',
    locality: 'Kolar Road',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462042',
    contactPhone: '07552498811',
    contactEmail: 'contact@kolarprime.in',
    isActive: true,
    tier: 'MULTI_CHAMBER_POLYCLINIC',
    chambers: [
      { id: 'ch03-001', chamberNumber: 'CH-1', chamberName: 'Internal Medicine Suite', floor: 'Ground Floor' },
      { id: 'ch03-002', chamberNumber: 'CH-2', chamberName: 'Pediatric Wing', floor: 'Ground Floor' },
      { id: 'ch03-003', chamberNumber: 'CH-3', chamberName: 'ENT Specialist Chamber', floor: '1st Floor' },
      { id: 'ch03-004', chamberNumber: 'CH-4', chamberName: 'Advanced Dental Care', floor: '1st Floor' },
    ],
    doctors: [
      {
        userId: 'u-doc-03-01',
        doctorId: 'd3010000-0000-4000-8000-000000000004',
        fullName: 'Dr. Vivek Saxena',
        mobile: '9826155555',
        email: 'dr.vivek.saxena@medibooking.in',
        slug: 'dr-vivek-saxena-genmed',
        registrationNumber: 'MPMC-42109',
        stateMedicalCouncil: 'Madhya Pradesh Medical Council',
        specialties: [MedicalSpecialty.GENERAL_MEDICINE],
        qualifications: ['MBBS', 'MD (General Medicine, GMC Bhopal)'],
        experienceYears: 14,
        bio: 'Consultant Physician managing lifestyle diseases, hypertension, and infectious diseases.',
        chamberNumber: 'CH-1',
        consultationFee: 500,
        followUpFee: 300,
        sessions: [
          { dayOfWeek: DayOfWeek.MONDAY, sessionType: SessionType.EVENING, startTime: '18:30', endTime: '21:00', slotDurationMinutes: 15, maxTokens: 15 },
          { dayOfWeek: DayOfWeek.WEDNESDAY, sessionType: SessionType.EVENING, startTime: '18:30', endTime: '21:00', slotDurationMinutes: 15, maxTokens: 15 },
          { dayOfWeek: DayOfWeek.SATURDAY, sessionType: SessionType.EVENING, startTime: '18:30', endTime: '21:00', slotDurationMinutes: 15, maxTokens: 15 },
        ],
      },
    ],
    staff: [
      { userId: 'u-stf-03-01', fullName: 'Deepak Malviya', mobile: '9826066666', email: 'deepak@kolarprime.in', role: UserRole.RECEPTIONIST, staffScope: StaffScope.CLINIC_WIDE },
    ],
  },

  // 4. TT Nagar / Platinum Plaza
  {
    id: 'c1010000-0000-4000-8000-000000000004',
    name: 'Bhopal Care Polyclinic & Daycare',
    slug: 'bhopal-care-ttnagar-bhopal',
    tagline: 'Gastroenterology, Pulmonology & Advanced Daycare',
    addressLine: 'Unit 204, 2nd Floor, Platinum Plaza, Mata Mandir Square, TT Nagar',
    locality: 'TT Nagar',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462003',
    contactPhone: '07552771122',
    contactEmail: 'admin@bhopalcare.in',
    isActive: true,
    tier: 'MULTI_CHAMBER_POLYCLINIC',
    chambers: [
      { id: 'ch04-001', chamberNumber: 'CH-1', chamberName: 'Gastroenterology Chamber', floor: 'Room 201' },
      { id: 'ch04-002', chamberNumber: 'CH-2', chamberName: 'Chest & Allergy Care', floor: 'Room 202' },
      { id: 'ch04-003', chamberNumber: 'CH-3', chamberName: 'General & Laparoscopic Surgery', floor: 'Room 203' },
      { id: 'ch04-004', chamberNumber: 'CH-4', chamberName: 'Dietetics & Patient Counseling', floor: 'Room 204' },
    ],
    doctors: [
      {
        userId: 'u-doc-04-01',
        doctorId: 'd3010000-0000-4000-8000-000000000005',
        fullName: 'Dr. Manish Dubey',
        mobile: '9826166666',
        email: 'dr.manish.dubey@medibooking.in',
        slug: 'dr-manish-dubey-gastro',
        registrationNumber: 'MPMC-47120',
        stateMedicalCouncil: 'Madhya Pradesh Medical Council',
        specialties: [MedicalSpecialty.GASTROENTEROLOGY],
        qualifications: ['MBBS', 'MD', 'DNB (Gastroenterology)'],
        experienceYears: 13,
        bio: 'Senior Consultant Gastroenterologist and Hepatologist.',
        chamberNumber: 'CH-1',
        consultationFee: 750,
        followUpFee: 400,
        sessions: [
          { dayOfWeek: DayOfWeek.MONDAY, sessionType: SessionType.EVENING, startTime: '17:00', endTime: '19:30', slotDurationMinutes: 15, maxTokens: 12 },
          { dayOfWeek: DayOfWeek.FRIDAY, sessionType: SessionType.EVENING, startTime: '17:00', endTime: '19:30', slotDurationMinutes: 15, maxTokens: 12 },
        ],
      },
    ],
    staff: [
      { userId: 'u-stf-04-01', fullName: 'Shailendra Sen', mobile: '9826077777', email: 'shailendra@bhopalcare.in', role: UserRole.RECEPTIONIST, staffScope: StaffScope.CLINIC_WIDE },
    ],
  },

  // 5. New Market / Malviya Nagar
  {
    id: 'c1010000-0000-4000-8000-000000000005',
    name: 'New Market Doctors Plaza',
    slug: 'new-market-doctors-plaza-bhopal',
    tagline: 'Central Bhopal Multi-Disciplinary Doctor Chambers',
    addressLine: 'Shop 18-20, 1st Floor, Topkhana Market, Opp GTB Complex, New Market',
    locality: 'New Market',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462003',
    contactPhone: '07552558899',
    contactEmail: 'contact@newmarketdoctors.in',
    isActive: true,
    tier: 'MULTI_CHAMBER_POLYCLINIC',
    chambers: [
      { id: 'ch05-001', chamberNumber: 'CH-1', chamberName: 'Skin & Laser Suite', floor: '1st Floor' },
      { id: 'ch05-002', chamberNumber: 'CH-2', chamberName: 'Mind Wellness & Psychiatry', floor: '1st Floor' },
      { id: 'ch05-003', chamberNumber: 'CH-3', chamberName: 'Holistic Homeopathy', floor: '1st Floor' },
      { id: 'ch05-004', chamberNumber: 'CH-4', chamberName: 'Smile Design Dental', floor: '1st Floor' },
    ],
    doctors: [
      {
        userId: 'u-doc-05-01',
        doctorId: 'd3010000-0000-4000-8000-000000000006',
        fullName: 'Dr. Neha Agrawal',
        mobile: '9826177777',
        email: 'dr.neha.agrawal@medibooking.in',
        slug: 'dr-neha-agrawal-psychiatry',
        registrationNumber: 'MPMC-53102',
        stateMedicalCouncil: 'Madhya Pradesh Medical Council',
        specialties: [MedicalSpecialty.PSYCHIATRY],
        qualifications: ['MBBS', 'MD (Psychiatry, AIIMS Bhopal)'],
        experienceYears: 9,
        bio: 'Consultant Psychiatrist and Behavioral Therapist.',
        chamberNumber: 'CH-2',
        consultationFee: 700,
        followUpFee: 500,
        sessions: [
          { dayOfWeek: DayOfWeek.TUESDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '20:30', slotDurationMinutes: 20, maxTokens: 10 },
          { dayOfWeek: DayOfWeek.SATURDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '20:30', slotDurationMinutes: 20, maxTokens: 10 },
        ],
      },
    ],
    staff: [
      { userId: 'u-stf-05-01', fullName: 'Anil Yadav', mobile: '9826088888', email: 'anil@newmarketdoctors.in', role: UserRole.RECEPTIONIST, staffScope: StaffScope.CLINIC_WIDE },
    ],
  },

  // 6. Hoshangabad Road / Misrod
  {
    id: 'c1010000-0000-4000-8000-000000000006',
    name: 'Hoshangabad Road Medical Enclave',
    slug: 'hoshangabad-road-enclave-bhopal',
    tagline: 'Orthopedics, Nephrology & Dialysis Support',
    addressLine: 'Near C21 Mall, Main Hoshangabad Road, Misrod',
    locality: 'Hoshangabad Road',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462047',
    contactPhone: '07554902233',
    contactEmail: 'reception@hoshangabadmed.in',
    isActive: true,
    tier: 'MULTI_CHAMBER_POLYCLINIC',
    chambers: [
      { id: 'ch06-001', chamberNumber: 'CH-1', chamberName: 'Joint Replacement & Spine Clinic', floor: 'Suite A' },
      { id: 'ch06-002', chamberNumber: 'CH-2', chamberName: 'Nephrology & Kidney Care', floor: 'Suite B' },
      { id: 'ch06-003', chamberNumber: 'CH-3', chamberName: 'Urology Consultation', floor: 'Suite C' },
      { id: 'ch06-004', chamberNumber: 'CH-4', chamberName: 'Physiotherapy & Rehab', floor: 'Suite D' },
    ],
    doctors: [
      {
        userId: 'u-doc-06-01',
        doctorId: 'd3010000-0000-4000-8000-000000000007',
        fullName: 'Dr. Sandeep Kothari',
        mobile: '9826188888',
        email: 'dr.sandeep.kothari@medibooking.in',
        slug: 'dr-sandeep-kothari-ortho',
        registrationNumber: 'MPMC-38019',
        stateMedicalCouncil: 'Madhya Pradesh Medical Council',
        specialties: [MedicalSpecialty.ORTHOPEDICS],
        qualifications: ['MBBS', 'MS (Ortho)', 'Fellowship in Arthroplasty (Germany)'],
        experienceYears: 20,
        bio: 'Senior Joint Replacement Surgeon specializing in knee and hip arthroplasty.',
        chamberNumber: 'CH-1',
        consultationFee: 750,
        followUpFee: 400,
        sessions: [
          { dayOfWeek: DayOfWeek.MONDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '20:30', slotDurationMinutes: 15, maxTokens: 14 },
          { dayOfWeek: DayOfWeek.THURSDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '20:30', slotDurationMinutes: 15, maxTokens: 14 },
        ],
      },
    ],
    staff: [
      { userId: 'u-stf-06-01', fullName: 'Rajendra Solanki', mobile: '9826099999', email: 'rajendra@hoshangabadmed.in', role: UserRole.RECEPTIONIST, staffScope: StaffScope.CLINIC_WIDE },
    ],
  },

  // 7. Shahpura Sector B
  {
    id: 'c1010000-0000-4000-8000-000000000007',
    name: 'Shahpura Lakeshore Polyclinic',
    slug: 'shahpura-lakeshore-bhopal',
    tagline: 'Comprehensive Family Care & Oncology Screening',
    addressLine: 'B-28, Near Manisha Market Circle, Shahpura Sector B',
    locality: 'Shahpura',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462039',
    contactPhone: '07552423344',
    contactEmail: 'contact@shahpuralakeshore.in',
    isActive: true,
    tier: 'MULTI_CHAMBER_POLYCLINIC',
    chambers: [
      { id: 'ch07-001', chamberNumber: 'CH-1', chamberName: 'Internal Medicine Suite', floor: 'Ground Floor' },
      { id: 'ch07-002', chamberNumber: 'CH-2', chamberName: 'Oncology Consultation', floor: '1st Floor' },
      { id: 'ch07-003', chamberNumber: 'CH-3', chamberName: 'Dietetics & Nutrition', floor: '1st Floor' },
      { id: 'ch07-004', chamberNumber: 'CH-4', chamberName: 'Sample Collection Lounge', floor: 'Ground Floor' },
    ],
    doctors: [
      {
        userId: 'u-doc-07-01',
        doctorId: 'd3010000-0000-4000-8000-000000000008',
        fullName: 'Dr. Kavita Deshmukh',
        mobile: '9826199999',
        email: 'dr.kavita.deshmukh@medibooking.in',
        slug: 'dr-kavita-deshmukh-genmed',
        registrationNumber: 'MPMC-44981',
        stateMedicalCouncil: 'Madhya Pradesh Medical Council',
        specialties: [MedicalSpecialty.GENERAL_MEDICINE],
        qualifications: ['MBBS', 'MD (Medicine, GMC Bhopal)'],
        experienceYears: 15,
        bio: 'Senior Consultant Physician with special focus on elderly chronic disease management.',
        chamberNumber: 'CH-1',
        consultationFee: 600,
        followUpFee: 350,
        sessions: [
          { dayOfWeek: DayOfWeek.MONDAY, sessionType: SessionType.EVENING, startTime: '17:30', endTime: '20:00', slotDurationMinutes: 15, maxTokens: 12 },
          { dayOfWeek: DayOfWeek.WEDNESDAY, sessionType: SessionType.EVENING, startTime: '17:30', endTime: '20:00', slotDurationMinutes: 15, maxTokens: 12 },
          { dayOfWeek: DayOfWeek.FRIDAY, sessionType: SessionType.EVENING, startTime: '17:30', endTime: '20:00', slotDurationMinutes: 15, maxTokens: 12 },
        ],
      },
    ],
    staff: [
      { userId: 'u-stf-07-01', fullName: 'Rashmi Bundela', mobile: '9826012345', email: 'rashmi@shahpuralakeshore.in', role: UserRole.RECEPTIONIST, staffScope: StaffScope.CLINIC_WIDE },
    ],
  },

  // 8. Ayodhya Bypass / Minal Residency
  {
    id: 'c1010000-0000-4000-8000-000000000008',
    name: 'Ayodhya Bypass Health Hub',
    slug: 'ayodhya-bypass-health-hub-bhopal',
    tagline: 'Pediatrics, Women Care & General Health',
    addressLine: 'Shop 5-8, Minal Shopping Mall, Ayodhya Bypass Road',
    locality: 'Ayodhya Bypass',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462023',
    contactPhone: '07552684455',
    contactEmail: 'minal@ayodhyalhealth.in',
    isActive: true,
    tier: 'MULTI_CHAMBER_POLYCLINIC',
    chambers: [
      { id: 'ch08-001', chamberNumber: 'CH-1', chamberName: 'Pediatric Clinic', floor: 'Room 1' },
      { id: 'ch08-002', chamberNumber: 'CH-2', chamberName: 'Gynecology & Antenatal Suite', floor: 'Room 2' },
      { id: 'ch08-003', chamberNumber: 'CH-3', chamberName: 'Family Medicine', floor: 'Room 3' },
      { id: 'ch08-004', chamberNumber: 'CH-4', chamberName: 'Pathology & Vaccinations', floor: 'Room 4' },
    ],
    doctors: [
      {
        userId: 'u-doc-08-01',
        doctorId: 'd3010000-0000-4000-8000-000000000009',
        fullName: 'Dr. Rohit Chouhan',
        mobile: '9826112345',
        email: 'dr.rohit.chouhan@medibooking.in',
        slug: 'dr-rohit-chouhan-pedia',
        registrationNumber: 'MPMC-50119',
        stateMedicalCouncil: 'Madhya Pradesh Medical Council',
        specialties: [MedicalSpecialty.PEDIATRICS],
        qualifications: ['MBBS', 'MD (Pediatrics, Gandhi Medical College)'],
        experienceYears: 10,
        bio: 'Pediatrician and Neonatologist with expertise in child immunization and developmental milestones.',
        chamberNumber: 'CH-1',
        consultationFee: 500,
        followUpFee: 250,
        sessions: [
          { dayOfWeek: DayOfWeek.MONDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '20:30', slotDurationMinutes: 15, maxTokens: 14 },
          { dayOfWeek: DayOfWeek.TUESDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '20:30', slotDurationMinutes: 15, maxTokens: 14 },
          { dayOfWeek: DayOfWeek.THURSDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '20:30', slotDurationMinutes: 15, maxTokens: 14 },
        ],
      },
    ],
    staff: [
      { userId: 'u-stf-08-01', fullName: 'Gaurav Rathore', mobile: '9826023456', email: 'gaurav@ayodhyahealth.in', role: UserRole.RECEPTIONIST, staffScope: StaffScope.CLINIC_WIDE },
    ],
  },

  // 9. Indrapuri Sector C / BHEL
  {
    id: 'c1010000-0000-4000-8000-000000000009',
    name: 'Indrapuri Multi-Specialty Chambers',
    slug: 'indrapuri-multispecialty-bhopal',
    tagline: 'Expert Doctors Serving BHEL & Eastern Bhopal',
    addressLine: 'Plot 71, Sector C, Near Kalpana Nagar Gate, Indrapuri',
    locality: 'Indrapuri',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462021',
    contactPhone: '07552756677',
    contactEmail: 'contact@indrapurimed.in',
    isActive: true,
    tier: 'MULTI_CHAMBER_POLYCLINIC',
    chambers: [
      { id: 'ch09-001', chamberNumber: 'CH-1', chamberName: 'Cardiology & ECG Suite', floor: 'Room 1' },
      { id: 'ch09-002', chamberNumber: 'CH-2', chamberName: 'Diabetology & Endocrinology', floor: 'Room 2' },
      { id: 'ch09-003', chamberNumber: 'CH-3', chamberName: 'Orthopedic Consultation', floor: 'Room 3' },
      { id: 'ch09-004', chamberNumber: 'CH-4', chamberName: 'General Consultation', floor: 'Room 4' },
    ],
    doctors: [
      {
        userId: 'u-doc-09-01',
        doctorId: 'd3010000-0000-4000-8000-000000000010',
        fullName: 'Dr. Tarun Nema',
        mobile: '9826123456',
        email: 'dr.tarun.nema@medibooking.in',
        slug: 'dr-tarun-nema-diabeto',
        registrationNumber: 'MPMC-41289',
        stateMedicalCouncil: 'Madhya Pradesh Medical Council',
        specialties: [MedicalSpecialty.GENERAL_MEDICINE],
        qualifications: ['MBBS', 'MD (Medicine)', 'Fellowship in Diabetology (RSSDI)'],
        experienceYears: 17,
        bio: 'Senior Consultant Diabetologist focusing on diabetic foot prevention and glycemic control.',
        chamberNumber: 'CH-2',
        consultationFee: 650,
        followUpFee: 350,
        sessions: [
          { dayOfWeek: DayOfWeek.TUESDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '20:30', slotDurationMinutes: 15, maxTokens: 14 },
          { dayOfWeek: DayOfWeek.FRIDAY, sessionType: SessionType.EVENING, startTime: '18:00', endTime: '20:30', slotDurationMinutes: 15, maxTokens: 14 },
        ],
      },
    ],
    staff: [
      { userId: 'u-stf-09-01', fullName: 'Santosh Meena', mobile: '9826034567', email: 'santosh@indrapurimed.in', role: UserRole.RECEPTIONIST, staffScope: StaffScope.CLINIC_WIDE },
    ],
  },

  // 10. Bairagarh / Sant Hirdaram Nagar
  {
    id: 'c1010000-0000-4000-8000-000000000010',
    name: 'Bairagarh Medical Center',
    slug: 'bairagarh-medical-center-bhopal',
    tagline: 'Multi-Chamber Clinic Serving Sant Hirdaram Nagar',
    addressLine: 'Main Road, Near Chanchal Chauraha, Sant Hirdaram Nagar, Bairagarh',
    locality: 'Bairagarh',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462030',
    contactPhone: '07552643322',
    contactEmail: 'info@bairagarhmed.in',
    isActive: true,
    tier: 'MULTI_CHAMBER_POLYCLINIC',
    chambers: [
      { id: 'ch10-001', chamberNumber: 'CH-1', chamberName: 'Physician Suite', floor: 'Ground Floor' },
      { id: 'ch10-002', chamberNumber: 'CH-2', chamberName: 'Ophthalmology Clinic', floor: '1st Floor' },
      { id: 'ch10-003', chamberNumber: 'CH-3', chamberName: 'Pediatric Care', floor: '1st Floor' },
      { id: 'ch10-004', chamberNumber: 'CH-4', chamberName: 'Dental Care', floor: 'Ground Floor' },
    ],
    doctors: [
      {
        userId: 'u-doc-10-01',
        doctorId: 'd3010000-0000-4000-8000-000000000011',
        fullName: 'Dr. Sunil Lalwani',
        mobile: '9826134567',
        email: 'dr.sunil.lalwani@medibooking.in',
        slug: 'dr-sunil-lalwani-eye',
        registrationNumber: 'MPMC-46102',
        stateMedicalCouncil: 'Madhya Pradesh Medical Council',
        specialties: [MedicalSpecialty.OPHTHALMOLOGY],
        qualifications: ['MBBS', 'MS (Ophthalmology, GMC Bhopal)'],
        experienceYears: 16,
        bio: 'Senior Eye Surgeon specializing in Phaco cataract surgery and refractive corrections.',
        chamberNumber: 'CH-2',
        consultationFee: 500,
        followUpFee: 300,
        sessions: [
          { dayOfWeek: DayOfWeek.MONDAY, sessionType: SessionType.EVENING, startTime: '17:00', endTime: '19:30', slotDurationMinutes: 15, maxTokens: 14 },
          { dayOfWeek: DayOfWeek.WEDNESDAY, sessionType: SessionType.EVENING, startTime: '17:00', endTime: '19:30', slotDurationMinutes: 15, maxTokens: 14 },
          { dayOfWeek: DayOfWeek.SATURDAY, sessionType: SessionType.EVENING, startTime: '17:00', endTime: '19:30', slotDurationMinutes: 15, maxTokens: 14 },
        ],
      },
    ],
    staff: [
      { userId: 'u-stf-10-01', fullName: 'Manish Harjani', mobile: '9826045678', email: 'manish@bairagarhmed.in', role: UserRole.RECEPTIONIST, staffScope: StaffScope.CLINIC_WIDE },
    ],
  },
];

export interface MigrationReport {
  success: boolean;
  totalClinics: number;
  totalChambers: number;
  totalDoctors: number;
  totalSessions: number;
  totalStaff: number;
  durationMs: number;
  timestamp: string;
}

/**
 * Validates integrity of Bhopal 10-Clinic Pilot dataset and prepares SQL migration payloads
 */
export async function migrateBhopalPilotDataset(dbClient?: any): Promise<MigrationReport> {
  const startTime = performance.now();

  const clinicSlugs = new Set<string>();
  const doctorSlugs = new Set<string>();
  const doctorRegs = new Set<string>();
  let totalChambers = 0;
  let totalDoctors = 0;
  let totalSessions = 0;
  let totalStaff = 0;

  for (const clinic of BHOPAL_10_CLINICS) {
    if (clinicSlugs.has(clinic.slug)) {
      throw new Error(`Integrity Violation: Duplicate clinic slug '${clinic.slug}'`);
    }
    clinicSlugs.add(clinic.slug);

    if (!/^4620\d{2}$/.test(clinic.pincode)) {
      throw new Error(`Validation Error: Invalid Bhopal pincode '${clinic.pincode}' for clinic ${clinic.name}`);
    }

    // Validate Chambers
    const chamberCodes = new Set<string>();
    for (const ch of clinic.chambers) {
      if (chamberCodes.has(ch.chamberNumber)) {
        throw new Error(`Integrity Violation: Duplicate chamber '${ch.chamberNumber}' in clinic ${clinic.name}`);
      }
      chamberCodes.add(ch.chamberNumber);
      totalChambers++;
    }

    // Validate Doctors
    for (const doc of clinic.doctors) {
      if (doctorSlugs.has(doc.slug)) {
        throw new Error(`Integrity Violation: Duplicate doctor slug '${doc.slug}'`);
      }
      doctorSlugs.add(doc.slug);

      if (doctorRegs.has(doc.registrationNumber)) {
        throw new Error(`Integrity Violation: Duplicate medical registration '${doc.registrationNumber}'`);
      }
      doctorRegs.add(doc.registrationNumber);

      if (!/^[6-9]\d{9}$/.test(doc.mobile)) {
        throw new Error(`Validation Error: Invalid mobile '${doc.mobile}' for Dr. ${doc.fullName}`);
      }

      totalDoctors++;
      totalSessions += doc.sessions.length;
    }

    // Validate Staff
    for (const st of clinic.staff) {
      if (!/^[6-9]\d{9}$/.test(st.mobile)) {
        throw new Error(`Validation Error: Invalid mobile '${st.mobile}' for staff ${st.fullName}`);
      }
      totalStaff++;
    }
  }

  // If live pg client is provided, execute batch insert transaction
  if (dbClient) {
    await dbClient.query('BEGIN');
    try {
      for (const clinic of BHOPAL_10_CLINICS) {
        await dbClient.query(
          `INSERT INTO clinics (id, name, slug, tagline, address_line, locality, city, state, pincode, contact_phone, contact_email, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO NOTHING;`,
          [
            clinic.id,
            clinic.name,
            clinic.slug,
            clinic.tagline,
            clinic.addressLine,
            clinic.locality,
            clinic.city,
            clinic.state,
            clinic.pincode,
            clinic.contactPhone,
            clinic.contactEmail,
            clinic.isActive,
          ]
        );
      }
      await dbClient.query('COMMIT');
    } catch (err) {
      await dbClient.query('ROLLBACK');
      throw err;
    }
  }

  const durationMs = performance.now() - startTime;

  return {
    success: true,
    totalClinics: BHOPAL_10_CLINICS.length,
    totalChambers,
    totalDoctors,
    totalSessions,
    totalStaff,
    durationMs,
    timestamp: new Date().toISOString(),
  };
}

