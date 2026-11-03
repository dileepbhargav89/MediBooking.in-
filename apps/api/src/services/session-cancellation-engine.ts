/**
 * MediBooking Enterprise Doctor Emergency Session Cancellation & Slot Invalidation Engine
 * Bulk transitions active appointments, invalidates slots, alerts waiting room TV, and prepares VIP reschedule queue
 * (Phase 21)
 */

import crypto from 'node:crypto';
import {
  DoctorSessionCancellationDTO,
  SessionCancellationRecord,
  SessionCancellationResult,
  AppointmentStatus,
  UserRole,
  StaffScope,
} from '@medibooking/types';
import { appointmentService } from './appointment-service';
import { slotService } from './slot-service';
import { doctorService } from './doctor-service';
import { clinicService } from './clinic-service';
import { affiliationService } from './affiliation-service';
import { realtimeStreamManager } from './realtime-sse';

const ACTIVE_CANCELLABLE_STATUSES = new Set<AppointmentStatus>([
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.WAITING,
  AppointmentStatus.ARRIVED,
  AppointmentStatus.IN_CONSULTATION,
]);

export class SessionCancellationEngine {
  // Key: `${clinicId}:${doctorId}:${date}`
  private cancelledSessions: Map<string, SessionCancellationRecord> = new Map();
  private cancellationHistory: SessionCancellationRecord[] = [];

  /**
   * Cancel an entire doctor session for a specific date due to emergency
   */
  async cancelSession(
    dto: DoctorSessionCancellationDTO,
    actor: {
      userId: string;
      role: UserRole;
      staffScope?: StaffScope;
      dedicatedDoctorId?: string;
    }
  ): Promise<SessionCancellationResult> {
    if (!dto.cancellationReason || dto.cancellationReason.trim().length < 5) {
      throw new Error('A detailed cancellation reason (at least 5 characters) must be provided.');
    }

    // 1. Staff Scope Check
    if (
      actor.staffScope === StaffScope.DOCTOR_DEDICATED &&
      actor.dedicatedDoctorId &&
      dto.doctorId !== actor.dedicatedDoctorId
    ) {
      throw new Error(
        `Forbidden: Dedicated compounder scope restricted to doctor '${actor.dedicatedDoctorId}'. Cross-doctor session cancellation forbidden.`
      );
    }

    // 2. Validate Clinic & Doctor
    const clinic = await clinicService.getClinicById(dto.clinicId);
    if (!clinic) {
      throw new Error(`Clinic '${dto.clinicId}' not found.`);
    }

    const doctor = await doctorService.getDoctorById(dto.doctorId);
    if (!doctor) {
      throw new Error(`Doctor '${dto.doctorId}' not found.`);
    }

    // 3. Resolve Chamber
    const affiliation = await affiliationService.getAffiliation(dto.clinicId, dto.doctorId);
    const chamberNumber = affiliation?.chamberNumber || 'CH-1';

    const nowIso = new Date().toISOString();
    const windowDays = dto.rescheduleWindowDays || 14;
    const rescheduleExpiry = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000).toISOString();

    // 4. Invalidate bookable slots for this doctor on this date
    const invalidatedSlots = await slotService.invalidateDoctorSlotsForDate(
      dto.clinicId,
      dto.doctorId,
      dto.date
    );

    // 5. Bulk transition active appointments to CANCELLED_CLINIC
    const dayAppts = appointmentService.getActiveAppointmentsForClinic(dto.clinicId, dto.date);
    const doctorActiveAppts = dayAppts.filter(
      (a) => a.doctorId === dto.doctorId && ACTIVE_CANCELLABLE_STATUSES.has(a.status)
    );

    const cancelledIds: string[] = [];
    for (const appt of doctorActiveAppts) {
      appointmentService.updateAppointment(appt.id, {
        status: AppointmentStatus.CANCELLED_CLINIC,
        cancellationReason: dto.cancellationReason.trim(),
        rescheduleEligibleUntil: rescheduleExpiry,
        updatedAt: nowIso,
      });
      cancelledIds.push(appt.id);
    }

    // 6. Update Waiting Room TV Display with Emergency Banner
    realtimeStreamManager.broadcastChamberUpdate(dto.clinicId, chamberNumber, {
      delayMinutes: 0,
      currentToken: null,
      servingPatientMaskedName: null,
      statusMessage: `SESSION CANCELLED: ${doctor.fullName} consultation cancelled (${dto.cancellationReason.trim()})`,
    });

    // 7. Record Session Cancellation Audit
    const record: SessionCancellationRecord = {
      id: `cncl-${Date.now()}-${crypto.randomUUID().slice(0, 4)}`,
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
      chamberNumber,
      sessionDate: dto.date,
      cancellationReason: dto.cancellationReason.trim(),
      cancelledAppointmentsCount: cancelledIds.length,
      invalidatedSlotsCount: invalidatedSlots.length,
      actorUserId: actor.userId,
      actorRole: actor.role,
      timestamp: nowIso,
    };

    const sessionKey = `${dto.clinicId}:${dto.doctorId}:${dto.date}`;
    this.cancelledSessions.set(sessionKey, record);
    this.cancellationHistory.unshift(record);

    return {
      success: true,
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
      chamberNumber,
      sessionDate: dto.date,
      cancellationReason: dto.cancellationReason.trim(),
      cancelledAppointmentsCount: cancelledIds.length,
      invalidatedSlotsCount: invalidatedSlots.length,
      cancelledAppointmentIds: cancelledIds,
      message: `Emergency session cancellation executed for ${doctor.fullName} on ${dto.date}. ${cancelledIds.length} appointments cancelled, ${invalidatedSlots.length} slots invalidated.`,
      timestamp: nowIso,
    };
  }

  /**
   * Check if a session was cancelled for a doctor on a date
   */
  isSessionCancelled(clinicId: string, doctorId: string, date: string): boolean {
    return this.cancelledSessions.has(`${clinicId}:${doctorId}:${date}`);
  }

  /**
   * Get Session Cancellation Record
   */
  getCancellationRecord(clinicId: string, doctorId: string, date: string): SessionCancellationRecord | null {
    return this.cancelledSessions.get(`${clinicId}:${doctorId}:${date}`) || null;
  }

  /**
   * Get Cancellation Audit History
   */
  getCancellationHistory(clinicId: string, doctorId?: string): SessionCancellationRecord[] {
    return this.cancellationHistory.filter(
      (h) => h.clinicId === clinicId && (!doctorId || h.doctorId === doctorId)
    );
  }

  /**
   * Reset store for unit tests
   */
  reset(): void {
    this.cancelledSessions.clear();
    this.cancellationHistory = [];
  }
}

export const sessionCancellationEngine = new SessionCancellationEngine();
