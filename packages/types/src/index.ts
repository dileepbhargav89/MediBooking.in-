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
  NEUROLOGY = 'NEUROLOGY',
  GASTROENTEROLOGY = 'GASTROENTEROLOGY',
  PSYCHIATRY = 'PSYCHIATRY',
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
  trialEndsAt?: string;
  upiVpa?: string;
  merchantName?: string;
  openingCashFloat?: number;
  autoPrintReceipt?: boolean;
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
  CANCELLED = 'CANCELLED',
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
  EMERGENCY = 'EMERGENCY',
  URGENT_TRIAGE = 'URGENT_TRIAGE',
  POST_OP = 'POST_OP',
  ROUTINE = 'ROUTINE',
  FOLLOW_UP = 'FOLLOW_UP',
}

export interface TriageUpdateDTO {
  triageSeverity: TriageSeverity;
  clinicalJustification: string;
}

export interface TriageAuditRecord {
  id: string;
  appointmentId: string;
  clinicId: string;
  doctorId: string;
  chamberNumber: string;
  tokenNumber: number;
  fromSeverity: TriageSeverity;
  toSeverity: TriageSeverity;
  clinicalJustification: string;
  actorUserId: string;
  actorRole: UserRole;
  timestamp: string;
}

export interface InterleavedQueueItem {
  appointment: Appointment;
  priorityRank: number;
  triageTierWeight: number;
  isEmergencyInterleaved: boolean;
  estimatedWaitMinutes: number;
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
  patientGender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  symptoms?: string;
  bookingFeeRupees?: number;
  consultationFeeDue?: number;
  idempotencyKey?: string;
  receiptNumber?: string;
  vitals?: PatientVitals;
  arrivedAt?: string;
  estimatedConsultTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  cancellationReason?: string;
  rescheduleEligibleUntil?: string;
  rescheduledFromAppointmentId?: string;
  rescheduledToAppointmentId?: string;
  isVipPriorityReschedule?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 4B. EMERGENCY SESSION CANCELLATION DTOs (PHASE 21)
// ==========================================

export interface DoctorSessionCancellationDTO {
  clinicId: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  cancellationReason: string;
  notifyPatients?: boolean;
  rescheduleWindowDays?: number;
}

export interface SessionCancellationRecord {
  id: string;
  clinicId: string;
  doctorId: string;
  chamberNumber: string;
  sessionDate: string;
  cancellationReason: string;
  cancelledAppointmentsCount: number;
  invalidatedSlotsCount: number;
  actorUserId: string;
  actorRole: UserRole;
  timestamp: string;
}

export interface SessionCancellationResult {
  success: boolean;
  clinicId: string;
  doctorId: string;
  chamberNumber: string;
  sessionDate: string;
  cancellationReason: string;
  cancelledAppointmentsCount: number;
  invalidatedSlotsCount: number;
  cancelledAppointmentIds: string[];
  message: string;
  timestamp: string;
}

// ==========================================
// 4C. VIP PRIORITY RESCHEDULE DTOs (PHASE 22)
// ==========================================

export interface ClaimVipRescheduleDTO {
  cancelledAppointmentId: string;
  targetDate: string; // YYYY-MM-DD
  targetSlotId?: string;
  targetChamberNumber?: string;
  notes?: string;
}

export interface VipRescheduleResult {
  success: boolean;
  originalAppointmentId: string;
  newAppointment: Appointment;
  rescheduledDate: string;
  tokenNumber: number;
  feeWaived: boolean;
  message: string;
  timestamp: string;
}

export interface EligibleRescheduleItem {
  appointmentId: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  patientMobile: string;
  originalDate: string;
  originalTokenNumber: number;
  cancellationReason?: string;
  rescheduleEligibleUntil: string;
  daysRemaining: number;
  originalPaymentStatus: PaymentStatus;
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
  delayMinutes: number; // 0 (clear), 15, 30, 45, 60
  reasonOption: 'HOSPITAL_EMERGENCY' | 'TRAFFIC_DELAY' | 'EXTENDED_ROUNDS' | 'PERSONAL_EMERGENCY' | 'ON_TIME_RESUMED' | string;
  customNote?: string;
}

export interface DelayBroadcastResult {
  success: boolean;
  clinicId: string;
  doctorId: string;
  chamberNumber: string;
  delayMinutes: number;
  isDelayActive: boolean;
  reasonMessage: string;
  affectedAppointmentsCount: number;
  recalculatedAppointments: Array<{
    id: string;
    tokenNumber: number;
    patientName: string;
    oldEstimatedTime?: string;
    newEstimatedTime?: string;
  }>;
  broadcastTimestamp: string;
  message: string;
}

export interface DelayStatusRecord {
  clinicId: string;
  doctorId: string;
  chamberNumber: string;
  isDelayActive: boolean;
  delayMinutes: number;
  reasonMessage?: string;
  activatedAt?: string;
  updatedAt: string;
}

export interface DelayHistoryRecord {
  id: string;
  clinicId: string;
  doctorId: string;
  chamberNumber: string;
  delayMinutes: number;
  reasonOption: string;
  customNote?: string;
  actorUserId: string;
  actorRole: UserRole;
  affectedCount: number;
  timestamp: string;
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
  upiQrTotalRupees?: number;
  waivedTotalRupees: number;
  totalTransactionsCount: number;
  cashTransactionsCount: number;
  upiTransactionsCount: number;
  waivedTransactionsCount: number;
  waivedCount?: number;
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

// ==========================================
// 7. MULTI-CHAMBER LIVE QUEUE DTOs (STAGE II)
// ==========================================

export interface QueueAppointmentItem {
  id: string;
  tokenNumber: number;
  formattedToken: string;
  patientName: string;
  patientMobileMasked: string;
  source: BookingSource;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  amountRupees: number;
  triageSeverity: TriageSeverity;
  estimatedStartTime?: string;
  estimatedWaitMinutes: number;
  receiptNumber?: string;
  vitals?: PatientVitals;
  createdAt: string;
}

export interface ChamberQueueDetail {
  chamberNumber: string;
  chamberName: string;
  doctorId?: string;
  doctorName?: string;
  specialty?: MedicalSpecialty;
  consultationFee?: number;
  followUpFee?: number;
  sessionStartTime?: string;
  sessionEndTime?: string;
  delayMinutes: number;
  isDelayActive: boolean;
  currentlyServing: QueueAppointmentItem | null;
  waitingQueue: QueueAppointmentItem[];
  completedQueue: QueueAppointmentItem[];
  totalWaiting: number;
  totalCompleted: number;
  totalWalkIn: number;
  totalOnline: number;
  estimatedWaitMinutes: number;
}

export interface ClinicQueueMetrics {
  totalActiveChambers: number;
  totalWaitingClinicWide: number;
  totalCompletedClinicWide: number;
  totalWalkInClinicWide: number;
  totalOnlineClinicWide: number;
  totalExpectedRevenueRupees: number;
}

export interface MultiChamberQueueResponse {
  clinicId: string;
  date: string;
  staffScope: StaffScope;
  metrics: ClinicQueueMetrics;
  queues: ChamberQueueDetail[];
}

// ==========================================
// 8. DOCTOR-DEDICATED COMPOUNDER DTOs (PHASE 17)
// ==========================================

export interface PatientVitals {
  bloodPressure?: string; // e.g. "120/80"
  pulseBpm?: number;      // e.g. 72
  weightKg?: number;      // e.g. 68.5
  temperatureF?: number;  // e.g. 98.6
  spo2Percent?: number;   // e.g. 99
  chiefComplaints?: string;
  notes?: string;
  recordedAt?: string;
  recordedBy?: string;
}

export interface RecordVitalsDTO {
  bloodPressure?: string;
  pulseBpm?: number;
  weightKg?: number;
  temperatureF?: number;
  spo2Percent?: number;
  chiefComplaints?: string;
  notes?: string;
}

export interface CompounderQueueResponse {
  clinicId: string;
  chamberNumber: string;
  chamberName: string;
  doctorId: string;
  doctorName: string;
  specialty?: MedicalSpecialty;
  sessionStartTime?: string;
  sessionEndTime?: string;
  delayMinutes: number;
  isDelayActive: boolean;
  currentlyServing: QueueAppointmentItem | null;
  nextPatient: QueueAppointmentItem | null;
  waitingQueue: QueueAppointmentItem[];
  completedQueue: QueueAppointmentItem[];
  stats: {
    totalQueue: number;
    waitingCount: number;
    completedCount: number;
    vitalsRecordedCount: number;
    urgentCount: number;
    estimatedWaitMinutes: number;
  };
}

// ==========================================
// 9. NON-LINEAR QUEUE TRANSITION DTOs (PHASE 18)
// ==========================================

export interface AppointmentTransitionRecord {
  id: string;
  appointmentId: string;
  clinicId: string;
  fromStatus: AppointmentStatus;
  toStatus: AppointmentStatus;
  actorUserId: string;
  actorRole: UserRole;
  notes?: string;
  autoBackfilledArrived: boolean;
  timestamp: string;
}

export interface TransitionAppointmentDTO {
  status: AppointmentStatus;
  notes?: string;
  allowReopen?: boolean;
}

export interface QueueTransitionResult {
  success: boolean;
  appointment: Appointment;
  transitionRecord: AppointmentTransitionRecord;
  autoCompletedPrevious?: Appointment | null;
  message: string;
}

// ==========================================
// 10. REALTIME REDIS PUB/SUB EVENT BACKPLANE (PHASE 23)
// ==========================================

export type RealtimeEventType =
  | 'chamber_update'
  | 'delay_broadcast'
  | 'session_cancelled'
  | 'emergency_triage'
  | 'queue_refresh'
  | 'heartbeat';

export interface RealtimeClinicEvent<T = unknown> {
  eventId: string;
  clinicId: string;
  eventType: RealtimeEventType;
  timestamp: string;
  senderInstanceId: string;
  payload: T;
}

export interface PubSubStats {
  instanceId: string;
  driver: 'redis' | 'memory';
  activeChannels: string[];
  totalPublished: number;
  totalReceived: number;
  uptimeSeconds: number;
}

// ==========================================
// 11. SSE WAITING ROOM TV STREAMING (PHASE 24)
// ==========================================

export interface TVStreamOptions {
  chamberFilter?: string; // e.g. "CH-1"
  lastEventId?: string;
}

export interface TVStreamClientInfo {
  id: string;
  clinicId: string;
  connectedAt: string;
  chamberFilter?: string;
  ip?: string;
}

export interface TVStatusResponse {
  clinicId: string;
  activeScreensCount: number;
  connectedClients: TVStreamClientInfo[];
  lastHeartbeatAt: string;
  currentSnapshot: ClinicTVDisplayPayload;
}

// ==========================================
// 12. FRONT-DESK OFFLINE BATCH SYNC DTOs (PHASE 25)
// ==========================================

export type PaymentMode = PaymentStatus;
export const PaymentMode = PaymentStatus;

export interface OfflineIntakeItem {
  clientOfflineId: string;
  idempotencyKey: string;
  offlineRecordedAt: string; // ISO 8601
  patientName: string;
  patientPhone: string;
  patientAge: number;
  patientGender?: 'MALE' | 'FEMALE' | 'OTHER';
  doctorId: string;
  chamberNumber: string;
  paymentMode: PaymentMode;
  amount: number;
  triageSeverity?: TriageSeverity;
  notes?: string;
}

export interface BatchSyncIntakeDTO {
  clinicId: string;
  batchId: string;
  syncedAt: string;
  intakes: OfflineIntakeItem[];
}

export interface BatchSyncResultItem {
  clientOfflineId: string;
  idempotencyKey: string;
  status: 'SYNCHRONIZED' | 'DUPLICATE_SKIPPED' | 'FAILED';
  appointmentId?: string;
  assignedTokenNumber?: number;
  errorMessage?: string;
}

export interface BatchSyncResponse {
  batchId: string;
  clinicId: string;
  totalSubmitted: number;
  synchronizedCount: number;
  duplicateCount: number;
  failedCount: number;
  results: BatchSyncResultItem[];
  syncedAt: string;
}

// ==========================================
// 13. WHATSAPP BUSINESS CLOUD API BROKER (PHASE 26)
// ==========================================

export type WhatsAppTemplateType =
  | 'booking_confirmation_v1'
  | 'doctor_delay_v1'
  | 'session_cancelled_v1'
  | 'walkin_intake_v1'
  | 'custom_utility_v1';

export interface WhatsAppNotificationDTO {
  recipientMobile: string;
  template: WhatsAppTemplateType;
  language?: string;
  parameters: Record<string, string | number>;
  clinicId: string;
  appointmentId?: string;
  simulate?: boolean;
}

export interface WhatsAppMessageResult {
  success: boolean;
  wamid?: string;
  recipient: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED' | 'FALLBACK_TO_SMS';
  shouldFallbackToSms: boolean;
  errorCode?: number;
  errorMessage?: string;
  timestamp: string;
}

export interface WhatsAppAuditRecord {
  id: string;
  clinicId: string;
  appointmentId?: string;
  recipientMobile: string;
  template: WhatsAppTemplateType;
  result: WhatsAppMessageResult;
  sentAt: string;
}

// ==========================================
// 14. DLT-COMPLIANT INDIAN SMS BROKER (STAGE III)
// ==========================================

export type SmsTemplateType =
  | 'BOOKING_CONFIRMATION'
  | 'DOCTOR_DELAY'
  | 'SESSION_CANCELLED'
  | 'WALKIN_INTAKE'
  | 'OTP_LOGIN';

export interface SmsNotificationDTO {
  recipientMobile: string;
  templateType: SmsTemplateType;
  variables: string[];
  clinicId: string;
  referenceId?: string;
  simulate?: boolean;
}

export interface SmsDeliveryResult {
  success: boolean;
  messageId: string;
  dltTemplateId: string;
  dltSenderId: string;
  recipientMobile: string;
  renderedText: string;
  status: 'DELIVERED' | 'QUEUED' | 'FAILED' | 'SIMULATED';
  error?: string;
  timestamp: string;
}

export interface SmsAuditRecord {
  id: string;
  clinicId: string;
  referenceId?: string;
  recipientMobile: string;
  templateType: SmsTemplateType;
  dltTemplateId: string;
  renderedText: string;
  result: SmsDeliveryResult;
  sentAt: string;
}

// ==========================================
// 15. THERMAL PRINTER ESC/POS FORMATTER (STAGE III)
// ==========================================

export type ThermalPaperWidth = '80mm' | '58mm';

export interface ThermalSlipData {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicGstNumber?: string;
  chamber: string;
  chamberName?: string;
  doctorName: string;
  specialty?: string;
  token: number;
  tokenFormatted: string;
  patientName: string;
  patientMaskedPhone: string;
  feeRupees: number;
  payment: PaymentStatus;
  receiptNumber: string;
  time: string;
  notes?: string;
}

export interface ThermalPrintOptions {
  width: ThermalPaperWidth;
  cutPaper?: boolean;
  includeQrCode?: boolean;
}

export interface FormattedThermalReceipt {
  width: ThermalPaperWidth;
  columns: number;
  rawEscPosBase64: string;
  asciiText: string;
  htmlContent: string;
}

// ==========================================
// 16. DPDP ACT 2023 TAMPER-EVIDENT AUDIT LOGGER (STAGE III)
// ==========================================

export type DpdpAuditAction =
  | 'PATIENT_INTAKE'
  | 'DATA_ACCESS'
  | 'DATA_EXPORT'
  | 'CONSENT_RECORDED'
  | 'DATA_ERASURE_REQUEST'
  | 'PAYMENT_COLLECTED'
  | 'EMERGENCY_OVERRIDE'
  | 'DELAY_BROADCAST'
  | 'SESSION_CANCELLED'
  | 'USER_LOGIN'
  | 'SECURITY_ALERT';

export type LawfulBasis =
  | 'CONSENT'
  | 'LEGAL_OBLIGATION'
  | 'VITAL_INTERESTS'
  | 'LEGITIMATE_USES';

export interface DpdpAuditLogEntry {
  sequenceNumber: number;
  id: string;
  clinicId: string;
  actorId: string;
  actorRole: UserRole;
  action: DpdpAuditAction;
  entityType: string;
  entityId: string;
  lawfulBasis: LawfulBasis;
  details: Record<string, any>;
  clientIp?: string;
  timestamp: string;
  previousHash: string;
  currentHash: string;
}

export interface CreateAuditLogDTO {
  clinicId: string;
  actorId: string;
  actorRole: UserRole;
  action: DpdpAuditAction;
  entityType: string;
  entityId: string;
  lawfulBasis?: LawfulBasis;
  details?: Record<string, any>;
  clientIp?: string;
  timestamp?: string;
}

export interface AuditQueryFilter {
  clinicId: string;
  action?: DpdpAuditAction;
  actorRole?: UserRole;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditChainVerificationResult {
  valid: boolean;
  clinicId: string;
  totalEntries: number;
  tamperedIndex?: number;
  tamperedSequenceNumber?: number;
  tamperedId?: string;
  reason?: string;
  verifiedAt: string;
}

// ==========================================
// 17. PATIENT IDENTITY MASKING UTILITY (STAGE III)
// ==========================================

export type NameMaskingStyle = 'STANDARD' | 'INITIALS_ONLY' | 'FULL_SURNAME_MASK';

export interface MaskingOptions {
  style?: NameMaskingStyle;
  stripHonorifics?: boolean;
}

export interface MaskedPatientIdentity {
  originalName: string;
  maskedName: string;
  originalMobile?: string;
  maskedMobile?: string;
}

const COMMON_HONORIFICS = new Set([
  'mr',
  'mr.',
  'mrs',
  'mrs.',
  'ms',
  'ms.',
  'dr',
  'dr.',
  'shri',
  'smt',
  'smt.',
  'master',
  'prof',
  'prof.',
  'er',
  'er.',
  'lt',
  'lt.',
  'col',
  'col.',
  'capt',
  'capt.',
  'maj',
  'maj.',
]);

export function maskPatientName(name: string, options?: MaskingOptions): string {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  const rawTokens = trimmed.split(/\s+/);
  const stripHonorifics = options?.stripHonorifics ?? true;

  // Filter out leading honorifics if requested
  let tokens = rawTokens;
  if (stripHonorifics) {
    while (tokens.length > 1 && COMMON_HONORIFICS.has((tokens[0] || '').toLowerCase())) {
      tokens = tokens.slice(1);
    }
  }

  if (tokens.length === 0) return '';
  const first = tokens[0] || '';
  const style = options?.style || 'STANDARD';

  // Single-word name: "Pooja" -> "P***"
  if (tokens.length === 1) {
    return `${first.charAt(0).toUpperCase()}***`;
  }

  const last = tokens[tokens.length - 1] || '';

  switch (style) {
    case 'INITIALS_ONLY':
      // "Rajesh Sharma" -> "R*** S***"
      return `${first.charAt(0).toUpperCase()}*** ${last.charAt(0).toUpperCase()}***`;
    case 'FULL_SURNAME_MASK':
      // "Rajesh Sharma" -> "Rajesh S***"
      return `${first} ${last.charAt(0).toUpperCase()}***`;
    case 'STANDARD':
    default:
      // "Rajesh Sharma" -> "R*** Sharma"
      return `${first.charAt(0).toUpperCase()}*** ${last}`;
  }
}

export function maskIndianMobile(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    return `${last10.slice(0, 5)}*****`;
  }
  if (digits.length >= 5) {
    return `${digits.slice(0, 3)}***`;
  }
  return '*****';
}

export function maskPatientIdentity(
  name: string,
  mobile?: string,
  options?: MaskingOptions
): MaskedPatientIdentity {
  return {
    originalName: name,
    maskedName: maskPatientName(name, options),
    originalMobile: mobile,
    maskedMobile: mobile ? maskIndianMobile(mobile) : undefined,
  };
}

// ==========================================
// 18. B2B SAAS SUBSCRIPTION BILLING (STAGE III)
// ==========================================

export type PlanTier =
  | 'TRIAL_30'
  | 'SOLO_ESSENTIAL'
  | 'CLINIC_PRO'
  | 'POLYCLINIC_ENTERPRISE';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'SUSPENDED'
  | 'CANCELLED';

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  monthlyPriceInr: number;
  annualPriceInr: number;
  maxChambers: number;
  maxDoctors: number;
  monthlyNotifications: number;
  tvStreamAllowed: boolean;
  prioritySupport: boolean;
}

export interface ClinicSubscription {
  id: string;
  clinicId: string;
  tier: PlanTier;
  status: SubscriptionStatus;
  monthlyPriceInr: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  gracePeriodEnd?: string;
  gatewaySubscriptionId?: string;
  maxChambers: number;
  maxDoctors: number;
  tvStreamAllowed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RazorpayOrderDTO {
  clinicId: string;
  tier: PlanTier;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  currency?: string;
}

export interface RazorpayOrderResult {
  orderId: string;
  amountPaise: number;
  currency: string;
  clinicId: string;
  tier: PlanTier;
  keyId: string;
  notes: Record<string, string>;
  createdAt: string;
}

export interface RazorpayPaymentVerifyDTO {
  clinicId: string;
  orderId: string;
  paymentId: string;
  signature: string;
  tier: PlanTier;
}

export interface BillingInvoiceDTO {
  id: string;
  clinicId: string;
  invoiceNumber: string;
  tier: PlanTier;
  baseAmountRupees: number;
  cgstRupees: number; // 9%
  sgstRupees: number; // 9%
  totalAmountRupees: number;
  paymentId: string;
  paidAt: string;
  periodStart: string;
  periodEnd: string;
  gstin?: string;
}

// ==========================================
// 19. END-OF-DAY RECONCILIATION & CASH DRAWER (STAGE III)
// ==========================================

export type ReconciliationDiscrepancyStatus = 'BALANCED' | 'SHORTAGE' | 'SURPLUS';

export interface DailyTokenReconciliation {
  date: string;
  clinicId: string;
  totalTokensIssued: number;
  completedCount: number;
  waitingCount: number;
  inConsultationCount: number;
  noShowCount: number;
  cancelledCount: number;
  walkInCount: number;
  onlineBookingCount: number;
}

export interface DrawerVarianceReport {
  physicalCashCountedRupees: number;
  systemCashExpectedRupees: number;
  discrepancyRupees: number;
  status: ReconciliationDiscrepancyStatus;
  notes?: string;
}

export interface EodSettlementRecord {
  id: string;
  clinicId: string;
  date: string;
  closedAt: string;
  closedByUserId: string;
  closedByUserName: string;
  cashieringSummary: CashieringSummary;
  tokenReconciliation: DailyTokenReconciliation;
  drawerVariance: DrawerVarianceReport;
  isLocked: boolean;
}

export interface CloseShiftDTO {
  clinicId: string;
  date?: string;
  physicalCashCountedRupees: number;
  notes?: string;
  supervisorOverride?: boolean;
}

export * from './auth-edge';
















