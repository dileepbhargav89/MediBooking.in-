/**
 * MediBooking.in - Enterprise Healthcare Type Definitions
 * Strict domain models for multi-tenant clinics, multi-doctor chambers, and RBAC portals.
 */

// ==========================================
// 1. RBAC & PORTAL ROLES TAXONOMY
// ==========================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CLINIC_ADMIN = 'CLINIC_ADMIN',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PATIENT = 'PATIENT',
}

export enum StaffScope {
  /** Central front-desk receptionist managing all doctor chambers and central cashiering */
  CLINIC_WIDE = 'CLINIC_WIDE',
  /** Dedicated compounder/attendant bound strictly to one doctor chamber */
  DOCTOR_DEDICATED = 'DOCTOR_DEDICATED',
}

export interface UserContext {
  userId: string;
  mobile: string;
  fullName: string;
  email?: string;
  activeRole: UserRole;
  activeClinicId?: string;
  activeClinicName?: string;
  activeChamberNumber?: string;
  staffScope?: StaffScope;
  dedicatedDoctorId?: string;
  allowedRoles: UserRole[];
  availableClinics: Array<{
    clinicId: string;
    clinicName: string;
    role: UserRole;
    chamberNumber?: string;
  }>;
}

export interface AuthTokenPayload {
  sub: string; // userId
  mobile: string;
  role: UserRole;
  clinicId?: string;
  staffScope?: StaffScope;
  dedicatedDoctorId?: string;
  iat: number;
  exp: number;
}

// ==========================================
// 2. CLINIC & MULTI-CHAMBER DOMAIN MODELS
// ==========================================

