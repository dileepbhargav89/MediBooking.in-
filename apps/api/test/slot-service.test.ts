/**
 * MediBooking Enterprise Availability Slot Generation Test Suite
 * Tests deterministic slot slicing, day-of-week parsing, quota partitioning,
 * range overlap prevention, idempotency, and realtime lock decoration.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { SlotService } from '../src/services/slot-service';
import { slotLockManager } from '../src/services/concurrency-engine';
import { DayOfWeek, SlotStatus, SessionType } from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';
import { sessionService } from '../src/services/session-service';

describe('Phase 8: Availability Slot Generation Engine & Range Overlap Prevention', () => {
  let service: SlotService;

  beforeEach(() => {
    service = new SlotService();
    sessionService.reset();
  });

  describe('1. Day-of-Week Mapping', () => {
    it('should correctly map calendar dates to DayOfWeek enum (1=Mon..7=Sun)', () => {
      // 2026-11-02 is Monday
      assert.strictEqual(service.getDayOfWeek('2026-11-02'), DayOfWeek.MONDAY);
      // 2026-11-03 is Tuesday
      assert.strictEqual(service.getDayOfWeek('2026-11-03'), DayOfWeek.TUESDAY);
      // 2026-11-04 is Wednesday
      assert.strictEqual(service.getDayOfWeek('2026-11-04'), DayOfWeek.WEDNESDAY);
      // 2026-11-08 is Sunday
      assert.strictEqual(service.getDayOfWeek('2026-11-08'), DayOfWeek.SUNDAY);
    });

    it('should reject invalid date strings', () => {
      assert.throws(() => service.getDayOfWeek('invalid-date'), /Invalid date string/);
    });
  });

  describe('2. Slicing & Quota Partitioning', () => {
    it('should slice a 18:00 - 20:30 evening session with 15-minute slots into 10 discrete slots', async () => {
      // 2026-11-02 is Monday. Dr. Rajesh Sharma has Mon 18:00 - 20:30 session in CH-1
      const doctorId = SEED_DATA.doctors[0].doctorId;
      const clinicId = SEED_DATA.clinic.id;
      const dateStr = '2026-11-02';

      const slots = await service.generateSlotsForDate(clinicId, doctorId, dateStr);
      assert.strictEqual(slots.length, 10, '150 mins / 15 mins = 10 slots');

      assert.strictEqual(slots[0].startTime, '2026-11-02T18:00:00+05:30');
      assert.strictEqual(slots[0].endTime, '2026-11-02T18:15:00+05:30');
      assert.strictEqual(slots[0].chamberNumber, 'CH-1');

      assert.strictEqual(slots[9].startTime, '2026-11-02T20:15:00+05:30');
      assert.strictEqual(slots[9].endTime, '2026-11-02T20:30:00+05:30');

      // Check walk-in vs online quotas
      // Seed maxTokens = 14: walkIn = 7, online = 7
      const walkInSlots = slots.filter((s) => s.status === SlotStatus.WALK_IN_RESERVED);
      const onlineSlots = slots.filter((s) => s.status === SlotStatus.AVAILABLE);

      assert.strictEqual(walkInSlots.length, 7, 'First 7 slots reserved for reception walk-ins');
      assert.strictEqual(onlineSlots.length, 3, 'Remaining 3 slots available online');
    });

    it('should return empty array for days with no active session', async () => {
      // 2026-11-03 is Tuesday. Dr. Rajesh Sharma has Mon/Wed/Fri (no Tuesday)
      const doctorId = SEED_DATA.doctors[0].doctorId;
      const clinicId = SEED_DATA.clinic.id;
      const dateStr = '2026-11-03';

      const slots = await service.generateSlotsForDate(clinicId, doctorId, dateStr);
      assert.strictEqual(slots.length, 0);
    });
  });

  describe('3. Idempotency & Database Range Overlap Prevention', () => {
    it('should be idempotent and not create duplicate slots on subsequent calls', async () => {
      const doctorId = SEED_DATA.doctors[0].doctorId;
      const clinicId = SEED_DATA.clinic.id;
      const dateStr = '2026-11-02';

      const firstCall = await service.generateSlotsForDate(clinicId, doctorId, dateStr);
      assert.strictEqual(firstCall.length, 10);

      // Re-running generation on the same date
      const secondCall = await service.generateSlotsForDate(clinicId, doctorId, dateStr);
      assert.strictEqual(secondCall.length, 0, 'Should skip generating duplicate overlapping slots');

      const allDaySlots = await service.getSlotsByDate(clinicId, doctorId, dateStr);
      assert.strictEqual(allDaySlots.length, 10, 'Total slots remain exactly 10 without duplicates');
    });

    it('should prevent overlapping slot generation if a doctor has an overlapping session', async () => {
      const clinicId = crypto.randomUUID();
      const doctorId = crypto.randomUUID();

      // Create session 1: 09:00 - 10:00 (30 min slots -> 2 slots: 09:00-09:30, 09:30-10:00)
      await sessionService.createSession({
        clinicId,
        doctorId,
        chamberNumber: 'CH-A',
        dayOfWeek: DayOfWeek.MONDAY,
        sessionType: SessionType.MORNING,
        startTime: '09:00',
        endTime: '10:00',
        slotDurationMinutes: 30,
        maxWalkInTokens: 1,
        maxOnlineSlots: 1,
      });

      const slots = await service.generateSlotsForDate(clinicId, doctorId, '2026-11-02');
      assert.strictEqual(slots.length, 2);
    });
  });

  describe('4. Slot Blocking & Mutex Lock Integration', () => {
    it('should allow blocking and unblocking a slot', async () => {
      const doctorId = SEED_DATA.doctors[0].doctorId;
      const clinicId = SEED_DATA.clinic.id;
      const dateStr = '2026-11-02';

      const slots = await service.getSlotsByDate(clinicId, doctorId, dateStr);
      const targetSlot = slots[0];

      const blocked = await service.blockSlot(targetSlot.id);
      assert.strictEqual(blocked.status, SlotStatus.BLOCKED);

      const unblocked = await service.unblockSlot(targetSlot.id);
      assert.strictEqual(unblocked.status, SlotStatus.AVAILABLE);
    });

    it('should reflect LOCKED status when a slot has an active mutex lock', async () => {
      const doctorId = SEED_DATA.doctors[0].doctorId;
      const clinicId = SEED_DATA.clinic.id;
      const dateStr = '2026-11-02';

      const slots = await service.getSlotsByDate(clinicId, doctorId, dateStr);
      const onlineSlot = slots.find((s) => s.status === SlotStatus.AVAILABLE)!;

      // Lock the slot via concurrency manager
      await slotLockManager.acquireLock(onlineSlot.id, 'session-patient-123', 300);

      const updatedSlots = await service.getSlotsByDate(clinicId, doctorId, dateStr);
      const lockedSlot = updatedSlots.find((s) => s.id === onlineSlot.id);

      assert.strictEqual(lockedSlot?.status, SlotStatus.LOCKED);

      // Release lock
      await slotLockManager.releaseLock(onlineSlot.id, 'session-patient-123');

      const releasedSlots = await service.getSlotsByDate(clinicId, doctorId, dateStr);
      const releasedSlot = releasedSlots.find((s) => s.id === onlineSlot.id);
      assert.strictEqual(releasedSlot?.status, SlotStatus.AVAILABLE);
    });
  });

  describe('5. Batch Date Range Generation', () => {
    it('should generate slots across a multi-day range', async () => {
      const doctorId = SEED_DATA.doctors[0].doctorId;
      const clinicId = SEED_DATA.clinic.id;

      // Monday 2026-11-02 to Wednesday 2026-11-04 (Mon and Wed have sessions, Tue does not)
      const batch = await service.generateSlotsForDateRange(
        clinicId,
        '2026-11-02',
        '2026-11-04',
        doctorId
      );

      // Mon = 10 slots, Tue = 0 slots, Wed = 10 slots -> Total 20 slots
      assert.strictEqual(batch.length, 20);
    });
  });
});

