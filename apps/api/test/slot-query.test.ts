/**
 * Phase 11: Public Slot Query API with Real-Time Lock Status & Availability Checking Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../src/server';
import { slotLockManager } from '../src/services/concurrency-engine';
import { slotService } from '../src/services/slot-service';
import { sessionService } from '../src/services/session-service';
import { clinicService } from '../src/services/clinic-service';
import { doctorService } from '../src/services/doctor-service';
import { SEED_DATA } from '@medibooking/database';

describe('Phase 11: Public Slot Query API & Real-Time Availability Checking', () => {
  let app: any;
  const testClinicId = SEED_DATA.clinic.id;
  const testDoctorSlug = 'dr-rajesh-sharma-cardio';
  const testDoctorId = SEED_DATA.doctors[0]!.doctorId;

  beforeEach(async () => {
    slotLockManager.reset();
    slotService.reset();
    clinicService.reset();
    doctorService.reset();
    sessionService.reset();
    app = createApiServer();
  });

  describe('1. Doctor-First Public Slot Query by Slug', () => {
    it('should return 404 Not Found for non-existent doctor slug', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/public/doctors/dr-non-existent-slug/slots?date=2026-11-04',
      });

      assert.equal(response.statusCode, 404);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Doctor Not Found');
    });

    it('should dynamically generate and return availability slots for valid doctor and date', async () => {
      // 2026-11-04 is Wednesday (DayOfWeek.WEDNESDAY = 3), when Dr. Sharma has sessions
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=2026-11-04`,
      });

      assert.equal(response.statusCode, 200);
      const body = JSON.parse(response.body);

      assert.equal(body.doctor.slug, testDoctorSlug);
      assert.equal(body.doctor.fullName, 'Dr. Rajesh Sharma');
      assert.equal(body.date, '2026-11-04');
      assert.ok(body.totalSlots > 0, 'Should have generated slots for Dr. Sharma');
      assert.ok(body.availableSlots > 0, 'Should have online available slots');

      const firstOnlineSlot = body.slots.find((s: any) => s.status === 'AVAILABLE');
      assert.ok(firstOnlineSlot, 'Should find an available online slot');
      assert.equal(firstOnlineSlot.isAvailable, true);
      assert.equal(firstOnlineSlot.isLocked, false);
      assert.equal(firstOnlineSlot.chamberNumber, 'CH-1');
      assert.equal(firstOnlineSlot.consultationFee, 700);
      assert.equal(firstOnlineSlot.followUpFee, 400);
    });
  });

  describe('2. Real-Time Mutex Lock Status Decoration', () => {
    it('should decorate slot as LOCKED when acquired by a concurrent patient', async () => {
      const date = '2026-11-04';
      // 1. Fetch initial available slots
      const initialRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${date}`,
      });
      const initialBody = JSON.parse(initialRes.body);
      const targetSlot = initialBody.slots.find((s: any) => s.status === 'AVAILABLE');
      assert.ok(targetSlot, 'Target slot must exist');

      // 2. Patient A locks target slot
      const lockRes = await app.inject({
        method: 'POST',
        url: `/api/v1/public/slots/${targetSlot.id}/lock`,
        payload: {
          sessionId: 'session-patient-alpha-001',
          ttlSeconds: 300,
        },
      });
      assert.equal(lockRes.statusCode, 200);

      // 3. Query slots again without session - target slot must now appear as LOCKED
      const lockedRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${date}`,
      });
      const lockedBody = JSON.parse(lockedRes.body);
      const updatedSlot = lockedBody.slots.find((s: any) => s.id === targetSlot.id);

      assert.equal(updatedSlot.status, 'LOCKED');
      assert.equal(updatedSlot.isAvailable, false);
      assert.equal(updatedSlot.isLocked, true);
      assert.equal(updatedSlot.isOwnedByCaller, false);
      assert.ok(updatedSlot.ttlSecondsRemaining > 0);
    });

    it('should recognize session ownership for the lock holder (isOwnedByCaller = true)', async () => {
      const date = '2026-11-04';
      const initialRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${date}`,
      });
      const targetSlot = JSON.parse(initialRes.body).slots.find((s: any) => s.status === 'AVAILABLE');

      const callerSessionId = 'session-patient-alpha-001';

      // Lock slot
      await app.inject({
        method: 'POST',
        url: `/api/v1/public/slots/${targetSlot.id}/lock`,
        payload: { sessionId: callerSessionId, ttlSeconds: 300 },
      });

      // Caller queries with matching sessionId: should see isOwnedByCaller = true and isAvailable = true
      const callerRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${date}&sessionId=${callerSessionId}`,
      });
      const callerSlot = JSON.parse(callerRes.body).slots.find((s: any) => s.id === targetSlot.id);

      assert.equal(callerSlot.isLocked, true);
      assert.equal(callerSlot.isOwnedByCaller, true);
      assert.equal(callerSlot.isAvailable, true);

      // Another user queries with different sessionId: should see isOwnedByCaller = false and isAvailable = false
      const competitorRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${date}&sessionId=session-patient-beta-002`,
      });
      const competitorSlot = JSON.parse(competitorRes.body).slots.find((s: any) => s.id === targetSlot.id);

      assert.equal(competitorSlot.isLocked, true);
      assert.equal(competitorSlot.isOwnedByCaller, false);
      assert.equal(competitorSlot.isAvailable, false);
    });

    it('should immediately restore AVAILABLE status upon lock release', async () => {
      const date = '2026-11-04';
      const initialRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${date}`,
      });
      const targetSlot = JSON.parse(initialRes.body).slots.find((s: any) => s.status === 'AVAILABLE');
      const sessionId = 'session-temp-12345';

      // Lock
      await app.inject({
        method: 'POST',
        url: `/api/v1/public/slots/${targetSlot.id}/lock`,
        payload: { sessionId, ttlSeconds: 300 },
      });

      // Release
      const releaseRes = await app.inject({
        method: 'POST',
        url: `/api/v1/public/slots/${targetSlot.id}/release`,
        payload: { sessionId },
      });
      assert.equal(releaseRes.statusCode, 200);

      // Query again
      const restoredRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${date}`,
      });
      const restoredSlot = JSON.parse(restoredRes.body).slots.find((s: any) => s.id === targetSlot.id);

      assert.equal(restoredSlot.status, 'AVAILABLE');
      assert.equal(restoredSlot.isAvailable, true);
      assert.equal(restoredSlot.isLocked, false);
    });
  });

  describe('3. Single Slot Real-Time Availability Probe', () => {
    it('should return 404 for unknown slot ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/public/slots/slot-unknown-9999/availability',
      });
      assert.equal(res.statusCode, 404);
    });

    it('should probe availability and lock status for single slot', async () => {
      const date = '2026-11-04';
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${date}`,
      });
      const targetSlot = JSON.parse(listRes.body).slots.find((s: any) => s.status === 'AVAILABLE');

      // Probe before locking
      const probe1 = await app.inject({
        method: 'GET',
        url: `/api/v1/public/slots/${targetSlot.id}/availability`,
      });
      assert.equal(probe1.statusCode, 200);
      const probe1Body = JSON.parse(probe1.body);
      assert.equal(probe1Body.isAvailable, true);
      assert.equal(probe1Body.isLocked, false);

      // Lock slot
      await app.inject({
        method: 'POST',
        url: `/api/v1/public/slots/${targetSlot.id}/lock`,
        payload: { sessionId: 'session-probe-check', ttlSeconds: 300 },
      });

      // Probe after locking
      const probe2 = await app.inject({
        method: 'GET',
        url: `/api/v1/public/slots/${targetSlot.id}/availability`,
      });
      const probe2Body = JSON.parse(probe2.body);
      assert.equal(probe2Body.isAvailable, false);
      assert.equal(probe2Body.isLocked, true);
      assert.equal(probe2Body.status, 'LOCKED');
    });
  });

  describe('4. Multi-Venue Filtering', () => {
    it('should filter slots by clinicId when specified', async () => {
      const date = '2026-11-04';
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${date}&clinicId=${testClinicId}`,
      });

      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.ok(body.slots.every((s: any) => s.clinicId === testClinicId));
    });
  });
});
