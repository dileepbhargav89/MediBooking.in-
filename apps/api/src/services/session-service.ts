/**
 * MediBooking Enterprise Clinic Session Planner
 * Manages recurring weekly doctor schedules, variable specialty slot durations,
 * token quotas (walk-in vs online pre-booking), and double-booking conflict protection.
 */

import crypto from 'crypto';
import { ClinicSession, DayOfWeek, SessionType } from '@medibooking/types';
import { SEED_DATA, BHOPAL_10_CLINICS } from '@medibooking/database';

export interface CreateSessionDTO {
  clinicId: string;
  doctorId: string;
  chamberNumber: string;
  dayOfWeek: DayOfWeek;
  sessionType: SessionType;
  startTime: string; // HH:mm format, e.g. "18:00"
  endTime: string; // HH:mm format, e.g. "20:30"
  slotDurationMinutes?: number;
  maxWalkInTokens?: number;
  maxOnlineSlots?: number;
  bufferMinutes?: number;
}

export interface UpdateSessionDTO {
  chamberNumber?: string;
  dayOfWeek?: DayOfWeek;
  sessionType?: SessionType;
  startTime?: string;
  endTime?: string;
  slotDurationMinutes?: number;
  maxWalkInTokens?: number;
  maxOnlineSlots?: number;
  bufferMinutes?: number;
  isActive?: boolean;
}

export class SessionService {
  private sessions = new Map<string, ClinicSession>();

  constructor() {
    this.seedDefaultData();
  }

