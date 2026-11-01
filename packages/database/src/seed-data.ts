/**
 * MediBooking.in - Realistic Seed Data for Bhopal Multi-Specialty Pilot
 * Simulates:
 * - 1 Clinic Tenant ("CityCare Polyclinic", MP Nagar Zone-II, Bhopal)
 * - 4 Specialist Doctors (Cardiology, Dermatology, Orthopedics, Pediatrics) in 4 distinct Chambers
 * - Dual-Scope Staff: 1 Central Clinic-Wide Receptionist + 1 Dedicated Doctor Compounder
 * - 1 Platform Super Admin
 */

import {
  UserRole,
  StaffScope,
  MedicalSpecialty,
  SessionType,
  DayOfWeek,
  SlotStatus,
  AppointmentStatus,
  BookingSource,
  PaymentStatus,
  TriageSeverity,
} from '@medibooking/types';

export const SEED_DATA = {
  superAdmin: {
    mobile: '9826011111',
    fullName: 'System Super Admin',
    email: 'admin@medibooking.in',
    role: UserRole.SUPER_ADMIN,
  },

  clinic: {
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
  },

  chambers: [
    {
      id: 'ch010000-0000-4000-8000-000000000001',
      chamberNumber: 'CH-1',
      chamberName: 'Cardiology Suite',
      floor: '1st Floor, Room 101',
    },
    {
      id: 'ch020000-0000-4000-8000-000000000002',
      chamberNumber: 'CH-2',
      chamberName: 'Dermatology & Cosmetology',
      floor: '1st Floor, Room 102',
    },
    {
      id: 'ch030000-0000-4000-8000-000000000003',
      chamberNumber: 'CH-3',
      chamberName: 'Orthopedics & Joint Clinic',
      floor: '1st Floor, Room 103',
    },
    {
      id: 'ch040000-0000-4000-8000-000000000004',
      chamberNumber: 'CH-4',
      chamberName: 'Pediatric Care & Vaccination',
      floor: '1st Floor, Room 104',
    },
  ],

  doctors: [
    {
      userId: 'u2010000-0000-4000-8000-000000000001',
      doctorId: 'd3010000-0000-4000-8000-000000000001',
      fullName: 'Dr. Rajesh Sharma',
      mobile: '9826122222',
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
        {
          dayOfWeek: DayOfWeek.MONDAY,
          sessionType: SessionType.EVENING,
          startTime: '18:00',
          endTime: '20:30',
          slotDurationMinutes: 15,
          maxTokens: 14,
        },
        {
          dayOfWeek: DayOfWeek.WEDNESDAY,
          sessionType: SessionType.EVENING,
          startTime: '18:00',
          endTime: '20:30',
          slotDurationMinutes: 15,
          maxTokens: 14,
        },
        {
          dayOfWeek: DayOfWeek.FRIDAY,
          sessionType: SessionType.EVENING,
          startTime: '18:00',
          endTime: '20:30',
          slotDurationMinutes: 15,
          maxTokens: 14,
        },
      ],
    },
    {
      userId: 'u2020000-0000-4000-8000-000000000002',
      doctorId: 'd3020000-0000-4000-8000-000000000002',
      fullName: 'Dr. Priya Verma',
      mobile: '9826133333',
      slug: 'dr-priya-verma-derma',
      registrationNumber: 'MPMC-53102',
      stateMedicalCouncil: 'Madhya Pradesh Medical Council',
      specialties: [MedicalSpecialty.DERMATOLOGY],
      qualifications: ['MBBS (GMC Bhopal)', 'MD (Dermatology, Venereology & Leprosy)'],
      experienceYears: 11,
      bio: 'Consultant Dermatologist and Trichologist specializing in clinical dermatology and acne management.',
      chamberNumber: 'CH-2',
      consultationFee: 500,
      followUpFee: 300,
      sessions: [
        {
          dayOfWeek: DayOfWeek.MONDAY,
          sessionType: SessionType.EVENING,
          startTime: '17:30',
          endTime: '20:00',
          slotDurationMinutes: 15,
          maxTokens: 12,
        },
        {
          dayOfWeek: DayOfWeek.THURSDAY,
          sessionType: SessionType.EVENING,
          startTime: '17:30',
          endTime: '20:00',
          slotDurationMinutes: 15,
          maxTokens: 12,
        },
      ],
    },
    {
      userId: 'u2030000-0000-4000-8000-000000000003',
      doctorId: 'd3030000-0000-4000-8000-000000000003',
      fullName: 'Dr. Amit Patel',
      mobile: '9826144444',
      slug: 'dr-amit-patel-ortho',
      registrationNumber: 'MPMC-61245',
      stateMedicalCouncil: 'Madhya Pradesh Medical Council',
      specialties: [MedicalSpecialty.ORTHOPEDICS],
      qualifications: ['MBBS', 'MS (Orthopedics)', 'Fellowship in Joint Replacement'],
      experienceYears: 14,
      bio: 'Joint Replacement & Arthroscopy Specialist treating arthritis, sports injuries, and spine conditions.',
      chamberNumber: 'CH-3',
      consultationFee: 600,
      followUpFee: 300,
      sessions: [
        {
          dayOfWeek: DayOfWeek.TUESDAY,
          sessionType: SessionType.EVENING,
          startTime: '18:00',
          endTime: '20:30',
          slotDurationMinutes: 15,
          maxTokens: 12,
        },
        {
          dayOfWeek: DayOfWeek.FRIDAY,
          sessionType: SessionType.EVENING,
          startTime: '18:00',
          endTime: '20:30',
          slotDurationMinutes: 15,
          maxTokens: 12,
        },
      ],
    },
    {
      userId: 'u2040000-0000-4000-8000-000000000004',
      doctorId: 'd3040000-0000-4000-8000-000000000004',
      fullName: 'Dr. Sneha Gupta',
      mobile: '9826155555',
      slug: 'dr-sneha-gupta-pediatrics',
      registrationNumber: 'MPMC-69830',
      stateMedicalCouncil: 'Madhya Pradesh Medical Council',
      specialties: [MedicalSpecialty.PEDIATRICS],
      qualifications: ['MBBS', 'MD (Pediatrics, KGMU)', 'PGPN (Boston)'],
      experienceYears: 9,
      bio: 'Child Specialist and Neonatologist providing pediatric preventive health, immunization, and growth monitoring.',
      chamberNumber: 'CH-4',
      consultationFee: 500,
      followUpFee: 250,
      sessions: [
        {
          dayOfWeek: DayOfWeek.MONDAY,
          sessionType: SessionType.EVENING,
          startTime: '18:00',
          endTime: '20:00',
          slotDurationMinutes: 15,
          maxTokens: 10,
        },
        {
          dayOfWeek: DayOfWeek.WEDNESDAY,
          sessionType: SessionType.EVENING,
          startTime: '18:00',
          endTime: '20:00',
          slotDurationMinutes: 15,
          maxTokens: 10,
        },
      ],
    },
  ],

  staff: [
    {
      userId: 'u4010000-0000-4000-8000-000000000001',
      mobile: '9826266666',
      fullName: 'Sunita Sahu',
      email: 'reception@citycarebhopal.in',
      role: UserRole.RECEPTIONIST,
      scope: StaffScope.CLINIC_WIDE, // Central desk managing all 4 chambers
      dedicatedDoctorId: undefined,
    },
    {
      userId: 'u4020000-0000-4000-8000-000000000002',
      mobile: '9826277777',
      fullName: 'Ramesh Yadav',
      email: 'ramesh.compounder@citycarebhopal.in',
      role: UserRole.RECEPTIONIST,
      scope: StaffScope.DOCTOR_DEDICATED, // Dedicated attendant for Dr. Rajesh Sharma (Chamber 1)
      dedicatedDoctorId: 'd3010000-0000-4000-8000-000000000001',
    },
  ],
};

