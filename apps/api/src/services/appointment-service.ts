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
} from '@medibooking/types';
import { slotService } from './slot-service';
import { slotLockManager } from './concurrency-engine';
import { affiliationService } from './affiliation-service';
import { clinicService } from './clinic-service';
import { doctorService } from './doctor-service';

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

    const resolvedFee =
      dto.amountRupees !== undefined
        ? dto.amountRupees
        : dto.triageSeverity === TriageSeverity.FOLLOW_UP
          ? affiliation.followUpFeeRupees
          : affiliation.consultationFeeRupees;

    // 4. Sequential Chamber Token Allocation
    const tokenKey = `${dto.clinicId}:${dto.doctorId}:${appointmentDate}`;
    const nextToken = (this.tokenCounters.get(tokenKey) || 0) + 1;
    this.tokenCounters.set(tokenKey, nextToken);

    // 5. Build Receipt Number & Patient Identity
    const cleanDate = appointmentDate.replace(/-/g, '');
    const receiptNumber = `MB-${cleanDate}-${dto.chamberNumber.replace('-', '')}-${nextToken.toString().padStart(3, '0')}`;
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
      source: BookingSource.WALK_IN,
      paymentStatus: dto.paymentMethod,
      amountRupees: resolvedFee,
      triageSeverity: dto.triageSeverity || TriageSeverity.ROUTINE,
      patientName: dto.patientName.trim(),
      patientMobile: dto.patientMobile.trim(),
      patientAge: dto.patientAge,
      receiptNumber,
      createdAt: now,
      updatedAt: now,
    };

    this.appointments.set(appointment.id, appointment);

    const thermalSlipData: ThermalSlipData = {
      clinicName: clinicDetails.clinic.name,
      clinicAddress: `${clinicDetails.clinic.addressLine}, ${clinicDetails.clinic.locality}, ${clinicDetails.clinic.city}`,
      clinicPhone: clinicDetails.clinic.contactPhone,
      chamber: dto.chamberNumber,
      chamberName: chamberInfo?.chamberName || dto.chamberNumber,
      doctorName: doctor.fullName,
      token: nextToken,
      tokenFormatted: `#${nextToken}`,
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
   * Retrieve Appointment by ID
   */
  async getAppointmentById(appointmentId: string): Promise<Appointment | null> {
    return this.appointments.get(appointmentId) || null;
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
   * Reset store for unit testing
   */
  public reset(): void {
    this.appointments.clear();
    this.idempotencyMap.clear();
    this.tokenCounters.clear();
  }
}

export const appointmentService = new AppointmentService();