  /**
   * Parse HH:mm to minutes from midnight
   */
  public timeToMinutes(timeStr: string): number {
    const parts = timeStr.trim().split(':');
    const hStr = parts[0];
    const mStr = parts[1];
    if (parts.length < 2 || hStr === undefined || mStr === undefined) {
      throw new Error(`Invalid time format "${timeStr}". Expected HH:mm`);
    }
    const hours = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error(`Invalid time values in "${timeStr}". Must be between 00:00 and 23:59`);
    }
    return hours * 60 + minutes;
  }

  /**
   * Check if two intervals [startA, endA) and [startB, endB) overlap
   */
  public doIntervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
    return Math.max(startA, startB) < Math.min(endA, endB);
  }

  private seedDefaultData() {
    const defaultClinicId = SEED_DATA.clinic.id;

    // 1. Seed legacy sessions
    for (const doc of SEED_DATA.doctors) {
      if (doc.sessions && Array.isArray(doc.sessions)) {
        for (const s of doc.sessions) {
          const id = crypto.randomUUID();
          const session: ClinicSession = {
            id,
            clinicId: defaultClinicId,
            doctorId: doc.doctorId,
            chamberNumber: doc.chamberNumber,
            dayOfWeek: s.dayOfWeek,
            sessionType: s.sessionType,
            startTime: s.startTime,
            endTime: s.endTime,
            slotDurationMinutes: s.slotDurationMinutes || 15,
            maxWalkInTokens: Math.floor((s.maxTokens || 14) / 2),
            maxOnlineSlots: Math.ceil((s.maxTokens || 14) / 2),
            bufferMinutes: 0,
            isActive: true,
          };
          this.sessions.set(id, session);
        }
      }
    }

    // 2. Seed sessions across 10 Bhopal clinics
    for (const clinic of BHOPAL_10_CLINICS) {
      for (const doc of clinic.doctors) {
        if (doc.sessions && Array.isArray(doc.sessions)) {
          for (const s of doc.sessions) {
            const id = crypto.randomUUID();
            const session: ClinicSession = {
              id,
              clinicId: clinic.id,
              doctorId: doc.doctorId,
              chamberNumber: doc.chamberNumber,
              dayOfWeek: s.dayOfWeek,
              sessionType: s.sessionType,
              startTime: s.startTime,
              endTime: s.endTime,
              slotDurationMinutes: s.slotDurationMinutes || 15,
              maxWalkInTokens: Math.floor((s.maxTokens || 14) / 2),
              maxOnlineSlots: Math.ceil((s.maxTokens || 14) / 2),
              bufferMinutes: 0,
              isActive: true,
            };
            this.sessions.set(id, session);
          }
        }
      }
    }
  }

  /**
   * Create a recurring clinic session with strict validation & overlap checks
   */
  async createSession(dto: CreateSessionDTO): Promise<ClinicSession> {
    const startMins = this.timeToMinutes(dto.startTime);
    const endMins = this.timeToMinutes(dto.endTime);

    if (startMins >= endMins) {
      throw new Error(`Session start time (${dto.startTime}) must be strictly earlier than end time (${dto.endTime})`);
    }

    if (dto.dayOfWeek < 1 || dto.dayOfWeek > 7) {
      throw new Error(`dayOfWeek must be between 1 (Monday) and 7 (Sunday)`);
    }

    const slotDuration = dto.slotDurationMinutes !== undefined ? dto.slotDurationMinutes : 15;
    if (slotDuration <= 0) {
      throw new Error(`slotDurationMinutes must be greater than 0`);
    }

    const walkInQuota = dto.maxWalkInTokens !== undefined ? dto.maxWalkInTokens : 8;
    const onlineQuota = dto.maxOnlineSlots !== undefined ? dto.maxOnlineSlots : 8;
    if (walkInQuota < 0 || onlineQuota < 0) {
      throw new Error(`Quotas must be non-negative`);
    }

    // 1. Check doctor overlap (Doctor cannot be in two chambers at once on the same day)
    for (const s of this.sessions.values()) {
      if (s.isActive && s.doctorId === dto.doctorId && s.dayOfWeek === dto.dayOfWeek) {
        const existingStart = this.timeToMinutes(s.startTime);
        const existingEnd = this.timeToMinutes(s.endTime);
        if (this.doIntervalsOverlap(startMins, endMins, existingStart, existingEnd)) {
          throw new Error(
            `Doctor already has an overlapping active session (${s.startTime} - ${s.endTime}) on this day`
          );
        }
      }
    }

    // 2. Check chamber overlap (Chamber cannot be occupied by two sessions at once on the same day)
    for (const s of this.sessions.values()) {
      if (
        s.isActive &&
        s.clinicId === dto.clinicId &&
        s.chamberNumber === dto.chamberNumber &&
        s.dayOfWeek === dto.dayOfWeek
      ) {
        const existingStart = this.timeToMinutes(s.startTime);
        const existingEnd = this.timeToMinutes(s.endTime);
        if (this.doIntervalsOverlap(startMins, endMins, existingStart, existingEnd)) {
          throw new Error(
            `Chamber ${dto.chamberNumber} already has an overlapping active session (${s.startTime} - ${s.endTime}) on this day`
          );
        }
      }
    }

    const session: ClinicSession = {
      id: crypto.randomUUID(),
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
      chamberNumber: dto.chamberNumber,
      dayOfWeek: dto.dayOfWeek,
      sessionType: dto.sessionType,
      startTime: dto.startTime,
      endTime: dto.endTime,
      slotDurationMinutes: slotDuration,
      maxWalkInTokens: walkInQuota,
      maxOnlineSlots: onlineQuota,
      bufferMinutes: dto.bufferMinutes || 0,
      isActive: true,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Update session details with conflict detection
   */
  async updateSession(id: string, dto: UpdateSessionDTO): Promise<ClinicSession> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session with ID "${id}" not found`);
    }

    const targetDay = dto.dayOfWeek !== undefined ? dto.dayOfWeek : session.dayOfWeek;
    const targetStartStr = dto.startTime !== undefined ? dto.startTime : session.startTime;
    const targetEndStr = dto.endTime !== undefined ? dto.endTime : session.endTime;
    const targetChamber = dto.chamberNumber !== undefined ? dto.chamberNumber : session.chamberNumber;

    const startMins = this.timeToMinutes(targetStartStr);
    const endMins = this.timeToMinutes(targetEndStr);

    if (startMins >= endMins) {
      throw new Error(`Session start time (${targetStartStr}) must be strictly earlier than end time (${targetEndStr})`);
    }

    // Check overlap with other active sessions
    for (const [sId, s] of this.sessions.entries()) {
      if (sId === id || !s.isActive) continue;

      // Doctor overlap
      if (s.doctorId === session.doctorId && s.dayOfWeek === targetDay) {
        const sStart = this.timeToMinutes(s.startTime);
        const sEnd = this.timeToMinutes(s.endTime);
        if (this.doIntervalsOverlap(startMins, endMins, sStart, sEnd)) {
          throw new Error(`Doctor already has an overlapping active session (${s.startTime} - ${s.endTime}) on this day`);
        }
      }

      // Chamber overlap
      if (s.clinicId === session.clinicId && s.chamberNumber === targetChamber && s.dayOfWeek === targetDay) {
        const sStart = this.timeToMinutes(s.startTime);
        const sEnd = this.timeToMinutes(s.endTime);
        if (this.doIntervalsOverlap(startMins, endMins, sStart, sEnd)) {
          throw new Error(
            `Chamber ${targetChamber} already has an overlapping active session (${s.startTime} - ${s.endTime}) on this day`
          );
        }
      }
    }

    if (dto.chamberNumber !== undefined) session.chamberNumber = dto.chamberNumber;
    if (dto.dayOfWeek !== undefined) session.dayOfWeek = dto.dayOfWeek;
    if (dto.sessionType !== undefined) session.sessionType = dto.sessionType;
    if (dto.startTime !== undefined) session.startTime = dto.startTime;
    if (dto.endTime !== undefined) session.endTime = dto.endTime;
    if (dto.slotDurationMinutes !== undefined) {
      if (dto.slotDurationMinutes <= 0) throw new Error(`slotDurationMinutes must be greater than 0`);
      session.slotDurationMinutes = dto.slotDurationMinutes;
    }
    if (dto.maxWalkInTokens !== undefined) {
      if (dto.maxWalkInTokens < 0) throw new Error(`maxWalkInTokens must be non-negative`);
      session.maxWalkInTokens = dto.maxWalkInTokens;
    }
    if (dto.maxOnlineSlots !== undefined) {
      if (dto.maxOnlineSlots < 0) throw new Error(`maxOnlineSlots must be non-negative`);
      session.maxOnlineSlots = dto.maxOnlineSlots;
    }
    if (dto.bufferMinutes !== undefined) {
      if (dto.bufferMinutes < 0) throw new Error(`bufferMinutes must be non-negative`);
      session.bufferMinutes = dto.bufferMinutes;
    }
    if (dto.isActive !== undefined) session.isActive = dto.isActive;

    return session;
  }

  /**
   * Retrieve session by ID
   */
  async getSessionById(id: string): Promise<ClinicSession | null> {
    return this.sessions.get(id) || null;
  }

  /**
   * Retrieve all sessions for a clinic tenant
   */
  async getSessionsByClinic(clinicId: string, activeOnly = false): Promise<ClinicSession[]> {
    const list: ClinicSession[] = [];
    for (const s of this.sessions.values()) {
      if (s.clinicId === clinicId) {
        if (!activeOnly || s.isActive) {
          list.push(s);
        }
      }
    }
    return list;
  }

  /**
   * Retrieve sessions for a doctor across all clinics or for a specific clinic
   */
  async getSessionsByDoctor(doctorId: string, clinicId?: string, activeOnly = true): Promise<ClinicSession[]> {
    const list: ClinicSession[] = [];
    for (const s of this.sessions.values()) {
      if (s.doctorId === doctorId) {
        if (clinicId && s.clinicId !== clinicId) continue;
        if (!activeOnly || s.isActive) {
          list.push(s);
        }
      }
    }
    return list;
  }

  /**
   * Retrieve all sessions for a given clinic on a specific day of the week (1=Mon..7=Sun)
   */
  async getSessionsByDay(clinicId: string, dayOfWeek: DayOfWeek, activeOnly = true): Promise<ClinicSession[]> {
    const list: ClinicSession[] = [];
    for (const s of this.sessions.values()) {
      if (s.clinicId === clinicId && s.dayOfWeek === dayOfWeek) {
        if (!activeOnly || s.isActive) {
          list.push(s);
        }
      }
    }
    return list;
  }

  /**
   * Deactivate a session
   */
  async deactivateSession(id: string): Promise<ClinicSession> {
    return this.updateSession(id, { isActive: false });
  }

  /**
   * Hard delete session
   */
  async deleteSession(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  /**
   * Test helper: resets state back to default seed data
   */
  reset() {
    this.sessions.clear();
    this.seedDefaultData();
  }
}

export const sessionService = new SessionService();
