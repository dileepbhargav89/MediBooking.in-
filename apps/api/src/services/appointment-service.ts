/**
 * MediBooking Enterprise Appointment & Online Booking Service
 * Implements atomic lock-to-booking transactions with strict idempotency validation.
 */

import crypto from 'crypto';
import {
  Appointment,
  AppointmentStatus,
  BookingSource,
  PaymentStatus,
  TriageSeverity,
  SlotStatus,
  PatientVitals,
  UserRole,
  StaffScope,
} from '@medibooking/types';
import { slotService } from './slot-service';
import { slotLockManager } from './concurrency-engine';
import { affiliationService } from './affiliation-service';
import { clinicService } from './clinic-service';
import { doctorService } from './doctor-service';
import { sessionService } from './session-service';
import { getTriageTierWeight } from './triage-interleaving-service';

export interface CreateOnlineBookingDTO {
  slotId: string;
  sessionId: string;
  patientName: string;
  patientMobile: string;
  patientAge?: number;
  patientGender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  notes?: string;
  idempotencyKey?: string;
}

export interface CreateWalkInIntakeDTO {
  clinicId: string;
  doctorId: string;
  chamberNumber: string;
  patientName: string;
  patientMobile: string;
  patientAge?: number;
  patientGender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  locality?: string;
  triageSeverity?: TriageSeverity;
  paymentMethod: PaymentStatus;
  amountRupees?: number;
  appointmentDate?: string;
  allowDuplicate?: boolean;
  emergencyOverride?: boolean;
  idempotencyKey?: string;
  source?: BookingSource;
}

export interface ThermalSlipData {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  chamber: string;
  chamberName?: string;
  doctorName: string;
  token: number;
  tokenFormatted: string;
  patientName: string;
  patientMaskedPhone: string;
  feeRupees: number;
  payment: PaymentStatus;
  receiptNumber: string;
  time: string;
}

export class AppointmentService {
  // Key: appointmentId
  private appointments = new Map<string, Appointment>();
  // Key: idempotencyKey -> Appointment
  private idempotencyMap = new Map<string, Appointment>();
  // Key: `${clinicId}:${doctorId}:${date}` -> current token count
  private tokenCounters = new Map<string, number>();

