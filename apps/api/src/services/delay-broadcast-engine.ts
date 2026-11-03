/**
 * MediBooking Enterprise 1-Click Doctor Delay Broadcast Engine
 * Automatically recalculates downstream patient ETAs and synchronizes waiting room TV screens
 * (Phase 20)
 */

import crypto from 'node:crypto';
import {
  DoctorDelayBroadcastDTO,
  DelayBroadcastResult,
  DelayStatusRecord,
  DelayHistoryRecord,
  AppointmentStatus,
  UserRole,
  StaffScope,
} from '@medibooking/types';
import { appointmentService } from './appointment-service';
import { affiliationService } from './affiliation-service';
import { doctorService } from './doctor-service';
import { clinicService } from './clinic-service';
import { realtimeStreamManager } from './realtime-sse';

export class DelayBroadcastEngine {
  // Key: `${clinicId}:${doctorId}`
  private activeDelayStatuses: Map<string, DelayStatusRecord> = new Map();
  private delayHistory: DelayHistoryRecord[] = [];

  /**
   * Helper: Add minutes to time string (supports "HH:mm" 24h and "hh:mm A" 12h)
   */
  public addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
    if (!timeStr) return timeStr;

    const trimmed = timeStr.trim();
    const is12Hour = /AM|PM/i.test(trimmed);

    if (is12Hour) {
      const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return trimmed;

      let hours = parseInt(match[1]!, 10);
      const minutes = parseInt(match[2]!, 10);
      const meridiem = match[3]!.toUpperCase();

      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;

      const totalMins = (hours * 60 + minutes + minutesToAdd + 1440) % 1440;
      let newHours = Math.floor(totalMins / 60);
      const newMins = totalMins % 60;

      const newMeridiem = newHours >= 12 ? 'PM' : 'AM';
      let displayHours = newHours % 12;
      if (displayHours === 0) displayHours = 12;

      return `${displayHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')} ${newMeridiem}`;
    }

    // 24-hour HH:mm
    const parts = trimmed.split(':');
    if (parts.length < 2) return trimmed;

    const hours = parseInt(parts[0]!, 10);
    const minutes = parseInt(parts[1]!, 10);
    if (isNaN(hours) || isNaN(minutes)) return trimmed;

