/**
 * Phase 14: Sequential Chamber Token Allocator & Duplicate Rejection Engine Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../src/server';
import { appointmentService } from '../src/services/appointment-service';
import { clinicService } from '../src/services/clinic-service';
import { doctorService } from '../src/services/doctor-service';
import { affiliationService } from '../src/services/affiliation-service';
import { authService } from '../src/services/auth-service';
import { sessionService } from '../src/services/session-service';
import { SEED_DATA } from '@medibooking/database';
import { UserRole, StaffScope, PaymentStatus, TriageSeverity, DayOfWeek, SessionType } from '@medibooking/types';

describe('Phase 14: Sequential Chamber Token Allocator & Duplicate Rejection Engine', () => {
  let app: any;
  const testClinicId = SEED_DATA.clinic.id;
  const doctorSharma = SEED_DATA.doctors[0]!; // CH-1
  const doctorPatel = SEED_DATA.doctors[1]!;  // CH-2

  let receptionistToken: string;

  beforeEach(async () => {
    appointmentService.reset();
    clinicService.reset();
    doctorService.reset();
    affiliationService.reset();
    authService.reset();
    sessionService.reset();
    app = createApiServer();

    receptionistToken = authService.signToken({
      sub: 'usr-rec-001',
      mobile: '9826033333',
      role: UserRole.RECEPTIONIST,
      clinicId: testClinicId,
      staffScope: StaffScope.CLINIC_WIDE,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
  });

  describe('1. Duplicate Intake Rejection & Family Override', () => {
    it('should reject duplicate walk-in intake for same patient mobile on same day', async () => {
      const patientMobile = '9826188888';

      // 1. First registration (succeeds)
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${receptionistToken}` },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Sunil Verma',
          mobile: patientMobile,
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      assert.equal(res1.statusCode, 200);

      // 2. Duplicate registration attempt without allowDuplicate flag
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${receptionistToken}` },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Sunil Verma (Repeat Tap)',
          mobile: patientMobile,
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });

      assert.equal(res2.statusCode, 409);
      const body = JSON.parse(res2.body);
      assert.equal(body.error, 'Duplicate Intake');
      assert.ok(body.message.includes('already holds Token #1'));
    });

    it('should allow duplicate phone registration when allowDuplicate is true (Family Member flow)', async () => {
      const parentMobile = '9826177777';

      // 1. Register parent
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${receptionistToken}` },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Rajendra Singh',
          mobile: parentMobile,
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      assert.equal(res1.statusCode, 200);
      const body1 = JSON.parse(res1.body);
      assert.equal(body1.tokenNumber, 1);

      // 2. Register child using same mobile with allowDuplicate: true
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${receptionistToken}` },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Aryan Singh (Child)',
          mobile: parentMobile,
          ageYears: 8,
          paymentMethod: PaymentStatus.PAID_CASH,
          allowDuplicate: true,
        },
      });

      assert.equal(res2.statusCode, 200);
      const body2 = JSON.parse(res2.body);
      assert.equal(body2.tokenNumber, 2);
      assert.equal(body2.appointment.patientName, 'Aryan Singh (Child)');
    });
  });

  describe('2. Chamber-Isolated Monotonic Token Sequencing', () => {
    it('should maintain independent token sequences for different chambers', async () => {
      // 1. First patient in Chamber 1 (Dr. Sharma) -> Token #1
      const resCh1 = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${receptionistToken}` },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Patient In Chamber 1',
          mobile: '9826111111',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      assert.equal(resCh1.statusCode, 200);
      const bodyCh1 = JSON.parse(resCh1.body);
      assert.equal(bodyCh1.tokenNumber, 1);
      assert.equal(bodyCh1.thermalSlipData.tokenFormatted, 'CH1-001');

      // 2. First patient in Chamber 2 (Dr. Patel) -> Also Token #1!
      const resCh2 = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${receptionistToken}` },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorPatel.doctorId,
          chamberNumber: 'CH-2',
          patientName: 'Patient In Chamber 2',
          mobile: '9826122222',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      assert.equal(resCh2.statusCode, 200);
      const bodyCh2 = JSON.parse(resCh2.body);
      assert.equal(bodyCh2.tokenNumber, 1);
      assert.equal(bodyCh2.thermalSlipData.tokenFormatted, 'CH2-001');
    });
  });

  describe('3. Walk-In Token Quota Cap & Emergency Override', () => {
    it('should enforce session walk-in token cap and support emergency bypass', async () => {
      // Find existing session for Dr. Sharma and set cap to 2 walk-in tokens
      const existingSessions = await sessionService.getSessionsByDoctor(doctorSharma.doctorId, testClinicId);
      assert.ok(existingSessions.length > 0, 'Dr Sharma must have a session');
      await sessionService.updateSession(existingSessions[0]!.id, { maxWalkInTokens: 2 });

      // Intake 1 -> Token #1
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${receptionistToken}` },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Patient One',
          mobile: '9826133331',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      assert.equal(res1.statusCode, 200);

      // Intake 2 -> Token #2
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${receptionistToken}` },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Patient Two',
          mobile: '9826133332',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      assert.equal(res2.statusCode, 200);

      // Intake 3 -> Exceeds cap of 2 -> Rejected with 409
      const res3 = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${receptionistToken}` },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Patient Three (Excess)',
          mobile: '9826133333',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      assert.equal(res3.statusCode, 409);
      const body3 = JSON.parse(res3.body);
      assert.equal(body3.error, 'Token Cap Reached');
      assert.ok(body3.message.includes('token cap of 2 reached'));

      // Intake 3 with emergencyOverride: true -> Allowed
      const resEmergency = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${receptionistToken}` },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Critical Chest Pain Patient',
          mobile: '9826133333',
          paymentMethod: PaymentStatus.PAID_CASH,
          triageSeverity: TriageSeverity.URGENT_TRIAGE,
          emergencyOverride: true,
        },
      });
      assert.equal(resEmergency.statusCode, 200);
      const emergencyBody = JSON.parse(resEmergency.body);
      assert.equal(emergencyBody.tokenNumber, 3);
      assert.equal(emergencyBody.thermalSlipData.tokenFormatted, 'CH1-003');
    });
  });
});
