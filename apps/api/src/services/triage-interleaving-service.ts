/**
 * MediBooking Enterprise Front-Desk Emergency Override & Triage Urgency Priority Interleaving Engine
 * (Phase 19)
 */

import crypto from 'node:crypto';
import {
  Appointment,
  AppointmentStatus,
  TriageSeverity,
  TriageUpdateDTO,
  TriageAuditRecord,
  InterleavedQueueItem,
  UserRole,
  StaffScope,
} from '@medibooking/types';
import { appointmentService } from './appointment-service';
import { realtimeStreamManager } from './realtime-sse';

export function getTriageTierWeight(severity?: TriageSeverity): number {
  switch (severity) {
    case TriageSeverity.EMERGENCY:
      return 100;
    case TriageSeverity.URGENT_TRIAGE:
      return 80;
    case TriageSeverity.POST_OP:
      return 50;
    case TriageSeverity.ROUTINE:
    case TriageSeverity.FOLLOW_UP:
    default:
      return 10;
  }
}

export class TriageInterleavingService {
  private auditRecords: Map<string, TriageAuditRecord[]> = new Map();

  /**
   * Escalate or adjust triage urgency for an appointment with clinical justification
   */
  async escalateTriage(
    appointmentId: string,
    dto: TriageUpdateDTO,
    actor: {
      userId: string;
      role: UserRole;
      staffScope?: StaffScope;
      dedicatedDoctorId?: string;
    }
  ): Promise<{
    appointment: Appointment;
    auditRecord: TriageAuditRecord;
    message: string;
  }> {
    const appointment = await appointmentService.getAppointmentById(appointmentId);
    if (!appointment) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }

    // 1. Staff Scope Check
    if (
      actor.staffScope === StaffScope.DOCTOR_DEDICATED &&
      actor.dedicatedDoctorId &&
      appointment.doctorId !== actor.dedicatedDoctorId
    ) {
      throw new Error(
        `Forbidden: Staff scope restricted to doctor '${actor.dedicatedDoctorId}'. Cross-doctor triage update forbidden.`
      );
    }

    if (!dto.clinicalJustification || dto.clinicalJustification.trim().length === 0) {
      throw new Error('Clinical justification is required for triage escalation.');
    }

    const fromSeverity = appointment.triageSeverity || TriageSeverity.ROUTINE;
    const toSeverity = dto.triageSeverity;
    const nowIso = new Date().toISOString();

    // 2. Persist update on appointment
    const updated = appointmentService.updateAppointment(appointment.id, {
      triageSeverity: toSeverity,
      updatedAt: nowIso,
    });

    if (!updated) {
      throw new Error(`Failed to update appointment ${appointmentId}`);
    }

    // 3. Create Audit Record
    const auditRecord: TriageAuditRecord = {
      id: `trg-${Date.now()}-${crypto.randomUUID().slice(0, 4)}`,
      appointmentId: updated.id,
      clinicId: updated.clinicId,
      doctorId: updated.doctorId,
      chamberNumber: updated.chamberNumber,
      tokenNumber: updated.tokenNumber,
      fromSeverity,
      toSeverity,
      clinicalJustification: dto.clinicalJustification.trim(),
      actorUserId: actor.userId,
      actorRole: actor.role,
      timestamp: nowIso,
    };

    const history = this.auditRecords.get(updated.id) || [];
    history.push(auditRecord);
    this.auditRecords.set(updated.id, history);

    // 4. Broadcast Realtime TV Event
    realtimeStreamManager.broadcastChamberUpdate(updated.clinicId, updated.chamberNumber, {
      statusMessage:
        toSeverity === TriageSeverity.EMERGENCY || toSeverity === TriageSeverity.URGENT_TRIAGE
          ? `EMERGENCY ALERT: Token #${updated.tokenNumber} prioritized`
          : undefined,
    });

    return {
      appointment: updated,
      auditRecord,
      message: `Triage severity updated from ${fromSeverity} to ${toSeverity} for Token #${updated.tokenNumber}`,
    };
  }

  /**
   * Sort waiting appointments by triage priority tier (descending) then token number (ascending)
   */
  getInterleavedQueue(
    clinicId: string,
    chamberNumber: string,
    date?: string
  ): {
    clinicId: string;
    chamberNumber: string;
    doctorId: string | null;
    currentServing: Appointment | null;
    waitingCount: number;
    emergencyCount: number;
    queue: InterleavedQueueItem[];
  } {
    const targetDate = date || (new Date().toISOString().split('T')[0] as string);
    const dayAppts = appointmentService.getActiveAppointmentsForClinic(clinicId, targetDate);

    const chamberAppts = dayAppts.filter((a) => a.chamberNumber === chamberNumber);
    const currentServing =
      chamberAppts.find((a) => a.status === AppointmentStatus.IN_CONSULTATION) || null;

    const doctorId = chamberAppts[0]?.doctorId || null;

    const waitingAppts = chamberAppts.filter(
      (a) => a.status === AppointmentStatus.WAITING || a.status === AppointmentStatus.ARRIVED
    );

    // Two-level comparator:
    // Level 1: Triage weight descending (EMERGENCY 100 > URGENT 80 > POST_OP 50 > ROUTINE/FOLLOW_UP 10)
    // Level 2: Token number ascending (FIFO within same triage tier)
    waitingAppts.sort((a, b) => {
      const weightA = getTriageTierWeight(a.triageSeverity);
      const weightB = getTriageTierWeight(b.triageSeverity);
      if (weightA !== weightB) {
        return weightB - weightA;
      }
      return a.tokenNumber - b.tokenNumber;
    });

    let emergencyCount = 0;
    const queue: InterleavedQueueItem[] = waitingAppts.map((appt, idx) => {
      const isEmergency =
        appt.triageSeverity === TriageSeverity.EMERGENCY ||
        appt.triageSeverity === TriageSeverity.URGENT_TRIAGE;
      if (isEmergency) {
        emergencyCount++;
      }

      return {
        appointment: appt,
        priorityRank: idx + 1,
        triageTierWeight: getTriageTierWeight(appt.triageSeverity),
        isEmergencyInterleaved: isEmergency,
        estimatedWaitMinutes: (idx + 1) * 15,
      };
    });

    return {
      clinicId,
      chamberNumber,
      doctorId,
      currentServing,
      waitingCount: queue.length,
      emergencyCount,
      queue,
    };
  }

  /**
   * Get Triage Audit History for an Appointment
   */
  getTriageAuditHistory(appointmentId: string): TriageAuditRecord[] {
    return this.auditRecords.get(appointmentId) || [];
  }

  /**
   * Reset store for testing
   */
  reset(): void {
    this.auditRecords.clear();
  }
}

export const triageInterleavingService = new TriageInterleavingService();
