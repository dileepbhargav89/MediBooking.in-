/**
 * Phase 12: Online Patient Slot Booking Transaction with Idempotency Key Validation Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../src/server';
import { appointmentService } from '../src/services/appointment-service';
import { slotLockManager } from '../src/services/concurrency-engine';
import { slotService } from '../src/services/slot-service';
import { clinicService } from '../src/services/clinic-service';
import { doctorService } from '../src/services/doctor-service';
import { sessionService } from '../src/services/session-service';
import { SlotStatus } from '@medibooking/types';

describe('Phase 12: Online Patient Slot Booking Transaction & Idempotency', () => {
  let app: any;
  const testDoctorSlug = 'dr-rajesh-sharma-cardio';
  const testDate = '2026-11-04'; // Wednesday session

  beforeEach(async () => {
    appointmentService.reset();
    slotLockManager.reset();
    slotService.reset();
    clinicService.reset();
    doctorService.reset();
    sessionService.reset();
    app = createApiServer();
  });

  describe('1. End-to-End Online Booking Transaction', () => {
    it('should atomically convert a locked slot into a confirmed appointment with sequential token', async () => {
      // 1. Fetch available slots
      const slotsRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${testDate}`,
      });
      const slotsBody = JSON.parse(slotsRes.body);
      const targetSlot = slotsBody.slots.find((s: any) => s.status === 'AVAILABLE');
      assert.ok(targetSlot, 'Must find an available slot');

      // 2. Lock the slot
      const sessionId = 'session-patient-alpha-777';
      const lockRes = await app.inject({
        method: 'POST',
        url: `/api/v1/public/slots/${targetSlot.id}/lock`,
        payload: { sessionId, ttlSeconds: 300 },
      });
      assert.equal(lockRes.statusCode, 200);

      // 3. Submit booking transaction with idempotency key
      const idempotencyKey = 'idemp-tx-test-001';
      const bookingRes = await app.inject({
        method: 'POST',
        url: '/api/v1/public/bookings',
        payload: {
          slotId: targetSlot.id,
          sessionId,
          patientName: 'Aarav Patel',
          patientMobile: '9826199999',
          patientAge: 38,
          patientGender: 'MALE',
          notes: 'Routine cardiac checkup',
          idempotencyKey,
        },
      });

      assert.equal(bookingRes.statusCode, 201);
      const bookingBody = JSON.parse(bookingRes.body);

      assert.equal(bookingBody.success, true);
      assert.equal(bookingBody.isReplay, false);
      assert.equal(bookingBody.appointment.patientName, 'Aarav Patel');
      assert.equal(bookingBody.appointment.patientMobile, '9826199999');
      assert.equal(bookingBody.appointment.status, 'SCHEDULED');
      assert.equal(bookingBody.appointment.source, 'ONLINE_PORTAL');
      assert.equal(bookingBody.appointment.tokenNumber, 1);
      assert.equal(bookingBody.summary.consultationFee, 700);
      assert.equal(bookingBody.summary.chamberNumber, 'CH-1');
      assert.ok(bookingBody.summary.bookingReference.includes('CH1'));

      // 4. Verify slot is now permanently BOOKED
      const updatedSlot = await slotService.getSlotById(targetSlot.id);
      assert.equal(updatedSlot?.status, SlotStatus.BOOKED);

      // 5. Verify mutex lock has been committed/released
      const lockInfo = slotLockManager.getLockInfo(targetSlot.id);
      assert.equal(lockInfo.isLocked, false);
    });
  });

  describe('2. Idempotency Key Validation & Replay Guarantee', () => {
    it('should replay the existing appointment on identical idempotencyKey without creating duplicates', async () => {
      // 1. Fetch and lock slot
      const slotsRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${testDate}`,
      });
      const targetSlot = JSON.parse(slotsRes.body).slots.find((s: any) => s.status === 'AVAILABLE');
      const sessionId = 'session-idemp-user';

      await app.inject({
        method: 'POST',
        url: `/api/v1/public/slots/${targetSlot.id}/lock`,
        payload: { sessionId, ttlSeconds: 300 },
      });

      const idempotencyKey = 'idemp-duplicate-safe-key-999';
      const bookingPayload = {
        slotId: targetSlot.id,
        sessionId,
        patientName: 'Sunita Sharma',
        patientMobile: '9826188888',
        patientAge: 52,
        idempotencyKey,
      };

      // Initial booking
      const firstRes = await app.inject({
        method: 'POST',
        url: '/api/v1/public/bookings',
        payload: bookingPayload,
      });
      assert.equal(firstRes.statusCode, 201);
      const firstBody = JSON.parse(firstRes.body);

      // Duplicate submission with same idempotency key (simulating network retry or double-click)
      const secondRes = await app.inject({
        method: 'POST',
        url: '/api/v1/public/bookings',
        payload: bookingPayload,
      });

      assert.equal(secondRes.statusCode, 200);
      assert.equal(secondRes.headers['idempotent-replay'], 'true');
      const secondBody = JSON.parse(secondRes.body);

      assert.equal(secondBody.isReplay, true);
      assert.equal(secondBody.appointment.id, firstBody.appointment.id);
      assert.equal(secondBody.summary.bookingReference, firstBody.summary.bookingReference);
      assert.equal(secondBody.appointment.tokenNumber, firstBody.appointment.tokenNumber);
    });

    it('should support idempotency key passed via HTTP header', async () => {
      const slotsRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${testDate}`,
      });
      const targetSlot = JSON.parse(slotsRes.body).slots.find((s: any) => s.status === 'AVAILABLE');
      const sessionId = 'session-header-key-user';

      await app.inject({
        method: 'POST',
        url: `/api/v1/public/slots/${targetSlot.id}/lock`,
        payload: { sessionId, ttlSeconds: 300 },
      });

      const headerKey = 'header-uuid-idemp-444';
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/public/bookings',
        headers: {
          'idempotency-key': headerKey,
        },
        payload: {
          slotId: targetSlot.id,
          sessionId,
          patientName: 'Priya Verma',
          patientMobile: '9826177777',
        },
      });

      assert.equal(res.statusCode, 201);
      const body = JSON.parse(res.body);
      assert.equal(body.appointment.idempotencyKey, headerKey);
    });
  });

  describe('3. Concurrency & Conflict Protection', () => {
    it('should reject booking if lock is held by another session or has expired', async () => {
      const slotsRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${testDate}`,
      });
      const targetSlot = JSON.parse(slotsRes.body).slots.find((s: any) => s.status === 'AVAILABLE');

      // Lock with Session A
      await app.inject({
        method: 'POST',
        url: `/api/v1/public/slots/${targetSlot.id}/lock`,
        payload: { sessionId: 'session-owner-A', ttlSeconds: 300 },
      });

      // Attempt to book with Session B (unauthorized caller)
      const fraudRes = await app.inject({
        method: 'POST',
        url: '/api/v1/public/bookings',
        payload: {
          slotId: targetSlot.id,
          sessionId: 'session-impostor-B',
          patientName: 'Impostor User',
          patientMobile: '9826155555',
        },
      });

      assert.equal(fraudRes.statusCode, 409);
      const fraudBody = JSON.parse(fraudRes.body);
      assert.equal(fraudBody.error, 'Booking Conflict');
      assert.ok(fraudBody.message.includes('LOCK_EXPIRED_OR_INVALID'));
    });

    it('should reject booking if slot is already booked', async () => {
      const slotsRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${testDate}`,
      });
      const targetSlot = JSON.parse(slotsRes.body).slots.find((s: any) => s.status === 'AVAILABLE');
      const sessionId = 'session-first-booker';

      // Lock and book
      await app.inject({
        method: 'POST',
        url: `/api/v1/public/slots/${targetSlot.id}/lock`,
        payload: { sessionId, ttlSeconds: 300 },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/public/bookings',
        payload: {
          slotId: targetSlot.id,
          sessionId,
          patientName: 'Legitimate Booker',
          patientMobile: '9826144444',
        },
      });

      // Subsequent attempt to book same slot with different session and key
      const secondAttempt = await app.inject({
        method: 'POST',
        url: '/api/v1/public/bookings',
        payload: {
          slotId: targetSlot.id,
          sessionId: 'session-second-booker',
          patientName: 'Second Booker',
          patientMobile: '9826133333',
        },
      });

      assert.equal(secondAttempt.statusCode, 409);
      const secondBody = JSON.parse(secondAttempt.body);
      assert.ok(secondBody.message.includes('SLOT_ALREADY_BOOKED'));
    });
  });

  describe('4. Input Validation & Error Handling', () => {
    it('should reject invalid mobile phone format with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/public/bookings',
        payload: {
          slotId: 'slot-sample-01',
          sessionId: 'session-sample-1234',
          patientName: 'Test Patient',
          patientMobile: '12345', // invalid non-Indian number
        },
      });

      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.error, 'Validation Error');
    });

    it('should return 404 for non-existent slot', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/public/bookings',
        payload: {
          slotId: 'slot-does-not-exist-9999',
          sessionId: 'session-random-1234',
          patientName: 'Test Patient',
          patientMobile: '9826112345',
        },
      });

      assert.equal(res.statusCode, 404);
      const body = JSON.parse(res.body);
      assert.equal(body.error, 'Slot Not Found');
    });
  });

  describe('5. Booking Retrieval & Receipt Verification', () => {
    it('should retrieve confirmed booking details by ID', async () => {
      // Create a booking
      const slotsRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/doctors/${testDoctorSlug}/slots?date=${testDate}`,
      });
      const targetSlot = JSON.parse(slotsRes.body).slots.find((s: any) => s.status === 'AVAILABLE');
      const sessionId = 'session-lookup-user';

      await app.inject({
        method: 'POST',
        url: `/api/v1/public/slots/${targetSlot.id}/lock`,
        payload: { sessionId, ttlSeconds: 300 },
      });

      const bookRes = await app.inject({
        method: 'POST',
        url: '/api/v1/public/bookings',
        payload: {
          slotId: targetSlot.id,
          sessionId,
          patientName: 'Neeraj Chopra',
          patientMobile: '9826100000',
        },
      });
      const bookingId = JSON.parse(bookRes.body).appointment.id;

      // Lookup booking
      const lookupRes = await app.inject({
        method: 'GET',
        url: `/api/v1/public/bookings/${bookingId}`,
      });

      assert.equal(lookupRes.statusCode, 200);
      const lookupBody = JSON.parse(lookupRes.body);
      assert.equal(lookupBody.appointment.id, bookingId);
      assert.equal(lookupBody.summary.doctorName, 'Dr. Rajesh Sharma');
      assert.equal(lookupBody.summary.clinicName, 'CityCare Polyclinic & Diagnostic Centre');
      assert.equal(lookupBody.summary.chamberNumber, 'CH-1');
      assert.equal(lookupBody.summary.patientName, 'Neeraj Chopra');
    });

    it('should return 404 for unknown booking ID lookup', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/public/bookings/unknown-booking-uuid-0000',
      });
      assert.equal(res.statusCode, 404);
    });
  });
});