export enum MedicalSpecialty {
  CARDIOLOGY = 'CARDIOLOGY',
  DERMATOLOGY = 'DERMATOLOGY',
  ORTHOPEDICS = 'ORTHOPEDICS',
  PEDIATRICS = 'PEDIATRICS',
  GENERAL_MEDICINE = 'GENERAL_MEDICINE',
  GYNECOLOGY = 'GYNECOLOGY',
  ENT = 'ENT',
  OPHTHALMOLOGY = 'OPHTHALMOLOGY',
  DENTAL = 'DENTAL',
  PULMONOLOGY = 'PULMONOLOGY',
  OTHER = 'OTHER',
}

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  addressLine: string;
  locality: string; // e.g. "MP Nagar Zone-II", "Arera Colony"
  city: string; // "Bhopal"
  state: string; // "Madhya Pradesh"
  pincode: string;
  contactPhone: string;
  contactEmail?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Chamber {
  id: string;
  clinicId: string;
  chamberNumber: string; // e.g. "CH-1", "CH-2"
  chamberName: string; // e.g. "Cardiology Suite", "Chamber 1"
  floor?: string; // e.g. "Ground Floor"
  isActive: boolean;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  fullName: string;
  slug: string; // e.g. "dr-rajesh-sharma-cardio"
  registrationNumber: string; // State Medical Council Registration (NMC)
  stateMedicalCouncil: string; // e.g. "Madhya Pradesh Medical Council"
  specialties: MedicalSpecialty[];
  qualifications: string[]; // e.g. ["MBBS", "MD (Medicine)", "DM (Cardiology)"]
  experienceYears: number;
  bio?: string;
  profilePhotoUrl?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicDoctorAffiliation {
  id: string;
  clinicId: string;
  doctorId: string;
  chamberId?: string;
  chamberNumber: string; // e.g. "CH-1"
  consultationFeeRupees: number;
  followUpFeeRupees: number;
  followUpValidityDays: number;
  isPrimaryClinic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 3. SCHEDULE, SESSION & AVAILABILITY
// ==========================================

export enum DayOfWeek {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 7,
}

export enum SessionType {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
  AFTERNOON = 'AFTERNOON',
  SPECIAL = 'SPECIAL',
}

export interface ClinicSession {
  id: string;
  clinicId: string;
  doctorId: string;
  chamberNumber: string;
  dayOfWeek: DayOfWeek;
  sessionType: SessionType;
  startTime: string; // HH:mm format (e.g. "18:00")
  endTime: string; // HH:mm format (e.g. "20:30")
  slotDurationMinutes: number; // e.g. 15
  maxWalkInTokens: number; // e.g. 10
  maxOnlineSlots: number; // e.g. 10
  bufferMinutes: number; // e.g. 0
  isActive: boolean;
}

export enum SlotStatus {
  AVAILABLE = 'AVAILABLE',
  LOCKED = 'LOCKED', // 5-min temporary lock during patient checkout
  BOOKED = 'BOOKED',
  BLOCKED = 'BLOCKED', // Blocked by doctor/admin
  WALK_IN_RESERVED = 'WALK_IN_RESERVED',
}

export interface AvailabilitySlot {
  id: string;
  clinicId: string;
  doctorId: string;
  sessionId: string;
  chamberNumber: string;
  slotDate: string; // YYYY-MM-DD
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  status: SlotStatus;
  lockedUntil?: string;
  lockedBySessionId?: string;
}

// ==========================================
// 4. APPOINTMENT & QUEUE LIFECYCLE
// ==========================================

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  ARRIVED = 'ARRIVED',
  WAITING = 'WAITING',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED',
  CANCELLED_PATIENT = 'CANCELLED_PATIENT',
  CANCELLED_CLINIC = 'CANCELLED_CLINIC',
  NO_SHOW = 'NO_SHOW',
  EMERGENCY_OVERRIDE = 'EMERGENCY_OVERRIDE',
}

export enum BookingSource {
  WALK_IN = 'WALK_IN',
  PHONE = 'PHONE',
  WHATSAPP = 'WHATSAPP',
  ONLINE_PORTAL = 'ONLINE_PORTAL',
  DOCTOR_REFERRAL = 'DOCTOR_REFERRAL',
}

export enum PaymentStatus {
  PENDING_AT_DESK = 'PENDING_AT_DESK',
  PAID_CASH = 'PAID_CASH',
  PAID_UPI_QR = 'PAID_UPI_QR',
  WAIVED_BY_DOCTOR = 'WAIVED_BY_DOCTOR',
}

export enum TriageSeverity {
  ROUTINE = 'ROUTINE',
  URGENT_TRIAGE = 'URGENT_TRIAGE',
  FOLLOW_UP = 'FOLLOW_UP',
  POST_OP = 'POST_OP',
}

export interface PatientRecord {
  id: string;
  fullName: string;
  mobile: string;
  ageYears?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  locality?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  clinicId: string;
  doctorId: string;
  patientId: string;
  slotId?: string;
  chamberNumber: string;
  appointmentDate: string; // YYYY-MM-DD
  tokenNumber: number; // e.g. Token #12
  status: AppointmentStatus;
  source: BookingSource;
  paymentStatus: PaymentStatus;
  amountRupees: number;
  triageSeverity: TriageSeverity;
  patientName: string;
  patientMobile: string;
  patientAge?: number;
  idempotencyKey?: string;
  receiptNumber?: string;
  estimatedConsultTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 5. RAPID FRONT-DESK & DOCTOR DTOs
// ==========================================

/** 15-second receptionist walk-in intake payload (F2 hotkey) */
export interface QuickIntakeDTO {
  clinicId: string;
  doctorId: string;
  chamberNumber: string;
  patientName: string;
  mobile: string;
  ageYears?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  locality?: string;
  triageSeverity?: TriageSeverity;
  paymentMethod: PaymentStatus.PAID_CASH | PaymentStatus.PAID_UPI_QR | PaymentStatus.PENDING_AT_DESK;
  amountRupees: number;
  idempotencyKey?: string;
  offlineRecordedAt?: string;
  taxIdentifier?: string;
  receiptNumber?: string;
}

/** 1-click doctor delay broadcast payload */
export interface DoctorDelayBroadcastDTO {
  clinicId: string;
  doctorId: string;
  delayMinutes: 15 | 30 | 45 | 60;
  reasonOption: 'HOSPITAL_EMERGENCY' | 'TRAFFIC_DELAY' | 'EXTENDED_ROUNDS' | 'PERSONAL_EMERGENCY';
  customNote?: string;
}

/** Waiting Room TV Real-Time Display State */
export interface ChamberQueueItem {
  tokenNumber: number;
  patientMaskedName: string; // e.g. "R*** Sharma"
  status: AppointmentStatus;
  estimatedTime?: string;
}

export interface ChamberTVState {
  chamberNumber: string;
  chamberName: string;
  doctorName: string;
  specialty: MedicalSpecialty;
  currentToken: number | null;
  servingPatientMaskedName: string | null;
  upNextTokens: number[];
  delayMinutes: number;
  statusMessage?: string;
}

export interface ClinicTVDisplayPayload {
  clinicName: string;
  locality: string;
  currentTime: string;
  chambers: ChamberTVState[];
}

// ==========================================
// 6. CLINIC CASHIERING & PAYMENT LEDGER DTOs
// ==========================================

export interface PaymentLedgerEntry {
  id: string;
  clinicId: string;
  appointmentId: string;
  amountRupees: number;
  paymentMethod: PaymentStatus; // PAID_CASH, PAID_UPI_QR, WAIVED_BY_DOCTOR
  collectedByUserId?: string;
  collectorName?: string;
  patientName: string;
  patientMobile: string;
  tokenNumber: number;
  chamberNumber: string;
  doctorId: string;
  doctorName?: string;
  receiptNumber: string;
  notes?: string;
  recordedAt: string;
}

export interface ProcessPaymentDTO {
  appointmentId: string;
  paymentMethod: PaymentStatus.PAID_CASH | PaymentStatus.PAID_UPI_QR | PaymentStatus.WAIVED_BY_DOCTOR;
  amountRupees?: number;
  notes?: string;
  collectedByUserId?: string;
  collectorName?: string;
}

export interface CashieringSummary {
  clinicId: string;
  date: string;
  totalCollectedRupees: number;
  cashTotalRupees: number;
  upiTotalRupees: number;
  waivedTotalRupees: number;
  totalTransactionsCount: number;
  cashTransactionsCount: number;
  upiTransactionsCount: number;
  waivedTransactionsCount: number;
  pendingCount: number;
  pendingAmountRupees: number;
  breakdownByDoctor: Array<{
    doctorId: string;
    doctorName: string;
    chamberNumber: string;
    totalAmountRupees: number;
    cashAmountRupees: number;
    upiAmountRupees: number;
    waivedCount: number;
    patientCount: number;
  }>;
}

export interface CashieringFilterQuery {
  date?: string; // YYYY-MM-DD
  doctorId?: string;
  paymentMethod?: PaymentStatus;
}


