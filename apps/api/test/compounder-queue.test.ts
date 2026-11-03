/**
 * Phase 17: Doctor-Dedicated Compounder (DOCTOR_DEDICATED) Single-Chamber Queue API Tests
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
import { UserRole, StaffScope, PaymentStatus, TriageSeverity, AppointmentStatus } from '@medibooking/types';

describe('Phase 17: Doctor-Dedicated Compounder (DOCTOR_DEDICATED) Single-Chamber Queue API', () => {
  let app: any;
  const testClinicId = SEED_DATA.clinic.id;
  const doctorSharma = SEED_DATA.doctors[0]!; // CH-1
  const doctorPatel = SEED_DATA.doctors[1]!;  // CH-2

  let centralReceptionistToken: string;
  let dedicatedSharmaCompounderToken: string;
  let dedicatedPatelCompounderToken: string;

  beforeEach(async () => {
    appointmentService.reset();
    clinicService.reset();
    doctorService.reset();
    affiliationService.reset();
    authService.reset();
    sessionService.reset();
    app = createApiServer();

    centralReceptionistToken = authService.signToken({
      sub: 'usr-rec-clinic-wide',
      mobile: '9826011111',
      role: UserRole.RECEPTIONIST,
      clinicId: testClinicId,
      staffScope: StaffScope.CLINIC_WIDE,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    dedicatedSharmaCompounderToken = authService.signToken({
      sub: 'usr-comp-sharma',
      mobile: '9826022222',
      role: UserRole.RECEPTIONIST,
      clinicId: testClinicId,
      staffScope: StaffScope.DOCTOR_DEDICATED,
      dedicatedDoctorId: doctorSharma.doctorId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    dedicatedPatelCompounderToken = authService.signToken({
      sub: 'usr-comp-patel',
      mobile: '9826033333',
      role: UserRole.RECEPTIONIST,
      clinicId: testClinicId,
      staffScope: StaffScope.DOCTOR_DEDICATED,
      dedicatedDoctorId: doctorPatel.doctorId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
  });

  describe('1. Single-Chamber Queue Retrieval & Scope Isolation', () => {
    it('should return only Chamber 1 queue for Dr. Sharma dedicated compounder', async () => {
      // 1. Create walk-in for Dr. Sharma
      await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${centralReceptionistToken}`, 'x-clinic-id': testClinicId },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: doctorSharma.chamberNumber,
          patientName: 'Rameshwar Dayal',
          mobile: '9826112345',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });

      // 2. Query compounder queue
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/compounder/queue',
        headers: {
          authorization: `Bearer ${dedicatedSharmaCompounderToken}`,
          'x-clinic-id': testClinicId,
        },
      });

      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);

      assert.equal(data.chamberNumber, 'CH-1');
      assert.equal(data.doctorId, doctorSharma.doctorId);
      assert.equal(data.doctorName, doctorSharma.fullName);
      assert.ok(data.waitingQueue.length >= 1);
      assert.equal(data.nextPatient.patientName, 'Rameshwar Dayal');
      assert.equal(data.stats.waitingCount, data.waitingQueue.length);
    });

    it('should reject Dr. Sharma compounder attempting to access Dr. Patel queue with 403 Forbidden', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/compounder/queue?doctorId=${doctorPatel.doctorId}`,
        headers: {
          authorization: `Bearer ${dedicatedSharmaCompounderToken}`,
          'x-clinic-id': testClinicId,
        },
      });

      assert.equal(res.statusCode, 403);
      assert.ok(JSON.parse(res.body).message.includes('Staff scope restricted'));
    });
  });

  describe('2. Pre-Consultation Vitals Recording', () => {
    it('should record patient vitals before entering doctor room', async () => {
      // 1. Intake patient for Dr. Sharma
      const intakeRes = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${centralReceptionistToken}`, 'x-clinic-id': testClinicId },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: doctorSharma.chamberNumber,
          patientName: 'Kamla Devi',
          mobile: '9826123456',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      const appt = JSON.parse(intakeRes.body).appointment;

      // 2. Compounder records vitals
      const vitalsRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/compounder/appointment/${appt.id}/vitals`,
        headers: {
          authorization: `Bearer ${dedicatedSharmaCompounderToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          bloodPressure: '128/84',
          pulseBpm: 74,
          weightKg: 64.5,
          temperatureF: 98.4,
          spo2Percent: 99,
          chiefComplaints: 'Occasional breathlessness after climbing stairs',
        },
      });

      assert.equal(vitalsRes.statusCode, 200);
      const resData = JSON.parse(vitalsRes.body);
      assert.equal(resData.success, true);
      assert.equal(resData.appointment.vitals.bloodPressure, '128/84');
      assert.equal(resData.appointment.vitals.pulseBpm, 74);
      assert.equal(resData.appointment.vitals.weightKg, 64.5);
      assert.equal(resData.appointment.vitals.spo2Percent, 99);
      assert.ok(resData.appointment.vitals.recordedAt);

      // 3. Query queue and verify vitals show in waiting queue
      const qRes = await app.inject({
        method: 'GET',
        url: '/api/v1/compounder/queue',
        headers: { authorization: `Bearer ${dedicatedSharmaCompounderToken}`, 'x-clinic-id': testClinicId },
      });
      const qData = JSON.parse(qRes.body);
      const queuedPatient = qData.waitingQueue.find((p: any) => p.id === appt.id);
      assert.ok(queuedPatient.vitals);
      assert.equal(queuedPatient.vitals.bloodPressure, '128/84');
      assert.ok(qData.stats.vitalsRecordedCount >= 1);
    });

    it('should prevent cross-doctor vitals recording by dedicated compounder', async () => {
      // 1. Intake patient for Dr. Patel (CH-2)
      const intakeRes = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${centralReceptionistToken}`, 'x-clinic-id': testClinicId },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorPatel.doctorId,
          chamberNumber: doctorPatel.chamberNumber,
          patientName: 'Patel Patient',
          mobile: '9826134567',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      const appt = JSON.parse(intakeRes.body).appointment;

      // 2. Dr. Sharma compounder tries to record vitals for Dr. Patel's patient
      const vitalsRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/compounder/appointment/${appt.id}/vitals`,
        headers: {
          authorization: `Bearer ${dedicatedSharmaCompounderToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          bloodPressure: '120/80',
        },
      });

      assert.equal(vitalsRes.statusCode, 403);
      assert.ok(JSON.parse(vitalsRes.body).message.includes('restricted to assigned doctor'));
    });
  });

  describe('3. 1-Tap Queue Progression (call-next)', () => {
    it('should call next patient into consultation and complete previous patient', async () => {
      // 1. Register 2 patients for Dr. Sharma
      const p1Res = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${centralReceptionistToken}`, 'x-clinic-id': testClinicId },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: doctorSharma.chamberNumber,
          patientName: 'Patient One',
          mobile: '9826145678',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      const p1 = JSON.parse(p1Res.body).appointment;

      const p2Res = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${centralReceptionistToken}`, 'x-clinic-id': testClinicId },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: doctorSharma.chamberNumber,
          patientName: 'Patient Two',
          mobile: '9826156789',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      const p2 = JSON.parse(p2Res.body).appointment;

      // 2. Call next -> Patient One enters consultation
      const call1 = await app.inject({
        method: 'POST',
        url: '/api/v1/compounder/chamber/call-next',
        headers: {
          authorization: `Bearer ${dedicatedSharmaCompounderToken}`,
          'x-clinic-id': testClinicId,
        },
      });

      assert.equal(call1.statusCode, 200);
      const call1Data = JSON.parse(call1.body);
      assert.equal(call1Data.servingAppointment.id, p1.id);
      assert.equal(call1Data.servingAppointment.status, AppointmentStatus.IN_CONSULTATION);
      assert.equal(call1Data.completedAppointment, null);

      // Verify queue state reflects Patient One currently serving, Patient Two as nextPatient
      const q1 = await app.inject({
        method: 'GET',
        url: '/api/v1/compounder/queue',
        headers: { authorization: `Bearer ${dedicatedSharmaCompounderToken}`, 'x-clinic-id': testClinicId },
      });
      const q1Data = JSON.parse(q1.body);
      assert.equal(q1Data.currentlyServing.id, p1.id);
      assert.equal(q1Data.nextPatient.id, p2.id);

      // 3. Call next again -> Patient One completes, Patient Two enters consultation
      const call2 = await app.inject({
        method: 'POST',
        url: '/api/v1/compounder/chamber/call-next',
        headers: {
          authorization: `Bearer ${dedicatedSharmaCompounderToken}`,
          'x-clinic-id': testClinicId,
        },
      });

      assert.equal(call2.statusCode, 200);
      const call2Data = JSON.parse(call2.body);
      assert.equal(call2Data.completedAppointment.id, p1.id);
      assert.equal(call2Data.completedAppointment.status, AppointmentStatus.COMPLETED);
      assert.equal(call2Data.servingAppointment.id, p2.id);
      assert.equal(call2Data.servingAppointment.status, AppointmentStatus.IN_CONSULTATION);

      // Verify in queue
      const q2 = await app.inject({
        method: 'GET',
        url: '/api/v1/compounder/queue',
        headers: { authorization: `Bearer ${dedicatedSharmaCompounderToken}`, 'x-clinic-id': testClinicId },
      });
      const q2Data = JSON.parse(q2.body);
      assert.equal(q2Data.currentlyServing.id, p2.id);
      assert.ok(q2Data.completedQueue.some((p: any) => p.id === p1.id));
      assert.equal(q2Data.nextPatient, null);
    });
  });
});