  /**
   * Online Patient Slot Booking Transaction
   */
  async createOnlineBooking(
    dto: CreateOnlineBookingDTO
  ): Promise<{ appointment: Appointment; isReplay: boolean }> {
    // 1. Idempotency Check
    if (dto.idempotencyKey && this.idempotencyMap.has(dto.idempotencyKey)) {
      const cached = this.idempotencyMap.get(dto.idempotencyKey)!;
      return {
        appointment: cached,
        isReplay: true,
      };
    }

    // 2. Validate Slot
    const slot = await slotService.getSlotById(dto.slotId);
    if (!slot) {
      throw new Error(`SLOT_NOT_FOUND: Slot '${dto.slotId}' does not exist.`);
    }

    if (slot.status === SlotStatus.BOOKED) {
      throw new Error(`SLOT_ALREADY_BOOKED: Slot '${dto.slotId}' has already been booked.`);
    }

    if (slot.status === SlotStatus.BLOCKED) {
      throw new Error(`SLOT_BLOCKED: Slot '${dto.slotId}' is blocked from booking.`);
    }

    // 3. Commit Mutex Lock Atomically
    const committed = await slotLockManager.commitBooking(slot.id, dto.sessionId);
    if (!committed) {
      throw new Error(
        `LOCK_EXPIRED_OR_INVALID: The 5-minute reservation on slot '${dto.slotId}' has expired or is held by another session.`
      );
    }

    // 4. Resolve Affiliation & Consultation Fee
    const affiliation = await affiliationService.getAffiliation(slot.clinicId, slot.doctorId);
    const amountRupees = affiliation ? affiliation.consultationFeeRupees : 500;

    // 5. Sequential Chamber Token Allocation
    const tokenKey = `${slot.clinicId}:${slot.doctorId}:${slot.slotDate}`;
    const nextToken = (this.tokenCounters.get(tokenKey) || 0) + 1;
    this.tokenCounters.set(tokenKey, nextToken);

    // 6. Generate Receipt & Patient Identity
    const cleanDate = slot.slotDate.replace(/-/g, '');
    const receiptNumber = `MB-${cleanDate}-${slot.chamberNumber.replace('-', '')}-${nextToken.toString().padStart(3, '0')}`;
    const patientId = `pat-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const appointment: Appointment = {
      id: crypto.randomUUID(),
      clinicId: slot.clinicId,
      doctorId: slot.doctorId,
      patientId,
      slotId: slot.id,
      chamberNumber: slot.chamberNumber,
      appointmentDate: slot.slotDate,
      tokenNumber: nextToken,
      status: AppointmentStatus.SCHEDULED,
      source: BookingSource.ONLINE_PORTAL,
      paymentStatus: PaymentStatus.PENDING_AT_DESK,
      amountRupees,
      triageSeverity: TriageSeverity.ROUTINE,
      patientName: dto.patientName.trim(),
      patientMobile: dto.patientMobile.trim(),
      patientAge: dto.patientAge,
      idempotencyKey: dto.idempotencyKey,
      receiptNumber,
      estimatedConsultTime: slot.startTime,
      createdAt: now,
      updatedAt: now,
    };

    // 7. Persist Appointment & Mark Slot as Booked
    this.appointments.set(appointment.id, appointment);
    if (dto.idempotencyKey) {
      this.idempotencyMap.set(dto.idempotencyKey, appointment);
    }

    await slotService.updateSlotStatus(slot.id, SlotStatus.BOOKED);

    return {
      appointment,
      isReplay: false,
    };
  }

  /**
   * Rapid 15-Second Front-Desk Walk-In Intake
   */
  async createWalkInIntake(
    dto: CreateWalkInIntakeDTO
  ): Promise<{ appointment: Appointment; thermalSlipData: ThermalSlipData }> {
    // 0. Idempotency Replay Check
    if (dto.idempotencyKey && this.idempotencyMap.has(dto.idempotencyKey)) {
      const cached = this.idempotencyMap.get(dto.idempotencyKey)!;
      const clinicDetails = await clinicService.getClinicById(cached.clinicId);
      const doctor = await doctorService.getDoctorById(cached.doctorId);
      const chamberInfo = clinicDetails?.chambers.find((c) => c.chamberNumber === cached.chamberNumber);
      const chamberPrefix = cached.chamberNumber.replace(/[^A-Za-z0-9]/g, '');
      const tokenFormatted = `${chamberPrefix}-${cached.tokenNumber.toString().padStart(3, '0')}`;
      const maskedPhone =
        cached.patientMobile.length >= 10
          ? `${cached.patientMobile.slice(0, 5)}*****`
          : cached.patientMobile;

      return {
        appointment: cached,
        thermalSlipData: {
          clinicName: clinicDetails?.clinic.name || 'Clinic',
          clinicAddress: `${clinicDetails?.clinic.addressLine || ''}, ${clinicDetails?.clinic.city || ''}`,
          clinicPhone: clinicDetails?.clinic.contactPhone || '',
          chamber: cached.chamberNumber,
          chamberName: chamberInfo?.chamberName || cached.chamberNumber,
          doctorName: doctor?.fullName || 'Doctor',
          token: cached.tokenNumber,
          tokenFormatted,
          patientName: cached.patientName,
          patientMaskedPhone: maskedPhone,
          feeRupees: cached.amountRupees,
          payment: cached.paymentStatus,
          receiptNumber: cached.receiptNumber || `MB-${cached.tokenNumber}`,
          time: new Date().toLocaleTimeString('en-IN'),
        },
      };
    }

    const appointmentDate =
      dto.appointmentDate || (new Date().toISOString().split('T')[0] as string);

    // 1. Resolve Clinic & Chambers
    const clinicDetails = await clinicService.getClinicById(dto.clinicId);
    if (!clinicDetails) {
      throw new Error(`CLINIC_NOT_FOUND: Clinic '${dto.clinicId}' was not found.`);
    }

    // 2. Resolve Doctor
    const doctor = await doctorService.getDoctorById(dto.doctorId);
    if (!doctor) {
      throw new Error(`DOCTOR_NOT_FOUND: Doctor '${dto.doctorId}' was not found.`);
    }

    // 3. Resolve Affiliation & Fee
    const affiliation = await affiliationService.getAffiliation(dto.clinicId, dto.doctorId);
    if (!affiliation) {
      throw new Error(
        `DOCTOR_NOT_AFFILIATED: Doctor '${doctor.fullName}' is not affiliated with this clinic.`
      );
    }

    // 4. Duplicate Active Appointment Guard
    if (!dto.allowDuplicate) {
      const existing = Array.from(this.appointments.values()).find(
        (a) =>
          a.clinicId === dto.clinicId &&
          a.doctorId === dto.doctorId &&
          a.appointmentDate === appointmentDate &&
          a.patientMobile === dto.patientMobile.trim() &&
          (a.status === AppointmentStatus.WAITING ||
            a.status === AppointmentStatus.ARRIVED ||
            a.status === AppointmentStatus.IN_CONSULTATION ||
            a.status === AppointmentStatus.SCHEDULED)
      );

      if (existing) {
        throw new Error(
          `DUPLICATE_ACTIVE_APPOINTMENT: Patient with mobile ${dto.patientMobile} already holds Token #${existing.tokenNumber} (${existing.chamberNumber}) for this doctor today.`
        );
      }
    }

    // 5. Session Walk-In Quota Cap Guard
    const isEmergency = dto.emergencyOverride || dto.triageSeverity === TriageSeverity.EMERGENCY;
    if (!isEmergency) {
      const dayOfWeek = slotService.getDayOfWeek(appointmentDate);
      const doctorSessions = await sessionService.getSessionsByDoctor(dto.doctorId, dto.clinicId, true);
      const activeSession = doctorSessions.find((s) => s.dayOfWeek === dayOfWeek);

      if (activeSession && activeSession.maxWalkInTokens > 0) {
        const existingWalkIns = Array.from(this.appointments.values()).filter(
          (a) =>
            a.clinicId === dto.clinicId &&
            a.doctorId === dto.doctorId &&
            a.appointmentDate === appointmentDate &&
            a.source === BookingSource.WALK_IN
        );

        if (existingWalkIns.length >= activeSession.maxWalkInTokens) {
          throw new Error(
            `TOKEN_CAP_REACHED: Maximum walk-in token cap of ${activeSession.maxWalkInTokens} reached for Chamber ${dto.chamberNumber}. Receptionist may request emergency triage override.`
          );
        }
      }
    }

    const resolvedFee =
      dto.amountRupees !== undefined
        ? dto.amountRupees
        : dto.triageSeverity === TriageSeverity.FOLLOW_UP
          ? affiliation.followUpFeeRupees
          : affiliation.consultationFeeRupees;

    // 6. Sequential Chamber-Isolated Token Allocation
    const tokenKey = `${dto.clinicId}:${dto.doctorId}:${dto.chamberNumber}:${appointmentDate}`;
    const nextToken = (this.tokenCounters.get(tokenKey) || 0) + 1;
    this.tokenCounters.set(tokenKey, nextToken);

    // 7. Build Receipt Number & Patient Identity
    const cleanDate = appointmentDate.replace(/-/g, '');
    const chamberPrefix = dto.chamberNumber.replace(/[^A-Za-z0-9]/g, '');
    const tokenFormatted = `${chamberPrefix}-${nextToken.toString().padStart(3, '0')}`;
    const receiptNumber = `MB-${cleanDate}-${chamberPrefix}-${nextToken.toString().padStart(3, '0')}`;
    const patientId = `pat-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const maskedPhone =
      dto.patientMobile.length >= 10
        ? `${dto.patientMobile.slice(0, 5)}*****`
        : dto.patientMobile;

    const chamberInfo = clinicDetails.chambers.find((c) => c.chamberNumber === dto.chamberNumber);

    const appointment: Appointment = {
      id: `apt-${Date.now()}-${crypto.randomUUID().slice(0, 4)}`,
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
      patientId,
      chamberNumber: dto.chamberNumber,
      appointmentDate,
      tokenNumber: nextToken,
      status: AppointmentStatus.WAITING,
      source: dto.source || BookingSource.WALK_IN,
      paymentStatus: dto.paymentMethod,
      amountRupees: resolvedFee,
      triageSeverity: dto.triageSeverity || TriageSeverity.ROUTINE,
      patientName: dto.patientName.trim(),
      patientMobile: dto.patientMobile.trim(),
      patientAge: dto.patientAge,
      idempotencyKey: dto.idempotencyKey,
      receiptNumber,
      createdAt: now,
      updatedAt: now,
    };

    this.appointments.set(appointment.id, appointment);
    if (dto.idempotencyKey) {
      this.idempotencyMap.set(dto.idempotencyKey, appointment);
    }

    const thermalSlipData: ThermalSlipData = {
      clinicName: clinicDetails.clinic.name,
      clinicAddress: `${clinicDetails.clinic.addressLine}, ${clinicDetails.clinic.locality}, ${clinicDetails.clinic.city}`,
      clinicPhone: clinicDetails.clinic.contactPhone,
      chamber: dto.chamberNumber,
      chamberName: chamberInfo?.chamberName || dto.chamberNumber,
      doctorName: doctor.fullName,
      token: nextToken,
      tokenFormatted,
      patientName: dto.patientName.trim(),
      patientMaskedPhone: maskedPhone,
      feeRupees: resolvedFee,
      payment: dto.paymentMethod,
      receiptNumber,
      time: new Date().toLocaleTimeString('en-IN'),
    };

    return {
      appointment,
      thermalSlipData,
    };
  }

  /**
   * Helper alias returning Appointment directly
   */
  async walkInIntake(dto: CreateWalkInIntakeDTO): Promise<Appointment> {
    const res = await this.createWalkInIntake(dto);
    return res.appointment;
  }

  /**
   * Get Active Waiting Token Numbers for a Chamber
   */
  getWaitingTokensForChamber(clinicId: string, chamberNumber: string, date?: string): number[] {
    const targetDate = date || (new Date().toISOString().split('T')[0] as string);
    const tokens: number[] = [];

    for (const app of this.appointments.values()) {
      if (
        app.clinicId === clinicId &&
        app.chamberNumber === chamberNumber &&
        app.appointmentDate === targetDate &&
        (app.status === AppointmentStatus.WAITING || app.status === AppointmentStatus.ARRIVED)
      ) {
        tokens.push(app.tokenNumber);
      }
    }

    return tokens.sort((a, b) => a - b);
  }

  /**
   * Query All Active Appointments for a Clinic
   */
  getActiveAppointmentsForClinic(clinicId: string, date?: string): Appointment[] {
    const targetDate = date || (new Date().toISOString().split('T')[0] as string);
    const list: Appointment[] = [];

    for (const app of this.appointments.values()) {
      if (app.clinicId === clinicId && app.appointmentDate === targetDate) {
        list.push(app);
      }
    }

    return list.sort((a, b) => a.tokenNumber - b.tokenNumber);
  }

  /**
   * Alias: get appointments for a specific clinic and day
   */
  getAppointmentsForDay(clinicId: string, date: string): Appointment[] {
    return this.getActiveAppointmentsForClinic(clinicId, date);
  }

  /**
   * Retrieve Appointment by ID
   */
  async getAppointmentById(appointmentId: string): Promise<Appointment | null> {
    return this.appointments.get(appointmentId) || null;
  }

  /**
   * Update Appointment attributes
   */
  updateAppointment(appointmentId: string, patch: Partial<Appointment>): Appointment | null {
    const existing = this.appointments.get(appointmentId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.appointments.set(appointmentId, updated);
    return updated;
  }

  /**
   * Query Appointments for Doctor & Date
   */
  async getAppointmentsByDoctorAndDate(doctorId: string, date: string): Promise<Appointment[]> {
    const list: Appointment[] = [];
    for (const app of this.appointments.values()) {
      if (app.doctorId === doctorId && app.appointmentDate === date) {
        list.push(app);
      }
    }
    return list.sort((a, b) => a.tokenNumber - b.tokenNumber);
  }

  /**
   * Record Pre-Consultation Patient Vitals (Compounder Examination Prep)
   */
  recordVitals(
    appointmentId: string,
    vitals: PatientVitals,
    actor: {
      userId: string;
      role: UserRole;
      staffScope?: StaffScope;
      dedicatedDoctorId?: string;
    }
  ): Appointment {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }

    if (
      actor.staffScope === StaffScope.DOCTOR_DEDICATED &&
      actor.dedicatedDoctorId &&
      appointment.doctorId !== actor.dedicatedDoctorId
    ) {
      throw new Error(
        `Forbidden: Staff scope restricted to assigned doctor '${actor.dedicatedDoctorId}'. Cross-doctor vitals recording blocked.`
      );
    }

    const updatedVitals: PatientVitals = {
      ...vitals,
      recordedAt: new Date().toISOString(),
      recordedBy: actor.userId,
    };

    const updated = {
      ...appointment,
      vitals: updatedVitals,
      updatedAt: new Date().toISOString(),
    };

    this.appointments.set(appointmentId, updated);
    return updated;
  }

  /**
   * 1-Tap Queue Advancement: Call Next Waiting Patient
   */
  callNextPatient(
    clinicId: string,
    doctorId: string,
    chamberNumber: string,
    date?: string
  ): {
    completedAppointment: Appointment | null;
    servingAppointment: Appointment | null;
  } {
    const targetDate = date || (new Date().toISOString().split('T')[0] as string);
    const doctorAppts: Appointment[] = [];

    for (const app of this.appointments.values()) {
      if (
        app.clinicId === clinicId &&
        app.doctorId === doctorId &&
        app.appointmentDate === targetDate &&
        app.chamberNumber === chamberNumber
      ) {
        doctorAppts.push(app);
      }
    }

    // 1. If an appointment is currently in consultation, complete it
    let completedAppointment: Appointment | null = null;
    const currentServing = doctorAppts.find((a) => a.status === AppointmentStatus.IN_CONSULTATION);
    if (currentServing) {
      completedAppointment = {
        ...currentServing,
        status: AppointmentStatus.COMPLETED,
        actualEndTime: new Date().toLocaleTimeString('en-IN'),
        updatedAt: new Date().toISOString(),
      };
      this.appointments.set(completedAppointment.id, completedAppointment);
    }

    // 2. Find next waiting patient (sorted by 4-tier triage priority interleaving, then tokenNumber)
    const waitingAppts = doctorAppts.filter(
      (a) => a.status === AppointmentStatus.WAITING || a.status === AppointmentStatus.ARRIVED
    );

    waitingAppts.sort((a, b) => {
      const weightA = getTriageTierWeight(a.triageSeverity);
      const weightB = getTriageTierWeight(b.triageSeverity);
      if (weightA !== weightB) {
        return weightB - weightA;
      }
      return a.tokenNumber - b.tokenNumber;
    });

    let servingAppointment: Appointment | null = null;
    if (waitingAppts.length > 0) {
      const next = waitingAppts[0]!;
      servingAppointment = {
        ...next,
        status: AppointmentStatus.IN_CONSULTATION,
        actualStartTime: new Date().toLocaleTimeString('en-IN'),
        updatedAt: new Date().toISOString(),
      };
      this.appointments.set(servingAppointment.id, servingAppointment);
    }

    return {
      completedAppointment,
      servingAppointment,
    };
  }

  /**
   * Helper to seed/create an appointment directly (for testing & mock workflows)
   */
  public createAppointment(dto: Partial<Appointment> & {
    clinicId: string;
    doctorId: string;
    patientName: string;
    patientMobile: string;
  }): Appointment {
    const id = dto.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const appt: Appointment = {
      id,
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
      patientId: dto.patientId || `pat-${id.slice(0, 8)}`,
      slotId: dto.slotId,
      chamberNumber: dto.chamberNumber || 'CH-1',
      appointmentDate: dto.appointmentDate || (now.split('T')[0] as string),
      tokenNumber: dto.tokenNumber || 1,
      status: dto.status || AppointmentStatus.SCHEDULED,
      source: dto.source || BookingSource.WALK_IN,
      paymentStatus: dto.paymentStatus || PaymentStatus.PENDING_AT_DESK,
      amountRupees: dto.amountRupees || 500,
      triageSeverity: dto.triageSeverity || TriageSeverity.ROUTINE,
      patientName: dto.patientName,
      patientMobile: dto.patientMobile,
      patientAge: dto.patientAge,
      arrivedAt: dto.arrivedAt,
      actualStartTime: dto.actualStartTime,
      actualEndTime: dto.actualEndTime,
      cancellationReason: dto.cancellationReason,
      rescheduleEligibleUntil: dto.rescheduleEligibleUntil,
      rescheduledFromAppointmentId: dto.rescheduledFromAppointmentId,
      rescheduledToAppointmentId: dto.rescheduledToAppointmentId,
      isVipPriorityReschedule: dto.isVipPriorityReschedule,
      receiptNumber: dto.receiptNumber || `MB-TEST-${id.slice(0, 4)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.appointments.set(id, appt);
    return appt;
  }

  public getAllAppointments(): Appointment[] {
    return Array.from(this.appointments.values());
  }

  public addAppointment(appt: Appointment): void {
    this.appointments.set(appt.id, appt);
    if (appt.idempotencyKey) {
      this.idempotencyMap.set(appt.idempotencyKey, appt);
    }
  }

  public findByIdempotencyKey(key: string): Appointment | undefined {
    return this.idempotencyMap.get(key);
  }

  /**
   * Reset store for unit testing
   */
  public reset(): void {
    this.appointments.clear();
    this.idempotencyMap.clear();
    this.tokenCounters.clear();
  }
}

export const appointmentService = new AppointmentService();