    const totalMins = (hours * 60 + minutes + minutesToAdd + 1440) % 1440;
    const newHours = Math.floor(totalMins / 60);
    const newMins = totalMins % 60;

    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  /**
   * 1-Click Delay Broadcast with Automatic Downstream ETA Recalculation
   */
  async broadcastDelay(
    dto: DoctorDelayBroadcastDTO,
    actor: {
      userId: string;
      role: UserRole;
      staffScope?: StaffScope;
      dedicatedDoctorId?: string;
    }
  ): Promise<DelayBroadcastResult> {
    if (dto.delayMinutes < 0 || dto.delayMinutes > 240) {
      throw new Error(`Invalid delayMinutes (${dto.delayMinutes}). Must be between 0 and 240 minutes.`);
    }

    // 1. Staff Scope Check
    if (
      actor.staffScope === StaffScope.DOCTOR_DEDICATED &&
      actor.dedicatedDoctorId &&
      dto.doctorId !== actor.dedicatedDoctorId
    ) {
      throw new Error(
        `Forbidden: Dedicated compounder scope restricted to doctor '${actor.dedicatedDoctorId}'. Cross-doctor delay broadcast forbidden.`
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

    const isDelayActive = dto.delayMinutes > 0;
    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0] as string;

    // 4. Construct human-readable reason message
    let reasonMessage = '';
    if (isDelayActive) {
      const reasonLabel = dto.reasonOption
        ? dto.reasonOption.replace(/_/g, ' ').toLowerCase()
        : 'hospital rounds';
      reasonMessage = dto.customNote
        ? `${doctor.fullName} delayed by ${dto.delayMinutes} mins (${dto.customNote})`
        : `${doctor.fullName} delayed by ${dto.delayMinutes} mins due to ${reasonLabel}`;
    } else {
      reasonMessage = `${doctor.fullName} consultation is running on schedule`;
    }

    // 5. Downstream ETA Recalculation for Active Appointments Today
    const dayAppts = appointmentService.getActiveAppointmentsForClinic(dto.clinicId, today);
    const doctorWaitingAppts = dayAppts.filter(
      (a) =>
        a.doctorId === dto.doctorId &&
        (a.status === AppointmentStatus.SCHEDULED ||
          a.status === AppointmentStatus.WAITING ||
          a.status === AppointmentStatus.ARRIVED)
    );

    const recalculatedList: Array<{
      id: string;
      tokenNumber: number;
      patientName: string;
      oldEstimatedTime?: string;
      newEstimatedTime?: string;
    }> = [];

    for (const appt of doctorWaitingAppts) {
      const baselineTime = appt.estimatedConsultTime || appt.actualStartTime || '18:00';
      const updatedTime = this.addMinutesToTimeString(baselineTime, dto.delayMinutes);

      appointmentService.updateAppointment(appt.id, {
        estimatedConsultTime: updatedTime,
        updatedAt: nowIso,
      });

      recalculatedList.push({
        id: appt.id,
        tokenNumber: appt.tokenNumber,
        patientName: appt.patientName,
        oldEstimatedTime: appt.estimatedConsultTime,
        newEstimatedTime: updatedTime,
      });
    }

    // 6. Update Waiting Room TV Display & Realtime Stream
    realtimeStreamManager.broadcastDoctorDelay(
      dto.clinicId,
      dto.doctorId,
      dto.delayMinutes,
      dto.reasonOption as any
    );

    // 7. Update Delay Status Store
    const statusKey = `${dto.clinicId}:${dto.doctorId}`;
    const statusRecord: DelayStatusRecord = {
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
      chamberNumber,
      isDelayActive,
      delayMinutes: dto.delayMinutes,
      reasonMessage,
      activatedAt: isDelayActive ? nowIso : undefined,
      updatedAt: nowIso,
    };
    this.activeDelayStatuses.set(statusKey, statusRecord);

    // 8. Record Delay History Audit
    const historyEntry: DelayHistoryRecord = {
      id: `dly-${Date.now()}-${crypto.randomUUID().slice(0, 4)}`,
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
      chamberNumber,
      delayMinutes: dto.delayMinutes,
      reasonOption: dto.reasonOption,
      customNote: dto.customNote,
      actorUserId: actor.userId,
      actorRole: actor.role,
      affectedCount: recalculatedList.length,
      timestamp: nowIso,
    };
    this.delayHistory.unshift(historyEntry);

    return {
      success: true,
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
      chamberNumber,
      delayMinutes: dto.delayMinutes,
      isDelayActive,
      reasonMessage,
      affectedAppointmentsCount: recalculatedList.length,
      recalculatedAppointments: recalculatedList,
      broadcastTimestamp: nowIso,
      message: isDelayActive
        ? `Delay broadcast of ${dto.delayMinutes} mins activated across chamber ${chamberNumber} and waiting room screens (${recalculatedList.length} patient ETAs adjusted)`
        : `Delay cleared for chamber ${chamberNumber}. Consultations marked on time.`,
    };
  }

  /**
   * Get Active Delay Status for a Doctor in a Clinic
   */
  getDelayStatus(clinicId: string, doctorId: string): DelayStatusRecord | null {
    const key = `${clinicId}:${doctorId}`;
    return this.activeDelayStatuses.get(key) || null;
  }

  /**
   * Get Delay Broadcast Audit History
   */
  getDelayHistory(clinicId: string, doctorId?: string): DelayHistoryRecord[] {
    return this.delayHistory.filter(
      (h) => h.clinicId === clinicId && (!doctorId || h.doctorId === doctorId)
    );
  }

  /**
   * Reset store for unit tests
   */
  reset(): void {
    this.activeDelayStatuses.clear();
    this.delayHistory = [];
  }
}

export const delayBroadcastEngine = new DelayBroadcastEngine();
