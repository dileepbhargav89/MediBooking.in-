import crypto from 'node:crypto';
import {
  Appointment,
  AppointmentStatus,
  UserRole,
  StaffScope,
  TransitionAppointmentDTO,
  AppointmentTransitionRecord,
  QueueTransitionResult,
} from '@medibooking/types';
import { appointmentService } from './appointment-service';
import { realtimeStreamManager } from './realtime-sse';

const TERMINAL_STATUSES = new Set<AppointmentStatus>([
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED_PATIENT,
  AppointmentStatus.CANCELLED_CLINIC,
  AppointmentStatus.NO_SHOW,
]);

export class QueueTransitionController {
  private transitionHistory: Map<string, AppointmentTransitionRecord[]> = new Map();

  /**
   * Transition appointment queue status with non-linear resilience
   */
  async transitionStatus(
    appointmentId: string,
    dto: TransitionAppointmentDTO,
    actor: {
      userId: string;
      role: UserRole;
      staffScope?: StaffScope;
      dedicatedDoctorId?: string;
    }
  ): Promise<QueueTransitionResult> {
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
        `Forbidden: Staff scope restricted to assigned doctor '${actor.dedicatedDoctorId}'. Cross-chamber status change forbidden.`
      );
    }

    const fromStatus = appointment.status;
    const toStatus = dto.status;

    // 2. Terminal State Locked Guard
    if (TERMINAL_STATUSES.has(fromStatus) && fromStatus !== toStatus) {
      if (!dto.allowReopen) {
        throw new Error(
          `TERMINAL_STATE_LOCKED: Cannot transition closed appointment from ${fromStatus} to ${toStatus} without allowReopen: true.`
        );
      }
    }

    const nowIso = new Date().toISOString();
    const nowTimeStr = new Date().toLocaleTimeString('en-IN');
    let autoBackfilledArrived = false;
    let autoCompletedPrevious: Appointment | null = null;

    const patch: Partial<Appointment> = {
      status: toStatus,
      updatedAt: nowIso,
    };

    // 3. Non-Linear State Logic
    // Case A: Direct call-in from SCHEDULED or ARRIVED into IN_CONSULTATION
    if (toStatus === AppointmentStatus.IN_CONSULTATION) {
      if (fromStatus === AppointmentStatus.SCHEDULED || !appointment.arrivedAt) {
        patch.arrivedAt = appointment.arrivedAt || nowIso;
        autoBackfilledArrived = true;
      }
      patch.actualStartTime = appointment.actualStartTime || nowTimeStr;

      // Chamber Single-Occupancy Invariant: Complete any currently serving patient in this chamber
      const dayAppts = appointmentService.getActiveAppointmentsForClinic(
        appointment.clinicId,
        appointment.appointmentDate
      );
      const currentlyServingOther = dayAppts.find(
        (a) =>
          a.id !== appointment.id &&
          a.doctorId === appointment.doctorId &&
          a.chamberNumber === appointment.chamberNumber &&
          a.status === AppointmentStatus.IN_CONSULTATION
      );

      if (currentlyServingOther) {
        autoCompletedPrevious = appointmentService.updateAppointment(currentlyServingOther.id, {
          status: AppointmentStatus.COMPLETED,
          actualEndTime: nowTimeStr,
          updatedAt: nowIso,
        });

        // Record audit for auto-completion
        this.appendAudit({
          id: `tr-${Date.now()}-${crypto.randomUUID().slice(0, 4)}`,
          appointmentId: currentlyServingOther.id,
          clinicId: currentlyServingOther.clinicId,
          fromStatus: AppointmentStatus.IN_CONSULTATION,
          toStatus: AppointmentStatus.COMPLETED,
          actorUserId: actor.userId,
          actorRole: actor.role,
          notes: `Auto-completed because Token #${appointment.tokenNumber} was called into chamber`,
          autoBackfilledArrived: false,
          timestamp: nowIso,
        });
      }
    }

    // Case B: Marking Arrived or Waiting
    if (toStatus === AppointmentStatus.ARRIVED || toStatus === AppointmentStatus.WAITING) {
      if (!appointment.arrivedAt) {
        patch.arrivedAt = nowIso;
      }
    }

    // Case C: Marking Completed (handles both standard completion and quick report review from WAITING)
    if (toStatus === AppointmentStatus.COMPLETED) {
      patch.actualEndTime = nowTimeStr;
      if (!appointment.actualStartTime) {
        patch.actualStartTime = appointment.arrivedAt || nowTimeStr;
      }
    }

    // 4. Persist updated appointment
    const updatedAppointment = appointmentService.updateAppointment(appointment.id, patch);
    if (!updatedAppointment) {
      throw new Error(`Failed to update appointment ${appointmentId}`);
    }

    // 5. Append Transition Audit Record
    const transitionRecord: AppointmentTransitionRecord = {
      id: `tr-${Date.now()}-${crypto.randomUUID().slice(0, 4)}`,
      appointmentId: updatedAppointment.id,
      clinicId: updatedAppointment.clinicId,
      fromStatus,
      toStatus,
      actorUserId: actor.userId,
      actorRole: actor.role,
      notes: dto.notes,
      autoBackfilledArrived,
      timestamp: nowIso,
    };
    this.appendAudit(transitionRecord);

    // 6. Broadcast Realtime TV Event
    if (toStatus === AppointmentStatus.IN_CONSULTATION) {
      realtimeStreamManager.broadcastChamberUpdate(
        updatedAppointment.clinicId,
        updatedAppointment.chamberNumber,
        {
          currentToken: updatedAppointment.tokenNumber,
          servingPatientMaskedName: `${updatedAppointment.patientName[0]}***`,
        }
      );
    } else if (fromStatus === AppointmentStatus.IN_CONSULTATION) {
      realtimeStreamManager.broadcastChamberUpdate(
        updatedAppointment.clinicId,
        updatedAppointment.chamberNumber,
        {
          currentToken: null,
          servingPatientMaskedName: null,
        }
      );
    }

    return {
      success: true,
      appointment: updatedAppointment,
      transitionRecord,
      autoCompletedPrevious,
      message: `Appointment successfully transitioned from ${fromStatus} to ${toStatus}${
        autoBackfilledArrived ? ' (arrival auto-backfilled)' : ''
      }`,
    };
  }

  private appendAudit(record: AppointmentTransitionRecord) {
    const list = this.transitionHistory.get(record.appointmentId) || [];
    list.push(record);
    this.transitionHistory.set(record.appointmentId, list);
  }

  getTransitions(appointmentId: string): AppointmentTransitionRecord[] {
    return this.transitionHistory.get(appointmentId) || [];
  }

  public reset(): void {
    this.transitionHistory.clear();
  }
}

export const queueTransitionController = new QueueTransitionController();
