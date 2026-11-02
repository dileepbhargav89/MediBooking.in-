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
