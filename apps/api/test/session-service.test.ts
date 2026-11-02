/**
 * MediBooking Enterprise Clinic Session Planner Test Suite
 * Tests recurring weekly sessions, variable specialty durations,
 * token quotas (walk-in vs online), and double-booking conflict protection.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { SessionService } from '../src/services/session-service';
import { DayOfWeek, SessionType } from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';

describe('Phase 7: Clinic Session Planner with Variable Durations & Token Caps', () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService();
  });

  describe('1. Default Seed Sessions', () => {
    it('should pre-populate default Bhopal polyclinic sessions from seed data', async () => {
      const sessions = await service.getSessionsByClinic(SEED_DATA.clinic.id);
      assert.ok(sessions.length >= 7, 'Should have at least 7 seeded sessions across doctors');

      const cardioMon = sessions.find(
        (s) => s.doctorId === SEED_DATA.doctors[0].doctorId && s.dayOfWeek === DayOfWeek.MONDAY
      );
      assert.ok(cardioMon, 'Should find Mon evening cardiology session');
      assert.strictEqual(cardioMon.chamberNumber, 'CH-1');
      assert.strictEqual(cardioMon.startTime, '18:00');
      assert.strictEqual(cardioMon.endTime, '20:30');
      assert.strictEqual(cardioMon.slotDurationMinutes, 15);
      assert.strictEqual(cardioMon.isActive, true);
    });

    it('should query sessions for a specific day of the week', async () => {
      const mondaySessions = await service.getSessionsByDay(SEED_DATA.clinic.id, DayOfWeek.MONDAY);
      assert.ok(mondaySessions.length >= 2, 'Should have multiple sessions on Monday evening');
      mondaySessions.forEach((s) => assert.strictEqual(s.dayOfWeek, DayOfWeek.MONDAY));
    });
  });

  describe('2. Time Math & Interval Overlaps', () => {
    it('should convert HH:mm strings to minutes from midnight', () => {
      assert.strictEqual(service.timeToMinutes('00:00'), 0);
      assert.strictEqual(service.timeToMinutes('09:30'), 570);
      assert.strictEqual(service.timeToMinutes('18:00'), 1080);
      assert.strictEqual(service.timeToMinutes('23:59'), 1439);
    });

    it('should reject invalid time strings', () => {
      assert.throws(() => service.timeToMinutes('invalid'), /Invalid time format/);
      assert.throws(() => service.timeToMinutes('25:00'), /Invalid time values/);
      assert.throws(() => service.timeToMinutes('12:65'), /Invalid time values/);
    });

    it('should accurately detect interval overlaps', () => {
      // 10:00 - 12:00 vs 11:00 - 13:00 -> Overlap
      assert.strictEqual(service.doIntervalsOverlap(600, 720, 660, 780), true);

      // 10:00 - 12:00 vs 12:00 - 14:00 -> Adjacent (No overlap in half-open [start, end))
      assert.strictEqual(service.doIntervalsOverlap(600, 720, 720, 840), false);

      // 10:00 - 12:00 vs 14:00 - 16:00 -> Disjoint
      assert.strictEqual(service.doIntervalsOverlap(600, 720, 840, 960), false);

      // 10:00 - 14:00 completely engulfs 11:00 - 12:00 -> Overlap
      assert.strictEqual(service.doIntervalsOverlap(600, 840, 660, 720), true);
    });
  });

  describe('3. Session Creation & Validation', () => {
    it('should successfully create a morning clinical session', async () => {
      const clinicId = crypto.randomUUID();
      const doctorId = crypto.randomUUID();

      const session = await service.createSession({
        clinicId,
        doctorId,
        chamberNumber: 'CH-1',
        dayOfWeek: DayOfWeek.TUESDAY,
        sessionType: SessionType.MORNING,
        startTime: '09:00',
        endTime: '12:00',
        slotDurationMinutes: 20,
        maxWalkInTokens: 5,
        maxOnlineSlots: 4,
      });

      assert.ok(session.id);
      assert.strictEqual(session.clinicId, clinicId);
      assert.strictEqual(session.doctorId, doctorId);
      assert.strictEqual(session.chamberNumber, 'CH-1');
      assert.strictEqual(session.dayOfWeek, DayOfWeek.TUESDAY);
      assert.strictEqual(session.sessionType, SessionType.MORNING);
      assert.strictEqual(session.slotDurationMinutes, 20);
      assert.strictEqual(session.maxWalkInTokens, 5);
      assert.strictEqual(session.maxOnlineSlots, 4);
      assert.strictEqual(session.isActive, true);
    });

    it('should reject session if startTime is equal to or later than endTime', async () => {
      await assert.rejects(
        async () => {
          await service.createSession({
            clinicId: crypto.randomUUID(),
            doctorId: crypto.randomUUID(),
            chamberNumber: 'CH-1',
            dayOfWeek: DayOfWeek.MONDAY,
            sessionType: SessionType.MORNING,
            startTime: '12:00',
            endTime: '10:00',
          });
        },
        {
          message: /must be strictly earlier than end time/,
        }
      );
    });

    it('should reject invalid dayOfWeek outside 1..7', async () => {
      await assert.rejects(
        async () => {
          await service.createSession({
            clinicId: crypto.randomUUID(),
            doctorId: crypto.randomUUID(),
            chamberNumber: 'CH-1',
            dayOfWeek: 9 as any,
            sessionType: SessionType.MORNING,
            startTime: '09:00',
            endTime: '12:00',
          });
        },
        {
          message: /dayOfWeek must be between 1/,
        }
      );
    });

    it('should reject invalid slotDurationMinutes <= 0', async () => {
      await assert.rejects(
        async () => {
          await service.createSession({
            clinicId: crypto.randomUUID(),
            doctorId: crypto.randomUUID(),
            chamberNumber: 'CH-1',
            dayOfWeek: DayOfWeek.WEDNESDAY,
            sessionType: SessionType.MORNING,
            startTime: '09:00',
            endTime: '12:00',
            slotDurationMinutes: 0,
          });
        },
        {
          message: /slotDurationMinutes must be greater than 0/,
        }
      );
    });
  });

  describe('4. Conflict & Overlap Protection', () => {
    it('should reject overlapping session for the same doctor on the same day', async () => {
      const doc = SEED_DATA.doctors[0]; // Dr. Rajesh Sharma has Mon 18:00 - 20:30

      await assert.rejects(
        async () => {
          await service.createSession({
            clinicId: SEED_DATA.clinic.id,
            doctorId: doc.doctorId,
            chamberNumber: 'CH-99', // Different chamber, but same doctor!
            dayOfWeek: DayOfWeek.MONDAY,
            sessionType: SessionType.EVENING,
            startTime: '19:00',
            endTime: '21:00',
          });
        },
        {
          message: /Doctor already has an overlapping active session/,
        }
      );
    });

    it('should allow same doctor to have morning and evening sessions on the same day', async () => {
      const doc = SEED_DATA.doctors[0]; // has Mon 18:00 - 20:30

      const morningSession = await service.createSession({
        clinicId: SEED_DATA.clinic.id,
        doctorId: doc.doctorId,
        chamberNumber: 'CH-1',
        dayOfWeek: DayOfWeek.MONDAY,
        sessionType: SessionType.MORNING,
        startTime: '09:00',
        endTime: '12:00',
      });

      assert.ok(morningSession.id);
      assert.strictEqual(morningSession.sessionType, SessionType.MORNING);
    });

    it('should reject overlapping session for different doctor in same chamber on same day', async () => {
      // Mon 18:00 - 20:30 in CH-1 is already occupied by Dr. Rajesh Sharma
      const otherDoctorId = crypto.randomUUID();

      await assert.rejects(
        async () => {
          await service.createSession({
            clinicId: SEED_DATA.clinic.id,
            doctorId: otherDoctorId,
            chamberNumber: 'CH-1', // Same chamber CH-1!
            dayOfWeek: DayOfWeek.MONDAY,
            sessionType: SessionType.EVENING,
            startTime: '18:30',
            endTime: '21:00',
          });
        },
        {
          message: /Chamber CH-1 already has an overlapping active session/,
        }
      );
    });
  });

  describe('5. Session Updates & Lifecycle', () => {
    it('should update slot duration and token quotas', async () => {
      const sessions = await service.getSessionsByClinic(SEED_DATA.clinic.id);
      const target = sessions[0];

      const updated = await service.updateSession(target.id, {
        slotDurationMinutes: 20,
        maxWalkInTokens: 10,
        maxOnlineSlots: 10,
      });

      assert.strictEqual(updated.slotDurationMinutes, 20);
      assert.strictEqual(updated.maxWalkInTokens, 10);
      assert.strictEqual(updated.maxOnlineSlots, 10);
    });

    it('should reject update if new time range causes overlap', async () => {
      const doc = SEED_DATA.doctors[0];
      // Create a morning session 09:00 - 11:00
      const morning = await service.createSession({
        clinicId: SEED_DATA.clinic.id,
        doctorId: doc.doctorId,
        chamberNumber: 'CH-1',
        dayOfWeek: DayOfWeek.FRIDAY, // Doc already has evening Friday 18:00 - 20:30
        sessionType: SessionType.MORNING,
        startTime: '09:00',
        endTime: '11:00',
      });

      // Attempt to shift morning session to 17:00 - 19:00 (overlaps with 18:00 - 20:30)
      await assert.rejects(
        async () => {
          await service.updateSession(morning.id, {
            startTime: '17:00',
            endTime: '19:00',
          });
        },
        {
          message: /Doctor already has an overlapping active session/,
        }
      );
    });

    it('should deactivate session successfully', async () => {
      const sessions = await service.getSessionsByClinic(SEED_DATA.clinic.id);
      const target = sessions[0];

      const deactivated = await service.deactivateSession(target.id);
      assert.strictEqual(deactivated.isActive, false);

      const activeList = await service.getSessionsByClinic(SEED_DATA.clinic.id, true);
      assert.strictEqual(
        activeList.some((s) => s.id === target.id),
        false
      );
    });

    it('should hard delete a session', async () => {
      const sessions = await service.getSessionsByClinic(SEED_DATA.clinic.id);
      const target = sessions[0];

      const result = await service.deleteSession(target.id);
      assert.strictEqual(result, true);

      const found = await service.getSessionById(target.id);
      assert.strictEqual(found, null);
    });
  });
});
