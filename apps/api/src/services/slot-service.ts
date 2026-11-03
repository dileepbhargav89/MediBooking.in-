/**
 * MediBooking Enterprise Availability Slot Generation Engine
 * Generates discrete bookable time windows from weekly recurring sessions,
 * partitions walk-in vs online quotas, and enforces database range overlap prevention.
 */

import crypto from 'crypto';
import { AvailabilitySlot, SlotStatus, DayOfWeek } from '@medibooking/types';
import { sessionService } from './session-service';
import { slotLockManager } from './concurrency-engine';

export interface GenerateSlotsDTO {
  clinicId: string;
  doctorId?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (defaults to startDate)
}

export class SlotService {
  // Key: slotId
  private slots = new Map<string, AvailabilitySlot>();

  /**
   * Helper: Convert Date object to day-of-week integer (1=Mon..7=Sun)
   */
  public getDayOfWeek(dateStr: string): DayOfWeek {
    const d = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid date string "${dateStr}". Expected YYYY-MM-DD`);
    }
    const jsDay = d.getUTCDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    return (jsDay === 0 ? 7 : jsDay) as DayOfWeek;
  }

  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  /**
   * Slices a session into discrete slots for a target date
   */
  async generateSlotsForDate(
    clinicId: string,
    doctorId: string,
    dateStr: string
  ): Promise<AvailabilitySlot[]> {
    const dayOfWeek = this.getDayOfWeek(dateStr);
    const sessions = await sessionService.getSessionsByDoctor(doctorId, clinicId, true);
    const daySessions = sessions.filter((s) => s.dayOfWeek === dayOfWeek);

    if (daySessions.length === 0) {
      return [];
    }

    const generated: AvailabilitySlot[] = [];

    for (const session of daySessions) {
      const startMins = sessionService.timeToMinutes(session.startTime);
      const endMins = sessionService.timeToMinutes(session.endTime);
      const duration = session.slotDurationMinutes;

      let slotIndex = 0;
      for (let t = startMins; t + duration <= endMins; t += duration) {
        const startH = Math.floor(t / 60);
        const startM = t % 60;
        const endH = Math.floor((t + duration) / 60);
        const endM = (t + duration) % 60;

        const startTimeStr = `${dateStr}T${this.pad(startH)}:${this.pad(startM)}:00+05:30`;
        const endTimeStr = `${dateStr}T${this.pad(endH)}:${this.pad(endM)}:00+05:30`;

        // Range Overlap / Duplicate Check:
        // Enforce exclusion constraint: doctor cannot have two slots overlapping on same date
        let hasConflict = false;
        for (const existing of this.slots.values()) {
          if (
            existing.clinicId === clinicId &&
            existing.doctorId === doctorId &&
            existing.slotDate === dateStr
          ) {
            const exStartMins = this.getSlotMinutes(existing.startTime);
            const exEndMins = this.getSlotMinutes(existing.endTime);
            if (sessionService.doIntervalsOverlap(t, t + duration, exStartMins, exEndMins)) {
              hasConflict = true;
              break;
            }
          }
        }

        if (hasConflict) {
          continue; // Skip overlapping slot (idempotent / exclusion constraint)
        }

        // Quota assignment:
        // First maxWalkInTokens reserved for walk-ins; subsequent slots available online
        let status: SlotStatus = SlotStatus.AVAILABLE;
        if (slotIndex < session.maxWalkInTokens) {
          status = SlotStatus.WALK_IN_RESERVED;
        }

        const slot: AvailabilitySlot = {
          id: `slot-${clinicId.slice(0, 4)}-${doctorId.slice(0, 4)}-${dateStr}-${this.pad(startH)}${this.pad(startM)}`,
          clinicId,
          doctorId,
          sessionId: session.id,
          chamberNumber: session.chamberNumber,
          slotDate: dateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          status,
        };

        this.slots.set(slot.id, slot);
        generated.push(slot);
        slotIndex++;
      }
    }

    return generated;
  }

  /**
   * Batch generation across a date range
   */
  async generateSlotsForDateRange(
    clinicId: string,
    startDateStr: string,
    endDateStr: string,
    doctorId?: string
  ): Promise<AvailabilitySlot[]> {
    const start = new Date(startDateStr + 'T00:00:00Z');
    const end = new Date(endDateStr + 'T00:00:00Z');

    if (start.getTime() > end.getTime()) {
      throw new Error(`startDate (${startDateStr}) must be before or equal to endDate (${endDateStr})`);
    }

    const allGenerated: AvailabilitySlot[] = [];
    const current = new Date(start);

    while (current.getTime() <= end.getTime()) {
      const dateParts = current.toISOString().split('T');
      const dateStr = dateParts[0] || startDateStr;

      if (doctorId) {
        const slots = await this.generateSlotsForDate(clinicId, doctorId, dateStr);
        allGenerated.push(...slots);
      } else {
        const sessions = await sessionService.getSessionsByClinic(clinicId, true);
        const uniqueDoctors = Array.from(new Set(sessions.map((s) => s.doctorId)));
        for (const docId of uniqueDoctors) {
          const slots = await this.generateSlotsForDate(clinicId, docId, dateStr);
          allGenerated.push(...slots);
        }
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    return allGenerated;
  }

  /**
   * Retrieves all slots for date, auto-generating if absent, and applying real-time mutex lock state
   */
  async getSlotsByDate(clinicId: string, doctorId: string, dateStr: string): Promise<AvailabilitySlot[]> {
    let daySlots: AvailabilitySlot[] = [];

    for (const slot of this.slots.values()) {
      if (slot.clinicId === clinicId && slot.doctorId === doctorId && slot.slotDate === dateStr) {
        daySlots.push(slot);
      }
    }

    // Auto-generate if not yet materialized
    if (daySlots.length === 0) {
      await this.generateSlotsForDate(clinicId, doctorId, dateStr);
      for (const slot of this.slots.values()) {
        if (slot.clinicId === clinicId && slot.doctorId === doctorId && slot.slotDate === dateStr) {
          daySlots.push(slot);
        }
      }
    }

    // Sort by startTime
    daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Decorate with real-time lock status
    return daySlots.map((slot) => {
      const isLocked = slotLockManager.isLocked(slot.id);
      if (isLocked && slot.status === SlotStatus.AVAILABLE) {
        return {
          ...slot,
          status: SlotStatus.LOCKED,
        };
      }
      return slot;
    });
  }

  /**
   * Retrieves all slots for a doctor across all clinics or a specified clinic for a date
   */
  async getSlotsByDoctor(doctorId: string, dateStr: string, clinicId?: string): Promise<AvailabilitySlot[]> {
    if (clinicId) {
      return this.getSlotsByDate(clinicId, doctorId, dateStr);
    }
    const sessions = await sessionService.getSessionsByDoctor(doctorId, undefined, true);
    const clinicIds = Array.from(new Set(sessions.map((s) => s.clinicId)));
    const allSlots: AvailabilitySlot[] = [];
    for (const cid of clinicIds) {
      const slots = await this.getSlotsByDate(cid, doctorId, dateStr);
      allSlots.push(...slots);
    }
    allSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return allSlots;
  }

  /**
   * Retrieves only bookable online slots
   */
  async getAvailableSlots(clinicId: string, doctorId: string, dateStr: string): Promise<AvailabilitySlot[]> {
    const slots = await this.getSlotsByDate(clinicId, doctorId, dateStr);
    return slots.filter((s) => s.status === SlotStatus.AVAILABLE);
  }

  /**
   * Retrieve single slot by ID
   */
  async getSlotById(slotId: string): Promise<AvailabilitySlot | null> {
    const slot = this.slots.get(slotId);
    if (!slot) return null;

    const isLocked = slotLockManager.isLocked(slot.id);
    if (isLocked && slot.status === SlotStatus.AVAILABLE) {
      return { ...slot, status: SlotStatus.LOCKED };
    }
    return slot;
  }

  /**
   * Block a slot from booking (e.g. for doctor delay or emergency)
   */
  async blockSlot(slotId: string): Promise<AvailabilitySlot> {
    const slot = this.slots.get(slotId);
    if (!slot) {
      throw new Error(`Slot with ID "${slotId}" not found`);
    }
    slot.status = SlotStatus.BLOCKED;
    return slot;
  }

  /**
   * Unblock slot
   */
  async unblockSlot(slotId: string): Promise<AvailabilitySlot> {
    const slot = this.slots.get(slotId);
    if (!slot) {
      throw new Error(`Slot with ID "${slotId}" not found`);
    }
    slot.status = SlotStatus.AVAILABLE;
    return slot;
  }

  /**
   * Updates the status of an existing slot (e.g. marked as BOOKED)
   */
  async updateSlotStatus(slotId: string, status: SlotStatus): Promise<AvailabilitySlot> {
    const slot = this.slots.get(slotId);
    if (!slot) {
      throw new Error(`Slot with ID "${slotId}" not found`);
    }
    slot.status = status;
    return slot;
  }

  /**
   * Manually register or set a slot (useful for testing or direct reservations)
   */
  registerSlot(slot: AvailabilitySlot) {
    this.slots.set(slot.id, slot);
  }

  /**
   * Invalidates / cancels all active slots for a doctor on a specific date (Phase 21)
   */
  async invalidateDoctorSlotsForDate(
    clinicId: string,
    doctorId: string,
    dateStr: string
  ): Promise<AvailabilitySlot[]> {
    const affected: AvailabilitySlot[] = [];
    for (const slot of this.slots.values()) {
      if (
        slot.clinicId === clinicId &&
        slot.doctorId === doctorId &&
        slot.slotDate === dateStr
      ) {
        slot.status = SlotStatus.CANCELLED;
        await slotLockManager.releaseLock(slot.id, slot.lockedBySessionId || 'emergency-cancellation');
        affected.push(slot);
      }
    }
    return affected;
  }

  private getSlotMinutes(timeStr: string): number {
    const timePart = timeStr.includes('T') ? (timeStr.split('T')[1]?.slice(0, 5) || '00:00') : timeStr;
    return sessionService.timeToMinutes(timePart);
  }

  reset() {
    this.slots.clear();
  }
}

export const slotService = new SlotService();
